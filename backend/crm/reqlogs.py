import re


def handle_request_logs(cur, t, params, user, eid, resp):
    if user['role'] != 'admin':
        return resp(403, {'error': 'Журнал запросов доступен только администратору'})
    if eid:
        cur.execute(f"""SELECT l.*, k.name AS api_key_name, u.name AS user_name FROM {t('crm_integration_log')} l
            LEFT JOIN {t('crm_api_keys')} k ON k.id = l.api_key_id LEFT JOIN {t('crm_users')} u ON u.id = l.user_id WHERE l.id = %s""", (eid,))
        row = cur.fetchone()
        return resp(200, {'item': row}) if row else resp(404, {'error': 'Запись не найдена'})

    cur.execute(f"DELETE FROM {t('crm_integration_log')} WHERE created_at < NOW() - INTERVAL '3 days'")
    where, args = ["l.created_at > NOW() - INTERVAL '3 days'"], []
    hours = {'1h': 1, '6h': 6, '24h': 24}.get(params.get('period') or '')
    if hours:
        where.append(f"l.created_at > NOW() - INTERVAL '{hours} hours'")
    if params.get('source') in ('api', 'site', 'telephony', 'vidzhitum'):
        where.append('l.source = %s')
        args.append(params['source'])
    st = params.get('status')
    if st == 'ok':
        where.append('l.status_code BETWEEN 200 AND 399')
    elif st == 'error':
        where.append('(l.status_code >= 400 OR l.status_code = 0 OR l.error IS NOT NULL)')
    if params.get('direction') in ('in', 'out'):
        where.append('l.direction = %s')
        args.append(params['direction'])
    search = (params.get('q') or '').strip()
    if search:
        where.append('(l.action ILIKE %s OR l.request ILIKE %s OR l.ip ILIKE %s)')
        args += [f'%{search}%'] * 3
    try:
        page = max(1, int(params.get('page') or 1))
    except ValueError:
        page = 1
    try:
        per = int(params.get('per') or 50)
    except ValueError:
        per = 50
    per = per if per in (20, 50, 100, 200) else 50
    w = ' AND '.join(where)
    cur.execute(f"SELECT COUNT(*) AS c FROM {t('crm_integration_log')} l WHERE {w}", args)
    total = cur.fetchone()['c']
    cur.execute(f"""SELECT l.id, l.source, l.direction, l.method, l.action, l.status_code, l.duration_ms, l.ip, l.error, l.created_at,
            k.name AS api_key_name, u.name AS user_name, LEFT(l.request, 200) AS preview
        FROM {t('crm_integration_log')} l
        LEFT JOIN {t('crm_api_keys')} k ON k.id = l.api_key_id LEFT JOIN {t('crm_users')} u ON u.id = l.user_id
        WHERE {w} ORDER BY l.id DESC LIMIT {per + 1} OFFSET {(page - 1) * per}""", args)
    rows = cur.fetchall()
    cur.execute(f"""SELECT source,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE status_code >= 400 OR status_code = 0 OR error IS NOT NULL) AS errors,
            MAX(created_at) AS last_at
        FROM {t('crm_integration_log')} WHERE created_at > NOW() - INTERVAL '1 day' GROUP BY source""")
    stats = {r['source']: r for r in cur.fetchall()}
    return resp(200, {'items': rows[:per], 'has_more': len(rows) > per, 'page': page, 'per': per, 'total': total, 'stats': stats})
