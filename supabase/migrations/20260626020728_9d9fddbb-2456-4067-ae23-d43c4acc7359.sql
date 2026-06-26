
-- 1. fin_dokter: revoke sensitive columns from authenticated
REVOKE SELECT (npwp, phone, sip_number) ON public.fin_dokter FROM authenticated;

-- 2. apps_order_item: add UPDATE/DELETE policies scoped to order owner
CREATE POLICY "Users update own order items"
  ON public.apps_order_item FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.apps_order o WHERE o.id = apps_order_item.order_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.apps_order o WHERE o.id = apps_order_item.order_id AND o.user_id = auth.uid()));

CREATE POLICY "Users delete own order items"
  ON public.apps_order_item FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.apps_order o WHERE o.id = apps_order_item.order_id AND o.user_id = auth.uid()));

-- 3. fin_invoice_item: allow finance staff to read
CREATE POLICY "Finance staff read invoice items"
  ON public.fin_invoice_item FOR SELECT
  TO authenticated
  USING (public.fin_can_view(auth.uid()));

-- 4. fin_pembayaran: add write policies for finance editors
CREATE POLICY "Finance editors insert pembayaran"
  ON public.fin_pembayaran FOR INSERT
  TO authenticated
  WITH CHECK (public.fin_can_edit(auth.uid()));

CREATE POLICY "Finance editors update pembayaran"
  ON public.fin_pembayaran FOR UPDATE
  TO authenticated
  USING (public.fin_can_edit(auth.uid()))
  WITH CHECK (public.fin_can_edit(auth.uid()));

CREATE POLICY "Finance editors delete pembayaran"
  ON public.fin_pembayaran FOR DELETE
  TO authenticated
  USING (public.fin_can_edit(auth.uid()));
