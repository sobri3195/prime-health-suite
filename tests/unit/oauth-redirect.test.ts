import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getOAuthCallbackUrl,
  getOAuthError,
  getSafeSignInRedirect,
  usesLovableOAuth,
} from "../../src/lib/oauth-redirect";

test("OAuth: only Lovable deployment hosts use the Lovable broker", () => {
  assert.equal(usesLovableOAuth("prime-health-suite.lovable.app"), true);
  assert.equal(usesLovableOAuth("id-preview.lovableproject.com"), true);
  for (const hostname of [
    "prime-health-suite-i8igbc41t-sobri3195s-projects.vercel.app",
    "localhost",
    "clinic.example.com",
    "lovable.app.attacker.example",
    "notlovable.app",
  ]) {
    assert.equal(usesLovableOAuth(hostname), false, hostname);
  }
});

test("OAuth: keep deep links within the selected system", () => {
  assert.equal(
    getSafeSignInRedirect("sim-klinik", "/sim-klinik/registrasi?tab=baru#form"),
    "/sim-klinik/registrasi?tab=baru#form",
  );
  assert.equal(getSafeSignInRedirect("finance", "/finance?period=2026"), "/finance?period=2026");
  assert.equal(getSafeSignInRedirect("apps"), "/apps");
});

test("OAuth: reject external, malformed, cross-system, and traversal redirects", () => {
  for (const redirect of [
    "https://attacker.example/apps",
    "//attacker.example/apps",
    "/\\attacker.example/apps",
    "javascript:alert(1)",
    "/finance",
    "/apps-evil",
    "/apps/../finance",
    "/apps/%2e%2e/finance",
    "/apps\n/other",
    "",
  ]) {
    assert.equal(getSafeSignInRedirect("apps", redirect), "/apps", JSON.stringify(redirect));
  }
});

test("OAuth: login self-redirects resolve to the selected system home", () => {
  for (const system of ["apps", "sim-klinik", "finance"] as const) {
    for (const suffix of [
      "/login",
      "/login/",
      "/LOGIN",
      "/%6cogin",
      "/login?redirect=%2Fapps%2Flogin",
    ]) {
      assert.equal(getSafeSignInRedirect(system, `/${system}${suffix}`), `/${system}`);
    }
  }
});

test("OAuth: callback uses the current deployment and preserves the clinic destination", () => {
  const origin = "https://prime-health-suite-i8igbc41t-sobri3195s-projects.vercel.app";
  const callback = new URL(getOAuthCallbackUrl(origin, "sim-klinik", "/sim-klinik/registrasi"));
  assert.equal(callback.origin, origin);
  assert.equal(callback.pathname, "/login");
  assert.equal(callback.searchParams.get("oauth"), "google");
  assert.equal(callback.searchParams.get("system"), "sim-klinik");
  assert.equal(callback.searchParams.get("redirect"), "/sim-klinik/registrasi");
  assert.equal(callback.href.includes("/~oauth/"), false);
});

test("OAuth: callback rejects an untrusted return destination", () => {
  const callback = new URL(
    getOAuthCallbackUrl("https://clinic.example.com", "finance", "https://attacker.example"),
  );
  assert.equal(callback.searchParams.get("redirect"), "/finance");
});

test("OAuth: cancellation works for both query and fragment callbacks", () => {
  for (const separator of ["?", "#"]) {
    assert.equal(
      getOAuthError(new URL(`https://clinic.example.com/login${separator}error=access_denied`)),
      "auth.oauth.cancelled",
    );
  }
});

test("OAuth: provider details are replaced with a generic error key", () => {
  for (const suffix of [
    "?error=server_error&error_description=private-provider-details",
    "#error_description=private-provider-details",
    "?error_code=bad_oauth_state",
  ]) {
    assert.equal(
      getOAuthError(new URL(`https://clinic.example.com/login${suffix}`)),
      "auth.oauth.failed",
    );
  }
  assert.equal(getOAuthError(new URL("https://clinic.example.com/login?oauth=google")), null);
});
