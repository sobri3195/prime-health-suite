import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PatientAuthForm } from "@/components/apps/auth-form";
import { supabase } from "@/integrations/supabase/client";
import { brandHead } from "@/lib/brand";

export const Route = createFileRoute("/apps/login")({
  validateSearch: z.object({ redirect: z.string().optional() }).optional(),
  head: () => brandHead("apps", "Masuk Pasien", { noindex: true }),
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

  if (!checked) {
    return (
      <div
        className="grid min-h-dvh place-items-center bg-amber-50/40"
        role="status"
        aria-live="polite"
        aria-label="Memuat halaman masuk"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="text-xs text-amber-900/70">Memuat…</p>
        </div>
      </div>
    );
  }
  return <PatientAuthForm redirect={search?.redirect} />;
}
