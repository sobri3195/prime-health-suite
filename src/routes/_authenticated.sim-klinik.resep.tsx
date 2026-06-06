import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { visits } from "@/data/clinicData";

export const Route = createFileRoute("/_authenticated/sim-klinik/resep")({
  component: ResepPage,
});

type RxStatus = "draft" | "issued" | "dispensed" | "cancelled";

interface RxItem {
  id: string;
  visitId: string;
  patient: string;
  drug: string;
  dose: string;
  freq: string;
  duration: string;
  instruction: string;
  status: RxStatus;
}

const DRUGS = [
  "Timolol 0.5% ED", "Latanoprost 0.005% ED", "Tobramycin ED",
  "Ofloxacin ED", "Artificial Tears", "Brinzolamide 1% ED",
  "Prednisolone Acetate 1% ED", "Cyclopentolate 1% ED",
];

function ResepPage() {
  const [items, setItems] = useState<RxItem[]>([
    {
      id: "RX-0001", visitId: visits[0].id, patient: visits[0].patientName,
      drug: "Timolol 0.5% ED", dose: "1 tetes", freq: "2x/hari",
      duration: "30 hari", instruction: "OD pagi & malam", status: "issued",
    },
  ]);

  const [visitId, setVisitId] = useState(visits[0].id);
  const [drug, setDrug] = useState(DRUGS[0]);
  const [dose, setDose] = useState("1 tetes");
  const [freq, setFreq] = useState("2x/hari");
  const [duration, setDuration] = useState("14 hari");
  const [instruction, setInstruction] = useState("");

  const add = () => {
    const v = visits.find((x) => x.id === visitId);
    if (!v) return;
    const it: RxItem = {
      id: `RX-${String(items.length + 1).padStart(4, "0")}`,
      visitId, patient: v.patientName,
      drug, dose, freq, duration, instruction, status: "draft",
    };
    setItems([it, ...items]);
    setInstruction("");
    toast.success(`Resep ${it.id} dibuat untuk ${v.patientName}`);
  };

  const setStatus = (id: string, s: RxStatus) => {
    setItems((arr) => arr.map((x) => x.id === id ? { ...x, status: s } : x));
    toast.success(`Resep ${id} → ${s}`);
  };

  const remove = (id: string) => {
    setItems((arr) => arr.filter((x) => x.id !== id));
    toast.message(`Resep ${id} dihapus`);
  };

  return (
    <div>
      <PageHeader title="Resep & Obat" desc="Pembuatan dan pengelolaan resep pasien." />

      <div className="mb-6 rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-medium">Buat Resep Baru</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Pasien / Kunjungan">
            <Select value={visitId} onValueChange={setVisitId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {visits.map((v) => <SelectItem key={v.id} value={v.id}>{v.id} — {v.patientName}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nama Obat">
            <Select value={drug} onValueChange={setDrug}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DRUGS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Dosis"><Input value={dose} onChange={(e) => setDose(e.target.value)} /></Field>
          <Field label="Frekuensi"><Input value={freq} onChange={(e) => setFreq(e.target.value)} /></Field>
          <Field label="Durasi"><Input value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
          <Field label="Instruksi"><Textarea rows={1} value={instruction} onChange={(e) => setInstruction(e.target.value)} /></Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={add} className="gap-1"><Plus className="h-4 w-4" /> Tambah Resep</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Pasien</TableHead>
              <TableHead>Obat</TableHead>
              <TableHead>Dosis / Freq</TableHead>
              <TableHead>Durasi</TableHead>
              <TableHead>Instruksi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Belum ada resep.</TableCell></TableRow>
            ) : items.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.id}</TableCell>
                <TableCell className="font-medium">{r.patient}</TableCell>
                <TableCell>{r.drug}</TableCell>
                <TableCell className="text-sm">{r.dose} • {r.freq}</TableCell>
                <TableCell>{r.duration}</TableCell>
                <TableCell className="max-w-[180px] truncate text-sm text-muted-foreground">{r.instruction || "-"}</TableCell>
                <TableCell><StatusBadge s={r.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "issued")}>Issue</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "dispensed")}>Dispense</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "cancelled")}>Cancel</Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function StatusBadge({ s }: { s: RxStatus }) {
  if (s === "dispensed") return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Dispensed</Badge>;
  if (s === "issued") return <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/20">Issued</Badge>;
  if (s === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="secondary">Draft</Badge>;
}
