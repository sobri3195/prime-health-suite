
DROP POLICY IF EXISTS "payroll super only" ON public.hr_payroll_run;
CREATE POLICY "payroll manage by admin/manajemen" ON public.hr_payroll_run
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin_klinik') OR has_role(auth.uid(),'manajemen'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin_klinik') OR has_role(auth.uid(),'manajemen'));

DROP POLICY IF EXISTS "payroll item write super" ON public.hr_payroll_item;
CREATE POLICY "payroll item manage by admin/manajemen" ON public.hr_payroll_item
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin_klinik') OR has_role(auth.uid(),'manajemen'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'admin_klinik') OR has_role(auth.uid(),'manajemen'));
