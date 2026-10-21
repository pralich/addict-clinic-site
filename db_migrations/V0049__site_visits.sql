CREATE TABLE t_p15395438_addict_clinic_site.site_visits (
  id SERIAL PRIMARY KEY,
  visitor_id VARCHAR(64) NOT NULL,
  visit_no INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
  active_seconds INTEGER NOT NULL DEFAULT 0,
  current_path VARCHAR(500),
  current_title VARCHAR(300),
  landing_url VARCHAR(500),
  referrer VARCHAR(500),
  channel VARCHAR(30),
  utm_source VARCHAR(150),
  utm_medium VARCHAR(150),
  utm_campaign VARCHAR(250),
  utm_term VARCHAR(250),
  device VARCHAR(20),
  browser VARCHAR(60),
  city VARCHAR(100),
  pages JSONB NOT NULL DEFAULT '[]'::jsonb,
  events JSONB NOT NULL DEFAULT '[]'::jsonb,
  searches JSONB NOT NULL DEFAULT '[]'::jsonb,
  lead_id INTEGER
);
CREATE INDEX idx_site_visits_last_seen ON t_p15395438_addict_clinic_site.site_visits(last_seen);
CREATE INDEX idx_site_visits_visitor ON t_p15395438_addict_clinic_site.site_visits(visitor_id, last_seen);
ALTER TABLE t_p15395438_addict_clinic_site.crm_leads ADD COLUMN visitor_id VARCHAR(64);
CREATE INDEX idx_crm_leads_visitor ON t_p15395438_addict_clinic_site.crm_leads(visitor_id);