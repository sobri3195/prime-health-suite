import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listUsers, setUserRole } from "@/lib/klinik.functions";

export const Route = createFileRoute("/_authenticated/sim-klinik/users")({ component: UsersPage });

const ROLES = ["super_admin","admin_klinik","dokter","perawat","perawat_optometri","pendaftaran","kasir","farmasi","manajemen","pasien"] as const;

function UsersPage() {
  const qc = useQueryClient();
  const callList = useServerFn(listUsers);
  const callSet = useServerFn(setUserRole);

  const listQ = useQuery({ queryKey: ["klinik","users"], queryFn: () => callList() });
  const setM = useMutation({
    mutationFn: (v: { user_id: string; role: typeof ROLES[number]; grant: boolean }) => callSet({ data: v }),
    onSuccess: () => { toast.success("Role diperbarui"); qc.invalidateQueries({ queryKey: ["klinik","users"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<typeof ROLES[number]>("dokter");

  // Group roles by user_id
  type R = { user_id: string; role: typeof ROLES[number] };
  const rows = (listQ.data ?? []) as R[];
  const byUser = new Map<string, typeof ROLES[number][]>();
  rows.forEach((r) => { const arr = byUser.get(r.user_id) ?? []; arr.push(r.role); byUser.set(r.user_id, arr); });

  return (
    <div>
      <PageHeader title="Manajemen User & Role" desc="Tetapkan role staf klinik. Hanya super admin/admin klinik yang dapat mengubah." />

      <Card className="mb-4 p-3">
        <div className="mb-2 text-sm font-semibold">Tambah Role ke User</div>
        <div className="flex flex-wrap gap-2">
          <Input placeholder="User ID (UUID dari auth)" value={newUserId} onChange={(e) => setNewUserId(e.target.value)} className="flex-1 min-w-[300px]" />
          <Select value={newRole} onValueChange={(v) => setNewRole(v as typeof ROLES[number])}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
          </Select>
          <Button disabled={!newUserId} onClick={() => { setM.mutate({ user_id: newUserId, role: newRole, grant: true }); setNewUserId(""); }}><Plus className="mr-1 h-4 w-4" />Tambah</Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">User ID diambil dari halaman auth (auth.users.id di backend).</p>
      </Card>

      <Card className="p-3">
        <div className="mb-2 text-sm font-semibold">Daftar User & Role ({byUser.size})</div>
        <Table>
          <TableHeader><TableRow><TableHead>User ID</TableHead><TableHead>Roles</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {Array.from(byUser.entries()).map(([uid, roles]) => (
              <TableRow key={uid}>
                <TableCell className="font-mono text-xs">{uid}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1">{roles.map((r) => (
                  <Badge key={r} variant="secondary">{r}
                    <button onClick={() => setM.mutate({ user_id: uid, role: r, grant: false })} className="ml-1 hover:text-red-500"><Trash2 className="h-3 w-3" /></button>
                  </Badge>
                ))}</div></TableCell>
                <TableCell></TableCell>
              </TableRow>
            ))}
            {byUser.size === 0 && <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">Belum ada user dengan role.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
