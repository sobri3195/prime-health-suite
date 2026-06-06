import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Activity, ArrowRight } from "lucide-react";
import { ROLE_LABEL, defaultSystemFor, useAuth, type Role } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ redirect: z.string().optional() }).optional(),
  head: () => ({
    meta: [
      { title: "Login — Prime Health Platform" },
      { name: "description", content: "Masuk ke ekosistem Prime Health Platform." },
    ],
  }),
  component: LoginPage,
});

const ROLES = Object.keys(ROLE_LABEL) as Role[];

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("admin@klinikmata.id");
  const [password, setPassword] = useState("demo1234");
  const [role, setRole] = useState<Role>("super_admin");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(email, role);
    const target = search?.redirect && search.redirect.startsWith("/")
      ? search.redirect
      : `/${defaultSystemFor(role)}`;
    navigate({ to: target, replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--gradient-hero)] text-navy-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">Prime Health</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Platform</div>
            </div>
          </Link>

          <h1 className="mt-10 text-2xl font-semibold">Masuk ke akun Anda</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Demo login — pilih peran untuk melihat akses sistem yang sesuai.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <Field label="Email">
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Password">
              <input
                type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </Field>
            <Field label="Peran (demo)">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                ))}
              </select>
            </Field>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-navy-foreground shadow-[var(--shadow-card)] hover:opacity-95"
            >
              Masuk <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Mock auth — ganti dengan Supabase Auth di tahap selanjutnya.
          </p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-[var(--gradient-hero)] lg:block">
        <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(600px 400px at 20% 20%, var(--cyan-accent), transparent), radial-gradient(500px 400px at 80% 80%, var(--emerald-accent), transparent)" }} />
        <div className="relative flex h-full flex-col justify-end p-12 text-navy-foreground">
          <blockquote className="max-w-md text-2xl font-medium leading-snug">
            "Prime Health Platform menyatukan workspace, pelayanan klinis, dan keuangan kami — efisiensi naik signifikan."
          </blockquote>
          <div className="mt-5 text-sm text-navy-foreground/70">
            Direktur Operasional · Klinik Utama Mata
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
