import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { useAuth, type System } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated")({
  validateSearch: z.object({ redirect: z.string().optional() }).optional(),
  ssr: false,
  component: GateComponent,
});

function systemFromPath(pathname: string): System {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (seg === "finance") return "finance";
  if (seg === "sim-klinik") return "sim-klinik";
  return "apps";
}

function GateComponent() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isAuthenticated) {
      const system = systemFromPath(pathname);
      navigate({
        to: `/${system}/login`,
        search: { redirect: pathname },
        replace: true,
      });
    }
  }, [isAuthenticated, pathname, navigate]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Mengarahkan ke halaman masuk…
      </div>
    );
  }

  return <Outlet />;
}
