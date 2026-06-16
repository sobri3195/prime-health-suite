
-- Ensure MDR expense COA exists
INSERT INTO public.fin_coa (code, name, type, is_active)
VALUES ('6-3000','Beban MDR Kartu','Expense', true)
ON CONFLICT (code) DO NOTHING;

-- Idempotency columns: link back to the auto-generated journal entry
ALTER TABLE public.fin_pembayaran  ADD COLUMN IF NOT EXISTS posted_journal_id uuid;
ALTER TABLE public.fin_expense     ADD COLUMN IF NOT EXISTS posted_journal_id uuid;
ALTER TABLE public.fin_bukti_setor ADD COLUMN IF NOT EXISTS posted_journal_id uuid;

-- ===== Helper: resolve a kas/bank COA from a (metode, bank text) pair =====
CREATE OR REPLACE FUNCTION public.fin_resolve_cash_bank_coa(_metode text, _bank text)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_metode text := lower(coalesce(_metode,''));
  v_bank   text := lower(coalesce(_bank,''));
  v_code   text;
BEGIN
  IF v_metode IN ('cash','tunai','kas') AND v_bank NOT ILIKE '%kecil%' THEN
    RETURN '1-1000';
  END IF;
  IF v_bank ILIKE '%kas kecil%' OR v_metode ILIKE '%kas kecil%' THEN
    RETURN '1-1100';
  END IF;
  IF v_bank ILIKE '%bca%' THEN RETURN '1-1200'; END IF;
  IF v_bank ILIKE '%mandiri%' THEN RETURN '1-1210'; END IF;
  -- Fallback: first active bank/cash account
  SELECT code INTO v_code FROM public.fin_coa
   WHERE is_active = true AND type='Asset' AND (name ILIKE 'bank%' OR name ILIKE 'kas%')
   ORDER BY code LIMIT 1;
  RETURN coalesce(v_code, '1-1000');
END;
$$;

-- ===== Helper: insert a balanced journal entry from arrays =====
CREATE OR REPLACE FUNCTION public.fin_post_journal(
  _tanggal date,
  _sumber text,
  _ref_id uuid,
  _ref_no text,
  _keterangan text,
  _lines jsonb  -- array of {coa_code, debit, kredit, keterangan, cost_center_code}
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry uuid;
  v_total numeric := 0;
  v_no text;
  v_line jsonb;
  v_nama text;
BEGIN
  -- total debit
  SELECT coalesce(sum( (l->>'debit')::numeric ), 0) INTO v_total
    FROM jsonb_array_elements(_lines) l;
  IF v_total <= 0 THEN RETURN NULL; END IF;

  v_no := 'JRN-' || to_char(_tanggal,'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text),1,6));

  INSERT INTO public.fin_journal_entry (no_jurnal, tanggal, sumber, ref_id, ref_no, keterangan, total, status)
  VALUES (v_no, _tanggal, _sumber, _ref_id, _ref_no, _keterangan, v_total, 'posted')
  RETURNING id INTO v_entry;

  FOR v_line IN SELECT * FROM jsonb_array_elements(_lines) LOOP
    SELECT name INTO v_nama FROM public.fin_coa WHERE code = v_line->>'coa_code';
    INSERT INTO public.fin_journal_line (entry_id, coa_code, coa_nama, debit, kredit, keterangan, cost_center_code)
    VALUES (
      v_entry,
      v_line->>'coa_code',
      coalesce(v_nama, v_line->>'coa_code'),
      coalesce((v_line->>'debit')::numeric, 0),
      coalesce((v_line->>'kredit')::numeric, 0),
      v_line->>'keterangan',
      v_line->>'cost_center_code'
    );
  END LOOP;

  RETURN v_entry;
END;
$$;

-- ===== Trigger 1: fin_pembayaran -> Dr Bank/Kas + Dr Beban MDR, Cr Piutang =====
CREATE OR REPLACE FUNCTION public.fin_post_pembayaran()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_coa text;
  v_piutang_coa text := '1-1300';
  v_payer_id uuid;
  v_lines jsonb;
  v_entry uuid;
  v_netto numeric := coalesce(NEW.netto, NEW.jumlah);
  v_mdr   numeric := coalesce(NEW.mdr, 0);
  v_jumlah numeric := coalesce(NEW.jumlah, 0);
BEGIN
  IF NEW.posted_journal_id IS NOT NULL THEN RETURN NEW; END IF;
  IF coalesce(NEW.status,'posted') IN ('void','draft','cancelled') THEN RETURN NEW; END IF;
  IF v_jumlah <= 0 THEN RETURN NEW; END IF;

  -- pick piutang COA based on invoice payer
  SELECT payer_id INTO v_payer_id FROM public.fin_invoice WHERE id = NEW.invoice_id;
  IF v_payer_id IS NOT NULL THEN
    v_piutang_coa := '1-1310'; -- asuransi
  END IF;

  v_bank_coa := public.fin_resolve_cash_bank_coa(NEW.metode, NEW.bank);

  v_lines := jsonb_build_array(
    jsonb_build_object('coa_code', v_bank_coa, 'debit', v_netto, 'kredit', 0,
                       'keterangan', 'Penerimaan pembayaran invoice'),
    jsonb_build_object('coa_code', v_piutang_coa, 'debit', 0, 'kredit', v_jumlah,
                       'keterangan', 'Pelunasan piutang')
  );
  IF v_mdr > 0 THEN
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('coa_code','6-3000','debit', v_mdr, 'kredit', 0,
                         'keterangan','Biaya MDR kartu')
    );
  END IF;

  v_entry := public.fin_post_journal(
    NEW.tanggal,
    'pembayaran',
    NEW.id,
    (SELECT no_invoice FROM public.fin_invoice WHERE id = NEW.invoice_id),
    'Pembayaran invoice',
    v_lines
  );

  IF v_entry IS NOT NULL THEN
    UPDATE public.fin_pembayaran SET posted_journal_id = v_entry WHERE id = NEW.id;
    -- update invoice.dibayar
    UPDATE public.fin_invoice
       SET dibayar = coalesce(dibayar,0) + v_jumlah,
           status = CASE WHEN coalesce(dibayar,0) + v_jumlah >= total THEN 'paid' ELSE status END
     WHERE id = NEW.invoice_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fin_pembayaran_post ON public.fin_pembayaran;
CREATE TRIGGER trg_fin_pembayaran_post
AFTER INSERT ON public.fin_pembayaran
FOR EACH ROW EXECUTE FUNCTION public.fin_post_pembayaran();

-- ===== Trigger 2: fin_expense -> Dr coa_code, Cr Kas/Bank =====
CREATE OR REPLACE FUNCTION public.fin_post_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bank_coa text;
  v_total numeric := coalesce(NEW.total, 0);
  v_subtotal numeric := coalesce(NEW.subtotal, v_total);
  v_pajak numeric := coalesce(NEW.pajak, 0);
  v_entry uuid;
  v_lines jsonb;
BEGIN
  IF NEW.posted_journal_id IS NOT NULL THEN RETURN NEW; END IF;
  IF coalesce(NEW.status,'posted') IN ('void','draft','cancelled') THEN RETURN NEW; END IF;
  IF v_total <= 0 OR NEW.coa_code IS NULL THEN RETURN NEW; END IF;

  v_bank_coa := public.fin_resolve_cash_bank_coa(NEW.metode, NEW.bank);

  v_lines := jsonb_build_array(
    jsonb_build_object('coa_code', NEW.coa_code, 'debit', v_subtotal, 'kredit', 0,
                       'keterangan', coalesce(NEW.keterangan,'Beban'),
                       'cost_center_code', NEW.cost_center_code),
    jsonb_build_object('coa_code', v_bank_coa, 'debit', 0, 'kredit', v_total,
                       'keterangan', 'Pembayaran ' || coalesce(NEW.vendor_nama,'-'))
  );
  IF v_pajak > 0 THEN
    v_lines := jsonb_build_array(
      jsonb_build_object('coa_code', NEW.coa_code, 'debit', v_subtotal, 'kredit', 0,
                         'keterangan', coalesce(NEW.keterangan,'Beban'),
                         'cost_center_code', NEW.cost_center_code),
      jsonb_build_object('coa_code', '2-2000', 'debit', v_pajak, 'kredit', 0,
                         'keterangan','PPh dipotong'),
      jsonb_build_object('coa_code', v_bank_coa, 'debit', 0, 'kredit', v_total,
                         'keterangan', 'Pembayaran ' || coalesce(NEW.vendor_nama,'-'))
    );
  END IF;

  v_entry := public.fin_post_journal(
    NEW.tanggal, 'expense', NEW.id, NEW.no_voucher,
    coalesce(NEW.keterangan, 'Pengeluaran ' || coalesce(NEW.vendor_nama,'-')),
    v_lines
  );
  IF v_entry IS NOT NULL THEN
    UPDATE public.fin_expense SET posted_journal_id = v_entry WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fin_expense_post ON public.fin_expense;
CREATE TRIGGER trg_fin_expense_post
AFTER INSERT ON public.fin_expense
FOR EACH ROW EXECUTE FUNCTION public.fin_post_expense();

-- ===== Trigger 3: fin_bukti_setor -> Dr Bank, Cr Kas =====
CREATE OR REPLACE FUNCTION public.fin_post_bukti_setor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry uuid;
  v_amount numeric := coalesce(NEW.amount, 0);
BEGIN
  IF NEW.posted_journal_id IS NOT NULL THEN RETURN NEW; END IF;
  IF coalesce(NEW.status,'posted') IN ('void','draft','cancelled') THEN RETURN NEW; END IF;
  IF v_amount <= 0 OR NEW.bank_coa IS NULL OR NEW.kas_coa IS NULL THEN RETURN NEW; END IF;

  v_entry := public.fin_post_journal(
    NEW.tanggal, 'bukti_setor', NEW.id, NEW.no_setor,
    coalesce(NEW.keterangan,'Setor kas ke bank'),
    jsonb_build_array(
      jsonb_build_object('coa_code', NEW.bank_coa, 'debit', v_amount, 'kredit', 0,
                         'keterangan','Setor ke bank ' || coalesce(NEW.ref_bank,'')),
      jsonb_build_object('coa_code', NEW.kas_coa,  'debit', 0,        'kredit', v_amount,
                         'keterangan','Setor dari kas')
    )
  );
  IF v_entry IS NOT NULL THEN
    UPDATE public.fin_bukti_setor SET posted_journal_id = v_entry WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fin_bukti_setor_post ON public.fin_bukti_setor;
CREATE TRIGGER trg_fin_bukti_setor_post
AFTER INSERT ON public.fin_bukti_setor
FOR EACH ROW EXECUTE FUNCTION public.fin_post_bukti_setor();
