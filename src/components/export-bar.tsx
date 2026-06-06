import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, FileSpreadsheet } from "lucide-react";

export type DateRange = { from: string; to: string };

export function defaultRange(days = 30): DateRange {
  const to = new Date();
  const from = new Date(Date.now() - days * 864e5);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function ExportBar({
  range, onRange, onCsv, onPdf, extra,
}: {
  range: DateRange;
  onRange: (r: DateRange) => void;
  onCsv: () => void;
  onPdf: () => void;
  extra?: ReactNode;
}) {
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Dari</Label>
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); onRange({ from: e.target.value, to }); }} className="h-9 w-36" />
      </div>
      <div className="grid gap-1">
        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sampai</Label>
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); onRange({ from, to: e.target.value }); }} className="h-9 w-36" />
      </div>
      {extra}
      <div className="ml-auto flex gap-2">
        <Button variant="outline" size="sm" className="gap-1" onClick={onCsv}>
          <FileSpreadsheet className="h-4 w-4" /> CSV
        </Button>
        <Button variant="outline" size="sm" className="gap-1" onClick={onPdf}>
          <Download className="h-4 w-4" /> PDF
        </Button>
      </div>
    </div>
  );
}
