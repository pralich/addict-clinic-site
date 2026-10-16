import json
import os
import re
import uuid
import base64
from datetime import datetime, date

import boto3
import psycopg2
import psycopg2.extras

SCHEMA = 't_p15395438_addict_clinic_site'
T = f'{SCHEMA}.articles'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}

FIELDS = ['slug', 'title', 'meta_title', 'meta_description', 'excerpt', 'category', 'cover_url', 'cover_alt', 'content', 'cta_type', 'status', 'author', 'published_at']
LIST_FIELDS = 'id, slug, title, excerpt, category, cover_url, cover_alt, cta_type, status, author, views, published_at, created_at, updated_at'

TRANSLIT = dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя', ['a', 'b', 'v', 'g', 'd', 'e', 'e', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'f', 'h', 'ts', 'ch', 'sh', 'sch', '', 'y', '', 'e', 'yu', 'ya']))


def slugify(text):
    s = ''.join(TRANSLIT.get(c, c) for c in (text or '').lower())
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:120] or uuid.uuid4().hex[:8]


def _ser(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    return str(o)


def resp(status, data, cache=False):
    h = {**CORS, 'Content-Type': 'application/json'}
    if cache:
        h['Cache-Control'] = 'public, max-age=120'
    return {'statusCode': status, 'headers': h, 'body': json.dumps(data, default=_ser, ensure_ascii=False)}


def get_user(cur, headers):
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    cur.execute(f'SELECT u.id, u.role FROM {SCHEMA}.crm_sessions s JOIN {SCHEMA}.crm_users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active AND u.role <> %s', (token, 'leads_only'))
    return cur.fetchone()


def clean(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


def upload_cover(body):
    data = body.get('file')
    if not data:
        return resp(400, {'error': 'Нет файла'})
    if ',' in data[:100]:
        data = data.split(',', 1)[1]
    raw = base64.b64decode(data)
    if len(raw) > 8 * 1024 * 1024:
        return resp(400, {'error': 'Файл больше 8 МБ'})
    ctype = body.get('contentType') or 'image/jpeg'
    ext = {'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg'}.get(ctype, 'jpg')
    key = f'articles/{uuid.uuid4().hex}.{ext}'
    s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev', aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'], aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=ctype)
    return resp(200, {'url': f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"})


def handler(event: dict, context) -> dict:
    """Статьи блога: публичный список и страница статьи, управление статьями для админ-панели"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT') else {}
    action = params.get('action', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if method == 'GET' and params.get('slug'):
            cur.execute(f"SELECT * FROM {T} WHERE slug = %s AND status = 'published'", (params['slug'],))
            item = cur.fetchone()
            if not item:
                return resp(404, {'error': 'Статья не найдена'})
            cur.execute(f'UPDATE {T} SET views = views + 1 WHERE id = %s', (item['id'],))
            cur.execute(f"SELECT {LIST_FIELDS} FROM {T} WHERE status = 'published' AND id <> %s ORDER BY (category = %s) DESC, published_at DESC LIMIT 3", (item['id'], item['category']))
            return resp(200, {'item': item, 'related': cur.fetchall()})

        if method == 'GET' and action != 'admin':
            where, args = ["status = 'published'", 'published_at <= NOW()'], []
            if params.get('category'):
                where.append('category = %s')
                args.append(params['category'])
            cur.execute(f"SELECT {LIST_FIELDS} FROM {T} WHERE {' AND '.join(where)} ORDER BY published_at DESC LIMIT 200", args)
            return resp(200, {'items': cur.fetchall()}, cache=True)

        user = get_user(cur, headers)
        if not user:
            return resp(401, {'error': 'Требуется вход'})

        if action == 'upload' and method == 'POST':
            return upload_cover(body)

        if method == 'GET':
            if params.get('id'):
                cur.execute(f'SELECT * FROM {T} WHERE id = %s', (int(params['id']),))
                item = cur.fetchone()
                return resp(200, {'item': item}) if item else resp(404, {'error': 'Не найдено'})
            where, args = ['1=1'], []
            if params.get('search'):
                where.append('(title ILIKE %s OR slug ILIKE %s)')
                args += [f"%{params['search']}%"] * 2
            if params.get('status'):
                where.append('status = %s')
                args.append(params['status'])
            cur.execute(f"SELECT {LIST_FIELDS} FROM {T} WHERE {' AND '.join(where)} ORDER BY updated_at DESC", args)
            return resp(200, {'items': cur.fetchall()})

        if method in ('POST', 'PUT'):
            data = {f: clean(body[f]) for f in FIELDS if f in body}
            eid = int(params['id']) if params.get('id') else None
            if method == 'POST' and not data.get('title'):
                return resp(400, {'error': 'Укажите заголовок'})
            if 'slug' in data or method == 'POST':
                data['slug'] = slugify(data.get('slug') or data.get('title'))
                cur.execute(f'SELECT id FROM {T} WHERE slug = %s', (data['slug'],))
                ex = cur.fetchone()
                if ex and ex['id'] != eid:
                    return resp(400, {'error': 'Статья с таким адресом уже есть'})
            if data.get('status') == 'published' and not data.get('published_at'):
                if eid:
                    cur.execute(f'SELECT published_at FROM {T} WHERE id = %s', (eid,))
                    row = cur.fetchone()
                    if not (row and row['published_at']):
                        data['published_at'] = datetime.utcnow()
                    elif 'published_at' in data:
                        data['published_at'] = row['published_at']
                else:
                    data['published_at'] = datetime.utcnow()
            if 'content' in data and data['content'] is None:
                data['content'] = ''
            if method == 'POST':
                cols = ', '.join(data)
                cur.execute(f"INSERT INTO {T} ({cols}) VALUES ({', '.join(['%s'] * len(data))}) RETURNING *", list(data.values()))
            else:
                if not eid or not data:
                    return resp(400, {'error': 'Нет данных'})
                sets = ', '.join(f'{k} = %s' for k in data)
                cur.execute(f'UPDATE {T} SET {sets}, updated_at = NOW() WHERE id = %s RETURNING *', list(data.values()) + [eid])
            return resp(200, {'item': cur.fetchone()})

        if method == 'DELETE' and params.get('id'):
            cur.execute(f"UPDATE {T} SET status = 'archived', updated_at = NOW() WHERE id = %s", (int(params['id']),))
            return resp(200, {'ok': True})

        return resp(404, {'error': 'Неизвестный запрос'})
    finally:
        cur.close()
        conn.close()
