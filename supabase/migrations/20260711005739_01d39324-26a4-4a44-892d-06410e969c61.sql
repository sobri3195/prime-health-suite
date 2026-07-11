
-- 1) Generate schedule (straight-line)
CREATE OR REPLACE FUNCTION public.fin_generate_penyusutan(_aset_id uuid, _from_periode text, _to_periode text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_aset record;
  v_beban numeric;
  v_cur date;
  v_end date;
  v_period text;
  v_akm numeric;
  v_count int := 0;
BEGIN
  IF NOT public.fin_can_edit(auth.uid()) THEN RAISE EXCEPTION 'Tidak berhak'; END IF;
  SELECT * INTO v_aset FROM public.fin_aset WHERE id=_aset_id;
  IF v_aset IS NULL THEN RAISE EXCEPTION 'Aset tidak ditemukan'; END IF;
  IF COALESCE(v_aset.umur_bulan,0) <= 0 THEN RAISE EXCEPTION 'Umur bulan harus > 0'; END IF;

  v_beban := (COALESCE(v_aset.harga_perolehan,0) - COALESCE(v_aset.nilai_residu,0)) / v_aset.umur_bulan;
  v_cur := to_date(_from_periode || '-01','YYYY-MM-DD');
  v_end := to_date(_to_periode   || '-01','YYYY-MM-DD');
  IF v_cur > v_end THEN RAISE EXCEPTION 'Periode tidak valid'; END IF;

  SELECT COALESCE(SUM(beban),0) INTO v_akm FROM public.fin_aset_penyusutan
    WHERE aset_id=_aset_id AND to_date(periode||'-01','YYYY-MM-DD') < v_cur;

  WHILE v_cur <= v_end LOOP
    v_period := to_char(v_cur,'YYYY-MM');
    IF NOT EXISTS (SELECT 1 FROM public.fin_aset_penyusutan WHERE aset_id=_aset_id AND periode=v_period) THEN
      v_akm := v_akm + v_beban;
      INSERT INTO public.fin_aset_penyusutan(aset_id, periode, tanggal, beban, akumulasi, nilai_buku, posted)
      VALUES (_aset_id, v_period, (v_cur + INTERVAL '1 month - 1 day')::date,
              round(v_beban,2), round(v_akm,2),
              round(GREATEST(COALESCE(v_aset.nilai_residu,0), COALESCE(v_aset.harga_perolehan,0) - v_akm),2),
              false);
      v_count := v_count + 1;
    END IF;
    v_cur := v_cur + INTERVAL '1 month';
  END LOOP;
  RETURN v_count;
END $$;

-- 2) Post periode -> journal
CREATE OR REPLACE FUNCTION public.fin_post_penyusutan_periode(_periode text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  r record; v_entry uuid; v_beban_coa text; v_akm_coa text; v_count int := 0; v_tgl date;
BEGIN
  IF NOT public.fin_can_edit(auth.uid()) THEN RAISE EXCEPTION 'Tidak berhak'; END IF;
  v_tgl := (to_date(_periode||'-01','YYYY-MM-DD') + INTERVAL '1 month - 1 day')::date;

  FOR r IN
    SELECT ap.*, a.nama, a.coa_beban_penyusutan, a.coa_akm_penyusutan, a.cost_center_code
      FROM public.fin_aset_penyusutan ap
      JOIN public.fin_aset a ON a.id = ap.aset_id
     WHERE ap.periode = _periode AND ap.posted = false AND ap.beban > 0
     FOR UPDATE
  LOOP
    v_beban_coa := COALESCE(r.coa_beban_penyusutan, '6-4000');
    v_akm_coa   := COALESCE(r.coa_akm_penyusutan,   '1-5900');
    v_entry := public.fin_post_journal(
      v_tgl, 'penyusutan', r.id, 'PNY-'||_periode,
      'Penyusutan '||_periode||' — '||r.nama,
      jsonb_build_array(
        jsonb_build_object('coa_code',v_beban_coa,'debit',r.beban,'kredit',0,
                           'keterangan','Beban penyusutan '||r.nama,
                           'cost_center_code',r.cost_center_code),
        jsonb_build_object('coa_code',v_akm_coa,'debit',0,'kredit',r.beban,
                           'keterangan','Akumulasi penyusutan '||r.nama)
      )
    );
    IF v_entry IS NOT NULL THEN
      UPDATE public.fin_aset_penyusutan SET posted=true WHERE id=r.id;
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END $$;

-- 3) Trigger: keep fin_aset akumulasi & nilai_buku in sync
CREATE OR REPLACE FUNCTION public.fin_aset_recalc()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_akm numeric; v_harga numeric; v_residu numeric;
BEGIN
  v_id := COALESCE(NEW.aset_id, OLD.aset_id);
  SELECT COALESCE(SUM(beban),0) INTO v_akm FROM public.fin_aset_penyusutan WHERE aset_id=v_id;
  SELECT harga_perolehan, nilai_residu INTO v_harga, v_residu FROM public.fin_aset WHERE id=v_id;
  UPDATE public.fin_aset
     SET akumulasi_penyusutan = round(v_akm,2),
         nilai_buku = round(GREATEST(COALESCE(v_residu,0), COALESCE(v_harga,0) - v_akm),2)
   WHERE id = v_id;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_fin_aset_recalc ON public.fin_aset_penyusutan;
CREATE TRIGGER trg_fin_aset_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.fin_aset_penyusutan
FOR EACH ROW EXECUTE FUNCTION public.fin_aset_recalc();
