
-- ============ PERSEDIAAN ============
CREATE TABLE public.fin_persediaan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  satuan text DEFAULT 'pcs',
  kategori text,
  harga_beli numeric(14,2) DEFAULT 0,
  harga_jual numeric(14,2) DEFAULT 0,
  stok numeric(14,2) DEFAULT 0,
  min_stok numeric(14,2) DEFAULT 0,
  coa_persediaan text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_persediaan TO authenticated;
GRANT ALL ON public.fin_persediaan TO service_role;
ALTER TABLE public.fin_persediaan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_persediaan_view" ON public.fin_persediaan FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_persediaan_edit" ON public.fin_persediaan FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));
CREATE TRIGGER trg_fin_persediaan_updated BEFORE UPDATE ON public.fin_persediaan FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_persediaan_mutasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  persediaan_id uuid NOT NULL REFERENCES public.fin_persediaan(id) ON DELETE CASCADE,
  tipe text NOT NULL CHECK (tipe IN ('in','out','adjustment')),
  qty numeric(14,2) NOT NULL,
  harga numeric(14,2) DEFAULT 0,
  keterangan text,
  ref_no text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_persediaan_mutasi TO authenticated;
GRANT ALL ON public.fin_persediaan_mutasi TO service_role;
ALTER TABLE public.fin_persediaan_mutasi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_persediaan_mutasi_view" ON public.fin_persediaan_mutasi FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_persediaan_mutasi_edit" ON public.fin_persediaan_mutasi FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));
CREATE TRIGGER trg_fin_persediaan_mutasi_updated BEFORE UPDATE ON public.fin_persediaan_mutasi FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- apply stock movement
CREATE OR REPLACE FUNCTION public.fin_apply_persediaan_mutasi()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tipe = 'in' THEN
    UPDATE public.fin_persediaan SET stok = stok + NEW.qty WHERE id = NEW.persediaan_id;
  ELSIF NEW.tipe = 'out' THEN
    UPDATE public.fin_persediaan SET stok = GREATEST(0, stok - NEW.qty) WHERE id = NEW.persediaan_id;
  ELSIF NEW.tipe = 'adjustment' THEN
    UPDATE public.fin_persediaan SET stok = NEW.qty WHERE id = NEW.persediaan_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_fin_persediaan_mutasi_apply AFTER INSERT ON public.fin_persediaan_mutasi
  FOR EACH ROW EXECUTE FUNCTION public.fin_apply_persediaan_mutasi();

-- ============ ASET TETAP ============
CREATE TABLE public.fin_aset (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text UNIQUE NOT NULL,
  nama text NOT NULL,
  kategori text,
  cost_center_code text,
  tanggal_perolehan date NOT NULL DEFAULT CURRENT_DATE,
  harga_perolehan numeric(14,2) NOT NULL DEFAULT 0,
  nilai_residu numeric(14,2) DEFAULT 0,
  umur_bulan int DEFAULT 60,
  metode text DEFAULT 'straight_line',
  akumulasi_penyusutan numeric(14,2) DEFAULT 0,
  nilai_buku numeric(14,2) DEFAULT 0,
  status text DEFAULT 'aktif',
  coa_aset text,
  coa_akm_penyusutan text,
  coa_beban_penyusutan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_aset TO authenticated;
GRANT ALL ON public.fin_aset TO service_role;
ALTER TABLE public.fin_aset ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_aset_view" ON public.fin_aset FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_aset_edit" ON public.fin_aset FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));
CREATE TRIGGER trg_fin_aset_updated BEFORE UPDATE ON public.fin_aset FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_aset_penyusutan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aset_id uuid NOT NULL REFERENCES public.fin_aset(id) ON DELETE CASCADE,
  periode text NOT NULL,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  beban numeric(14,2) NOT NULL DEFAULT 0,
  akumulasi numeric(14,2) NOT NULL DEFAULT 0,
  nilai_buku numeric(14,2) NOT NULL DEFAULT 0,
  posted boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (aset_id, periode)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_aset_penyusutan TO authenticated;
GRANT ALL ON public.fin_aset_penyusutan TO service_role;
ALTER TABLE public.fin_aset_penyusutan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_aset_penyusutan_view" ON public.fin_aset_penyusutan FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_aset_penyusutan_edit" ON public.fin_aset_penyusutan FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));

-- ============ KAS KECIL ============
CREATE TABLE public.fin_kas_kecil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  no_voucher text UNIQUE NOT NULL,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  tipe text NOT NULL CHECK (tipe IN ('penerimaan','pengeluaran','replenish')),
  keterangan text,
  penerima text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  coa_lawan text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_kas_kecil TO authenticated;
GRANT ALL ON public.fin_kas_kecil TO service_role;
ALTER TABLE public.fin_kas_kecil ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_kas_kecil_view" ON public.fin_kas_kecil FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_kas_kecil_edit" ON public.fin_kas_kecil FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));
CREATE TRIGGER trg_fin_kas_kecil_updated BEFORE UPDATE ON public.fin_kas_kecil FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- ============ BUKTI SETOR BANK ============
CREATE TABLE public.fin_bukti_setor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  no_setor text UNIQUE NOT NULL,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  bank_coa text NOT NULL,
  kas_coa text NOT NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  ref_bank text,
  keterangan text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_bukti_setor TO authenticated;
GRANT ALL ON public.fin_bukti_setor TO service_role;
ALTER TABLE public.fin_bukti_setor ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_bukti_setor_view" ON public.fin_bukti_setor FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_bukti_setor_edit" ON public.fin_bukti_setor FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));
CREATE TRIGGER trg_fin_bukti_setor_updated BEFORE UPDATE ON public.fin_bukti_setor FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- ============ SURAT PENAGIHAN ASURANSI ============
CREATE TABLE public.fin_surat_tagih (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  no_surat text UNIQUE NOT NULL,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  payer_id uuid,
  payer_nama text,
  periode_dari date,
  periode_sampai date,
  total numeric(14,2) DEFAULT 0,
  invoice_ids jsonb DEFAULT '[]'::jsonb,
  catatan text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_surat_tagih TO authenticated;
GRANT ALL ON public.fin_surat_tagih TO service_role;
ALTER TABLE public.fin_surat_tagih ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_surat_tagih_view" ON public.fin_surat_tagih FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_surat_tagih_edit" ON public.fin_surat_tagih FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));
CREATE TRIGGER trg_fin_surat_tagih_updated BEFORE UPDATE ON public.fin_surat_tagih FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- ============ RAB (Budget) ============
CREATE TABLE public.fin_rab (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periode text NOT NULL,
  coa_code text NOT NULL,
  coa_nama text,
  cost_center_code text,
  anggaran numeric(14,2) NOT NULL DEFAULT 0,
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (periode, coa_code, cost_center_code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_rab TO authenticated;
GRANT ALL ON public.fin_rab TO service_role;
ALTER TABLE public.fin_rab ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_rab_view" ON public.fin_rab FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_rab_edit" ON public.fin_rab FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));
CREATE TRIGGER trg_fin_rab_updated BEFORE UPDATE ON public.fin_rab FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();
