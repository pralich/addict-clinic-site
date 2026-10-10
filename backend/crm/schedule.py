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


def commission(deal):
    v = float(deal.get('commission_value') or 0)
    if not v or deal.get('commission_type') not in ('percent', 'fixed'):
        return 0.0
    return round(float(deal.get('amount') or 0) * v / 100) if deal['commission_type'] == 'percent' else round(v, 2)


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


def payment_plan(deal, paid_commission=0.0):
    dates = payment_dates(deal)
    empty = {'next_payment_date': None, 'next_payment_amount': None, 'payment_index': None, 'payments_total': len(dates), 'payments_paid': 0, 'commission_paid': round(paid_commission, 2)}
    if not dates:
        return empty
    per = commission(deal) or None
    done = min(len(dates), int(paid_commission / per + 0.001)) if per else 0
    rest = round(paid_commission - done * per, 2) if per else 0
    empty['payments_paid'] = done
    if done >= len(dates):
        return empty
    return {**empty, 'next_payment_date': dates[done], 'next_payment_amount': round(per - rest, 2) if per else None, 'payment_index': done + 1}


def attach_plans(cur, t, deals, key='id'):
    ids = [d[key] for d in deals if d.get(key)]
    paid = {}
    if ids:
        cur.execute(f"SELECT deal_id, SUM(amount) AS s FROM {t('crm_payments')} WHERE deal_id = ANY(%s) AND archived_at IS NULL AND purpose = 'commission' GROUP BY deal_id", (ids,))
        paid = {r['deal_id']: float(r['s'] or 0) for r in cur.fetchall()}
    for d in deals:
        d.update(payment_plan(d, paid.get(d.get(key), 0.0)))
    return deals
