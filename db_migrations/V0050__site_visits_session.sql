ALTER TABLE t_p15395438_addict_clinic_site.site_visits ADD COLUMN session_key VARCHAR(64);
CREATE UNIQUE INDEX idx_site_visits_session ON t_p15395438_addict_clinic_site.site_visits(session_key);