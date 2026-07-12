import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Role } from "@/lib/auth";
import { useRoles } from "@/lib/rbac";
import { brandHead } from "@/lib/brand";
import { LoginSkeleton } from "@/components/auth/login-skeleton";
import { ConfirmProvider } from "@/components/apps/confirm-dialog";

// Map DB role → UI role for AppShell label. Anything unmapped falls back to
// front_office so the shell still renders for a valid session.
const ROLE_MAP: Record<string, Role> = {
  super_admin: "super_admin",
  admin_klinik: "admin_klinik",
  dokter: "dokter",
  perawat: "perawat",
  perawat_optometri: "perawat",
  pendaftaran: "front_office",
  kasir: "kasir",
  farmasi: "front_office",
  manajemen: "owner",
  pasien: "front_office",
};

function Layout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { login, logout, userFor } = useAuth();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const rolesQ = useRoles({ enabled: authed });
  const primaryRole: Role = (rolesQ.data?.[0] && ROLE_MAP[rolesQ.data[0]]) || "front_office";

  // Sync Supabase session into mock auth bridge so AppShell renders.
  useEffect(() => {
    let cancelled = false;

    function bridge(user: { id: string; email?: string | null } | null) {
      if (cancelled) return;
      if (user) {
        if (!userFor("apps")) {
          login("apps", user.email || "pasien@apps", primaryRole);
        }
        setAuthed(true);
      } else {
        if (userFor("apps")) logout("apps");
        setAuthed(false);
        navigate({ to: "/apps/login", search: { redirect: pathname }, replace: true });
      }
      setChecking(false);
    }

    supabase.auth.getUser().then(({ data }) => bridge(data.user ?? null));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") bridge(null);
      else if (session?.user) bridge(session.user);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-bridge when the actual role resolves so the shell shows the correct label.
  useEffect(() => {
    if (!authed || !rolesQ.data?.length) return;
    const existing = userFor("apps");
    if (existing && existing.role !== primaryRole) {
      login("apps", existing.email, primaryRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, primaryRole]);

  if (checking) return <LoginSkeleton system="apps" />;
  if (!authed) return <LoginSkeleton system="apps" />;

  return (
    <AppShell system="apps">
      <ConfirmProvider>
        <Outlet />
      </ConfirmProvider>
    </AppShell>

  );
}

export const Route = createFileRoute("/_authenticated/apps")({
  head: () => brandHead("apps"),
  ssr: false,
  component: Layout,
});

