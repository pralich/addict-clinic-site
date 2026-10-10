import json
from datetime import date

PAYERS = ('client', 'partner', 'counterparty')
METHODS = ('bank', 'card', 'cash', 'online', 'other')
CP_KINDS = ('company', 'ip', 'person')
CP_FIELDS = ('name', 'kind', 'inn', 'kpp', 'ogrn', 'address', 'bank', 'bik', 'account', 'corr_account', 'contact_person', 'phone', 'email', 'notes')


def _s(v, n=500):
    v = str(v or '').strip()
    return v[:n] or None


def _id(v):
    return int(v) if str(v or '').isdigit() else None


def _date(v, default=None):
    if not v:
        return default
    try:
        return date.fromisoformat(str(v)[:10])
    except ValueError:
        return default


def _status(inv):
    if inv['status'] == 'canceled':
        return 'canceled'
    paid, amount = float(inv.get('paid') or 0), float(inv['amount'] or 0)
    if amount > 0 and paid >= amount - 0.009:
        return 'paid'
    if paid > 0:
        return 'partial'
    if inv.get('due_date') and inv['due_date'] < date.today():
        return 'overdue'
    return 'issued'


PAYER_JOIN = """LEFT JOIN {cl} c ON c.id = {a}.client_id
    LEFT JOIN {pa} p ON p.id = {a}.partner_id
    LEFT JOIN {cp} k ON k.id = {a}.counterparty_id
    LEFT JOIN {de} d ON d.id = {a}.deal_id"""
PAYER_NAME = "COALESCE(c.full_name, p.name, k.name) AS payer_name, d.title AS deal_title"


def _joins(t, alias):
    return PAYER_JOIN.format(cl=t('crm_clients'), pa=t('crm_partners'), cp=t('crm_counterparties'), de=t('crm_deals'), a=alias)


def _filters(params, alias, date_col):
    where, args = [f'{alias}.archived_at IS NULL'], []
    for f in ('client_id', 'partner_id', 'counterparty_id', 'deal_id'):
        if _id(params.get(f)):
            where.append(f'{alias}.{f} = %s')
            args.append(int(params[f]))
    if params.get('payer_type') in PAYERS:
        where.append(f'{alias}.payer_type = %s')
        args.append(params['payer_type'])
    if params.get('from'):
        where.append(f'{alias}.{date_col} >= %s')
        args.append(params['from'])
    if params.get('to'):
        where.append(f'{alias}.{date_col} <= %s')
        args.append(params['to'])
    return where, args


def _list_invoices(cur, t, params):
    where, args = _filters(params, 'i', 'issue_date')
    if _id(params.get('id')):
        where.append('i.id = %s')
        args.append(int(params['id']))
    if params.get('search'):
        where.append('(i.number ILIKE %s OR COALESCE(c.full_name, p.name, k.name) ILIKE %s)')
        args += [f"%{params['search']}%"] * 2
    cur.execute(f"""SELECT i.*, {PAYER_NAME}, u.name AS created_by_name,
            COALESCE((SELECT SUM(amount) FROM {t('crm_payments')} WHERE invoice_id = i.id AND archived_at IS NULL), 0) AS paid
        FROM {t('crm_invoices')} i {_joins(t, 'i')} LEFT JOIN {t('crm_users')} u ON u.id = i.created_by
        WHERE {' AND '.join(where)} ORDER BY i.issue_date DESC, i.id DESC LIMIT 500""", args)
    items = cur.fetchall()
    for i in items:
        i['state'] = _status(i)
        i['debt'] = max(0.0, float(i['amount']) - float(i['paid'])) if i['state'] != 'canceled' else 0.0
    st = params.get('state')
    if st:
        items = [i for i in items if i['state'] == st or (st == 'unpaid' and i['state'] in ('issued', 'partial', 'overdue'))]
    return items


def _list_payments(cur, t, params):
    where, args = _filters(params, 'pm', 'paid_at')
    if _id(params.get('invoice_id')):
        where.append('pm.invoice_id = %s')
        args.append(int(params['invoice_id']))
    cur.execute(f"""SELECT pm.*, {PAYER_NAME}, inv.number AS invoice_number, u.name AS created_by_name
        FROM {t('crm_payments')} pm {_joins(t, 'pm')}
        LEFT JOIN {t('crm_invoices')} inv ON inv.id = pm.invoice_id
        LEFT JOIN {t('crm_users')} u ON u.id = pm.created_by
        WHERE {' AND '.join(where)} ORDER BY pm.paid_at DESC, pm.id DESC LIMIT 500""", args)
    return cur.fetchall()


def _payer(body):
    pt = body.get('payer_type')
    if pt not in PAYERS:
        return None, 'Выберите плательщика'
    ref = {'client': 'client_id', 'partner': 'partner_id', 'counterparty': 'counterparty_id'}[pt]
    pid = _id(body.get(ref))
    if not pid:
        return None, 'Выберите плательщика'
    data = {'payer_type': pt, 'client_id': None, 'partner_id': None, 'counterparty_id': None}
    data[ref] = pid
    return data, None


def _items(raw):
    out = []
    for r in raw or []:
        name = _s(r.get('name'), 300)
        try:
            qty = round(float(r.get('qty') or 1), 2)
            price = round(float(r.get('price') or 0), 2)
        except (TypeError, ValueError):
            continue
        if name and qty > 0 and price >= 0:
            out.append({'name': name, 'qty': qty, 'price': price, 'unit': _s(r.get('unit'), 20) or 'усл.'})
    return out[:50]


def _log(cur, t, data, user, text):
    for kind, col in (('deals', 'deal_id'), ('clients', 'client_id'), ('partners', 'partner_id')):
        if data.get(col):
            cur.execute(f"INSERT INTO {t('crm_activities')} (entity_type, entity_id, user_id, kind, text) VALUES (%s, %s, %s, 'system', %s)",
                        (kind, data[col], user['id'], text))


def _money(v):
    return f"{float(v):,.0f}".replace(',', ' ') + ' ₽'


def _save_invoice(cur, t, eid, body, user):
    payer, err = _payer(body)
    if err:
        return 400, {'error': err}
    items = _items(body.get('items'))
    if not items:
        return 400, {'error': 'Добавьте хотя бы одну позицию'}
    amount = round(sum(i['qty'] * i['price'] for i in items), 2)
    if amount <= 0:
        return 400, {'error': 'Сумма счёта должна быть больше нуля'}
    data = {**payer, 'deal_id': _id(body.get('deal_id')), 'items': json.dumps(items, ensure_ascii=False), 'amount': amount,
            'issue_date': _date(body.get('issue_date'), date.today()), 'due_date': _date(body.get('due_date')),
            'notes': _s(body.get('notes'), 3000), 'period_date': _date(body.get('period_date')), 'status': 'canceled' if body.get('status') == 'canceled' else 'issued'}
    if eid:
        if 'period_date' not in body:
            data.pop('period_date')
        sets = ', '.join(f'{k} = %({k})s' for k in data)
        cur.execute(f"UPDATE {t('crm_invoices')} SET {sets}, updated_at = NOW() WHERE id = %(id)s AND archived_at IS NULL RETURNING *", {**data, 'id': eid})
        item = cur.fetchone()
        return (200, {'item': item}) if item else (404, {'error': 'Счёт не найден'})
    cols = ', '.join(data)
    ph = ', '.join(f'%({k})s' for k in data)
    cur.execute(f"""INSERT INTO {t('crm_invoices')} (number, {cols}, created_by)
        VALUES ('tmp-' || md5(random()::text), {ph}, %(uid)s) RETURNING id""", {**data, 'uid': user['id']})
    new_id = cur.fetchone()['id']
    number = f"{data['issue_date'].year}-{new_id:04d}"
    cur.execute(f"UPDATE {t('crm_invoices')} SET number = %s WHERE id = %s RETURNING *", (number, new_id))
    item = cur.fetchone()
    _log(cur, t, data, user, f"Выставлен счёт № {number} на {_money(amount)}")
    return 200, {'item': item}


def _save_payment(cur, t, body, user):
    try:
        amount = round(float(body.get('amount')), 2)
    except (TypeError, ValueError):
        return 400, {'error': 'Укажите сумму'}
    if amount <= 0 or amount > 1e11:
        return 400, {'error': 'Сумма должна быть больше нуля'}
    inv_id = _id(body.get('invoice_id'))
    if inv_id:
        cur.execute(f"SELECT * FROM {t('crm_invoices')} WHERE id = %s AND archived_at IS NULL", (inv_id,))
        inv = cur.fetchone()
        if not inv:
            return 404, {'error': 'Счёт не найден'}
        if inv['status'] == 'canceled':
            return 400, {'error': 'Счёт отменён'}
        payer = {k: inv[k] for k in ('payer_type', 'client_id', 'partner_id', 'counterparty_id')}
        deal_id = inv['deal_id']
    else:
        payer, err = _payer(body)
        if err:
            return 400, {'error': err}
        deal_id = _id(body.get('deal_id'))
        inv = None
    data = {**payer, 'invoice_id': inv_id, 'deal_id': deal_id, 'amount': amount, 'paid_at': _date(body.get('paid_at'), date.today()),
            'method': body.get('method') if body.get('method') in METHODS else 'bank', 'note': _s(body.get('note'), 2000), 'uid': user['id']}
    cur.execute(f"""INSERT INTO {t('crm_payments')} (invoice_id, payer_type, client_id, partner_id, counterparty_id, deal_id, amount, paid_at, method, note, created_by)
        VALUES (%(invoice_id)s, %(payer_type)s, %(client_id)s, %(partner_id)s, %(counterparty_id)s, %(deal_id)s, %(amount)s, %(paid_at)s, %(method)s, %(note)s, %(uid)s) RETURNING *""", data)
    item = cur.fetchone()
    _log(cur, t, data, user, f"Поступила оплата {_money(amount)}" + (f" по счёту № {inv['number']}" if inv else ''))
    return 200, {'item': item}


def _summary(cur, t, params):
    where, args = _filters(params, 'i', 'issue_date')
    cur.execute(f"""SELECT i.id, i.amount, i.status, i.due_date,
            COALESCE((SELECT SUM(amount) FROM {t('crm_payments')} WHERE invoice_id = i.id AND archived_at IS NULL), 0) AS paid
        FROM {t('crm_invoices')} i WHERE {' AND '.join(where)}""", args)
    inv = cur.fetchall()
    pw, pa = _filters(params, 'pm', 'paid_at')
    cur.execute(f"SELECT COALESCE(SUM(amount), 0) AS s, COUNT(*) AS n FROM {t('crm_payments')} pm WHERE {' AND '.join(pw)}", pa)
    pay = cur.fetchone()
    active = [i for i in inv if i['status'] != 'canceled']
    debt = sum(max(0.0, float(i['amount']) - float(i['paid'])) for i in active)
    overdue = sum(max(0.0, float(i['amount']) - float(i['paid'])) for i in active if _status(i) == 'overdue' or (_status(i) == 'partial' and i['due_date'] and i['due_date'] < date.today()))
    return {'invoiced': sum(float(i['amount']) for i in active), 'invoices': len(active), 'received': float(pay['s']), 'payments': pay['n'],
            'debt': debt, 'overdue': overdue}


def _counterparties(cur, t, method, eid, body, params):
    if method == 'GET':
        where, args = ['archived_at IS NULL'], []
        if params.get('search'):
            where.append('(name ILIKE %s OR inn ILIKE %s OR contact_person ILIKE %s)')
            args += [f"%{params['search']}%"] * 3
        cur.execute(f"""SELECT k.*,
                COALESCE((SELECT SUM(amount) FROM {t('crm_invoices')} WHERE counterparty_id = k.id AND archived_at IS NULL AND status <> 'canceled'), 0) AS invoiced,
                COALESCE((SELECT SUM(amount) FROM {t('crm_payments')} WHERE counterparty_id = k.id AND archived_at IS NULL), 0) AS received
            FROM {t('crm_counterparties')} k WHERE {' AND '.join(where)} ORDER BY name LIMIT 1000""", args)
        return 200, {'items': cur.fetchall()}
    if method == 'DELETE' and eid:
        cur.execute(f"UPDATE {t('crm_counterparties')} SET archived_at = NOW() WHERE id = %s", (eid,))
        return 200, {'ok': True}
    data = {f: _s(body.get(f), 2000 if f in ('address', 'notes') else 250) for f in CP_FIELDS}
    if not data['name']:
        return 400, {'error': 'Укажите название'}
    if data['kind'] not in CP_KINDS:
        data['kind'] = 'company'
    if method == 'POST':
        cols = ', '.join(data)
        ph = ', '.join(f'%({k})s' for k in data)
        cur.execute(f"INSERT INTO {t('crm_counterparties')} ({cols}) VALUES ({ph}) RETURNING *", data)
    else:
        sets = ', '.join(f'{k} = %({k})s' for k in data)
        cur.execute(f"UPDATE {t('crm_counterparties')} SET {sets}, updated_at = NOW() WHERE id = %(id)s RETURNING *", {**data, 'id': eid})
    item = cur.fetchone()
    return (200, {'item': item}) if item else (404, {'error': 'Не найдено'})


def handle_billing(cur, t, method, params, body, user, eid, resp):
    action = params.get('action', '')
    if action == 'counterparties':
        return resp(*_counterparties(cur, t, method, eid, body, params))
    if action == 'summary' and method == 'GET':
        return resp(200, _summary(cur, t, params))
    if action == 'invoices':
        if method == 'GET' and eid:
            items = _list_invoices(cur, t, {'id': eid})
            item = items[0] if items else None
            if not item:
                return resp(404, {'error': 'Счёт не найден'})
            payer = None
            if item.get('counterparty_id'):
                cur.execute(f"SELECT * FROM {t('crm_counterparties')} WHERE id = %s", (item['counterparty_id'],))
                payer = cur.fetchone()
            elif item.get('partner_id'):
                cur.execute(f"SELECT name, phone, email, contact_person FROM {t('crm_partners')} WHERE id = %s", (item['partner_id'],))
                payer = cur.fetchone()
            elif item.get('client_id'):
                cur.execute(f"SELECT full_name AS name, phone, email FROM {t('crm_clients')} WHERE id = %s", (item['client_id'],))
                payer = cur.fetchone()
            return resp(200, {'item': item, 'payer': payer, 'payments': _list_payments(cur, t, {'invoice_id': eid})})
        if method == 'GET':
            return resp(200, {'items': _list_invoices(cur, t, params)})
        if method == 'PUT' and eid and set(body) == {'status'} and body['status'] in ('canceled', 'issued'):
            cur.execute(f"UPDATE {t('crm_invoices')} SET status = %s, updated_at = NOW() WHERE id = %s AND archived_at IS NULL RETURNING *", (body['status'], eid))
            item = cur.fetchone()
            if not item:
                return resp(404, {'error': 'Счёт не найден'})
            _log(cur, t, item, user, f"Счёт № {item['number']} " + ('отменён' if body['status'] == 'canceled' else 'восстановлен'))
            return resp(200, {'item': item})
        if method in ('POST', 'PUT'):
            return resp(*_save_invoice(cur, t, eid if method == 'PUT' else None, body, user))
        if method == 'DELETE' and eid:
            cur.execute(f"SELECT COUNT(*) AS n FROM {t('crm_payments')} WHERE invoice_id = %s AND archived_at IS NULL", (eid,))
            if cur.fetchone()['n']:
                return resp(400, {'error': 'По счёту есть оплаты — сначала удалите их или отмените счёт'})
            cur.execute(f"UPDATE {t('crm_invoices')} SET archived_at = NOW() WHERE id = %s", (eid,))
            return resp(200, {'ok': True})
    if action == 'payments':
        if method == 'GET':
            return resp(200, {'items': _list_payments(cur, t, params)})
        if method == 'POST':
            return resp(*_save_payment(cur, t, body, user))
        if method == 'DELETE' and eid:
            cur.execute(f"UPDATE {t('crm_payments')} SET archived_at = NOW() WHERE id = %s RETURNING *", (eid,))
            p = cur.fetchone()
            if p:
                _log(cur, t, p, user, f"Удалена оплата {_money(p['amount'])}")
            return resp(200, {'ok': True})
    return resp(404, {'error': 'Неизвестный запрос'})
