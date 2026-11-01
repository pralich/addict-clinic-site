import calendar
import re
from datetime import date, timedelta

MODES = ('full', 'half', 'custom')
DEAL_COLS = 'id, amount, accrual_mode, accrual_plan, check_in_date, closed_at'


def _add_months(d, n):
    m = d.month - 1 + n
    y = d.year + m // 12
    m = m % 12 + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def parse_plan(text):
    parts = [p.replace(',', '.') for p in re.split(r'[\s/;+|]+', str(text or '').strip()) if p]
    try:
        vals = [float(p.rstrip('%')) for p in parts]
    except ValueError:
        return None
    if not vals or len(vals) > 24 or any(v <= 0 for v in vals) or abs(sum(vals) - 100) > 0.5:
        return None
    return vals


def clean_plan(text):
    vals = parse_plan(text)
    return '/'.join(f'{v:g}' for v in vals) if vals else None


def _closed_day(deal):
    c = deal.get('closed_at')
    return (c + timedelta(hours=3)).date() if c else None


def schedule(deal):
    """График начисления выручки по сделке: [(дата, сумма)]"""
    amount = float(deal.get('amount') or 0)
    closed = _closed_day(deal)
    if not amount or not closed:
        return []
    mode = deal.get('accrual_mode') or 'full'
    if mode == 'full':
        return [(closed, round(amount, 2))]
    shares = [50.0, 50.0] if mode == 'half' else parse_plan(deal.get('accrual_plan'))
    if not shares:
        return [(closed, round(amount, 2))]
    start = deal.get('check_in_date') or closed
    out, left = [], round(amount, 2)
    for i, s in enumerate(shares):
        v = left if i == len(shares) - 1 else round(amount * s / 100, 2)
        left = round(left - v, 2)
        out.append((_add_months(start, i), v))
    return out


def in_range(deal, d_from, d_to):
    return round(sum(v for d, v in schedule(deal) if d_from <= d <= d_to), 2)


def won_deals(cur, t, extra_cols=''):
    cur.execute(f"SELECT {DEAL_COLS}{extra_cols} FROM {t('crm_deals')} WHERE stage = 'won' AND archived_at IS NULL AND closed_at IS NOT NULL")
    return cur.fetchall()


def text(deal):
    mode = deal.get('accrual_mode') or 'full'
    if mode == 'half':
        return '50% в первый месяц, 50% во второй'
    if mode == 'custom' and parse_plan(deal.get('accrual_plan')):
        return 'По месяцам: ' + ' / '.join(f'{v:g}%' for v in parse_plan(deal['accrual_plan']))
    return 'Сразу вся сумма'
