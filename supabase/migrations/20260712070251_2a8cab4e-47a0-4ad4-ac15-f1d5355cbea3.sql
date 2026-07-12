
-- apps_chat_room
DROP POLICY IF EXISTS "Pasien akses room sendiri" ON public.apps_chat_room;
CREATE POLICY "Pasien akses room sendiri" ON public.apps_chat_room
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- apps_cart_item
DROP POLICY IF EXISTS "Pasien kelola cart sendiri" ON public.apps_cart_item;
CREATE POLICY "Pasien kelola cart sendiri" ON public.apps_cart_item
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- apps_order
DROP POLICY IF EXISTS "Pasien buat order sendiri" ON public.apps_order;
CREATE POLICY "Pasien buat order sendiri" ON public.apps_order
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Pasien lihat order sendiri" ON public.apps_order;
CREATE POLICY "Pasien lihat order sendiri" ON public.apps_order
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Pasien update order sendiri (batal)" ON public.apps_order;
CREATE POLICY "Pasien update order sendiri (batal)" ON public.apps_order
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- apps_order_item
DROP POLICY IF EXISTS "Pasien isi item order sendiri" ON public.apps_order_item;
CREATE POLICY "Pasien isi item order sendiri" ON public.apps_order_item
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.apps_order o WHERE o.id = apps_order_item.order_id AND o.user_id = auth.uid())
  );
DROP POLICY IF EXISTS "Pasien lihat item order sendiri" ON public.apps_order_item;
CREATE POLICY "Pasien lihat item order sendiri" ON public.apps_order_item
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.apps_order o WHERE o.id = apps_order_item.order_id AND o.user_id = auth.uid())
  );

-- apps_poin
DROP POLICY IF EXISTS "Pasien lihat poin sendiri" ON public.apps_poin;
CREATE POLICY "Pasien lihat poin sendiri" ON public.apps_poin
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- apps_reward_redeem
DROP POLICY IF EXISTS "Pasien lihat redeem sendiri" ON public.apps_reward_redeem;
CREATE POLICY "Pasien lihat redeem sendiri" ON public.apps_reward_redeem
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
