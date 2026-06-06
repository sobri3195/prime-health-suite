import { createFileRoute } from "@tanstack/react-router";
import { Calendar, FileText, Bell, Smartphone, Users, ShieldCheck } from "lucide-react";
import { ProductLanding } from "@/components/product-landing";
import { faviconDataUrl } from "@/lib/brand";

const SITE = "https://prime-health-suite.lovable.app";

export const Route = createFileRoute("/produk/apps")({
  head: () => ({
    meta: [
      { title: "Prime Apps — Portal Pasien Klinik Mata" },
      { name: "description", content: "Aplikasi pasien klinik mata: booking jadwal, resep digital, riwayat pemeriksaan, dan notifikasi kontrol. Akses 24/7 dari ponsel." },
      { property: "og:title", content: "Prime Apps — Portal Pasien Klinik Mata" },
      { property: "og:description", content: "Booking jadwal, resep digital, dan riwayat pemeriksaan pasien klinik mata." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE}/produk/apps` },
      { name: "theme-color", content: "#c9a84c" },
    ],
    links: [
      { rel: "canonical", href: `${SITE}/produk/apps` },
      { rel: "icon", type: "image/svg+xml", href: faviconDataUrl("👁") },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: "Prime Apps",
        applicationCategory: "HealthApplication",
        operatingSystem: "Web",
        description: "Portal pasien klinik mata untuk booking, resep digital, dan riwayat pemeriksaan.",
      }),
    }],
  }),
  component: () => (
    <ProductLanding
      system="apps"
      loginTo="/apps/login"
      defaultRoleLabel="Pasien / Front Office"
      headline="Portal pasien untuk klinik mata modern."
      subhead="Pasien bisa booking jadwal, melihat resep digital, dan riwayat pemeriksaan kapan saja — front office cukup memantau dari satu dashboard."
      benefits={[
        { icon: Calendar, title: "Booking mandiri", desc: "Pasien memilih dokter & jadwal tanpa harus menelepon." },
        { icon: FileText, title: "Resep & hasil digital", desc: "Riwayat visus, refraksi, dan resep selalu dalam genggaman." },
        { icon: Bell, title: "Notifikasi kontrol", desc: "Pengingat kontrol mata dan pengambilan kacamata otomatis." },
      ]}
      features={[
        "Booking jadwal per dokter",
        "Riwayat pemeriksaan mata",
        "Resep digital & e-kacamata",
        "Notifikasi kontrol berkala",
        "Dokumen pasien terpusat",
        "Helpdesk & AI insight",
        "Integrasi dengan SIM Klinik",
        "Audit log aktivitas pasien",
      ]}
      audiences={[
        { role: "Pasien", what: "Akses cepat jadwal, resep, dan hasil pemeriksaan." },
        { role: "Front Office", what: "Pantau pendaftaran online dan konfirmasi jadwal." },
      ]}
    />
  ),
});
