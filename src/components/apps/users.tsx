// i18n-lint-disable-file — internal/admin or operator UI; strings tracked separately.
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ROLE_LABEL, type Role } from "@/lib/auth";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState } from "./ui";
import { toast } from "sonner";
import { listUsers, setUserRole, toggleUserActive, resetUserPassword } from "@/lib/klinik.functions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2, Plus, KeyRound } from "lucide-react";

type ApiUser = {
  id: string; email: string; name: string;
  roles: string[]; status: "active" | "inactive";
  last_sign_in_at: string | null; created_at: string;
};

const ST: { value: "all" | "active" | "inactive"; label: string }[] = [
  { value: "all", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];
const ROLE_KEYS = Object.keys(ROLE_LABEL) as Role[];
const ROLE_OPTS: { value: "all" | Role; label: string }[] = [
  { value: "all", label: "Semua role" },
  ...ROLE_KEYS.map((r) => ({ value: r, label: ROLE_LABEL[r] })),
];

export function UsersPage() {
  const qc = useQueryClient();
  const callList = useServerFn(listUsers);
  const callSet = useServerFn(setUserRole);
  const callToggle = useServerFn(toggleUserActive);
  const callReset = useServerFn(resetUserPassword);

  const listQ = useQuery({ queryKey: ["apps", "users"], queryFn: () => callList() as Promise<ApiUser[]> });

  const setM = useMutation({
    mutationFn: (v: { user_id: string; role: Role; grant: boolean }) => callSet({ data: v }),
    onSuccess: () => { toast.success("Role diperbarui"); qc.invalidateQueries({ queryKey: ["apps", "users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggleM = useMutation({
    mutationFn: (v: { user_id: string; active: boolean }) => callToggle({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.active ? "User diaktifkan" : "User dinonaktifkan");
      qc.invalidateQueries({ queryKey: ["apps", "users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const resetM = useMutation({
    mutationFn: (v: { user_id: string; new_password: string }) => callReset({ data: v }),
    onSuccess: () => { toast.success("Password berhasil di-reset"); setResetUser(null); setNewPwd(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | "active" | "inactive">("all");
  const [role, setRole] = useState<"all" | Role>("all");
  const [viewUser, setViewUser] = useState<ApiUser | null>(null);
  const [editUser, setEditUser] = useState<ApiUser | null>(null);
  const [resetUser, setResetUser] = useState<ApiUser | null>(null);
  const [newPwd, setNewPwd] = useState("");
  const [addRole, setAddRole] = useState<Role>("kasir");

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (listQ.data ?? []).filter((u) =>
      (st === "all" || u.status === st) &&
      (role === "all" || u.roles.includes(role)) &&
      (!qq || u.name.toLowerCase().includes(qq) || u.email.toLowerCase().includes(qq)),
    );
  }, [listQ.data, q, st, role]);

  return (
    <PageContainer>
      <PageHeader title="User Overview" desc="Pengguna internal & akses sistem (data live)." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama atau email…" />
        <Select value={role} onChange={setRole} options={ROLE_OPTS} />
        <Select value={st} onChange={setSt} options={ST} />
      </div>

      {listQ.isLoading ? (
        <div className="flex items-center gap-2 p-6 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
      ) : listQ.isError ? (
        <EmptyState title="Gagal memuat" hint={(listQ.error as Error).message} />
      ) : items.length === 0 ? (
        <EmptyState title="Tidak ada user" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nama</th><th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Last login</th><th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0
                        ? <span className="text-muted-foreground">—</span>
                        : u.roles.map((r) => <StatusBadge key={r} tone="info">{ROLE_LABEL[r as Role] ?? r}</StatusBadge>)}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge tone={u.status === "active" ? "ok" : "muted"}>{u.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <button onClick={() => setViewUser(u)} className="text-cyan-accent hover:underline">View</button>
                    {" · "}
                    <button onClick={() => { setEditUser(u); setAddRole("kasir"); }} className="text-cyan-accent hover:underline">Edit role</button>
                    {" · "}
                    <button onClick={() => { setResetUser(u); setNewPwd(""); }} className="text-cyan-accent hover:underline">Reset password</button>
                    {" · "}
                    <button
                      disabled={toggleM.isPending}
                      onClick={() => {
                        const next = u.status !== "active";
                        if (!confirm(`${next ? "Aktifkan" : "Nonaktifkan"} ${u.name}?`)) return;
                        toggleM.mutate({ user_id: u.id, active: next });
                      }}
                      className="text-destructive hover:underline disabled:opacity-50"
                    >
                      {u.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewUser?.name}</DialogTitle></DialogHeader>
          {viewUser && (
            <div className="space-y-2 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {viewUser.email}</div>
              <div><span className="text-muted-foreground">User ID:</span> <span className="font-mono text-xs">{viewUser.id}</span></div>
              <div><span className="text-muted-foreground">Status:</span> {viewUser.status}</div>
              <div><span className="text-muted-foreground">Terdaftar:</span> {new Date(viewUser.created_at).toLocaleString("id-ID")}</div>
              <div><span className="text-muted-foreground">Last login:</span> {viewUser.last_sign_in_at ? new Date(viewUser.last_sign_in_at).toLocaleString("id-ID") : "—"}</div>
              <div className="flex flex-wrap gap-1 pt-1">
                {viewUser.roles.map((r) => <Badge key={r} variant="secondary">{ROLE_LABEL[r as Role] ?? r}</Badge>)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit role — {editUser?.name}</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-1">
                {editUser.roles.length === 0 && <span className="text-sm text-muted-foreground">Belum punya role.</span>}
                {editUser.roles.map((r) => (
                  <Badge key={r} variant="secondary">{ROLE_LABEL[r as Role] ?? r}
                    <button
                      className="ml-1 hover:text-destructive"
                      disabled={setM.isPending}
                      onClick={() => setM.mutate({ user_id: editUser.id, role: r as Role, grant: false }, {
                        onSuccess: () => setEditUser((prev) => prev ? { ...prev, roles: prev.roles.filter((x) => x !== r) } : prev),
                      })}
                    ><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <select
                  value={addRole}
                  onChange={(e) => setAddRole(e.target.value as Role)}
                  className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm"
                >
                  {ROLE_KEYS.filter((r) => !editUser.roles.includes(r)).map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r]}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={setM.isPending || editUser.roles.includes(addRole)}
                  onClick={() => setM.mutate({ user_id: editUser.id, role: addRole, grant: true }, {
                    onSuccess: () => setEditUser((prev) => prev ? { ...prev, roles: [...prev.roles, addRole] } : prev),
                  })}
                ><Plus className="mr-1 h-4 w-4" />Tambah</Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
