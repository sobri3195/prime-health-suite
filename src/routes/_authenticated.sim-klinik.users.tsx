import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listUsers, setUserRole } from "@/lib/klinik.functions";

export const Route = createFileRoute("/_authenticated/sim-klinik/users")({ component: UsersPage });

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
    onSuccess: () => { toast.success("Role diperbarui"); qc.invalidateQueries({ queryKey: ["klinik","users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const users = listQ.data ?? [];

  return (
    <div>
      <PageHeader title="Manajemen User & Role" desc="Tetapkan role staf klinik. Hanya super admin/admin klinik yang dapat mengubah." />

      <Card className="p-3">
        <div className="mb-2 text-sm font-semibold">Daftar User & Role ({users.length})</div>
        <Table>
          <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Roles</TableHead></TableRow></TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1">{u.roles.map((r) => (
                  <Badge key={r} variant="secondary">{r}
                    <button onClick={() => setM.mutate({ user_id: u.id, role: r as RoleT, grant: false })} className="ml-1 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}</div></TableCell>
              </TableRow>
            ))}
            {users.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">Belum ada user.</TableCell></TableRow>}
          </TableBody>
        </Table>
        <p className="mt-2 text-xs text-muted-foreground">Untuk menambah role baru, gunakan halaman <code>Apps → Users</code> (modal Edit role).</p>
      </Card>
    </div>
  );
}
