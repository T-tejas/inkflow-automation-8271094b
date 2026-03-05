
CREATE TABLE public.whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can manage whatsapp_settings"
  ON public.whatsapp_settings
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default keys
INSERT INTO public.whatsapp_settings (setting_key, setting_value) VALUES
  ('facebook_app_id', ''),
  ('facebook_app_secret', ''),
  ('access_token', ''),
  ('whatsapp_business_account_id', ''),
  ('webhook_url', ''),
  ('webhook_enabled', 'false'),
  ('google_calendar_connected', 'false'),
  ('google_calendar_account', ''),
  ('calendar_sync_enabled', 'false');
