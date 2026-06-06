// i18n-lint-disable-file — internal/admin or operator UI; strings tracked separately.
import { useMemo, useState } from "react";
import { users } from "@/data/appsData";
import { ROLE_LABEL, type Role } from "@/lib/auth";
import { PageHeader } from "@/components/app-shell";
import { PageContainer, SearchInput, Select, StatusBadge, EmptyState } from "./ui";
import { toast } from "sonner";

const ST: { value: "all" | "active" | "inactive"; label: string }[] = [
  { value: "all", label: "Semua status" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Nonaktif" },
];
const ROLE_OPTS: { value: "all" | Role; label: string }[] = [
  { value: "all", label: "Semua role" },
  ...(Object.keys(ROLE_LABEL) as Role[]).map((r) => ({ value: r, label: ROLE_LABEL[r] })),
];

export function UsersPage() {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"all" | "active" | "inactive">("all");
  const [role, setRole] = useState<"all" | Role>("all");

  const items = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return users.filter(
      (u) =>
        (st === "all" || u.status === st) &&
        (role === "all" || u.role === role) &&
        (!qq || u.name.toLowerCase().includes(qq) || u.email.toLowerCase().includes(qq)),
    );
  }, [q, st, role]);

  return (
    <PageContainer>
      <PageHeader title="User Overview" desc="Pengguna internal & akses sistem." />
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama atau email…" />
        <Select value={role} onChange={setRole} options={ROLE_OPTS} />
        <Select value={st} onChange={setSt} options={ST} />
      </div>

      {items.length === 0 ? (
        <EmptyState title="Tidak ada user" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nama</th><th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th><th className="px-4 py-3">Sistem</th>
                <th className="px-4 py-3">Status</th><th className="px-4 py-3">Last login</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{u.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-2">{ROLE_LABEL[u.role]}</td>
                  <td className="px-4 py-2 text-xs">
                    <div className="flex flex-wrap gap-1">
                      {u.systems.map((s) => <StatusBadge key={s} tone="info">{s}</StatusBadge>)}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge tone={u.status === "active" ? "ok" : "muted"}>{u.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {new Date(u.lastLogin).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    <button onClick={() => toast.info(`View ${u.name} (mock)`)} className="text-cyan-accent hover:underline">View</button>
                    {" · "}
                    <button onClick={() => toast.info(`Edit role ${u.name} (mock)`)} className="text-cyan-accent hover:underline">Edit role</button>
                    {" · "}
                    <button
                      onClick={() => toast.warning(`${u.status === "active" ? "Deactivate" : "Activate"} ${u.name} (mock)`)}
                      className="text-destructive hover:underline"
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
    </PageContainer>
  );
}
