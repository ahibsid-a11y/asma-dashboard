CREATE OR REPLACE FUNCTION public.get_report_signatures(_student_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  student_class text;
  teacher public.profiles;
  headmaster public.profiles;
  kesantrian public.profiles;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Silakan masuk terlebih dahulu'; END IF;
  IF NOT (auth.uid() = _student_id OR public.is_member_admin(auth.uid()) OR public.can_manage_attendance(auth.uid(), _student_id)) THEN
    RAISE EXCEPTION 'Anda tidak berwenang melihat rapor santri ini';
  END IF;
  SELECT class INTO student_class FROM public.profiles WHERE id = _student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Santri tidak ditemukan'; END IF;

  SELECT p.* INTO teacher
  FROM public.classes c JOIN public.profiles p ON p.id = c.homeroom_teacher_id
  WHERE c.name = student_class OR
    lower(regexp_replace(regexp_replace(trim(c.name), '^kelas\s*', '', 'i'), '\s+', '', 'g')) =
    lower(regexp_replace(regexp_replace(trim(student_class), '^kelas\s*', '', 'i'), '\s+', '', 'g'))
  ORDER BY (c.name = student_class) DESC, c.id LIMIT 1;

  SELECT p.* INTO headmaster FROM public.profiles p
  WHERE p.status = 'Aktif' AND (p.account_type = 'kepala_sekolah' OR EXISTS (
    SELECT 1 FROM public.profile_positions pp WHERE pp.user_id = p.id AND pp.position = 'kepala_sekolah'
  )) ORDER BY (p.account_type = 'kepala_sekolah') DESC, p.created_at, p.id LIMIT 1;

  SELECT p.* INTO kesantrian FROM public.profiles p
  WHERE p.status = 'Aktif' AND (p.account_type = 'kabid_kesantrian' OR EXISTS (
    SELECT 1 FROM public.profile_positions pp WHERE pp.user_id = p.id AND pp.position = 'kabid_kesantrian'
  )) ORDER BY (p.account_type = 'kabid_kesantrian') DESC, p.created_at, p.id LIMIT 1;

  RETURN jsonb_build_object(
    'homeroomTeacherName', coalesce(nullif(trim(teacher.name), ''), 'Wali Kelas'),
    'homeroomTeacherNiy', coalesce(nullif(trim(teacher.nis_nip), ''), '-'),
    'headmasterName', coalesce(nullif(trim(headmaster.name), ''), 'Kepala Sekolah'),
    'headmasterNiy', coalesce(nullif(trim(headmaster.nis_nip), ''), '-'),
    'headOfKesantrianName', coalesce(nullif(trim(kesantrian.name), ''), 'Kepala Kesantrian'),
    'headOfKesantrianNiy', coalesce(nullif(trim(kesantrian.nis_nip), ''), '-')
  );
END;
$function$;
REVOKE ALL ON FUNCTION public.get_report_signatures(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_report_signatures(uuid) TO authenticated;
COMMENT ON FUNCTION public.get_report_signatures(uuid) IS 'Read only report signer names and NIY for a visible student; staff profiles remain private. Homeroom follows classes, leadership follows assigned positions.';