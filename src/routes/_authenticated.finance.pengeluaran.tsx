import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Ban, Loader2, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listExpenses, upsertExpense, voidExpense, getExpense, listLookups,
} from "@/lib/finance-tx.functions";
import { listTplVoucher } from "@/lib/finance-template.functions";
import { useFinanceDate } from "@/context/finance-date";
import { useFinanceAccess } from "@/lib/finance-access";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/finance/pengeluaran")({
  component: PengeluaranPage,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");
type ItemRow = { deskripsi: string; coa_code?: string; qty: number; harga: number };

function PengeluaranPage() {
  const { from, to } = useFinanceDate();
  const { canEdit } = useFinanceAccess();
  const { user } = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(listExpenses);
  const upsert = useServerFn(upsertExpense);
  const voidFn = useServerFn(voidExpense);
  const get = useServerFn(getExpense);
  const lookupsFn = useServerFn(listLookups);

  const [q, setQ] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["fin-expenses", from, to, q],
    queryFn: () => list({ data: { from, to, q } }),
  });
  const rows = data?.rows ?? [];
  const { data: lookups } = useQuery({ queryKey: ["fin-lookups"], queryFn: () => lookupsFn() });
  const tplFn = useServerFn(listTplVoucher);
  const { data: tpls } = useQuery({ queryKey: ["fin-tpl-vch"], queryFn: () => tplFn() });
  const beban = useMemo(() => (lookups?.coa ?? []).filter((c: any) => c.type === "Expense"), [lookups]);

  const [editing, setEditing] = useState<any | null>(null);
  const [voidFor, setVoidFor] = useState<any | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const upsertMut = useMutation({
    mutationFn: (input: any) => upsert({ data: { ...input, actor: user?.email } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fin-expenses"] }); toast.success("Voucher tersimpan"); setEditing(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const voidMut = useMutation({
    mutationFn: (v: { id: string; reason: string }) => voidFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fin-expenses"] }); toast.success("Voucher dibatalkan"); setVoidFor(null); setVoidReason(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  function startNew() {
    setEditing({
      tanggal: new Date().toISOString().slice(0, 10),
      vendor_id: "",
      vendor_nama: "",
      coa_code: "",
      keterangan: "",
      metode: "cash",
      bank: "",
      pajak_pct: 0,
      items: [{ deskripsi: "", qty: 1, harga: 0 }] as ItemRow[],
    });
  }
  async function openEdit(row: any) {
    const full = await get({ data: { id: row.id } });
    setEditing({
      id: row.id,
      tanggal: row.tanggal,
      vendor_id: row.vendor_id ?? "",
      vendor_nama: row.vendor_nama ?? "",
      coa_code: row.coa_code ?? "",
      keterangan: row.keterangan ?? "",
      metode: row.metode,
      bank: row.bank ?? "",
      pajak_pct: row.subtotal > 0 ? Math.round((Number(row.pajak) / Number(row.subtotal)) * 100) : 0,
      items: (full.items ?? []).map((it: any) => ({ deskripsi: it.deskripsi, coa_code: it.coa_code ?? "", qty: Number(it.qty), harga: Number(it.harga) })),
    });
  }

  const total = rows.reduce((a: number, r: any) => a + Number(r.total), 0);

  return (
    <div>
      <PageHeader title="Pengeluaran / Voucher" desc="Catat pengeluaran ke vendor. Auto-posting jurnal." />

      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="Jumlah Voucher" value={String(rows.length)} />
        <Kpi label="Total Pengeluaran" value={fmt(total)} />
        <Kpi label="Periode" value={`${from ?? "-"} → ${to ?? "-"}`} />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari no voucher / vendor…" className="pl-9" />
        </div>
        {canEdit && <Button onClick={startNew}><Plus className="h-4 w-4" /> Voucher Baru</Button>}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Voucher</TableHead><TableHead>Tanggal</TableHead><TableHead>Vendor</TableHead>
            <TableHead>Keterangan</TableHead><TableHead className="text-right">Total</TableHead>
            <TableHead>Metode</TableHead><TableHead>Status</TableHead><TableHead>Jurnal</TableHead><TableHead className="text-right">Aksi</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={9} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">Belum ada voucher.</TableCell></TableRow>
              : rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.no_voucher}</TableCell>
                  <TableCell>{r.tanggal}</TableCell>
                  <TableCell>{r.vendor_nama ?? "—"}</TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{r.keterangan}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                  <TableCell><Badge variant="secondary">{r.metode}</Badge></TableCell>
                  <TableCell>{r.status === "void" ? <Badge className="bg-rose-500/15 text-rose-700" variant="secondary">void</Badge> : <Badge className="bg-emerald-500/15 text-emerald-700" variant="secondary">posted</Badge>}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={r.posted_journal_id ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}>
                      {r.posted_journal_id ? "Posted" : "Unposted"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit && r.status !== "void" && (
                      <div className="flex justify-end gap-1">
                        <Button size="icon" aria-label="Edit" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" aria-label="Batalkan" variant="ghost" onClick={() => setVoidFor(r)}><Ban className="h-4 w-4 text-rose-500" /></Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Voucher" : "Voucher Baru"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3">
              {!editing.id && (tpls?.rows?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 p-2 text-xs">
                  <Label className="text-xs">Pakai Template:</Label>
                  <select
                    className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    defaultValue=""
                    onChange={(e) => {
                      const tpl = (tpls?.rows ?? []).find((t: any) => t.id === e.target.value);
                      if (!tpl) return;
                      const items = (tpls?.items ?? []).filter((it: any) => it.template_id === tpl.id)
                        .map((it: any) => ({ deskripsi: it.deskripsi, coa_code: it.coa_code ?? tpl.coa_code ?? "", qty: Number(it.qty), harga: Number(it.harga) }));
                      setEditing({
                        ...editing,
                        vendor_id: tpl.vendor_id ?? editing.vendor_id,
                        coa_code: tpl.coa_code ?? editing.coa_code,
                        metode: tpl.metode ?? editing.metode,
                        pajak_pct: Number(tpl.pajak_pct ?? editing.pajak_pct),
                        keterangan: tpl.keterangan ?? editing.keterangan,
                        items: items.length ? items : editing.items,
                      });
                      toast.success(`Template "${tpl.nama}" diterapkan`);
                      e.currentTarget.value = "";
                    }}
                  >
                    <option value="" disabled>— pilih template untuk auto-fill —</option>
                    {(tpls?.rows ?? []).filter((t: any) => t.is_active !== false).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.nama}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Tanggal"><Input type="date" value={editing.tanggal} onChange={(e) => setEditing({ ...editing, tanggal: e.target.value })} /></Field>
                <Field label="Vendor">
                  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={editing.vendor_id} onChange={(e) => {
                    const v = (lookups?.vendor ?? []).find((x: any) => x.id === e.target.value);
                    setEditing({ ...editing, vendor_id: e.target.value, vendor_nama: v?.name ?? editing.vendor_nama });
                  }}>
                    <option value="">— pilih —</option>
                    {(lookups?.vendor ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </Field>
                <Field label="Nama Vendor (manual)"><Input value={editing.vendor_nama} onChange={(e) => setEditing({ ...editing, vendor_nama: e.target.value })} /></Field>
                <Field label="Metode">
                  <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={editing.metode} onChange={(e) => setEditing({ ...editing, metode: e.target.value })}>
                    <option value="cash">Cash</option><option value="transfer">Transfer</option>
                  </select>
                </Field>
                {editing.metode !== "cash" && <Field label="Bank"><Input value={editing.bank} onChange={(e) => setEditing({ ...editing, bank: e.target.value })} /></Field>}
                <Field label="PPN Masukan (%)"><Input type="number" value={editing.pajak_pct} onChange={(e) => setEditing({ ...editing, pajak_pct: Number(e.target.value) })} /></Field>
              </div>
              <Field label="Keterangan"><Input value={editing.keterangan} onChange={(e) => setEditing({ ...editing, keterangan: e.target.value })} /></Field>

              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border p-2">
                  <div className="text-sm font-medium">Item Pengeluaran</div>
                  <Button size="sm" variant="outline" onClick={() => setEditing({ ...editing, items: [...editing.items, { deskripsi: "", qty: 1, harga: 0 }] })}><Plus className="h-3 w-3" /> Item</Button>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Deskripsi</TableHead><TableHead className="w-44">COA Beban</TableHead><TableHead className="w-16 text-right">Qty</TableHead><TableHead className="w-28 text-right">Harga</TableHead><TableHead className="w-28 text-right">Subtotal</TableHead><TableHead className="w-10" /></TableRow></TableHeader>
                  <TableBody>
                    {editing.items.map((it: ItemRow, i: number) => (
                      <TableRow key={i}>
                        <TableCell><Input className="h-8" value={it.deskripsi} onChange={(e) => { const items = [...editing.items]; items[i] = { ...it, deskripsi: e.target.value }; setEditing({ ...editing, items }); }} /></TableCell>
                        <TableCell>
                          <select className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs" value={it.coa_code ?? ""} onChange={(e) => { const items = [...editing.items]; items[i] = { ...it, coa_code: e.target.value }; setEditing({ ...editing, items }); }}>
                            <option value="">—</option>
                            {beban.map((c: any) => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                          </select>
                        </TableCell>
                        <TableCell><Input type="number" className="h-8 text-right" value={it.qty} onChange={(e) => { const items = [...editing.items]; items[i] = { ...it, qty: Number(e.target.value) }; setEditing({ ...editing, items }); }} /></TableCell>
                        <TableCell><Input type="number" className="h-8 text-right" value={it.harga} onChange={(e) => { const items = [...editing.items]; items[i] = { ...it, harga: Number(e.target.value) }; setEditing({ ...editing, items }); }} /></TableCell>
                        <TableCell className="text-right font-mono text-xs">{fmt(it.qty * it.harga)}</TableCell>
                        <TableCell><Button size="icon" aria-label="Hapus" variant="ghost" onClick={() => setEditing({ ...editing, items: editing.items.filter((_: any, idx: number) => idx !== i) })}><Trash2 className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Summary items={editing.items} pajak_pct={editing.pajak_pct} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button disabled={upsertMut.isPending} onClick={() => upsertMut.mutate(editing)}>{upsertMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan & Posting</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!voidFor} onOpenChange={(o) => !o && setVoidFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Void {voidFor?.no_voucher}</DialogTitle></DialogHeader>
          <Label className="text-xs">Alasan</Label>
          <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidFor(null)}>Batal</Button>
            <Button variant="destructive" disabled={voidMut.isPending || voidReason.length < 3} onClick={() => voidMut.mutate({ id: voidFor.id, reason: voidReason })}>Void</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="grid gap-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div></div>;
}
function Summary({ items, pajak_pct }: { items: ItemRow[]; pajak_pct: number }) {
  const subtotal = items.reduce((a, it) => a + Number(it.qty) * Number(it.harga), 0);
  const pajak = Math.round(subtotal * Number(pajak_pct || 0) / 100);
  const total = subtotal + pajak;
  return (
    <div className="ml-auto w-72 rounded-lg border border-border bg-muted/30 p-3 text-sm">
      <Row k="Subtotal" v={fmt(subtotal)} /><Row k={`PPN ${pajak_pct || 0}%`} v={fmt(pajak)} />
      <div className="mt-1 border-t border-border pt-1"><Row k="Total" v={fmt(total)} bold /></div>
    </div>
  );
}
function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return <div className={`flex items-center justify-between ${bold ? "font-semibold" : ""}`}><span className="text-muted-foreground">{k}</span><span className="font-mono">{v}</span></div>;
}
