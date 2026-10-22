from datetime import datetime, timedelta

MSK = timedelta(hours=3)
MSK_NOW = "(NOW() AT TIME ZONE 'UTC' + INTERVAL '3 hours')"
MSK_TODAY = f"{MSK_NOW}::date"
MSK_TODAY_START = f"({MSK_TODAY} - INTERVAL '3 hours')"


def msk(col):
    return f"({col} + INTERVAL '3 hours')"


def msk_now():
    return datetime.utcnow() + MSK


def msk_today():
    return msk_now().date()
