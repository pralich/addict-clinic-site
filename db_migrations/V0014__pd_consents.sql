CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.pd_consents (
    id SERIAL PRIMARY KEY,
    form VARCHAR(40) NOT NULL,
    purpose VARCHAR(40) NOT NULL,
    subject VARCHAR(200),
    doc_version VARCHAR(20) NOT NULL,
    ref_type VARCHAR(30),
    ref_id INTEGER,
    ip VARCHAR(64),
    user_agent VARCHAR(400),
    withdrawn_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pd_consents_subject ON t_p15395438_addict_clinic_site.pd_consents(subject);
CREATE INDEX IF NOT EXISTS idx_pd_consents_ref ON t_p15395438_addict_clinic_site.pd_consents(ref_type, ref_id);