
-- Drop existing check constraint on status and add "received" 
ALTER TABLE public.whatsapp_messages DROP CONSTRAINT IF EXISTS whatsapp_messages_status_check;
ALTER TABLE public.whatsapp_messages ADD CONSTRAINT whatsapp_messages_status_check CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'note', 'received'));
