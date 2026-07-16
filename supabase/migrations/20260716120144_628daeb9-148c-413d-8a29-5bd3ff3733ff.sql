
-- Atomic void for expense/voucher: locks header, marks void, reverses journal in one tx.
CREATE OR REPLACE FUNCTION public.fin_void_expense_atomic(
  _expense_id uuid,
  _reason text,
  _actor_id uuid DEFAULT NULL,
  _actor_email text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _hdr record;
  _entry record;
  _new_no text;
  _new_entry uuid;
  _today date := (now() AT TIME ZONE 'Asia/Jakarta')::date;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('fin_expense:' || _expense_id::text, 0));
  SELECT * INTO _hdr FROM fin_expense WHERE id = _expense_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Voucher tidak ditemukan'; END IF;
  IF _hdr.status = 'void' THEN RAISE EXCEPTION 'Voucher sudah void'; END IF;

  UPDATE fin_expense SET status = 'void', void_reason = _reason, updated_at = now()
    WHERE id = _expense_id;

  FOR _entry IN
    SELECT id, no_jurnal, sumber, ref_id
    FROM fin_journal_entry
    WHERE status = 'posted' AND sumber = 'expense' AND ref_id = _expense_id
  LOOP
    _new_no := 'REV-' || _entry.no_jurnal;
    INSERT INTO fin_journal_entry (no_jurnal, tanggal, sumber, ref_id, ref_no, keterangan, status, created_by, total)
    SELECT _new_no, _today, _entry.sumber, _entry.ref_id, _new_no,
           'Reversal: ' || _reason, 'posted', _actor_id,
           coalesce(sum(kredit),0)
      FROM fin_journal_line WHERE entry_id = _entry.id
    RETURNING id INTO _new_entry;

    INSERT INTO fin_journal_line (entry_id, coa_code, coa_nama, debit, kredit, keterangan, cost_center_code)
    SELECT _new_entry, coa_code, coa_nama, kredit, debit,
           'Reversal: ' || _reason, cost_center_code
      FROM fin_journal_line WHERE entry_id = _entry.id;

    UPDATE fin_journal_entry SET status = 'reversed', updated_at = now() WHERE id = _entry.id;
  END LOOP;

  INSERT INTO fin_audit_log (actor_id, actor_email, action, entity, entity_id, entity_no, reason, before)
  VALUES (_actor_id, _actor_email, 'void', 'expense', _expense_id, _hdr.no_voucher, _reason, to_jsonb(_hdr));

  RETURN jsonb_build_object('ok', true, 'expense_id', _expense_id);
END;
$$;

REVOKE ALL ON FUNCTION public.fin_void_expense_atomic(uuid, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fin_void_expense_atomic(uuid, text, uuid, text) TO service_role;
