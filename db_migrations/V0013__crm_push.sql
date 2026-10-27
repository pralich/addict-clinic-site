CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.crm_push_subs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.crm_users(id),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh VARCHAR(200) NOT NULL,
    auth VARCHAR(100) NOT NULL,
    notify_leads BOOLEAN NOT NULL DEFAULT TRUE,
    notify_orders BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_push_subs_active ON t_p15395438_addict_clinic_site.crm_push_subs(is_active);

CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.crm_push_log (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(30) NOT NULL,
    ref_id INTEGER NOT NULL,
    sent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (kind, ref_id)
);

INSERT INTO t_p15395438_addict_clinic_site.crm_push_log (kind, ref_id)
SELECT 'lead', id FROM t_p15395438_addict_clinic_site.crm_leads
ON CONFLICT DO NOTHING;
INSERT INTO t_p15395438_addict_clinic_site.crm_push_log (kind, ref_id)
SELECT 'order', id FROM t_p15395438_addict_clinic_site.orders WHERE status = 'paid'
ON CONFLICT DO NOTHING;