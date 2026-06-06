import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth, canAccess } from "@/lib/auth";
import { brandHead } from "@/lib/brand";

function Layout() {
  const { userFor } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = userFor("apps");

  useEffect(() => {
    if (!user) {
      navigate({ to: "/apps/login", search: { redirect: pathname }, replace: true });
    } else if (!canAccess(user.role, "apps")) {
      navigate({ to: "/apps/login", search: { redirect: pathname }, replace: true });
    }
  }, [user, navigate, pathname]);

  if (!user || !canAccess(user.role, "apps")) return null;
  return (
    <AppShell system="apps">
      <Outlet />
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/apps")({
  head: () => brandHead("apps"),
  component: Layout,
});
