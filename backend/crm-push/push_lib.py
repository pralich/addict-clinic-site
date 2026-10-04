import json

from py_vapid import Vapid
from pywebpush import webpush, WebPushException

SUBJECT = 'mailto:support@addict.clinic'


def get_public_key(cur, t):
    cur.execute(f'SELECT public_key FROM {t("push_config")} WHERE id = 1')
    row = cur.fetchone()
    return row['public_key'] if row else None


def send(cur, t, subs, payload):
    """Рассылает push по списку подписок, отключая устаревшие устройства"""
    if not subs:
        return 0
    cur.execute(f'SELECT private_key FROM {t("push_config")} WHERE id = 1')
    row = cur.fetchone()
    if not row:
        return 0
    vapid = Vapid.from_pem(row['private_key'].encode())
    data = json.dumps(payload, ensure_ascii=False)
    sent = 0
    for s in subs:
        try:
            webpush({'endpoint': s['endpoint'], 'keys': {'p256dh': s['p256dh'], 'auth': s['auth']}}, data,
                    vapid_private_key=vapid, vapid_claims={'sub': SUBJECT}, ttl=86400, timeout=4,
                    headers={'Urgency': 'high'})
            sent += 1
        except WebPushException as e:
            code = getattr(e.response, 'status_code', None)
            if code in (404, 410):
                cur.execute(f'UPDATE {t("crm_push_subs")} SET is_active = FALSE WHERE id = %s', (s['id'],))
            else:
                print(f'push error {code}: {e}')
        except Exception as e:
            print(f'push error: {e}')
    return sent
