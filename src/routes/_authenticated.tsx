import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth, type System } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

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
  const { isAuthenticated, userFor, login } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const system = systemFromPath(pathname);
  const [checking, setChecking] = useState(system === "apps" && !userFor("apps"));

  // For /apps: hydrate mock auth bridge from Supabase session if present.
  useEffect(() => {
    if (system !== "apps") return;
    if (userFor("apps")) { setChecking(false); return; }
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data.user) {
        login("apps", data.user.email || "pasien@apps", "front_office");
      }
      setChecking(false);
    });
    return () => { cancelled = true; };
  }, [system, userFor, login]);

  useEffect(() => {
    if (checking) return;
    if (!isAuthenticated) {
      navigate({
        to: `/${system}/login`,
        search: { redirect: pathname },
        replace: true,
      });
    }
  }, [checking, isAuthenticated, pathname, navigate, system]);

  if (checking || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {checking ? "Memuat sesi…" : "Mengarahkan ke halaman masuk…"}
      </div>
    );
  }

  return <Outlet />;
}
