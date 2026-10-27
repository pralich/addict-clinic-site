CREATE TABLE t_p15395438_addict_clinic_site.crm_integration_log (
    id BIGSERIAL PRIMARY KEY,
    source VARCHAR(20) NOT NULL,
    direction VARCHAR(5) NOT NULL DEFAULT 'in',
    method VARCHAR(10),
    action VARCHAR(100),
    status_code INTEGER,
    duration_ms INTEGER,
    ip VARCHAR(64),
    api_key_id INTEGER,
    user_id INTEGER,
    request TEXT,
    response TEXT,
    error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX crm_integration_log_created_idx ON t_p15395438_addict_clinic_site.crm_integration_log (created_at DESC);
CREATE INDEX crm_integration_log_source_idx ON t_p15395438_addict_clinic_site.crm_integration_log (source, created_at DESC);