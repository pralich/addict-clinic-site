CREATE TABLE IF NOT EXISTS t_p15395438_addict_clinic_site.shop_products (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(30) NOT NULL,
    title VARCHAR(200) NOT NULL,
    subtitle VARCHAR(300),
    description TEXT,
    price INTEGER NOT NULL,
    old_price INTEGER,
    image_url TEXT,
    badge VARCHAR(40),
    options TEXT,
    is_digital BOOLEAN NOT NULL DEFAULT FALSE,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    sort INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shop_products_cat ON t_p15395438_addict_clinic_site.shop_products(is_active, category, sort);

ALTER TABLE t_p15395438_addict_clinic_site.orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE t_p15395438_addict_clinic_site.orders ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE t_p15395438_addict_clinic_site.orders ADD COLUMN IF NOT EXISTS source VARCHAR(30);