
-- Inventory items table for all categories
CREATE TABLE public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'Needles',
  item_name text NOT NULL,
  needle_type text, -- RL, RS, M1, M2, CM, TM, Bugpin (null for non-needle items)
  gauge text, -- e.g. 0.30mm, 0.35mm
  grouping text, -- e.g. 9RL, 7RS, 13M1
  purpose_notes text,
  supplier text DEFAULT '',
  quantity_in_stock integer NOT NULL DEFAULT 0,
  minimum_required integer NOT NULL DEFAULT 5,
  cost_per_unit numeric(10,2) NOT NULL DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to inventory_items" ON public.inventory_items
  FOR ALL USING (true) WITH CHECK (true);

-- Needle usage log for tracking deductions
CREATE TABLE public.needle_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  quantity_used integer NOT NULL DEFAULT 1,
  usage_type text NOT NULL DEFAULT 'auto', -- 'auto' or 'manual'
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.needle_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to needle_usage_log" ON public.needle_usage_log
  FOR ALL USING (true) WITH CHECK (true);
