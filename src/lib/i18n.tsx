// Minimal i18n: ID (default) / EN. No external deps.
// Usage:
//   const { t, lang, setLang } = useI18n();
//   t("nav.home")
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "id" | "en";

const KEY = "pp:lang";

const DICT: Record<Lang, Record<string, string>> = {
  id: {
    "nav.home": "Beranda",
    "nav.ai": "AI",
    "nav.shop": "Belanja",
    "nav.education": "Edukasi",
    "nav.wins": "Daily Wins",
    "nav.chat": "Chat FO",
    "nav.profile": "Profil",
    "nav.privacy": "Privasi & Keamanan",
    "nav.report": "Laporan",
    "common.loading": "Memuat…",
    "common.save": "Simpan",
    "common.cancel": "Batal",
    "common.empty": "Belum ada data",
    "common.theme": "Tema",
    "common.language": "Bahasa",
    "common.light": "Terang",
    "common.dark": "Gelap",
    "profile.title": "Profil Pasien",
    "profile.logout": "Keluar",
    "notif.title": "Notifikasi",
    "notif.unread": "{n} belum dibaca",
    "notif.all_read": "Semua sudah dibaca",
    "notif.mark_all": "Tandai semua",
    "notif.empty.title": "Belum ada notifikasi",
    "notif.empty.hint": "Notifikasi booking, pengingat, dan resep akan muncul di sini.",
    "notif.open": "Buka",
    "history.title": "Riwayat & Resep",
    "history.subtitle": "Daftar kronologis pemeriksaan, tindakan, dan resep dari kunjungan Anda.",
    "history.empty.title": "Belum ada riwayat",
    "history.empty.hint": "Riwayat akan muncul di sini setelah kunjungan Anda dicatat oleh klinik.",
    "history.cta_book": "Booking Pemeriksaan",
    "history.download_resep": "Unduh Resep PDF",
    "history.share": "Bagikan",
    "history.total": "Total",
    "history.need_help": "Butuh bantuan?",
    "history.contact_clinic": "Hubungi Klinik",
    "history.note_doctor": "Catatan dokter",
    "shop.title": "Belanja",
    "shop.subtitle": "Lensa, frame, dan aksesori mata.",
    "shop.cat.all": "Semua",
    "shop.added": "Ditambahkan ke keranjang",
    "shop.empty.title": "Belum ada produk",
    "shop.empty.hint": "Produk akan tampil di sini saat tersedia.",
    "shop.stock_low": "Stok tinggal {n}",
    "cart.title": "Keranjang Saya",
    "cart.back": "Lanjut belanja",
    "cart.empty.title": "Keranjang kosong",
    "cart.empty.hint": "Pilih produk dari katalog untuk menambahkannya.",
    "cart.start_shopping": "Mulai belanja",
    "cart.total": "Total",
    "cart.checkout": "Checkout",
    "cart.removed": "Item dihapus",
    "checkout.title": "Checkout",
    "checkout.back": "Kembali ke keranjang",
    "checkout.address": "Alamat Pengiriman",
    "checkout.address_ph": "Nama jalan, kelurahan, kota, kode pos",
    "checkout.note": "Catatan (opsional)",
    "checkout.method": "Metode Pembayaran",
    "checkout.transfer": "Transfer Bank",
    "checkout.cod": "Bayar di Tempat",
    "checkout.transfer_hint": "Setelah checkout, transfer ke BCA 123-456-7890 a.n. Klinik Prime, lalu konfirmasi via Chat FO.",
    "checkout.total_pay": "Total Bayar",
    "checkout.submit": "Buat Pesanan",
    "checkout.processing": "Memproses…",
    "orders.title": "Pesanan Saya",
    "orders.empty.title": "Belum ada pesanan",
    "orders.empty.hint": "Pesanan Anda akan muncul di sini setelah checkout.",
    "ai.upload_btn": "Unggah / Ambil Foto Mata",
    "ai.uploading": "Mengunggah…",
    "ai.photo_ready": "Foto siap dianalisis",
    "ai.remove_photo": "Hapus foto",
    "ai.processing": "Prime AI Engine sedang memproses gejala…",
    "ai.empty.title": "Belum ada hasil diagnosis",
    "ai.empty.hint": "Lengkapi keluhan, gejala, dan tekan Diagnosis dengan AI untuk memulai.",
    "ai.upload_invalid": "Format harus JPG/PNG/WEBP",
    "ai.upload_max": "Maks 5 MB",
    "ai.upload_failed": "Gagal unggah",
    "ai.upload_ok": "Foto mata terunggah",
    "chat.title": "Helpdesk Prime Apps",
    "chat.online": "● Front Office online (Sen–Sab 08:00–20:00)",
    "chat.placeholder": "Tulis pesan…",
    "chat.from": "Front Office",
    "chat.empty.title": "Belum ada pesan",
    "chat.empty.hint": "Mulai percakapan dengan Front Office.",
    "edu.title": "Edukasi Mata",
    "edu.subtitle": "Artikel kesehatan mata dari tim klinis Prime.",
    "edu.back": "Kembali ke daftar",
    "edu.not_found": "Artikel tidak ditemukan.",
    "edu.empty.title": "Belum ada artikel",
    "edu.empty.hint": "Artikel edukasi akan tampil di sini.",
    "wins.header": "DAILY WINS",
    "wins.points": "poin",
    "wins.tagline": "Kumpulkan poin lewat skrining AI, belanja, dan kontrol berkala. Tukar dengan reward!",
    "wins.voucher": "Kode voucher Anda:",
    "wins.copied": "Disalin",
    "wins.redeemed": "Reward berhasil ditukar!",
    "wins.redeem_title": "Tukar Reward",
    "wins.redeem": "Tukar",
    "wins.out_of_stock": "Habis",
    "wins.not_enough": "Poin kurang",
    "wins.leaderboard": "Leaderboard Minggu Ini",
    "wins.lb_empty": "Belum ada poin minggu ini.",
    "wins.you": "(Anda)",
    "wins.history": "Riwayat Penukaran",
    "wins.history_empty": "Belum ada penukaran.",
  },
  en: {
    "nav.home": "Home",
    "nav.ai": "AI",
    "nav.shop": "Shop",
    "nav.education": "Education",
    "nav.wins": "Daily Wins",
    "nav.chat": "Chat",
    "nav.profile": "Profile",
    "nav.privacy": "Privacy & Security",
    "nav.report": "Reports",
    "common.loading": "Loading…",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.empty": "No data yet",
    "common.theme": "Theme",
    "common.language": "Language",
    "common.light": "Light",
    "common.dark": "Dark",
    "profile.title": "Patient Profile",
    "profile.logout": "Logout",
    "notif.title": "Notifications",
    "notif.unread": "{n} unread",
    "notif.all_read": "All caught up",
    "notif.mark_all": "Mark all read",
    "notif.empty.title": "No notifications yet",
    "notif.empty.hint": "Booking, reminders, and prescription alerts will show up here.",
    "notif.open": "Open",
    "history.title": "History & Prescriptions",
    "history.subtitle": "Chronological list of your visits, treatments, and prescriptions.",
    "history.empty.title": "No history yet",
    "history.empty.hint": "Your history will appear here after the clinic records your visit.",
    "history.cta_book": "Book an Exam",
    "history.download_resep": "Download Prescription PDF",
    "history.share": "Share",
    "history.total": "Total",
    "history.need_help": "Need help?",
    "history.contact_clinic": "Contact Clinic",
    "history.note_doctor": "Doctor's note",
    "shop.title": "Shop",
    "shop.subtitle": "Lenses, frames, and eye accessories.",
    "shop.cat.all": "All",
    "shop.added": "Added to cart",
    "shop.empty.title": "No products yet",
    "shop.empty.hint": "Products will appear here when available.",
    "shop.stock_low": "Only {n} left in stock",
    "cart.title": "My Cart",
    "cart.back": "Continue shopping",
    "cart.empty.title": "Your cart is empty",
    "cart.empty.hint": "Pick a product from the catalog to add it here.",
    "cart.start_shopping": "Start shopping",
    "cart.total": "Total",
    "cart.checkout": "Checkout",
    "cart.removed": "Item removed",
    "checkout.title": "Checkout",
    "checkout.back": "Back to cart",
    "checkout.address": "Shipping Address",
    "checkout.address_ph": "Street, area, city, postal code",
    "checkout.note": "Note (optional)",
    "checkout.method": "Payment Method",
    "checkout.transfer": "Bank Transfer",
    "checkout.cod": "Cash on Delivery",
    "checkout.transfer_hint": "After checkout, transfer to BCA 123-456-7890 (Klinik Prime) and confirm via Chat FO.",
    "checkout.total_pay": "Total Due",
    "checkout.submit": "Place Order",
    "checkout.processing": "Processing…",
    "orders.title": "My Orders",
    "orders.empty.title": "No orders yet",
    "orders.empty.hint": "Your orders will appear here after checkout.",
    "ai.upload_btn": "Upload / Capture Eye Photo",
    "ai.uploading": "Uploading…",
    "ai.photo_ready": "Photo ready for analysis",
    "ai.remove_photo": "Remove photo",
    "ai.processing": "Prime AI Engine is analyzing your symptoms…",
    "ai.empty.title": "No diagnosis yet",
    "ai.empty.hint": "Fill in symptoms and press Diagnose with AI to start.",
    "ai.upload_invalid": "Format must be JPG/PNG/WEBP",
    "ai.upload_max": "Max 5 MB",
    "ai.upload_failed": "Upload failed",
    "ai.upload_ok": "Eye photo uploaded",
    "chat.title": "Helpdesk Prime Apps",
    "chat.online": "● Front Office online (Mon–Sat 08:00–20:00)",
    "chat.placeholder": "Write a message…",
    "chat.from": "Front Office",
    "chat.empty.title": "No messages yet",
    "chat.empty.hint": "Start a conversation with the Front Office.",
    "edu.title": "Eye Education",
    "edu.subtitle": "Eye health articles from the Prime clinical team.",
    "edu.back": "Back to list",
    "edu.not_found": "Article not found.",
    "edu.empty.title": "No articles yet",
    "edu.empty.hint": "Education articles will appear here.",
    "wins.header": "DAILY WINS",
    "wins.points": "points",
    "wins.tagline": "Earn points via AI screenings, shopping, and routine check-ups. Redeem for rewards!",
    "wins.voucher": "Your voucher code:",
    "wins.copied": "Copied",
    "wins.redeemed": "Reward redeemed!",
    "wins.redeem_title": "Redeem Reward",
    "wins.redeem": "Redeem",
    "wins.out_of_stock": "Out of stock",
    "wins.not_enough": "Not enough points",
    "wins.leaderboard": "This Week's Leaderboard",
    "wins.lb_empty": "No points yet this week.",
    "wins.you": "(You)",
    "wins.history": "Redemption History",
    "wins.history_empty": "No redemptions yet.",
  },
};

function getStored(): Lang {
  if (typeof window === "undefined") return "id";
  const v = window.localStorage.getItem(KEY);
  return v === "en" ? "en" : "id";
}

type TVars = Record<string, string | number>;
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (key: string, vars?: TVars) => string };
const I18nContext = createContext<Ctx | null>(null);

function format(template: string, vars?: TVars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : `{${k}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("id");

  useEffect(() => {
    const stored = getStored();
    setLangState(stored);
    document.documentElement.setAttribute("lang", stored);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, l);
    document.documentElement.setAttribute("lang", l);
  }, []);

  const t = useCallback(
    (key: string, vars?: TVars) => format(DICT[lang][key] ?? DICT.id[key] ?? key, vars),
    [lang],
  );

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for components rendered outside the provider (e.g. SSR shell)
    return { lang: "id", setLang: () => {}, t: (k, vars) => format(DICT.id[k] ?? k, vars) };
  }
  return ctx;
}
