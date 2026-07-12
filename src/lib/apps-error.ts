// Map raw RPC/PostgREST errors into friendly Bahasa Indonesia messages.
// Keep the original message as fallback so nothing is silently swallowed.

const PATTERNS: Array<[RegExp, string]> = [
  [/keranjang kosong/i, "Keranjang belanja masih kosong."],
  [/stok\s+.+\s+(habis|tidak (?:cukup|mencukupi))/i, "Stok tidak mencukupi. Segarkan halaman dan coba lagi."],
  [/produk tidak tersedia/i, "Produk sudah tidak tersedia."],
  [/slot .* sudah (diambil|terisi)/i, "Slot jam ini sudah terisi. Silakan pilih jam lain."],
  [/tanggal .* masa lalu/i, "Tanggal tidak boleh di masa lalu."],
  [/booking tidak ditemukan/i, "Data booking tidak ditemukan."],
  [/not authenticated|jwt|unauthorized/i, "Sesi berakhir. Silakan masuk kembali."],
  [/duplicate key|already exists|unique constraint/i, "Data sudah ada / duplikat."],
  [/permission denied|rls|row-level security|violates row-level/i, "Anda tidak memiliki akses untuk aksi ini."],
  [/foreign key|violates foreign/i, "Data terkait tidak valid."],
  [/network|failed to fetch|timeout/i, "Koneksi bermasalah. Periksa jaringan dan coba lagi."],
  [/rate limit|too many/i, "Terlalu banyak percobaan. Tunggu beberapa saat."],
];

export function friendlyError(err: unknown, fallback = "Terjadi kesalahan. Coba lagi."): string {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : "";
  if (!raw) return fallback;
  for (const [re, msg] of PATTERNS) if (re.test(raw)) return msg;
  // Trim known postgres/postgrest prefixes only (e.g. "PGRST116: ...", "P0001: ...").
  // Do NOT strip arbitrary "word:" — that eats legitimate user text like "Catatan: ...".
  const clean = raw
    .replace(/^(?:PGRST\d+|P\d{4}|[0-9A-Z]{5}|ERROR|Error|error):\s*/, "")
    .split("\n")[0];
  return clean.length > 160 ? fallback : clean;
}
