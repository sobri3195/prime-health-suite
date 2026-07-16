
-- =============================================================================
-- P2 batch: atomic reversal + reset + queue "now serving" per counter helpers
-- =============================================================================

-- 1) fin_reverse_journal_atomic: reverse ALL posted journals for (sumber, ref_id)
--    in one transaction. Either every reversal + status flip succeeds, or none.
CREATE OR REPLACE FUNCTION public.fin_reverse_journal_atomic(
  _sumber text, _ref_id uuid, _tanggal date, _reason text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e record;
  v_new_entry uuid;
  v_new_no text;
  v_count int := 0;
BEGIN
  IF NOT public.fin_can_edit(auth.uid()) THEN
    RAISE EXCEPTION 'Tidak berhak melakukan reversal jurnal';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('fin_reverse:' || _sumber || ':' || _ref_id::text, 0));

  FOR e IN
    SELECT id, no_jurnal
      FROM public.fin_journal_entry
     WHERE sumber = _sumber AND ref_id = _ref_id AND status = 'posted'
     FOR UPDATE
  LOOP
    v_new_no := 'REV-' || e.no_jurnal;
    INSERT INTO public.fin_journal_entry
      (no_jurnal, tanggal, sumber, ref_id, ref_no, keterangan, status, total)
    SELECT v_new_no, _tanggal, _sumber, _ref_id, v_new_no,
           'Reversal: ' || _reason, 'posted',
           COALESCE(SUM(kredit), 0)
      FROM public.fin_journal_line WHERE entry_id = e.id
    RETURNING id INTO v_new_entry;

    INSERT INTO public.fin_journal_line
      (entry_id, coa_code, coa_nama, debit, kredit, keterangan, cost_center_code)
    SELECT v_new_entry, coa_code, coa_nama,
           COALESCE(kredit, 0), COALESCE(debit, 0),
           keterangan, cost_center_code
      FROM public.fin_journal_line WHERE entry_id = e.id;

    UPDATE public.fin_journal_entry SET status = 'reversed' WHERE id = e.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.fin_reverse_journal_atomic(text, uuid, date, text) TO authenticated;

-- 2) fin_reset_transactional_atomic: wipe operational finance tables in ONE txn.
--    Only super_admin may execute; audit row written inside the same transaction.
CREATE OR REPLACE FUNCTION public.fin_reset_transactional_atomic()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_results jsonb := '[]'::jsonb;
  v_tbl text;
  v_count bigint;
  v_tables text[] := ARRAY[
    'fin_journal_line','fin_journal_entry',
    'fin_pembayaran','fin_invoice_item','fin_invoice',
    'fin_expense_item','fin_expense',
    'fin_persediaan_mutasi','fin_aset_penyusutan',
    'fin_bukti_setor','fin_surat_tagih','fin_kas_kecil',
    'fin_bank_statement','fin_reconciliation','fin_rab'
  ];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uid AND role = 'super_admin') THEN
    RAISE EXCEPTION 'Hanya super_admin yang dapat reset data finance';
  END IF;

  FOREACH v_tbl IN ARRAY v_tables LOOP
    EXECUTE format('DELETE FROM public.%I', v_tbl);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    v_results := v_results || jsonb_build_object('table', v_tbl, 'deleted', v_count);
  END LOOP;

  INSERT INTO public.fin_audit_log (actor_id, action, entity, after)
  VALUES (v_uid, 'reset_transactional', 'finance',
          jsonb_build_object('tables', v_tables, 'results', v_results));

  RETURN jsonb_build_object('ok', true, 'results', v_results);
END $$;

GRANT EXECUTE ON FUNCTION public.fin_reset_transactional_atomic() TO authenticated;

-- 3) fin_pick_mdr_rule: deterministic MDR rule picker, prefers explicit bank
--    match over generic (bank IS NULL). Ordered by (bank match priority, coa_code).
CREATE OR REPLACE FUNCTION public.fin_pick_mdr_rule(_metode text, _bank text)
RETURNS TABLE(rate_pct numeric, fixed_fee numeric, coa_code text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.rate_pct, r.fixed_fee, r.coa_code
    FROM public.fin_mdr_rule r
   WHERE r.is_active = true
     AND r.metode = _metode
     AND (r.bank IS NULL OR r.bank = _bank)
   ORDER BY (r.bank = _bank) DESC NULLS LAST, r.bank NULLS LAST, r.coa_code
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.fin_pick_mdr_rule(text, text) TO authenticated;

-- 4) klinik_queue_now_serving: return one active row per counter (called/in_service).
CREATE OR REPLACE FUNCTION public.klinik_queue_now_serving(_date date DEFAULT CURRENT_DATE)
RETURNS TABLE(counter text, queue_no text, status text, nama text, no_rm text, dokter_nama text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (q.counter)
    q.counter, q.queue_no, q.status,
    p.nama, p.no_rm, d.name
  FROM public.klinik_queue q
  LEFT JOIN public.klinik_visit v ON v.id = q.visit_id
  LEFT JOIN public.apps_pasien p ON p.id = v.pasien_id
  LEFT JOIN public.fin_dokter d ON d.id = v.dokter_id
  WHERE q.queue_date = _date
    AND q.status IN ('called','in_service')
  ORDER BY q.counter,
           CASE q.status WHEN 'in_service' THEN 0 ELSE 1 END,
           q.called_at DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.klinik_queue_now_serving(date) TO authenticated;
