ALTER TABLE t_p15395438_addict_clinic_site.crm_deals
  ADD COLUMN IF NOT EXISTS commission_type VARCHAR(10),
  ADD COLUMN IF NOT EXISTS commission_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS payment_schedule VARCHAR(20),
  ADD COLUMN IF NOT EXISTS next_payment_date DATE,
  ADD COLUMN IF NOT EXISTS next_payment_amount NUMERIC(14,2);