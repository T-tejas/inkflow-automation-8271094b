
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS review_link text,
  ADD COLUMN IF NOT EXISTS qr_code_url text,
  ADD COLUMN IF NOT EXISTS review_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS qr_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_72h_sent boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_reviews_token ON public.reviews(token);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
