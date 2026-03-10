
-- Bot response templates (editable via WhatsApp or CRM)
CREATE TABLE public.bot_response_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  template_label text NOT NULL,
  response_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bot_response_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to bot_response_templates" ON public.bot_response_templates FOR ALL TO public USING (true) WITH CHECK (true);

-- Seed default templates
INSERT INTO public.bot_response_templates (template_key, template_label, response_text) VALUES
('welcome', 'Welcome Message', 'Welcome to F19 Tattoo Studio 🔥\nHey {{name}}! We''d love to help you plan your tattoo.'),
('pricing', 'Pricing Message', '💰 Our pricing:\n• ₹800/sq inch\n• ₹4,000/hour\n• ₹25,000 full day\n\nOur artist can give you an exact quote. Want me to connect you?'),
('artist_contact', 'Artist Contact Message', 'Our artist will help you finalize the design and give you the exact price. 🎨✨\n\nWhat would you like to do next?'),
('booking_request', 'Booking Request Received', '📩 Appointment Request Received\n\nYour request has been sent to our studio team.\nWe will confirm your slot shortly.'),
('booking_confirmed', 'Booking Confirmed', '✅ Booking Confirmed!\n\n📅 {{date}}\n🕐 {{time}}\n📍 F19 Tattoo Studio, Kothrud, Pune\n\nPlease arrive 15 minutes early. See you soon! 🎨🔥'),
('booking_rejected', 'Booking Rejected', 'Sorry, that slot is unavailable. Please choose another time.\n\nReply "Book" to see available slots or contact us at +91 7517050600.');

-- Campaigns table
CREATE TABLE public.campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_name text NOT NULL,
  message_content text NOT NULL,
  media_url text,
  cta_type text,
  cta_label text,
  status text NOT NULL DEFAULT 'draft',
  total_recipients integer NOT NULL DEFAULT 0,
  messages_sent integer NOT NULL DEFAULT 0,
  messages_delivered integer NOT NULL DEFAULT 0,
  messages_read integer NOT NULL DEFAULT 0,
  replies_received integer NOT NULL DEFAULT 0,
  bookings_generated integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to campaigns" ON public.campaigns FOR ALL TO public USING (true) WITH CHECK (true);

-- Campaign recipients
CREATE TABLE public.campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
  phone text NOT NULL,
  name text NOT NULL DEFAULT 'Unknown',
  status text NOT NULL DEFAULT 'pending',
  meta_message_id text,
  delivered_at timestamptz,
  read_at timestamptz,
  replied boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to campaign_recipients" ON public.campaign_recipients FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable realtime for campaigns
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_recipients;
