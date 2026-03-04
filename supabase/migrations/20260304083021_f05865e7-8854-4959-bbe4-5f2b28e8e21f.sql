ALTER TABLE public.whatsapp_messages DROP CONSTRAINT whatsapp_messages_status_check;
ALTER TABLE public.whatsapp_messages ADD CONSTRAINT whatsapp_messages_status_check CHECK (status = ANY (ARRAY['sent','delivered','read','failed','note']));

ALTER TABLE public.whatsapp_messages DROP CONSTRAINT whatsapp_messages_template_type_check;
ALTER TABLE public.whatsapp_messages ADD CONSTRAINT whatsapp_messages_template_type_check CHECK (template_type = ANY (ARRAY['confirmation','reminder','promo','note','incoming']));