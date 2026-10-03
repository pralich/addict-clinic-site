CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255) NOT NULL,
    user_phone VARCHAR(50),
    amount DECIMAL(10,2) NOT NULL,
    yookassa_payment_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    payment_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP,
    family_user_id INTEGER REFERENCES t_p15395438_addict_clinic_site.family_users(id),
    product_code VARCHAR(50),
    tokens INTEGER NOT NULL DEFAULT 0,
    applied_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES t_p15395438_addict_clinic_site.orders(id),
    product_id VARCHAR(100),
    product_name VARCHAR(255),
    product_price DECIMAL(10,2),
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON t_p15395438_addict_clinic_site.orders(yookassa_payment_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON t_p15395438_addict_clinic_site.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_family_user ON t_p15395438_addict_clinic_site.orders(family_user_id);

ALTER TABLE t_p15395438_addict_clinic_site.family_users ADD COLUMN IF NOT EXISTS token_balance INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.family_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.family_users(id),
    plan VARCHAR(50) NOT NULL,
    order_id INTEGER REFERENCES t_p15395438_addict_clinic_site.orders(id),
    starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_subs_user ON t_p15395438_addict_clinic_site.family_subscriptions(user_id, ends_at);

CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.family_token_tx (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES t_p15395438_addict_clinic_site.family_users(id),
    delta INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL,
    order_id INTEGER REFERENCES t_p15395438_addict_clinic_site.orders(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_token_tx_user ON t_p15395438_addict_clinic_site.family_token_tx(user_id, created_at);