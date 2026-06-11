
-- 1. clinic_setting: restrict reads to staff only
DROP POLICY IF EXISTS "authenticated read settings" ON public.clinic_setting;
CREATE POLICY "staff read settings" ON public.clinic_setting
  FOR SELECT TO authenticated
  USING (public.klinik_is_staff(auth.uid()));

-- 2. fin_audit_log: prevent spoofed inserts
DROP POLICY IF EXISTS fin_audit_insert ON public.fin_audit_log;
CREATE POLICY fin_audit_insert ON public.fin_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid() AND public.fin_can_edit(auth.uid()));

-- 3. fin_dokter: hide NPWP from Data API
REVOKE SELECT (npwp) ON public.fin_dokter FROM authenticated, anon;

-- 4. fin_invoice: allow staff to view
CREATE POLICY "Staf finance lihat invoice" ON public.fin_invoice
  FOR SELECT TO authenticated
  USING (public.fin_can_view(auth.uid()));

-- 5. fin_pembayaran: allow staff to view
CREATE POLICY "Staf finance lihat pembayaran" ON public.fin_pembayaran
  FOR SELECT TO authenticated
  USING (public.fin_can_view(auth.uid()));
