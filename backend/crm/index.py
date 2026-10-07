import json
import os
import hashlib
import secrets
from datetime import datetime, timedelta, date
from decimal import Decimal

import psycopg2
import psycopg2.extras

from finance import handle_finance

SCHEMA = 't_p15395438_addict_clinic_site'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}

ENTITIES = {
    'clients': {
        'table': 'crm_clients',
        'fields': ['full_name', 'phone', 'email', 'birth_date', 'is_anonymous', 'source', 'status', 'partner_id', 'manager_id', 'notes', 'rep_name', 'rep_relation', 'rep_phone', 'rep_email'],
        'required': ['full_name'],
        'search': ['full_name', 'phone', 'email', 'rep_name', 'rep_phone', 'rep_email'],
        'filter': 'status',
        'order': 'created_at DESC',
    },
    'partners': {
        'table': 'crm_partners',
        'fields': ['name', 'type', 'contact_person', 'phone', 'email', 'commission_percent', 'status', 'notes'],
        'required': ['name'],
        'search': ['name', 'contact_person', 'phone', 'email'],
        'filter': 'status',
        'order': 'created_at DESC',
    },
    'leads': {
        'table': 'crm_leads',
        'fields': ['name', 'contact', 'topic', 'message', 'source', 'status', 'manager_id', 'partner_id', 'client_id', 'rep_name', 'rep_relation', 'rep_phone', 'rep_email'],
        'required': ['contact'],
        'search': ['name', 'contact', 'topic', 'message', 'utm_campaign', 'page_url', 'rep_name', 'rep_phone', 'rep_email'],
        'filter': 'status',
        'order': 'created_at DESC',
    },
    'deals': {
        'table': 'crm_deals',
        'fields': ['title', 'client_id', 'partner_id', 'manager_id', 'lead_id', 'stage', 'program', 'amount', 'expected_close', 'notes', 'rep_name', 'rep_relation', 'rep_phone', 'rep_email'],
        'required': ['title'],
        'search': ['title', 'program', 'notes', 'rep_name', 'rep_phone', 'rep_email'],
        'filter': 'stage',
        'order': 'updated_at DESC',
    },
}

USER_FIELDS = 'id, name, email, phone, role, is_active, last_login_at, created_at'


CRM_PUSH_URL = 'https://functions.poehali.dev/b525b7b2-701a-46d0-9842-7774ed5dcd2a?action=notify'


def ping_crm_push():
    try:
        from urllib.request import urlopen as _uo
        _uo(CRM_PUSH_URL, timeout=2.5).read()
    except Exception as e:
        print(f'crm push ping failed: {e}')


PD_DOC_VERSION = '2026-10-04'


def log_consent(cur, event, form, subject, ref_type=None, ref_id=None, purpose='pd_processing'):
    ident = ((event or {}).get('requestContext') or {}).get('identity') or {}
    hdrs = (event or {}).get('headers') or {}
    cur.execute(f"""INSERT INTO {SCHEMA}.pd_consents (form, purpose, subject, doc_version, ref_type, ref_id, ip, user_agent)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                (form, purpose, (subject or '')[:200] or None, PD_DOC_VERSION, ref_type, ref_id,
                 (ident.get('sourceIp') or '')[:64] or None, (hdrs.get('User-Agent') or hdrs.get('user-agent') or '')[:400] or None))


def t(name):
    return f'{SCHEMA}.{name}'


def resp(status, data):
    return {
        'statusCode': status,
        'headers': {**CORS, 'Content-Type': 'application/json'},
        'body': json.dumps(data, default=_ser, ensure_ascii=False),
    }


def _ser(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    if isinstance(o, Decimal):
        return float(o)
    return str(o)


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 120000).hex()
    return f'{salt}${h}'


def check_password(password, stored):
    salt = stored.split('$', 1)[0]
    return secrets.compare_digest(hash_password(password, salt), stored)


def q(cur, sql, params=None):
    cur.execute(sql, params)
    return cur


def get_user(cur, headers):
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    q(cur, f'SELECT u.id, u.name, u.email, u.role, u.is_active FROM {t("crm_sessions")} s JOIN {t("crm_users")} u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW()', (token,))
    u = cur.fetchone()
    if not u or not u['is_active']:
        return None
    return u


def clean(value):
    if isinstance(value, str):
        value = value.strip()
        return value if value != '' else None
    return value


def log_activity(cur, entity_type, entity_id, user_id, text, kind='system'):
    q(cur, f'INSERT INTO {t("crm_activities")} (entity_type, entity_id, user_id, kind, text) VALUES (%s, %s, %s, %s, %s)',
      (entity_type, entity_id, user_id, kind, text))


def create_session(cur, user_id):
    token = secrets.token_urlsafe(32)
    q(cur, f'INSERT INTO {t("crm_sessions")} (token, user_id, expires_at) VALUES (%s, %s, %s)',
      (token, user_id, datetime.utcnow() + timedelta(days=14)))
    q(cur, f'UPDATE {t("crm_users")} SET last_login_at = NOW() WHERE id = %s', (user_id,))
    return token


def handle_auth(cur, action, method, body, headers):
    if action == 'status':
        q(cur, f'SELECT COUNT(*) AS c FROM {t("crm_users")}')
        return resp(200, {'needsSetup': cur.fetchone()['c'] == 0})

    if action == 'setup' and method == 'POST':
        q(cur, f'SELECT COUNT(*) AS c FROM {t("crm_users")}')
        if cur.fetchone()['c'] > 0:
            return resp(403, {'error': 'Администратор уже создан'})
        name, email, password = clean(body.get('name')), clean(body.get('email')), body.get('password') or ''
        if not name or not email or len(password) < 6:
            return resp(400, {'error': 'Укажите имя, email и пароль от 6 символов'})
        q(cur, f'INSERT INTO {t("crm_users")} (name, email, role, password_hash) VALUES (%s, %s, %s, %s) RETURNING id',
          (name, email.lower(), 'admin', hash_password(password)))
        uid = cur.fetchone()['id']
        return resp(200, {'token': create_session(cur, uid), 'user': {'id': uid, 'name': name, 'email': email.lower(), 'role': 'admin'}})

    if action == 'login' and method == 'POST':
        email, password = (clean(body.get('email')) or '').lower(), body.get('password') or ''
        q(cur, f'SELECT id, name, email, role, is_active, password_hash FROM {t("crm_users")} WHERE email = %s', (email,))
        u = cur.fetchone()
        if not u or not u['is_active'] or not check_password(password, u['password_hash']):
            return resp(401, {'error': 'Неверный email или пароль'})
        return resp(200, {'token': create_session(cur, u['id']), 'user': {k: u[k] for k in ('id', 'name', 'email', 'role')}})

    user = get_user(cur, headers)
    if not user:
        return resp(401, {'error': 'Требуется вход'})

    if action == 'logout':
        token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
        q(cur, f'UPDATE {t("crm_sessions")} SET expires_at = NOW() WHERE token = %s', (token,))
        return resp(200, {'ok': True})

    return resp(200, {'user': {k: user[k] for k in ('id', 'name', 'email', 'role')}})


def handle_public_lead(cur, body, event=None):
    contact = clean(body.get('contact'))
    if not contact:
        return resp(400, {'error': 'Укажите контакт'})
    if body.get('consent') is not True:
        return resp(400, {'error': 'Нужно согласие на обработку персональных данных'})
    q(cur, f'INSERT INTO {t("crm_leads")} (name, contact, topic, message, source) VALUES (%s, %s, %s, %s, %s) RETURNING id',
      (clean(body.get('name')), contact[:200], (clean(body.get('topic')) or '')[:200] or None, clean(body.get('message')), 'site'))
    lid = cur.fetchone()['id']
    log_activity(cur, 'leads', lid, None, 'Заявка с сайта')
    log_consent(cur, event, body.get('form') or 'lead', contact, 'lead', lid)
    ping_crm_push()
    return resp(200, {'ok': True, 'id': lid})


def handle_dashboard(cur):
    res = {}
    q(cur, f'SELECT COUNT(*) FILTER (WHERE status = %s) AS new, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL %s) AS week, COUNT(*) AS total FROM {t("crm_leads")} WHERE archived_at IS NULL', ('new', '7 days'))
    res['leads'] = cur.fetchone()
    q(cur, f'SELECT COUNT(*) AS total FROM {t("crm_clients")} WHERE archived_at IS NULL')
    res['clients'] = cur.fetchone()
    q(cur, f'SELECT COUNT(*) AS total FROM {t("crm_partners")} WHERE archived_at IS NULL AND status = %s', ('active',))
    res['partners'] = cur.fetchone()
    q(cur, f'''SELECT
        COUNT(*) FILTER (WHERE stage NOT IN ('won','lost')) AS open,
        COALESCE(SUM(amount) FILTER (WHERE stage NOT IN ('won','lost')), 0) AS open_amount,
        COALESCE(SUM(amount) FILTER (WHERE stage = 'won' AND closed_at > date_trunc('month', NOW())), 0) AS won_month,
        COUNT(*) FILTER (WHERE stage = 'won') AS won,
        COUNT(*) FILTER (WHERE stage = 'lost') AS lost
        FROM {t("crm_deals")} WHERE archived_at IS NULL''')
    res['deals'] = cur.fetchone()
    q(cur, f'SELECT stage, COUNT(*) AS count, COALESCE(SUM(amount),0) AS amount FROM {t("crm_deals")} WHERE archived_at IS NULL GROUP BY stage')
    res['funnel'] = cur.fetchall()
    q(cur, f'''SELECT to_char(d, 'DD.MM') AS day, (SELECT COUNT(*) FROM {t("crm_leads")} l WHERE l.created_at::date = d::date) AS leads
        FROM generate_series(NOW()::date - 13, NOW()::date, INTERVAL '1 day') d ORDER BY d''')
    res['leadsByDay'] = cur.fetchall()
    q(cur, f'SELECT id, name, contact, topic, status, created_at FROM {t("crm_leads")} WHERE archived_at IS NULL ORDER BY created_at DESC LIMIT 6')
    res['recentLeads'] = cur.fetchall()
    q(cur, f'''SELECT COALESCE(l.channel, 'unknown') AS channel, COUNT(*) AS leads,
        COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'won') AS won,
        COALESCE(SUM(d.amount) FILTER (WHERE d.stage = 'won'), 0) AS revenue
        FROM {t("crm_leads")} l LEFT JOIN {t("crm_deals")} d ON d.lead_id = l.id AND d.archived_at IS NULL
        WHERE l.archived_at IS NULL AND l.created_at > NOW() - INTERVAL '30 days'
        GROUP BY 1 ORDER BY 2 DESC''')
    res['channels'] = cur.fetchall()
    q(cur, f'''SELECT utm_source, utm_campaign, COUNT(*) AS leads FROM {t("crm_leads")}
        WHERE archived_at IS NULL AND utm_campaign IS NOT NULL AND created_at > NOW() - INTERVAL '30 days'
        GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 8''')
    res['campaigns'] = cur.fetchall()
    q(cur, f'SELECT a.id, a.entity_type, a.entity_id, a.kind, a.text, a.created_at, u.name AS user_name FROM {t("crm_activities")} a LEFT JOIN {t("crm_users")} u ON u.id = a.user_id ORDER BY a.created_at DESC LIMIT 10')
    res['activity'] = cur.fetchall()
    return resp(200, res)


def handle_options(cur):
    q(cur, f'SELECT id, name FROM {t("crm_users")} WHERE is_active ORDER BY name')
    users = cur.fetchall()
    q(cur, f'SELECT id, name FROM {t("crm_partners")} WHERE archived_at IS NULL ORDER BY name')
    partners = cur.fetchall()
    q(cur, f'SELECT id, full_name AS name FROM {t("crm_clients")} WHERE archived_at IS NULL ORDER BY full_name LIMIT 1000')
    clients = cur.fetchall()
    return resp(200, {'users': users, 'partners': partners, 'clients': clients})


def list_entity(cur, name, params):
    cfg = ENTITIES[name]
    tbl = cfg['table']
    where = ['e.archived_at IS NOT NULL' if params.get('archived') == '1' else 'e.archived_at IS NULL']
    args = []
    if params.get('search'):
        like = f"%{params['search']}%"
        where.append('(' + ' OR '.join(f'e.{f} ILIKE %s' for f in cfg['search']) + ')')
        args += [like] * len(cfg['search'])
    if params.get('status'):
        where.append(f"e.{cfg['filter']} = %s")
        args.append(params['status'])
    if params.get('manager_id'):
        where.append('e.manager_id = %s')
        args.append(int(params['manager_id']))
    if params.get('partner_id') and name != 'partners':
        where.append('e.partner_id = %s')
        args.append(int(params['partner_id']))
    if params.get('channel') and name == 'leads':
        where.append('e.channel = %s')
        args.append(params['channel'])
    if params.get('client_id') and name in ('deals', 'leads'):
        where.append('e.client_id = %s')
        args.append(int(params['client_id']))

    joins, extra = '', ''
    if name != 'partners':
        joins += f' LEFT JOIN {t("crm_users")} mu ON mu.id = e.manager_id LEFT JOIN {t("crm_partners")} pp ON pp.id = e.partner_id'
        extra += ', mu.name AS manager_name, pp.name AS partner_name'
    if name in ('leads', 'deals'):
        joins += f' LEFT JOIN {t("crm_clients")} cc ON cc.id = e.client_id'
        extra += ', cc.full_name AS client_name'
    if name == 'clients':
        extra += f", (SELECT COUNT(*) FROM {t('crm_deals')} d WHERE d.client_id = e.id AND d.archived_at IS NULL) AS deals_count, (SELECT COALESCE(SUM(amount),0) FROM {t('crm_deals')} d WHERE d.client_id = e.id AND d.stage = 'won') AS revenue"
    if name == 'partners':
        extra += f", (SELECT COUNT(*) FROM {t('crm_clients')} c WHERE c.partner_id = e.id AND c.archived_at IS NULL) AS clients_count, (SELECT COALESCE(SUM(amount),0) FROM {t('crm_deals')} d WHERE d.partner_id = e.id AND d.stage = 'won') AS revenue"

    limit = min(int(params.get('limit') or 500), 1000)
    q(cur, f"SELECT e.*{extra} FROM {t(tbl)} e{joins} WHERE {' AND '.join(where)} ORDER BY e.{cfg['order']} LIMIT {limit}", args)
    return resp(200, {'items': cur.fetchall()})


def get_entity(cur, name, eid):
    cfg = ENTITIES[name]
    if name == 'partners':
        q(cur, f"SELECT * FROM {t(cfg['table'])} WHERE id = %s", (eid,))
    else:
        q(cur, f"SELECT e.*, mu.name AS manager_name FROM {t(cfg['table'])} e LEFT JOIN {t('crm_users')} mu ON mu.id = e.manager_id WHERE e.id = %s", (eid,))
    item = cur.fetchone()
    if not item:
        return resp(404, {'error': 'Не найдено'})
    refs = {}
    if item.get('client_id') and name != 'clients':
        q(cur, f"SELECT id, full_name AS name, phone, email, status, is_anonymous FROM {t('crm_clients')} WHERE id = %s", (item['client_id'],))
        refs['client'] = cur.fetchone()
    if item.get('partner_id') and name != 'partners':
        q(cur, f"SELECT id, name, type, contact_person, phone, email FROM {t('crm_partners')} WHERE id = %s", (item['partner_id'],))
        refs['partner'] = cur.fetchone()
    if item.get('lead_id') and name == 'deals':
        q(cur, f"SELECT id, name, contact, topic, status, created_at FROM {t('crm_leads')} WHERE id = %s", (item['lead_id'],))
        refs['lead'] = cur.fetchone()
    q(cur, f'SELECT a.*, u.name AS user_name FROM {t("crm_activities")} a LEFT JOIN {t("crm_users")} u ON u.id = a.user_id WHERE a.entity_type = %s AND a.entity_id = %s ORDER BY a.created_at DESC', (name, eid))
    activities = cur.fetchall()
    related = {}
    if name in ('clients', 'partners'):
        col = 'client_id' if name == 'clients' else 'partner_id'
        q(cur, f"SELECT id, title, stage, amount, created_at FROM {t('crm_deals')} WHERE {col} = %s AND archived_at IS NULL ORDER BY created_at DESC", (eid,))
        related['deals'] = cur.fetchall()
        q(cur, f"SELECT id, name, contact, status, created_at FROM {t('crm_leads')} WHERE {col} = %s AND archived_at IS NULL ORDER BY created_at DESC", (eid,))
        related['leads'] = cur.fetchall()
    if name == 'partners':
        q(cur, f"SELECT id, full_name, status, created_at FROM {t('crm_clients')} WHERE partner_id = %s AND archived_at IS NULL ORDER BY created_at DESC", (eid,))
        related['clients'] = cur.fetchall()
    return resp(200, {'item': item, 'activities': activities, 'related': related, 'refs': refs})


def prepare(cfg, body, partial):
    data = {}
    for f in cfg['fields']:
        if f in body:
            v = clean(body[f])
            if f.endswith('_id') and v is not None:
                v = int(v)
            if f in ('amount', 'commission_percent'):
                v = float(v or 0)
            if f == 'is_anonymous':
                v = bool(v)
            data[f] = v
    if not partial:
        for r in cfg['required']:
            if not data.get(r):
                return None, r
    return data, None


STAGE_NAMES = {'new': 'Новая', 'consult': 'Консультация', 'diagnostics': 'Диагностика', 'offer': 'Программа согласована', 'treatment': 'Лечение', 'won': 'Успешно', 'lost': 'Отказ'}
LEAD_STATUS = {'new': 'Новый', 'in_work': 'В работе', 'qualified': 'Квалифицирован', 'converted': 'Конвертирован', 'rejected': 'Отказ'}


def save_entity(cur, name, eid, body, user):
    cfg = ENTITIES[name]
    data, missing = prepare(cfg, body, partial=eid is not None)
    if data is None:
        return resp(400, {'error': f'Заполните поле: {missing}'})
    if not data:
        return resp(400, {'error': 'Нет данных'})
    if eid is None:
        if name in ('clients', 'leads', 'deals') and 'manager_id' not in data:
            data['manager_id'] = user['id']
        cols = ', '.join(data.keys())
        ph = ', '.join(['%s'] * len(data))
        q(cur, f"INSERT INTO {t(cfg['table'])} ({cols}) VALUES ({ph}) RETURNING *", list(data.values()))
        item = cur.fetchone()
        if name == 'leads':
            q(cur, f"INSERT INTO {t('crm_push_log')} (kind, ref_id) VALUES ('lead', %s) ON CONFLICT DO NOTHING", (item['id'],))
        log_activity(cur, name, item['id'], user['id'], 'Запись создана')
        return resp(200, {'item': item})

    q(cur, f"SELECT * FROM {t(cfg['table'])} WHERE id = %s", (eid,))
    old = cur.fetchone()
    if not old:
        return resp(404, {'error': 'Не найдено'})
    sets = ', '.join(f'{k} = %s' for k in data.keys())
    extra = ''
    if name == 'deals' and 'stage' in data:
        extra = ", closed_at = CASE WHEN %s IN ('won','lost') THEN COALESCE(closed_at, NOW()) ELSE NULL END"
    args = list(data.values()) + ([data['stage']] if extra else []) + [eid]
    q(cur, f"UPDATE {t(cfg['table'])} SET {sets}, updated_at = NOW(){extra} WHERE id = %s RETURNING *", args)
    item = cur.fetchone()
    if name == 'deals' and 'stage' in data and old['stage'] != data['stage']:
        log_activity(cur, name, eid, user['id'], f"Этап: {STAGE_NAMES.get(old['stage'], old['stage'])} → {STAGE_NAMES.get(data['stage'], data['stage'])}")
    elif name == 'leads' and 'status' in data and old['status'] != data['status']:
        log_activity(cur, name, eid, user['id'], f"Статус: {LEAD_STATUS.get(old['status'], old['status'])} → {LEAD_STATUS.get(data['status'], data['status'])}")
    else:
        log_activity(cur, name, eid, user['id'], 'Запись изменена')
    return resp(200, {'item': item})


def archive_entity(cur, name, eid, user, restore=False):
    cfg = ENTITIES[name]
    q(cur, f"UPDATE {t(cfg['table'])} SET archived_at = {'NULL' if restore else 'NOW()'}, updated_at = NOW() WHERE id = %s", (eid,))
    log_activity(cur, name, eid, user['id'], 'Восстановлено из архива' if restore else 'Перемещено в архив')
    return resp(200, {'ok': True})


def convert_lead(cur, eid, body, user):
    q(cur, f"SELECT * FROM {t('crm_leads')} WHERE id = %s", (eid,))
    lead = cur.fetchone()
    if not lead:
        return resp(404, {'error': 'Не найдено'})
    client_id = lead['client_id']
    if not client_id:
        contact = lead['contact'] or ''
        is_email = '@' in contact
        q(cur, f"INSERT INTO {t('crm_clients')} (full_name, phone, email, is_anonymous, source, partner_id, manager_id, rep_name, rep_relation, rep_phone, rep_email) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
          (lead['name'] or 'Анонимный клиент', None if is_email else contact, contact if is_email else None, not lead['name'], lead['source'], lead['partner_id'], lead['manager_id'] or user['id'], lead.get('rep_name'), lead.get('rep_relation'), lead.get('rep_phone'), lead.get('rep_email')))
        client_id = cur.fetchone()['id']
        log_activity(cur, 'clients', client_id, user['id'], f'Создан из лида #{eid}')
    deal_id = None
    if body.get('create_deal', True):
        q(cur, f"INSERT INTO {t('crm_deals')} (title, client_id, partner_id, manager_id, lead_id, program, amount, rep_name, rep_relation, rep_phone, rep_email) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
          (clean(body.get('title')) or f"{lead['topic'] or 'Обращение'} — {lead['name'] or 'аноним'}", client_id, lead['partner_id'], lead['manager_id'] or user['id'], eid, lead['topic'], float(body.get('amount') or 0), lead.get('rep_name'), lead.get('rep_relation'), lead.get('rep_phone'), lead.get('rep_email')))
        deal_id = cur.fetchone()['id']
        log_activity(cur, 'deals', deal_id, user['id'], f'Создана из лида #{eid}')
    q(cur, f"UPDATE {t('crm_leads')} SET status = 'converted', client_id = %s, updated_at = NOW() WHERE id = %s", (client_id, eid))
    log_activity(cur, 'leads', eid, user['id'], 'Лид конвертирован в клиента' + (' и сделку' if deal_id else ''))
    return resp(200, {'client_id': client_id, 'deal_id': deal_id})


def handle_users(cur, method, eid, body, user, params):
    if method == 'GET':
        q(cur, f'SELECT {USER_FIELDS}, (SELECT COUNT(*) FROM {t("crm_deals")} d WHERE d.manager_id = u.id AND d.archived_at IS NULL) AS deals_count, (SELECT COUNT(*) FROM {t("crm_leads")} l WHERE l.manager_id = u.id AND l.archived_at IS NULL) AS leads_count FROM {t("crm_users")} u ORDER BY created_at')
        return resp(200, {'items': cur.fetchall()})
    if user['role'] != 'admin':
        return resp(403, {'error': 'Только администратор может управлять пользователями'})
    if method == 'POST':
        name, email, password = clean(body.get('name')), (clean(body.get('email')) or '').lower(), body.get('password') or ''
        if not name or not email or len(password) < 6:
            return resp(400, {'error': 'Укажите имя, email и пароль от 6 символов'})
        q(cur, f'SELECT id FROM {t("crm_users")} WHERE email = %s', (email,))
        if cur.fetchone():
            return resp(400, {'error': 'Пользователь с таким email уже есть'})
        q(cur, f'INSERT INTO {t("crm_users")} (name, email, phone, role, password_hash) VALUES (%s, %s, %s, %s, %s) RETURNING {USER_FIELDS}',
          (name, email, clean(body.get('phone')), body.get('role') if body.get('role') in ('admin', 'manager', 'doctor') else 'manager', hash_password(password)))
        return resp(200, {'item': cur.fetchone()})
    if method == 'PUT' and eid:
        data = {}
        for f in ('name', 'phone', 'role', 'is_active'):
            if f in body:
                data[f] = clean(body[f])
        if 'email' in body:
            data['email'] = (clean(body['email']) or '').lower()
        if body.get('password'):
            if len(body['password']) < 6:
                return resp(400, {'error': 'Пароль от 6 символов'})
            data['password_hash'] = hash_password(body['password'])
        if eid == user['id'] and (data.get('is_active') is False or data.get('role', 'admin') != 'admin'):
            return resp(400, {'error': 'Нельзя отключить или понизить самого себя'})
        if not data:
            return resp(400, {'error': 'Нет данных'})
        sets = ', '.join(f'{k} = %s' for k in data)
        q(cur, f'UPDATE {t("crm_users")} SET {sets} WHERE id = %s RETURNING {USER_FIELDS}', list(data.values()) + [eid])
        if data.get('is_active') is False:
            q(cur, f'UPDATE {t("crm_sessions")} SET expires_at = NOW() WHERE user_id = %s', (eid,))
        return resp(200, {'item': cur.fetchone()})
    return resp(405, {'error': 'Метод не поддерживается'})


def handle_api_keys(cur, method, eid, body, user):
    if user['role'] != 'admin':
        return resp(403, {'error': 'Доступно только администратору'})
    if method == 'GET':
        q(cur, f'SELECT k.id, k.name, k.key_prefix, k.is_active, k.requests_count, k.last_used_at, k.created_at, k.revoked_at, u.name AS author FROM {t("crm_api_keys")} k LEFT JOIN {t("crm_users")} u ON u.id = k.created_by ORDER BY k.is_active DESC, k.id DESC')
        return resp(200, {'items': cur.fetchall()})
    if method == 'POST':
        name = clean(body.get('name'))
        if not name:
            return resp(400, {'error': 'Укажите название ключа'})
        key = 'ac_' + secrets.token_urlsafe(32)
        q(cur, f'INSERT INTO {t("crm_api_keys")} (name, key_hash, key_prefix, created_by) VALUES (%s, %s, %s, %s) RETURNING id',
          (name[:200], hashlib.sha256(key.encode()).hexdigest(), key[:10], user['id']))
        return resp(200, {'id': cur.fetchone()['id'], 'key': key})
    if method == 'DELETE' and eid:
        q(cur, f'UPDATE {t("crm_api_keys")} SET is_active = FALSE, revoked_at = NOW() WHERE id = %s', (eid,))
        return resp(200, {'ok': True})
    return resp(400, {'error': 'Неверный запрос'})


CALL_RESULTS = ('reached', 'no_answer', 'busy', 'callback', 'wrong_number')
MEETING_RESULTS = ('held', 'rescheduled', 'cancelled', 'no_show')


def parse_dt(v):
    if not v:
        return None
    try:
        return datetime.fromisoformat(str(v).replace('Z', '+00:00')).replace(tzinfo=None)
    except ValueError:
        return None


def handle_activity(cur, method, eid, body, user):
    if method == 'POST':
        et, ei, text = body.get('entity_type'), body.get('entity_id'), clean(body.get('text'))
        kind = body.get('kind') if body.get('kind') in ('note', 'call', 'meeting', 'task') else 'note'
        if et not in ENTITIES or not ei or not text:
            return resp(400, {'error': 'Неверные данные'})
        due = parse_dt(body.get('due_at')) if kind in ('task', 'meeting') else None
        if kind == 'task' and not due:
            return resp(400, {'error': 'Укажите срок задачи'})
        result = body.get('result')
        if kind == 'call' and result not in CALL_RESULTS:
            result = None
        if kind == 'meeting' and result not in MEETING_RESULTS:
            result = None
        if kind not in ('call', 'meeting'):
            result = None
        direction = body.get('direction') if kind == 'call' and body.get('direction') in ('in', 'out') else None
        duration = int(body['duration_min']) if kind in ('call', 'meeting') and str(body.get('duration_min') or '').isdigit() else None
        done = None
        if kind == 'call' or (kind == 'meeting' and result):
            done = datetime.utcnow()
        q(cur, f'''INSERT INTO {t("crm_activities")} (entity_type, entity_id, user_id, kind, text, due_at, done_at, result, direction, duration_min)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id''',
          (et, int(ei), user['id'], kind, text, due, done, result, direction, duration))
        return resp(200, {'ok': True, 'id': cur.fetchone()['id']})
    if not eid:
        return resp(400, {'error': 'Не указана запись'})
    q(cur, f'SELECT * FROM {t("crm_activities")} WHERE id = %s', (eid,))
    act = cur.fetchone()
    if not act or act['kind'] == 'system':
        return resp(404, {'error': 'Не найдено'})
    if method == 'PUT':
        sets, args = [], []
        if 'done' in body:
            sets.append('done_at = ' + ('NOW()' if body['done'] else 'NULL'))
        if 'result' in body and body['result'] in (CALL_RESULTS + MEETING_RESULTS):
            sets.append('result = %s')
            args.append(body['result'])
            if act['kind'] == 'meeting':
                sets.append('done_at = COALESCE(done_at, NOW())')
        if 'text' in body and clean(body['text']):
            sets.append('text = %s')
            args.append(clean(body['text']))
        if 'due_at' in body and act['kind'] in ('task', 'meeting'):
            sets.append('due_at = %s')
            args.append(parse_dt(body['due_at']))
        if not sets:
            return resp(400, {'error': 'Нет данных'})
        q(cur, f'UPDATE {t("crm_activities")} SET {", ".join(sets)}, updated_at = NOW() WHERE id = %s', args + [eid])
        return resp(200, {'ok': True})
    if method == 'DELETE':
        if act['user_id'] != user['id'] and user['role'] != 'admin':
            return resp(403, {'error': 'Удалить можно только свою запись'})
        q(cur, f'DELETE FROM {t("crm_activities")} WHERE id = %s', (eid,))
        return resp(200, {'ok': True})
    return resp(400, {'error': 'Неверный запрос'})


def handle_shop_orders(cur, params):
    status = params.get('status') or 'paid'
    where = "o.source = 'shop'" + ('' if status == 'all' else ' AND o.status = %s')
    args = () if status == 'all' else (status,)
    q(cur, f"""SELECT o.id, o.order_number, o.user_name, o.user_email, o.user_phone, o.amount, o.status, o.delivery_address, o.comment, o.created_at, o.paid_at,
        COALESCE((SELECT json_agg(json_build_object('name', i.product_name, 'qty', i.quantity, 'price', i.product_price) ORDER BY i.id)
                  FROM {t('order_items')} i WHERE i.order_id = o.id), '[]') AS items
        FROM {t('orders')} o WHERE {where} ORDER BY COALESCE(o.paid_at, o.created_at) DESC LIMIT 200""", args)
    items = cur.fetchall()
    q(cur, f"""SELECT COUNT(*) FILTER (WHERE status = 'paid') AS paid, COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0) AS revenue,
        COUNT(*) FILTER (WHERE status = 'paid' AND paid_at > NOW() - INTERVAL '1 day') AS today FROM {t('orders')} WHERE source = 'shop'""")
    return resp(200, {'items': items, 'stats': cur.fetchone()})


def handler(event: dict, context) -> dict:
    """CRM addict.clinic: авторизация, клиенты, партнёры, лиды, сделки, пользователи, приём заявок с сайта"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT') else {}
    resource = params.get('resource', '')
    action = params.get('action', '')
    eid = int(params['id']) if params.get('id') else None

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if resource == 'auth':
            return handle_auth(cur, action, method, body, headers)
        if resource == 'public_lead' and method == 'POST':
            return handle_public_lead(cur, body, event)

        user = get_user(cur, headers)
        if not user:
            return resp(401, {'error': 'Требуется вход'})

        if resource == 'finance':
            return handle_finance(cur, t, method, params, body, user, eid, resp)
        if resource == 'counters':
            q(cur, f"""SELECT
                (SELECT COUNT(*) FROM {t('crm_leads')} WHERE status = 'new' AND archived_at IS NULL) AS leads,
                (SELECT COUNT(*) FROM {t('family_questions')} WHERE status = 'new') AS questions""")
            return resp(200, cur.fetchone())
        if resource == 'dashboard':
            return handle_dashboard(cur)
        if resource == 'options':
            return handle_options(cur)
        if resource == 'shop_orders':
            return handle_shop_orders(cur, params)
        if resource == 'api_keys':
            return handle_api_keys(cur, method, eid, body, user)
        if resource == 'users':
            return handle_users(cur, method, eid, body, user, params)
        if resource == 'activities':
            return handle_activity(cur, method, eid, body, user)
        if resource in ENTITIES:
            if resource == 'leads' and action == 'convert' and eid:
                return convert_lead(cur, eid, body, user)
            if method == 'GET':
                return get_entity(cur, resource, eid) if eid else list_entity(cur, resource, params)
            if method == 'POST':
                if action == 'restore' and eid:
                    return archive_entity(cur, resource, eid, user, restore=True)
                return save_entity(cur, resource, None, body, user)
            if method == 'PUT' and eid:
                return save_entity(cur, resource, eid, body, user)
            if method == 'DELETE' and eid:
                return archive_entity(cur, resource, eid, user)
        return resp(404, {'error': 'Неизвестный запрос'})
    finally:
        cur.close()
        conn.close()