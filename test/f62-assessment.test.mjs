/**
 * 🔴 RR-150 · F62 · FROM A BODY'S OWN SOURCED RULE TO A REVIEWABLE ASSESSMENT (acceptance _handoffs a5ec9f1).
 *
 * Fixtures DRIVE the rules; they never move F62 on real data. Every refusal below has a CONTROL that admits the correct case, so each
 * assertion can fail both ways. The entry point runs in a declared world (a confined copy of the data root) — nothing reaches the real
 * store. REAL3 reads the real stored records, and its drafts are CC's readings: PROPOSED, never confirmed.
 *
 *   W1 four kinds, one outcome each; ACCEPTED never REQUIRED; silence never NOT_REQUIRED      W6 tenant crossover refused
 *   W2 misleading scope: another body, a wider or a narrower record is refused (COPIED_SCOPE)  W7 missing checker refused at CONFIRMATION
 *   W3 stale or undated source refused                                                          W8 readback; guidance only when CONFIRMED
 *   W4 an excerpt that is not in the stored text is refused                                     W9 two unrelated products
 *   W5 duplicate write refused                                                                  W10 evidence states of the two new records
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { deriveDeclaration } from "../src/research/applicability.mjs";
import { draftAssessments, confirmAssessment, readback, confirmedGuidance, REFUSAL, KINDS, GUIDANCE_LIMITS, ASSESSMENT_RECORD } from "../src/research/applicability-assessment.mjs";
import { readDerivedDeclaration } from "../src/research/applicability-declaration-reader.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { NO_DECLARED_PERSON_CHECKERS } from "../src/facts/citation-audit.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";
import { qualifierPairs } from "../src/discovery/context-axes.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld, FIXTURE_TENANT, inputPathRef, DATA_ROOT } from "./helpers/declared-world.mjs";
import { PRODUCT as KNOTS } from "../products/neutral-test-knots/product.mjs";
import { PRODUCT as FERMENTS } from "../products/neutral-test-ferments/product.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-f62-assess-${process.pid}`);
const ON = "2026-10-03";
const PERSON = "human:Fixture Checker";
const SUBJ = "fixture-subject-one";

const rec = (id, body, qualifier, text, over = {}) => ({
  id, claim: { subject: body, predicate: `fixture-${id}`, qualifier }, value: { value: id }, source: { tier: 1, url: `https://fixture.invalid/${id}`, publisher: body },
  freshness: { days: 180 }, life: { extractedOn: "2026-10-01" }, evidence: { ownWords: text },
  verification: { checkedOn: "2026-10-01", verdict: "VERIFIED", checkedBy: PERSON, elementsConfirmedKeys: ["value"] },
  checks: { linkCheckOutcome: "pass", linkCheckedOn: "2026-10-01", quoteMatchOutcome: "not-applicable", fingerprintOutcome: "pass", fingerprintCheckedOn: "2026-10-01" }, ...over,
});
const FACTS = [
  rec("a1", "body-a", "knot=bowline", "Body A accepts the declared test among two tests for this knot."),
  rec("a2", "body-a", null, "Body A requires the declared test for every applicant."),
  rec("a3", "body-a", "knot=sheet-bend", "Body A sets a fee for this knot and says nothing about the test."),
  rec("b1", "body-b", "knot=bowline", "Body B does not require the declared test for this knot."),
  rec("s1", "body-s", "knot=bowline", "Body S accepts the declared test.", { verification: { checkedOn: "2025-01-01", verdict: "VERIFIED", checkedBy: PERSON, elementsConfirmedKeys: ["value"] } }),
];
const AXES = { declared: [{ key: "knot", status: "EVIDENCED" }], discovered: [{ key: "knot", records: 5, verifiedRecords: 5, distinctValues: 2 }] };
const DECL = deriveDeclaration({ axes: AXES, facts: FACTS, persons: [], on: ON });
const draft = (body, scope, kind, outcome, factId, excerpt, over = {}) => ({ subject: SUBJ, check: { body, scope }, kind, outcome, evidence: { factId, excerpt }, ...over });
const run = (drafts, over = {}) => draftAssessments({ subject: SUBJ, declaration: DECL, facts: FACTS, drafts, on: ON, draftedBy: "actor:cc", ...over });
const ACC = draft("body-a", { knot: "bowline" }, "ACCEPTANCE", "ACCEPTED", "a1", "accepts the declared test among two tests");
/* RR-150 run 1 (X1): a refused draft made later tests crash on `undefined` — they now assert admission first */
const admitted = (drafts, n = drafts.length) => { const r = run(drafts); assert.equal(r.assessments.length, n, `expected ${n} admitted, got ${r.assessments.length} (refused: ${r.refused.map((x) => x.code).join(", ")})`); return r.assessments; };

test("W1 · FOUR KINDS, ONE OUTCOME EACH: requirement, acceptance, non-requirement, silence — ACCEPTED never becomes REQUIRED; silence never becomes NOT_REQUIRED", () => {
  const ok = run([
    ACC,
    draft("body-a", {}, "EXPLICIT_REQUIREMENT", "REQUIRED", "a2", "requires the declared test"),
    draft("body-b", { knot: "bowline" }, "EXPLICIT_NON_REQUIREMENT", "NOT_REQUIRED", "b1", "does not require the declared test"),
    draft("body-a", { knot: "sheet-bend" }, "SILENT_OR_AMBIGUOUS", "UNKNOWN", "a3", "says nothing about the test", { missingFact: "the body's own statement of its position on the test" }),
  ]);
  assert.deepEqual(ok.refused, []);
  assert.deepEqual(ok.assessments.map((a) => [a.kind, a.outcome, a.status]), [["ACCEPTANCE", "ACCEPTED", "PROPOSED"], ["EXPLICIT_REQUIREMENT", "REQUIRED", "PROPOSED"], ["EXPLICIT_NON_REQUIREMENT", "NOT_REQUIRED", "PROPOSED"], ["SILENT_OR_AMBIGUOUS", "UNKNOWN", "PROPOSED"]]);
  assert.equal(ok.assessments[3].missingFact, "the body's own statement of its position on the test");
  const bad = run([
    { ...ACC, outcome: "REQUIRED" },
    draft("body-a", { knot: "sheet-bend" }, "SILENT_OR_AMBIGUOUS", "NOT_REQUIRED", "a3", "says nothing about the test"),
    draft("body-a", { knot: "sheet-bend" }, "SILENT_OR_AMBIGUOUS", "UNKNOWN", "a3", "says nothing about the test"),
  ]);
  assert.deepEqual(bad.refused.map((r) => r.code), [REFUSAL.KIND_OUTCOME_MISMATCH, REFUSAL.KIND_OUTCOME_MISMATCH, REFUSAL.MISSING_FACT_UNNAMED]);
  assert.equal(bad.assessments.length, 0);
  assert.deepEqual(Object.entries(KINDS), [["EXPLICIT_REQUIREMENT", "REQUIRED"], ["ACCEPTANCE", "ACCEPTED"], ["EXPLICIT_NON_REQUIREMENT", "NOT_REQUIRED"], ["SILENT_OR_AMBIGUOUS", "UNKNOWN"]]);
});

test("W2 · MISLEADING SCOPE: a body-wide record for a narrower check, another body's record, a narrower record for a wider check — each COPIED_SCOPE; an unknown check is refused", () => {
  const r = run([
    draft("body-a", { knot: "bowline" }, "EXPLICIT_REQUIREMENT", "REQUIRED", "a2", "requires the declared test"),
    draft("body-b", { knot: "bowline" }, "ACCEPTANCE", "ACCEPTED", "a1", "accepts the declared test among two tests"),
    draft("body-a", {}, "ACCEPTANCE", "ACCEPTED", "a1", "accepts the declared test among two tests"),
    draft("body-a", { knot: "clove-hitch" }, "ACCEPTANCE", "ACCEPTED", "a1", "accepts the declared test among two tests"),
  ]);
  assert.deepEqual(r.refused.map((x) => x.code), [REFUSAL.COPIED_SCOPE, REFUSAL.COPIED_SCOPE, REFUSAL.COPIED_SCOPE, REFUSAL.CHECK_UNKNOWN]);
  /* CONTROL: the record OF that check is admitted */
  assert.equal(run([ACC]).assessments.length, 1);
});

test("W3 · STALE SOURCE: a record F45 does not present CURRENT — expired, or undated — is refused at drafting", () => {
  const stale = run([draft("body-s", { knot: "bowline" }, "ACCEPTANCE", "ACCEPTED", "s1", "accepts the declared test")]);
  assert.deepEqual(stale.refused.map((x) => x.code), [REFUSAL.STALE_SOURCE]);
  assert.match(stale.refused[0].why, /EXPIRED/);
  const undatedFacts = FACTS.map((f) => (f.id === "a1" ? { ...f, verification: { verdict: "VERIFIED", checkedBy: PERSON, elementsConfirmedKeys: ["value"] } } : f));
  const undated = draftAssessments({ subject: SUBJ, declaration: deriveDeclaration({ axes: AXES, facts: undatedFacts, persons: [], on: ON }), facts: undatedFacts, drafts: [ACC], on: ON, draftedBy: "actor:cc" });
  assert.deepEqual(undated.refused.map((x) => x.code), [REFUSAL.STALE_SOURCE]);
  assert.equal(run([ACC]).refused.length, 0, "CONTROL: a CURRENT record was refused");
});

test("W4 · EVIDENCE MUST BE STORED: an excerpt that does not occur verbatim in the record's stored text is refused; the admitted one keeps its source, date and excerpt hash", () => {
  const r = run([{ ...ACC, evidence: { factId: "a1", excerpt: "accepts the declared test without conditions" } }]);
  assert.deepEqual(r.refused.map((x) => x.code), [REFUSAL.EVIDENCE_NOT_STORED]);
  const [a] = admitted([ACC]);
  assert.deepEqual([a.evidence.factId, a.evidence.observedOn, a.evidence.source.url, a.evidence.source.tier, a.check.body, a.check.scope], ["a1", "2026-10-01", "https://fixture.invalid/a1", 1, "body-a", { knot: "bowline" }]);
  assert.equal(a.evidence.excerptSha256, createHash("sha256").update(ACC.evidence.excerpt).digest("hex"));
});

test("W5 · DUPLICATE WRITE: the same draft twice is admitted once; one already recorded is refused", () => {
  const r = run([ACC, ACC]);
  assert.deepEqual([r.assessments.length, r.refused.map((x) => x.code)], [1, [REFUSAL.DUPLICATE]]);
  const again = run([ACC], { existingIds: [r.assessments[0].assessment_id] });
  assert.deepEqual([again.assessments.length, again.refused.map((x) => x.code)], [0, [REFUSAL.DUPLICATE]]);
  assert.equal(run([ACC], { existingIds: ["another-id"] }).assessments.length, 1, "CONTROL: an unrelated id blocked the draft");
});

test("W6 · TENANT CROSSOVER: a draft naming another subject is refused — one tenant's assessment never crosses to another", () => {
  assert.deepEqual(run([{ ...ACC, subject: "fixture-subject-two" }]).refused.map((x) => x.code), [REFUSAL.OTHER_SUBJECT]);
  assert.equal(admitted([ACC])[0].subject, SUBJ);
});

test("W7 · MISSING CHECKER: drafting needs no declared person; CONFIRMATION does (F46 C3) — the empty roster, an undeclared checker, an UNKNOWN and a stale source are each refused", () => {
  const [a] = admitted([ACC]);
  const c = (over) => confirmAssessment({ assessment: a, checker: PERSON, persons: [PERSON], facts: FACTS, on: ON, ...over });
  assert.equal(c({ persons: NO_DECLARED_PERSON_CHECKERS }).refused, REFUSAL.MISSING_CHECKER);
  assert.equal(c({ checker: "human:someone undeclared" }).refused, REFUSAL.MISSING_CHECKER);
  const [silent] = admitted([draft("body-a", { knot: "sheet-bend" }, "SILENT_OR_AMBIGUOUS", "UNKNOWN", "a3", "says nothing about the test", { missingFact: "x" })]);
  assert.equal(c({ assessment: silent }).refused, REFUSAL.NOTHING_TO_CONFIRM);
  assert.equal(c({ on: "2027-06-01" }).refused, REFUSAL.STALE_SOURCE);
  const ok = c({});
  assert.ok(ok.record, "CONTROL: a declared person could not confirm");
  assert.equal(c({ existingIds: [ok.record.confirmation_id] }).refused, REFUSAL.DUPLICATE);
});

test("W8 · READBACK: CONFIRMED · PROPOSED · UNKNOWN kept apart, each UNKNOWN with its missing fact; only CONFIRMED REQUIRED/ACCEPTED is guidance for F16 — never a question, never a page", () => {
  const drafted = admitted([ACC, draft("body-a", {}, "EXPLICIT_REQUIREMENT", "REQUIRED", "a2", "requires the declared test"), draft("body-b", { knot: "bowline" }, "EXPLICIT_NON_REQUIREMENT", "NOT_REQUIRED", "b1", "does not require the declared test")]);
  const conf = confirmAssessment({ assessment: drafted[0], checker: PERSON, persons: [PERSON], facts: FACTS, on: ON }).record;
  const notMine = confirmAssessment({ assessment: drafted[1], checker: "human:Other", persons: ["human:Other"], facts: FACTS, on: ON }).record;
  const rb = readback({ declaration: DECL, records: [...drafted, conf, notMine], persons: [PERSON] });
  const row = (body, scope) => rb.rows.find((r) => r.check.body === body && JSON.stringify(r.check.scope) === JSON.stringify(scope));
  assert.deepEqual([row("body-a", { knot: "bowline" }).state, row("body-a", { knot: "bowline" }).outcome], ["CONFIRMED", "ACCEPTED"]);
  assert.equal(row("body-a", {}).state, "PROPOSED", "a confirmation by a checker not on the roster counted");
  assert.match(row("body-a", {}).missingFact, /F46 C3/);
  assert.match(row("body-a", { knot: "sheet-bend" }).missingFact, /^no assessment drafted/);
  assert.deepEqual({ ...rb.counts }, { checks: DECL.checks.length, CONFIRMED: 1, PROPOSED: 2, UNKNOWN: DECL.checks.length - 3 });
  const g = confirmedGuidance(rb);
  assert.deepEqual(g.map((x) => [x.check.body, x.outcome, x.limits]), [["body-a", "ACCEPTED", GUIDANCE_LIMITS]]);
  assert.equal(confirmedGuidance(readback({ declaration: DECL, records: drafted, persons: [PERSON] })).length, 0, "an unconfirmed assessment became guidance");
  assert.doesNotMatch(JSON.stringify([rb, g]), /"(page|pages|question|questions|demand)":/i);
});

const registryOf = (name, records) => { const d = join(TMP, name); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "facts.mjs"), `export default ${JSON.stringify(records)};\n`); return d; };

test("W9 · TWO UNRELATED PRODUCTS through the production reader, each over its own registry on disk — a draft against the other product's check is refused", async () => {
  try {
    const knots = { ...KNOTS, factsDir: registryOf("k", [rec("k1", "knot-body", "knot=bowline", "The knot body accepts the declared test.")]) };
    const ferm = { ...FERMENTS, factsDir: registryOf("f", [rec("m1", "ferment-body", "ferment=miso", "The ferment body requires the declared test.")]) };
    const dk = await readDerivedDeclaration({ product: knots, tenantId: null, resolve: null, on: ON });
    const df = await readDerivedDeclaration({ product: ferm, tenantId: null, resolve: null, on: ON });
    const factsK = (await loadRegistry(knots.factsDir, knots.productId)).records, factsF = (await loadRegistry(ferm.factsDir, ferm.productId)).records;
    const k = draftAssessments({ subject: "s-knots", declaration: dk, facts: factsK, on: ON, draftedBy: "actor:cc", drafts: [{ subject: "s-knots", check: { body: "knot-body", scope: { knot: "bowline" } }, kind: "ACCEPTANCE", outcome: "ACCEPTED", evidence: { factId: "k1", excerpt: "accepts the declared test" } }] });
    const f = draftAssessments({ subject: "s-ferm", declaration: df, facts: factsF, on: ON, draftedBy: "actor:cc", drafts: [{ subject: "s-ferm", check: { body: "ferment-body", scope: { ferment: "miso" } }, kind: "EXPLICIT_REQUIREMENT", outcome: "REQUIRED", evidence: { factId: "m1", excerpt: "requires the declared test" } }, { subject: "s-ferm", check: { body: "knot-body", scope: { knot: "bowline" } }, kind: "ACCEPTANCE", outcome: "ACCEPTED", evidence: { factId: "k1", excerpt: "accepts the declared test" } }] });
    assert.deepEqual(k.assessments.map((a) => a.outcome), ["ACCEPTED"]);
    assert.deepEqual([f.assessments.map((a) => a.outcome), f.refused.map((x) => x.code)], [["REQUIRED"], [REFUSAL.CHECK_UNKNOWN]], "a draft crossed from one product to another");
  } finally { rmSync(TMP, { recursive: true, force: true }); }
});

test("W10 · EVIDENCE STATES: a PROPOSED assessment is INFERRED from its record; a silent one is UNKNOWN; a confirmation is INFERRED; a record missing its id is UNMAPPED", () => {
  const [acc, sil] = admitted([ACC, draft("body-a", { knot: "sheet-bend" }, "SILENT_OR_AMBIGUOUS", "UNKNOWN", "a3", "says nothing about the test", { missingFact: "x" })]);
  const conf = confirmAssessment({ assessment: acc, checker: PERSON, persons: [PERSON], facts: FACTS, on: ON }).record;
  assert.deepEqual([evidenceStateOf(acc).state, evidenceStateOf(sil).state, evidenceStateOf(conf).state], ["INFERRED", "UNKNOWN", "INFERRED"]);
  assert.equal(evidenceStateOf({ ...acc, assessment_id: "" }).unmapped, true);
  assert.equal(evidenceStateOf({ ...conf, assessment_id: undefined }).unmapped, true);
});

test("W11 · the writer's code names no product and reaches no network — and each control fires", () => {
  const F = ["src/research/applicability-assessment.mjs"];
  const read = (f) => readFileSync(join(REPO, f), "utf8");
  assert.deepEqual(scanSource(read(F[0])).code, []);
  assert.ok(scanSource(`${read(F[0])}\nexport const X = "${PRODUCT_WORDS[0]}";\n`).code.length > 0);
  assert.deepEqual(decisionCallPaths({ entries: F }).faults, []);
  assert.deepEqual(decisionCallPaths({ entries: F, read: (f) => (f === F[0] ? `${read(f)}\nawait fetch(u);\n` : read(f)) }).faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

/* ================= REAL: the demonstration product's stored records ================= */

/* CC's readings of the stored evidence (RR-150 §2, _handoffs bf3cc5c): the five checks whose stored text states the test's position. Each
 * excerpt is verbatim stored text; each is a DRAFT for a declared person to confirm — never a verdict. Every other check is drafted SILENT. */
const READINGS = [
  ["ie-nmbi", { profession: "nursing" }, "ie-nmbi.oet-version-required.profession=nursing", "it accepts OET (Nursing)"],
  ["nz-immigration-nz", {}, "nz-immigration-nz.oet-must-be-taken-in-person", "requires every part of the OET to have been sat in person"],
  ["uk-hcpc", { profession: "speech-pathology" }, "uk-hcpc.oet-minimum-score.profession=speech-pathology", "must reach a total OET score of 1800"],
  ["uk-hcpc", {}, "uk-hcpc.accepted-english-tests", "The HCPC accepts certificates from three providers"],
  ["uk-nmc", { profession: "nursing" }, "uk-nmc.accepted-oet-delivery-modes.profession=nursing", "We accept the OET on Paper, OET on Computer, and OET@Home test"],
];
const SILENT_MISSING = "the body's own current statement of whether the test is required, accepted or not required for this scope — the stored evidence for this check is about something else";
const realDrafts = (subject, declaration, facts) => declaration.checks.map((c) => {
  const r = READINGS.find(([b, s]) => b === c.body && JSON.stringify(s) === JSON.stringify(c.scope));
  if (r) return { subject, check: { body: c.body, scope: c.scope }, kind: "ACCEPTANCE", outcome: "ACCEPTED", evidence: { factId: r[2], excerpt: r[3] } };
  const f = facts.find((x) => x.id === c.provenance[0].factId);
  const text = [f?.evidence?.quotedSpan, f?.evidence?.ownWords].find((t) => typeof t === "string" && t.trim());
  return { subject, check: { body: c.body, scope: c.scope }, kind: "SILENT_OR_AMBIGUOUS", outcome: "UNKNOWN", evidence: { factId: f.id, excerpt: text.slice(0, 40) }, missingFact: SILENT_MISSING };
});

test("REAL3 · the demonstration product's STORED records, on the stated date: drafted, read back, split — count-only; nothing confirmed, nothing written", async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const facts = (await loadRegistry(product.factsDir, product.productId)).records;
  const declaration = await readDerivedDeclaration({ product, tenantId: null, resolve: null, on: ON });
  const r = draftAssessments({ subject: "almi-oet", declaration, facts, drafts: realDrafts("almi-oet", declaration, facts), on: ON, draftedBy: "actor:cc" });
  const rb = readback({ declaration, records: r.assessments, persons: NO_DECLARED_PERSON_CHECKERS });
  const byId = new Map(facts.map((f) => [f.id, f]));
  const silentRows = rb.rows.filter((x) => x.state === "UNKNOWN");
  const disputed = silentRows.filter((x) => declaration.checks.find((c) => c.body === x.check.body && JSON.stringify(c.scope) === JSON.stringify(x.check.scope)).provenance.every((p) => byId.get(p.factId)?.verification?.verdict === "CONFLICT"));
  const split = { needHumanConfirmation: rb.counts.PROPOSED, needFreshSourceReading: silentRows.length - disputed.length, blockedRecordDisputed: disputed.length, confirmed: rb.counts.CONFIRMED };
  console.log(`  REAL3 (${ON}, almi-oet, count-only; declared persons ${NO_DECLARED_PERSON_CHECKERS.length}): ${JSON.stringify({ drafts: r.assessments.length + r.refused.length, admitted: r.assessments.length, refused: r.refused.map((x) => x.code), byOutcome: r.assessments.reduce((m, a) => ((m[a.outcome] = (m[a.outcome] ?? 0) + 1), m), {}), readback: rb.counts, split, guidance: confirmedGuidance(rb).length })}`);
  /* pins — re-measured, never assumed */
  assert.deepEqual([r.assessments.length, r.refused.length], [24, 0], "a real draft was refused, or the population moved");
  assert.deepEqual({ ...rb.counts }, { checks: 24, CONFIRMED: 0, PROPOSED: 5, UNKNOWN: 19 });
  assert.equal(split.needHumanConfirmation + split.needFreshSourceReading + split.blockedRecordDisputed + split.confirmed, 24);
  assert.equal(confirmedGuidance(rb).length, 0, "an unconfirmed real assessment became guidance");
});

/* ================= the governed entry point, in a declared world ================= */

function declareBatchForSubject(W, subject, batch) {
  const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  reg.subjects.find((s) => s.subjectId === subject).members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: batch });
  writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2));
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  att.attachments.push({ ...att.attachments[0], resourceKind: "RESEARCH_BATCH", resourceRef: batch, tenantId: FIXTURE_TENANT });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  mkdirSync(join(W.root, "research", batch), { recursive: true });
}
function input(W, name, content) {
  mkdirSync(TMP, { recursive: true });
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(content));
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  att.attachments.push({ ...att.attachments[0], resourceKind: "INPUT_PATH", resourceRef: inputPathRef(p), tenantId: FIXTURE_TENANT });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  return p;
}

test("ENTRY3 · bin/applicability-assess.mjs in a declared world: no --confirm writes nothing; --confirm keeps the PROPOSED assessments once; a re-run is a duplicate; a confirmation with no declared person is refused; another subject's run is refused; counts only", async () => {
  const BATCH = "fixture-applicability-review";
  const W = declaredWorld();
  try {
    declareBatchForSubject(W, "almi-oet", BATCH);
    const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
    const facts = (await loadRegistry(product.factsDir, product.productId)).records;
    const declaration = await readDerivedDeclaration({ product, tenantId: null, resolve: null, on: ON });
    const drafts = input(W, "drafts.json", realDrafts("almi-oet", declaration, facts));
    const go = (args) => spawnSync(process.execPath, W.argv(["bin/applicability-assess.mjs", "--subject=almi-oet", "--product=almi-oet", `--research-batch=${BATCH}`, `--on=${ON}`, ...args]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    const dry = go([`--drafts=${drafts}`]);
    assert.equal(dry.status, 0, dry.stdout + dry.stderr);
    assert.match(dry.stdout, /NOT WRITTEN — no --confirm: 0 of 24 record\(s\) kept/);
    const store = join(W.root, "research", BATCH, "applicability.jsonl");
    assert.ok(!existsSync(store), "a run without --confirm wrote");
    const first = go([`--drafts=${drafts}`, "--confirm"]);
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.match(first.stdout, /drafts {11}24 read · 24 PROPOSED assessment\(s\) admitted · refused 0/);
    assert.match(first.stdout, /readback {9}24 derived check\(s\): CONFIRMED 0 · PROPOSED 5 · UNKNOWN 19/);
    const kept = readFileSync(store, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    assert.equal(kept.filter((x) => x.record_type === ASSESSMENT_RECORD).length, 24);
    const second = go([`--drafts=${drafts}`, "--confirm"]);
    assert.match(second.stdout, /24 read · 0 PROPOSED assessment\(s\) admitted · refused 24 \(DUPLICATE 24\)/);
    const accepted = kept.find((x) => x.outcome === "ACCEPTED");
    const conf = input(W, "conf.json", [{ assessmentId: accepted.assessment_id, checker: "human:beta-g (Cowork)" }]);
    const c = go([`--confirmations=${conf}`, "--confirm"]);
    assert.match(c.stdout, /confirmations {4}1 read · 0 accepted · refused 1 \(MISSING_CHECKER 1\) · checkers declared a person: 0/);
    assert.match(c.stdout, /guidance for F16 0 CONFIRMED/);
    /* TENANT CROSSOVER at the entry point: another subject, with a batch of ITS OWN (so the scope gate admits the run and the product
     * membership rule is what must refuse it) — refused by name, and nothing written into its batch */
    /* the other subject is found in the declared registry, never named here (F09: a generic test names no subject) */
    const OTHER = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8")).subjects.map((s) => s.subjectId).find((id) => id !== "almi-oet");
    assert.ok(OTHER, "the declared world holds no second subject — the crossover case would be vacuous");
    declareBatchForSubject(W, OTHER, "fixture-other-review");
    const other = spawnSync(process.execPath, W.argv(["bin/applicability-assess.mjs", `--subject=${OTHER}`, "--product=almi-oet", "--research-batch=fixture-other-review", `--on=${ON}`, `--drafts=${drafts}`, "--confirm"]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    assert.equal(other.status, 3, other.stdout + other.stderr);
    assert.match(other.stderr, /PRODUCT_IS_NOT_THIS_SUBJECTS/);
    assert.ok(!existsSync(join(W.root, "research", "fixture-other-review", "applicability.jsonl")), "another subject's batch received this product's assessments");
    const words = new Set([...facts.map((f) => f.claim?.subject), ...facts.flatMap((f) => qualifierPairs(f).map(([, v]) => v)), ...READINGS.map((r) => r[3])].filter((v) => typeof v === "string" && v.length > 3));
    for (const out of [dry.stdout, first.stdout, c.stdout]) for (const v of words) assert.ok(!out.includes(v), "the entry point printed a body, a value or an excerpt");
  } finally { W.cleanup(); rmSync(TMP, { recursive: true, force: true }); }
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
