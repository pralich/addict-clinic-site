CREATE TABLE t_p15395438_addict_clinic_site.crm_counterparties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(250) NOT NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'company',
  inn VARCHAR(12),
  kpp VARCHAR(9),
  ogrn VARCHAR(15),
  address TEXT,
  bank VARCHAR(250),
  bik VARCHAR(9),
  account VARCHAR(20),
  corr_account VARCHAR(20),
  contact_person VARCHAR(250),
  phone VARCHAR(50),
  email VARCHAR(200),
  notes TEXT,
  archived_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE t_p15395438_addict_clinic_site.crm_invoices (
  id SERIAL PRIMARY KEY,
  number VARCHAR(40) NOT NULL UNIQUE,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  payer_type VARCHAR(20) NOT NULL,
  client_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_clients(id),
  partner_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_partners(id),
  counterparty_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_counterparties(id),
  deal_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_deals(id),
  items JSONB NOT NULL DEFAULT '[]',
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'issued',
  notes TEXT,
  created_by INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_users(id),
  archived_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_crm_invoices_client ON t_p15395438_addict_clinic_site.crm_invoices(client_id);
CREATE INDEX idx_crm_invoices_partner ON t_p15395438_addict_clinic_site.crm_invoices(partner_id);
CREATE INDEX idx_crm_invoices_cp ON t_p15395438_addict_clinic_site.crm_invoices(counterparty_id);
CREATE INDEX idx_crm_invoices_deal ON t_p15395438_addict_clinic_site.crm_invoices(deal_id);
CREATE INDEX idx_crm_invoices_date ON t_p15395438_addict_clinic_site.crm_invoices(issue_date);

CREATE TABLE t_p15395438_addict_clinic_site.crm_payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_invoices(id),
  payer_type VARCHAR(20) NOT NULL,
  client_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_clients(id),
  partner_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_partners(id),
  counterparty_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_counterparties(id),
  deal_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_deals(id),
  amount NUMERIC(14,2) NOT NULL,
  paid_at DATE NOT NULL DEFAULT CURRENT_DATE,
  method VARCHAR(20) NOT NULL DEFAULT 'bank',
  note TEXT,
  created_by INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_users(id),
  archived_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_crm_payments_invoice ON t_p15395438_addict_clinic_site.crm_payments(invoice_id);
CREATE INDEX idx_crm_payments_client ON t_p15395438_addict_clinic_site.crm_payments(client_id);
CREATE INDEX idx_crm_payments_partner ON t_p15395438_addict_clinic_site.crm_payments(partner_id);
CREATE INDEX idx_crm_payments_deal ON t_p15395438_addict_clinic_site.crm_payments(deal_id);
CREATE INDEX idx_crm_payments_date ON t_p15395438_addict_clinic_site.crm_payments(paid_at);

ALTER TABLE t_p15395438_addict_clinic_site.crm_deals ADD COLUMN IF NOT EXISTS check_in_date DATE;
ALTER TABLE t_p15395438_addict_clinic_site.crm_deals ADD COLUMN IF NOT EXISTS treatment_months NUMERIC(4,1);