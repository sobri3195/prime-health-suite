import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { System } from "@/lib/auth";

const GNAV: Record<string, Partial<Record<System, string>>> = {
  d: { apps: "/apps", "sim-klinik": "/sim-klinik", finance: "/finance" },
  j: { finance: "/finance/jurnal" },
  l: { finance: "/finance/laporan", "sim-klinik": "/sim-klinik/laporan" },
  m: { finance: "/finance/master", "sim-klinik": "/sim-klinik/master" },
  p: { "sim-klinik": "/sim-klinik/pasien", apps: "/apps/profil" },
};

const isTypingTarget = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  if (!t) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (t as HTMLElement).isContentEditable;
};

export function useShortcuts(system: System) {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => {
    let pendingG = false;
    let gTimer: ReturnType<typeof setTimeout> | null = null;
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;
      if (e.key === "?" && (e.shiftKey || true)) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (e.key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        pendingG = true;
        if (gTimer) clearTimeout(gTimer);
        gTimer = setTimeout(() => { pendingG = false; }, 800);
        return;
      }
      if (pendingG) {
        const path = GNAV[e.key.toLowerCase()]?.[system];
        pendingG = false;
        if (gTimer) clearTimeout(gTimer);
        if (path) { e.preventDefault(); navigate({ to: path }); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [system, navigate]);
  return { helpOpen, setHelpOpen };
}

export function ShortcutsHelp({ open, onOpenChange, system }: { open: boolean; onOpenChange: (v: boolean) => void; system: System }) {
  const rows: { k: string; d: string }[] = [
    { k: "Ctrl / ⌘ + K", d: "Buka Command Palette" },
    { k: "?", d: "Tampilkan pintasan ini" },
    { k: "g d", d: "Ke Dashboard" },
    ...(GNAV.j[system] ? [{ k: "g j", d: "Ke Jurnal" }] : []),
    ...(GNAV.l[system] ? [{ k: "g l", d: "Ke Laporan" }] : []),
    ...(GNAV.m[system] ? [{ k: "g m", d: "Ke Master" }] : []),
    ...(GNAV.p[system] ? [{ k: "g p", d: system === "apps" ? "Ke Profil" : "Ke Pasien" }] : []),
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Pintasan keyboard</DialogTitle></DialogHeader>
        <div className="divide-y divide-border rounded-md border border-border">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center justify-between px-3 py-2 text-sm">
              <span className="text-muted-foreground">{r.d}</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">{r.k}</kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Tekan <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">g</kbd> lalu huruf target dalam 0.8 detik.</p>
      </DialogContent>
    </Dialog>
  );
}
