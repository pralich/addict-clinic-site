CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.crm_fin_ops (
    id SERIAL PRIMARY KEY,
    kind VARCHAR(10) NOT NULL,
    category VARCHAR(60) NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    op_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    counterparty VARCHAR(200),
    deal_id INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_deals(id),
    created_by INTEGER REFERENCES t_p15395438_addict_clinic_site.crm_users(id),
    archived_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crm_fin_ops_date ON t_p15395438_addict_clinic_site.crm_fin_ops(op_date);
CREATE INDEX IF NOT EXISTS idx_crm_deals_closed ON t_p15395438_addict_clinic_site.crm_deals(stage, closed_at);