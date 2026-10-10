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
        where.append(f'(a.assignee_id = %s OR EXISTS (SELECT 1 FROM {t("crm_task_members")} m WHERE m.task_id = a.id AND m.user_id = %s))')
        args += [user['id'], user['id']]
    elif scope == 'created':
        where.append('a.user_id = %s AND (a.assignee_id IS NULL OR a.assignee_id <> %s)')
        args += [user['id'], user['id']]
    if str(params.get('assignee_id') or '').isdigit():
        where.append(f'(a.assignee_id = %s OR EXISTS (SELECT 1 FROM {t("crm_task_members")} m WHERE m.task_id = a.id AND m.user_id = %s))')
        args += [int(params['assignee_id'])] * 2
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
            a.user_id, u.name AS author_name, a.assignee_id, s.name AS assignee_name, a.result_text,
            (SELECT COUNT(*) FROM {t('crm_task_comments')} c WHERE c.task_id = a.id) AS comments_count,
            (SELECT COALESCE(json_agg(json_build_object('id', mu.id, 'name', mu.name) ORDER BY mu.name), '[]'::json) FROM {t('crm_task_members')} m JOIN {t('crm_users')} mu ON mu.id = m.user_id WHERE m.task_id = a.id) AS members,
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
        COUNT(*) AS mine,
        COUNT(*) FILTER (WHERE due_at < NOW()) AS overdue,
        COUNT(*) FILTER (WHERE due_at::date = CURRENT_DATE) AS today
        FROM {t('crm_activities')} a WHERE kind = 'task' AND done_at IS NULL
          AND (assignee_id = %s OR EXISTS (SELECT 1 FROM {t('crm_task_members')} m WHERE m.task_id = a.id AND m.user_id = %s))""", (user['id'],) * 2)
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
    if 'result_text' in body:
        data['result_text'] = _clean(body.get('result_text'), 5000)
    if not partial or 'entity_type' in body:
        et = body.get('entity_type')
        eid = body.get('entity_id')
        if et in ENTITY_TITLE and str(eid or '').isdigit():
            data['entity_type'], data['entity_id'] = et, int(eid)
        else:
            data['entity_type'], data['entity_id'] = NONE, 0
    return data, None


def _set_members(cur, t, task_id, body, assignee_id):
    if 'member_ids' not in body:
        return
    ids = {int(x) for x in (body.get('member_ids') or []) if str(x).isdigit()} - {assignee_id}
    cur.execute(f"DELETE FROM {t('crm_task_members')} WHERE task_id = %s AND NOT (user_id = ANY(%s))", (task_id, list(ids) or [0]))
    for uid in ids:
        cur.execute(f"INSERT INTO {t('crm_task_members')} (task_id, user_id) VALUES (%s, %s) ON CONFLICT DO NOTHING", (task_id, uid))


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
        if 'due_at' in data and data['due_at'] != old['due_at']:
            sets.append('due_notified_at = NULL')
        if not sets and 'member_ids' not in body:
            return 400, {'error': 'Нет данных'}
        if not sets:
            sets.append('updated_at = NOW()')
        cur.execute(f"UPDATE {t('crm_activities')} SET {', '.join(sets)}, updated_at = NOW() WHERE id = %s RETURNING assignee_id", args + [eid])
        _set_members(cur, t, eid, body, cur.fetchone()['assignee_id'])
        if body.get('done') and not old['done_at'] and old['user_id'] and old['user_id'] != user['id']:
            cur.execute(f"INSERT INTO {t('crm_task_comments')} (task_id, user_id, text) VALUES (%s, %s, %s)",
                        (eid, user['id'], '✓ Задача выполнена' + (f": {data['result_text']}" if data.get('result_text') else '')))
        return 200, {'ok': True, 'ping': True}
    data, err = _payload(body, user)
    if err:
        return 400, {'error': err}
    cols = ', '.join(data)
    ph = ', '.join(['%s'] * len(data))
    cur.execute(f"INSERT INTO {t('crm_activities')} (kind, user_id, {cols}) VALUES ('task', %s, {ph}) RETURNING id", [user['id'], *data.values()])
    new_id = cur.fetchone()['id']
    _set_members(cur, t, new_id, body, data['assignee_id'])
    cur.execute(f"UPDATE {t('crm_task_members')} SET notified = TRUE WHERE task_id = %s AND user_id = %s", (new_id, user['id']))
    return 200, {'ok': True, 'id': new_id, 'ping': True}


def get_task(cur, t, eid):
    cur.execute(f"""SELECT a.id, a.entity_type, a.entity_id, a.text, a.details, a.priority, a.due_at, a.done_at, a.created_at, a.result_text,
            a.user_id, u.name AS author_name, a.assignee_id, s.name AS assignee_name, {_title_sql(t)} AS entity_title,
            (SELECT COALESCE(json_agg(json_build_object('id', mu.id, 'name', mu.name) ORDER BY mu.name), '[]'::json) FROM {t('crm_task_members')} m JOIN {t('crm_users')} mu ON mu.id = m.user_id WHERE m.task_id = a.id) AS members
        FROM {t('crm_activities')} a
        LEFT JOIN {t('crm_users')} u ON u.id = a.user_id
        LEFT JOIN {t('crm_users')} s ON s.id = a.assignee_id
        WHERE a.id = %s AND a.kind = 'task'""", (eid,))
    item = cur.fetchone()
    if not item:
        return 404, {'error': 'Задача не найдена'}
    if item['entity_type'] == NONE:
        item['entity_type'], item['entity_id'] = None, None
    cur.execute(f"""SELECT c.id, c.text, c.created_at, c.user_id, u.name AS user_name FROM {t('crm_task_comments')} c
        LEFT JOIN {t('crm_users')} u ON u.id = c.user_id WHERE c.task_id = %s ORDER BY c.created_at""", (eid,))
    return 200, {'item': item, 'comments': cur.fetchall()}


def add_comment(cur, t, eid, body, user):
    text = _clean(body.get('text'), 3000)
    if not text:
        return 400, {'error': 'Напишите комментарий'}
    cur.execute(f"SELECT id FROM {t('crm_activities')} WHERE id = %s AND kind = 'task'", (eid,))
    if not cur.fetchone():
        return 404, {'error': 'Задача не найдена'}
    cur.execute(f"INSERT INTO {t('crm_task_comments')} (task_id, user_id, text) VALUES (%s, %s, %s) RETURNING id", (eid, user['id'], text))
    return 200, {'ok': True, 'id': cur.fetchone()['id'], 'ping': True}


def delete_comment(cur, t, cid, user):
    cur.execute(f"SELECT user_id FROM {t('crm_task_comments')} WHERE id = %s", (cid,))
    row = cur.fetchone()
    if not row:
        return 404, {'error': 'Комментарий не найден'}
    if row['user_id'] != user['id'] and user['role'] != 'admin':
        return 403, {'error': 'Удалить можно только свой комментарий'}
    cur.execute(f"DELETE FROM {t('crm_task_comments')} WHERE id = %s", (cid,))
    return 200, {'ok': True}


def delete_task(cur, t, eid, user):
    cur.execute(f"SELECT user_id FROM {t('crm_activities')} WHERE id = %s AND kind = 'task'", (eid,))
    row = cur.fetchone()
    if not row:
        return 404, {'error': 'Задача не найдена'}
    if row['user_id'] != user['id'] and user['role'] != 'admin':
        return 403, {'error': 'Удалить может только автор задачи или администратор'}
    cur.execute(f"DELETE FROM {t('crm_task_comments')} WHERE task_id = %s", (eid,))
    cur.execute(f"DELETE FROM {t('crm_task_members')} WHERE task_id = %s", (eid,))
    cur.execute(f"DELETE FROM {t('crm_activities')} WHERE id = %s", (eid,))
    return 200, {'ok': True}


def handle_tasks(cur, t, method, params, body, user, eid, resp, ping=None):
    action = params.get('action')
    if action == 'comments':
        if method == 'POST' and eid:
            code, data = add_comment(cur, t, eid, body, user)
        elif method == 'DELETE' and eid:
            code, data = delete_comment(cur, t, eid, user)
        else:
            return resp(400, {'error': 'Неверный запрос'})
        if data.pop('ping', None) and ping:
            ping()
        return resp(code, data)
    if method == 'GET':
        return resp(*get_task(cur, t, eid)) if eid else resp(200, list_tasks(cur, t, params, user))
    if method in ('POST', 'PUT'):
        if method == 'PUT' and not eid:
            return resp(400, {'error': 'Неверный запрос'})
        code, data = save_task(cur, t, eid if method == 'PUT' else None, body, user)
        if data.pop('ping', None) and ping:
            ping()
        return resp(code, data)
    if method == 'DELETE' and eid:
        return resp(*delete_task(cur, t, eid, user))
    return resp(400, {'error': 'Неверный запрос'})
