ALTER TABLE t_p15395438_addict_clinic_site.crm_calls
  ADD COLUMN IF NOT EXISTS ai_status VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS ai_started_at TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS ai_attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_error TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_crm_calls_ai_queue ON t_p15395438_addict_clinic_site.crm_calls(started_at) WHERE transcript IS NULL AND duration > 0;