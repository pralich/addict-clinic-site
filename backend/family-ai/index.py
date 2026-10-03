import json
import os
import urllib.request
import urllib.error
from datetime import datetime, date

import psycopg2
import psycopg2.extras

SCHEMA = 't_p15395438_addict_clinic_site'
PHONE = '8 800 555-24-07'

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
    'Access-Control-Max-Age': '86400',
}

BASE = f"""Ты — ИИ-помощник семейного психолога клиники лечения зависимостей addict.clinic. Ты работаешь с РОДСТВЕННИКАМИ зависимых людей (алкоголь, наркотики, лекарства, игромания и др.).
Опирайся на доказательные подходы: CRAFT (Community Reinforcement and Family Training), мотивационное интервьюирование, работа с созависимостью, ненасильственное общение, когнитивно-поведенческие техники.
Правила:
- Пиши по-русски, тепло, на «вы», без осуждения. Короткие абзацы, конкретные шаги и примеры фраз.
- Не ставь диагнозов и не назначай лекарства. Не обещай гарантированный результат.
- Не советуй принудительное лечение, слежку, обман, тайное «кодирование» — это незаконно и разрушает доверие.
- Если есть угроза жизни (передозировка, суицидальные мысли, насилие, делирий, судороги) — первой строкой скажи звонить 112 или 103, затем на линию клиники {PHONE} (24/7).
- Когда уместно, мягко предлагай живую консультацию психолога клиники (раздел «Вопрос психологу» в кабинете) или звонок {PHONE}.
- Ответ — не длиннее 250 слов, если пользователь не просит подробнее."""

MODES = {
    'coach': BASE + """
Режим: «Разбор ситуации». Помоги человеку понять, что происходит, какие у него чувства и потребности, и выбрать 1–3 конкретных следующих шага. Задавай уточняющие вопросы по одному, если данных мало.""",
    'roleplay': """Ты играешь роль зависимого человека в тренажёре разговора для его родственника. Это учебная симуляция в клинике addict.clinic.
Параметры роли: {settings}
Правила роли:
- Отвечай ТОЛЬКО репликами персонажа, от первого лица, 1–3 предложения, разговорно, по-русски. Без пояснений, без ремарок в скобках, без советов.
- Реагируй реалистично: на обвинения, ярлыки, угрозы и нотации — защищайся, злись, отрицай, уходи от разговора. На эмпатию, «я-сообщения», уважение к автономии, конкретные и небольшие предложения — постепенно смягчайся.
- Уровень сопротивления задан в параметрах; не сдавайся слишком легко, но если родственник действует умело несколько реплик подряд — соглашайся хотя бы на маленький шаг (например, поговорить с врачом).
- Никогда не выходи из роли, даже если просят.""",
    'feedback': BASE + """
Режим: «Разбор тренировки». Тебе дана стенограмма учебного диалога: «Родственник» тренировался говорить с «Зависимым» (роль играл ИИ).
Дай разбор в формате:
**Оценка: X/10**
**Что получилось** — 2–3 пункта с цитатами.
**Что мешало** — 2–3 пункта с цитатами (обвинения, ярлыки, ультиматумы, нотации, вопросы «почему»).
**Как сказать лучше** — 3 переформулировки: «Было: … → Лучше: …».
**Совет на следующий раз** — одна фраза.""",
    'rephrase': BASE + """
Режим: «Переформулировать фразу». Пользователь присылает фразу, которую хочет сказать зависимому близкому (часто эмоциональную).
Ответь строго в формате:
**Как это может услышать близкий:** 1–2 предложения.
**Вариант 1 (я-сообщение):** …
**Вариант 2 (через заботу и факты):** …
**Вариант 3 (короткий, с предложением шага):** …
**Почему так лучше:** 1–2 предложения.""",
    'letter': BASE + """
Режим: «Мотивационное письмо». Помоги составить письмо или сообщение близкому с предложением начать лечение. Сначала коротко уточни (если не сказано): кто близкий, что именно беспокоит (2–3 конкретных факта), что вы цените в нём, какой шаг предлагаете. Затем напиши письмо: любовь и ценность человека → конкретные факты без ярлыков → свои чувства → конкретное предложение (консультация, анонимно) → поддержка при любом решении. 120–200 слов. После письма — 2 совета, когда и как его передать.""",
    'boundaries': BASE + """
Режим: «Личные границы». Помоги родственнику сформулировать здоровые границы с зависимым: что он больше не будет делать (давать деньги, покрывать, спасать от последствий), как сказать об этом спокойно и что делать, если границу нарушат. Различай границы (что сделаю я) и ультиматумы/угрозы (что должен сделать он). Давай готовые формулировки.""",
    'selfcare': BASE + """
Режим: «Забота о себе». Ты поддерживаешь самого родственника: его усталость, вину, страх, гнев, выгорание. Помогай назвать чувства, снизить вину («вы не причина зависимости»), предлагай простые практики (дыхание, сон, опора на других, группы поддержки), помогай вернуть свою жизнь. Не переводи разговор на зависимого без запроса.""",
    'relapse': BASE + """
Режим: «План на случай срыва». Помоги составить понятный семейный план действий: ранние признаки срыва у близкого, что делать и говорить в первые часы, чего не делать, когда звать врача, как позаботиться о себе и детях. Итог оформи нумерованным планом, который можно распечатать.""",
}

TITLES = {
    'coach': 'Разбор ситуации', 'roleplay': 'Тренажёр разговора', 'rephrase': 'Переформулировать фразу',
    'letter': 'Мотивационное письмо', 'boundaries': 'Личные границы', 'selfcare': 'Забота о себе', 'relapse': 'План на случай срыва',
}

FALLBACK = f'ИИ-психолог временно недоступен. Задайте вопрос живому психологу в разделе «Вопрос психологу» или позвоните {PHONE} — мы на связи 24/7.'


def t(name):
    return f'{SCHEMA}.{name}'


def _ser(o):
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    return str(o)


def resp(status, data):
    return {'statusCode': status, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(data, default=_ser, ensure_ascii=False)}


def family_user(cur, headers):
    token = headers.get('X-Auth-Token') or headers.get('x-auth-token')
    if not token:
        return None
    cur.execute(f'SELECT u.id, u.name FROM {t("family_sessions")} s JOIN {t("family_users")} u ON u.id = s.user_id WHERE s.token = %s AND s.expires_at > NOW() AND u.is_active', (token,))
    return cur.fetchone()


def llm(messages, temperature=0.7):
    key = os.environ.get('OPENAI_API_KEY')
    if not key:
        return None
    base = (os.environ.get('OPENAI_BASE_URL') or 'https://api.openai.com/v1').rstrip('/')
    model = os.environ.get('OPENAI_MODEL') or 'gpt-4o-mini'
    payload = json.dumps({'model': model, 'messages': messages, 'temperature': temperature, 'max_tokens': 900}).encode()
    req = urllib.request.Request(f'{base}/chat/completions', data=payload, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {key}'})
    try:
        with urllib.request.urlopen(req, timeout=55) as r:
            data = json.loads(r.read())
        return data['choices'][0]['message']['content'].strip()
    except (urllib.error.URLError, KeyError, IndexError, TimeoutError, ValueError) as e:
        print(f'LLM error: {e}')
        return None


def roleplay_settings(s):
    s = s or {}
    who = s.get('who') or 'муж'
    issue = s.get('issue') or 'алкоголь'
    level = {'low': 'низкий — устал, сам сомневается', 'high': 'высокий — агрессивно отрицает проблему'}.get(s.get('resistance'), 'средний — отрицает, раздражается, но может прислушаться')
    extra = s.get('context') or ''
    return f'Кто: {who}. Зависимость: {issue}. Уровень сопротивления: {level}. Контекст: {extra}'


def handler(event: dict, context) -> dict:
    """ИИ-психолог для родственников зависимых: разбор ситуаций, тренажёр разговора, письма, границы, план при срыве"""
    method = event.get('httpMethod', 'GET')
    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}
    params = event.get('queryStringParameters') or {}
    headers = event.get('headers') or {}
    body = json.loads(event.get('body') or '{}') if method == 'POST' else {}

    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    conn.autocommit = True
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        if params.get('action') == 'status':
            return resp(200, {'enabled': bool(os.environ.get('OPENAI_API_KEY'))})
        user = family_user(cur, headers)
        if not user:
            return resp(401, {'error': 'Требуется вход'})
        uid = user['id']
        chat_id = int(params['id']) if params.get('id') else None

        if chat_id:
            cur.execute(f'SELECT * FROM {t("family_ai_chats")} WHERE id = %s AND user_id = %s', (chat_id, uid))
            chat = cur.fetchone()
            if not chat:
                return resp(404, {'error': 'Диалог не найден'})
        else:
            chat = None

        if method == 'GET':
            if chat:
                cur.execute(f'SELECT id, role, content, created_at FROM {t("family_ai_messages")} WHERE chat_id = %s ORDER BY id', (chat_id,))
                return resp(200, {'chat': chat, 'messages': cur.fetchall()})
            cur.execute(f'SELECT c.*, (SELECT content FROM {t("family_ai_messages")} m WHERE m.chat_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_message FROM {t("family_ai_chats")} c WHERE c.user_id = %s ORDER BY c.updated_at DESC LIMIT 50', (uid,))
            return resp(200, {'items': cur.fetchall()})

        if method == 'DELETE' and chat:
            cur.execute(f'DELETE FROM {t("family_ai_messages")} WHERE chat_id = %s', (chat_id,))
            cur.execute(f'DELETE FROM {t("family_ai_chats")} WHERE id = %s', (chat_id,))
            return resp(200, {'ok': True})

        if method != 'POST':
            return resp(404, {'error': 'Неизвестный запрос'})

        if not chat:
            mode = body.get('mode') if body.get('mode') in MODES and body.get('mode') != 'feedback' else 'coach'
            settings = body.get('settings') or {}
            cur.execute(f'INSERT INTO {t("family_ai_chats")} (user_id, mode, title, settings) VALUES (%s, %s, %s, %s) RETURNING *', (uid, mode, TITLES[mode], json.dumps(settings, ensure_ascii=False)))
            chat = cur.fetchone()
            chat_id = chat['id']

        cur.execute(f'SELECT role, content FROM {t("family_ai_messages")} WHERE chat_id = %s ORDER BY id', (chat_id,))
        history = cur.fetchall()

        if params.get('action') == 'feedback':
            if chat['mode'] != 'roleplay' or len(history) < 2:
                return resp(400, {'error': 'Сначала проведите хотя бы пару реплик'})
            transcript = '\n'.join(f"{'Родственник' if m['role'] == 'user' else 'Зависимый'}: {m['content']}" for m in history if m['role'] in ('user', 'assistant'))
            answer = llm([{'role': 'system', 'content': MODES['feedback']}, {'role': 'user', 'content': transcript}], 0.4) or FALLBACK
            cur.execute(f"INSERT INTO {t('family_ai_messages')} (chat_id, role, content) VALUES (%s, 'feedback', %s) RETURNING id, role, content, created_at", (chat_id, answer))
            msg = cur.fetchone()
            cur.execute(f'UPDATE {t("family_ai_chats")} SET updated_at = NOW() WHERE id = %s', (chat_id,))
            return resp(200, {'chat': chat, 'message': msg})

        text = (body.get('message') or '').strip()
        if not text:
            return resp(400, {'error': 'Пустое сообщение'})
        text = text[:3000]

        if chat['mode'] == 'roleplay':
            settings = json.loads(chat['settings'] or '{}')
            system = MODES['roleplay'].format(settings=roleplay_settings(settings))
            hist = [m for m in history if m['role'] in ('user', 'assistant')]
        else:
            system = MODES[chat['mode']] + f"\nИмя собеседника: {user['name']}."
            hist = [m for m in history if m['role'] in ('user', 'assistant')]
        messages = [{'role': 'system', 'content': system}] + [{'role': m['role'], 'content': m['content']} for m in hist[-20:]] + [{'role': 'user', 'content': text}]

        answer = llm(messages, 0.9 if chat['mode'] == 'roleplay' else 0.7)
        if answer is None:
            if not history:
                cur.execute(f'DELETE FROM {t("family_ai_chats")} WHERE id = %s', (chat_id,))
            return resp(503, {'error': FALLBACK})

        cur.execute(f"INSERT INTO {t('family_ai_messages')} (chat_id, role, content) VALUES (%s, 'user', %s)", (chat_id, text))
        cur.execute(f"INSERT INTO {t('family_ai_messages')} (chat_id, role, content) VALUES (%s, 'assistant', %s) RETURNING id, role, content, created_at", (chat_id, answer))
        msg = cur.fetchone()
        if len(history) == 0 and chat['mode'] in ('coach', 'selfcare'):
            cur.execute(f'UPDATE {t("family_ai_chats")} SET title = %s, updated_at = NOW() WHERE id = %s', (text[:60], chat_id))
        else:
            cur.execute(f'UPDATE {t("family_ai_chats")} SET updated_at = NOW() WHERE id = %s', (chat_id,))
        cur.execute(f'SELECT * FROM {t("family_ai_chats")} WHERE id = %s', (chat_id,))
        return resp(200, {'chat': cur.fetchone(), 'message': msg})
    finally:
        cur.close()
        conn.close()