
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  log_type text NOT NULL DEFAULT 'error',
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL,
  details jsonb DEFAULT '{}',
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  is_resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to system_logs" ON public.system_logs FOR ALL TO public USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;
