from datetime import datetime

ENTITY_TITLE = {
    'leads': ('crm_leads', 'name'),
    'deals': ('crm_deals', 'title'),
    'clients': ('crm_clients', 'full_name'),
    'partners': ('crm_partners', 'name'),
}
PRIORITIES = ('low', 'normal', 'high')
NONE = 'none'


def _dt(v):
    if not v:
        return None
    try:
        return datetime.fromisoformat(str(v).replace('Z', '+00:00')).replace(tzinfo=None)
    except ValueError:
        return None


def _clean(v, n=None):
    v = str(v or '').strip()
    return (v[:n] if n else v) or None


def _title_sql(t):
    parts = [f"WHEN a.entity_type = '{k}' THEN (SELECT {col} FROM {t(tbl)} WHERE id = a.entity_id)" for k, (tbl, col) in ENTITY_TITLE.items()]
    return f"CASE {' '.join(parts)} END"


def list_tasks(cur, t, params, user):
    where, args = ["a.kind = 'task'"], []
    scope = params.get('scope') or 'mine'
    if scope == 'mine':
        where.append('a.assignee_id = %s')
        args.append(user['id'])
    elif scope == 'created':
        where.append('a.user_id = %s AND (a.assignee_id IS NULL OR a.assignee_id <> %s)')
        args += [user['id'], user['id']]
    if str(params.get('assignee_id') or '').isdigit():
        where.append('a.assignee_id = %s')
        args.append(int(params['assignee_id']))
    status = params.get('status') or 'open'
    if status == 'open':
        where.append('a.done_at IS NULL')
    elif status == 'done':
        where.append('a.done_at IS NOT NULL')
    if params.get('entity_type') in ENTITY_TITLE and str(params.get('entity_id') or '').isdigit():
        where.append('a.entity_type = %s AND a.entity_id = %s')
        args += [params['entity_type'], int(params['entity_id'])]
    elif params.get('entity_type') == NONE:
        where.append("a.entity_type = %s")
        args.append(NONE)
    if params.get('search'):
        where.append('(a.text ILIKE %s OR a.details ILIKE %s)')
        args += [f"%{params['search']}%"] * 2
    order = 'a.done_at DESC' if status == 'done' else "a.due_at ASC NULLS LAST, CASE a.priority WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, a.id DESC"
    cur.execute(f"""SELECT a.id, a.entity_type, a.entity_id, a.text, a.details, a.priority, a.due_at, a.done_at, a.created_at,
            a.user_id, u.name AS author_name, a.assignee_id, s.name AS assignee_name,
            {_title_sql(t)} AS entity_title
        FROM {t('crm_activities')} a
        LEFT JOIN {t('crm_users')} u ON u.id = a.user_id
        LEFT JOIN {t('crm_users')} s ON s.id = a.assignee_id
        WHERE {' AND '.join(where)} ORDER BY {order} LIMIT 500""", args)
    items = cur.fetchall()
    for i in items:
        if i['entity_type'] == NONE:
            i['entity_type'], i['entity_id'] = None, None
    cur.execute(f"""SELECT
        COUNT(*) FILTER (WHERE assignee_id = %s AND done_at IS NULL) AS mine,
        COUNT(*) FILTER (WHERE assignee_id = %s AND done_at IS NULL AND due_at < NOW()) AS overdue,
        COUNT(*) FILTER (WHERE assignee_id = %s AND done_at IS NULL AND due_at::date = CURRENT_DATE) AS today
        FROM {t('crm_activities')} WHERE kind = 'task'""", (user['id'],) * 3)
    return {'items': items, 'counts': cur.fetchone()}


def _payload(body, user, partial=False):
    data = {}
    if not partial or 'text' in body:
        text = _clean(body.get('text'), 500)
        if not text:
            return None, 'Опишите задачу'
        data['text'] = text
    if not partial or 'details' in body:
        data['details'] = _clean(body.get('details'), 5000)
    if not partial or 'due_at' in body:
        data['due_at'] = _dt(body.get('due_at'))
    if not partial or 'priority' in body:
        data['priority'] = body.get('priority') if body.get('priority') in PRIORITIES else 'normal'
    if not partial or 'assignee_id' in body:
        data['assignee_id'] = int(body['assignee_id']) if str(body.get('assignee_id') or '').isdigit() else user['id']
    if not partial or 'entity_type' in body:
        et = body.get('entity_type')
        eid = body.get('entity_id')
        if et in ENTITY_TITLE and str(eid or '').isdigit():
            data['entity_type'], data['entity_id'] = et, int(eid)
        else:
            data['entity_type'], data['entity_id'] = NONE, 0
    return data, None


def save_task(cur, t, eid, body, user):
    if eid:
        cur.execute(f"SELECT * FROM {t('crm_activities')} WHERE id = %s AND kind = 'task'", (eid,))
        old = cur.fetchone()
        if not old:
            return 404, {'error': 'Задача не найдена'}
        sets, args = [], []
        if 'done' in body:
            sets.append('done_at = ' + ('NOW()' if body['done'] else 'NULL'))
        data, err = _payload({k: v for k, v in body.items() if k != 'done'}, user, partial=True)
        if err:
            return 400, {'error': err}
        for k, v in data.items():
            sets.append(f'{k} = %s')
            args.append(v)
        if not sets:
            return 400, {'error': 'Нет данных'}
        cur.execute(f"UPDATE {t('crm_activities')} SET {', '.join(sets)}, updated_at = NOW() WHERE id = %s RETURNING id", args + [eid])
        return 200, {'ok': True}
    data, err = _payload(body, user)
    if err:
        return 400, {'error': err}
    cols = ', '.join(data)
    ph = ', '.join(['%s'] * len(data))
    cur.execute(f"INSERT INTO {t('crm_activities')} (kind, user_id, {cols}) VALUES ('task', %s, {ph}) RETURNING id", [user['id'], *data.values()])
    return 200, {'ok': True, 'id': cur.fetchone()['id']}


def delete_task(cur, t, eid, user):
    cur.execute(f"SELECT user_id FROM {t('crm_activities')} WHERE id = %s AND kind = 'task'", (eid,))
    row = cur.fetchone()
    if not row:
        return 404, {'error': 'Задача не найдена'}
    if row['user_id'] != user['id'] and user['role'] != 'admin':
        return 403, {'error': 'Удалить может только автор задачи или администратор'}
    cur.execute(f"DELETE FROM {t('crm_activities')} WHERE id = %s", (eid,))
    return 200, {'ok': True}


def handle_tasks(cur, t, method, params, body, user, eid, resp):
    if method == 'GET':
        return resp(200, list_tasks(cur, t, params, user))
    if method == 'POST':
        return resp(*save_task(cur, t, None, body, user))
    if method == 'PUT' and eid:
        return resp(*save_task(cur, t, eid, body, user))
    if method == 'DELETE' and eid:
        return resp(*delete_task(cur, t, eid, user))
    return resp(400, {'error': 'Неверный запрос'})
