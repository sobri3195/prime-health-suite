import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinanceDate } from "@/context/finance-date";
import { reconJurnal, reconUnposted, postingAudit } from "@/lib/finance-recon-jurnal.functions";

export const Route = createFileRoute("/_authenticated/finance/konsistensi-jurnal")({
  component: Page,
});

const fmt = (n: number) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

const sumberLabel: Record<string, string> = {
  pembayaran: "Pembayaran Invoice",
  expense: "Pengeluaran / Voucher",
  bukti_setor: "Setoran Bank",
  invoice: "Invoice / Piutang",
};

function Page() {
  const { from, to } = useFinanceDate();
  const reconFn = useServerFn(reconJurnal);
  const unpostedFn = useServerFn(reconUnposted);
  const auditFn = useServerFn(postingAudit);

  const recon = useQuery({ queryKey: ["recon-jurnal", from, to], queryFn: () => reconFn({ data: { from, to } }) });
  const unposted = useQuery({ queryKey: ["recon-unposted", from, to], queryFn: () => unpostedFn({ data: { from, to } }) });
  const audit = useQuery({ queryKey: ["posting-audit", from, to], queryFn: () => auditFn({ data: { from, to, limit: 200 } }) });

  const rows: any[] = recon.data?.rows ?? [];
  const totalSelisih = rows.reduce((a, r) => a + Math.abs(Number(r.selisih) || 0), 0);
  const totalUnposted = rows.reduce((a, r) => a + Number(r.unposted_count || 0), 0);
  const allConsistent = totalSelisih === 0 && totalUnposted === 0 && rows.length > 0;

  return (
    <div>
      <PageHeader
        title="Konsistensi Jurnal"
        desc="Bandingkan total transaksi live (pembayaran, pengeluaran, setoran, invoice) dengan ringkasan jurnal & buku besar. Setiap selisih atau transaksi unposted ditampilkan untuk ditindaklanjuti."
      />
      <div className="mb-3 flex justify-end">
        <Button variant="outline" size="sm" onClick={() => { recon.refetch(); unposted.refetch(); audit.refetch(); }} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <div className={`rounded-xl border p-4 ${allConsistent ? "border-emerald-500/40 bg-emerald-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
          <div className="flex items-center gap-2 text-xs font-semibold">
            {allConsistent ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
            Status Rekonsiliasi
          </div>
          <div className="mt-1 text-lg font-semibold">{allConsistent ? "Konsisten" : "Perlu Diperiksa"}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Total Selisih (|live − ledger|)</div>
          <div className={`mt-1 text-lg font-semibold ${totalSelisih === 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(totalSelisih)}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Transaksi Unposted</div>
          <div className={`mt-1 text-lg font-semibold ${totalUnposted === 0 ? "text-emerald-600" : "text-amber-600"}`}>{totalUnposted}</div>
        </div>
      </div>

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold">Ringkasan per Sumber</h3>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sumber</TableHead>
                <TableHead className="text-right">Live (#)</TableHead>
                <TableHead className="text-right">Live Total</TableHead>
                <TableHead className="text-right">Posted</TableHead>
                <TableHead className="text-right">Jurnal Total</TableHead>
                <TableHead className="text-right">Buku Besar</TableHead>
                <TableHead className="text-right">Selisih</TableHead>
                <TableHead className="text-right">Unposted</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recon.isLoading ? (
                <TableRow><TableCell colSpan={9} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">Belum ada transaksi pada periode ini.</TableCell></TableRow>
              ) : rows.map((r) => {
                const selisih = Number(r.selisih) || 0;
                const ok = selisih === 0 && Number(r.unposted_count) === 0;
                return (
                  <TableRow key={r.sumber}>
                    <TableCell className="font-semibold">{sumberLabel[r.sumber] ?? r.sumber}</TableCell>
                    <TableCell className="text-right font-mono">{r.live_count}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.live_total)}</TableCell>
                    <TableCell className="text-right font-mono">{r.posted_count}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.posted_total)}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(r.ledger_total)}</TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${selisih === 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(selisih)}</TableCell>
                    <TableCell className="text-right font-mono">{r.unposted_count}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ok ? "bg-emerald-500/15 text-emerald-700" : "bg-amber-500/15 text-amber-700"}>
                        {ok ? "OK" : "Periksa"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="mb-2 text-sm font-semibold">Transaksi Unposted (perlu di-post)</h3>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sumber</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Referensi</TableHead>
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unposted.isLoading ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              ) : (unposted.data?.rows ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-emerald-700">✓ Semua transaksi sudah ter-posting ke jurnal.</TableCell></TableRow>
              ) : (unposted.data?.rows ?? []).map((r: any) => (
                <TableRow key={r.sumber + r.id}>
                  <TableCell><Badge variant="outline">{sumberLabel[r.sumber] ?? r.sumber}</Badge></TableCell>
                  <TableCell>{r.tanggal}</TableCell>
                  <TableCell className="font-mono text-xs">{r.ref_no}</TableCell>
                  <TableCell className="text-sm">{r.keterangan}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold">Audit Trail Posting Jurnal</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Menampilkan trigger / server-function yang membentuk setiap entri jurnal pada periode ini.
        </p>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Jurnal</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Referensi</TableHead>
                <TableHead>Dipost oleh</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.isLoading ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              ) : (audit.data?.rows ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">Belum ada entri jurnal pada periode ini.</TableCell></TableRow>
              ) : (audit.data?.rows ?? []).map((r: any) => (
                <TableRow key={r.journal_id}>
                  <TableCell className="font-mono text-xs">{r.no_jurnal}</TableCell>
                  <TableCell>{r.tanggal}</TableCell>
                  <TableCell><Badge variant="outline">{r.sumber}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{r.ref_no ?? "-"}</TableCell>
                  <TableCell><span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{r.posted_by}</span></TableCell>
                  <TableCell className="text-xs">{r.posted_at ? new Date(r.posted_at).toLocaleString("id-ID") : "-"}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(r.total)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={r.journal_status === "posted" ? "bg-emerald-500/15 text-emerald-700" : "bg-muted text-muted-foreground"}>
                      {r.journal_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
