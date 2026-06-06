import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Search, Eye, Pencil, Printer, Ban, Undo2, Download, Columns3,
  ArrowUpDown, MoreHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { FinanceFilters, defaultFilter } from "@/components/finance-filters";
import { invoices as seedInvoices } from "@/data/financeData";
import { applyFilter, formatIDR } from "@/lib/finance";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { addAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";
import type { Invoice } from "@/types/finance";

export const Route = createFileRoute("/_authenticated/finance/pendapatan")({
  component: PendapatanPage,
});

type InvStatus = "draft" | "issued" | "partial" | "paid" | "void" | "refunded";
const STATUS_LABEL: Record<InvStatus, string> = {
  draft: "Draft", issued: "Issued", partial: "Partial Paid",
  paid: "Paid", void: "Void", refunded: "Refunded",
};
function statusCls(s: InvStatus) {
  return s === "paid" ? "bg-emerald-500/15 text-emerald-600"
    : s === "partial" ? "bg-blue-500/15 text-blue-600"
    : s === "issued" ? "bg-amber-500/15 text-amber-600"
    : s === "draft" ? "bg-muted text-muted-foreground"
    : s === "refunded" ? "bg-purple-500/15 text-purple-600"
    : "bg-rose-500/15 text-rose-600";
}

interface RichInvoice extends Omit<Invoice, "status"> {
  status: InvStatus;
  discount: number;
  tax: number;
  reason?: string;
}

const ALL_COLS = [
  "invoice","date","patientCode","payer","doctor","service",
  "subtotal","discount","tax","total","paid","outstanding","status","action",
] as const;
type Col = (typeof ALL_COLS)[number];
const COL_LABEL: Record<Col, string> = {
  invoice: "Invoice", date: "Tanggal", patientCode: "Patient Code",
  payer: "Payer", doctor: "Dokter", service: "Layanan",
  subtotal: "Subtotal", discount: "Diskon", tax: "Pajak", total: "Total",
  paid: "Paid", outstanding: "Outstanding", status: "Status", action: "Aksi",
};

function seed(): RichInvoice[] {
  return seedInvoices.map((r, i) => {
    const subtotal = Math.round(r.total / 1.06);
    const tax = r.total - subtotal;
    const discount = i % 9 === 0 ? Math.round(subtotal * 0.05) : 0;
    const st: InvStatus = r.status === "overdue" ? "issued"
      : r.status === "unpaid" ? "issued"
      : r.status === "cancelled" ? "void"
      : (r.status as InvStatus);
    return { ...r, status: st, discount, tax };
  });
}

const PAGE = 12;

function PendapatanPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RichInvoice[]>(seed);
  const [filter, setFilter] = useState(defaultFilter);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: keyof RichInvoice; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  const [cols, setCols] = useState<Set<Col>>(new Set(ALL_COLS));

  const [detail, setDetail] = useState<RichInvoice | null>(null);
  const [edit, setEdit] = useState<RichInvoice | null>(null);
  const [reason, setReason] = useState<{ inv: RichInvoice; kind: "void" | "refunded" } | null>(null);

  const doctors = useMemo(() => Array.from(new Set(rows.map((r) => r.doctor))), [rows]);
  const services = useMemo(() => Array.from(new Set(rows.map((r) => r.category))), [rows]);

  const filtered = useMemo(() => {
    const base = applyFilter(rows as unknown as Invoice[], filter) as unknown as RichInvoice[];
    const fil = q
      ? base.filter((r) => `${r.invoice} ${r.patientCode} ${r.doctor} ${r.service}`.toLowerCase().includes(q.toLowerCase()))
      : base;
    const sorted = [...fil].sort((a, b) => {
      const av = a[sort.key] as unknown as number | string;
      const bv = b[sort.key] as unknown as number | string;
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rows, filter, q, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  const totalSum = filtered.reduce((a, r) => a + r.total, 0);
  const paidSum = filtered.reduce((a, r) => a + r.paid, 0);
  const outSum = totalSum - paidSum;

  const sortBtn = (key: keyof RichInvoice, label: string) => (
    <button className="inline-flex items-center gap-1 hover:text-foreground"
      onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))}>
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  const setStatus = (id: string, st: InvStatus, reasonText?: string) => {
    setRows((arr) => arr.map((r) => r.id === id ? { ...r, status: st, reason: reasonText ?? r.reason } : r));
    addAudit({
      actor: user?.email ?? "system",
      action: "role_change",
      target: `finance/invoice/${id}`,
      meta: { to: st, reason: reasonText },
    });
    toast.success(`Invoice ${id} → ${STATUS_LABEL[st]}`);
  };

  const exportCSV = () => {
    const csv = toCSV(filtered, [
      { key: "invoice", label: "Invoice", get: (r) => r.invoice },
      { key: "date", label: "Tanggal", get: (r) => new Date(r.date).toLocaleDateString("id-ID") },
      { key: "patientCode", label: "Patient Code", get: (r) => r.patientCode },
      { key: "payer", label: "Payer", get: (r) => r.payer },
      { key: "doctor", label: "Dokter", get: (r) => r.doctor },
      { key: "service", label: "Layanan", get: (r) => r.service },
      { key: "subtotal", label: "Subtotal", get: (r) => r.total - r.tax + r.discount },
      { key: "discount", label: "Diskon", get: (r) => r.discount },
      { key: "tax", label: "Pajak", get: (r) => r.tax },
      { key: "total", label: "Total", get: (r) => r.total },
      { key: "paid", label: "Paid", get: (r) => r.paid },
      { key: "outstanding", label: "Outstanding", get: (r) => r.total - r.paid },
      { key: "status", label: "Status", get: (r) => STATUS_LABEL[r.status] },
    ]);
    downloadCSV(exportFileName("pendapatan", filter.period), csv);
    addAudit({ actor: user?.email ?? "system", action: "export", target: "finance/pendapatan", meta: { rows: filtered.length } });
    toast.success(`Export ${filtered.length} invoice (CSV)`);
  };

  const visible = (c: Col) => cols.has(c);

  return (
    <div>
      <PageHeader title="Pendapatan" desc="Manajemen invoice. Void/refund tidak menghapus data." />

      <FinanceFilters value={filter} onChange={(v) => { setFilter(v); setPage(1); }} doctors={doctors} services={services} />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Stat label="Total" value={formatIDR(totalSum)} />
        <Stat label="Paid" value={formatIDR(paidSum)} tone="emerald" />
        <Stat label="Outstanding" value={formatIDR(outSum)} tone="amber" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari invoice / patient / dokter…" className="pl-9" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1"><Columns3 className="h-4 w-4" /> Kolom</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Tampilkan kolom</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_COLS.map((c) => (
              <DropdownMenuCheckboxItem key={c} checked={cols.has(c)}
                onCheckedChange={(v) => setCols((s) => { const n = new Set(s); v ? n.add(c) : n.delete(c); return n; })}>
                {COL_LABEL[c]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" onClick={exportCSV} className="gap-1"><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {visible("invoice") && <TableHead>{sortBtn("invoice", "Invoice")}</TableHead>}
              {visible("date") && <TableHead>{sortBtn("date", "Tanggal")}</TableHead>}
              {visible("patientCode") && <TableHead>Patient</TableHead>}
              {visible("payer") && <TableHead>Payer</TableHead>}
              {visible("doctor") && <TableHead>Dokter</TableHead>}
              {visible("service") && <TableHead>Layanan</TableHead>}
              {visible("subtotal") && <TableHead className="text-right">Subtotal</TableHead>}
              {visible("discount") && <TableHead className="text-right">Diskon</TableHead>}
              {visible("tax") && <TableHead className="text-right">Pajak</TableHead>}
              {visible("total") && <TableHead className="text-right">{sortBtn("total", "Total")}</TableHead>}
              {visible("paid") && <TableHead className="text-right">Paid</TableHead>}
              {visible("outstanding") && <TableHead className="text-right">Outstanding</TableHead>}
              {visible("status") && <TableHead>Status</TableHead>}
              {visible("action") && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.length === 0 ? (
              <TableRow><TableCell colSpan={cols.size} className="py-16 text-center text-sm text-muted-foreground">Tidak ada invoice.</TableCell></TableRow>
            ) : slice.map((r) => {
              const sub = r.total - r.tax + r.discount;
              const out = r.total - r.paid;
              return (
                <TableRow key={r.id}>
                  {visible("invoice") && <TableCell className="font-mono text-xs">{r.invoice}</TableCell>}
                  {visible("date") && <TableCell className="text-xs">{new Date(r.date).toLocaleDateString("id-ID")}</TableCell>}
                  {visible("patientCode") && <TableCell className="font-mono text-xs text-muted-foreground">{r.patientCode}</TableCell>}
                  {visible("payer") && <TableCell><Badge variant="secondary">{r.payer}</Badge></TableCell>}
                  {visible("doctor") && <TableCell className="text-sm">{r.doctor}</TableCell>}
                  {visible("service") && <TableCell className="text-sm">{r.service}</TableCell>}
                  {visible("subtotal") && <TableCell className="text-right font-mono text-xs">{formatIDR(sub)}</TableCell>}
                  {visible("discount") && <TableCell className="text-right font-mono text-xs">{r.discount ? `-${formatIDR(r.discount)}` : "—"}</TableCell>}
                  {visible("tax") && <TableCell className="text-right font-mono text-xs">{formatIDR(r.tax)}</TableCell>}
                  {visible("total") && <TableCell className="text-right font-mono text-sm font-medium">{formatIDR(r.total)}</TableCell>}
                  {visible("paid") && <TableCell className="text-right font-mono text-xs text-emerald-600">{formatIDR(r.paid)}</TableCell>}
                  {visible("outstanding") && <TableCell className="text-right font-mono text-xs text-amber-600">{formatIDR(out)}</TableCell>}
                  {visible("status") && <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${statusCls(r.status)}`}>{STATUS_LABEL[r.status]}</span></TableCell>}
                  {visible("action") && (
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setDetail(r)}><Eye className="mr-2 h-4 w-4" /> Detail</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEdit(r)} disabled={r.status === "void" || r.status === "refunded"}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toast.message(`Cetak ${r.invoice} (mock)`)}><Printer className="mr-2 h-4 w-4" /> Cetak</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setReason({ inv: r, kind: "void" })} disabled={r.status === "void"}><Ban className="mr-2 h-4 w-4" /> Void</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setReason({ inv: r, kind: "refunded" })} disabled={r.status === "refunded"}><Undo2 className="mr-2 h-4 w-4" /> Refund</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Menampilkan {slice.length} dari {filtered.length} invoice</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span>Hal. {safePage} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <DetailDialog inv={detail} onClose={() => setDetail(null)} />
      <EditDialog inv={edit} onClose={() => setEdit(null)} onSave={(nv) => {
        setRows((arr) => arr.map((r) => r.id === nv.id ? nv : r));
        addAudit({ actor: user?.email ?? "system", action: "role_change", target: `finance/invoice/${nv.id}`, meta: { action: "edit" } });
        toast.success(`Invoice ${nv.invoice} diperbarui`);
      }} />
      <ReasonDialog data={reason} onClose={() => setReason(null)} onConfirm={(r, text) => {
        setStatus(r.inv.id, r.kind, text);
        setReason(null);
      }} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "amber" }) {
  const color = tone === "emerald" ? "text-emerald-600" : tone === "amber" ? "text-amber-600" : "";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function DetailDialog({ inv, onClose }: { inv: RichInvoice | null; onClose: () => void }) {
  if (!inv) return null;
  const sub = inv.total - inv.tax + inv.discount;
  return (
    <Dialog open={!!inv} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{inv.invoice}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <Row k="Tanggal" v={new Date(inv.date).toLocaleString("id-ID")} />
          <Row k="Patient Code" v={inv.patientCode} />
          <Row k="Payer" v={inv.payer} />
          <Row k="Dokter" v={inv.doctor} />
          <Row k="Layanan" v={inv.service} />
          <Row k="Subtotal" v={formatIDR(sub)} />
          <Row k="Diskon" v={inv.discount ? `-${formatIDR(inv.discount)}` : "—"} />
          <Row k="Pajak" v={formatIDR(inv.tax)} />
          <Row k="Total" v={formatIDR(inv.total)} />
          <Row k="Paid" v={formatIDR(inv.paid)} />
          <Row k="Outstanding" v={formatIDR(inv.total - inv.paid)} />
          <Row k="Status" v={STATUS_LABEL[inv.status]} />
          {inv.reason && <Row k="Alasan" v={inv.reason} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-1.5 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="col-span-2 font-mono text-xs">{v}</span>
    </div>
  );
}

function EditDialog({ inv, onClose, onSave }: { inv: RichInvoice | null; onClose: () => void; onSave: (i: RichInvoice) => void }) {
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);

  useMemo(() => {
    if (inv) { setDiscount(inv.discount); setPaid(inv.paid); }
  }, [inv]);

  if (!inv) return null;
  return (
    <Dialog open={!!inv} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {inv.invoice}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label className="text-xs">Diskon</Label>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Paid Amount</Label>
            <Input type="number" value={paid} onChange={(e) => setPaid(Number(e.target.value) || 0)} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => {
            const status: InvStatus = paid >= inv.total ? "paid" : paid > 0 ? "partial" : inv.status;
            onSave({ ...inv, discount, paid, status });
            onClose();
          }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReasonDialog({
  data, onClose, onConfirm,
}: { data: { inv: RichInvoice; kind: "void" | "refunded" } | null; onClose: () => void; onConfirm: (d: NonNullable<typeof data>, reason: string) => void }) {
  const [text, setText] = useState("");
  if (!data) return null;
  const label = data.kind === "void" ? "Void Invoice" : "Refund Invoice";
  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{label} — {data.inv.invoice}</DialogTitle></DialogHeader>
        <div className="grid gap-2 py-2">
          <Label className="text-xs">Alasan (wajib)</Label>
          <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Tuliskan alasan…" />
          <p className="text-xs text-muted-foreground">Invoice tidak akan dihapus. Aksi tercatat di audit log.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button disabled={text.trim().length < 4} onClick={() => onConfirm(data, text.trim())}>
            Konfirmasi {data.kind === "void" ? "Void" : "Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
