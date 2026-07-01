// Whitelist interaksi obat sederhana (case-insensitive substring match).
// Sumber: konvensi umum terapi oftalmologi + kontraindikasi klasik.
// Untuk kebutuhan produksi, ganti dengan integrasi ke basis data farmakologi (DrugBank/RxNorm).

export type DrugInteraction = {
  a: string; // pola nama obat A (lowercase substring)
  b: string; // pola nama obat B (lowercase substring)
  severity: "warning" | "danger";
  reason: string;
};

export const DRUG_INTERACTIONS: DrugInteraction[] = [
  { a: "warfarin", b: "aspirin", severity: "danger", reason: "Meningkatkan risiko perdarahan berat." },
  { a: "warfarin", b: "ibuprofen", severity: "danger", reason: "NSAID + antikoagulan → risiko perdarahan." },
  { a: "timolol", b: "propranolol", severity: "warning", reason: "Beta-blocker sistemik + topikal → bradikardia." },
  { a: "pilocarpine", b: "atropine", severity: "danger", reason: "Efek antagonis (miotik vs midriatik)." },
  { a: "tropicamide", b: "pilocarpine", severity: "warning", reason: "Efek pupil bertentangan." },
  { a: "dexamethasone", b: "prednisolone", severity: "warning", reason: "Kombinasi kortikosteroid → efek samping berlipat." },
  { a: "ciprofloxacin", b: "tizanidine", severity: "danger", reason: "Ciprofloxacin memperkuat efek tizanidine (hipotensi berat)." },
  { a: "acetazolamide", b: "aspirin", severity: "warning", reason: "Risiko toksisitas salisilat pada dosis tinggi." },
  { a: "chloramphenicol", b: "phenytoin", severity: "warning", reason: "Meningkatkan kadar fenitoin." },
];

export type InteractionHit = { drugs: [string, string]; severity: "warning" | "danger"; reason: string };

/** Periksa daftar nama obat terhadap whitelist interaksi. */
export function checkInteractions(drugNames: string[]): InteractionHit[] {
  const norm = drugNames.map((n) => (n ?? "").toLowerCase().trim()).filter(Boolean);
  const hits: InteractionHit[] = [];
  for (const rule of DRUG_INTERACTIONS) {
    const iA = norm.findIndex((n) => n.includes(rule.a));
    const iB = norm.findIndex((n) => n.includes(rule.b));
    if (iA !== -1 && iB !== -1 && iA !== iB) {
      hits.push({ drugs: [drugNames[iA], drugNames[iB]], severity: rule.severity, reason: rule.reason });
    }
  }
  return hits;
}
