CREATE TYPE public.incidental_status AS ENUM ('Hadir','Izin','Sakit','Alfa');
CREATE TYPE public.incidental_target_type AS ENUM ('ROLE','USERS');

CREATE OR REPLACE FUNCTION public.is_not_santri(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND account_type IS NOT NULL AND account_type <> 'santri'
  )
$$;
REVOKE ALL ON FUNCTION public.is_not_santri(uuid) FROM anon;

CREATE TABLE public.incidental_attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Jakarta')::date),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type public.incidental_target_type NOT NULL DEFAULT 'ROLE',
  target_roles public.app_role[] NOT NULL DEFAULT '{}'::public.app_role[],
  target_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidental_attendance_events TO authenticated;
GRANT ALL ON public.incidental_attendance_events TO service_role;
ALTER TABLE public.incidental_attendance_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view events" ON public.incidental_attendance_events
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Non santri can create events" ON public.incidental_attendance_events
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_not_santri(auth.uid()));
CREATE POLICY "Creator or leaders can update events" ON public.incidental_attendance_events
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_session_admin(auth.uid()))
  WITH CHECK (created_by = auth.uid() OR public.is_session_admin(auth.uid()));
CREATE POLICY "Creator or leaders can delete events" ON public.incidental_attendance_events
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_session_admin(auth.uid()));
CREATE TRIGGER update_incidental_events_updated_at BEFORE UPDATE ON public.incidental_attendance_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.incidental_attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.incidental_attendance_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.incidental_status NOT NULL,
  notes text,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidental_attendance_records TO authenticated;
GRANT ALL ON public.incidental_attendance_records TO service_role;
ALTER TABLE public.incidental_attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own incidental attendance" ON public.incidental_attendance_records
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_not_santri(auth.uid()));
CREATE POLICY "Non santri record incidental attendance" ON public.incidental_attendance_records
  FOR INSERT TO authenticated WITH CHECK (public.is_not_santri(auth.uid()));
CREATE POLICY "Non santri update incidental attendance" ON public.incidental_attendance_records
  FOR UPDATE TO authenticated
  USING (public.is_not_santri(auth.uid())) WITH CHECK (public.is_not_santri(auth.uid()));
CREATE POLICY "Non santri delete incidental attendance" ON public.incidental_attendance_records
  FOR DELETE TO authenticated USING (public.is_not_santri(auth.uid()));
CREATE TRIGGER update_incidental_records_updated_at BEFORE UPDATE ON public.incidental_attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_incidental_records_user ON public.incidental_attendance_records (user_id);
CREATE INDEX idx_incidental_events_date ON public.incidental_attendance_events (event_date DESC);