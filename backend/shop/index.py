import json
import os
import re
import uuid
import base64
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import HTTPError

import psycopg2
import psycopg2.extras

SCHEMA = 't_p15395438_addict_clinic_site'
API = 'https://api.yookassa.ru/v3/payments'
DELIVERY_PRICE = 390
FREE_DELIVERY_FROM = 5000
CATEGORIES = ('merch', 'certificates', 'books')

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
}


def t(name):
    return f'{SCHEMA}.{name}'


def resp(status, data):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, ensure_ascii=False, default=str)}


def _auth():
    shop, key = os.environ.get('YOOKASSA_SHOP_ID', ''), os.environ.get('YOOKASSA_SECRET_KEY', '')
    if not shop or not key:
        return None
    return 'Basic ' + base64.b64encode(f'{shop}:{key}'.encode()).decode()


def _options(p):
    return [o.strip() for o in (p.get('options') or '').split(',') if o.strip()]


def _serialize(p):
    p = dict(p)
    p['options'] = _options(p)
    p.pop('created_at', None)
    return p


def _price(p, option):
    if p['slug'] == 'cert-amount' and option and option.isdigit():
        return int(option)
    return p['price']


def create_order(cur, body):
    name = (body.get('name') or '').strip()[:200]
    email = (body.get('email') or '').strip()[:200]
    phone = (body.get('phone') or '').strip()[:50]
    address = (body.get('address') or '').strip()[:500]
    comment = (body.get('comment') or '').strip()[:1000]
    return_url = body.get('return_url') or ''
    if not name or not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
        return 400, {'error': 'Укажите имя и корректный email'}
    if not return_url.startswith('https://'):
        return 400, {'error': 'Некорректный адрес возврата'}
    raw = body.get('items') or []
    if not raw or len(raw) > 30:
        return 400, {'error': 'Корзина пуста'}

    ids = [int(i.get('id') or 0) for i in raw]
    cur.execute(f'SELECT * FROM {t("shop_products")} WHERE id = ANY(%s) AND is_active AND in_stock', (ids,))
    products = {p['id']: p for p in cur.fetchall()}
    lines = []
    for i in raw:
        p = products.get(int(i.get('id') or 0))
        if not p:
            return 400, {'error': 'Некоторые товары закончились — обновите корзину'}
        qty = max(1, min(20, int(i.get('qty') or 1)))
        opt = (i.get('option') or '').strip()
        opts = _options(p)
        if opts and opt not in opts:
            return 400, {'error': f'Выберите вариант для «{p["title"]}»'}
        price = _price(p, opt)
        label = p['title'] + (f' ({opt} ₽)' if p['slug'] == 'cert-amount' else f' ({opt})' if opt else '')
        lines.append({'id': p['slug'], 'name': label[:128], 'price': price, 'qty': qty, 'digital': p['is_digital']})

    physical = any(not l['digital'] for l in lines)
    if physical and len(address) < 10:
        return 400, {'error': 'Укажите адрес доставки'}
    subtotal = sum(l['price'] * l['qty'] for l in lines)
    delivery = DELIVERY_PRICE if physical and subtotal < FREE_DELIVERY_FROM else 0
    total = subtotal + delivery

    auth = _auth()
    if not auth:
        return 503, {'error': 'Оплата временно недоступна: платёжная система ещё не подключена'}

    number = f"SH-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    cur.execute(f"""INSERT INTO {t('orders')} (order_number, user_name, user_email, user_phone, amount, status, product_code, delivery_address, comment, source)
        VALUES (%s, %s, %s, %s, %s, 'pending', 'shop', %s, %s, 'shop') RETURNING id""",
                (number, name, email, phone, total, address if physical else None, comment))
    oid = cur.fetchone()['id']
    receipt = []
    for l in lines:
        cur.execute(f"INSERT INTO {t('order_items')} (order_id, product_id, product_name, product_price, quantity) VALUES (%s, %s, %s, %s, %s)",
                    (oid, l['id'], l['name'], l['price'], l['qty']))
        receipt.append({'description': l['name'], 'quantity': f"{l['qty']}.000", 'amount': {'value': f"{l['price']:.2f}", 'currency': 'RUB'},
                        'vat_code': 1, 'payment_subject': 'service' if l['digital'] else 'commodity', 'payment_mode': 'full_payment'})
    if delivery:
        cur.execute(f"INSERT INTO {t('order_items')} (order_id, product_id, product_name, product_price, quantity) VALUES (%s, 'delivery', 'Доставка', %s, 1)", (oid, delivery))
        receipt.append({'description': 'Доставка', 'quantity': '1.000', 'amount': {'value': f'{delivery:.2f}', 'currency': 'RUB'},
                        'vat_code': 1, 'payment_subject': 'service', 'payment_mode': 'full_payment'})

    sep = '&' if '?' in return_url else '?'
    payload = {
        'amount': {'value': f'{total:.2f}', 'currency': 'RUB'},
        'capture': True,
        'confirmation': {'type': 'redirect', 'return_url': f'{return_url}{sep}order={number}'},
        'description': f'Заказ {number} в магазине addict.clinic',
        'metadata': {'order_id': str(oid), 'order_number': number},
        'receipt': {'customer': {'email': email}, 'items': receipt},
    }
    req = Request(API, data=json.dumps(payload).encode(), method='POST',
                  headers={'Authorization': auth, 'Idempotence-Key': str(uuid.uuid4()), 'Content-Type': 'application/json'})
    try:
        with urlopen(req, timeout=20) as r:
            pay = json.loads(r.read().decode())
    except HTTPError as e:
        print(f'yookassa error: {e.read().decode()[:500]}')
        cur.execute(f"UPDATE {t('orders')} SET status = 'canceled', updated_at = NOW() WHERE id = %s", (oid,))
        return 502, {'error': 'Платёжная система не приняла запрос, попробуйте позже'}
    url = (pay.get('confirmation') or {}).get('confirmation_url', '')
    cur.execute(f"UPDATE {t('orders')} SET yookassa_payment_id = %s, payment_url = %s, updated_at = NOW() WHERE id = %s", (pay.get('id'), url, oid))
    return 200, {'payment_url': url, 'order_number': number}


def order_status(cur, number):
    cur.execute(f"SELECT id, order_number, status, amount, yookassa_payment_id, created_at, paid_at FROM {t('orders')} WHERE order_number = %s AND source = 'shop'", (number,))
    o = cur.fetchone()
    if not o:
        return 404, {'error': 'Заказ не найден'}
    auth = _auth()
    if o['status'] == 'pending' and o['yookassa_payment_id'] and auth:
        try:
            with urlopen(Request(f"{API}/{o['yookassa_payment_id']}", headers={'Authorization': auth}), timeout=10) as r:
                st = json.loads(r.read().decode()).get('status')
            if st == 'succeeded':
                cur.execute(f"UPDATE {t('orders')} SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = %s AND status = 'pending'", (o['id'],))
                o['status'] = 'paid'
            elif st == 'canceled':
                cur.execute(f"UPDATE {t('orders')} SET status = 'canceled', updated_at = NOW() WHERE id = %s AND status = 'pending'", (o['id'],))
                o['status'] = 'canceled'
        except Exception as e:
            print(f'status check error: {e}')
    o.pop('yookassa_payment_id', None)
    o.pop('id', None)
    return 200, {'order': o}


def handler(event: dict, context) -> dict:
    """Магазин клиники: каталог товаров (мерч, сертификаты, литература), оформление заказа и оплата через ЮKassa"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    params = event.get('queryStringParameters') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        action = params.get('action', '')
        if method == 'GET' and action == 'order':
            code, data = order_status(cur, params.get('number') or '')
            return resp(code, data)
        if method == 'GET':
            cat = params.get('category')
            if cat and cat in CATEGORIES:
                cur.execute(f'SELECT * FROM {t("shop_products")} WHERE is_active AND category = %s ORDER BY sort, id', (cat,))
            else:
                cur.execute(f'SELECT * FROM {t("shop_products")} WHERE is_active ORDER BY sort, id')
            items = [_serialize(p) for p in cur.fetchall()]
            return resp(200, {'items': items, 'delivery': {'price': DELIVERY_PRICE, 'free_from': FREE_DELIVERY_FROM}})
        if method == 'POST' and action == 'checkout':
            code, data = create_order(cur, body)
            return resp(code, data)
        return resp(404, {'error': 'Неизвестный запрос'})
    finally:
        cur.close()
        conn.close()
