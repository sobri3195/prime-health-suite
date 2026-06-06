import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Lock, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prime Health Platform — Ekosistem Digital Klinik Utama Mata" },
      {
        name: "description",
        content:
          "Platform editorial premium menyatukan Prime Apps, SIM Klinik Mata, dan Prime Simon Finance dalam satu ekosistem terintegrasi.",
      },
      { property: "og:title", content: "Prime Health Platform" },
      {
        property: "og:description",
        content: "Workspace, SIM Klinik Mata, dan Finance Dashboard dalam satu platform terpadu.",
      },
    ],
  }),
  component: Landing,
});

const serif = { fontFamily: "'Instrument Serif', serif" };
const sans = { fontFamily: "'Work Sans', sans-serif" };

function Landing() {
  return (
    <div
      className="w-full min-h-screen text-[#064e3b] selection:bg-[#c9a84c]/30"
      style={{ background: "#f5f0e0", ...sans }}
    >
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="flex justify-between items-center mb-24">
          <Link to="/" className="text-xl font-bold tracking-tight text-[#064e3b]">
            Prime Health
            <span className="block text-[10px] tracking-widest uppercase font-medium opacity-70">
              Platform
            </span>
          </Link>
          <nav className="hidden md:flex gap-8 text-sm font-medium uppercase tracking-wider opacity-80">
            <Link to="/apps" className="hover:text-[#c9a84c] transition-colors">
              Prime Apps
            </Link>
            <Link to="/sim-klinik" className="hover:text-[#c9a84c] transition-colors">
              SIM Klinik
            </Link>
            <Link to="/finance" className="hover:text-[#c9a84c] transition-colors">
              Finance
            </Link>
          </nav>
          <Link
            to="/login"
            className="px-6 py-2 border border-[#064e3b] rounded-full text-sm font-medium hover:bg-[#064e3b] hover:text-[#f5f0e0] transition-all uppercase tracking-tight"
          >
            Request Demo
          </Link>
        </header>

        {/* Hero */}
        <section className="text-center mb-32">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-[#064e3b]/10 rounded-full mb-8 bg-white/50">
            <span className="w-2 h-2 rounded-full bg-[#c9a84c] animate-pulse" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">
              Enterprise Healthcare Platform
            </span>
          </div>
          <h1
            className="text-6xl md:text-8xl leading-[0.9] mb-8"
            style={serif}
          >
            Satu ekosistem untuk
            <br />
            <span className="italic text-[#c9a84c]">Klinik Utama Mata</span>
          </h1>
          <p className="max-w-xl mx-auto text-lg leading-relaxed opacity-80 mb-10">
            Menyatukan Prime Apps, SIM Klinik Mata, dan Prime Simon Finance ke dalam satu pengalaman
            digital yang modern, aman, dan berskala enterprise.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="px-8 py-4 bg-[#064e3b] text-[#f5f0e0] rounded-full font-medium inline-flex items-center gap-2 hover:bg-[#0d7a5f] transition-all group"
            >
              Mulai sekarang
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/apps"
              className="px-8 py-4 border border-[#064e3b]/20 rounded-full font-medium hover:bg-white transition-all"
            >
              Jelajahi platform
            </Link>
          </div>
        </section>

        {/* Bento Products */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-32">
          {/* SIM Klinik */}
          <Link
            to="/sim-klinik"
            className="md:col-span-8 bg-[#064e3b] rounded-[2.5rem] p-10 text-[#f5f0e0] relative overflow-hidden group block"
          >
            <div className="relative z-10">
              <span className="text-[10px] uppercase tracking-widest opacity-60 mb-2 block">
                Operational System
              </span>
              <h3 className="text-4xl mb-4 italic" style={serif}>
                SIM Klinik Mata
              </h3>
              <p className="max-w-sm opacity-70 mb-8">
                Manajemen pasien, kunjungan, dokter, tindakan, jadwal, rekam medis, dan billing
                klinik secara terpadu.
              </p>
              <ul className="space-y-2 mb-10 text-sm opacity-80">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#c9a84c]" /> Registrasi Pasien & Antrean
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#c9a84c]" /> Rekam Medis Mata (EMR)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#c9a84c]" /> Tindakan, Resep & Billing
                </li>
              </ul>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#c9a84c] border-b border-[#c9a84c]/30 pb-1">
                Pelajari modul
              </span>
            </div>
            <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#0d7a5f] rounded-full blur-3xl opacity-30 group-hover:opacity-50 transition-opacity" />
          </Link>

          {/* Prime Apps */}
          <Link
            to="/apps"
            className="md:col-span-4 bg-white border border-[#064e3b]/5 rounded-[2.5rem] p-8 flex flex-col justify-between block"
          >
            <div>
              <span className="text-[10px] uppercase tracking-widest text-[#c9a84c] font-bold mb-2 block">
                Workspace
              </span>
              <h3 className="text-3xl mb-3" style={serif}>
                Prime Apps
              </h3>
              <p className="text-sm opacity-70">
                Portal akses terpusat untuk seluruh aplikasi pasien dan komunikasi internal.
              </p>
            </div>
            <div className="mt-8">
              <div className="flex -space-x-2">
                <div className="w-10 h-10 rounded-full bg-[#0d7a5f] border-2 border-white" />
                <div className="w-10 h-10 rounded-full bg-[#c9a84c] border-2 border-white" />
                <div className="w-10 h-10 rounded-full bg-[#064e3b] border-2 border-white" />
              </div>
              <span className="block mt-6 text-sm font-semibold opacity-60 hover:opacity-100 transition-opacity">
                Lihat dashboard →
              </span>
            </div>
          </Link>

          {/* Finance */}
          <Link
            to="/finance"
            className="md:col-span-4 bg-[#f5f0e0] border border-[#c9a84c]/30 rounded-[2.5rem] p-8 flex flex-col justify-between block"
          >
            <div>
              <span className="text-[10px] uppercase tracking-widest opacity-60 mb-2 block">
                Finance
              </span>
              <h3 className="text-3xl mb-3" style={serif}>
                Simon Finance
              </h3>
              <p className="text-sm opacity-70">
                Manajemen piutang, hutang, buku besar, dan laporan laba rugi real-time.
              </p>
            </div>
            <div className="mt-8 p-4 bg-white/40 rounded-2xl">
              <div className="h-2 w-full bg-[#064e3b]/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#c9a84c] w-3/4" />
              </div>
              <span className="text-[10px] font-bold uppercase mt-2 block opacity-50">
                Monthly Revenue Target
              </span>
            </div>
          </Link>

          {/* Workflow */}
          <div className="md:col-span-8 bg-white border border-[#064e3b]/5 rounded-[2.5rem] p-10">
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <h3 className="text-4xl leading-tight mb-4" style={serif}>
                  Alur kerja
                  <br />
                  <span className="italic">yang sinkron.</span>
                </h3>
                <p className="text-sm opacity-70 mb-6 text-balance">
                  Data mengalir otomatis dari pendaftaran hingga laporan keuangan tanpa input ganda.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-[#f5f0e0] rounded-xl text-xs font-medium border border-[#c9a84c]/20 text-center uppercase tracking-tight italic">
                    No Data Silos
                  </div>
                  <div className="p-3 bg-[#f5f0e0] rounded-xl text-xs font-medium border border-[#c9a84c]/20 text-center uppercase tracking-tight italic">
                    Real-time Sync
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 bg-white border-l-2 border-[#c9a84c] shadow-sm">
                    <span className="text-[10px] font-bold opacity-30 italic">01</span>
                    <span className="text-sm font-medium">Login SSO Prime Apps</span>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-white border-l-2 border-[#0d7a5f] shadow-sm ml-4">
                    <span className="text-[10px] font-bold opacity-30 italic">02</span>
                    <span className="text-sm font-medium">Pelayanan SIM Klinik</span>
                  </div>
                  <div className="flex items-center gap-4 p-3 bg-white border-l-2 border-[#064e3b] shadow-sm ml-8">
                    <span className="text-[10px] font-bold opacity-30 italic">03</span>
                    <span className="text-sm font-medium">Otomasi Finance</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="bg-[#064e3b] rounded-[3rem] p-12 md:p-20 text-[#f5f0e0] mb-32 relative overflow-hidden">
          <div className="grid md:grid-cols-2 gap-16 relative z-10">
            <div>
              <span className="text-[#c9a84c] text-[10px] uppercase tracking-[0.3em] font-bold mb-6 block">
                Keamanan & Kepatuhan
              </span>
              <h2 className="text-5xl leading-tight mb-6" style={serif}>
                Dibangun di atas fondasi keamanan{" "}
                <span className="italic">healthcare.</span>
              </h2>
              <p className="opacity-70 text-lg leading-relaxed">
                Data pasien dan transaksi keuangan dilindungi oleh kontrol akses ketat, enkripsi
                modern, dan jejak audit menyeluruh sesuai regulasi.
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex gap-6 p-6 rounded-2xl bg-[#0d7a5f]/30 border border-white/5">
                <div className="w-12 h-12 shrink-0 rounded-full bg-[#c9a84c]/20 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-[#c9a84c]" />
                </div>
                <div>
                  <h4 className="font-medium mb-1 uppercase tracking-tight text-sm">
                    Standar ISO 27001
                  </h4>
                  <p className="text-xs opacity-60">
                    Praktik standar keamanan global untuk manajemen informasi.
                  </p>
                </div>
              </div>
              <div className="flex gap-6 p-6 rounded-2xl bg-[#0d7a5f]/30 border border-white/5">
                <div className="w-12 h-12 shrink-0 rounded-full bg-[#c9a84c]/20 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-[#c9a84c]" />
                </div>
                <div>
                  <h4 className="font-medium mb-1 uppercase tracking-tight text-sm">
                    RBAC & Audit Trail
                  </h4>
                  <p className="text-xs opacity-60">
                    Kontrol akses granular per modul dan pelacakan aktivitas real-time.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-[#0d7a5f]/20 to-transparent pointer-events-none" />
        </section>

        {/* Final CTA */}
        <section className="text-center pb-24">
          <h2 className="text-5xl mb-12 italic text-[#064e3b]" style={serif}>
            Siap memodernisasi klinik Anda?
          </h2>
          <div className="flex flex-wrap justify-center gap-6 items-center">
            <Link
              to="/login"
              className="text-lg italic border-b border-[#064e3b] pb-1 hover:text-[#c9a84c] transition-colors"
              style={serif}
            >
              Hubungi tim sales kami
            </Link>
            <span className="opacity-30 uppercase tracking-widest text-[10px]">atau</span>
            <Link
              to="/login"
              className="px-10 py-5 bg-[#c9a84c] text-white rounded-full font-medium shadow-xl shadow-[#c9a84c]/20 hover:scale-105 transition-transform"
            >
              Mulai Coba Gratis
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-12 border-t border-[#064e3b]/10 flex flex-col md:flex-row justify-between gap-12 text-sm">
          <div>
            <div className="text-lg font-bold tracking-tight text-[#064e3b] mb-4 uppercase">
              Prime Health
            </div>
            <p className="max-w-xs opacity-50 italic">
              Transformasi digital menyeluruh untuk ekosistem kesehatan mata di Indonesia.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
            <div className="flex flex-col gap-4">
              <h5 className="uppercase font-bold tracking-widest text-[10px] text-[#c9a84c]">
                Solusi
              </h5>
              <Link to="/sim-klinik" className="opacity-70 hover:opacity-100">
                SIM Klinik
              </Link>
              <Link to="/apps" className="opacity-70 hover:opacity-100">
                Prime Apps
              </Link>
              <Link to="/finance" className="opacity-70 hover:opacity-100">
                Simon Finance
              </Link>
            </div>
            <div className="flex flex-col gap-4">
              <h5 className="uppercase font-bold tracking-widest text-[10px] text-[#c9a84c]">
                Perusahaan
              </h5>
              <span className="opacity-70">Tentang Kami</span>
              <span className="opacity-70">Karir</span>
            </div>
            <div className="flex flex-col gap-4">
              <h5 className="uppercase font-bold tracking-widest text-[10px] text-[#c9a84c]">
                Bantuan
              </h5>
              <span className="opacity-70">Support</span>
              <span className="opacity-70">Dokumentasi</span>
            </div>
          </div>
        </footer>
        <div className="mt-12 pt-6 text-[10px] uppercase tracking-widest opacity-40 text-center">
          © {new Date().getFullYear()} Prime Health Platform · Klinik Utama Mata
        </div>
      </div>
    </div>
  );
}
