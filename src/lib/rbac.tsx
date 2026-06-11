import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles, type AppRole } from "@/lib/clinic.functions";
import { supabase } from "@/integrations/supabase/client";

export type { AppRole };

export function useRoles(options: { enabled?: boolean } = {}) {
  const fn = useServerFn(getMyRoles);
  const [authReady, setAuthReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    if (options.enabled === false) {
      setAuthReady(true);
      setHasSession(false);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setHasSession(Boolean(data.session?.access_token));
      setAuthReady(true);
    }).catch(() => {
      if (cancelled) return;
      setHasSession(false);
      setAuthReady(true);
    });
    return () => { cancelled = true; };
  }, [options.enabled]);

  return useQuery({
    queryKey: ["my-roles"],
    queryFn: () => fn(),
    enabled: options.enabled !== false && authReady && hasSession,
    retry: false,
    staleTime: 60_000,
  });
}

export function hasAnyRole(roles: AppRole[] | undefined, want: AppRole[]) {
  if (!roles) return false;
  return roles.some((r) => want.includes(r));
}
