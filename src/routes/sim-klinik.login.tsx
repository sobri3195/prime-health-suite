import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";
import { SystemLoginForm } from "@/components/system-login-form";
import { LoginSkeleton } from "@/components/auth/login-skeleton";
import { useAuth } from "@/lib/auth";
import { brandHead } from "@/lib/brand";

export const Route = createFileRoute("/sim-klinik/login")({
  validateSearch: z.object({ redirect: z.string().optional() }).optional(),
  head: () => brandHead("sim-klinik", "Masuk", { noindex: true }),
  ssr: false,
  component: Page,
});

function Page() {
  const { userFor, hydrated } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const user = userFor("sim-klinik");

  useEffect(() => {
    if (hydrated && user) {
      const safe = search?.redirect?.startsWith("/sim-klinik") ? search.redirect : "/sim-klinik";
      navigate({ to: safe, replace: true });
    }
  }, [hydrated, user, navigate, search]);

  if (!hydrated || user) return <LoginSkeleton system="sim-klinik" />;
  return <SystemLoginForm system="sim-klinik" redirect={search?.redirect} />;
}
