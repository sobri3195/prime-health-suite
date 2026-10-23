import { test } from "node:test";
import assert from "node:assert/strict";
import { isDemoLoginEnabled } from "../../src/lib/demo-account";

test("demo: production controls require explicit opt-in", () => {
  assert.equal(isDemoLoginEnabled(false), false);
  assert.equal(isDemoLoginEnabled(false, "true"), true);
  for (const value of ["false", "", "1", "TRUE"]) {
    assert.equal(isDemoLoginEnabled(false, value), false, value);
  }
});

test("demo: development defaults to enabled but respects explicit disable", () => {
  assert.equal(isDemoLoginEnabled(true), true);
  assert.equal(isDemoLoginEnabled(true, "false"), false);
  assert.equal(isDemoLoginEnabled(true, "true"), true);
});
