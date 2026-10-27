ALTER TABLE t_p15395438_addict_clinic_site.crm_calls ADD COLUMN lead_state VARCHAR(20) NULL;
ALTER TABLE t_p15395438_addict_clinic_site.crm_calls ADD COLUMN ai_target BOOLEAN NULL;
ALTER TABLE t_p15395438_addict_clinic_site.crm_calls ADD COLUMN ai_target_reason TEXT NULL;
ALTER TABLE t_p15395438_addict_clinic_site.crm_calls ADD COLUMN lead_decided_by INTEGER NULL;
ALTER TABLE t_p15395438_addict_clinic_site.crm_calls ADD COLUMN lead_decided_at TIMESTAMP NULL;
CREATE INDEX IF NOT EXISTS crm_calls_lead_state_idx ON t_p15395438_addict_clinic_site.crm_calls (lead_state);