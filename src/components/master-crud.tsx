import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell";
import { DataTable, type DataTableColumn } from "@/components/data-table";
import { handleError } from "@/lib/handle-error";
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
  singleton?: boolean;
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

  const [editing, setEditing] = useState<MasterRow | null>(null);
  const [isNew, setIsNew] = useState(false);

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
    onError: (e) => handleError(e),
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
    onError: (e) => handleError(e),
  });

  const renderCell = (f: Field, v: any) => {
    if (f.type === "boolean") return v ? "Ya" : "Tidak";
    if (f.type === "number" && typeof v === "number") return v.toLocaleString("id-ID");
    return String(v ?? "—");
  };

  const LockedBtn = ({ children }: { children: React.ReactNode }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild><span>{children}</span></TooltipTrigger>
        <TooltipContent>Read-only — hanya admin finance yang dapat mengubah.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const columns: DataTableColumn<MasterRow>[] = fields.map((f) => ({
    key: f.key,
    header: f.label,
    sortable: true,
    align: f.type === "number" ? "right" : undefined,
    value: (r) => (r[f.key] ?? "") as string | number,
    cell: (r) => renderCell(f, r[f.key]),
  }));

  return (
    <div>
      <PageHeader title={title} desc={desc} />

      <DataTable
        rows={rows}
        columns={columns}
        loading={isLoading}
        rowKey={(r) => r.id}
        searchPlaceholder={`Cari ${title.toLowerCase()}…`}
        emptyTitle="Belum ada data"
        emptyDesc={canEdit ? `Tambahkan ${title.toLowerCase()} pertama untuk memulai.` : "Hubungi admin untuk menambahkan data."}
        toolbar={
          <FinanceExportBar
            resource={`master-${module}`}
            title={title}
            columns={fields.map((f) => ({ key: f.key, header: f.label, format: (r: MasterRow) => renderCell(f, r[f.key]) }))}
            rows={rows}
          />
        }
        actions={
          <>
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
          </>
        }
        rightActions={(r) => (
          <>
            <Button size="icon" variant="ghost" onClick={() => { setEditing({ ...r }); setIsNew(false); }} title={canEdit ? "Edit" : "Lihat (read-only)"}>
              {canEdit ? <Pencil className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            </Button>
            {!singleton && canEdit && (
              <Button size="icon" variant="ghost" disabled={deleteMut.isPending} onClick={() => { if (confirm("Hapus data ini?")) deleteMut.mutate(r.id); }}>
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            )}
          </>
        )}
      />

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) { setEditing(null); setIsNew(false); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isNew ? "Tambah" : "Edit"} {title}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 py-2">
              {fields.map((f) => (
                <div key={f.key} className="grid gap-1.5">
                  <Label className="text-xs">{f.label}{f.required && <span className="text-rose-500"> *</span>}</Label>
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
                      placeholder={f.type === "number" ? "0" : undefined}
                      value={
                        f.type === "number"
                          ? (editing[f.key] === 0 || editing[f.key] == null ? "" : String(editing[f.key]))
                          : String(editing[f.key] ?? "")
                      }
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
            <Button variant="outline" onClick={() => { setEditing(null); setIsNew(false); }}>{canEdit ? "Batal" : "Tutup"}</Button>
            {canEdit && (
              <Button disabled={upsertMut.isPending} onClick={() => {
                if (!editing) return;
                const missing = fields.find((f) => f.required && (editing[f.key] === undefined || editing[f.key] === null || editing[f.key] === ""));
                if (missing) { toast.error(`Field "${missing.label}" wajib diisi`); return; }
                upsertMut.mutate(editing);
              }}>
                {upsertMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
