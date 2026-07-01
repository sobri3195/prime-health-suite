import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/page-head";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { listUsers, setUserRole } from "@/lib/klinik.functions";

export const Route = createFileRoute("/_authenticated/sim-klinik/users")({
  head: () => pageHead({ title: 'Manajemen User — SIM Klinik', description: 'Kelola akun staf klinik, role, dan reset password.', path: '/sim-klinik/users' }),
  component: UsersPage,
});

const ROLES = ["super_admin","admin_klinik","dokter","perawat","perawat_optometri","pendaftaran","kasir","farmasi","manajemen","pasien"] as const;
type RoleT = typeof ROLES[number];
type ApiUser = { id: string; email: string; name: string; roles: string[]; status: string; last_sign_in_at: string | null; created_at: string };

function UsersPage() {
  const qc = useQueryClient();
  const callList = useServerFn(listUsers);
  const callSet = useServerFn(setUserRole);

  const listQ = useQuery({ queryKey: ["klinik","users"], queryFn: () => callList() as Promise<ApiUser[]> });
  const setM = useMutation({
    mutationFn: (v: { user_id: string; role: RoleT; grant: boolean }) => callSet({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.grant ? "Role ditambahkan" : "Role dihapus");
      qc.invalidateQueries({ queryKey: ["klinik","users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = listQ.data ?? [];

  return (
    <div>
      <PageHeader title="Manajemen User & Role" desc="Tetapkan role staf klinik. Hanya super admin/admin klinik yang dapat mengubah." />

      <Card className="p-3">
        <div className="mb-2 text-sm font-semibold">Daftar User & Role ({users.length})</div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead><TableHead className="w-[260px]">Tambah Role</TableHead></TableRow></TableHeader>
            <TableBody>
              {users.map((u) => (
                <UserRow key={u.id} user={u} onGrant={(role) => setM.mutate({ user_id: u.id, role, grant: true })} onRevoke={(role) => setM.mutate({ user_id: u.id, role, grant: false })} pending={setM.isPending} />
              ))}
              {users.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">Belum ada user.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function UserRow({ user, onGrant, onRevoke, pending }: {
  user: ApiUser; onGrant: (r: RoleT) => void; onRevoke: (r: RoleT) => void; pending: boolean;
}) {
  const available = ROLES.filter((r) => !user.roles.includes(r));
  const [picked, setPicked] = useState<RoleT | "">("");
  return (
    <TableRow>
      <TableCell>{user.name}</TableCell>
      <TableCell className="text-xs text-muted-foreground">{user.email}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {user.roles.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
          {user.roles.map((r) => (
            <Badge key={r} variant="secondary">{r}
              <button aria-label={`Hapus role ${r}`} onClick={() => onRevoke(r as RoleT)} className="ml-1 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Select value={picked} onValueChange={(v) => setPicked(v as RoleT)}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder={available.length ? "Pilih role…" : "Semua role aktif"} /></SelectTrigger>
            <SelectContent>{available.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Button size="sm" disabled={!picked || pending} onClick={() => { if (picked) { onGrant(picked); setPicked(""); } }}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

