import json
import os
import re
import base64
import hashlib
import hmac
from datetime import datetime, date
from decimal import Decimal
from urllib.request import Request, urlopen
from urllib.error import HTTPError

import psycopg2
import psycopg2.extras

SCHEMA = 't_p15395438_addict_clinic_site'
API = 'https://polza.ai/api/v1'
STT_MODEL = 'openai/whisper-1'
LLM_MODEL = 'deepseek/deepseek-v4-flash-0731'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}

FIELDS = {
    'name': 'Имя / псевдоним',
    'topic': 'Повод обращения',
    'message': 'Комментарий',
    'status': 'Статус лида',
    'rep_name': 'Контактное лицо',
    'rep_relation': 'Кем приходится',
    'rep_phone': 'Телефон контактного лица',
    'rep_email': 'Email контактного лица',
    'rep_messenger': 'Мессенджер',
    'rep_note': 'Заметка о контактном лице',
}
STATUSES = {'new': 'Новый', 'in_work': 'В работе', 'qualified': 'Квалифицирован', 'rejected': 'Отказ'}
RELATIONS = {'self': 'Сам пациент', 'spouse': 'Супруг(а)', 'parent': 'Родитель', 'child': 'Ребёнок', 'sibling': 'Брат / сестра',
             'relative': 'Родственник', 'friend': 'Друг', 'colleague': 'Коллега', 'employer': 'Работодатель', 'guardian': 'Опекун', 'other': 'Другое'}


def internal_key():
    return hashlib.sha256(f"call-ai:{os.environ.get('DATABASE_URL', '')}".encode()).hexdigest()


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


def get_user(cur, headers):
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    cur.execute(f"""SELECT u.id, u.name, u.role, u.is_active FROM {t('crm_sessions')} s JOIN {t('crm_users')} u ON u.id = s.user_id
        WHERE s.token = %s AND s.expires_at > NOW()""", (token,))
    u = cur.fetchone()
    return u if u and u['is_active'] else None


def polza(path, payload, timeout):
    key = os.environ.get('POLZA_AI_API_KEY')
    if not key:
        raise RuntimeError('Не добавлен ключ Polza.AI (секрет POLZA_AI_API_KEY)')
    req = Request(f'{API}{path}', data=json.dumps(payload).encode(), method='POST',
                  headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
    try:
        return json.loads(urlopen(req, timeout=timeout).read())
    except HTTPError as e:
        detail = e.read().decode(errors='ignore')[:300]
        print(f'polza {path} {e.code}: {detail}')
        raise RuntimeError(f'Polza.AI ответил ошибкой {e.code}')


def load_call(cur, cid):
    cur.execute(f"""SELECT c.*, l.name AS lead_name FROM {t('crm_calls')} c LEFT JOIN {t('crm_leads')} l ON l.id = c.lead_id WHERE c.id = %s""", (cid,))
    return cur.fetchone()


def view(c):
    return {k: c.get(k) for k in ('id', 'transcript', 'transcribed_at', 'ai_summary', 'ai_fields', 'ai_analyzed_at', 'ai_applied_at', 'lead_id', 'ai_status', 'ai_error')}


QUEUE = f"""duration > 0 AND COALESCE(record_url, record_source_url) IS NOT NULL AND transcript IS NULL
    AND started_at > NOW() - INTERVAL '2 days' AND ai_attempts < 3
    AND (ai_status IS NULL OR ai_status = 'error' OR (ai_status = 'processing' AND ai_started_at < NOW() - INTERVAL '10 minutes'))"""


def claim(cur, cid=None):
    extra, args = ('AND id = %s', (cid,)) if cid else ('', ())
    cur.execute(f"""UPDATE {t('crm_calls')} SET ai_status = 'processing', ai_started_at = NOW(), ai_attempts = ai_attempts + 1, ai_error = NULL
        WHERE id = (SELECT id FROM {t('crm_calls')} WHERE {QUEUE} {extra} ORDER BY started_at DESC LIMIT 1 FOR UPDATE SKIP LOCKED)
        RETURNING id""", args)
    row = cur.fetchone()
    return load_call(cur, row['id']) if row else None


def process(cur, cid=None):
    c = claim(cur, cid)
    if not c:
        cur.execute(f"SELECT COUNT(*) AS n FROM {t('crm_calls')} WHERE {QUEUE}")
        return resp(200, {'processed': None, 'left': cur.fetchone()['n']})
    try:
        r = transcribe(cur, c)
        if r['statusCode'] == 200:
            r = analyze(cur, load_call(cur, c['id']))
        err = None if r['statusCode'] == 200 else json.loads(r['body']).get('error')
    except RuntimeError as e:
        err = str(e)
    except Exception as e:
        print(f'auto ai failed {c["id"]}: {e}')
        err = 'Внутренняя ошибка ИИ-разбора'
    final = 4 if err and ('записи нет' in err or 'не удалось распознать' in err.lower() or 'слишком длинная' in err) else None
    cur.execute(f"UPDATE {t('crm_calls')} SET ai_status = %s, ai_error = %s, ai_attempts = COALESCE(%s, ai_attempts) WHERE id = %s",
                ('error' if err else 'done', err, final, c['id']))
    cur.execute(f"SELECT COUNT(*) AS n FROM {t('crm_calls')} WHERE {QUEUE}")
    return resp(200, {'processed': c['id'], 'ok': not err, 'error': err, 'left': cur.fetchone()['n']})


def transcribe(cur, c):
    url = c.get('record_url') or c.get('record_source_url')
    if not url:
        return resp(400, {'error': 'У звонка нет записи разговора'})
    try:
        audio = urlopen(Request(url, headers={'User-Agent': 'addict-crm'}), timeout=30).read()
    except Exception as e:
        print(f'record download failed {c["id"]}: {e}')
        return resp(502, {'error': 'Не удалось скачать запись разговора'})
    if len(audio) > 14 * 1024 * 1024:
        return resp(400, {'error': 'Запись слишком длинная для расшифровки (больше 14 МБ)'})
    data = polza('/audio/transcriptions', {
        'model': STT_MODEL, 'file': f'data:audio/mpeg;base64,{base64.b64encode(audio).decode()}', 'language': 'ru',
        'prompt': 'Телефонный разговор администратора наркологической клиники с обратившимся человеком.',
    }, 240)
    text = (data.get('text') or '').strip()
    if not text:
        return resp(422, {'error': 'В записи не удалось распознать речь'})
    cur.execute(f"UPDATE {t('crm_calls')} SET ai_status = 'done', ai_error = NULL, transcript = %s, transcribed_at = NOW(), ai_summary = NULL, ai_fields = NULL, ai_analyzed_at = NULL WHERE id = %s", (text, c['id']))
    return resp(200, {'item': view(load_call(cur, c['id']))})


def parse_json(s):
    s = re.sub(r'^```(?:json)?|```$', '', (s or '').strip(), flags=re.M).strip()
    m = re.search(r'\{.*\}', s, re.S)
    return json.loads(m.group(0) if m else s)


def analyze(cur, c):
    if not c.get('transcript'):
        return resp(400, {'error': 'Сначала расшифруйте звонок'})
    lead = None
    if c.get('lead_id'):
        cur.execute(f"SELECT id, {', '.join(FIELDS)}, contact FROM {t('crm_leads')} WHERE id = %s", (c['lead_id'],))
        lead = cur.fetchone()
    current = {f: (lead or {}).get(f) for f in FIELDS}
    prompt = f"""Ты помощник CRM наркологической клиники. Ниже расшифровка телефонного звонка ({'входящий' if c['direction'] == 'in' else 'исходящий'}, номер {c.get('phone') or 'скрыт'}).
Задачи:
1. summary — краткое резюме звонка на русском, 3–6 пунктов через перенос строки, каждый с «• »: кто звонил, проблема, о чём договорились, следующий шаг.
2. fields — значения полей лида, которые ЯВНО следуют из разговора. Не выдумывай. Если данных нет — null.
Поля:
- name: имя пациента (или как представился звонящий, если он сам пациент)
- topic: повод обращения, коротко (например «Вывод из запоя», «Кодирование», «Реабилитация»)
- message: суть запроса и важные детали, 1–3 предложения
- status: один из {list(STATUSES)} (qualified — если есть явный интерес и договорённость; rejected — если явный отказ; иначе null)
- rep_name: имя звонящего, если звонит НЕ сам пациент
- rep_relation: кем звонящий приходится пациенту, один из {list(RELATIONS)}
- rep_phone, rep_email, rep_messenger: дополнительные контакты, если продиктованы
- rep_note: важное о звонящем (удобное время, просьбы)
Текущие значения в CRM: {json.dumps(current, ensure_ascii=False, default=_ser)}
Ответ — строго JSON без пояснений: {{"summary": "...", "fields": {{...}}}}

Расшифровка:
{c['transcript'][:24000]}"""
    data = polza('/chat/completions', {
        'model': LLM_MODEL, 'temperature': 0.2, 'response_format': {'type': 'json_object'},
        'messages': [{'role': 'user', 'content': prompt}],
    }, 120)
    try:
        out = parse_json(data['choices'][0]['message']['content'])
    except Exception as e:
        print(f'llm parse failed: {e}')
        return resp(502, {'error': 'ИИ вернул ответ в неверном формате, попробуйте ещё раз'})
    summary = str(out.get('summary') or '').strip()
    raw = out.get('fields') or {}
    proposals = []
    for f, label in FIELDS.items():
        v = raw.get(f)
        if v is None or not str(v).strip():
            continue
        v = str(v).strip()[:1000]
        if f == 'status' and v not in STATUSES:
            continue
        if f == 'rep_relation' and v not in RELATIONS:
            continue
        cur_v = current.get(f)
        if cur_v is not None and str(cur_v).strip() == v:
            continue
        proposals.append({'field': f, 'label': label, 'current': cur_v, 'proposed': v,
                          'display': STATUSES.get(v) if f == 'status' else RELATIONS.get(v) if f == 'rep_relation' else v})
    cur.execute(f"UPDATE {t('crm_calls')} SET ai_summary = %s, ai_fields = %s, ai_analyzed_at = NOW() WHERE id = %s",
                (summary, json.dumps(proposals, ensure_ascii=False), c['id']))
    return resp(200, {'item': view(load_call(cur, c['id']))})


def apply(cur, c, body, user):
    picked = body.get('fields') or {}
    data = {}
    for f, v in picked.items():
        if f not in FIELDS or v is None:
            continue
        v = str(v).strip()[:1000]
        if f == 'status' and v not in STATUSES:
            continue
        if f == 'rep_relation' and v not in RELATIONS:
            continue
        data[f] = v or None
    add_summary = bool(body.get('summary')) and c.get('ai_summary')
    if not data and not add_summary:
        return resp(400, {'error': 'Ничего не выбрано'})
    lead_id = c.get('lead_id')
    if not lead_id:
        if not c.get('phone'):
            return resp(400, {'error': 'Нет номера, чтобы создать лид'})
        cols = {'contact': c['phone'], 'source': 'phone', 'form': 'call', 'manager_id': user['id'], **data}
        cur.execute(f"INSERT INTO {t('crm_leads')} ({', '.join(cols)}) VALUES ({', '.join(['%s'] * len(cols))}) RETURNING id", list(cols.values()))
        lead_id = cur.fetchone()['id']
        cur.execute(f"UPDATE {t('crm_calls')} SET lead_id = %s WHERE id = %s", (lead_id, c['id']))
        cur.execute(f"INSERT INTO {t('crm_activities')} (entity_type, entity_id, user_id, kind, text) VALUES ('leads', %s, %s, 'system', %s)",
                    (lead_id, user['id'], 'Лид создан из звонка с помощью ИИ'))
    elif data:
        sets = ', '.join(f'{k} = %s' for k in data)
        cur.execute(f"UPDATE {t('crm_leads')} SET {sets}, updated_at = NOW() WHERE id = %s", list(data.values()) + [lead_id])
        names = ', '.join(FIELDS[k].lower() for k in data)
        cur.execute(f"INSERT INTO {t('crm_activities')} (entity_type, entity_id, user_id, kind, text) VALUES ('leads', %s, %s, 'system', %s)",
                    (lead_id, user['id'], f'Поля обновлены по звонку (ИИ): {names}'))
    if add_summary:
        when = c['started_at'].strftime('%d.%m %H:%M') if c.get('started_at') else ''
        cur.execute(f"INSERT INTO {t('crm_activities')} (entity_type, entity_id, user_id, kind, text) VALUES ('leads', %s, %s, 'call', %s)",
                    (lead_id, user['id'], f"Резюме звонка {when}:\n{c['ai_summary']}"))
    cur.execute(f"UPDATE {t('crm_calls')} SET ai_applied_at = NOW(), ai_applied_by = %s WHERE id = %s", (user['id'], c['id']))
    return resp(200, {'item': view(load_call(cur, c['id'])), 'lead_id': lead_id})


def handler(event: dict, context) -> dict:
    """ИИ для звонков CRM: расшифровка записи (Polza.AI whisper), резюме и предложение полей лида, применение после одобрения"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}
    action = params.get('action') or 'get'

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if action == 'auto':
            key = params.get('key') or headers.get('X-Internal-Key') or headers.get('x-internal-key') or ''
            if not hmac.compare_digest(key, internal_key()):
                return resp(401, {'error': 'Неверный ключ'})
            try:
                cid = int(params.get('id') or 0) or None
            except ValueError:
                cid = None
            return process(cur, cid)
        user = get_user(cur, headers)
        if not user:
            return resp(401, {'error': 'Требуется вход'})
        if user['role'] == 'leads_only':
            return resp(403, {'error': 'Нет доступа'})
        try:
            cid = int(params.get('id') or body.get('id') or 0)
        except ValueError:
            cid = 0
        if action == 'queue' and method == 'POST':
            return process(cur)
        c = load_call(cur, cid) if cid else None
        if not c:
            return resp(404, {'error': 'Звонок не найден'})
        try:
            if action == 'get':
                return resp(200, {'item': view(c)})
            if method != 'POST':
                return resp(405, {'error': 'Метод не поддерживается'})
            if action == 'transcribe':
                return transcribe(cur, c)
            if action == 'analyze':
                return analyze(cur, c)
            if action == 'apply':
                return apply(cur, c, body, user)
            return resp(400, {'error': 'Неизвестное действие'})
        except RuntimeError as e:
            return resp(502, {'error': str(e)})
    finally:
        cur.close()
        conn.close()
