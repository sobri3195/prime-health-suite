import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete = "current-password",
  ariaInvalid,
  ariaDescribedBy,
  minLength = 6,
  placeholder = "Min. 6 karakter",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: "current-password" | "new-password";
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
  minLength?: number;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (typeof e.getModifierState === "function") {
        setCaps(e.getModifierState("CapsLock"));
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKey);
    };
  }, []);

  const capsId = `${id}-caps`;
  const describedBy = [ariaDescribedBy, caps ? capsId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="block">
        <div className="text-xs font-medium opacity-70">Password</div>
        <div className="mt-1 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 focus-within:ring-2">
          <Lock className="h-4 w-4 opacity-50" aria-hidden />
          <input
            id={id}
            type={show ? "text" : "password"}
            required
            minLength={minLength}
            autoComplete={autoComplete}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            aria-invalid={ariaInvalid || undefined}
            aria-describedby={describedBy}
            className="w-full bg-transparent text-sm outline-none"
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="rounded p-1 text-xs opacity-60 hover:opacity-100"
            aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
            aria-pressed={show}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>
      {caps && (
        <p id={capsId} role="status" className="mt-1 text-[11px] text-amber-700">
          ⚠ Caps Lock aktif
        </p>
      )}
    </div>
  );
}
