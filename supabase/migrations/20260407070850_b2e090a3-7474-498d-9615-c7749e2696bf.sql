
CREATE TABLE public.instagram_faq (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.instagram_faq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to instagram_faq"
  ON public.instagram_faq
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
