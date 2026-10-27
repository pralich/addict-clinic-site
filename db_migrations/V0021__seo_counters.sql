CREATE TABLE t_p15395438_addict_clinic_site.seo_counters (
  kind VARCHAR(40) PRIMARY KEY,
  value VARCHAR(300) NOT NULL DEFAULT '',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by INTEGER,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
INSERT INTO t_p15395438_addict_clinic_site.seo_counters (kind, value, enabled) VALUES ('yandex_metrika', '101026698', TRUE) ON CONFLICT (kind) DO NOTHING;