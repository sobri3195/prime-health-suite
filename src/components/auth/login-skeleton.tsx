import { Loader2 } from "lucide-react";
import { BRAND } from "@/lib/brand";
import type { System } from "@/lib/auth";

export function LoginSkeleton({ system }: { system: System }) {
  const brand = BRAND[system];
  return (
    <div
      className="flex min-h-screen items-center justify-center px-6"
      style={{ background: brand.background, color: brand.foreground }}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="w-full max-w-sm animate-pulse">
        <div className="flex items-center gap-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
            style={{ background: brand.accent, color: "#fff" }}
          >
            {brand.faviconEmoji}
          </div>
          <div className="text-sm font-semibold opacity-80">{brand.name}</div>
        </div>
        <div className="mt-6 h-7 w-2/3 rounded bg-current opacity-10" />
        <div className="mt-2 h-3 w-full rounded bg-current opacity-10" />
        <div className="mt-6 space-y-3">
          <div className="h-10 rounded-md bg-current opacity-10" />
          <div className="h-10 rounded-md bg-current opacity-10" />
          <div className="h-10 rounded-md bg-current opacity-10" />
          <div
            className="flex h-10 items-center justify-center gap-2 rounded-md text-xs text-white"
            style={{ background: brand.accent }}
          >
            <Loader2 className="h-4 w-4 animate-spin" />
            Memeriksa sesi…
          </div>
        </div>
      </div>
    </div>
  );
}
