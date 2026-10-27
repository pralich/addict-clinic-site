ALTER TABLE t_p15395438_addict_clinic_site.crm_leads
  ADD COLUMN form VARCHAR(40),
  ADD COLUMN channel VARCHAR(30),
  ADD COLUMN page_url VARCHAR(500),
  ADD COLUMN page_title VARCHAR(300),
  ADD COLUMN landing_url VARCHAR(500),
  ADD COLUMN referrer VARCHAR(500),
  ADD COLUMN utm_source VARCHAR(150),
  ADD COLUMN utm_medium VARCHAR(150),
  ADD COLUMN utm_campaign VARCHAR(250),
  ADD COLUMN utm_content VARCHAR(250),
  ADD COLUMN utm_term VARCHAR(250),
  ADD COLUMN click_id VARCHAR(250),
  ADD COLUMN ym_client_id VARCHAR(50),
  ADD COLUMN device VARCHAR(20),
  ADD COLUMN first_visit_at TIMESTAMP;
CREATE INDEX idx_crm_leads_channel ON t_p15395438_addict_clinic_site.crm_leads(channel);
CREATE INDEX idx_crm_leads_utm_campaign ON t_p15395438_addict_clinic_site.crm_leads(utm_campaign);