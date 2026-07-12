CREATE OR REPLACE FUNCTION public.fin_post_kas_kecil()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_entry uuid;
  v_amount numeric := coalesce(NEW.amount, 0);
  v_lines jsonb;
  v_is_out boolean;
BEGIN
  IF coalesce(NEW.status,'posted') IN ('void','draft','cancelled') THEN RETURN NEW; END IF;
  IF v_amount <= 0 OR NEW.coa_lawan IS NULL OR NEW.tipe IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND EXISTS (
    SELECT 1 FROM public.fin_journal_entry
     WHERE sumber = 'kas_kecil' AND ref_id = NEW.id AND status = 'posted'
  ) THEN RETURN NEW; END IF;

  v_is_out := lower(NEW.tipe) IN ('out','keluar');

  IF v_is_out THEN
    v_lines := jsonb_build_array(
      jsonb_build_object('coa_code', NEW.coa_lawan, 'debit', v_amount, 'kredit', 0,
                         'keterangan', coalesce(NEW.keterangan, 'Kas kecil')),
      jsonb_build_object('coa_code', '1-1100', 'debit', 0, 'kredit', v_amount,
                         'keterangan', 'Kas kecil - ' || coalesce(NEW.penerima,''))
    );
  ELSE
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
END $function$;