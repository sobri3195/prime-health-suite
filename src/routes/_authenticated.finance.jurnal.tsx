import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listJournal } from "@/lib/finance-tx.functions";
import { useFinanceDate } from "@/context/finance-date";

export const Route = createFileRoute("/_authenticated/finance/jurnal")({
  head: () => pageHead({ title: 'Jurnal Umum — Finance', description: 'Pencatatan jurnal transaksional dengan auto-posting dan audit trail.', path: '/finance/jurnal' }),
  component: JurnalPage,
});

const fmt = (n: number) => (Number(n) || 0).toLocaleString("id-ID");

function JurnalPage() {
  const { from, to } = useFinanceDate();
  const fn = useServerFn(listJournal);
  const { data, isLoading } = useQuery({ queryKey: ["fin-journal", from, to], queryFn: () => fn({ data: { from, to } }) });
  const rows = data?.rows ?? [];
  const totalDebit = rows.reduce((a: number, r: any) => a + (r.fin_journal_line ?? []).reduce((s: number, l: any) => s + Number(l.debit), 0), 0);
  const totalKredit = rows.reduce((a: number, r: any) => a + (r.fin_journal_line ?? []).reduce((s: number, l: any) => s + Number(l.kredit), 0), 0);

  return (
    <div>
      <PageHeader title="Jurnal Umum" desc="Double-entry, otomatis dari Invoice / Pembayaran / Voucher." />
      <div className="mb-3 grid gap-3 md:grid-cols-3">
        <Kpi label="Jumlah Entry" value={String(rows.length)} />
        <Kpi label="Total Debit" value={fmt(totalDebit)} />
        <Kpi label="Total Kredit" value={fmt(totalKredit)} />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>No. Jurnal</TableHead><TableHead>Tanggal</TableHead><TableHead>Sumber</TableHead>
            <TableHead>Keterangan</TableHead><TableHead>COA</TableHead>
            <TableHead className="text-right">Debit</TableHead><TableHead className="text-right">Kredit</TableHead>
            <TableHead>Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={8} className="py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">Belum ada jurnal.</TableCell></TableRow>
              : rows.flatMap((r: any) => (
                (r.fin_journal_line ?? []).map((l: any, i: number) => (
                  <TableRow key={l.id} className={i === 0 ? "border-t-2 border-border/60" : ""}>
                    <TableCell className="font-mono text-xs">{i === 0 ? r.no_jurnal : ""}</TableCell>
                    <TableCell className="text-xs">{i === 0 ? r.tanggal : ""}</TableCell>
                    <TableCell className="text-xs">{i === 0 ? <Badge variant="secondary">{r.sumber}</Badge> : ""}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{i === 0 ? r.keterangan : ""}</TableCell>
                    <TableCell className="text-xs"><span className="font-mono">{l.coa_code}</span> {l.coa_nama ?? ""}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{Number(l.debit) ? fmt(l.debit) : ""}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{Number(l.kredit) ? fmt(l.kredit) : ""}</TableCell>
                    <TableCell className="text-xs">{i === 0 ? <Badge variant="secondary" className={r.status === "reversed" ? "bg-muted text-muted-foreground" : "bg-emerald-500/15 text-emerald-700"}>{r.status}</Badge> : ""}</TableCell>
                  </TableRow>
                ))
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div></div>;
}
