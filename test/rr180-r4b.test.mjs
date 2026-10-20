/**
 * 🔴 RR-180 · R4b — F37 · BEST-ANSWER ARCHITECTURE, THE COMPLETE-DRAFT RENDER (Acceptance _handoffs 9516f2c; RTP-1 Rev 6 P6b, P13b–c, P14, P19,
 * P21, D3, D4), with the owner's RR-180 rulings (_handoffs 20150be): (a) bin/build-page.mjs acts only on F35's decision; (b) a passing preview
 * is proved on fixtures until F39's gain and competitor-comparison records exist.
 *
 * 🔴 FIXTURE STRUCTURES ONLY (RR-177): fixture tenants, fixture pages, planning rows built by F91's and F16's own functions. The census T37-27
 * fails if this file reads a real partition. One test per EVIDENCE item; each FAILURE condition has its sabotage in
 * test/helpers/rr180-sabotage.mjs, naming the test it turns red. Nothing here writes to the production trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { renderCompiledDraft, renderSectionProposal, claimsOf, CHECK, DRAFT, WRITER, PROMISE } from "../src/page/draft-render.mjs";
import { compileNeedSpec, PURPOSE } from "../src/page/spec-compiler.mjs";
import { decideGroupedNeeds } from "../src/page/action-evidence.mjs";
import { decideGroupedNeed, duplicationFor, isChosenCreate, DECISION as D } from "../src/page/action-decision.mjs";
import { connectQuestions, coverageRecords, CONNECTION } from "../src/page/demand-connection.mjs";
import { coverageJudgementRecords } from "../src/page/grouped-need-coverage.mjs";
import { possibleCombinations } from "../src/page/page-opportunities.mjs";
import { researchDerivedQuestion, assessmentRecord, ROUTES } from "../src/research/research-derived.mjs";
import { assessPage, STATE as MARKUP } from "../src/page/structured-data.mjs";
import { buildBrief, previewForOwner, PREVIEW } from "../src/page/content-brief.mjs";
import { judgeDraft, CRITERIA as F40_CRITERIA, POPULATION as F40_POPULATION } from "../src/page/quality-judgements.mjs";
import { groupedNeedEvidence } from "../src/page/content-brief-evidence.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const ON = "2026-10-05", AT = `${ON}T00:00:00Z`, NOW = new Date(`${ON}T12:00:00Z`);
const T = "tenant:rr180-fixture", S = "rr180-fixture-subject";

/* ---- fixture planning rows, by F91's and F16's own functions ---- */
const POSSIBLE = possibleCombinations({ dimensions: [{ key: "axis", values: ["one", "two"], source: "the fixture descriptor", applicability: "APPLIES" }] });
const PRODUCT = Object.freeze({ productId: S, axis: { key: "axis" }, variants: ["one", "two"], pageSpecs: {} });
const relevant = (q) => assessmentRecord({ question: q, draft: { verdict: "RELEVANT", declarationVersion: "fixture-v1", meaningTest: "within the declared field", reason: "about the declared product", source: { kind: "METHOD", ref: "fixture-method" } }, at: AT }).record;
const rd = (queryId, wording, route = ROUTES.CLIENT_AI) => researchDerivedQuestion({ subject: S, queryId, route, wording, providerId: route === ROUTES.CLIENT_AI ? "fixture-provider" : null, at: AT });
const observed = (id, wording) => ({ record_type: "public_question", question_id: id, measurement_key: `public_question:${id}`, recorded_at: "2026-10-01T09:00:00Z",
  value: { subject: S, kind: "OBSERVED", original: wording, sourceId: "fixture", provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } } });
const related = (name, path) => ({ kind: "RELATED", name, link: `https://related.fixture.invalid/${path}`, readOn: "2026-10-02" });
const CENTRAL = { claimId: "c-central", states: "OTHER", text: "A fixture licence renewal takes about four weeks.", source: related("a related fixture source", "a"), supports: { finding: "SUPPORTS", ref: "finding:central" } };
const BODY = { claimId: "c-body", central: false, states: "RESPONSIBLE_BODY_RULE", body: "Fixture Licensing Board", text: "The Fixture Licensing Board requires the renewal form.", source: { kind: "RESPONSIBLE_BODY", body: "Fixture Licensing Board", name: "Fixture Licensing Board", link: "https://board.fixture.invalid/renewal", readOn: "2026-10-02" }, supports: { finding: "SUPPORTS", ref: "finding:body" } };
/* a source whose RECORDED finding is that it does not support the claim */
const UNSUPPORTED = { claimId: "c-unknown", central: false, states: "OTHER", text: "The renewal fee is lower this year.", source: related("another fixture source", "b"), supports: { finding: "DOES_NOT_SUPPORT", ref: "finding:unknown" } };
const Q1 = rd("formed-1", "How long does a fixture licence renewal take?");
const Q2 = observed("obs-2", "How long is the renewal of a fixture licence?");
const Q3 = rd("formed-3", "What do people often ask about fixture licence renewals?");
const ASSESSMENTS = [Q1, Q3].map(relevant);
function planning({ population = { tenantId: T, coverageState: "COMPLETE", pages: [] }, judgements = [], claims = [CENTRAL, BODY, UNSUPPORTED] } = {}) {
  const same = (q) => ({ questionId: Q1.question_id, judgementRef: `same:${q.question_id}`, reason: "the same meaning and need" });
  const conn = connectQuestions({ subject: S, possible: POSSIBLE, records: [Q1, Q2, Q3], assessments: ASSESSMENTS, on: ON, drafts: [
    { questionId: Q1.question_id, combination: { axis: "one" }, answer: { claims } },
    { questionId: Q2.question_id, combination: { axis: "one" }, sameAs: same(Q2) },
    { questionId: Q3.question_id, combination: { axis: "one" }, sameAs: same(Q3) },
  ] });
  assert.deepEqual(conn.refused, [], "a fixture question was refused by F91's own writer");
  return [...conn.records, ...coverageRecords({ subject: S, rows: conn.records, tenantId: T, population, judgements, on: ON })];
}
/* two fixture pages with VERIFIED bodies (never the 27 set aside) */
const page = (id, h1) => ({ pageId: id, tenantId: T, html: `<article><h1>${h1}</h1><p>Fixture body text about ${h1.toLowerCase()} and nothing else of the subject.</p></article>`, bodyObservationId: `obs:${id}` });
const PAGES = [page("fixture-page-a", "Fixture opening hours"), page("fixture-page-b", "Fixture contact details")];
const POPULATION = { tenantId: T, coverageState: "COMPLETE", pages: PAGES, inventory: { pages: PAGES.map((p) => ({ pageId: p.pageId, fingerprints: [{ observationId: p.bodyObservationId, verified: true }] })) } };
const LONE = { tenantId: T, coverageState: "COMPLETE", pages: [], inventory: { pages: [] } };
const doesNotCover = () => coverageJudgementRecords([Q1, Q2, Q3].flatMap((q) => PAGES.map((p) => ({ questionId: q.question_id, pageId: p.pageId, verdict: "DOES_NOT_COVER", reason: "the page's sections compared with the question", source: { kind: "METHOD", ref: "fixture-coverage-method" } }))), { on: ON }).records;
/* 🔴 RR-208 (F37 Acceptance Amendment 2, C8): the draft reads its links and URL ONLY from F94's plan for its need. FIXTURE RESTATE ONLY — the same
 * targets as the earlier `links` fixture (page a out, page b in, the same URL), now in F94's plan shape for the chosen need; every assertion is unchanged. */
const PLAN_OF = (decision, over = {}) => Object.freeze({ feature: "F94", planned: true, subject: { kind: "NEW_PAGE", ref: `F35:CREATE:${decision?.subject?.needId}` },
  url: { state: "PROPOSED", url: "https://fixture-world.invalid/renewal", readFrom: ["fixture-page-a", "fixture-page-b"] },
  linksOut: [{ pageId: "fixture-page-a", url: "https://fixture-world.invalid/hours", reason: { kind: "SAME_NEED", ref: "F33:COVERS:fixture-page-a" }, extends: [], targetStatus: "WORKING" }],
  linksIn: [{ pageId: "fixture-page-b", url: "https://fixture-world.invalid/contact", reason: { kind: "SAME_NEED", ref: "F33:COVERS:fixture-page-b" }, extends: [], targetStatus: "NOT MEASURED" }],
  bound: { state: "COMPLETE", text: "the fixture inventory (RR-177)", counts: null }, complete: true, claims: { urlUnique: true }, ...over });
const ASPECTS = ["intent", "answer", "facts", "architecture", "examples", "userValue"];

/** The chosen need, decided by F35 over fixture pages, with its compiled spec. */
function chosenWithPages({ claims } = {}) {
  const rows = planning({ population: POPULATION, judgements: doesNotCover(), claims });
  const needId = rows.find((r) => r.record_type === CONNECTION).needId;
  const reviews = PAGES.map((p) => ({ needId, against: p.pageId, verdict: "DISTINCT", needsGuidance: false, ref: `review:${p.pageId}` }));
  const g = decideGroupedNeeds({ tenantId: T, product: PRODUCT, population: POPULATION, planningRows: rows, duplicationReviews: reviews });
  assert.equal(g.compiled.forConstruction.length, 1, "F35 did not choose the fixture need — every test below would judge nothing");
  return { rows, needId, g, d: g.compiled.forConstruction[0] };
}
const gainFor = (slug) => ({
  gainRecords: [{ pageId: `candidate:${slug}`, kind: "USEFUL_COMPARISON", adds: "the renewal time and the form answered in one place", ref: `gain:${slug}` }],
  competitorComparisons: [{ pageId: `candidate:${slug}`, competitorsCompared: 1, gainBeyond: true, ref: `cmp:${slug}` }],
  reviews: PAGES.map((p) => ({ pair: [`candidate:${slug}`, p.pageId], compared: ASPECTS, duplicate: false, documentedDistinctValue: "a different need", needsGuidance: false, ref: `f32:${p.pageId}` })),
});

/* ================= the production path ================= */

test("T37b · F37 C1 THE SAME DRAFT WITH ONE CLAIM'S SOURCE REMOVED shows it UNKNOWN, never as fact; research-provider answer text offered to the writer never appears as fact", () => {
  const stripped = { ...CENTRAL, source: { ...CENTRAL.source, link: "" } };
  const provider = { claimId: "c-provider", central: false, states: "OTHER", text: "A provider says renewals are instant.", source: { kind: "RESEARCH_PROVIDER_ANSWER", name: "a provider", link: "https://provider.fixture.invalid/x", readOn: "2026-10-02" }, supports: { finding: "SUPPORTS", ref: "x" } };
  const c = chosenWithPages({ claims: [CENTRAL, BODY, stripped.claimId === CENTRAL.claimId ? { ...BODY, claimId: "c-body-2", source: { ...BODY.source, link: "" } } : stripped, provider] });
  const draft = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: PLAN_OF(c.d.decision) });
  assert.equal(draft.state, DRAFT.RENDERED);
  assert.ok(!/data-claim-id="c-body-2"><p class="claim-text">/.test(draft.html), "a claim with no source was written as fact");
  assert.match(draft.html, /<p class="unknown" data-claim-id="c-body-2">UNKNOWN/);
  assert.ok(!draft.html.includes(provider.text), "research-provider answer text appeared in the draft as fact");
  assert.match(draft.html, /<p class="unknown" data-claim-id="c-provider">UNKNOWN/);
  /* at draft level too: a supported claim whose source link is removed from the compiled spec is shown UNKNOWN, never written as fact */
  const stripLink = { ...c.d.spec, answer: { ...c.d.spec.answer, labels: c.d.spec.answer.labels.map((l) => (l.claimId === "c-central" ? { ...l, link: "" } : l)) } };
  const noLink = renderCompiledDraft({ spec: stripLink, decision: c.d.decision, plan: PLAN_OF(c.d.decision) });
  assert.ok(!/<div class="claim" data-claim-id="c-central">/.test(noLink.html), "a claim with no source link was written as fact");
  assert.match(noLink.html, /<p class="unknown" data-claim-id="c-central">UNKNOWN/);
});

test("T37d · F37 C3 ONE CONTROL PER P14 LIMB, as rendered: a body's rule from that body is written; the same rule from a third party is UNKNOWN; a third party's estimate is written SECONDARY as its estimate; an ordinary claim with a supporting related source is written SECONDARY; a non-supporting source is UNKNOWN", () => {
  const thirdAsBody = { ...BODY, claimId: "c-third-as-body", source: related("a third party", "t") };
  const estimate = { claimId: "c-estimate", central: false, states: "OTHER", estimate: true, text: "A third party estimates a fee of about 40.", source: related("a third party", "e"), supports: { finding: "SUPPORTS", ref: "finding:estimate" } };
  const c = chosenWithPages({ claims: [CENTRAL, BODY, thirdAsBody, estimate, UNSUPPORTED] });
  const draft = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: PLAN_OF(c.d.decision) });
  const fact = (id) => new RegExp(`<div class="claim" data-claim-id="${id}"><p class="claim-text">`).test(draft.html);
  const unknownOf = (id) => new RegExp(`<p class="unknown" data-claim-id="${id}">UNKNOWN`).test(draft.html);
  assert.ok(fact("c-body") && /RESPONSIBLE BODY source: <a href="https:\/\/board\.fixture\.invalid\/renewal"/.test(draft.html), "a body's rule from that body was not written");
  assert.ok(!fact("c-third-as-body") && unknownOf("c-third-as-body"), "a body's rule from a third party was written as fact");
  assert.ok(fact("c-estimate"), "a third party's estimate stated as its estimate was refused");
  assert.match(draft.html, /SECONDARY source: <a href="https:\/\/related\.fixture\.invalid\/e" rel="nofollow noopener">a third party<\/a> — read 2026-10-02 · a third party's estimate — not an official fee, not a guaranteed time/, "a third party's estimate was not stated as its estimate");
  assert.ok(fact("c-central"), "an ordinary claim with a supporting related source was refused for want of an official body");
  assert.ok(!fact("c-unknown") && unknownOf("c-unknown"), "a non-supporting source was accepted");
  assert.doesNotMatch(draft.html.replace(/not an official fee/g, ""), /\bofficial\b/i, "a secondary source was called official");
});

test("T37g · F37 C5 THE CENSUS: no word or fact-count threshold remains in the draft path — and the census fires on a planted one", () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const THRESHOLD = /\b(MIN_|MAX_|FLOOR|THRESHOLD|wordCount|uniqueWords|countFacts|MIN_FACTS|MIN_UNIQUE_WORDS)\b|\.length\s*[<>]=?\s*[2-9]\d*/;
  for (const f of ["src/page/draft-render.mjs", "src/page/spec-compiler.mjs"]) assert.doesNotMatch(strip(readFileSync(join(REPO, f), "utf8")), THRESHOLD, `${f}: a word or fact-count threshold`);
  assert.match("if (words.length < 350) return refuse();", THRESHOLD, "the census cannot see a planted threshold");
});

test("T37h · F37 C6 MARKUP MATCHES THE VISIBLE CONTENT: the draft's Q&A markup is ALIGNED by F48's rule; a planted invisible marked answer is refused; a planted guarantee is refused; an UNKNOWN answer is never marked up as answered", () => {
  const c = chosenWithPages();
  const draft = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: PLAN_OF(c.d.decision) });
  assert.equal(assessPage({ pageId: "d", html: draft.html, verified: true }).state, MARKUP.ALIGNED);
  assert.ok(draft.counts.markedUp >= 1);
  const planted = draft.html.replace('"mainEntity":[', '"mainEntity":[{"@type":"Question","name":"A question nobody sees?","acceptedAnswer":{"@type":"Answer","text":"An answer nobody sees."}},');
  assert.equal(assessPage({ pageId: "d", html: planted, verified: true }).state, MARKUP.MISALIGNED, "an invisible marked answer passed");
  const promise = renderCompiledDraft({ spec: { ...c.d.spec, answer: { ...c.d.spec.answer, labels: c.d.spec.answer.labels.map((l) => (l.claimId === "c-central" ? { ...l, text: "This page is guaranteed to rank first." } : l)) } }, decision: c.d.decision, plan: PLAN_OF(c.d.decision) });
  assert.equal(promise.checks.markup.state, CHECK.FAIL, "a promise of ranking passed");
  assert.match("we guarantee a top of google result", PROMISE);
  const ld = JSON.parse(draft.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(!JSON.stringify(ld).includes("c-unknown") && !JSON.stringify(ld).includes("lower this year"), "an UNKNOWN answer was marked up as answered");
});

test("T37-27 · RR-177: NO F37 PROOF READS THE REAL PARTITIONS — this file uses fixture structures only, and the census fires on a planted real read", () => {
  const REAL = /readExistingPagePopulation|createTenantResolver|almi-visibility-data|first-real-crawl|subject\("almi-oet"\)|readClientActionEvidence\(|readClientBriefs\(/;
  const src = readFileSync(new URL(import.meta.url), "utf8").replace(/const REAL = [^\n]*\n/, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(src, REAL, "an F37 proof reads a real partition");
  assert.match(`const p = ${"read"}ExistingPagePopulation({ scope });`, REAL, "the census cannot see a planted real read");
});

test("R37-CI · the full suite runs as CI runs it: the tracked workflow runs node --test over every test on each pull request and on main", () => {
  const wf = execFileSync("git", ["-C", REPO, "ls-files", ".github/workflows"], { encoding: "utf8" }).split("\n").filter(Boolean).map((f) => readFileSync(join(REPO, f), "utf8")).join("\n");
  assert.match(wf, /pull_request/);
  assert.match(wf, /\bmain\b/);
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
