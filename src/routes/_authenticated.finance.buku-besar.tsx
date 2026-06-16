import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/finance";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { useFinanceDate } from "@/context/finance-date";
import { getBukuBesar } from "@/lib/finance-dashboard.functions";
import { FinanceDrillDialog } from "@/components/finance-drill-dialog";

export const Route = createFileRoute("/_authenticated/finance/buku-besar")({ component: BukuBesarPage });

function BukuBesarPage() {
  const { from, to, label } = useFinanceDate();
  const [accountCode, setAccountCode] = useState<string>("all");
  const [drill, setDrill] = useState<{ code: string; name: string } | null>(null);

  const call = useServerFn(getBukuBesar);
  const q = useQuery({
    queryKey: ["fin", "buku-besar", from, to],
    queryFn: () => call({ data: { from, to } }),
  });

  const rows = q.data?.rows ?? [];
  const filtered = useMemo(
    () => rows.filter((r) => accountCode === "all" || r.account === accountCode),
    [rows, accountCode],
  );

  const exportCSV = () => {
    const csv = toCSV(filtered, [
      { key: "code", label: "Kode", get: (r) => r.account },
      { key: "name", label: "Akun", get: (r) => r.accountName },
      { key: "type", label: "Tipe", get: (r) => r.type },
      { key: "open", label: "Saldo Awal", get: (r) => r.opening },
      { key: "deb", label: "Debit", get: (r) => r.debit },
      { key: "cre", label: "Kredit", get: (r) => r.credit },
      { key: "close", label: "Saldo Akhir", get: (r) => r.closing },
    ]);
    downloadCSV(exportFileName("buku-besar", label), csv);
    toast.success(`Export ${filtered.length} akun (CSV)`);
  };

  return (
    <div>
      <PageHeader title="Buku Besar" desc={`Saldo per akun dari jurnal posted — periode ${label}. Klik baris untuk drilldown.`} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select value={accountCode} onValueChange={setAccountCode}>
          <SelectTrigger className="w-[280px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Akun</SelectItem>
            {rows.map((r) => <SelectItem key={r.account} value={r.account}>{r.account} – {r.accountName}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-1" onClick={exportCSV} disabled={!filtered.length}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Akun</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead className="text-right">Saldo Awal</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Kredit</TableHead>
              <TableHead className="text-right">Saldo Akhir</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">Memuat…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="py-16 text-center text-sm text-muted-foreground">Tidak ada data buku besar.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.account} className="cursor-pointer hover:bg-muted/40" onClick={() => setDrill({ code: r.account, name: r.accountName })}>
                <TableCell className="font-mono text-xs">{r.account}</TableCell>
                <TableCell>{r.accountName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.type}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.opening)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.debit)}</TableCell>
                <TableCell className="text-right font-mono text-xs">{formatIDR(r.credit)}</TableCell>
                <TableCell className="text-right font-mono text-sm font-semibold">{formatIDR(r.closing)}</TableCell>
                <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <FinanceDrillDialog
        open={!!drill}
        onClose={() => setDrill(null)}
        coa_code={drill?.code}
        title={drill ? `${drill.code} – ${drill.name}` : ""}
        from={from}
        to={to}
      />
    </div>
  );
}
