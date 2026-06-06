import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth, canAccess } from "@/lib/auth";
import { brandHead } from "@/lib/brand";

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
      <Outlet />
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => brandHead("finance"),
  component: Layout,
});
