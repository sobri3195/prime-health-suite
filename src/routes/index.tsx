import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, ShieldCheck, Layers, Stethoscope, Wallet, Bell, FileText,
  Activity, Users, Calendar, TrendingUp, Lock, CheckCircle2, Sparkles,
  BarChart3, Eye, ServerCog
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prime Health Platform — Ekosistem Digital Klinik Utama Mata" },
      { name: "description", content: "Platform terintegrasi untuk workspace internal, operasional klinik mata, dan dashboard keuangan dalam satu ekosistem enterprise." },
      { property: "og:title", content: "Prime Health Platform" },
      { property: "og:description", content: "Workspace, SIM Klinik Mata, dan Finance Dashboard dalam satu platform terpadu." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Hero />
      <Problem />
      <Solution />
      <Products />
      <Features />
      <Workflow />
      <Security />
      <DashboardPreview />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[var(--gradient-soft)]" />
      <div className="absolute -top-32 left-1/2 -z-10 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-cyan-accent/20 blur-3xl" />
      <div className="mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-cyan-accent" />
            Enterprise Healthcare Platform · Klinik Utama Mata
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
            Satu ekosistem untuk{" "}
            <span className="bg-[var(--gradient-accent)] bg-clip-text text-transparent">
              workspace, klinis, dan keuangan
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Prime Health Platform menyatukan Prime Apps, SIM Klinik Mata, dan Prime Simon Finance
            ke dalam satu pengalaman digital — modern, aman, dan dirancang untuk skala enterprise.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login" className="inline-flex items-center gap-2 rounded-md bg-navy px-5 py-3 text-sm font-medium text-navy-foreground shadow-[var(--shadow-elegant)] hover:opacity-95">
              Mulai sekarang <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/apps" className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-3 text-sm font-medium text-foreground hover:bg-muted">
              Jelajahi platform
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs text-muted-foreground">
            {["ISO 27001 Ready", "HL7 / FHIR", "Audit Trail", "Role-based Access"].map((b) => (
              <span key={b} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-accent" /> {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  const items = [
    { icon: Layers, title: "Sistem terpecah", desc: "Data klinis, finance, dan operasional tersebar di banyak tools yang tidak terhubung." },
    { icon: ServerCog, title: "Integrasi rumit", desc: "Setiap modul punya database & login berbeda — sulit dipelihara dan rawan error." },
    { icon: TrendingUp, title: "Visibilitas terbatas", desc: "Manajemen sulit melihat performa klinik dan keuangan secara real-time." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-accent">Tantangan</p>
        <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Klinik modern butuh fondasi digital yang utuh</h2>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {items.map((it) => (
          <div key={it.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-navy">
              <it.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{it.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{it.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Solution() {
  return (
    <section className="bg-surface-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-accent">Solusi</p>
        <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Tiga sistem, satu platform</h2>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Setiap modul berdiri sendiri secara teknis, namun terhubung melalui single sign-on,
          identity, dan data layer yang konsisten.
        </p>
      </div>
    </section>
  );
}

const products = [
  {
    href: "/apps" as const,
    icon: Layers,
    badge: "Workspace",
    title: "Prime Apps",
    tagline: "Portal & launcher internal",
    desc: "Akses terpusat ke semua aplikasi, notifikasi, helpdesk, SOP, dan dokumen klinik.",
    points: ["App launcher", "Notifikasi & inbox", "Help center & SOP", "Monitoring umum"],
    accent: "from-cyan-accent/20 to-transparent",
  },
  {
    href: "/sim-klinik" as const,
    icon: Stethoscope,
    badge: "Klinis",
    title: "SIM Klinik Mata",
    tagline: "Operasional klinik mata",
    desc: "Manajemen pasien, kunjungan, dokter, tindakan, jadwal, rekam medis, dan billing klinis.",
    points: ["Registrasi pasien", "Rekam medis mata", "Tindakan & resep", "Billing klinis"],
    accent: "from-emerald-accent/20 to-transparent",
  },
  {
    href: "/finance" as const,
    icon: Wallet,
    badge: "Finance",
    title: "Prime Simon Finance",
    tagline: "Dashboard keuangan",
    desc: "Pendapatan, piutang, pengeluaran, pajak, jurnal, buku besar, dan laporan manajemen.",
    points: ["Pendapatan & piutang", "Bank & kas", "Jurnal & buku besar", "Laba rugi"],
    accent: "from-navy/20 to-transparent",
  },
];

function Products() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-6 lg:grid-cols-3">
        {products.map((p) => (
          <Link
            key={p.title}
            to={p.href}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]"
          >
            <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${p.accent}`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-navy-foreground">
                  <p.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {p.badge}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold">{p.title}</h3>
              <p className="text-sm text-cyan-accent">{p.tagline}</p>
              <p className="mt-3 text-sm text-muted-foreground">{p.desc}</p>
              <ul className="mt-5 space-y-2">
                {p.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-2 text-sm text-foreground/80">
                    <CheckCircle2 className="h-4 w-4 text-emerald-accent" /> {pt}
                  </li>
                ))}
              </ul>
              <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy group-hover:gap-2.5 transition-all">
                Pelajari modul <ArrowRight className="h-4 w-4" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    { icon: Eye, title: "Spesialisasi mata", desc: "Form pemeriksaan, refraksi, dan tindakan yang dirancang khusus untuk klinik mata." },
    { icon: Bell, title: "Notifikasi real-time", desc: "Peristiwa klinis dan finansial diteruskan ke kanal yang tepat secara instan." },
    { icon: FileText, title: "Dokumen & SOP", desc: "Pustaka dokumen internal terpusat dengan versioning dan akses berbasis peran." },
    { icon: BarChart3, title: "Analitik manajerial", desc: "Dashboard performa klinik dan keuangan untuk pengambilan keputusan." },
    { icon: Users, title: "Identity & SSO", desc: "Single sign-on lintas modul dengan kontrol akses granular." },
    { icon: Calendar, title: "Jadwal terintegrasi", desc: "Jadwal dokter, tindakan, dan ruang yang sinkron antar modul." },
  ];
  return (
    <section className="bg-surface-muted/40 py-20">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-accent">Fitur Unggulan</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Dirancang untuk operasional enterprise</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {feats.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <f.icon className="h-5 w-5 text-cyan-accent" />
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const steps = [
    { n: "01", t: "Login via Prime Apps", d: "User masuk satu pintu ke seluruh ekosistem." },
    { n: "02", t: "Operasional di SIM Klinik", d: "Pasien dilayani, tindakan dicatat, billing dibuat." },
    { n: "03", t: "Tercatat di Finance", d: "Transaksi mengalir otomatis ke jurnal dan laporan." },
    { n: "04", t: "Insight manajemen", d: "Dashboard memberi visibilitas penuh ke pimpinan." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-accent">Ekosistem</p>
        <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Alur kerja end-to-end</h2>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.n} className="relative rounded-2xl border border-border bg-card p-6">
            <div className="text-xs font-mono text-cyan-accent">{s.n}</div>
            <h3 className="mt-2 font-semibold">{s.t}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{s.d}</p>
            {i < steps.length - 1 && (
              <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-border md:block" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Security() {
  const items = [
    { icon: ShieldCheck, t: "Standar keamanan", d: "Praktik ISO 27001 & enkripsi data at-rest dan in-transit." },
    { icon: Lock, t: "Role-based access", d: "Hak akses granular per modul, peran, dan unit." },
    { icon: FileText, t: "Audit trail lengkap", d: "Setiap aksi tercatat untuk kebutuhan kepatuhan." },
  ];
  return (
    <section className="bg-navy py-20 text-navy-foreground">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-accent">Keamanan & Kepatuhan</p>
          <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Dibangun di atas fondasi keamanan healthcare</h2>
          <p className="mt-4 max-w-lg text-navy-foreground/70">
            Data pasien dan transaksi keuangan dilindungi oleh kontrol akses ketat, enkripsi modern,
            dan jejak audit menyeluruh — selaras dengan kebutuhan regulasi.
          </p>
        </div>
        <div className="grid gap-4">
          {items.map((i) => (
            <div key={i.t} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-accent/20 text-cyan-accent">
                  <i.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{i.t}</h3>
                  <p className="text-sm text-navy-foreground/70">{i.d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-accent">Preview</p>
        <h2 className="mt-3 text-3xl font-semibold md:text-4xl">Dashboard yang ringkas & informatif</h2>
      </div>
      <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)]">
        <div className="flex items-center gap-2 border-b border-border bg-surface-muted/60 px-4 py-3">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-accent/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-accent/60" />
          </div>
          <span className="ml-3 text-xs text-muted-foreground">prime-health / dashboard</span>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-4">
          {[
            { l: "Pasien hari ini", v: "128", c: "+12%", icon: Users },
            { l: "Pendapatan", v: "Rp 86,4 jt", c: "+8.4%", icon: Wallet },
            { l: "Tindakan", v: "47", c: "+5", icon: Activity },
            { l: "Piutang", v: "Rp 22,1 jt", c: "-3.1%", icon: TrendingUp },
          ].map((k) => (
            <div key={k.l} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{k.l}</span>
                <k.icon className="h-4 w-4 text-cyan-accent" />
              </div>
              <div className="mt-2 text-2xl font-semibold">{k.v}</div>
              <div className="mt-1 text-xs text-emerald-accent">{k.c}</div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 px-6 pb-6 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-background p-5 md:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">Tren kunjungan 7 hari</span>
              <span className="text-xs text-muted-foreground">Mingguan</span>
            </div>
            <div className="flex h-40 items-end gap-2">
              {[40, 65, 55, 80, 70, 95, 88].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md bg-[var(--gradient-accent)]" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border bg-background p-5">
            <div className="mb-3 text-sm font-medium">Antrian aktif</div>
            <ul className="space-y-3 text-sm">
              {[
                { n: "Andi Saputra", s: "Refraksi" },
                { n: "Nadya Putri", s: "Konsultasi" },
                { n: "Bayu Pratama", s: "Pre-op" },
                { n: "Sari Wulandari", s: "Kontrol" },
              ].map((q) => (
                <li key={q.n} className="flex items-center justify-between">
                  <span>{q.n}</span>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{q.s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20">
      <div className="overflow-hidden rounded-3xl bg-[var(--gradient-hero)] p-10 text-navy-foreground md:p-16">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-semibold md:text-4xl">Siap mendigitalkan klinik mata Anda?</h2>
            <p className="mt-3 max-w-lg text-navy-foreground/70">
              Jadwalkan demo bersama tim kami dan lihat bagaimana Prime Health Platform
              dapat disesuaikan dengan kebutuhan klinik Anda.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
            <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-medium text-navy hover:bg-white/90">
              Request demo <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/apps" className="inline-flex items-center justify-center rounded-md border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-navy-foreground hover:bg-white/10">
              Hubungi sales
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
