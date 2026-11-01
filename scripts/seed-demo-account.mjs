#!/usr/bin/env bun
/**
 * Seed satu kali akun demo untuk tiga sistem (Apps, SIM Klinik, Finance).
 *
 * Akun demo adalah identitas publik demo, bukan akun operator. Script ini
 * menjadi satu-satunya jalur pembuatan akun dan role demo: tidak dipanggil
 * oleh kode aplikasi, tidak ikut build/deploy, dan tidak pernah mencetak
 * password.
 *
 * Usage (jalankan dengan Bun karena mengimpor src/lib/demo-account.ts):
 *   bun run demo:seed --check            verifikasi read-only, tanpa service key
 *   bun run demo:seed                    buat akun + role (idempoten)
 *   bun run demo:seed --update-password  selaraskan password akun yang sudah ada
 *   bun run demo:seed --help
 *
 * Environment (dibaca dari .env lokal; jangan commit nilainya):
 *   SUPABASE_URL atau VITE_SUPABASE_URL
 *   SUPABASE_PUBLISHABLE_KEY atau VITE_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SERVICE_ROLE_KEY            hanya untuk mode seed
 */
import { createClient } from "@supabase/supabase-js";
import { DEMO_ACCOUNT } from "../src/lib/demo-account.ts";

/** Role yang dibutuhkan ketiga sistem. Cukup `kasir`, tanpa `super_admin`. */
const DEMO_ROLES = ["kasir"];
const PER_PAGE = 200;
const MAX_PAGE = 100;
const EMAIL = DEMO_ACCOUNT.email.toLowerCase();

const argv = process.argv.slice(2);
const CHECK_ONLY = argv.includes("--check");
const UPDATE_PASSWORD = argv.includes("--update-password");

const USAGE = `Penggunaan: bun scripts/seed-demo-account.mjs [--check] [--update-password]

  --check            verifikasi read-only memakai publishable key
  --update-password  samakan password akun yang sudah ada dengan DEMO_ACCOUNT
  --help             tampilkan bantuan ini`;

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function requireEnv(label, names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return fail(`${label} belum diatur. Isi salah satu dari: ${names.join(", ")}`);
}

function createSafeClient(url, key) {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function isEmailExists(error) {
  if (!error) return false;
  if (error.code === "email_exists") return true;
  return /already been registered|already exists/i.test(error.message ?? "");
}

async function findUserByEmail(admin) {
  for (let page = 1; page <= MAX_PAGE; page += 1) {
    const { data, error } = await admin.listUsers({ page, perPage: PER_PAGE });
    if (error) fail(`membaca daftar pengguna gagal: ${error.message}`);
    const users = data?.users ?? [];
    const match = users.find((user) => (user.email ?? "").toLowerCase() === EMAIL);
    if (match) return match;
    if (users.length < PER_PAGE) return null;
  }
  return null;
}

/** Buat akun bila belum ada; akun yang sudah ada tidak diubah kecuali diminta. */
async function ensureDemoUser(admin) {
  const existing = await findUserByEmail(admin);
  if (existing) {
    console.log(`✓ akun demo sudah ada (${existing.id})`);
    return existing;
  }

  const { data, error } = await admin.createUser({
    email: DEMO_ACCOUNT.email,
    password: DEMO_ACCOUNT.password,
    email_confirm: true,
    user_metadata: { name: "Demo Kasir" },
  });

  if (error) {
    if (!isEmailExists(error)) fail(`membuat akun demo gagal: ${error.message}`);
    const user = await findUserByEmail(admin);
    if (!user) fail("akun dilaporkan sudah ada tetapi tidak ditemukan saat pencarian ulang");
    console.log(`✓ akun demo sudah ada (${user.id})`);
    return user;
  }

  console.log(`✓ akun demo dibuat (${data.user.id})`);
  return data.user;
}

/** Pasang role demo secara idempoten; role lain yang sudah ada tidak disentuh. */
async function ensureDemoRoles(admin, userId) {
  const { data, error } = await admin.from("user_roles").select("role").eq("user_id", userId);
  if (error) fail(`membaca role akun demo gagal: ${error.message}`);

  const granted = new Set((data ?? []).map((row) => row.role));
  for (const role of DEMO_ROLES) {
    if (granted.has(role)) {
      console.log(`✓ role ${role} sudah terpasang`);
      continue;
    }
    const { error: insertError } = await admin.from("user_roles").insert({
      user_id: userId,
      role,
    });
    if (insertError && insertError.code !== "23505") {
      fail(`menambah role ${role} gagal: ${insertError.message}`);
    }
    console.log(`✓ role ${role} ditambahkan`);
  }

  const extra = [...granted].filter((role) => !DEMO_ROLES.includes(role));
  if (extra.length) console.log(`⚠ role lain pada akun demo tidak diubah: ${extra.join(", ")}`);
}

async function syncPassword(admin, user) {
  const { error } = await admin.updateUserById(user.id, { password: DEMO_ACCOUNT.password });
  if (error) fail(`menyelaraskan password gagal: ${error.message}`);
  console.log("✓ password akun demo diselaraskan dengan DEMO_ACCOUNT");
}

/** Login sebagai akun demo lalu baca izinnya lewat RPC yang sama dengan aplikasi. */
async function verify(url, publishableKey) {
  const supabase = createSafeClient(url, publishableKey);
  const results = [];

  const { data, error } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNT.email,
    password: DEMO_ACCOUNT.password,
  });
  if (error) {
    results.push({ ok: false, label: "login", detail: error.message });
    return results;
  }

  const uid = data.user.id;
  results.push({ ok: true, label: "login", detail: uid });

  const roles = await supabase.rpc("current_user_roles");
  if (roles.error) {
    results.push({ ok: false, label: "current_user_roles", detail: roles.error.message });
  } else {
    const granted = Array.isArray(roles.data) ? roles.data : [];
    const missing = DEMO_ROLES.filter((role) => !granted.includes(role));
    results.push({
      ok: missing.length === 0,
      label: "current_user_roles",
      detail: JSON.stringify(granted),
    });
  }

  const expectations = [
    ["klinik_is_staff", true],
    ["fin_can_view", true],
    ["fin_can_edit", false],
  ];
  for (const [fn, expected] of expectations) {
    const res = await supabase.rpc(fn, { _uid: uid });
    if (res.error) {
      results.push({ ok: false, label: fn, detail: res.error.message });
      continue;
    }
    results.push({
      ok: res.data === expected,
      label: fn,
      detail: `${res.data} (harus ${expected})`,
    });
  }

  await supabase.auth.signOut();
  return results;
}

async function main() {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return;
  }

  console.log(`mode: ${CHECK_ONLY ? "--check (read-only)" : "seed"}`);
  const url = requireEnv("SUPABASE_URL", ["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  const publishableKey = requireEnv("SUPABASE_PUBLISHABLE_KEY", [
    "SUPABASE_PUBLISHABLE_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]);

  if (!CHECK_ONLY) {
    const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", ["SUPABASE_SERVICE_ROLE_KEY"]);
    const admin = createSafeClient(url, serviceKey);
    const user = await ensureDemoUser(admin);
    if (UPDATE_PASSWORD) await syncPassword(admin, user);
    await ensureDemoRoles(admin, user.id);
  } else if (UPDATE_PASSWORD) {
    console.log("⚠ --update-password diabaikan pada mode --check");
  }

  const results = await verify(url, publishableKey);
  for (const result of results) {
    const suffix = result.detail ? ` — ${result.detail}` : "";
    console.log(`${result.ok ? "✓" : "✗"} ${result.label}${suffix}`);
  }

  const loginFailed = results.some((result) => result.label === "login" && !result.ok);
  if (loginFailed) {
    fail(
      "login akun demo gagal; bila password sudah diganti, jalankan " +
        "`bun run demo:seed --update-password`",
    );
  }
  if (results.some((result) => !result.ok)) fail("verifikasi izin akun demo gagal");
  console.log("✓ akun demo siap dipakai Apps, SIM Klinik, dan Finance.");
}

await main();
