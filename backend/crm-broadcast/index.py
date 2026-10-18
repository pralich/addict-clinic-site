import json
import os
import time
from datetime import datetime

import psycopg2
import psycopg2.extras
from py_vapid import Vapid
from pywebpush import webpush, WebPushException

SCHEMA = 't_p15395438_addict_clinic_site'
SUBJECT = 'mailto:support@addict.clinic'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}
FAMILY_RELATIONS = ('spouse', 'parent', 'child', 'sibling', 'partner', 'friend', 'other')
STAFF_ROLES = ('admin', 'manager', 'doctor', 'leads_only')
BUDGET = 22


def t(name):
    return f'{SCHEMA}.{name}'


def resp(status, data):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def crm_user(cur, headers):
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    cur.execute(f"""SELECT u.id, u.name, u.role FROM {t('crm_sessions')} s JOIN {t('crm_users')} u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active""", (token,))
    return cur.fetchone()


def audience_sql(a):
    """Возвращает список (kind, sql, args) — подписки получателей по фильтрам"""
    parts = []
    fam = a.get('family') or {}
    if fam.get('on'):
        where, args = ['s.is_active', 'u.is_active'], []
        rel = [r for r in (fam.get('relations') or []) if r in FAMILY_RELATIONS]
        if rel:
            where.append('COALESCE(u.relation, %s) = ANY(%s)')
            args += ['other', rel]
        if fam.get('active_days'):
            where.append("u.last_seen_at > NOW() - (%s || ' days')::interval")
            args.append(str(int(fam['active_days'])))
        if fam.get('subscribers'):
            where.append(f"""EXISTS (SELECT 1 FROM {t('family_subscriptions')} p WHERE p.user_id = u.id AND p.ends_at > NOW())""")
        ids = [int(x) for x in (fam.get('ids') or []) if str(x).isdigit()]
        if ids:
            where.append('u.id = ANY(%s)')
            args.append(ids)
        parts.append(('family', f"""SELECT 'family' AS kind, u.id AS person_id, s.id AS sub_id FROM {t('family_push_subs')} s
            JOIN {t('family_users')} u ON u.id = s.user_id WHERE {' AND '.join(where)}""", args))
    st = a.get('staff') or {}
    if st.get('on'):
        where, args = ['s.is_active', 'u.is_active'], []
        roles = [r for r in (st.get('roles') or []) if r in STAFF_ROLES]
        if roles:
            where.append('u.role = ANY(%s)')
            args.append(roles)
        ids = [int(x) for x in (st.get('ids') or []) if str(x).isdigit()]
        if ids:
            where.append('u.id = ANY(%s)')
            args.append(ids)
        parts.append(('staff', f"""SELECT 'staff' AS kind, u.id AS person_id, s.id AS sub_id FROM {t('crm_push_subs')} s
            JOIN {t('crm_users')} u ON u.id = s.user_id WHERE {' AND '.join(where)}""", args))
    return parts


def count_audience(cur, a):
    out = {'family': 0, 'staff': 0, 'family_devices': 0, 'staff_devices': 0}
    for kind, sql, args in audience_sql(a):
        cur.execute(f'SELECT COUNT(DISTINCT person_id) AS p, COUNT(*) AS d FROM ({sql}) x', args)
        r = cur.fetchone()
        out[kind], out[f'{kind}_devices'] = r['p'], r['d']
    return out


def normalize(body, cur):
    a = body.get('audience') or {}
    return {'family': a.get('family') or {}, 'staff': a.get('staff') or {}}


def recipients(cur, a):
    """Люди с активными подписками — для выбора конкретных получателей"""
    out = []
    cur.execute(f"""SELECT u.id, u.name, u.email, u.relation, COUNT(s.id) AS devices FROM {t('family_users')} u
        JOIN {t('family_push_subs')} s ON s.user_id = u.id AND s.is_active WHERE u.is_active GROUP BY u.id ORDER BY u.name""")
    out += [{'kind': 'family', **r} for r in cur.fetchall()]
    cur.execute(f"""SELECT u.id, u.name, u.email, u.role, COUNT(s.id) AS devices FROM {t('crm_users')} u
        JOIN {t('crm_push_subs')} s ON s.user_id = u.id AND s.is_active WHERE u.is_active GROUP BY u.id ORDER BY u.name""")
    out += [{'kind': 'staff', **r} for r in cur.fetchall()]
    return out


def enqueue(cur, b):
    a = b['audience'] if isinstance(b['audience'], dict) else json.loads(b['audience'])
    total = 0
    for kind, sql, args in audience_sql(a):
        cur.execute(f"""INSERT INTO {t('crm_broadcast_queue')} (broadcast_id, kind, person_id, sub_id)
            SELECT %s, kind, person_id, sub_id FROM ({sql}) x ON CONFLICT DO NOTHING""", [b['id']] + args)
        total += cur.rowcount
    cur.execute(f"""UPDATE {t('crm_broadcasts')} SET status = 'sending', started_at = NOW(), devices = %s,
        recipients = (SELECT COUNT(DISTINCT (kind, person_id)) FROM {t('crm_broadcast_queue')} WHERE broadcast_id = %s) WHERE id = %s""", (total, b['id'], b['id']))


def payload_for(b, kind):
    url = (b.get('url') or '').strip() or ('/family' if kind == 'family' else '/admin')
    return json.dumps({'title': b['title'], 'body': b['body'], 'url': url, 'tag': f"broadcast-{b['id']}"}, ensure_ascii=False)


def process(cur, started):
    """Запускает созревшие рассылки и отправляет очередь, пока есть время"""
    cur.execute(f"""SELECT * FROM {t('crm_broadcasts')} WHERE status = 'scheduled' AND scheduled_at <= NOW() ORDER BY scheduled_at LIMIT 5""")
    for b in cur.fetchall():
        cur.execute(f"UPDATE {t('crm_broadcasts')} SET status = 'preparing' WHERE id = %s AND status = 'scheduled' RETURNING id", (b['id'],))
        if cur.fetchone():
            enqueue(cur, b)
    cur.execute(f'SELECT private_key FROM {t("push_config")} WHERE id = 1')
    row = cur.fetchone()
    if not row:
        return 0
    vapid = Vapid.from_pem(row['private_key'].encode())
    sent = 0
    cache = {}
    while time.time() - started < BUDGET:
        cur.execute(f"""UPDATE {t('crm_broadcast_queue')} SET status = 'taken' WHERE id IN (
            SELECT q.id FROM {t('crm_broadcast_queue')} q JOIN {t('crm_broadcasts')} b ON b.id = q.broadcast_id
            WHERE q.status = 'pending' AND b.status = 'sending' ORDER BY q.id LIMIT 20 FOR UPDATE SKIP LOCKED) RETURNING id, broadcast_id, kind, sub_id""")
        batch = cur.fetchall()
        if not batch:
            break
        for q in batch:
            if q['broadcast_id'] not in cache:
                cur.execute(f"SELECT * FROM {t('crm_broadcasts')} WHERE id = %s", (q['broadcast_id'],))
                cache[q['broadcast_id']] = cur.fetchone()
            b = cache[q['broadcast_id']]
            table = 'family_push_subs' if q['kind'] == 'family' else 'crm_push_subs'
            cur.execute(f'SELECT endpoint, p256dh, auth, is_active FROM {t(table)} WHERE id = %s', (q['sub_id'],))
            s = cur.fetchone()
            ok = False
            if s and s['is_active']:
                try:
                    webpush({'endpoint': s['endpoint'], 'keys': {'p256dh': s['p256dh'], 'auth': s['auth']}}, payload_for(b, q['kind']),
                            vapid_private_key=vapid, vapid_claims={'sub': SUBJECT}, ttl=86400, timeout=4)
                    ok = True
                except WebPushException as e:
                    code = getattr(e.response, 'status_code', None)
                    if code in (404, 410):
                        cur.execute(f'UPDATE {t(table)} SET is_active = FALSE WHERE id = %s', (q['sub_id'],))
                    else:
                        print(f'broadcast push error {code}: {e}')
                except Exception as e:
                    print(f'broadcast push error: {e}')
            cur.execute(f"UPDATE {t('crm_broadcast_queue')} SET status = %s WHERE id = %s", ('sent' if ok else 'failed', q['id']))
            cur.execute(f"UPDATE {t('crm_broadcasts')} SET {'delivered' if ok else 'failed'} = {'delivered' if ok else 'failed'} + 1 WHERE id = %s", (q['broadcast_id'],))
            sent += ok
    cur.execute(f"""UPDATE {t('crm_broadcast_queue')} SET status = 'pending' WHERE status = 'taken'
        AND broadcast_id IN (SELECT id FROM {t('crm_broadcasts')} WHERE status = 'sending' AND started_at < NOW() - INTERVAL '3 minutes')""")
    cur.execute(f"""UPDATE {t('crm_broadcasts')} b SET status = 'done', finished_at = NOW() WHERE status = 'sending'
        AND NOT EXISTS (SELECT 1 FROM {t('crm_broadcast_queue')} q WHERE q.broadcast_id = b.id AND q.status IN ('pending', 'taken'))""")
    return sent


def handler(event: dict, context) -> dict:
    """Push-рассылки из CRM: массовые и индивидуальные сообщения родственникам (кабинет близких) и сотрудникам, отложенная отправка и история"""
    started = time.time()
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}
    action = params.get('action') or 'list'

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if action == 'tick':
            return resp(200, {'sent': process(cur, started)})

        user = crm_user(cur, headers)
        if not user:
            return resp(401, {'error': 'Требуется вход'})
        if user['role'] not in ('admin', 'manager'):
            return resp(403, {'error': 'Рассылки доступны администратору и менеджеру'})

        if action == 'list':
            cur.execute(f"""SELECT b.*, u.name AS author FROM {t('crm_broadcasts')} b LEFT JOIN {t('crm_users')} u ON u.id = b.created_by
                ORDER BY CASE WHEN b.status IN ('scheduled', 'sending', 'preparing') THEN 0 ELSE 1 END, COALESCE(b.started_at, b.scheduled_at) DESC LIMIT 100""")
            items = cur.fetchall()
            return resp(200, {'items': items, 'recipients': recipients(cur, {})})
        if action == 'count' and method == 'POST':
            return resp(200, count_audience(cur, normalize(body, cur)))
        if action == 'create' and method == 'POST':
            title = (body.get('title') or '').strip()[:120]
            text = (body.get('body') or '').strip()[:500]
            url = (body.get('url') or '').strip()[:500] or None
            if not title or not text:
                return resp(400, {'error': 'Заполните заголовок и текст'})
            if url and not (url.startswith('/') or url.startswith('https://')):
                return resp(400, {'error': 'Ссылка должна начинаться с / или https://'})
            a = normalize(body, cur)
            cnt = count_audience(cur, a)
            if not (cnt['family_devices'] + cnt['staff_devices']):
                return resp(400, {'error': 'Под выбранные условия не попал ни один подписанный получатель'})
            when = None
            if body.get('scheduled_at'):
                try:
                    when = datetime.fromisoformat(str(body['scheduled_at']).replace('Z', '+00:00')).replace(tzinfo=None)
                except ValueError:
                    return resp(400, {'error': 'Неверная дата отправки'})
            cur.execute(f"""INSERT INTO {t('crm_broadcasts')} (title, body, url, audience, scheduled_at, recipients, created_by)
                VALUES (%s, %s, %s, %s, COALESCE(%s, NOW()), %s, %s) RETURNING *""",
                        (title, text, url, json.dumps(a, ensure_ascii=False), when, cnt['family'] + cnt['staff'], user['id']))
            item = cur.fetchone()
            if not when or when <= datetime.utcnow():
                process(cur, started)
                cur.execute(f"SELECT * FROM {t('crm_broadcasts')} WHERE id = %s", (item['id'],))
                item = cur.fetchone()
            return resp(200, {'item': item})
        if action == 'cancel' and method == 'POST':
            cur.execute(f"UPDATE {t('crm_broadcasts')} SET status = 'canceled', finished_at = NOW() WHERE id = %s AND status = 'scheduled' RETURNING id", (int(body.get('id') or 0),))
            ok = cur.fetchone()
            return resp(200, {'ok': True}) if ok else resp(400, {'error': 'Рассылку уже нельзя отменить'})
        return resp(404, {'error': 'Неизвестный запрос'})
    finally:
        cur.close()
        conn.close()
