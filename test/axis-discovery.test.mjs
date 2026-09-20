/**
 * 🔴 ROW 6 — AXIS DISCOVERY. GREEN on the subject's real evidence; every limb RED, ALONE; and the verdicts that owned
 * evidence cannot reach are shown to be REACHABLE when their measurement exists, so the law is not one that can only
 * refuse.
 *
 * The frozen contract: INPUT the subject's real evidence · EXPECTED axes (profession, role, stage, origin/destination,
 * language, locality) discovered and tested, not assumed · FAILURE an obvious axis hard-coded by habit without
 * evidence · EVIDENCE the evidence behind each accepted axis and each rejected one.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { readBodyArchive } from "../src/evidence/body-archive.mjs";
import { row6, readDeclaredAxes, contractAxes } from "../src/discovery/row6.mjs";
import { axisErrors, verdictOf, demandDistribution, MIN_ROWS_PER_COUNTRY } from "../src/discovery/axis-discovery.mjs";
import { LEXICON } from "../config/discovery/intent-lexicon.mjs";
import { INTENT_REFERENCE, AMBIGUOUS } from "../config/discovery/intent-reference.mjs";
import { AXIS_SPECS, SIBLING_FAMILIES, HARD_CODED_PATTERNS } from "../config/discovery/axis-candidates.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* The real inputs, built once and reused — the answer-evidence wiring below drives row6() again. */
const INPUTS = {
  records: createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll(),
  crawlRecords: createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl")).readAll(),
  bodies: readBodyArchive(batchFile("bodies-2026-09-12.jsonl.br")),
  lexicon: LEXICON, reference: INTENT_REFERENCE, ambiguous: AMBIGUOUS,
  specs: AXIS_SPECS, families: SIBLING_FAMILIES, patterns: HARD_CODED_PATTERNS,
  declaredAxes: await readDeclaredAxes(),
};
const R = row6(INPUTS);
const NAMED = contractAxes();
const by = (axis) => R.results.find((r) => r.axis === axis);
const limbs = (errs) => [...new Set(errs.map((e) => e.limb))];
const clone = (x) => JSON.parse(JSON.stringify(x));
const check = (results) => axisErrors({ results, namedAxes: NAMED });

/* ================================================================== *
 * 🔴 THE ANSWER-EVIDENCE WIRING — row6()'s DUTY TO PASS THE REAL SCOPES.
 *
 * The gate itself lives in answer-evidence.mjs and is driven there. What is driven HERE is the one
 * thing only row6() can get wrong: handing the gate the scopes it was GIVEN, rather than scopes it
 * made up. A sabotage that replaced them with a matching pair stayed green until this existed.
 * ================================================================== */

const CLAIMS = [
  { identity: "ctl-authority.ctl-claim.profession=alpha", answer: "same", verified: true },
  { identity: "ctl-authority.ctl-claim.profession=beta", answer: "same", verified: true },
];
const T1 = "tenant:11111111111111111111111111111111";
const T2 = "tenant:22222222222222222222222222222222";

test("🔴 WIRING · row6 hands the gate the scopes it was GIVEN — a cross-tenant pair is refused end to end", () => {
  const r = row6({ ...INPUTS, answerClaims: CLAIMS,
    axisScope: { state: "RESOLVED", tenantId: T1 }, evidenceScope: { state: "RESOLVED", tenantId: T2 } });
  assert.equal(r.answerEvidence.gate.state, "INVALID_CROSS_TENANT", "row6 did not pass the real scopes to the gate");
  assert.deepEqual(r.answerEvidence.byAxis, {});
  /* 🔴 AND THE AXIS SAYS SO. A refusal must not read on the axis as an ABSENCE of evidence — the
   * evidence exists and was refused, and the leg carries that reason, not the "none is owned" text. */
  const leg = r.results.find((x) => x.axis === "profession").distinguishing.answer;
  assert.equal(leg.state, "INVALID_CROSS_TENANT");
  assert.doesNotMatch(leg.basis, /no per-value ANSWER evidence is owned/, "a refusal was reported as an absence");
  assert.notEqual(r.results.find((x) => x.axis === "profession").verdict, "BUILD");
});

test("🔴 WIRING · an UNDECLARED scope is refused end to end, and the real run's scopes are not invented", () => {
  const r = row6({ ...INPUTS, answerClaims: CLAIMS, axisScope: null, evidenceScope: null });
  assert.equal(r.answerEvidence.gate.state, "UNDECLARED_TENANT");
  assert.deepEqual(r.answerEvidence.byAxis, {});
});

test("🔴 WIRING · same declared tenant → the evidence reaches the axis and moves its verdict", () => {
  const r = row6({ ...INPUTS, answerClaims: CLAIMS,
    axisScope: { state: "RESOLVED", tenantId: T1 }, evidenceScope: { state: "RESOLVED", tenantId: T1 } });
  assert.equal(r.answerEvidence.gate, null);
  const leg = r.answerEvidence.byAxis.profession;
  assert.equal(leg.state, "MEASURED");
  assert.equal(leg.materiallyChanges, false);
  /* 🔴 THE WHOLE POINT: the measured leg reaches the real axis result through the real path. */
  assert.equal(r.results.find((x) => x.axis === "profession").distinguishing.answer.state, "MEASURED");
});

test("🔴 WIRING · supplying NO answer claims leaves the real run exactly as it was", () => {
  assert.equal(R.answerEvidence.gate, null);
  assert.deepEqual(R.answerEvidence.byAxis, {});
  assert.equal(R.answerEvidence.population.claims, 0);
  for (const x of R.results) assert.equal(x.distinguishing.answer.state, "UNKNOWN", x.axis);
});

test("🔴 the axes to test are READ from row 6's frozen EXPECTED clause — six, not retyped", () => {
  assert.deepEqual(NAMED, ["profession", "role", "stage", "origin/destination", "language", "locality"]);
  for (const name of NAMED) assert.ok(R.results.some((r) => r.contractName === name), name);
});

test("🟢 MEASURED — the input: 379 human country×query rows in 48 countries once 9 operator rows are out; 1,525 pages; 394 bodies", () => {
  assert.deepEqual(R.input.queries, { observationId: "45ce21253a3fc58c", rows: 337, human: 329, operators: 8 });
  assert.equal(R.input.countryQuery.rows, 388);
  assert.deepEqual([R.input.countryQuery.human, R.input.countryQuery.operators, R.input.countryQuery.countries], [379, 9, 48]);
  assert.equal(R.input.pageRows.rows, 1525);
  assert.equal(R.input.archivedBodies, 394);
});

test("🟢 GREEN: every row-6 limb holds on the real evidence — and row 5's record under it carries exactly its known acceptance failure", () => {
  assert.deepEqual(R.errors, []);
  /* 🔴 CORRECTED 17 SEPTEMBER 2026 (D-HELDOUT-1). This once asserted `R.row5Errors` was EMPTY — which was true only
   * because row 5's acceptance then judged the training half of its output alone. Row 5 is FAILED, and its record
   * is NOT error-free: acceptance reports 8 identical-intent splits over the whole record. Row 6's own verdict does
   * not depend on that — `row5Errors` is carried through for reporting (src/discovery/row6.mjs:129) while row 6's
   * limbs come from axisErrors — so row 6 is unaffected, and this assertion now says what is true rather than what
   * was convenient. It goes red if row 5's acceptance failure changes shape, which is when it should be re-read. */
  assert.deepEqual([...new Set(R.row5Errors.map((e) => e.limb))], ["record-split"]);
  assert.equal(R.row5Errors.length, 8);
});

test("🟢 MEASURED — 14 candidates (7 named, 7 discovered): 7 MONITOR · 7 UNKNOWN · 0 BUILD · 0 REJECT", () => {
  const tally = {};
  for (const r of R.results) tally[r.verdict] = (tally[r.verdict] || 0) + 1;
  assert.deepEqual(tally, { UNKNOWN: 7, MONITOR: 7 });
  assert.deepEqual(Object.fromEntries(R.results.map((r) => [r.axis, r.verdict])), {
    profession: "UNKNOWN", role: "MONITOR", stage: "MONITOR", origin: "UNKNOWN", destination: "MONITOR", language: "MONITOR", locality: "MONITOR",
    budget: "UNKNOWN", field: "UNKNOWN", number: "MONITOR", purpose: "UNKNOWN", skill: "UNKNOWN", variant: "MONITOR", year: "UNKNOWN",
  });
  // 🔴 no axis reached a deciding verdict, because the answer-level power is not measurable on owned evidence
  for (const r of R.results) {
    assert.equal(r.distinguishing.answer.state, "UNKNOWN", r.axis);
    assert.equal(r.evidenceAvailability.state, "UNKNOWN", r.axis);
    assert.equal(r.humanValue.state, "UNKNOWN", r.axis);
  }
});

test("🔴 THE TWO AXES THIS PROJECT BUILT AROUND, ON THEIR OWN EVIDENCE — declared or hard-coded, and UNKNOWN in what people ask", () => {
  const p = by("profession");
  assert.equal(p.discovery.queriesCarrying, 3);
  assert.deepEqual(p.discovery.values.map((v) => v.value).sort(), ["doctor", "midwife", "social worker"]);
  assert.deepEqual(p.hardCoded.declaredBy, ["almi-oet"]);
  assert.equal(p.hardCoded.pages, 89);
  assert.equal(p.verdict, "UNKNOWN");
  assert.match(p.verdictBasis, /LAW-ABSENT-1: that is thin evidence, not an absent axis/);

  const o = by("origin");
  assert.equal(o.discovery.queriesCarrying, 2);
  assert.deepEqual(o.discovery.values.map((v) => v.value), ["iranian"]);
  assert.deepEqual([o.hardCoded.pages, o.hardCoded.impressions], [775, 1179]);
  assert.deepEqual([o.siblingCollapse.state, o.siblingCollapse.pairs, o.siblingCollapse.median.toFixed(3)], ["MEASURED", 23, "0.806"]);
  assert.equal(o.verdict, "UNKNOWN");

  const d = by("destination");
  assert.deepEqual([d.discovery.queriesCarrying, d.discovery.values.length, d.demand.shape, d.verdict], [12, 10, "SPARSE", "MONITOR"]);
  assert.equal(d.hardCoded.pages, 380);
});

test("🔴 LOCALITY — tested on the 10 countries with five or more rows; the other 38 are UNKNOWN, never 'no power'", () => {
  const per = by("locality").distinguishing.question.perCountry;
  const measured = per.filter((c) => c.state === "MEASURED");
  assert.deepEqual(measured.map((c) => c.value), ["aus", "usa", "gbr", "ind", "can", "rus", "nzl", "pak", "phl", "qat"]);
  assert.deepEqual(measured.map((c) => c.rows), [148, 62, 32, 23, 14, 7, 5, 5, 5, 5]);
  for (const c of measured.slice(0, 4)) assert.equal(c.pValue, 0.001, c.value);
  const unknown = per.filter((c) => c.state === "UNKNOWN");
  assert.equal(unknown.length, 38);
  assert.equal(unknown.filter((c) => c.rows === 1).length, 19);
  for (const c of unknown) {
    assert.ok(c.rows < MIN_ROWS_PER_COUNTRY);
    assert.equal(c.verdict, "UNKNOWN");
    assert.match(c.basis, /LAW-ABSENT-1/);
  }
  assert.equal(by("locality").verdict, "MONITOR");
});

test("🟢 MEASURED — sibling collapse of OUR pages: role 474 pairs median 0.561 · locality 36 pairs 0.676 · origin 23 pairs 0.806; never read as the answer", () => {
  const role = by("role").siblingCollapse;
  const loc = by("locality").siblingCollapse;
  assert.deepEqual([role.pairs, role.median.toFixed(3), loc.pairs, loc.median.toFixed(3)], [474, "0.561", 36, "0.676"]);
  for (const s of [role, loc, by("origin").siblingCollapse]) assert.match(s.basis, /never the answer/);
  assert.equal(by("destination").siblingCollapse.state, "UNKNOWN"); // 9 pairs < 10
});

/* ---------- the limbs, each RED alone ---------- */

test("🔴 RED: an axis ACCEPTED with no recorded distinguishing-power measurement is refused, alone", () => {
  const rs = clone(R.results);
  by.call(null, "role");
  const role = rs.find((r) => r.axis === "role");
  role.verdict = "BUILD";
  role.evidenceAvailability = { state: "MEASURED", basis: "x" };
  role.humanValue = { state: "MEASURED", basis: "x" };
  const errs = check(rs).filter((e) => e.limb !== "verdict-inconsistent");
  assert.deepEqual(limbs(errs), ["accepted-unmeasured"]);
  assert.match(errs[0].why, /role is BUILD with answer-level distinguishing power UNKNOWN/);
});

test("🔴 RED: an axis REJECTED on evidence too thin to decide is refused, alone (LAW-ABSENT-1) — even with a 'measurement' beside it", () => {
  const rs = clone(R.results);
  const origin = rs.find((r) => r.axis === "origin");
  origin.distinguishing.answer = { state: "MEASURED", materiallyChanges: false, sample: 1, method: "x", basis: "x" };
  origin.verdict = "REJECT";
  const errs = check(rs).filter((e) => e.limb !== "verdict-inconsistent");
  assert.deepEqual(limbs(errs), ["rejected-on-thin"]);
  assert.match(errs[0].why, /LAW-ABSENT-1: thin evidence is a fact about our data/);
});

test("🔴 RED: a searcher country REJECTED on one row is refused, alone", () => {
  const rs = clone(R.results);
  const one = rs.find((r) => r.axis === "locality").distinguishing.question.perCountry.find((c) => c.rows === 1);
  one.verdict = "REJECT";
  const errs = check(rs);
  assert.deepEqual(limbs(errs), ["rejected-on-thin"]);
  assert.match(errs[0].why, /on 1 row\(s\)/);
});

test("🔴 RED: a named axis left untested is refused, alone", () => {
  const rs = clone(R.results).filter((r) => r.axis !== "language");
  assert.deepEqual(limbs(check(rs)), ["named-axis-untested"]);
});

test("🔴 RED: a verdict its own legs do not produce is refused, alone", () => {
  const rs = clone(R.results);
  rs.find((r) => r.axis === "year").verdict = "MONITOR";
  assert.deepEqual(limbs(check(rs)), ["verdict-inconsistent"]);
});

test("🔴 RED: a leg with no state or no basis is refused, alone", () => {
  const rs = clone(R.results);
  delete rs.find((r) => r.axis === "stage").humanValue.basis;
  assert.deepEqual(limbs(check(rs)), ["leg-missing"]);
  const rs2 = clone(R.results);
  delete rs2.find((r) => r.axis === "stage").distinguishing.answer;
  assert.deepEqual(limbs(check(rs2)), ["leg-missing"]);
});

/* ---------- the controls: the deciding verdicts are reachable, and lawful, when the measurement exists ---------- */

test("CONTROL: with the answer MEASURED to change and every leg measured on sampled values, BUILD is produced and lawful", () => {
  const rs = clone(R.results);
  const stage = rs.find((r) => r.axis === "stage");
  stage.distinguishing.answer = { state: "MEASURED", materiallyChanges: true, sample: 7, method: "per-value verified answers", basis: "fixture" };
  stage.evidenceAvailability = { state: "MEASURED", basis: "fixture" };
  stage.humanValue = { state: "MEASURED", basis: "fixture" };
  stage.verdict = verdictOf(stage);
  assert.equal(stage.verdict, "BUILD");
  assert.deepEqual(check(rs), []);
});

test("CONTROL: with the answer MEASURED not to change on sampled values, REJECT is produced and lawful", () => {
  const rs = clone(R.results);
  const variant = rs.find((r) => r.axis === "variant");
  assert.equal(variant.demand.thin, false);
  variant.distinguishing.answer = { state: "MEASURED", materiallyChanges: false, sample: 2, method: "per-value verified answers", basis: "fixture" };
  variant.verdict = verdictOf(variant);
  assert.equal(variant.verdict, "REJECT");
  assert.deepEqual(check(rs), []);
});

test("demand shapes are read from counts: thin below the floor, and a value seen once is not a sampled value", () => {
  assert.equal(demandDistribution([{ value: "a", queries: 2, impressions: 2 }]).state, "UNKNOWN");
  const sparse = demandDistribution(Array.from({ length: 6 }, (_, i) => ({ value: `v${i}`, queries: 1, impressions: 1 })));
  assert.deepEqual([sparse.shape, sparse.thin], ["SPARSE", true]);
});
