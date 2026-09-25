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
  answerEvidence, tenancyGate, parseQualifiedClaim, projectToDiscoveredLevel, ANSWER_LEG_STATES, ANSWER_REASONS,
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

  /* 🔴 SINCE THE OWNER VERIFIED THE TWO PNMC RECORDS (21 Sep 2026) THE REAL REGISTRY DOES DECIDE
   * ONE AXIS — read WITHOUT the value-vocabulary check. That is the verification landing, and it is
   * asserted rather than described, so it cannot quietly stop being true. */
  const terminal = Object.entries(r.byAxis).filter(([, l]) => l.state === "MEASURED");
  assert.deepEqual(terminal.map(([a]) => a), ["destination"], `unexpected decidable axes: ${JSON.stringify(terminal.map(([a]) => a))}`);
  assert.equal(r.byAxis.destination.materiallyChanges, true);
  assert.deepEqual(r.byAxis.destination.evidence, [
    "pk-pnmc.verification-fee.destination=domestic",
    "pk-pnmc.verification-fee.destination=foreign",
  ]);

  /* 🔴 AND WITH THE VALUE CHECK IT DECIDES NOTHING. The axis was discovered on country names; the
   * answers are about where a verification is SENT. One name, two vocabularies — so the leg refuses,
   * and row 6 gains no terminal axis from it. This is the row's real blocker, measured. */
  const checked = answerEvidence({ claims, ...SAME, axisValues: { destination: ["peru", "spain", "australia"] } });
  assert.equal(checked.byAxis.destination.state, "INSUFFICIENT_EVIDENCE");
  assert.equal(checked.byAxis.destination.reason, ANSWER_REASONS.DISJOINT_VALUE_POPULATION);
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

/* ================================================================== *
 * 🔴 FIX 9 — ONE AXIS NAME, TWO VALUE VOCABULARIES.
 *
 * Measured on the real registry: the axis `destination` was DISCOVERED on {peru, spain, australia,
 * …} and the answer evidence carries {uk-nmc, foreign, domestic}. They share ZERO values. Attaching
 * the leg by NAME would have decided an axis using answers about a population it was never
 * discovered on — the same confounding the stem check refuses when the AUTHORITY moves with the
 * value, arriving by a different door.
 * ================================================================== */

test("🔴 FIX 9 · disjoint value vocabularies cannot decide an axis, however well verified the answers are", () => {
  const claims = [claim("auth.q.k=domestic", "1000"), claim("auth.q.k=foreign", "10000")];
  /* the axis was discovered on entirely different values */
  const r = answerEvidence({ claims, ...SAME, axisValues: { k: ["peru", "spain", "australia"] } });
  assert.equal(r.byAxis.k.state, "INSUFFICIENT_EVIDENCE");
  assert.equal(r.byAxis.k.reason, ANSWER_REASONS.DISJOINT_VALUE_POPULATION);
  assert.equal(r.byAxis.k.sharedValues, 0);
  assert.match(r.byAxis.k.basis, /two value vocabularies/);

  /* 🔴 CONTROL: the SAME claims decide when the axis was discovered on the SAME values — so the
   * refusal is the disjointness talking, not a rule that refuses every pair. */
  const shared = answerEvidence({ claims, ...SAME, axisValues: { k: ["domestic", "foreign"] } });
  assert.equal(shared.byAxis.k.state, "MEASURED");
  assert.equal(shared.byAxis.k.materiallyChanges, true);
});

test("🔴 FIX 9 · PARTIAL overlap still decides — the guard refuses only a population it shares nothing with", () => {
  const claims = [claim("auth.q.k=domestic", "1000"), claim("auth.q.k=foreign", "10000")];
  const r = answerEvidence({ claims, ...SAME, axisValues: { k: ["domestic", "peru", "spain"] } });
  assert.equal(r.byAxis.k.state, "MEASURED", "one shared value is enough to be the same population");
});

test("🔴 FIX 9 · an axis whose values were never supplied is judged exactly as before", () => {
  const claims = [claim("auth.q.k=a", "one"), claim("auth.q.k=b", "two")];
  assert.equal(answerEvidence({ claims, ...SAME }).byAxis.k.state, "MEASURED");
  assert.equal(answerEvidence({ claims, ...SAME, axisValues: {} }).byAxis.k.state, "MEASURED");
  /* and an axis discovered on NO values does not trigger it either — an empty set shares nothing
   * with everything, and refusing on that would refuse every axis nobody discovered. */
  assert.equal(answerEvidence({ claims, ...SAME, axisValues: { k: [] } }).byAxis.k.state, "MEASURED");
});

/* ================================================================== *
 * 🔴 FIX 8 — THE AXIS POPULATION'S SCOPE IS ITS CONTAINER'S DECLARATION (F02, 24 Sep 2026).
 *
 * It used to be derived from its own rows: a mixed capture was given the scope of whichever tenant held the evidence, by
 * keeping only that tenant's rows — a container re-scoped by filtering. F02 forbids it: an item has ONE declared scope.
 * The container keeps the scope its declaration resolves, and rows declared to another tenant make it AMBIGUOUS.
 * ================================================================== */

test("🔴 FIX 8 · the axis scope is the container's own declaration — never re-derived from a subset of its rows (F02)", async () => {
  const { readDeclaredAnswerEvidence } = await import("../src/discovery/row6.mjs");
  const { createJsonlStore } = await import("../src/evidence/store.mjs");
  const { BATCH_ID } = await import("../src/crawl/observation-batch.mjs");
  const REPO2 = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
  const rows = createJsonlStore(`${REPO2}runs/evidence/evidence.jsonl`).readAll().filter((r) => r.record_type === "observation" && Array.isArray(r.value?.rows)).flatMap((o) => o.value.rows);
  assert.ok(rows.length > 0, "the real axis population is empty — nothing below would be measured");

  /* 1 · an UNDECLARED container stays UNDECLARED, however many of its rows resolve */
  const undeclared = await readDeclaredAnswerEvidence({ axisResourceKind: "CRAWL_BATCH", axisResourceRef: "ctl", axisRows: rows });
  assert.equal(undeclared.axisScope.state, "UNDECLARED", "an undeclared container was scoped from its rows");

  /* 2 · REAL: while the batch is attached WHOLE to one tenant, its rows declared to other tenants make it AMBIGUOUS; once that
   * unlawful whole attachment is retired (owner ruling 1145012, Decision 2) the container is UNDECLARED. Never one scope. */
  const { createTenantResolver } = await import("../src/tenancy/resolver.mjs");
  const wholeAttached = createTenantResolver().declarations.attachments.some((a) => a.resourceKind === "CRAWL_BATCH" && a.resourceRef === BATCH_ID);
  const real = await readDeclaredAnswerEvidence({ axisResourceKind: "CRAWL_BATCH", axisResourceRef: BATCH_ID, axisRows: rows });
  assert.equal(real.axisScope.state, wholeAttached ? "AMBIGUOUS" : "UNDECLARED", "a container whose rows are declared elsewhere was treated as one scope");
  assert.equal(real.axisPartition.remainder, 0, "the axis population does not self-account");

  /* 3 · CONTROL, opposite verdict: a stand-in declaration world where the container, every row and the registry share ONE
   * tenant — the same code opens the join, so the refusals above are the declarations talking, not a gate that never opens. */
  const ONE = `tenant:${"c3".repeat(16)}`;
  const standIn = () => ({ state: "RESOLVED", tenantId: ONE, reason: "EXPLICIT_DECLARED_ATTACHMENT", detail: null });
  const opened = await readDeclaredAnswerEvidence({ axisResourceKind: "CRAWL_BATCH", axisResourceRef: BATCH_ID, axisRows: rows, resolve: standIn });
  assert.deepEqual([opened.axisScope.state, opened.evidenceScope.state, opened.axisScope.tenantId === opened.evidenceScope.tenantId], ["RESOLVED", "RESOLVED", true]);
});

/* ================================================================== *
 * 🔴 §5 — THE LEVEL AT WHICH THE VERDICT IS COMPUTED.
 *
 * THE REAL CASE, and the reason this law exists. The `destination` axis was discovered on ten
 * countries people typed. The only VERIFIED answers are Pakistan's verification fee at
 * `domestic` and `foreign` — which are not countries, but classes relative to an issuing
 * jurisdiction. Today that is refused as DISJOINT_VALUE_POPULATION, correctly.
 *
 * The obvious fix is a child→parent mapping, and it is a trap. Supply one and the vocabularies
 * connect, the disjoint refusal lifts, and the axis reads MEASURED · ANSWER_CHANGES — because at
 * the PARENT level Rs.1,000 and Rs.10,000 really are different answers. But every one of the ten
 * discovered countries maps to the same parent, so for every person who actually searched, the
 * answer never changed once.
 *
 * A mapping joins the levels. It must not move the verdict to the parent one.
 * ================================================================== */

/** The ten values the axis was really discovered on, and the fee question as it is really recorded. */
const TEN_COUNTRIES = ["peru", "spain", "australia", "china", "denmark", "japan", "netherlands", "new_zealand", "philippines", "switzerland"];
const FEE_CLAIMS = [
  claim("pk-pnmc.verification-fee.destination=domestic", 1000),
  claim("pk-pnmc.verification-fee.destination=foreign", 10000),
];
/* none of the ten is the issuing jurisdiction, so all ten inherit the one foreign fee */
const ALL_FOREIGN = Object.fromEntries(TEN_COUNTRIES.map((c) => [c, "foreign"]));

test("🔴 §5 · THE REAL CASE — ten discovered countries all inherit ONE answer, and that is a CONSTANT, not a distinction", () => {
  const r = answerEvidence({
    ...SAME, claims: FEE_CLAIMS,
    axisValues: { destination: TEN_COUNTRIES },
    valueParents: { destination: ALL_FOREIGN },
  });
  const leg = r.byAxis.destination;
  assert.equal(leg.state, "INSUFFICIENT_EVIDENCE");
  assert.equal(leg.reason, ANSWER_REASONS.CONSTANT_AT_DISCOVERED_LEVEL,
    "the mapping was allowed to move the verdict to the parent level, where the answers differ");
  assert.equal(leg.distinctAnswersAtDiscoveredLevel, 1);
  assert.match(leg.basis, /never changes for anybody who searched/);
});

test("🔴 §5 · CONTROL — the SAME evidence DOES decide once a discovered value reaches the other answer", () => {
  /* one discovered value inside the issuing jurisdiction is all it takes: the answer now changes
   * across the values people actually used, which is what the axis was always asking. */
  const withDomestic = { ...ALL_FOREIGN, pakistan: "domestic" };
  const r = answerEvidence({
    ...SAME, claims: FEE_CLAIMS,
    axisValues: { destination: [...TEN_COUNTRIES, "pakistan"] },
    valueParents: { destination: withDomestic },
  });
  const leg = r.byAxis.destination;
  assert.equal(leg.reason, ANSWER_REASONS.ANSWER_CHANGES, "a real change at the discovered level was refused");
  assert.equal(leg.materiallyChanges, true);
  assert.equal(leg.distinctAnswersAtDiscoveredLevel, 2);
});

test("🔴 §5 · a mapping that drops a discovered value cannot decide — the dropped ones are the ones that might have differed", () => {
  const partial = { peru: "foreign", spain: "foreign" }; // eight of the ten have no parent
  const r = answerEvidence({
    ...SAME, claims: FEE_CLAIMS,
    axisValues: { destination: TEN_COUNTRIES },
    valueParents: { destination: partial },
  });
  const leg = r.byAxis.destination;
  assert.equal(leg.reason, ANSWER_REASONS.INCOMPLETE_LEVEL_MAPPING);
  assert.equal(leg.unmapped.length, 8);
  assert.ok(leg.unmapped.includes("japan"), "a value with no parent must be named, not quietly dropped");
});

test("🔴 §5 · a value whose parent nothing answers is INCOMPLETE too — a parent is not an answer", () => {
  const toUnanswered = Object.fromEntries(TEN_COUNTRIES.map((c) => [c, "transit"])); // no claim at 'transit'
  const r = answerEvidence({
    ...SAME, claims: FEE_CLAIMS,
    axisValues: { destination: TEN_COUNTRIES },
    valueParents: { destination: toUnanswered },
  });
  assert.equal(r.byAxis.destination.reason, ANSWER_REASONS.INCOMPLETE_LEVEL_MAPPING);
  assert.equal(r.byAxis.destination.unanswered.length, 10);
});

test("🔴 §5 · WITHOUT a mapping nothing changes — the disjoint refusal still stands, unweakened", () => {
  const r = answerEvidence({ ...SAME, claims: FEE_CLAIMS, axisValues: { destination: TEN_COUNTRIES } });
  assert.equal(r.byAxis.destination.reason, ANSWER_REASONS.DISJOINT_VALUE_POPULATION);
});

test("🔴 §5 · the projection is counted at the DISCOVERED level, and says so directly", () => {
  const answersAtParent = new Map([["foreign", new Set(["10000"])], ["domestic", new Set(["1000"])]]);
  const all = projectToDiscoveredLevel({ discovered: TEN_COUNTRIES, parents: ALL_FOREIGN, answersAtParent });
  assert.equal(all.answerOf.size, 10, "every discovered value must be carried through");
  assert.equal(all.distinctAnswers.size, 1, "ten values, one answer — the parent level's two are not reachable from here");
  assert.deepEqual(all.unmapped, []);

  /* and the parent level genuinely holds two, which is exactly why counting there would mislead */
  assert.equal(answersAtParent.size, 2);
});
