CREATE TABLE t_p15395438_addict_clinic_site.crm_api_keys (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(20) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  requests_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP,
  created_by INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP
);
ALTER TABLE t_p15395438_addict_clinic_site.crm_leads ADD COLUMN external_id VARCHAR(100);
ALTER TABLE t_p15395438_addict_clinic_site.crm_clients ADD COLUMN external_id VARCHAR(100);
ALTER TABLE t_p15395438_addict_clinic_site.crm_deals ADD COLUMN external_id VARCHAR(100);
CREATE INDEX idx_crm_leads_external ON t_p15395438_addict_clinic_site.crm_leads(external_id);
CREATE INDEX idx_crm_clients_external ON t_p15395438_addict_clinic_site.crm_clients(external_id);
CREATE INDEX idx_crm_deals_external ON t_p15395438_addict_clinic_site.crm_deals(external_id);
CREATE INDEX idx_crm_clients_phone ON t_p15395438_addict_clinic_site.crm_clients(phone);
CREATE INDEX idx_crm_clients_email ON t_p15395438_addict_clinic_site.crm_clients(email);