CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.crm_task_comments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.crm_activities(id),
  user_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_users(id),
  text TEXT NOT NULL,
  notified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_task_comments_task ON t_p15395438_addict_clinic_site.crm_task_comments(task_id, created_at);
ALTER TABLE t_p15395438_addict_clinic_site.crm_activities
  ADD COLUMN IF NOT EXISTS result_text TEXT,
  ADD COLUMN IF NOT EXISTS assign_notified_to INTEGER,
  ADD COLUMN IF NOT EXISTS due_notified_at TIMESTAMP;
UPDATE t_p15395438_addict_clinic_site.crm_activities SET assign_notified_to = assignee_id, due_notified_at = NOW() WHERE kind = 'task';
ALTER TABLE t_p15395438_addict_clinic_site.crm_push_subs ADD COLUMN IF NOT EXISTS notify_tasks BOOLEAN NOT NULL DEFAULT TRUE;