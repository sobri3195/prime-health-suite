import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Users, Activity, Eye, Calendar } from "lucide-react";

const patients = [
  { id: "P-00128", name: "Andi Saputra", age: 42, doctor: "dr. Rini, Sp.M", visit: "Refraksi", status: "Antri" },
  { id: "P-00129", name: "Nadya Putri", age: 29, doctor: "dr. Bagas, Sp.M", visit: "Konsultasi", status: "Diperiksa" },
  { id: "P-00130", name: "Bayu Pratama", age: 55, doctor: "dr. Rini, Sp.M", visit: "Pre-op Katarak", status: "Selesai" },
  { id: "P-00131", name: "Sari Wulandari", age: 36, doctor: "dr. Anisa, Sp.M", visit: "Kontrol", status: "Antri" },
];

export const Route = createFileRoute("/_authenticated/sim-klinik/")({
  component: SimDashboard,
});

function SimDashboard() {
  const stats = [
    { l: "Pasien hari ini", v: "128", i: Users },
    { l: "Tindakan", v: "47", i: Activity },
    { l: "Refraksi", v: "62", i: Eye },
    { l: "Jadwal operasi", v: "9", i: Calendar },
  ];
  return (
    <div>
      <PageHeader title="Dashboard Klinik" desc="Ringkasan operasional klinik mata hari ini." />
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{s.l}</span>
              <s.i className="h-4 w-4 text-cyan-accent" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{s.v}</div>
          </div>
        ))}
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4 font-medium">Antrian pasien terbaru</div>
        <table className="w-full text-sm">
          <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-5 py-3">ID</th><th className="px-5 py-3">Nama</th>
              <th className="px-5 py-3">Usia</th><th className="px-5 py-3">Dokter</th>
              <th className="px-5 py-3">Kunjungan</th><th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{p.id}</td>
                <td className="px-5 py-3 font-medium">{p.name}</td>
                <td className="px-5 py-3">{p.age}</td>
                <td className="px-5 py-3">{p.doctor}</td>
                <td className="px-5 py-3">{p.visit}</td>
                <td className="px-5 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
