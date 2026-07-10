import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, Package, ArrowLeft, Copy, Truck, ExternalLink } from "lucide-react";
import {
  listProduk, getMyCart, addToCart, updateCartQty, removeCartItem, checkoutCart, listMyOrders, listBankAccounts,
} from "@/lib/apps-shop.functions";
import { EmptyState, Skeleton, SkeletonList } from "@/components/apps/ui";
import { useI18n } from "@/lib/i18n";

function fmt(n: number) { return "Rp " + n.toLocaleString("id-ID"); }

function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#e9dfb8] bg-white p-3 shadow-sm">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="mt-2 h-3 w-1/3" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-1 h-3 w-full" />
      <Skeleton className="mt-3 h-6 w-1/2" />
    </div>
  );
}

export function PatientBelanjaReal() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const callList = useServerFn(listProduk);
  const callCart = useServerFn(getMyCart);
  const callAdd = useServerFn(addToCart);
  const produkQ = useQuery({ queryKey: ["apps", "produk"], queryFn: () => callList() });
  const cartQ = useQuery({ queryKey: ["apps", "cart"], queryFn: () => callCart() });
  const [kategori, setKategori] = useState<string>("semua");
  const addM = useMutation({
    mutationFn: (id: string) => callAdd({ data: { produk_id: id, qty: 1 } }),
    onSuccess: () => { toast.success(t("shop.added")); qc.invalidateQueries({ queryKey: ["apps", "cart"] }); },
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
            <h1 className="text-2xl font-bold">{t("shop.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("shop.subtitle")}</p>
          </div>
          <Link to="/apps/$section" params={{ section: "cart" }} className="relative rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] p-2.5" aria-label={t("cart.title")}>
            <ShoppingCart className="h-5 w-5 text-[#5a4a14]" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-[#6b5a16] px-1.5 text-[10px] font-bold text-white">{cartCount}</span>
            )}
          </Link>
        </div>
      </div>

      {!produkQ.isLoading && (
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
          {cats.map((c) => (
            <button key={c} onClick={() => setKategori(c)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${
                kategori === c ? "bg-[#6b5a16] text-white" : "border border-[#e9dfb8] bg-white text-[#5a4a14]"
              }`}>{c === "semua" ? t("shop.cat.all") : c}</button>
          ))}
        </div>
      )}

      {produkQ.isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title={t("shop.empty.title")} hint={t("shop.empty.hint")} />
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
                <button
                  disabled={p.stok < 1 || addM.isPending}
                  onClick={() => addM.mutate(p.id)}
                  aria-label={t("shop.added")}
                  className="rounded-full bg-[#1f1d19] p-1.5 text-white disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {p.stok < 5 && <div className="mt-1 text-[10px] text-rose-600">{t("shop.stock_low", { n: p.stok })}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function PatientCart() {
  const { t } = useI18n();
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
    onSuccess: () => { toast.success(t("cart.removed")); qc.invalidateQueries({ queryKey: ["apps", "cart"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = cartQ.data?.items ?? [];
  const total = cartQ.data?.total ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/apps/$section" params={{ section: "belanja" }} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("cart.back")}
      </Link>
      <h1 className="text-2xl font-bold">{t("cart.title")}</h1>
      {cartQ.isLoading ? (
        <SkeletonList rows={3} />
      ) : items.length === 0 ? (
        <div className="space-y-3">
          <EmptyState title={t("cart.empty.title")} hint={t("cart.empty.hint")} />
          <div className="text-center">
            <Link to="/apps/$section" params={{ section: "belanja" }} className="inline-block rounded-xl bg-[#6b5a16] px-4 py-2 text-xs font-semibold text-white">
              {t("cart.start_shopping")}
            </Link>
          </div>
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
                      disabled={it.qty <= 1}
                      className="px-2 py-1 disabled:opacity-40" aria-label="-"><Minus className="h-3 w-3" /></button>
                    <span className="text-sm font-semibold">{it.qty}</span>
                    <button
                      onClick={() => {
                        const maxQty = Math.min(20, it.produk?.stok ?? 20);
                        if (it.qty >= maxQty) {
                          toast.error(`Stok maksimal ${maxQty}`);
                          return;
                        }
                        updM.mutate({ id: it.id, qty: it.qty + 1 });
                      }}
                      disabled={it.qty >= Math.min(20, it.produk?.stok ?? 20)}
                      className="px-2 py-1 disabled:opacity-40" aria-label="+"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold">{fmt(it.subtotal)}</div>
                  <button onClick={() => rmM.mutate(it.id)} className="mt-1 text-rose-600" aria-label={t("cart.removed")}><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[#e9dfb8] bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{t("cart.total")}</div>
              <div className="text-xl font-bold">{fmt(total)}</div>
            </div>
            <Link to="/apps/$section" params={{ section: "checkout" }}
              className="mt-3 block rounded-xl bg-[#6b5a16] py-3 text-center text-sm font-semibold text-white">
              {t("cart.checkout")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export function PatientCheckout() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const callCart = useServerFn(getMyCart);
  const callCheckout = useServerFn(checkoutCart);
  const callBanks = useServerFn(listBankAccounts);
  const cartQ = useQuery({ queryKey: ["apps", "cart"], queryFn: () => callCart() });
  const banksQ = useQuery({ queryKey: ["apps", "bank-accounts"], queryFn: () => callBanks() });
  const [alamat, setAlamat] = useState("");
  const [catatan, setCatatan] = useState("");
  const [metode, setMetode] = useState<"transfer" | "cod">("transfer");
  const m = useMutation({
    mutationFn: () => callCheckout({ data: { alamat_kirim: alamat, catatan, metode_bayar: metode } }),
    onSuccess: (r) => {
      toast.success(`${r.no_order} (+${r.poin})`);
      qc.invalidateQueries({ queryKey: ["apps", "cart"] });
      qc.invalidateQueries({ queryKey: ["apps", "orders"] });
      qc.invalidateQueries({ queryKey: ["apps", "poin"] });
      navigate({ to: "/apps/$section", params: { section: "orders" } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = cartQ.data?.items ?? [];
  const total = cartQ.data?.total ?? 0;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link to="/apps/$section" params={{ section: "cart" }} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" /> {t("checkout.back")}
      </Link>
      <h1 className="text-2xl font-bold">{t("checkout.title")}</h1>

      {cartQ.isLoading ? (
        <SkeletonList rows={2} />
      ) : items.length === 0 ? (
        <div className="space-y-3">
          <EmptyState title={t("cart.empty.title")} hint={t("cart.empty.hint")} />
          <div className="text-center">
            <Link to="/apps/$section" params={{ section: "belanja" }} className="inline-block rounded-xl bg-[#6b5a16] px-4 py-2 text-xs font-semibold text-white">
              {t("cart.start_shopping")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-[#e9dfb8] bg-white p-4 space-y-3">
            <div>
              <label className="text-xs font-semibold">{t("checkout.address")}</label>
              <textarea value={alamat} onChange={(e) => setAlamat(e.target.value)} rows={3}
                className="mt-1 w-full rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] p-2.5 text-sm outline-none focus:ring-2 focus:ring-[#6b5a16]"
                placeholder={t("checkout.address_ph")} />
            </div>
            <div>
              <label className="text-xs font-semibold">{t("checkout.note")}</label>
              <input value={catatan} onChange={(e) => setCatatan(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#6b5a16]" />
            </div>
            <div>
              <label className="text-xs font-semibold">{t("checkout.method")}</label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {(["transfer", "cod"] as const).map((mm) => (
                  <button key={mm} onClick={() => setMetode(mm)}
                    className={`rounded-xl border py-2 text-xs font-semibold ${
                      metode === mm ? "border-[#6b5a16] bg-[#fdf2c4] text-[#5a4a14]" : "border-[#e9dfb8] bg-white"
                    }`}>{mm === "transfer" ? t("checkout.transfer") : t("checkout.cod")}</button>
                ))}
              </div>
              {metode === "transfer" && (
                <div className="mt-2 space-y-2">
                  <p className="rounded-xl bg-[#fdf8e8] p-2 text-[11px] text-muted-foreground">
                    {t("checkout.transfer_hint")}
                  </p>
                  {(banksQ.data?.accounts ?? []).length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Rekening belum dikonfigurasi.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(banksQ.data?.accounts ?? []).map((b) => (
                        <div key={`${b.bank}-${b.no_rek}`} className="flex items-center justify-between rounded-xl border border-[#e9dfb8] bg-white px-3 py-2 text-xs">
                          <div>
                            <div className="font-semibold">{b.bank} • {b.no_rek}</div>
                            <div className="text-muted-foreground">a.n. {b.atas_nama}</div>
                          </div>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-[#e9dfb8] px-2 py-1 hover:bg-[#fdf2c4]"
                            onClick={async () => {
                              try { await navigator.clipboard.writeText(b.no_rek); toast.success("No. rek disalin"); } catch { /* ignore */ }
                            }}
                          >
                            <Copy className="h-3 w-3" /> Salin
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-[#e9dfb8] bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">{t("checkout.total_pay")}</div>
              <div className="text-xl font-bold">{fmt(total)}</div>
            </div>
            <button disabled={m.isPending || total === 0 || alamat.length < 5} onClick={() => m.mutate()}
              className="mt-3 w-full rounded-xl bg-[#6b5a16] py-3 text-sm font-semibold text-white disabled:opacity-50">
              {m.isPending ? t("checkout.processing") : t("checkout.submit")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function PatientOrders() {
  const { t } = useI18n();
  const callOrders = useServerFn(listMyOrders);
  const q = useQuery({ queryKey: ["apps", "orders"], queryFn: () => callOrders({ data: { page: 1, pageSize: 20 } }) });
  const orders = q.data?.orders ?? [];
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">{t("orders.title")}</h1>
      {q.isLoading ? (
        <SkeletonList rows={3} />
      ) : orders.length === 0 ? (
        <EmptyState title={t("orders.empty.title")} hint={t("orders.empty.hint")} />
      ) : (
        <div className="space-y-2">
          {orders.map((o: any) => (
            <div key={o.id} className="rounded-2xl border border-[#e9dfb8] bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold">{o.no_order}</div>
                  <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString("id-ID")}</div>
                </div>
                <span className="rounded-full bg-[#fdf2c4] px-2 py-0.5 text-[10px] font-semibold text-[#7a6010]">{o.status}</span>
              </div>
              <OrderTimeline status={o.status} />
              <div className="mt-2 text-xs text-muted-foreground">{o.items?.length ?? 0} item • {o.metode_bayar}</div>
              <div className="mt-2 text-base font-bold">{fmt(o.total)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ORDER_STEPS = [
  { key: "pending", label: "Diterima" },
  { key: "packing", label: "Dikemas" },
  { key: "shipped", label: "Dikirim" },
  { key: "delivered", label: "Sampai" },
] as const;

function OrderTimeline({ status }: { status: string }) {
  const norm = status?.toLowerCase();
  if (norm === "cancelled" || norm === "canceled") {
    return <div className="mt-3 text-xs font-semibold text-rose-600">Pesanan dibatalkan</div>;
  }
  const idx = Math.max(0, ORDER_STEPS.findIndex((s) => s.key === norm));
  return (
    <ol className="mt-3 flex items-center gap-1" aria-label="Status pesanan">
      {ORDER_STEPS.map((s, i) => {
        const done = i <= idx;
        return (
          <li key={s.key} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center gap-1">
              <span
                aria-current={i === idx ? "step" : undefined}
                className={`h-2 w-2 rounded-full ${done ? "bg-[#a08a2a]" : "bg-[#e9dfb8]"}`}
              />
              {i < ORDER_STEPS.length - 1 && (
                <span className={`h-0.5 flex-1 ${i < idx ? "bg-[#a08a2a]" : "bg-[#e9dfb8]"}`} />
              )}
            </div>
            <span className={`text-[10px] ${done ? "font-semibold text-[#5a4a14]" : "text-muted-foreground"}`}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
