import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/finance";
import { addAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/honor-input")({
  component: Page,
});

const DOCTORS = [
  { nama: "dr. Rini, Sp.M", pct: 40 },
  { nama: "dr. Bagas, Sp.M", pct: 45 },
  { nama: "dr. Anisa, Sp.M", pct: 45 },
  { nama: "dr. Hadi, Sp.M(K)", pct: 50 },
  { nama: "dr. Tania, Sp.M", pct: 40 },
  { nama: "dr. Yusuf, Sp.M", pct: 45 },
];

function Page() {
  const { user } = useAuth();
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [dokter, setDokter] = useState(DOCTORS[0].nama);
  const [patient, setPatient] = useState("");
  const [tindakan, setTindakan] = useState("Konsultasi Sp.M");
  const [tarif, setTarif] = useState(175000);
  const pct = DOCTORS.find((d) => d.nama === dokter)?.pct ?? 40;
  const jasa = Math.round((tarif * pct) / 100);

  const submit = () => {
    if (!patient) { toast.error("Patient code wajib diisi"); return; }
    addAudit({ actor: user?.email ?? "system", action: "role_change", target: "finance/honor/input", meta: { dokter, jasa } });
    toast.success(`Jasa medis ${formatIDR(jasa)} tercatat untuk ${dokter}`);
    setPatient("");
  };

  return (
    <div>
      <PageHeader title="Input Jasa Medis" desc="Input jasa medis per kunjungan/tindakan dokter." />
      <div className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label className="text-xs">Tanggal</Label><Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Dokter</Label>
            <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={dokter} onChange={(e) => setDokter(e.target.value)}>
              {DOCTORS.map((d) => <option key={d.nama}>{d.nama}</option>)}
            </select>
          </div>
          <div className="grid gap-1.5"><Label className="text-xs">Patient Code</Label><Input value={patient} onChange={(e) => setPatient(e.target.value.toUpperCase())} placeholder="PT-001" /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Tindakan</Label><Input value={tindakan} onChange={(e) => setTindakan(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Tarif (Rp)</Label><Input type="number" value={tarif} onChange={(e) => setTarif(Number(e.target.value) || 0)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">% Jasa Medis</Label><Input value={`${pct}%`} disabled /></div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <span className="text-sm text-muted-foreground">Jasa Medis Dokter</span>
          <span className="font-mono text-lg font-semibold">{formatIDR(jasa)}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => toast.message("Cetak slip (mock)")}>Cetak</Button>
          <Button onClick={submit}>Simpan</Button>
        </div>
      </div>
    </div>
  );
}
