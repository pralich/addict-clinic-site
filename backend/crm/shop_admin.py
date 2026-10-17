import os
import re
import uuid
import base64

CATEGORIES = ('merch', 'certificates', 'books')
TEXT = {'title': 200, 'subtitle': 300, 'description': 5000, 'badge': 40, 'options': 1000, 'image_url': 1000}
TRANSLIT = dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя', ['a', 'b', 'v', 'g', 'd', 'e', 'e', 'zh', 'z', 'i', 'y', 'k', 'l', 'm', 'n', 'o', 'p', 'r', 's', 't', 'u', 'f', 'h', 'c', 'ch', 'sh', 'sch', '', 'y', '', 'e', 'yu', 'ya']))


def _slugify(s):
    s = ''.join(TRANSLIT.get(c, c) for c in (s or '').lower())
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:80] or 'item'


def _int(v, field, allow_none=False):
    if v in (None, ''):
        if allow_none:
            return None
        raise ValueError(f'Укажите {field}')
    try:
        n = int(float(v))
    except (TypeError, ValueError):
        raise ValueError(f'Поле «{field}» должно быть числом')
    if n < 0:
        raise ValueError(f'Поле «{field}» не может быть отрицательным')
    return n


def _prepare(body, partial):
    data = {}
    for f, n in TEXT.items():
        if f in body:
            v = str(body[f] or '').strip()[:n]
            if f == 'options':
                v = ', '.join(o.strip() for o in v.replace('\n', ',').split(',') if o.strip())
            data[f] = v or None
    if 'category' in body:
        if body['category'] not in CATEGORIES:
            raise ValueError('Выберите категорию')
        data['category'] = body['category']
    if 'price' in body:
        data['price'] = _int(body['price'], 'Цена')
    if 'old_price' in body:
        data['old_price'] = _int(body['old_price'], 'Старая цена', True)
    if 'sort' in body:
        data['sort'] = _int(body['sort'], 'Порядок', True) or 100
    for f in ('is_digital', 'in_stock', 'is_active'):
        if f in body:
            data[f] = bool(body[f])
    if not partial:
        if not data.get('title'):
            raise ValueError('Укажите название')
        if 'price' not in data:
            raise ValueError('Укажите цену')
        if not data.get('category'):
            raise ValueError('Выберите категорию')
    if 'title' in data and not data['title']:
        raise ValueError('Укажите название')
    if data.get('old_price') is not None and 'price' in data and data['old_price'] <= data['price']:
        data['old_price'] = None
    return data


def _upload(body):
    raw_b64 = body.get('file') or ''
    if ',' in raw_b64[:100]:
        raw_b64 = raw_b64.split(',', 1)[1]
    if not raw_b64:
        raise ValueError('Нет файла')
    raw = base64.b64decode(raw_b64)
    if len(raw) > 8 * 1024 * 1024:
        raise ValueError('Файл больше 8 МБ')
    ctype = body.get('contentType') or 'image/jpeg'
    ext = {'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg'}.get(ctype)
    if not ext:
        raise ValueError('Подходят только JPG, PNG или WEBP')
    import boto3
    key = f'shop/{uuid.uuid4().hex}.{ext}'
    s3 = boto3.client('s3', endpoint_url='https://bucket.poehali.dev', aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'], aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
    s3.put_object(Bucket='files', Key=key, Body=raw, ContentType=ctype)
    return f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"


def handle_shop_products(cur, t, method, action, eid, body, user, resp):
    if user.get('role') not in ('admin', 'manager'):
        return resp(403, {'error': 'Нет прав на управление магазином'})
    tbl = t('shop_products')
    try:
        if method == 'GET':
            cur.execute(f"""SELECT p.*, (SELECT COALESCE(SUM(i.quantity), 0) FROM {t('order_items')} i JOIN {t('orders')} o ON o.id = i.order_id
                    WHERE i.product_id = p.slug AND o.status = 'paid' AND o.source = 'shop') AS sold
                FROM {tbl} p ORDER BY p.is_active DESC, p.category, p.sort, p.id""")
            return resp(200, {'items': cur.fetchall()})
        if method == 'POST' and action == 'upload':
            return resp(200, {'url': _upload(body)})
        if method == 'POST':
            data = _prepare(body, partial=False)
            base = _slugify(data['title'])
            slug, n = base, 1
            while True:
                cur.execute(f'SELECT 1 FROM {tbl} WHERE slug = %s', (slug,))
                if not cur.fetchone():
                    break
                n += 1
                slug = f'{base}-{n}'
            data['slug'] = slug
            cols = ', '.join(data)
            cur.execute(f"INSERT INTO {tbl} ({cols}) VALUES ({', '.join(['%s'] * len(data))}) RETURNING *", list(data.values()))
            return resp(200, {'item': cur.fetchone()})
        if method == 'PUT' and eid:
            data = _prepare(body, partial=True)
            if not data:
                return resp(400, {'error': 'Нет данных'})
            sets = ', '.join(f'{k} = %s' for k in data)
            cur.execute(f'UPDATE {tbl} SET {sets} WHERE id = %s RETURNING *', list(data.values()) + [eid])
            item = cur.fetchone()
            if not item:
                return resp(404, {'error': 'Товар не найден'})
            return resp(200, {'item': item})
        if method == 'DELETE' and eid:
            cur.execute(f'UPDATE {tbl} SET is_active = FALSE WHERE id = %s RETURNING id', (eid,))
            if not cur.fetchone():
                return resp(404, {'error': 'Товар не найден'})
            return resp(200, {'ok': True})
    except ValueError as e:
        return resp(400, {'error': str(e)})
    return resp(400, {'error': 'Неверный запрос'})
