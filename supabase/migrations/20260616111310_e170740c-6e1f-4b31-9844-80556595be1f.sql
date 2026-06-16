REVOKE SELECT (npwp, phone, sip_number) ON public.fin_dokter FROM authenticated, anon;
GRANT SELECT (id, code, name, spesialisasi, default_fee_pct, is_ptkp_k0, is_active, created_at, updated_at, schedule_note) ON public.fin_dokter TO authenticated;

DROP VIEW IF EXISTS public.fin_posting_audit;
CREATE VIEW public.fin_posting_audit
WITH (security_invoker = on) AS
SELECT
  je.id AS journal_id,
  je.no_jurnal,
  je.tanggal,
  je.sumber,
  je.ref_id,
  je.ref_no,
  je.total,
  je.status AS journal_status,
  je.created_at AS posted_at,
  CASE je.sumber
    WHEN 'pembayaran'::text  THEN 'trigger:fin_post_pembayaran'::text
    WHEN 'expense'::text     THEN 'server_fn:upsertExpense'::text
    WHEN 'payment'::text     THEN 'server_fn:createPayment'::text
    WHEN 'invoice'::text     THEN 'server_fn:upsertInvoice'::text
    WHEN 'bukti_setor'::text THEN 'trigger:fin_post_bukti_setor'::text
    WHEN 'manual'::text      THEN 'server_fn:manual'::text
    ELSE je.sumber
  END AS posted_by
FROM public.fin_journal_entry je;

GRANT SELECT ON public.fin_posting_audit TO authenticated;
GRANT ALL ON public.fin_posting_audit TO service_role;