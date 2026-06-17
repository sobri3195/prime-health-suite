// i18n-lint-disable-file — internal/admin or operator UI; strings tracked separately.
import { useId, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, User as UserIcon, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { PasswordInput } from "@/components/auth/password-input";
import { translateAuthError, DEFAULT_EMAIL, DEFAULT_PASSWORD, IS_PROD } from "@/lib/auth-helpers";

type Mode = "login" | "signup" | "forgot";

export function PatientAuthForm({ redirect }: { redirect?: string }) {
  const brand = BRAND.apps;
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [nama, setNama] = useState("");
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { login: bridgeLogin } = useAuth();
  const emailId = useId();
  const pwId = useId();
  const nameId = useId();
  const errId = useId();


  const safeRedirect = redirect && redirect.startsWith("/apps") ? redirect : "/apps";

  // Anti-bruteforce: client-side rate limit. 5 failed attempts → 60s lockout.
  // Stored in localStorage so refresh doesn't bypass it.
  const RL_KEY = "ph_apps_login_rl_v1";
  const MAX_ATTEMPTS = 5;
  const LOCK_MS = 60_000;

  function readRl(): { fails: number; lockedUntil: number } {
    try {
      const raw = localStorage.getItem(RL_KEY);
      if (!raw) return { fails: 0, lockedUntil: 0 };
      return JSON.parse(raw);
    } catch {
      return { fails: 0, lockedUntil: 0 };
    }
  }
  function writeRl(v: { fails: number; lockedUntil: number }) {
    try { localStorage.setItem(RL_KEY, JSON.stringify(v)); } catch { /* ignore */ }
  }
  function resetRl() { try { localStorage.removeItem(RL_KEY); } catch { /* ignore */ } }
  function checkLock(): number {
    const rl = readRl();
    const left = rl.lockedUntil - Date.now();
    return left > 0 ? left : 0;
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    const left = checkLock();
    if (mode === "login" && left > 0) {
      toast.error(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(left / 1000)} detik.`);
      return;
    }
    setLoading(true);
    const e2 = email.trim().toLowerCase();
    if (e2 !== email) setEmail(e2);
    try {
      if (mode === "signup") {
        if (!consent) {
          toast.error("Anda harus menyetujui Kebijakan Privasi");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: e2,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/apps`,
            data: { nama, consent_marketing: marketing },
          },
        });
        if (error) throw error;
        toast.success("Akun dibuat. Cek email Anda untuk verifikasi.");
        setMode("login");

      } else if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({ email: e2, password });
        if (error) {
          const rl = readRl();
          const fails = rl.fails + 1;
          const lockedUntil = fails >= MAX_ATTEMPTS ? Date.now() + LOCK_MS : 0;
          writeRl({ fails: lockedUntil ? 0 : fails, lockedUntil });
          if (lockedUntil) {
            toast.error(`Login dikunci ${LOCK_MS / 1000} detik setelah ${MAX_ATTEMPTS} percobaan gagal.`);
            throw new Error("Terlalu banyak percobaan gagal.");
          }
          throw error;
        }
        resetRl();
        if (data.user) bridgeLogin("apps", data.user.email || e2, "front_office");
        toast.success("Selamat datang!");
        navigate({ to: safeRedirect, replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(e2, {
          redirectTo: `${window.location.origin}/reset-password?system=apps`,
        });
        if (error) throw error;
        toast.success("Link reset password dikirim ke email Anda.");
        setMode("login");
      }
    } catch (e) {
      const msg = translateAuthError(e instanceof Error ? e.message : "Gagal memproses");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/apps`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate({ to: safeRedirect, replace: true });
    } catch (e) {
      const msg = translateAuthError(e instanceof Error ? e.message : "Gagal sign-in Google");
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  async function handleDemo() {
    setLoading(true);
    const demoEmail = "demo@prime.id";
    const demoPass = "demo1234";
    try {
      let res = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
      if (res.error) {
        // Auto sign-up jika belum ada (auto-confirm aktif)
        const signup = await supabase.auth.signUp({
          email: demoEmail,
          password: demoPass,
          options: { data: { nama: "Demo Pasien", consent_marketing: false } },
        });
        if (signup.error) throw signup.error;
        res = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
        if (res.error) throw res.error;
      }
      if (res.data.user) bridgeLogin("apps", res.data.user.email || demoEmail, "front_office");
      toast.success("Masuk sebagai Demo");
      navigate({ to: safeRedirect, replace: true });
    } catch (e) {
      const msg = translateAuthError(e instanceof Error ? e.message : "Gagal masuk demo");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2" style={{ background: brand.background, color: brand.foreground }}>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg text-xl" style={{ background: brand.accent, color: "#fff" }}>
              {brand.faviconEmoji}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{brand.name}</div>
              <div className="text-[10px] uppercase tracking-widest opacity-60">{brand.tagline}</div>
            </div>
          </div>

  return (
    <div
      className="grid min-h-dvh lg:grid-cols-2"
      style={{ background: brand.background, color: brand.foreground }}
    >
      <main
        className="flex items-center justify-center px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] py-12"
        aria-labelledby="apps-login-heading"
      >
        <div className="w-full max-w-sm">
          <header>
            <div className="inline-flex items-center gap-2">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
                style={{ background: brand.accent, color: "#fff" }}
                aria-hidden
              >
                {brand.faviconEmoji}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{brand.name}</div>
                <div className="text-[10px] uppercase tracking-widest opacity-60">{brand.tagline}</div>
              </div>
            </div>

            <h1 id="apps-login-heading" className="mt-10 text-2xl font-semibold">
              {mode === "signup" ? "Daftar akun pasien" : mode === "forgot" ? "Lupa password" : "Masuk akun pasien"}
            </h1>
            <p className="mt-1.5 text-sm opacity-70">
              {mode === "signup"
                ? "Buat akun untuk booking, lihat resep, dan riwayat pemeriksaan."
                : mode === "forgot"
                ? "Masukkan email Anda untuk menerima link reset password."
                : "Akses jadwal, antrean, dan resep mata Anda."}
            </p>
          </header>

          {mode !== "forgot" && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                type="button"
                aria-busy={loading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <GoogleIcon />}
                Lanjutkan dengan Google
              </button>
              {!IS_PROD && (
                <>
                  <button
                    type="button"
                    onClick={handleDemo}
                    disabled={loading}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-amber-500/60 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                  >
                    Masuk sebagai Demo (demo@prime.id)
                  </button>
                  <div className="mt-2 rounded-md bg-black/5 px-3 py-2 text-[11px] leading-relaxed opacity-80">
                    Akun demo bersama untuk ketiga sistem:
                    <br />
                    <b>Email:</b> demo@prime.id · <b>Password:</b> demo1234
                  </div>
                </>
              )}
              <div className="my-5 flex items-center gap-3 text-xs opacity-50">
                <div className="h-px flex-1 bg-black/10" /> atau <div className="h-px flex-1 bg-black/10" />
              </div>
            </>
          )}

          <form className="space-y-3" onSubmit={handleEmail} noValidate aria-describedby={error ? errId : undefined}>
            {mode === "signup" && (
              <label htmlFor={nameId} className="block">
                <div className="text-xs font-medium opacity-70">Nama lengkap</div>
                <div className="mt-1 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-amber-400">
                  <UserIcon className="h-4 w-4 opacity-50" aria-hidden />
                  <input
                    id={nameId}
                    type="text"
                    required
                    minLength={2}
                    autoComplete="name"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Nama Anda"
                  />
                </div>
              </label>
            )}

            <label htmlFor={emailId} className="block">
              <div className="text-xs font-medium opacity-70">Email</div>
              <div className="mt-1 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-amber-400">
                <Mail className="h-4 w-4 opacity-50" aria-hidden />
                <input
                  id={emailId}
                  type="email"
                  required
                  autoComplete="username"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!error || undefined}
                  aria-describedby={error ? errId : undefined}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="anda@email.com"
                />
              </div>
            </label>

            {mode !== "forgot" && (
              <PasswordInput
                id={pwId}
                value={password}
                onChange={setPassword}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                ariaInvalid={!!error}
                ariaDescribedBy={error ? errId : undefined}
              />
            )}

            {mode === "signup" && (
              <div className="space-y-2 rounded-md border border-black/10 bg-white/60 p-3 text-xs">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>
                    Saya menyetujui{" "}
                    <a href="/privacy" target="_blank" rel="noreferrer" className="font-semibold underline">
                      Kebijakan Privasi
                    </a>{" "}
                    dan pengelolaan data kesehatan saya sesuai UU PDP No. 27/2022.
                  </span>
                </label>
                <label className="flex items-start gap-2 opacity-80">
                  <input
                    type="checkbox"
                    checked={marketing}
                    onChange={(e) => setMarketing(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>Saya bersedia menerima informasi promosi & edukasi mata (opsional).</span>
                </label>
              </div>
            )}

            {error && (
              <div
                id={errId}
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800"
              >
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white shadow disabled:opacity-60"
              style={{ background: brand.accent }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>Memproses…</span>
                </>
              ) : (
                <>
                  {mode === "signup" ? "Daftar" : mode === "forgot" ? "Kirim link reset" : "Masuk"}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 space-y-1.5 text-center text-xs">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("forgot")} className="opacity-70 hover:opacity-100">Lupa password?</button>
                <div>
                  Belum punya akun?{" "}
                  <button onClick={() => setMode("signup")} className="font-semibold underline">Daftar</button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <div>
                Sudah punya akun?{" "}
                <button onClick={() => setMode("login")} className="font-semibold underline">Masuk</button>
              </div>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="opacity-70 hover:opacity-100">← Kembali ke login</button>
            )}
          </div>

          <footer className="mt-6 text-center text-[11px] opacity-60">
            <p className="space-x-3">
              <a href="/privacy" className="underline hover:opacity-100">Kebijakan Privasi</a>
              <span aria-hidden>·</span>
              <a href="/terms" className="underline hover:opacity-100">Syarat Layanan</a>
            </p>
          </footer>
        </div>
      </main>

      <aside className="relative hidden overflow-hidden lg:block" style={{ background: brand.accent }} aria-hidden>
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <div className="mb-6 text-7xl">{brand.faviconEmoji}</div>
          <blockquote className="max-w-md text-2xl font-medium leading-snug">{brand.name}</blockquote>
          <div className="mt-2 text-sm text-white/80">{brand.tagline}</div>
        </div>
      </aside>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.5 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13-5l-6-5.1c-1.9 1.4-4.3 2.2-7 2.2-5.3 0-9.8-3-11.3-7.5l-6.5 5C9.5 39.2 16.1 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.6 5l6 5.1c-.4.4 6.3-4.6 6.3-14.1 0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
