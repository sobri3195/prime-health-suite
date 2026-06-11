
ALTER TABLE public.fin_coa ADD COLUMN IF NOT EXISTS cash_flow_section text;
ALTER TABLE public.fin_pembayaran ADD COLUMN IF NOT EXISTS void_reason text;
ALTER TABLE public.fin_pembayaran ADD COLUMN IF NOT EXISTS status text DEFAULT 'posted';

CREATE OR REPLACE FUNCTION public.fin_can_edit(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles
    WHERE user_id=_uid AND role IN ('super_admin','admin_klinik','manajemen'));
$$;

CREATE OR REPLACE FUNCTION public.fin_can_view(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles
    WHERE user_id=_uid AND role IN ('super_admin','admin_klinik','manajemen','kasir','farmasi'));
$$;

CREATE TABLE public.fin_template_invoice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  payer_id uuid,
  kategori text,
  pajak_pct numeric DEFAULT 0,
  diskon numeric DEFAULT 0,
  catatan text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_template_invoice TO authenticated;
GRANT ALL ON public.fin_template_invoice TO service_role;
ALTER TABLE public.fin_template_invoice ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_tpl_inv_view" ON public.fin_template_invoice FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_tpl_inv_write" ON public.fin_template_invoice FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));
CREATE TRIGGER fin_tpl_inv_upd BEFORE UPDATE ON public.fin_template_invoice FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_template_invoice_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.fin_template_invoice(id) ON DELETE CASCADE,
  layanan_id uuid,
  layanan_nama text NOT NULL,
  tarif numeric NOT NULL DEFAULT 0,
  qty integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_template_invoice_item TO authenticated;
GRANT ALL ON public.fin_template_invoice_item TO service_role;
ALTER TABLE public.fin_template_invoice_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_tpl_inv_item_view" ON public.fin_template_invoice_item FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_tpl_inv_item_write" ON public.fin_template_invoice_item FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));

CREATE TABLE public.fin_template_voucher (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  vendor_id uuid,
  coa_code text,
  cost_center_code text,
  metode text DEFAULT 'transfer',
  pajak_pct numeric DEFAULT 0,
  keterangan text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_template_voucher TO authenticated;
GRANT ALL ON public.fin_template_voucher TO service_role;
ALTER TABLE public.fin_template_voucher ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_tpl_vch_view" ON public.fin_template_voucher FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_tpl_vch_write" ON public.fin_template_voucher FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));
CREATE TRIGGER fin_tpl_vch_upd BEFORE UPDATE ON public.fin_template_voucher FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_template_voucher_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.fin_template_voucher(id) ON DELETE CASCADE,
  deskripsi text NOT NULL,
  coa_code text,
  qty numeric NOT NULL DEFAULT 1,
  harga numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_template_voucher_item TO authenticated;
GRANT ALL ON public.fin_template_voucher_item TO service_role;
ALTER TABLE public.fin_template_voucher_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_tpl_vch_item_view" ON public.fin_template_voucher_item FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_tpl_vch_item_write" ON public.fin_template_voucher_item FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));

CREATE TABLE public.fin_mdr_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metode text NOT NULL,
  bank text,
  rate_pct numeric NOT NULL DEFAULT 0,
  fixed_fee numeric NOT NULL DEFAULT 0,
  coa_code text NOT NULL DEFAULT '5900',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_mdr_rule TO authenticated;
GRANT ALL ON public.fin_mdr_rule TO service_role;
ALTER TABLE public.fin_mdr_rule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_mdr_view" ON public.fin_mdr_rule FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_mdr_write" ON public.fin_mdr_rule FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));
CREATE TRIGGER fin_mdr_upd BEFORE UPDATE ON public.fin_mdr_rule FOR EACH ROW EXECUTE FUNCTION public.fin_touch_updated_at();

CREATE TABLE public.fin_bank_statement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank text NOT NULL,
  tanggal date NOT NULL,
  deskripsi text NOT NULL,
  debit numeric NOT NULL DEFAULT 0,
  kredit numeric NOT NULL DEFAULT 0,
  saldo numeric,
  ref text,
  matched boolean NOT NULL DEFAULT false,
  imported_by text,
  imported_batch text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_bank_statement TO authenticated;
GRANT ALL ON public.fin_bank_statement TO service_role;
ALTER TABLE public.fin_bank_statement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_bs_view" ON public.fin_bank_statement FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_bs_write" ON public.fin_bank_statement FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));
CREATE INDEX idx_fin_bs_tgl ON public.fin_bank_statement(tanggal);
CREATE INDEX idx_fin_bs_bank ON public.fin_bank_statement(bank);

CREATE TABLE public.fin_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id uuid NOT NULL REFERENCES public.fin_bank_statement(id) ON DELETE CASCADE,
  journal_line_id uuid,
  pembayaran_id uuid,
  expense_id uuid,
  selisih numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'matched',
  catatan text,
  matched_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_reconciliation TO authenticated;
GRANT ALL ON public.fin_reconciliation TO service_role;
ALTER TABLE public.fin_reconciliation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_rec_view" ON public.fin_reconciliation FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_rec_write" ON public.fin_reconciliation FOR ALL TO authenticated USING (public.fin_can_edit(auth.uid())) WITH CHECK (public.fin_can_edit(auth.uid()));

CREATE TABLE public.fin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  entity_no text,
  before jsonb,
  after jsonb,
  changed_fields text[],
  reason text,
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.fin_audit_log TO authenticated;
GRANT ALL ON public.fin_audit_log TO service_role;
ALTER TABLE public.fin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fin_audit_view" ON public.fin_audit_log FOR SELECT TO authenticated USING (public.fin_can_view(auth.uid()));
CREATE POLICY "fin_audit_insert" ON public.fin_audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE INDEX idx_fin_audit_created ON public.fin_audit_log(created_at DESC);
CREATE INDEX idx_fin_audit_entity ON public.fin_audit_log(entity, entity_id);

UPDATE public.fin_coa SET cash_flow_section='operating' WHERE code IN ('1100','1110','1200','2100','2200','4100','4900','5000','5900') AND cash_flow_section IS NULL;
