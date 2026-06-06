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
import { Search } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/sync-log";
import { clinicAudit } from "@/lib/clinic-audit";

export const Route = createFileRoute("/_authenticated/sim-klinik/tindakan")({
  component: TindakanPage,
});

type TStatus = "planned" | "performed" | "cancelled";
type Payer = "Umum" | "BPJS" | "Asuransi" | "Perusahaan";

interface ActionRow {
  code: string;
  name: string;
  category: "Konsultasi" | "Diagnostik" | "Refraksi" | "Laser" | "Bedah" | "Retina" | "Okuloplasti";
  doctor: string;
  tariff: Record<Payer, number>;
  status: TStatus;
  note: string;
}

const doctors = ["dr. Rini, Sp.M", "dr. Bagas, Sp.M", "dr. Anisa, Sp.M", "dr. Hadi, Sp.M(K)"];

const SEED: ActionRow[] = [
  ["KMT-001","Konsultasi Mata","Konsultasi", 175000],
  ["KMT-002","Pemeriksaan Refraksi","Refraksi", 85000],
  ["KMT-003","Funduskopi","Diagnostik", 95000],
  ["KMT-004","Tonometri","Diagnostik", 75000],
  ["KMT-005","OCT","Diagnostik", 450000],
  ["KMT-006","Laser YAG","Laser", 1800000],
  ["KMT-007","Operasi Katarak (Phaco)","Bedah", 12500000],
  ["KMT-008","Injeksi Intravitreal","Retina", 5500000],
  ["KMT-009","Tindakan Retina","Retina", 3500000],
  ["KMT-010","Okuloplasti","Okuloplasti", 4200000],
].map(([code, name, category, base], i) => ({
  code: code as string,
  name: name as string,
  category: category as ActionRow["category"],
  doctor: doctors[i % doctors.length],
  tariff: {
    Umum: base as number,
    BPJS: Math.round((base as number) * 0.85),
    Asuransi: Math.round((base as number) * 1.1),
    Perusahaan: Math.round((base as number) * 1.05),
  },
  status: (["planned","performed","performed","planned","cancelled"] as TStatus[])[i % 5],
  note: "",
}));

function TindakanPage() {
  const [rows, setRows] = useState<ActionRow[]>(SEED);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [payer, setPayer] = useState<Payer>("Umum");

  const cats = Array.from(new Set(SEED.map((r) => r.category)));

  const filtered = useMemo(() => rows.filter((r) => {
    if (cat !== "all" && r.category !== cat) return false;
    if (q && !`${r.code} ${r.name}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [rows, q, cat]);

  const setStatus = (code: string, s: TStatus) => {
    setRows((rs) => rs.map((r) => r.code === code ? { ...r, status: s } : r));
    clinicAudit("Tindakan", "update", code, { status: s });
    toast.success(`Tindakan ${code} → ${s}`);
  };

  return (
    <div>
      <PageHeader title="Tindakan Klinik Mata" desc="Katalog tindakan dengan tarif berdasarkan payer." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode/nama tindakan…" className="pl-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Kategori" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            {cats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={payer} onValueChange={(v) => setPayer(v as Payer)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Umum">Tarif Umum</SelectItem>
            <SelectItem value="BPJS">Tarif BPJS</SelectItem>
            <SelectItem value="Asuransi">Tarif Asuransi</SelectItem>
            <SelectItem value="Perusahaan">Tarif Perusahaan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Tindakan</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Dokter</TableHead>
              <TableHead className="text-right">Tarif ({payer})</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Tidak ada tindakan.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.code}>
                <TableCell className="font-mono text-xs">{r.code}</TableCell>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell><Badge variant="secondary">{r.category}</Badge></TableCell>
                <TableCell className="text-sm">{r.doctor}</TableCell>
                <TableCell className="text-right font-mono text-sm">{formatIDR(r.tariff[payer])}</TableCell>
                <TableCell><StatusBadge s={r.status} /></TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.code, "planned")}>Plan</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.code, "performed")}>Done</Button>
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.code, "cancelled")}>Cancel</Button>
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

function StatusBadge({ s }: { s: TStatus }) {
  if (s === "performed") return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Performed</Badge>;
  if (s === "cancelled") return <Badge variant="destructive">Cancelled</Badge>;
  return <Badge variant="secondary">Planned</Badge>;
}
