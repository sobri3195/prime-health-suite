CREATE INDEX IF NOT EXISTS idx_apps_poin_user_created ON public.apps_poin(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_poin_created ON public.apps_poin(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_order_user_created ON public.apps_order(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_notif_user_created ON public.apps_notif(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_cart_item_user ON public.apps_cart_item(user_id);
CREATE INDEX IF NOT EXISTS idx_apps_booking_user_tanggal ON public.apps_booking(user_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_apps_ticket_user_created ON public.apps_ticket(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_apps_chat_msg_room_created ON public.apps_chat_msg(room_id, created_at DESC);

ALTER TABLE public.apps_cart_item REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.apps_cart_item;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.apps_notif REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.apps_notif;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;