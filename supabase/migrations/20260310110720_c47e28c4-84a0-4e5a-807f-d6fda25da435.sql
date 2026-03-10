
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS timeline text DEFAULT NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_score text DEFAULT NULL;

ALTER TABLE public.crm_notifications ADD COLUMN IF NOT EXISTS lead_score text DEFAULT NULL;
ALTER TABLE public.crm_notifications ADD COLUMN IF NOT EXISTS timeline text DEFAULT NULL;
ALTER TABLE public.crm_notifications ADD COLUMN IF NOT EXISTS chat_summary text DEFAULT NULL;
