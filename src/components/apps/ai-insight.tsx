// i18n-lint-disable-file — operator UI.
import { useQuery } from "@tanstack/react-query";
import { Sparkles, AlertTriangle, TrendingUp, Info, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Insight = { tone: "warn" | "info" | "ok"; title: string; detail: string };

export function AIInsightPanel() {
  const q = useQuery({
    queryKey: ["apps", "ai-insight-health"],
    queryFn: async () => {
      const [health, orders, bookings, visits, notifs] = await Promise.all([
        supabase.rpc("app_health_check"),
        supabase.from("apps_order").select("id,status,total_harga,created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("apps_booking").select("id,status,created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("klinik_visit").select("id,status,created_at").order("created_at", { ascending: false }).limit(20),
        supabase.from("apps_notif").select("id,read_at,type,created_at").is("read_at", null).limit(50),
      ]);
      return {
        health: (health.data ?? []) as Array<{ system: string; status: string; last_activity: string | null; detail: string }>,
        orders: orders.data ?? [],
        bookings: bookings.data ?? [],
        visits: visits.data ?? [],
        unreadNotifs: notifs.data ?? [],
      };
    },
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const insights: Insight[] = (() => {
    const out: Insight[] = [];
    if (!q.data) return out;
    const { health, orders, bookings, visits, unreadNotifs } = q.data;

    const degraded = health.filter((h) => h.status !== "online");
    if (degraded.length) {
      out.push({
        tone: "warn",
        title: `${degraded.length} sistem perlu perhatian`,
        detail: degraded.map((d) => `${d.system}: ${d.status}`).join(" · "),
      });
    } else if (health.length) {
      out.push({
        tone: "ok",
        title: "Semua sistem online",
        detail: `Health check: ${health.map((h) => h.system).join(", ")}`,
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter((o: any) => (o.created_at ?? "").startsWith(today));
    if (todayOrders.length) {
      const revenue = todayOrders.reduce((a: number, o: any) => a + Number(o.total_harga ?? 0), 0);
      out.push({
        tone: "info",
        title: `${todayOrders.length} order baru hari ini`,
        detail: `Estimasi nilai: Rp${revenue.toLocaleString("id-ID")}`,
      });
    }

    const pendingBookings = bookings.filter((b: any) => b.status === "pending");
    if (pendingBookings.length) {
      out.push({
        tone: "warn",
        title: `${pendingBookings.length} booking menunggu konfirmasi`,
        detail: "Tinjau di halaman registrasi klinik.",
      });
    }

    const activeVisits = visits.filter((v: any) => ["checked_in", "in_progress"].includes(v.status));
    if (activeVisits.length) {
      out.push({
        tone: "info",
        title: `${activeVisits.length} kunjungan aktif`,
        detail: "Pasien sedang dalam alur pemeriksaan.",
      });
    }

    if (unreadNotifs.length) {
      out.push({
        tone: "info",
        title: `${unreadNotifs.length} notifikasi belum dibaca`,
        detail: "Buka pusat notifikasi untuk meninjau.",
      });
    }

    if (out.length === 0) {
      out.push({ tone: "ok", title: "Tidak ada anomali terdeteksi", detail: "Operasional berjalan normal." });
    }
    return out.slice(0, 5);
  })();

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-surface-muted/60 p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--gradient-accent)] text-navy">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <div className="text-sm font-semibold">AI Insight</div>
          <div className="text-[11px] text-muted-foreground">
            {q.isLoading ? "Memuat data real-time…" : "Berbasis health-check & aktivitas terbaru"}
          </div>
        </div>
      </div>
      {q.isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />)}
        </div>
      ) : (
        <ul className="space-y-3">
          {insights.map((i, idx) => {
            const Icon = i.tone === "warn" ? AlertTriangle : i.tone === "ok" ? TrendingUp : Info;
            const tone =
              i.tone === "warn" ? "text-destructive bg-destructive/10" :
              i.tone === "ok" ? "text-emerald-accent bg-emerald-accent/10" :
              "text-cyan-accent bg-cyan-accent/10";
            return (
              <li key={idx} className="flex gap-3">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="text-sm">
                  <div className="font-medium leading-snug">{i.title}</div>
                  <div className="text-xs text-muted-foreground">{i.detail}</div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
