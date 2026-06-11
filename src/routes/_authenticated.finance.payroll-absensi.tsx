import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/finance/payroll-absensi")({
  component: () => <Navigate to="/sim-klinik/absensi" replace />,
});
