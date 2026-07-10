import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { formatIDR, sumOutstanding } from "@/lib/finance";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { useFinanceDate } from "@/context/finance-date";
import { getProfitLoss, getCashFlow, getTrialBalance, getBalanceSheet } from "@/lib/finance-report.functions";
import { getFinanceDashboard, getBukuBesar, getPajakRekap } from "@/lib/finance-dashboard.functions";

export const Route = createFileRoute("/_authenticated/finance/laporan")({ 
  head: () => pageHead({ title: "Laporan Manajemen — Finance", description: "Laporan Manajemen pada modul keuangan klinik.", path: "/finance/laporan" }),
  component: LaporanPage });

function LaporanPage() {
  const { from, to, label } = useFinanceDate();
  const year = new Date(from || new Date().toISOString()).getFullYear();

  const plFn = useServerFn(getProfitLoss);
  const cfFn = useServerFn(getCashFlow);
  const tbFn = useServerFn(getTrialBalance);
  const bsFn = useServerFn(getBalanceSheet);
  const bbFn = useServerFn(getBukuBesar);
  const dashFn = useServerFn(getFinanceDashboard);
  const taxFn = useServerFn(getPajakRekap);

  const pl = useQuery({ queryKey: ["fin", "pl", from, to], queryFn: () => plFn({ data: { from, to } }) });
  const cf = useQuery({ queryKey: ["fin", "cf", from, to], queryFn: () => cfFn({ data: { from, to } }) });
  const tb = useQuery({ queryKey: ["fin", "tb", from, to], queryFn: () => tbFn({ data: { from, to } }) });
  const bs = useQuery({ queryKey: ["fin", "bs", to], queryFn: () => bsFn({ data: { to } }) });
  const bb = useQuery({ queryKey: ["fin", "bb", from, to], queryFn: () => bbFn({ data: { from, to } }) });
  const dash = useQuery({ queryKey: ["fin", "dash", from, to], queryFn: () => dashFn({ data: { from, to } }) });
  const tax = useQuery({ queryKey: ["fin", "pajak", year], queryFn: () => taxFn({ data: { year } }) });

  const invoices = dash.data?.invoices ?? [];
  const revenue = pl.data?.totalRev ?? 0;
  const opex = pl.data?.totalExp ?? 0;
  const ebitda = revenue - opex;
  const cashIn = cf.data?.details?.filter((d) => d.amount > 0).reduce((a, d) => a + d.amount, 0) ?? 0;
  const cashOut = -(cf.data?.details?.filter((d) => d.amount < 0).reduce((a, d) => a + d.amount, 0) ?? 0);
  const netCash = cf.data?.net ?? 0;

  const csv = (name: string, rows: any[], cols: any[]) => {
    downloadCSV(exportFileName(name, label), toCSV(rows, cols));
    toast.success(`Export ${rows.length} baris (CSV)`);
  };

  return (
    <div>
      <PageHeader title="Laporan Manajemen" desc={`Semua laporan dihitung live dari jurnal posted — periode ${label}.`} />

      <Tabs defaultValue="executive">
        <TabsList className="flex-wrap">
          <TabsTrigger value="executive">Executive</TabsTrigger>
          <TabsTrigger value="rugi-laba">Laba Rugi</TabsTrigger>
          <TabsTrigger value="ebitda">EBITDA</TabsTrigger>
          <TabsTrigger value="arus-kas">Arus Kas</TabsTrigger>
          <TabsTrigger value="neraca-saldo">Neraca Saldo</TabsTrigger>
          <TabsTrigger value="neraca">Neraca</TabsTrigger>
          <TabsTrigger value="bb">Buku Besar</TabsTrigger>
          <TabsTrigger value="pendapatan">Pendapatan</TabsTrigger>
          <TabsTrigger value="piutang">Piutang</TabsTrigger>
          <TabsTrigger value="pajak">Pajak</TabsTrigger>
        </TabsList>

        <TabsContent value="executive">
          <div className="grid gap-3 sm:grid-cols-4">
            {[
              { l: "Pendapatan", v: revenue, c: "text-emerald-600" },
              { l: "Biaya", v: opex, c: "text-rose-600" },
              { l: "EBITDA", v: ebitda },
              { l: "Laba Bersih", v: pl.data?.profit ?? 0, c: (pl.data?.profit ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600" },
              { l: "Outstanding Piutang", v: sumOutstanding(invoices) },
              { l: "Total Pengeluaran", v: dash.data?.expenseAll ?? 0 },
              { l: "Saldo Kas/Bank", v: dash.data?.bankBalance ?? 0 },
              { l: "Net Cash Flow Periode", v: netCash },
            ].map((k) => (
              <div key={k.l} className="rounded-xl border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground">{k.l}</div>
                <div className={`mt-1 text-lg font-semibold ${k.c ?? ""}`}>{formatIDR(k.v)}</div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rugi-laba">
          <ReportCard title="Laba Rugi" onExport={() => csv("laba-rugi",
            [
              { label: "Pendapatan", val: revenue },
              { label: "Beban Operasional", val: -opex },
              { label: "Laba Bersih", val: pl.data?.profit ?? 0 },
            ],
            [{ key: "l", label: "Pos", get: (r: any) => r.label }, { key: "v", label: "Nilai", get: (r: any) => r.val }],
          )}>
            <ReportRow label="Pendapatan" val={revenue} />
            <ReportRow label="Beban Operasional" val={-opex} />
            <ReportRow label="Laba Bersih" val={pl.data?.profit ?? 0} bold />
          </ReportCard>
        </TabsContent>

        <TabsContent value="ebitda">
          <ReportCard title="EBITDA" onExport={() => csv("ebitda",
            [{ label: "EBITDA", val: ebitda }],
            [{ key: "l", label: "Pos", get: (r: any) => r.label }, { key: "v", label: "Nilai", get: (r: any) => r.val }],
          )}>
            <ReportRow label="Pendapatan" val={revenue} />
            <ReportRow label="Total Beban" val={-opex} />
            <ReportRow label="EBITDA" val={ebitda} bold />
            <ReportRow label="Margin EBITDA" val={revenue ? `${((ebitda / revenue) * 100).toFixed(1)}%` : "—"} />
          </ReportCard>
        </TabsContent>

        <TabsContent value="arus-kas">
          <ReportCard title="Arus Kas" onExport={() => csv("arus-kas",
            [
              { label: "Operasional", val: cf.data?.sections.operating ?? 0 },
              { label: "Investasi", val: cf.data?.sections.investing ?? 0 },
              { label: "Pendanaan", val: cf.data?.sections.financing ?? 0 },
              { label: "Net", val: netCash },
            ],
            [{ key: "l", label: "Pos", get: (r: any) => r.label }, { key: "v", label: "Nilai", get: (r: any) => r.val }],
          )}>
            <ReportRow label="Operasional" val={cf.data?.sections.operating ?? 0} />
            <ReportRow label="Investasi" val={cf.data?.sections.investing ?? 0} />
            <ReportRow label="Pendanaan" val={cf.data?.sections.financing ?? 0} />
            <ReportRow label="Arus Masuk" val={cashIn} />
            <ReportRow label="Arus Keluar" val={-cashOut} />
            <ReportRow label="Net Cash Flow" val={netCash} bold />
          </ReportCard>
        </TabsContent>

        <TabsContent value="neraca-saldo">
          <div className="mb-2 flex items-center justify-end gap-2 text-xs">
            <span className="text-muted-foreground">Status:</span>
            {tb.data?.balanced
              ? <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-700">Balanced</span>
              : <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-700">Tidak balanced · selisih {formatIDR(Math.abs((tb.data?.totalDebit ?? 0) - (tb.data?.totalKredit ?? 0)))}</span>}
          </div>
          <ReportTable title="Neraca Saldo (Trial Balance)" rows={tb.data?.rows ?? []} cols={[
            { h: "Akun", get: (r: any) => `${r.code} – ${r.name}` },
            { h: "Debit", align: "right", get: (r: any) => formatIDR(r.debit_bal) },
            { h: "Kredit", align: "right", get: (r: any) => formatIDR(r.kredit_bal) },
          ]} onExport={() => csv("neraca-saldo", tb.data?.rows ?? [], [
            { key: "c", label: "Kode", get: (r: any) => r.code },
            { key: "n", label: "Akun", get: (r: any) => r.name },
            { key: "d", label: "Debit", get: (r: any) => r.debit_bal },
            { key: "k", label: "Kredit", get: (r: any) => r.kredit_bal },
          ])} />
        </TabsContent>

        <TabsContent value="neraca">
          <div className="grid gap-4 md:grid-cols-3">
            <ReportCard title={`Aset (Rp ${(bs.data?.totalAsset ?? 0).toLocaleString("id-ID")})`}>
              {(bs.data?.asset ?? []).map((a: any) => <ReportRow key={a.code} label={`${a.code} ${a.name}`} val={a.amount} />)}
            </ReportCard>
            <ReportCard title={`Liabilitas (Rp ${(bs.data?.totalLiab ?? 0).toLocaleString("id-ID")})`}>
              {(bs.data?.liability ?? []).map((a: any) => <ReportRow key={a.code} label={`${a.code} ${a.name}`} val={a.amount} />)}
            </ReportCard>
            <ReportCard title={`Ekuitas (Rp ${(bs.data?.totalEquity ?? 0).toLocaleString("id-ID")})`}>
              {(bs.data?.equity ?? []).map((a: any) => <ReportRow key={a.code} label={`${a.code} ${a.name}`} val={a.amount} />)}
            </ReportCard>
          </div>
        </TabsContent>

        <TabsContent value="bb">
          <ReportTable title="Buku Besar (Saldo per Akun)" rows={bb.data?.rows ?? []} cols={[
            { h: "Akun", get: (r: any) => `${r.account} – ${r.accountName}` },
            { h: "Saldo Awal", align: "right", get: (r: any) => formatIDR(r.opening) },
            { h: "Debit", align: "right", get: (r: any) => formatIDR(r.debit) },
            { h: "Kredit", align: "right", get: (r: any) => formatIDR(r.credit) },
            { h: "Saldo Akhir", align: "right", get: (r: any) => formatIDR(r.closing) },
          ]} onExport={() => csv("buku-besar", bb.data?.rows ?? [], [
            { key: "a", label: "Akun", get: (r: any) => `${r.account} ${r.accountName}` },
            { key: "o", label: "Saldo Awal", get: (r: any) => r.opening },
            { key: "d", label: "Debit", get: (r: any) => r.debit },
            { key: "c", label: "Kredit", get: (r: any) => r.credit },
            { key: "s", label: "Saldo Akhir", get: (r: any) => r.closing },
          ])} />
        </TabsContent>

        <TabsContent value="pendapatan">
          <ReportTable title="Laporan Pendapatan" rows={invoices} cols={[
            { h: "Invoice", get: (r: any) => r.invoice },
            { h: "Tanggal", get: (r: any) => new Date(r.date).toLocaleDateString("id-ID") },
            { h: "Payer", get: (r: any) => r.payerName },
            { h: "Dokter", get: (r: any) => r.doctor },
            { h: "Layanan", get: (r: any) => r.service },
            { h: "Total", align: "right", get: (r: any) => formatIDR(r.total) },
            { h: "Dibayar", align: "right", get: (r: any) => formatIDR(r.paid) },
            { h: "Status", get: (r: any) => r.status },
          ]} onExport={() => csv("pendapatan", invoices, [
            { key: "i", label: "Invoice", get: (r: any) => r.invoice },
            { key: "d", label: "Tanggal", get: (r: any) => r.date },
            { key: "p", label: "Payer", get: (r: any) => r.payerName },
            { key: "dr", label: "Dokter", get: (r: any) => r.doctor },
            { key: "t", label: "Total", get: (r: any) => r.total },
            { key: "pd", label: "Dibayar", get: (r: any) => r.paid },
            { key: "s", label: "Status", get: (r: any) => r.status },
          ])} />
        </TabsContent>

        <TabsContent value="piutang">
          {(() => {
            const piutang = invoices.filter((i) => i.status === "unpaid" || i.status === "partial" || i.status === "overdue");
            return (
              <ReportTable title="Laporan Piutang" rows={piutang} cols={[
                { h: "Invoice", get: (r: any) => r.invoice },
                { h: "Payer", get: (r: any) => r.payerName },
                { h: "Jatuh Tempo", get: (r: any) => new Date(r.dueDate).toLocaleDateString("id-ID") },
                { h: "Total", align: "right", get: (r: any) => formatIDR(r.total) },
                { h: "Sisa", align: "right", get: (r: any) => formatIDR(r.total - r.paid) },
                { h: "Status", get: (r: any) => r.status },
              ]} onExport={() => csv("piutang", piutang, [
                { key: "i", label: "Invoice", get: (r: any) => r.invoice },
                { key: "p", label: "Payer", get: (r: any) => r.payerName },
                { key: "d", label: "Jatuh Tempo", get: (r: any) => r.dueDate },
                { key: "t", label: "Total", get: (r: any) => r.total },
                { key: "s", label: "Sisa", get: (r: any) => r.total - r.paid },
                { key: "st", label: "Status", get: (r: any) => r.status },
              ])} />
            );
          })()}
        </TabsContent>

        <TabsContent value="pajak">
          <ReportTable title={`Pajak Bulanan ${year}`} rows={tax.data?.rows ?? []} cols={[
            { h: "Periode", get: (r: any) => r.period },
            { h: "Revenue", align: "right", get: (r: any) => formatIDR(r.revenue) },
            { h: "PPN Out (11%)", align: "right", get: (r: any) => formatIDR(r.ppnOut) },
            { h: "PPN In", align: "right", get: (r: any) => formatIDR(r.ppnIn) },
            { h: "PPN Net", align: "right", get: (r: any) => formatIDR(r.ppnNet) },
            { h: "PPh 21 Dokter", align: "right", get: (r: any) => formatIDR(r.pph21) },
          ]} onExport={() => csv("pajak", tax.data?.rows ?? [], [
            { key: "p", label: "Periode", get: (r: any) => r.period },
            { key: "r", label: "Revenue", get: (r: any) => r.revenue },
            { key: "po", label: "PPN Out", get: (r: any) => r.ppnOut },
            { key: "pi", label: "PPN In", get: (r: any) => r.ppnIn },
            { key: "pn", label: "PPN Net", get: (r: any) => r.ppnNet },
            { key: "pph", label: "PPh 21 Dokter", get: (r: any) => r.pph21 },
          ])} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReportCard({ title, children, onExport }: { title: string; children: React.ReactNode; onExport?: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-semibold">{title}</div>
        {onExport && <Button size="sm" variant="outline" className="gap-1" onClick={onExport}><Download className="h-4 w-4" /> CSV</Button>}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ReportRow({ label, val, bold }: { label: string; val: number | string; bold?: boolean }) {
  return (
    <div className={`flex justify-between border-b border-border/40 py-2 ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className="font-mono text-sm">{typeof val === "number" ? formatIDR(val) : val}</span>
    </div>
  );
}

function ReportTable({ title, rows, cols, onExport }: { title: string; rows: any[]; cols: { h: string; align?: "right"; get: (r: any) => any }[]; onExport: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="font-semibold">{title}</div>
        <Button size="sm" variant="outline" className="gap-1" onClick={onExport} disabled={!rows.length}>
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-auto">
        <Table>
          <TableHeader><TableRow>{cols.map((c, i) => <TableHead key={i} className={c.align === "right" ? "text-right" : ""}>{c.h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={cols.length} className="py-10 text-center text-sm text-muted-foreground">Tidak ada data.</TableCell></TableRow>
            ) : rows.slice(0, 200).map((r, i) => (
              <TableRow key={i}>
                {cols.map((c, j) => <TableCell key={j} className={`text-xs ${c.align === "right" ? "text-right font-mono" : ""}`}>{c.get(r)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
