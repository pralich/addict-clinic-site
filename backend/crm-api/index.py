import json
import os
import re
import hashlib
from datetime import datetime, date
from decimal import Decimal
from urllib.request import urlopen

import psycopg2
import psycopg2.extras

SCHEMA = 't_p15395438_addict_clinic_site'
CRM_PUSH_URL = 'https://functions.poehali.dev/b525b7b2-701a-46d0-9842-7774ed5dcd2a?action=notify'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key, X-Authorization, Authorization',
    'Access-Control-Max-Age': '86400',
}

SOURCES = ['site', 'phone', 'partner', 'referral', 'ads', 'api', 'other']
LEAD_STATUS = ['new', 'in_work', 'qualified', 'converted', 'rejected']
CLIENT_STATUS = ['active', 'treatment', 'rehab', 'finished', 'inactive']
DEAL_STAGES = ['new', 'consult', 'diagnostics', 'offer', 'treatment', 'won', 'lost']

LEAD_OUT = 'id, external_id, name, contact, topic, message, source, status, manager_id, partner_id, client_id, created_at, updated_at'
CLIENT_OUT = 'id, external_id, full_name, phone, email, birth_date, is_anonymous, source, status, partner_id, manager_id, notes, created_at, updated_at'
DEAL_OUT = 'id, external_id, title, client_id, partner_id, manager_id, lead_id, stage, program, amount, expected_close, closed_at, notes, created_at, updated_at'


class ApiError(Exception):
    def __init__(self, status, message, field=None):
        super().__init__(message)
        self.status, self.message, self.field = status, message, field


def t(name):
    return f'{SCHEMA}.{name}'


def _ser(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    if isinstance(o, Decimal):
        return float(o)
    return str(o)


def resp(status, data):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=_ser, ensure_ascii=False)}


def s(body, key, limit=None, required=False):
    v = body.get(key)
    if v is None or (isinstance(v, str) and not v.strip()):
        if required:
            raise ApiError(400, f'Поле {key} обязательно', key)
        return None
    v = str(v).strip()
    if limit and len(v) > limit:
        raise ApiError(400, f'Поле {key} длиннее {limit} символов', key)
    return v


def choice(body, key, allowed, default=None):
    v = s(body, key) or default
    if v is not None and v not in allowed:
        raise ApiError(400, f"Поле {key}: допустимо {', '.join(allowed)}", key)
    return v


def num(body, key, default=None):
    v = body.get(key)
    if v is None or v == '':
        return default
    try:
        n = float(v)
    except (TypeError, ValueError):
        raise ApiError(400, f'Поле {key} должно быть числом', key)
    if n < 0:
        raise ApiError(400, f'Поле {key} не может быть отрицательным', key)
    return n


def day(body, key):
    v = s(body, key)
    if not v:
        return None
    try:
        return date.fromisoformat(v[:10])
    except ValueError:
        raise ApiError(400, f'Поле {key}: дата в формате ГГГГ-ММ-ДД', key)


def norm_phone(v):
    if not v:
        return None
    digits = re.sub(r'\D', '', v)
    if len(digits) == 11 and digits[0] in '78':
        return '+7' + digits[1:]
    if len(digits) == 10:
        return '+7' + digits
    return v.strip()


def norm_email(v):
    if not v:
        return None
    v = v.strip().lower()
    if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', v):
        raise ApiError(400, 'Некорректный email', 'email')
    return v


def ref(cur, table, key, value, extra=''):
    if value in (None, ''):
        return None
    try:
        value = int(value)
    except (TypeError, ValueError):
        raise ApiError(400, f'Поле {key} должно быть числом', key)
    cur.execute(f'SELECT id FROM {t(table)} WHERE id = %s {extra}', (value,))
    if not cur.fetchone():
        raise ApiError(400, f'Запись {key}={value} не найдена', key)
    return value


def auth(cur, headers):
    h = {k.lower(): v for k, v in headers.items()}
    key = h.get('x-api-key') or ''
    if not key:
        a = h.get('x-authorization') or h.get('authorization') or ''
        key = a[7:].strip() if a.lower().startswith('bearer ') else ''
    if not key:
        raise ApiError(401, 'Передайте API-ключ в заголовке X-Api-Key')
    cur.execute(f'SELECT id, name, created_by FROM {t("crm_api_keys")} WHERE key_hash = %s AND is_active', (hashlib.sha256(key.encode()).hexdigest(),))
    row = cur.fetchone()
    if not row:
        raise ApiError(401, 'API-ключ недействителен или отозван')
    cur.execute(f'UPDATE {t("crm_api_keys")} SET requests_count = requests_count + 1, last_used_at = NOW() WHERE id = %s', (row['id'],))
    return row


def log(cur, entity, eid, api_key, text):
    cur.execute(f'INSERT INTO {t("crm_activities")} (entity_type, entity_id, user_id, kind, text) VALUES (%s, %s, NULL, %s, %s)',
                (entity, eid, 'system', f"{text} (API: {api_key['name']})"))


def find_one(cur, table, cols, where, args):
    cur.execute(f'SELECT {cols} FROM {t(table)} WHERE {where} AND archived_at IS NULL ORDER BY id LIMIT 1', args)
    return cur.fetchone()


def find_client(cur, external_id, phone, email):
    if external_id:
        row = find_one(cur, 'crm_clients', CLIENT_OUT, 'external_id = %s', (external_id,))
        if row:
            return row
    if phone:
        row = find_one(cur, 'crm_clients', CLIENT_OUT, 'phone = %s', (phone,))
        if row:
            return row
    if email:
        return find_one(cur, 'crm_clients', CLIENT_OUT, 'LOWER(email) = %s', (email,))
    return None


def create_client(cur, body, api_key):
    full_name = s(body, 'full_name', 250) or s(body, 'name', 250)
    phone = norm_phone(s(body, 'phone', 50))
    email = norm_email(s(body, 'email', 200))
    external_id = s(body, 'external_id', 100)
    if not (full_name or phone or email):
        raise ApiError(400, 'Укажите full_name, phone или email', 'full_name')
    existing = find_client(cur, external_id, phone, email)
    if existing and body.get('deduplicate', True) is not False:
        return existing, False
    data = {
        'full_name': full_name or 'Анонимный клиент',
        'phone': phone,
        'email': email,
        'birth_date': day(body, 'birth_date'),
        'is_anonymous': bool(body.get('is_anonymous', not full_name)),
        'source': choice(body, 'source', SOURCES, 'api'),
        'status': choice(body, 'status', CLIENT_STATUS, 'active'),
        'partner_id': ref(cur, 'crm_partners', 'partner_id', body.get('partner_id')),
        'manager_id': ref(cur, 'crm_users', 'manager_id', body.get('manager_id'), 'AND is_active') or api_key['created_by'],
        'notes': s(body, 'notes', 5000),
        'external_id': external_id,
    }
    cur.execute(f"INSERT INTO {t('crm_clients')} ({', '.join(data)}) VALUES ({', '.join(['%s'] * len(data))}) RETURNING {CLIENT_OUT}", list(data.values()))
    item = cur.fetchone()
    log(cur, 'clients', item['id'], api_key, 'Клиент создан')
    return item, True


def create_lead(cur, body, api_key):
    external_id = s(body, 'external_id', 100)
    if external_id:
        row = find_one(cur, 'crm_leads', LEAD_OUT, 'external_id = %s', (external_id,))
        if row:
            return row, False
    phone = norm_phone(s(body, 'phone', 50))
    email = norm_email(s(body, 'email', 200))
    contact = s(body, 'contact', 200) or phone or email
    if not contact:
        raise ApiError(400, 'Укажите contact, phone или email', 'contact')
    message = s(body, 'message', 5000)
    utm = {k: s(body, k, 200) for k in ('utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'page_url') if s(body, k)}
    if utm:
        message = ((message + '\n\n') if message else '') + '\n'.join(f'{k}: {v}' for k, v in utm.items())
    data = {
        'name': s(body, 'name', 250),
        'contact': contact,
        'topic': s(body, 'topic', 200),
        'message': message,
        'source': choice(body, 'source', SOURCES, 'api'),
        'status': choice(body, 'status', LEAD_STATUS, 'new'),
        'manager_id': ref(cur, 'crm_users', 'manager_id', body.get('manager_id'), 'AND is_active'),
        'partner_id': ref(cur, 'crm_partners', 'partner_id', body.get('partner_id')),
        'client_id': ref(cur, 'crm_clients', 'client_id', body.get('client_id')),
        'external_id': external_id,
    }
    cur.execute(f"INSERT INTO {t('crm_leads')} ({', '.join(data)}) VALUES ({', '.join(['%s'] * len(data))}) RETURNING {LEAD_OUT}", list(data.values()))
    item = cur.fetchone()
    log(cur, 'leads', item['id'], api_key, 'Лид создан')
    return item, True


def create_deal(cur, body, api_key):
    external_id = s(body, 'external_id', 100)
    if external_id:
        row = find_one(cur, 'crm_deals', DEAL_OUT, 'external_id = %s', (external_id,))
        if row:
            return row, False, None
    title = s(body, 'title', 250, required=True)
    client_id = ref(cur, 'crm_clients', 'client_id', body.get('client_id'))
    client_created = None
    if not client_id and isinstance(body.get('client'), dict):
        client, client_created = create_client(cur, {**body['client'], 'manager_id': body.get('manager_id'), 'partner_id': body.get('partner_id')}, api_key)
        client_id = client['id']
    stage = choice(body, 'stage', DEAL_STAGES, 'new')
    data = {
        'title': title,
        'client_id': client_id,
        'partner_id': ref(cur, 'crm_partners', 'partner_id', body.get('partner_id')),
        'manager_id': ref(cur, 'crm_users', 'manager_id', body.get('manager_id'), 'AND is_active') or api_key['created_by'],
        'lead_id': ref(cur, 'crm_leads', 'lead_id', body.get('lead_id')),
        'stage': stage,
        'program': s(body, 'program', 200),
        'amount': num(body, 'amount', 0),
        'expected_close': day(body, 'expected_close'),
        'notes': s(body, 'notes', 5000),
        'external_id': external_id,
    }
    cols = list(data)
    vals = list(data.values())
    ph = ['%s'] * len(vals)
    if stage in ('won', 'lost'):
        cols.append('closed_at')
        ph.append('NOW()')
    cur.execute(f"INSERT INTO {t('crm_deals')} ({', '.join(cols)}) VALUES ({', '.join(ph)}) RETURNING {DEAL_OUT}", vals)
    item = cur.fetchone()
    log(cur, 'deals', item['id'], api_key, 'Сделка создана')
    return item, True, {'id': client_id, 'created': client_created} if client_id else None


def get_item(cur, resource, params):
    table, cols = {'leads': ('crm_leads', LEAD_OUT), 'clients': ('crm_clients', CLIENT_OUT), 'deals': ('crm_deals', DEAL_OUT)}[resource]
    if params.get('id'):
        try:
            row = find_one(cur, table, cols, 'id = %s', (int(params['id']),))
        except ValueError:
            raise ApiError(400, 'id должен быть числом', 'id')
    elif params.get('external_id'):
        row = find_one(cur, table, cols, 'external_id = %s', (params['external_id'],))
    else:
        raise ApiError(400, 'Укажите id или external_id')
    if not row:
        raise ApiError(404, 'Не найдено')
    return resp(200, {'item': row})


def ping_push():
    try:
        urlopen(CRM_PUSH_URL, timeout=2.5).read()
    except Exception as e:
        print(f'crm push ping failed: {e}')


def handler(event: dict, context) -> dict:
    """Открытый API CRM addict.clinic: создание и получение клиентов, лидов и сделок по API-ключу"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    resource = params.get('resource', '')

    if method == 'GET' and resource == 'dictionaries':
        return resp(200, {'sources': SOURCES, 'lead_statuses': LEAD_STATUS, 'client_statuses': CLIENT_STATUS, 'deal_stages': DEAL_STAGES})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if resource not in ('leads', 'clients', 'deals', 'ping'):
            raise ApiError(404, 'Неизвестный ресурс. Доступно: leads, clients, deals, ping, dictionaries')
        api_key = auth(cur, event.get('headers') or {})
        conn.commit()

        if resource == 'ping':
            return resp(200, {'ok': True, 'key': api_key['name']})

        if method == 'GET':
            return get_item(cur, resource, params)

        if method != 'POST':
            raise ApiError(405, 'Используйте POST для создания или GET для получения')

        try:
            body = json.loads(event.get('body') or '{}')
        except json.JSONDecodeError:
            raise ApiError(400, 'Тело запроса должно быть JSON')
        if not isinstance(body, dict):
            raise ApiError(400, 'Тело запроса должно быть JSON-объектом')

        if resource == 'clients':
            item, created = create_client(cur, body, api_key)
            conn.commit()
            return resp(201 if created else 200, {'item': item, 'created': created})
        if resource == 'leads':
            item, created = create_lead(cur, body, api_key)
            conn.commit()
            if created:
                ping_push()
            return resp(201 if created else 200, {'item': item, 'created': created})
        item, created, client = create_deal(cur, body, api_key)
        conn.commit()
        return resp(201 if created else 200, {'item': item, 'created': created, 'client': client})
    except ApiError as e:
        conn.rollback()
        return resp(e.status, {'error': e.message, 'field': e.field})
    finally:
        cur.close()
        conn.close()
