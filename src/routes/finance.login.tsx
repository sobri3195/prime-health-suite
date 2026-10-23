import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { SystemLoginForm } from "@/components/system-login-form";
import { LoginSkeleton } from "@/components/auth/login-skeleton";
import { useAuth } from "@/lib/auth";
import { brandHead } from "@/lib/brand";
import { getSafeSignInRedirect } from "@/lib/oauth-redirect";

export const Route = createFileRoute("/finance/login")({
  validateSearch: z.object({ redirect: z.string().optional() }).optional(),
  head: () => brandHead("finance", "Masuk", { noindex: true }),
  ssr: false,
  component: Page,
});

function Page() {
  const { userFor, hydrated } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const user = userFor("finance");

  useEffect(() => {
    if (hydrated && user) {
      const safe = getSafeSignInRedirect("finance", search?.redirect);
      navigate({ to: safe, replace: true });
    }
  }, [hydrated, user, navigate, search]);

  if (!hydrated || user) return <LoginSkeleton system="finance" />;
  return <SystemLoginForm system="finance" redirect={search?.redirect} />;
}
