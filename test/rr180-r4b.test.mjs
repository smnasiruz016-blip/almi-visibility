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
import { constructCandidates, decisionsForConstruction, ACCEPTED, REFUSED, PASS } from "../src/page/construct.mjs";
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
const LINKS = Object.freeze({ completeness: "COMPLETE", out: [{ pageId: "fixture-page-a", url: "https://fixture-world.invalid/hours", title: "Fixture opening hours" }], inboundFrom: [{ pageId: "fixture-page-b" }], selfUrl: "https://fixture-world.invalid/renewal", ref: "links:fixture" });
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
const construct = (c, { links = LINKS, population = POPULATION } = {}) =>
  constructCandidates({ pageSpecs: {}, variants: PRODUCT.variants, records: [], requested: [c.d.slug], tenantId: T, existingPages: population, gainEvidence: gainFor(c.d.slug), decisions: decisionsForConstruction({ compiled: c.g.compiled }).decisions, links, now: NOW })[0];

/* ================= the production path ================= */

test("T37a · F37 C1 THE PRODUCTION PATH: construction renders the compiled spec of a need F35 CHOSE into one complete local draft — ACCEPTED on fixture pages, its writer named, every material claim mapped to its source record", () => {
  const c = chosenWithPages();
  assert.ok(isChosenCreate(c.d.decision));
  const r = construct(c);
  assert.equal(r.verdict, ACCEPTED, JSON.stringify({ rejects: r.rejects, notTested: r.notTested }));
  assert.equal(r.parts.draft.state, PASS);
  assert.match(r.html, /data-writer="deterministic construction/);
  assert.equal(r.parts.draft.writer, WRITER);
  /* hand-written: two supported claims (central SECONDARY, the body's rule RESPONSIBLE BODY), each traced with its source */
  const traced = new Map(r.trace.map((t) => [t.claimId, t]));
  assert.deepEqual([...traced.keys()].sort(), ["c-body", "c-central"]);
  assert.deepEqual([traced.get("c-central").label, traced.get("c-body").label], ["SECONDARY", "RESPONSIBLE BODY"]);
  for (const t of r.trace) assert.ok(t.source && t.link && t.readOn, `${t.claimId}: untraced`);
});

test("T37b · F37 C1 THE SAME DRAFT WITH ONE CLAIM'S SOURCE REMOVED shows it UNKNOWN, never as fact; research-provider answer text offered to the writer never appears as fact", () => {
  const stripped = { ...CENTRAL, source: { ...CENTRAL.source, link: "" } };
  const provider = { claimId: "c-provider", central: false, states: "OTHER", text: "A provider says renewals are instant.", source: { kind: "RESEARCH_PROVIDER_ANSWER", name: "a provider", link: "https://provider.fixture.invalid/x", readOn: "2026-10-02" }, supports: { finding: "SUPPORTS", ref: "x" } };
  const c = chosenWithPages({ claims: [CENTRAL, BODY, stripped.claimId === CENTRAL.claimId ? { ...BODY, claimId: "c-body-2", source: { ...BODY.source, link: "" } } : stripped, provider] });
  const draft = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: LINKS });
  assert.equal(draft.state, DRAFT.RENDERED);
  assert.ok(!/data-claim-id="c-body-2"><p class="claim-text">/.test(draft.html), "a claim with no source was written as fact");
  assert.match(draft.html, /<p class="unknown" data-claim-id="c-body-2">UNKNOWN/);
  assert.ok(!draft.html.includes(provider.text), "research-provider answer text appeared in the draft as fact");
  assert.match(draft.html, /<p class="unknown" data-claim-id="c-provider">UNKNOWN/);
  /* at draft level too: a supported claim whose source link is removed from the compiled spec is shown UNKNOWN, never written as fact */
  const stripLink = { ...c.d.spec, answer: { ...c.d.spec.answer, labels: c.d.spec.answer.labels.map((l) => (l.claimId === "c-central" ? { ...l, link: "" } : l)) } };
  const noLink = renderCompiledDraft({ spec: stripLink, decision: c.d.decision, links: LINKS });
  assert.ok(!/<div class="claim" data-claim-id="c-central">/.test(noLink.html), "a claim with no source link was written as fact");
  assert.match(noLink.html, /<p class="unknown" data-claim-id="c-central">UNKNOWN/);
});

test("T37c · F37 C2 THE CONTROL PAIR: each heading is its question's own wording with its tier and GENERATED marking visible; the same wording as an attribution heading is refused", () => {
  const c = chosenWithPages();
  const draft = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: LINKS });
  const h = [...draft.html.matchAll(/<section class="qa" data-question-id="([^"]+)" data-tier="([^"]+)" data-marking="([^"]+)" data-refers-to="[^"]*">\n<h2><a href="#answer">([^<]+)<\/a><\/h2>\n<p class="qa-tier">([^<]+)<\/p>/g)].map((m) => ({ id: m[1], tier: m[2], marking: m[3], heading: m[4], line: m[5] }));
  const byId = new Map(h.map((x) => [x.id, x]));
  assert.deepEqual([byId.get(Q1.question_id).heading, byId.get(Q1.question_id).marking, byId.get(Q1.question_id).line], ["How long does a fixture licence renewal take?", "GENERATED", "Research-derived question · GENERATED wording"]);
  assert.deepEqual([byId.get(Q2.question_id).heading, byId.get(Q2.question_id).line], ["How long is the renewal of a fixture licence?", "Asked publicly (observed)"]);
  assert.ok(!byId.has(Q3.question_id), "an attributing wording became a heading");
  assert.doesNotMatch(draft.html, /<blockquote|<q>|verified (public )?demand|verified public question/i, "a research-derived question sits in a quote field or a verified-demand label");
  /* the control pair: the same draft with an attributing heading planted is refused */
  const planted = { ...c.d.spec, sections: [...c.d.spec.sections, { ...c.d.spec.sections[0], questionId: "planted", heading: "What do people often ask about fixture renewals?" }] };
  assert.equal(renderCompiledDraft({ spec: planted, decision: c.d.decision, links: LINKS }).state, DRAFT.REFUSED);
});

test("T37d · F37 C3 ONE CONTROL PER P14 LIMB, as rendered: a body's rule from that body is written; the same rule from a third party is UNKNOWN; a third party's estimate is written SECONDARY as its estimate; an ordinary claim with a supporting related source is written SECONDARY; a non-supporting source is UNKNOWN", () => {
  const thirdAsBody = { ...BODY, claimId: "c-third-as-body", source: related("a third party", "t") };
  const estimate = { claimId: "c-estimate", central: false, states: "OTHER", estimate: true, text: "A third party estimates a fee of about 40.", source: related("a third party", "e"), supports: { finding: "SUPPORTS", ref: "finding:estimate" } };
  const c = chosenWithPages({ claims: [CENTRAL, BODY, thirdAsBody, estimate, UNSUPPORTED] });
  const draft = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: LINKS });
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

test("T37e · F37 C4 ONE CONTROL PER P19 ROW: only CREATE renders a page; ADD SECTION renders a section proposal for the existing page, never a page or a URL; KEEP, HOLD and CONNECT render nothing — F37 never re-decides", () => {
  const subject = { kind: "GROUPED_NEED", needId: "need:x", pageCandidate: '[["axis","one"]]' };
  const spec = chosenWithPages().d.spec;
  const asNeed = { ...spec, subject: "need:x" };
  const d = (coverage, extra = {}) => decideGroupedNeed({ need: { needId: "need:x", pageCandidate: subject.pageCandidate, questions: 2, tier: "RESEARCH-DERIVED", centralSupported: true, ...extra }, coverage, rightToExist: { outcome: "ESTABLISHED", reason: "x", parts: { specific: { state: "PASS" } } }, duplication: duplicationFor({ needId: "need:x", comparisons: [] }) });
  const NONE = { coverage: "NONE", pages: [], measurement_key: "cov:none", reason: "x" };
  const create = d(NONE), keep = d({ coverage: "FULL", relevantQuestionMissing: false, pages: [{ pageId: "fixture-page-a" }], measurement_key: "cov:full" }), hold = d(NONE, { centralSupported: false });
  const addSection = d({ coverage: "PARTIAL", relevantQuestionMissing: true, pages: [{ pageId: "fixture-page-a" }], measurement_key: "cov:partial" });
  assert.equal(renderCompiledDraft({ spec: asNeed, decision: create }).state, DRAFT.RENDERED);
  for (const [label, dec] of [["KEEP", keep], ["HOLD", hold], ["ADD SECTION", addSection]]) assert.equal(renderCompiledDraft({ spec: asNeed, decision: dec }).state, DRAFT.REFUSED, `${label} rendered a page`);
  const proposalSpec = { ...asNeed, kind: "SECTION_PROPOSAL", purpose: PURPOSE.SECTION_PROPOSAL, target: { existingPages: ["fixture-page-a"], unchangedUntilOwnerApproves: true } };
  const p = renderSectionProposal({ spec: proposalSpec, decision: addSection });
  assert.deepEqual([p.state, p.newPage, p.url, [...p.targetPages], p.unchangedUntilOwnerApproves], [DRAFT.RENDERED, false, null, ["fixture-page-a"], true]);
  assert.ok(!/<article|<h1/.test(p.fragment), "a section proposal became a page");
  assert.equal(renderSectionProposal({ spec: proposalSpec, decision: create }).state, DRAFT.REFUSED, "a CREATE was rendered as a section proposal");
  /* the 6 August shape: one need over several destinations is ONE compiled page */
  assert.equal(chosenWithPages().g.compiled.forConstruction.length, 1);
});

test("T37f · F37 C5 THE MEASURABLE CHECKS, each with its control: direct answer, every claim sourced, headings match, internal links, technical, markup — a check whose input is not recorded is NOT MEASURED and the draft never passes by default", () => {
  const c = chosenWithPages();
  const ok = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: LINKS });
  assert.deepEqual(Object.fromEntries(Object.entries(ok.checks).map(([k, v]) => [k, v.state])), { directAnswer: "PASS", everyClaimSourced: "PASS", headingsMatch: "PASS", internalLinks: "PASS", technical: "PASS", markup: "PASS" });
  assert.equal(ok.checksVerdict, CHECK.PASS);
  const noLinks = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: null });
  assert.deepEqual([noLinks.checks.internalLinks.state, noLinks.checks.technical.state, noLinks.checksVerdict], [CHECK.NOT_MEASURED, CHECK.NOT_MEASURED, CHECK.NOT_MEASURED]);
  const empty = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: { ...LINKS, out: [], inboundFrom: [] } });
  assert.equal(empty.checks.internalLinks.state, CHECK.NOT_MEASURED, "a check with no recorded input was passed by default");
  const halfway = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: { ...LINKS, inboundFrom: [] } });
  assert.equal(halfway.checks.internalLinks.state, CHECK.FAIL);
  const noCentral = renderCompiledDraft({ spec: { ...c.d.spec, answer: { ...c.d.spec.answer, labels: c.d.spec.answer.labels.map((l) => ({ ...l, central: false })) } }, decision: c.d.decision, links: LINKS });
  assert.equal(noCentral.checks.directAnswer.state, CHECK.FAIL);
  /* the judged qualities are F40's — none is required or recorded here */
  assert.ok(!Object.keys(ok.checks).some((k) => /engag|hook|filler|repetit/i.test(k)), "a judged quality of F40's is required by F37");
});

test("T37g · F37 C5 THE CENSUS: no word or fact-count threshold remains in the draft path — and the census fires on a planted one", () => {
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const THRESHOLD = /\b(MIN_|MAX_|FLOOR|THRESHOLD|wordCount|uniqueWords|countFacts|MIN_FACTS|MIN_UNIQUE_WORDS)\b|\.length\s*[<>]=?\s*[2-9]\d*/;
  for (const f of ["src/page/draft-render.mjs", "src/page/spec-compiler.mjs"]) assert.doesNotMatch(strip(readFileSync(join(REPO, f), "utf8")), THRESHOLD, `${f}: a word or fact-count threshold`);
  assert.match("if (words.length < 350) return refuse();", THRESHOLD, "the census cannot see a planted threshold");
});

test("T37h · F37 C6 MARKUP MATCHES THE VISIBLE CONTENT: the draft's Q&A markup is ALIGNED by F48's rule; a planted invisible marked answer is refused; a planted guarantee is refused; an UNKNOWN answer is never marked up as answered", () => {
  const c = chosenWithPages();
  const draft = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: LINKS });
  assert.equal(assessPage({ pageId: "d", html: draft.html, verified: true }).state, MARKUP.ALIGNED);
  assert.ok(draft.counts.markedUp >= 1);
  const planted = draft.html.replace('"mainEntity":[', '"mainEntity":[{"@type":"Question","name":"A question nobody sees?","acceptedAnswer":{"@type":"Answer","text":"An answer nobody sees."}},');
  assert.equal(assessPage({ pageId: "d", html: planted, verified: true }).state, MARKUP.MISALIGNED, "an invisible marked answer passed");
  const promise = renderCompiledDraft({ spec: { ...c.d.spec, answer: { ...c.d.spec.answer, labels: c.d.spec.answer.labels.map((l) => (l.claimId === "c-central" ? { ...l, text: "This page is guaranteed to rank first." } : l)) } }, decision: c.d.decision, links: LINKS });
  assert.equal(promise.checks.markup.state, CHECK.FAIL, "a promise of ranking passed");
  assert.match("we guarantee a top of google result", PROMISE);
  const ld = JSON.parse(draft.html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(!JSON.stringify(ld).includes("c-unknown") && !JSON.stringify(ld).includes("lower this year"), "an UNKNOWN answer was marked up as answered");
});

test("T37i · F37 C1 RULING RR-180 (a): construction, and bin/build-page.mjs, act only on F35's decision — a need F35 did not choose is never drafted, and the runner hands construction only decisionsForConstruction", () => {
  const c = chosenWithPages();
  assert.equal(decisionsForConstruction({ compiled: { forConstruction: [{ ...c.d, decision: { ...c.d.decision, actions: [{ action: "KEEP" }] } }] } }).decisions.length, 0, "a KEEP reached construction");
  assert.equal(decisionsForConstruction({ fault: "x" }).decisions.length, 0);
  /* a compiled spec F35 did not choose never enters the construction family: asking for it is refused outright */
  assert.throws(() => constructCandidates({ pageSpecs: {}, records: [], requested: [c.d.slug], tenantId: T, existingPages: POPULATION, gainEvidence: gainFor(c.d.slug), decisions: [{ ...c.d, decision: { ...c.d.decision, decision: "CANNOT_DECIDE", actions: [] } }], links: LINKS, now: NOW }), /is not in the declared family/, "a spec F35 did not choose entered the construction family");
  const bin = readFileSync(join(REPO, "bin/build-page.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(bin, /const chosen = decisionsForConstruction\(ae\);/);
  assert.match(bin, /decisions: chosen\.decisions/);
  assert.doesNotMatch(bin, /decisions: (null|\[\])/, "the runner hands construction something other than F35's decision");
});

test("T37j · RULING RR-180 (b): A COMPLETE PASSING PREVIEW, ON FIXTURES — an ACCEPTED draft with a READY brief is put before the owner; without F39's gain and competitor records it is not", () => {
  const c = chosenWithPages();
  const r = construct(c);
  const evidence = { ...groupedNeedEvidence(c.rows, c.needId), entities: { items: ["fixture licence"], ref: "e" }, gain: { kind: "USEFUL_COMPARISON", adds: "one place", ref: "g" }, localeTerms: { items: ["renewal"], ref: "l" },
    links: { completeness: "COMPLETE", targets: ["fixture-page-a"], ref: "links:fixture" }, cta: { text: "start the renewal", ref: "c" }, schema: { type: "FAQPage", ref: "s" }, prohibitedClaims: { items: ["guaranteed approval"], ref: "p" } };
  const brief = buildBrief({ decision: c.d.decision, evidence, now: NOW });
  assert.equal(brief.state, "READY", JSON.stringify(brief.missing));
  /* RR-188 (F41 C9): put forward only on F40's full PASS for THIS draft — F40 judges it here, with fixture judges declared as such */
  const fj = (name) => ({ name, verdict: "PASS", criterionId: F40_CRITERIA[name].id, observation: "the fixture judge's recorded observation", source: { kind: "FIXTURE", ref: `fixture-judge:${name}` } });
  const f40 = judgeDraft({ spec: c.d.spec, decision: c.d.decision, draft: renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: LINKS }), parts: r.parts, population: F40_POPULATION.FIXTURE, judgements: [fj("engaging"), fj("hookable")] });
  assert.equal(f40.gate.verdict, "PASS", JSON.stringify(f40.gate.blockers));
  assert.equal(previewForOwner({ construction: r, brief, f40 }).state, PREVIEW.PUT_FORWARD);
  /* ruling (b): with no recorded gain or competitor comparison, F39 stays CANNOT DECIDE and nothing is put forward */
  const noGain = constructCandidates({ pageSpecs: {}, records: [], requested: [c.d.slug], tenantId: T, existingPages: POPULATION, gainEvidence: { gainRecords: [], competitorComparisons: [], reviews: gainFor(c.d.slug).reviews }, decisions: decisionsForConstruction({ compiled: c.g.compiled }).decisions, links: LINKS, now: NOW })[0];
  assert.equal(noGain.verdict, REFUSED);
  assert.equal(previewForOwner({ construction: noGain, brief, f40 }).state, PREVIEW.NOT_PUT_FORWARD);
});

test("T37k · F37 C1 NO LIVE WRITER, NOTHING READ OR PUBLISHED: the draft path loads no module that can make a network, process, connector or paid call — and the enumeration fires when one is planted", () => {
  const entries = ["src/page/draft-render.mjs", "src/page/construct.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  assert.doesNotMatch(readFileSync(join(REPO, "src/page/draft-render.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""), /from "node:fs"|writeFile|anthropic|ai-providers/, "the draft path can write or reach a provider");
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

test("R37-BOARD · F37 moves only through the production validator and the audit trail: frozen, started, and VERIFIED-PASS only with a REAL VERIFIED event, every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const row = DECLARED.F37;
  assert.deepEqual(row.events.slice(0, 2).map((e) => e.kind), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION"]);
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F37" && e.occurredAt.startsWith("2026-10-05")), "F37's movement is not in the trail");
  if (row.state === "VERIFIED-PASS") {
    const v = row.events.filter((e) => e.kind === "VERIFIED").at(-1);
    assert.equal(v.population, "REAL");
    /* RR-186: since Acceptance Amendment 1 the acceptance in force has C7 (each distinct claim once); the re-proof names every clause */
    assert.deepEqual(Object.keys(v.clauses), ["C1", "C2", "C3", "C4", "C5", "C6", "C7"]);
    assert.ok(Object.values(v.clauses).every((x) => x === "PROVED"));
  } else assert.equal(row.state, "IN-PROGRESS");
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
