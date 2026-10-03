CREATE TABLE crm_users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  phone VARCHAR(50),
  role VARCHAR(30) NOT NULL DEFAULT 'manager',
  password_hash VARCHAR(300) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE crm_sessions (
  token VARCHAR(100) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES crm_users(id),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE crm_partners (
  id SERIAL PRIMARY KEY,
  name VARCHAR(250) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'agent',
  contact_person VARCHAR(200),
  phone VARCHAR(50),
  email VARCHAR(200),
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  notes TEXT,
  archived_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE crm_clients (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(250) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(200),
  birth_date DATE,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  source VARCHAR(50) NOT NULL DEFAULT 'site',
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  partner_id INTEGER REFERENCES crm_partners(id),
  manager_id INTEGER REFERENCES crm_users(id),
  notes TEXT,
  archived_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE crm_leads (
  id SERIAL PRIMARY KEY,
  name VARCHAR(250),
  contact VARCHAR(200) NOT NULL,
  topic VARCHAR(200),
  message TEXT,
  source VARCHAR(50) NOT NULL DEFAULT 'site',
  status VARCHAR(30) NOT NULL DEFAULT 'new',
  manager_id INTEGER REFERENCES crm_users(id),
  partner_id INTEGER REFERENCES crm_partners(id),
  client_id INTEGER REFERENCES crm_clients(id),
  archived_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE crm_deals (
  id SERIAL PRIMARY KEY,
  title VARCHAR(250) NOT NULL,
  client_id INTEGER REFERENCES crm_clients(id),
  partner_id INTEGER REFERENCES crm_partners(id),
  manager_id INTEGER REFERENCES crm_users(id),
  lead_id INTEGER REFERENCES crm_leads(id),
  stage VARCHAR(30) NOT NULL DEFAULT 'new',
  program VARCHAR(200),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  expected_close DATE,
  closed_at TIMESTAMP,
  notes TEXT,
  archived_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE crm_activities (
  id SERIAL PRIMARY KEY,
  entity_type VARCHAR(30) NOT NULL,
  entity_id INTEGER NOT NULL,
  user_id INTEGER REFERENCES crm_users(id),
  kind VARCHAR(30) NOT NULL DEFAULT 'note',
  text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_crm_leads_status ON crm_leads(status);
CREATE INDEX idx_crm_deals_stage ON crm_deals(stage);
CREATE INDEX idx_crm_clients_manager ON crm_clients(manager_id);
CREATE INDEX idx_crm_activities_entity ON crm_activities(entity_type, entity_id);
CREATE INDEX idx_crm_sessions_user ON crm_sessions(user_id);