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
    const { data: ex } = await context.supabase
      .from("apps_cart_item").select("id, qty")
      .eq("user_id", context.userId).eq("produk_id", data.produk_id).maybeSingle();
    if (ex) {
      const { error } = await context.supabase.from("apps_cart_item")
        .update({ qty: Math.min(20, ex.qty + (data.qty ?? 1)) }).eq("id", ex.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("apps_cart_item")
        .insert({ user_id: context.userId, produk_id: data.produk_id, qty: data.qty ?? 1 });
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
    const { data: items, error: e1 } = await context.supabase
      .from("apps_cart_item")
      .select("qty, produk:apps_produk(id, nama, harga, stok)")
      .eq("user_id", context.userId);
    if (e1) throw new Error(e1.message);
    if (!items || items.length === 0) throw new Error("Keranjang kosong");
    const lines = items.map((r: any) => {
      if (!r.produk) throw new Error("Produk tidak valid");
      if (r.qty > r.produk.stok) throw new Error(`Stok ${r.produk.nama} kurang`);
      return {
        produk_id: r.produk.id, produk_nama: r.produk.nama,
        harga: r.produk.harga, qty: r.qty, subtotal: r.produk.harga * r.qty,
      };
    });
    const total = lines.reduce((s, x) => s + x.subtotal, 0);
    const no_order = "ORD-" + Date.now().toString(36).toUpperCase();
    const { data: ord, error: e2 } = await context.supabase.from("apps_order")
      .insert({
        user_id: context.userId, no_order, total,
        alamat_kirim: data.alamat_kirim, catatan: data.catatan ?? null,
        metode_bayar: data.metode_bayar,
      }).select("id, no_order, total").single();
    if (e2) throw new Error(e2.message);
    const { error: e3 } = await context.supabase.from("apps_order_item")
      .insert(lines.map((l) => ({ ...l, order_id: ord.id })));
    if (e3) throw new Error(e3.message);
    await context.supabase.from("apps_cart_item").delete().eq("user_id", context.userId);
    // Award poin: 1 poin per Rp 10.000
    const poin = Math.floor(total / 10_000);
    if (poin > 0) {
      await context.supabase.from("apps_poin").insert({
        user_id: context.userId, delta: poin,
        alasan: `Belanja ${ord.no_order}`, ref_type: "order", ref_id: ord.id,
      });
    }
    return { order_id: ord.id, no_order: ord.no_order, total: ord.total, poin };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("apps_order").select("*, items:apps_order_item(*)")
      .eq("user_id", context.userId).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { orders: data ?? [] };
  });
