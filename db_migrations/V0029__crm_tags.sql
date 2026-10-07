CREATE TABLE t_p15395438_addict_clinic_site.crm_tags (
  id SERIAL PRIMARY KEY,
  grp VARCHAR(20) NOT NULL,
  name VARCHAR(80) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'slate',
  sort INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (grp, name)
);
INSERT INTO t_p15395438_addict_clinic_site.crm_tags (grp, name, color, sort) VALUES
('addiction', 'Алкоголизм', 'amber', 10),
('addiction', 'Наркомания', 'red', 20),
('addiction', 'Лекарственная', 'orange', 30),
('addiction', 'Игромания', 'violet', 40),
('addiction', 'Созависимость', 'pink', 50),
('addiction', 'Пищевое поведение', 'lime', 60),
('addiction', 'Никотин', 'stone', 70),
('addiction', 'Интернет-зависимость', 'cyan', 80),
('addiction', 'Депрессия и тревога', 'indigo', 90),
('service', 'Вывод из запоя', 'rose', 10),
('service', 'Детоксикация', 'red', 20),
('service', 'Вызов нарколога на дом', 'orange', 30),
('service', 'Кодирование', 'yellow', 40),
('service', 'Стационар', 'blue', 50),
('service', 'Реабилитация', 'emerald', 60),
('service', 'Психотерапия', 'teal', 70),
('service', 'Консультация близких', 'pink', 80),
('service', 'Мотивация к лечению', 'sky', 90),
('service', 'Абилитация', 'green', 100),
('service', 'PREMIUM', 'slate', 110);
ALTER TABLE t_p15395438_addict_clinic_site.crm_leads ADD COLUMN IF NOT EXISTS tags INTEGER[] NOT NULL DEFAULT '{}';
ALTER TABLE t_p15395438_addict_clinic_site.crm_deals ADD COLUMN IF NOT EXISTS tags INTEGER[] NOT NULL DEFAULT '{}';
ALTER TABLE t_p15395438_addict_clinic_site.crm_clients ADD COLUMN IF NOT EXISTS tags INTEGER[] NOT NULL DEFAULT '{}';
ALTER TABLE t_p15395438_addict_clinic_site.crm_partners ADD COLUMN IF NOT EXISTS tags INTEGER[] NOT NULL DEFAULT '{}';
CREATE INDEX idx_crm_leads_tags ON t_p15395438_addict_clinic_site.crm_leads USING GIN (tags);
CREATE INDEX idx_crm_deals_tags ON t_p15395438_addict_clinic_site.crm_deals USING GIN (tags);
CREATE INDEX idx_crm_clients_tags ON t_p15395438_addict_clinic_site.crm_clients USING GIN (tags);
CREATE INDEX idx_crm_partners_tags ON t_p15395438_addict_clinic_site.crm_partners USING GIN (tags);