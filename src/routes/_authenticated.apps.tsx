import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth, canAccess, defaultSystemFor, type System } from "@/lib/auth";

function makeSystemLayout(system: System) {
  return function SystemLayout() {
    const { user } = useAuth();
    const navigate = useNavigate();
    useEffect(() => {
      if (user && !canAccess(user.role, system)) {
        navigate({ to: `/${defaultSystemFor(user.role)}`, replace: true });
      }
    }, [user, navigate]);
    if (user && !canAccess(user.role, system)) return null;
    return (
      <AppShell system={system}>
        <Outlet />
      </AppShell>
    );
  };
}

export const Route = createFileRoute("/_authenticated/apps")({
  component: makeSystemLayout("apps"),
});
