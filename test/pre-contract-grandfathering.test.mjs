/**
 * 🔴 THE PRE-CONTRACT GRANDFATHERING RULING — every condition, and the date boundary, driven.
 *
 * The ruling settles one reading: a record that pre-dates the declaration contract may satisfy
 * "labelled on its face" without retrospective claimDimensions, when five things are true at once.
 * A ruling is not a tick, so every one of the five is driven false here and seen to refuse, and the
 * boundary date is proved on both sides rather than asserted.
 *
 * 🔴 THESE TESTS ARE NOT ROW 50'S EVIDENCE. The real governed records passing through the real
 * validation path are. What these prove is that the rule refuses what it claims to refuse —
 * including the branch no real record can reach, because all 46 real signatures are `human:`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { judgeGrandfathering, isNamedHumanChecker, PRE_CONTRACT_CONDITIONS, GRANDFATHERING } from "../src/evidence/pre-contract-grandfathering.mjs";
import { ensureSubjectHook, importSubjectModule } from "../src/subject-roots.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { judgeLeavingUnknown } from "../src/evidence/verdict.mjs";

/** A lawful pre-contract subject: every condition true. Each test falsifies exactly one. */
const lawful = (over = {}) => ({
  verificationState: "VERIFIED",
  claimElements: ["a", "b"],
  governed: true,
  verification: {
    checkedOn: "2026-09-12",
    checkedBy: "human:beta-g (Cowork)",
    elementsConfirmedKeys: ["a", "b"],
    elementsNotFoundKeys: [],
    ...(over.verification ?? {}),
  },
  ...Object.fromEntries(Object.entries(over).filter(([k]) => k !== "verification")),
});

test("the ruling is DATA: five named conditions and a cut-off, enumerable without reading control flow", () => {
  assert.equal(PRE_CONTRACT_CONDITIONS.length, 5);
  assert.deepEqual(GRANDFATHERING.conditionIds, ["DATE_EXEMPT", "STATE_EXPLICIT", "NAMED_HUMAN_AND_DATE", "ELEMENTS_RECONCILE", "NO_PROMOTION_OF_UNKNOWN"]);
  assert.equal(GRANDFATHERING.conjunctive, true);
  assert.match(GRANDFATHERING.cutOff, /^\d{4}-\d{2}-\d{2}$/);
  for (const c of PRE_CONTRACT_CONDITIONS) assert.ok(c.requirement.length > 20, `${c.id} carries no stated requirement`);
});

test("GREEN · a lawful pre-contract record is grandfathered", () => {
  const j = judgeGrandfathering(lawful());
  assert.equal(j.regime, "GRANDFATHERED");
  assert.deepEqual([...j.failed], []);
});

/* ── §3 · THE DATE BOUNDARY, PROVED ON BOTH SIDES ───────────────────────── */

test("🔴 the date boundary: the day before, the day ITSELF, the day after, and undated", () => {
  assert.equal(GRANDFATHERING.cutOff, "2026-09-13");
  assert.equal(judgeGrandfathering(lawful({ verification: { checkedOn: "2026-09-12" } })).regime, "GRANDFATHERED", "the day before must be exempt");
  assert.equal(judgeGrandfathering(lawful({ verification: { checkedOn: "2026-09-13" } })).regime, "GRANDFATHERED", "the cut-off day ITSELF must be exempt — R4 binds verifications dated AFTER it");
  assert.equal(judgeGrandfathering(lawful({ verification: { checkedOn: "2026-09-14" } })).regime, "R4_GOVERNED", "the day after must fall under R4");
  assert.equal(judgeGrandfathering(lawful({ verification: { checkedOn: undefined } })).regime, "R4_GOVERNED", "an UNDATED record must never be grandfathered");
});

test("🔴 P12 · a malformed or absent date grants no exemption", () => {
  for (const bad of ["2026-9-1", "12 September 2026", "", null, undefined, "not-a-date"]) {
    const j = judgeGrandfathering(lawful({ verification: { checkedOn: bad } }));
    assert.equal(j.regime, "R4_GOVERNED", `${JSON.stringify(bad)} was treated as exempt`);
  }
});

/* ── THE FIVE CONDITIONS, EACH DRIVEN FALSE ALONE ───────────────────────── */

test("🔴 P1 · condition 2 false — verificationState not explicit → refused", () => {
  for (const s of [undefined, "", "   ", null]) {
    const j = judgeGrandfathering(lawful({ verificationState: s }));
    assert.equal(j.regime, "REFUSED_PRE_CONTRACT", `state ${JSON.stringify(s)} was grandfathered`);
    assert.ok(j.failed.includes("STATE_EXPLICIT"));
  }
});

test("🔴 P2 · condition 3 false — the checker is a MODEL, not a named human → refused", () => {
  const j = judgeGrandfathering(lawful({ verification: { checkedBy: "model:claude-opus-5" } }));
  assert.equal(j.regime, "REFUSED_PRE_CONTRACT");
  assert.ok(j.failed.includes("NAMED_HUMAN_AND_DATE"));

  /* 🔴 THE BRANCH NO REAL RECORD REACHES. A `model:` signature is SCHEMA-VALID and satisfies the
   * older "is anybody named?" test, so without this condition such a record would advance. */
  assert.equal(isNamedHumanChecker("model:claude-opus-5"), false);
  assert.equal(isNamedHumanChecker("human:beta-g (Cowork)"), true);
  /* CONTROL: the same subject with a human signature IS grandfathered, so the refusal above is the
   * prefix talking and not a judge that refuses everything. */
  assert.equal(judgeGrandfathering(lawful()).regime, "GRANDFATHERED");
});

test("🔴 P10 · humanity is decided by the TYPED PREFIX, never a name, substring or tool list", () => {
  /* A name that merely contains "human" is not a human signature. */
  assert.equal(isNamedHumanChecker("a-human-reviewer"), false);
  assert.equal(isNamedHumanChecker("model:human-in-the-loop"), false);
  /* A prefix with no name, and a bare name, both fail the schema pattern. */
  assert.equal(isNamedHumanChecker("human:"), false);
  assert.equal(isNamedHumanChecker("beta-g"), false);
  /* And the lawful shape passes. */
  assert.equal(isNamedHumanChecker("human:N.U."), true);
});

test("🔴 P3 · condition 4 false — a governed element is not confirmed → refused", () => {
  const j = judgeGrandfathering(lawful({ verification: { elementsConfirmedKeys: ["a"], elementsNotFoundKeys: ["b"] } }));
  assert.equal(j.regime, "REFUSED_PRE_CONTRACT");
  assert.ok(j.failed.includes("ELEMENTS_RECONCILE"));
});

test("🔴 P11 · a record with NO applicable obligation is not over-blocked", () => {
  /* Not governed: the guard never judges it, so it has no element to reconcile and condition 4
   * must not refuse it. */
  const j = judgeGrandfathering({ ...lawful({ verification: { elementsConfirmedKeys: [], elementsNotFoundKeys: [] } }), governed: false });
  assert.equal(j.regime, "GRANDFATHERED");
  assert.equal(j.conditions.ELEMENTS_RECONCILE, true);
});

test("🔴 P8 · condition 5 — a VERIFIED label with no verification behind it is refused", () => {
  const j = judgeGrandfathering({ verificationState: "VERIFIED", verification: undefined, claimElements: [], governed: false });
  assert.equal(j.regime, "R4_GOVERNED", "an absent verification has no date, so it is never exempt");
  assert.equal(j.conditions.NO_PROMOTION_OF_UNKNOWN, false, "a VERIFIED label with no verification is missing evidence inferred into a PASS");
});

test("🔴 P4/P5 · a post-contract or undated record is R4_GOVERNED whatever else is true", () => {
  /* Every other condition lawful; only the date puts it under R4. It must not be reported as a
   * near-miss on grandfathering — it was never eligible. */
  for (const on of ["2026-09-14", "2026-12-31", undefined]) {
    const j = judgeGrandfathering(lawful({ verification: { checkedOn: on } }));
    assert.equal(j.regime, "R4_GOVERNED", `${JSON.stringify(on)} was not put under R4`);
  }
});

test("the five are CONJUNCTIVE — two false is still exactly one refusal, naming both", () => {
  const j = judgeGrandfathering(lawful({ verificationState: "", verification: { elementsConfirmedKeys: ["a"], elementsNotFoundKeys: ["b"] } }));
  assert.equal(j.regime, "REFUSED_PRE_CONTRACT");
  assert.deepEqual([...j.failed].sort(), ["ELEMENTS_RECONCILE", "STATE_EXPLICIT"]);
});

/* ── THE REAL POPULATION — the row's actual evidence ────────────────────── */

test("🔴 the REAL registry adjudicates with no remainder, and every regime is non-empty where it should be", async () => {
  ensureSubjectHook();
  await (await import("./support/subjects.mjs")).subjectModule("almi-oet", "product.mjs");
  const { product } = await import("../src/product.mjs");
  const p = product("almi-oet");
  const { records } = await loadRegistry(p.factsDir, p.productId);

  const tally = { GRANDFATHERED: 0, REFUSED_PRE_CONTRACT: 0, R4_GOVERNED: 0 };
  for (const r of records) {
    const governed = Boolean(judgeLeavingUnknown(r.id, r.verification, r.claimElements, r));
    tally[judgeGrandfathering({ verificationState: r.verificationState, verification: r.verification, claimElements: r.claimElements, governed }).regime] += 1;
  }
  const sum = Object.values(tally).reduce((a, b) => a + b, 0);
  assert.equal(sum, records.length, `the regimes sum to ${sum} but the population is ${records.length}`);
  assert.ok(records.length > 40, `only ${records.length} records — too few to believe a zero`);
  assert.ok(tally.GRANDFATHERED > 0, "no record is grandfathered — the rule would be policing nothing");
  assert.ok(tally.REFUSED_PRE_CONTRACT > 0, "nothing is refused — the rule would be vacuous on this population");
});

test("🔴 P9 · F31 governs the REAL production validator — proved by an input the real registry lacks", async () => {
  ensureSubjectHook();
  await (await import("./support/subjects.mjs")).subjectModule("almi-oet", "product.mjs");
  const { product } = await import("../src/product.mjs");
  const { validateRegistry } = await import("../src/facts/validate.mjs");
  const p = product("almi-oet");
  const { records } = await loadRegistry(p.factsDir, p.productId);

  const F31 = (rs) => validateRegistry(rs).registryErrors.filter((e) => e.law === "F31");

  /* The real registry raises none: every pre-contract record that fails a condition is ALREADY
   * refused by the older evidence laws, so F31 adds nothing to it. That is exactly why deleting
   * F31 is invisible on real data — and why this test drives the shape the registry does not hold. */
  assert.equal(F31(records).length, 0, "the real registry should raise no F31");

  /* 🔴 THE BRANCH NO REAL RECORD REACHES. Take a record that really is advancing and really is
   * grandfathered, and change ONE thing: its checker becomes a model signature. It stays
   * schema-valid and still satisfies the older "is anybody named?" test, so nothing else refuses
   * it — only condition 3 does. */
  const base = records.find((r) => r.id === "uk-hcpc.certificate-maximum-age");
  assert.ok(base, "the record this proof is built on is missing from the registry");
  assert.equal(base.verification.checkedBy, "human:beta-g (Cowork)");
  const crafted = { ...base, verification: { ...base.verification, checkedBy: "model:claude-opus-5" } };

  const raised = F31(records.map((r) => (r.id === crafted.id ? crafted : r)));
  assert.equal(raised.length, 1, "F31 did not fire on a model-signed record that would otherwise advance");
  assert.match(raised[0].message, /NAMED_HUMAN_AND_DATE/);
});
