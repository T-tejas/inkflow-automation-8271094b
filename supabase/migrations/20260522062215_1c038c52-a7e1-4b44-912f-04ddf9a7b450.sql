
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS client_name text,
  ADD COLUMN IF NOT EXISTS client_phone text,
  ADD COLUMN IF NOT EXISTS artist_name text,
  ADD COLUMN IF NOT EXISTS tattoo_style text,
  ADD COLUMN IF NOT EXISTS placement text,
  ADD COLUMN IF NOT EXISTS generated_reviews jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS final_review_text text,
  ADD COLUMN IF NOT EXISTS posted_to_google boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_redirected_at timestamptz,
  ADD COLUMN IF NOT EXISTS tone text DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS admin_reply text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS token text;

ALTER TABLE public.reviews ALTER COLUMN rating DROP NOT NULL;
ALTER TABLE public.reviews ALTER COLUMN lead_id DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS reviews_token_idx ON public.reviews(token);
CREATE INDEX IF NOT EXISTS reviews_rating_idx ON public.reviews(rating);
CREATE INDEX IF NOT EXISTS reviews_artist_idx ON public.reviews(artist_name);
