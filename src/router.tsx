import { QueryClient } from "@tanstack/react-query";
import { createRouter, ErrorComponent, Link, useRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function DefaultNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">404</p>
      <h2 className="mt-2 text-lg font-semibold">Halaman tidak ditemukan</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Tautan ini mungkin salah ketik atau modulnya belum dibuat.
      </p>
      <Link
        to="/"
        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Kembali ke beranda
      </Link>
    </div>
  );
}

function DefaultError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-lg font-semibold">Halaman gagal dimuat</h2>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {error.message || "Terjadi kesalahan tak terduga."}
      </p>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Coba lagi
        </button>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Beranda
        </Link>
      </div>
      {import.meta.env.DEV && (
        <details className="mt-6 max-w-xl text-left text-xs text-muted-foreground">
          <summary className="cursor-pointer">Detail teknis</summary>
          <ErrorComponent error={error} />
        </details>
      )}
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: DefaultError,
    defaultNotFoundComponent: DefaultNotFound,
  });

  return router;
};
