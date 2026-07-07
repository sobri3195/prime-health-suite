
CREATE OR REPLACE FUNCTION public.apps_checkout_cart(
  _alamat_kirim text,
  _catatan text,
  _metode_bayar text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _no_order text;
  _order_id uuid;
  _total numeric := 0;
  _poin integer;
  _row record;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  IF _metode_bayar NOT IN ('transfer','cod') THEN
    _metode_bayar := 'transfer';
  END IF;

  -- Lock cart rows joined with products to prevent concurrent stock races
  PERFORM 1 FROM public.apps_cart_item c
    JOIN public.apps_produk p ON p.id = c.produk_id
    WHERE c.user_id = _uid
    FOR UPDATE OF p;

  IF NOT EXISTS (SELECT 1 FROM public.apps_cart_item WHERE user_id = _uid) THEN
    RAISE EXCEPTION 'Keranjang kosong';
  END IF;

  -- Validate stock under lock
  FOR _row IN
    SELECT c.qty, p.id AS pid, p.nama, p.harga, p.stok
    FROM public.apps_cart_item c
    JOIN public.apps_produk p ON p.id = c.produk_id
    WHERE c.user_id = _uid
  LOOP
    IF _row.qty > COALESCE(_row.stok, 0) THEN
      RAISE EXCEPTION 'Stok % kurang', _row.nama;
    END IF;
    _total := _total + (_row.harga * _row.qty);
  END LOOP;

  _no_order := 'ORD-' || to_char(now(),'YYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));

  INSERT INTO public.apps_order(user_id, no_order, total, alamat_kirim, catatan, metode_bayar)
    VALUES (_uid, _no_order, _total, _alamat_kirim, NULLIF(_catatan,''), _metode_bayar)
    RETURNING id INTO _order_id;

  INSERT INTO public.apps_order_item(order_id, produk_id, produk_nama, harga, qty, subtotal)
    SELECT _order_id, p.id, p.nama, p.harga, c.qty, p.harga * c.qty
    FROM public.apps_cart_item c
    JOIN public.apps_produk p ON p.id = c.produk_id
    WHERE c.user_id = _uid;

  -- Decrement stock atomically (only if column exists; skip if produk uses computed stok)
  UPDATE public.apps_produk p
    SET stok = GREATEST(0, COALESCE(p.stok,0) - c.qty)
    FROM public.apps_cart_item c
    WHERE c.produk_id = p.id AND c.user_id = _uid;

  DELETE FROM public.apps_cart_item WHERE user_id = _uid;

  _poin := floor(_total / 10000)::int;
  IF _poin > 0 THEN
    INSERT INTO public.apps_poin(user_id, delta, alasan, ref_type, ref_id)
      VALUES (_uid, _poin, 'Belanja ' || _no_order, 'order', _order_id);
  END IF;

  RETURN jsonb_build_object(
    'order_id', _order_id,
    'no_order', _no_order,
    'total', _total,
    'poin', _poin
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apps_checkout_cart(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apps_checkout_cart(text, text, text) TO authenticated;
