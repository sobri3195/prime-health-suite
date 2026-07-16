
-- P1: atomic document numbering (invoice/voucher/journal) to eliminate
-- the read-then-increment race in JS nextNo().

CREATE TABLE IF NOT EXISTS public.fin_doc_seq (
  prefix text NOT NULL,
  yyyymm text NOT NULL,
  next_no integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (prefix, yyyymm)
);
GRANT SELECT ON public.fin_doc_seq TO authenticated;
GRANT ALL ON public.fin_doc_seq TO service_role;
ALTER TABLE public.fin_doc_seq ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fin_doc_seq_select ON public.fin_doc_seq;
DROP POLICY IF EXISTS fin_doc_seq_service ON public.fin_doc_seq;
CREATE POLICY fin_doc_seq_select ON public.fin_doc_seq
  FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY fin_doc_seq_service ON public.fin_doc_seq
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed sequence dengan max nomor yang sudah ada, agar tidak bentrok dengan
-- data historis yang terlanjur menggunakan pola serupa.
INSERT INTO public.fin_doc_seq (prefix, yyyymm, next_no)
SELECT 'INV', to_char(tanggal,'YYYYMM'),
       COALESCE(MAX(NULLIF(regexp_replace(no_invoice,'^.*-',''),'')::int),0)
  FROM public.fin_invoice
 WHERE no_invoice ~ '^INV-\d{6}-\d+$'
 GROUP BY to_char(tanggal,'YYYYMM')
ON CONFLICT (prefix, yyyymm) DO UPDATE
  SET next_no = GREATEST(fin_doc_seq.next_no, EXCLUDED.next_no);

INSERT INTO public.fin_doc_seq (prefix, yyyymm, next_no)
SELECT 'VCH', to_char(tanggal,'YYYYMM'),
       COALESCE(MAX(NULLIF(regexp_replace(no_voucher,'^.*-',''),'')::int),0)
  FROM public.fin_expense
 WHERE no_voucher ~ '^VCH-\d{6}-\d+$'
 GROUP BY to_char(tanggal,'YYYYMM')
ON CONFLICT (prefix, yyyymm) DO UPDATE
  SET next_no = GREATEST(fin_doc_seq.next_no, EXCLUDED.next_no);

INSERT INTO public.fin_doc_seq (prefix, yyyymm, next_no)
SELECT 'JV', to_char(tanggal,'YYYYMM'),
       COALESCE(MAX(NULLIF(regexp_replace(no_jurnal,'^.*-',''),'')::int),0)
  FROM public.fin_journal_entry
 WHERE no_jurnal ~ '^JV-\d{6}-\d+$'
 GROUP BY to_char(tanggal,'YYYYMM')
ON CONFLICT (prefix, yyyymm) DO UPDATE
  SET next_no = GREATEST(fin_doc_seq.next_no, EXCLUDED.next_no);

CREATE OR REPLACE FUNCTION public.fin_next_doc_no(_prefix text, _yyyymm text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_next integer;
BEGIN
  INSERT INTO public.fin_doc_seq(prefix, yyyymm, next_no)
       VALUES (_prefix, _yyyymm, 1)
  ON CONFLICT (prefix, yyyymm) DO UPDATE
     SET next_no    = fin_doc_seq.next_no + 1,
         updated_at = now()
  RETURNING next_no INTO v_next;
  RETURN _prefix || '-' || _yyyymm || '-' || lpad(v_next::text, 4, '0');
END $$;
REVOKE ALL ON FUNCTION public.fin_next_doc_no(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fin_next_doc_no(text, text) TO service_role;
