
CREATE OR REPLACE FUNCTION public.klinik_add_invoice_payment_locked(
  _invoice_id uuid, _amount numeric, _method text, _bank text, _no_kartu_last4 text
) RETURNS TABLE(dibayar_baru numeric, status text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_inv record; v_new numeric; v_status text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Jumlah harus > 0'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('fin_invoice_pay:'||_invoice_id::text)::bigint);
  SELECT * INTO v_inv FROM public.fin_invoice WHERE id=_invoice_id FOR UPDATE;
  IF v_inv IS NULL THEN RAISE EXCEPTION 'Invoice tidak ditemukan'; END IF;
  IF COALESCE(v_inv.status,'') = 'void' THEN RAISE EXCEPTION 'Invoice void'; END IF;
  IF COALESCE(v_inv.dibayar,0) + _amount > COALESCE(v_inv.total,0) THEN
    RAISE EXCEPTION 'Melebihi sisa tagihan (sisa %, diinput %)',
      COALESCE(v_inv.total,0)-COALESCE(v_inv.dibayar,0), _amount;
  END IF;
  v_new := COALESCE(v_inv.dibayar,0) + _amount;
  v_status := CASE WHEN v_new >= v_inv.total THEN 'paid'
                   WHEN v_new > 0 THEN 'partial' ELSE 'unpaid' END;
  INSERT INTO public.fin_pembayaran(invoice_id, tanggal, metode, bank, no_kartu_last4, jumlah, mdr, netto, status)
  VALUES (_invoice_id, CURRENT_DATE, _method, _bank, _no_kartu_last4, _amount, 0, _amount, 'posted');
  UPDATE public.fin_invoice SET dibayar = v_new, status = v_status WHERE id = _invoice_id;
  RETURN QUERY SELECT v_new, v_status;
END $$;
GRANT EXECUTE ON FUNCTION public.klinik_add_invoice_payment_locked(uuid,numeric,text,text,text) TO authenticated;
