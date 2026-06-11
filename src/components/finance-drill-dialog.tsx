import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { drillCoa } from "@/lib/finance-report.functions";

const fmt = (n: number) => (Number(n) || 0).toLocaleString("id-ID");

export function FinanceDrillDialog({
  open, onClose, coa_code, coa_name, entry_id, from, to, title,
}: {
  open: boolean;
  onClose: () => void;
  coa_code?: string;
  coa_name?: string;
  entry_id?: string;
  from?: string;
  to?: string;
  title?: string;
}) {
  const fn = useServerFn(drillCoa);
  const { data, isLoading } = useQuery({
    enabled: open,
    queryKey: ["drill", coa_code, entry_id, from, to],
    queryFn: () => fn({ data: { coa_code, entry_id, from, to } }),
  });
  const lines = data?.lines ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {title ?? (coa_code ? `Detail Jurnal ${coa_code}${coa_name ? " — " + coa_name : ""}` : "Detail Jurnal")}
          </DialogTitle>
        </DialogHeader>
        <div className="text-xs text-muted-foreground">
          Periode {from ?? "—"} s/d {to ?? "—"} • {lines.length} baris •
          Total D <b>{fmt(data?.totalDebit ?? 0)}</b> / K <b>{fmt(data?.totalKredit ?? 0)}</b>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>No. Jurnal</TableHead>
                <TableHead>Sumber</TableHead>
                <TableHead>Ref</TableHead>
                {!coa_code && <TableHead>COA</TableHead>}
                <TableHead>Keterangan</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Kredit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></TableCell></TableRow>
              ) : lines.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">Belum ada entri.</TableCell></TableRow>
              ) : lines.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs">{l.tanggal}</TableCell>
                  <TableCell className="font-mono text-xs">{l.no_jurnal}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{l.sumber}</Badge></TableCell>
                  <TableCell className="text-xs">{l.ref_no ?? "—"}</TableCell>
                  {!coa_code && <TableCell className="font-mono text-xs">{l.coa_code}</TableCell>}
                  <TableCell className="max-w-sm truncate text-xs">{l.keterangan ?? l.entry_keterangan}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{l.debit ? fmt(l.debit) : ""}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{l.kredit ? fmt(l.kredit) : ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
