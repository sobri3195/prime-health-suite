
-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION public.fin_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =================== COA ===================
CREATE TABLE public.fin_coa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Asset','Liability','Equity','Revenue','Expense')),
  parent_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_coa TO service_role;
ALTER TABLE public.fin_coa ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fin_coa_updated BEFORE UPDATE ON public.fin_coa FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =================== Cost Center ===================
CREATE TABLE public.fin_cost_center (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pic TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_cost_center TO service_role;
ALTER TABLE public.fin_cost_center ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fin_cc_updated BEFORE UPDATE ON public.fin_cost_center FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =================== Dokter ===================
CREATE TABLE public.fin_dokter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  spesialisasi TEXT,
  default_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 40,
  npwp TEXT,
  is_ptkp_k0 BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_dokter TO service_role;
ALTER TABLE public.fin_dokter ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fin_dokter_updated BEFORE UPDATE ON public.fin_dokter FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =================== Karyawan ===================
CREATE TABLE public.fin_karyawan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  jabatan TEXT,
  gaji_pokok NUMERIC(15,2) NOT NULL DEFAULT 0,
  npwp TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_karyawan TO service_role;
ALTER TABLE public.fin_karyawan ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fin_karyawan_updated BEFORE UPDATE ON public.fin_karyawan FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =================== Payer ===================
CREATE TABLE public.fin_payer (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tipe TEXT NOT NULL CHECK (tipe IN ('Tunai','Asuransi','BPJS','Korporat')),
  term_hari INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_payer TO service_role;
ALTER TABLE public.fin_payer ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fin_payer_updated BEFORE UPDATE ON public.fin_payer FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =================== Vendor ===================
CREATE TABLE public.fin_vendor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kategori TEXT,
  npwp TEXT,
  term_hari INT NOT NULL DEFAULT 30,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_vendor TO service_role;
ALTER TABLE public.fin_vendor ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fin_vendor_updated BEFORE UPDATE ON public.fin_vendor FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =================== Kategori Layanan ===================
CREATE TABLE public.fin_kategori_layanan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_kategori_layanan TO service_role;
ALTER TABLE public.fin_kategori_layanan ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fin_katlay_updated BEFORE UPDATE ON public.fin_kategori_layanan FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =================== Layanan / Tarif ===================
CREATE TABLE public.fin_layanan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kategori_code TEXT,
  tarif NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_kena_pajak BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_layanan TO service_role;
ALTER TABLE public.fin_layanan ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fin_layanan_updated BEFORE UPDATE ON public.fin_layanan FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =================== Tarif Pajak ===================
CREATE TABLE public.fin_tarif_pajak (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  jenis TEXT NOT NULL CHECK (jenis IN ('PPN','PPh21','PPh23','PPh4(2)')),
  tarif_pct NUMERIC(5,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_tarif_pajak TO service_role;
ALTER TABLE public.fin_tarif_pajak ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fin_pajak_updated BEFORE UPDATE ON public.fin_tarif_pajak FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =================== Profil Klinik (singleton) ===================
CREATE TABLE public.fin_profil_klinik (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama TEXT NOT NULL,
  npwp TEXT,
  alamat TEXT,
  kota TEXT,
  telp TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_profil_klinik TO service_role;
ALTER TABLE public.fin_profil_klinik ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fin_profil_updated BEFORE UPDATE ON public.fin_profil_klinik FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

-- =================== SEED DATA ===================
INSERT INTO public.fin_coa (code, name, type, parent_code) VALUES
('1-1000','Kas','Asset',NULL),
('1-1100','Kas Kecil','Asset','1-1000'),
('1-1200','Bank BCA','Asset','1-1000'),
('1-1210','Bank Mandiri','Asset','1-1000'),
('1-1300','Piutang Pasien','Asset',NULL),
('1-1310','Piutang Asuransi','Asset','1-1300'),
('1-1320','Piutang BPJS','Asset','1-1300'),
('1-1400','Persediaan Obat','Asset',NULL),
('1-1500','Persediaan Bahan Medis','Asset',NULL),
('1-2000','Aset Tetap','Asset',NULL),
('1-2100','Peralatan Medis','Asset','1-2000'),
('1-2900','Akumulasi Penyusutan','Asset','1-2000'),
('2-1000','Hutang Usaha','Liability',NULL),
('2-1100','Hutang Vendor','Liability','2-1000'),
('2-2000','Hutang Pajak','Liability',NULL),
('2-2100','Hutang PPN','Liability','2-2000'),
('2-2200','Hutang PPh21','Liability','2-2000'),
('2-2300','Hutang PPh23','Liability','2-2000'),
('2-3000','Hutang Honor Dokter','Liability',NULL),
('2-4000','Hutang Bank','Liability',NULL),
('3-1000','Modal','Equity',NULL),
('3-2000','Laba Ditahan','Equity',NULL),
('4-1000','Pendapatan Jasa Medis','Revenue',NULL),
('4-1100','Pendapatan Konsultasi','Revenue','4-1000'),
('4-1200','Pendapatan Tindakan','Revenue','4-1000'),
('4-1300','Pendapatan Laboratorium','Revenue','4-1000'),
('4-1400','Pendapatan Radiologi','Revenue','4-1000'),
('4-2000','Pendapatan Penjualan Obat','Revenue',NULL),
('5-1000','HPP Obat & Bahan','Expense',NULL),
('5-2000','Beban Honor Dokter','Expense',NULL),
('6-1000','Beban Gaji Karyawan','Expense',NULL),
('6-2000','Beban Sewa','Expense',NULL),
('6-3000','Beban Listrik & Air','Expense',NULL),
('6-4000','Beban Pemasaran','Expense',NULL),
('6-5000','Beban Administrasi','Expense',NULL),
('6-6000','Beban Penyusutan','Expense',NULL),
('6-9000','Beban Pajak','Expense',NULL);

INSERT INTO public.fin_cost_center (code, name, pic) VALUES
('CC-POLI','Poliklinik Umum','dr. Andini'),
('CC-MATA','Klinik Mata','dr. Hartono'),
('CC-LAB','Laboratorium','Sri Wahyuni'),
('CC-FARM','Farmasi','Lisa Pratiwi'),
('CC-ADM','Administrasi','Budi Santoso');

INSERT INTO public.fin_dokter (code, name, spesialisasi, default_fee_pct, npwp) VALUES
('DR-001','dr. Andini Pertiwi','Umum',40,'01.234.567.8-901.000'),
('DR-002','dr. Hartono Wijaya, SpM','Mata',55,'02.345.678.9-012.000'),
('DR-003','dr. Maya Saraswati, SpA','Anak',50,'03.456.789.0-123.000'),
('DR-004','dr. Reza Aditya, SpPD','Penyakit Dalam',50,'04.567.890.1-234.000'),
('DR-005','dr. Sinta Larasati, SpKK','Kulit',45,'05.678.901.2-345.000'),
('DR-006','dr. Bagas Pratama, SpOG','Kandungan',55,'06.789.012.3-456.000');

INSERT INTO public.fin_karyawan (code, name, jabatan, gaji_pokok) VALUES
('KR-001','Sri Wahyuni','Analis Lab',6500000),
('KR-002','Lisa Pratiwi','Apoteker',8000000),
('KR-003','Budi Santoso','Admin & Kasir',5500000),
('KR-004','Rina Kartika','Perawat',6000000),
('KR-005','Dimas Aryo','Front Office',4800000),
('KR-006','Wulan Sari','Akunting',7500000);

INSERT INTO public.fin_payer (code, name, tipe, term_hari) VALUES
('PY-CASH','Tunai','Tunai',0),
('PY-BPJS','BPJS Kesehatan','BPJS',30),
('PY-AXA','AXA Mandiri','Asuransi',21),
('PY-ALLIANZ','Allianz','Asuransi',21),
('PY-PRU','Prudential','Asuransi',21),
('PY-INHEALTH','Mandiri Inhealth','Asuransi',30),
('PY-PERTAMINA','PT Pertamina','Korporat',45),
('PY-TELKOM','PT Telkom','Korporat',45);

INSERT INTO public.fin_vendor (code, name, kategori, npwp, term_hari) VALUES
('VD-KIMIA','PT Kimia Farma','Obat','01.111.222.3-444.000',30),
('VD-KALBE','PT Kalbe Farma','Obat','02.111.222.3-444.000',30),
('VD-AAA','PT Alkes Anugerah','Alat Medis','03.111.222.3-444.000',45),
('VD-PLN','PLN','Utilitas',NULL,14),
('VD-PDAM','PDAM','Utilitas',NULL,14),
('VD-OFFICE','PT Office Supply','ATK','04.111.222.3-444.000',30);

INSERT INTO public.fin_kategori_layanan (code, name) VALUES
('KL-KONS','Konsultasi'),
('KL-TIND','Tindakan Medis'),
('KL-LAB','Laboratorium'),
('KL-RAD','Radiologi'),
('KL-FARM','Farmasi');

INSERT INTO public.fin_layanan (code, name, kategori_code, tarif, is_kena_pajak) VALUES
('LY-K01','Konsultasi Dokter Umum','KL-KONS',150000,false),
('LY-K02','Konsultasi Dokter Spesialis','KL-KONS',300000,false),
('LY-T01','Tindakan Ringan','KL-TIND',250000,false),
('LY-T02','Operasi Minor','KL-TIND',2500000,false),
('LY-T03','Operasi Katarak','KL-TIND',8500000,false),
('LY-L01','Darah Lengkap','KL-LAB',180000,false),
('LY-L02','Gula Darah','KL-LAB',60000,false),
('LY-L03','Kolesterol Total','KL-LAB',95000,false),
('LY-R01','Rontgen Thorax','KL-RAD',275000,false),
('LY-R02','USG Abdomen','KL-RAD',400000,false),
('LY-F01','Obat Resep Racikan','KL-FARM',75000,true);

INSERT INTO public.fin_tarif_pajak (code, name, jenis, tarif_pct) VALUES
('PJ-PPN','PPN 11%','PPN',11),
('PJ-PPH21-1','PPh21 Lapisan 1 (0-60jt)','PPh21',5),
('PJ-PPH21-2','PPh21 Lapisan 2 (60-250jt)','PPh21',15),
('PJ-PPH21-3','PPh21 Lapisan 3 (250-500jt)','PPh21',25),
('PJ-PPH21-4','PPh21 Lapisan 4 (500jt-5M)','PPh21',30),
('PJ-PPH21-5','PPh21 Lapisan 5 (>5M)','PPh21',35),
('PJ-PPH23-JASA','PPh23 Jasa 2%','PPh23',2),
('PJ-PPH42-SEWA','PPh Final Sewa 10%','PPh4(2)',10);

INSERT INTO public.fin_profil_klinik (nama, npwp, alamat, kota, telp, email) VALUES
('Prime Health Suite','99.888.777.6-555.000','Jl. Sudirman Kav. 21','Jakarta Selatan','021-5550100','finance@primehealth.id');
