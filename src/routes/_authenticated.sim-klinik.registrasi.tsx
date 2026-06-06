import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";
import { visits as seedVisits, patients } from "@/data/clinicData";
import { formatTimeID, formatDateID } from "@/lib/privacy";
import type { Visit, VisitStatus } from "@/types/clinic";

export const Route = createFileRoute("/_authenticated/sim-klinik/registrasi")({
  component: RegistrasiPage,
});

const STATUS_LABEL: Record<VisitStatus, string> = {
  waiting: "Menunggu", in_progress: "Diperiksa", completed: "Selesai", cancelled: "Batal",
};

function statusColor(s: VisitStatus) {
  return s === "completed" ? "bg-emerald-500/15 text-emerald-600"
    : s === "in_progress" ? "bg-blue-500/15 text-blue-600"
    : s === "waiting" ? "bg-amber-500/15 text-amber-600"
    : "bg-rose-500/15 text-rose-600";
}

const doctors = ["dr. Rini, Sp.M", "dr. Bagas, Sp.M", "dr. Anisa, Sp.M", "dr. Hadi, Sp.M(K)"];

function RegistrasiPage() {
  const [list, setList] = useState<Visit[]>(seedVisits);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [doc, setDoc] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => list.filter((v) => {
    if (status !== "all" && v.status !== status) return false;
    if (doc !== "all" && v.doctor !== doc) return false;
    if (q && !`${v.patientName} ${v.id} ${v.complaint}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [list, q, status, doc]);

  return (
    <div>
      <PageHeader title="Registrasi & Kunjungan" desc="Daftar antrian dan kunjungan klinik hari ini." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari pasien / keluhan…" className="pl-9" />
        </div>
        <Select value={doc} onValueChange={setDoc}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Dokter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Dokter</SelectItem>
            {doctors.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="waiting">Menunggu</SelectItem>
            <SelectItem value="in_progress">Diperiksa</SelectItem>
            <SelectItem value="completed">Selesai</SelectItem>
            <SelectItem value="cancelled">Batal</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setOpen(true)} className="gap-1"><Plus className="h-4 w-4" /> Kunjungan Baru</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Antrean</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>Pasien</TableHead>
              <TableHead>Dokter</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Keluhan</TableHead>
              <TableHead>Registrasi</TableHead>
              <TableHead>Mulai</TableHead>
              <TableHead>Selesai</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="py-16 text-center text-sm text-muted-foreground">Tidak ada kunjungan yang cocok.</TableCell></TableRow>
            ) : filtered.map((v) => (
              <TableRow key={v.id}>
                <TableCell className="font-mono">{String(v.queueNo).padStart(3, "0")}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{v.id}</TableCell>
                <TableCell className="font-medium">{v.patientName}</TableCell>
                <TableCell>{v.doctor}</TableCell>
                <TableCell><Badge variant="secondary">{v.payer}</Badge></TableCell>
                <TableCell className="max-w-[200px] truncate">{v.complaint}</TableCell>
                <TableCell className="text-xs">{formatTimeID(v.registeredAt)}</TableCell>
                <TableCell className="text-xs">{formatTimeID(v.examStartAt)}</TableCell>
                <TableCell className="text-xs">{formatTimeID(v.finishedAt)}</TableCell>
                <TableCell><span className={`rounded-full px-2 py-0.5 text-xs ${statusColor(v.status)}`}>{STATUS_LABEL[v.status]}</span></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">Tanggal: {formatDateID(new Date().toISOString())} • {filtered.length} kunjungan</div>

      <NewVisitDialog open={open} onOpenChange={setOpen} onCreate={(v) => setList([v, ...list])} />
    </div>
  );
}

function NewVisitDialog({
  open, onOpenChange, onCreate,
}: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (v: Visit) => void }) {
  const [patientId, setPatientId] = useState(patients[0].id);
  const [doctor, setDoctor] = useState(doctors[0]);
  const [payer, setPayer] = useState<Visit["payer"]>("Umum");
  const [complaint, setComplaint] = useState("");

  const submit = () => {
    const p = patients.find((x) => x.id === patientId);
    if (!p) return;
    const now = new Date().toISOString();
    const v: Visit = {
      id: `V-${Date.now()}`,
      patientId: p.id, patientName: p.name,
      doctor, payer, complaint: complaint || "Konsultasi",
      queueNo: Math.floor(Math.random() * 90) + 10,
      status: "waiting", registeredAt: now,
    };
    onCreate(v);
    onOpenChange(false);
    setComplaint("");
    toast.success(`Kunjungan ${v.id} terdaftar untuk ${p.name}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Kunjungan Baru</DialogTitle></DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>Pasien</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {patients.slice(0, 12).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.id} — {p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Dokter</Label>
              <Select value={doctor} onValueChange={setDoctor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{doctors.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Payer</Label>
              <Select value={payer} onValueChange={(v) => setPayer(v as Visit["payer"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Umum">Umum</SelectItem>
                  <SelectItem value="BPJS">BPJS</SelectItem>
                  <SelectItem value="Asuransi">Asuransi</SelectItem>
                  <SelectItem value="Perusahaan">Perusahaan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Keluhan Utama</Label>
            <Textarea rows={3} value={complaint} onChange={(e) => setComplaint(e.target.value)} placeholder="Contoh: penglihatan kabur sejak 2 minggu" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
