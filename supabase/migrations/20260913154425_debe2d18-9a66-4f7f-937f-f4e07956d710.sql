CREATE TYPE public.member_category AS ENUM ('super_admin','admin','guru','musyrif','tendik','siswa');

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category public.member_category;

UPDATE public.profiles SET category = CASE
  WHEN account_type = 'super_admin' THEN 'super_admin'::public.member_category
  WHEN account_type IN ('mudir','kepala_sekolah','waka_kurikulum','kabid_kesantrian','kepala_tu','kepala_rt_sarpras') THEN 'admin'::public.member_category
  WHEN account_type IN ('guru_mapel','wali_kelas') THEN 'guru'::public.member_category
  WHEN account_type IN ('musyrif_asrama','musyrif_halaqoh') THEN 'musyrif'::public.member_category
  WHEN account_type = 'tendik' THEN 'tendik'::public.member_category
  WHEN account_type = 'santri' THEN 'siswa'::public.member_category
  ELSE NULL END
WHERE category IS NULL;

CREATE TABLE IF NOT EXISTS public.profile_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  position public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, position)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_positions TO authenticated;
GRANT ALL ON public.profile_positions TO service_role;
ALTER TABLE public.profile_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view positions" ON public.profile_positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Member admins manage positions" ON public.profile_positions FOR ALL TO authenticated USING (public.is_member_admin(auth.uid())) WITH CHECK (public.is_member_admin(auth.uid()));

INSERT INTO public.profile_positions (user_id, position)
SELECT id, account_type FROM public.profiles WHERE account_type IS NOT NULL
ON CONFLICT (user_id, position) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade integer NOT NULL,
  name text NOT NULL UNIQUE,
  homeroom_teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Member admins manage classes" ON public.classes FOR ALL TO authenticated USING (public.is_member_admin(auth.uid())) WITH CHECK (public.is_member_admin(auth.uid()));
CREATE TRIGGER classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.dorms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  musyrif_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dorms TO authenticated;
GRANT ALL ON public.dorms TO service_role;
ALTER TABLE public.dorms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view dorms" ON public.dorms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Member admins manage dorms" ON public.dorms FOR ALL TO authenticated USING (public.is_member_admin(auth.uid())) WITH CHECK (public.is_member_admin(auth.uid()));
CREATE TRIGGER dorms_updated_at BEFORE UPDATE ON public.dorms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.halaqohs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  musyrif_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.halaqohs TO authenticated;
GRANT ALL ON public.halaqohs TO service_role;
ALTER TABLE public.halaqohs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated view halaqohs" ON public.halaqohs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Member admins manage halaqohs" ON public.halaqohs FOR ALL TO authenticated USING (public.is_member_admin(auth.uid())) WITH CHECK (public.is_member_admin(auth.uid()));
CREATE TRIGGER halaqohs_updated_at BEFORE UPDATE ON public.halaqohs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.classes (grade, name)
SELECT DISTINCT COALESCE(NULLIF(regexp_replace(class, '^\D*(\d+).*$', '\1'), '')::int, 7), class
FROM public.profiles WHERE class IS NOT NULL AND btrim(class) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.dorms (name)
SELECT DISTINCT dorm FROM public.profiles WHERE dorm IS NOT NULL AND btrim(dorm) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.halaqohs (name)
SELECT DISTINCT halaqoh FROM public.profiles WHERE halaqoh IS NOT NULL AND btrim(halaqoh) <> ''
ON CONFLICT (name) DO NOTHING;