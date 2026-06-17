import { useId, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, ShieldAlert, CheckCircle2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { ROLE_LABEL, rolesFor, useAuth, type Role, type System } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { getMyRoles } from "@/lib/auth.functions";
import { PasswordInput } from "@/components/auth/password-input";
import { translateAuthError, DEFAULT_EMAIL, DEFAULT_PASSWORD, IS_PROD } from "@/lib/auth-helpers";

type Mode = "login" | "signup" | "forgot";

const OTHER_SYSTEMS: Record<System, System[]> = {
  apps: ["sim-klinik", "finance"],
  "sim-klinik": ["apps", "finance"],
  finance: ["apps", "sim-klinik"],
};

function normEmail(s: string) {
  return s.trim().toLowerCase();
}

export function SystemLoginForm({
  system,
  redirect,
}: {
  system: System;
  redirect?: string;
}) {
  const { login, logout, userFor } = useAuth();
  const navigate = useNavigate();
  const brand = BRAND[system];
  const allowed = rolesFor(system);
  const fetchRoles = useServerFn(getMyRoles);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [password, setPassword] = useState(DEFAULT_PASSWORD);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailId = useId();
  const pwId = useId();
  const errId = useId();

  const safe = redirect && redirect.startsWith(`/${system}`) ? redirect : `/${system}`;
  const otherSessions = OTHER_SYSTEMS[system]
    .map((s) => ({ system: s, user: userFor(s) }))
    .filter((x) => !!x.user);

  async function resolveRoleAndEnter(loginEmail: string) {
    const { roles } = await fetchRoles();
    const role = roles.find((r) => (allowed as string[]).includes(r)) as Role | undefined;
    if (!role) {
      await supabase.auth.signOut();
      throw new Error(
        `Akun ${loginEmail} belum punya peran untuk ${brand.shortName}. Hubungi admin.`,
      );
    }
    login(system, loginEmail, role, { remember });
    toast.success(`Masuk sebagai ${ROLE_LABEL[role]}`);
    navigate({ to: safe, replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const e2 = normEmail(email);
    if (e2 !== email) setEmail(e2);
    setLoading(true);
    setError(null);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(e2, {
          redirectTo: `${window.location.origin}/reset-password?system=${system}`,
        });
        if (error) throw error;
        toast.success("Link reset password dikirim ke email Anda.");
        setMode("login");
        return;
      }
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: e2,
          password,
          options: { emailRedirectTo: `${window.location.origin}/${system}` },
        });
        if (error) throw error;
        const si = await supabase.auth.signInWithPassword({ email: e2, password });
        if (si.error) {
          toast.success("Akun dibuat. Cek email untuk verifikasi, lalu masuk.");
          setMode("login");
          return;
        }
        await resolveRoleAndEnter(e2);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: e2, password });
      if (error) throw error;
      await resolveRoleAndEnter(e2);
    } catch (e) {
      const msg = translateAuthError(e instanceof Error ? e.message : "Gagal masuk");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setError(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/${system}`,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      // Token returned inline (rare on this stack). Resolve role.
      const { data } = await supabase.auth.getUser();
      await resolveRoleAndEnter(normEmail(data.user?.email || ""));
    } catch (e) {
      const msg = translateAuthError(e instanceof Error ? e.message : "Gagal sign-in Google");
      setError(msg);
      toast.error(msg);
      setLoading(false);
    }
  }

  async function handleDemo() {
    setLoading(true);
    setError(null);
    try {
      const demoEmail = "demo@prime.id";
      const demoPass = "demo1234";
      setEmail(demoEmail);
      setPassword(demoPass);
      let res = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
      if (res.error) {
        const su = await supabase.auth.signUp({ email: demoEmail, password: demoPass });
        if (su.error && !/already|registered/i.test(su.error.message)) throw su.error;
        res = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
        if (res.error) {
          throw new Error(
            "Demo gagal. Auto-confirm mungkin nonaktif — buat akun manual atau verifikasi email demo.",
          );
        }
      }
      await resolveRoleAndEnter(demoEmail);
    } catch (e) {
      const msg = translateAuthError(e instanceof Error ? e.message : "Gagal masuk demo");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="grid min-h-screen lg:grid-cols-2"
      style={{ background: brand.background, color: brand.foreground }}
    >
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/login" className="inline-flex items-center gap-2 hover:opacity-80">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
              style={{ background: brand.accent, color: "#fff" }}
            >
              {brand.faviconEmoji}
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{brand.name}</div>
              <div className="text-[10px] uppercase tracking-widest opacity-60">
                {brand.tagline}
              </div>
            </div>
          </Link>

          <h1 className="mt-10 text-2xl font-semibold">
            {mode === "signup"
              ? `Daftar akun ${brand.shortName}`
              : mode === "forgot"
              ? "Lupa password"
              : `Masuk ke ${brand.shortName}`}
          </h1>
          <p className="mt-1.5 text-sm opacity-70">
            {mode === "forgot"
              ? "Masukkan email Anda untuk menerima link reset password."
              : `Peran Anda diverifikasi otomatis dari sistem (RBAC ${brand.shortName}).`}
          </p>

          {/* Cross-system indicator */}
          {otherSessions.length > 0 && mode === "login" && (
            <div className="mt-5 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-xs text-emerald-900">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" /> Anda sudah masuk di sistem lain
              </div>
              <ul className="mt-2 space-y-1">
                {otherSessions.map((o) => (
                  <li key={o.system} className="flex items-center justify-between gap-2">
                    <span>
                      <b>{BRAND[o.system].shortName}</b> — {o.user!.email} ({ROLE_LABEL[o.user!.role]})
                    </span>
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/${o.system}`}
                        className="rounded border border-emerald-300 bg-white px-2 py-0.5 hover:bg-emerald-100"
                      >
                        Buka
                      </Link>
                      <button
                        type="button"
                        onClick={() => logout(o.system)}
                        className="inline-flex items-center gap-0.5 rounded border border-red-200 bg-white px-2 py-0.5 text-red-700 hover:bg-red-50"
                        title="Keluar"
                      >
                        <LogOut className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mode !== "forgot" && (
            <>
              <button
                onClick={handleGoogle}
                disabled={loading}
                type="button"
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border border-black/10 bg-white px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-60"
              >
                <GoogleIcon /> Lanjutkan dengan Google
              </button>
              <div className="my-4 flex items-center gap-3 text-xs opacity-50">
                <div className="h-px flex-1 bg-black/10" /> atau <div className="h-px flex-1 bg-black/10" />
              </div>
            </>
          )}

          <form className="space-y-3" onSubmit={handleSubmit}>
            <Field label="Email" icon={Mail}>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(normEmail(e.target.value))}
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
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Min. 6 karakter"
                />
              </Field>
            )}

            {mode === "login" && (
              <label className="flex items-center gap-2 text-xs opacity-80">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Ingat saya di perangkat ini
              </label>
            )}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800"
              >
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white shadow disabled:opacity-60"
              style={{ background: brand.accent }}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === "signup" ? "Daftar" : mode === "forgot" ? "Kirim link reset" : "Masuk"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={handleDemo}
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-amber-500/60 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
              >
                Masuk sebagai Demo (demo@prime.id)
              </button>
            )}
          </form>

          <div className="mt-5 space-y-1.5 text-center text-xs">
            {mode === "login" && (
              <>
                <button onClick={() => setMode("forgot")} className="opacity-70 hover:opacity-100">
                  Lupa password?
                </button>
                <div>
                  Belum punya akun?{" "}
                  <button onClick={() => setMode("signup")} className="font-semibold underline">
                    Daftar
                  </button>
                </div>
              </>
            )}
            {mode === "signup" && (
              <div>
                Sudah punya akun?{" "}
                <button onClick={() => setMode("login")} className="font-semibold underline">
                  Masuk
                </button>
              </div>
            )}
            {mode === "forgot" && (
              <button onClick={() => setMode("login")} className="opacity-70 hover:opacity-100">
                ← Kembali ke login
              </button>
            )}
          </div>

          <p className="mt-6 text-center text-[11px] opacity-50">
            Sesi {brand.shortName} terpisah per sistem. Peran ditentukan server (tabel user_roles).
          </p>
        </div>
      </div>

      <div
        className="relative hidden overflow-hidden lg:block"
        style={{ background: brand.accent }}
      >
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <div className="text-7xl mb-6">{brand.faviconEmoji}</div>
          <blockquote className="max-w-md text-2xl font-medium leading-snug">
            {brand.name}
          </blockquote>
          <div className="mt-2 text-sm text-white/80">{brand.tagline}</div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="text-xs font-medium opacity-70">{label}</div>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 focus-within:ring-2">
        <Icon className="h-4 w-4 opacity-50" />
        {children}
      </div>
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.5 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.7 6.4 29.1 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 43.5c5 0 9.6-1.9 13-5l-6-5.1c-1.9 1.4-4.3 2.2-7 2.2-5.3 0-9.8-3-11.3-7.5l-6.5 5C9.5 39.2 16.1 43.5 24 43.5z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.6 5l6 5.1c-.4.4 6.3-4.6 6.3-14.1 0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  );
}
