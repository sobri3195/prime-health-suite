#!/usr/bin/env node
/**
 * i18n-lint: flags Indonesian/English UI strings in JSX text and common
 * UI props (placeholder, aria-label, title, alt, label, toast.* args)
 * that are NOT wrapped in t(...).
 *
 * Heuristic — false positives are expected. Use as a regression signal.
 *
 * Usage:
 *   node scripts/i18n-lint.mjs [glob...]    # default: src/components/apps
 *   node scripts/i18n-lint.mjs --json
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOTS = process.argv.slice(2).filter(a => !a.startsWith("--"));
const AS_JSON = process.argv.includes("--json");
const SCAN = ROOTS.length ? ROOTS : ["src/components/apps", "src/components/app-shell.tsx"];

// Words that strongly indicate human-readable copy (ID or EN).
const HUMAN_RE = /[a-zA-Z][a-zA-Z]+\s+[a-zA-Z][a-zA-Z]+/;
// Indonesian words that often appear in hardcoded copy.
const ID_HINT = /\b(Belum|Tidak|Sudah|Anda|Klinik|Pesan|Booking|Resep|Riwayat|Pasien|Poin|Tukar|Habis|Simpan|Batal|Hapus|Unggah|Lanjut|Kirim|Buka|Tutup|Pilih|Catatan|Alamat|Wajib|Berhasil|Gagal)\b/;
const EN_HINT = /\b(Loading|Save|Cancel|Delete|Upload|Continue|Send|Open|Close|Select|Note|Address|Required|Success|Failed|No data)\b/;
// Skip strings that look like ids, class names, urls, dates, etc.
const SKIP_RE = /^[#\/\.\-_:0-9a-z]+$|^[A-Z_]+$|^\s*$/;

function* walk(p) {
  const s = statSync(p);
  if (s.isFile()) { yield p; return; }
  for (const f of readdirSync(p)) yield* walk(join(p, f));
}

function* findFiles() {
  for (const root of SCAN) {
    try {
      for (const f of walk(root)) {
        const ext = extname(f);
        if (ext === ".tsx" || ext === ".ts") yield f;
      }
    } catch { /* ignore missing */ }
  }
}

const findings = [];

// JSX text:  >Some text<   (excluding {expressions})
const JSX_TEXT_RE = />\s*([A-Za-zÀ-ÿ][^<>{}\n]{3,}?)\s*</g;
// String literal props commonly user-visible
const PROP_RE = /(?:placeholder|aria-label|title|alt|label)\s*=\s*"([^"]{3,})"/g;
// toast.success("..."), toast.error("..."), toast("...")
const TOAST_RE = /toast(?:\.\w+)?\(\s*"([^"]{3,})"/g;

function isHumanCopy(s) {
  if (SKIP_RE.test(s)) return false;
  if (s.length < 4) return false;
  if (!/[a-zA-Z]/.test(s)) return false;
  // Looks like a translation key or technical id.
  if (/^[a-z][a-z0-9._]*$/.test(s) && s.includes(".")) return false;
  return HUMAN_RE.test(s) || ID_HINT.test(s) || EN_HINT.test(s);
}

for (const file of findFiles()) {
  if (file.endsWith("i18n.tsx") || file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
  const src = readFileSync(file, "utf8");
  // Find file-level i18n disable: // i18n-lint-disable-file
  if (src.includes("i18n-lint-disable-file")) continue;
  const lines = src.split("\n");
  const recordHit = (idx, text, kind) => {
    if (!isHumanCopy(text)) return;
    const line = idx + 1;
    if (lines[idx]?.includes("i18n-lint-disable-line")) return;
    findings.push({ file, line, kind, text: text.trim().slice(0, 80) });
  };
  // Run regex per line so we can get line numbers cheaply.
  lines.forEach((ln, idx) => {
    let m;
    JSX_TEXT_RE.lastIndex = 0;
    while ((m = JSX_TEXT_RE.exec(ln))) recordHit(idx, m[1], "jsx-text");
    PROP_RE.lastIndex = 0;
    while ((m = PROP_RE.exec(ln))) recordHit(idx, m[1], "prop");
    TOAST_RE.lastIndex = 0;
    while ((m = TOAST_RE.exec(ln))) recordHit(idx, m[1], "toast");
  });
}

if (AS_JSON) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  if (!findings.length) {
    console.log("✓ i18n-lint: no hardcoded UI strings found.");
  } else {
    console.log(`⚠ i18n-lint: ${findings.length} potential hardcoded strings`);
    for (const f of findings) {
      console.log(`  ${f.file}:${f.line} [${f.kind}] "${f.text}"`);
    }
    console.log(`\nTip: wrap with t("...") from @/lib/i18n, or add // i18n-lint-disable-line.`);
  }
}

process.exit(findings.length && process.env.I18N_LINT_STRICT === "1" ? 1 : 0);
