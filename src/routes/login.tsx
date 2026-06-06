import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login — Prime Health Platform" },
      { name: "description", content: "Masuk ke ekosistem Prime Health Platform." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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
            Gunakan kredensial workspace Klinik Utama Mata.
          </p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@klinikmata.id"
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-navy-foreground shadow-[var(--shadow-card)] hover:opacity-95"
            >
              Masuk <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Butuh akses? Hubungi admin workspace Anda.
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
