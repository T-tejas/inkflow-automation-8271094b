
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email text;

INSERT INTO public.whatsapp_settings (setting_key, setting_value)
VALUES ('website_intake_template', 'appointment_confirmation')
ON CONFLICT DO NOTHING;
