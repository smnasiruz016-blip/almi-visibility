/**
 * 🔴 ROW 59 — FALSIFIABILITY OF FINDINGS: every presented finding says what would prove it wrong, as three named
 * parts, pointing at a method this product holds. Real census GREEN; every limb RED, ALONE.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { refutationCensus, presentedPopulation, heldMethods, REFUTATION_PARTS, CENSUS_LIMIT } from "../src/audit/falsifiability.mjs";
import { REFUTATION_REGISTER } from "../config/refutation-register.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const AUDIT = join(REPO, "runs", "audit");
const RECORDS = readdirSync(AUDIT).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(join(AUDIT, f)).readAll());
const RUNNERS = readdirSync(join(REPO, "bin")).filter((f) => f.endsWith(".mjs")).map((f) => `bin/${f}`);

const census = (register = REFUTATION_REGISTER, records = RECORDS) => refutationCensus({ records, register, runners: RUNNERS });
const clone = () => JSON.parse(JSON.stringify(REFUTATION_REGISTER));
/** Every failure list the census keeps, so a RED can prove it tripped exactly ONE. */
const fired = (c) => Object.fromEntries(["missing", "unrefutable", "emptyParts", "unobtainable", "stale"].map((k) => [k, c[k].length]));
const only = (c, key, n = 1) => {
  const f = fired(c);
  assert.equal(f[key], n, `${key} did not fire ${n} time(s): ${JSON.stringify(f)}`);
  for (const [k, v] of Object.entries(f)) if (k !== key) assert.equal(v, 0, `the sabotage of ${key} also tripped ${k} — a sabotage that trips two proves neither`);
  assert.equal(c.ok, false);
};

test("🟢 REAL: the census checks the population READ FROM THE STORE — 17 finding classes and 3 recommendations — and all 20 carry a structured refutation", () => {
  const c = census();
  assert.deepEqual(c.population, presentedPopulation(RECORDS), "the population was not taken from the store");
  assert.equal(c.population.classes.length, 17);
  assert.deepEqual(c.population.recommendations, ["REC-AI-CRAWLER-BLOCK", "REC-NOINDEX-CV-GUIDE", "REC-ROBOTS-CORRIDOR"]);
  assert.equal(c.checked, 20);
  assert.equal(c.carrying.length, 20);
  assert.deepEqual(fired(c), { missing: 0, unrefutable: 0, emptyParts: 0, unobtainable: 0, stale: 0 });
  assert.equal(c.vacuous, false);
  assert.equal(c.ok, true);
  assert.deepEqual(REFUTATION_PARTS, ["observation", "source", "condition"]);
});

test("🔴 the census never reads its own source as compliant: the population is the store's, and a register key the store lacks is STALE", () => {
  const reg = clone();
  reg.classes["a-class-no-store-holds"] = { ...reg.classes.canonical };
  const c = census(reg);
  assert.ok(!c.population.classes.includes("a-class-no-store-holds"), "a register key entered the population");
  only(c, "stale");
});

test("🔴 RED: a finding with its refutation REMOVED is refused — alone", () => {
  const reg = clone();
  delete reg.classes.canonical;
  only(census(reg), "missing");
});

for (const part of ["observation", "source", "condition"]) {
  test(`🔴 RED: a refutation with its ${part.toUpperCase()} emptied is refused — alone`, () => {
    const reg = clone();
    if (part === "source") reg.classes.canonical.source = { method: "", detail: "" };
    else reg.classes.canonical[part] = "   ";
    const c = census(reg);
    only(c, "emptyParts");
    assert.deepEqual(c.emptyParts, [{ kind: "class", key: "canonical", part }]);
  });
}

test("🔴 RED: an observation from a method this product does not hold is refused as UNOBTAINABLE — alone", () => {
  const reg = clone();
  reg.recommendations["REC-ROBOTS-CORRIDOR"].source.method = "competitor-traffic-panel";
  const c = census(reg);
  only(c, "unobtainable");
  assert.equal(c.unobtainable[0].method, "competitor-traffic-panel");
  assert.equal(heldMethods({ records: RECORDS, runners: RUNNERS }).has("competitor-traffic-panel"), false);
});

test("🔴 a finding nobody can write a refutation for is counted NOT WRITTEN, named with its reason, and fails the census — never skipped", () => {
  const reg = clone();
  reg.classes.canonical = { unrefutable: { reason: "no method we hold could observe its opposite" } };
  const c = census(reg);
  only(c, "unrefutable");
  assert.equal(c.unrefutable[0].reason, "no method we hold could observe its opposite");
});

test("🔴 RED: a census over an EMPTY population is a FAILURE, not a pass", () => {
  const c = census(REFUTATION_REGISTER, []);
  assert.equal(c.vacuous, true);
  assert.equal(c.checked, 0);
  assert.equal(c.ok, false);
});

test("CONTROL: a held method may be a detector in the store or a runner in bin/ — and nothing typed in the census", () => {
  const m = heldMethods({ records: RECORDS, runners: RUNNERS });
  assert.ok(m.has("robots-scope") && m.has("human-verification"), "a detector recorded in the store is not held");
  assert.ok(m.has("bin/crawl.mjs"), "a runner in bin/ is not held");
  assert.match(CENSUS_LIMIT, /CANNOT prove the refutation is well chosen/);
});
