import json
from datetime import datetime

FIELD_LABELS = {
    'who': 'Кому нужна помощь',
    'what': 'С чем сложно',
    'region': 'Где находится',
    'fmt': 'Формат',
    'agree': 'Согласен на помощь',
    'when': 'Когда связаться',
    'time': 'Когда связаться',
    'how': 'Как связаться',
    'consent': 'Согласие на обработку данных',
    'form_source': 'Форма',
}

VALUES = {
    'who': {'close': 'Для близкого', 'self': 'Для себя', 'relapse': 'После срыва', 'teen': 'Для подростка', 'child': 'Сыну или дочери',
            'spouse': 'Мужу или жене', 'parent': 'Родителю', 'other': 'Другому близкому'},
    'what': {'alco': 'Алкоголь', 'drugs': 'Запрещённые вещества', 'game': 'Игромания, ставки', 'unknown': 'Не знаю точно'},
    'region': {'msk': 'Москва и Московская область', 'other': 'Другой регион'},
    'fmt': {'inpatient': 'Стационар', 'outpatient': 'Амбулаторно', 'urgent': 'Срочно: запой или ломка', 'unsure': 'Сначала разобраться',
            'budget': 'Нужен бюджетный или бесплатный вариант'},
    'agree': {'yes': 'Да, готов', 'maybe': 'Сомневается', 'no': 'Отказывается', 'urgent': 'Срочно: запой или ломка'},
    'when': {'now': 'Сейчас', 'morning': 'Утром', 'day': 'Днём', 'evening': 'Вечером', 'write': 'Написать'},
    'how': {'write': 'Написать', 'now': 'Сейчас', 'morning': 'Утром', 'day': 'Днём', 'evening': 'Вечером'},
    'consent': {'on': 'да', 'true': 'да', '1': 'да'},
}
VALUES['time'] = VALUES['when']

PAGE_VALUES = {
    ('fmt', 'inpatient'): {'podbor': 'Стационар, от 65 000 ₽ в месяц', 'podbor-uslugi': 'Стационар, от 65 000 ₽ в месяц', 'dlya-sebya': 'Уехать из привычной среды на время'},
    ('fmt', 'outpatient'): {'dlya-sebya': 'Амбулаторное лечение, не бросая работу', 'podbor': 'Амбулаторно, без отрыва от работы'},
}

PREFIXES = ('h_', 'm_', 'f_', 'p_')
CONTACT_FIELDS = {'name', 'tel', 'phone', 'contact', 'email'}

ADDICTION_TAGS = {'alco': 'Алкоголизм', 'drugs': 'Наркомания', 'game': 'Игромания'}
FMT_TAGS = {'inpatient': 'Стационар'}
URGENT_TAGS = {'alco': 'Вывод из запоя', 'drugs': 'Детоксикация'}

WHO_RELATION = {'child': 'parent', 'teen': 'parent', 'spouse': 'spouse', 'parent': 'child', 'close': 'relative', 'other': 'relative'}

GENERIC_TOPICS = ('', 'обращение с сайта', 'заявка с сайта')


def read_pairs(text):
    """Достаёт пары поле-значение из комментария в формате JSON [{field, value}] или {field: value}"""
    if not text or text.strip()[:1] not in '[{':
        return None
    try:
        data = json.loads(text)
    except ValueError:
        return None
    if isinstance(data, dict):
        return [(str(k), '' if v is None else str(v)) for k, v in data.items()]
    if isinstance(data, list) and data and all(isinstance(x, dict) and 'field' in x for x in data):
        return [(str(x['field']), '' if x.get('value') is None else str(x.get('value'))) for x in data]
    return None


def base_key(field):
    f = field.strip().lower()
    for p in PREFIXES:
        if f.startswith(p) and f[len(p):] in FIELD_LABELS:
            return f[len(p):]
    return f


def parse(text):
    pairs = read_pairs(text)
    if pairs is None:
        return None
    page = ''
    for f, v in pairs:
        if base_key(f) == 'form_source':
            page = v.split(':')[0].strip().lower()
    codes, lines, contacts, form = {}, [], {}, None
    for f, v in pairs:
        key, val = base_key(f), v.strip()
        if not val:
            continue
        if key in CONTACT_FIELDS:
            contacts[key] = val
            continue
        if key == 'form_source':
            form = val[:40]
            lines.append(f'{FIELD_LABELS[key]}: {val}')
            continue
        code = val.lower()
        mapped = PAGE_VALUES.get((key, code), {}).get(page) or VALUES.get(key, {}).get(code)
        if mapped is None and key in VALUES:
            rev = {txt.lower(): c for c, txt in VALUES[key].items()}
            if code in rev:
                code, mapped = rev[code], val
        if key in VALUES:
            codes.setdefault(key, code if mapped else None)
        label = FIELD_LABELS.get(key, f)
        lines.append(f'{label}: {mapped or val}')
    return {'lines': lines, 'codes': codes, 'contacts': contacts, 'form': form}


def find_tags(cur, t, names):
    if not names:
        return []
    cur.execute(f"SELECT id FROM {t('crm_tags')} WHERE is_active AND name = ANY(%s)", (list(names),))
    return [r['id'] for r in cur.fetchall()]


def apply(cur, t, lead_id, user_id=None, force=False):
    """Разбирает комментарий лида и раскладывает значения по полям. Возвращает список изменений или None"""
    cur.execute(f"SELECT id, name, contact, topic, message, raw_message, form, tags, rep_name, rep_phone, rep_relation, parsed_at FROM {t('crm_leads')} WHERE id = %s", (lead_id,))
    lead = cur.fetchone()
    if not lead or (lead['parsed_at'] and not force):
        return None
    source = lead['raw_message'] or lead['message']
    res = parse(source)
    if not res:
        return None
    c = res['codes']
    upd, changes = {'message': '\n'.join(res['lines']), 'raw_message': source, 'parsed_at': datetime.utcnow()}, []

    names = set()
    what = c.get('what')
    if what in ADDICTION_TAGS:
        names.add(ADDICTION_TAGS[what])
    if c.get('fmt') in FMT_TAGS:
        names.add(FMT_TAGS[c['fmt']])
    if 'urgent' in (c.get('fmt'), c.get('agree')) and what in URGENT_TAGS:
        names.add(URGENT_TAGS[what])
    new_tags = [i for i in find_tags(cur, t, names) if i not in (lead['tags'] or [])]
    if new_tags:
        upd['tags'] = list(lead['tags'] or []) + new_tags
        changes.append(f'теги: +{len(new_tags)}')

    if (lead['topic'] or '').strip().lower() in GENERIC_TOPICS:
        topic = ' · '.join(x for x in (VALUES['who'].get(c.get('who') or ''), VALUES['what'].get(what or '')) if x)
        if topic:
            upd['topic'] = topic[:200]
            changes.append('тема')

    if not lead['name'] and res['contacts'].get('name'):
        upd['name'] = res['contacts']['name'][:250]
        changes.append('имя')

    rel = WHO_RELATION.get(c.get('who') or '')
    if rel and not lead['rep_relation'] and not lead['rep_phone']:
        upd['rep_relation'] = rel
        upd['rep_name'] = lead['rep_name'] or lead['name'] or res['contacts'].get('name')
        upd['rep_phone'] = lead['contact']
        changes.append('контактное лицо')

    if not lead['form'] and res['form']:
        upd['form'] = res['form']
        changes.append('форма')

    cur.execute(f"UPDATE {t('crm_leads')} SET {', '.join(f'{k} = %s' for k in upd)}, updated_at = NOW() WHERE id = %s", list(upd.values()) + [lead_id])
    text = 'Комментарий разобран по полям' + (f" ({', '.join(changes)})" if changes else '')
    cur.execute(f"INSERT INTO {t('crm_activities')} (entity_type, entity_id, user_id, kind, text) VALUES ('leads', %s, %s, 'system', %s)", (lead_id, user_id, text))
    return changes


def auto_enabled(cur, t):
    cur.execute(f"SELECT value FROM {t('crm_settings')} WHERE key = 'lead_autoparse'")
    row = cur.fetchone()
    return bool(row and row['value'] is True)
