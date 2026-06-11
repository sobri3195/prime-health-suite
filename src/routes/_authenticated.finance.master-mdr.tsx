import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listMdrRule, upsertMdrRule, deleteMdrRule } from "@/lib/finance-template.functions";
import { useFinanceAccess } from "@/lib/finance-access";

export const Route = createFileRoute("/_authenticated/finance/master-mdr")({
  component: MasterMdrPage,
});

type Row = { id: string; metode: string; bank: string | null; rate_pct: number; fixed_fee: number; coa_code: string; is_active: boolean };
const METODES = ["debit", "credit", "qris", "transfer", "ewallet"];

function MasterMdrPage() {
  const { canEdit, user } = useFinanceAccess();
  const qc = useQueryClient();
  const list = useServerFn(listMdrRule);
  const save = useServerFn(upsertMdrRule);
  const del = useServerFn(deleteMdrRule);
  const { data, isLoading } = useQuery({ queryKey: ["mdr"], queryFn: () => list() });
  const rows: Row[] = (data?.rows ?? []) as Row[];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  const saveM = useMutation({
    mutationFn: (d: any) => save({ data: { ...d, actor: user?.email } }),
    onSuccess: () => { toast.success("Aturan MDR tersimpan"); qc.invalidateQueries({ queryKey: ["mdr"] }); setOpen(false); },
    onError: (e: any) => toast.error(e.message),
  });
  const delM = useMutation({
    mutationFn: (id: string) => del({ data: { id, actor: user?.email } }),
    onSuccess: () => { toast.success("Aturan dihapus"); qc.invalidateQueries({ queryKey: ["mdr"] }); },
  });

  return (
    <div>
      <PageHeader title="Aturan MDR" desc="Tarif MDR per metode pembayaran × bank. Otomatis dihitung saat pembayaran non-tunai." />
      <div className="mb-3 flex justify-end">
        <Button disabled={!canEdit} onClick={() => { setEditing({ metode: "debit", bank: "", rate_pct: 0, fixed_fee: 0, coa_code: "5900", is_active: true }); setOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Tambah Aturan
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Metode</TableHead><TableHead>Bank/Acquirer</TableHead>
            <TableHead className="text-right">Rate %</TableHead><TableHead className="text-right">Fixed Fee</TableHead>
            <TableHead>COA</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={7} className="py-8 text-center">Loading…</TableCell></TableRow>
              : rows.length === 0 ? <TableRow><TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">Belum ada aturan MDR.</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium uppercase">{r.metode}</TableCell>
                  <TableCell>{r.bank || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.rate_pct).toFixed(2)}%</TableCell>
                  <TableCell className="text-right font-mono">{Number(r.fixed_fee).toLocaleString("id-ID")}</TableCell>
                  <TableCell className="font-mono text-xs">{r.coa_code}</TableCell>
                  <TableCell>{r.is_active ? <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-700">Aktif</Badge> : <Badge variant="outline">Nonaktif</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" disabled={!canEdit} onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" disabled={!canEdit} onClick={() => { if (confirm("Hapus aturan?")) delM.mutate(r.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "Tambah"} Aturan MDR</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div><Label>Metode</Label>
              <Select value={editing?.metode} onValueChange={(v) => setEditing({ ...editing!, metode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{METODES.map((m) => <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Bank / Acquirer (opsional)</Label><Input value={editing?.bank ?? ""} onChange={(e) => setEditing({ ...editing!, bank: e.target.value })} placeholder="BCA, Mandiri, GoPay…" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Rate %</Label><Input type="number" step="0.01" value={editing?.rate_pct ?? 0} onChange={(e) => setEditing({ ...editing!, rate_pct: Number(e.target.value) })} /></div>
              <div><Label>Fixed Fee (Rp)</Label><Input type="number" value={editing?.fixed_fee ?? 0} onChange={(e) => setEditing({ ...editing!, fixed_fee: Number(e.target.value) })} /></div>
            </div>
            <div><Label>COA Beban MDR</Label><Input value={editing?.coa_code ?? "5900"} onChange={(e) => setEditing({ ...editing!, coa_code: e.target.value })} /></div>
            <div className="flex items-center gap-2"><Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing!, is_active: v })} /><Label>Aktif</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button disabled={saveM.isPending} onClick={() => saveM.mutate(editing)}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
