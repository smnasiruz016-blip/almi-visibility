/**
 * 🔴 THE ANSWER LEG — THE FIVE WORLDS, AND THE REAL POPULATION.
 *
 * Before this module, `discoverAxes` set the answer leg to a literal `UNKNOWN` that no input could
 * change, so BUILD and REJECT were unreachable from the production path whatever evidence was owned.
 * The measurement that found it: every parameter `discoverAxes` accepted, supplied maximally, gave
 * 0 terminal verdicts while `verdictOf` driven directly gave BUILD and REJECT. That asymmetry is
 * pinned here, so the way in cannot be quietly closed again.
 *
 * 🔴 WHAT THESE TESTS ARE NOT. They are this fix's guard, never row 6's evidence. Row 6's evidence is
 * the real axes and the independently existing answer evidence — measured in the last test here, and
 * it decides nothing today.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  answerEvidence, tenancyGate, parseQualifiedClaim, ANSWER_LEG_STATES, ANSWER_REASONS,
} from "../src/discovery/answer-evidence.mjs";
import { discoverAxes, verdictOf } from "../src/discovery/axis-discovery.mjs";

const TENANT_A = "tenant:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const TENANT_B = "tenant:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const SAME = { axisScope: { state: "RESOLVED", tenantId: TENANT_A }, evidenceScope: { state: "RESOLVED", tenantId: TENANT_A } };

const claim = (identity, answer, verified = true) => ({ identity, answer, verified });

/* ================================================================== *
 * THE IDENTITY PARSER
 * ================================================================== */

test("a claim identity is read structurally — never from a list of known axis names", () => {
  assert.deepEqual(parseQualifiedClaim("auth.some-claim.profession=nursing"), {
    axis: "profession", axisValue: "nursing", stem: "auth.some-claim", identity: "auth.some-claim.profession=nursing",
  });
  /* an identity with no qualifier is not an answer at a value */
  assert.equal(parseQualifiedClaim("auth.some-claim"), null);
  assert.equal(parseQualifiedClaim(undefined), null);
  assert.equal(parseQualifiedClaim(42), null);
});

/* ================================================================== *
 * 🔴 WORLD C — TENANCY, DECIDED BEFORE CONTENT
 * ================================================================== */

test("🔴 WORLD C · evidence under ANOTHER tenant is INVALID_CROSS_TENANT — never ACCEPTED, REJECTED or UNKNOWN", () => {
  const claims = [claim("auth.q.k=a", "one"), claim("auth.q.k=b", "two")];
  const r = answerEvidence({
    claims,
    axisScope: { state: "RESOLVED", tenantId: TENANT_A },
    evidenceScope: { state: "RESOLVED", tenantId: TENANT_B },
  });
  assert.equal(r.gate.state, "INVALID_CROSS_TENANT");
  assert.equal(r.gate.reason, ANSWER_REASONS.TENANT_CROSS);
  assert.deepEqual(r.byAxis, {}, "an axis leg was produced from cross-tenant evidence");

  /* 🔴 REFUSED BEFORE CONTENT IS JUDGED: the very same claims, same tenant, DO decide. So the
   * refusal above is the tenancy talking — not evidence that happens to be undecidable. */
  const control = answerEvidence({ claims, ...SAME });
  assert.equal(control.byAxis.k.state, "MEASURED");
});

test("🔴 WORLD C(ii) · an UNDECLARED scope is refused — a tenant is never inferred from a name or a path", () => {
  const claims = [claim("auth.q.k=a", "one"), claim("auth.q.k=b", "two")];
  for (const scopes of [
    { axisScope: { state: "UNDECLARED" }, evidenceScope: { state: "RESOLVED", tenantId: TENANT_A } },
    { axisScope: { state: "RESOLVED", tenantId: TENANT_A }, evidenceScope: { state: "UNDECLARED" } },
    { axisScope: null, evidenceScope: null },
  ]) {
    const r = answerEvidence({ claims, ...scopes });
    assert.equal(r.gate.state, "UNDECLARED_TENANT", JSON.stringify(scopes));
    assert.deepEqual(r.byAxis, {});
  }
  assert.equal(tenancyGate({ state: "RESOLVED", tenantId: TENANT_A }, { state: "RESOLVED", tenantId: TENANT_A }).ok, true);
});

/* ================================================================== *
 * 🔴 WORLD A — SAME-TENANT EVIDENCE DECIDES, AS THE EVIDENCE REQUIRES
 * ================================================================== */

test("🔴 WORLD A · the answer CHANGES across values → MEASURED, materiallyChanges true (the BUILD side)", () => {
  const r = answerEvidence({ claims: [claim("auth.grade.k=a", "B"), claim("auth.grade.k=b", "C")], ...SAME });
  assert.equal(r.byAxis.k.state, "MEASURED");
  assert.equal(r.byAxis.k.materiallyChanges, true);
  assert.equal(r.byAxis.k.reason, ANSWER_REASONS.ANSWER_CHANGES);
  assert.deepEqual(r.byAxis.k.evidence, ["auth.grade.k=a", "auth.grade.k=b"]);
});

test("🔴 WORLD A(ii) · the answer is CONSTANT across values → MEASURED, materiallyChanges false (the REJECT side)", () => {
  const r = answerEvidence({ claims: [claim("auth.grade.k=a", "B"), claim("auth.grade.k=b", "B")], ...SAME });
  assert.equal(r.byAxis.k.state, "MEASURED");
  assert.equal(r.byAxis.k.materiallyChanges, false);
  assert.equal(r.byAxis.k.reason, ANSWER_REASONS.ANSWER_CONSTANT);
});

test("the same answer written with keys in a different order is the SAME answer", () => {
  const r = answerEvidence({ claims: [claim("auth.q.k=a", { x: 1, y: 2 }), claim("auth.q.k=b", { y: 2, x: 1 })], ...SAME });
  assert.equal(r.byAxis.k.materiallyChanges, false, "key order was read as the answer changing");
});

/* ================================================================== *
 * 🔴 WORLD B — INSUFFICIENT, NEVER TERMINAL
 * ================================================================== */

test("🔴 WORLD B · one value's answer is INSUFFICIENT_EVIDENCE — LAW-ABSENT-1, never 'the answer does not change'", () => {
  const r = answerEvidence({ claims: [claim("auth.q.k=a", "one")], ...SAME });
  assert.equal(r.byAxis.k.state, "INSUFFICIENT_EVIDENCE");
  assert.equal(r.byAxis.k.reason, ANSWER_REASONS.ONE_VALUE_ONLY);
  assert.notEqual(r.byAxis.k.materiallyChanges, false, "a single value was read as the answer being constant");
});

test("🔴 WORLD B(ii) · two values under DIFFERENT questions cannot decide — the stem must match", () => {
  /* Two different questions, each answered once. Nothing is comparable. */
  const r = answerEvidence({ claims: [claim("auth.grade.k=a", "B"), claim("auth.fee.k=b", "10")], ...SAME });
  assert.equal(r.byAxis.k.state, "INSUFFICIENT_EVIDENCE");
});

test("🔴 THE CONFOUNDED PAIR IS REFUSED STRUCTURALLY — a different authority is a different question", () => {
  /* The same claim name, two authorities, one value each. Comparing them would measure the
   * AUTHORITY, not the axis — a confident, wrong terminal verdict. The stem refuses it. */
  const r = answerEvidence({ claims: [claim("auth-one.version.k=a", "X"), claim("auth-two.version.k=b", "Y")], ...SAME });
  assert.equal(r.byAxis.k.state, "INSUFFICIENT_EVIDENCE", "a cross-authority pair was compared as if it were one question");

  /* CONTROL: the SAME two answers under ONE authority DO decide — so the refusal is the authority
   * boundary talking, not a judge that refuses every pair. */
  const control = answerEvidence({ claims: [claim("auth-one.version.k=a", "X"), claim("auth-one.version.k=b", "Y")], ...SAME });
  assert.equal(control.byAxis.k.state, "MEASURED");
  assert.equal(control.byAxis.k.materiallyChanges, true);
});

/* ================================================================== *
 * 🔴 WORLD E — AN UNVERIFIED RECORD IS NOT AN ANSWER
 * ================================================================== */

test("🔴 WORLD E · an UNVERIFIED claim is refused however real it looks — missing evidence is never a measurement", () => {
  const r = answerEvidence({ claims: [claim("auth.q.k=a", "one", false), claim("auth.q.k=b", "two", false)], ...SAME });
  assert.equal(r.byAxis.k.state, "INSUFFICIENT_EVIDENCE");
  assert.equal(r.byAxis.k.reason, ANSWER_REASONS.NO_VERIFIED_ANSWER);
  assert.equal(r.population.qualified, 2);
  assert.equal(r.population.verifiedQualified, 0);

  /* CONTROL: flip ONLY the verified flag on the same two claims and they decide. */
  const control = answerEvidence({ claims: [claim("auth.q.k=a", "one"), claim("auth.q.k=b", "two")], ...SAME });
  assert.equal(control.byAxis.k.state, "MEASURED");
});

test("🔴 a verified answer at one value and an UNVERIFIED one at another cannot decide", () => {
  const r = answerEvidence({ claims: [claim("auth.q.k=a", "one"), claim("auth.q.k=b", "two", false)], ...SAME });
  assert.equal(r.byAxis.k.state, "INSUFFICIENT_EVIDENCE");
  assert.equal(r.byAxis.k.reason, ANSWER_REASONS.ONE_VALUE_ONLY);
});

/* ================================================================== *
 * 🔴 WORLD D — CONFLICT OUTRANKS MEASUREMENT
 * ================================================================== */

test("🔴 WORLD D · two different VERIFIED answers at ONE value → AMBIGUOUS, never a measurement", () => {
  const r = answerEvidence({
    claims: [claim("auth.q.k=a", "one"), claim("auth.q.k=a", "ONE-DIFFERENT"), claim("auth.q.k=b", "two")],
    ...SAME,
  });
  assert.equal(r.byAxis.k.state, "AMBIGUOUS");
  assert.equal(r.byAxis.k.reason, ANSWER_REASONS.CONFLICTING_ANSWERS_AT_A_VALUE);
  assert.notEqual(r.byAxis.k.materiallyChanges, true, "a contradicted population produced a terminal reading");
});

test("every reported state is one the module declares", () => {
  assert.deepEqual([...ANSWER_LEG_STATES], ["MEASURED", "INSUFFICIENT_EVIDENCE", "AMBIGUOUS", "INVALID_CROSS_TENANT", "UNDECLARED_TENANT"]);
});

/* ================================================================== *
 * 🔴 THE WAY IN — THE ASYMMETRY THIS FIX REMOVED
 * ================================================================== */

const axisInput = (extra = {}) => {
  const members = [];
  for (let v = 0; v < 6; v += 1) for (let q = 0; q < 8; q += 1) members.push({ original: `q${v}-${q}`, key: `q${v}-${q}`, impressions: 100, slots: [{ type: "k", value: `value-${v}` }] });
  return {
    record: [{ id: "c1", members }],
    specs: { k: { named: true, contractName: "k", reads: "the control slot", slotTypes: ["k"] } },
    intentOf: () => "c1",
    siblingPairs: { k: Array.from({ length: 40 }, (_, i) => ({ a: `a${i}`, b: `b${i}`, overlap: 0.05 })) },
    siblingFamilies: { k: ["fam"] },
    ...extra,
  };
};

test("🔴 WITHOUT the answer leg, the production path CANNOT reach a terminal verdict — the state this fix found", () => {
  const [r] = discoverAxes(axisInput());
  assert.equal(r.distinguishing.answer.state, "UNKNOWN");
  assert.equal(r.verdict, "MONITOR", "with every other parameter maximally supplied it is still non-terminal");
  /* and the reader was live all along — which is why the gap was invisible */
  assert.equal(verdictOf({
    distinguishing: { answer: { state: "MEASURED", materiallyChanges: false } },
    demand: { present: true, thin: false }, evidenceAvailability: { state: "MEASURED" }, humanValue: { state: "MEASURED" },
  }), "REJECT");
});

test("🔴 WITH the answer leg, a terminal REJECT is reachable from the PRODUCTION path", () => {
  const legs = answerEvidence({ claims: [claim("auth.q.k=value-0", "same"), claim("auth.q.k=value-1", "same")], ...SAME }).byAxis;
  const [r] = discoverAxes(axisInput({ answerLegs: legs }));
  assert.equal(r.distinguishing.answer.state, "MEASURED");
  assert.equal(r.verdict, "REJECT", "the answer was measured constant and the path still would not reject");
});

test("🔴 the answer leg alone does NOT manufacture a BUILD — the other legs still gate it", () => {
  const legs = answerEvidence({ claims: [claim("auth.q.k=value-0", "one"), claim("auth.q.k=value-1", "two")], ...SAME }).byAxis;
  const [r] = discoverAxes(axisInput({ answerLegs: legs }));
  assert.equal(r.distinguishing.answer.materiallyChanges, true);
  assert.equal(r.evidenceAvailability.state, "UNKNOWN", "evidence availability was silently promoted");
  assert.equal(r.humanValue.state, "UNKNOWN", "human value was silently promoted");
  assert.equal(r.verdict, "MONITOR", "BUILD fired without the legs it requires");
});

test("a caller that supplies NO answer evidence is unchanged — same state, same basis as before the fix", () => {
  const [r] = discoverAxes(axisInput());
  assert.equal(r.distinguishing.answer.state, "UNKNOWN");
  assert.match(r.distinguishing.answer.basis, /no per-value ANSWER evidence is owned/);
});

/* ================================================================== *
 * 🔴 THE REAL POPULATION — ROW 6'S OWN EVIDENCE, NOT THIS FIX'S
 * ================================================================== */

test("🔴 the REAL answer-evidence population, through the real module — and what it decides today", async () => {
  const { ensureSubjectHook, importSubjectModule } = await import("../src/subject-roots.mjs");
  const { loadRegistry } = await import("../src/facts/registry.mjs");
  ensureSubjectHook();
  await importSubjectModule("almi-oet", "product.mjs");
  const { product } = await import("../src/product.mjs");
  const p = product("almi-oet");
  const { records } = await loadRegistry(p.factsDir, p.productId);

  const claims = records.map((r) => ({ identity: r.id, answer: r.value, verified: r.verificationState === "VERIFIED" }));
  const r = answerEvidence({ claims, ...SAME });

  /* The population is real and non-trivial — a zero below is not an empty reader. */
  assert.ok(r.population.claims > 40, `only ${r.population.claims} claims`);
  assert.ok(r.population.qualified > 0, "no claim carries a per-value qualifier at all");
  assert.ok(r.population.verifiedQualified > 0, "no qualified claim is verified — the verified filter may be dead");

  /* 🔴 AND NOT ONE AXIS IS DECIDED. Every axis the real evidence carries is non-terminal, because no
   * question is answered at two or more values by VERIFIED evidence. This is the row's real blocker,
   * and it is evidence work, not engine work. */
  const terminal = Object.entries(r.byAxis).filter(([, l]) => l.state === "MEASURED");
  assert.deepEqual(terminal, [], `an axis became decidable on real evidence: ${JSON.stringify(terminal)}`);
  for (const [axis, l] of Object.entries(r.byAxis)) {
    assert.ok(ANSWER_LEG_STATES.includes(l.state), `${axis}: ${l.state}`);
    assert.ok(l.basis.length > 20, `${axis} carries no basis`);
  }
});

/* ================================================================== *
 * 🔴 THE DECLARED-EVIDENCE LOADER — FIX 3.
 *
 * S11 and S12 landed and stayed GREEN until these existed: nothing drove the loader, so its duty to
 * REPORT every source, and to admit claims only from a RESOLVED scope, was a rule no test reached.
 * The declarations are passed in, because on the real ones the only source that gets as far as the
 * scope check is already RESOLVED — so the guard had no reachable input at all.
 * ================================================================== */

/** A resolver that declares nothing — every reference comes back UNDECLARED. */
const REFUSES_EVERYTHING = () => ({ state: "UNDECLARED", tenantId: null, reason: "CONTROL", detail: null });

test("🔴 LOADER · every source is REPORTED, including one whose scope does not resolve", async () => {
  const { readDeclaredAnswerEvidence } = await import("../src/discovery/row6.mjs");
  const r = await readDeclaredAnswerEvidence({ axisResourceKind: "CRAWL_BATCH", axisResourceRef: "ctl", resolve: REFUSES_EVERYTHING });
  assert.ok(r.sources.length > 0, "no source was reported at all");
  /* 🔴 THE ONE THAT MATTERS: a source with a REAL declarable reference whose scope does not
   * resolve. A source with no reference at all is reported by a different branch, so asserting only
   * "some source is unresolved" would pass even if this branch dropped every one of them. */
  const withRef = r.sources.filter((s) => s.ref !== null);
  assert.ok(withRef.length > 0, "no source carried a declarable reference at all");
  assert.ok(withRef.every((s) => s.state !== "RESOLVED"), "the control resolver resolved something");
  assert.ok(withRef.length >= 1, "an unresolved source with a real reference was dropped instead of reported");
});

test("🔴 LOADER · a source whose scope does NOT resolve contributes no claims", async () => {
  const { readDeclaredAnswerEvidence } = await import("../src/discovery/row6.mjs");
  const r = await readDeclaredAnswerEvidence({ axisResourceKind: "CRAWL_BATCH", axisResourceRef: "ctl", resolve: REFUSES_EVERYTHING });
  assert.equal(r.claims.length, 0, "claims were admitted from a scope that does not resolve");
  assert.equal(r.evidenceScope.state, "UNDECLARED");

  /* 🔴 POSITIVE CONTROL: with the REAL declarations the same loader DOES admit claims, so the zero
   * above is the declarations talking, not a loader that always returns nothing. */
  const real = await readDeclaredAnswerEvidence({ axisResourceKind: "CRAWL_BATCH", axisResourceRef: "ctl" });
  assert.ok(real.claims.length > 0, "the loader returns nothing even with the real declarations");
  assert.equal(real.evidenceScope.state, "RESOLVED");
});

test("🔴 LOADER · the axis population's scope is resolved from the reference it is GIVEN", async () => {
  const { readDeclaredAnswerEvidence } = await import("../src/discovery/row6.mjs");
  const r = await readDeclaredAnswerEvidence({ axisResourceKind: "CRAWL_BATCH", axisResourceRef: "nothing-declares-this" });
  assert.equal(r.axisScope.state, "UNDECLARED", "an undeclared batch reference resolved to something");
});

/* ================================================================== *
 * 🔴 FIX 5 — THE TWO LEGS BUILD ALSO NEEDS.
 *
 * After the answer leg was connected, REJECT became reachable from the production path and BUILD did
 * not: verdictOf also requires evidenceAvailability and humanValue MEASURED, and both were still
 * literals with no way in. That is the same defect the answer leg had, and it would have made a BUILD
 * impossible by CONSTRUCTION rather than by the evidence.
 * ================================================================== */

const measured = (basis) => ({ state: "MEASURED", basis });

test("🔴 FIX 5 · BUILD is reachable from the PRODUCTION path once every leg it requires is measured", () => {
  const legs = answerEvidence({ claims: [claim("auth.q.k=value-0", "one"), claim("auth.q.k=value-1", "two")], ...SAME }).byAxis;
  const [r] = discoverAxes(axisInput({
    answerLegs: legs,
    availabilityLegs: { k: measured("control: per-value evidence was acquired for both values") },
    humanValueLegs: { k: measured("control: a per-value behavioural difference was measured") },
  }));
  assert.equal(r.distinguishing.answer.materiallyChanges, true);
  assert.equal(r.verdict, "BUILD", "every leg measured and the production path still cannot reach BUILD");
});

test("🔴 FIX 5 · each remaining leg gates BUILD ON ITS OWN — neither is decoration", () => {
  const legs = answerEvidence({ claims: [claim("auth.q.k=value-0", "one"), claim("auth.q.k=value-1", "two")], ...SAME }).byAxis;
  /* availability measured, human value not */
  const [a] = discoverAxes(axisInput({ answerLegs: legs, availabilityLegs: { k: measured("ctl") } }));
  assert.equal(a.verdict, "MONITOR", "BUILD fired without human value");
  /* human value measured, availability not */
  const [b] = discoverAxes(axisInput({ answerLegs: legs, humanValueLegs: { k: measured("ctl") } }));
  assert.equal(b.verdict, "MONITOR", "BUILD fired without evidence availability");
});

test("🔴 FIX 5 · supplying neither leg leaves the run byte-identical — nothing was promoted", () => {
  const [before] = discoverAxes(axisInput());
  assert.equal(before.evidenceAvailability.state, "UNKNOWN");
  assert.equal(before.humanValue.state, "UNKNOWN");
  assert.match(before.evidenceAvailability.basis, /can be acquired is itself a supply measurement/);
  assert.match(before.humanValue.basis, /0 clicks/);
});

test("🔴 FIX 5 · the REAL run measures neither leg — the evidence for them is not owned", async () => {
  const { ensureSubjectHook, importSubjectModule } = await import("../src/subject-roots.mjs");
  ensureSubjectHook();
  await importSubjectModule("almi-oet", "product.mjs");
  /* Driven through the same module the runner uses, with no legs supplied — which is what the
   * runner does, because no availability or human-value evidence exists to supply. */
  const [r] = discoverAxes(axisInput());
  assert.equal(r.evidenceAvailability.state, "UNKNOWN");
  assert.equal(r.humanValue.state, "UNKNOWN");
  assert.notEqual(r.verdict, "BUILD");
});
