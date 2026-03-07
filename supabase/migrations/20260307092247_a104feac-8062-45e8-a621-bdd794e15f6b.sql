
-- Create design_tasks table
CREATE TABLE public.design_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  design_type TEXT NOT NULL DEFAULT 'paid' CHECK (design_type IN ('paid', 'free')),
  design_fee NUMERIC NOT NULL DEFAULT 0,
  fee_status TEXT NOT NULL DEFAULT 'pending' CHECK (fee_status IN ('paid', 'pending')),
  design_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  design_due_date DATE NOT NULL,
  final_tattoo_date DATE,
  design_status TEXT NOT NULL DEFAULT 'Pending' CHECK (design_status IN ('Pending', 'Designing', 'Design Sent', 'Approved', 'Tattoo Completed')),
  reference_images TEXT[] NOT NULL DEFAULT '{}',
  final_design_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.design_tasks ENABLE ROW LEVEL SECURITY;

-- Permissive policy (matches existing CRM tables)
CREATE POLICY "Allow all access to design_tasks" ON public.design_tasks FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for design files
INSERT INTO storage.buckets (id, name, public) VALUES ('design-files', 'design-files', true);

-- Storage RLS policies
CREATE POLICY "Allow public read design-files" ON storage.objects FOR SELECT USING (bucket_id = 'design-files');
CREATE POLICY "Allow authenticated upload design-files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'design-files');
CREATE POLICY "Allow authenticated delete design-files" ON storage.objects FOR DELETE USING (bucket_id = 'design-files');
