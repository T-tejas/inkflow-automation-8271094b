
-- Create reviews table
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL,
  review_text text,
  source text NOT NULL DEFAULT 'whatsapp',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Allow all access
CREATE POLICY "Allow all access to reviews"
  ON public.reviews
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reviews;

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('tattoo-photos', 'tattoo-photos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('consent-forms', 'consent-forms', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for tattoo-photos
CREATE POLICY "Public read tattoo-photos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'tattoo-photos');
CREATE POLICY "Auth upload tattoo-photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'tattoo-photos');
CREATE POLICY "Auth update tattoo-photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'tattoo-photos');
CREATE POLICY "Auth delete tattoo-photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'tattoo-photos');

-- Storage policies for consent-forms
CREATE POLICY "Public read consent-forms" ON storage.objects FOR SELECT TO public USING (bucket_id = 'consent-forms');
CREATE POLICY "Auth upload consent-forms" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'consent-forms');
CREATE POLICY "Auth update consent-forms" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'consent-forms');
CREATE POLICY "Auth delete consent-forms" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'consent-forms');

-- Storage policies for invoices
CREATE POLICY "Public read invoices" ON storage.objects FOR SELECT TO public USING (bucket_id = 'invoices');
CREATE POLICY "Auth upload invoices" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'invoices');
CREATE POLICY "Auth update invoices" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'invoices');
CREATE POLICY "Auth delete invoices" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'invoices');
