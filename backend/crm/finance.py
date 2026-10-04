from datetime import date

INCOME_CATS = ('services', 'partner_fee', 'grants', 'shop', 'other_income')
EXPENSE_CATS = ('salary', 'rent', 'marketing', 'commission', 'taxes', 'software', 'telecom', 'bank', 'office', 'other_expense')


def _period(params):
    today = date.today()
    d_from = params.get('from') or today.replace(day=1).isoformat()
    d_to = params.get('to') or today.isoformat()
    return d_from, d_to


def _deals(cur, t, params):
    d_from, d_to = _period(params)
    cur.execute(f"""SELECT d.id, d.title, d.program, d.amount, d.closed_at, d.stage,
            c.full_name AS client_name, u.name AS manager_name, p.name AS partner_name, COALESCE(p.commission_percent, 0) AS commission_percent,
            ROUND(d.amount * COALESCE(p.commission_percent, 0) / 100, 2) AS commission
        FROM {t('crm_deals')} d
        LEFT JOIN {t('crm_clients')} c ON c.id = d.client_id
        LEFT JOIN {t('crm_users')} u ON u.id = d.manager_id
        LEFT JOIN {t('crm_partners')} p ON p.id = d.partner_id
        WHERE d.stage = 'won' AND d.archived_at IS NULL AND d.closed_at::date BETWEEN %s AND %s
        ORDER BY d.closed_at DESC""", (d_from, d_to))
    items = cur.fetchall()
    cur.execute(f"""SELECT COALESCE(SUM(amount), 0) AS amount, COUNT(*) AS count FROM {t('crm_deals')}
        WHERE stage NOT IN ('won', 'lost') AND archived_at IS NULL""")
    pipeline = cur.fetchone()
    total = sum(float(i['amount']) for i in items)
    commission = sum(float(i['commission']) for i in items)
    return {'items': items, 'summary': {'revenue': total, 'count': len(items), 'avg': total / len(items) if items else 0,
                                        'commission': commission, 'pipeline': pipeline['amount'], 'pipeline_count': pipeline['count']}}


def _ops(cur, t, params):
    d_from, d_to = _period(params)
    where, args = ['o.archived_at IS NULL', 'o.op_date BETWEEN %s AND %s'], [d_from, d_to]
    if params.get('kind') in ('income', 'expense'):
        where.append('o.kind = %s')
        args.append(params['kind'])
    if params.get('category'):
        where.append('o.category = %s')
        args.append(params['category'])
    cur.execute(f"""SELECT o.*, u.name AS created_by_name, d.title AS deal_title FROM {t('crm_fin_ops')} o
        LEFT JOIN {t('crm_users')} u ON u.id = o.created_by LEFT JOIN {t('crm_deals')} d ON d.id = o.deal_id
        WHERE {' AND '.join(where)} ORDER BY o.op_date DESC, o.id DESC LIMIT 1000""", args)
    items = cur.fetchall()
    inc = sum(float(i['amount']) for i in items if i['kind'] == 'income')
    exp = sum(float(i['amount']) for i in items if i['kind'] == 'expense')
    by_cat = {}
    for i in items:
        k = (i['kind'], i['category'])
        by_cat[k] = by_cat.get(k, 0) + float(i['amount'])
    return {'items': items, 'summary': {'income': inc, 'expense': exp, 'net': inc - exp},
            'by_category': [{'kind': k[0], 'category': k[1], 'amount': v} for k, v in sorted(by_cat.items(), key=lambda x: -x[1])]}


def _validate(body):
    kind = body.get('kind')
    cats = INCOME_CATS if kind == 'income' else EXPENSE_CATS if kind == 'expense' else None
    if not cats:
        return None, 'Укажите тип операции'
    if body.get('category') not in cats:
        return None, 'Выберите категорию'
    try:
        amount = round(float(body.get('amount')), 2)
    except (TypeError, ValueError):
        return None, 'Укажите сумму'
    if amount <= 0 or amount > 1e11:
        return None, 'Сумма должна быть больше нуля'
    try:
        op_date = date.fromisoformat(str(body.get('op_date') or date.today().isoformat())[:10])
    except ValueError:
        return None, 'Некорректная дата'
    deal_id = int(body['deal_id']) if str(body.get('deal_id') or '').isdigit() else None
    desc = (str(body.get('description') or '').strip() or None)
    cp = (str(body.get('counterparty') or '').strip()[:200] or None)
    return {'kind': kind, 'category': body['category'], 'amount': amount, 'op_date': op_date, 'description': desc, 'counterparty': cp, 'deal_id': deal_id}, None


def _cashflow(cur, t, params):
    year = int(params.get('year') or date.today().year)
    opening_to = f'{year}-01-01'
    months = [{'month': m, 'deals': 0.0, 'shop': 0.0, 'family': 0.0, 'income_manual': 0.0, 'expense': 0.0} for m in range(1, 13)]
    cats = {}

    cur.execute(f"""SELECT EXTRACT(MONTH FROM closed_at)::int AS m, SUM(amount) AS s FROM {t('crm_deals')}
        WHERE stage = 'won' AND archived_at IS NULL AND EXTRACT(YEAR FROM closed_at) = %s GROUP BY 1""", (year,))
    for r in cur.fetchall():
        months[r['m'] - 1]['deals'] = float(r['s'])
    cur.execute(f"""SELECT EXTRACT(MONTH FROM COALESCE(paid_at, created_at))::int AS m, CASE WHEN source = 'shop' THEN 'shop' ELSE 'family' END AS src, SUM(amount) AS s
        FROM {t('orders')} WHERE status = 'paid' AND EXTRACT(YEAR FROM COALESCE(paid_at, created_at)) = %s GROUP BY 1, 2""", (year,))
    for r in cur.fetchall():
        months[r['m'] - 1][r['src']] += float(r['s'])
    cur.execute(f"""SELECT EXTRACT(MONTH FROM op_date)::int AS m, kind, category, SUM(amount) AS s FROM {t('crm_fin_ops')}
        WHERE archived_at IS NULL AND EXTRACT(YEAR FROM op_date) = %s GROUP BY 1, 2, 3""", (year,))
    for r in cur.fetchall():
        key = 'income_manual' if r['kind'] == 'income' else 'expense'
        months[r['m'] - 1][key] += float(r['s'])
        c = cats.setdefault((r['kind'], r['category']), [0.0] * 12)
        c[r['m'] - 1] += float(r['s'])

    cur.execute(f"""SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM {t('crm_deals')} WHERE stage = 'won' AND archived_at IS NULL AND closed_at < %s)
      + (SELECT COALESCE(SUM(amount), 0) FROM {t('orders')} WHERE status = 'paid' AND COALESCE(paid_at, created_at) < %s)
      + (SELECT COALESCE(SUM(CASE WHEN kind = 'income' THEN amount ELSE -amount END), 0) FROM {t('crm_fin_ops')} WHERE archived_at IS NULL AND op_date < %s) AS v""",
                (opening_to, opening_to, opening_to))
    balance = float(cur.fetchone()['v'])
    opening = balance
    for m in months:
        m['inflow'] = m['deals'] + m['shop'] + m['family'] + m['income_manual']
        m['net'] = m['inflow'] - m['expense']
        m['opening'] = balance
        balance += m['net']
        m['closing'] = balance

    cur.execute(f"""SELECT DISTINCT y FROM (
        SELECT EXTRACT(YEAR FROM closed_at)::int AS y FROM {t('crm_deals')} WHERE stage = 'won' AND closed_at IS NOT NULL
        UNION SELECT EXTRACT(YEAR FROM op_date)::int FROM {t('crm_fin_ops')} WHERE archived_at IS NULL
        UNION SELECT EXTRACT(YEAR FROM COALESCE(paid_at, created_at))::int FROM {t('orders')} WHERE status = 'paid') x ORDER BY y DESC""")
    years = sorted({r['y'] for r in cur.fetchall()} | {date.today().year}, reverse=True)
    return {'year': year, 'years': years, 'opening': opening, 'closing': balance, 'months': months,
            'categories': [{'kind': k[0], 'category': k[1], 'months': v, 'total': sum(v)} for k, v in sorted(cats.items(), key=lambda x: (x[0][0] != 'income', -sum(x[1])))]}


def handle_finance(cur, t, method, params, body, user, eid, resp):
    if user['role'] != 'admin':
        return resp(403, {'error': 'Раздел «Финансы» доступен только администратору'})
    action = params.get('action', '')
    if action == 'deals' and method == 'GET':
        return resp(200, _deals(cur, t, params))
    if action == 'cashflow' and method == 'GET':
        return resp(200, _cashflow(cur, t, params))
    if action == 'ops':
        if method == 'GET':
            return resp(200, _ops(cur, t, params))
        if method in ('POST', 'PUT'):
            data, err = _validate(body)
            if err:
                return resp(400, {'error': err})
            if method == 'POST':
                cur.execute(f"""INSERT INTO {t('crm_fin_ops')} (kind, category, amount, op_date, description, counterparty, deal_id, created_by)
                    VALUES (%(kind)s, %(category)s, %(amount)s, %(op_date)s, %(description)s, %(counterparty)s, %(deal_id)s, %(uid)s) RETURNING *""", {**data, 'uid': user['id']})
            else:
                if not eid:
                    return resp(400, {'error': 'Не указана операция'})
                cur.execute(f"""UPDATE {t('crm_fin_ops')} SET kind = %(kind)s, category = %(category)s, amount = %(amount)s, op_date = %(op_date)s,
                    description = %(description)s, counterparty = %(counterparty)s, deal_id = %(deal_id)s, updated_at = NOW()
                    WHERE id = %(id)s AND archived_at IS NULL RETURNING *""", {**data, 'id': eid})
            item = cur.fetchone()
            return resp(200, {'item': item}) if item else resp(404, {'error': 'Не найдено'})
        if method == 'DELETE' and eid:
            cur.execute(f"UPDATE {t('crm_fin_ops')} SET archived_at = NOW() WHERE id = %s", (eid,))
            return resp(200, {'ok': True})
    return resp(404, {'error': 'Неизвестный запрос'})
