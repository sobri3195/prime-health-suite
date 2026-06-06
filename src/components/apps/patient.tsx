import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Sparkles, Bell, Calendar, Brain, ClipboardList, Glasses, ScanEye, BookOpen,
  ChevronRight, Clock, CheckCircle2, ShoppingCart, Filter, Search, Plus, Heart,
  Download, AlertCircle, Camera, Trophy, Phone, Mail, MapPin, Shield, LogOut,
  Stethoscope, FileText, MessageCircle,
} from "lucide-react";

/* ------------------------------ shared ui ------------------------------ */

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#e9dfb8] bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function GoldButton({ children, onClick, full = true }: { children: ReactNode; onClick?: () => void; full?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`${full ? "w-full" : ""} rounded-xl bg-[#a08a2a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#8c7822] active:scale-[0.98]`}
    >
      {children}
    </button>
  );
}

function OutlineButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-4 py-2 text-sm font-medium text-[#5a4a14] transition hover:bg-[#f6ecc8]"
    >
      {children}
    </button>
  );
}

function Pill({ children, tone = "amber" }: { children: ReactNode; tone?: "amber" | "green" | "rose" | "navy" }) {
  const t = {
    amber: "bg-[#fdf2c4] text-[#7a6010]",
    green: "bg-emerald-100 text-emerald-700",
    rose: "bg-rose-100 text-rose-700",
    navy: "bg-[#1f1d19] text-white",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${t}`}>{children}</span>;
}

/* ------------------------------ Beranda ------------------------------ */

export function PatientBeranda() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* hello */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[0.2em] text-[#a08a2a]">PRIME</div>
            <div className="text-[11px] text-muted-foreground">Klinik Utama Mata</div>
          </div>
          <button onClick={() => toast.info("3 notifikasi baru")} className="rounded-full border border-[#e9dfb8] p-2 text-[#7a6010]">
            <Bell className="h-4 w-4" />
          </button>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">Halo, Pasien <span aria-hidden>👋</span></h1>
        <p className="mt-1 text-sm text-muted-foreground">Pantau kesehatan mata Anda dengan cepat hari ini.</p>
      </Card>

      {/* ringkasan */}
      <Card>
        <Pill><Sparkles className="h-3 w-3" /> Ringkasan Hari Ini</Pill>
        <h2 className="mt-3 text-xl font-bold leading-tight">Kesehatan mata Anda dalam satu tampilan.</h2>
        <p className="mt-1 text-sm text-muted-foreground">Lihat antrean, jadwal, dan langkah perawatan singkat.</p>
        <button onClick={() => toast.success("Membuka ringkasan harian")} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#a08a2a]">
          Lihat Ringkasan <ChevronRight className="h-4 w-4" />
        </button>

        <div className="mt-4 rounded-xl bg-[#fdf2c4] p-4">
          <div className="text-sm font-semibold">Pengingat 20-20-20</div>
          <p className="mt-0.5 text-xs text-muted-foreground">Setiap 20 menit, lihat jauh 20 detik.</p>
          <button
            onClick={() => toast.success("Pengingat 20-20-20 dimulai")}
            className="mt-3 w-full rounded-xl bg-[#a08a2a] py-2.5 text-sm font-semibold text-white"
          >
            Mulai Pengingat
          </button>
        </div>
      </Card>

      {/* aksi cepat */}
      <div>
        <h3 className="mb-2 text-base font-semibold">Aksi Cepat</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => toast.success("Membuka booking pemeriksaan")}
            className="rounded-2xl bg-[#a08a2a] p-4 text-left text-white shadow-sm transition hover:bg-[#8c7822]"
          >
            <Calendar className="mb-3 h-5 w-5" />
            <div className="text-base font-bold leading-tight">Booking<br/>Pemeriksaan</div>
            <div className="mt-1 text-[11px] opacity-90">Pilih jadwal konsultasi.</div>
          </button>
          <Link
            to="/apps/ai"
            className="rounded-2xl border border-[#e9dfb8] bg-white p-4 text-left transition hover:bg-[#fdf8e8]"
          >
            <Brain className="mb-3 h-5 w-5 text-[#a08a2a]" />
            <div className="text-base font-bold leading-tight">Cek AI Mata</div>
            <div className="mt-1 text-[11px] text-muted-foreground">Skrining awal cepat.</div>
          </Link>
        </div>
      </div>

      {/* antrean */}
      <Card>
        <div className="text-[11px] font-bold tracking-widest text-[#a08a2a]">ANTREAN HARI INI</div>
        <div className="mt-1 text-3xl font-bold">A-017</div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <Clock className="h-3.5 w-3.5 text-[#a08a2a]" /> Estimasi ±15 menit
          <Pill tone="green"><CheckCircle2 className="h-3 w-3" /> Menunggu Pemeriksaan</Pill>
        </div>
        <button onClick={() => toast.info("Detail antrean")} className="mt-4 rounded-full bg-[#1f1d19] px-4 py-2 text-xs font-semibold text-white">
          Lihat Detail
        </button>
      </Card>

      {/* jadwal */}
      <Card>
        <div className="text-[11px] font-bold tracking-widest text-emerald-700">JADWAL BERIKUTNYA</div>
        <div className="mt-1 text-lg font-bold">dr. Sp.M</div>
        <div className="text-xs text-muted-foreground">4 Mei 2026 • 10.30 WIB</div>
        <div className="mt-2 text-sm">Pemeriksaan Mata Lengkap</div>
        <div className="mt-2"><Pill tone="green">Booking Terkonfirmasi</Pill></div>
        <button onClick={() => toast.info("Detail/ubah jadwal")} className="mt-3 text-sm font-semibold text-[#a08a2a]">
          Detail / Ubah Jadwal
        </button>
      </Card>

      {/* menu cepat */}
      <div>
        <h3 className="mb-2 text-base font-semibold">Menu Cepat</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { l: "Riwayat Pemeriksaan", i: ClipboardList, to: "/apps/laporan" as const },
            { l: "Resep Kacamata", i: Glasses, to: "/apps/laporan" as const },
            { l: "Hasil AI Mata", i: ScanEye, to: "/apps/ai" as const },
            { l: "Edukasi Mata", i: BookOpen, to: "/apps" as const },
          ].map((m) => (
            <Link key={m.l} to={m.to} className="rounded-2xl border border-[#e9dfb8] bg-white p-4 transition hover:bg-[#fdf8e8]">
              <m.i className="mb-2 h-5 w-5 text-[#a08a2a]" />
              <div className="text-sm font-semibold">{m.l}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* daily wins */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-base font-bold">Daily Wins</div>
          <Pill><Trophy className="h-3 w-3" /> 120 poin</Pill>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          <li>• Check-in harian</li>
          <li>• Baca tips mata</li>
          <li>• Selesaikan 20-20-20</li>
        </ul>
        <div className="mt-3 flex gap-2">
          <GoldButton full={false} onClick={() => toast.success("Check-in harian +10 poin!")}>Check-in Harian +10 poin</GoldButton>
          <OutlineButton onClick={() => toast.info("Lihat semua misi")}>Lihat Semua Misi</OutlineButton>
        </div>
      </Card>

      {/* tips */}
      <Card>
        <div className="text-base font-bold">Tips Kesehatan Mata</div>
        <div className="mt-2 text-sm font-semibold">Cara mencegah mata lelah akibat layar</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Atur pencahayaan, gunakan aturan 20-20-20, dan jaga jarak layar.
        </p>
        <button onClick={() => toast.info("Membuka artikel edukasi")} className="mt-3 text-sm font-semibold text-[#a08a2a]">
          Baca Selengkapnya
        </button>
      </Card>
    </div>
  );
}

/* ------------------------------ AI ------------------------------ */

const GEJALA = [
  "Mata merah","Mata gatal","Mata berair","Mata kering","Nyeri mata","Pandangan buram",
  "Silau","Sakit kepala","Keluar kotoran mata","Penglihatan mendadak menurun","Melihat kilatan cahaya","Riwayat trauma mata",
];

export function PatientAI() {
  const [keluhan, setKeluhan] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [durasi, setDurasi] = useState("");
  const [nyeri, setNyeri] = useState(0);
  const [hasil, setHasil] = useState<null | { risk: string; tip: string }>(null);

  const toggle = (g: string) =>
    setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));

  const analisa = () => {
    if (!keluhan.trim() || !durasi) {
      toast.error("Lengkapi keluhan dan durasi.");
      return;
    }
    const red = picked.some((p) =>
      ["Penglihatan mendadak menurun", "Melihat kilatan cahaya", "Riwayat trauma mata"].includes(p),
    );
    const risk = red || nyeri >= 7 ? "Tinggi" : picked.length >= 3 || nyeri >= 4 ? "Sedang" : "Rendah";
    const tip =
      risk === "Tinggi"
        ? "Segera kunjungi IGD atau dokter mata."
        : risk === "Sedang"
        ? "Booking pemeriksaan dalam 1-3 hari."
        : "Pantau gejala dan terapkan istirahat mata.";
    setHasil({ risk, tip });
    toast.success("Analisis selesai");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card className="bg-[#1f1d19] text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AlertCircle className="h-4 w-4" /> Catatan keamanan medis
        </div>
        <p className="mt-2 text-xs opacity-90">
          AI Mata PRIME hanya membantu screening awal dan edukasi. Hasil bukan diagnosis dokter.
        </p>
        <p className="mt-2 text-xs opacity-90">
          Segera ke IGD bila penurunan penglihatan mendadak, nyeri hebat, trauma, atau kilatan cahaya.
        </p>
        <button onClick={() => toast.success("Disetujui")} className="mt-3 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-[#1f1d19]">
          Saya Mengerti
        </button>
      </Card>

      <Card>
        <div className="text-base font-bold">Kamera AI Mata</div>
        <button onClick={() => toast.info("Kamera tidak tersedia di demo")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#e9dfb8] bg-[#fdf8e8] py-8 text-sm font-semibold text-[#7a6010]">
          <Camera className="h-5 w-5" /> Buka Kamera AI Mata
        </button>
      </Card>

      <Card>
        <label className="text-sm font-semibold">Keluhan utama</label>
        <textarea
          value={keluhan}
          maxLength={300}
          onChange={(e) => setKeluhan(e.target.value)}
          rows={3}
          placeholder="Ceritakan keluhan Anda..."
          className="mt-2 w-full rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] p-3 text-sm outline-none focus:ring-2 focus:ring-[#a08a2a]"
        />
        <div className="mt-1 text-right text-[11px] text-muted-foreground">{keluhan.length}/300</div>

        <div className="mt-4 text-sm font-semibold">Pilihan gejala</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {GEJALA.map((g) => {
            const on = picked.includes(g);
            return (
              <button
                key={g}
                onClick={() => toggle(g)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  on ? "bg-[#a08a2a] text-white" : "border border-[#e9dfb8] bg-[#fdf8e8] text-[#5a4a14]"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>

        <div className="mt-4 text-sm font-semibold">Sejak kapan keluhan dirasakan?</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {["Hari ini","1–3 hari","4–7 hari","Lebih dari 1 minggu"].map((d) => (
            <button
              key={d}
              onClick={() => setDurasi(d)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                durasi === d ? "bg-[#1f1d19] text-white" : "border border-[#e9dfb8] bg-[#fdf8e8] text-[#5a4a14]"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="mt-4 text-sm font-semibold">Tingkat nyeri</div>
        <div className="mt-1 text-xs text-muted-foreground">Nyeri: {nyeri}/10</div>
        <input
          type="range"
          min={0}
          max={10}
          value={nyeri}
          onChange={(e) => setNyeri(Number(e.target.value))}
          className="mt-2 w-full accent-[#a08a2a]"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Tidak nyeri</span><span>Nyeri berat</span>
        </div>

        <button
          onClick={analisa}
          className="mt-4 w-full rounded-xl bg-[#a08a2a] py-3 text-sm font-semibold text-white"
        >
          Analisa Sekarang
        </button>
      </Card>

      <Card>
        <div className="text-sm font-semibold">Hasil Analisis</div>
        {hasil ? (
          <div className="mt-2 space-y-1">
            <div>Risiko: <Pill tone={hasil.risk === "Tinggi" ? "rose" : hasil.risk === "Sedang" ? "amber" : "green"}>{hasil.risk}</Pill></div>
            <p className="text-sm text-muted-foreground">{hasil.tip}</p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Belum ada hasil analisis. Isi form lalu klik Analisa Sekarang.</p>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------ Belanja ------------------------------ */

type Product = { id: string; name: string; tag: string; cat: string; price: number; desc: string; icon: string };
const PRODUCTS: Product[] = [
  { id: "p1", name: "Kacamata Prime Classic", tag: "Best Seller", cat: "kacamata", price: 650000, desc: "Frame ringan untuk harian.", icon: "👓" },
  { id: "p2", name: "Lensa Kontak Harian", tag: "Nyaman", cat: "lensa-kontak", price: 85000, desc: "30 lensa steril nyaman.", icon: "👁️" },
  { id: "p3", name: "Tetes Mata Lubricant", tag: "Original", cat: "tetes", price: 55000, desc: "Membantu mata kering.", icon: "💧" },
  { id: "p4", name: "Vitamin Mata Prime", tag: "Rekomendasi", cat: "vitamin", price: 95000, desc: "Suplemen 30 kapsul.", icon: "💊" },
];
const CATS = ["semua","kacamata","lensa-kontak","tetes","vitamin"];

export function PatientBelanja() {
  const [cat, setCat] = useState("semua");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState(0);

  const list = PRODUCTS.filter(
    (p) => (cat === "semua" || p.cat === cat) && p.name.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">Marketplace</h1>
            <p className="mt-1 text-sm text-muted-foreground">Fokus belanja kebutuhan mata dengan produk & layanan klinik.</p>
          </div>
          <button onClick={() => toast.info(`Keranjang: ${cart} item`)} className="relative rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] p-2">
            <ShoppingCart className="h-5 w-5 text-[#5a4a14]" />
            {cart > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-[#a08a2a] px-1.5 text-[10px] font-bold text-white">{cart}</span>}
          </button>
        </div>
      </Card>

      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#e9dfb8] bg-white px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari produk/layanan" className="flex-1 bg-transparent text-sm outline-none" />
        </div>
        <button onClick={() => toast.info("Filter")} className="rounded-xl border border-[#e9dfb8] bg-white p-2.5">
          <Filter className="h-4 w-4 text-[#5a4a14]" />
        </button>
      </div>

      <Card className="bg-[#a08a2a] text-white">
        <div className="text-base font-bold">Etalase kebutuhan mata Prime</div>
        <p className="mt-1 text-xs opacity-90">Produk tepercaya dan layanan klinik untuk kesehatan mata Anda.</p>
        <button onClick={() => toast.info("Rekomendasi")} className="mt-3 text-sm font-semibold underline">Lihat Rekomendasi</button>
      </Card>

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold ${
              cat === c ? "bg-[#a08a2a] text-white" : "bg-white text-[#5a4a14] border border-[#e9dfb8]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div>
        <h3 className="mb-2 text-base font-semibold">Produk Pilihan</h3>
        <div className="grid grid-cols-2 gap-3">
          {list.map((p) => (
            <Card key={p.id} className="p-3">
              <div className="flex h-24 items-center justify-center rounded-xl bg-[#fdf2c4] text-4xl">{p.icon}</div>
              <div className="mt-2 text-[11px] text-muted-foreground">{p.tag}</div>
              <div className="text-sm font-bold leading-tight">{p.name}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{p.desc}</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-sm font-bold">Rp {p.price.toLocaleString("id-ID")}</div>
                <div className="flex gap-1">
                  <button onClick={() => toast.success("Disukai")} className="rounded-full p-1.5 text-muted-foreground hover:bg-[#fdf8e8]">
                    <Heart className="h-4 w-4" />
                  </button>
                  <button onClick={() => { setCart((c) => c + 1); toast.success(`${p.name} masuk keranjang`); }} className="rounded-full bg-[#1f1d19] p-1.5 text-white">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-base font-semibold">Layanan Klinik</h3>
        <Card>
          <div className="text-sm font-bold">Paket Pemeriksaan Mata Lengkap</div>
          <div className="mt-1 text-xs text-muted-foreground">Cek mata menyeluruh • 60 menit</div>
          <div className="mt-3 flex items-center justify-between">
            <div className="text-base font-bold">Rp 150.000</div>
            <button onClick={() => toast.success("Booking layanan")} className="rounded-full bg-[#a08a2a] px-4 py-1.5 text-xs font-semibold text-white">Booking</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------ Profil ------------------------------ */

const FAMILY = [
  { name: "Siti Aminah", rel: "Ibu", status: "Aktif" },
  { name: "Ahmad Maulana", rel: "Ayah", status: "Aktif" },
  { name: "Rafi Maulana", rel: "Anak", status: "Kontrol Berkala" },
];

const VOUCHERS = [
  { name: "Voucher diskon pemeriksaan Rp10.000", points: 100 },
  { name: "Voucher diskon produk marketplace 8%", points: 160 },
  { name: "Gratis konsultasi singkat online", points: 200 },
  { name: "Prioritas antrean", points: 260 },
];

export function PatientProfil() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Profil Pasien</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kelola data pribadi dan aktivitas akun Anda.</p>
      </div>

      <Card className="bg-[#a08a2a] text-white">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl">👤</div>
          <div className="flex-1">
            <div className="font-bold">Muhammad Sobri Maulana</div>
            <div className="text-xs opacity-90">No RM: RM-2026-00128</div>
          </div>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#5a4a14]">Aktif</span>
        </div>
        <button onClick={() => toast.info("Edit Profil")} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#5a4a14]">
          Edit Profil
        </button>
      </Card>

      <Card>
        <div className="text-base font-bold">Daily Wins Ringkas</div>
        <p className="mt-1 text-xs text-muted-foreground">Poin 120 • Streak 3 hari • Belum check-in hari ini</p>
        <div className="mt-3 flex gap-2">
          <OutlineButton onClick={() => toast.info("Lihat Misi")}>Lihat Misi</OutlineButton>
          <GoldButton full={false} onClick={() => toast.success("Check-in Harian +10 poin")}>Check-in Harian +10 poin</GoldButton>
        </div>
      </Card>

      <Card>
        <div className="text-base font-bold">Informasi Akun</div>
        <ul className="mt-2 space-y-1.5 text-sm">
          <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[#a08a2a]" /> +62******7890</li>
          <li className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-[#a08a2a]" /> sob***@email.com</li>
          <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#a08a2a]" /> Jl. Melati Indah No....</li>
        </ul>
        <button onClick={() => toast.info("Detail akun")} className="mt-3 rounded-xl border border-[#e9dfb8] px-3 py-1.5 text-xs font-semibold">Lihat Detail</button>
      </Card>

      <Card>
        <div className="text-base font-bold">Ringkasan Rekam Medis</div>
        <div className="mt-1 text-sm">2026-05-12 • Mata buram • dr. Sp.M • Visus 6/9</div>
        <button onClick={() => toast.info("Rekam medis")} className="mt-3 rounded-xl bg-[#a08a2a] px-4 py-1.5 text-xs font-semibold text-white">
          Lihat Rekam Medis
        </button>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-base font-bold">Keluarga Terdaftar</div>
          <button onClick={() => toast.success("Tambah anggota keluarga")} className="rounded-xl border border-[#e9dfb8] px-3 py-1 text-xs font-semibold">
            + Tambah
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {FAMILY.map((f) => (
            <li key={f.name} className="rounded-xl bg-[#fdf2c4] p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{f.name} <span className="font-normal text-muted-foreground">({f.rel})</span></div>
                <Pill>{f.status}</Pill>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => toast.info(`Edit ${f.name}`)} className="rounded-md bg-white px-2 py-0.5 text-[11px]">Edit</button>
                <button onClick={() => toast.warning(`Hapus ${f.name}`)} className="rounded-md bg-white px-2 py-0.5 text-[11px]">Hapus</button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="text-base font-bold">Menu Profil</div>
        <ul className="mt-2 grid grid-cols-2 gap-2 text-sm">
          {["Data Pribadi","Dokumen Medis","Riwayat Pemeriksaan","Resep Kacamata","Hasil AI Mata","Alamat & Kontak","Pengaturan Notifikasi","Bantuan Klinik"].map((m) => (
            <li key={m}>
              <button onClick={() => toast.info(m)} className="w-full rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-3 py-2 text-left text-xs font-medium">
                {m}
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="flex items-center gap-2 text-base font-bold"><Shield className="h-4 w-4 text-[#a08a2a]" /> Keamanan Akun</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {["Ubah Password","Verifikasi Nomor HP","Verifikasi Email","PIN / Biometrik","Logout semua perangkat"].map((s) => (
            <button key={s} onClick={() => toast.info(s)} className="rounded-full border border-[#e9dfb8] bg-[#fdf8e8] px-3 py-1 text-xs">{s}</button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-base font-bold">Reward & Voucher</div>
          <Pill><Trophy className="h-3 w-3" /> Total 120 poin</Pill>
        </div>
        <ul className="mt-3 space-y-2">
          {VOUCHERS.map((v) => (
            <li key={v.name} className="flex items-center justify-between rounded-xl bg-[#fdf8e8] p-3">
              <div>
                <div className="text-sm font-semibold">{v.name}</div>
                <div className="text-[11px] text-muted-foreground">{v.points} poin</div>
              </div>
              <button onClick={() => toast.success(`Tukar: ${v.name}`)} className="rounded-full bg-[#a08a2a] px-3 py-1 text-[11px] font-semibold text-white">
                Pilih/Tukar
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <button onClick={() => toast.warning("Keluar dari akun")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e9dfb8] bg-white py-3 text-sm font-semibold text-[#7a6010]">
        <LogOut className="h-4 w-4" /> Keluar Akun
      </button>
    </div>
  );
}

/* ------------------------------ Laporan ------------------------------ */

const VISUS = [
  { m: "Mar", k: 6, ki: 6 },
  { m: "Apr", k: 6, ki: 6.5 },
  { m: "Mei", k: 9, ki: 6.2 },
];
const TIO = [{ m: "Mar", v: 21 }, { m: "Apr", v: 19 }, { m: "Mei", v: 18 }];

export function PatientLaporan() {
  const [periode, setPeriode] = useState("3 Bulan");
  const [kategori, setKategori] = useState("Semua");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight">Laporan Kesehatan Mata</h1>
            <p className="mt-1 text-sm text-muted-foreground">Pantau kondisi mata Anda secara terstruktur dan mudah dibaca.</p>
          </div>
          <button onClick={() => toast.success("Mengunduh laporan PDF")} className="rounded-xl bg-[#fdf2c4] p-3 text-[#7a6010]">
            <Download className="h-5 w-5" />
          </button>
        </div>
      </Card>

      <Card className="bg-[#a08a2a] text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AlertCircle className="h-4 w-4" /> Status Kesehatan Mata: Perlu Pemantauan
        </div>
        <p className="mt-2 text-sm opacity-95">
          Hasil terakhir menunjukkan visus mata kiri lebih rendah dan perlu pemantauan berkala.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>Kunjungan: 2026-05-12</div>
          <div>Dokter: dr. Sp.M</div>
          <div>RM: RM-2026-00128</div>
          <div>Status: Aktif</div>
        </div>
        <button onClick={() => toast.success("Mengunduh laporan")} className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#5a4a14]">
          Unduh Laporan
        </button>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Visus Mata Kanan" value="6/9" sub="Normal" tone="green" />
        <MetricCard label="Visus Mata Kiri" value="6/12" sub="Perlu kontrol" tone="rose" />
        <MetricCard label="Tekanan Intraokular" value="18 mmHg" sub="Dalam batas aman" tone="green" />
        <MetricCard label="Risiko Mata Kering" value="Sedang" sub="Pantau gejala" tone="amber" />
      </div>

      <Card>
        <div className="text-base font-bold">Filter Laporan</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {["1 Bulan","3 Bulan","6 Bulan","1 Tahun"].map((p) => (
            <button key={p} onClick={() => setPeriode(p)} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${periode===p?"bg-[#a08a2a] text-white":"bg-[#fdf2c4] text-[#7a6010]"}`}>{p}</button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {["Semua","Pemeriksaan Dokter","AI Screening","Resep Kacamata"].map((k) => (
            <button key={k} onClick={() => setKategori(k)} className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${kategori===k?"bg-[#1f1d19] text-white":"bg-[#fdf2c4] text-[#7a6010]"}`}>{k}</button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-base font-bold">Grafik Perkembangan Visus</div>
        <p className="mt-1 text-xs text-muted-foreground">Perbandingan hasil pemeriksaan mata kanan dan kiri.</p>
        <div className="mt-3 flex items-end justify-between gap-2">
          {VISUS.map((v) => (
            <div key={v.m} className="flex-1 text-center">
              <div className="flex items-end justify-center gap-1" style={{ height: 110 }}>
                <div className="w-5 rounded-t bg-[#a08a2a]" style={{ height: `${v.k * 10}px` }} />
                <div className="w-5 rounded-t bg-[#1f1d19]" style={{ height: `${v.ki * 10}px` }} />
              </div>
              <div className="mt-1 text-xs font-semibold">{v.m}</div>
              <div className="text-[10px] text-muted-foreground">K {v.k} • Ki {v.ki}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-base font-bold">Tekanan Intraokular</div>
        <div className="mt-1 text-xs text-muted-foreground">Dipantau untuk membantu deteksi risiko glaukoma.</div>
        <div className="mt-3 flex items-end justify-between gap-2">
          {TIO.map((t) => (
            <div key={t.m} className="flex-1 text-center">
              <div className="mx-auto w-8 rounded-t bg-emerald-500" style={{ height: `${t.v * 4}px` }} />
              <div className="mt-1 text-xs font-semibold">{t.m}</div>
              <div className="text-[10px] text-muted-foreground">{t.v}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="text-base font-bold">Riwayat Pemeriksaan</div>
        <div className="mt-2 rounded-xl bg-[#fdf8e8] p-3">
          <div className="text-xs text-muted-foreground">2026-05-12</div>
          <div className="flex items-center gap-2 text-sm font-semibold"><Stethoscope className="h-4 w-4 text-[#a08a2a]" /> Pemeriksaan Mata Lengkap</div>
          <div className="text-xs text-muted-foreground">dr. Sp.M • Selesai</div>
        </div>
      </Card>

      <Card>
        <div className="text-base font-bold">Hasil AI Mata Terakhir</div>
        <p className="mt-1 text-sm">2026-03-10 • Risiko Sedang • Keluhan Mata buram</p>
        <button onClick={() => toast.info("Detail AI")} className="mt-3 rounded-xl border border-[#e9dfb8] px-3 py-1.5 text-xs font-semibold">
          Lihat Detail AI
        </button>
      </Card>

      <Card>
        <div className="text-base font-bold">Rekomendasi</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Lakukan pemeriksaan ulang 1 bulan lagi atau lebih cepat jika keluhan bertambah.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <GoldButton full={false} onClick={() => toast.success("Booking pemeriksaan")}>Booking Pemeriksaan</GoldButton>
          <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#e9dfb8] bg-white px-4 py-2 text-sm font-semibold text-[#7a6010]">
            <MessageCircle className="h-4 w-4" /> Hubungi Klinik
          </a>
        </div>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: "green" | "rose" | "amber" }) {
  const dot = { green: "bg-emerald-500", rose: "bg-rose-500", amber: "bg-amber-500" }[tone];
  return (
    <Card className="p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-xs">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} /> {sub}
      </div>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <FileText className="h-3 w-3" /> Detail klinis
      </div>
    </Card>
  );
}
