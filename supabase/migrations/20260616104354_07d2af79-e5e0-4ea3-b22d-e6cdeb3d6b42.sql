
DROP TRIGGER IF EXISTS trg_fin_post_pembayaran ON public.fin_pembayaran;
DROP TRIGGER IF EXISTS trg_fin_post_expense ON public.fin_expense;

ALTER TABLE public.fin_invoice ADD COLUMN IF NOT EXISTS posted_journal_id uuid REFERENCES public.fin_journal_entry(id);
ALTER TABLE public.fin_pembayaran ADD COLUMN IF NOT EXISTS posted_at timestamptz;
ALTER TABLE public.fin_expense ADD COLUMN IF NOT EXISTS posted_at timestamptz;
ALTER TABLE public.fin_bukti_setor ADD COLUMN IF NOT EXISTS posted_at timestamptz;
ALTER TABLE public.fin_invoice ADD COLUMN IF NOT EXISTS posted_at timestamptz;

CREATE OR REPLACE VIEW public.fin_posting_audit AS
  SELECT
    je.id AS journal_id, je.no_jurnal, je.tanggal, je.sumber, je.ref_id, je.ref_no,
    je.total, je.status AS journal_status, je.created_at AS posted_at,
    CASE je.sumber
      WHEN 'pembayaran' THEN 'trigger:fin_post_pembayaran'
      WHEN 'expense' THEN 'server_fn:upsertExpense'
      WHEN 'payment' THEN 'server_fn:createPayment'
      WHEN 'invoice' THEN 'server_fn:upsertInvoice'
      WHEN 'bukti_setor' THEN 'trigger:fin_post_bukti_setor'
      WHEN 'manual' THEN 'server_fn:manual'
      ELSE je.sumber
    END AS posted_by
  FROM public.fin_journal_entry je;

GRANT SELECT ON public.fin_posting_audit TO authenticated;
GRANT ALL ON public.fin_posting_audit TO service_role;

CREATE OR REPLACE FUNCTION public.fin_recon_jurnal(_from date, _to date)
RETURNS TABLE(sumber text, live_count bigint, live_total numeric, posted_count bigint, posted_total numeric, ledger_total numeric, selisih numeric, unposted_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH src AS (
    SELECT 'pembayaran'::text AS sumber, COUNT(*)::bigint AS live_count, COALESCE(SUM(jumlah),0)::numeric AS live_total,
           COUNT(posted_journal_id)::bigint AS posted_count,
           COALESCE(SUM(CASE WHEN posted_journal_id IS NOT NULL THEN jumlah ELSE 0 END),0)::numeric AS posted_total,
           COUNT(*) FILTER (WHERE posted_journal_id IS NULL)::bigint AS unposted_count
      FROM public.fin_pembayaran WHERE tanggal BETWEEN _from AND _to AND COALESCE(status,'posted') NOT IN ('void','draft','cancelled')
    UNION ALL
    SELECT 'expense', COUNT(*), COALESCE(SUM(total),0), COUNT(posted_journal_id),
           COALESCE(SUM(CASE WHEN posted_journal_id IS NOT NULL THEN total ELSE 0 END),0),
           COUNT(*) FILTER (WHERE posted_journal_id IS NULL)
      FROM public.fin_expense WHERE tanggal BETWEEN _from AND _to AND COALESCE(status,'posted') NOT IN ('void','draft','cancelled')
    UNION ALL
    SELECT 'bukti_setor', COUNT(*), COALESCE(SUM(amount),0), COUNT(posted_journal_id),
           COALESCE(SUM(CASE WHEN posted_journal_id IS NOT NULL THEN amount ELSE 0 END),0),
           COUNT(*) FILTER (WHERE posted_journal_id IS NULL)
      FROM public.fin_bukti_setor WHERE tanggal BETWEEN _from AND _to AND COALESCE(status,'posted') NOT IN ('void','draft','cancelled')
    UNION ALL
    SELECT 'invoice', COUNT(*), COALESCE(SUM(total),0), COUNT(posted_journal_id),
           COALESCE(SUM(CASE WHEN posted_journal_id IS NOT NULL THEN total ELSE 0 END),0),
           COUNT(*) FILTER (WHERE posted_journal_id IS NULL)
      FROM public.fin_invoice WHERE tanggal BETWEEN _from AND _to AND COALESCE(status,'') NOT IN ('void','cancelled')
  ),
  ledger AS (
    SELECT CASE WHEN je.sumber IN ('pembayaran','payment') THEN 'pembayaran' ELSE je.sumber END AS sumber,
           SUM(je.total)::numeric AS ledger_total
      FROM public.fin_journal_entry je
     WHERE je.tanggal BETWEEN _from AND _to AND je.status='posted'
     GROUP BY 1
  )
  SELECT s.sumber, s.live_count, s.live_total, s.posted_count, s.posted_total,
         COALESCE(l.ledger_total,0)::numeric,
         (s.live_total - COALESCE(l.ledger_total,0))::numeric,
         s.unposted_count
    FROM src s LEFT JOIN ledger l ON l.sumber = s.sumber
   ORDER BY s.sumber;
$$;

GRANT EXECUTE ON FUNCTION public.fin_recon_jurnal(date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.fin_recon_unposted(_from date, _to date)
RETURNS TABLE(sumber text, id uuid, ref_no text, tanggal date, amount numeric, keterangan text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM (
    SELECT 'pembayaran'::text AS sumber, p.id, COALESCE(i.no_invoice,'-')::text AS ref_no, p.tanggal, p.jumlah::numeric AS amount,
           ('Pembayaran '||COALESCE(i.no_invoice,''))::text AS keterangan
      FROM public.fin_pembayaran p LEFT JOIN public.fin_invoice i ON i.id=p.invoice_id
     WHERE p.posted_journal_id IS NULL AND p.tanggal BETWEEN _from AND _to AND COALESCE(p.status,'posted') NOT IN ('void','draft','cancelled')
    UNION ALL
    SELECT 'expense', e.id, e.no_voucher, e.tanggal, e.total, COALESCE(e.keterangan, e.vendor_nama,'-')
      FROM public.fin_expense e
     WHERE e.posted_journal_id IS NULL AND e.tanggal BETWEEN _from AND _to AND COALESCE(e.status,'posted') NOT IN ('void','draft','cancelled')
    UNION ALL
    SELECT 'bukti_setor', b.id, b.no_setor, b.tanggal, b.amount, COALESCE(b.keterangan,'-')
      FROM public.fin_bukti_setor b
     WHERE b.posted_journal_id IS NULL AND b.tanggal BETWEEN _from AND _to AND COALESCE(b.status,'posted') NOT IN ('void','draft','cancelled')
    UNION ALL
    SELECT 'invoice', i.id, i.no_invoice, i.tanggal, i.total, ('Invoice '||COALESCE(i.patient_name,i.patient_code,''))::text
      FROM public.fin_invoice i
     WHERE i.posted_journal_id IS NULL AND i.tanggal BETWEEN _from AND _to AND COALESCE(i.status,'') NOT IN ('void','cancelled')
  ) u ORDER BY u.tanggal DESC, u.ref_no LIMIT 500;
$$;

GRANT EXECUTE ON FUNCTION public.fin_recon_unposted(date,date) TO authenticated;
