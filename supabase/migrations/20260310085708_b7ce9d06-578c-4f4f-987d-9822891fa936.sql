-- Create CRM notifications table for hot lead alerts
CREATE TABLE public.crm_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  lead_name text NOT NULL,
  lead_phone text NOT NULL,
  notification_type text NOT NULL DEFAULT 'artist_consultation',
  tattoo_idea text,
  placement text,
  size text,
  budget text,
  lead_source text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to crm_notifications"
  ON public.crm_notifications
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_notifications;