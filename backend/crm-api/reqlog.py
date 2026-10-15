import json
import os
import random
import re
import time
import hashlib
import base64
import functools
from urllib.parse import parse_qs

import psycopg2

_SCHEMA = 't_p15395438_addict_clinic_site'
_SECRET_KEYS = re.compile(r'(crm_token|api[_-]?key|token|password|authorization|secret)', re.I)
_LIMIT = 8000


def _mask(obj):
    if isinstance(obj, dict):
        return {k: ('***' if _SECRET_KEYS.search(str(k)) else _mask(v)) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_mask(v) for v in obj]
    return obj


def _body_text(event):
    raw = event.get('body') or ''
    if event.get('isBase64Encoded') and raw:
        try:
            raw = base64.b64decode(raw).decode('utf-8', 'replace')
        except Exception:
            raw = '<binary>'
    if not raw:
        return None
    if raw.strip().startswith(('{', '[')):
        try:
            return _mask(json.loads(raw))
        except json.JSONDecodeError:
            return raw
    if '=' in raw and '\n' not in raw.strip():
        return _mask({k: v[0] for k, v in parse_qs(raw, keep_blank_values=True).items()})
    return raw


def _cut(v):
    s = v if isinstance(v, str) else json.dumps(v, ensure_ascii=False, default=str)
    return s if len(s) <= _LIMIT else s[:_LIMIT] + '…'


def write_log(source, direction, method, action, status_code, duration_ms, request, response, ip=None, error=None, api_key_hash=None, user_id=None):
    try:
        conn = psycopg2.connect(os.environ['DATABASE_URL'])
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f"""INSERT INTO {_SCHEMA}.crm_integration_log (source, direction, method, action, status_code, duration_ms, ip, api_key_id, user_id, request, response, error)
            VALUES (%s, %s, %s, %s, %s, %s, %s, (SELECT id FROM {_SCHEMA}.crm_api_keys WHERE key_hash = %s LIMIT 1), %s, %s, %s, %s)""",
            (source, direction, (method or '')[:10], (action or '')[:100] or None, status_code, duration_ms, (ip or '')[:64] or None,
             api_key_hash, user_id, _cut(request), _cut(response) if response is not None else None, (error or '')[:2000] or None))
        if random.random() < 0.02:
            cur.execute(f"DELETE FROM {_SCHEMA}.crm_integration_log WHERE created_at < NOW() - INTERVAL '60 days'")
        cur.close()
        conn.close()
    except Exception as e:
        print(f'request log failed: {e}')


def logged(source, action_fn):
    def wrap(fn):
        @functools.wraps(fn)
        def handler(event, context):
            if event.get('httpMethod') == 'OPTIONS':
                return fn(event, context)
            started = time.time()
            headers = {k.lower(): v for k, v in (event.get('headers') or {}).items()}
            key = headers.get('x-api-key') or ''
            auth = headers.get('x-authorization') or headers.get('authorization') or ''
            if not key and auth.lower().startswith('bearer '):
                key = auth[7:].strip()
            params = _mask(event.get('queryStringParameters') or {})
            request = {'query': params, 'body': _body_text(event), 'user_agent': headers.get('user-agent')}
            ip = ((event.get('requestContext') or {}).get('identity') or {}).get('sourceIp')
            result, error = None, None
            try:
                result = fn(event, context)
                return result
            except Exception as e:
                error = f'{type(e).__name__}: {e}'
                raise
            finally:
                body = None
                if result is not None:
                    body = result.get('body')
                    try:
                        body = json.loads(body) if body else None
                    except (TypeError, json.JSONDecodeError):
                        pass
                    if isinstance(body, dict) and not error and (result.get('statusCode') or 200) >= 400:
                        error = str(body.get('error') or '') or None
                src = source(event) if callable(source) else source
                write_log(src, 'in', event.get('httpMethod'), action_fn(event, request), result.get('statusCode') if result else 500,
                          int((time.time() - started) * 1000), request, body, ip, error,
                          hashlib.sha256(key.encode()).hexdigest() if key else None)
        return handler
    return wrap
