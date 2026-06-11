import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listVisits, getVisitDetail, upsertMedicalRecord, listObat, createPrescription } from "@/lib/klinik.functions";

export const Route = createFileRoute("/_authenticated/sim-klinik/pemeriksaan")({ component: PemeriksaanPage });

const TEMPLATES: Record<string, { diagnosis: string; icd: string; treatment: string }> = {
  katarak: { diagnosis: "Katarak Senilis", icd: "H25.9", treatment: "Edukasi pasien, rencanakan operasi katarak phacoemulsifikasi" },
  konjungtivitis: { diagnosis: "Konjungtivitis", icd: "H10.9", treatment: "Antibiotik tetes mata 4x sehari, kompres, kontrol 5 hari" },
  glaukoma: { diagnosis: "Glaukoma", icd: "H40.9", treatment: "Timolol 0.5% 2x sehari, kontrol TIO 2 minggu" },
  refraksi: { diagnosis: "Refraksi Anomali", icd: "H52.7", treatment: "Resep kacamata sesuai pemeriksaan" },
  retinopati: { diagnosis: "Retinopati Diabetik", icd: "H36.0", treatment: "Kontrol gula darah, rujuk retina, OCT" },
  kering: { diagnosis: "Sindrom Mata Kering", icd: "H04.123", treatment: "Air mata buatan 4-6x/hari, kompres hangat" },
  kontrol: { diagnosis: "Kontrol pasca operasi", icd: "Z48.8", treatment: "Lanjutkan obat tetes, jaga kebersihan, kontrol 1 minggu" },
};

function PemeriksaanPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0,10);
  const callVisits = useServerFn(listVisits);
  const callDetail = useServerFn(getVisitDetail);
  const callSave = useServerFn(upsertMedicalRecord);

  const [selVisit, setSelVisit] = useState<string | null>(null);

  const visitsQ = useQuery({ queryKey: ["klinik","visits",today], queryFn: () => callVisits({ data: { date: today } }) });
  const detailQ = useQuery({ queryKey: ["klinik","visit-detail",selVisit], queryFn: () => callDetail({ data: { id: selVisit! } }), enabled: !!selVisit });

  type FormType = {
    visit_id: string; pasien_id: string; dokter_id: string | null;
    anamnesis: string; visus_od: string; visus_os: string; tio_od: string; tio_os: string;
    slit_lamp: string; fundus: string; diagnosis: string; icd10_code: string; treatment_plan: string;
    tindakan: string; notes: string; is_final: boolean;
  };
  const [form, setForm] = useState<FormType | null>(null);

  useEffect(() => {
    const v = detailQ.data?.visit;
    const mr = detailQ.data?.medrec;
    if (v) {
      setForm({
        visit_id: v.id, pasien_id: v.pasien_id, dokter_id: v.dokter_id,
        anamnesis: mr?.anamnesis ?? "", visus_od: mr?.visus_od ?? "", visus_os: mr?.visus_os ?? "",
        tio_od: mr?.tio_od ?? "", tio_os: mr?.tio_os ?? "", slit_lamp: mr?.slit_lamp ?? "",
        fundus: mr?.fundus ?? "", diagnosis: mr?.diagnosis ?? "", icd10_code: mr?.icd10_code ?? "",
        treatment_plan: mr?.treatment_plan ?? "", tindakan: mr?.tindakan ?? "", notes: mr?.notes ?? "",
        is_final: mr?.is_final ?? false,
      });
    }
  }, [detailQ.data]);

  const saveM = useMutation({
    mutationFn: (final: boolean) => callSave({ data: { ...form!, is_final: final } as never }),
    onSuccess: () => { toast.success("Rekam medis tersimpan"); qc.invalidateQueries({ queryKey: ["klinik"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyTpl = (k: string) => {
    const t = TEMPLATES[k]; if (!t || !form) return;
    setForm({ ...form, diagnosis: t.diagnosis, icd10_code: t.icd, treatment_plan: t.treatment });
  };

  const [showResep, setShowResep] = useState(false);

  type Visit = { id: string; visit_date: string; status: string; chief_complaint: string | null; apps_pasien?: { no_rm: string; nama: string; patient_type: string }; fin_dokter?: { name: string } };
  const visits = (visitsQ.data ?? []) as Visit[];

  return (
    <div>
      <PageHeader title="Pemeriksaan & Rekam Medis Mata" desc="Pasien hari ini → input pemeriksaan mata lengkap." />
      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className="p-3">
          <h3 className="mb-2 text-sm font-semibold">Pasien Hari Ini ({visits.length})</h3>
          <div className="space-y-1">
            {visits.length === 0 ? <p className="text-xs text-muted-foreground">Belum ada kunjungan hari ini.</p>
              : visits.map((v) => (
                <button key={v.id} onClick={() => setSelVisit(v.id)}
                  className={`block w-full rounded-md border p-2 text-left text-sm hover:bg-muted/40 ${selVisit === v.id ? "border-primary bg-primary/5" : ""}`}>
                  <div className="font-medium">{v.apps_pasien?.nama}</div>
                  <div className="text-xs text-muted-foreground">{v.apps_pasien?.no_rm} • {v.fin_dokter?.name}</div>
                  <div className="mt-1 flex gap-1">
                    <Badge variant="outline" className="text-[10px]">{v.status}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{v.apps_pasien?.patient_type}</Badge>
                  </div>
                </button>
              ))}
          </div>
        </Card>

        <Card className="p-4">
          {!form ? <p className="text-sm text-muted-foreground">Pilih pasien di samping untuk mulai pemeriksaan.</p>
            : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-semibold">Template Cepat:</span>
                  {Object.keys(TEMPLATES).map((k) => <Button key={k} size="sm" variant="outline" onClick={() => applyTpl(k)}>{k}</Button>)}
                </div>
                <div><Label>Anamnesis / Keluhan</Label><Input value={form.anamnesis} onChange={(e) => setForm({ ...form, anamnesis: e.target.value })} /></div>
                <div className="grid grid-cols-4 gap-2">
                  <div><Label>Visus OD</Label><Input value={form.visus_od} onChange={(e) => setForm({ ...form, visus_od: e.target.value })} placeholder="6/6" /></div>
                  <div><Label>Visus OS</Label><Input value={form.visus_os} onChange={(e) => setForm({ ...form, visus_os: e.target.value })} placeholder="6/6" /></div>
                  <div><Label>TIO OD</Label><Input value={form.tio_od} onChange={(e) => setForm({ ...form, tio_od: e.target.value })} placeholder="14 mmHg" /></div>
                  <div><Label>TIO OS</Label><Input value={form.tio_os} onChange={(e) => setForm({ ...form, tio_os: e.target.value })} placeholder="14 mmHg" /></div>
                </div>
                <div><Label>Slit Lamp</Label><Input value={form.slit_lamp} onChange={(e) => setForm({ ...form, slit_lamp: e.target.value })} /></div>
                <div><Label>Fundus</Label><Input value={form.fundus} onChange={(e) => setForm({ ...form, fundus: e.target.value })} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2"><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} /></div>
                  <div><Label>ICD-10</Label><Input value={form.icd10_code} onChange={(e) => setForm({ ...form, icd10_code: e.target.value })} /></div>
                </div>
                <div><Label>Rencana Terapi</Label><Input value={form.treatment_plan} onChange={(e) => setForm({ ...form, treatment_plan: e.target.value })} /></div>
                <div><Label>Tindakan</Label><Input value={form.tindakan} onChange={(e) => setForm({ ...form, tindakan: e.target.value })} /></div>
                <div><Label>Catatan</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => saveM.mutate(false)} variant="outline" disabled={saveM.isPending}><Save className="mr-1 h-4 w-4" />Simpan Draft</Button>
                  <Button onClick={() => saveM.mutate(true)} disabled={saveM.isPending || !form.diagnosis}><Save className="mr-1 h-4 w-4" />Finalisasi & Kirim ke Kasir</Button>
                  <Button variant="secondary" onClick={() => setShowResep(true)}><Plus className="mr-1 h-4 w-4" />Buat Resep</Button>
                </div>
                {detailQ.data?.prescriptions && detailQ.data.prescriptions.length > 0 && (
                  <div className="rounded-md border p-2">
                    <div className="text-xs font-semibold">Resep aktif:</div>
                    {(detailQ.data.prescriptions as Array<{ id: string; status: string; klinik_prescription_item?: unknown[] }>).map((p) => (<div key={p.id} className="text-xs">• {p.klinik_prescription_item?.length ?? 0} item · {p.status}</div>))}
                  </div>
                )}
              </div>
            )}
        </Card>
      </div>

      {form && <ResepDialog open={showResep} onClose={() => setShowResep(false)} visit_id={form.visit_id} pasien_id={form.pasien_id} dokter_id={form.dokter_id} onCreated={() => qc.invalidateQueries({ queryKey: ["klinik"] })} />}
    </div>
  );
}

function ResepDialog({ open, onClose, visit_id, pasien_id, dokter_id, onCreated }: { open: boolean; onClose: () => void; visit_id: string; pasien_id: string; dokter_id: string | null; onCreated: () => void }) {
  const callObat = useServerFn(listObat);
  const callCreate = useServerFn(createPrescription);
  const obatQ = useQuery({ queryKey: ["klinik","obat-all"], queryFn: () => callObat({ data: {} }), enabled: open });
  type Item = { obat_id: string; obat_name: string; dosage: string; frequency: string; duration: string; quantity: number; unit_price: number };
  const [items, setItems] = useState<Item[]>([]);
  const [notes, setNotes] = useState("");

  const addItem = (o: { id: string; name: string; price: number }) => setItems([...items, { obat_id: o.id, obat_name: o.name, dosage: "", frequency: "3x sehari", duration: "5 hari", quantity: 1, unit_price: Number(o.price) }]);
  const createM = useMutation({
    mutationFn: () => callCreate({ data: { visit_id, pasien_id, dokter_id, notes, items } as never }),
    onSuccess: () => { toast.success("Resep dikirim ke farmasi"); onCreated(); onClose(); setItems([]); setNotes(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  type Obat = { id: string; name: string; code: string; price: number; stock: number; unit: string };
  const obat = (obatQ.data ?? []) as Obat[];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Buat Resep</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Daftar Obat</Label>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              {obat.map((o) => (
                <button key={o.id} onClick={() => addItem(o)} className="block w-full border-b p-2 text-left text-sm hover:bg-muted/40">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{o.name}</span>
                    <span className="text-xs text-muted-foreground">Rp {Number(o.price).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Stok: {o.stock} {o.unit}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Resep ({items.length} item)</Label>
            <div className="max-h-72 overflow-y-auto rounded-md border p-2 space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="rounded border p-2 text-xs">
                  <div className="flex items-center justify-between"><span className="font-medium">{it.obat_name}</span>
                    <Button size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button></div>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <Input placeholder="Dosis" value={it.dosage} onChange={(e) => { const c = [...items]; c[idx].dosage = e.target.value; setItems(c); }} />
                    <Input placeholder="Frek." value={it.frequency} onChange={(e) => { const c = [...items]; c[idx].frequency = e.target.value; setItems(c); }} />
                    <Input placeholder="Durasi" value={it.duration} onChange={(e) => { const c = [...items]; c[idx].duration = e.target.value; setItems(c); }} />
                    <Input type="number" placeholder="Qty" value={it.quantity} onChange={(e) => { const c = [...items]; c[idx].quantity = Number(e.target.value); setItems(c); }} />
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-muted-foreground">Klik obat di kiri untuk menambah.</p>}
            </div>
            <div className="mt-2"><Label>Catatan</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Batal</Button><Button disabled={items.length === 0 || createM.isPending} onClick={() => createM.mutate()}>Kirim ke Farmasi</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

void Table; void TableBody; void TableCell; void TableHead; void TableHeader; void TableRow;
