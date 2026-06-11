import { CalendarDays, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useFinanceDate, type DatePreset, PRESET_LABEL } from "@/context/finance-date";

const PRESETS: { id: Exclude<DatePreset, "custom">; label: string }[] = [
  { id: "today", label: "Hari ini" },
  { id: "7d", label: "7 hari" },
  { id: "mtd", label: "MTD" },
  { id: "qtd", label: "QTD" },
  { id: "ytd", label: "YTD" },
];

export function FinanceDateFilter() {
  const { from, to, preset, setRange, setPreset, reset } = useFinanceDate();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          <span className="hidden text-xs font-medium sm:inline">{PRESET_LABEL[preset]}</span>
          <Badge variant="secondary" className="ml-1 hidden text-[10px] font-mono lg:inline-flex">
            {from} → {to}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-3">
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Preset</div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <Button
                  key={p.id}
                  size="sm"
                  variant={preset === p.id ? "default" : "outline"}
                  className="h-7 text-xs"
                  onClick={() => setPreset(p.id)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Custom</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Dari</label>
                <Input
                  type="date"
                  value={from}
                  max={to}
                  onChange={(e) => e.target.value && setRange({ from: e.target.value, to, preset: "custom" })}
                  className="h-8"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sampai</label>
                <Input
                  type="date"
                  value={to}
                  min={from}
                  onChange={(e) => e.target.value && setRange({ from, to: e.target.value, preset: "custom" })}
                  className="h-8"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={reset}>
              <RotateCcw className="h-3 w-3" /> Reset
            </Button>
            <span className="text-[10px] text-muted-foreground">Tersimpan & berlaku di semua halaman</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
