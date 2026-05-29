
-- Helper function (create if missing)
CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'utility',
  status text NOT NULL DEFAULT 'approved',
  language text NOT NULL DEFAULT 'en',
  body_text text NOT NULL,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  buttons jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta_template_name text,
  quality_rating text,
  is_favorite boolean NOT NULL DEFAULT false,
  usage_count integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  source text NOT NULL DEFAULT 'local',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_templates TO authenticated;
GRANT ALL ON public.message_templates TO service_role;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read templates" ON public.message_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage templates" ON public.message_templates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON public.message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_status ON public.message_templates(status);

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  trigger_event text NOT NULL,
  template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL,
  delay_hours integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automation_rules TO authenticated;
GRANT ALL ON public.automation_rules TO service_role;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage automation rules" ON public.automation_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.message_templates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_template_id ON public.whatsapp_messages(template_id);

CREATE TRIGGER trg_message_templates_updated BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
CREATE TRIGGER trg_automation_rules_updated BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

INSERT INTO public.message_templates (name, category, status, body_text, variables, buttons) VALUES
('appointment_confirmation', 'utility', 'approved',
  E'Hey {{client_name}} 👋\nYour tattoo appointment at *F19 Tattoo Studio* is confirmed ✅\n\n📅 Date: {{appointment_date}}\n⏰ Time: {{appointment_time}}\n🎨 Artist: {{artist_name}}\n\nPlease arrive 10 minutes early.\nReply here if you need help.',
  '["client_name","appointment_date","appointment_time","artist_name"]'::jsonb,
  '[{"type":"url","label":"📍 Studio Location","value":"https://maps.google.com/?q=F19+Tattoo+Studio"},{"type":"quick_reply","label":"💬 Talk to Artist"}]'::jsonb),
('appointment_reminder', 'utility', 'approved',
  E'Reminder ⏰\nHey {{client_name}},\nYour tattoo appointment is tomorrow with {{artist_name}} at F19 Tattoo Studio 🔥\n\nWe''re excited to ink your idea ✨',
  '["client_name","artist_name"]'::jsonb,
  '[{"type":"quick_reply","label":"Confirm Appointment"},{"type":"quick_reply","label":"Reschedule"}]'::jsonb),
('payment_pending', 'utility', 'approved',
  E'Hey {{client_name}},\nYour pending amount for the tattoo session is ₹{{remaining_amount}}.\n\nPlease complete payment before appointment to avoid delays 🙌',
  '["client_name","remaining_amount"]'::jsonb,
  '[{"type":"url","label":"Pay Now","value":"https://f19tattoo.com/pay"},{"type":"quick_reply","label":"Talk to Support"}]'::jsonb),
('design_ready', 'utility', 'approved',
  E'Your tattoo design is ready 🎨✨\n\nArtist: {{artist_name}}\nDesign Type: {{tattoo_style}}\n\nPlease review and confirm changes if needed.',
  '["artist_name","tattoo_style"]'::jsonb,
  '[{"type":"url","label":"View Design","value":"{{design_url}}"},{"type":"quick_reply","label":"Approve Design"}]'::jsonb),
('aftercare', 'utility', 'approved',
  E'Thank you for getting tattooed at F19 Tattoo Studio ❤️\n\nTattoo Aftercare:\nDRY HEALING\n\n- Clean the tattoo 3 times in a day with sterile water or RO water for 7-10 days after the tattoo is done.\n- Do not apply any kind of moisturisers or cream on the tattoo for the next 7-10 days.\n- Avoid chlorine water, swimming, beaches, direct sunlight and Wear loose full sleeves to protect your tattoo from the sun.\n- Don''t apply soap on tattoo while bathing. Wash the tattoo separately.\n- Do not peel the scabs, let it come off on its own.\n- No exercise/gym or any other sweat related activity for first 2 weeks\n- After 3 days you can start applying Calendula cream on the tattoo.\nDM us anytime for help 🙌',
  '[]'::jsonb,
  '[{"type":"url","label":"Aftercare Guide","value":"https://f19tattoo.com/aftercare"},{"type":"quick_reply","label":"WhatsApp Support"}]'::jsonb),
('instagram_welcome', 'marketing', 'approved',
  E'Hey {{client_name}} 👋\nThanks for connecting with *F19 Tattoo Studio* 🔥\n\nWe create:\n🎨 Custom Tattoos\n🖤 Minimal Tattoos\n⚡ Realism\n🕉 Spiritual Tattoos\n👑 Anime Tattoos\n\nCheck our portfolio below 👇',
  '["client_name"]'::jsonb,
  '[{"type":"url","label":"📸 Instagram Portfolio","value":"https://instagram.com/f19tattoostudio"},{"type":"quick_reply","label":"🔥 Book Consultation"}]'::jsonb),
('followup', 'marketing', 'approved',
  E'Hey {{client_name}},\nStill thinking about your tattoo idea? 👀\n\nOur artists can help you create a custom design specially for you ✨\n\nThis week slots are filling fast.',
  '["client_name"]'::jsonb,
  '[{"type":"quick_reply","label":"🎨 Get Free Consultation"},{"type":"quick_reply","label":"📅 Book Appointment"}]'::jsonb),
('cold_lead_reactivation', 'marketing', 'approved',
  E'Hey {{client_name}} 👋\nWe noticed you were interested in a tattoo earlier.\n\nWe''d love to help you bring your idea to life 🔥\n\nSpecial consultation available this week.',
  '["client_name"]'::jsonb,
  '[{"type":"quick_reply","label":"Talk to Tattoo Expert"},{"type":"quick_reply","label":"View Tattoo Styles"}]'::jsonb),
('festival_offer', 'marketing', 'approved',
  E'🔥 Limited Tattoo Offer at F19 Tattoo Studio 🔥\n\n✅ Custom Designs\n✅ Professional Artists\n✅ Hygienic Studio\n✅ Premium Ink\n\nBook now and reserve your slot.',
  '[]'::jsonb,
  '[{"type":"quick_reply","label":"Book Now"},{"type":"url","label":"Instagram Portfolio","value":"https://instagram.com/f19tattoostudio"}]'::jsonb),
('review_request', 'marketing', 'approved',
  E'Hey {{client_name}} ❤️\nHope you loved your tattoo experience with us.\n\nYour review helps our studio grow 🙌',
  '["client_name"]'::jsonb,
  '[{"type":"url","label":"⭐ Leave Review","value":"https://g.page/r/f19tattoo/review"},{"type":"quick_reply","label":"📸 Share Tattoo Photo"}]'::jsonb)
ON CONFLICT DO NOTHING;

INSERT INTO public.automation_rules (rule_name, trigger_event, delay_hours, is_active) VALUES
('Welcome new lead', 'lead_created', 0, false),
('Appointment reminder 24h', 'appointment_24h_before', 0, false),
('Follow-up after no reply', 'no_reply_48h', 48, false),
('Review request after tattoo', 'tattoo_completed', 24, false),
('Reactivate inactive leads', 'inactive_30d', 0, false),
('Birthday wishes', 'birthday', 0, false),
('Repeat client offer', 'repeat_client_60d', 0, false)
ON CONFLICT DO NOTHING;
