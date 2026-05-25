INSERT INTO public.whatsapp_settings (setting_key, setting_value)
VALUES ('whatsapp_business_account_id', '1182197167221668')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now();