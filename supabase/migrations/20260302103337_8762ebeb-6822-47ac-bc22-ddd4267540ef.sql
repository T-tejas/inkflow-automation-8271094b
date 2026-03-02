
-- Fix leads table: drop restrictive policy, create permissive one
DROP POLICY IF EXISTS "Allow all access to leads" ON public.leads;
CREATE POLICY "Allow all access to leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);

-- Fix whatsapp_messages table too
DROP POLICY IF EXISTS "Allow all access to whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Allow all access to whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
