import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { getVisitDetail } from "@/lib/klinik.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Stethoscope } from "lucide-react";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/_authenticated/sim-klinik/$section")({
  head: () => pageHead({ title: 'Detail — SIM Klinik', description: 'Halaman detail kunjungan dan rekam medis pasien.', path: '/sim-klinik/$section' }),
  beforeLoad: ({ params }) => {
    if (!UUID_RE.test(params.section)) {
      throw notFound({ data: { section: params.section } });
    }
  },
  component: Section,
  notFoundComponent: () => {
    const { section } = Route.useParams();
    return (
      <div className="p-6">
        <PageHeader title="Kunjungan tidak ditemukan" desc={`ID: ${section}`} />
        <Button asChild variant="outline"><Link to="/sim-klinik/pemeriksaan">← Kembali ke Pemeriksaan</Link></Button>
      </div>
    );
  },
  errorComponent: ({ error }) => (
    <div className="p-6">
      <PageHeader title="Gagal memuat kunjungan" desc={error.message} />
      <Button asChild variant="outline"><Link to="/sim-klinik/pemeriksaan">← Kembali ke Pemeriksaan</Link></Button>
    </div>
  ),
});

function Section() {
  const { section } = Route.useParams();
  return <VisitDetail visitId={section} />;
}

function VisitDetail({ visitId }: { visitId: string }) {
  const call = useServerFn(getVisitDetail);
  const q = useQuery({
    queryKey: ["klinik", "visit-detail", visitId],
    queryFn: async () => {
      const res = await call({ data: { id: visitId } });
      if (!res?.visit) throw notFound({ data: { section: visitId } });
      return res;
    },
    retry: false,
  });

  if (q.isLoading) return <p className="p-6 text-sm text-muted-foreground">Memuat detail kunjungan…</p>;
  if (q.isError || !q.data?.visit) {
    return (
      <div className="p-6">
        <PageHeader title="Kunjungan tidak ditemukan" desc={`ID: ${visitId}`} />
        <Button asChild variant="outline"><Link to="/sim-klinik/pemeriksaan">← Kembali ke Pemeriksaan</Link></Button>
      </div>
    );
  }

  const v = q.data.visit as {
    id: string; visit_date: string; status: string; chief_complaint: string | null;
    apps_pasien?: { no_rm: string; nama: string; patient_type: string };
    fin_dokter?: { name: string };
  };
  const mr = q.data.medrec as null | {
    anamnesis?: string; visus_od?: string; visus_os?: string; tio_od?: string; tio_os?: string;
    slit_lamp?: string; fundus?: string; diagnosis?: string; icd10_code?: string;
    treatment_plan?: string; tindakan?: string; notes?: string; is_final?: boolean;
  };
  const presc = (q.data.prescriptions ?? []) as Array<{ id: string; status: string; klinik_prescription_item?: unknown[] }>;

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Kunjungan ${v.apps_pasien?.nama ?? ""}`}
        desc={`${v.apps_pasien?.no_rm ?? ""} • ${new Date(v.visit_date).toLocaleString("id-ID")} • Dokter: ${v.fin_dokter?.name ?? "-"}`}
      />
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline">{v.status}</Badge>
        {v.apps_pasien?.patient_type && <Badge variant="secondary">{v.apps_pasien.patient_type}</Badge>}
        {mr?.is_final && <Badge>Final</Badge>}
        <div className="ml-auto flex gap-2">
          <Button asChild size="sm" variant="outline"><Link to="/sim-klinik/pemeriksaan"><Stethoscope className="mr-1 h-4 w-4" />Buka di Pemeriksaan</Link></Button>
          <Button asChild size="sm" variant="outline"><Link to="/sim-klinik/billing"><FileText className="mr-1 h-4 w-4" />Billing</Link></Button>
        </div>
      </div>

      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold">Keluhan Utama</h3>
        <p className="text-sm text-muted-foreground">{v.chief_complaint || "—"}</p>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">Rekam Medis</h3>
        {!mr ? (
          <p className="text-sm text-muted-foreground">Belum ada rekam medis. Buka di Pemeriksaan untuk mengisi.</p>
        ) : (
          <dl className="grid gap-3 text-sm md:grid-cols-2">
            <Field label="Anamnesis" value={mr.anamnesis} />
            <Field label="Diagnosis" value={mr.diagnosis ? `${mr.diagnosis}${mr.icd10_code ? ` (${mr.icd10_code})` : ""}` : undefined} />
            <Field label="Visus OD / OS" value={mr.visus_od || mr.visus_os ? `${mr.visus_od ?? "-"} / ${mr.visus_os ?? "-"}` : undefined} />
            <Field label="TIO OD / OS" value={mr.tio_od || mr.tio_os ? `${mr.tio_od ?? "-"} / ${mr.tio_os ?? "-"}` : undefined} />
            <Field label="Slit Lamp" value={mr.slit_lamp} />
            <Field label="Fundus" value={mr.fundus} />
            <Field label="Rencana Terapi" value={mr.treatment_plan} />
            <Field label="Tindakan" value={mr.tindakan} />
            <Field label="Catatan" value={mr.notes} />
          </dl>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="mb-2 text-sm font-semibold">Resep ({presc.length})</h3>
        {presc.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada resep.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {presc.map((p) => (
              <li key={p.id}>• {p.klinik_prescription_item?.length ?? 0} item · <Badge variant="outline">{p.status}</Badge></li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value || "—"}</dd>
    </div>
  );
}
