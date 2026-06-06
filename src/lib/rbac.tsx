import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyRoles, type AppRole } from "@/lib/clinic.functions";

export type { AppRole };

export function useRoles() {
  const fn = useServerFn(getMyRoles);
  return useQuery({
    queryKey: ["my-roles"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });
}

export function hasAnyRole(roles: AppRole[] | undefined, want: AppRole[]) {
  if (!roles) return false;
  return roles.some((r) => want.includes(r));
}
