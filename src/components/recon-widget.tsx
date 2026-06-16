import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, AlertTriangle, Bell, TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import { reconWidget } from "@/lib/finance-recon-jurnal.functions";
import { useFinanceDate } from "@/context/finance-date";

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

const sumberLabel: Record<string, string> = {
  pembayaran: "Pembayaran",
  expense: "Pengeluaran",
  bukti_setor: "Setoran",
  invoice: "Invoice",
};

function Delta({ now, prev }: { now: number; prev: number }) {
  if (prev === 0 && now === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600"><Minus className="h-3 w-3" /> 0</span>;
  if (prev === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-rose-600"><TrendingUp className="h-3 w-3" /> baru</span>;
  const pct = Math.round(((now - prev) / Math.max(1, prev)) * 100);
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const tone = pct > 0 ? "text-rose-600" : pct < 0 ? "text-emerald-600" : "text-muted-foreground";
  return <span className={`inline-flex items-center gap-0.5 text-xs ${tone}`}><Icon className="h-3 w-3" /> {pct > 0 ? "+" : ""}{pct}%</span>;
}

export function ReconWidget() {
  const { from, to, label } = useFinanceDate();
  const call = useServerFn(reconWidget);
  const { data, isLoading } = useQuery({
    queryKey: ["recon-widget", from, to],
    queryFn: () => call({ data: { from, to } }),
  });

  const allOk = !isLoading && data && data.totalSelisih === 0 && data.totalUnposted === 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight">Konsistensi Jurnal</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Auto-journal • {label}</p>
        </div>
        <Link
          to="/finance/konsistensi-jurnal"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted"
        >
          Buka <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading || !data ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-xl border p-3 ${allOk ? "border-emerald-500/40 bg-emerald-500/10" : data.totalSelisih > 0 ? "border-rose-500/40 bg-rose-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
              <div className="flex items-center gap-1 text-[11px] font-medium">
                {allOk ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                Selisih
              </div>
              <div className={`mt-1 text-base font-semibold ${data.totalSelisih === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {fmt(data.totalSelisih)}
              </div>
              <Delta now={data.totalSelisih} prev={data.prevSelisih} />
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="text-[11px] font-medium text-muted-foreground">Unposted</div>
              <div className={`mt-1 text-base font-semibold ${data.totalUnposted === 0 ? "text-emerald-600" : "text-amber-600"}`}>
                {data.totalUnposted}
              </div>
              <Delta now={data.totalUnposted} prev={data.prevUnposted} />
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <Bell className="h-3.5 w-3.5" /> Overdue
              </div>
              <div className={`mt-1 text-base font-semibold ${data.overdueCount === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {data.overdueCount}
              </div>
              <div className="text-[11px] text-muted-foreground">SLA &gt; {data.slaHours}j</div>
            </div>
          </div>

          {data.perSumber.some((s) => s.selisih > 0 || s.unposted > 0) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.perSumber.filter((s) => s.selisih > 0 || s.unposted > 0).map((s) => (
                <Badge key={s.sumber} variant="outline" className="gap-1 text-[10px]">
                  {sumberLabel[s.sumber] ?? s.sumber}
                  {s.selisih > 0 && <span className="text-rose-600">Δ {fmt(s.selisih)}</span>}
                  {s.unposted > 0 && <span className="text-amber-600">{s.unposted} unposted</span>}
                </Badge>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
