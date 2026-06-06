import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { IntegrationPage } from "@/components/apps/integration";

export const Route = createFileRoute("/_authenticated/integration")({
  component: () => (
    <AppShell system="apps">
      <IntegrationPage />
    </AppShell>
  ),
});
