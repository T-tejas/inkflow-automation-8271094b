ALTER TABLE public.whatsapp_messages 
ADD COLUMN IF NOT EXISTS message_type text DEFAULT 'text',
ADD COLUMN IF NOT EXISTS media_url text,
ADD COLUMN IF NOT EXISTS file_name text;