
-- P0 #2: idempotent invoice per visit
ALTER TABLE public.fin_invoice ADD COLUMN IF NOT EXISTS source_visit_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS fin_invoice_source_visit_uidx
  ON public.fin_invoice(source_visit_id)
  WHERE source_visit_id IS NOT NULL AND status <> 'void';

-- P0 #4: prevent double check-in (partial unique on klinik_visit.booking_id)
CREATE UNIQUE INDEX IF NOT EXISTS klinik_visit_booking_uidx
  ON public.klinik_visit(booking_id)
  WHERE booking_id IS NOT NULL;

-- P0 #6: reject qty<=0 and disallow out beyond stock (before insert)
CREATE OR REPLACE FUNCTION public.klinik_guard_stock_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_stock numeric;
BEGIN
  IF NEW.quantity IS NULL OR NEW.quantity <= 0 THEN
    IF NEW.movement_type <> 'adjustment' THEN
      RAISE EXCEPTION 'Kuantitas mutasi harus > 0';
    END IF;
  END IF;
  IF NEW.movement_type = 'out' THEN
    SELECT stock INTO v_stock FROM public.klinik_obat WHERE id = NEW.obat_id FOR UPDATE;
    IF v_stock IS NULL THEN RAISE EXCEPTION 'Obat tidak ditemukan'; END IF;
    IF v_stock < NEW.quantity THEN
      RAISE EXCEPTION 'Stok tidak cukup (tersedia %, dibutuhkan %)', v_stock, NEW.quantity;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS klinik_stock_movement_guard ON public.klinik_stock_movement;
CREATE TRIGGER klinik_stock_movement_guard
  BEFORE INSERT ON public.klinik_stock_movement
  FOR EACH ROW EXECUTE FUNCTION public.klinik_guard_stock_movement();

-- Replace clamp trigger with strict subtract (guard above prevents negative)
CREATE OR REPLACE FUNCTION public.klinik_apply_stock_movement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE public.klinik_obat SET stock = stock + NEW.quantity WHERE id = NEW.obat_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE public.klinik_obat SET stock = stock - NEW.quantity WHERE id = NEW.obat_id;
  ELSIF NEW.movement_type = 'adjustment' THEN
    UPDATE public.klinik_obat SET stock = NEW.quantity WHERE id = NEW.obat_id;
  END IF;
  RETURN NEW;
END $$;

-- P0 #5: block edits to finalized medical record
CREATE OR REPLACE FUNCTION public.klinik_medrec_guard_final()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.is_final IS TRUE THEN
    -- allow only reverting is_final by super_admin/admin_klinik (amendment flow)
    IF NOT public.klinik_is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Rekam medis sudah difinalisasi. Hubungi admin untuk amandemen.';
    END IF;
  END IF;
  -- immutable columns
  NEW.visit_id := OLD.visit_id;
  NEW.pasien_id := OLD.pasien_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS klinik_medrec_final_guard ON public.klinik_medical_record;
CREATE TRIGGER klinik_medrec_final_guard
  BEFORE UPDATE ON public.klinik_medical_record
  FOR EACH ROW EXECUTE FUNCTION public.klinik_medrec_guard_final();

-- P0 #1: atomic dispense (per-obat advisory lock + FOR UPDATE + one tx)
CREATE OR REPLACE FUNCTION public.klinik_dispense_prescription_locked(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pres record; r record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('klinik_pres:'||_id::text)::bigint);
  SELECT * INTO v_pres FROM public.klinik_prescription WHERE id=_id FOR UPDATE;
  IF v_pres IS NULL THEN RAISE EXCEPTION 'Resep tidak ditemukan'; END IF;
  IF v_pres.status = 'dispensed' THEN RAISE EXCEPTION 'Resep sudah dibagikan'; END IF;

  -- lock every obat row deterministically to prevent deadlocks
  FOR r IN
    SELECT obat_id, SUM(quantity)::numeric AS qty
      FROM public.klinik_prescription_item
     WHERE prescription_id=_id AND obat_id IS NOT NULL
     GROUP BY obat_id
     ORDER BY obat_id
  LOOP
    PERFORM pg_advisory_xact_lock(hashtext('klinik_obat:'||r.obat_id::text)::bigint);
    -- guard trigger will FOR UPDATE + validate
    INSERT INTO public.klinik_stock_movement(obat_id, movement_type, quantity, ref_type, ref_id, note, created_by)
    VALUES (r.obat_id, 'out', r.qty, 'prescription', _id, 'Dispense resep', auth.uid());
  END LOOP;

  UPDATE public.klinik_prescription
     SET status='dispensed', dispensed_at=now(), dispensed_by=auth.uid()
   WHERE id=_id;
END $$;

GRANT EXECUTE ON FUNCTION public.klinik_dispense_prescription_locked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.klinik_guard_stock_movement() TO authenticated;
GRANT EXECUTE ON FUNCTION public.klinik_medrec_guard_final() TO authenticated;
