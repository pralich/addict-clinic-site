import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta, date

import psycopg2
import psycopg2.extras

import billing
import push_lib

SCHEMA = 't_p15395438_addict_clinic_site'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}

RELATIONS = ('spouse', 'parent', 'child', 'sibling', 'partner', 'friend', 'other')
EVENT_FIELDS = ('title', 'description', 'kind', 'starts_at', 'duration_min', 'location', 'link', 'host', 'capacity', 'cover_url', 'status')


def t(name):
    return f'{SCHEMA}.{name}'


def _ser(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    return str(o)


def resp(status, data):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=_ser, ensure_ascii=False)}


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 120000).hex()
    return f'{salt}${h}'


def check_password(password, stored):
    salt, _ = stored.split('$', 1)
    return secrets.compare_digest(hash_password(password, salt), stored)


def clean(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


def token_of(headers):
    return headers.get('X-Auth-Token') or headers.get('x-auth-token')


def family_user(cur, headers):
    token = token_of(headers)
    if not token:
        return None
    cur.execute(f'SELECT u.id, u.name, u.email, u.phone, u.relation, u.created_at FROM {t("family_sessions")} s JOIN {t("family_users")} u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active', (token,))
    return cur.fetchone()


def staff_user(cur, headers):
    token = token_of(headers)
    if not token:
        return None
    cur.execute(f'SELECT u.id, u.name, u.role FROM {t("crm_sessions")} s JOIN {t("crm_users")} u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active', (token,))
    return cur.fetchone()


def access_info(cur, uid):
    cur.execute(f"""SELECT u.token_balance, u.trial_ends_at, u.trial_ends_at > NOW() AS trial_active,
        ARRAY(SELECT DISTINCT plan FROM {t('family_subscriptions')} s WHERE s.user_id = u.id AND s.ends_at > NOW()) AS plans
        FROM {t('family_users')} u WHERE u.id = %s""", (uid,))
    r = cur.fetchone()
    plans = list(r['plans'] or [])
    return {
        'tokens': r['token_balance'], 'plans': plans, 'trial_ends_at': r['trial_ends_at'], 'trial_active': bool(r['trial_active']),
        'can_ask': bool(r['trial_active']) or bool(plans),
    }


def new_session(cur, uid):
    token = secrets.token_urlsafe(32)
    cur.execute(f'INSERT INTO {t("family_sessions")} (token, user_id, expires_at) VALUES (%s, %s, %s)', (token, uid, datetime.utcnow() + timedelta(days=60)))
    cur.execute(f'UPDATE {t("family_users")} SET last_seen_at = NOW() WHERE id = %s', (uid,))
    return token


def handle_auth(cur, action, body, headers):
    if action == 'register':
        name, email, password = clean(body.get('name')), (clean(body.get('email')) or '').lower(), body.get('password') or ''
        if not name or '@' not in email or len(password) < 6:
            return resp(400, {'error': 'Укажите имя, email и пароль не короче 6 символов'})
        cur.execute(f'SELECT id FROM {t("family_users")} WHERE email = %s', (email,))
        if cur.fetchone():
            return resp(400, {'error': 'Этот email уже зарегистрирован — войдите'})
        relation = body.get('relation') if body.get('relation') in RELATIONS else 'other'
        cur.execute(f"INSERT INTO {t('family_users')} (name, email, phone, relation, password_hash, trial_ends_at) VALUES (%s, %s, %s, %s, %s, NOW() + INTERVAL '3 days') RETURNING id", (name, email, clean(body.get('phone')), relation, hash_password(password)))
        uid = cur.fetchone()['id']
        return resp(200, {'token': new_session(cur, uid)})
    if action == 'login':
        email = (clean(body.get('email')) or '').lower()
        cur.execute(f'SELECT id, password_hash, is_active FROM {t("family_users")} WHERE email = %s', (email,))
        u = cur.fetchone()
        if not u or not u['is_active'] or not check_password(body.get('password') or '', u['password_hash']):
            return resp(401, {'error': 'Неверный email или пароль'})
        return resp(200, {'token': new_session(cur, u['id'])})
    if action == 'logout':
        cur.execute(f'UPDATE {t("family_sessions")} SET expires_at = NOW() WHERE token = %s', (token_of(headers),))
        return resp(200, {'ok': True})
    user = family_user(cur, headers)
    if not user:
        return resp(401, {'error': 'Требуется вход'})
    if action == 'update':
        relation = body.get('relation') if body.get('relation') in RELATIONS else user['relation']
        cur.execute(f'UPDATE {t("family_users")} SET name = COALESCE(%s, name), phone = %s, relation = %s WHERE id = %s', (clean(body.get('name')), clean(body.get('phone')), relation, user['id']))
        user = family_user(cur, headers)
    cur.execute(f"SELECT COUNT(*) FILTER (WHERE status = 'answered') AS answered, COUNT(*) FILTER (WHERE status = 'new') AS waiting FROM {t('family_questions')} WHERE user_id = %s", (user['id'],))
    q = cur.fetchone()
    cur.execute(f"SELECT COUNT(*) AS c FROM {t('family_event_regs')} r JOIN {t('family_events')} e ON e.id = r.event_id WHERE r.user_id = %s AND e.starts_at > NOW()", (user['id'],))
    ev = cur.fetchone()['c']
    cur.execute(f"SELECT COUNT(*) AS c FROM {t('family_ai_chats')} WHERE user_id = %s", (user['id'],))
    ai = cur.fetchone()['c']
    acc = access_info(cur, user['id'])
    return resp(200, {'user': user, 'stats': {'answered': q['answered'], 'waiting': q['waiting'], 'events': ev, 'ai_chats': ai, **acc}})


def handle_questions(cur, method, body, user):
    if method == 'POST':
        if not access_info(cur, user['id'])['can_ask']:
            return resp(402, {'error': 'Пробный период закончился. Чтобы задавать вопросы психологу, оформите тариф в разделе «Тарифы и баланс».'})
        text = clean(body.get('question'))
        if not text or len(text) < 10:
            return resp(400, {'error': 'Опишите вопрос подробнее'})
        cur.execute(f'INSERT INTO {t("family_questions")} (user_id, topic, question) VALUES (%s, %s, %s) RETURNING *', (user['id'], clean(body.get('topic')), text[:5000]))
        return resp(200, {'item': cur.fetchone()})
    cur.execute(f'SELECT q.*, cu.name AS answered_by_name FROM {t("family_questions")} q LEFT JOIN {t("crm_users")} cu ON cu.id = q.answered_by WHERE q.user_id = %s ORDER BY q.created_at DESC', (user['id'],))
    return resp(200, {'items': cur.fetchall()})


def handle_events(cur, method, params, user):
    if method == 'POST':
        eid = int(params.get('id') or 0)
        cur.execute(f"SELECT e.capacity, (SELECT COUNT(*) FROM {t('family_event_regs')} r WHERE r.event_id = e.id) AS regs FROM {t('family_events')} e WHERE e.id = %s AND e.status = 'published' AND e.starts_at > NOW()", (eid,))
        e = cur.fetchone()
        if not e:
            return resp(404, {'error': 'Событие недоступно'})
        if params.get('action') == 'cancel':
            cur.execute(f'DELETE FROM {t("family_event_regs")} WHERE event_id = %s AND user_id = %s', (eid, user['id']))
            return resp(200, {'ok': True})
        if e['capacity'] and e['regs'] >= e['capacity']:
            return resp(400, {'error': 'Все места заняты'})
        cur.execute(f'INSERT INTO {t("family_event_regs")} (event_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING', (eid, user['id']))
        return resp(200, {'ok': True})
    cur.execute(f"""SELECT e.*, (SELECT COUNT(*) FROM {t('family_event_regs')} r WHERE r.event_id = e.id) AS regs,
        EXISTS(SELECT 1 FROM {t('family_event_regs')} r WHERE r.event_id = e.id AND r.user_id = %s) AS registered
        FROM {t('family_events')} e WHERE e.status = 'published' AND e.starts_at > NOW() - INTERVAL '30 days' ORDER BY e.starts_at""", (user['id'],))
    items = cur.fetchall()
    for it in items:
        if not it['registered']:
            it['link'] = None
            if it['kind'] == 'offline':
                it['location'] = (it['location'] or '').split('(')[0].strip() or None
    return resp(200, {'items': items})


def handle_admin(cur, resource, method, params, body, staff):
    eid = int(params['id']) if params.get('id') else None
    if resource == 'admin_questions':
        if method == 'PUT' and eid:
            answer = clean(body.get('answer'))
            if not answer:
                return resp(400, {'error': 'Введите ответ'})
            cur.execute(f"UPDATE {t('family_questions')} SET answer = %s, answered_by = %s, status = 'answered', answered_at = NOW() WHERE id = %s RETURNING *", (answer, staff['id'], eid))
            item = cur.fetchone()
            if item:
                preview = (item['question'] or '')[:80]
                push_lib.send_to_user(cur, t, item['user_id'], {
                    'title': 'Психолог ответил на ваш вопрос',
                    'body': f'«{preview}»' + ('…' if len(item['question'] or '') > 80 else ''),
                    'url': '/family?s=questions',
                    'tag': f'question-{eid}',
                }, 'answer', eid)
            return resp(200, {'item': item})
        where, args = '1=1', []
        if params.get('status'):
            where, args = 'q.status = %s', [params['status']]
        cur.execute(f'SELECT q.*, u.name AS user_name, u.email AS user_email, u.phone AS user_phone, u.relation AS user_relation, cu.name AS answered_by_name FROM {t("family_questions")} q JOIN {t("family_users")} u ON u.id = q.user_id LEFT JOIN {t("crm_users")} cu ON cu.id = q.answered_by WHERE {where} ORDER BY (q.status = %s) DESC, q.created_at DESC LIMIT 300', args + ['new'])
        return resp(200, {'items': cur.fetchall()})
    if resource == 'admin_events':
        if method in ('POST', 'PUT'):
            data = {k: clean(body.get(k)) for k in EVENT_FIELDS if k in body}
            if data.get('kind') not in (None, 'webinar', 'offline'):
                data['kind'] = 'webinar'
            if method == 'POST':
                if not data.get('title') or not data.get('starts_at'):
                    return resp(400, {'error': 'Укажите название и дату'})
                cols = ', '.join(data)
                cur.execute(f"INSERT INTO {t('family_events')} ({cols}) VALUES ({', '.join(['%s'] * len(data))}) RETURNING *", list(data.values()))
            else:
                sets = ', '.join(f'{k} = %s' for k in data)
                cur.execute(f"UPDATE {t('family_events')} SET {sets}, updated_at = NOW() WHERE id = %s RETURNING *", list(data.values()) + [eid])
            return resp(200, {'item': cur.fetchone()})
        if method == 'DELETE' and eid:
            cur.execute(f"UPDATE {t('family_events')} SET status = 'archived', updated_at = NOW() WHERE id = %s", (eid,))
            return resp(200, {'ok': True})
        if eid and params.get('regs'):
            cur.execute(f'SELECT u.name, u.email, u.phone, u.relation, r.created_at FROM {t("family_event_regs")} r JOIN {t("family_users")} u ON u.id = r.user_id WHERE r.event_id = %s ORDER BY r.created_at', (eid,))
            return resp(200, {'items': cur.fetchall()})
        cur.execute(f"SELECT e.*, (SELECT COUNT(*) FROM {t('family_event_regs')} r WHERE r.event_id = e.id) AS regs FROM {t('family_events')} e WHERE e.status <> 'archived' ORDER BY e.starts_at DESC")
        return resp(200, {'items': cur.fetchall()})
    if resource == 'admin_users':
        cur.execute(f"""SELECT u.id, u.name, u.email, u.phone, u.relation, u.created_at, u.last_seen_at,
            (SELECT COUNT(*) FROM {t('family_questions')} q WHERE q.user_id = u.id) AS questions,
            (SELECT COUNT(*) FROM {t('family_event_regs')} r WHERE r.user_id = u.id) AS events,
            (SELECT COUNT(*) FROM {t('family_ai_chats')} c WHERE c.user_id = u.id) AS ai_chats
            FROM {t('family_users')} u ORDER BY u.created_at DESC LIMIT 500""")
        return resp(200, {'items': cur.fetchall()})
    if resource == 'admin_stats':
        cur.execute(f"""SELECT (SELECT COUNT(*) FROM {t('family_users')}) AS users,
            (SELECT COUNT(*) FROM {t('family_questions')} WHERE status = 'new') AS new_questions,
            (SELECT COUNT(*) FROM {t('family_events')} WHERE status = 'published' AND starts_at > NOW()) AS upcoming,
            (SELECT COUNT(*) FROM {t('family_ai_chats')}) AS ai_chats""")
        return resp(200, cur.fetchone())
    return resp(404, {'error': 'Неизвестный запрос'})


def handler(event: dict, context) -> dict:
    """Кабинет родственников: регистрация и вход, вопросы психологу, офлайн-встречи и вебинары, управление из админ-панели"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT') else {}
    resource = params.get('resource', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if resource == 'auth':
            return handle_auth(cur, params.get('action', 'me'), body, headers)
        if resource.startswith('admin_'):
            staff = staff_user(cur, headers)
            if not staff:
                return resp(401, {'error': 'Требуется вход в CRM'})
            return handle_admin(cur, resource, method, params, body, staff)
        user = family_user(cur, headers)
        if not user:
            return resp(401, {'error': 'Требуется вход'})
        if resource == 'questions':
            return handle_questions(cur, method, body, user)
        if resource == 'events':
            return handle_events(cur, method, params, user)
        if resource == 'billing':
            code, data = billing.handle(cur, t, method, params, body, user)
            return resp(code, data)
        return resp(404, {'error': 'Неизвестный запрос'})
    finally:
        cur.close()
        conn.close()
