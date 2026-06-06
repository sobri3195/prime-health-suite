import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { PageHeader } from "./apps";
import { Users, Activity, Calendar, Eye } from "lucide-react";

export const Route = createFileRoute("/sim-klinik")({
  head: () => ({
    meta: [
      { title: "SIM Klinik Mata — Operasional Klinik" },
      { name: "description", content: "Sistem informasi klinik mata: pasien, kunjungan, tindakan, rekam medis, dan billing klinis." },
    ],
  }),
  component: SimKlinikPage,
});

const patients = [
  { id: "P-00128", name: "Andi Saputra", age: 42, doctor: "dr. Rini, Sp.M", visit: "Refraksi", status: "Antri" },
  { id: "P-00129", name: "Nadya Putri", age: 29, doctor: "dr. Bagas, Sp.M", visit: "Konsultasi", status: "Diperiksa" },
  { id: "P-00130", name: "Bayu Pratama", age: 55, doctor: "dr. Rini, Sp.M", visit: "Pre-op Katarak", status: "Selesai" },
  { id: "P-00131", name: "Sari Wulandari", age: 36, doctor: "dr. Anisa, Sp.M", visit: "Kontrol", status: "Antri" },
];

function SimKlinikPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-7xl px-6 py-16">
        <PageHeader
          eyebrow="SIM Klinik Mata"
          title="Operasional klinik mata"
          desc="Manajemen pasien, kunjungan, dokter, tindakan, dan billing klinis dalam satu sistem."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            { l: "Pasien hari ini", v: "128", icon: Users },
            { l: "Tindakan", v: "47", icon: Activity },
            { l: "Refraksi", v: "62", icon: Eye },
            { l: "Jadwal operasi", v: "9", icon: Calendar },
          ].map((s) => (
            <div key={s.l} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.l}</span>
                <s.icon className="h-4 w-4 text-cyan-accent" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{s.v}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">Antrian pasien terbaru</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">ID</th>
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Usia</th>
                  <th className="px-5 py-3">Dokter</th>
                  <th className="px-5 py-3">Kunjungan</th>
                  <th className="px-5 py-3">Status</th>
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
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-10">
          <Link to="/" className="text-sm text-cyan-accent hover:underline">← Kembali ke beranda</Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
