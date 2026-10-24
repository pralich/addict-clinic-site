TRASH_DAYS = 30
TABLES = {'leads': 'crm_leads', 'clients': 'crm_clients', 'deals': 'crm_deals'}


def _ids(body):
    out = []
    for x in (body.get('ids') or [])[:500]:
        if str(x).isdigit():
            out.append(int(x))
    return out


def _drop_activities(cur, t, entity, ids):
    cur.execute(f"SELECT id FROM {t('crm_activities')} WHERE entity_type = %s AND entity_id = ANY(%s)", (entity, ids))
    act_ids = [r['id'] for r in cur.fetchall()]
    if act_ids:
        cur.execute(f"DELETE FROM {t('crm_task_comments')} WHERE task_id = ANY(%s)", (act_ids,))
        cur.execute(f"DELETE FROM {t('crm_task_members')} WHERE task_id = ANY(%s)", (act_ids,))
        cur.execute(f"DELETE FROM {t('crm_activities')} WHERE id = ANY(%s)", (act_ids,))


def destroy(cur, t, entity, ids):
    if not ids:
        return 0
    if entity == 'leads':
        cur.execute(f"UPDATE {t('crm_calls')} SET lead_id = NULL WHERE lead_id = ANY(%s)", (ids,))
        cur.execute(f"UPDATE {t('crm_deals')} SET lead_id = NULL WHERE lead_id = ANY(%s)", (ids,))
        cur.execute(f"UPDATE {t('crm_live_calls')} SET lead_id = NULL WHERE lead_id = ANY(%s)", (ids,))
    elif entity == 'deals':
        for tbl in ('crm_invoices', 'crm_payments', 'crm_fin_ops', 'partner_patients'):
            cur.execute(f"UPDATE {t(tbl)} SET deal_id = NULL WHERE deal_id = ANY(%s)", (ids,))
    else:
        for tbl in ('crm_calls', 'crm_deals', 'crm_invoices', 'crm_payments', 'crm_leads', 'crm_live_calls'):
            cur.execute(f"UPDATE {t(tbl)} SET client_id = NULL WHERE client_id = ANY(%s)", (ids,))
    _drop_activities(cur, t, entity, ids)
    cur.execute(f"DELETE FROM {t(TABLES[entity])} WHERE id = ANY(%s) AND trashed_at IS NOT NULL", (ids,))
    return cur.rowcount


def purge_expired(cur, t):
    total = 0
    for entity, tbl in TABLES.items():
        cur.execute(f"SELECT id FROM {t(tbl)} WHERE trashed_at IS NOT NULL AND trashed_at < NOW() - INTERVAL '{TRASH_DAYS} days' LIMIT 200")
        ids = [r['id'] for r in cur.fetchall()]
        total += destroy(cur, t, entity, ids)
    return total


def trash_list(cur, t, entity):
    purge_expired(cur, t)
    title = {'leads': 'COALESCE(e.name, e.contact)', 'clients': 'e.full_name', 'deals': 'e.title'}[entity]
    sub = {'leads': 'e.contact', 'clients': "COALESCE(e.phone, e.email)", 'deals': "NULLIF(e.amount, 0)::text"}[entity]
    status = 'e.stage' if entity == 'deals' else 'e.status'
    cur.execute(f"""SELECT e.id, {title} AS title, {sub} AS subtitle, {status} AS status, e.trashed_at, u.name AS trashed_by_name,
            GREATEST(0, {TRASH_DAYS} - EXTRACT(DAY FROM NOW() - e.trashed_at))::int AS days_left
        FROM {t(TABLES[entity])} e LEFT JOIN {t('crm_users')} u ON u.id = e.trashed_by
        WHERE e.trashed_at IS NOT NULL ORDER BY e.trashed_at DESC LIMIT 1000""")
    return cur.fetchall()


def handle_trash(cur, t, entity, action, method, body, user, resp, log_activity):
    if user.get('role') == 'leads_only':
        return resp(403, {'error': 'Нет прав на удаление'})
    if method == 'GET':
        return resp(200, {'items': trash_list(cur, t, entity), 'days': TRASH_DAYS})
    ids = _ids(body)
    if not ids:
        return resp(400, {'error': 'Не выбраны записи'})
    tbl = t(TABLES[entity])
    if action == 'trash':
        cur.execute(f"""UPDATE {tbl} SET trashed_at = NOW(), trashed_by = %s, archived_at = COALESCE(archived_at, NOW()), updated_at = NOW()
            WHERE id = ANY(%s) AND trashed_at IS NULL RETURNING id""", (user['id'], ids))
        done = [r['id'] for r in cur.fetchall()]
        for i in done:
            log_activity(cur, entity, i, user['id'], 'Перемещено в корзину')
        return resp(200, {'ok': True, 'count': len(done)})
    if action == 'untrash':
        cur.execute(f"""UPDATE {tbl} SET archived_at = CASE WHEN archived_at >= trashed_at THEN NULL ELSE archived_at END,
            trashed_at = NULL, trashed_by = NULL, updated_at = NOW() WHERE id = ANY(%s) AND trashed_at IS NOT NULL RETURNING id""", (ids,))
        done = [r['id'] for r in cur.fetchall()]
        for i in done:
            log_activity(cur, entity, i, user['id'], 'Восстановлено из корзины')
        return resp(200, {'ok': True, 'count': len(done)})
    if action == 'destroy':
        if user.get('role') != 'admin':
            return resp(403, {'error': 'Удалить навсегда может только администратор'})
        return resp(200, {'ok': True, 'count': destroy(cur, t, entity, ids)})
    return resp(400, {'error': 'Неверный запрос'})
