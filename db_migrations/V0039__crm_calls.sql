CREATE TABLE t_p15395438_addict_clinic_site.crm_calls (
    id SERIAL PRIMARY KEY,
    callid VARCHAR(150) NOT NULL UNIQUE,
    direction VARCHAR(10) NOT NULL,
    status VARCHAR(30),
    phone VARCHAR(50),
    phone_digits VARCHAR(20),
    pbx_user VARCHAR(150),
    ext VARCHAR(50),
    group_name VARCHAR(200),
    diversion VARCHAR(50),
    telnum VARCHAR(50),
    started_at TIMESTAMP,
    duration INTEGER NOT NULL DEFAULT 0,
    wait INTEGER,
    record_source_url TEXT,
    record_url TEXT,
    lead_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_leads(id),
    client_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_clients(id),
    lead_created BOOLEAN NOT NULL DEFAULT FALSE,
    raw JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX crm_calls_started_idx ON t_p15395438_addict_clinic_site.crm_calls (started_at DESC);
CREATE INDEX crm_calls_digits_idx ON t_p15395438_addict_clinic_site.crm_calls (phone_digits);