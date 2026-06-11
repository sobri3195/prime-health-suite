REVOKE SELECT ON public.fin_dokter FROM authenticated;
GRANT SELECT (id, code, name, spesialisasi, default_fee_pct, is_ptkp_k0, is_active, sip_number, schedule_note, phone, created_at, updated_at) ON public.fin_dokter TO authenticated;

DROP POLICY IF EXISTS "authenticated insert own audit" ON public.clinic_audit_log;
CREATE POLICY "authenticated insert own audit"
  ON public.clinic_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());
