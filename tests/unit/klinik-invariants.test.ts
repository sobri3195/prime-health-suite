// Run: bunx tsx --test tests/unit/klinik-invariants.test.ts
// or:  node --import tsx --test tests/unit/klinik-invariants.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { computePaymentStatus, findScheduleOverlap } from "../../src/lib/klinik-invariants";

// ============ addInvoicePayment: status consistency ============
test("payment: unpaid → partial", () => {
  const r = computePaymentStatus(100_000, 0, 30_000);
  assert.equal(r.newPaid, 30_000);
  assert.equal(r.status, "partial");
});

test("payment: partial → paid on exact remaining", () => {
  const r = computePaymentStatus(100_000, 40_000, 60_000);
  assert.equal(r.newPaid, 100_000);
  assert.equal(r.status, "paid");
});

test("payment: single full payment → paid", () => {
  const r = computePaymentStatus(50_000, 0, 50_000);
  assert.equal(r.status, "paid");
});

test("payment: reject overpay", () => {
  assert.throws(() => computePaymentStatus(100_000, 40_000, 70_000), /melebihi sisa/);
});

test("payment: reject when already lunas", () => {
  assert.throws(() => computePaymentStatus(100_000, 100_000, 1), /sudah lunas/);
});

test("payment: reject zero/negative amount", () => {
  assert.throws(() => computePaymentStatus(100_000, 0, 0), /> 0/);
  assert.throws(() => computePaymentStatus(100_000, 0, -10), /> 0/);
});

test("payment: reject invalid total", () => {
  assert.throws(() => computePaymentStatus(0, 0, 10), /Total invoice/);
});

// ============ Jadwal overlap: boundary cases ============
const baseA = { dokter_name: "dr. A", day: "Senin", start_time: "08:00", end_time: "12:00", is_active: true, id: "a" };
const baseB = { dokter_name: "dr. A", day: "Senin", start_time: "13:00", end_time: "17:00", is_active: true, id: "b" };

test("overlap: candidate ends exactly at other.start → no overlap", () => {
  const c = { ...baseA, id: undefined, start_time: "07:00", end_time: "08:00" };
  assert.equal(findScheduleOverlap(c, [baseA]), null);
});

test("overlap: candidate starts exactly at other.end → no overlap", () => {
  const c = { ...baseA, id: undefined, start_time: "12:00", end_time: "13:00" };
  assert.equal(findScheduleOverlap(c, [baseA]), null);
});

test("overlap: candidate fully inside → clash", () => {
  const c = { ...baseA, id: undefined, start_time: "09:00", end_time: "10:00" };
  assert.notEqual(findScheduleOverlap(c, [baseA]), null);
});

test("overlap: partial left → clash", () => {
  const c = { ...baseA, id: undefined, start_time: "07:00", end_time: "09:00" };
  assert.notEqual(findScheduleOverlap(c, [baseA]), null);
});

test("overlap: partial right → clash", () => {
  const c = { ...baseA, id: undefined, start_time: "11:30", end_time: "13:30" };
  assert.notEqual(findScheduleOverlap(c, [baseA]), null);
});

test("overlap: editing same row (same id) → no clash with itself", () => {
  const c = { ...baseA, start_time: "09:00", end_time: "11:00" };
  assert.equal(findScheduleOverlap(c, [baseA]), null);
});

test("overlap: inactive existing row is ignored", () => {
  const c = { ...baseA, id: undefined, start_time: "09:00", end_time: "11:00" };
  assert.equal(findScheduleOverlap(c, [{ ...baseA, is_active: false }]), null);
});

test("overlap: different day → no clash", () => {
  const c = { ...baseA, id: undefined, day: "Selasa" };
  assert.equal(findScheduleOverlap(c, [baseA]), null);
});

test("overlap: different dokter → no clash", () => {
  const c = { ...baseA, id: undefined, dokter_name: "dr. B" };
  assert.equal(findScheduleOverlap(c, [baseA]), null);
});

test("overlap: end <= start rejected", () => {
  const c = { ...baseA, id: undefined, start_time: "10:00", end_time: "10:00" };
  assert.throws(() => findScheduleOverlap(c, []), /Jam selesai/);
  const c2 = { ...baseA, id: undefined, start_time: "10:00", end_time: "09:00" };
  assert.throws(() => findScheduleOverlap(c2, []), /Jam selesai/);
});

test("overlap: candidate spans across multiple, returns first clash", () => {
  const c = { ...baseA, id: undefined, start_time: "07:00", end_time: "18:00" };
  const hit = findScheduleOverlap(c, [baseA, baseB]);
  assert.notEqual(hit, null);
});
