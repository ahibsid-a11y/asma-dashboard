REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_user_role() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_privileges() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE ALL ON FUNCTION public.is_member_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_member_admin(uuid) TO authenticated, service_role;