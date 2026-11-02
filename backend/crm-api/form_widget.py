import re

NAME_KEYS = ('name', 'fio', 'firstname', 'first_name', 'fullname', 'full_name', 'username', 'imya', 'имя', 'фио', 'your-name', 'contact_name', 'client_name')
PHONE_KEYS = ('phone', 'tel', 'telephone', 'mobile', 'phone_number', 'телефон', 'your-phone', 'whatsapp')
EMAIL_KEYS = ('email', 'e-mail', 'mail', 'your-email', 'почта')
MSG_KEYS = ('message', 'comment', 'comments', 'text', 'question', 'msg', 'description', 'сообщение', 'комментарий', 'вопрос', 'your-message', 'textarea')
TOPIC_KEYS = ('topic', 'subject', 'service', 'тема', 'услуга', 'your-subject')
SKIP_RE = re.compile(r'(password|passwd|pass|card|cvc|cvv|csrf|token|captcha|recaptcha|nonce|_wp|formid|form_id|tildaspec|g-recaptcha)', re.I)
PHONE_RE = re.compile(r'^\+?[\d\s\-()]{7,20}$')
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _norm(k):
    return re.sub(r'[\[\]\s]+', '_', str(k).strip().lower()).strip('_')


def _match(key, label, keys):
    for k in (key, label):
        if not k:
            continue
        if k in keys or any(x in k for x in keys if len(x) > 3):
            return True
    return False


def extract(fields):
    """Разбор произвольных полей формы: имя, телефон, email, тема, сообщение и прочее"""
    out = {'name': None, 'phone': None, 'email': None, 'topic': None, 'message': None}
    extra = []
    for f in fields[:60] if isinstance(fields, list) else []:
        if not isinstance(f, dict):
            continue
        raw_key = str(f.get('name') or '')[:100]
        label = str(f.get('label') or '')[:150]
        value = str(f.get('value') or '').strip()[:3000]
        ftype = str(f.get('type') or '').lower()
        if not value or SKIP_RE.search(raw_key) or ftype in ('password', 'hidden', 'file'):
            continue
        k, lb = _norm(raw_key), _norm(label)
        if not out['email'] and (ftype == 'email' or _match(k, lb, EMAIL_KEYS)) and EMAIL_RE.match(value):
            out['email'] = value.lower()
        elif not out['phone'] and (ftype == 'tel' or _match(k, lb, PHONE_KEYS)) and PHONE_RE.match(value):
            out['phone'] = value
        elif not out['name'] and _match(k, lb, NAME_KEYS) and len(value) <= 200:
            out['name'] = value
        elif not out['topic'] and _match(k, lb, TOPIC_KEYS) and len(value) <= 200:
            out['topic'] = value
        elif not out['message'] and (ftype == 'textarea' or _match(k, lb, MSG_KEYS)):
            out['message'] = value
        elif ftype in ('checkbox', 'radio') and value.lower() in ('on', 'yes', 'true', '1', 'y'):
            continue
        else:
            extra.append(f"{label or raw_key}: {value}")
    if not out['phone'] and not out['email']:
        for line in list(extra):
            v = line.split(': ', 1)[-1]
            if PHONE_RE.match(v) and len(re.sub(r'\D', '', v)) >= 10:
                out['phone'] = v
                extra.remove(line)
                break
            if EMAIL_RE.match(v):
                out['email'] = v.lower()
                extra.remove(line)
                break
    return out, extra


def host_allowed(page_url, domains):
    if not domains:
        return True
    m = re.match(r'^[a-z]+://([^/:?#]+)', (page_url or '').lower())
    h = m.group(1).removeprefix('www.') if m else ''
    if not h:
        return False
    for d in re.split(r'[\s,;]+', domains.lower()):
        d = d.strip().removeprefix('https://').removeprefix('http://').removeprefix('www.').strip('/')
        try:
            d = d.encode('idna').decode() if d else d
        except UnicodeError:
            pass
        if d and (h == d or h.endswith('.' + d)):
            return True
    return False
