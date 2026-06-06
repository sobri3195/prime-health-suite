
-- ============ AI MATA: tambah kolom ============
ALTER TABLE public.apps_ai_history
  ADD COLUMN IF NOT EXISTS foto_url text,
  ADD COLUMN IF NOT EXISTS booking_id uuid;

-- ============ BELANJA ============
CREATE TABLE public.apps_produk (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text NOT NULL UNIQUE,
  nama text NOT NULL,
  kategori text NOT NULL DEFAULT 'lensa',
  deskripsi text,
  harga numeric NOT NULL DEFAULT 0,
  stok integer NOT NULL DEFAULT 0,
  foto_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apps_produk TO authenticated, anon;
GRANT ALL ON public.apps_produk TO service_role;
ALTER TABLE public.apps_produk ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Produk aktif boleh dilihat semua" ON public.apps_produk
  FOR SELECT USING (is_active = true);

CREATE TABLE public.apps_cart_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  produk_id uuid NOT NULL REFERENCES public.apps_produk(id) ON DELETE CASCADE,
  qty integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, produk_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.apps_cart_item TO authenticated;
GRANT ALL ON public.apps_cart_item TO service_role;
ALTER TABLE public.apps_cart_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pasien kelola cart sendiri" ON public.apps_cart_item
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.apps_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  no_order text NOT NULL UNIQUE,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_payment',
  alamat_kirim text,
  catatan text,
  metode_bayar text NOT NULL DEFAULT 'transfer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.apps_order TO authenticated;
GRANT ALL ON public.apps_order TO service_role;
ALTER TABLE public.apps_order ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pasien lihat order sendiri" ON public.apps_order
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pasien buat order sendiri" ON public.apps_order
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Pasien update order sendiri (batal)" ON public.apps_order
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.apps_order_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.apps_order(id) ON DELETE CASCADE,
  produk_id uuid NOT NULL,
  produk_nama text NOT NULL,
  harga numeric NOT NULL DEFAULT 0,
  qty integer NOT NULL DEFAULT 1,
  subtotal numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.apps_order_item TO authenticated;
GRANT ALL ON public.apps_order_item TO service_role;
ALTER TABLE public.apps_order_item ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pasien lihat item order sendiri" ON public.apps_order_item
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.apps_order o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "Pasien isi item order sendiri" ON public.apps_order_item
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.apps_order o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- ============ EDUKASI (CMS) ============
CREATE TABLE public.apps_artikel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  judul text NOT NULL,
  ringkasan text,
  konten text NOT NULL,
  kategori text NOT NULL DEFAULT 'umum',
  cover_url text,
  is_published boolean NOT NULL DEFAULT true,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apps_artikel TO authenticated, anon;
GRANT ALL ON public.apps_artikel TO service_role;
ALTER TABLE public.apps_artikel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Artikel publish boleh dibaca semua" ON public.apps_artikel
  FOR SELECT USING (is_published = true);

-- ============ GAMIFIKASI ============
CREATE TABLE public.apps_poin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  delta integer NOT NULL,
  alasan text NOT NULL,
  ref_type text,
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.apps_poin TO authenticated;
GRANT ALL ON public.apps_poin TO service_role;
ALTER TABLE public.apps_poin ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pasien lihat poin sendiri" ON public.apps_poin
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pasien insert poin sendiri" ON public.apps_poin
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.apps_reward (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text NOT NULL UNIQUE,
  nama text NOT NULL,
  deskripsi text,
  harga_poin integer NOT NULL,
  stok integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.apps_reward TO authenticated, anon;
GRANT ALL ON public.apps_reward TO service_role;
ALTER TABLE public.apps_reward ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reward aktif boleh dilihat" ON public.apps_reward
  FOR SELECT USING (is_active = true);

CREATE TABLE public.apps_reward_redeem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_id uuid NOT NULL REFERENCES public.apps_reward(id),
  kode_voucher text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.apps_reward_redeem TO authenticated;
GRANT ALL ON public.apps_reward_redeem TO service_role;
ALTER TABLE public.apps_reward_redeem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pasien lihat redeem sendiri" ON public.apps_reward_redeem
  FOR SELECT USING (auth.uid() = user_id);

-- Leaderboard mingguan (top 20, nama dimask)
CREATE OR REPLACE FUNCTION public.apps_leaderboard_mingguan()
RETURNS TABLE(rank integer, nama_mask text, total_poin integer, is_me boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH agg AS (
    SELECT p.user_id, SUM(p.delta)::int AS total_poin
      FROM public.apps_poin p
     WHERE p.created_at >= date_trunc('week', now())
       AND p.delta > 0
     GROUP BY p.user_id
  )
  SELECT
    (ROW_NUMBER() OVER (ORDER BY a.total_poin DESC))::int AS rank,
    COALESCE(left(ap.nama,1) || '***' || right(ap.nama,1), 'Anon') AS nama_mask,
    a.total_poin,
    (a.user_id = auth.uid()) AS is_me
  FROM agg a
  LEFT JOIN public.apps_pasien ap ON ap.user_id = a.user_id
  ORDER BY a.total_poin DESC
  LIMIT 20;
$$;
GRANT EXECUTE ON FUNCTION public.apps_leaderboard_mingguan() TO authenticated;

-- Total poin saya
CREATE OR REPLACE FUNCTION public.apps_my_poin_total()
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(delta),0)::int FROM public.apps_poin WHERE user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.apps_my_poin_total() TO authenticated;

-- Redeem reward atomik
CREATE OR REPLACE FUNCTION public.apps_redeem_reward(_reward_id uuid)
RETURNS TABLE(redeem_id uuid, kode_voucher text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_harga int;
  v_stok int;
  v_total int;
  v_voucher text;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT harga_poin, stok INTO v_harga, v_stok FROM public.apps_reward WHERE id = _reward_id AND is_active = true FOR UPDATE;
  IF v_harga IS NULL THEN RAISE EXCEPTION 'Reward tidak ditemukan'; END IF;
  IF v_stok <= 0 THEN RAISE EXCEPTION 'Stok reward habis'; END IF;
  SELECT COALESCE(SUM(delta),0) INTO v_total FROM public.apps_poin WHERE user_id = v_user;
  IF v_total < v_harga THEN RAISE EXCEPTION 'Poin tidak cukup (butuh %, punya %)', v_harga, v_total; END IF;
  v_voucher := 'RDM-' || upper(substr(md5(random()::text || clock_timestamp()::text),1,8));
  INSERT INTO public.apps_reward_redeem(user_id, reward_id, kode_voucher) VALUES (v_user, _reward_id, v_voucher) RETURNING id INTO v_id;
  INSERT INTO public.apps_poin(user_id, delta, alasan, ref_type, ref_id) VALUES (v_user, -v_harga, 'Tukar reward', 'reward', _reward_id::text);
  UPDATE public.apps_reward SET stok = stok - 1 WHERE id = _reward_id;
  RETURN QUERY SELECT v_id, v_voucher;
END $$;
GRANT EXECUTE ON FUNCTION public.apps_redeem_reward(uuid) TO authenticated;

-- ============ HELPDESK PASIEN (CHAT) ============
CREATE TABLE public.apps_chat_room (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.apps_chat_room TO authenticated;
GRANT ALL ON public.apps_chat_room TO service_role;
ALTER TABLE public.apps_chat_room ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pasien akses room sendiri" ON public.apps_chat_room
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.apps_chat_msg (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.apps_chat_room(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('patient','fo','system')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.apps_chat_msg TO authenticated;
GRANT ALL ON public.apps_chat_msg TO service_role;
ALTER TABLE public.apps_chat_msg ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Pasien lihat pesan room sendiri" ON public.apps_chat_msg
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.apps_chat_room r WHERE r.id = room_id AND r.user_id = auth.uid()));
CREATE POLICY "Pasien kirim pesan sebagai patient" ON public.apps_chat_msg
  FOR INSERT WITH CHECK (sender = 'patient' AND EXISTS (SELECT 1 FROM public.apps_chat_room r WHERE r.id = room_id AND r.user_id = auth.uid()));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.apps_chat_msg;
ALTER PUBLICATION supabase_realtime ADD TABLE public.apps_chat_room;

-- Update triggers
CREATE TRIGGER trg_apps_produk_updated BEFORE UPDATE ON public.apps_produk
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_apps_cart_item_updated BEFORE UPDATE ON public.apps_cart_item
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_apps_order_updated BEFORE UPDATE ON public.apps_order
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_apps_artikel_updated BEFORE UPDATE ON public.apps_artikel
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_apps_reward_updated BEFORE UPDATE ON public.apps_reward
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update last_message_at on new msg
CREATE OR REPLACE FUNCTION public.apps_chat_touch_room()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  UPDATE public.apps_chat_room SET last_message_at = now() WHERE id = NEW.room_id;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_apps_chat_touch AFTER INSERT ON public.apps_chat_msg
  FOR EACH ROW EXECUTE FUNCTION public.apps_chat_touch_room();
