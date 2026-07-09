
-- 1) Realtime apps_booking
ALTER TABLE public.apps_booking REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.apps_booking;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Atomic payment insert with advisory lock per invoice_id
CREATE OR REPLACE FUNCTION public.fin_create_payment_locked(
  _invoice_id uuid,
  _tanggal date,
  _metode text,
  _bank text,
  _no_kartu_last4 text,
  _jumlah numeric,
  _mdr numeric
) RETURNS TABLE(id uuid, dibayar_baru numeric, total numeric, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv record;
  v_new_paid numeric;
  v_status text;
  v_pay_id uuid;
BEGIN
  IF NOT public.fin_can_edit(auth.uid()) THEN
    RAISE EXCEPTION 'Tidak berhak melakukan pembayaran';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('fin_invoice_pay:' || _invoice_id::text)::bigint);

  SELECT * INTO v_inv FROM public.fin_invoice WHERE id = _invoice_id FOR UPDATE;
  IF v_inv IS NULL THEN RAISE EXCEPTION 'Invoice tidak ditemukan'; END IF;

  v_new_paid := COALESCE(v_inv.dibayar,0) + _jumlah;
  IF v_new_paid > COALESCE(v_inv.total,0) THEN
    RAISE EXCEPTION 'Pembayaran melebihi total invoice (sisa %, diinput %)',
      COALESCE(v_inv.total,0) - COALESCE(v_inv.dibayar,0), _jumlah;
  END IF;
  v_status := CASE WHEN v_new_paid >= v_inv.total THEN 'paid'
                   WHEN v_new_paid > 0 THEN 'partial'
                   ELSE v_inv.status END;

  INSERT INTO public.fin_pembayaran(invoice_id, tanggal, metode, bank, no_kartu_last4, jumlah, mdr, netto, status)
  VALUES (_invoice_id, _tanggal, _metode, _bank, _no_kartu_last4, _jumlah, COALESCE(_mdr,0), _jumlah - COALESCE(_mdr,0), 'draft')
  RETURNING fin_pembayaran.id INTO v_pay_id;

  UPDATE public.fin_invoice SET dibayar = v_new_paid, status = v_status WHERE id = _invoice_id;

  RETURN QUERY SELECT v_pay_id, v_new_paid, v_inv.total, v_status;
END $$;

GRANT EXECUTE ON FUNCTION public.fin_create_payment_locked(uuid,date,text,text,text,numeric,numeric) TO authenticated, service_role;

-- 3) Auto-close resolved tickets after 7 days (idempotent cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$ BEGIN
  PERFORM cron.unschedule('apps_ticket_autoclose');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
SELECT cron.schedule(
  'apps_ticket_autoclose',
  '15 1 * * *',
  $CRON$
  UPDATE public.apps_ticket
     SET status = 'closed', updated_at = now()
   WHERE status = 'resolved'
     AND updated_at < now() - interval '7 days'
  $CRON$
);
