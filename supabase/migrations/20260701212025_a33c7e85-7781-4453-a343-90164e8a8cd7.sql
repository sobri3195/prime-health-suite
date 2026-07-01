-- Cabut default PUBLIC EXECUTE, lalu grant ulang ke authenticated bila perlu.

-- Trigger-only functions (aman revoke total, jalan via trigger sebagai definer)
REVOKE EXECUTE ON FUNCTION public.fin_apply_persediaan_mutasi()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.klinik_apply_stock_movement()  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.klinik_medrec_snapshot()       FROM PUBLIC, anon, authenticated;

-- Helper RLS (dipakai di dalam policy sebagai definer; caller tidak perlu execute langsung)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fin_can_view(uuid)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fin_can_edit(uuid)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_roles()            FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.fin_can_view(uuid)              TO authenticated;
GRANT  EXECUTE ON FUNCTION public.fin_can_edit(uuid)              TO authenticated;
GRANT  EXECUTE ON FUNCTION public.current_user_roles()            TO authenticated;

-- Apps user-scoped RPC (butuh auth.uid())
REVOKE EXECUTE ON FUNCTION public.apps_leaderboard_mingguan()   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apps_my_poin_total()          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.apps_redeem_reward(uuid)      FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.apps_leaderboard_mingguan()   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.apps_my_poin_total()          TO authenticated;
GRANT  EXECUTE ON FUNCTION public.apps_redeem_reward(uuid)      TO authenticated;

-- Finance reconciliation (hanya staf)
REVOKE EXECUTE ON FUNCTION public.fin_recon_jurnal(date, date)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fin_recon_unposted(date, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fin_recon_jurnal(date, date)   TO authenticated;
GRANT  EXECUTE ON FUNCTION public.fin_recon_unposted(date, date) TO authenticated;
