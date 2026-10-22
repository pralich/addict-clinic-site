import json
import os
import re
from datetime import datetime, date, timedelta, timezone
from email.utils import format_datetime
import html as html_lib
from xml.sax.saxutils import escape

import boto3
import psycopg2
import psycopg2.extras

SCHEMA = 't_p15395438_addict_clinic_site'
SITE = 'https://addict.clinic'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}

STATIC_PAGES = [
    ('/', 'weekly', '1.0'),
    ('/premium', 'monthly', '0.8'),
    ('/articles', 'daily', '0.8'),
    ('/shop', 'weekly', '0.7'),
    ('/lechenie', 'monthly', '0.9'),
    ('/lechenie/narkomanii', 'monthly', '0.9'),
    ('/lechenie/alkogolizma', 'monthly', '0.9'),
    ('/lechenie/igromanii', 'monthly', '0.9'),
    ('/lechenie/igrovoj-zavisimosti', 'monthly', '0.9'),
    ('/lechenie/rpp', 'monthly', '0.9'),
    ('/privacy', 'yearly', '0.3'),
    ('/consent', 'yearly', '0.3'),
    ('/offer', 'yearly', '0.3'),
    ('/cookies', 'yearly', '0.3'),
    ('/requisites', 'yearly', '0.3'),
]


COUNTERS = {
    'yandex_metrika': (r'^\d{5,12}$', 'Номер счётчика Метрики — только цифры'),
    'google_analytics': (r'^G-[A-Z0-9]{4,20}$', 'Идентификатор Google Analytics вида G-XXXXXXX'),
    'vk_pixel': (r'^VK-RTRG-\d+-[A-Za-z0-9]+$', 'Код пикселя VK вида VK-RTRG-123456-AbCdE'),
    'top_mail_ru': (r'^\d{5,10}$', 'Номер счётчика Top.Mail.Ru — только цифры'),
    'yandex_verification': (r'^[A-Za-z0-9_-]{8,100}$', 'Код подтверждения Яндекс Вебмастера'),
    'google_verification': (r'^[A-Za-z0-9_-]{10,100}$', 'Код подтверждения Google Search Console'),
}

META_RE = re.compile(r'content=["\']([^"\']+)["\']')


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
    cur.execute(f'SELECT u.id, u.role FROM {SCHEMA}.crm_sessions s JOIN {SCHEMA}.crm_users u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active AND u.role <> %s', (token, 'leads_only'))
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


CATEGORY_LABELS = {
    'rehab': 'Реабилитация', 'alcohol': 'Алкоголизм', 'drugs': 'Наркомания', 'meds': 'Лекарственная зависимость',
    'gambling': 'Игромания', 'codependency': 'Созависимость', 'eating': 'Пищевое поведение', 'nicotine': 'Никотин',
    'internet': 'Интернет-зависимость', 'mental': 'Депрессия и тревога',
}
MSK_TZ = timezone(timedelta(hours=3))
INLINE_RE = [
    (re.compile(r'\*\*(.+?)\*\*'), r'<strong>\1</strong>'),
    (re.compile(r'(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\w)'), r'<em>\1</em>'),
    (re.compile(r'\[([^\]]+)\]\((https?://[^)\s]+|/[^)\s]*)\)'), r'<a href="\2">\1</a>'),
]


def _inline(text):
    out = html_lib.escape(text, quote=False)
    for rx, rep in INLINE_RE:
        out = rx.sub(rep, out)
    return out.replace('href="/', f'href="{SITE}/')


def md_to_html(md):
    parts, para, items, kind = [], [], [], None

    def flush():
        nonlocal para, items, kind
        if para:
            parts.append(f"<p>{_inline(' '.join(para))}</p>")
        if items:
            parts.append(f"<{kind}>" + ''.join(f'<li>{_inline(i)}</li>' for i in items) + f"</{kind}>")
        para, items, kind = [], [], None

    for raw in (md or '').splitlines():
        line = raw.strip()
        if not line:
            flush()
            continue
        h = re.match(r'^(#{2,4})\s+(.*)$', line)
        ul = re.match(r'^[-*•]\s+(.*)$', line)
        ol = re.match(r'^\d+[.)]\s+(.*)$', line)
        if h:
            flush()
            parts.append(f"<h{len(h.group(1))}>{_inline(h.group(2))}</h{len(h.group(1))}>")
        elif line.startswith('>'):
            flush()
            parts.append(f"<blockquote>{_inline(line.lstrip('> '))}</blockquote>")
        elif ul or ol:
            k = 'ul' if ul else 'ol'
            if para or (kind and kind != k):
                flush()
            kind = k
            items.append((ul or ol).group(1))
        else:
            if items:
                flush()
            para.append(line)
    flush()
    return '\n'.join(parts)


def _rfc822(dt):
    return format_datetime(dt.replace(tzinfo=timezone.utc).astimezone(MSK_TZ))


def _cdata(s):
    return '<![CDATA[' + (s or '').replace(']]>', ']]]]><![CDATA[>') + ']]>'


def build_rss(cur, limit=50):
    cur.execute(f"""SELECT slug, title, excerpt, meta_description, category, cover_url, cover_alt, content, author, published_at, updated_at
        FROM {SCHEMA}.articles WHERE status = 'published' AND published_at <= NOW() ORDER BY published_at DESC LIMIT %s""", (limit,))
    rows = cur.fetchall()
    last = max([r['updated_at'] or r['published_at'] for r in rows], default=datetime.utcnow())
    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" '
        'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:media="http://search.yahoo.com/mrss/" xmlns:yandex="http://news.yandex.ru">',
        '<channel>',
        '  <title>Статьи addict.clinic — о зависимостях и восстановлении</title>',
        f'  <link>{SITE}/articles</link>',
        '  <description>Статьи врачей и психологов о лечении зависимостей, реабилитации и помощи близким</description>',
        '  <language>ru</language>',
        f'  <atom:link href="{SITE}/rss.xml" rel="self" type="application/rss+xml"/>',
        f'  <lastBuildDate>{_rfc822(last)}</lastBuildDate>',
        '  <image>',
        f'    <url>{SITE}/logo.png</url>',
        '    <title>Статьи addict.clinic — о зависимостях и восстановлении</title>',
        f'    <link>{SITE}/articles</link>',
        '  </image>',
    ]
    for r in rows:
        link = f"{SITE}/articles/{r['slug']}"
        desc = r['excerpt'] or r['meta_description'] or ''
        body = md_to_html(r['content'])
        if r['cover_url']:
            body = f'<figure><img src="{escape(r["cover_url"])}" alt="{escape(r["cover_alt"] or r["title"], {chr(34): "&quot;"})}"/></figure>\n' + body
        out += [
            '  <item>',
            f"    <title>{escape(r['title'])}</title>",
            f'    <link>{link}</link>',
            f'    <guid isPermaLink="true">{link}</guid>',
            f"    <pubDate>{_rfc822(r['published_at'])}</pubDate>",
            f'    <description>{_cdata(desc)}</description>',
            f'    <content:encoded>{_cdata(body)}</content:encoded>',
            f'    <yandex:full-text>{_cdata(re.sub(r"<[^>]+>", " ", body))}</yandex:full-text>',
        ]
        if r['author']:
            out.append(f"    <dc:creator>{escape(r['author'])}</dc:creator>")
        if r['category']:
            out.append(f"    <category>{escape(CATEGORY_LABELS.get(r['category'], r['category']))}</category>")
        if r['cover_url']:
            ctype = 'image/png' if r['cover_url'].lower().endswith('.png') else 'image/webp' if r['cover_url'].lower().endswith('.webp') else 'image/jpeg'
            out.append(f'    <enclosure url="{escape(r["cover_url"])}" type="{ctype}" length="0"/>')
            out.append(f'    <media:content url="{escape(r["cover_url"])}" medium="image"/>')
        out.append('  </item>')
    out += ['</channel>', '</rss>']
    return '\n'.join(out) + '\n'


def upload(xml):
    key_id = os.environ['AWS_ACCESS_KEY_ID']
    s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev', aws_access_key_id=key_id, aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    s3.put_object(Bucket='files', Key='seo/sitemap.xml', Body=xml.encode('utf-8'), ContentType='application/xml; charset=utf-8', CacheControl='no-cache')
    return f'https://cdn.poehali.dev/projects/{key_id}/bucket/seo/sitemap.xml'


def locs(xml):
    return {line.strip()[5:-6] for line in (xml or '').splitlines() if line.strip().startswith('<loc>')}


def read_counters(cur, only_enabled):
    cur.execute(f'SELECT c.kind, c.value, c.enabled, c.updated_at, u.name AS author FROM {SCHEMA}.seo_counters c LEFT JOIN {SCHEMA}.crm_users u ON u.id = c.updated_by')
    rows = cur.fetchall()
    if only_enabled:
        return {r['kind']: r['value'] for r in rows if r['enabled'] and r['value']}
    return {r['kind']: r for r in rows}


def save_counters(cur, body, user_id):
    items = body.get('counters') or {}
    errors = {}
    for kind, item in items.items():
        if kind not in COUNTERS:
            continue
        value = str(item.get('value') or '').strip()
        m = META_RE.search(value)
        if m:
            value = m.group(1)
        if kind == 'yandex_metrika':
            value = re.sub(r'\D', '', value) if re.fullmatch(r'[\d\s]+', value or 'x') else value
        enabled = bool(item.get('enabled', True))
        if value and not re.match(COUNTERS[kind][0], value):
            errors[kind] = COUNTERS[kind][1]
            continue
        cur.execute(
            f'INSERT INTO {SCHEMA}.seo_counters (kind, value, enabled, updated_by, updated_at) VALUES (%s, %s, %s, %s, NOW()) '
            f'ON CONFLICT (kind) DO UPDATE SET value = EXCLUDED.value, enabled = EXCLUDED.enabled, updated_by = EXCLUDED.updated_by, updated_at = NOW()',
            (kind, value, enabled, user_id),
        )
    return errors


def handler(event: dict, context) -> dict:
    """SEO-раздел админки: карта сайта — публичная выдача XML, статус и обновление для администратора"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    action = params.get('action', '')
    body = json.loads(event.get('body') or '{}') if method in ('POST', 'PUT') else {}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if method == 'GET' and action == 'sitemap.xml':
            cur.execute(f'SELECT xml FROM {SCHEMA}.seo_sitemaps ORDER BY id DESC LIMIT 1')
            row = cur.fetchone()
            xml = row['xml'] if row else build_sitemap(cur)[0]
            return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=600'}, 'body': xml}

        if method == 'GET' and action in ('rss', 'rss.xml'):
            return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/rss+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600'}, 'body': build_rss(cur)}

        if method == 'GET' and action == 'counters':
            return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300'}, 'body': json.dumps(read_counters(cur, True))}

        user = get_user(cur, headers)
        if not user:
            return resp(401, {'error': 'Требуется вход'})

        if method == 'GET' and action == 'counters_admin':
            return resp(200, {'counters': read_counters(cur, False)})

        if method == 'PUT' and action == 'counters':
            if user['role'] != 'admin':
                return resp(403, {'error': 'Менять счётчики может только администратор'})
            errors = save_counters(cur, body, user['id'])
            return resp(400 if errors else 200, {'errors': errors, 'error': 'Проверьте коды' if errors else None, 'counters': read_counters(cur, False)})

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
