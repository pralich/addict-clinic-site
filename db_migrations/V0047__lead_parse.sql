CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.crm_settings (
  key VARCHAR(60) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO t_p15395438_addict_clinic_site.crm_settings (key, value) VALUES ('lead_autoparse', 'false'::jsonb) ON CONFLICT DO NOTHING;
ALTER TABLE t_p15395438_addict_clinic_site.crm_leads ADD COLUMN IF NOT EXISTS raw_message TEXT NULL;
ALTER TABLE t_p15395438_addict_clinic_site.crm_leads ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMP NULL;