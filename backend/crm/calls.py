import re


def handle_calls(cur, t, params, resp):
    where = ['1=1']
    args = []
    direction = params.get('direction')
    if direction in ('in', 'out'):
        where.append('c.direction = %s')
        args.append(direction)
    if params.get('missed') == '1':
        where.append("c.status = 'missed'")
    if params.get('new_leads') == '1':
        where.append('c.lead_created')
    if params.get('with_record') == '1':
        where.append('c.record_url IS NOT NULL')
    digits = re.sub(r'\D', '', params.get('q') or '')
    if digits:
        where.append('c.phone_digits LIKE %s')
        args.append(f'%{digits[-10:]}%')
    try:
        page = max(1, int(params.get('page') or 1))
    except ValueError:
        page = 1
    per = 50
    w = ' AND '.join(where)
    cur.execute(f"""SELECT c.id, c.direction, c.status, c.phone, c.pbx_user, c.ext, c.group_name, c.telnum, c.started_at, c.duration, c.wait,
            c.record_url, c.lead_id, c.client_id, c.lead_created, l.name AS lead_name, cl.full_name AS client_name
        FROM {t('crm_calls')} c
        LEFT JOIN {t('crm_leads')} l ON l.id = c.lead_id
        LEFT JOIN {t('crm_clients')} cl ON cl.id = c.client_id
        WHERE {w} ORDER BY c.started_at DESC NULLS LAST, c.id DESC LIMIT {per + 1} OFFSET {(page - 1) * per}""", args)
    rows = cur.fetchall()
    cur.execute(f"""SELECT
            COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '1 day') AS today,
            COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '1 day' AND direction = 'in') AS today_in,
            COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '1 day' AND status = 'missed') AS today_missed,
            COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '7 days' AND lead_created) AS week_leads
        FROM {t('crm_calls')}""")
    stats = cur.fetchone()
    return resp(200, {'items': rows[:per], 'has_more': len(rows) > per, 'page': page, 'stats': stats})
