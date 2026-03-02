
-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'WhatsApp',
  whatsapp_opt_in BOOLEAN NOT NULL DEFAULT true,
  tattoo_style TEXT DEFAULT 'Other',
  size TEXT DEFAULT 'Medium (4-6 in)',
  placement TEXT DEFAULT '',
  budget TEXT DEFAULT '',
  preferred_date TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'New Lead',
  tags TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Public read/write for now (no auth yet)
CREATE POLICY "Allow all access to leads"
ON public.leads FOR ALL
USING (true)
WITH CHECK (true);

-- Add delivery status tracking columns to whatsapp_messages
ALTER TABLE public.whatsapp_messages
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Enable realtime for leads
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
