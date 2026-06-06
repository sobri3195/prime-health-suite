
-- 1) Profil pasien: kolom NIK + foto
ALTER TABLE public.apps_pasien
  ADD COLUMN IF NOT EXISTS nik text,
  ADD COLUMN IF NOT EXISTS foto_url text;

-- 2) Booking: nomor urut antrean harian (untuk posisi realtime)
ALTER TABLE public.apps_booking
  ADD COLUMN IF NOT EXISTS no_urut integer;

CREATE INDEX IF NOT EXISTS idx_apps_booking_tanggal_status
  ON public.apps_booking(tanggal, status);

-- 3) Tabel notifikasi pasien
CREATE TABLE IF NOT EXISTS public.apps_notif (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  title       text NOT NULL,
  body        text,
  type        text NOT NULL DEFAULT 'info', -- info | booking | reminder | resep
  deep_link   text,                          -- e.g. /apps/laporan
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps_notif TO authenticated;
GRANT ALL ON public.apps_notif TO service_role;

ALTER TABLE public.apps_notif ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pasien lihat notif sendiri"
  ON public.apps_notif FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Pasien update notif sendiri"
  ON public.apps_notif FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Pasien hapus notif sendiri"
  ON public.apps_notif FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_apps_notif_user_unread
  ON public.apps_notif(user_id, read_at, created_at DESC);

-- 4) Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.apps_booking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.apps_notif;
ALTER TABLE public.apps_booking REPLICA IDENTITY FULL;
ALTER TABLE public.apps_notif   REPLICA IDENTITY FULL;

-- 5) RPC posisi antrean (jumlah booking aktif lebih awal pada hari yang sama)
CREATE OR REPLACE FUNCTION public.apps_queue_position(_booking_id uuid)
RETURNS TABLE(posisi integer, total integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH me AS (
    SELECT tanggal, jam_slot FROM public.apps_booking WHERE id = _booking_id
  )
  SELECT
    (SELECT COUNT(*)::int FROM public.apps_booking b, me
       WHERE b.tanggal = me.tanggal
         AND b.status IN ('pending','confirmed','checked_in')
         AND b.jam_slot < me.jam_slot) AS posisi,
    (SELECT COUNT(*)::int FROM public.apps_booking b, me
       WHERE b.tanggal = me.tanggal
         AND b.status IN ('pending','confirmed','checked_in')) AS total;
$$;

-- 6) Cron H-1: pengingat booking besok (insert apps_notif)
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.apps_send_booking_reminders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  n integer := 0;
BEGIN
  INSERT INTO public.apps_notif (user_id, title, body, type, deep_link)
  SELECT
    b.user_id,
    'Pengingat: Booking besok',
    'Anda memiliki jadwal pemeriksaan dengan ' || b.dokter_nama
      || ' besok pukul ' || b.jam_slot || ' WIB. Mohon datang 15 menit lebih awal.',
    'reminder',
    '/apps/profil'
  FROM public.apps_booking b
  WHERE b.tanggal = (CURRENT_DATE + INTERVAL '1 day')::date
    AND b.status IN ('pending','confirmed')
    AND NOT EXISTS (
      SELECT 1 FROM public.apps_notif n
       WHERE n.user_id = b.user_id
         AND n.type = 'reminder'
         AND n.body LIKE '%' || b.jam_slot || '%'
         AND n.created_at::date = CURRENT_DATE
    );
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- Jadwalkan setiap hari pukul 09:00 WIB (02:00 UTC)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'apps-booking-reminders-daily') THEN
    PERFORM cron.schedule(
      'apps-booking-reminders-daily',
      '0 2 * * *',
      $cron$ SELECT public.apps_send_booking_reminders(); $cron$
    );
  END IF;
END $$;

-- 7) Trigger updated_at apps_notif
DROP TRIGGER IF EXISTS trg_apps_notif_updated ON public.apps_notif;
