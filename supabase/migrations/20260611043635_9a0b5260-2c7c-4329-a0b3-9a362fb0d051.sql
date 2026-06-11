
ALTER TABLE public.fin_invoice
  ADD COLUMN IF NOT EXISTS diskon numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dibayar numeric(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS void_reason text;

CREATE TABLE IF NOT EXISTS public.fin_expense (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  no_voucher text NOT NULL UNIQUE,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  vendor_id uuid REFERENCES public.fin_vendor(id) ON DELETE SET NULL,
  vendor_nama text,
  coa_code text,
  cost_center_code text,
  keterangan text,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  pajak numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  metode text NOT NULL DEFAULT 'cash',
  bank text,
  status text NOT NULL DEFAULT 'posted',
  void_reason text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_expense TO authenticated;
GRANT ALL ON public.fin_expense TO service_role;
ALTER TABLE public.fin_expense ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_expense_admin_all" ON public.fin_expense FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_klinik') OR public.has_role(auth.uid(), 'manajemen') OR public.has_role(auth.uid(), 'kasir'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_klinik') OR public.has_role(auth.uid(), 'manajemen') OR public.has_role(auth.uid(), 'kasir'));
CREATE TRIGGER trg_fin_expense_updated BEFORE UPDATE ON public.fin_expense FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.fin_expense_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES public.fin_expense(id) ON DELETE CASCADE,
  deskripsi text NOT NULL,
  coa_code text,
  qty numeric(14,2) NOT NULL DEFAULT 1,
  harga numeric(14,2) NOT NULL DEFAULT 0,
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_expense_item_expense ON public.fin_expense_item(expense_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_expense_item TO authenticated;
GRANT ALL ON public.fin_expense_item TO service_role;
ALTER TABLE public.fin_expense_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_expense_item_admin_all" ON public.fin_expense_item FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_klinik') OR public.has_role(auth.uid(), 'manajemen') OR public.has_role(auth.uid(), 'kasir'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_klinik') OR public.has_role(auth.uid(), 'manajemen') OR public.has_role(auth.uid(), 'kasir'));

CREATE TABLE IF NOT EXISTS public.fin_journal_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  no_jurnal text NOT NULL UNIQUE,
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  sumber text NOT NULL DEFAULT 'manual',
  ref_id uuid,
  ref_no text,
  keterangan text,
  total numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'posted',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_journal_entry_tanggal ON public.fin_journal_entry(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_fin_journal_entry_ref ON public.fin_journal_entry(sumber, ref_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_journal_entry TO authenticated;
GRANT ALL ON public.fin_journal_entry TO service_role;
ALTER TABLE public.fin_journal_entry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_journal_entry_admin_all" ON public.fin_journal_entry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_klinik') OR public.has_role(auth.uid(), 'manajemen') OR public.has_role(auth.uid(), 'kasir'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_klinik') OR public.has_role(auth.uid(), 'manajemen') OR public.has_role(auth.uid(), 'kasir'));
CREATE TRIGGER trg_fin_journal_entry_updated BEFORE UPDATE ON public.fin_journal_entry FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.fin_journal_line (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.fin_journal_entry(id) ON DELETE CASCADE,
  coa_code text NOT NULL,
  coa_nama text,
  debit numeric(14,2) NOT NULL DEFAULT 0,
  kredit numeric(14,2) NOT NULL DEFAULT 0,
  keterangan text,
  cost_center_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fin_journal_line_entry ON public.fin_journal_line(entry_id);
CREATE INDEX IF NOT EXISTS idx_fin_journal_line_coa ON public.fin_journal_line(coa_code);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_journal_line TO authenticated;
GRANT ALL ON public.fin_journal_line TO service_role;
ALTER TABLE public.fin_journal_line ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_journal_line_admin_all" ON public.fin_journal_line FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_klinik') OR public.has_role(auth.uid(), 'manajemen') OR public.has_role(auth.uid(), 'kasir'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin_klinik') OR public.has_role(auth.uid(), 'manajemen') OR public.has_role(auth.uid(), 'kasir'));
