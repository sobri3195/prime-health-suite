import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search, Download, Upload, Plus, Eye, Pencil, MoreHorizontal, Send,
  Check, X, Ban, Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { master } from "@/data/financeData";
import { formatIDR } from "@/lib/finance";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { addAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/finance/pengeluaran")({
  component: PengeluaranPage,
});

type ExpStatus = "draft" | "submitted" | "approved" | "rejected" | "paid" | "void";
const STATUS_LABEL: Record<ExpStatus, string> = {
  draft: "Draft", submitted: "Submitted", approved: "Approved",
  rejected: "Rejected", paid: "Paid", void: "Void",
};
function statusCls(s: ExpStatus) {
  return s === "paid" ? "bg-emerald-500/15 text-emerald-600"
    : s === "approved" ? "bg-blue-500/15 text-blue-600"
    : s === "submitted" ? "bg-amber-500/15 text-amber-600"
    : s === "rejected" ? "bg-rose-500/15 text-rose-600"
    : s === "void" ? "bg-zinc-500/15 text-zinc-500"
    : "bg-muted text-muted-foreground";
}

const METHODS = ["Transfer Bank", "Cash", "Kartu Kredit", "QRIS"] as const;

interface Expense {
  id: string;
  number: string;
  vendor: string;
  category: string;
  date: string;
  amount: number;
  tax: number;
  method: string;
  bank: string;
  status: ExpStatus;
  proof: string[];
  reason?: string;
  journalId?: string;
}

const VENDORS = master.vendors.map((v) => v.name);
const CATEGORIES = master.costCategories.map((c) => c.name);
const BANKS = master.banks.map((b) => `${b.name} ${b.account}`);

function seed(): Expense[] {
  return Array.from({ length: 22 }).map((_, i) => {
    const amount = Math.round((1 + (i % 9)) * 1_250_000);
    const status: ExpStatus = (["draft","submitted","approved","approved","paid","paid","rejected"] as ExpStatus[])[i % 7];
    return {
      id: `EXP-${String(2001 + i).padStart(5, "0")}`,
      number: `EXP/2026/${String((i % 6) + 1).padStart(2, "0")}/${String(100 + i).padStart(4, "0")}`,
      vendor: VENDORS[i % VENDORS.length],
      category: CATEGORIES[i % CATEGORIES.length],
      date: new Date(Date.now() - i * 36e5 * 12).toISOString(),
      amount,
      tax: Math.round(amount * 0.11),
      method: METHODS[i % METHODS.length],
      bank: BANKS[i % BANKS.length],
      status,
      proof: i % 4 === 0 ? [`bukti_${i}.pdf`] : [],
      journalId: status === "paid" ? `JRN-${20000 + i}` : undefined,
    };
  });
}

const PAGE = 12;

function PengeluaranPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Expense[]>(seed);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [cat, setCat] = useState("all");
  const [page, setPage] = useState(1);

  const [detail, setDetail] = useState<Expense | null>(null);
  const [edit, setEdit] = useState<Expense | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [confirm, setConfirm] = useState<{ exp: Expense; action: ExpStatus; needsReason?: boolean } | null>(null);

  const filtered = useMemo(() => rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (cat !== "all" && r.category !== cat) return false;
    if (q && !`${r.number} ${r.vendor} ${r.category}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, q, status, cat]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);
  const totalSum = filtered.reduce((a, r) => a + r.amount, 0);

  const change = (id: string, action: ExpStatus, reason?: string) => {
    setRows((arr) => arr.map((r) => {
      if (r.id !== id) return r;
      const next: Expense = { ...r, status: action, reason };
      if (action === "paid" && !r.journalId) {
        next.journalId = `JRN-${Math.floor(Math.random() * 90000 + 10000)}`;
        toast.success(`${id} dibayar. Jurnal otomatis ${next.journalId} dibuat.`);
      } else {
        toast.success(`${id} → ${STATUS_LABEL[action]}`);
      }
      return next;
    }));
    addAudit({ actor: user?.email ?? "system", action: "role_change", target: `finance/expense/${id}`, meta: { to: action, reason } });
  };

  const uploadProof = (id: string) => {
    setRows((arr) => arr.map((r) => r.id === id ? { ...r, proof: [...r.proof, `bukti_${Date.now()}.pdf`] } : r));
    toast.success("Bukti pembayaran diunggah (mock)");
  };

  const exportCSV = () => {
    const csv = toCSV(filtered, [
      { key: "number", label: "Expense No", get: (r) => r.number },
      { key: "vendor", label: "Vendor", get: (r) => r.vendor },
      { key: "category", label: "Kategori", get: (r) => r.category },
      { key: "date", label: "Tanggal", get: (r) => new Date(r.date).toLocaleDateString("id-ID") },
      { key: "amount", label: "Nominal", get: (r) => r.amount },
      { key: "tax", label: "Pajak", get: (r) => r.tax },
      { key: "method", label: "Metode", get: (r) => r.method },
      { key: "bank", label: "Bank", get: (r) => r.bank },
      { key: "status", label: "Status", get: (r) => STATUS_LABEL[r.status] },
      { key: "journalId", label: "Jurnal", get: (r) => r.journalId ?? "" },
    ]);
    downloadCSV(exportFileName("pengeluaran", "all"), csv);
    addAudit({ actor: user?.email ?? "system", action: "export", target: "finance/pengeluaran", meta: { rows: filtered.length } });
    toast.success(`Export ${filtered.length} pengeluaran (CSV)`);
  };

  return (
    <div>
      <PageHeader title="Pengeluaran" desc="Pencatatan biaya operasional dengan alur approval & jurnal otomatis saat paid." />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Total Filtered</div>
          <div className="mt-1 text-xl font-semibold">{formatIDR(totalSum)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Menunggu Approval</div>
          <div className="mt-1 text-xl font-semibold text-amber-600">{filtered.filter((r) => r.status === "submitted").length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Paid (Jurnal Auto)</div>
          <div className="mt-1 text-xl font-semibold text-emerald-600">{filtered.filter((r) => r.status === "paid").length}</div>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari no/ vendor/ kategori…" className="pl-9" />
        </div>
        <Select value={cat} onValueChange={(v) => { setCat(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {(Object.keys(STATUS_LABEL) as ExpStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCSV} className="gap-1"><Download className="h-4 w-4" /> Export CSV</Button>
        <Button onClick={() => setNewOpen(true)} className="gap-1"><Plus className="h-4 w-4" /> Baru</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Expense No</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead className="text-right">Pajak</TableHead>
              <TableHead>Metode</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Bukti</TableHead>
              <TableHead>Jurnal</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="py-16 text-center text-sm text-muted-foreground">Tidak ada pengeluaran.</TableCell></TableRow>
            ) : slice.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.number}</TableCell>
                <TableCell className="text-xs">{new Date(r.date).toLocaleDateString("id-ID")}</TableCell>
                <TableCell>{r.vendor}</TableCell>
                <TableCell className="text-sm">{r.category}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatIDR(r.amount)}</TableCell>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">{formatIDR(r.tax)}</TableCell>
                <TableCell className="text-xs">{r.method}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.bank}</TableCell>
                <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${statusCls(r.status)}`}>{STATUS_LABEL[r.status]}</span></TableCell>
                <TableCell><Badge variant="outline">{r.proof.length}</Badge></TableCell>
                <TableCell>{r.journalId ? <span className="font-mono text-xs text-emerald-600">{r.journalId}</span> : "—"}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setDetail(r)}><Eye className="mr-2 h-4 w-4" /> Detail</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEdit(r)} disabled={r.status === "paid" || r.status === "void"}><Pencil className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => uploadProof(r.id)}><Upload className="mr-2 h-4 w-4" /> Upload Bukti</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setConfirm({ exp: r, action: "submitted" })} disabled={r.status !== "draft"}><Send className="mr-2 h-4 w-4" /> Submit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setConfirm({ exp: r, action: "approved" })} disabled={r.status !== "submitted"}><Check className="mr-2 h-4 w-4" /> Approve</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setConfirm({ exp: r, action: "rejected", needsReason: true })} disabled={r.status !== "submitted"}><X className="mr-2 h-4 w-4" /> Reject</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setConfirm({ exp: r, action: "paid" })} disabled={r.status !== "approved"}><Banknote className="mr-2 h-4 w-4" /> Mark Paid</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setConfirm({ exp: r, action: "void", needsReason: true })} disabled={r.status === "paid" || r.status === "void"}><Ban className="mr-2 h-4 w-4" /> Void</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Menampilkan {slice.length} dari {filtered.length} pengeluaran</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span>Hal. {safePage} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <DetailDialog exp={detail} onClose={() => setDetail(null)} />
      <EditDialog exp={edit} onClose={() => setEdit(null)} onSave={(nv) => {
        setRows((arr) => arr.map((r) => r.id === nv.id ? nv : r));
        addAudit({ actor: user?.email ?? "system", action: "role_change", target: `finance/expense/${nv.id}`, meta: { action: "edit" } });
        toast.success(`${nv.number} diperbarui`);
      }} />
      <NewDialog open={newOpen} onOpenChange={setNewOpen} onCreate={(e) => {
        setRows([e, ...rows]);
        addAudit({ actor: user?.email ?? "system", action: "role_change", target: `finance/expense/${e.id}`, meta: { action: "create" } });
        toast.success(`${e.number} dibuat`);
      }} />
      <ConfirmDialog data={confirm} onClose={() => setConfirm(null)} onConfirm={(d, reason) => {
        change(d.exp.id, d.action, reason);
        setConfirm(null);
      }} />
    </div>
  );
}

function DetailDialog({ exp, onClose }: { exp: Expense | null; onClose: () => void }) {
  if (!exp) return null;
  return (
    <Dialog open={!!exp} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{exp.number}</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          {[
            ["Vendor", exp.vendor], ["Kategori", exp.category],
            ["Tanggal", new Date(exp.date).toLocaleString("id-ID")],
            ["Nominal", formatIDR(exp.amount)], ["Pajak", formatIDR(exp.tax)],
            ["Metode", exp.method], ["Bank", exp.bank],
            ["Status", STATUS_LABEL[exp.status]],
            ["Bukti", `${exp.proof.length} file`],
            ["Jurnal", exp.journalId ?? "Belum dibuat"],
          ].map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-2 border-b border-border/60 pb-1.5 last:border-0">
              <span className="text-muted-foreground">{k}</span><span className="col-span-2">{v}</span>
            </div>
          ))}
          {exp.reason && <div className="text-xs text-amber-600">Alasan: {exp.reason}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ exp, onClose, onSave }: { exp: Expense | null; onClose: () => void; onSave: (e: Expense) => void }) {
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState("");
  const [bank, setBank] = useState("");

  useMemo(() => {
    if (exp) { setAmount(exp.amount); setCategory(exp.category); setBank(exp.bank); }
  }, [exp]);

  if (!exp) return null;
  return (
    <Dialog open={!!exp} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {exp.number}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <Field label="Nominal"><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} /></Field>
          <Field label="Kategori">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Bank">
            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => { onSave({ ...exp, amount, category, bank, tax: Math.round(amount * 0.11) }); onClose(); }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (e: Expense) => void }) {
  const [vendor, setVendor] = useState(VENDORS[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState(0);
  const [method, setMethod] = useState<string>(METHODS[0]);
  const [bank, setBank] = useState(BANKS[0]);

  const create = () => {
    if (amount <= 0) return toast.error("Nominal harus > 0");
    const now = new Date();
    const e: Expense = {
      id: `EXP-${Date.now().toString().slice(-6)}`,
      number: `EXP/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${Math.floor(Math.random() * 9000 + 1000)}`,
      vendor, category, date: now.toISOString(),
      amount, tax: Math.round(amount * 0.11),
      method, bank, status: "draft", proof: [],
    };
    onCreate(e);
    onOpenChange(false);
    setAmount(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Pengeluaran Baru</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2 sm:grid-cols-2">
          <Field label="Vendor">
            <Select value={vendor} onValueChange={setVendor}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{VENDORS.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Kategori">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Nominal"><Input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} /></Field>
          <Field label="Metode">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Bank" full>
            <Select value={bank} onValueChange={setBank}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BANKS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={create}>Buat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  data, onClose, onConfirm,
}: {
  data: { exp: Expense; action: ExpStatus; needsReason?: boolean } | null;
  onClose: () => void;
  onConfirm: (d: NonNullable<typeof data>, reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  if (!data) return null;
  const isPay = data.action === "paid";
  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{STATUS_LABEL[data.action]} — {data.exp.number}</DialogTitle>
          <DialogDescription>
            {isPay
              ? "Menandai sebagai paid akan membuat jurnal otomatis di Finance."
              : "Konfirmasi perubahan status pengeluaran."}
          </DialogDescription>
        </DialogHeader>
        {data.needsReason && (
          <div className="grid gap-1.5 py-2">
            <Label className="text-xs">Alasan (wajib)</Label>
            <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button
            disabled={data.needsReason && reason.trim().length < 4}
            onClick={() => onConfirm(data, data.needsReason ? reason.trim() : undefined)}
          >Konfirmasi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`grid gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
