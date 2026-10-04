import json
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64

from py_vapid import Vapid
from pywebpush import webpush, WebPushException

SUBJECT = 'mailto:support@addict.clinic'


def _b64(b):
    return base64.urlsafe_b64encode(b).decode().rstrip('=')


def get_keys(cur, t):
    cur.execute(f'SELECT public_key, private_key FROM {t("push_config")} WHERE id = 1')
    row = cur.fetchone()
    if row:
        return row['public_key'], row['private_key']
    key = ec.generate_private_key(ec.SECP256R1())
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    pub = _b64(key.public_key().public_bytes(serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint))
    cur.execute(f'INSERT INTO {t("push_config")} (id, public_key, private_key) VALUES (1, %s, %s) ON CONFLICT (id) DO NOTHING', (pub, pem))
    cur.execute(f'SELECT public_key, private_key FROM {t("push_config")} WHERE id = 1')
    row = cur.fetchone()
    return row['public_key'], row['private_key']


def send_to_user(cur, t, user_id, payload, kind=None, ref_id=None):
    """Отправляет push всем активным устройствам пользователя. Если задан kind/ref_id — не чаще одного раза."""
    if kind and ref_id is not None:
        cur.execute(f'INSERT INTO {t("family_push_log")} (user_id, kind, ref_id) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING RETURNING id', (user_id, kind, ref_id))
        if not cur.fetchone():
            return 0
    cur.execute(f'SELECT id, endpoint, p256dh, auth FROM {t("family_push_subs")} WHERE user_id = %s AND is_active', (user_id,))
    subs = cur.fetchall()
    if not subs:
        return 0
    _, pem = get_keys(cur, t)
    vapid = Vapid.from_pem(pem.encode())
    data = json.dumps(payload, ensure_ascii=False)
    sent = 0
    for s in subs:
        try:
            webpush({'endpoint': s['endpoint'], 'keys': {'p256dh': s['p256dh'], 'auth': s['auth']}}, data,
                    vapid_private_key=vapid, vapid_claims={'sub': SUBJECT}, ttl=3600, timeout=5)
            sent += 1
        except WebPushException as e:
            code = getattr(e.response, 'status_code', None)
            if code in (404, 410):
                cur.execute(f'UPDATE {t("family_push_subs")} SET is_active = FALSE WHERE id = %s', (s['id'],))
            else:
                print(f'push error {code}: {e}')
        except Exception as e:
            print(f'push error: {e}')
    return sent
