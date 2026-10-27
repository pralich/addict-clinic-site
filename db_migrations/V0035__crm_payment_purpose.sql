ALTER TABLE t_p15395438_addict_clinic_site.crm_payments ADD COLUMN IF NOT EXISTS purpose VARCHAR(20) NOT NULL DEFAULT 'commission';
UPDATE t_p15395438_addict_clinic_site.crm_payments p SET purpose = 'treatment'
FROM t_p15395438_addict_clinic_site.crm_deals d
WHERE p.deal_id = d.id AND d.commission_type IS NOT NULL AND d.commission_value IS NOT NULL
  AND p.amount <> CASE WHEN d.commission_type = 'percent' THEN ROUND(d.amount * d.commission_value / 100) ELSE d.commission_value END;