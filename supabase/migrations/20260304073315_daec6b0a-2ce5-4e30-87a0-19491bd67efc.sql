
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS message_body text,
  ADD COLUMN IF NOT EXISTS is_internal_note boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS starred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;
