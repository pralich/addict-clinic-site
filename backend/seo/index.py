import json
import os
from datetime import datetime, date
from xml.sax.saxutils import escape

import boto3
import psycopg2
import psycopg2.extras

SCHEMA = 't_p15395438_addict_clinic_site'
SITE = 'https://addict.clinic'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}

STATIC_PAGES = [
    ('/', 'weekly', '1.0'),
    ('/premium', 'monthly', '0.8'),
    ('/articles', 'daily', '0.8'),
    ('/shop', 'weekly', '0.7'),
    ('/privacy', 'yearly', '0.3'),
    ('/consent', 'yearly', '0.3'),
    ('/offer', 'yearly', '0.3'),
    ('/cookies', 'yearly', '0.3'),
    ('/requisites', 'yearly', '0.3'),
]


def _ser(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    return str(o)


def resp(status, data):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=_ser, ensure_ascii=False)}


def get_user(cur, headers):
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    cur.execute(f'SELECT u.id, u.role FROM {SCHEMA}.crm_sessions s JOIN {SCHEMA}.crm_users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active', (token,))
    return cur.fetchone()


def build_sitemap(cur):
    today = date.today().isoformat()
    cur.execute(f"SELECT slug, title, COALESCE(updated_at, published_at) AS mod FROM {SCHEMA}.articles WHERE status = 'published' AND published_at <= NOW() ORDER BY published_at DESC")
    articles = cur.fetchall()
    latest = max([a['mod'] for a in articles], default=None)
    urls = []
    for path, freq, prio in STATIC_PAGES:
        mod = latest.date().isoformat() if path == '/articles' and latest else today
        urls.append({'loc': SITE + path, 'lastmod': mod, 'changefreq': freq, 'priority': prio, 'title': None})
    for a in articles:
        urls.append({'loc': f"{SITE}/articles/{a['slug']}", 'lastmod': a['mod'].date().isoformat(), 'changefreq': 'monthly', 'priority': '0.7', 'title': a['title']})
    parts = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in urls:
        parts.append(f"  <url>\n    <loc>{escape(u['loc'])}</loc>\n    <lastmod>{u['lastmod']}</lastmod>\n    <changefreq>{u['changefreq']}</changefreq>\n    <priority>{u['priority']}</priority>\n  </url>")
    parts.append('</urlset>')
    return '\n'.join(parts) + '\n', urls, len(articles)


def upload(xml):
    key_id = os.environ['AWS_ACCESS_KEY_ID']
    s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev', aws_access_key_id=key_id, aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    s3.put_object(Bucket='files', Key='seo/sitemap.xml', Body=xml.encode('utf-8'), ContentType='application/xml; charset=utf-8', CacheControl='no-cache')
    return f'https://cdn.poehali.dev/projects/{key_id}/bucket/seo/sitemap.xml'


def locs(xml):
    return {line.strip()[5:-6] for line in (xml or '').splitlines() if line.strip().startswith('<loc>')}


def handler(event: dict, context) -> dict:
    """SEO-раздел админки: карта сайта — публичная выдача XML, статус и обновление для администратора"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    action = params.get('action', '')

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if method == 'GET' and action == 'sitemap.xml':
            cur.execute(f'SELECT xml FROM {SCHEMA}.seo_sitemaps ORDER BY id DESC LIMIT 1')
            row = cur.fetchone()
            xml = row['xml'] if row else build_sitemap(cur)[0]
            return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600'}, 'body': xml}

        user = get_user(cur, headers)
        if not user:
            return resp(401, {'error': 'Требуется вход'})

        if method == 'GET' and action == 'status':
            cur.execute(f'SELECT s.id, s.xml, s.urls_count, s.articles_count, s.file_url, s.created_at, u.name AS author FROM {SCHEMA}.seo_sitemaps s LEFT JOIN {SCHEMA}.crm_users u ON u.id = s.created_by ORDER BY s.id DESC LIMIT 1')
            last = cur.fetchone()
            _, urls, _ = build_sitemap(cur)
            current = {u['loc'] for u in urls}
            saved = locs(last['xml']) if last else set()
            cur.execute(f'SELECT s.id, s.urls_count, s.articles_count, s.created_at, u.name AS author FROM {SCHEMA}.seo_sitemaps s LEFT JOIN {SCHEMA}.crm_users u ON u.id = s.created_by ORDER BY s.id DESC LIMIT 10')
            history = cur.fetchall()
            if last:
                last.pop('xml')
            return resp(200, {
                'last': last,
                'urls': urls,
                'pending_add': sorted(current - saved) if last else sorted(current),
                'pending_remove': sorted(saved - current) if last else [],
                'history': history,
            })

        if method == 'POST' and action == 'regenerate':
            cur.execute(f'SELECT xml FROM {SCHEMA}.seo_sitemaps ORDER BY id DESC LIMIT 1')
            prev = cur.fetchone()
            xml, urls, articles_count = build_sitemap(cur)
            file_url = upload(xml)
            cur.execute(f'INSERT INTO {SCHEMA}.seo_sitemaps (xml, urls_count, articles_count, file_url, created_by) VALUES (%s, %s, %s, %s, %s) RETURNING id, created_at', (xml, len(urls), articles_count, file_url, user['id']))
            row = cur.fetchone()
            old = locs(prev['xml']) if prev else set()
            new = {u['loc'] for u in urls}
            return resp(200, {
                'id': row['id'],
                'created_at': row['created_at'],
                'urls_count': len(urls),
                'articles_count': articles_count,
                'file_url': file_url,
                'added': sorted(new - old),
                'removed': sorted(old - new),
                'xml': xml,
            })

        return resp(404, {'error': 'Неизвестный запрос'})
    finally:
        cur.close()
        conn.close()
