/**
 * 🔴 ROW 17 — THE THREE GAPS THAT WERE REAL (14 September 2026). Nothing that already existed is rebuilt:
 * makeDerivedFact, recomputeDerived, markForReview, FORMULAS and the weakest-input ceiling are tested in
 * test/facts-lifecycle.test.mjs.
 *
 *   1  a derived record could not live in the registry        → kind "derived", laws F28 and F29
 *   2  nothing detected that an input CHANGED                  → detectInputChanges → INPUT_CHANGED
 *   3  the derivation read the clock, so it was not byte-stable → no clock; computedOn is declared
 *
 * 🔴 LAW-FIXTURE-1 — THE FIXTURES BELOW ARE FAILURE CONTROLS, NOT EVIDENCE. The inputs are COPIES of one real
 * registry record with their claim, id and value changed so they can be told apart; the derived records built from
 * them exist only inside this file, because the defects they prove (an unresolved input, a standing above the
 * weakest input, a value that is not its formula's) must never be written into a real registry to be tested.
 *
 * 🔴 UPDATED 19 SEPTEMBER 2026 — THE REGISTRY NOW HOLDS ONE REAL DERIVED FACT. It used to hold none, and the last
 * test asserted that absence because row 17's input did not exist. The two REAL tests at the foot of this file are
 * row 17's evidence now; everything above them stays exactly what it was, a control.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { subject } from "./support/subjects.mjs";
const { factsDir: FACTS_DIR, productId: PRODUCT_ID } = await subject("almi-oet");
import { loadRegistry } from "../src/facts/registry.mjs";
import { factId, FACT_KINDS } from "../src/facts/schema.mjs";
import { fact } from "../src/facts/record.mjs";
import { validateRecord, validateRegistry } from "../src/facts/validate.mjs";
import { makeDerivedFact, detectInputChanges, reviewChangedInputs, recomputeDerived } from "../src/facts/lifecycle.mjs";

const { records: REAL } = await loadRegistry(FACTS_DIR, PRODUCT_ID);
const BASE = REAL.find((r) => r.id === "uk-code-of-practice.red-list-country-count");

/** A copy of a real, valid VERIFIED record — its claim, id and value changed. Not a registry record. */
const input = (letter, value, over = {}) => {
  const claim = { ...BASE.claim, qualifier: `fixture=${letter}` };
  return { ...BASE, claim, id: factId(claim), value: { ...BASE.value, value }, ...over };
};
const A = input("a", 300);
const B = input("b", 100);
const CLAIM = { subject: "fixture", predicate: "sum-of-a-and-b", qualifier: null };

const derivedRecord = (inputs = [A, B], over = {}) => ({
  _productId: PRODUCT_ID,
  ...fact({
    ...makeDerivedFact({ id: factId(CLAIM), claim: CLAIM, formula: "sum", inputs: inputs.map((i) => i.id), inputFacts: inputs, unit: "country", computedOn: "2026-09-14" }),
    scope: "shared",
    life: { status: "active", firstSeenOn: "2026-09-14", extractedOn: "2026-09-14" },
    ...over,
  }),
});
const laws = (r) => [...new Set(validateRecord(r).errors.map((e) => e.law))];
const f29 = (records) => validateRegistry(records).registryErrors.filter((e) => e.law === "F29");

/* ================================================================== *
 * GAP 1 — A DERIVED RECORD LIVES IN THE REGISTRY, AND PRIMARY RECORDS LOSE NOTHING
 * ================================================================== */

test("🔴 the inputs are lawful copies of a real record — so a failure below is the derived record's, not the fixture's", () => {
  assert.ok(BASE, "the real record the fixtures copy has gone");
  for (const i of [A, B]) assert.deepEqual(validateRecord(i).errors, []);
});

test("🟢 GREEN: a derived record of kind \"derived\" passes the validator on its own, and against the records it cites", () => {
  assert.deepEqual(Object.keys(FACT_KINDS), ["primary", "derived"]);
  const d = derivedRecord();
  assert.equal(d.kind, "derived");
  assert.deepEqual(validateRecord(d).errors, []);
  assert.deepEqual(f29([A, B, d]), []);
  assert.equal(d.value.value, 400);
  assert.equal(d.verificationState, "VERIFIED", "all-verified inputs inherit VERIFIED");
});

test("🔴 RED: WITHOUT the kind, the same derived record is refused — every source law binds it", () => {
  const { kind, ...noKind } = derivedRecord();
  assert.equal(kind, "derived");
  const v = laws(noKind);
  assert.ok(v.includes("F3"), `it was not held to the source laws: ${v}`);
  assert.ok(v.includes("F28"), "a derivation without the kind was not named as half a derived fact");
});

test("🔴 PRIMARY RECORDS LOSE NOTHING: a real record without its source still fails F3, and cannot dodge it by claiming the kind", () => {
  const { source, ...noSource } = BASE;
  assert.ok(source);
  assert.ok(laws(noSource).includes("F3"));
  // claiming kind "derived" with no derivation, while carrying a source, is refused
  assert.ok(laws({ ...BASE, kind: "derived" }).includes("F28"));
  // and dressed fully as derived, its value must BE the arithmetic over records the registry holds
  const dressed = { ...derivedRecord(), value: { value: 54, valueType: "derived", unit: "country" } };
  assert.deepEqual(validateRecord(dressed).errors, [], "its own shape is lawful…");
  assert.equal(f29([A, B, dressed]).length, 1, "…but F29 refuses a value that is not its formula's");
  assert.deepEqual(laws({ ...BASE, kind: "inferred" }), ["F28"]);
});

test("🔴 F29: an input the registry does not hold, and a standing above the weakest input, are refused against the real records", () => {
  assert.match(f29([A, derivedRecord()])[0].message, /is not in the registry/);
  const unknownB = input("b", 100, { verificationState: "UNKNOWN" });
  const overVerified = { ...derivedRecord([A, unknownB]), verificationState: "VERIFIED" };
  assert.match(f29([A, unknownB, overVerified]).map((e) => e.message).join(" "), /never be more verified than its weakest input/);
  assert.equal(derivedRecord([A, unknownB]).verificationState, "UNKNOWN");
  assert.throws(() => fact({ ...derivedRecord(), checks: { factCheckedOn: "2026-09-14" } }), /inherited from its weakest input/);
});

/* ================================================================== *
 * GAP 2 — A CHANGED INPUT IS DETECTED
 * ================================================================== */

test("🟢 CONTROL: inputs as the derivation stored them → nothing changed, nothing marked", () => {
  const facts = [A, B, derivedRecord()];
  assert.deepEqual(detectInputChanges(facts), []);
  const r = reviewChangedInputs({ facts });
  assert.deepEqual([r.derivedFacts, r.total], [1, 0]);
});

test("🔴 a stored input value CHANGED → INPUT_CHANGED is raised and every dependent marked, without the caller naming any fact", () => {
  const d = derivedRecord();
  const second = { ...derivedRecord([d, B]), id: "fixture.depends-on-the-sum", derivation: { formula: "sum", inputs: [d.id, B.id], inputValues: [400, 100] } };
  const moved = { ...A, value: { ...A.value, value: 301 } };
  const facts = [moved, B, d, second];
  assert.deepEqual(detectInputChanges(facts), [{ derivedId: d.id, input: A.id, stored: 300, current: 301, reason: "INPUT_CHANGED" }]);
  const r = reviewChangedInputs({ facts }); // 🔴 no badFactIds, no reason: the caller names nothing
  assert.equal(r.reason, "INPUT_CHANGED");
  assert.deepEqual(r.seeds, [A.id]);
  assert.deepEqual(r.markedFacts.map((m) => m.id).sort(), [d.id, "fixture.depends-on-the-sum"].sort(), "the walk must reach the fact derived from the derived fact");
  assert.equal(f29([moved, B, d]).length, 1, "and the registry refuses the stored value its formula no longer gives");
});

test("🔴 an input that is no longer there is INPUT_UNKNOWN — never read as unchanged", () => {
  assert.deepEqual(detectInputChanges([B, derivedRecord()]).map((c) => c.reason), ["INPUT_UNKNOWN"]);
});

/* ================================================================== *
 * GAP 3 — BYTE-STABLE
 * ================================================================== */

test("🔴 the same derivation computed twice is BYTE-IDENTICAL — even when the clock has moved between the two", () => {
  const make = () => makeDerivedFact({ id: "d", claim: CLAIM, formula: "sum", inputs: [A.id, B.id], inputFacts: [A, B], unit: "country", computedOn: "2026-09-14" });
  const first = JSON.stringify(make());
  const t = Date.now();
  while (Date.now() - t < 5) {} // the clock must have moved, or this proves nothing about the clock
  const second = JSON.stringify(make());
  assert.equal(second, first);
  assert.equal(JSON.stringify(derivedRecord()), JSON.stringify(derivedRecord()));
  assert.throws(() => makeDerivedFact({ id: "d", claim: CLAIM, formula: "sum", inputs: [A.id], inputFacts: [A], computedOn: "today" }), /ISO date or null/);
});

/* ================================================================== *
 * THE REAL REGISTRY — ROW 17's INPUT, STATED
 * ================================================================== */

/**
 * 🔴 19 SEPTEMBER 2026 — ROW 17's INPUT EXISTS, AND THIS IS IT.
 *
 * This test used to assert the registry held ZERO derived facts, and row 17 was BUILT-NOT-PROVED on
 * exactly that: the capability was complete and its input did not exist. One real derived record now
 * lives in the external subject store, so the row's frozen INPUT — "a real derived fact with real
 * inputs" — is satisfied for the first time and this test becomes the row's evidence rather than the
 * statement of what was missing.
 *
 * 🔴 THE POPULATION IS ONE. The frozen EVIDENCE asks for "recomputation of EVERY derived fact"; with
 * one derived fact that is one recomputation, and the assertions below say so in the open rather
 * than reading as though a corpus had been exercised. The 46 primary records are untouched.
 */
test("🔴 REAL: ONE derived fact — its formula, both input ids and its recomputation, over the real registry", () => {
  const derived = REAL.filter((r) => r.kind === "derived");
  assert.equal(derived.length, 1, "row 17's evidence rests on a population of ONE — not a corpus");
  assert.equal(REAL.filter((r) => r.kind !== undefined).length, 1, "a primary record was given a kind — the 46 were not to be edited");
  assert.equal(REAL.length, 47, "46 primary + the one derived record");

  const d = derived[0];
  assert.equal(d.id, "pk-pnmc.verification-fee-foreign-to-domestic-ratio");
  // formula and input IDs STORED — the row's EXPECTED clause, read off the record itself.
  assert.equal(d.derivation.formula, "ratio");
  assert.deepEqual(d.derivation.inputs, [
    "pk-pnmc.verification-fee.destination=foreign",
    "pk-pnmc.verification-fee.destination=domestic",
  ]);
  assert.deepEqual(d.derivation.inputValues, [10000, 1000]);

  // THE VALUE RECOMPUTABLE — recomputed from the records as they NOW stand, not from the snapshot.
  const inputs = d.derivation.inputs.map((id) => REAL.find((r) => r.id === id));
  assert.ok(inputs.every(Boolean), "an input id does not resolve in the registry");
  const again = recomputeDerived(d, inputs);
  assert.equal(again.ok, true, `stored ${again.stored} but the formula now gives ${again.recomputed}`);
  assert.equal(again.stored, 10);
  assert.equal(again.recomputed, 10);

  // NEVER MORE VERIFIED THAN ITS LEAST-VERIFIED INPUT — the ceiling recomputed by the constructor.
  const ceiling = makeDerivedFact({ id: d.id, claim: d.claim, formula: d.derivation.formula, inputs: d.derivation.inputs, inputFacts: inputs }).verificationState;
  assert.equal(ceiling, "UNKNOWN");
  assert.equal(d.verificationState, ceiling);
  assert.deepEqual(inputs.map((i) => i.verificationState), ["UNKNOWN", "UNKNOWN"]);

  // A derived record's source IS its inputs — it must not be dressed as a primary one.
  assert.equal(d.source ?? null, null, "the derived record carries a source — F28");
  assert.equal(d.checks?.factCheckedOn ?? null, null, "the derived record carries a fact-check date — its standing is inherited");

  // The whole registry, derived included, still satisfies every law.
  const v = validateRegistry(REAL);
  assert.equal(v.registryErrors.filter((e) => e.law === "F29" || e.law === "F28").length, 0);
  assert.equal(v.valid, true);

  // The change detector now has a real population, and reports no drift.
  const r = reviewChangedInputs({ facts: REAL });
  assert.deepEqual([r.derivedFacts, r.changes.length, r.total], [1, 0, 0]);
});

/**
 * 🔴 THE SAME RECORD, WITH ONE INPUT MOVED IN AN ISOLATED COPY. The registry on disk is not touched:
 * the copy exists only in this process, which is what makes it a failure CONTROL rather than a
 * second derived fact. It proves the last clause of row 17's EXPECTED — "dependents marked for
 * review when an input changes" — on the REAL record rather than on a fixture.
 */
test("🔴 REAL: moving one real input in an isolated copy marks the real derived fact for review", () => {
  const moved = REAL.map((r) =>
    r.id === "pk-pnmc.verification-fee.destination=domestic"
      ? { ...r, value: { ...r.value, value: 2000 } }
      : r,
  );
  const changes = detectInputChanges(moved);
  assert.deepEqual(changes, [{
    derivedId: "pk-pnmc.verification-fee-foreign-to-domestic-ratio",
    input: "pk-pnmc.verification-fee.destination=domestic",
    stored: 1000,
    current: 2000,
    reason: "INPUT_CHANGED",
  }]);
  const walk = reviewChangedInputs({ facts: moved });
  assert.ok(walk.total > 0, "the real derived fact was not marked for review when its input moved");

  // 🔴 AND IT WAS NOT SILENTLY REWRITTEN. The stored value is still the one that was computed.
  assert.equal(REAL.find((r) => r.kind === "derived").value.value, 10);
  const mismatch = recomputeDerived(REAL.find((r) => r.kind === "derived"), moved.filter((r) => ["pk-pnmc.verification-fee.destination=foreign", "pk-pnmc.verification-fee.destination=domestic"].includes(r.id)));
  assert.equal(mismatch.ok, false, "a moved input must produce a mismatch FINDING");
  assert.equal(mismatch.stored, 10);
  assert.equal(mismatch.recomputed, 5);
  assert.match(mismatch.note, /finding, not a repair/);
});
