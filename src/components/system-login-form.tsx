import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowRight, Loader2, Mail, Lock, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, rolesFor, useAuth, type Role, type System } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { getMyRoles } from "@/lib/auth.functions";

type Mode = "login" | "signup" | "forgot";

export function SystemLoginForm({
  system,
  redirect,
}: {
  system: System;
  redirect?: string;
}) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const brand = BRAND[system];
  const allowed = rolesFor(system);
  const fetchRoles = useServerFn(getMyRoles);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("demo@prime.id");
  const [password, setPassword] = useState("demo1234");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safe = redirect && redirect.startsWith(`/${system}`) ? redirect : `/${system}`;

  async function resolveRoleAndEnter() {
    const { roles } = await fetchRoles();
    const role = roles.find((r) => (allowed as string[]).includes(r)) as Role | undefined;
    if (!role) {
      await supabase.auth.signOut();
      throw new Error(
        `Akun Anda belum punya peran untuk ${brand.shortName}. Hubungi admin.`,
      );
    }
    login(system, email, role);
    toast.success(`Masuk sebagai ${ROLE_LABEL[role]}`);
    navigate({ to: safe, replace: true });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password?system=${system}`,
        });
        if (error) throw error;
        toast.success("Link reset password dikirim ke email Anda.");
        setMode("login");
        return;
      }
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/${system}` },
        });
        if (error) throw error;
        // try immediate sign-in (auto-confirm enabled)
        const si = await supabase.auth.signInWithPassword({ email, password });
        if (si.error) {
          toast.success("Akun dibuat. Cek email untuk verifikasi, lalu masuk.");
          setMode("login");
          return;
        }
        await resolveRoleAndEnter();
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await resolveRoleAndEnter();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal masuk";
      setError(msg);
      toast.error(msg);
    } finally {
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
        if (su.error) throw su.error;
        res = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPass });
        if (res.error) throw res.error;
      }
      await resolveRoleAndEnter();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal masuk demo";
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
          <div className="inline-flex items-center gap-2">
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
          </div>

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

          <form className="mt-8 space-y-3" onSubmit={handleSubmit}>
            <Field label="Email" icon={Mail}>
              <input
                type="email"
                required
                autoComplete="email"
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
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Min. 6 karakter"
                />
              </Field>
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
