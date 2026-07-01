import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Ban, Loader2, Search, Trash2, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listInvoices, upsertInvoice, voidInvoice, getInvoice,
  createPayment, deletePayment, listLookups,
} from "@/lib/finance-tx.functions";
import { listTplInvoice } from "@/lib/finance-template.functions";
import { useFinanceDate } from "@/context/finance-date";
import { useFinanceAccess } from "@/lib/finance-access";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/finance/pendapatan")({
  
  head: () => pageHead({ title: "Detail Pendapatan — Finance", description: "Detail Pendapatan pada modul keuangan klinik.", path: "/finance/pendapatan" }),
  component: PendapatanPage,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

type ItemRow = { layanan_id?: string | null; layanan_nama: string; tarif: number; qty: number };

function PendapatanPage() {
  const { from, to } = useFinanceDate();
  const { canEdit } = useFinanceAccess();
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listInvoices);
  const upsert = useServerFn(upsertInvoice);
  const voidFn = useServerFn(voidInvoice);
  const get = useServerFn(getInvoice);
  const pay = useServerFn(createPayment);
  const delPay = useServerFn(deletePayment);
  const lookupsFn = useServerFn(listLookups);

  const [q, setQ] = useState("");
  const key = ["fin-invoices", from, to, q];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => list({ data: { from, to, q } }),
  });
  const rows = data?.rows ?? [];

  const { data: lookups } = useQuery({ queryKey: ["fin-lookups"], queryFn: () => lookupsFn() });
  const tplFn = useServerFn(listTplInvoice);
  const { data: tpls } = useQuery({ queryKey: ["fin-tpl-inv"], queryFn: () => tplFn() });

  const [editing, setEditing] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);
  const [voidFor, setVoidFor] = useState<any | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [payFor, setPayFor] = useState<any | null>(null);

  const upsertMut = useMutation({
    mutationFn: (input: any) => upsert({ data: { ...input, actor: user?.email } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fin-invoices"] }); toast.success("Invoice tersimpan"); setEditing(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const voidMut = useMutation({
    mutationFn: (v: { id: string; reason: string; kind?: "void" | "refunded" }) => voidFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fin-invoices"] }); toast.success("Invoice dibatalkan"); setVoidFor(null); setVoidReason(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  function startNew() {
    setEditing({
      tanggal: new Date().toISOString().slice(0, 10),
      patient_code: "",
      patient_name: "",
      dokter_id: "",
      payer_id: "",
      kasir: user?.name ?? "",
      diskon: 0,
      pajak_pct: 0,
      catatan: "",
      items: [{ layanan_nama: "", tarif: 0, qty: 1 }] as ItemRow[],
    });
  }

  async function openEdit(row: any) {
    const full = await get({ data: { id: row.id } });
    setEditing({
      id: row.id,
      tanggal: row.tanggal,
      patient_code: row.patient_code,
      patient_name: row.patient_name ?? "",
      dokter_id: row.dokter_id ?? "",
      payer_id: row.payer_id ?? "",
      kasir: row.kasir ?? "",
      diskon: Number(row.diskon ?? 0),
      pajak_pct: row.subtotal > 0 ? Math.round((Number(row.pajak) / Math.max(1, Number(row.subtotal) - Number(row.diskon ?? 0))) * 100) : 0,
      catatan: row.catatan ?? "",
      items: (full.items ?? []).map((it: any) => ({
        layanan_id: it.layanan_id, layanan_nama: it.layanan_nama, tarif: Number(it.tarif), qty: Number(it.qty),
      })),
    });
  }

  async function openDetail(row: any) {
    const full = await get({ data: { id: row.id } });
    setDetail({ ...row, ...full });
  }

  const totals = useMemo(() => {
    const subtotal = rows.reduce((a: number, r: any) => a + Number(r.total), 0);
    const dibayar = rows.reduce((a: number, r: any) => a + Number(r.dibayar ?? 0), 0);
    return { count: rows.length, subtotal, dibayar, outstanding: subtotal - dibayar };
  }, [rows]);

  return (
    <div>
      <PageHeader title="Pendapatan / Invoice" desc="Kelola invoice pendapatan klinik. Auto-posting jurnal." />

      <div className="mb-3 grid gap-3 md:grid-cols-4">
        <Kpi label="Jumlah Invoice" value={String(totals.count)} />
        <Kpi label="Total" value={fmt(totals.subtotal)} />
        <Kpi label="Terbayar" value={fmt(totals.dibayar)} />
        <Kpi label="Outstanding" value={fmt(totals.outstanding)} tone="amber" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari no invoice / pasien…" className="pl-9" />
        </div>
        {canEdit && <Button onClick={startNew} className="gap-1"><Plus className="h-4 w-4" /> Invoice Baru</Button>}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead><TableHead>Tanggal</TableHead><TableHead>Pasien</TableHead>
              <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Dibayar</TableHead>
              <TableHead>Status</TableHead><TableHead>Jurnal</TableHead><TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Belum ada invoice.</TableCell></TableRow>
            ) : rows.map((r: any) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.no_invoice}</TableCell>
                <TableCell>{r.tanggal}</TableCell>
                <TableCell>{r.patient_name ?? r.patient_code}</TableCell>
                <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                <TableCell className="text-right font-mono">{fmt(r.dibayar ?? 0)}</TableCell>
                <TableCell><StatusBadge s={r.status} /></TableCell>
                <TableCell>
                  <Badge variant="secondary" className={r.posted_journal_id ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}>
                    {r.posted_journal_id ? "Posted" : "Unposted"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openDetail(r)}>Detail</Button>
                    {canEdit && r.status !== "void" && r.status !== "refunded" && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => setPayFor(r)} title="Tambah pembayaran"><Receipt className="h-4 w-4" /></Button>
                        <Button size="icon" aria-label="Edit" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" aria-label="Batalkan" variant="ghost" onClick={() => setVoidFor(r)}><Ban className="h-4 w-4 text-rose-500" /></Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Invoice" : "Invoice Baru"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              {!editing.id && (tpls?.rows?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-2 text-xs">
                  <Label className="text-xs">Pakai Template:</Label>
                  <select
                    className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    onChange={(e) => {
                      const tpl = (tpls?.rows ?? []).find((t: any) => t.id === e.target.value);
                      if (!tpl) return;
                      const items = (tpls?.items ?? []).filter((it: any) => it.template_id === tpl.id)
                        .map((it: any) => ({ layanan_id: it.layanan_id ?? null, layanan_nama: it.layanan_nama, tarif: Number(it.tarif), qty: Number(it.qty) }));
                      setEditing({
                        ...editing,
                        payer_id: tpl.payer_id ?? editing.payer_id,
                        diskon: Number(tpl.diskon ?? editing.diskon),
                        pajak_pct: Number(tpl.pajak_pct ?? editing.pajak_pct),
                        catatan: tpl.catatan ?? editing.catatan,
                        items: items.length ? items : editing.items,
                      });
                      toast.success(`Template "${tpl.nama}" diterapkan`);
                      e.currentTarget.value = "";
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>— pilih template untuk auto-fill —</option>
                    {(tpls?.rows ?? []).filter((t: any) => t.is_active !== false).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.nama}{t.kategori ? ` (${t.kategori})` : ""}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Tanggal"><Input type="date" value={editing.tanggal} onChange={(e) => setEditing({ ...editing, tanggal: e.target.value })} /></Field>
                <Field label="Kode Pasien"><Input value={editing.patient_code} onChange={(e) => setEditing({ ...editing, patient_code: e.target.value })} /></Field>
                <Field label="Nama Pasien"><Input value={editing.patient_name} onChange={(e) => setEditing({ ...editing, patient_name: e.target.value })} /></Field>
                <Field label="Dokter">
                  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={editing.dokter_id} onChange={(e) => setEditing({ ...editing, dokter_id: e.target.value })}>
                    <option value="">—</option>
                    {(lookups?.dokter ?? []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="Payer">
                  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={editing.payer_id} onChange={(e) => setEditing({ ...editing, payer_id: e.target.value })}>
                    <option value="">—</option>
                    {(lookups?.payer ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="Kasir"><Input value={editing.kasir} onChange={(e) => setEditing({ ...editing, kasir: e.target.value })} /></Field>
              </div>

              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border p-2">
                  <div className="text-sm font-medium">Item Layanan</div>
                  <Button size="sm" variant="outline" onClick={() => setEditing({ ...editing, items: [...editing.items, { layanan_nama: "", tarif: 0, qty: 1 }] })}>
                    <Plus className="h-3 w-3" /> Item
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Layanan</TableHead><TableHead className="w-28 text-right">Tarif</TableHead><TableHead className="w-16 text-right">Qty</TableHead><TableHead className="w-28 text-right">Subtotal</TableHead><TableHead className="w-10" /></TableRow>
                  </TableHeader>
                  <TableBody>
                    {editing.items.map((it: ItemRow, i: number) => (
                      <TableRow key={i}>
                        <TableCell>
                          <select
                            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                            value={it.layanan_id ?? ""}
                            onChange={(e) => {
                              const lay = (lookups?.layanan ?? []).find((l: any) => l.id === e.target.value);
                              const items = [...editing.items];
                              items[i] = lay ? { layanan_id: lay.id, layanan_nama: lay.name, tarif: Number(lay.tarif), qty: it.qty } : { ...it, layanan_id: null };
                              setEditing({ ...editing, items });
                            }}
                          >
                            <option value="">— pilih / ketik manual —</option>
                            {(lookups?.layanan ?? []).map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                          {!it.layanan_id && (
                            <Input className="mt-1 h-8" placeholder="Nama layanan" value={it.layanan_nama} onChange={(e) => { const items = [...editing.items]; items[i] = { ...it, layanan_nama: e.target.value }; setEditing({ ...editing, items }); }} />
                          )}
                        </TableCell>
                        <TableCell><Input type="number" className="h-8 text-right" value={it.tarif} onChange={(e) => { const items = [...editing.items]; items[i] = { ...it, tarif: Number(e.target.value) }; setEditing({ ...editing, items }); }} /></TableCell>
                        <TableCell><Input type="number" className="h-8 text-right" value={it.qty} onChange={(e) => { const items = [...editing.items]; items[i] = { ...it, qty: Number(e.target.value) }; setEditing({ ...editing, items }); }} /></TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(it.tarif * it.qty)}</TableCell>
                        <TableCell><Button size="icon" aria-label="Hapus" variant="ghost" onClick={() => setEditing({ ...editing, items: editing.items.filter((_: any, idx: number) => idx !== i) })}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Diskon (Rp)"><Input type="number" value={editing.diskon} onChange={(e) => setEditing({ ...editing, diskon: Number(e.target.value) })} /></Field>
                <Field label="PPN (%)"><Input type="number" value={editing.pajak_pct} onChange={(e) => setEditing({ ...editing, pajak_pct: Number(e.target.value) })} /></Field>
                <Field label="Catatan"><Input value={editing.catatan} onChange={(e) => setEditing({ ...editing, catatan: e.target.value })} /></Field>
              </div>

              <Summary items={editing.items} diskon={editing.diskon} pajak_pct={editing.pajak_pct} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button disabled={upsertMut.isPending} onClick={() => upsertMut.mutate(editing)}>
              {upsertMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan & Posting Jurnal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VOID DIALOG */}
      <Dialog open={!!voidFor} onOpenChange={(o) => !o && setVoidFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Void Invoice {voidFor?.no_invoice}</DialogTitle></DialogHeader>
          <Label className="text-xs">Alasan</Label>
          <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="Alasan pembatalan…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidFor(null)}>Batal</Button>
            <Button variant="destructive" disabled={voidMut.isPending || voidReason.length < 3} onClick={() => voidMut.mutate({ id: voidFor.id, reason: voidReason })}>Void</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PAYMENT DIALOG */}
      <PaymentDialog
        invoice={payFor}
        onClose={() => setPayFor(null)}
        onPay={(d) => pay({ data: { ...d, actor: user?.email } }).then(() => { qc.invalidateQueries({ queryKey: ["fin-invoices"] }); toast.success("Pembayaran tercatat"); setPayFor(null); }).catch((e) => toast.error(e.message))}
      />

      {/* DETAIL */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.no_invoice}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Tanggal: <b>{detail.tanggal}</b></div>
                <div>Pasien: <b>{detail.patient_name ?? detail.patient_code}</b></div>
                <div>Status: <StatusBadge s={detail.status} /></div>
                <div>Total: <b>{fmt(detail.total)}</b></div>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold">Item</div>
                <Table><TableHeader><TableRow><TableHead>Layanan</TableHead><TableHead className="text-right">Tarif</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
                  <TableBody>{(detail.items ?? []).map((it: any) => (
                    <TableRow key={it.id}><TableCell>{it.layanan_nama}</TableCell><TableCell className="text-right">{fmt(it.tarif)}</TableCell><TableCell className="text-right">{it.qty}</TableCell><TableCell className="text-right">{fmt(it.subtotal)}</TableCell></TableRow>
                  ))}</TableBody>
                </Table>
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold">Pembayaran</div>
                {(detail.payments ?? []).length === 0 ? <div className="text-xs text-muted-foreground">Belum ada pembayaran.</div> : (
                  <Table><TableHeader><TableRow><TableHead>Tanggal</TableHead><TableHead>Metode</TableHead><TableHead className="text-right">Jumlah</TableHead><TableHead></TableHead></TableRow></TableHeader>
                    <TableBody>{detail.payments.map((p: any) => (
                      <TableRow key={p.id}><TableCell>{p.tanggal}</TableCell><TableCell>{p.metode}{p.bank ? ` / ${p.bank}` : ""}</TableCell><TableCell className="text-right">{fmt(p.jumlah)}</TableCell><TableCell>
                        {canEdit && <Button size="icon" aria-label="Hapus" variant="ghost" onClick={() => { if (confirm("Hapus pembayaran?")) delPay({ data: { id: p.id } }).then(() => { qc.invalidateQueries({ queryKey: ["fin-invoices"] }); setDetail(null); toast.success("Pembayaran dihapus"); }); }}><Trash2 className="h-3 w-3" /></Button>}
                      </TableCell></TableRow>
                    ))}</TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${tone === "amber" ? "border-amber-500/30" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ s }: { s: string }) {
  const cls = s === "paid" ? "bg-emerald-500/15 text-emerald-700" : s === "partial" ? "bg-blue-500/15 text-blue-700" : s === "issued" ? "bg-amber-500/15 text-amber-700" : s === "void" ? "bg-rose-500/15 text-rose-700" : "bg-muted text-muted-foreground";
  return <Badge variant="secondary" className={cls}>{s}</Badge>;
}

function Summary({ items, diskon, pajak_pct }: { items: ItemRow[]; diskon: number; pajak_pct: number }) {
  const subtotal = items.reduce((a, it) => a + Number(it.tarif) * Number(it.qty), 0);
  const dpp = Math.max(0, subtotal - Number(diskon || 0));
  const pajak = Math.round(dpp * Number(pajak_pct || 0) / 100);
  const total = dpp + pajak;
  return (
    <div className="ml-auto w-72 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <Row k="Subtotal" v={fmt(subtotal)} />
      <Row k="Diskon" v={`- ${fmt(Number(diskon || 0))}`} />
      <Row k={`PPN ${pajak_pct || 0}%`} v={fmt(pajak)} />
      <div className="mt-1 border-t border-border pt-1"><Row k="Total" v={fmt(total)} bold /></div>
    </div>
  );
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}><span className="text-muted-foreground">{k}</span><span className="font-mono">{v}</span></div>;
}

function PaymentDialog({ invoice, onClose, onPay }: { invoice: any | null; onClose: () => void; onPay: (d: any) => void }) {
  const [form, setForm] = useState<any>(null);
  const open = !!invoice;
  if (open && !form) {
    const sisa = Number(invoice.total) - Number(invoice.dibayar ?? 0);
    setForm({
      invoice_id: invoice.id,
      tanggal: new Date().toISOString().slice(0, 10),
      metode: "cash",
      bank: "",
      jumlah: sisa,
      mdr: 0,
    });
  }
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setForm(null); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Pembayaran {invoice?.no_invoice}</DialogTitle></DialogHeader>
        {form && (
          <div className="grid gap-3">
            <Field label="Tanggal"><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></Field>
            <Field label="Metode">
              <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={form.metode} onChange={(e) => setForm({ ...form, metode: e.target.value })}>
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="debit">Debit</option>
                <option value="credit">Credit Card</option>
                <option value="qris">QRIS</option>
              </select>
            </Field>
            {form.metode !== "cash" && <Field label="Bank"><Input value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></Field>}
            <Field label="Jumlah"><Input type="number" value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) })} /></Field>
            <Field label="MDR (Rp)"><Input type="number" value={form.mdr} onChange={(e) => setForm({ ...form, mdr: Number(e.target.value) })} /></Field>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); setForm(null); }}>Batal</Button>
          <Button onClick={() => { onPay(form); setForm(null); }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
