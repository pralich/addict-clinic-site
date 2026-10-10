ALTER TABLE t_p15395438_addict_clinic_site.crm_activities
  ADD COLUMN IF NOT EXISTS assignee_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_users(id),
  ADD COLUMN IF NOT EXISTS priority VARCHAR(10) NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS details TEXT;
UPDATE t_p15395438_addict_clinic_site.crm_activities SET assignee_id = user_id WHERE kind = 'task' AND assignee_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_activities_assignee ON t_p15395438_addict_clinic_site.crm_activities(assignee_id, done_at) WHERE kind = 'task';