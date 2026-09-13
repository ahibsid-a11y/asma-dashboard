REVOKE ALL ON FUNCTION public.is_session_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_session_admin(uuid) TO authenticated, service_role;