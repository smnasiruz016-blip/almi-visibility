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
import { buildBrief, previewForOwner, publicationDecision, PREVIEW } from "../src/page/content-brief.mjs";
import { groupedNeedEvidence } from "../src/page/content-brief-evidence.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { execFileSync } from "node:child_process";

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

/* ================= F41 · ACCEPTANCE AMENDMENT 1 — C1 as amended (D5) and C8 ================= */

const NOW41 = new Date("2026-10-05T00:00:00Z");
const groupedDecision = () => decideAll(planning(), { tenantId: T, coverageState: "COMPLETE", pages: [] }).groupedNeeds[0];
const groupedBrief = (rows = planning()) => {
  const d = decideAll(rows, { tenantId: T, coverageState: "COMPLETE", pages: [] }).groupedNeeds[0];
  return buildBrief({ decision: d, evidence: groupedNeedEvidence(rows, d.subject.needId), now: NOW41 });
};

test("T41a · F41 C8 THE CONTROL PAIR (tier and GENERATED): every brief question shows its tier and marking — GENERATED for a route-1 wording, none for observed or route-2; a question item without its tier is excluded and named, never shown untiered or as observed", () => {
  const b = groupedBrief();
  const qs = new Map(b.sections.questions.content.map((q) => [q.questionId, q]));
  assert.deepEqual([qs.get(Q1.question_id).tier, qs.get(Q1.question_id).marking, qs.get(Q1.question_id).observed], ["RESEARCH-DERIVED", "GENERATED", false]);
  assert.deepEqual([qs.get(Q2.question_id).tier, qs.get(Q2.question_id).marking, qs.get(Q2.question_id).observed], ["OBSERVED", null, true]);
  assert.deepEqual([qs.get(Q4.question_id).tier, qs.get(Q4.question_id).marking], ["RESEARCH-DERIVED", null]);
  const untiered = buildBrief({ decision: groupedDecision(), evidence: { questions: { items: [{ questionId: "x", wording: "a question with no tier?" }], ref: "q:x" } }, now: NOW41 });
  assert.equal(untiered.sections.questions.state, "MISSING", "an untiered question reached the brief");
  assert.deepEqual(untiered.excludedQuestions.map((e) => [e.question, e.why]), [["x", "NO_TIER"]]);
});

test("T41b · F41 C8 A GROUPED NEED'S BRIEF NAMES THE GROUPED NEED AS ITS INTENT — never a registered value; a brief whose evidence names another need leaves intent MISSING", () => {
  const b = groupedBrief();
  assert.equal(b.subject.kind, "GROUPED_NEED");
  assert.equal(b.sections.intent.state, "FILLED");
  assert.equal(b.sections.intent.rule, "THE_GROUPED_NEED_F91_FORMED");
  assert.equal(b.sections.intent.content.groupedNeed, NEED_ID());
  const d = groupedDecision();
  const wrong = buildBrief({ decision: d, evidence: { ...groupedNeedEvidence(planning(), d.subject.needId), need: { groupedNeed: "need:another", ref: "x" } }, now: NOW41 });
  assert.equal(wrong.sections.intent.state, "MISSING", "a grouped need's brief named another intent");
});

test("T41c · F41 C8 (C3 narrowed): a SUPPORTED answer claim — SECONDARY included — enters the brief with its label, source and freshness; an UNKNOWN part is carried as UNKNOWN, never a fact; a stale claim is excluded and named, never one for its label", () => {
  const b = groupedBrief();
  assert.equal(b.sections.verifiedFactsAndSources.state, "FILLED", "the supported claim did not enter the brief");
  const placed = b.sections.verifiedFactsAndSources.content;
  assert.deepEqual(placed.map((c) => [c.claimId, c.label, c.source.name]), [["c-supported", "SECONDARY", "a related fixture source"]]);
  assert.deepEqual(b.unknownParts.map((u) => [u.claimId, u.state]), [["c-unknown", "UNKNOWN"]]);
  assert.ok(!placed.some((c) => c.claimId === "c-unknown"), "an UNKNOWN part was placed as a fact");
  const later = buildBrief({ decision: groupedDecision(), evidence: groupedNeedEvidence(planning(), NEED_ID()), now: new Date("2026-12-31T00:00:00Z") });
  assert.equal(later.sections.verifiedFactsAndSources.state, "MISSING");
  assert.deepEqual(later.excludedFacts.map((x) => [x.claimId, x.why]), [["c-supported", "FRESHNESS_STALE"]]);
});

test("T41d · F41 C1 AS AMENDED · D5: A BRIEF PREPARED WITH NO PER-ITEM APPROVAL is issued and labelled a recommendation — never an approval, never counted as one", () => {
  const b = groupedBrief();
  assert.notEqual(b.state, "NOT_ISSUED", "a routine brief was refused or held for want of a per-item approval");
  assert.match(b.standing, /RECOMMENDATION/);
  assert.match(b.standing, /never an approval/);
  assert.ok(!Object.keys(b).some((k) => /approv/i.test(k)), "a brief is labelled or counted as an approval");
  assert.deepEqual([...b.recommended], ["CREATE"]);
});

const PASSING = { verdict: "ACCEPTED", html: "<article>a fixture page that passed every frozen gate</article>" };
const READY = { subject: { kind: "GROUPED_NEED", id: "need:r" }, state: "READY" };

test("T41e · F41 C1 AS AMENDED · D5: A PREVIEW THAT DOES NOT PASS IS NEVER PUT FORWARD for the owner's approval — a refused construction or a brief not READY; a complete passing preview is", () => {
  for (const [label, construction, brief] of [["refused construction", { verdict: "REFUSED", html: "<article>a page construction refused</article>" }, READY], ["INCOMPLETE brief", PASSING, { ...READY, state: "INCOMPLETE" }], ["nothing", null, null]]) {
    const p = previewForOwner({ construction, brief });
    assert.equal(p.state, PREVIEW.NOT_PUT_FORWARD, `${label}: put forward`);
    assert.ok(p.missing.length > 0);
  }
  const ok = previewForOwner({ construction: PASSING, brief: READY });
  assert.equal(ok.state, PREVIEW.PUT_FORWARD);
  assert.match(ok.standing, /not an approval, not published/);
});

test("T41f · F41 C1 AS AMENDED · D5: A PUBLICATION ATTEMPT WITH NO RECORDED EXACT APPROVAL IS REFUSED — none assumed; an approval of other content, or not exact, is none; only the owner's exact recorded approval of this preview passes, and F41 still publishes nothing", () => {
  const preview = previewForOwner({ construction: PASSING, brief: READY });
  assert.throws(() => publicationDecision({ preview }), /passed explicitly/, "an approval was assumed");
  assert.equal(publicationDecision({ preview, approvals: [] }).outcome, "REFUSED");
  const exact = { kind: "PUBLICATION", exact: true, subject: preview.subject, contentSha256: preview.contentSha256, ref: "owner-approval:fixture" };
  for (const bad of [{ ...exact, contentSha256: "0".repeat(64) }, { ...exact, exact: false }, { ...exact, ref: "" }, { ...exact, subject: { kind: "GROUPED_NEED", id: "need:other" } }]) {
    assert.equal(publicationDecision({ preview, approvals: [bad] }).outcome, "REFUSED", `a non-exact approval passed: ${JSON.stringify(bad)}`);
  }
  assert.equal(publicationDecision({ preview: previewForOwner({ construction: { verdict: "REFUSED", html: null }, brief: READY }), approvals: [exact] }).outcome, "REFUSED", "a preview that did not pass was approved for publication");
  const yes = publicationDecision({ preview, approvals: [exact] });
  assert.deepEqual([yes.outcome, yes.published], ["APPROVED_BY_THE_OWNER", false]);
  /* no publication path exists: nothing in src/ or bin/ deploys, publishes or writes to a client site */
  const files = execFileSync("git", ["-C", REPO, "ls-files", "src/*.mjs", "bin/*.mjs"], { encoding: "utf8" }).split("\n").filter(Boolean);
  const publishers = files.filter((f) => /\b(vercel deploy|git push|publishPage|deployPage|ftp\.|uploadToSite)\b/.test(readFileSync(join(REPO, f), "utf8")));
  assert.deepEqual(publishers, [], "a publication path exists");
});

/* ================= RR-177 · nothing in R4 depends on the 27 pages ================= */

const REAL_READS = /readExistingPagePopulation|createTenantResolver|almi-visibility-data|first-real-crawl|subject\("almi-oet"\)|readClientActionEvidence\(|readClientBriefs\(/;
test("T27 · RR-177: NO R4 PROOF READS THE REAL PARTITIONS — this file and its helper use fixture pages only, and the census fires on a planted real read", () => {
  const own = [new URL(import.meta.url), new URL("./helpers/f35-chosen.mjs", import.meta.url)].map((u) => readFileSync(u, "utf8").replace(/const REAL_READS = [^\n]*\n/, ""));
  for (const src of own) assert.doesNotMatch(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/"[^"\n]*"/g, (s) => (/^"\.\.?\//.test(s) ? s : '""')), REAL_READS, "an R4 proof reads a real partition");
  assert.match("const p = readExistingPagePopulation({ scope });", REAL_READS, "the census cannot see a planted real read");
});

/* ================= RE-PROOFS · every unpinned EVIDENCE line (ruling RR-174 (e)'s method) ================= */

const F41T = readFileSync(join(REPO, "test/f41-content-brief.test.mjs"), "utf8");
const F36T = readFileSync(join(REPO, "test/f36-right-to-exist.test.mjs"), "utf8");
const PCT = readFileSync(join(REPO, "test/page-construction.test.mjs"), "utf8");
const MINE = readFileSync(new URL(import.meta.url), "utf8");
const SAB = existsSync(join(REPO, "test/helpers/rr179-sabotage.mjs")) ? readFileSync(join(REPO, "test/helpers/rr179-sabotage.mjs"), "utf8") : "";
const named = (src, prefix) => new RegExp(`test\\("${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(src);

test("R41 · F41's 8 unpinned evidence items are each proved by a named test — per clause a production-path test, a firing control and a sabotage; hand-written fixtures; C1 and C4's own firing controls; the real structures; CI; the board route", () => {
  const map = {
    E1_production_path: [[F41T, "C7 · THE ENTRY POINT"], [MINE, "T41a ·"], [MINE, "T41b ·"]],
    E2_firing_control: [[F41T, "C4 · FIRING CONTROL"], [MINE, "T41e ·"], [MINE, "T41f ·"]],
    E4_hand_written_fixtures: [[F41T, "C2 ·"], [F41T, "C3 ·"], [MINE, "T41c ·"]],
    E5_c1_and_c4_firing_controls: [[F41T, "C1 AS AMENDED ·"], [F41T, "C4 · FIRING CONTROL"], [MINE, "T41d ·"]],
    E6_real_structures_as_they_are: [[F41T, "REAL ·"]],
    E7_full_suite_in_ci: [[MINE, "R4-CI ·"]],
    E8_board_route: [[MINE, "R4-BOARD ·"]],
  };
  for (const [item, tests] of Object.entries(map)) for (const [src, p] of tests) assert.ok(named(src, p), `${item}: no test named "${p}"`);
  for (const c of ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C1 AS AMENDED", "C8"]) assert.match(SAB, new RegExp(`"F41 ${c} · `), `E3: no sabotage for F41 ${c}`);
});

test("R36 · F36's unpinned evidence items are each proved by a named test — per clause a production-path test, a firing control and a sabotage; hand-written fixtures; the real declared candidates; CI; the board route", () => {
  const map = {
    E1_production_path: [[F36T, "C1 · the tools' GATE"], [PCT, "R4c ·"]],
    E2_firing_control: [[F36T, "C1/C2 ·"], [F36T, "C2 · S38"], [F36T, "C2/C4 ·"]],
    E4_hand_written_fixtures: [[F36T, "C3 ·"], [MINE, "T35c ·"]],
    E5_real_declared_candidates: [[PCT, "🟢 GREEN"]],
    E6_full_suite_in_ci: [[MINE, "R4-CI ·"]],
    E7_board_route: [[MINE, "R4-BOARD ·"]],
  };
  for (const [item, tests] of Object.entries(map)) for (const [src, p] of tests) assert.ok(named(src, p), `${item}: no test named "${p}"`);
  for (const c of ["C1", "C2", "C3", "C4", "C5", "C6"]) assert.match(SAB, new RegExp(`"F36 ${c} · `), `E3: no sabotage for F36 ${c}`);
});

test("R35b · F35's I-3 change is proved on fixture pages — the compiled spec decided (T35a–T35c) — beside R3's recorded real-structure proof, which stands (RR-177: proofs already recorded are not undone)", () => {
  for (const p of ["T35a ·", "T35b ·", "T35c ·", "T19b ·"]) assert.ok(named(MINE, p), `no test named "${p}"`);
  for (const c of ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9"]) assert.match(SAB, new RegExp(`"F35 ${c} · `), `E3: no sabotage for F35 ${c}`);
});

test("R4-CALLS · the compiler, F35's reader, construction and the brief load no module that can make a network, process, connector or paid call — and the enumeration fires when one is planted", () => {
  const entries = ["src/page/spec-compiler.mjs", "src/page/action-evidence.mjs", "src/page/construct.mjs", "src/page/content-brief.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("R4-CI · the full suite runs as CI runs it: the tracked workflow runs node --test over every test on each pull request and on main", () => {
  const wf = execFileSync("git", ["-C", REPO, "ls-files", ".github/workflows"], { encoding: "utf8" }).split("\n").filter(Boolean).map((f) => readFileSync(join(REPO, f), "utf8")).join("\n");
  assert.match(wf, /pull_request/);
  assert.match(wf, /\bmain\b/);
  assert.match(JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")).scripts?.test ?? "", /node --test|test\//);
});

test("R4-BOARD · F41, F36 and F35 move only through the production validator and the audit trail: each R4 REOPENED is on the board and in the trail; a VERIFIED-PASS row carries a REAL VERIFIED event after it, every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const [f, n] of [["F41", 8], ["F36", 6], ["F35", 9]]) {
    const row = DECLARED[f];
    /* RR-188: a row may be reopened again later by its OWN amendment (F41 Amendment 2); R4's REOPENED stays on the board, and a VERIFIED-PASS
     * row carries its REAL VERIFIED after its LATEST reopen, every clause of the acceptance then in force PROVED */
    const reopened = row.events.find((e) => e.kind === "REOPENED" && /RR-179/.test(JSON.stringify(e.command ?? e.ownerRulings ?? "")));
    assert.ok(reopened, `${f}'s R4 REOPENED is not on the board`);
    assert.equal(reopened?.reason, "AUTHORITATIVE_REQUIREMENT_CHANGE");
    const latest = row.events.filter((e) => e.kind === "REOPENED").at(-1);
    assert.equal(latest.reason, "AUTHORITATIVE_REQUIREMENT_CHANGE", `${f}'s latest REOPENED is not for an authoritative requirement change`);
    assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.action === "REOPENED" && e.metadata?.featureId === f && e.occurredAt.startsWith("2026-10-05")), `${f}'s REOPENED is not in the trail`);
    if (row.state === "VERIFIED-PASS") {
      const v = row.events.filter((e) => e.kind === "VERIFIED").at(-1);
      assert.ok(row.events.indexOf(v) > row.events.indexOf(latest) && v.population === "REAL");
      assert.ok(Object.keys(v.clauses ?? {}).length >= n && Object.values(v.clauses).every((c) => c === "PROVED"), `${f} is VERIFIED-PASS with a clause not PROVED`);
    } else assert.equal(row.state, "IN-PROGRESS");
  }
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
