
-- 1) fin_dokter: revoke sensitive columns from anon/authenticated
REVOKE SELECT (npwp, phone, sip_number) ON public.fin_dokter FROM anon, authenticated;

-- 2) apps_audit_log: remove direct INSERT policy; provide SECURITY DEFINER fn
DROP POLICY IF EXISTS "Pasien insert audit log untuk dirinya" ON public.apps_audit_log;

CREATE OR REPLACE FUNCTION public.apps_log_self_access(_resource text, _meta jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _resource IS NULL OR length(_resource) = 0 OR length(_resource) > 100 THEN
    RAISE EXCEPTION 'Invalid resource';
  END IF;
  INSERT INTO public.apps_audit_log (user_id, actor_id, actor_label, action, resource, meta)
  VALUES (v_uid, v_uid, 'self', 'view', _resource, _meta);
END $$;

REVOKE ALL ON FUNCTION public.apps_log_self_access(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apps_log_self_access(text, jsonb) TO authenticated;

-- 3) hr_shift: restrict read to HR/admin roles
DROP POLICY IF EXISTS "shift readable" ON public.hr_shift;
CREATE POLICY "shift readable by hr" ON public.hr_shift
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin_klinik'::app_role)
    OR has_role(auth.uid(), 'manajemen'::app_role)
  );

-- 4) klinik_jadwal: restrict read to clinic staff
DROP POLICY IF EXISTS "Staff can read jadwal" ON public.klinik_jadwal;
CREATE POLICY "Staff can read jadwal" ON public.klinik_jadwal
  FOR SELECT TO authenticated
  USING (klinik_is_staff(auth.uid()));
