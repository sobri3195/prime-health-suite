import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, Loader2, Package, ArrowLeft } from "lucide-react";
import {
  listProduk, getMyCart, addToCart, updateCartQty, removeCartItem, checkoutCart, listMyOrders,
} from "@/lib/apps-shop.functions";

function fmt(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

export function PatientBelanjaReal() {
  const qc = useQueryClient();
  const callList = useServerFn(listProduk);
  const callCart = useServerFn(getMyCart);
  const callAdd = useServerFn(addToCart);
  const produkQ = useQuery({ queryKey: ["apps", "produk"], queryFn: () => callList() });
  const cartQ = useQuery({ queryKey: ["apps", "cart"], queryFn: () => callCart() });
  const [kategori, setKategori] = useState<string>("semua");
  const addM = useMutation({
    mutationFn: (id: string) => callAdd({ data: { produk_id: id, qty: 1 } }),
    onSuccess: () => { toast.success("Ditambahkan ke keranjang"); qc.invalidateQueries({ queryKey: ["apps", "cart"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const produk = produkQ.data?.produk ?? [];
  const cats = ["semua", ...Array.from(new Set(produk.map((p) => p.kategori)))];
  const list = kategori === "semua" ? produk : produk.filter((p) => p.kategori === kategori);
  const cartCount = cartQ.data?.items.reduce((s, x) => s + x.qty, 0) ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl border border-[#e9dfb8] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Belanja</h1>
            <p className="mt-1 text-sm text-muted-foreground">Lensa, frame, dan aksesori mata.</p>
          </div>
          <Link to="/apps/cart" className="relative rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] p-2.5">
            <ShoppingCart className="h-5 w-5 text-[#5a4a14]" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-[#a08a2a] px-1.5 text-[10px] font-bold text-white">{cartCount}</span>
            )}
          </Link>
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {cats.map((c) => (
          <button key={c} onClick={() => setKategori(c)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${
              kategori === c ? "bg-[#a08a2a] text-white" : "border border-[#e9dfb8] bg-white text-[#5a4a14]"
            }`}>{c}</button>
        ))}
      </div>

      {produkQ.isLoading ? (
        <div className="text-center text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 animate-spin" /> Memuat…</div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {list.map((p) => (
            <div key={p.id} className="rounded-2xl border border-[#e9dfb8] bg-white p-3 shadow-sm">
              <div className="flex h-24 items-center justify-center rounded-xl bg-[#fdf2c4]">
                <Package className="h-10 w-10 text-[#6b5a16]" />
              </div>
              <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">{p.kategori}</div>
              <div className="text-sm font-bold leading-tight">{p.nama}</div>
              <div className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{p.deskripsi}</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-bold">{fmt(p.harga)}</div>
                <button disabled={p.stok < 1 || addM.isPending} onClick={() => addM.mutate(p.id)}
                  className="rounded-full bg-[#1f1d19] p-1.5 text-white disabled:opacity-40">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {p.stok < 5 && <div className="mt-1 text-[10px] text-rose-600">Stok tinggal {p.stok}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PatientCart() {
  const qc = useQueryClient();
  const callCart = useServerFn(getMyCart);
  const callUpd = useServerFn(updateCartQty);
  const callRm = useServerFn(removeCartItem);
  const cartQ = useQuery({ queryKey: ["apps", "cart"], queryFn: () => callCart() });
  const updM = useMutation({
    mutationFn: (v: { id: string; qty: number }) => callUpd({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apps", "cart"] }),
    onError: (e: Error) => toast.error(e.message),
  });
  const rmM = useMutation({
    mutationFn: (id: string) => callRm({ data: { id } }),
    onSuccess: () => { toast.success("Item dihapus"); qc.invalidateQueries({ queryKey: ["apps", "cart"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = cartQ.data?.items ?? [];
  const total = cartQ.data?.total ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/apps/belanja" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Lanjut belanja
      </Link>
      <h1 className="text-2xl font-bold">Keranjang Saya</h1>
      {cartQ.isLoading ? (
        <div className="text-center text-sm"><Loader2 className="inline h-4 w-4 animate-spin" /> Memuat…</div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-[#e9dfb8] bg-white p-8 text-center text-sm text-muted-foreground">
          Keranjang kosong. <Link to="/apps/belanja" className="font-semibold text-[#6b5a16]">Mulai belanja</Link>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((it: any) => (
              <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-[#e9dfb8] bg-white p-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#fdf2c4]"><Package className="h-6 w-6 text-[#6b5a16]" /></div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{it.produk?.nama}</div>
                  <div className="text-xs text-muted-foreground">{fmt(it.produk?.harga ?? 0)}</div>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-[#e9dfb8]">
                    <button onClick={() => it.qty > 1 && updM.mutate({ id: it.id, qty: it.qty - 1 })}
                      className="px-2 py-1"><Minus className="h-3 w-3" /></button>
                    <span className="text-sm font-semibold">{it.qty}</span>
                    <button onClick={() => updM.mutate({ id: it.id, qty: it.qty + 1 })} className="px-2 py-1"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{fmt(it.subtotal)}</div>
                  <button onClick={() => rmM.mutate(it.id)} className="mt-1 text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[#e9dfb8] bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-xl font-bold">{fmt(total)}</div>
            </div>
            <Link to="/apps/checkout"
              className="mt-3 block rounded-xl bg-[#a08a2a] py-3 text-center text-sm font-semibold text-white">
              Checkout
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function PatientCheckout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const callCart = useServerFn(getMyCart);
  const callCheckout = useServerFn(checkoutCart);
  const cartQ = useQuery({ queryKey: ["apps", "cart"], queryFn: () => callCart() });
  const [alamat, setAlamat] = useState("");
  const [catatan, setCatatan] = useState("");
  const [metode, setMetode] = useState<"transfer" | "cod">("transfer");
  const m = useMutation({
    mutationFn: () => callCheckout({ data: { alamat_kirim: alamat, catatan, metode_bayar: metode } }),
    onSuccess: (r) => {
      toast.success(`Pesanan ${r.no_order} dibuat (+${r.poin} poin)`);
      qc.invalidateQueries({ queryKey: ["apps", "cart"] });
      qc.invalidateQueries({ queryKey: ["apps", "orders"] });
      qc.invalidateQueries({ queryKey: ["apps", "poin"] });
      navigate({ to: "/apps/orders" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = cartQ.data?.total ?? 0;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/apps/cart" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> Kembali ke keranjang
      </Link>
      <h1 className="text-2xl font-bold">Checkout</h1>
      <div className="rounded-2xl border border-[#e9dfb8] bg-white p-4 space-y-3">
        <div>
          <label className="text-xs font-semibold">Alamat Pengiriman</label>
          <textarea value={alamat} onChange={(e) => setAlamat(e.target.value)} rows={3}
            className="mt-1 w-full rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#a08a2a]"
            placeholder="Nama jalan, kelurahan, kota, kode pos" />
        </div>
        <div>
          <label className="text-xs font-semibold">Catatan (opsional)</label>
          <input value={catatan} onChange={(e) => setCatatan(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#a08a2a]" />
        </div>
        <div>
          <label className="text-xs font-semibold">Metode Pembayaran</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["transfer", "cod"] as const).map((m) => (
              <button key={m} onClick={() => setMetode(m)}
                className={`rounded-xl border py-2 text-xs font-semibold capitalize ${
                  metode === m ? "border-[#a08a2a] bg-[#fdf2c4] text-[#5a4a14]" : "border-[#e9dfb8] bg-white"
                }`}>{m === "transfer" ? "Transfer Bank" : "Bayar di Tempat"}</button>
            ))}
          </div>
          {metode === "transfer" && (
            <p className="mt-2 rounded-xl bg-[#fdf8e8] p-2 text-[11px] text-muted-foreground">
              Setelah checkout, transfer ke <b>BCA 123-456-7890</b> a.n. Klinik Prime, lalu konfirmasi via Chat FO.
            </p>
          )}
        </div>
      </div>
      <div className="rounded-2xl border border-[#e9dfb8] bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Total Bayar</div>
          <div className="text-xl font-bold">{fmt(total)}</div>
        </div>
        <button disabled={m.isPending || total === 0 || alamat.length < 5} onClick={() => m.mutate()}
          className="mt-3 w-full rounded-xl bg-[#a08a2a] py-3 text-sm font-semibold text-white disabled:opacity-50">
          {m.isPending ? "Memproses…" : "Buat Pesanan"}
        </button>
      </div>
    </div>
  );
}

export function PatientOrders() {
  const callOrders = useServerFn(listMyOrders);
  const q = useQuery({ queryKey: ["apps", "orders"], queryFn: () => callOrders() });
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Pesanan Saya</h1>
      {q.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> :
        (q.data?.orders ?? []).length === 0 ? (
          <div className="rounded-2xl border border-[#e9dfb8] bg-white p-8 text-center text-sm text-muted-foreground">
            Belum ada pesanan.
          </div>
        ) : (
          <div className="space-y-2">
            {q.data!.orders.map((o: any) => (
              <div key={o.id} className="rounded-2xl border border-[#e9dfb8] bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold">{o.no_order}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</div>
                  </div>
                  <span className="rounded-full bg-[#fdf2c4] px-2 py-0.5 text-[10px] font-semibold text-[#7a6010]">{o.status}</span>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{o.items?.length ?? 0} item • {o.metode_bayar}</div>
                <div className="mt-2 text-base font-bold">{fmt(o.total)}</div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}
