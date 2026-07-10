import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Produk = {
  id: string; kode: string; nama: string; kategori: string;
  deskripsi: string | null; harga: number; stok: number; foto_url: string | null;
};

export const listProduk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("apps_produk").select("*").eq("is_active", true).order("kategori").order("nama");
    if (error) throw new Error(error.message);
    return { produk: (data ?? []) as Produk[] };
  });

export const getMyCart = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("apps_cart_item")
      .select("id, qty, produk_id, produk:apps_produk(id, nama, harga, foto_url, stok, kategori)")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    const items = (data ?? []).map((r: any) => ({
      id: r.id, qty: r.qty, produk_id: r.produk_id, produk: r.produk,
      subtotal: (r.produk?.harga ?? 0) * r.qty,
    }));
    const total = items.reduce((s, x) => s + x.subtotal, 0);
    return { items, total };
  });

export const addToCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { produk_id: string; qty?: number }) =>
    z.object({ produk_id: z.string().uuid(), qty: z.number().int().min(1).max(20).default(1) }).parse(d))
  .handler(async ({ data, context }) => {
    // Server-side stock validation to prevent adding out-of-stock items.
    const { data: prod, error: pe } = await context.supabase
      .from("apps_produk").select("stok, is_active, nama").eq("id", data.produk_id).maybeSingle();
    if (pe) throw new Error(pe.message);
    if (!prod || !prod.is_active) throw new Error("Produk tidak tersedia");
    const stok = prod.stok ?? 0;
    if (stok <= 0) throw new Error(`Stok ${prod.nama} habis`);

    const { data: ex } = await context.supabase
      .from("apps_cart_item").select("id, qty")
      .eq("user_id", context.userId).eq("produk_id", data.produk_id).maybeSingle();
    if (ex) {
      const nextQty = Math.min(20, stok, ex.qty + (data.qty ?? 1));
      if (nextQty <= ex.qty) throw new Error(`Stok ${prod.nama} tidak mencukupi`);
      const { error } = await context.supabase.from("apps_cart_item")
        .update({ qty: nextQty }).eq("id", ex.id);
      if (error) throw new Error(error.message);
    } else {
      const qty = Math.min(20, stok, data.qty ?? 1);
      const { error } = await context.supabase.from("apps_cart_item")
        .insert({ user_id: context.userId, produk_id: data.produk_id, qty });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const updateCartQty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; qty: number }) =>
    z.object({ id: z.string().uuid(), qty: z.number().int().min(1).max(20) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("apps_cart_item")
      .update({ qty: data.qty }).eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeCartItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("apps_cart_item")
      .delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkoutCart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { alamat_kirim: string; catatan?: string; metode_bayar?: "transfer" | "cod" }) =>
    z.object({
      alamat_kirim: z.string().min(5).max(500),
      catatan: z.string().max(500).optional(),
      metode_bayar: z.enum(["transfer", "cod"]).default("transfer"),
    }).parse(d))
  .handler(async ({ data, context }) => {
    // Atomic checkout via RPC: locks product rows, validates stock,
    // creates order+items, decrements stock, clears cart, awards points.
    const { data: res, error } = await context.supabase.rpc("apps_checkout_cart", {
      _alamat_kirim: data.alamat_kirim,
      _catatan: data.catatan ?? "",
      _metode_bayar: data.metode_bayar,
    });
    if (error) throw new Error(error.message);
    const r = res as { order_id: string; no_order: string; total: number; poin: number };
    return r;
  });

const OrdersListInput = z.object({
  page: z.number().int().min(1).max(1000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OrdersListInput.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    const { data: rows, error, count } = await context.supabase
      .from("apps_order").select("*, items:apps_order_item(*)", { count: "exact" })
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw new Error(error.message);
    return { orders: rows ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export type BankAccount = { bank: string; no_rek: string; atas_nama: string };

export const listBankAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("clinic_setting").select("value").eq("key", "bank_accounts").maybeSingle();
    if (error) throw new Error(error.message);
    const raw = data?.value;
    const list = Array.isArray(raw) ? (raw as BankAccount[]) : [];
    return { accounts: list.filter((b) => b && b.bank && b.no_rek) };
  });
