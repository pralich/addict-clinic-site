CREATE TABLE t_p15395438_addict_clinic_site.crm_broadcasts (
  id SERIAL PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  body VARCHAR(500) NOT NULL,
  url VARCHAR(500) NULL,
  audience JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP NULL,
  finished_at TIMESTAMP NULL,
  recipients INTEGER NOT NULL DEFAULT 0,
  devices INTEGER NOT NULL DEFAULT 0,
  delivered INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_crm_broadcasts_due ON t_p15395438_addict_clinic_site.crm_broadcasts(scheduled_at) WHERE status IN ('scheduled', 'sending');

CREATE TABLE t_p15395438_addict_clinic_site.crm_broadcast_queue (
  id SERIAL PRIMARY KEY,
  broadcast_id INTEGER NOT NULL,
  kind VARCHAR(10) NOT NULL,
  person_id INTEGER NOT NULL,
  sub_id INTEGER NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'pending',
  UNIQUE (broadcast_id, kind, sub_id)
);
CREATE INDEX idx_crm_broadcast_queue_pending ON t_p15395438_addict_clinic_site.crm_broadcast_queue(broadcast_id) WHERE status = 'pending';