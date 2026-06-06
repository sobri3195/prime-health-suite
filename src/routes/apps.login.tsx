import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PatientAuthForm } from "@/components/apps/auth-form";
import { supabase } from "@/integrations/supabase/client";
import { brandHead } from "@/lib/brand";

export const Route = createFileRoute("/apps/login")({
  validateSearch: z.object({ redirect: z.string().optional() }).optional(),
  head: () => brandHead("apps", "Masuk Pasien"),
  ssr: false,
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const safe = search?.redirect?.startsWith("/apps") ? search.redirect : "/apps";
        navigate({ to: safe, replace: true });
      } else {
        setChecked(true);
      }
    });
  }, [navigate, search]);

  if (!checked) return null;
  return <PatientAuthForm redirect={search?.redirect} />;
}
