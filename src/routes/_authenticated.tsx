import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useAuth, rolesFor, type Role, type System } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/auth.functions";

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
  const [checking, setChecking] = useState(!userFor(system));
  const [denied, setDenied] = useState(false);

  // Hydrate the per-system mock auth bridge from a real Supabase session.
  // Apps = any signed-in user (patient = front_office). SIM/Finance require
  // a role from user_roles that's allowed for that system.
  useEffect(() => {
    if (userFor(system)) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      const user = data.user;
      if (!user) {
        setChecking(false);
        return;
      }
      if (system === "apps") {
        login("apps", user.email || "pasien@apps", "front_office");
        setChecking(false);
        return;
      }
      try {
        const { roles } = await getMyRoles();
        if (cancelled) return;
        const allowed = rolesFor(system) as string[];
        const role = roles.find((r) => allowed.includes(r)) as Role | undefined;
        if (role) {
          login(system, user.email || `user@${system}`, role);
        } else {
          setDenied(true);
        }
      } catch {
        setDenied(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [system, userFor, login]);

  useEffect(() => {
    if (checking) return;
    if (!isAuthenticated || denied) {
      navigate({
        to: `/${system}/login`,
        search: { redirect: pathname },
        replace: true,
      });
    }
  }, [checking, isAuthenticated, denied, pathname, navigate, system]);

  if (checking || !isAuthenticated || denied) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {checking
          ? "Memuat sesi…"
          : denied
            ? `Akun Anda tidak punya akses ke ${system}. Mengarahkan…`
            : "Mengarahkan ke halaman masuk…"}
      </div>
    );
  }

  return <Outlet />;
}
