import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveSupabasePublicConfig, resolveSupabaseUrl } from "../../src/lib/supabase-config";
import { translateAuthError } from "../../src/lib/auth-helpers";

const build = { url: "https://build.example.com", publishableKey: "public-build-key" };

test("Supabase config: build-time public settings work without server bindings", () => {
  assert.deepEqual(resolveSupabasePublicConfig({}, build), build);
});

test("Supabase config: explicit runtime settings take priority over Vite values", () => {
  assert.deepEqual(
    resolveSupabasePublicConfig(
      {
        SUPABASE_URL: "https://runtime.example.com",
        SUPABASE_PUBLISHABLE_KEY: "public-runtime-key",
        VITE_SUPABASE_URL: "https://vite.example.com",
        VITE_SUPABASE_PUBLISHABLE_KEY: "public-vite-key",
      },
      build,
    ),
    { url: "https://runtime.example.com", publishableKey: "public-runtime-key" },
  );
});

test("Supabase config: VITE runtime bindings also work on external hosting", () => {
  assert.deepEqual(
    resolveSupabasePublicConfig(
      {
        VITE_SUPABASE_URL: "https://vite.example.com",
        VITE_SUPABASE_PUBLISHABLE_KEY: "public-vite-key",
      },
      build,
    ),
    { url: "https://vite.example.com", publishableKey: "public-vite-key" },
  );
});

test("Supabase config: absent fields fall back individually without mutating runtime", () => {
  const runtime = Object.freeze({ SUPABASE_URL: "https://runtime.example.com" });
  assert.deepEqual(resolveSupabasePublicConfig(runtime, build), {
    url: runtime.SUPABASE_URL,
    publishableKey: build.publishableKey,
  });
});

test("Supabase config: a service-role key never substitutes for a public key", () => {
  assert.throws(
    () =>
      resolveSupabasePublicConfig(
        { SUPABASE_SERVICE_ROLE_KEY: "private-test-key" },
        { url: build.url },
      ),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /SUPABASE_PUBLISHABLE_KEY/);
      assert.equal(error.message.includes("private-test-key"), false);
      return true;
    },
  );
});

test("Supabase config: completely missing configuration fails with variable names only", () => {
  assert.throws(() => resolveSupabasePublicConfig({}), /SUPABASE_URL.*SUPABASE_PUBLISHABLE_KEY/);
  assert.throws(
    () => resolveSupabasePublicConfig({}, { publishableKey: "public-test-key" }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /SUPABASE_URL/);
      assert.equal(error.message.includes("public-test-key"), false);
      return true;
    },
  );
});

test("Supabase config: admin URL resolution does not require a public key", () => {
  assert.equal(resolveSupabaseUrl({}, build.url), build.url);
  assert.equal(
    resolveSupabaseUrl({ SUPABASE_URL: "https://runtime.example.com" }, build.url),
    "https://runtime.example.com",
  );
});

test("Auth errors: missing configuration produces a recoverable user-facing message", () => {
  const source =
    "Missing Supabase environment variable(s): SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY. Connect Supabase in Lovable Cloud.";
  const message = translateAuthError(source);
  assert.equal(message, "Layanan login belum dikonfigurasi. Hubungi administrator.");
  assert.equal(message.includes("SUPABASE_"), false);
});
