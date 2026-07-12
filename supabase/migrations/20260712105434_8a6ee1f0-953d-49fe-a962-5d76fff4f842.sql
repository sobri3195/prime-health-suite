
CREATE OR REPLACE FUNCTION public.apps_add_to_cart_locked(_produk_id uuid, _qty int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_stok int;
  v_active boolean;
  v_nama text;
  v_existing int;
  v_next int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated' USING ERRCODE='42501'; END IF;
  IF _qty IS NULL OR _qty < 1 OR _qty > 20 THEN RAISE EXCEPTION 'Qty invalid'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('apps_cart:'||v_uid::text||':'||_produk_id::text)::bigint);

  SELECT stok, is_active, nama INTO v_stok, v_active, v_nama
    FROM public.apps_produk WHERE id = _produk_id FOR UPDATE;
  IF v_nama IS NULL OR v_active IS NOT TRUE THEN RAISE EXCEPTION 'Produk tidak tersedia'; END IF;
  IF COALESCE(v_stok,0) <= 0 THEN RAISE EXCEPTION 'Stok % habis', v_nama; END IF;

  SELECT qty INTO v_existing FROM public.apps_cart_item
    WHERE user_id = v_uid AND produk_id = _produk_id FOR UPDATE;

  IF v_existing IS NULL THEN
    v_next := LEAST(20, v_stok, _qty);
    INSERT INTO public.apps_cart_item(user_id, produk_id, qty)
      VALUES (v_uid, _produk_id, v_next);
  ELSE
    v_next := LEAST(20, v_stok, v_existing + _qty);
    IF v_next <= v_existing THEN RAISE EXCEPTION 'Stok % tidak mencukupi', v_nama; END IF;
    UPDATE public.apps_cart_item SET qty = v_next
      WHERE user_id = v_uid AND produk_id = _produk_id;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.apps_add_to_cart_locked(uuid, int) TO authenticated;
