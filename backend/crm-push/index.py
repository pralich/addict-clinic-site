import json
import os

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
    cur.execute(f'SELECT s.id, s.endpoint, s.p256dh, s.auth FROM {t("crm_push_subs")} s JOIN {t("crm_users")} u ON u.id = s.user_id WHERE s.is_active AND u.is_active AND s.{flag}')
    return cur.fetchall()


def _claim(cur, kind, ref_id):
    cur.execute(f'INSERT INTO {t("crm_push_log")} (kind, ref_id) VALUES (%s, %s) ON CONFLICT DO NOTHING RETURNING id', (kind, ref_id))
    return cur.fetchone()


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
            sent += push_lib.send(cur, t, subs, {
                'title': f'Новый лид: {who}', 'body': body or 'Заявка с сайта',
                'url': f"/admin?page=leads&open=leads:{l['id']}", 'tag': f"lead-{l['id']}",
            })

    cur.execute(f"""SELECT o.id, o.order_number, o.user_name, o.amount, o.delivery_address FROM {t('orders')} o
        WHERE o.source = 'shop' AND o.status = 'paid' AND COALESCE(o.paid_at, o.created_at) > NOW() - INTERVAL '1 day'
          AND NOT EXISTS (SELECT 1 FROM {t('crm_push_log')} p WHERE p.kind = 'order' AND p.ref_id = o.id)
        ORDER BY o.id LIMIT 20""")
    orders = cur.fetchall()
    if orders:
        subs = _subs(cur, 'notify_orders')
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
    return sent


def handler(event: dict, context) -> dict:
    """Push-уведомления для менеджеров CRM: подписка устройств, настройки и рассылка о новых лидах и оплаченных заказах магазина"""
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
            cur.execute(f'SELECT notify_leads, notify_orders, is_active FROM {t("crm_push_subs")} WHERE endpoint = %s AND user_id = %s', (params.get('endpoint') or '', user['id']))
            row = cur.fetchone()
            return resp(200, {'subscribed': bool(row and row['is_active']), 'notify_leads': row['notify_leads'] if row else True, 'notify_orders': row['notify_orders'] if row else True})
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
            cur.execute(f'UPDATE {t("crm_push_subs")} SET notify_leads = %s, notify_orders = %s WHERE endpoint = %s AND user_id = %s',
                        (bool(body.get('notify_leads')), bool(body.get('notify_orders')), body.get('endpoint') or '', user['id']))
            return resp(200, {'ok': True})
        if action == 'unsubscribe' and method == 'POST':
            cur.execute(f'UPDATE {t("crm_push_subs")} SET is_active = FALSE WHERE endpoint = %s AND user_id = %s', (body.get('endpoint') or '', user['id']))
            return resp(200, {'ok': True})
        if action == 'test' and method == 'POST':
            cur.execute(f'SELECT id, endpoint, p256dh, auth FROM {t("crm_push_subs")} WHERE endpoint = %s AND user_id = %s AND is_active', (body.get('endpoint') or '', user['id']))
            n = push_lib.send(cur, t, cur.fetchall(), {'title': 'Уведомления CRM включены', 'body': 'Сообщим о новых лидах и оплаченных заказах магазина сразу, как они появятся.', 'url': '/admin', 'tag': 'crm-test'})
            return resp(200, {'sent': n})
        return resp(404, {'error': 'Неизвестный запрос'})
    finally:
        cur.close()
        conn.close()
