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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Search, Download, Upload, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { invoices } from "@/data/financeData";
import { formatIDR } from "@/lib/finance";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { addAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";
import type { Payer } from "@/types/finance";

export const Route = createFileRoute("/_authenticated/finance/piutang")({
  component: PiutangPage,
});

type ClaimStatus =
  | "not_submitted" | "submitted" | "pending_doc" | "dispute"
  | "approved" | "partial_paid" | "paid" | "rejected" | "write_off";

const CLAIM_LABEL: Record<ClaimStatus, string> = {
  not_submitted: "Belum Submit", submitted: "Submitted", pending_doc: "Pending Doc",
  dispute: "Dispute", approved: "Approved", partial_paid: "Partial Paid",
  paid: "Paid", rejected: "Rejected", write_off: "Write-off",
};

const PICS = ["Sinta (AR)", "Dewi (Klaim)", "Rahmat (Finance)", "Yusi (BPJS)"];

interface Receivable {
  id: string;
  invoice: string;
  patientCode: string;
  payer: Payer;
  invoiceAmount: number;
  outstanding: number;
  dueDate: string;
  agingDays: number;
  bucket: "0-30" | "31-60" | "61-90" | ">90";
  claim: ClaimStatus;
  risk: number; // 0-100
  pic: string;
  lastFollowUp?: string;
  nextFollowUp?: string;
  note?: string;
  docs: string[];
}

function bucketOf(days: number): Receivable["bucket"] {
  return days <= 30 ? "0-30" : days <= 60 ? "31-60" : days <= 90 ? "61-90" : ">90";
}
function riskBadge(score: number) {
  if (score >= 75) return { cls: "bg-rose-500/15 text-rose-600", label: "High" };
  if (score >= 50) return { cls: "bg-orange-500/15 text-orange-600", label: "Med-High" };
  if (score >= 25) return { cls: "bg-amber-500/15 text-amber-600", label: "Medium" };
  return { cls: "bg-emerald-500/15 text-emerald-600", label: "Low" };
}

const CLAIM_OPTS: ClaimStatus[] = [
  "not_submitted","submitted","pending_doc","dispute",
  "approved","partial_paid","paid","rejected","write_off",
];

function seed(): Receivable[] {
  const now = Date.now();
  return invoices
    .filter((i) => i.total - i.paid > 0 && i.status !== "cancelled" && i.status !== "paid")
    .slice(0, 40)
    .map((i, idx) => {
      const days = Math.max(0, Math.floor((now - new Date(i.dueDate).getTime()) / 864e5));
      const risk = Math.min(100, Math.round(days * 0.8 + (i.payer === "BPJS" ? 10 : 0) + (idx % 5) * 3));
      return {
        id: i.id, invoice: i.invoice, patientCode: i.patientCode, payer: i.payer,
        invoiceAmount: i.total, outstanding: i.total - i.paid, dueDate: i.dueDate,
        agingDays: days, bucket: bucketOf(days),
        claim: ([CLAIM_OPTS[(idx) % 9]])[0],
        risk, pic: PICS[idx % PICS.length],
        lastFollowUp: idx % 3 === 0 ? new Date(now - (idx + 2) * 864e5).toISOString() : undefined,
        nextFollowUp: idx % 4 === 0 ? new Date(now + 3 * 864e5).toISOString() : undefined,
        note: idx % 5 === 0 ? "Menunggu kelengkapan dokumen rujukan." : "",
        docs: idx % 6 === 0 ? ["surat_rujukan.pdf"] : [],
      };
    });
}

const PAGE = 12;

function PiutangPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Receivable[]>(seed);
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState("all");
  const [payer, setPayer] = useState("all");
  const [claim, setClaim] = useState("all");
  const [page, setPage] = useState(1);
  const [editFU, setEditFU] = useState<Receivable | null>(null);

  const filtered = useMemo(() => rows.filter((r) => {
    if (bucket !== "all" && r.bucket !== bucket) return false;
    if (payer !== "all" && r.payer !== payer) return false;
    if (claim !== "all" && r.claim !== claim) return false;
    if (q && !`${r.invoice} ${r.patientCode} ${r.pic}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, q, bucket, payer, claim]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE, safePage * PAGE);

  // Per-payer summary
  const byPayer = useMemo(() => {
    const map: Record<string, { count: number; out: number }> = {};
    filtered.forEach((r) => {
      const k = r.payer;
      map[k] = map[k] ?? { count: 0, out: 0 };
      map[k].count += 1;
      map[k].out += r.outstanding;
    });
    return map;
  }, [filtered]);

  const setClaimStatus = (id: string, s: ClaimStatus) => {
    setRows((arr) => arr.map((r) => r.id === id ? { ...r, claim: s } : r));
    addAudit({ actor: user?.email ?? "system", action: "role_change", target: `finance/piutang/${id}`, meta: { claim: s } });
    toast.success(`Klaim ${id} → ${CLAIM_LABEL[s]}`);
  };

  const uploadDoc = (id: string) => {
    setRows((arr) => arr.map((r) => r.id === id ? { ...r, docs: [...r.docs, `klaim_${Date.now()}.pdf`] } : r));
    toast.success("Dokumen klaim diunggah (mock)");
  };

  const exportCSV = () => {
    const csv = toCSV(filtered, [
      { key: "invoice", label: "Invoice", get: (r) => r.invoice },
      { key: "patientCode", label: "Patient Code", get: (r) => r.patientCode },
      { key: "payer", label: "Payer", get: (r) => r.payer },
      { key: "invoiceAmount", label: "Invoice Amount", get: (r) => r.invoiceAmount },
      { key: "outstanding", label: "Outstanding", get: (r) => r.outstanding },
      { key: "dueDate", label: "Due Date", get: (r) => new Date(r.dueDate).toLocaleDateString("id-ID") },
      { key: "agingDays", label: "Aging (hari)", get: (r) => r.agingDays },
      { key: "bucket", label: "Bucket", get: (r) => r.bucket },
      { key: "claim", label: "Claim Status", get: (r) => CLAIM_LABEL[r.claim] },
      { key: "risk", label: "Risk Score", get: (r) => r.risk },
      { key: "pic", label: "PIC", get: (r) => r.pic },
      { key: "lastFollowUp", label: "Last Follow-up", get: (r) => r.lastFollowUp ? new Date(r.lastFollowUp).toLocaleDateString("id-ID") : "" },
      { key: "nextFollowUp", label: "Next Follow-up", get: (r) => r.nextFollowUp ? new Date(r.nextFollowUp).toLocaleDateString("id-ID") : "" },
      { key: "note", label: "Note", get: (r) => r.note ?? "" },
    ]);
    downloadCSV(exportFileName("piutang", "all"), csv);
    addAudit({ actor: user?.email ?? "system", action: "export", target: "finance/piutang", meta: { rows: filtered.length } });
    toast.success(`Export ${filtered.length} piutang (CSV)`);
  };

  return (
    <div>
      <PageHeader title="Piutang & Klaim" desc="Aging otomatis, follow-up, dan status klaim payer." />

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(byPayer).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{k}</span>
              <Badge variant="secondary">{v.count}</Badge>
            </div>
            <div className="mt-1 text-lg font-semibold">{formatIDR(v.out)}</div>
          </div>
        ))}
        {Object.keys(byPayer).length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">Tidak ada piutang dalam filter.</div>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari invoice / patient / PIC…" className="pl-9" />
        </div>
        <Select value={bucket} onValueChange={(v) => { setBucket(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Aging" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aging</SelectItem>
            <SelectItem value="0-30">0–30</SelectItem>
            <SelectItem value="31-60">31–60</SelectItem>
            <SelectItem value="61-90">61–90</SelectItem>
            <SelectItem value=">90">&gt;90</SelectItem>
          </SelectContent>
        </Select>
        <Select value={payer} onValueChange={(v) => { setPayer(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Payer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Payer</SelectItem>
            <SelectItem value="Umum">Umum</SelectItem>
            <SelectItem value="BPJS">BPJS</SelectItem>
            <SelectItem value="Asuransi">Asuransi</SelectItem>
            <SelectItem value="Perusahaan">Perusahaan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={claim} onValueChange={(v) => { setClaim(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Klaim" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Klaim</SelectItem>
            {CLAIM_OPTS.map((c) => <SelectItem key={c} value={c}>{CLAIM_LABEL[c]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={exportCSV} className="gap-1"><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead className="text-right">Invoice</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Aging</TableHead>
              <TableHead>Risk</TableHead>
              <TableHead>Claim</TableHead>
              <TableHead>PIC</TableHead>
              <TableHead>Next F/U</TableHead>
              <TableHead>Docs</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.length === 0 ? (
              <TableRow><TableCell colSpan={12} className="py-16 text-center text-sm text-muted-foreground">Tidak ada piutang sesuai filter.</TableCell></TableRow>
            ) : slice.map((r) => {
              const risk = riskBadge(r.risk);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.invoice}</TableCell>
                  <TableCell><Badge variant="secondary">{r.payer}</Badge></TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatIDR(r.invoiceAmount)}</TableCell>
                  <TableCell className="text-right font-mono text-xs text-amber-600">{formatIDR(r.outstanding)}</TableCell>
                  <TableCell className="text-xs">{new Date(r.dueDate).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell className="text-xs">{r.bucket} <span className="text-muted-foreground">({r.agingDays}h)</span></TableCell>
                  <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${risk.cls}`}>{risk.label} {r.risk}</span></TableCell>
                  <TableCell>
                    <Select value={r.claim} onValueChange={(v) => setClaimStatus(r.id, v as ClaimStatus)}>
                      <SelectTrigger className="h-8 w-[150px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CLAIM_OPTS.map((c) => <SelectItem key={c} value={c}>{CLAIM_LABEL[c]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs">{r.pic}</TableCell>
                  <TableCell className="text-xs">{r.nextFollowUp ? new Date(r.nextFollowUp).toLocaleDateString("id-ID") : "—"}</TableCell>
                  <TableCell><Badge variant="outline">{r.docs.length}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditFU(r)} aria-label="Follow-up"><MessageSquare className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => uploadDoc(r.id)} aria-label="Upload"><Upload className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Menampilkan {slice.length} dari {filtered.length} piutang</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span>Hal. {safePage} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <FollowUpDialog rec={editFU} onClose={() => setEditFU(null)} onSave={(nv) => {
        setRows((arr) => arr.map((r) => r.id === nv.id ? nv : r));
        addAudit({ actor: user?.email ?? "system", action: "role_change", target: `finance/piutang/${nv.id}`, meta: { action: "follow_up" } });
        toast.success("Follow-up tersimpan");
      }} />
    </div>
  );
}

function FollowUpDialog({
  rec, onClose, onSave,
}: { rec: Receivable | null; onClose: () => void; onSave: (r: Receivable) => void }) {
  const [pic, setPic] = useState("");
  const [next, setNext] = useState("");
  const [note, setNote] = useState("");

  useMemo(() => {
    if (rec) {
      setPic(rec.pic);
      setNext(rec.nextFollowUp ? rec.nextFollowUp.slice(0, 10) : "");
      setNote(rec.note ?? "");
    }
  }, [rec]);

  if (!rec) return null;
  return (
    <Dialog open={!!rec} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Follow-up {rec.invoice}</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label className="text-xs">PIC</Label>
            <Select value={pic} onValueChange={setPic}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PICS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Next Follow-up</Label>
            <Input type="date" value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Catatan</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => {
            onSave({
              ...rec, pic, note,
              lastFollowUp: new Date().toISOString(),
              nextFollowUp: next ? new Date(next).toISOString() : undefined,
            });
            onClose();
          }}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
