// Run: bunx tsx --test tests/unit/terbilang.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { terbilangRupiah } from "../../src/lib/terbilang";

test("terbilang: zero", () => {
  assert.equal(terbilangRupiah(0), "nol rupiah");
});

test("terbilang: satuan", () => {
  assert.equal(terbilangRupiah(1), "Satu rupiah");
  assert.equal(terbilangRupiah(7), "Tujuh rupiah");
});

test("terbilang: sepuluh & belas", () => {
  assert.equal(terbilangRupiah(10), "Sepuluh rupiah");
  assert.equal(terbilangRupiah(11), "Sebelas rupiah");
  assert.equal(terbilangRupiah(15), "Lima belas rupiah");
});

test("terbilang: puluhan", () => {
  assert.equal(terbilangRupiah(25), "Dua puluh lima rupiah");
  assert.equal(terbilangRupiah(99), "Sembilan puluh sembilan rupiah");
});

test("terbilang: seratus edge", () => {
  assert.equal(terbilangRupiah(100), "Seratus rupiah");
  assert.equal(terbilangRupiah(150), "Seratus lima puluh rupiah");
});

test("terbilang: seribu edge", () => {
  assert.equal(terbilangRupiah(1000), "Seribu rupiah");
  assert.equal(terbilangRupiah(1500), "Seribu lima ratus rupiah");
});

test("terbilang: ribuan", () => {
  assert.equal(terbilangRupiah(50_000), "Lima puluh ribu rupiah");
  assert.equal(terbilangRupiah(125_000), "Seratus dua puluh lima ribu rupiah");
});

test("terbilang: juta", () => {
  assert.equal(terbilangRupiah(1_500_000), "Satu juta lima ratus ribu rupiah");
});

test("terbilang: miliar", () => {
  const s = terbilangRupiah(2_500_000_000);
  assert.match(s, /^Dua miliar lima ratus juta rupiah$/);
});

test("terbilang: negative treated as absolute", () => {
  assert.equal(terbilangRupiah(-100), "Seratus rupiah");
});

test("terbilang: non-finite → nol", () => {
  assert.equal(terbilangRupiah(NaN), "nol rupiah");
  assert.equal(terbilangRupiah(Infinity), "nol rupiah");
});
