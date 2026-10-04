CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.family_push_subs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.family_users(id),
    endpoint TEXT NOT NULL UNIQUE,
    p256dh VARCHAR(200) NOT NULL,
    auth VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_push_subs_user ON t_p15395438_addict_clinic_site.family_push_subs(user_id, is_active);

CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.family_push_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.family_users(id),
    kind VARCHAR(30) NOT NULL,
    ref_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, kind, ref_id)
);

CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.push_config (
    id INTEGER PRIMARY KEY,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);