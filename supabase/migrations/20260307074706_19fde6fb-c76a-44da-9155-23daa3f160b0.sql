
-- Appointments table
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_name text NOT NULL,
  lead_phone text NOT NULL,
  appointment_date date NOT NULL,
  time_slot text NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled', 'no_show')),
  tattoo_style text,
  notes text,
  reminder_1d_sent boolean NOT NULL DEFAULT false,
  reminder_2h_sent boolean NOT NULL DEFAULT false,
  followup_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to appointments" ON public.appointments
  FOR ALL USING (true) WITH CHECK (true);

-- Studio availability settings (working hours, blocked dates)
CREATE TABLE public.studio_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week integer, -- 0=Sun, 1=Mon...6=Sat, NULL for specific date blocks
  start_time time NOT NULL DEFAULT '10:00',
  end_time time NOT NULL DEFAULT '20:00',
  is_available boolean NOT NULL DEFAULT true,
  specific_date date, -- for blocking specific dates
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to studio_availability" ON public.studio_availability
  FOR ALL USING (true) WITH CHECK (true);

-- Seed default working hours (Mon-Sat 10am-8pm, Sunday off)
INSERT INTO public.studio_availability (day_of_week, start_time, end_time, is_available) VALUES
  (0, '10:00', '20:00', false),  -- Sunday off
  (1, '10:00', '20:00', true),
  (2, '10:00', '20:00', true),
  (3, '10:00', '20:00', true),
  (4, '10:00', '20:00', true),
  (5, '10:00', '20:00', true),
  (6, '10:00', '20:00', true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
