
-- 1. Add columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_artist text,
  ADD COLUMN IF NOT EXISTS last_incoming_at timestamptz;

-- 2. Style -> artist mapping
CREATE TABLE IF NOT EXISTS public.style_artist_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tattoo_style text NOT NULL UNIQUE,
  artist_name  text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.style_artist_mapping ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to style_artist_mapping" ON public.style_artist_mapping;
CREATE POLICY "Allow all access to style_artist_mapping"
  ON public.style_artist_mapping FOR ALL USING (true) WITH CHECK (true);

-- 3. Auto-assign artist on lead insert
CREATE OR REPLACE FUNCTION public.auto_assign_artist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_artist text;
BEGIN
  IF NEW.assigned_artist IS NULL OR NEW.assigned_artist = '' THEN
    SELECT artist_name INTO v_artist
    FROM public.style_artist_mapping
    WHERE lower(tattoo_style) = lower(coalesce(NEW.tattoo_style,''))
    LIMIT 1;
    IF v_artist IS NOT NULL THEN
      NEW.assigned_artist := v_artist;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_auto_assign_artist ON public.leads;
CREATE TRIGGER trg_auto_assign_artist
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_artist();

-- 4. Auto-move stage on incoming WhatsApp message
CREATE OR REPLACE FUNCTION public.auto_move_on_incoming_msg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.template_type = 'incoming' OR NEW.status = 'received' THEN
    UPDATE public.leads
       SET status = CASE WHEN status = 'New Lead' THEN 'Contacted' ELSE status END,
           last_incoming_at = now(),
           last_contacted_at = now(),
           updated_at = now()
     WHERE (id = NEW.lead_id)
        OR (NEW.lead_id IS NULL AND regexp_replace(phone, '\D', '', 'g') = regexp_replace(NEW.lead_phone, '\D', '', 'g'));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_auto_move_on_incoming ON public.whatsapp_messages;
CREATE TRIGGER trg_auto_move_on_incoming
  AFTER INSERT ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.auto_move_on_incoming_msg();

-- 5. Auto-move on appointment created/confirmed
CREATE OR REPLACE FUNCTION public.auto_move_on_appointment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL AND (NEW.status = 'confirmed' OR NEW.status = 'scheduled') THEN
    UPDATE public.leads
       SET status = CASE WHEN status IN ('New Lead','Contacted','Quoted') THEN 'Appointment Scheduled' ELSE status END,
           updated_at = now()
     WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_auto_move_on_appointment ON public.appointments;
CREATE TRIGGER trg_auto_move_on_appointment
  AFTER INSERT OR UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.auto_move_on_appointment();
