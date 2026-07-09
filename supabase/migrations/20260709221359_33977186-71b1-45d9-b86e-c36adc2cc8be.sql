
-- Batch 14 P0: race condition redeem reward, finalized medrec lock, void payment reactivation

-- 1) Advisory lock per user pada apps_redeem_reward
CREATE OR REPLACE FUNCTION public.apps_redeem_reward(_reward_id uuid)
 RETURNS TABLE(redeem_id uuid, kode_voucher text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_harga int;
  v_stok int;
  v_total int;
  v_voucher text;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  -- Lock per-user untuk mencegah double-redeem paralel
  PERFORM pg_advisory_xact_lock(hashtext('apps_redeem:' || v_user::text)::bigint);
  SELECT harga_poin, stok INTO v_harga, v_stok FROM public.apps_reward WHERE id = _reward_id AND is_active = true FOR UPDATE;
  IF v_harga IS NULL THEN RAISE EXCEPTION 'Reward tidak ditemukan'; END IF;
  IF v_stok <= 0 THEN RAISE EXCEPTION 'Stok reward habis'; END IF;
  SELECT COALESCE(SUM(delta),0) INTO v_total FROM public.apps_poin WHERE user_id = v_user;
  IF v_total < v_harga THEN RAISE EXCEPTION 'Poin tidak cukup (butuh %, punya %)', v_harga, v_total; END IF;
  v_voucher := 'RDM-' || upper(substr(md5(random()::text || clock_timestamp()::text),1,8));
  INSERT INTO public.apps_reward_redeem(user_id, reward_id, kode_voucher) VALUES (v_user, _reward_id, v_voucher) RETURNING id INTO v_id;
  INSERT INTO public.apps_poin(user_id, delta, alasan, ref_type, ref_id) VALUES (v_user, -v_harga, 'Tukar reward', 'reward', _reward_id::text);
  UPDATE public.apps_reward SET stok = stok - 1 WHERE id = _reward_id;
  RETURN QUERY SELECT v_id, v_voucher;
END $function$;

-- 2) Cegah edit rekam medis yang sudah difinalize (kecuali admin)
CREATE POLICY "medrec locked when final"
ON public.klinik_medical_record
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (is_final = false OR public.klinik_is_admin(auth.uid()))
WITH CHECK (is_final = false OR public.klinik_is_admin(auth.uid()));

-- 3) Cegah reaktivasi payment yang sudah void tanpa jurnal reversal
CREATE OR REPLACE FUNCTION public.fin_guard_pembayaran_void()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'void' AND NEW.status IS DISTINCT FROM 'void' THEN
    RAISE EXCEPTION 'Pembayaran void tidak boleh direaktivasi. Buat pembayaran baru.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fin_guard_pembayaran_void ON public.fin_pembayaran;
CREATE TRIGGER trg_fin_guard_pembayaran_void
BEFORE UPDATE ON public.fin_pembayaran
FOR EACH ROW EXECUTE FUNCTION public.fin_guard_pembayaran_void();
