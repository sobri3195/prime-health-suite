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
import { toast } from "sonner";
import { visits } from "@/data/clinicData";

export const Route = createFileRoute("/_authenticated/sim-klinik/pemeriksaan")({
  component: PemeriksaanPage,
});

type ExamStatus = "draft" | "completed" | "revised";

const doctors = ["dr. Rini, Sp.M", "dr. Bagas, Sp.M", "dr. Anisa, Sp.M", "dr. Hadi, Sp.M(K)"];

function PemeriksaanPage() {
  const [visitId, setVisitId] = useState(visits[0].id);
  const [doctor, setDoctor] = useState(doctors[0]);
  const [chief, setChief] = useState("");
  const [rps, setRps] = useState("");
  const [rpd, setRpd] = useState("");
  const [allergy, setAllergy] = useState("");
  const [visusOD, setVisusOD] = useState("6/6");
  const [visusOS, setVisusOS] = useState("6/6");
  const [tioOD, setTioOD] = useState("14");
  const [tioOS, setTioOS] = useState("14");
  const [segAnt, setSegAnt] = useState("");
  const [segPost, setSegPost] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<ExamStatus>("draft");

  const visit = visits.find((v) => v.id === visitId);

  const save = (st: ExamStatus) => {
    setStatus(st);
    toast.success(`Pemeriksaan ${visitId} disimpan (${st})`);
  };

  return (
    <div>
      <PageHeader title="Pemeriksaan" desc="Form pemeriksaan mata untuk kunjungan terpilih." />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Pilih Kunjungan">
              <Select value={visitId} onValueChange={setVisitId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {visits.map((v) => (
                    <SelectItem key={v.id} value={v.id}>{v.id} — {v.patientName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Dokter Pemeriksa">
              <Select value={doctor} onValueChange={setDoctor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{doctors.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </Field>

            <Field label="Keluhan Utama" full><Textarea rows={2} value={chief} onChange={(e) => setChief(e.target.value)} /></Field>
            <Field label="Riwayat Penyakit Sekarang" full><Textarea rows={2} value={rps} onChange={(e) => setRps(e.target.value)} /></Field>
            <Field label="Riwayat Penyakit Dahulu"><Textarea rows={2} value={rpd} onChange={(e) => setRpd(e.target.value)} /></Field>
            <Field label="Riwayat Alergi"><Textarea rows={2} value={allergy} onChange={(e) => setAllergy(e.target.value)} /></Field>

            <Field label="Visus OD"><Input value={visusOD} onChange={(e) => setVisusOD(e.target.value)} /></Field>
            <Field label="Visus OS"><Input value={visusOS} onChange={(e) => setVisusOS(e.target.value)} /></Field>
            <Field label="TIO OD (mmHg)"><Input value={tioOD} onChange={(e) => setTioOD(e.target.value)} /></Field>
            <Field label="TIO OS (mmHg)"><Input value={tioOS} onChange={(e) => setTioOS(e.target.value)} /></Field>

            <Field label="Segmen Anterior" full><Textarea rows={2} value={segAnt} onChange={(e) => setSegAnt(e.target.value)} /></Field>
            <Field label="Segmen Posterior" full><Textarea rows={2} value={segPost} onChange={(e) => setSegPost(e.target.value)} /></Field>
            <Field label="Diagnosis" full><Textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} /></Field>
            <Field label="Rencana Terapi" full><Textarea rows={2} value={plan} onChange={(e) => setPlan(e.target.value)} /></Field>
            <Field label="Catatan Dokter" full><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
              <StatusBadge status={status} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => save("draft")}>Simpan Draft</Button>
              <Button variant="outline" onClick={() => save("revised")}>Tandai Revised</Button>
              <Button onClick={() => save("completed")}>Selesaikan</Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 font-medium">Konteks Kunjungan</h3>
          {visit ? (
            <dl className="space-y-2 text-sm">
              <Row k="Pasien" v={visit.patientName} />
              <Row k="ID Kunjungan" v={visit.id} />
              <Row k="Dokter" v={visit.doctor} />
              <Row k="Payer" v={visit.payer} />
              <Row k="Keluhan" v={visit.complaint} />
              <Row k="Antrean" v={String(visit.queueNo)} />
            </dl>
          ) : <p className="text-sm text-muted-foreground">Tidak ada kunjungan.</p>}
        </div>
      </div>
    </div>
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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-border/60 pb-2 last:border-0">
      <dt className="text-muted-foreground">{k}</dt><dd className="col-span-2">{v}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: ExamStatus }) {
  if (status === "completed") return <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/20">Completed</Badge>;
  if (status === "revised") return <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/20">Revised</Badge>;
  return <Badge variant="secondary">Draft</Badge>;
}
