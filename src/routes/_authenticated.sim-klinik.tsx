import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useAuth, canAccess } from "@/lib/auth";
import { brandHead } from "@/lib/brand";
import { useRoles, hasAnyRole } from "@/lib/rbac";
import { findNav } from "@/lib/nav-config";
import { Lock, ShieldAlert } from "lucide-react";
import { LoginSkeleton } from "@/components/auth/login-skeleton";

function Layout() {
  const { userFor, hydrated } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = userFor("sim-klinik");
  const { data: roles, isLoading: rolesLoading, fetchStatus } = useRoles({ enabled: user?.role === "admin_klinik" || user?.role === "super_admin" });

  useEffect(() => {
    if (!hydrated) return;
    if (!user || !canAccess(user.role, "sim-klinik")) {
      navigate({ to: "/sim-klinik/login", search: { redirect: pathname }, replace: true });
    }
  }, [hydrated, user, navigate, pathname]);

  if (!hydrated) return <LoginSkeleton system="sim-klinik" />;
  if (!user || !canAccess(user.role, "sim-klinik")) return <LoginSkeleton system="sim-klinik" />;

  const slug = pathname.split("/").slice(3).join("/") || "";
  const meta = findNav("sim-klinik", slug);
  // RBAC only enforced when Supabase roles were loaded successfully.
  // Legacy mock-auth sessions (no Supabase) bypass RBAC and rely on canAccess above.
  const rbacEnforced = Array.isArray(roles);
  const isSuperAdmin = hasAnyRole(roles, ["super_admin"]);
  const requiredRoles = meta?.roles;
  const allowed = !rbacEnforced || !requiredRoles || hasAnyRole(roles, requiredRoles);
  const lockedComingSoon = meta?.status === "coming_soon";

  return (
    <AppShell system="sim-klinik">
      {rolesLoading && fetchStatus !== "idle" ? null : rbacEnforced && !isSuperAdmin && !allowed ? (
        <div>
          <PageHeader title="Akses Ditolak" />
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-500" />
            <p className="text-sm">Modul ini hanya dapat diakses oleh <b>Super Admin</b>.</p>
            <p className="mt-1 text-xs text-muted-foreground">Hubungi administrator klinik untuk akses.</p>
          </div>
        </div>
      ) : lockedComingSoon ? (
        <div>
          <PageHeader title={meta?.label ?? "Modul"} desc="Modul ini sedang dipersiapkan." />
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center">
            <Lock className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
            <p className="text-sm">Modul <b>{meta?.label}</b> dikunci hingga siap dirilis.</p>
            <p className="mt-1 text-xs text-muted-foreground">Tim akan membuka modul ini sesuai jadwal rilis.</p>
          </div>
        </div>
      ) : (
        <Outlet />
      )}
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/sim-klinik")({
  head: () => brandHead("sim-klinik"),
  component: Layout,
});
