// Run: bunx tsx --test tests/unit/drug-interactions.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkInteractions } from "../../src/lib/drug-interactions";

test("interaction: warfarin + aspirin → danger", () => {
  const hits = checkInteractions(["Warfarin 5mg", "Aspirin 100mg"]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].severity, "danger");
  assert.match(hits[0].reason, /perdarahan/i);
});

test("interaction: case-insensitive substring match", () => {
  const hits = checkInteractions(["TIMOLOL 0.5% eye drop", "Propranolol Tab 40mg"]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].severity, "warning");
});

test("interaction: no clash → empty", () => {
  const hits = checkInteractions(["Paracetamol", "Amoxicillin"]);
  assert.deepEqual(hits, []);
});

test("interaction: single drug never matches self", () => {
  assert.deepEqual(checkInteractions(["Warfarin"]), []);
});

test("interaction: empty/whitespace names ignored", () => {
  assert.deepEqual(checkInteractions(["", "  ", ""]), []);
});

test("interaction: multiple pairs detected", () => {
  const hits = checkInteractions([
    "Warfarin", "Aspirin", "Pilocarpine", "Atropine",
  ]);
  assert.equal(hits.length, 2);
  assert.ok(hits.every((h) => h.severity === "danger"));
});

test("interaction: order-independent (a,b or b,a)", () => {
  const h1 = checkInteractions(["Aspirin", "Warfarin"]);
  const h2 = checkInteractions(["Warfarin", "Aspirin"]);
  assert.equal(h1.length, 1);
  assert.equal(h2.length, 1);
  assert.equal(h1[0].severity, h2[0].severity);
});

test("interaction: same drug listed twice does not trigger self-match", () => {
  const hits = checkInteractions(["Warfarin", "Warfarin"]);
  assert.deepEqual(hits, []);
});
