-- Enable staff (kasir, admin_klinik, dokter, dst.) untuk membuat invoice dari modul billing.
-- SELECT policies sudah ada; hanya perlu INSERT/UPDATE/DELETE.

CREATE POLICY "Staf klinik insert invoice"
  ON public.fin_invoice FOR INSERT TO authenticated
  WITH CHECK (public.klinik_is_staff(auth.uid()));

CREATE POLICY "Staf klinik update invoice"
  ON public.fin_invoice FOR UPDATE TO authenticated
  USING (public.klinik_is_staff(auth.uid()))
  WITH CHECK (public.klinik_is_staff(auth.uid()));

CREATE POLICY "Finance editor delete invoice"
  ON public.fin_invoice FOR DELETE TO authenticated
  USING (public.fin_can_edit(auth.uid()) OR public.klinik_is_admin(auth.uid()));

CREATE POLICY "Staf klinik insert invoice item"
  ON public.fin_invoice_item FOR INSERT TO authenticated
  WITH CHECK (public.klinik_is_staff(auth.uid()));

CREATE POLICY "Staf klinik update invoice item"
  ON public.fin_invoice_item FOR UPDATE TO authenticated
  USING (public.klinik_is_staff(auth.uid()))
  WITH CHECK (public.klinik_is_staff(auth.uid()));

CREATE POLICY "Staf klinik delete invoice item"
  ON public.fin_invoice_item FOR DELETE TO authenticated
  USING (public.klinik_is_staff(auth.uid()));