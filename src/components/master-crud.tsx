import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { addAudit } from "@/lib/audit-log";
import { useAuth } from "@/lib/auth";
import { useFinanceAccess } from "@/lib/finance-access";
import { FinanceExportBar } from "@/components/finance-export-bar";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFinMaster,
  upsertFinMaster,
  deleteFinMaster,
  type FinTable,
} from "@/lib/finance-master.functions";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "boolean";
  options?: string[];
  required?: boolean;
};

export type MasterRow = Record<string, any>;

interface Props {
  title: string;
  desc?: string;
  module: string;
  table: FinTable;
  fields: Field[];
  newRow: () => MasterRow;
  singleton?: boolean; // for profil klinik
}

export function MasterCrudPage({ title, desc, module, table, fields, newRow, singleton }: Props) {
  const { user } = useAuth();
  const { canEdit, isViewer } = useFinanceAccess();
  const qc = useQueryClient();
  const listFn = useServerFn(listFinMaster);
  const upsertFn = useServerFn(upsertFinMaster);
  const deleteFn = useServerFn(deleteFinMaster);

  const queryKey = ["fin-master", table];
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => listFn({ data: { table } }),
  });
  const rows: MasterRow[] = data?.rows ?? [];

  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<MasterRow | null>(null);
  const [isNew, setIsNew] = useState(false);

  const filtered = q
    ? rows.filter((r) =>
        Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q.toLowerCase())),
      )
    : rows;

  const upsertMut = useMutation({
    mutationFn: (row: MasterRow) => {
      if (!canEdit) throw new Error("Read-only: Anda tidak memiliki izin mengubah data.");
      return upsertFn({ data: { table, row, id: row.id } });
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey });
      addAudit({
        actor: user?.email ?? "system",
        action: "role_change",
        target: `finance/master/${module}`,
        meta: { op: vars.id ? "update" : "create", id: vars.id, code: vars.code, name: vars.name },
      });
      toast.success(`${title}: tersimpan`);
      setEditing(null);
      setIsNew(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => {
      if (!canEdit) throw new Error("Read-only: Anda tidak memiliki izin menghapus data.");
      return deleteFn({ data: { table, id } });
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey });
      addAudit({ actor: user?.email ?? "system", action: "role_change", target: `finance/master/${module}`, meta: { op: "delete", id } });
      toast.success(`${title}: data dihapus`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderCell = (f: Field, v: any) => {
    if (f.type === "boolean") return v ? "Ya" : "Tidak";
    if (f.type === "number" && typeof v === "number") return v.toLocaleString("id-ID");
    return String(v ?? "—");
  };

  const LockedBtn = ({ children }: { children: React.ReactNode }) => (
    <Tooltip>
      <TooltipTrigger asChild><span>{children}</span></TooltipTrigger>
      <TooltipContent>Read-only — hanya admin finance yang dapat mengubah.</TooltipContent>
    </Tooltip>
  );

  return (
    <div>
      <PageHeader title={title} desc={desc} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari…" className="pl-9" />
        </div>
        <FinanceExportBar
          resource={`master-${module}`}
          title={title}
          columns={fields.map((f) => ({ key: f.key, header: f.label, format: (r: MasterRow) => renderCell(f, r[f.key]) }))}
          rows={filtered}
        />
        {!singleton && (
          canEdit ? (
            <Button className="gap-1" onClick={() => { setEditing(newRow()); setIsNew(true); }}>
              <Plus className="h-4 w-4" /> Tambah
            </Button>
          ) : (
            <LockedBtn>
              <Button className="gap-1" disabled><Lock className="h-4 w-4" /> Tambah</Button>
            </LockedBtn>
          )
        )}
        {singleton && rows.length === 0 && canEdit && (
          <Button className="gap-1" onClick={() => { setEditing(newRow()); setIsNew(true); }}>
            <Plus className="h-4 w-4" /> Buat
          </Button>
        )}
        {isViewer && <Badge variant="secondary" className="gap-1 bg-blue-500/15 text-blue-700"><Lock className="h-3 w-3" />Viewer</Badge>}
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
            {isLoading ? (
              <TableRow><TableCell colSpan={fields.length + 1} className="py-16 text-center">
                <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
              </TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={fields.length + 1} className="py-16 text-center text-sm text-muted-foreground">Belum ada data.</TableCell></TableRow>
            ) : filtered.map((r) => (
              <TableRow key={r.id}>
                {fields.map((f) => <TableCell key={f.key} className="text-sm">{renderCell(f, r[f.key])}</TableCell>)}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...r }); setIsNew(false); }} title={canEdit ? "Edit" : "Lihat (read-only)"}>
                      {canEdit ? <Pencil className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                    </Button>
                    {!singleton && canEdit && (
                      <Button size="icon" variant="ghost" disabled={deleteMut.isPending} onClick={() => { if (confirm("Hapus data ini?")) deleteMut.mutate(r.id); }}>
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mt-2 text-xs text-muted-foreground">Total {filtered.length} baris</div>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setIsNew(false); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
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
                      onChange={(e) => setEditing({ ...editing, [f.key]: e.target.value })}
                    >
                      <option value="">—</option>
                      {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : f.type === "boolean" ? (
                    <div className="flex items-center gap-2">
                      <Switch checked={!!editing[f.key]} onCheckedChange={(c) => setEditing({ ...editing, [f.key]: c })} />
                      <span className="text-sm text-muted-foreground">{editing[f.key] ? "Aktif" : "Non-aktif"}</span>
                    </div>
                  ) : (
                    <Input
                      type={f.type === "number" ? "number" : "text"}
                      value={String(editing[f.key] ?? "")}
                      onChange={(e) => setEditing({
                        ...editing,
                        [f.key]: f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value,
                      })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditing(null); setIsNew(false); }}>Batal</Button>
            <Button disabled={upsertMut.isPending} onClick={() => editing && upsertMut.mutate(editing)}>
              {upsertMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
