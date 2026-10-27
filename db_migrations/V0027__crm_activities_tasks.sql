ALTER TABLE t_p15395438_addict_clinic_site.crm_activities
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS done_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS result VARCHAR(40),
  ADD COLUMN IF NOT EXISTS direction VARCHAR(10),
  ADD COLUMN IF NOT EXISTS duration_min INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_crm_activities_entity_ts ON t_p15395438_addict_clinic_site.crm_activities(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_open_tasks ON t_p15395438_addict_clinic_site.crm_activities(kind, due_at) WHERE done_at IS NULL;