import json
import os
from datetime import datetime, timedelta

import psycopg2
import psycopg2.extras

import push_lib

SCHEMA = 't_p15395438_addict_clinic_site'
MSK_OFFSET_HOURS = 3

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


def family_user(cur, headers):
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    cur.execute(f'SELECT u.id, u.name FROM {t("family_sessions")} s JOIN {t("family_users")} u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active', (token,))
    return cur.fetchone()


def remind_events(cur):
    now_msk = datetime.utcnow() + timedelta(hours=MSK_OFFSET_HOURS)
    cur.execute(f"""SELECT r.user_id, e.id, e.title, e.kind, e.starts_at
        FROM {t('family_event_regs')} r JOIN {t('family_events')} e ON e.id = r.event_id
        WHERE e.status = 'published' AND e.starts_at > %s AND e.starts_at <= %s
          AND NOT EXISTS (SELECT 1 FROM {t('family_push_log')} l WHERE l.user_id = r.user_id AND l.kind = 'event_1h' AND l.ref_id = e.id)
        LIMIT 200""", (now_msk, now_msk + timedelta(minutes=60)))
    sent = 0
    for row in cur.fetchall():
        what = 'Вебинар' if row['kind'] == 'webinar' else 'Встреча'
        when = row['starts_at'].strftime('%H:%M')
        sent += push_lib.send_to_user(cur, t, row['user_id'], {
            'title': f'{what} начнётся через час',
            'body': f"«{row['title']}» — в {when}. {'Ссылка на эфир — в кабинете.' if row['kind'] == 'webinar' else 'Адрес — в кабинете.'}",
            'url': '/family?s=events',
            'tag': f"event-{row['id']}",
        }, 'event_1h', row['id'])
    return sent


def handler(event: dict, context) -> dict:
    """Push-уведомления кабинета для близких: ключ, подписка устройства, тест и рассылка напоминаний за час до встреч и вебинаров"""
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
        if action == 'key':
            pub, _ = push_lib.get_keys(cur, t)
            return resp(200, {'public_key': pub})
        if action == 'tick':
            return resp(200, {'sent': remind_events(cur)})

        user = family_user(cur, headers)
        if not user:
            return resp(401, {'error': 'Требуется вход'})

        if action == 'subscribe' and method == 'POST':
            sub = body.get('subscription') or {}
            keys = sub.get('keys') or {}
            if not sub.get('endpoint') or not keys.get('p256dh') or not keys.get('auth'):
                return resp(400, {'error': 'Некорректная подписка'})
            cur.execute(f"""INSERT INTO {t('family_push_subs')} (user_id, endpoint, p256dh, auth) VALUES (%s, %s, %s, %s)
                ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, is_active = TRUE""",
                        (user['id'], sub['endpoint'], keys['p256dh'], keys['auth']))
            return resp(200, {'ok': True})
        if action == 'unsubscribe' and method == 'POST':
            cur.execute(f'UPDATE {t("family_push_subs")} SET is_active = FALSE WHERE endpoint = %s AND user_id = %s', (body.get('endpoint') or '', user['id']))
            return resp(200, {'ok': True})
        if action == 'test' and method == 'POST':
            n = push_lib.send_to_user(cur, t, user['id'], {'title': 'Уведомления включены', 'body': 'Мы сообщим, когда психолог ответит, и напомним о встрече за час.', 'url': '/family'})
            return resp(200, {'sent': n})
        return resp(404, {'error': 'Неизвестный запрос'})
    finally:
        cur.close()
        conn.close()
