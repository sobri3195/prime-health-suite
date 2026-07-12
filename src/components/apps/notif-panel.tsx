import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import {
  listMyNotifications, markNotifRead, markAllNotifRead, deleteNotif,
} from "@/lib/apps-patient.functions";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, SkeletonList } from "@/components/apps/ui";
import { useI18n } from "@/lib/i18n";
import { useConfirm } from "@/components/apps/confirm-dialog";
import { sanitizeDeepLink } from "@/lib/safe-url";



/** Realtime subscription untuk notif & queue refresh */
export function useAppsRealtime(userId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!userId) return; // wait until auth hydrates; avoids ghost user_id=eq.undefined subscribe
    const ch = supabase
      .channel(`apps-rt-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "apps_notif", filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ["apps", "notifs"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "apps_booking", filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ["apps", "bookings"] });
        qc.invalidateQueries({ queryKey: ["apps", "queue"] });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "apps_booking" }, () => {
        // Global queue positions can shift on any booking status change;
        // scoped to UPDATE to avoid noisy invalidations on every new booking.
        qc.invalidateQueries({ queryKey: ["apps", "queue"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "apps_order", filter: `user_id=eq.${userId}` }, () => {
        // Order status transitions (pending → packing → shipped → delivered) live-update
        qc.invalidateQueries({ queryKey: ["apps", "orders"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);
}

export function NotifBellBadge() {
  const qc = useQueryClient();
  const callList = useServerFn(listMyNotifications);
  const q = useQuery({ queryKey: ["apps", "notifs"], queryFn: () => callList(), staleTime: 30_000 });
  const unread = q.data?.unread ?? 0;

  // Self-contained realtime so the badge stays live even when parent
  // does not mount useAppsRealtime.
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid || cancelled) return;
      channel = supabase
        .channel(`apps-notif-badge-${uid}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "apps_notif", filter: `user_id=eq.${uid}` }, () => {
          qc.invalidateQueries({ queryKey: ["apps", "notifs"] });
        })
        .subscribe();
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [qc]);

  return (
    <Link to="/apps/notifikasi" className="relative rounded-full border border-[#e9dfb8] p-2 text-[#7a6010]" aria-label="Notifikasi">
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}

export function NotificationsPagePatient() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const confirm = useConfirm();

  const callList = useServerFn(listMyNotifications);
  const callRead = useServerFn(markNotifRead);
  const callReadAll = useServerFn(markAllNotifRead);
  const callDelete = useServerFn(deleteNotif);

  const q = useQuery({ queryKey: ["apps", "notifs"], queryFn: () => callList() });
  const notifs = q.data?.notifs ?? [];
  const unread = q.data?.unread ?? 0;

  const readM = useMutation({
    mutationFn: (id: string) => callRead({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apps", "notifs"] }),
  });
  const readAllM = useMutation({
    mutationFn: () => callReadAll(),
    onSuccess: () => { toast.success(t("notif.mark_all")); qc.invalidateQueries({ queryKey: ["apps", "notifs"] }); },
  });
  const delM = useMutation({
    mutationFn: (id: string) => callDelete({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["apps", "notifs"] }); },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("notif.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unread > 0 ? t("notif.unread", { n: unread }) : t("notif.all_read")}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={() => readAllM.mutate()}
            disabled={readAllM.isPending}
            className="inline-flex items-center gap-1 rounded-xl border border-[#e9dfb8] bg-[#fdf8e8] px-3 py-2 text-xs font-semibold text-[#5a4a14] disabled:opacity-50"
          >
            <CheckCheck className="h-3.5 w-3.5" /> {t("notif.mark_all")}
          </button>
        )}
      </div>

      {q.isLoading && <SkeletonList rows={4} />}

      {!q.isLoading && notifs.length === 0 && (
        <EmptyState
          title={t("notif.empty.title")}
          hint={t("notif.empty.hint")}
        />
      )}


      <ul className="space-y-2">
        {notifs.map((n) => (
          <li
            key={n.id}
            className={`rounded-2xl border p-4 transition ${
              n.read_at ? "border-[#e9dfb8] bg-white" : "border-[#a08a2a]/40 bg-[#fdf8e8]"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#6b5a16]">{n.type}</span>
                  {!n.read_at && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                </div>
                <div className="mt-1 text-sm font-semibold">{n.title}</div>
                {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(n.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  {(() => {
                    const safe = sanitizeDeepLink(n.deep_link);
                    if (!safe) return null;
                    const isExternal = /^https?:/i.test(safe);
                    return (
                      <a
                        href={safe}
                        {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                        onClick={() => { if (!n.read_at) readM.mutate(n.id); }}
                        className="inline-flex min-h-11 items-center text-xs font-semibold text-[#6b5a16]"
                      >
                        {t("notif.open")} →
                      </a>
                    );
                  })()}


                </div>
              </div>
              <div className="flex flex-col gap-1">
                {!n.read_at && (
                  <button onClick={() => readM.mutate(n.id)} className="rounded-full p-1.5 text-[#7a6010] hover:bg-[#f6ecc8]" aria-label="Tandai dibaca">
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button onClick={async () => { if (await confirm({ description: "Hapus notifikasi?", destructive: true, confirmText: "Hapus" })) delM.mutate(n.id); }} className="rounded-full p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Hapus">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
