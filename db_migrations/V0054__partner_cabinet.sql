CREATE TABLE t_p15395438_addict_clinic_site.partner_users (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.crm_partners(id),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  phone VARCHAR(50) NULL,
  password_hash VARCHAR(200) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP NULL,
  created_by INTEGER NULL REFERENCES t_p15395438_addict_clinic_site.crm_users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX partner_users_partner_idx ON t_p15395438_addict_clinic_site.partner_users (partner_id);

CREATE TABLE t_p15395438_addict_clinic_site.partner_sessions (
  token VARCHAR(100) PRIMARY KEY,
  partner_user_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.partner_users(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE t_p15395438_addict_clinic_site.partner_patients (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.crm_partners(id),
  deal_id INTEGER NULL UNIQUE REFERENCES t_p15395438_addict_clinic_site.crm_deals(id),
  client_id INTEGER NULL REFERENCES t_p15395438_addict_clinic_site.crm_clients(id),
  full_name VARCHAR(250) NOT NULL,
  birth_date DATE NULL,
  phone VARCHAR(50) NULL,
  rep_name VARCHAR(250) NULL,
  rep_phone VARCHAR(50) NULL,
  program VARCHAR(200) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'expected',
  admitted_at DATE NULL,
  planned_discharge DATE NULL,
  discharged_at DATE NULL,
  room VARCHAR(100) NULL,
  doctor VARCHAR(200) NULL,
  diagnosis TEXT NULL,
  condition VARCHAR(30) NULL,
  notes TEXT NULL,
  created_by INTEGER NULL REFERENCES t_p15395438_addict_clinic_site.partner_users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX partner_patients_partner_idx ON t_p15395438_addict_clinic_site.partner_patients (partner_id, status);

CREATE TABLE t_p15395438_addict_clinic_site.partner_patient_notes (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.partner_patients(id),
  partner_user_id INTEGER NULL REFERENCES t_p15395438_addict_clinic_site.partner_users(id),
  crm_user_id INTEGER NULL REFERENCES t_p15395438_addict_clinic_site.crm_users(id),
  kind VARCHAR(30) NOT NULL DEFAULT 'note',
  condition VARCHAR(30) NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX partner_patient_notes_patient_idx ON t_p15395438_addict_clinic_site.partner_patient_notes (patient_id, created_at DESC);