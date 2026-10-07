UPDATE t_p15395438_addict_clinic_site.crm_deals SET archived_at = NOW() WHERE external_id LIKE 'selftest-%';
UPDATE t_p15395438_addict_clinic_site.crm_leads SET archived_at = NOW(), status = 'rejected' WHERE external_id LIKE 'selftest-%';
UPDATE t_p15395438_addict_clinic_site.crm_clients SET archived_at = NOW() WHERE external_id LIKE 'selftest-%';
UPDATE t_p15395438_addict_clinic_site.crm_api_keys SET is_active = FALSE, revoked_at = NOW() WHERE key_prefix = 'ac_test_';