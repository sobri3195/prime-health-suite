import { useAuth, type Role } from "@/lib/auth";

// Roles that may mutate finance data. Everyone else (auditor, owner, kasir, ar/ap_staff)
// can view but not edit.
const FINANCE_EDIT_ROLES: Role[] = ["super_admin", "finance_manager", "accounting"];

export function canEditFinance(role?: Role | null) {
  return !!role && FINANCE_EDIT_ROLES.includes(role);
}

export function useFinanceAccess() {
  const { userFor } = useAuth();
  const user = userFor("finance");
  const canEdit = canEditFinance(user?.role);
  return {
    user,
    canView: !!user,
    canEdit,
    isAdmin: canEdit,
    isViewer: !!user && !canEdit,
    roleLabel: user?.role ?? null,
  };
}
