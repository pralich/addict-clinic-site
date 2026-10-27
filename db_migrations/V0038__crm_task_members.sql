CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.crm_task_members (
  task_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.crm_activities(id),
  user_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.crm_users(id),
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_crm_task_members_user ON t_p15395438_addict_clinic_site.crm_task_members(user_id);