import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { IntegrationPage } from "@/components/apps/integration";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/integration")({
  head: () => pageHead({ title: "Integrasi Sistem — Prime Health Suite", description: "Konfigurasi integrasi antar modul Apps, SIM Klinik, dan Finance.", path: "/integration" }),
  component: () => (
    <AppShell system="apps">
      <IntegrationPage />
    </AppShell>
  ),
});
