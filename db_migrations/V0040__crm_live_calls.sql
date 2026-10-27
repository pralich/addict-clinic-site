CREATE TABLE t_p15395438_addict_clinic_site.crm_live_calls (
    callid VARCHAR(150) PRIMARY KEY,
    direction VARCHAR(10) NOT NULL DEFAULT 'in',
    state VARCHAR(20) NOT NULL,
    phone VARCHAR(50),
    phone_digits VARCHAR(20),
    pbx_user VARCHAR(150),
    diversion VARCHAR(50),
    lead_id INTEGER,
    client_id INTEGER,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX crm_live_calls_updated_idx ON t_p15395438_addict_clinic_site.crm_live_calls (updated_at DESC);