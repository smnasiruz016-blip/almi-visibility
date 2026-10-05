/**
 * 🔴 RR-179 · R4 — F91 ACCEPTANCE AMENDMENT 4 (C19, the spec compiler; _handoffs 0abcd15), F41 ACCEPTANCE AMENDMENT 1 (C1 as amended, C8;
 * _handoffs be0ec9d), F36 (S38 and the owner's record B, _handoffs d014ca1), F35 (I-3), construction acting only on F35's decision (ruling
 * RR-179 (c)), FS-A1 (RTP-1 S39, D2), with the owner's RR-179 rulings (_handoffs a8dc190). The complete-draft render is F37's and is NOT built
 * (ruling (d)).
 *
 * 🔴 FIXTURE PAGES ONLY (the owner's ruling RR-177, _handoffs cb36cf6): no test here reads the data repository's real partitions — the
 * 27-pages census below fails if one does. One test per EVIDENCE item; each FAILURE condition has its sabotage in
 * test/helpers/rr179-sabotage.mjs, naming the test it turns red. Wording stays in memory; nothing writes to the production trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { compileNeedSpec, compiledSlug, purposeOf, existingPageDecisionFromCoverage, specBytes, PURPOSE, SPEC_KIND, GENERATED, COMPILE_REFUSAL } from "../src/page/spec-compiler.mjs";
import { decideGroupedNeeds } from "../src/page/action-evidence.mjs";
import { decideGroupedNeed, duplicationFor, isChosenCreate, NO_DECLARED_SPEC_HOLD, HOLD, OUTCOMES, DECISION as D } from "../src/page/action-decision.mjs";
import { connectQuestions, coverageRecords, CONNECTION } from "../src/page/demand-connection.mjs";
import { coverageJudgementRecords } from "../src/page/grouped-need-coverage.mjs";
import { possibleCombinations } from "../src/page/page-opportunities.mjs";
import { researchDerivedQuestion, assessmentRecord, ROUTES } from "../src/research/research-derived.mjs";
import { rightToExist } from "../src/page/right-to-exist.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const ON = "2026-10-05";
const AT = `${ON}T00:00:00Z`;
const T = "tenant:rr179-fixture";
const S = "rr179-fixture-subject";
const acts = (d) => (d.actions ?? []).map((a) => a.action);

/* ---- fixture planning rows, built by F91's and F16's OWN functions (in memory) ---- */
const POSSIBLE = possibleCombinations({ dimensions: [{ key: "axis", values: ["one", "two"], source: "the fixture descriptor", applicability: "APPLIES" }] });
const PRODUCT = Object.freeze({ productId: S, axis: { key: "axis" }, variants: ["one", "two"], pageSpecs: {} });
const relevant = (q) => assessmentRecord({ question: q, draft: { verdict: "RELEVANT", declarationVersion: "fixture-v1", meaningTest: "within the declared field", reason: "about the declared product", source: { kind: "METHOD", ref: "fixture-method" } }, at: AT }).record;
const rd = (queryId, wording, route = ROUTES.CLIENT_AI) => researchDerivedQuestion({ subject: S, queryId, route, wording, providerId: route === ROUTES.CLIENT_AI ? "fixture-provider" : null, at: AT });
const observed = (id, wording) => ({ record_type: "public_question", question_id: id, measurement_key: `public_question:${id}`, recorded_at: "2026-10-01T09:00:00Z",
  value: { subject: S, kind: "OBSERVED", original: wording, sourceId: "fixture", provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } } });
const SUPPORTED = { claimId: "c-supported", states: "OTHER", source: { kind: "RELATED", name: "a related fixture source", link: "https://related.fixture.invalid/a", readOn: "2026-10-02" }, supports: { finding: "SUPPORTS", ref: "finding:c1" } };
const UNSUPPORTED = { claimId: "c-unknown", central: false, states: "OTHER", source: { kind: "RELATED", name: "another fixture source", link: "https://other.fixture.invalid/b", readOn: "2026-10-02" } };
const ANSWER = { claims: [SUPPORTED, UNSUPPORTED] };
const Q1 = rd("formed-1", "How long does a fixture licence renewal take?");
const Q2 = observed("obs-2", "How long is the renewal of a fixture licence?");
const Q3 = rd("formed-3", "What do people often ask about fixture licence fees?");
const Q4 = rd("formed-4", "Which documents does a fixture licence renewal need?", ROUTES.CLIENT_RESEARCH);
const ASSESSMENTS = [Q1, Q3, Q4].map(relevant);
/* one need: Q1 (route 1, GENERATED), Q2 (observed) joined by a recorded sameness judgement, Q3 (an attributing GENERATED wording), Q4 (route 2) */
function planning({ population = { tenantId: T, coverageState: "COMPLETE", pages: [] }, judgements = [], answer = ANSWER } = {}) {
  const sameAs = (questionId) => ({ questionId: Q1.question_id, judgementRef: `same:${questionId}`, reason: "the same meaning and need" });
  const conn = connectQuestions({ subject: S, possible: POSSIBLE, records: [Q1, Q2, Q3, Q4], assessments: ASSESSMENTS, on: ON, drafts: [
    { questionId: Q1.question_id, combination: { axis: "one" }, answer },
    { questionId: Q2.question_id, combination: { axis: "one" }, sameAs: sameAs(Q2.question_id) },
    { questionId: Q3.question_id, combination: { axis: "one" }, sameAs: sameAs(Q3.question_id) },
    { questionId: Q4.question_id, combination: { axis: "one" }, sameAs: sameAs(Q4.question_id) },
  ] });
  assert.deepEqual(conn.refused, [], "a fixture question was refused by F91's own writer");
  const cov = coverageRecords({ subject: S, rows: conn.records, tenantId: T, population, judgements, on: ON });
  return [...conn.records, ...cov];
}
const NEED_ID = () => planning().find((r) => r.record_type === CONNECTION).needId;
/* fixture pages (never the 27 set aside): two pages, each judged by a recorded per-question coverage judgement */
const PAGES = [{ pageId: "fixture-page-a", tenantId: T, html: "<h1>A fixture guide</h1><h2>Fixture opening hours</h2>" }, { pageId: "fixture-page-b", tenantId: T, html: "<h1>Another fixture page</h1><h2>Fixture contact</h2>" }];
const judged = (verdict, pages = PAGES) => coverageJudgementRecords([Q1, Q2, Q3, Q4].flatMap((q) => pages.map((p) => ({ questionId: q.question_id, pageId: p.pageId, verdict, reason: "the page's sections compared with the question", source: { kind: "METHOD", ref: "fixture-coverage-method" } }))), { on: ON }).records;
const WITH_PAGES = { tenantId: T, coverageState: "COMPLETE", pages: PAGES };
const distinctReviews = (needId, against) => against.map((a) => ({ needId, against: a, verdict: "DISTINCT", needsGuidance: false, ref: `review:${a}` }));
const decideAll = (rows, population, extra = {}) => decideGroupedNeeds({ tenantId: T, product: PRODUCT, population, planningRows: rows, ...extra });

/* ================= F91 C19 · A GROUPED NEED BECOMES A DRAFTABLE SPEC ================= */

test("T19a · C19 A COMPILED-SPEC FIXTURE: one Q&A section per grouped question, its heading the question's own wording, its tier and GENERATED marking carried; claims = the supported answer's claim ids; the unsupported part declared UNKNOWN; subject = the group id", () => {
  const { groupedNeeds, compiled } = decideAll(planning(), { tenantId: T, coverageState: "COMPLETE", pages: [] });
  assert.equal(groupedNeeds.length, 1);
  assert.equal(compiled.forConstruction.length, 1, "the chosen need was not handed on");
  const spec = compiled.forConstruction[0].spec;
  assert.equal(spec.kind, SPEC_KIND.PAGE);
  assert.equal(spec.subject, NEED_ID());
  const byQ = new Map(spec.sections.map((s) => [s.questionId, s]));
  /* hand-written: Q1 route 1 → GENERATED; Q2 observed → no marking; Q4 route 2 → research-derived, not GENERATED; Q3 attributes itself (T19d) */
  assert.deepEqual([...byQ.keys()].sort(), [Q1.question_id, Q2.question_id, Q4.question_id].sort());
  assert.deepEqual([byQ.get(Q1.question_id).heading, byQ.get(Q1.question_id).tier, byQ.get(Q1.question_id).marking], ["How long does a fixture licence renewal take?", "RESEARCH-DERIVED", GENERATED]);
  assert.deepEqual([byQ.get(Q2.question_id).heading, byQ.get(Q2.question_id).tier, byQ.get(Q2.question_id).marking], ["How long is the renewal of a fixture licence?", "OBSERVED", null]);
  assert.deepEqual([byQ.get(Q4.question_id).tier, byQ.get(Q4.question_id).marking], ["RESEARCH-DERIVED", null]);
  for (const s of spec.sections) {
    assert.deepEqual([...s.claims], ["c-supported"], "a section's claims are not the supported claim ids");
    assert.deepEqual(s.unknown.map((u) => [u.claimId, u.state]), [["c-unknown", "UNKNOWN"]], "the unsupported part was dropped or written as fact");
  }
});

test("T19b · C19 ONLY A CHOSEN NEED, OR ONE HELD ONLY FOR WANT OF A DECLARED SPEC, IS COMPILED; a spec compiled for judgement never reaches construction", () => {
  const rows = planning();
  const needId = NEED_ID();
  const subject = { kind: "GROUPED_NEED", needId, pageCandidate: '[["axis","one"]]' };
  const hold = (missing) => Object.freeze({ subject, decision: D.CANNOT_DECIDE, class: HOLD, outcome: OUTCOMES.HOLD, actions: [], missing });
  /* HELD for want of a declared spec → compiled, for RIGHT-TO-EXIST judgement only */
  const forJudgement = compileNeedSpec({ decision: hold([NO_DECLARED_SPEC_HOLD]), rows });
  assert.equal(forJudgement.spec.purpose, PURPOSE.RIGHT_TO_EXIST);
  /* HELD for any other reason, or KEEP / CONNECT → never compiled */
  for (const d of [hold(["the central answer is unsupported (F35 C8b; F91 C18)"]), hold([NO_DECLARED_SPEC_HOLD, "another missing fact"]),
    { subject, decision: D.CHOSEN, actions: [{ action: "KEEP", evidence: [] }] }, { subject, decision: D.CHOSEN, actions: [{ action: "CONNECT", evidence: [] }] }]) {
    const c = compileNeedSpec({ decision: d, rows });
    assert.deepEqual([c.spec, c.refused], [null, COMPILE_REFUSAL.NOT_CHOSEN], `compiled for a need F35 did not choose: ${JSON.stringify(d.missing ?? acts(d))}`);
  }
  /* the end to end: with a fixture tenant whose pages hold no review, the need stays HOLD — its compiled spec is never handed on */
  const held = decideAll(planning({ population: WITH_PAGES, judgements: judged("DOES_NOT_COVER") }), WITH_PAGES);
  assert.equal(held.groupedNeeds[0].class, HOLD);
  assert.equal(held.compiled.forJudgement, 1);
  assert.deepEqual([held.compiled.forConstruction.length, held.compiled.sectionProposals.length], [0, 0], "a spec compiled for judgement reached construction");
});

test("T19c · C19 IMPROVE / ADD SECTION COMPILE TO A SECTION PROPOSAL for the existing page its coverage record names — only the missing questions; never a new page, a new draft of a new page or a new URL; the page unchanged until the owner approves", () => {
  /* PARTIAL: fixture-page-a covers Q1 and Q2 (recorded judgement); Q3 and Q4 are missing from it */
  const drafts = [Q1, Q2, Q3, Q4].flatMap((q) => PAGES.map((p) => ({ questionId: q.question_id, pageId: p.pageId, verdict: p.pageId === "fixture-page-a" && [Q1, Q2].includes(q) ? "COVERS" : "DOES_NOT_COVER", reason: "the page's sections compared with the question", source: { kind: "METHOD", ref: "fixture-coverage-method" } })));
  const rows = planning({ population: WITH_PAGES, judgements: coverageJudgementRecords(drafts, { on: ON }).records });
  const { groupedNeeds, compiled } = decideAll(rows, WITH_PAGES);
  assert.deepEqual(acts(groupedNeeds[0]), ["ADD SECTION"]);
  assert.equal(compiled.forConstruction.length, 0, "an ADD SECTION need was handed to construction as a page");
  assert.equal(compiled.sectionProposals.length, 1);
  const spec = compiled.sectionProposals[0].spec;
  assert.deepEqual([spec.kind, spec.purpose], [SPEC_KIND.SECTION_PROPOSAL, PURPOSE.SECTION_PROPOSAL]);
  assert.deepEqual([...spec.target.existingPages], ["fixture-page-a"]);
  assert.equal(spec.target.unchangedUntilOwnerApproves, true);
  /* only the missing questions — and Q3 attributes itself, so only Q4's section */
  assert.deepEqual(spec.sections.map((s) => s.questionId), [Q4.question_id]);
});

test("T19d · C19 THE ATTRIBUTION CHECK (F16 C29): a GENERATED wording that attributes itself to people is named, never rewritten, and no section is compiled under it", () => {
  const { compiled } = decideAll(planning(), { tenantId: T, coverageState: "COMPLETE", pages: [] });
  const spec = compiled.forConstruction[0].spec;
  assert.ok(!spec.sections.some((s) => s.questionId === Q3.question_id), "an attributing wording became a heading");
  const again = compileNeedSpec({ decision: compiled.forConstruction[0].decision, rows: planning() });
  assert.deepEqual(again.excluded.map((e) => [e.questionId, e.why]), [[Q3.question_id, "ATTRIBUTION_NEEDS_OBSERVED_EVIDENCE"]]);
  /* never rewritten: every heading is, byte for byte, a recorded wording */
  const wordings = new Set(planning().filter((r) => r.record_type === CONNECTION).map((r) => r.wording));
  for (const s of spec.sections) assert.ok(wordings.has(s.heading), "a heading is not a recorded wording");
  assert.ok(wordings.has(spec.title));
});

test("T19e · C19 PURE AND DETERMINISTIC: the same need compiled twice gives identical bytes; the compiler adds no fact (every claim id is in the need's records) and writes nothing", () => {
  const rows = planning();
  const d = decideAll(rows, { tenantId: T, coverageState: "COMPLETE", pages: [] }).compiled.forConstruction[0].decision;
  const a = compileNeedSpec({ decision: d, rows }), b = compileNeedSpec({ decision: d, rows });
  assert.equal(specBytes(a.spec), specBytes(b.spec));
  const recorded = new Set(rows.filter((r) => r.record_type === "planning_need").flatMap((r) => r.answer.claims.map((c) => c.claimId)));
  for (const id of [...a.spec.answer.claims, ...a.spec.sections.flatMap((s) => s.claims)]) assert.ok(recorded.has(id), `a claim with no supporting record: ${id}`);
  const src = readFileSync(join(REPO, "src/page/spec-compiler.mjs"), "utf8");
  assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, ""), /\b(writeFile|appendFile|mkdir|createWriteStream|governedFileWrite|executeGovernedWrite|fetch)\b|from "node:fs"/, "the compiler can write");
});

/* ================= F35 · I-3 — compiled specs reach a decision, on fixture pages ================= */

test("T35a · F35 I-3 A LONE NEED WITH NO DECLARED SPEC is compiled, judged by F36 on the compiled spec (no sibling: D1, record B; not served: its coverage record), and CREATED", () => {
  const { groupedNeeds, compiled } = decideAll(planning(), { tenantId: T, coverageState: "COMPLETE", pages: [] });
  const d = groupedNeeds[0];
  assert.deepEqual([d.decision, acts(d)], [D.CHOSEN, ["CREATE"]]);
  assert.ok(isChosenCreate(d));
  assert.equal(compiled.forConstruction[0].slug, compiledSlug(d.subject.needId));
  assert.equal(compiled.forConstruction[0].spec.purpose, PURPOSE.CONSTRUCTION);
});

test("T35b · F35 I-3 FIXTURE PAGES: a tenant with existing pages reaches a decision — NONE coverage with every comparison reviewed DISTINCT (no guidance) → CREATE; with no review → HOLD, the refusal named (ruling d)", () => {
  const rows = planning({ population: WITH_PAGES, judgements: judged("DOES_NOT_COVER") });
  const needId = rows.find((r) => r.record_type === CONNECTION).needId;
  const reviewed = decideAll(rows, WITH_PAGES, { duplicationReviews: distinctReviews(needId, PAGES.map((p) => p.pageId)) });
  assert.deepEqual([reviewed.groupedNeeds[0].decision, acts(reviewed.groupedNeeds[0])], [D.CHOSEN, ["CREATE"]]);
  assert.equal(reviewed.compiled.forConstruction.length, 1);
  const unreviewed = decideAll(rows, WITH_PAGES);
  assert.equal(unreviewed.groupedNeeds[0].class, HOLD);
  assert.match(unreviewed.groupedNeeds[0].missing.join(" "), /duplication verdict REFUSED/);
});

test("T35c · F35 I-3 THE COMPILED SPEC'S RIGHT-TO-EXIST READS THE NEED'S OWN COVERAGE RECORD — FULL / PARTIAL refuse, NONE lets it through, anything else undecided; F34's check is never asked about a group id", () => {
  const rec = (coverage) => ({ record_type: "planning_coverage", measurement_key: `planning_coverage:${coverage}`, needId: "need:x", coverage, pages: [{ pageId: "fixture-page-a" }], considered: 2, reason: "fixture" });
  assert.deepEqual(["NONE", "FULL", "PARTIAL", "CANNOT_DECIDE", "REFUSED"].map((c) => existingPageDecisionFromCoverage(rec(c)).mayProduce), [true, false, false, false, false]);
  assert.equal(existingPageDecisionFromCoverage(null).mayProduce, false);
  const spec = { whyThisUrlDeservesToExist: { humanNeed: "a renewing licence holder needs the renewal time", distinctValue: "the renewal time and documents answered in one place" } };
  const r = (c) => rightToExist({ slug: "compiled-x", spec, siblings: [], variants: [], existingPageDecision: existingPageDecisionFromCoverage(rec(c)) }).outcome;
  assert.deepEqual(["NONE", "FULL", "PARTIAL", "CANNOT_DECIDE"].map(r), ["ESTABLISHED", "REFUSED", "REFUSED", "CANNOT_DECIDE"]);
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
