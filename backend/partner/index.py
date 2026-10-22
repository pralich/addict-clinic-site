import json
import os
import re
import hashlib
import secrets
from datetime import datetime, date, timedelta
from decimal import Decimal
from urllib.request import urlopen

import psycopg2
import psycopg2.extras

SCHEMA = 't_p15395438_addict_clinic_site'
CRM_PUSH_URL = 'https://functions.poehali.dev/b525b7b2-701a-46d0-9842-7774ed5dcd2a?action=notify'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token, X-Crm-Token',
    'Access-Control-Max-Age': '86400',
}

LEAD_STATUSES = ('new', 'in_work', 'qualified', 'converted', 'rejected')
PARTNER_LEAD_STATUSES = ('in_work', 'qualified', 'rejected')
PATIENT_STATUSES = ('expected', 'admitted', 'discharged', 'interrupted')
CONDITIONS = ('stable', 'improving', 'worsening', 'critical')
STATUS_TEXT = {'expected': 'ожидается', 'admitted': 'на лечении', 'discharged': 'выписан', 'interrupted': 'прервал лечение'}
COND_TEXT = {'stable': 'стабильное', 'improving': 'улучшение', 'worsening': 'ухудшение', 'critical': 'тяжёлое'}
PATIENT_FIELDS = {'full_name': 250, 'birth_date': None, 'phone': 50, 'rep_name': 250, 'rep_phone': 50, 'program': 200, 'status': None,
                  'admitted_at': None, 'planned_discharge': None, 'discharged_at': None, 'room': 100, 'doctor': 200, 'diagnosis': 3000,
                  'condition': None, 'notes': 5000}
DATE_FIELDS = ('birth_date', 'admitted_at', 'planned_discharge', 'discharged_at')
PATIENT_OUT = """p.id, p.partner_id, p.deal_id, p.client_id, p.full_name, p.birth_date, p.phone, p.rep_name, p.rep_phone, p.program, p.status,
    p.admitted_at, p.planned_discharge, p.discharged_at, p.room, p.doctor, p.diagnosis, p.condition, p.notes, p.created_at, p.updated_at,
    d.title AS deal_title, d.stage AS deal_stage,
    (SELECT MAX(n.created_at) FROM {notes} n WHERE n.patient_id = p.id) AS last_note_at"""


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status, self.message = status, message


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


def clean(v, limit=None):
    if v is None:
        return None
    v = str(v).strip()
    if not v:
        return None
    return v[:limit] if limit else v


def to_date(v):
    v = clean(v)
    if not v:
        return None
    try:
        return date.fromisoformat(v[:10])
    except ValueError:
        raise ApiError(400, 'Неверный формат даты')


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    return f"{salt}${hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 120000).hex()}"


def check_password(password, stored):
    return secrets.compare_digest(hash_password(password, stored.split('$', 1)[0]), stored)


def hdr(headers, name):
    return headers.get(name) or headers.get(name.lower()) or ''


def ping_push():
    try:
        urlopen(CRM_PUSH_URL, timeout=2.5).read()
    except Exception as e:
        print(f'crm push ping failed: {e}')


def crm_log(cur, entity, eid, text, user_id=None):
    cur.execute(f"INSERT INTO {t('crm_activities')} (entity_type, entity_id, user_id, kind, text) VALUES (%s, %s, %s, 'system', %s)", (entity, eid, user_id, text))


# ---------- партнёр ----------

def partner_user(cur, headers):
    token = hdr(headers, 'X-Auth-Token')
    if not token:
        return None
    cur.execute(f"""SELECT u.id, u.name, u.email, u.phone, u.partner_id, p.name AS partner_name, p.type AS partner_type, p.commission_percent
        FROM {t('partner_sessions')} s JOIN {t('partner_users')} u ON u.id = s.partner_user_id JOIN {t('crm_partners')} p ON p.id = u.partner_id
        WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active AND p.archived_at IS NULL""", (token,))
    return cur.fetchone()


def auth(cur, action, method, body, headers):
    if action == 'login' and method == 'POST':
        email, password = (clean(body.get('email')) or '').lower(), body.get('password') or ''
        cur.execute(f"""SELECT u.id, u.password_hash, u.is_active, p.archived_at FROM {t('partner_users')} u JOIN {t('crm_partners')} p ON p.id = u.partner_id
            WHERE u.email = %s""", (email,))
        u = cur.fetchone()
        if not u or not u['is_active'] or u['archived_at'] or not check_password(password, u['password_hash']):
            raise ApiError(401, 'Неверный email или пароль')
        token = secrets.token_urlsafe(32)
        cur.execute(f"INSERT INTO {t('partner_sessions')} (token, partner_user_id, expires_at) VALUES (%s, %s, %s)", (token, u['id'], datetime.utcnow() + timedelta(days=30)))
        cur.execute(f"UPDATE {t('partner_users')} SET last_login_at = NOW() WHERE id = %s", (u['id'],))
        return resp(200, {'token': token, 'user': partner_user(cur, {'X-Auth-Token': token})})
    user = partner_user(cur, headers)
    if not user:
        raise ApiError(401, 'Требуется вход')
    if action == 'logout':
        cur.execute(f"UPDATE {t('partner_sessions')} SET expires_at = NOW() WHERE token = %s", (hdr(headers, 'X-Auth-Token'),))
        return resp(200, {'ok': True})
    if action == 'password' and method == 'POST':
        cur.execute(f"SELECT password_hash FROM {t('partner_users')} WHERE id = %s", (user['id'],))
        if not check_password(body.get('old') or '', cur.fetchone()['password_hash']):
            raise ApiError(400, 'Текущий пароль указан неверно')
        new = body.get('new') or ''
        if len(new) < 6:
            raise ApiError(400, 'Новый пароль — от 6 символов')
        cur.execute(f"UPDATE {t('partner_users')} SET password_hash = %s WHERE id = %s", (hash_password(new), user['id']))
        return resp(200, {'ok': True})
    return resp(200, {'user': user})


def overview(cur, pid):
    cur.execute(f"""SELECT
        (SELECT COUNT(*) FROM {t('crm_leads')} WHERE partner_id = %s AND archived_at IS NULL AND trashed_at IS NULL) AS leads,
        (SELECT COUNT(*) FROM {t('crm_leads')} WHERE partner_id = %s AND archived_at IS NULL AND trashed_at IS NULL AND status = 'new') AS leads_new,
        (SELECT COUNT(*) FROM {t('crm_deals')} WHERE partner_id = %s AND archived_at IS NULL) AS deals,
        (SELECT COUNT(*) FROM {t('crm_deals')} d WHERE d.partner_id = %s AND d.archived_at IS NULL AND d.stage NOT IN ('won', 'lost')
            AND NOT EXISTS (SELECT 1 FROM {t('partner_patients')} pp WHERE pp.deal_id = d.id)) AS deals_waiting,
        (SELECT COUNT(*) FROM {t('partner_patients')} WHERE partner_id = %s AND status = 'admitted') AS in_treatment,
        (SELECT COUNT(*) FROM {t('partner_patients')} WHERE partner_id = %s AND status = 'expected') AS expected,
        (SELECT COUNT(*) FROM {t('partner_patients')} p WHERE p.partner_id = %s AND p.status = 'admitted'
            AND NOT EXISTS (SELECT 1 FROM {t('partner_patient_notes')} n WHERE n.patient_id = p.id AND n.created_at > NOW() - INTERVAL '1 day')) AS no_report_today""",
        (pid,) * 7)
    return resp(200, cur.fetchone())


def list_leads(cur, pid, params):
    where, args = ['l.partner_id = %s', 'l.archived_at IS NULL', 'l.trashed_at IS NULL'], [pid]
    if params.get('status') in LEAD_STATUSES:
        where.append('l.status = %s')
        args.append(params['status'])
    qtext = clean(params.get('q'), 100)
    if qtext:
        where.append('(l.name ILIKE %s OR l.contact ILIKE %s OR l.topic ILIKE %s OR l.rep_name ILIKE %s)')
        args += [f'%{qtext}%'] * 4
    cur.execute(f"""SELECT l.id, l.name, l.contact, l.topic, l.message, l.status, l.rep_name, l.rep_relation, l.rep_phone, l.rep_email, l.rep_messenger,
            l.created_at, l.updated_at, mu.name AS manager_name, mu.phone AS manager_phone
        FROM {t('crm_leads')} l LEFT JOIN {t('crm_users')} mu ON mu.id = l.manager_id
        WHERE {' AND '.join(where)} ORDER BY l.created_at DESC LIMIT 300""", args)
    return resp(200, {'items': cur.fetchall()})


def own(cur, table, eid, pid):
    cur.execute(f"SELECT * FROM {t(table)} WHERE id = %s AND partner_id = %s AND archived_at IS NULL", (eid, pid))
    row = cur.fetchone()
    if not row:
        raise ApiError(404, 'Не найдено или не передано вашей организации')
    return row


def history(cur, entity, eid):
    cur.execute(f"""SELECT a.id, a.kind, a.text, a.created_at, u.name AS user_name FROM {t('crm_activities')} a LEFT JOIN {t('crm_users')} u ON u.id = a.user_id
        WHERE a.entity_type = %s AND a.entity_id = %s AND a.kind = 'system' AND (a.text LIKE 'Партнёр%%' OR a.text LIKE 'Для партнёра:%%')
        ORDER BY a.created_at DESC LIMIT 50""", (entity, eid))
    return cur.fetchall()


def lead_action(cur, user, eid, method, body):
    lead = own(cur, 'crm_leads', eid, user['partner_id'])
    if method == 'GET':
        return resp(200, {'item': lead, 'history': history(cur, 'leads', eid)})
    who = f"Партнёр {user['partner_name']} ({user['name']})"
    changed = False
    st = body.get('status')
    if st and st != lead['status']:
        if st not in PARTNER_LEAD_STATUSES:
            raise ApiError(400, 'Недопустимый статус')
        cur.execute(f"UPDATE {t('crm_leads')} SET status = %s, updated_at = NOW() WHERE id = %s", (st, eid))
        names = {'in_work': 'в работе', 'qualified': 'квалифицирован', 'rejected': 'отказ'}
        crm_log(cur, 'leads', eid, f"{who}: статус — {names[st]}")
        changed = True
    note = clean(body.get('note'), 3000)
    if note:
        crm_log(cur, 'leads', eid, f"{who}: {note}")
        changed = True
    if not changed:
        raise ApiError(400, 'Нет изменений')
    return resp(200, {'ok': True})


def list_deals(cur, pid):
    cur.execute(f"""SELECT d.id, d.title, d.stage, d.program, d.amount, d.check_in_date, d.treatment_months, d.check_out_date, d.notes,
            d.commission_type, d.commission_value, d.created_at, d.updated_at,
            c.full_name AS client_name, c.phone AS client_phone, c.birth_date AS client_birth_date, c.is_anonymous,
            d.rep_name, d.rep_relation, d.rep_phone, mu.name AS manager_name, mu.phone AS manager_phone,
            pp.id AS patient_id, pp.status AS patient_status
        FROM {t('crm_deals')} d
        LEFT JOIN {t('crm_clients')} c ON c.id = d.client_id
        LEFT JOIN {t('crm_users')} mu ON mu.id = d.manager_id
        LEFT JOIN {t('partner_patients')} pp ON pp.deal_id = d.id
        WHERE d.partner_id = %s AND d.archived_at IS NULL ORDER BY d.created_at DESC LIMIT 300""", (pid,))
    return resp(200, {'items': cur.fetchall()})


def deal_action(cur, user, eid, method, body):
    deal = own(cur, 'crm_deals', eid, user['partner_id'])
    if method == 'GET':
        return resp(200, {'item': deal, 'history': history(cur, 'deals', eid)})
    note = clean(body.get('note'), 3000)
    if not note:
        raise ApiError(400, 'Напишите комментарий')
    crm_log(cur, 'deals', eid, f"Партнёр {user['partner_name']} ({user['name']}): {note}")
    return resp(200, {'ok': True})


def list_patients(cur, pid=None, deal_id=None, status=None):
    where, args = [], []
    if pid:
        where.append('p.partner_id = %s')
        args.append(pid)
    if deal_id:
        where.append('p.deal_id = %s')
        args.append(deal_id)
    if status in PATIENT_STATUSES:
        where.append('p.status = %s')
        args.append(status)
    elif status == 'active':
        where.append("p.status IN ('expected', 'admitted')")
    cur.execute(f"""SELECT {PATIENT_OUT.format(notes=t('partner_patient_notes'))}, cp.name AS partner_name
        FROM {t('partner_patients')} p LEFT JOIN {t('crm_deals')} d ON d.id = p.deal_id LEFT JOIN {t('crm_partners')} cp ON cp.id = p.partner_id
        WHERE {' AND '.join(where) or 'TRUE'}
        ORDER BY CASE p.status WHEN 'admitted' THEN 0 WHEN 'expected' THEN 1 ELSE 2 END, COALESCE(p.admitted_at, p.created_at::date) DESC LIMIT 500""", args)
    return cur.fetchall()


def patient_notes(cur, patient_id):
    cur.execute(f"""SELECT n.id, n.kind, n.condition, n.text, n.created_at, COALESCE(pu.name, cu.name) AS author, (n.crm_user_id IS NOT NULL) AS from_clinic
        FROM {t('partner_patient_notes')} n LEFT JOIN {t('partner_users')} pu ON pu.id = n.partner_user_id LEFT JOIN {t('crm_users')} cu ON cu.id = n.crm_user_id
        WHERE n.patient_id = %s ORDER BY n.created_at DESC LIMIT 200""", (patient_id,))
    return cur.fetchall()


def get_patient(cur, eid, pid=None):
    cur.execute(f"""SELECT {PATIENT_OUT.format(notes=t('partner_patient_notes'))}, cp.name AS partner_name
        FROM {t('partner_patients')} p LEFT JOIN {t('crm_deals')} d ON d.id = p.deal_id LEFT JOIN {t('crm_partners')} cp ON cp.id = p.partner_id
        WHERE p.id = %s""" + (' AND p.partner_id = %s' if pid else ''), (eid, pid) if pid else (eid,))
    row = cur.fetchone()
    if not row:
        raise ApiError(404, 'Пациент не найден')
    return row


def patient_payload(body):
    data = {}
    for f, limit in PATIENT_FIELDS.items():
        if f not in body:
            continue
        v = body.get(f)
        if f in DATE_FIELDS:
            data[f] = to_date(v)
        elif f == 'status':
            if v not in PATIENT_STATUSES:
                raise ApiError(400, 'Неверный статус пациента')
            data[f] = v
        elif f == 'condition':
            data[f] = v if v in CONDITIONS else None
        else:
            data[f] = clean(v, limit)
    if 'full_name' in data and not data['full_name']:
        raise ApiError(400, 'Укажите ФИО или псевдоним пациента')
    return data


def sync_deal(cur, p, old, who):
    if not p.get('deal_id'):
        return
    sets, args, parts = [], [], []
    if p.get('admitted_at') and (not old or old.get('admitted_at') != p['admitted_at']):
        sets.append('check_in_date = %s')
        args.append(p['admitted_at'])
        parts.append(f"поступил {p['admitted_at'].strftime('%d.%m.%Y')}")
    out = p.get('discharged_at') or p.get('planned_discharge')
    old_out = old and (old.get('discharged_at') or old.get('planned_discharge'))
    if out and out != old_out:
        sets.append('check_out_date = %s')
        args.append(out)
        parts.append(f"{'выписан' if p.get('discharged_at') else 'плановая выписка'} {out.strftime('%d.%m.%Y')}")
    if p['status'] == 'admitted' and (not old or old['status'] != 'admitted'):
        sets.append("stage = CASE WHEN stage IN ('won', 'lost') THEN stage ELSE 'treatment' END")
    if not old or old['status'] != p['status']:
        parts.insert(0, f"статус пациента — {STATUS_TEXT[p['status']]}")
    if sets:
        cur.execute(f"UPDATE {t('crm_deals')} SET {', '.join(sets)}, updated_at = NOW() WHERE id = %s", args + [p['deal_id']])
    if parts:
        crm_log(cur, 'deals', p['deal_id'], f"{who}: {', '.join(parts)}")


def save_patient(cur, user, eid, body):
    pid = user['partner_id']
    who = f"Партнёр {user['partner_name']} ({user['name']})"
    data = patient_payload(body)
    if eid:
        old = get_patient(cur, eid, pid)
        if not data:
            raise ApiError(400, 'Нет изменений')
        cur.execute(f"UPDATE {t('partner_patients')} SET {', '.join(f'{k} = %s' for k in data)}, updated_at = NOW() WHERE id = %s",
                    list(data.values()) + [eid])
        new = get_patient(cur, eid, pid)
        sync_deal(cur, new, old, who)
        if old['status'] != new['status']:
            cur.execute(f"INSERT INTO {t('partner_patient_notes')} (patient_id, partner_user_id, kind, text) VALUES (%s, %s, 'status', %s)",
                        (eid, user['id'], f"Статус: {STATUS_TEXT[new['status']]}"))
        return resp(200, {'item': new})
    deal = None
    if body.get('deal_id'):
        deal = own(cur, 'crm_deals', int(body['deal_id']), pid)
        cur.execute(f"SELECT id FROM {t('partner_patients')} WHERE deal_id = %s", (deal['id'],))
        ex = cur.fetchone()
        if ex:
            return resp(200, {'item': get_patient(cur, ex['id'], pid)})
        cl = None
        if deal.get('client_id'):
            cur.execute(f"SELECT full_name, phone, birth_date FROM {t('crm_clients')} WHERE id = %s", (deal['client_id'],))
            cl = cur.fetchone()
        defaults = {'full_name': (cl or {}).get('full_name') or deal['title'], 'phone': (cl or {}).get('phone'), 'birth_date': (cl or {}).get('birth_date'),
                    'rep_name': deal.get('rep_name'), 'rep_phone': deal.get('rep_phone'), 'program': deal.get('program'),
                    'admitted_at': deal.get('check_in_date'), 'planned_discharge': deal.get('check_out_date')}
        data = {**{k: v for k, v in defaults.items() if v}, **{k: v for k, v in data.items() if v is not None}}
    if not data.get('full_name'):
        raise ApiError(400, 'Укажите ФИО или псевдоним пациента')
    data.setdefault('status', 'admitted' if data.get('admitted_at') and data['admitted_at'] <= date.today() else 'expected')
    cols = {'partner_id': pid, 'created_by': user['id'], **data}
    if deal:
        cols['deal_id'], cols['client_id'] = deal['id'], deal.get('client_id')
    cur.execute(f"INSERT INTO {t('partner_patients')} ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))}) RETURNING id", list(cols.values()))
    new_id = cur.fetchone()['id']
    new = get_patient(cur, new_id, pid)
    if deal:
        sync_deal(cur, new, None, who)
    return resp(200, {'item': new})


def add_note(cur, patient_id, text, condition, partner_user_id=None, crm_user_id=None):
    text = clean(text, 5000)
    if not text:
        raise ApiError(400, 'Напишите запись')
    condition = condition if condition in CONDITIONS else None
    cur.execute(f"INSERT INTO {t('partner_patient_notes')} (patient_id, partner_user_id, crm_user_id, kind, condition, text) VALUES (%s, %s, %s, 'note', %s, %s) RETURNING id",
                (patient_id, partner_user_id, crm_user_id, condition, text))
    if condition:
        cur.execute(f"UPDATE {t('partner_patients')} SET condition = %s, updated_at = NOW() WHERE id = %s", (condition, patient_id))
    return condition


def partner_routes(cur, user, resource, method, eid, params, body):
    pid = user['partner_id']
    if resource == 'overview':
        return overview(cur, pid)
    if resource == 'leads':
        return lead_action(cur, user, eid, method, body) if eid else list_leads(cur, pid, params)
    if resource == 'deals':
        return deal_action(cur, user, eid, method, body) if eid else list_deals(cur, pid)
    if resource == 'patients':
        if method == 'POST':
            return save_patient(cur, user, eid, body)
        if eid:
            return resp(200, {'item': get_patient(cur, eid, pid), 'notes': patient_notes(cur, eid)})
        return resp(200, {'items': list_patients(cur, pid, status=params.get('status'))})
    if resource == 'patient_notes' and method == 'POST':
        p = get_patient(cur, int(body.get('patient_id') or 0), pid)
        cond = add_note(cur, p['id'], body.get('text'), body.get('condition'), partner_user_id=user['id'])
        if cond in ('worsening', 'critical') and p.get('deal_id'):
            crm_log(cur, 'deals', p['deal_id'], f"Партнёр {user['partner_name']}: состояние пациента — {COND_TEXT[cond]}. {clean(body.get('text'), 300)}")
        return resp(200, {'notes': patient_notes(cur, p['id'])})
    raise ApiError(404, 'Неизвестный раздел')


# ---------- сотрудник CRM ----------

def crm_user(cur, headers):
    token = hdr(headers, 'X-Crm-Token')
    if not token:
        return None
    cur.execute(f"""SELECT u.id, u.name, u.role FROM {t('crm_sessions')} s JOIN {t('crm_users')} u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active""", (token,))
    u = cur.fetchone()
    return u if u and u['role'] != 'leads_only' else None


def crm_routes(cur, user, resource, method, eid, params, body):
    if resource == 'access':
        partner_id = int(params.get('partner_id') or body.get('partner_id') or 0)
        if method == 'GET':
            cur.execute(f"SELECT id, name, email, phone, is_active, last_login_at, created_at FROM {t('partner_users')} WHERE partner_id = %s ORDER BY id", (partner_id,))
            return resp(200, {'items': cur.fetchall()})
        if user['role'] != 'admin':
            raise ApiError(403, 'Выдавать доступы может только администратор')
        if eid:
            sets, args = [], []
            if 'is_active' in body:
                sets.append('is_active = %s')
                args.append(bool(body['is_active']))
            if body.get('password'):
                if len(body['password']) < 6:
                    raise ApiError(400, 'Пароль — от 6 символов')
                sets.append('password_hash = %s')
                args.append(hash_password(body['password']))
            for f in ('name', 'phone'):
                if f in body:
                    sets.append(f'{f} = %s')
                    args.append(clean(body[f], 200))
            if not sets:
                raise ApiError(400, 'Нет изменений')
            cur.execute(f"UPDATE {t('partner_users')} SET {', '.join(sets)} WHERE id = %s RETURNING partner_id", args + [eid])
            row = cur.fetchone()
            if not row:
                raise ApiError(404, 'Доступ не найден')
            if body.get('password') or body.get('is_active') is False:
                cur.execute(f"UPDATE {t('partner_sessions')} SET expires_at = NOW() WHERE partner_user_id = %s", (eid,))
            return resp(200, {'ok': True})
        name, email, password = clean(body.get('name'), 200), (clean(body.get('email'), 200) or '').lower(), body.get('password') or ''
        if not partner_id or not name or not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', email) or len(password) < 6:
            raise ApiError(400, 'Укажите имя, корректный email и пароль от 6 символов')
        cur.execute(f"SELECT id FROM {t('crm_partners')} WHERE id = %s", (partner_id,))
        if not cur.fetchone():
            raise ApiError(404, 'Партнёр не найден')
        cur.execute(f"SELECT id FROM {t('partner_users')} WHERE email = %s", (email,))
        if cur.fetchone():
            raise ApiError(400, 'Такой email уже используется')
        cur.execute(f"""INSERT INTO {t('partner_users')} (partner_id, name, email, phone, password_hash, created_by) VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, name, email, phone, is_active, last_login_at, created_at""", (partner_id, name, email, clean(body.get('phone'), 50), hash_password(password), user['id']))
        item = cur.fetchone()
        crm_log(cur, 'partners', partner_id, f"Выдан доступ в кабинет партнёра: {name} ({email})", user['id'])
        return resp(200, {'item': item})
    if resource == 'patients':
        if eid:
            return resp(200, {'item': get_patient(cur, eid), 'notes': patient_notes(cur, eid)})
        deal_id = int(params['deal_id']) if str(params.get('deal_id') or '').isdigit() else None
        pid = int(params['partner_id']) if str(params.get('partner_id') or '').isdigit() else None
        return resp(200, {'items': list_patients(cur, pid, deal_id, params.get('status'))})
    if resource == 'patient_notes' and method == 'POST':
        p = get_patient(cur, int(body.get('patient_id') or 0))
        add_note(cur, p['id'], body.get('text'), None, crm_user_id=user['id'])
        return resp(200, {'notes': patient_notes(cur, p['id'])})
    raise ApiError(404, 'Неизвестный раздел')


def handler(event: dict, context) -> dict:
    """Кабинет партнёра addict.clinic: вход партнёров, переданные им лиды и сделки, ведение пациентов на лечении; управление доступами из CRM"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    try:
        body = json.loads(event.get('body') or '{}') if method == 'POST' else {}
    except json.JSONDecodeError:
        return resp(400, {'error': 'Неверный JSON'})
    resource = params.get('resource', '')
    try:
        eid = int(params['id']) if params.get('id') else None
    except ValueError:
        return resp(400, {'error': 'Неверный id'})

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if resource == 'auth':
            return auth(cur, params.get('action', 'me'), method, body, headers)
        if params.get('scope') == 'crm':
            user = crm_user(cur, headers)
            if not user:
                return resp(401, {'error': 'Требуется вход в CRM'})
            return crm_routes(cur, user, resource, method, eid, params, body)
        user = partner_user(cur, headers)
        if not user:
            return resp(401, {'error': 'Требуется вход'})
        result = partner_routes(cur, user, resource, method, eid, params, body)
        if method == 'POST' and resource in ('leads', 'deals'):
            ping_push()
        return result
    except ApiError as e:
        return resp(e.status, {'error': e.message})
    finally:
        cur.close()
        conn.close()
