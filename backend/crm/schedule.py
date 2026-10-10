import calendar
from datetime import date, timedelta

STEP_DAYS = {'weekly': 7, 'biweekly': 14}
MAX_PERIODS = 60


def _add_months(d, n):
    m = d.month - 1 + n
    y = d.year + m // 12
    m = m % 12 + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def _checkout(deal):
    if deal.get('check_out_date'):
        return deal['check_out_date']
    tm = deal.get('treatment_months')
    if deal.get('check_in_date') and tm:
        tm = float(tm)
        return _add_months(deal['check_in_date'], int(tm)) + timedelta(days=round((tm - int(tm)) * 30))
    return None


def payment_dates(deal):
    start = deal.get('check_in_date')
    if not start:
        return []
    sched = deal.get('payment_schedule') or 'monthly'
    end = _checkout(deal)
    if sched == 'once' or not end:
        return [start]
    out, k = [], 0
    while k < MAX_PERIODS:
        d = _add_months(start, k) if sched == 'monthly' else start + timedelta(days=STEP_DAYS[sched] * k)
        if d >= end and out:
            break
        out.append(d)
        k += 1
    return out


def payment_plan(deal, invoiced, loose=0.0):
    dates = payment_dates(deal)
    if not dates:
        return {'next_payment_date': None, 'next_payment_amount': None, 'payment_index': None, 'payments_total': 0, 'payments_invoiced': 0}
    per = deal.get('payment_amount')
    per = float(per) if per else (round(float(deal.get('amount') or 0) / len(dates), 2) or None)
    done = {d for d in invoiced if d}
    left = [(i, d) for i, d in enumerate(dates) if d not in done]
    if per and loose > 0:
        left = left[int(loose / per + 0.001):]
    if not left:
        return {'next_payment_date': None, 'next_payment_amount': None, 'payment_index': None, 'payments_total': len(dates), 'payments_invoiced': len(dates)}
    i, d = left[0]
    return {'next_payment_date': d, 'next_payment_amount': per, 'payment_index': i + 1, 'payments_total': len(dates), 'payments_invoiced': len(dates) - len(left)}


def attach_plans(cur, t, deals, key='id'):
    ids = [d[key] for d in deals if d.get(key)]
    periods, loose = {}, {}
    if ids:
        cur.execute(f"SELECT deal_id, period_date, amount FROM {t('crm_invoices')} WHERE deal_id = ANY(%s) AND archived_at IS NULL AND status <> 'canceled'", (ids,))
        for r in cur.fetchall():
            if r['period_date']:
                periods.setdefault(r['deal_id'], set()).add(r['period_date'])
            else:
                loose[r['deal_id']] = loose.get(r['deal_id'], 0.0) + float(r['amount'] or 0)
    for d in deals:
        d.update(payment_plan(d, periods.get(d.get(key), set()), loose.get(d.get(key), 0.0)))
    return deals
