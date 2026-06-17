function score(pw: string): number {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}

const LABELS = ["Sangat lemah", "Lemah", "Cukup", "Kuat", "Sangat kuat"];
const COLORS = ["bg-red-500", "bg-red-400", "bg-amber-400", "bg-emerald-500", "bg-emerald-600"];

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;
  const s = score(value);
  return (
    <div className="mt-1" aria-live="polite">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${i < s ? COLORS[s] : "bg-black/10"}`}
          />
        ))}
      </div>
      <p className="mt-1 text-[11px] opacity-70">Kekuatan: {LABELS[s]}</p>
    </div>
  );
}
