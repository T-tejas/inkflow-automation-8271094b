
-- 1. lead_notes table
CREATE TABLE public.lead_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  artist_name text NOT NULL DEFAULT '',
  note_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to lead_notes" ON public.lead_notes FOR ALL USING (true) WITH CHECK (true);

-- 2. tattoo_completions table
CREATE TABLE public.tattoo_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  client_id_code text NOT NULL,
  artist_name text NOT NULL,
  tattoo_price numeric NOT NULL DEFAULT 0,
  photo_urls text[] NOT NULL DEFAULT '{}',
  aftercare_notes text DEFAULT '',
  invoice_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tattoo_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tattoo_completions" ON public.tattoo_completions FOR ALL USING (true) WITH CHECK (true);

-- 3. consent_forms table
CREATE TABLE public.consent_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  signature_data text,
  consent_text text NOT NULL,
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to consent_forms" ON public.consent_forms FOR ALL USING (true) WITH CHECK (true);

-- 4. Add client_id_code to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS client_id_code text;

-- 5. Enable realtime for lead_notes
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_notes;
