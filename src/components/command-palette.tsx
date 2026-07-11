import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { NAV } from "@/lib/nav-config";
import type { System } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export function CommandPalette({ system, open, onOpenChange }: { system: System; open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const items = NAV[system];

  const groups = useMemo(() => {
    const g = new Map<string, typeof items>();
    for (const it of items) {
      const k = it.group ?? "Umum";
      if (!g.has(k)) g.set(k, [] as typeof items);
      g.get(k)!.push(it);
    }
    return Array.from(g.entries());
  }, [items]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t("shell.search_ph")} />
      <CommandList>
        <CommandEmpty>Tidak ada hasil.</CommandEmpty>
        {groups.map(([group, list]) => (
          <CommandGroup key={group} heading={group}>
            {list.map((it) => {
              const Icon = it.icon;
              const path = `/${system}${it.slug ? `/${it.slug}` : ""}`;
              return (
                <CommandItem
                  key={path}
                  value={`${group} ${it.label} ${it.slug}`}
                  onSelect={() => {
                    onOpenChange(false);
                    navigate({ to: path });
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{it.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { open, setOpen };
}
