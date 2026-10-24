CREATE TABLE t_p15395438_addict_clinic_site.crm_task_files (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.crm_activities(id),
  user_id INTEGER NULL REFERENCES t_p15395438_addict_clinic_site.crm_users(id),
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  s3_key TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 0,
  content_type VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX crm_task_files_task_idx ON t_p15395438_addict_clinic_site.crm_task_files (task_id);