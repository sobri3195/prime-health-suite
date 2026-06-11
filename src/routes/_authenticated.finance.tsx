import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { useAuth, canAccess } from "@/lib/auth";
import { brandHead } from "@/lib/brand";
import { FinanceDateProvider } from "@/context/finance-date";
import { FinanceDateFilter } from "@/components/finance-date-filter";
import { useFinanceAccess } from "@/lib/finance-access";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Eye } from "lucide-react";

function FinanceHeaderBar() {
  const { isAdmin, isViewer } = useFinanceAccess();
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/60 px-3 py-2 backdrop-blur">
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <Badge variant="secondary" className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-3 w-3" /> Admin
          </Badge>
        ) : isViewer ? (
          <Badge variant="secondary" className="gap-1 bg-blue-500/15 text-blue-700 dark:text-blue-300">
            <Eye className="h-3 w-3" /> Viewer (read-only)
          </Badge>
        ) : null}
        <span className="text-xs text-muted-foreground">Filter periode berlaku di seluruh halaman finance</span>
      </div>
      <FinanceDateFilter />
    </div>
  );
}

function Layout() {
  const { userFor } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = userFor("finance");

  useEffect(() => {
    if (!user || !canAccess(user.role, "finance")) {
      navigate({ to: "/finance/login", search: { redirect: pathname }, replace: true });
    }
  }, [user, navigate, pathname]);

  if (!user || !canAccess(user.role, "finance")) return null;
  return (
    <AppShell system="finance">
      <FinanceDateProvider>
        <FinanceHeaderBar />
        <Outlet />
      </FinanceDateProvider>
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => brandHead("finance"),
  component: Layout,
});

// re-export so other files can keep using it via this route module
export { PageHeader };
