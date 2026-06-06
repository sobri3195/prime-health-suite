-- Fix Security Definer View → switch to security_invoker
DROP VIEW IF EXISTS public.apps_slot_terisi;
CREATE VIEW public.apps_slot_terisi
  WITH (security_invoker = true)
  AS
  SELECT dokter_id, tanggal, jam_slot
    FROM public.apps_booking
   WHERE status IN ('pending','confirmed','checked_in');

GRANT SELECT ON public.apps_slot_terisi TO authenticated;

-- The view filters by apps_booking RLS, which only shows the user's own bookings.
-- For slot-collision avoidance, we need a public-safe read of taken slots.
-- Use a SECURITY DEFINER function instead, exposing only (dokter_id, tanggal, jam_slot).
CREATE OR REPLACE FUNCTION public.apps_slot_terisi_for(_dokter_id uuid, _tanggal date)
RETURNS TABLE (jam_slot text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jam_slot
    FROM public.apps_booking
   WHERE dokter_id = _dokter_id
     AND tanggal = _tanggal
     AND status IN ('pending','confirmed','checked_in');
$$;

REVOKE EXECUTE ON FUNCTION public.apps_slot_terisi_for(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apps_slot_terisi_for(uuid, date) TO authenticated;

-- Lock down the auto-profile trigger function: only the trigger should call it.
REVOKE EXECUTE ON FUNCTION public.handle_new_apps_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_apps_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_apps_user() FROM authenticated;