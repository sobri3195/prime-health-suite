// Privacy helpers — never render raw PII in tables/lists.
// These helpers are display-only; underlying mock data stays unchanged.

export function maskNIK(nik: string): string {
  if (!nik) return "-";
  const clean = nik.replace(/\s+/g, "");
  if (clean.length < 6) return "•".repeat(clean.length);
  return `${clean.slice(0, 4)}••••••${clean.slice(-2)}`;
}

export function maskPhone(phone: string): string {
  if (!phone) return "-";
  const clean = phone.replace(/[^\d+]/g, "");
  if (clean.length < 6) return "•".repeat(clean.length);
  return `${clean.slice(0, 4)}••••${clean.slice(-3)}`;
}

export function maskName(name: string): string {
  if (!name) return "-";
  return name
    .split(" ")
    .map((p, i) => (i === 0 ? p : p[0] ? `${p[0]}.` : ""))
    .join(" ");
}

export function calcAge(dobIso: string): number {
  const dob = new Date(dobIso);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

export function formatDateID(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function formatTimeID(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit",
  });
}
