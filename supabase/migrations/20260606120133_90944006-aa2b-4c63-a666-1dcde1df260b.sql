
REVOKE EXECUTE ON FUNCTION public.apps_queue_position(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.apps_queue_position(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.apps_send_booking_reminders() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.apps_send_booking_reminders() TO service_role;
