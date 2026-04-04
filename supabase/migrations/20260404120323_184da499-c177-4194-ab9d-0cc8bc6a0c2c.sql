
-- Add instagram_username to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS instagram_username text DEFAULT NULL;

-- Create instagram_messages table
CREATE TABLE public.instagram_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_name text NOT NULL,
  lead_phone text NOT NULL DEFAULT '',
  instagram_username text NOT NULL DEFAULT '',
  instagram_sender_id text NOT NULL DEFAULT '',
  message_body text,
  message_type text DEFAULT 'text',
  media_url text,
  file_name text,
  direction text NOT NULL DEFAULT 'incoming', -- incoming / outgoing
  status text NOT NULL DEFAULT 'received',
  delivery_status text DEFAULT 'sent',
  meta_message_id text,
  error_message text,
  is_internal_note boolean NOT NULL DEFAULT false,
  starred boolean NOT NULL DEFAULT false,
  is_escalated boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instagram_messages ENABLE ROW LEVEL SECURITY;

-- Permissive policy (matching existing pattern)
CREATE POLICY "Allow all access to instagram_messages" ON public.instagram_messages
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.instagram_messages;

-- Instagram bot state tracking
CREATE TABLE public.instagram_bot_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instagram_sender_id text NOT NULL UNIQUE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  bot_enabled boolean NOT NULL DEFAULT true,
  current_step text NOT NULL DEFAULT 'greeting',
  collected_data jsonb NOT NULL DEFAULT '{}',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  followup_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_bot_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to instagram_bot_state" ON public.instagram_bot_state
  FOR ALL TO public USING (true) WITH CHECK (true);
