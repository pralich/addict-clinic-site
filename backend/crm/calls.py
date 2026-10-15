import json
import os
import re
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from reqlog import write_log


def _norm(v):
    d = re.sub(r'\D', '', v or '')
    if len(d) == 11 and d[0] in '78':
        return '7' + d[1:]
    if len(d) == 10:
        return '7' + d
    return d


def handle_make_call(cur, t, body, user, resp):
    phone = _norm(str(body.get('phone') or ''))
    if len(phone) < 10:
        return resp(400, {'error': 'Некорректный номер телефона'})
    cur.execute(f"SELECT pbx_login FROM {t('crm_users')} WHERE id = %s", (user['id'],))
    login = ((cur.fetchone() or {}).get('pbx_login') or '').strip()
    if not login:
        return resp(400, {'error': 'Не указан ваш логин в АТС. Попросите администратора заполнить его в разделе «Пользователи»'})
    domain = (os.environ.get('MEGAPBX_DOMAIN') or '').strip().replace('https://', '').replace('http://', '').strip('/')
    key = os.environ.get('MEGAPBX_API_KEY') or ''
    if not domain or not key:
        return resp(400, {'error': 'Звонки через АТС не настроены: нет адреса АТС или ключа API'})
    payload = {'phone': phone, 'user': login}
    url = f'https://{domain}/crmapi/v1/makecall'
    req = Request(url, data=json.dumps(payload).encode(), headers={'X-API-KEY': key, 'Content-Type': 'application/json'}, method='POST')
    started = time.time()

    def out_log(code, response, error=None):
        write_log('telephony', 'out', 'POST', 'makecall', code, int((time.time() - started) * 1000),
                  {'url': url, 'body': payload, 'crm_user': user.get('name')}, response, None, error, None, user['id'])

    try:
        raw = urlopen(req, timeout=8).read().decode('utf-8', 'replace')
    except HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')[:300]
        out_log(e.code, detail, f'HTTP {e.code}')
        msg = 'АТС не приняла ключ API' if e.code in (401, 403) else 'Сотрудник с таким логином не найден в АТС' if e.code == 404 else f'АТС вернула ошибку {e.code}'
        return resp(502, {'error': msg})
    except Exception as e:
        out_log(0, None, f'{type(e).__name__}: {e}')
        return resp(502, {'error': 'АТС не отвечает, попробуйте ещё раз'})
    try:
        data = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        data = {}
    out_log(200, data or raw)
    return resp(200, {'ok': True, 'uuid': data.get('uuid')})


def handle_live_calls(cur, t, resp):
    cur.execute(f"""SELECT lc.callid, lc.direction, lc.state, lc.phone, lc.phone_digits, lc.pbx_user, lc.diversion, lc.lead_id, lc.client_id, lc.started_at,
            cl.full_name AS client_name, cl.status AS client_status, cl.notes AS client_notes,
            l.name AS lead_name, l.status AS lead_status, l.topic AS lead_topic, l.created_at AS lead_created_at,
            COALESCE(mc.name, ml.name) AS manager_name
        FROM {t('crm_live_calls')} lc
        LEFT JOIN {t('crm_clients')} cl ON cl.id = lc.client_id
        LEFT JOIN {t('crm_leads')} l ON l.id = lc.lead_id
        LEFT JOIN {t('crm_users')} mc ON mc.id = cl.manager_id
        LEFT JOIN {t('crm_users')} ml ON ml.id = l.manager_id
        WHERE lc.state IN ('ringing', 'talking') AND lc.updated_at > NOW() - INTERVAL '30 minutes'
        ORDER BY lc.started_at DESC LIMIT 5""")
    items = cur.fetchall()
    for it in items:
        d = it.pop('phone_digits') or ''
        it['prev_calls'] = 0
        it['last_call_at'] = None
        it['deal'] = None
        it['last_note'] = None
        if len(d) >= 10:
            cur.execute(f"SELECT COUNT(*) AS n, MAX(started_at) AS last FROM {t('crm_calls')} WHERE phone_digits = %s", (d,))
            r = cur.fetchone()
            it['prev_calls'], it['last_call_at'] = r['n'], r['last']
        if it['client_id']:
            cur.execute(f"""SELECT id, title, stage, amount FROM {t('crm_deals')} WHERE client_id = %s AND archived_at IS NULL
                ORDER BY (stage IN ('won', 'lost')), updated_at DESC LIMIT 1""", (it['client_id'],))
            it['deal'] = cur.fetchone()
        et, ei = ('clients', it['client_id']) if it['client_id'] else ('leads', it['lead_id'])
        if ei:
            cur.execute(f"""SELECT a.text, a.kind, a.created_at, u.name AS user_name FROM {t('crm_activities')} a LEFT JOIN {t('crm_users')} u ON u.id = a.user_id
                WHERE a.entity_type = %s AND a.entity_id = %s AND a.kind IN ('note', 'call', 'meeting') AND a.user_id IS NOT NULL
                ORDER BY a.created_at DESC LIMIT 1""", (et, ei))
            it['last_note'] = cur.fetchone()
    return resp(200, {'items': items})


def handle_calls(cur, t, params, resp):
    where = ['1=1']
    args = []
    direction = params.get('direction')
    if direction in ('in', 'out'):
        where.append('c.direction = %s')
        args.append(direction)
    if params.get('missed') == '1':
        where.append("c.status = 'missed'")
    if params.get('new_leads') == '1':
        where.append('c.lead_created')
    if params.get('with_record') == '1':
        where.append('c.record_url IS NOT NULL')
    digits = re.sub(r'\D', '', params.get('q') or '')
    if digits:
        where.append('c.phone_digits LIKE %s')
        args.append(f'%{digits[-10:]}%')
    try:
        page = max(1, int(params.get('page') or 1))
    except ValueError:
        page = 1
    per = 50
    w = ' AND '.join(where)
    cur.execute(f"""SELECT c.id, c.direction, c.status, c.phone, c.pbx_user, c.ext, c.group_name, c.telnum, c.started_at, c.duration, c.wait,
            c.record_url, c.lead_id, c.client_id, c.lead_created, l.name AS lead_name, cl.full_name AS client_name
        FROM {t('crm_calls')} c
        LEFT JOIN {t('crm_leads')} l ON l.id = c.lead_id
        LEFT JOIN {t('crm_clients')} cl ON cl.id = c.client_id
        WHERE {w} ORDER BY c.started_at DESC NULLS LAST, c.id DESC LIMIT {per + 1} OFFSET {(page - 1) * per}""", args)
    rows = cur.fetchall()
    cur.execute(f"""SELECT
            COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '1 day') AS today,
            COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '1 day' AND direction = 'in') AS today_in,
            COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '1 day' AND status = 'missed') AS today_missed,
            COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '7 days' AND lead_created) AS week_leads
        FROM {t('crm_calls')}""")
    stats = cur.fetchone()
    return resp(200, {'items': rows[:per], 'has_more': len(rows) > per, 'page': page, 'stats': stats})