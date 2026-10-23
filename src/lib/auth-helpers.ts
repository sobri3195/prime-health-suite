// Helpers for auth UX: error translation & default credentials gating.
import { DEMO_ACCOUNT } from "./demo-account";

export function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("missing supabase environment variable"))
    return "Layanan login belum dikonfigurasi. Hubungi administrator.";
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

// Prefill the shared demo in development; production fields remain empty.
// Demo buttons use their own explicit deployment setting.
export const IS_PROD = import.meta.env.PROD;
export const DEFAULT_EMAIL = IS_PROD ? "" : DEMO_ACCOUNT.email;
export const DEFAULT_PASSWORD = IS_PROD ? "" : DEMO_ACCOUNT.password;
