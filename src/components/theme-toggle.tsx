import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getStoredTheme, setTheme, type Theme } from "@/lib/theme";

/**
 * Floating theme toggle usable on any page (landing, auth, app-shell-less routes).
 * Persists choice via lib/theme (localStorage + `dark` class on <html>).
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setLocal] = useState<Theme>("light");

  useEffect(() => {
    setLocal(getStoredTheme());
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setLocal(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      title={theme === "dark" ? "Mode terang" : "Mode gelap"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/70 text-foreground backdrop-blur hover:bg-muted ${className}`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
