import re
from datetime import timedelta

import accrual
from msk import msk, msk_today

PERIODS = ('today', 'yesterday', 'week', 'month')
PROJECTS = ('reba', 'addict')


def _range(period):
    today = msk_today()
    if period == 'yesterday':
        d = today - timedelta(days=1)
        return d, d
    if period == 'week':
        return today - timedelta(days=6), today
    if period == 'month':
        return today.replace(day=1), today
    return today, today


def _lead_project(project_sql, alias):
    return re.sub(r'\be\.', f'{alias}.', project_sql)


def build(cur, t, params, project_sql):
    period = params.get('period') if params.get('period') in PERIODS else 'today'
    project = params.get('project') if params.get('project') in PROJECTS else None
    d_from, d_to = _range(period)
    lp = _lead_project(project_sql, 'l')
    dp = f"COALESCE((SELECT {_lead_project(project_sql, 'dl')} FROM {t('crm_leads')} dl WHERE dl.id = d.lead_id), 'addict')"
    cp = f"COALESCE((SELECT {_lead_project(project_sql, 'cl')} FROM {t('crm_leads')} cl WHERE cl.client_id = c.id ORDER BY cl.id LIMIT 1), 'addict')"
    callp = f"COALESCE((SELECT {_lead_project(project_sql, 'kl')} FROM {t('crm_leads')} kl WHERE kl.id = k.lead_id), 'addict')"
    rng = (d_from, d_to)

    def pf(expr):
        return (f' AND {expr} = %s', (project,)) if project else ('', ())

    res = {'period': period, 'project': project or 'all', 'from': d_from.isoformat(), 'to': d_to.isoformat()}
    lead_where = f"l.archived_at IS NULL AND l.trashed_at IS NULL AND {msk('l.created_at')}::date BETWEEN %s AND %s"
    lw, la = pf(lp)

    cur.execute(f"""SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE l.status = 'new') AS new,
            COUNT(*) FILTER (WHERE l.status = 'converted') AS converted
        FROM {t('crm_leads')} l WHERE {lead_where}{lw}""", rng + la)
    res['leads'] = cur.fetchone()

    dw, da = pf(dp)
    cur.execute(f"""SELECT COUNT(*) AS created, COALESCE(SUM(d.amount), 0) AS created_amount,
            COUNT(*) FILTER (WHERE d.stage = 'won' AND {msk('d.closed_at')}::date BETWEEN %s AND %s) AS won,
            COUNT(*) FILTER (WHERE d.stage = 'lost' AND {msk('d.closed_at')}::date BETWEEN %s AND %s) AS lost
        FROM {t('crm_deals')} d WHERE d.archived_at IS NULL AND ({msk('d.created_at')}::date BETWEEN %s AND %s OR {msk('d.closed_at')}::date BETWEEN %s AND %s){dw}""",
                rng + rng + rng + rng + da)
    deals = cur.fetchone()
    cur.execute(f"""SELECT COUNT(*) AS created, COALESCE(SUM(d.amount), 0) AS amount FROM {t('crm_deals')} d
        WHERE d.archived_at IS NULL AND {msk('d.created_at')}::date BETWEEN %s AND %s{dw}""", rng + da)
    created = cur.fetchone()
    deals['created'], deals['created_amount'] = created['created'], created['amount']
    cur.execute(f"""SELECT COUNT(*) AS open, COALESCE(SUM(d.amount), 0) AS open_amount FROM {t('crm_deals')} d
        WHERE d.archived_at IS NULL AND d.stage NOT IN ('won', 'lost'){dw}""", da)
    deals.update(cur.fetchone())

    cur.execute(f"""SELECT d.{', d.'.join(accrual.DEAL_COLS.split(', '))}, {dp} AS project FROM {t('crm_deals')} d
        WHERE d.stage = 'won' AND d.archived_at IS NULL AND d.closed_at IS NOT NULL""")
    revenue = {'reba': 0.0, 'addict': 0.0}
    for d in cur.fetchall():
        revenue[d['project']] = revenue.get(d['project'], 0.0) + accrual.in_range(d, d_from, d_to)
    deals['revenue'] = round(revenue.get(project, 0.0) if project else sum(revenue.values()), 2)
    res['deals'] = deals

    cw, ca = pf(cp)
    cur.execute(f"""SELECT COUNT(*) FILTER (WHERE {msk('c.created_at')}::date BETWEEN %s AND %s) AS new, COUNT(*) AS total
        FROM {t('crm_clients')} c WHERE c.archived_at IS NULL AND c.trashed_at IS NULL{cw}""", rng + ca)
    res['clients'] = cur.fetchone()

    cur.execute(f"""SELECT d.stage, COUNT(*) AS count, COALESCE(SUM(d.amount), 0) AS amount FROM {t('crm_deals')} d
        WHERE d.archived_at IS NULL AND {msk('d.created_at')}::date BETWEEN %s AND %s{dw} GROUP BY 1""", rng + da)
    res['funnel'] = cur.fetchall()

    if d_from == d_to:
        cur.execute(f"""SELECT lpad(h::text, 2, '0') || ':00' AS day,
                (SELECT COUNT(*) FROM {t('crm_leads')} l WHERE {lead_where} AND EXTRACT(HOUR FROM {msk('l.created_at')}) = h{lw}) AS leads
            FROM generate_series(0, 23) h ORDER BY h""", rng + la)
    else:
        cur.execute(f"""SELECT to_char(g, 'DD.MM') AS day,
                (SELECT COUNT(*) FROM {t('crm_leads')} l WHERE l.archived_at IS NULL AND l.trashed_at IS NULL AND {msk('l.created_at')}::date = g::date{lw}) AS leads
            FROM generate_series(%s::date, %s::date, INTERVAL '1 day') g ORDER BY g""", la + rng)
    res['leadsByDay'] = cur.fetchall()

    cur.execute(f"""SELECT l.id, l.name, l.contact, l.topic, l.status, l.created_at, {lp} AS project_key FROM {t('crm_leads')} l
        WHERE {lead_where}{lw} ORDER BY l.created_at DESC LIMIT 8""", rng + la)
    res['recentLeads'] = cur.fetchall()

    cur.execute(f"""SELECT COALESCE(l.channel, 'unknown') AS channel, COUNT(DISTINCT l.id) AS leads,
            COUNT(DISTINCT d.id) FILTER (WHERE d.stage = 'won') AS won,
            COALESCE(SUM(d.amount) FILTER (WHERE d.stage = 'won'), 0) AS revenue
        FROM {t('crm_leads')} l LEFT JOIN {t('crm_deals')} d ON d.lead_id = l.id AND d.archived_at IS NULL
        WHERE {lead_where}{lw} GROUP BY 1 ORDER BY 2 DESC""", rng + la)
    res['channels'] = cur.fetchall()

    cur.execute(f"""SELECT l.utm_source, l.utm_campaign, COUNT(*) AS leads FROM {t('crm_leads')} l
        WHERE {lead_where} AND l.utm_campaign IS NOT NULL{lw} GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 8""", rng + la)
    res['campaigns'] = cur.fetchall()

    act_proj = ''
    act_args = ()
    if project:
        act_proj = f""" AND ((a.entity_type = 'leads' AND EXISTS (SELECT 1 FROM {t('crm_leads')} l WHERE l.id = a.entity_id AND {lp} = %s))
            OR (a.entity_type = 'deals' AND EXISTS (SELECT 1 FROM {t('crm_deals')} d WHERE d.id = a.entity_id AND {dp} = %s))
            OR (a.entity_type = 'clients' AND EXISTS (SELECT 1 FROM {t('crm_clients')} c WHERE c.id = a.entity_id AND {cp} = %s)))"""
        act_args = (project, project, project)
    cur.execute(f"""SELECT a.id, a.entity_type, a.entity_id, a.kind, a.text, a.created_at, u.name AS user_name FROM {t('crm_activities')} a
        LEFT JOIN {t('crm_users')} u ON u.id = a.user_id
        WHERE a.entity_type <> 'none' AND {msk('a.created_at')}::date BETWEEN %s AND %s{act_proj}
        ORDER BY a.created_at DESC LIMIT 10""", rng + act_args)
    res['activity'] = cur.fetchall()

    kw, ka = pf(callp)
    cur.execute(f"""SELECT
            COUNT(*) FILTER (WHERE k.direction = 'in') AS incoming,
            COUNT(*) FILTER (WHERE k.direction = 'out') AS outgoing,
            COUNT(*) FILTER (WHERE k.status = 'missed') AS missed,
            COUNT(*) FILTER (WHERE k.direction = 'in' AND k.status = 'missed') AS missed_in,
            COUNT(DISTINCT k.lead_id) FILTER (WHERE k.lead_created) AS leads,
            COUNT(DISTINCT k.lead_id) FILTER (WHERE k.lead_created AND k.direction = 'in') AS leads_in,
            COUNT(DISTINCT k.lead_id) FILTER (WHERE k.lead_created AND k.direction = 'out') AS leads_out,
            COUNT(DISTINCT k.lead_id) FILTER (WHERE k.lead_created AND k.status = 'missed') AS leads_missed
        FROM {t('crm_calls')} k WHERE {msk('k.started_at')}::date BETWEEN %s AND %s{kw}""", rng + ka)
    res['calls'] = cur.fetchone()

    cur.execute(f"""SELECT p, (SELECT COUNT(*) FROM {t('crm_leads')} l WHERE {lead_where} AND {lp} = p) AS leads,
            (SELECT COUNT(*) FROM {t('crm_deals')} d WHERE d.archived_at IS NULL AND {msk('d.created_at')}::date BETWEEN %s AND %s AND {dp} = p) AS deals,
            (SELECT COUNT(*) FROM {t('crm_deals')} d WHERE d.archived_at IS NULL AND d.stage = 'won' AND {msk('d.closed_at')}::date BETWEEN %s AND %s AND {dp} = p) AS won,
            (SELECT COUNT(*) FROM {t('crm_clients')} c WHERE c.archived_at IS NULL AND c.trashed_at IS NULL AND {msk('c.created_at')}::date BETWEEN %s AND %s AND {cp} = p) AS clients,
            (SELECT COUNT(*) FROM {t('crm_calls')} k WHERE {msk('k.started_at')}::date BETWEEN %s AND %s AND {callp} = p) AS calls
        FROM unnest(ARRAY['reba', 'addict']) p""", rng * 5)
    res['byProject'] = [{**r, 'revenue': round(revenue.get(r['p'], 0.0), 2)} for r in cur.fetchall()]
    return res
