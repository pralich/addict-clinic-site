import re
import json
import os
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras

import push_lib

SCHEMA = 't_p15395438_addict_clinic_site'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}


def t(name):
    return f'{SCHEMA}.{name}'


def resp(status, data):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def crm_user(cur, headers):
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    cur.execute(f'SELECT u.id, u.name FROM {t("crm_sessions")} s JOIN {t("crm_users")} u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active', (token,))
    return cur.fetchone()


def _subs(cur, flag):
    cur.execute(f'SELECT s.id, s.endpoint, s.p256dh, s.auth, u.role FROM {t("crm_push_subs")} s JOIN {t("crm_users")} u ON u.id = s.user_id WHERE s.is_active AND u.is_active AND s.{flag}')
    return cur.fetchall()


def _claim(cur, kind, ref_id):
    cur.execute(f'INSERT INTO {t("crm_push_log")} (kind, ref_id) VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING id', (kind, ref_id))
    return cur.fetchone()


EMAIL_RE = re.compile(r'([\w.+-]+)@([\w-]+(?:\.[\w-]+)+)')
PHONE_RE = re.compile(r'\+?\d[\d\s()\-]{5,}\d')


def _mask_phone(v):
    total = sum(c.isdigit() for c in v)
    if total < 7:
        return v
    head, out, i = (4 if total >= 11 else 1), [], 0
    for c in v:
        if c.isdigit():
            i += 1
            out.append(c if i <= head or i > total - 2 else '*')
        else:
            out.append(c)
    return ''.join(out)


def mask_text(v):
    v = EMAIL_RE.sub(lambda m: (m.group(1)[:2] if len(m.group(1)) > 3 else m.group(1)[:1]) + '***@' + m.group(2), v or '')
    return PHONE_RE.sub(lambda m: _mask_phone(m.group(0)), v)


def _short(s, n=90):
    s = (s or '').strip().replace('\n', ' ')
    return s if len(s) <= n else s[:n - 1] + '…'


def notify(cur):
    """Находит новые лиды и оплаченные заказы магазина, о которых ещё не сообщали, и рассылает push"""
    sent = 0
    cur.execute(f"""SELECT l.id, l.name, l.contact, l.topic, l.message, l.source FROM {t('crm_leads')} l
        WHERE l.created_at > NOW() - INTERVAL '1 day'
          AND NOT EXISTS (SELECT 1 FROM {t('crm_push_log')} p WHERE p.kind = 'lead' AND p.ref_id = l.id)
        ORDER BY l.id LIMIT 20""")
    leads = cur.fetchall()
    if leads:
        subs = _subs(cur, 'notify_leads')
        for l in leads:
            if not _claim(cur, 'lead', l['id']):
                continue
            who = l['name'] or 'Без имени'
            body = ' · '.join(x for x in [l['contact'], l['topic'], _short(l['message'], 60)] if x)
            full = [s for s in subs if s['role'] != 'leads_only']
            limited = [s for s in subs if s['role'] == 'leads_only']
            meta = {'url': f"/admin?page=leads&open=leads:{l['id']}", 'tag': f"lead-{l['id']}"}
            sent += push_lib.send(cur, t, full, {'title': f'Новый лид: {who}', 'body': body or 'Заявка с сайта', **meta})
            if limited:
                sent += push_lib.send(cur, t, limited, {'title': f"Новый лид: {mask_text(who)}", 'body': mask_text(l['topic'] or '') or 'Заявка с сайта', **meta})

    cur.execute(f"""SELECT o.id, o.order_number, o.user_name, o.amount, o.delivery_address FROM {t('orders')} o
        WHERE o.source = 'shop' AND o.status = 'paid' AND COALESCE(o.paid_at, o.created_at) > NOW() - INTERVAL '1 day'
          AND NOT EXISTS (SELECT 1 FROM {t('crm_push_log')} p WHERE p.kind = 'order' AND p.ref_id = o.id)
        ORDER BY o.id LIMIT 20""")
    orders = cur.fetchall()
    if orders:
        subs = [s for s in _subs(cur, 'notify_orders') if s['role'] != 'leads_only']
        for o in orders:
            if not _claim(cur, 'order', o['id']):
                continue
            cur.execute(f"SELECT product_name, quantity FROM {t('order_items')} WHERE order_id = %s AND product_id <> 'delivery' ORDER BY id", (o['id'],))
            items = ', '.join(f"{i['product_name']}{' ×' + str(i['quantity']) if i['quantity'] > 1 else ''}" for i in cur.fetchall())
            amount = f"{int(o['amount']):,}".replace(',', ' ')
            sent += push_lib.send(cur, t, subs, {
                'title': f'Оплачен заказ на {amount} ₽', 'body': f"{o['user_name'] or 'Покупатель'}: {_short(items, 100)}" + (' · нужна доставка' if o['delivery_address'] else ''),
                'url': '/admin?page=orders', 'tag': f"order-{o['id']}",
            })
    sent += notify_tasks(cur)
    sent += notify_missed(cur)
    return sent


TOP_CARD = f"""
    LEFT JOIN LATERAL (SELECT d.id, d.title FROM {t('crm_deals')} d
        WHERE d.archived_at IS NULL AND d.trashed_at IS NULL
          AND (d.lead_id = c.lead_id OR d.client_id = COALESCE(c.client_id, l.client_id))
        ORDER BY (d.lead_id IS NOT DISTINCT FROM c.lead_id) DESC, d.created_at DESC LIMIT 1) dl ON TRUE"""


def notify_missed(cur):
    """Пропущенные входящие звонки: push со ссылкой на самую значимую карточку (сделка > лид > контакт)"""
    cur.execute(f"""SELECT c.id, c.phone, c.started_at, c.lead_id, c.client_id,
            l.name AS lead_name, (l.id IS NOT NULL AND l.archived_at IS NULL AND l.trashed_at IS NULL) AS lead_alive,
            cl.full_name AS client_name, dl.id AS deal_id, dl.title AS deal_title
        FROM {t('crm_calls')} c
        LEFT JOIN {t('crm_leads')} l ON l.id = c.lead_id
        LEFT JOIN {t('crm_clients')} cl ON cl.id = c.client_id
        {TOP_CARD}
        WHERE c.direction = 'in' AND c.status = 'missed' AND c.started_at > NOW() - INTERVAL '3 hours'
          AND NOT EXISTS (SELECT 1 FROM {t('crm_push_log')} p WHERE p.kind = 'missed_call' AND p.ref_id = c.id)
        ORDER BY c.id LIMIT 20""")
    calls = cur.fetchall()
    if not calls:
        return 0
    subs = [s for s in _subs(cur, 'notify_calls') if s['role'] != 'leads_only']
    sent = 0
    for c in calls:
        if not _claim(cur, 'missed_call', c['id']):
            continue
        if c['deal_id']:
            card, url = f"Сделка: {c['deal_title'] or '#' + str(c['deal_id'])}", f"/admin?page=deals&open=deals:{c['deal_id']}"
        elif c['lead_id'] and c['lead_alive']:
            card, url = f"Лид: {c['lead_name'] or 'без имени'}", f"/admin?page=leads&open=leads:{c['lead_id']}"
        elif c['client_id']:
            card, url = f"Контакт: {c['client_name'] or 'без имени'}", f"/admin?page=clients&open=clients:{c['client_id']}"
        else:
            card, url = 'Новый номер', '/admin?page=calls'
        when = (c['started_at'] + timedelta(hours=3)).strftime('%H:%M') if c['started_at'] else ''
        sent += push_lib.send(cur, t, subs, {
            'title': f"Пропущенный звонок: {c['phone'] or 'скрытый номер'}",
            'body': ' · '.join(x for x in [card, when, 'перезвоните'] if x),
            'url': url, 'tag': f"missed-{c['id']}",
        })
    return sent


def _user_subs(cur, user_id):
    cur.execute(f'SELECT id, endpoint, p256dh, auth FROM {t("crm_push_subs")} WHERE user_id = %s AND is_active AND notify_tasks', (user_id,))
    return cur.fetchall()


def _members(cur, task_id):
    cur.execute(f"SELECT user_id FROM {t('crm_task_members')} WHERE task_id = %s", (task_id,))
    return [r['user_id'] for r in cur.fetchall()]


def _fmt_due(d):
    if not d:
        return 'без срока'
    return (d + timedelta(hours=3)).strftime('%d.%m %H:%M')


def notify_tasks(cur):
    """Уведомления по задачам: новая задача исполнителю, наступил срок, новый комментарий"""
    sent = 0
    cur.execute(f"""UPDATE {t('crm_activities')} SET assign_notified_to = assignee_id
        WHERE kind = 'task' AND assignee_id IS NOT NULL AND assign_notified_to IS DISTINCT FROM assignee_id
          AND (done_at IS NOT NULL OR assignee_id = user_id OR created_at < NOW() - INTERVAL '2 days' AND updated_at IS NULL)
        RETURNING id""")
    cur.execute(f"""SELECT a.id, a.text, a.due_at, a.priority, a.assignee_id, u.name AS author FROM {t('crm_activities')} a
        LEFT JOIN {t('crm_users')} u ON u.id = a.user_id
        WHERE a.kind = 'task' AND a.done_at IS NULL AND a.assignee_id IS NOT NULL
          AND a.assign_notified_to IS DISTINCT FROM a.assignee_id ORDER BY a.id LIMIT 30""")
    for a in cur.fetchall():
        cur.execute(f"UPDATE {t('crm_activities')} SET assign_notified_to = %s WHERE id = %s AND assign_notified_to IS DISTINCT FROM %s RETURNING id",
                    (a['assignee_id'], a['id'], a['assignee_id']))
        if not cur.fetchone():
            continue
        sent += push_lib.send(cur, t, _user_subs(cur, a['assignee_id']), {
            'title': ('Срочная задача' if a['priority'] == 'high' else 'Новая задача') + f" от {a['author'] or 'коллеги'}",
            'body': f"{_short(a['text'])} · срок {_fmt_due(a['due_at'])}",
            'url': f"/admin?page=tasks&task={a['id']}", 'tag': f"task-{a['id']}",
        })

    cur.execute(f"""SELECT m.task_id, m.user_id, a.text, a.due_at, a.priority, u.name AS author FROM {t('crm_task_members')} m
        JOIN {t('crm_activities')} a ON a.id = m.task_id LEFT JOIN {t('crm_users')} u ON u.id = a.user_id
        WHERE NOT m.notified ORDER BY m.created_at LIMIT 30""")
    for m in cur.fetchall():
        cur.execute(f"UPDATE {t('crm_task_members')} SET notified = TRUE WHERE task_id = %s AND user_id = %s AND NOT notified RETURNING task_id", (m['task_id'], m['user_id']))
        if not cur.fetchone():
            continue
        sent += push_lib.send(cur, t, _user_subs(cur, m['user_id']), {
            'title': f"Вы соисполнитель · от {m['author'] or 'коллеги'}",
            'body': f"{_short(m['text'])} · срок {_fmt_due(m['due_at'])}",
            'url': f"/admin?page=tasks&task={m['task_id']}", 'tag': f"task-{m['task_id']}",
        })

    cur.execute(f"""SELECT a.id, a.text, a.due_at, a.assignee_id FROM {t('crm_activities')} a
        WHERE a.kind = 'task' AND a.done_at IS NULL AND a.assignee_id IS NOT NULL AND a.due_at IS NOT NULL
          AND a.due_at <= NOW() AND a.due_notified_at IS NULL ORDER BY a.due_at LIMIT 30""")
    for a in cur.fetchall():
        cur.execute(f"UPDATE {t('crm_activities')} SET due_notified_at = NOW() WHERE id = %s AND due_notified_at IS NULL RETURNING id", (a['id'],))
        if not cur.fetchone():
            continue
        late = a['due_at'] < datetime.utcnow() - timedelta(hours=1)
        payload = {
            'title': 'Задача просрочена' if late else 'Наступил срок задачи',
            'body': f"{_short(a['text'])} · срок был {_fmt_due(a['due_at'])}" if late else _short(a['text']),
            'url': f"/admin?page=tasks&task={a['id']}", 'tag': f"task-due-{a['id']}",
        }
        for uid in {a['assignee_id'], *_members(cur, a['id'])}:
            sent += push_lib.send(cur, t, _user_subs(cur, uid), payload)

    cur.execute(f"""SELECT c.id, c.task_id, c.text, c.user_id, u.name AS who, a.text AS task, a.user_id AS author_id, a.assignee_id
        FROM {t('crm_task_comments')} c JOIN {t('crm_activities')} a ON a.id = c.task_id
        LEFT JOIN {t('crm_users')} u ON u.id = c.user_id
        WHERE NOT c.notified ORDER BY c.id LIMIT 30""")
    for c in cur.fetchall():
        cur.execute(f"UPDATE {t('crm_task_comments')} SET notified = TRUE WHERE id = %s AND NOT notified RETURNING id", (c['id'],))
        if not cur.fetchone():
            continue
        for uid in {c['author_id'], c['assignee_id'], *_members(cur, c['task_id'])} - {c['user_id'], None}:
            sent += push_lib.send(cur, t, _user_subs(cur, uid), {
                'title': f"{c['who'] or 'Коллега'} · {_short(c['task'], 50)}",
                'body': _short(c['text'], 140),
                'url': f"/admin?page=tasks&task={c['task_id']}", 'tag': f"task-comment-{c['task_id']}",
            })
    return sent


def handler(event: dict, context) -> dict:
    """Push-уведомления для менеджеров CRM: подписка устройств, настройки и рассылка о новых лидах, заказах магазина и задачах"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}
    action = params.get('action', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if action == 'notify':
            return resp(200, {'sent': notify(cur)})
        if action == 'key':
            pub = push_lib.get_public_key(cur, t)
            return resp(200 if pub else 503, {'public_key': pub} if pub else {'error': 'Ключ уведомлений ещё не создан'})

        user = crm_user(cur, headers)
        if not user:
            return resp(401, {'error': 'Требуется вход'})

        if action == 'status':
            cur.execute(f'SELECT notify_leads, notify_orders, notify_tasks, notify_calls, is_active FROM {t("crm_push_subs")} WHERE endpoint = %s AND user_id = %s', (params.get('endpoint') or '', user['id']))
            row = cur.fetchone()
            return resp(200, {'subscribed': bool(row and row['is_active']), 'notify_leads': row['notify_leads'] if row else True, 'notify_orders': row['notify_orders'] if row else True, 'notify_tasks': row['notify_tasks'] if row else True, 'notify_calls': row['notify_calls'] if row else True})
        if action == 'subscribe' and method == 'POST':
            sub = body.get('subscription') or {}
            keys = sub.get('keys') or {}
            if not sub.get('endpoint') or not keys.get('p256dh') or not keys.get('auth'):
                return resp(400, {'error': 'Некорректная подписка'})
            cur.execute(f"""INSERT INTO {t('crm_push_subs')} (user_id, endpoint, p256dh, auth) VALUES (%s, %s, %s, %s)
                ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, is_active = TRUE""",
                        (user['id'], sub['endpoint'], keys['p256dh'], keys['auth']))
            return resp(200, {'ok': True})
        if action == 'settings' and method == 'POST':
            cur.execute(f'UPDATE {t("crm_push_subs")} SET notify_leads = %s, notify_orders = %s, notify_tasks = %s, notify_calls = %s WHERE endpoint = %s AND user_id = %s',
                        (bool(body.get('notify_leads')), bool(body.get('notify_orders')), body.get('notify_tasks', True) is not False, body.get('notify_calls', True) is not False, body.get('endpoint') or '', user['id']))
            return resp(200, {'ok': True})
        if action == 'unsubscribe' and method == 'POST':
            cur.execute(f'UPDATE {t("crm_push_subs")} SET is_active = FALSE WHERE endpoint = %s AND user_id = %s', (body.get('endpoint') or '', user['id']))
            return resp(200, {'ok': True})
        if action == 'test' and method == 'POST':
            cur.execute(f'SELECT id, endpoint, p256dh, auth FROM {t("crm_push_subs")} WHERE endpoint = %s AND user_id = %s AND is_active', (body.get('endpoint') or '', user['id']))
            n = push_lib.send(cur, t, cur.fetchall(), {'title': 'Уведомления CRM включены', 'body': 'Сообщим о новых лидах, пропущенных звонках, заказах и ваших задачах сразу, как они появятся.', 'url': '/admin', 'tag': 'crm-test'})
            return resp(200, {'sent': n})
        return resp(404, {'error': 'Неизвестный запрос'})
    finally:
        cur.close()
        conn.close()
