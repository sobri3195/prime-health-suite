import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { SystemLoginForm } from "@/components/system-login-form";
import { useAuth } from "@/lib/auth";
import { brandHead } from "@/lib/brand";

export const Route = createFileRoute("/apps/login")({
  validateSearch: z.object({ redirect: z.string().optional() }).optional(),
  head: () => brandHead("apps", "Masuk"),
  component: Page,
});

function Page() {
  const { userFor } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const user = userFor("apps");

  useEffect(() => {
    if (user) {
      const safe = search?.redirect?.startsWith("/apps") ? search.redirect : "/apps";
      navigate({ to: safe, replace: true });
    }
  }, [user, navigate, search]);

  return <SystemLoginForm system="apps" redirect={search?.redirect} />;
}
