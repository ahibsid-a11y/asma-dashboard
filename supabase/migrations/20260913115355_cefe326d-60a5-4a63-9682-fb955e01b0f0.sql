CREATE OR REPLACE FUNCTION public.is_session_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('super_admin','mudir','kepala_sekolah')
  )
$$;

CREATE TABLE public.attendance_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_name text NOT NULL,
  target_role public.app_role[] NOT NULL DEFAULT '{}',
  on_time_deadline time NOT NULL,
  late_cutoff_time time NOT NULL,
  is_exit boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  auto_violation_on_late boolean NOT NULL DEFAULT false,
  auto_violation_on_absent boolean NOT NULL DEFAULT false,
  violation_points_late integer NOT NULL DEFAULT 0,
  violation_points_absent integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.attendance_sessions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT ALL ON public.attendance_sessions TO service_role;

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view sessions" ON public.attendance_sessions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Session admins can insert" ON public.attendance_sessions
  FOR INSERT TO authenticated WITH CHECK (public.is_session_admin(auth.uid()));
CREATE POLICY "Session admins can update" ON public.attendance_sessions
  FOR UPDATE TO authenticated USING (public.is_session_admin(auth.uid())) WITH CHECK (public.is_session_admin(auth.uid()));
CREATE POLICY "Session admins can delete" ON public.attendance_sessions
  FOR DELETE TO authenticated USING (public.is_session_admin(auth.uid()));

CREATE TRIGGER update_attendance_sessions_updated_at
  BEFORE UPDATE ON public.attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.attendance_sessions
  (session_name, target_role, on_time_deadline, late_cutoff_time, is_exit, sort_order)
VALUES
  ('Guru — Masuk Sekolah', ARRAY['guru_mapel','wali_kelas','waka_kurikulum']::public.app_role[], '07:30', '07:45', false, 1),
  ('Guru — Pulang Sekolah', ARRAY['guru_mapel','wali_kelas','waka_kurikulum']::public.app_role[], '15:00', '15:15', true, 2),
  ('Musyrif — Masuk Asrama', ARRAY['musyrif_asrama','musyrif_halaqoh']::public.app_role[], '17:00', '17:15', false, 3),
  ('Musyrif — Pulang Asrama', ARRAY['musyrif_asrama','musyrif_halaqoh']::public.app_role[], '07:00', '07:15', true, 4),
  ('Tendik — Masuk', ARRAY['tendik','kepala_rt_sarpras']::public.app_role[], '07:00', '07:15', false, 5),
  ('Tendik — Pulang', ARRAY['tendik','kepala_rt_sarpras']::public.app_role[], '15:00', '15:15', true, 6),
  ('Santri — Masuk Sekolah', ARRAY['santri']::public.app_role[], '07:15', '07:30', false, 7),
  ('Santri — Halaqoh Pagi', ARRAY['santri']::public.app_role[], '05:30', '05:45', false, 8),
  ('Santri — Halaqoh Maghrib', ARRAY['santri']::public.app_role[], '18:30', '18:45', false, 9),
  ('Santri — Belajar Malam', ARRAY['santri']::public.app_role[], '20:30', '20:45', false, 10);