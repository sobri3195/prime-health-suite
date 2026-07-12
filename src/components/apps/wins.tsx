import { friendlyError } from "@/lib/apps-error";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Trophy, Gift, Sparkles, Copy } from "lucide-react";
import { getMyPoin, getLeaderboard, listReward, redeemReward, listMyRedeem } from "@/lib/apps-gami.functions";
import { useI18n } from "@/lib/i18n";
import { SkeletonList, EmptyState } from "@/components/apps/ui";

export function PatientWins() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const callPoin = useServerFn(getMyPoin);
  const callBoard = useServerFn(getLeaderboard);
  const callReward = useServerFn(listReward);
  const callRedeem = useServerFn(redeemReward);
  const callMyRedeem = useServerFn(listMyRedeem);
  const [period, setPeriod] = useState<"week" | "month" | "all">("week");
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PAGE_SIZE = 10;
  const poinQ = useQuery({ queryKey: ["apps", "poin"], queryFn: () => callPoin() });
  const boardQ = useQuery({ queryKey: ["apps", "leaderboard", period], queryFn: () => callBoard({ data: { period } }) });
  const rewardQ = useQuery({ queryKey: ["apps", "reward"], queryFn: () => callReward() });
  const myRedeemQ = useQuery({
    queryKey: ["apps", "my-redeem", historyPage],
    queryFn: () => callMyRedeem({ data: { page: historyPage, pageSize: HISTORY_PAGE_SIZE } }),
  });
  const [voucher, setVoucher] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: (id: string) => callRedeem({ data: { reward_id: id } }),
    onSuccess: (r) => {
      setVoucher(r.kode_voucher);
      toast.success(t("wins.redeemed"));
      qc.invalidateQueries({ queryKey: ["apps", "poin"] });
      qc.invalidateQueries({ queryKey: ["apps", "reward"] });
      qc.invalidateQueries({ queryKey: ["apps", "my-redeem"] });
    },
    onError: (e: Error) => toast.error(friendlyError(e)),
  });

  const total = poinQ.data?.total ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[#a08a2a] to-[#7a6010] p-5 text-white shadow-sm">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] opacity-90">
          <Sparkles className="h-3 w-3" /> {t("wins.header")}
        </div>
        <div className="mt-2 text-4xl font-bold">{total} <span className="text-base font-normal">{t("wins.points")}</span></div>
        <p className="mt-1 text-xs opacity-90">{t("wins.tagline")}</p>
      </div>

      {voucher && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs font-semibold text-emerald-700">{t("wins.voucher")}</div>
          <div className="mt-1 flex items-center gap-2">
            <code className="text-lg font-bold text-emerald-900">{voucher}</code>
            <button onClick={async () => {
              try { await navigator.clipboard.writeText(voucher); toast.success(t("wins.copied")); }
              catch { toast.error(friendlyError(new Error("Clipboard tidak tersedia"))); }
            }}
              aria-label={t("wins.copied")}
              className="rounded-md p-1 hover:bg-emerald-100"><Copy className="h-4 w-4 text-emerald-700" /></button>
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-base font-semibold">{t("wins.redeem_title")}</h3>
        {rewardQ.isLoading ? <SkeletonList rows={2} /> : (rewardQ.data?.reward ?? []).length === 0 ? (
          <EmptyState title={t("common.empty")} />
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(rewardQ.data?.reward ?? []).map((r: any) => {
              const bisa = total >= r.harga_poin && r.stok > 0;
              return (
                <div key={r.id} className="rounded-2xl border border-[#e9dfb8] bg-white p-4">
                  <div className="flex items-start gap-2"><Gift className="h-5 w-5 text-[#6b5a16]" />
                    <div className="flex-1">
                      <div className="text-sm font-bold">{r.nama}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{r.deskripsi}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-sm font-bold text-[#6b5a16]">{r.harga_poin} {t("wins.points")}</div>
                    <button disabled={!bisa || m.isPending} onClick={() => m.mutate(r.id)}
                      className="rounded-full bg-[#1f1d19] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
                      {!bisa ? (r.stok < 1 ? t("wins.out_of_stock") : t("wins.not_enough")) : t("wins.redeem")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-base font-semibold"><Trophy className="h-4 w-4 text-[#6b5a16]" /> {t("wins.leaderboard")}</h3>
          <div className="inline-flex rounded-full border border-[#e9dfb8] bg-white p-0.5 text-[11px]">
            {(["week", "month", "all"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`rounded-full px-2.5 py-1 font-semibold ${period === p ? "bg-[#a08a2a] text-white" : "text-[#6b5a16]"}`}>
                {p === "week" ? "Minggu" : p === "month" ? "Bulan" : "Semua"}
              </button>
            ))}
          </div>
        </div>
        {boardQ.isLoading ? <SkeletonList rows={3} /> : (
          <div className="rounded-2xl border border-[#e9dfb8] bg-white p-2">
            {(boardQ.data?.board ?? []).length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">{t("wins.lb_empty")}</div>
            )}
            {(boardQ.data?.board ?? []).map((b) => (
              <div key={b.rank} className={`flex items-center justify-between rounded-xl p-2 ${b.is_me ? "bg-[#fdf2c4]" : ""}`}>
                <div className="flex items-center gap-3">
                  <div className="w-6 text-center text-sm font-bold text-[#6b5a16]">{b.rank}</div>
                  <div className="text-sm">{b.nama_mask} {b.is_me && <span className="text-[10px] text-[#6b5a16]">{t("wins.you")}</span>}</div>
                </div>
                <div className="text-sm font-bold">{b.total_poin}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-base font-semibold">{t("wins.history")}</h3>
        {myRedeemQ.isLoading ? <SkeletonList rows={2} /> : (myRedeemQ.data?.redeem ?? []).length === 0 ? (
          <div className="text-xs text-muted-foreground">{t("wins.history_empty")}</div>
        ) : (
          <div className="space-y-1">
            {myRedeemQ.data!.redeem.slice(0, historyLimit).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-[#e9dfb8] bg-white p-3 text-sm">
                <div>
                  <div className="font-semibold">{r.reward?.nama}</div>
                  <code className="text-xs text-[#6b5a16]">{r.kode_voucher}</code>
                </div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("id-ID")}</div>
              </div>
            ))}
            {myRedeemQ.data!.redeem.length > historyLimit && (
              <button
                type="button"
                onClick={() => setHistoryLimit((n) => n + 10)}
                className="mt-2 w-full rounded-xl border border-[#e9dfb8] bg-white py-2 text-xs font-semibold text-[#6b5a16] hover:bg-[#fdf8e8]"
              >
                {t("common.loading").replace("…", "")} +10
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
