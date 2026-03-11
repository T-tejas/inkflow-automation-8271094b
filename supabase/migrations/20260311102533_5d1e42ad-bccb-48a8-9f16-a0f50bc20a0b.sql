
-- Create dedicated artists table
CREATE TABLE public.artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(name)
);

-- Enable RLS
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- Allow all access (matches existing app pattern)
CREATE POLICY "Allow all access to artists"
  ON public.artists
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Seed from existing data: collect unique case-normalized artist names
INSERT INTO public.artists (name)
SELECT DISTINCT initcap(lower(trim(artist_name)))
FROM (
  SELECT artist_name FROM public.design_tasks WHERE artist_name IS NOT NULL AND trim(artist_name) != ''
  UNION
  SELECT artist_name FROM public.lead_notes WHERE artist_name IS NOT NULL AND trim(artist_name) != ''
  UNION
  SELECT artist_name FROM public.tattoo_completions WHERE artist_name IS NOT NULL AND trim(artist_name) != ''
) all_artists
ON CONFLICT (name) DO NOTHING;
