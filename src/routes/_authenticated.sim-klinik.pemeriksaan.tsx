import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function AutoTextarea({ value, onChange, className, ...rest }: React.ComponentProps<"textarea">) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const measure = () => {
    const el = ref.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 400) + "px";
  };
  useLayoutEffect(measure, [value]);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    // Re-measure saat container/sidebar toggle atau window resize
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.removeEventListener("resize", measure); };
  }, []);
  return <Textarea ref={ref} value={value} onChange={onChange} rows={2} className={cn("resize-none overflow-hidden min-h-[38px]", className)} {...rest} />;
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listVisits, getVisitDetail, upsertMedicalRecord, listObat, createPrescription, listMedicalRecordHistory, previewInteractions, listPemeriksaanTemplate } from "@/lib/klinik.functions";
import { useRealtimeSubscription } from "@/hooks/use-realtime-subscription";

export const Route = createFileRoute("/_authenticated/sim-klinik/pemeriksaan")({
  head: () => pageHead({ title: 'Pemeriksaan & Rekam Medis — SIM Klinik', description: 'Input pemeriksaan pasien, diagnosa, dan rencana terapi.', path: '/sim-klinik/pemeriksaan' }),
  component: PemeriksaanPage,
});

type PemTemplate = { id: string; code: string; label: string; diagnosis: string; icd10_code: string | null; treatment: string | null };

function PemeriksaanPage() {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0,10);
  const callVisits = useServerFn(listVisits);
  const callDetail = useServerFn(getVisitDetail);
  const callSave = useServerFn(upsertMedicalRecord);
  const callTpl = useServerFn(listPemeriksaanTemplate);
  const tplQ = useQuery({ queryKey: ["klinik","pemeriksaan-tpl"], queryFn: () => callTpl({ data: {} }) });
  const templates = (tplQ.data ?? []) as PemTemplate[];


  const [selVisit, setSelVisit] = useState<string | null>(null);

  const visitsQ = useQuery({ queryKey: ["klinik","visits",today], queryFn: () => callVisits({ data: { date: today } }) });
  const detailQ = useQuery({ queryKey: ["klinik","visit-detail",selVisit], queryFn: () => callDetail({ data: { id: selVisit! } }), enabled: !!selVisit });
  useRealtimeSubscription(
    ["klinik_visit", "klinik_medical_record", "klinik_prescription"],
    selVisit
      ? [["klinik", "visits", today], ["klinik", "visit-detail", selVisit]]
      : [["klinik", "visits", today]],
  );

  type FormType = {
    visit_id: string; pasien_id: string; dokter_id: string | null;
    anamnesis: string; visus_od: string; visus_os: string; tio_od: string; tio_os: string;
    slit_lamp: string; fundus: string; diagnosis: string; icd10_code: string; treatment_plan: string;
    tindakan: string; notes: string; is_final: boolean;
  };
  const [form, setForm] = useState<FormType | null>(null);

  // Reset form immediately when switching patient to avoid showing stale data
  useEffect(() => {
    setForm(null);
  }, [selVisit]);

  useEffect(() => {
    const v = detailQ.data?.visit;
    const mr = detailQ.data?.medrec;
    if (v && v.id === selVisit) {
      setForm({
        visit_id: v.id, pasien_id: v.pasien_id, dokter_id: v.dokter_id,
        anamnesis: mr?.anamnesis ?? "", visus_od: mr?.visus_od ?? "", visus_os: mr?.visus_os ?? "",
        tio_od: mr?.tio_od ?? "", tio_os: mr?.tio_os ?? "", slit_lamp: mr?.slit_lamp ?? "",
        fundus: mr?.fundus ?? "", diagnosis: mr?.diagnosis ?? "", icd10_code: mr?.icd10_code ?? "",
        treatment_plan: mr?.treatment_plan ?? "", tindakan: mr?.tindakan ?? "", notes: mr?.notes ?? "",
        is_final: mr?.is_final ?? false,
      });
    }
  }, [detailQ.data, selVisit]);

  const saveM = useMutation({
    mutationFn: (final: boolean) => callSave({ data: { ...form!, is_final: final } as never }),
    onSuccess: () => { toast.success("Rekam medis tersimpan"); qc.invalidateQueries({ queryKey: ["klinik"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyTpl = (id: string) => {
    const t = templates.find((x) => x.id === id); if (!t || !form) return;
    setForm({ ...form, diagnosis: t.diagnosis, icd10_code: t.icd10_code ?? "", treatment_plan: t.treatment ?? "" });
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
          {selVisit && (detailQ.isLoading || detailQ.isFetching) && !form ? (
            <div className="space-y-3" aria-busy="true" aria-live="polite">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-9 w-full" />
              <div className="grid grid-cols-4 gap-2">
                <Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" /><Skeleton className="h-9" />
              </div>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-2/3" />
            </div>
          ) : !form ? <p className="text-sm text-muted-foreground">Pilih pasien di samping untuk mulai pemeriksaan.</p>
            : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="text-sm font-semibold">Template Cepat:</span>
                  {Object.keys(TEMPLATES).map((k) => <Button key={k} size="sm" variant="outline" onClick={() => applyTpl(k)}>{k}</Button>)}
                </div>
                <div><Label>Anamnesis / Keluhan</Label><AutoTextarea value={form.anamnesis} onChange={(e) => setForm({ ...form, anamnesis: e.target.value })} /></div>
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
                <div><Label>Rencana Terapi</Label><AutoTextarea value={form.treatment_plan} onChange={(e) => setForm({ ...form, treatment_plan: e.target.value })} /></div>
                <div><Label>Tindakan</Label><AutoTextarea value={form.tindakan} onChange={(e) => setForm({ ...form, tindakan: e.target.value })} /></div>
                <div><Label>Catatan</Label><AutoTextarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
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
                <RmHistoryPanel visitId={selVisit!} />
              </div>
            )}
        </Card>
      </div>

      {form && <ResepDialog open={showResep} onClose={() => setShowResep(false)} visit_id={form.visit_id} pasien_id={form.pasien_id} dokter_id={form.dokter_id} onCreated={() => qc.invalidateQueries({ queryKey: ["klinik"] })} />}
    </div>
  );
}

/* -------- RM History (versioning) with diff viewer -------- */
const DIFF_FIELDS: Array<{ k: string; label: string }> = [
  { k: "anamnesis", label: "Anamnesis" },
  { k: "visus_od", label: "Visus OD" }, { k: "visus_os", label: "Visus OS" },
  { k: "tio_od", label: "TIO OD" }, { k: "tio_os", label: "TIO OS" },
  { k: "slit_lamp", label: "Slit Lamp" }, { k: "fundus", label: "Fundus" },
  { k: "diagnosis", label: "Diagnosis" }, { k: "icd10_code", label: "ICD-10" },
  { k: "treatment_plan", label: "Rencana Terapi" }, { k: "tindakan", label: "Tindakan" }, { k: "notes", label: "Catatan" },
];

function RmHistoryPanel({ visitId }: { visitId: string }) {
  const call = useServerFn(listMedicalRecordHistory);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const q = useQuery({
    queryKey: ["klinik", "rm-history", visitId],
    queryFn: () => call({ data: { visit_id: visitId } }),
    enabled: !!visitId,
  });
  const rows = (q.data ?? []) as Array<{ id: string; changed_at: string; changed_by: string | null; action: string; snapshot: Record<string, unknown> }>;
  if (q.isLoading) return <div className="text-xs text-muted-foreground">Memuat riwayat RM…</div>;
  if (!rows.length) return <div className="text-xs text-muted-foreground">Belum ada riwayat versi RM.</div>;

  return (
    <div className="rounded-md border">
      <div className="border-b bg-muted/30 px-3 py-2 text-xs font-semibold">Riwayat Versi Rekam Medis ({rows.length})</div>
      <ul className="divide-y">
        {rows.map((h, idx) => {
          // Bandingkan snapshot tersimpan dgn snapshot tersimpan sebelumnya (bukan draft form yg belum disave).
          const prev = rows[idx + 1]?.snapshot ?? {};
          const next = h.snapshot;
          const diffs = DIFF_FIELDS.filter((f) => String(prev?.[f.k] ?? "") !== String(next?.[f.k] ?? ""));
          const open = openIdx === idx;
          return (
            <li key={h.id} className="p-2 text-xs">
              <button className="flex w-full items-center justify-between text-left" onClick={() => setOpenIdx(open ? null : idx)}>
                <span>
                  <b>{new Date(h.changed_at).toLocaleString("id-ID")}</b> · <span className="text-muted-foreground">{h.action}</span>
                  {h.changed_by && <span className="text-muted-foreground"> · oleh {String(h.changed_by).slice(0, 8)}</span>}
                </span>
                <span className="text-muted-foreground">{diffs.length} perubahan</span>
              </button>
              {open && diffs.length > 0 && (
                <div className="mt-2 space-y-1">
                  {diffs.map((f) => (
                    <div key={f.k} className="grid grid-cols-[110px_1fr_1fr] gap-2 rounded border p-1">
                      <div className="text-muted-foreground">{f.label}</div>
                      <div className="text-red-600 line-through break-words">{String(prev?.[f.k] ?? "—")}</div>
                      <div className="text-emerald-700 break-words">{String(next?.[f.k] ?? "—")}</div>
                    </div>
                  ))}
                </div>
              )}
              {open && diffs.length === 0 && <div className="mt-2 text-muted-foreground">Tidak ada perubahan.</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ResepDialog({ open, onClose, visit_id, pasien_id, dokter_id, onCreated }: { open: boolean; onClose: () => void; visit_id: string; pasien_id: string; dokter_id: string | null; onCreated: () => void }) {
  const callObat = useServerFn(listObat);
  const callCreate = useServerFn(createPrescription);
  const callPreview = useServerFn(previewInteractions);
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

  const interQ = useQuery({
    queryKey: ["klinik","interactions", items.map((i) => i.obat_name).join("|")],
    queryFn: () => callPreview({ data: { names: items.map((i) => i.obat_name) } }),
    enabled: open && items.length >= 2,
  });
  const warnings = ((interQ.data ?? []) as Array<{ severity: string; drugs: string[]; reason: string }>);

  type Obat = { id: string; name: string; code: string; price: number; stock: number; unit: string };
  const obat = (obatQ.data ?? []) as Obat[];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Buat Resep</DialogTitle></DialogHeader>
        {warnings.length > 0 && (
          <div role="alert" aria-live="polite" className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <div className="mb-1 font-semibold">⚠ Peringatan interaksi obat</div>
            <ul className="list-disc space-y-0.5 pl-4">
              {warnings.map((w, i) => (
                <li key={i}><b>[{w.severity.toUpperCase()}]</b> {w.drugs.join(" + ")} — {w.reason}</li>
              ))}
            </ul>
            {warnings.some((w) => w.severity === "danger") && <div className="mt-1 font-medium">Kombinasi ditandai bahaya — server akan menolak submit.</div>}
          </div>
        )}
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
                    <Button size="icon" aria-label="Hapus" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}><Trash2 className="h-3 w-3" /></Button></div>
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
