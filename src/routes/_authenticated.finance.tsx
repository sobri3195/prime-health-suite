import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth, canAccess, defaultSystemFor } from "@/lib/auth";

function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (user && !canAccess(user.role, "finance")) {
      navigate({ to: `/${defaultSystemFor(user.role)}`, replace: true });
    }
  }, [user, navigate]);
  if (user && !canAccess(user.role, "finance")) return null;
  return (
    <AppShell system="finance">
      <Outlet />
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/finance")({
  component: Layout,
});
