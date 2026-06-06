import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const Route = createFileRoute("/_authenticated")({
  validateSearch: z.object({ redirect: z.string().optional() }).optional(),
  // SSR-safe gate: route mounts on client; we redirect after hydration via component
  // (a beforeLoad session check would need the actual auth provider — kept simple for mock).
  ssr: false,
  component: GateComponent,
});

import { useAuth } from "@/lib/auth";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";

function GateComponent() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate({ to: "/login", search: { redirect: pathname }, replace: true });
    }
  }, [isAuthenticated, pathname, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Mengarahkan ke login…
      </div>
    );
  }

  return <Outlet />;
}
