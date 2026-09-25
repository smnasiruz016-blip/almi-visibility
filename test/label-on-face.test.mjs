/**
 * 🔴 ROW 50 — LABELLED ON ITS FACE. THE THIRD STATE MUST FAIL.
 *
 * Owner ruling, 21 September 2026: a record declaring no applicable claimDimensions is not labelled on its face; a date
 * exemption keeps a record STORED and never makes it Row 50 evidence; `elementAmbiguity` prose may not select
 * enforcement. Worlds A–L below, then the real registry through the production loader. Fixtures are CONTROLS.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { labelOnFace, adjudicateDimensions, row50Census, isGoverned } from "../src/evidence/label-on-face.mjs";
import { classify, tally } from "../src/checklist/classification.mjs";
import { judgeLeavingUnknown } from "../src/evidence/verdict.mjs";
import { validateRegistry } from "../src/facts/validate.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { factRegistryRef, externalRootContaining } from "../src/adapter/external-subject.mjs";

const T1 = "tenant:11111111111111111111111111111111";
const T2 = "tenant:22222222222222222222222222222222";
const SUBJECT = { resourceKind: "FACT_REGISTRY", resourceRef: "fixture-registry", evidenceClass: "FIXTURE" };
const resolveAll = ({ resourceRef }) => ({ state: "RESOLVED", tenantId: resourceRef === "foreign-registry" ? T2 : T1 });
const NA = "NOT_APPLICABLE";

/** A governed fixture record: it replaces an UNKNOWN with a newer dated, named, OFFICIAL, read check. */
function rec({ id = "x.rule.who=keeper", qualifier = "who=keeper", valueType = "rule", elements = ["who-keeper", "must-register"], confirmed, dims, state = "VERIFIED", checkedOn = "2026-09-20", kind, extra = {} } = {}) {
  const r = {
    id,
    claim: { subject: "x", predicate: "rule", qualifier },
    value: { value: "a rule", valueType },
    claimElements: elements,
    verificationState: state,
    verification: {
      state, verdict: state, checkedOn, checkedBy: "human:tester", sourceTier: "OFFICIAL", sourceRead: true,
      elementsConfirmedKeys: confirmed ?? elements, elementsNotFoundKeys: [],
      previous: { state: "UNKNOWN", checkedOn: "2026-09-01" },
      ...extra,
    },
  };
  if (dims !== undefined) r.claimDimensions = dims;
  if (kind) r.kind = kind;
  return r;
}
const census = (records, registryOf = () => SUBJECT) => row50Census({ records, subject: SUBJECT, registryOf, resolve: resolveAll });

/* ═════════ REQUIRED WORLDS A–L ═════════ */

test("A · VERIFIED + exact declarations + confirmed evidence → LABELLED, and the guard advances it", () => {
  const r = rec({ dims: { qualifier: "who-keeper", listCompleteness: NA, bindingParty: "who-keeper" } });
  assert.equal(labelOnFace(r).state, "LABELLED");
  assert.equal(judgeLeavingUnknown(r.id, r.verification, r.claimElements, r).decision, "ADVANCED_ON_NEW_MEASUREMENT");
});

test("B · VERIFIED + a missing applicable declaration → UNLABELLED (DIMENSION_UNDECLARED), and refused under the contract", () => {
  const r = rec({ dims: { listCompleteness: NA, bindingParty: "who-keeper" } });
  const f = labelOnFace(r);
  assert.equal(f.state, "UNLABELLED");
  assert.ok(f.reasons.includes("DIMENSION_UNDECLARED:qualifier"));
  assert.equal(judgeLeavingUnknown(r.id, r.verification, r.claimElements, r).decision, "REFUSED");
});

test("C · VERIFIED + a wrong declaration → UNLABELLED: an element the record does not carry, or NOT_APPLICABLE where the structure requires it", () => {
  const wrongElement = labelOnFace(rec({ dims: { qualifier: "who-someone-else", listCompleteness: NA, bindingParty: "who-keeper" } }));
  assert.ok(wrongElement.reasons.includes("DIMENSION_WRONG_ELEMENT:qualifier"));
  const falseNA = labelOnFace(rec({ dims: { qualifier: NA, listCompleteness: NA, bindingParty: "who-keeper" } }));
  assert.ok(falseNA.reasons.includes("DIMENSION_REQUIRED_NOT_DECLARED:qualifier"));
  const unconfirmedOnVerified = labelOnFace(rec({ confirmed: ["must-register"], dims: { qualifier: "who-keeper", listCompleteness: NA, bindingParty: "who-keeper" } }));
  assert.ok(unconfirmedOnVerified.reasons.includes("DIMENSION_NOT_CONFIRMED_ON_VERIFIED:qualifier"));
});

test("D · UNKNOWN + exact declaration but insufficient evidence → the guard REFUSES and it stays UNKNOWN; its face is labelled", () => {
  const r = rec({ state: "UNKNOWN", confirmed: ["must-register"], dims: { qualifier: "who-keeper", listCompleteness: NA, bindingParty: "who-keeper" } });
  assert.equal(judgeLeavingUnknown(r.id, r.verification, r.claimElements, r).permitted, "UNKNOWN");
  assert.equal(labelOnFace(r).state, "LABELLED", "UNKNOWN is the honest label for an unconfirmed but declared dimension");
});

test("E · UNKNOWN + genuinely complete evidence → the lawful transition to VERIFIED remains possible", () => {
  const r = rec({ dims: { qualifier: "who-keeper", listCompleteness: NA, bindingParty: "who-keeper" } });
  const j = judgeLeavingUnknown(r.id, r.verification, r.claimElements, r);
  assert.equal(j.permitted, "VERIFIED");
  assert.deepEqual(j.reasons, []);
});

test("F · G · H · adjudication — one structural candidate is EXACT, two are MULTIPLE, none is ABSENT, an inapplicable dimension is NOT_APPLICABLE", () => {
  assert.equal(adjudicateDimensions(rec({ qualifier: "who-keeper", elements: ["who-keeper", "must-register"] })).qualifier.mapping, "EXACT");
  const multiple = rec({ qualifier: "who-keeper", elements: ["who-keeper", "who-other"], dims: { qualifier: "who-other" } });
  assert.equal(adjudicateDimensions(multiple).qualifier.mapping, "MULTIPLE");
  assert.equal(adjudicateDimensions(rec()).qualifier.mapping, "ABSENT", "who=keeper is not verbatim an element — no substring join is made");
  const a = adjudicateDimensions(rec({ qualifier: null, valueType: "count" }));
  assert.deepEqual([a.qualifier.mapping, a.listCompleteness.mapping, a.bindingParty.mapping], ["NOT_APPLICABLE", "NOT_APPLICABLE", "NOT_APPLICABLE"]);
  assert.equal(adjudicateDimensions(rec({ valueType: "list" })).listCompleteness.mapping, "ABSENT");
});

test("I · a derived record is governed by its derivation law — DERIVED, never forced into primary-source dimensions", () => {
  const d = labelOnFace({ id: "x.derived", kind: "derived", claim: { subject: "x", predicate: "d", qualifier: "who=keeper" }, value: { valueType: "rule" } });
  assert.equal(d.state, "DERIVED");
  assert.equal(d.dimensions, null);
});

test("J · `elementAmbiguity` removed → the enforcement outcome is UNCHANGED; and prose never excuses a LABELLED record held back", () => {
  // a pre-contract record the guard would advance, held UNKNOWN, and not labelled on its face
  const held = rec({ state: "UNKNOWN", checkedOn: "2026-09-12", extra: { state: "UNKNOWN", reason: "PARTIAL_EVIDENCE", elementAmbiguity: "prose that must not matter" } });
  const lawsOf = (records) => validateRegistry(records).registryErrors.filter((e) => e.law === "F24").map((e) => e.message);
  const withProse = lawsOf([held]);
  const { elementAmbiguity, ...stripped } = held.verification;
  const withoutProse = lawsOf([{ ...held, verification: stripped }]);
  assert.deepEqual(withoutProse, withProse, "removing the prose field changed what F24 enforces");
  assert.deepEqual(withProse, [], "an UNLABELLED record held UNKNOWN is the truthful outcome");
  // the protection still fires: a LABELLED record held back while the guard advances it
  const labelledHeld = rec({ id: "x.count", qualifier: null, valueType: "count", elements: ["n-12"], state: "UNKNOWN", checkedOn: "2026-09-12", dims: { qualifier: NA, listCompleteness: NA, bindingParty: NA }, extra: { state: "UNKNOWN", elementAmbiguity: "prose" } });
  assert.ok(lawsOf([labelledHeld]).some((m) => /held UNKNOWN although the guard finds its evidence sufficient/.test(m)), "F24 no longer fires on a labelled record held back");
});

test("K · a cross-tenant record → INVALID, never labelled and never UNKNOWN", () => {
  const r = rec({ dims: { qualifier: "who-keeper", listCompleteness: NA, bindingParty: "who-keeper" } });
  const c = census([r], () => ({ resourceKind: "FACT_REGISTRY", resourceRef: "foreign-registry", evidenceClass: "FIXTURE" }));
  assert.equal(c.results[0].state, "INVALID");
  assert.equal(c.verdict, "FAIL");
  assert.ok(c.reasons.some((x) => x.code === "CROSS_TENANT_RECORDS"));
});

test("L · an empty synthetic population cannot prove Row 50 — and a fixture-only population is never real evidence", () => {
  const empty = census([]);
  assert.equal(empty.verdict, "FAIL");
  assert.ok(empty.reasons.some((x) => x.code === "EMPTY_POPULATION"));
  const fixtureOnly = census([rec({ dims: { qualifier: "who-keeper", listCompleteness: NA, bindingParty: "who-keeper" } })]);
  assert.ok(fixtureOnly.reasons.some((x) => x.code === "NOT_REAL_EVIDENCE"));
  const realShaped = row50Census({ records: [rec({ dims: { qualifier: "who-keeper", listCompleteness: NA, bindingParty: "who-keeper" } })], subject: { ...SUBJECT, evidenceClass: "REAL" }, registryOf: () => ({ ...SUBJECT, evidenceClass: "REAL" }), resolve: resolveAll });
  assert.equal(realShaped.verdict, "PASS", "control: the same record, tagged REAL, passes — the fixture flag is what refused it");
});

test("🔴 A DATE EXEMPTION STORES, IT DOES NOT LABEL — a pre-contract record with no declarations is UNLABELLED, and the date is never read", () => {
  const pre = rec({ checkedOn: "2026-09-12" });
  const post = rec({ checkedOn: "2026-09-20" });
  assert.equal(labelOnFace(pre).state, "UNLABELLED");
  assert.deepEqual(labelOnFace(pre).reasons, labelOnFace(post).reasons, "the verification date changed the label");
  assert.equal(isGoverned(pre), true);
  assert.equal(judgeLeavingUnknown(pre.id, pre.verification, pre.claimElements, pre).contract, "PRE_CONTRACT", "control: this record really is pre-contract");
});

/* ═════════ THE REAL REGISTRY ═════════ */

test("🟢 REAL — the production loader and census: 36 governed, 8 LABELLED, 28 UNLABELLED, 1 derived apart, remainder 0 — Row 50 FAILS on a label that is absent", async () => {
  const product = await productFromArgv(["--product=almi-oet"], { scope: (await import("./support/subjects.mjs")).subjectScope("almi-oet") });
  const { records } = await loadRegistry(product.factsDir, product.productId);
  const root = externalRootContaining(product.factsDir, process.env);
  const subject = { ...factRegistryRef({ factsDir: product.factsDir, rootPath: root.path }), evidenceClass: "REAL" };
  const c = row50Census({ records, subject, registryOf: () => subject, resolve: createTenantResolver() });
  assert.deepEqual(c.counts, { considered: 37, governed: 36, LABELLED: 8, UNLABELLED: 28, INVALID: 0, DERIVED: 1, remainder: 0 });
  assert.equal(c.verdict, "FAIL");
  assert.deepEqual(c.reasons.map((x) => x.code), ["LABELS_ABSENT_OR_WRONG"]);
  const pairs = records.filter((r) => isGoverned(r) && r.kind !== "derived").flatMap((r) => Object.values(adjudicateDimensions(r)).map((a) => a.mapping));
  const n = (m) => pairs.filter((p) => p === m).length;
  assert.deepEqual([pairs.length, n("EXACT"), n("MULTIPLE"), n("ABSENT"), n("NOT_APPLICABLE")], [108, 2, 0, 34, 72]);
  assert.equal(validateRegistry(records).registryErrors.length, 0, "the registry must still satisfy every law");
});

/* 🔴 22 September 2026 — the owner's product-boundary decision. The row stays FAILED; the blocker is named as product
 * data judgement deferred to the subject's phase; nothing was authored to make a label appear. */
test("🔴 row 50 stays FAILED with blocker PRODUCT_DATA_JUDGEMENT_DEFERRED_TO_SUBJECT_PHASE — pair 1 answered E, no element added, no denominator moved", async () => {
  const row = classify()[50];
  assert.equal(row.state, "FAILED");
  assert.match(row.blocker, /^PRODUCT_DATA_JUDGEMENT_DEFERRED_TO_SUBJECT_PHASE — /);
  assert.match(row.blocker, /NOT an engine implementation failure/);
  assert.equal(row.ruling, "_handoffs/AlmiVisibility_OWNER_DECISION_2026-09-22_ROW50_PRODUCT_BOUNDARY.md");
  assert.ok(row.unlockCondition.includes("_handoffs/AlmiVisibility_ROW50_EXIT_C_JUDGEMENT_PACKET_2026-09-22.md"), "the preserved packet is not named");
  assert.deepEqual(tally(classify()), { "NOT-STARTED": 2, "BUILT-NOT-PROVED": 4, "TESTABLE-NOW": 0, "VERIFIED-PASS": 27, FAILED: 3, "BLOCKED-UNKNOWN": 2, DEFERRED: 23 });
  const P = await productFromArgv(["--product=almi-oet"], { scope: (await import("./support/subjects.mjs")).subjectScope("almi-oet") });
  const { records } = await loadRegistry(P.factsDir, P.productId);
  const pair1 = records.find((r) => r.id === "ie-nmbi.oet-minimum-grade.profession=nursing");
  assert.deepEqual(pair1.claimElements, ["listening-grade-b", "reading-grade-b", "speaking-grade-b", "writing-grade-c-plus"], "an element was added to obtain a label");
  assert.equal(pair1.claimDimensions, undefined, "pair 1 was answered E: nothing is declared");
  assert.equal(labelOnFace(pair1).state, "UNLABELLED");
  assert.equal(adjudicateDimensions(pair1).qualifier.mapping, "ABSENT");
});
