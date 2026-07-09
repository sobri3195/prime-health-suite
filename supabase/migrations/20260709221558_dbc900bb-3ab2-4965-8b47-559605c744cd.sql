
-- Batch 15 P1

-- 1) Auto-post journal untuk kas kecil
CREATE OR REPLACE FUNCTION public.fin_post_kas_kecil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry uuid;
  v_amount numeric := coalesce(NEW.amount, 0);
  v_lines jsonb;
BEGIN
  IF coalesce(NEW.status,'posted') IN ('void','draft','cancelled') THEN RETURN NEW; END IF;
  IF v_amount <= 0 OR NEW.coa_lawan IS NULL OR NEW.tipe IS NULL THEN RETURN NEW; END IF;
  -- Cegah double-posting jika update
  IF TG_OP = 'UPDATE' AND EXISTS (
    SELECT 1 FROM public.fin_journal_entry
     WHERE sumber = 'kas_kecil' AND ref_id = NEW.id AND status = 'posted'
  ) THEN RETURN NEW; END IF;

  IF NEW.tipe = 'out' THEN
    -- Pengeluaran: D biaya (coa_lawan), K kas kecil
    v_lines := jsonb_build_array(
      jsonb_build_object('coa_code', NEW.coa_lawan, 'debit', v_amount, 'kredit', 0,
                         'keterangan', coalesce(NEW.keterangan, 'Kas kecil')),
      jsonb_build_object('coa_code', '1-1100', 'debit', 0, 'kredit', v_amount,
                         'keterangan', 'Kas kecil - ' || coalesce(NEW.penerima,''))
    );
  ELSE
    -- Isi ulang: D kas kecil, K sumber (coa_lawan biasanya bank/kas besar)
    v_lines := jsonb_build_array(
      jsonb_build_object('coa_code', '1-1100', 'debit', v_amount, 'kredit', 0,
                         'keterangan', 'Isi ulang kas kecil'),
      jsonb_build_object('coa_code', NEW.coa_lawan, 'debit', 0, 'kredit', v_amount,
                         'keterangan', coalesce(NEW.keterangan,'Isi ulang kas kecil'))
    );
  END IF;

  v_entry := public.fin_post_journal(
    NEW.tanggal, 'kas_kecil', NEW.id, NEW.no_voucher,
    coalesce(NEW.keterangan, 'Kas kecil ' || NEW.tipe),
    v_lines
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_fin_post_kas_kecil ON public.fin_kas_kecil;
CREATE TRIGGER trg_fin_post_kas_kecil
AFTER INSERT ON public.fin_kas_kecil
FOR EACH ROW EXECUTE FUNCTION public.fin_post_kas_kecil();

-- 2) Schedule reminder booking H-1 setiap hari jam 00:00 UTC (07:00 WIB)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$ BEGIN
  PERFORM cron.unschedule('apps-send-booking-reminders');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'apps-send-booking-reminders',
  '0 0 * * *',
  $$SELECT public.apps_send_booking_reminders();$$
);
