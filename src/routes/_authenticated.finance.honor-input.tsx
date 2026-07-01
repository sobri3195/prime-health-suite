import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/finance";
import { addAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance/honor-input")({
  
  head: () => pageHead({ title: "Input Jasa Medis — Finance", description: "Input Jasa Medis pada modul keuangan klinik.", path: "/finance/honor-input" }),
  component: Page,
});

type Dokter = { id: string; name: string; default_fee_pct: number | null };

function Page() {
  const { user } = useAuth();
  const slipRef = useRef<HTMLDivElement>(null);
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [dokterId, setDokterId] = useState<string>("");
  const [patient, setPatient] = useState("");
  const [tindakan, setTindakan] = useState("Konsultasi Sp.M");
  const [tarif, setTarif] = useState(175000);

  const dokterQ = useQuery({
    queryKey: ["fin", "dokter", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fin_dokter")
        .select("id,name,default_fee_pct")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Dokter[];
    },
  });

  const dokter = useMemo(
    () => dokterQ.data?.find((d) => d.id === dokterId) ?? dokterQ.data?.[0],
    [dokterQ.data, dokterId],
  );
  const pct = Number(dokter?.default_fee_pct ?? 40);
  const jasa = Math.round((tarif * pct) / 100);

  const submit = () => {
    if (!dokter) { toast.error("Dokter belum dipilih"); return; }
    if (!patient) { toast.error("Patient code wajib diisi"); return; }
    addAudit({
      actor: user?.email ?? "system",
      action: "role_change",
      target: "finance/honor/input",
      meta: { dokter_id: dokter.id, dokter: dokter.name, tanggal, patient, tindakan, tarif, pct, jasa },
    });
    toast.success(`Jasa medis ${formatIDR(jasa)} tercatat untuk ${dokter.name}`);
    setPatient("");
  };

  const cetak = () => {
    if (!dokter) { toast.error("Dokter belum dipilih"); return; }
    const html = slipRef.current?.outerHTML ?? "";
    const w = window.open("", "_blank", "width=520,height=640");
    if (!w) { toast.error("Popup diblokir browser"); return; }
    w.document.write(`<html><head><title>Slip Jasa Medis</title><style>body{font:13px system-ui;padding:24px;color:#0f172a}h1{font-size:16px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:12px}td{padding:6px 0;border-bottom:1px dashed #cbd5e1}.total{font-weight:700;border-top:2px solid #0f172a;padding-top:8px}</style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div>
      <PageHeader title="Input Jasa Medis" desc="Input jasa medis per kunjungan/tindakan dokter." />
      <div className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5"><Label className="text-xs" htmlFor="hi-tgl">Tanggal</Label><Input id="hi-tgl" type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs" htmlFor="hi-dok">Dokter</Label>
            <select id="hi-dok" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={dokter?.id ?? ""} onChange={(e) => setDokterId(e.target.value)} disabled={dokterQ.isLoading || (dokterQ.data?.length ?? 0) === 0}>
              {dokterQ.isLoading && <option>Memuat…</option>}
              {!dokterQ.isLoading && (dokterQ.data?.length ?? 0) === 0 && <option value="">Tidak ada dokter aktif</option>}
              {dokterQ.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid gap-1.5"><Label className="text-xs" htmlFor="hi-pt">Patient Code</Label><Input id="hi-pt" value={patient} onChange={(e) => setPatient(e.target.value.toUpperCase())} placeholder="PT-001" /></div>
          <div className="grid gap-1.5"><Label className="text-xs" htmlFor="hi-tind">Tindakan</Label><Input id="hi-tind" value={tindakan} onChange={(e) => setTindakan(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs" htmlFor="hi-tarif">Tarif (Rp)</Label><Input id="hi-tarif" type="number" value={tarif} onChange={(e) => setTarif(Number(e.target.value) || 0)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">% Jasa Medis</Label><Input value={`${pct}%`} disabled /></div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
          <span className="text-sm text-muted-foreground">Jasa Medis Dokter</span>
          <span className="font-mono text-lg font-semibold">{formatIDR(jasa)}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={cetak}>Cetak</Button>
          <Button onClick={submit}>Simpan</Button>
        </div>
      </div>

      {/* Slip template (offscreen), digunakan untuk cetak */}
      <div className="sr-only" aria-hidden>
        <div ref={slipRef}>
          <h1>Slip Jasa Medis</h1>
          <div>Tanggal: {tanggal}</div>
          <table>
            <tbody>
              <tr><td>Dokter</td><td style={{ textAlign: "right" }}>{dokter?.name ?? "-"}</td></tr>
              <tr><td>Patient</td><td style={{ textAlign: "right" }}>{patient || "-"}</td></tr>
              <tr><td>Tindakan</td><td style={{ textAlign: "right" }}>{tindakan}</td></tr>
              <tr><td>Tarif</td><td style={{ textAlign: "right" }}>{formatIDR(tarif)}</td></tr>
              <tr><td>Persentase</td><td style={{ textAlign: "right" }}>{pct}%</td></tr>
              <tr className="total"><td>Jasa Medis</td><td style={{ textAlign: "right" }}>{formatIDR(jasa)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
