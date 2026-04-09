
-- Add follow-up fields to leads table
ALTER TABLE public.leads
ADD COLUMN next_followup_date date DEFAULT NULL,
ADD COLUMN last_contacted_at timestamp with time zone DEFAULT NULL;

-- Index for fast follow-up date queries
CREATE INDEX idx_leads_next_followup_date ON public.leads (next_followup_date) WHERE next_followup_date IS NOT NULL;
