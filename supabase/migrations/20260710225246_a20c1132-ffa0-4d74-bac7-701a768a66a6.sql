-- Cancel reason + reschedule race guard
ALTER TABLE public.apps_booking ADD COLUMN IF NOT EXISTS cancel_reason text;

CREATE OR REPLACE FUNCTION public.apps_reschedule_booking_locked(
  _id uuid, _tanggal date, _jam_slot text
) RETURNS SETOF public.apps_booking
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_dokter uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _tanggal < CURRENT_DATE THEN RAISE EXCEPTION 'Tanggal baru tidak boleh di masa lalu'; END IF;
  SELECT dokter_id INTO v_dokter FROM public.apps_booking
    WHERE id = _id AND user_id = v_uid;
  IF v_dokter IS NULL THEN RAISE EXCEPTION 'Booking tidak ditemukan'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('apps_slot:'||v_dokter::text||':'||_tanggal::text)::bigint);
  IF EXISTS (
    SELECT 1 FROM public.apps_booking
     WHERE dokter_id = v_dokter AND tanggal = _tanggal AND jam_slot = _jam_slot
       AND id <> _id AND status IN ('pending','confirmed','checked_in')
  ) THEN
    RAISE EXCEPTION 'Slot baru sudah diambil. Pilih slot lain.';
  END IF;
  RETURN QUERY UPDATE public.apps_booking
     SET tanggal = _tanggal, jam_slot = _jam_slot, status = 'pending'
   WHERE id = _id AND user_id = v_uid AND status IN ('pending','confirmed')
   RETURNING *;
END $$;

GRANT EXECUTE ON FUNCTION public.apps_reschedule_booking_locked(uuid, date, text) TO authenticated;

-- Seed default slot minute setting (idempotent)
INSERT INTO public.clinic_setting (key, value)
  VALUES ('slot_menit_default', to_jsonb(15))
  ON CONFLICT (key) DO NOTHING;