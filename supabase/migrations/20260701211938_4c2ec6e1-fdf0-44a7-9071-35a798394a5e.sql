-- ============================================================
-- 1) RLS policies untuk 9 tabel master Finance yang tanpa policy
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fin_coa','fin_cost_center','fin_karyawan','fin_kategori_layanan',
    'fin_layanan','fin_payer','fin_profil_klinik','fin_tarif_pajak','fin_vendor'
  ] LOOP
    -- baca: semua staf klinik
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR SELECT TO authenticated
        USING (public.klinik_is_staff(auth.uid()));
    $f$, t || '_staff_select', t);

    -- tulis: hanya admin/manajemen (fin_can_edit)
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR INSERT TO authenticated
        WITH CHECK (public.fin_can_edit(auth.uid()));
    $f$, t || '_admin_insert', t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR UPDATE TO authenticated
        USING (public.fin_can_edit(auth.uid()))
        WITH CHECK (public.fin_can_edit(auth.uid()));
    $f$, t || '_admin_update', t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR DELETE TO authenticated
        USING (public.fin_can_edit(auth.uid()));
    $f$, t || '_admin_delete', t);
  END LOOP;
END $$;

-- ============================================================
-- 2) Revoke EXECUTE dari anon untuk fungsi non-publik
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.apps_leaderboard_mingguan()                    FROM anon;
REVOKE EXECUTE ON FUNCTION public.apps_log_self_access(text, jsonb)              FROM anon;
REVOKE EXECUTE ON FUNCTION public.apps_my_poin_total()                           FROM anon;
REVOKE EXECUTE ON FUNCTION public.apps_redeem_reward(uuid)                       FROM anon;
REVOKE EXECUTE ON FUNCTION public.apps_slot_terisi_for(uuid, date)               FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_roles()                           FROM anon;
REVOKE EXECUTE ON FUNCTION public.fin_apply_persediaan_mutasi()                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.fin_can_edit(uuid)                             FROM anon;
REVOKE EXECUTE ON FUNCTION public.fin_can_view(uuid)                             FROM anon;
REVOKE EXECUTE ON FUNCTION public.fin_recon_jurnal(date, date)                   FROM anon;
REVOKE EXECUTE ON FUNCTION public.fin_recon_unposted(date, date)                 FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role)                FROM anon;
REVOKE EXECUTE ON FUNCTION public.klinik_apply_stock_movement()                  FROM anon;
REVOKE EXECUTE ON FUNCTION public.klinik_medrec_snapshot()                       FROM anon;
