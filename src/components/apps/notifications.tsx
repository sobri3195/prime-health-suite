// i18n-lint-disable-file — operator UI; strings tracked separately.
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState, SkeletonList } from "./ui";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type NotifRow = {
  id: string; user_id: string; title: string; body: string | null;
  type: string; deep_link: string | null;
  read_at: string | null; created_at: string;
};

const TYPES = [
  { value: "all", label: "Semua tipe" },
  { value: "info", label: "Info" },
  { value: "reminder", label: "Reminder" },
  { value: "system", label: "Sistem" },
  { value: "promo", label: "Promo" },
];
const STATS = [
  { value: "all", label: "Semua status" },
  { value: "unread", label: "Belum dibaca" },
  { value: "read", label: "Dibaca" },
];

export function NotificationsPage() {
  const { lang } = useI18n();
  const locale = lang === "id" ? "id-ID" : "en-US";
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [typ, setTyp] = useState("all");
  const [st, setSt] = useState("all");

  const [page, setPage] = useState(1);
  const pageSize = 50;

  const notifQ = useQuery({
    queryKey: ["apps", "notif-operator", page],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from("apps_notif")
        .select("id,user_id,title,body,type,deep_link,read_at,created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: (data ?? []) as NotifRow[], total: count ?? 0 };
    },
  });
  const total = notifQ.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Realtime subscribe
  useEffect(() => {
    const ch = supabase.channel("apps-notif-operator")
      .on("postgres_changes", { event: "*", schema: "public", table: "apps_notif" }, () => {
        qc.invalidateQueries({ queryKey: ["apps", "notif-operator"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const markM = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user }, error: ue } = await supabase.auth.getUser();
      if (ue || !user) throw new Error("Sesi berakhir, silakan login ulang");
      // Jangan filter user_id: notif milik pasien lain. Andalkan RLS + cek row affected
      // agar kegagalan izin tidak silent-success.
      const { data, error } = await supabase
        .from("apps_notif")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Tidak berwenang menandai notifikasi ini");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apps", "notif-operator"] }),
    onError: (e: unknown) => toast.error(friendlyError(e)),
  });

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (notifQ.data?.rows ?? []).filter((n) => {
      const isRead = !!n.read_at;
      return (typ === "all" || n.type === typ) &&
        (st === "all" || (st === "read" ? isRead : !isRead)) &&
        (!qq || n.title.toLowerCase().includes(qq) || (n.body ?? "").toLowerCase().includes(qq));
    });
  }, [notifQ.data, q, typ, st]);

  return (
    <PageContainer>
      <PageHeader title="Notifications" desc="Pusat notifikasi seluruh sistem (real-time)." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Cari notifikasi…" />
        <Select value={typ} onChange={setTyp} options={TYPES} />
        <Select value={st} onChange={setSt} options={STATS} />
      </div>

      {notifQ.isLoading ? (
        <SkeletonList rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Tidak ada notifikasi" hint="Coba ubah filter atau kata kunci pencarian." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {filtered.map((n) => {
            const isRead = !!n.read_at;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => !isRead && markM.mutate(n.id)}
                  aria-label={`${!isRead ? "Tandai sudah dibaca: " : ""}${n.title}`}
                  className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <span aria-hidden="true" className={`mt-1 h-2 w-2 shrink-0 rounded-full ${isRead ? "bg-muted-foreground/30" : "bg-cyan-accent"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm ${!isRead ? "font-semibold" : "font-medium text-muted-foreground"}`}>{n.title}</span>
                      <StatusBadge tone={isRead ? "ok" : "info"}>{isRead ? "read" : "unread"}</StatusBadge>
                      <StatusBadge tone="muted">{n.type}</StatusBadge>
                    </div>
                    {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {total > pageSize && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-muted-foreground">Halaman {page} dari {totalPages} · {total} notifikasi</div>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-40">Prev</button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="rounded-md border border-border px-3 py-1 disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
