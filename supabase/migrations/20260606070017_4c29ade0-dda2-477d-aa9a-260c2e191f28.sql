
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.fin_invoice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_invoice TEXT NOT NULL UNIQUE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  patient_code TEXT NOT NULL,
  patient_name TEXT,
  dokter_id UUID REFERENCES public.fin_dokter(id) ON DELETE SET NULL,
  payer_id UUID REFERENCES public.fin_payer(id) ON DELETE SET NULL,
  kasir TEXT,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  pajak NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid',
  catatan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_invoice TO service_role;
ALTER TABLE public.fin_invoice ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.fin_invoice_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.fin_invoice(id) ON DELETE CASCADE,
  layanan_id UUID REFERENCES public.fin_layanan(id) ON DELETE SET NULL,
  layanan_nama TEXT NOT NULL,
  tarif NUMERIC(14,2) NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_invoice_item TO service_role;
ALTER TABLE public.fin_invoice_item ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.fin_pembayaran (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.fin_invoice(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  metode TEXT NOT NULL DEFAULT 'cash',
  bank TEXT,
  no_kartu_last4 TEXT,
  jumlah NUMERIC(14,2) NOT NULL DEFAULT 0,
  mdr NUMERIC(14,2) NOT NULL DEFAULT 0,
  netto NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.fin_pembayaran TO service_role;
ALTER TABLE public.fin_pembayaran ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_fin_invoice_tanggal ON public.fin_invoice(tanggal DESC);
CREATE INDEX idx_fin_invoice_dokter ON public.fin_invoice(dokter_id);
CREATE INDEX idx_fin_invoice_item_invoice ON public.fin_invoice_item(invoice_id);
CREATE INDEX idx_fin_pembayaran_invoice ON public.fin_pembayaran(invoice_id);

CREATE TRIGGER update_fin_invoice_updated_at BEFORE UPDATE ON public.fin_invoice
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
