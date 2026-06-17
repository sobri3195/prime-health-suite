import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ROLE_LABEL, rolesFor, useAuth, type Role, type System } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

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
  const roles = rolesFor(system);
  const [email, setEmail] = useState("demo@prime.id");
  const [password, setPassword] = useState("demo1234");
  const [role, setRole] = useState<Role>(roles[0]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(system, email, role);
    const safe = redirect && redirect.startsWith(`/${system}`) ? redirect : `/${system}`;
    navigate({ to: safe, replace: true });
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

          <h1 className="mt-10 text-2xl font-semibold">Masuk ke {brand.shortName}</h1>
          <p className="mt-1.5 text-sm opacity-70">
            Akses hanya untuk pengguna terdaftar {brand.name}.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2"
                style={{ outlineColor: brand.accent }}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2"
              />
            </Field>
            <Field label="Peran (demo)">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="mt-1.5 w-full rounded-md border border-black/10 bg-white px-3 py-2 text-sm outline-none focus:ring-2"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </Field>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white shadow hover:opacity-95"
              style={{ background: brand.accent }}
            >
              Masuk <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs opacity-50">
            Mock auth — sesi {brand.name} terpisah dari sistem lain.
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}
