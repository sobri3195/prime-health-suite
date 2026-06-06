import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Download, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { downloadCSV, exportFileName, toCSV } from "@/lib/export";
import { addAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "select";
  options?: string[];
  required?: boolean;
};

export type MasterRow = Record<string, string | number>;

interface Props<T extends MasterRow> {
  title: string;
  desc?: string;
  module: string; // for CSV filename
  fields: Field[];
  initial: T[];
  newRow: () => T;
}

export function MasterCrudPage<T extends MasterRow>({
  title, desc, module, fields, initial, newRow,
}: Props<T>) {
  const { user } = useAuth();
  const [rows, setRows] = useState<T[]>(initial);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<T | null>(null);
  const [isNew, setIsNew] = useState(false);

  const filtered = useMemo(() => {
    if (!q) return rows;
    const lq = q.toLowerCase();
    return rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(lq)));
  }, [rows, q]);

  const saveRow = (row: T) => {
    if (isNew) {
      setRows((arr) => [row, ...arr]);
      toast.success(`${title}: data ditambahkan`);
    } else {
      setRows((arr) => arr.map((r) => (r[fields[0].key] === row[fields[0].key] ? row : r)));
      toast.success(`${title}: data diperbarui`);
    }
    addAudit({ actor: user?.email ?? "system", action: "role_change", target: `finance/master/${module}`, meta: { id: row[fields[0].key] } });
    setEditing(null);
    setIsNew(false);
  };

  const removeRow = (row: T) => {
    setRows((arr) => arr.filter((r) => r !== row));
    addAudit({ actor: user?.email ?? "system", action: "role_change", target: `finance/master/${module}`, meta: { delete: row[fields[0].key] } });
    toast.success(`${title}: data dihapus`);
  };

  const exportCSV = () => {
    const csv = toCSV(filtered, fields.map((f) => ({ key: f.key, label: f.label, get: (r: T) => r[f.key] })));
    downloadCSV(exportFileName(module, "all"), csv);
    addAudit({ actor: user?.email ?? "system", action: "export", target: `finance/master/${module}`, meta: { rows: filtered.length } });
    toast.success(`Export ${filtered.length} baris (CSV)`);
  };

  return (
    <div>
      <PageHeader title={title} desc={desc} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari…" className="pl-9" />
        </div>
        <Button variant="outline" className="gap-1" onClick={exportCSV}><Download className="h-4 w-4" /> Export CSV</Button>
        <Button className="gap-1" onClick={() => { setEditing(newRow()); setIsNew(true); }}>
          <Plus className="h-4 w-4" /> Tambah
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={fields.length + 1} className="py-16 text-center text-sm text-muted-foreground">Belum ada data.</TableCell></TableRow>
            ) : filtered.map((r, i) => (
              <TableRow key={i}>
                {fields.map((f) => <TableCell key={f.key} className="text-sm">{String(r[f.key] ?? "—")}</TableCell>)}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...r }); setIsNew(false); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => removeRow(r)}><Trash2 className="h-4 w-4 text-rose-500" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">Total {filtered.length} baris</div>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setIsNew(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isNew ? "Tambah" : "Edit"} {title}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 py-2">
              {fields.map((f) => (
                <div key={f.key} className="grid gap-1.5">
                  <Label className="text-xs">{f.label}</Label>
                  {f.type === "select" ? (
                    <select
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={String(editing[f.key] ?? "")}
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value } as T)}
                    >
                      <option value="">—</option>
                      {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : "text"}
                      value={String(editing[f.key] ?? "")}
                      onChange={(e) => setEditing({ ...editing, [f.key]: f.type === "number" ? Number(e.target.value) || 0 : e.target.value } as T)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setIsNew(false); }}>Batal</Button>
            <Button onClick={() => editing && saveRow(editing)}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
