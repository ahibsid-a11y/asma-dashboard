CREATE TYPE public.attendance_status AS ENUM ('Hadir','Telat','Alfa');

CREATE OR REPLACE FUNCTION public.is_attendance_overseer(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','mudir','kepala_sekolah','kepala_tu','waka_kurikulum','kabid_kesantrian')
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_attendance(_actor uuid, _target uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.profiles; t public.profiles;
BEGIN
  IF _actor IS NULL OR _target IS NULL THEN RETURN false; END IF;
  IF public.is_attendance_overseer(_actor) THEN RETURN true; END IF;
  SELECT * INTO a FROM public.profiles WHERE id = _actor;
  SELECT * INTO t FROM public.profiles WHERE id = _target;
  IF a.id IS NULL OR t.id IS NULL THEN RETURN false; END IF;
  RETURN CASE a.account_type
    WHEN 'musyrif_asrama' THEN a.dorm IS NOT NULL AND t.dorm = a.dorm
    WHEN 'musyrif_halaqoh' THEN a.halaqoh IS NOT NULL AND t.halaqoh = a.halaqoh
    WHEN 'wali_kelas' THEN a.class IS NOT NULL AND t.class = a.class
    WHEN 'guru_mapel' THEN a.class IS NOT NULL AND t.class = a.class
    WHEN 'tendik' THEN t.account_type IN ('tendik','kepala_rt_sarpras')
    ELSE false
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_attendance_overseer(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_manage_attendance(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_attendance_overseer(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage_attendance(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Overseers can view supervised profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.can_manage_attendance(auth.uid(), id));

CREATE TABLE public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  attendance_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  scan_time timestamptz NOT NULL DEFAULT now(),
  status public.attendance_status NOT NULL,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id, attendance_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own attendance" ON public.attendance_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Officers view supervised attendance" ON public.attendance_records
  FOR SELECT TO authenticated USING (public.can_manage_attendance(auth.uid(), user_id));
CREATE POLICY "Officers insert supervised attendance" ON public.attendance_records
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_attendance(auth.uid(), user_id));
CREATE POLICY "Officers update supervised attendance" ON public.attendance_records
  FOR UPDATE TO authenticated USING (public.can_manage_attendance(auth.uid(), user_id))
  WITH CHECK (public.can_manage_attendance(auth.uid(), user_id));
CREATE POLICY "Overseers delete attendance" ON public.attendance_records
  FOR DELETE TO authenticated USING (public.is_attendance_overseer(auth.uid()));

CREATE TRIGGER update_attendance_records_updated_at BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX attendance_records_session_date_idx ON public.attendance_records (session_id, attendance_date);
CREATE INDEX attendance_records_user_idx ON public.attendance_records (user_id);

CREATE TABLE public.violation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  violation_title text NOT NULL,
  category text NOT NULL DEFAULT 'Kedisiplinan',
  points integer NOT NULL DEFAULT 0,
  notes text,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.violation_records TO authenticated;
GRANT ALL ON public.violation_records TO service_role;
ALTER TABLE public.violation_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own violations" ON public.violation_records
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Officers view supervised violations" ON public.violation_records
  FOR SELECT TO authenticated USING (public.can_manage_attendance(auth.uid(), user_id));
CREATE POLICY "Officers insert supervised violations" ON public.violation_records
  FOR INSERT TO authenticated WITH CHECK (public.can_manage_attendance(auth.uid(), user_id));
CREATE POLICY "Officers update supervised violations" ON public.violation_records
  FOR UPDATE TO authenticated USING (public.can_manage_attendance(auth.uid(), user_id))
  WITH CHECK (public.can_manage_attendance(auth.uid(), user_id));
CREATE POLICY "Overseers delete violations" ON public.violation_records
  FOR DELETE TO authenticated USING (public.is_attendance_overseer(auth.uid()));

CREATE TRIGGER update_violation_records_updated_at BEFORE UPDATE ON public.violation_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX violation_records_user_date_idx ON public.violation_records (user_id, date);