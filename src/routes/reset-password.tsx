import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Lock, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND, faviconDataUrl } from "@/lib/brand";
import type { System } from "@/lib/auth";

const SYSTEMS: System[] = ["apps", "sim-klinik", "finance"];

export const Route = createFileRoute("/reset-password")({
  validateSearch: z.object({
    system: z.enum(["apps", "sim-klinik", "finance"]).optional(),
  }).optional(),
  head: () => ({
    meta: [
      { title: "Reset Password — Prime Health Suite" },
      { name: "description", content: "Atur password baru untuk akun Anda." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "icon", type: "image/svg+xml", href: faviconDataUrl("✦") }],
  }),
  ssr: false,
  component: Page,
});

function Page() {
  const search = Route.useSearch();
  const system: System = (search?.system && SYSTEMS.includes(search.system) ? search.system : "apps") as System;
  const brand = BRAND[system];
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password diperbarui. Silakan masuk kembali.");
      await supabase.auth.signOut();
      navigate({ to: `/${system}/login`, replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: brand.background, color: brand.foreground }}
    >
      <div className="w-full max-w-sm">
        <div className="inline-flex items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
            style={{ background: brand.accent, color: "#fff" }}
          >
            {brand.faviconEmoji}
          </div>
          <div className="text-sm font-semibold">{brand.name}</div>
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Atur password baru</h1>
        <p className="mt-2 text-sm opacity-70">
          {ready ? `Setelah disimpan, Anda akan diarahkan ke login ${brand.shortName}.` : "Memvalidasi link recovery…"}
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <label className="block">
            <div className="text-xs font-medium opacity-70">Password baru</div>
            <div className="mt-1 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2">
              <Lock className="h-4 w-4 opacity-50" />
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                placeholder="Min. 6 karakter"
              />
            </div>
          </label>
          <button
            type="submit"
            disabled={!ready || loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium text-white shadow disabled:opacity-60"
            style={{ background: brand.accent }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Simpan password <ArrowRight className="h-4 w-4" /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
