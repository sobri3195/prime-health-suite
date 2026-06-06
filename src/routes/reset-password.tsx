import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Lock, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND, faviconDataUrl } from "@/lib/brand";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — Prime Apps" },
      { name: "description", content: "Atur password baru untuk akun pasien Prime Apps." },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "icon", type: "image/svg+xml", href: faviconDataUrl(BRAND.apps.faviconEmoji) }],
  }),
  ssr: false,
  component: Page,
});

function Page() {
  const brand = BRAND.apps;
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase places the recovery token in the URL hash and auto-creates a session
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
      navigate({ to: "/apps/login", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6" style={{ background: brand.background, color: brand.foreground }}>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">Atur password baru</h1>
        <p className="mt-2 text-sm opacity-70">
          {ready ? "Masukkan password baru untuk akun Anda." : "Memvalidasi link recovery…"}
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
