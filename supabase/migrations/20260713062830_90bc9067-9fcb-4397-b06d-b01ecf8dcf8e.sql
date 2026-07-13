
-- Atomic void invoice: lock invoice + reverse invoice journal + reverse all payment journals + mark payments void, in a single transaction.
CREATE OR REPLACE FUNCTION public.fin_void_invoice_atomic(
  _invoice_id uuid,
  _reason text,
  _kind text DEFAULT 'void',
  _actor_id uuid DEFAULT NULL,
  _actor_email text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv record;
  _entry record;
  _new_entry_id uuid;
  _new_no text;
  _today date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
  _pay_ids uuid[];
BEGIN
  IF _kind NOT IN ('void','refunded') THEN
    RAISE EXCEPTION 'invalid kind: %', _kind;
  END IF;

  -- Advisory lock scoped to this invoice to avoid double-void races.
  PERFORM pg_advisory_xact_lock(hashtextextended('fin_invoice:' || _invoice_id::text, 0));

  SELECT * INTO _inv FROM fin_invoice WHERE id = _invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice tidak ditemukan'; END IF;
  IF _inv.status IN ('void','refunded') THEN
    RAISE EXCEPTION 'Invoice sudah %', _inv.status;
  END IF;

  -- Update invoice + payments status
  UPDATE fin_invoice SET status = _kind, dibayar = 0, updated_at = now() WHERE id = _invoice_id;
  UPDATE fin_pembayaran SET status = 'void', updated_at = now()
    WHERE invoice_id = _invoice_id AND status <> 'void'
    RETURNING id INTO _pay_ids;

  -- Reverse all posted journals for this invoice and its payments in one pass.
  FOR _entry IN
    SELECT id, no_jurnal, sumber, ref_id
    FROM fin_journal_entry
    WHERE status = 'posted'
      AND (
        (sumber = 'invoice' AND ref_id = _invoice_id) OR
        (sumber = 'payment' AND ref_id IN (SELECT id FROM fin_pembayaran WHERE invoice_id = _invoice_id))
      )
  LOOP
    _new_no := 'REV-' || _entry.no_jurnal;
    INSERT INTO fin_journal_entry (no_jurnal, tanggal, sumber, ref_id, ref_no, keterangan, status, created_by)
    VALUES (_new_no, _today, _entry.sumber, _entry.ref_id, _new_no,
            'Reversal: ' || _reason, 'posted', _actor_id)
    RETURNING id INTO _new_entry_id;

    INSERT INTO fin_journal_line (entry_id, coa_code, coa_nama, debit, kredit, keterangan)
    SELECT _new_entry_id, coa_code, coa_nama,
           COALESCE(kredit, 0), COALESCE(debit, 0),
           keterangan
    FROM fin_journal_line WHERE entry_id = _entry.id;

    UPDATE fin_journal_entry SET status = 'reversed' WHERE id = _entry.id;
  END LOOP;

  -- Audit trail
  INSERT INTO fin_audit_log (actor_id, actor_email, action, entity, entity_id, entity_no, reason, before_data)
  VALUES (_actor_id, _actor_email, 'void', 'invoice', _invoice_id, _inv.no_invoice, _reason, to_jsonb(_inv));

  RETURN jsonb_build_object('ok', true, 'invoice_id', _invoice_id, 'kind', _kind);
END;
$$;

REVOKE ALL ON FUNCTION public.fin_void_invoice_atomic(uuid, text, text, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fin_void_invoice_atomic(uuid, text, text, uuid, text) TO service_role;
