
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['apps_ai_history','apps_artikel','apps_audit_log','apps_booking','apps_cart_item','apps_chat_msg','apps_chat_room','apps_notif','apps_order','apps_order_item','apps_pasien','apps_poin','apps_produk','apps_reward','apps_reward_redeem']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
  -- public catalog reads
  GRANT SELECT ON public.apps_produk TO anon;
  GRANT SELECT ON public.apps_artikel TO anon;
  GRANT SELECT ON public.apps_reward TO anon;
END $$;
