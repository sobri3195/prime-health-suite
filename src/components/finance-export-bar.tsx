import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { exportCsv, exportPdf, type Column } from "@/lib/exporter";
import { useFinanceDate } from "@/context/finance-date";
import { useFinanceAccess } from "@/lib/finance-access";
import { addAudit } from "@/lib/audit-log";
import { toast } from "sonner";

type Props<T> = {
  /** Report name used as filename slug and audit resource */
  resource: string;
  /** Title in the PDF header */
  title: string;
  columns: Column<T>[];
  rows: T[];
  /** Extra audit metadata (filters etc.) */
  meta?: Record<string, unknown>;
  /** Optional override: when true, bar is disabled (no rows) */
  disabled?: boolean;
};

export function FinanceExportBar<T>({ resource, title, columns, rows, meta, disabled }: Props<T>) {
  const { from, to, label } = useFinanceDate();
  const { user } = useFinanceAccess();

  const range = { from, to };
  const base = `${resource}-${from}_${to}`;

  const logExport = (format: "csv" | "pdf") => {
    addAudit({
      actor: user?.email ?? "anon",
      action: "export",
      target: `finance/${resource}`,
      meta: { format, from, to, label, rows: rows.length, ...meta },
    });
  };

  const handleCsv = () => {
    if (!rows.length) { toast.info("Tidak ada data untuk diekspor."); return; }
    exportCsv(`${base}.csv`, columns, rows, range);
    logExport("csv");
    toast.success(`CSV ${title} diunduh (${rows.length} baris)`);
  };

  const handlePdf = () => {
    if (!rows.length) { toast.info("Tidak ada data untuk diekspor."); return; }
    exportPdf(`${base}.pdf`, `${title} • ${label}`, columns, rows, range);
    logExport("pdf");
    toast.success(`PDF ${title} diunduh`);
  };

  const isDisabled = disabled || !user;

  return (
    <div className="flex items-center gap-1.5">
      {!user && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex h-8 items-center text-xs text-muted-foreground"><Lock className="mr-1 h-3 w-3" /></span>
            </TooltipTrigger>
            <TooltipContent>Login finance untuk export</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handleCsv} disabled={isDisabled}>
        <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
      </Button>
      <Button variant="outline" size="sm" className="h-8 gap-1" onClick={handlePdf} disabled={isDisabled}>
        <Download className="h-3.5 w-3.5" /> PDF
      </Button>
    </div>
  );
}
