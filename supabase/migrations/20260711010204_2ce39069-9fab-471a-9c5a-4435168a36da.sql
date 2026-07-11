
-- Batch 7: Ensure auto-post triggers exist and add reconcile helper RPC

-- Ensure triggers fire on INSERT OR UPDATE (idempotent: trigger fns skip when posted_journal_id set)
DROP TRIGGER IF EXISTS trg_fin_post_pembayaran ON public.fin_pembayaran;
CREATE TRIGGER trg_fin_post_pembayaran
  AFTER INSERT OR UPDATE ON public.fin_pembayaran
  FOR EACH ROW EXECUTE FUNCTION public.fin_post_pembayaran();

DROP TRIGGER IF EXISTS trg_fin_post_expense ON public.fin_expense;
CREATE TRIGGER trg_fin_post_expense
  AFTER INSERT OR UPDATE ON public.fin_expense
  FOR EACH ROW EXECUTE FUNCTION public.fin_post_expense();

DROP TRIGGER IF EXISTS trg_fin_post_bukti_setor ON public.fin_bukti_setor;
CREATE TRIGGER trg_fin_post_bukti_setor
  AFTER INSERT OR UPDATE ON public.fin_bukti_setor
  FOR EACH ROW EXECUTE FUNCTION public.fin_post_bukti_setor();

DROP TRIGGER IF EXISTS trg_fin_post_kas_kecil ON public.fin_kas_kecil;
CREATE TRIGGER trg_fin_post_kas_kecil
  AFTER INSERT OR UPDATE ON public.fin_kas_kecil
  FOR EACH ROW EXECUTE FUNCTION public.fin_post_kas_kecil();

-- Reconcile: touch unposted rows so triggers re-attempt posting; safe & idempotent
CREATE OR REPLACE FUNCTION public.fin_rebuild_saldo(_from date, _to date)
RETURNS TABLE(sumber text, retried integer, posted integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_retried int; v_posted int;
BEGIN
  IF NOT public.fin_can_edit(auth.uid()) THEN
    RAISE EXCEPTION 'Tidak berhak melakukan rekonsiliasi';
  END IF;

  -- Pembayaran
  UPDATE public.fin_pembayaran SET tanggal = tanggal
    WHERE posted_journal_id IS NULL
      AND tanggal BETWEEN _from AND _to
      AND COALESCE(status,'posted') NOT IN ('void','draft','cancelled');
  GET DIAGNOSTICS v_retried = ROW_COUNT;
  SELECT COUNT(*)::int INTO v_posted FROM public.fin_pembayaran
    WHERE posted_journal_id IS NOT NULL AND tanggal BETWEEN _from AND _to;
  sumber := 'pembayaran'; retried := v_retried; posted := v_posted; RETURN NEXT;

  -- Expense
  UPDATE public.fin_expense SET tanggal = tanggal
    WHERE posted_journal_id IS NULL
      AND tanggal BETWEEN _from AND _to
      AND COALESCE(status,'posted') NOT IN ('void','draft','cancelled');
  GET DIAGNOSTICS v_retried = ROW_COUNT;
  SELECT COUNT(*)::int INTO v_posted FROM public.fin_expense
    WHERE posted_journal_id IS NOT NULL AND tanggal BETWEEN _from AND _to;
  sumber := 'expense'; retried := v_retried; posted := v_posted; RETURN NEXT;

  -- Bukti setor
  UPDATE public.fin_bukti_setor SET tanggal = tanggal
    WHERE posted_journal_id IS NULL
      AND tanggal BETWEEN _from AND _to
      AND COALESCE(status,'posted') NOT IN ('void','draft','cancelled');
  GET DIAGNOSTICS v_retried = ROW_COUNT;
  SELECT COUNT(*)::int INTO v_posted FROM public.fin_bukti_setor
    WHERE posted_journal_id IS NOT NULL AND tanggal BETWEEN _from AND _to;
  sumber := 'bukti_setor'; retried := v_retried; posted := v_posted; RETURN NEXT;

  RETURN;
END $$;

REVOKE ALL ON FUNCTION public.fin_rebuild_saldo(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fin_rebuild_saldo(date, date) TO authenticated;

-- Unbalance detector: entries where sum(debit) <> sum(kredit)
CREATE OR REPLACE FUNCTION public.fin_unbalanced_entries(_from date, _to date)
RETURNS TABLE(entry_id uuid, no_jurnal text, tanggal date, sumber text, total_debit numeric, total_kredit numeric, selisih numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT je.id, je.no_jurnal, je.tanggal, je.sumber,
         COALESCE(SUM(jl.debit),0)::numeric AS total_debit,
         COALESCE(SUM(jl.kredit),0)::numeric AS total_kredit,
         (COALESCE(SUM(jl.debit),0) - COALESCE(SUM(jl.kredit),0))::numeric AS selisih
    FROM public.fin_journal_entry je
    JOIN public.fin_journal_line jl ON jl.entry_id = je.id
   WHERE je.status='posted' AND je.tanggal BETWEEN _from AND _to
     AND public.fin_can_view(auth.uid())
   GROUP BY je.id, je.no_jurnal, je.tanggal, je.sumber
  HAVING COALESCE(SUM(jl.debit),0) <> COALESCE(SUM(jl.kredit),0)
   ORDER BY je.tanggal DESC;
$$;

REVOKE ALL ON FUNCTION public.fin_unbalanced_entries(date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fin_unbalanced_entries(date, date) TO authenticated;
