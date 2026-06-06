import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Printer, Eye, Pencil, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { visits } from "@/data/clinicData";
import { addSync, formatIDR } from "@/lib/sync-log";
import { addAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/sim-klinik/billing")({
  component: BillingPage,
});

type BillStatus = "draft" | "issued" | "sent_to_cashier" | "paid" | "cancelled";

interface BillItem { name: string; qty: number; price: number }
interface Billing {
  id: string;
  invoice: string;
  visitId: string;
  patientCode: string;
  payer: string;
  doctor: string;
  items: BillItem[];
  discount: number;
  status: BillStatus;
  createdAt: string;
  sentToFinance?: boolean;
}

const STATUS_LABEL: Record<BillStatus, string> = {
  draft: "Draft", issued: "Issued", sent_to_cashier: "Sent to Cashier",
  paid: "Paid", cancelled: "Cancelled",
};

function seed(): Billing[] {
  return visits.slice(0, 6).map((v, i) => ({
    id: `BIL-${String(1001 + i).padStart(5, "0")}`,
    invoice: `INV/2026/06/${String(101 + i).padStart(4, "0")}`,
    visitId: v.id,
    patientCode: v.patientId,
    payer: v.payer,
    doctor: v.doctor,
    items: [
      { name: "Konsultasi Dokter Sp.M", qty: 1, price: 175000 },
      ...(i % 2 === 0 ? [{ name: "Refraksi", qty: 1, price: 85000 }] : []),
      ...(i % 3 === 0 ? [{ name: "Tonometri", qty: 1, price: 75000 }] : []),
    ],
    discount: i === 1 ? 25000 : 0,
    status: (["draft","issued","sent_to_cashier","paid","issued","draft"] as BillStatus[])[i],
    createdAt: new Date(Date.now() - i * 36e5).toISOString(),
  }));
}

const sum = (b: Billing) =>
  b.items.reduce((a, x) => a + x.qty * x.price, 0) - b.discount;

function BillingPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Billing[]>(seed());
  const [detail, setDetail] = useState<Billing | null>(null);
  const [edit, setEdit] = useState<Billing | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const updateStatus = (id: string, s: BillStatus) => {
    setList((arr) => arr.map((b) => b.id === id ? { ...b, status: s } : b));
    toast.success(`${id} → ${STATUS_LABEL[s]}`);
  };

  const sendToFinance = (b: Billing) => {
    const payload = {
      billing_id: b.id,
      invoice_number: b.invoice,
      patient_code: b.patientCode,
      payer: b.payer,
      doctor: b.doctor,
      service_items: b.items,
      total_amount: sum(b),
      billing_status: b.status,
      created_at: b.createdAt,
    };
    addSync({
      source: "SIM Klinik", target: "Finance",
      channel: "billing.invoice", refId: b.id,
      status: "success", payload,
    });
    addAudit({
      actor: user?.email ?? "system",
      action: "sync",
      target: `sim-klinik/billing/${b.id} → finance`,
      meta: { invoice: b.invoice, amount: sum(b) },
    });
    setList((arr) => arr.map((x) => x.id === b.id ? { ...x, sentToFinance: true } : x));
    toast.success(`Invoice ${b.invoice} terkirim ke Finance`);
  };

  const printBill = (b: Billing) => toast.message(`Cetak ${b.invoice} (mock)`);
  const remove = (id: string) => {
    setList((arr) => arr.filter((b) => b.id !== id));
    toast.message(`${id} dihapus`);
  };

  return (
    <div>
      <PageHeader
        title="Billing Klinik"
        desc="Billing operasional klinik. Detail finance (jurnal, laba rugi) dikelola di Prime Simon Finance."
      />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {list.length} billing • Kirim ke Finance untuk pencatatan jurnal & piutang.
        </p>
        <Button onClick={() => setNewOpen(true)} className="gap-1"><Plus className="h-4 w-4" /> Billing Baru</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Patient Code</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Dokter</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Finance</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.id}</TableCell>
                <TableCell className="font-mono text-xs">{b.invoice}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{b.patientCode}</TableCell>
                <TableCell><Badge variant="secondary">{b.payer}</Badge></TableCell>
                <TableCell className="text-sm">{b.doctor}</TableCell>
                <TableCell className="text-right font-mono">{formatIDR(sum(b))}</TableCell>
                <TableCell><StatusBadge s={b.status} /></TableCell>
                <TableCell>
                  {b.sentToFinance
                    ? <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Synced</Badge>
                    : <Badge variant="outline">Belum</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setDetail(b)} aria-label="Detail"><Eye className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setEdit(b)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => printBill(b)} aria-label="Cetak"><Printer className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => sendToFinance(b)}>
                      <Send className="h-3.5 w-3.5" /> Finance
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(b.id)} aria-label="Hapus"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DetailDialog b={detail} onClose={() => setDetail(null)} onStatus={updateStatus} onSend={sendToFinance} />
      <EditDialog b={edit} onClose={() => setEdit(null)} onSave={(nb) => {
        setList((arr) => arr.map((x) => x.id === nb.id ? nb : x));
        toast.success(`${nb.id} diperbarui`);
      }} />
      <NewDialog open={newOpen} onOpenChange={setNewOpen} onCreate={(b) => setList([b, ...list])} />
    </div>
  );
}

function StatusBadge({ s }: { s: BillStatus }) {
  const cls: Record<BillStatus, string> = {
    draft: "bg-muted text-muted-foreground",
    issued: "bg-blue-500/15 text-blue-600",
    sent_to_cashier: "bg-amber-500/15 text-amber-600",
    paid: "bg-emerald-500/15 text-emerald-600",
    cancelled: "bg-rose-500/15 text-rose-600",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs ${cls[s]}`}>{STATUS_LABEL[s]}</span>;
}

function DetailDialog({
  b, onClose, onStatus, onSend,
}: { b: Billing | null; onClose: () => void; onStatus: (id: string, s: BillStatus) => void; onSend: (b: Billing) => void }) {
  if (!b) return null;
  const subtotal = b.items.reduce((a, x) => a + x.qty * x.price, 0);
  return (
    <Dialog open={!!b} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{b.invoice}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">Billing ID:</span> <span className="font-mono">{b.id}</span></div>
            <div><span className="text-muted-foreground">Patient Code:</span> <span className="font-mono">{b.patientCode}</span></div>
            <div><span className="text-muted-foreground">Payer:</span> {b.payer}</div>
            <div><span className="text-muted-foreground">Dokter:</span> {b.doctor}</div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs">
                <tr><th className="px-3 py-2">Layanan</th><th className="px-3 py-2 text-right">Qty</th><th className="px-3 py-2 text-right">Harga</th><th className="px-3 py-2 text-right">Subtotal</th></tr>
              </thead>
              <tbody>
                {b.items.map((it, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2">{it.name}</td>
                    <td className="px-3 py-2 text-right">{it.qty}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatIDR(it.price)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatIDR(it.qty * it.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-1 text-right text-sm">
            <div>Subtotal: <span className="font-mono">{formatIDR(subtotal)}</span></div>
            <div>Diskon: <span className="font-mono">-{formatIDR(b.discount)}</span></div>
            <div className="text-base font-semibold">Total: <span className="font-mono">{formatIDR(subtotal - b.discount)}</span></div>
          </div>
        </div>
        <DialogFooter className="flex-wrap gap-2">
          <Button variant="outline" onClick={() => onStatus(b.id, "issued")}>Issue</Button>
          <Button variant="outline" onClick={() => onStatus(b.id, "sent_to_cashier")}>To Cashier</Button>
          <Button variant="outline" onClick={() => onStatus(b.id, "paid")}>Paid</Button>
          <Button onClick={() => onSend(b)} className="gap-1"><Send className="h-4 w-4" /> Send to Finance</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  b, onClose, onSave,
}: { b: Billing | null; onClose: () => void; onSave: (b: Billing) => void }) {
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState<BillStatus>("draft");

  useMemo(() => {
    if (b) { setDiscount(b.discount); setStatus(b.status); }
  }, [b]);

  if (!b) return null;
  return (
    <Dialog open={!!b} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {b.invoice}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Diskon (Rp)</Label>
            <Input type="number" value={discount} onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BillStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as BillStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => { onSave({ ...b, discount, status }); onClose(); }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewDialog({
  open, onOpenChange, onCreate,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (b: Billing) => void }) {
  const [visitId, setVisitId] = useState(visits[0].id);

  const create = () => {
    const v = visits.find((x) => x.id === visitId);
    if (!v) return;
    const b: Billing = {
      id: `BIL-${Date.now().toString().slice(-6)}`,
      invoice: `INV/2026/06/${Math.floor(Math.random() * 9000 + 1000)}`,
      visitId: v.id, patientCode: v.patientId,
      payer: v.payer, doctor: v.doctor,
      items: [{ name: "Konsultasi Dokter Sp.M", qty: 1, price: 175000 }],
      discount: 0, status: "draft",
      createdAt: new Date().toISOString(),
    };
    onCreate(b);
    onOpenChange(false);
    toast.success(`Billing ${b.id} dibuat`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Billing Baru</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">Generate dari Kunjungan</Label>
            <Select value={visitId} onValueChange={setVisitId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {visits.map((v) => <SelectItem key={v.id} value={v.id}>{v.id} — {v.patientName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Item layanan dasar akan ditambahkan otomatis. Tambah/edit item via dialog edit.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={create}>Buat</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
