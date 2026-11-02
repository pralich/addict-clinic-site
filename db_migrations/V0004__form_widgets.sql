CREATE TABLE IF NOT EXISTS crm_form_widgets (
  id SERIAL PRIMARY KEY,
  token VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  project VARCHAR(20) NOT NULL DEFAULT 'addict',
  domains TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  leads_count INTEGER NOT NULL DEFAULT 0,
  last_lead_at TIMESTAMP NULL,
  created_by INTEGER NULL REFERENCES crm_users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS crm_form_widget_hits (
  id SERIAL PRIMARY KEY,
  widget_id INTEGER NOT NULL REFERENCES crm_form_widgets(id),
  ip VARCHAR(64),
  lead_id INTEGER NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS crm_form_widget_hits_ip_idx ON crm_form_widget_hits (ip, created_at);