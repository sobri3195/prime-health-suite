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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Eye, Pencil, Archive } from "lucide-react";
import { toast } from "sonner";
import { patients } from "@/data/clinicData";
import { maskNIK, maskPhone, calcAge, formatDateID } from "@/lib/privacy";
import type { Patient } from "@/types/clinic";

export const Route = createFileRoute("/_authenticated/sim-klinik/pasien")({
  component: PasienPage,
});

const PAGE_SIZE = 8;

function PasienPage() {
  const [q, setQ] = useState("");
  const [payer, setPayer] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Patient | null>(null);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      if (payer !== "all" && p.payer !== payer) return false;
      if (status === "complete" && !p.complete) return false;
      if (status === "incomplete" && p.complete) return false;
      if (q && !`${p.name} ${p.id}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, payer, status]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div>
      <PageHeader title="Pasien" desc="Master pasien klinik mata. Data ditampilkan dengan masking privasi." />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Cari nama atau No RM…" className="pl-9" />
        </div>
        <Select value={payer} onValueChange={(v) => { setPayer(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Payer" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Payer</SelectItem>
            <SelectItem value="Umum">Umum</SelectItem>
            <SelectItem value="BPJS">BPJS</SelectItem>
            <SelectItem value="Asuransi">Asuransi</SelectItem>
            <SelectItem value="Perusahaan">Perusahaan</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status data" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="complete">Data lengkap</SelectItem>
            <SelectItem value="incomplete">Belum lengkap</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No RM</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>NIK</TableHead>
              <TableHead>Usia / JK</TableHead>
              <TableHead>HP</TableHead>
              <TableHead>Payer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">
                  Tidak ada pasien yang cocok dengan filter.
                </TableCell>
              </TableRow>
            ) : slice.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.id}</TableCell>
                <TableCell className="font-medium">{p.name}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{maskNIK(p.nik)}</TableCell>
                <TableCell>{calcAge(p.dob)} / {p.gender}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{maskPhone(p.phone)}</TableCell>
                <TableCell><Badge variant="secondary">{p.payer}</Badge></TableCell>
                <TableCell>
                  {p.complete
                    ? <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Lengkap</Badge>
                    : <Badge variant="destructive">Belum lengkap</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setOpen(p)} aria-label="Lihat">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => toast.success(`Edit ${p.id} (mock)`)} aria-label="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => toast.message(`Arsipkan ${p.id} (mock)`)} aria-label="Arsipkan">
                      <Archive className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Menampilkan {slice.length} dari {filtered.length} pasien</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span>Hal. {safePage} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Pasien</DialogTitle></DialogHeader>
          {open && (
            <div className="space-y-3 text-sm">
              <Row k="No RM" v={open.id} />
              <Row k="Nama" v={open.name} />
              <Row k="NIK (masked)" v={maskNIK(open.nik)} />
              <Row k="Tgl Lahir" v={`${formatDateID(open.dob)} (${calcAge(open.dob)} th)`} />
              <Row k="Jenis Kelamin" v={open.gender === "L" ? "Laki-laki" : "Perempuan"} />
              <Row k="Alamat" v={open.address} />
              <Row k="HP (masked)" v={maskPhone(open.phone)} />
              <Row k="Payer" v={open.payer} />
              <Row k="Alergi" v={open.allergies.length ? open.allergies.join(", ") : "Tidak ada"} />
              <Row k="Kontak Darurat" v={`${open.emergencyContact.name} (${open.emergencyContact.relation}) — ${maskPhone(open.emergencyContact.phone)}`} />
              <Row k="Kunjungan Terakhir" v={`${formatDateID(open.lastVisit)} • ${open.visitCount}x kunjungan`} />
              <Row k="Status Data" v={open.complete ? "Lengkap" : "Belum lengkap"} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-2 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className="col-span-2">{v}</span>
    </div>
  );
}

// Trigger dialog component for typing (unused in render path but keeps tree-shake happy)
void DialogTrigger;
