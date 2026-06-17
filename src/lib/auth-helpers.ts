// Helpers for auth UX: error translation & default credentials gating.

export function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email atau password salah.";
  if (m.includes("email not confirmed")) return "Email belum diverifikasi. Cek inbox Anda.";
  if (m.includes("user already registered") || m.includes("already registered"))
    return "Email sudah terdaftar. Silakan masuk.";
  if (m.includes("password should be at least")) return "Password minimal 6 karakter.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Terlalu banyak percobaan. Coba lagi nanti.";
  if (m.includes("network") || m.includes("failed to fetch"))
    return "Koneksi gagal. Periksa internet Anda.";
  if (m.includes("invalid email")) return "Format email tidak valid.";
  if (m.includes("unauthorized")) return "Sesi berakhir. Silakan masuk ulang.";
  return msg;
}

// In development we prefill demo credentials; in production we leave inputs empty
// to avoid leaking demo accounts to real clients.
export const IS_PROD = import.meta.env.PROD;
export const DEFAULT_EMAIL = IS_PROD ? "" : "demo@prime.id";
export const DEFAULT_PASSWORD = IS_PROD ? "" : "demo1234";
