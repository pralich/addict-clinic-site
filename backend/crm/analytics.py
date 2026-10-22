from msk import MSK_TODAY_START

ONLINE_SEC = 90
COLS = """v.id, v.visitor_id, v.visit_no, v.started_at, v.last_seen, v.active_seconds, v.current_path, v.current_title, v.landing_url, v.referrer,
    v.channel, v.utm_source, v.utm_medium, v.utm_campaign, v.utm_term, v.device, v.browser, v.pages, v.events, v.searches, v.lead_id,
    EXTRACT(EPOCH FROM (NOW() - v.last_seen))::int AS idle_sec, EXTRACT(EPOCH FROM (v.last_seen - v.started_at))::int AS duration_sec,
    l.name AS lead_name, l.contact AS lead_contact, l.status AS lead_status"""


def handle_analytics(cur, t, params, user, resp):
    if user['role'] not in ('admin', 'manager'):
        return resp(403, {'error': 'Аналитика доступна администратору и менеджеру'})
    join = f"FROM {t('site_visits')} v LEFT JOIN {t('crm_leads')} l ON l.id = v.lead_id AND l.trashed_at IS NULL"
    vid = params.get('visitor')
    if vid:
        cur.execute(f"SELECT {COLS} {join} WHERE v.visitor_id = %s ORDER BY v.started_at DESC LIMIT 30", (vid[:64],))
        return resp(200, {'items': cur.fetchall()})

    period = params.get('period') or 'online'
    if period == 'online':
        where = f"v.last_seen > NOW() - INTERVAL '{ONLINE_SEC} seconds'"
    else:
        hours = {'1h': 1, '24h': 24, '7d': 168}.get(period, 24)
        where = f"v.last_seen > NOW() - INTERVAL '{hours} hours'"
    cur.execute(f"SELECT {COLS} {join} WHERE {where} ORDER BY v.last_seen DESC LIMIT 200")
    items = cur.fetchall()

    cur.execute(f"""SELECT
        COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '{ONLINE_SEC} seconds') AS online,
        COUNT(*) FILTER (WHERE started_at > {MSK_TODAY_START}) AS visits_today,
        COUNT(DISTINCT visitor_id) FILTER (WHERE started_at > {MSK_TODAY_START}) AS visitors_today,
        COUNT(*) FILTER (WHERE started_at > {MSK_TODAY_START} AND lead_id IS NOT NULL) AS with_lead_today,
        COALESCE(ROUND(AVG(active_seconds) FILTER (WHERE started_at > {MSK_TODAY_START})), 0)::int AS avg_seconds_today
        FROM {t('site_visits')} WHERE last_seen > NOW() - INTERVAL '2 days'""")
    stats = cur.fetchone()
    cur.execute(f"""SELECT current_path AS path, MAX(current_title) AS title, COUNT(*) AS c FROM {t('site_visits')}
        WHERE last_seen > NOW() - INTERVAL '{ONLINE_SEC} seconds' GROUP BY current_path ORDER BY c DESC LIMIT 8""")
    top_pages = cur.fetchall()
    cur.execute(f"""SELECT s->>'q' AS q, COUNT(*) AS c FROM {t('site_visits')}, jsonb_array_elements(searches) s
        WHERE last_seen > NOW() - INTERVAL '24 hours' AND COALESCE(s->>'q', '') <> '' GROUP BY 1 ORDER BY c DESC LIMIT 12""")
    top_searches = cur.fetchall()
    return resp(200, {'items': items, 'stats': stats, 'top_pages': top_pages, 'top_searches': top_searches, 'online_sec': ONLINE_SEC})
