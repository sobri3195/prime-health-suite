import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { useFinanceAccess } from "@/lib/finance-access";

export const Route = createFileRoute("/_authenticated/finance/reset-data")({
  component: Page,
});

function Page() {
  const { canEdit } = useFinanceAccess();
  return (
    <div>
      <PageHeader title="Reset Data" desc="Operasi reset bersifat destruktif dan tidak dapat diurungkan." />
      <Card className="p-6 border-rose-500/30 bg-rose-500/5">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600 mt-0.5" />
          <div className="space-y-2">
            <div className="font-semibold text-rose-700">Operasi Reset Tidak Tersedia</div>
            <p className="text-sm text-muted-foreground">
              Fitur reset data sengaja tidak diaktifkan dari UI untuk mencegah penghapusan data finance secara tidak sengaja.
              Jika Anda benar-benar perlu mereset data (mis. untuk go-live ulang atau pemisahan tahun fiskal), silakan hubungi
              administrator sistem—operasi ini akan dilakukan langsung di database dengan backup terlebih dahulu.
            </p>
            {!canEdit && <p className="text-xs text-muted-foreground">Anda berstatus viewer — perubahan apapun ditolak otomatis oleh RLS.</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}
