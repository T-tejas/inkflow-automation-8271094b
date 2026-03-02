
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Allow all access to leads" ON public.leads;
CREATE POLICY "Allow all access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to lead_interactions" ON public.lead_interactions;
CREATE POLICY "Allow all access to lead_interactions" ON public.lead_interactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Allow all access to whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
