CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_set_password(_user_id uuid, _password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF _password IS NULL OR length(_password) < 1 THEN
    RAISE EXCEPTION 'Password tidak boleh kosong';
  END IF;
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(_password, extensions.gen_salt('bf')),
      updated_at = now()
  WHERE id = _user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pengguna tidak ditemukan';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_password(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_password(uuid, text) TO service_role;