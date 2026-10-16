import re

LEADS_ONLY = 'leads_only'
ROLES = ('admin', 'manager', 'doctor', LEADS_ONLY)
LEADS_ONLY_RESOURCES = ('leads', 'activities', 'tasks', 'counters', 'options', 'live_calls')
LEAD_CONTACT_FIELDS = ('contact', 'rep_phone', 'rep_email', 'rep_messenger')
LEAD_TEXT_FIELDS = ('name', 'message', 'rep_note', 'topic')
LEADS_ONLY_SEARCH = ['name', 'topic', 'rep_name']

EMAIL_RE = re.compile(r'([\w.+-]+)@([\w-]+(?:\.[\w-]+)+)')
PHONE_RE = re.compile(r'\+?\d[\d\s()\-]{5,}\d')


def is_leads_only(user):
    return bool(user) and user.get('role') == LEADS_ONLY


def _mask_name(name):
    return (name[:2] if len(name) > 3 else name[:1]) + '***'


def mask_phone(v):
    total = sum(c.isdigit() for c in v)
    head = 4 if total >= 11 else 1
    out, i = [], 0
    for c in v:
        if c.isdigit():
            i += 1
            out.append(c if i <= head or i > total - 2 else '*')
        else:
            out.append(c)
    return ''.join(out)


def mask_text(v):
    if not v or not isinstance(v, str):
        return v
    out = EMAIL_RE.sub(lambda m: _mask_name(m.group(1)) + '@' + m.group(2), v)
    return PHONE_RE.sub(lambda m: mask_phone(m.group(0)) if sum(c.isdigit() for c in m.group(0)) >= 7 else m.group(0), out)


def mask_contact(v):
    if not v or not isinstance(v, str):
        return v
    out = mask_text(v)
    if out != v:
        return out
    s = v.strip()
    return s[:2] + '***' if len(s) > 3 else '***'


def mask_lead(item):
    if not item:
        return item
    for f in LEAD_CONTACT_FIELDS:
        if item.get(f):
            item[f] = mask_contact(item[f])
    for f in LEAD_TEXT_FIELDS:
        if item.get(f):
            item[f] = mask_text(item[f])
    return item
