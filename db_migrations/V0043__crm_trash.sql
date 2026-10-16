ALTER TABLE t_p15395438_addict_clinic_site.crm_leads ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMP NULL, ADD COLUMN IF NOT EXISTS trashed_by INTEGER NULL;
ALTER TABLE t_p15395438_addict_clinic_site.crm_clients ADD COLUMN IF NOT EXISTS trashed_at TIMESTAMP NULL, ADD COLUMN IF NOT EXISTS trashed_by INTEGER NULL;
CREATE INDEX IF NOT EXISTS idx_crm_leads_trashed ON t_p15395438_addict_clinic_site.crm_leads(trashed_at) WHERE trashed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_clients_trashed ON t_p15395438_addict_clinic_site.crm_clients(trashed_at) WHERE trashed_at IS NOT NULL;