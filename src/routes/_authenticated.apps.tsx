import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { brandHead } from "@/lib/brand";
import { LoginSkeleton } from "@/components/auth/login-skeleton";
import { ConfirmProvider } from "@/components/apps/confirm-dialog";


function Layout() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { login, logout, userFor } = useAuth();
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);

  // Sync Supabase session into mock auth bridge so AppShell renders.
  useEffect(() => {
    let cancelled = false;

    function bridge(user: { id: string; email?: string | null } | null) {
      if (cancelled) return;
      if (user) {
        if (!userFor("apps")) {
          login("apps", user.email || "pasien@apps", "front_office");
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

  if (checking) return <LoginSkeleton system="apps" />;
  if (!authed) return <LoginSkeleton system="apps" />;

  return (
    <AppShell system="apps">
      <Outlet />
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/apps")({
  head: () => brandHead("apps"),
  ssr: false,
  component: Layout,
});
