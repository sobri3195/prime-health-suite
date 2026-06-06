import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { BRAND } from "@/lib/brand";

type Mode = "login" | "signup" | "forgot";

export function PatientAuthForm({ redirect }: { redirect?: string }) {
  const brand = BRAND.apps;
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nama, setNama] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const safeRedirect = redirect && redirect.startsWith("/apps") ? redirect : "/apps";

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/apps`,
            data: { nama },
          },
        });
        if (error) throw error;
        toast.success("Akun dibuat. Cek email Anda untuk verifikasi.");
        setMode("login");
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Selamat datang!");
        navigate({ to: safeRedirect, replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Link reset password dikirim ke email Anda.");
        setMode("login");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses");
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
      toast.error(e instanceof Error ? e.message : "Gagal sign-in Google");
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

          <h1 className="mt-10 text-2xl font-semibold">
            {mode === "signup" ? "Daftar akun pasien" : mode === "forgot" ? "Lupa password" : "Masuk akun pasien"}
          </h1>
          <p className="mt-1.5 text-sm opacity-70">
            {mode === "signup"
              ? "Buat akun untuk booking, lihat resep, dan riwayat pemeriksaan."
              : mode === "forgot"
              ? "Masukkan email Anda untuk menerima link reset password."
              : "Akses jadwal, antrean, dan resep mata Anda."}
          </p>

          {mode !== "forgot" && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                <GoogleIcon /> Lanjutkan dengan Google
              </button>
              <div className="my-5 flex items-center gap-3 text-xs opacity-50">
                <div className="h-px flex-1 bg-black/10" /> atau <div className="h-px flex-1 bg-black/10" />
              </div>
            </>
          )}

          <form className="space-y-3" onSubmit={handleEmail}>
            {mode === "signup" && (
              <Field label="Nama lengkap" icon={UserIcon}>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Nama Anda"
                />
              </Field>
            )}
            <Field label="Email" icon={Mail}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="anda@email.com"
              />
            </Field>
            {mode !== "forgot" && (
              <Field label="Password" icon={Lock}>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Min. 6 karakter"
                />
              </Field>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white shadow disabled:opacity-60"
              style={{ background: brand.accent }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>
                {mode === "signup" ? "Daftar" : mode === "forgot" ? "Kirim link reset" : "Masuk"}
                <ArrowRight className="h-4 w-4" />
              </>}
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
        </div>
      </div>

      <div className="relative hidden overflow-hidden lg:block" style={{ background: brand.accent }}>
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <div className="mb-6 text-7xl">{brand.faviconEmoji}</div>
          <blockquote className="max-w-md text-2xl font-medium leading-snug">{brand.name}</blockquote>
          <div className="mt-2 text-sm text-white/80">{brand.tagline}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-amber-400">
        <Icon className="h-4 w-4 opacity-50" />
        {children}
      </div>
    </label>
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
