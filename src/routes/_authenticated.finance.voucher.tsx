import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Printer, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { master } from "@/data/financeData";
import { formatIDR } from "@/lib/finance";

export const Route = createFileRoute("/_authenticated/finance/voucher")({ component: VoucherPage });

type VType = "BBK" | "BKM" | "BKK";
const TYPE_LABEL: Record<VType, string> = { BBK: "Bukti Bank Keluar", BKM: "Bukti Kas Masuk", BKK: "Bukti Kas Keluar" };
type VStatus = "draft" | "approved" | "printed";

interface Voucher {
  id: string;
  number: string;
  type: VType;
  date: string;
  payee: string;
  account: string;
  amount: number;
  description: string;
  status: VStatus;
}

const PAYEES = [...master.vendors.map((v) => v.name), "Kasir Klinik", "Petty Cash"];

function seed(): Voucher[] {
  const out: Voucher[] = [];
  const types: VType[] = ["BBK", "BKM", "BKK"];
  for (let i = 0; i < 18; i++) {
    const t = types[i % 3];
    out.push({
      id: `V-${i}`,
      number: `${t}/2026/${String((i % 6) + 1).padStart(2, "0")}/${String(100 + i).padStart(4, "0")}`,
      type: t, date: new Date(Date.now() - i * 86400000 * 2).toISOString(),
      payee: PAYEES[i % PAYEES.length],
      account: t === "BBK" ? "1102" : t === "BKM" ? "1101" : "1101",
      amount: (1 + (i % 8)) * 750_000,
      description: t === "BKM" ? "Setoran kasir harian" : "Pembayaran operasional",
      status: i % 5 === 0 ? "draft" : i % 3 === 0 ? "printed" : "approved",
    });
  }
  return out;
}

function VoucherPage() {
  const [rows, setRows] = useState<Voucher[]>(seed);
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [printV, setPrintV] = useState<Voucher | null>(null);

  const filtered = useMemo(() => rows.filter((r) =>
    (type === "all" || r.type === type) && (status === "all" || r.status === status)
  ), [rows, type, status]);

  const counts = (Object.keys(TYPE_LABEL) as VType[]).map((t) => ({
    t, c: rows.filter((r) => r.type === t).length,
    sum: rows.filter((r) => r.type === t).reduce((a, r) => a + r.amount, 0),
  }));

  const approve = (id: string) => {
    setRows((arr) => arr.map((r) => r.id === id ? { ...r, status: "approved" as VStatus } : r));
    toast.success("Voucher disetujui");
  };

  return (
    <div>
      <PageHeader title="Voucher" desc="BBK, BKM, dan BKK dengan penomoran otomatis, approval, dan cetak voucher." />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {counts.map((c) => (
          <div key={c.t} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{TYPE_LABEL[c.t]} ({c.t})</div>
            <div className="mt-1 text-xl font-semibold">{c.c} voucher</div>
            <div className="text-xs text-muted-foreground">{formatIDR(c.sum)}</div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Tipe</SelectItem>
            {(Object.keys(TYPE_LABEL) as VType[]).map((t) =>
              <SelectItem key={t} value={t}>{t} – {TYPE_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            {(["draft","approved","printed"] as VStatus[]).map((s) =>
              <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button className="gap-1" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Voucher Baru</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Voucher</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Penerima/Pembayar</TableHead>
              <TableHead>Akun</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">Tidak ada voucher.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.number}</TableCell>
                <TableCell><Badge variant="outline">{r.type}</Badge></TableCell>
                <TableCell className="text-xs">{new Date(r.date).toLocaleDateString("id-ID")}</TableCell>
                <TableCell>{r.payee}</TableCell>
                <TableCell className="font-mono text-xs">{r.account} – {master.coa.find((c) => c.code === r.account)?.name}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatIDR(r.amount)}</TableCell>
                <TableCell><Badge className={r.status === "approved" ? "bg-emerald-500/15 text-emerald-600" : r.status === "printed" ? "bg-blue-500/15 text-blue-600" : ""} variant={r.status === "draft" ? "outline" : "default"}>{r.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {r.status === "draft" && <Button size="sm" variant="outline" onClick={() => approve(r.id)}><Check className="h-3.5 w-3.5" /></Button>}
                    <Button size="sm" variant="outline" onClick={() => { setPrintV(r); setRows((arr) => arr.map((x) => x.id === r.id ? { ...x, status: "printed" as VStatus } : x)); }}><Printer className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <NewVoucher open={open} onClose={() => setOpen(false)} onCreate={(v) => { setRows([v, ...rows]); toast.success(`${v.number} dibuat`); }} />
      <PrintDialog v={printV} onClose={() => setPrintV(null)} />
    </div>
  );
}

function NewVoucher({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (v: Voucher) => void }) {
  const [type, setType] = useState<VType>("BBK");
  const [payee, setPayee] = useState(PAYEES[0]);
  const [amount, setAmount] = useState(0);
  const [account, setAccount] = useState(master.coa[0].code);
  const [desc, setDesc] = useState("");

  const create = () => {
    if (amount <= 0) return toast.error("Nominal harus > 0");
    const d = new Date();
    onCreate({
      id: `V-${Date.now()}`,
      number: `${type}/${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(Math.floor(Math.random()*9000+1000))}`,
      type, date: d.toISOString(), payee, account, amount, description: desc, status: "draft",
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Voucher Baru</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2 text-sm">
          <Select value={type} onValueChange={(v) => setType(v as VType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(TYPE_LABEL) as VType[]).map((t) =>
              <SelectItem key={t} value={t}>{t} – {TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={payee} onValueChange={setPayee}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PAYEES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={account} onValueChange={setAccount}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{master.coa.map((c) => <SelectItem key={c.code} value={c.code}>{c.code} – {c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" placeholder="Nominal" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value) || 0)} />
          <Input placeholder="Deskripsi" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={create}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PrintDialog({ v, onClose }: { v: Voucher | null; onClose: () => void }) {
  if (!v) return null;
  return (
    <Dialog open={!!v} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cetak Voucher (Mock)</DialogTitle></DialogHeader>
        <div className="rounded-lg border border-dashed border-border p-6 text-sm">
          <div className="text-center font-semibold">{TYPE_LABEL[v.type]} ({v.type})</div>
          <div className="mt-4 grid gap-1">
            <div className="flex justify-between"><span className="text-muted-foreground">No.</span><span className="font-mono">{v.number}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tanggal</span><span>{new Date(v.date).toLocaleDateString("id-ID")}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Penerima</span><span>{v.payee}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Akun</span><span className="font-mono">{v.account}</span></div>
            <div className="flex justify-between border-t pt-2"><span className="font-semibold">Nominal</span><span className="font-mono font-semibold">{formatIDR(v.amount)}</span></div>
            {v.description && <div className="mt-2 text-xs text-muted-foreground">{v.description}</div>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
