ALTER TABLE public.whatsapp_messages
  DROP CONSTRAINT IF EXISTS whatsapp_messages_template_type_check;

ALTER TABLE public.whatsapp_messages
  ADD CONSTRAINT whatsapp_messages_template_type_check
  CHECK (template_type = ANY (ARRAY[
    'confirmation'::text,
    'reminder'::text,
    'promo'::text,
    'note'::text,
    'incoming'::text,
    'utility'::text,
    'marketing'::text,
    'authentication'::text,
    'template'::text
  ]));