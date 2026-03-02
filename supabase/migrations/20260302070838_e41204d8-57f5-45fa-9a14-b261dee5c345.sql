
-- WhatsApp message log table
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_phone TEXT NOT NULL,
  lead_name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('confirmation', 'reminder', 'promo')),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  meta_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (no auth yet - internal CRM tool)
CREATE POLICY "Allow all access to whatsapp_messages"
ON public.whatsapp_messages
FOR ALL
USING (true)
WITH CHECK (true);
