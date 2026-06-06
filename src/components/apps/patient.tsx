import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Sparkles, Bell, Calendar, Brain, ClipboardList, Glasses, ScanEye, BookOpen,
  Clock, CheckCircle2, ShoppingCart, Filter, Search, Plus, Heart,
  Download, AlertCircle, Camera, Phone, MapPin, Shield, LogOut,
  Stethoscope, FileText, MessageCircle, Loader2, Activity, ShieldAlert, ListChecks,
  Save, X, ChevronRight,
} from "lucide-react";
import { diagnoseEye, type DiagnoseResult } from "@/lib/diagnose.functions";
import {
  getMyProfile, updateMyProfile, listMyBookings, cancelBooking, rescheduleBooking,
  getMyQueueToday, listMyInvoices, listDoctorsForBooking, listAvailableSlots,
} from "@/lib/apps-patient.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useAppsRealtime, NotifBellBadge } from "@/components/apps/notif-panel";
import { generateResepPDF } from "@/lib/resep-pdf";

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
  const callProfile = useServerFn(getMyProfile);
  const callQueue = useServerFn(getMyQueueToday);
  const callBookings = useServerFn(listMyBookings);

  const profileQ = useQuery({ queryKey: ["apps", "profile"], queryFn: () => callProfile() });
  const queueQ = useQuery({ queryKey: ["apps", "queue"], queryFn: () => callQueue(), refetchInterval: 60_000 });
  const bookingsQ = useQuery({ queryKey: ["apps", "bookings"], queryFn: () => callBookings() });

  useAppsRealtime(profileQ.data?.profile?.user_id);

  const profile = profileQ.data?.profile;
  const queue = queueQ.data?.queue;
  const posisi = queueQ.data?.posisi;
  const total = queueQ.data?.total;
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = bookingsQ.data?.bookings.find(
    (b) => b.tanggal >= today && b.status !== "cancelled" && b.status !== "done"
  );
  const nama = profile?.nama || "Pasien";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* hello */}
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold tracking-[0.2em] text-[#a08a2a]">PRIME</div>
            <div className="text-[11px] text-muted-foreground">Klinik Utama Mata</div>
          </div>
          <NotifBellBadge />
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          Halo, {nama} <span aria-hidden>👋</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile?.patient_code ? `Kode pasien: ${profile.patient_code}` : "Pantau kesehatan mata Anda dengan cepat hari ini."}
        </p>
      </Card>

      {/* aksi cepat */}
      <div>
        <h3 className="mb-2 text-base font-semibold">Aksi Cepat</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/apps/booking"
            className="rounded-2xl bg-[#a08a2a] p-4 text-left text-white shadow-sm transition hover:bg-[#8c7822]"
          >
            <Calendar className="mb-3 h-5 w-5" />
            <div className="text-base font-bold leading-tight">Booking<br/>Pemeriksaan</div>
            <div className="mt-1 text-[11px] opacity-90">Pilih dokter & jadwal.</div>
          </Link>
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

      {/* antrean hari ini */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-bold tracking-widest text-[#a08a2a]">ANTREAN HARI INI</div>
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> LIVE
          </span>
        </div>
        {queueQ.isLoading ? (
          <div className="mt-2 text-sm opacity-60"><Loader2 className="inline h-4 w-4 animate-spin" /> Memuat…</div>
        ) : queue ? (
          <>
            <div className="mt-1 text-3xl font-bold">{queue.no_antrean || `#${(posisi ?? 0) + 1}`}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              {posisi !== null && posisi !== undefined && total !== null && total !== undefined
                ? `Posisi Anda: ${posisi + 1} dari ${total} pasien • Estimasi tunggu ±${posisi * 15} menit`
                : "Memuat posisi…"}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Clock className="h-3.5 w-3.5 text-[#a08a2a]" /> {queue.jam_slot}
              <Pill tone={queue.status === "checked_in" ? "green" : "amber"}>
                <CheckCircle2 className="h-3 w-3" /> {statusLabel(queue.status)}
              </Pill>
            </div>
            <div className="mt-2 text-xs opacity-70">Dokter: {queue.dokter_nama}</div>
          </>
        ) : (
          <div className="mt-2 text-sm opacity-70">Tidak ada antrean hari ini. Booking jadwal terbaru?</div>
        )}
      </Card>


      {/* jadwal berikutnya */}
      <Card>
        <div className="text-[11px] font-bold tracking-widest text-emerald-700">JADWAL BERIKUTNYA</div>
        {bookingsQ.isLoading ? (
          <div className="mt-2 text-sm opacity-60"><Loader2 className="inline h-4 w-4 animate-spin" /> Memuat…</div>
        ) : upcoming ? (
          <>
            <div className="mt-1 text-lg font-bold">{upcoming.dokter_nama}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(upcoming.tanggal).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} • {upcoming.jam_slot} WIB
            </div>
            <div className="mt-2 text-sm">{upcoming.keluhan || "Pemeriksaan mata"}</div>
            <div className="mt-2"><Pill tone={upcoming.status === "confirmed" ? "green" : "amber"}>{statusLabel(upcoming.status)}</Pill></div>
            <Link to="/apps/laporan" className="mt-3 inline-block text-sm font-semibold text-[#a08a2a]">
              Lihat semua booking →
            </Link>
          </>
        ) : (
          <div className="mt-2">
            <p className="text-sm opacity-70">Belum ada booking aktif.</p>
            <Link to="/apps/booking" className="mt-2 inline-block rounded-xl bg-[#a08a2a] px-4 py-2 text-xs font-semibold text-white">
              Buat Booking
            </Link>
          </div>
        )}
      </Card>

      {/* menu cepat */}
      <div>
        <h3 className="mb-2 text-base font-semibold">Menu Cepat</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { l: "Riwayat & Resep", i: ClipboardList, to: "/apps/laporan" as const },
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

      {/* tips */}
      <Card>
        <Pill><Sparkles className="h-3 w-3" /> Tips Harian</Pill>
        <div className="mt-3 text-base font-bold">Aturan 20-20-20</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Setiap 20 menit, lihat sesuatu sejauh 20 kaki (~6 m) selama 20 detik untuk mengurangi mata lelah.
        </p>
      </Card>
    </div>
  );
}

function statusLabel(s: string) {
  return {
    pending: "Menunggu konfirmasi",
    confirmed: "Booking terkonfirmasi",
    checked_in: "Sedang menunggu",
    done: "Selesai",
    cancelled: "Dibatalkan",
  }[s] || s;
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
  const [usia, setUsia] = useState<string>("");
  const [riwayat, setRiwayat] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<DiagnoseResult | null>(null);
  const callDiagnose = useServerFn(diagnoseEye);

  const toggle = (g: string) =>
    setPicked((p) => (p.includes(g) ? p.filter((x) => x !== g) : [...p, g]));

  const analisa = async () => {
    if (!keluhan.trim() || !durasi) {
      toast.error("Lengkapi keluhan dan durasi.");
      return;
    }
    setLoading(true);
    setHasil(null);
    try {
      const res = await callDiagnose({
        data: {
          keluhan,
          gejala: picked,
          durasi,
          nyeri,
          usia: usia ? Number(usia) : null,
          riwayat,
        },
      });
      setHasil(res);
      toast.success("AI engine selesai menganalisis");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menganalisis");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setKeluhan(""); setPicked([]); setDurasi(""); setNyeri(0);
    setUsia(""); setRiwayat(""); setHasil(null);
  };

  const riskTone = (r: string) => r === "Tinggi" ? "rose" : r === "Sedang" ? "amber" : "green";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Hero AI Engine */}
      <Card className="bg-gradient-to-br from-[#1f1d19] via-[#2a2620] to-[#1f1d19] text-white">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-[#a08a2a]/20 p-2"><Brain className="h-5 w-5 text-[#e9c860]" /></div>
          <div>
            <div className="text-[11px] font-bold tracking-[0.2em] text-[#e9c860]">PRIME AI ENGINE</div>
            <div className="text-base font-bold">Skrining & Diagnosis Awal Mata</div>
          </div>
        </div>
        <p className="mt-3 text-xs opacity-90">
          Didukung model AI medis untuk membantu menilai keluhan mata Anda. Hasil bersifat
          edukatif, bukan pengganti diagnosis dokter.
        </p>
        <div className="mt-3 flex items-center gap-3 text-[11px] opacity-90">
          <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3" /> Aman & Privasi</span>
          <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3" /> Realtime</span>
          <span className="inline-flex items-center gap-1"><Stethoscope className="h-3 w-3" /> Klinis</span>
        </div>
      </Card>

      {/* Red flag banner */}
      <Card className="border-rose-200 bg-rose-50">
        <div className="flex items-start gap-2 text-rose-700">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="text-xs">
            <b>Segera ke IGD</b> bila penglihatan turun mendadak, nyeri hebat, trauma, kilatan cahaya,
            atau banyak bintik mengambang baru.
          </div>
        </div>
      </Card>

      <Card>
        <div className="text-base font-bold">Kamera AI Mata</div>
        <button onClick={() => toast.info("Kamera tidak tersedia di demo")} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#e9dfb8] bg-[#fdf8e8] py-8 text-sm font-semibold text-[#7a6010]">
          <Camera className="h-5 w-5" /> Buka Kamera AI Mata
        </button>
      </Card>

      {/* Form */}
      <Card>
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold">Keluhan utama</label>
          <span className="text-[11px] text-muted-foreground">{keluhan.length}/300</span>
        </div>
        <textarea
          value={keluhan}
          maxLength={300}
          onChange={(e) => setKeluhan(e.target.value)}
          rows={3}
          placeholder="Contoh: mata kanan merah dan terasa pedih sejak pagi..."
          className="mt-2 w-full rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] p-3 text-sm outline-none focus:ring-2 focus:ring-[#a08a2a]"
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[#5a4a14]">Usia (opsional)</label>
            <input
              type="number" min={0} max={120} value={usia}
              onChange={(e) => setUsia(e.target.value)}
              placeholder="mis. 35"
              className="mt-1 w-full rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#a08a2a]"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#5a4a14]">Riwayat (opsional)</label>
            <input
              type="text" value={riwayat}
              onChange={(e) => setRiwayat(e.target.value)}
              placeholder="mis. pakai lensa kontak, diabetes"
              className="mt-1 w-full rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#a08a2a]"
            />
          </div>
        </div>

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
          type="range" min={0} max={10} value={nyeri}
          onChange={(e) => setNyeri(Number(e.target.value))}
          className="mt-2 w-full accent-[#a08a2a]"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>Tidak nyeri</span><span>Nyeri berat</span>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={analisa}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#a08a2a] py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> AI sedang menganalisis…</> : <><Brain className="h-4 w-4" /> Diagnosis dengan AI</>}
          </button>
          <button onClick={reset} className="rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-4 text-sm font-medium text-[#5a4a14]">
            Reset
          </button>
        </div>
      </Card>

      {/* Hasil */}
      {loading && (
        <Card>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-[#a08a2a]" />
            Prime AI Engine sedang memproses gejala…
          </div>
        </Card>
      )}

      {hasil && !loading && (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Hasil Diagnosis AI</div>
              <Pill tone={riskTone(hasil.risk) as "rose" | "amber" | "green"}>Risiko {hasil.risk}</Pill>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{hasil.summary}</p>
            <div className="mt-3 rounded-xl bg-[#fdf2c4] p-3 text-xs">
              <b>Urgensi:</b> {hasil.urgency}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Stethoscope className="h-4 w-4 text-[#a08a2a]" /> Kemungkinan kondisi
            </div>
            <ul className="mt-2 space-y-2">
              {hasil.possible_conditions.map((c, i) => (
                <li key={i} className="rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-[#3a300a]">{c.name}</div>
                    <Pill tone={c.likelihood === "tinggi" ? "rose" : c.likelihood === "sedang" ? "amber" : "green"}>
                      {c.likelihood}
                    </Pill>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{c.reason}</p>
                </li>
              ))}
            </ul>
          </Card>

          {hasil.red_flags.length > 0 && (
            <Card className="border-rose-200 bg-rose-50">
              <div className="flex items-center gap-2 text-sm font-semibold text-rose-700">
                <ShieldAlert className="h-4 w-4" /> Tanda bahaya
              </div>
              <ul className="mt-2 list-disc pl-5 text-xs text-rose-700">
                {hasil.red_flags.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </Card>
          )}

          <Card>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-[#a08a2a]" /> Rekomendasi perawatan
            </div>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              {hasil.recommendations.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </Card>

          <Card>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ChevronRight className="h-4 w-4 text-[#a08a2a]" /> Langkah selanjutnya
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {hasil.next_steps.map((r, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" /> {r}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button onClick={() => toast.success("Booking dibuka")} className="flex-1 rounded-xl bg-[#a08a2a] py-2.5 text-sm font-semibold text-white">
                Booking Dokter
              </button>
              <button onClick={() => toast.info("Chat dokter dibuka")} className="rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-4 text-sm font-medium text-[#5a4a14]">
                Chat Dokter
              </button>
            </div>
          </Card>

          <p className="px-2 text-center text-[11px] text-muted-foreground">{hasil.disclaimer}</p>
        </>
      )}
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



export function PatientProfil() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const callProfile = useServerFn(getMyProfile);
  const callUpdate = useServerFn(updateMyProfile);
  const callBookings = useServerFn(listMyBookings);
  const callCancel = useServerFn(cancelBooking);

  const profileQ = useQuery({ queryKey: ["apps", "profile"], queryFn: () => callProfile() });
  const bookingsQ = useQuery({ queryKey: ["apps", "bookings"], queryFn: () => callBookings() });
  const p = profileQ.data?.profile;

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    nama: "", tgl_lahir: "", jenis_kelamin: "" as "" | "L" | "P",
    telp: "", alamat: "", no_bpjs: "", alergi: "", kontak_darurat: "",
  });

  function startEdit() {
    if (!p) return;
    setForm({
      nama: p.nama || "",
      tgl_lahir: p.tgl_lahir || "",
      jenis_kelamin: (p.jenis_kelamin as "L" | "P" | null) || "",
      telp: p.telp || "",
      alamat: p.alamat || "",
      no_bpjs: p.no_bpjs || "",
      alergi: p.alergi || "",
      kontak_darurat: p.kontak_darurat || "",
    });
    setEdit(true);
  }

  const updateM = useMutation({
    mutationFn: () => callUpdate({
      data: {
        nama: form.nama,
        tgl_lahir: form.tgl_lahir || null,
        jenis_kelamin: form.jenis_kelamin || null,
        telp: form.telp || null,
        alamat: form.alamat || null,
        no_bpjs: form.no_bpjs || null,
        alergi: form.alergi || null,
        kontak_darurat: form.kontak_darurat || null,
      },
    }),
    onSuccess: () => {
      toast.success("Profil disimpan");
      qc.invalidateQueries({ queryKey: ["apps", "profile"] });
      setEdit(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelM = useMutation({
    mutationFn: (id: string) => callCancel({ data: { id } }),
    onSuccess: () => {
      toast.success("Booking dibatalkan");
      qc.invalidateQueries({ queryKey: ["apps", "bookings"] });
      qc.invalidateQueries({ queryKey: ["apps", "queue"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleLogout() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    logout("apps");
    navigate({ to: "/apps/login", replace: true });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Profil Pasien</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kelola data pribadi dan booking Anda.</p>
      </div>

      <Card className="bg-[#a08a2a] text-white">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 text-2xl">👤</div>
          <div className="flex-1 min-w-0">
            <div className="font-bold truncate">{p?.nama || "Pasien"}</div>
            <div className="text-xs opacity-90">Kode: {p?.patient_code || "—"}</div>
          </div>
          <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-[#5a4a14]">Aktif</span>
        </div>
        {!edit && (
          <button onClick={startEdit} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#5a4a14]">
            Edit Profil
          </button>
        )}
      </Card>

      {edit ? (
        <Card>
          <div className="flex items-center justify-between">
            <div className="text-base font-bold">Edit Profil</div>
            <button onClick={() => setEdit(false)} className="rounded-full p-1 hover:bg-[#fdf8e8]" aria-label="Tutup">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Input label="Nama lengkap" value={form.nama} onChange={(v) => setForm({ ...form, nama: v })} />
            <Input label="Tanggal lahir" type="date" value={form.tgl_lahir} onChange={(v) => setForm({ ...form, tgl_lahir: v })} />
            <Select label="Jenis kelamin" value={form.jenis_kelamin} onChange={(v) => setForm({ ...form, jenis_kelamin: v as "L" | "P" | "" })}
              options={[{ v: "", l: "—" }, { v: "L", l: "Laki-laki" }, { v: "P", l: "Perempuan" }]} />
            <Input label="No. HP" value={form.telp} onChange={(v) => setForm({ ...form, telp: v })} />
            <Input label="No. BPJS" value={form.no_bpjs} onChange={(v) => setForm({ ...form, no_bpjs: v })} />
            <Input label="Kontak darurat" value={form.kontak_darurat} onChange={(v) => setForm({ ...form, kontak_darurat: v })} />
            <div className="sm:col-span-2">
              <Input label="Alamat" value={form.alamat} onChange={(v) => setForm({ ...form, alamat: v })} />
            </div>
            <div className="sm:col-span-2">
              <Input label="Alergi" value={form.alergi} onChange={(v) => setForm({ ...form, alergi: v })} />
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => updateM.mutate()}
              disabled={updateM.isPending || !form.nama.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#a08a2a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {updateM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
            </button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="text-base font-bold">Informasi Akun</div>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[#a08a2a]" /> {p?.telp || "Belum diisi"}</li>
            <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[#a08a2a]" /> {p?.alamat || "Belum diisi"}</li>
            <li className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-[#a08a2a]" /> BPJS: {p?.no_bpjs || "—"}</li>
            <li className="flex items-center gap-2"><AlertCircle className="h-3.5 w-3.5 text-[#a08a2a]" /> Alergi: {p?.alergi || "Tidak ada"}</li>
          </ul>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-base font-bold">Booking Saya</div>
          <Link to="/apps/booking" className="text-xs font-semibold text-[#a08a2a]">+ Booking baru</Link>
        </div>
        {bookingsQ.isLoading && <div className="mt-3 text-sm opacity-60"><Loader2 className="inline h-4 w-4 animate-spin" /> Memuat…</div>}
        {bookingsQ.data?.bookings.length === 0 && (
          <div className="mt-3 text-sm opacity-70">Belum ada booking.</div>
        )}
        <ul className="mt-3 space-y-2">
          {bookingsQ.data?.bookings.map((b) => (
            <li key={b.id} className="rounded-xl bg-[#fdf8e8] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{b.dokter_nama}</div>
                  <div className="text-xs text-muted-foreground">{b.tanggal} • {b.jam_slot}</div>
                </div>
                <Pill tone={b.status === "cancelled" ? "rose" : b.status === "done" ? "navy" : b.status === "confirmed" || b.status === "checked_in" ? "green" : "amber"}>
                  {statusLabel(b.status)}
                </Pill>
              </div>
              {(b.status === "pending" || b.status === "confirmed") && (
                <button
                  onClick={() => { if (confirm("Batalkan booking ini?")) cancelM.mutate(b.id); }}
                  disabled={cancelM.isPending}
                  className="mt-2 rounded-md bg-white px-2 py-0.5 text-[11px]"
                >
                  Batalkan
                </button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#e9dfb8] bg-white py-3 text-sm font-semibold text-[#7a6010]">
        <LogOut className="h-4 w-4" /> Keluar Akun
      </button>
    </div>
  );
}

function Input({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <div className="text-xs font-medium opacity-70">{label}</div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-[#e9dfb8] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#a08a2a]"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <label className="block">
      <div className="text-xs font-medium opacity-70">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-[#e9dfb8] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#a08a2a]"
      >
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </label>
  );
}

/* ------------------------------ Laporan ------------------------------ */



export function PatientLaporan() {
  const callInvoices = useServerFn(listMyInvoices);
  const invoicesQ = useQuery({ queryKey: ["apps", "invoices"], queryFn: () => callInvoices() });
  const invoices = invoicesQ.data?.invoices ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold leading-tight">Riwayat & Resep</h1>
            <p className="mt-1 text-sm text-muted-foreground">Daftar pemeriksaan dan resep dari kunjungan Anda.</p>
          </div>
          <button onClick={() => toast.info("Unduh laporan akan tersedia segera")} className="rounded-xl bg-[#fdf2c4] p-3 text-[#7a6010]" aria-label="Unduh">
            <Download className="h-5 w-5" />
          </button>
        </div>
      </Card>

      {invoicesQ.isLoading && (
        <Card><div className="text-sm opacity-60"><Loader2 className="inline h-4 w-4 animate-spin" /> Memuat riwayat…</div></Card>
      )}

      {!invoicesQ.isLoading && invoices.length === 0 && (
        <Card>
          <div className="flex items-center gap-2 text-sm font-semibold"><FileText className="h-4 w-4 text-[#a08a2a]" /> Belum ada riwayat</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Riwayat akan muncul di sini setelah kunjungan Anda dicatat oleh klinik. Belum pernah berkunjung?
          </p>
          <Link to="/apps/booking" className="mt-3 inline-block rounded-xl bg-[#a08a2a] px-4 py-2 text-xs font-semibold text-white">
            Booking Pemeriksaan
          </Link>
        </Card>
      )}

      {invoices.map((inv) => (
        <Card key={inv.id}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] text-muted-foreground">{inv.no_invoice}</div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Stethoscope className="h-4 w-4 text-[#a08a2a]" />
                {new Date(inv.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
            <Pill tone={inv.status === "paid" ? "green" : "amber"}>{inv.status}</Pill>
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {inv.fin_invoice_item?.map((it, i) => (
              <li key={i} className="flex items-center justify-between rounded-md bg-[#fdf8e8] px-3 py-2">
                <span className="truncate">{it.layanan_nama} × {it.qty}</span>
                <span className="text-xs opacity-70">Rp {Number(it.subtotal).toLocaleString("id-ID")}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-[#e9dfb8] pt-3">
            <span className="text-xs text-muted-foreground">Total</span>
            <span className="text-base font-bold">Rp {Number(inv.total).toLocaleString("id-ID")}</span>
          </div>
        </Card>
      ))}

      <Card>
        <div className="text-base font-bold">Butuh bantuan?</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Hubungi klinik jika ada pertanyaan tentang resep atau hasil pemeriksaan.
        </p>
        <div className="mt-3">
          <a href="https://wa.me/6281234567890" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#e9dfb8] bg-white px-4 py-2 text-sm font-semibold text-[#7a6010]">
            <MessageCircle className="h-4 w-4" /> Hubungi Klinik
          </a>
        </div>
      </Card>
    </div>
  );
}
