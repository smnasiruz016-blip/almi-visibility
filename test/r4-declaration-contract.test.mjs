/**
 * 🔴 R4 — THE DECLARATION CONTRACT (owner ruling FAISLA 2, 16 September 2026).
 *
 * The defect: a new fact record became VERIFIED because declared ∩ named-confirmed happened to omit a dimension the
 * record never declared — a qualifier, a list's completeness, a rule's binding party. These tests go against that
 * defect, one dimension at a time, in both directions, on purpose-built fixtures through the REAL guard
 * (judgeLeavingUnknown) and the REAL validation path (validateRegistry). Test 11 reads the REAL registry.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { judgeLeavingUnknown, underDeclarationContract } from "../src/evidence/verdict.mjs";
import { validateRegistry } from "../src/facts/validate.mjs";
import { DECLARATION_CONTRACT_AFTER } from "../src/facts/schema.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { loadRegistry, verifiedSourceBearingFacts, REGISTRY_VERIFIED_COUNT } from "../src/facts/registry.mjs";
import { adjudicateDimensions } from "../src/evidence/label-on-face.mjs";

/** 🔴 21 Sep 2026: the six records whose every dimension is NOT_APPLICABLE by the schema's own law, declared so by a
 * mechanical metadata completion (owner ruling, Row 50 label on face, clauses 3–4). Named, so a new one is visible. */
const MECHANICAL_NOT_APPLICABLE = Object.freeze([
  "ng-nmcn.issuing-body", "oet.content-licence-permits-stored-quotation", "pk-pnmc.issuing-body",
  "pk-pnmc.verification-response-time", "uk-code-of-practice.red-list-country-count", "uk-hcpc.certificate-maximum-age",
]);
/** 🔴 THE PROTECTION, KEPT AND TIGHTENED: no declaration is MANUFACTURED. A real record may carry claimDimensions only if
 * a human verified it under the contract, or if every declared dimension is NOT_APPLICABLE AND the schema's own law
 * makes every dimension inapplicable — a NOT_APPLICABLE the structure contradicts, or any element named without a
 * human, fails here. */
const assertNoManufacturedDeclaration = (records, ownerVerified) => {
  const declared = records.filter((r) => r.claimDimensions !== undefined).map((r) => r.id).sort();
  assert.deepEqual(declared, [...ownerVerified, ...MECHANICAL_NOT_APPLICABLE].sort(), "a claimDimensions declaration appeared that nobody can account for");
  for (const r of records.filter((x) => x.claimDimensions !== undefined && !ownerVerified.includes(x.id))) {
    assert.ok(Object.values(r.claimDimensions).every((d) => d === "NOT_APPLICABLE"), `${r.id}: a declaration naming an element was manufactured`);
    assert.ok(Object.values(adjudicateDimensions(r)).every((a) => a.mapping === "NOT_APPLICABLE"), `${r.id}: NOT_APPLICABLE declared where the claim's structure makes a dimension real`);
  }
};


const NA = "NOT_APPLICABLE";
const UNDER_CONTRACT = "2026-09-14";

/** A candidate leaving never-checked, dated under the contract, that meets every pre-R4 requirement. */
function candidate({ qualifier, valueType = "text", elements, dimensions, verification = {}, state = "VERIFIED" }) {
  const claim = { subject: "fixture-authority", predicate: "fixture-claim", ...(qualifier ? { qualifier } : {}) };
  return {
    id: `fixture-authority.fixture-claim${qualifier ? `.${qualifier}` : ""}`,
    claim,
    value: { value: "fixture value", valueType },
    claimElements: elements,
    ...(dimensions === undefined ? {} : { claimDimensions: dimensions }),
    verificationState: state,
    verification: {
      state,
      checkedOn: UNDER_CONTRACT,
      checkedBy: "human:fixture-checker",
      sourceTier: "OFFICIAL",
      sourceRead: true,
      elementsConfirmedKeys: [...elements],
      elementsNotFoundKeys: [],
      previous: { state: "UNVERIFIED", checkedOn: null },
      ...verification,
    },
  };
}
const judge = (r) => judgeLeavingUnknown(r.id, r.verification, r.claimElements, r);
const lawsOf = (r) => [...new Set(validateRegistry([r]).registryErrors.map((e) => e.law))].sort();
const reasonsOf = (r) => judge(r).reasons.join(" | ");

/* ---- the three dimensions' fixtures ---------------------------------------------------------------- */

const QUALIFIED = { qualifier: "destination=abroad", valueType: "money", elements: ["fee-amount", "fee-applies-abroad"] };
const QUALIFIED_DECLARED = { qualifier: "fee-applies-abroad", listCompleteness: NA, bindingParty: NA };

const LISTED = { valueType: "list", elements: ["item-a", "item-b", "list-is-complete"] };
const LISTED_DECLARED = { qualifier: NA, listCompleteness: "list-is-complete", bindingParty: NA };

const RULED = { valueType: "rule", elements: ["prohibition", "binds-employers"] };
const RULED_DECLARED = { qualifier: NA, listCompleteness: NA, bindingParty: "binds-employers" };

test("contract scope: dated after the contract's day, or undated, is bound; on or before it is not", () => {
  assert.equal(DECLARATION_CONTRACT_AFTER, "2026-09-13");
  assert.equal(underDeclarationContract({ checkedOn: UNDER_CONTRACT }), true);
  assert.equal(underDeclarationContract({ checkedOn: DECLARATION_CONTRACT_AFTER }), false);
  assert.equal(underDeclarationContract({}), true, "an undated check claimed the pre-contract population");
});

/* ---- qualifier -------------------------------------------------------------------------------------- */

test("🔴 R4 · 1 · QUALIFIER required and NOT declared → REFUSED", () => {
  for (const [label, dimensions] of [
    ["no claimDimensions at all", undefined],
    ["the qualifier left out", { listCompleteness: NA, bindingParty: NA }],
    ["the qualifier said NOT_APPLICABLE on a qualified claim", { ...QUALIFIED_DECLARED, qualifier: NA }],
    ["the qualifier named by a key that is not a declared element", { ...QUALIFIED_DECLARED, qualifier: "fee-applies-somewhere" }],
  ]) {
    const r = candidate({ ...QUALIFIED, dimensions });
    const j = judge(r);
    assert.equal(j.decision, "REFUSED", `${label}: the qualifier went undeclared and the record advanced`);
    assert.equal(j.dimensions.qualifier.state === "CONFIRMED" || j.dimensions.qualifier.state === "NOT_APPLICABLE", false, label);
    assert.match(reasonsOf(r), /qualifier is (not declared|declared NOT_APPLICABLE, but the claim's own structure requires it|declared as "fee-applies-somewhere", which is not one of the record's claimElements)/, label);
    assert.deepEqual(lawsOf(r), ["F24", "F30"], `${label}: declared VERIFIED past the refusal, with the declaration fault named`);
    assert.deepEqual(lawsOf(candidate({ ...QUALIFIED, dimensions, state: "UNKNOWN" })), ["F30"], `${label}: held UNKNOWN, only the declaration fault remains`);
  }
});

test("🔴 R4 · 2 · QUALIFIER declared but NOT explicitly confirmed by the verdict → REFUSED", () => {
  for (const [label, verification] of [
    ["the verdict does not name it", { elementsConfirmedKeys: ["fee-amount"] }],
    ["the verdict names it as not found", { elementsConfirmedKeys: ["fee-amount"], elementsNotFoundKeys: ["fee-applies-abroad"] }],
  ]) {
    const r = candidate({ ...QUALIFIED, dimensions: QUALIFIED_DECLARED, verification });
    assert.equal(judge(r).decision, "REFUSED", `${label}: an unconfirmed qualifier advanced`);
    assert.equal(judge(r).dimensions.qualifier.state, "NOT_CONFIRMED_BY_NAME", label);
    assert.match(reasonsOf(r), /qualifier is declared as "fee-applies-abroad" and the verdict does not confirm it by name/, label);
    assert.deepEqual(lawsOf(r), ["F24"], `${label}: a declared-but-unconfirmed qualifier is a refusal, not a declaration fault`);
  }
});

test("🔴 R4 · 3 · QUALIFIER declared AND confirmed → ALLOWED, and still subject to every other requirement", () => {
  const r = candidate({ ...QUALIFIED, dimensions: QUALIFIED_DECLARED });
  const j = judge(r);
  assert.deepEqual([j.decision, j.contract, j.dimensions.qualifier.state, [...j.reasons]], ["ADVANCED_ON_NEW_MEASUREMENT", "DECLARATION_CONTRACT", "CONFIRMED", []]);
  assert.deepEqual(lawsOf(r), []);
  const secondary = candidate({ ...QUALIFIED, dimensions: QUALIFIED_DECLARED, verification: { sourceTier: "SECONDARY" } });
  assert.deepEqual([judge(secondary).decision, [...judge(secondary).reasons]], ["REFUSED", ["the source is SECONDARY, not OFFICIAL"]]);
});

/* ---- list completeness ------------------------------------------------------------------------------ */

test("🔴 R4 · 4 · LIST COMPLETENESS material and NOT declared → REFUSED", () => {
  for (const [label, dimensions] of [
    ["no claimDimensions at all", undefined],
    ["completeness left out", { qualifier: NA, bindingParty: NA }],
    ["completeness said NOT_APPLICABLE on a list", { ...LISTED_DECLARED, listCompleteness: NA }],
  ]) {
    const r = candidate({ ...LISTED, dimensions });
    assert.equal(judge(r).decision, "REFUSED", `${label}: a list advanced with its completeness undeclared`);
    assert.match(reasonsOf(r), /listCompleteness is (not declared|declared NOT_APPLICABLE, but the claim's own structure requires it)/, label);
    assert.deepEqual(lawsOf(r), ["F24", "F30"], label);
  }
});

test("🔴 R4 · 5 · LIST COMPLETENESS declared but NOT explicitly confirmed → REFUSED", () => {
  const r = candidate({ ...LISTED, dimensions: LISTED_DECLARED, verification: { elementsConfirmedKeys: ["item-a", "item-b"] } });
  assert.equal(judge(r).decision, "REFUSED", "every item matched and the list was taken as complete by omission");
  assert.equal(judge(r).dimensions.listCompleteness.state, "NOT_CONFIRMED_BY_NAME");
  assert.match(reasonsOf(r), /listCompleteness is declared as "list-is-complete" and the verdict does not confirm it by name/);
  assert.deepEqual(lawsOf(r), ["F24"]);
});

test("🔴 R4 · 6 · LIST COMPLETENESS declared AND confirmed → ALLOWED, and still subject to every other requirement", () => {
  const r = candidate({ ...LISTED, dimensions: LISTED_DECLARED });
  assert.deepEqual([judge(r).decision, judge(r).dimensions.listCompleteness.state, [...judge(r).reasons]], ["ADVANCED_ON_NEW_MEASUREMENT", "CONFIRMED", []]);
  assert.deepEqual(lawsOf(r), []);
  const unnamed = candidate({ ...LISTED, dimensions: LISTED_DECLARED, verification: { checkedBy: "fixture-checker" } });
  assert.deepEqual([judge(unnamed).decision, [...judge(unnamed).reasons]], ["REFUSED", ["nobody is named as having checked it"]]);
});

/* ---- binding party / applicability ----------------------------------------------------------------- */

test("🔴 R4 · 7 · BINDING PARTY required and NOT declared → REFUSED", () => {
  for (const [label, dimensions] of [
    ["no claimDimensions at all", undefined],
    ["the binding party left out", { qualifier: NA, listCompleteness: NA }],
    ["the binding party said NOT_APPLICABLE on a rule", { ...RULED_DECLARED, bindingParty: NA }],
  ]) {
    const r = candidate({ ...RULED, dimensions });
    assert.equal(judge(r).decision, "REFUSED", `${label}: a rule advanced with whom it binds undeclared`);
    assert.match(reasonsOf(r), /bindingParty is (not declared|declared NOT_APPLICABLE, but the claim's own structure requires it)/, label);
    assert.deepEqual(lawsOf(r), ["F24", "F30"], label);
  }
});

test("🔴 R4 · 8 · BINDING PARTY declared but NOT explicitly confirmed → REFUSED", () => {
  const r = candidate({ ...RULED, dimensions: RULED_DECLARED, verification: { elementsConfirmedKeys: ["prohibition"] } });
  assert.equal(judge(r).decision, "REFUSED", "the prohibition was confirmed and whom it binds was taken as read");
  assert.equal(judge(r).dimensions.bindingParty.state, "NOT_CONFIRMED_BY_NAME");
  assert.match(reasonsOf(r), /bindingParty is declared as "binds-employers" and the verdict does not confirm it by name/);
  assert.deepEqual(lawsOf(r), ["F24"]);
});

test("🔴 R4 · 9 · BINDING PARTY declared AND confirmed → ALLOWED, and still subject to every other requirement", () => {
  const r = candidate({ ...RULED, dimensions: RULED_DECLARED });
  assert.deepEqual([judge(r).decision, judge(r).dimensions.bindingParty.state, [...judge(r).reasons]], ["ADVANCED_ON_NEW_MEASUREMENT", "CONFIRMED", []]);
  assert.deepEqual(lawsOf(r), []);
  const stale = candidate({ ...RULED, dimensions: RULED_DECLARED, verification: { checkedOn: undefined } });
  assert.equal(judge(stale).decision, "REFUSED");
  assert.match(judge(stale).reasons.join(" | "), /no NEW measurement/);
});

/* ---- fail-closed, and no regression ----------------------------------------------------------------- */

test("🔴 R4 · 10 · UNKNOWN / insufficient evidence stays FAIL-CLOSED — and under the contract a read is declared, never derived", () => {
  const complete = { ...QUALIFIED, dimensions: QUALIFIED_DECLARED };
  // every dimension declared and confirmed, but no read recorded: the pre-contract derivation does NOT fire
  const noRead = candidate({ ...complete, verification: { sourceRead: undefined } });
  assert.equal(judge(noRead).decision, "REFUSED", "a read was derived from named elements under the contract");
  assert.match(reasonsOf(noRead), /under the declaration contract a read is DECLARED \(sourceRead: true\), never derived/);
  const saidNotRead = candidate({ ...complete, verification: { sourceRead: false } });
  assert.equal(judge(saidNotRead).decision, "REFUSED");
  // partial evidence on a non-dimension element
  const partial = candidate({ ...complete, verification: { elementsConfirmedKeys: ["fee-applies-abroad"], elementsNotFoundKeys: ["fee-amount"] } });
  assert.equal(judge(partial).decision, "REFUSED");
  // undated: bound by the contract, and refused on both counts
  const undated = candidate({ ...QUALIFIED, verification: { checkedOn: undefined } });
  assert.equal(judge(undated).contract, "DECLARATION_CONTRACT");
  assert.equal(judge(undated).decision, "REFUSED");
  // declared UNKNOWN on insufficient evidence agrees with the guard; declared VERIFIED on it is F24
  for (const r of [noRead, partial]) {
    assert.deepEqual(lawsOf({ ...r, verificationState: "UNKNOWN", verification: { ...r.verification, state: "UNKNOWN" } }), [], "UNKNOWN on insufficient evidence is lawful");
    assert.deepEqual(lawsOf(r), ["F24"], "VERIFIED on insufficient evidence was not refused");
  }
});

/** The only records verified after DECLARATION_CONTRACT_AFTER — the owner's two, on 21 Sep 2026. */
const OWNER_VERIFIED_2026_09_21 = Object.freeze([
  "pk-pnmc.verification-fee.destination=domestic", "pk-pnmc.verification-fee.destination=foreign",
]);

test("🔴 R4 · 11 · no regression — a pre-contract verification is judged exactly as before, and the contract binds ONLY what was verified after it", async () => {
  // the same shape as a 12 September verdict: a qualified claim, no claimDimensions, no sourceRead
  const before = candidate({ ...QUALIFIED, verification: { checkedOn: "2026-09-12", sourceRead: undefined } });
  const j = judge(before);
  assert.deepEqual([j.decision, j.contract, j.dimensions, [...j.reasons]], ["ADVANCED_ON_NEW_MEASUREMENT", "PRE_CONTRACT", null, []]);
  assert.deepEqual(lawsOf(before), []);

  const product = await productFromArgv(["--product=almi-oet"], { scope: (await import("./support/subjects.mjs")).subjectScope("almi-oet") });
  const { records } = await loadRegistry(product.factsDir, product.productId);
  const v = validateRegistry(records);
  assert.equal(v.valid, true, JSON.stringify(v.registryErrors.concat(v.invalidRecords), null, 1));
  assert.deepEqual([v.guard.judged, v.guard.advanced, v.guard.refused], [36, 25, 11]);
  /* 🔴 THE REGRESSION THIS GUARDS IS "a record was re-judged under the contract BY SIDE EFFECT" —
   * not "no record is ever under the contract". Until 21 Sep 2026 no real verification postdated
   * DECLARATION_CONTRACT_AFTER, so an empty contract population said both things at once. The two
   * the owner verified are named, and every other record must still be judged as it was. */
  assert.deepEqual(
    v.guard.judgements.filter((x) => x.contract !== "PRE_CONTRACT").map((x) => x.id).sort(),
    [...OWNER_VERIFIED_2026_09_21].sort(),
    "a real record was re-judged under the contract",
  );
  for (const j of v.guard.judgements.filter((x) => !OWNER_VERIFIED_2026_09_21.includes(x.id))) {
    assert.equal(j.contract, "PRE_CONTRACT", `${j.id}: judged under the contract without being verified after it`);
  }
  assert.equal(verifiedSourceBearingFacts(records).length, REGISTRY_VERIFIED_COUNT);
  assertNoManufacturedDeclaration(records, OWNER_VERIFIED_2026_09_21);
});
