
-- Chatbot auto-reply rules table
CREATE TABLE public.chatbot_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keywords text[] NOT NULL DEFAULT '{}',
  reply_text text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chatbot_rules ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated access (admin-only enforced in UI)
CREATE POLICY "Allow all access to chatbot_rules" ON public.chatbot_rules
  FOR ALL USING (true) WITH CHECK (true);

-- Seed default rules
INSERT INTO public.chatbot_rules (keywords, reply_text, priority) VALUES
  (ARRAY['price', 'cost', 'rate', 'charge', 'kitna', 'price list'], 'Tattoo price depends on size, design complexity and placement. Please send your design reference for an accurate quote. 💰', 10),
  (ARRAY['appointment', 'booking', 'book', 'slot', 'available', 'schedule'], 'We''d love to book you in! Please share your preferred date and time, and we''ll confirm availability. 📅', 9),
  (ARRAY['location', 'address', 'where', 'directions', 'map', 'studio'], 'Our studio is located at F19 Tattoo Studio. Send us a message for exact directions! 📍', 8),
  (ARRAY['design', 'tattoo', 'style', 'custom', 'flash'], 'We do all styles — Traditional, Realism, Watercolor, Minimal, Portrait & more! Share your design idea or reference image and we''ll create something amazing. 🎨', 7),
  (ARRAY['hi', 'hello', 'hey', 'hii', 'namaste'], 'Hey there! 👋 Welcome to F19 Tattoo Studio. How can we help you today?', 5);

-- Add escalated flag to whatsapp_messages for unmatched messages
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS is_escalated boolean NOT NULL DEFAULT false;

-- Enable realtime for chatbot_rules
ALTER PUBLICATION supabase_realtime ADD TABLE public.chatbot_rules;
