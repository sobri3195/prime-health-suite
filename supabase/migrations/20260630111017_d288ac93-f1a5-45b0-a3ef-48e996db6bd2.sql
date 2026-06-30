
CREATE OR REPLACE FUNCTION public.app_health_check()
RETURNS TABLE(system text, status text, last_activity timestamptz, detail text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sim timestamptz;
  v_fin timestamptz;
  v_apps timestamptz;
BEGIN
  BEGIN
    SELECT GREATEST(
      COALESCE((SELECT MAX(created_at) FROM public.klinik_visit), 'epoch'),
      COALESCE((SELECT MAX(created_at) FROM public.klinik_queue), 'epoch')
    ) INTO v_sim;
    system := 'SIM Klinik';
    last_activity := NULLIF(v_sim, 'epoch');
    status := CASE WHEN v_sim > now() - interval '7 days' THEN 'online' ELSE 'idle' END;
    detail := 'klinik_visit/queue';
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    system := 'SIM Klinik'; status := 'offline'; last_activity := NULL; detail := SQLERRM; RETURN NEXT;
  END;

  BEGIN
    SELECT GREATEST(
      COALESCE((SELECT MAX(created_at) FROM public.fin_invoice), 'epoch'),
      COALESCE((SELECT MAX(created_at) FROM public.fin_pembayaran), 'epoch')
    ) INTO v_fin;
    system := 'Finance';
    last_activity := NULLIF(v_fin, 'epoch');
    status := CASE WHEN v_fin > now() - interval '7 days' THEN 'online' ELSE 'idle' END;
    detail := 'fin_invoice/pembayaran';
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    system := 'Finance'; status := 'offline'; last_activity := NULL; detail := SQLERRM; RETURN NEXT;
  END;

  BEGIN
    SELECT GREATEST(
      COALESCE((SELECT MAX(created_at) FROM public.apps_booking), 'epoch'),
      COALESCE((SELECT MAX(created_at) FROM public.apps_order), 'epoch')
    ) INTO v_apps;
    system := 'Prime Apps';
    last_activity := NULLIF(v_apps, 'epoch');
    status := CASE WHEN v_apps > now() - interval '7 days' THEN 'online' ELSE 'idle' END;
    detail := 'apps_booking/order';
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    system := 'Prime Apps'; status := 'offline'; last_activity := NULL; detail := SQLERRM; RETURN NEXT;
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.app_health_check() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_health_check() TO authenticated, service_role;
