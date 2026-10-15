import json
import os
import re
import base64
import secrets
import hmac
import time
from urllib.error import HTTPError
from urllib.parse import urlencode
from datetime import datetime
from urllib.parse import parse_qs
from urllib.request import Request, urlopen

import boto3
import psycopg2
import psycopg2.extras

from reqlog import logged, write_log

SCHEMA = 't_p15395438_addict_clinic_site'
CRM_PUSH_URL = 'https://functions.poehali.dev/b525b7b2-701a-46d0-9842-7774ed5dcd2a?action=notify'
CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Crm-Token, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}
MISSED = {'missed', 'noanswer', 'busy', 'notavailable', 'notallowed', 'notfound', 'cancel', 'cancelled'}
STATUS_TEXT = {'success': 'состоялся', 'missed': 'пропущен', 'busy': 'занято', 'notavailable': 'недоступен', 'notallowed': 'запрещён', 'notfound': 'номер не найден', 'cancel': 'отменён', 'noanswer': 'нет ответа'}


def t(name):
    return f'{SCHEMA}.{name}'


def resp(status, data):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def read_body(event):
    raw = event.get('body') or ''
    if event.get('isBase64Encoded') and raw:
        raw = base64.b64decode(raw).decode('utf-8', 'replace')
    data = {}
    if raw.strip().startswith('{'):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            data = {}
    elif raw:
        data = {k: v[0] for k, v in parse_qs(raw, keep_blank_values=True).items()}
    for k, v in (event.get('queryStringParameters') or {}).items():
        data.setdefault(k, v)
    return {k: (str(v).strip() if v is not None else '') for k, v in data.items()}


def digits10(v):
    d = re.sub(r'\D', '', v or '')
    return d[-10:] if len(d) >= 10 else d


def pretty_phone(v):
    d = re.sub(r'\D', '', v or '')
    if len(d) == 11 and d[0] in '78':
        return '+7' + d[1:]
    if len(d) == 10:
        return '+7' + d
    return ('+' + d) if d else (v or '')


def parse_start(v):
    for fmt in ('%Y%m%dT%H%M%SZ', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(v, fmt)
        except (ValueError, TypeError):
            continue
    return datetime.utcnow()


def to_int(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return 0


def find_contact(cur, d10):
    if len(d10) < 10:
        return None, None
    pat = f'%{d10}'
    cur.execute(f"""SELECT id, full_name FROM {t('crm_clients')}
        WHERE archived_at IS NULL AND (regexp_replace(COALESCE(phone, ''), '\\D', '', 'g') LIKE %s OR regexp_replace(COALESCE(rep_phone, ''), '\\D', '', 'g') LIKE %s)
        ORDER BY id LIMIT 1""", (pat, pat))
    client = cur.fetchone()
    cur.execute(f"""SELECT id, name, client_id FROM {t('crm_leads')}
        WHERE archived_at IS NULL AND (regexp_replace(contact, '\\D', '', 'g') LIKE %s OR regexp_replace(COALESCE(rep_phone, ''), '\\D', '', 'g') LIKE %s)
        ORDER BY id DESC LIMIT 1""", (pat, pat))
    lead = cur.fetchone()
    return client, lead


def save_record(link, callid):
    if not link:
        return None
    try:
        data = urlopen(Request(link, headers={'User-Agent': 'addict-crm'}), timeout=25).read()
    except Exception as e:
        print(f'record download failed {callid}: {e}')
        return None
    if len(data) < 500:
        return None
    s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev', aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'], aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    safe = re.sub(r'[^A-Za-z0-9_-]', '', callid)[:60] or 'call'
    key = f'calls/{datetime.utcnow():%Y/%m}/{safe}-{secrets.token_hex(12)}.mp3'
    s3.put_object(Bucket='files', Key=key, Body=data, ContentType='audio/mpeg')
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def ping_push():
    try:
        urlopen(CRM_PUSH_URL, timeout=2.5).read()
    except Exception as e:
        print(f'crm push ping failed: {e}')


def log_activity(cur, entity_type, entity_id, text, kind='system', direction=None, result=None, duration=None):
    cur.execute(f"""INSERT INTO {t('crm_activities')} (entity_type, entity_id, user_id, kind, text, done_at, result, direction, duration_min)
        VALUES (%s, %s, NULL, %s, %s, %s, %s, %s, %s)""",
        (entity_type, entity_id, kind, text, datetime.utcnow() if kind == 'call' else None, result, direction, duration))


def handle_history(cur, d):
    callid = (d.get('callid') or '')[:150]
    if not callid:
        return resp(400, {'error': 'callid обязателен'})
    cur.execute(f"SELECT id FROM {t('crm_calls')} WHERE callid = %s", (callid,))
    if cur.fetchone():
        return resp(200, {'ok': True, 'duplicate': True})

    status_raw = (d.get('status') or '').lower()
    typ = (d.get('type') or '').lower()
    direction = 'out' if typ == 'out' else 'in'
    is_missed = typ == 'missed' or (direction == 'in' and status_raw in MISSED)
    status = 'missed' if (is_missed and direction == 'in') else (status_raw or 'success')
    phone = pretty_phone(d.get('phone'))
    d10 = digits10(phone)
    duration = to_int(d.get('duration'))
    started = parse_start(d.get('start'))
    link = d.get('link') or None

    client, lead = find_contact(cur, d10)
    lead_created = False
    if not client and not lead and len(d10) >= 10:
        topic = {'in': 'Входящий звонок', 'out': 'Исходящий звонок'}[direction]
        if is_missed:
            topic = 'Пропущенный звонок'
        cur.execute(f"""INSERT INTO {t('crm_leads')} (name, contact, topic, source, status, channel, form)
            VALUES (%s, %s, %s, 'phone', 'new', NULL, 'call') RETURNING id, name, client_id""", (None, phone, topic))
        lead = cur.fetchone()
        lead_created = True
        log_activity(cur, 'leads', lead['id'], f'Лид создан автоматически по звонку с {phone}')

    record_url = None
    raw = {k: v for k, v in d.items() if k != 'crm_token'}
    cur.execute(f"""INSERT INTO {t('crm_calls')}
        (callid, direction, status, phone, phone_digits, pbx_user, ext, group_name, diversion, telnum, started_at, duration, wait, record_source_url, record_url, lead_id, client_id, lead_created, raw)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (callid, direction, status[:30], phone[:50], d10, (d.get('user') or '')[:150] or None, (d.get('ext') or '')[:50] or None,
         (d.get('groupRealName') or d.get('group_name') or '')[:200] or None, pretty_phone(d.get('diversion'))[:50] or None,
         pretty_phone(d.get('telnum'))[:50] or None, started, duration, to_int(d.get('wait')) or None, link, record_url,
         lead['id'] if lead else None, client['id'] if client else None, lead_created, json.dumps(raw, ensure_ascii=False)))
    call_id = cur.fetchone()['id']
    cur.execute(f"UPDATE {t('crm_live_calls')} SET state = 'ended', lead_id = %s, updated_at = NOW() WHERE callid = %s", (lead['id'] if lead else None, callid))

    mins = f'{duration // 60}:{duration % 60:02d}'
    dir_text = 'Входящий' if direction == 'in' else 'Исходящий'
    who = f" ({d.get('user')})" if d.get('user') else ''
    text = f"{dir_text} звонок через АТС{who}, {STATUS_TEXT.get(status, status)}" + (f', {mins}' if duration else '')
    result = 'reached' if duration > 0 else ('busy' if status == 'busy' else 'no_answer')
    dur_min = max(1, round(duration / 60)) if duration else None
    target = ('clients', client['id']) if client else (('leads', lead['id']) if lead else None)
    if target:
        log_activity(cur, target[0], target[1], text, 'call', direction, result, dur_min)
    return resp(200, {'ok': True, 'id': call_id, 'lead_id': lead['id'] if lead else None, 'lead_created': lead_created, '_record': (call_id, link, callid) if (link and duration > 0) else None})


def handle_event(cur, d):
    callid = (d.get('callid') or '')[:150]
    typ = (d.get('type') or '').upper()
    if not callid or not typ:
        return resp(200, {'ok': True})
    if typ in ('COMPLETED', 'CANCELLED'):
        cur.execute(f"UPDATE {t('crm_live_calls')} SET state = 'ended', updated_at = NOW() WHERE callid = %s", (callid,))
        return resp(200, {'ok': True})
    state = {'INCOMING': 'ringing', 'OUTGOING': 'ringing', 'ACCEPTED': 'talking'}.get(typ)
    if not state:
        return resp(200, {'ok': True})
    phone = pretty_phone(d.get('phone'))
    d10 = digits10(phone)
    client, lead = find_contact(cur, d10)
    direction = 'out' if typ == 'OUTGOING' or (d.get('direction') or '').lower() == 'out' else 'in'
    cur.execute(f"""INSERT INTO {t('crm_live_calls')} (callid, direction, state, phone, phone_digits, pbx_user, diversion, lead_id, client_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (callid) DO UPDATE SET state = EXCLUDED.state, pbx_user = COALESCE(EXCLUDED.pbx_user, {t('crm_live_calls')}.pbx_user), updated_at = NOW()""",
        (callid, direction, state, phone[:50], d10, (d.get('user') or '')[:150] or None, pretty_phone(d.get('diversion'))[:50] or None,
         lead['id'] if lead else None, client['id'] if client else None))
    cur.execute(f"DELETE FROM {t('crm_live_calls')} WHERE updated_at < NOW() - INTERVAL '1 day'")
    return resp(200, {'ok': True})


def crm_user(cur, headers):
    token = headers.get('x-auth-token') or ''
    if not token:
        return None
    cur.execute(f"""SELECT u.id, u.name, u.role FROM {t('crm_sessions')} s JOIN {t('crm_users')} u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active""", (token,))
    return cur.fetchone()


def pick(r, *keys):
    for k in keys:
        v = r.get(k)
        if v not in (None, ''):
            return str(v)
    return ''


def handle_sync(conn, cur, user, d):
    domain = (os.environ.get('MEGAPBX_DOMAIN') or '').strip().replace('https://', '').replace('http://', '').strip('/')
    key = os.environ.get('MEGAPBX_API_KEY') or ''
    if not domain or not key:
        return resp(400, {'error': 'Не заполнены адрес АТС или ключ API — загрузка истории недоступна'})
    period = d.get('period') if d.get('period') in ('today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month') else 'today'
    query = {'period': period, 'type': 'all', 'limit': 100 if period in ('today', 'yesterday') else 500}
    url = f'https://{domain}/crmapi/v1/history/json?{urlencode(query)}'
    started = time.time()

    def out_log(code, response, error=None):
        write_log('telephony', 'out', 'GET', 'history/json', code, int((time.time() - started) * 1000),
                  {'url': url, 'query': query, 'crm_user': user['name']}, response, None, error, None, user['id'])

    try:
        raw = urlopen(Request(url, headers={'X-API-KEY': key, 'Accept': 'application/json'}), timeout=10).read().decode('utf-8', 'replace')
    except HTTPError as e:
        detail = e.read().decode('utf-8', 'replace')[:500]
        out_log(e.code, detail, f'HTTP {e.code}')
        return resp(502, {'error': 'АТС не приняла ключ API' if e.code in (401, 403) else f'АТС вернула ошибку {e.code}'})
    except Exception as e:
        out_log(0, None, f'{type(e).__name__}: {e}')
        return resp(502, {'error': 'АТС не отвечает, попробуйте ещё раз'})
    try:
        data = json.loads(raw) if raw.strip() else []
    except json.JSONDecodeError:
        out_log(200, raw, 'Ответ АТС не JSON')
        return resp(502, {'error': 'АТС вернула ответ в неожиданном формате'})
    rows = data if isinstance(data, list) else (data.get('data') or data.get('items') or data.get('history') or []) if isinstance(data, dict) else []
    out_log(200, {'count': len(rows), 'sample': rows[:3]})

    added, leads, skipped = 0, 0, 0
    partial = False
    for r in rows:
        if time.time() - started > 3.5:
            partial = True
            break
        if not isinstance(r, dict):
            continue
        item = {
            'callid': pick(r, 'uid', 'callid', 'id'),
            'type': pick(r, 'type'),
            'status': pick(r, 'status'),
            'phone': pick(r, 'client', 'phone'),
            'user': pick(r, 'account', 'user'),
            'diversion': pick(r, 'via', 'diversion'),
            'telnum': pick(r, 'telnum'),
            'start': pick(r, 'start'),
            'duration': pick(r, 'duration'),
            'wait': pick(r, 'wait'),
            'link': pick(r, 'record', 'link'),
            'ext': pick(r, 'ext'),
            'groupRealName': pick(r, 'groupRealName', 'group'),
            'source': 'history_json',
        }
        if not item['callid']:
            skipped += 1
            continue
        out = json.loads(handle_history(cur, item)['body'])
        conn.commit()
        if out.get('duplicate') or out.get('error'):
            skipped += 1
            continue
        added += 1
        if out.get('lead_created'):
            leads += 1
    if leads:
        ping_push()

    return resp(200, {'ok': True, 'period': period, 'received': len(rows), 'added': added, 'skipped': skipped, 'leads_created': leads, 'partial': partial})


def handle_contact(cur, d):
    client, lead = find_contact(cur, digits10(d.get('phone')))
    name = (client and client['full_name']) or (lead and lead['name']) or ''
    return resp(200, {'contact_name': name} if name else {})


def _action(r):
    b = r.get('body') if isinstance(r.get('body'), dict) else {}
    q = r.get('query') or {}
    cmd = b.get('cmd') or q.get('cmd') or 'ping'
    typ = b.get('type') or q.get('type')
    return f'{cmd}:{typ}' if typ else cmd


@logged('telephony', lambda e, r: _action(r))
def handler(event: dict, context) -> dict:
    """Приём событий Виртуальной АТС МегаФон (MegaPBX CRM API): история звонков, записи разговоров, автосоздание лидов"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    d = read_body(event)
    if event.get('httpMethod') == 'GET' and not d.get('cmd'):
        return resp(200, {'ok': True, 'service': 'megapbx'})

    headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
    if (d.get('cmd') or '').lower() == 'sync':
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            user = crm_user(cur, headers)
            if not user:
                return resp(401, {'error': 'Требуется вход в CRM'})
            return handle_sync(conn, cur, user, d)
        finally:
            cur.close()
            conn.close()

    expected = os.environ.get('MEGAPBX_CRM_TOKEN') or ''
    token = d.get('crm_token') or headers.get('x-crm-token') or ''
    if not expected or not hmac.compare_digest(token, expected):
        return resp(401, {'error': 'Неверный crm_token'})

    cmd = (d.get('cmd') or '').lower()
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if cmd == 'history':
            r = handle_history(cur, d)
            conn.commit()
            out = json.loads(r['body'])
            if out.get('lead_created'):
                ping_push()
            rec = out.pop('_record', None)
            if rec:
                url = save_record(rec[1], rec[2])
                if url:
                    cur.execute(f"UPDATE {t('crm_calls')} SET record_url = %s WHERE id = %s", (url, rec[0]))
                    conn.commit()
            return resp(r['statusCode'], out)
        if cmd == 'event':
            r = handle_event(cur, d)
            conn.commit()
            return r
        if cmd == 'contact':
            return handle_contact(cur, d)
        return resp(200, {'ok': True})
    finally:
        cur.close()
        conn.close()