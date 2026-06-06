import { createFileRoute } from "@tanstack/react-router";
import { Stethoscope, Receipt, Eye } from "lucide-react";
import { ProductLanding } from "@/components/product-landing";
import { faviconDataUrl } from "@/lib/brand";

const SITE = "https://prime-health-suite.lovable.app";

export const Route = createFileRoute("/produk/sim-klinik")({
  head: () => ({
    meta: [
      { title: "SIM Klinik Mata — Rekam Medis, Pemeriksaan & Billing" },
      { name: "description", content: "Sistem informasi klinik mata: registrasi, rekam medis, pemeriksaan visus & refraksi, tindakan, billing, dan farmasi dalam satu alur." },
      { property: "og:title", content: "SIM Klinik Mata — Operasional Klinik Terpadu" },
      { property: "og:description", content: "Registrasi, rekam medis, pemeriksaan, tindakan, billing & farmasi untuk klinik mata." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/produk/sim-klinik` },
      { name: "theme-color", content: "#2d8a9e" },
    ],
    links: [
      { rel: "canonical", href: `${SITE}/produk/sim-klinik` },
      { rel: "icon", type: "image/svg+xml", href: faviconDataUrl("🩺") },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "SIM Klinik Mata",
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        description: "Sistem informasi klinik mata untuk registrasi, rekam medis, pemeriksaan, tindakan, billing, dan farmasi.",
      }),
    }],
  }),
  component: () => (
    <ProductLanding
      system="sim-klinik"
      loginTo="/sim-klinik/login"
      defaultRoleLabel="Dokter / Front Office"
      headline="Operasional klinik mata, dari registrasi hingga billing."
      subhead="Alur kerja klinik mata yang terstruktur: registrasi pasien, rekam medis, pemeriksaan spesialis mata, tindakan, billing, dan farmasi — semua di satu sistem."
      benefits={[
        { icon: Stethoscope, title: "Alur klinis utuh", desc: "Dari pasien datang sampai pulang, satu sistem mencatat semuanya." },
        { icon: Eye, title: "Spesialisasi mata", desc: "Template pemeriksaan visus, refraksi, tonometri, dan funduscopy." },
        { icon: Receipt, title: "Billing & farmasi", desc: "Invoice otomatis terhubung ke kasir dan stok obat." },
      ]}
      features={[
        "Registrasi & antrian pasien",
        "Rekam medis elektronik (RME)",
        "Pemeriksaan mata terstandarisasi",
        "Catatan tindakan & operasi",
        "Resep & farmasi terintegrasi",
        "Billing & invoice ke Finance",
        "Jadwal dokter & ruangan",
        "Master data tarif & layanan",
      ]}
      audiences={[
        { role: "Dokter & Perawat", what: "Akses cepat rekam medis dan input pemeriksaan." },
        { role: "Front Office & Kasir", what: "Registrasi, antrian, billing, dan pembayaran pasien." },
      ]}
    />
  ),
});

// Suppress unused imports warning by referencing icons used elsewhere
void ClipboardList; void Pill; void UserCheck;
