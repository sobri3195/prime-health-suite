
REVOKE EXECUTE ON FUNCTION public.apps_export_my_data() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.apps_request_account_deletion() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.apps_accept_consent(boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.apps_export_my_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apps_request_account_deletion() TO authenticated;
GRANT EXECUTE ON FUNCTION public.apps_accept_consent(boolean) TO authenticated;
