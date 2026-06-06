import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth, canAccess } from "@/lib/auth";
import { brandHead } from "@/lib/brand";

function Layout() {
  const { userFor } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = userFor("sim-klinik");

  useEffect(() => {
    if (!user || !canAccess(user.role, "sim-klinik")) {
      navigate({ to: "/sim-klinik/login", search: { redirect: pathname }, replace: true });
    }
  }, [user, navigate, pathname]);

  if (!user || !canAccess(user.role, "sim-klinik")) return null;
  return (
    <AppShell system="sim-klinik">
      <Outlet />
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/sim-klinik")({
  head: () => brandHead("sim-klinik"),
  component: Layout,
});
