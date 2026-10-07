CREATE TABLE t_p15395438_addict_clinic_site.seo_sitemaps (
  id SERIAL PRIMARY KEY,
  xml TEXT NOT NULL,
  urls_count INTEGER NOT NULL DEFAULT 0,
  articles_count INTEGER NOT NULL DEFAULT 0,
  file_url TEXT,
  created_by INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_seo_sitemaps_created ON t_p15395438_addict_clinic_site.seo_sitemaps(created_at DESC);