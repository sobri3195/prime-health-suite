
CREATE OR REPLACE FUNCTION public.fin_delete_payment_locked(_payment_id uuid, _reason text)
RETURNS TABLE(invoice_id uuid, dibayar_baru numeric, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_pay record; v_inv record; v_new_paid numeric; v_status text;
BEGIN
  IF NOT public.fin_can_edit(auth.uid()) THEN RAISE EXCEPTION 'Tidak berhak'; END IF;
  SELECT * INTO v_pay FROM public.fin_pembayaran WHERE id=_payment_id FOR UPDATE;
  IF v_pay IS NULL THEN RAISE EXCEPTION 'Pembayaran tidak ditemukan'; END IF;
  IF v_pay.status = 'void' THEN RAISE EXCEPTION 'Pembayaran sudah void'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('fin_invoice_pay:' || v_pay.invoice_id::text)::bigint);
  SELECT * INTO v_inv FROM public.fin_invoice WHERE id=v_pay.invoice_id FOR UPDATE;

  UPDATE public.fin_pembayaran
     SET status='void', void_reason=COALESCE(_reason,'deleted')
   WHERE id=_payment_id;

  IF v_inv IS NOT NULL THEN
    v_new_paid := GREATEST(0, COALESCE(v_inv.dibayar,0) - COALESCE(v_pay.jumlah,0));
    v_status := CASE WHEN v_new_paid <= 0 THEN 'issued'
                     WHEN v_new_paid >= COALESCE(v_inv.total,0) THEN 'paid'
                     ELSE 'partial' END;
    UPDATE public.fin_invoice SET dibayar=v_new_paid, status=v_status WHERE id=v_inv.id;
    RETURN QUERY SELECT v_inv.id, v_new_paid, v_status;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fin_void_invoice_locked(_invoice_id uuid, _reason text, _kind text DEFAULT 'void')
RETURNS TABLE(voided_payments int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_count int := 0;
BEGIN
  IF NOT public.fin_can_edit(auth.uid()) THEN RAISE EXCEPTION 'Tidak berhak'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('fin_invoice_pay:' || _invoice_id::text)::bigint);

  UPDATE public.fin_pembayaran
     SET status='void', void_reason=COALESCE(_reason,'invoice_void')
   WHERE invoice_id=_invoice_id AND COALESCE(status,'') <> 'void';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.fin_invoice
     SET status=_kind, void_reason=_reason, dibayar=0
   WHERE id=_invoice_id;

  RETURN QUERY SELECT v_count;
END $$;
