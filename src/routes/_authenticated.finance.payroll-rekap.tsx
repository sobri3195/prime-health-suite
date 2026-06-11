import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/finance/payroll-rekap")({
  component: () => <Navigate to="/finance/payroll" replace />,
});
