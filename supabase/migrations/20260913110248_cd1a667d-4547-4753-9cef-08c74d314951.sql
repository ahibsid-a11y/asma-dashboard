-- 1. Role enum
CREATE TYPE public.app_role AS ENUM (
  'super_admin','mudir','kepala_sekolah','waka_kurikulum','kabid_kesantrian',
  'musyrif_asrama','musyrif_halaqoh','wali_kelas','guru_mapel','kepala_tu',
  'kepala_rt_sarpras','tendik','santri'
);

CREATE TYPE public.member_status AS ENUM ('Aktif','Nonaktif');
CREATE TYPE public.gender_type AS ENUM ('L','P');

-- 2. user_roles (authoritative roles)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_member_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','mudir','kepala_sekolah','kepala_tu')
  )
$$;
REVOKE ALL ON FUNCTION public.is_member_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.is_member_admin(uuid) TO authenticated, service_role;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Member admins can view all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.is_member_admin(auth.uid()));

-- 3. profiles columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS gender public.gender_type,
  ADD COLUMN IF NOT EXISTS status public.member_status NOT NULL DEFAULT 'Aktif',
  ADD COLUMN IF NOT EXISTS account_type public.app_role,
  ADD COLUMN IF NOT EXISTS class text,
  ADD COLUMN IF NOT EXISTS dorm text,
  ADD COLUMN IF NOT EXISTS halaqoh text,
  ADD COLUMN IF NOT EXISTS nis_nip text,
  ADD COLUMN IF NOT EXISTS rfid_card text,
  ADD COLUMN IF NOT EXISTS avatar text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_nis_nip_key ON public.profiles (nis_nip) WHERE nis_nip IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_rfid_card_key ON public.profiles (rfid_card) WHERE rfid_card IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- 4. Prevent self-escalation: non-admins cannot change their own role/status
CREATE OR REPLACE FUNCTION public.protect_profile_privileges()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_member_admin(auth.uid()) THEN
    IF NEW.account_type IS DISTINCT FROM OLD.account_type
       OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Tidak diizinkan mengubah jabatan atau status akun';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_privileges ON public.profiles;
CREATE TRIGGER protect_profile_privileges
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileges();

-- 5. Keep user_roles in sync with profiles.account_type (admin-controlled column)
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.account_type IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role IS DISTINCT FROM NEW.account_type;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, NEW.account_type)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_role_ins ON public.profiles;
CREATE TRIGGER sync_user_role_ins AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();
DROP TRIGGER IF EXISTS sync_user_role_upd ON public.profiles;
CREATE TRIGGER sync_user_role_upd AFTER UPDATE OF account_type ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

-- 6. Profile policies for member admins
CREATE POLICY "Member admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_member_admin(auth.uid()));
CREATE POLICY "Member admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.is_member_admin(auth.uid()));
CREATE POLICY "Member admins can update profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_member_admin(auth.uid())) WITH CHECK (public.is_member_admin(auth.uid()));

-- 7. New user trigger fills name/email too
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, name, email, account_type, nis_nip, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data ->> 'account_type', '')::public.app_role,
    NULLIF(NEW.raw_user_meta_data ->> 'nis_nip', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;