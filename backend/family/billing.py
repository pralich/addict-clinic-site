import json
import os
import uuid
import base64
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import HTTPError

API = 'https://api.yookassa.ru/v3/payments'
TOKEN_PRICE_PER_1000 = 1000
TOKEN_PACKS = (1, 5, 10, 25)

PLANS = {
    'psychologist': {'title': 'Консультации с психологом', 'price': 8000, 'days': 30},
    'family_care': {'title': 'Ведение родственников: мотивация и экстренное консультирование', 'price': 15000, 'days': 30},
}


def catalog():
    return {
        'token_price_per_1000': TOKEN_PRICE_PER_1000,
        'token_packs': [{'thousands': k, 'tokens': k * 1000, 'price': k * TOKEN_PRICE_PER_1000} for k in TOKEN_PACKS],
        'plans': [{'code': k, **v} for k, v in PLANS.items()],
    }


def _auth():
    shop, key = os.environ.get('YOOKASSA_SHOP_ID', ''), os.environ.get('YOOKASSA_SECRET_KEY', '')
    if not shop or not key:
        return None
    return 'Basic ' + base64.b64encode(f'{shop}:{key}'.encode()).decode()


def _product(body):
    code = body.get('product')
    if code == 'tokens':
        k = int(body.get('thousands') or 0)
        if k < 1 or k > 1000:
            return None
        return {'code': 'tokens', 'name': f'Пакет ИИ-токенов: {k * 1000:,}'.replace(',', ' '), 'price': k * TOKEN_PRICE_PER_1000, 'tokens': k * 1000}
    if code in PLANS:
        p = PLANS[code]
        return {'code': code, 'name': f"{p['title']} — 30 дней", 'price': p['price'], 'tokens': 0}
    return None


def create_payment(cur, t, user, body):
    product = _product(body)
    if not product:
        return 400, {'error': 'Неизвестный тариф'}
    return_url = body.get('return_url') or ''
    if not return_url.startswith('https://'):
        return 400, {'error': 'Некорректный адрес возврата'}
    auth = _auth()
    if not auth:
        return 503, {'error': 'Оплата временно недоступна: платёжная система ещё не подключена'}

    number = f"FC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
    cur.execute(f"""INSERT INTO {t('orders')} (order_number, user_name, user_email, user_phone, amount, status, family_user_id, product_code, tokens)
        VALUES (%s, %s, %s, %s, %s, 'pending', %s, %s, %s) RETURNING id""",
                (number, user['name'], user['email'], user.get('phone'), product['price'], user['id'], product['code'], product['tokens']))
    oid = cur.fetchone()['id']
    cur.execute(f"INSERT INTO {t('order_items')} (order_id, product_id, product_name, product_price, quantity) VALUES (%s, %s, %s, %s, 1)",
                (oid, product['code'], product['name'], product['price']))

    sep = '&' if '?' in return_url else '?'
    payload = {
        'amount': {'value': f"{product['price']:.2f}", 'currency': 'RUB'},
        'capture': True,
        'confirmation': {'type': 'redirect', 'return_url': f'{return_url}{sep}order={number}'},
        'description': f"{product['name']} ({number})",
        'metadata': {'order_id': str(oid), 'order_number': number},
        'receipt': {
            'customer': {'email': user['email']},
            'items': [{
                'description': product['name'][:128], 'quantity': '1.000',
                'amount': {'value': f"{product['price']:.2f}", 'currency': 'RUB'},
                'vat_code': 1, 'payment_subject': 'service', 'payment_mode': 'full_payment',
            }],
        },
    }
    req = Request(API, data=json.dumps(payload).encode(), method='POST',
                  headers={'Authorization': auth, 'Idempotence-Key': str(uuid.uuid4()), 'Content-Type': 'application/json'})
    try:
        with urlopen(req, timeout=20) as r:
            pay = json.loads(r.read().decode())
    except HTTPError:
        cur.execute(f"UPDATE {t('orders')} SET status = 'canceled', updated_at = NOW() WHERE id = %s", (oid,))
        return 502, {'error': 'Платёжная система не приняла запрос, попробуйте позже'}
    url = (pay.get('confirmation') or {}).get('confirmation_url', '')
    cur.execute(f"UPDATE {t('orders')} SET yookassa_payment_id = %s, payment_url = %s, updated_at = NOW() WHERE id = %s", (pay.get('id'), url, oid))
    return 200, {'payment_url': url, 'order_number': number}


def apply_order(cur, t, oid):
    cur.execute(f"UPDATE {t('orders')} SET applied_at = NOW() WHERE id = %s AND status = 'paid' AND applied_at IS NULL AND family_user_id IS NOT NULL RETURNING id, family_user_id, product_code, tokens", (oid,))
    o = cur.fetchone()
    if not o:
        return
    uid = o['family_user_id']
    if o['product_code'] == 'tokens' and o['tokens']:
        cur.execute(f"UPDATE {t('family_users')} SET token_balance = token_balance + %s WHERE id = %s", (o['tokens'], uid))
        cur.execute(f"INSERT INTO {t('family_token_tx')} (user_id, delta, reason, order_id) VALUES (%s, %s, 'purchase', %s)", (uid, o['tokens'], oid))
    elif o['product_code'] in PLANS:
        days = PLANS[o['product_code']]['days']
        cur.execute(f"SELECT MAX(ends_at) AS e FROM {t('family_subscriptions')} WHERE user_id = %s AND plan = %s AND ends_at > NOW()", (uid, o['product_code']))
        start = cur.fetchone()['e'] or datetime.utcnow()
        cur.execute(f"INSERT INTO {t('family_subscriptions')} (user_id, plan, order_id, starts_at, ends_at) VALUES (%s, %s, %s, %s, %s + INTERVAL '{int(days)} days')",
                    (uid, o['product_code'], oid, start, start))


def sync_order(cur, t, user, number):
    cur.execute(f"SELECT id, order_number, status, amount, product_code, tokens, yookassa_payment_id, created_at, paid_at FROM {t('orders')} WHERE order_number = %s AND family_user_id = %s", (number, user['id']))
    o = cur.fetchone()
    if not o:
        return None
    auth = _auth()
    if o['status'] == 'pending' and o['yookassa_payment_id'] and auth:
        try:
            with urlopen(Request(f"{API}/{o['yookassa_payment_id']}", headers={'Authorization': auth}), timeout=10) as r:
                st = json.loads(r.read().decode()).get('status')
        except Exception:
            st = None
        if st == 'succeeded':
            cur.execute(f"UPDATE {t('orders')} SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = %s AND status <> 'paid'", (o['id'],))
            o['status'] = 'paid'
        elif st == 'canceled':
            cur.execute(f"UPDATE {t('orders')} SET status = 'canceled', updated_at = NOW() WHERE id = %s AND status = 'pending'", (o['id'],))
            o['status'] = 'canceled'
    if o['status'] == 'paid':
        apply_order(cur, t, o['id'])
    o.pop('yookassa_payment_id', None)
    return o


def overview(cur, t, user):
    cur.execute(f"SELECT token_balance FROM {t('family_users')} WHERE id = %s", (user['id'],))
    balance = cur.fetchone()['token_balance']
    cur.execute(f"SELECT plan, MAX(ends_at) AS ends_at FROM {t('family_subscriptions')} WHERE user_id = %s AND ends_at > NOW() GROUP BY plan", (user['id'],))
    subs = cur.fetchall()
    cur.execute(f"""SELECT o.order_number, o.status, o.amount, o.product_code, o.tokens, o.created_at, o.paid_at,
        (SELECT product_name FROM {t('order_items')} i WHERE i.order_id = o.id LIMIT 1) AS title
        FROM {t('orders')} o WHERE o.family_user_id = %s AND (o.status <> 'pending' OR o.created_at > NOW() - INTERVAL '1 day')
        ORDER BY o.created_at DESC LIMIT 30""", (user['id'],))
    orders = cur.fetchall()
    return {'balance': balance, 'subscriptions': subs, 'orders': orders, 'catalog': catalog(), 'payments_enabled': bool(_auth())}


def spend(cur, t, user, body):
    amount = int(body.get('tokens') or 0)
    if amount <= 0:
        return 400, {'error': 'Укажите количество токенов'}
    cur.execute(f"UPDATE {t('family_users')} SET token_balance = token_balance - %s WHERE id = %s AND token_balance >= %s RETURNING token_balance", (amount, user['id'], amount))
    r = cur.fetchone()
    if not r:
        return 402, {'error': 'Недостаточно токенов на балансе'}
    cur.execute(f"INSERT INTO {t('family_token_tx')} (user_id, delta, reason) VALUES (%s, %s, %s)", (user['id'], -amount, (body.get('reason') or 'ai')[:100]))
    return 200, {'balance': r['token_balance']}


def handle(cur, t, method, params, body, user):
    action = params.get('action')
    if method == 'POST' and action == 'pay':
        code, data = create_payment(cur, t, user, body)
        return code, data
    if method == 'POST' and action == 'spend':
        return spend(cur, t, user, body)
    if params.get('order'):
        o = sync_order(cur, t, user, params['order'])
        return (200, {'order': o}) if o else (404, {'error': 'Заказ не найден'})
    return 200, overview(cur, t, user)
