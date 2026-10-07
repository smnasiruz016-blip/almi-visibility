/**
 * 🔴 RR-210 · F38 · ANSWER-FIRST CONTENT SPECIFICATION (acceptance _handoffs 96ae49e, approved by its hash d74c5efd…, contract 977b0f38…).
 *
 * ONE TEST PER EVIDENCE LINE of the frozen acceptance (C1–C7 and [ALL]); each FAILURE limb has its sabotage in test/helpers/rr210-sabotage.mjs,
 * naming the test it turns red. FIXTURE PAGES ONLY (RR-177): the RR-184 fixture chain (planning rows by F91's and F16's own functions, F35's own
 * decision, F37's own render) and hand-written fixture page bodies. The one real read is C6's count-only control on the recorded inventory
 * SHAPES (records, edges, sitemap records, declarations; no page body). Nothing here writes to the production trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { judgeDraft, CRITERIA, VERDICT, CANNOT_DECIDE, NOT_JUDGED, NO_LAWFUL_JUDGE, ASSESSMENTS, JUDGEMENTS, POPULATION, MAX_REPAIR_ROUNDS } from "../src/page/quality-judgements.mjs";
import { renderCompiledDraft, PROMISE } from "../src/page/draft-render.mjs";
import { decideGroupedNeeds } from "../src/page/action-evidence.mjs";
import { constructCandidates, decisionsForConstruction } from "../src/page/construct.mjs";
import { connectQuestions, coverageRecords, CONNECTION } from "../src/page/demand-connection.mjs";
import { coverageJudgementRecords } from "../src/page/grouped-need-coverage.mjs";
import { possibleCombinations } from "../src/page/page-opportunities.mjs";
import { researchDerivedQuestion, assessmentRecord, ROUTES } from "../src/research/research-derived.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { answerFirst, headForDraft, headFaults, headOfBody, auditExistingPages, renderedAnswerClaims, VERDICT as V38, FINDING, UNIQUE, OVERSTATING_NOT_MEASURED, ANSWER_PLACEMENT_NOT_MEASURED, NO_BODY, STANDING } from "../src/page/answer-first.mjs";
import { readClientHeads } from "../src/page/answer-first-evidence.mjs";
import { HEAD_ELEMENTS, parseHead } from "../src/audit/technical-checks.mjs";
import { scopeCompleteness } from "../src/crawl/scope-completeness.mjs";
import { readTenantPartition, readPartitionEdges } from "../src/crawl/batch-partition.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { createTenantResolver, readDeclarations } from "../src/tenancy/resolver.mjs";
import { declaredScope } from "../src/page/existing-page-population.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const ON = "2026-10-06", AT = `${ON}T00:00:00Z`, NOW = new Date(`${ON}T12:00:00Z`);
const T = "tenant:rr210-fixture", S = "rr210-fixture-subject";
const MODULE = "src/page/quality-judgements.mjs";
const code = (f) => readFileSync(join(REPO, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");

/* ---- fixture planning rows, by F91's and F16's own functions (the RR-180 fixture, renamed) ---- */
const POSSIBLE = possibleCombinations({ dimensions: [{ key: "axis", values: ["one", "two"], source: "the fixture descriptor", applicability: "APPLIES" }] });
const PRODUCT = Object.freeze({ productId: S, axis: { key: "axis" }, variants: ["one", "two"], pageSpecs: {} });
const relevant = (q) => assessmentRecord({ question: q, draft: { verdict: "RELEVANT", declarationVersion: "fixture-v1", meaningTest: "within the declared field", reason: "about the declared product", source: { kind: "METHOD", ref: "fixture-method" } }, at: AT }).record;
const rd = (queryId, wording) => researchDerivedQuestion({ subject: S, queryId, route: ROUTES.CLIENT_AI, wording, providerId: "fixture-provider", at: AT });
const observed = (id, wording) => ({ record_type: "public_question", question_id: id, measurement_key: `public_question:${id}`, recorded_at: "2026-10-01T09:00:00Z",
  value: { subject: S, kind: "OBSERVED", original: wording, sourceId: "fixture", provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } } });
const related = (name, path) => ({ kind: "RELATED", name, link: `https://related.fixture.invalid/${path}`, readOn: "2026-10-02" });
const CENTRAL = { claimId: "c-central", states: "OTHER", text: "A fixture licence renewal takes about four weeks.", source: related("a related fixture source", "a"), supports: { finding: "SUPPORTS", ref: "finding:central" } };
const BODY = { claimId: "c-body", central: false, states: "RESPONSIBLE_BODY_RULE", body: "Fixture Licensing Board", text: "The Fixture Licensing Board requires the renewal form.", source: { kind: "RESPONSIBLE_BODY", body: "Fixture Licensing Board", name: "Fixture Licensing Board", link: "https://board.fixture.invalid/renewal", readOn: "2026-10-02" }, supports: { finding: "SUPPORTS", ref: "finding:body" } };
const UNSUPPORTED = { claimId: "c-unknown", central: false, states: "OTHER", text: "The renewal fee is lower this year.", source: related("another fixture source", "b"), supports: { finding: "DOES_NOT_SUPPORT", ref: "finding:unknown" } };
const Q1 = rd("formed-1", "How long does a fixture licence renewal take?");
const Q2 = observed("obs-2", "How long is the renewal of a fixture licence?");
const Q3 = rd("formed-3", "What do people often ask about fixture licence renewals?");
function planning({ population, judgements = [], claims = [CENTRAL, BODY, UNSUPPORTED], grouped = true }) {
  const same = (q) => ({ questionId: Q1.question_id, judgementRef: `same:${q.question_id}`, reason: "the same meaning and need" });
  const records = grouped ? [Q1, Q2, Q3] : [Q1];
  const conn = connectQuestions({ subject: S, possible: POSSIBLE, records, assessments: (grouped ? [Q1, Q3] : [Q1]).map(relevant), on: ON, drafts: [
    { questionId: Q1.question_id, combination: { axis: "one" }, answer: { claims } },
    ...(grouped ? [{ questionId: Q2.question_id, combination: { axis: "one" }, sameAs: same(Q2) }, { questionId: Q3.question_id, combination: { axis: "one" }, sameAs: same(Q3) }] : []),
  ] });
  assert.deepEqual(conn.refused, [], "a fixture question was refused by F91's own writer");
  return [...conn.records, ...coverageRecords({ subject: S, rows: conn.records, tenantId: T, population, judgements, on: ON })];
}
/* two fixture pages with VERIFIED bodies (never the 27 set aside) */
const page = (id, h1) => ({ pageId: id, tenantId: T, html: `<article><h1>${h1}</h1><p>Fixture body text about ${h1.toLowerCase()} and nothing else of the subject.</p></article>`, bodyObservationId: `obs:${id}` });
const PAGES = [page("fixture-page-a", "Fixture opening hours"), page("fixture-page-b", "Fixture contact details")];
const POP = { tenantId: T, coverageState: "COMPLETE", pages: PAGES, inventory: { pages: PAGES.map((p) => ({ pageId: p.pageId, fingerprints: [{ observationId: p.bodyObservationId, verified: true }] })) } };
const doesNotCover = (qs) => coverageJudgementRecords(qs.flatMap((q) => PAGES.map((p) => ({ questionId: q.question_id, pageId: p.pageId, verdict: "DOES_NOT_COVER", reason: "the page's sections compared with the question", source: { kind: "METHOD", ref: "fixture-coverage-method" } }))), { on: ON }).records;
/* 🔴 RR-208 (F37 Acceptance Amendment 2, C8): the draft reads its links and URL ONLY from F94's plan for its need. FIXTURE RESTATE ONLY — the same
 * targets as the earlier `links` fixture (page a out, page b in, the same URL), now in F94's plan shape for the chosen need; every assertion is unchanged. */
const PLAN_OF = (decision, over = {}) => Object.freeze({ feature: "F94", planned: true, subject: { kind: "NEW_PAGE", ref: `F35:CREATE:${decision?.subject?.needId}` },
  url: { state: "PROPOSED", url: "https://fixture-world.invalid/renewal", readFrom: ["fixture-page-a", "fixture-page-b"] },
  linksOut: [{ pageId: "fixture-page-a", url: "https://fixture-world.invalid/hours", reason: { kind: "SAME_NEED", ref: "F33:COVERS:fixture-page-a" }, extends: [], targetStatus: "WORKING" }],
  linksIn: [{ pageId: "fixture-page-b", url: "https://fixture-world.invalid/contact", reason: { kind: "SAME_NEED", ref: "F33:COVERS:fixture-page-b" }, extends: [], targetStatus: "NOT MEASURED" }],
  bound: { state: "COMPLETE", text: "the fixture inventory (RR-177)", counts: null }, complete: true, claims: { urlUnique: true }, ...over });
const ASPECTS = ["intent", "answer", "facts", "architecture", "examples", "userValue"];
function chosen({ claims, grouped = true } = {}) {
  const rows = planning({ population: POP, judgements: doesNotCover(grouped ? [Q1, Q2, Q3] : [Q1]), claims, grouped });
  const needId = rows.find((r) => r.record_type === CONNECTION).needId;
  const reviews = PAGES.map((p) => ({ needId, against: p.pageId, verdict: "DISTINCT", needsGuidance: false, ref: `review:${p.pageId}` }));
  const g = decideGroupedNeeds({ tenantId: T, product: PRODUCT, population: POP, planningRows: rows, duplicationReviews: reviews });
  assert.equal(g.compiled.forConstruction.length, 1, "F35 did not choose the fixture need — every test below would judge nothing");
  return { g, d: g.compiled.forConstruction[0] };
}
const gainFor = (slug, withGain = true) => ({
  gainRecords: withGain ? [{ pageId: `candidate:${slug}`, kind: "USEFUL_COMPARISON", adds: "the renewal time and the form answered in one place", ref: `gain:${slug}` }] : [],
  competitorComparisons: withGain ? [{ pageId: `candidate:${slug}`, competitorsCompared: 1, gainBeyond: true, ref: `cmp:${slug}` }] : [],
  reviews: PAGES.map((p) => ({ pair: [`candidate:${slug}`, p.pageId], compared: ASPECTS, duplicate: false, documentedDistinctValue: "a different need", needsGuidance: false, ref: `f32:${p.pageId}` })),
});
/** The production path: construction judges F35's chosen spec; the draft is F37's own render of it; F40 reads both. */
function judged(c, { plan = PLAN_OF(c.d.decision), withGain = true, population = POPULATION.FIXTURE, judgements = [], repeatJustifications = [], round = 0, previous = null, spec = c.d.spec, draft = null } = {}) {
  /* construction is handed the SAME spec the draft renders (a changed spec rides in F35's construction set) */
  const compiled = { ...c.g.compiled, forConstruction: c.g.compiled.forConstruction.map((x) => (x.slug === c.d.slug ? { ...x, spec } : x)) };
  const r = constructCandidates({ pageSpecs: {}, variants: PRODUCT.variants, records: [], requested: [c.d.slug], tenantId: T, existingPages: POP, gainEvidence: gainFor(c.d.slug, withGain), decisions: decisionsForConstruction({ compiled }).decisions, plans: [plan].filter(Boolean), now: NOW })[0];
  const d = draft ?? renderCompiledDraft({ spec, decision: c.d.decision, plan });
  return { r, d, q: judgeDraft({ spec, decision: c.d.decision, draft: d, parts: r.parts, population, judgements, repeatJustifications, round, previous }) };
}
const fixtureJudgement = (name, verdict) => ({ name, verdict, criterionId: CRITERIA[name].id, observation: `the fixture judge's recorded observation of the rendered draft (${verdict})`, source: { kind: "FIXTURE", ref: `fixture-judge:${name}` } });
const PASSING_JUDGEMENTS = [fixtureJudgement("engaging", VERDICT.PASS), fixtureJudgement("hookable", VERDICT.PASS)];
const justifyAll = (html) => [...new Set([...html.matchAll(/<div class="claim" data-claim-id="([^"]+)">/g)].map((m) => m[1]))].map((claimId) => ({ claimId, adds: "the answer restated under the question's own wording for a reader who arrives at that question", ref: `fixture-justification:${claimId}` }));
const T2 = "tenant:rr210-other";

/* ---- RR-210 · F38 ---- */
const SP = "src/page/answer-first.mjs", SE = "src/page/answer-first-evidence.mjs";
const render = (c, plan = null) => renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan });
const NONE = { titles: [], descriptions: [] };
const COMPLETE_INV = { state: "COMPLETE", bound: "the fixture inventory (RR-177)" };
const INCOMPLETE_INV = { state: "INCOMPLETE", bound: "the fixture inventory, one listed URL unobserved (RR-177)" };
const body = (title, descs = [], extra = "") => `<html><head>${title === null ? "" : `<title>${title}</title>`}${descs.map((d) => `<meta name="description" content="${d}">`).join("")}</head><body><h1>A fixture page</h1>${extra}</body></html>`;
/* the C5 fixture tenant: one page per finding, written by hand */
const FIXTURE_PAGES = [
  { pageId: "p-clean", tenantId: T, html: body("Fixture opening hours", ["When the fixture office is open."]) },
  { pageId: "p-no-title", tenantId: T, html: body(null, ["A page with no title."]) },
  { pageId: "p-empty-desc", tenantId: T, html: body("Fixture forms", [""]) },
  { pageId: "p-two-descs", tenantId: T, html: body("Fixture fees", ["First description.", "Second description."]) },
  { pageId: "p-shared-title-1", tenantId: T, html: body("Fixture contact", ["Contact by post."]) },
  { pageId: "p-shared-title-2", tenantId: T, html: body("Fixture contact", ["Contact by phone."]) },
  { pageId: "p-shared-desc-1", tenantId: T, html: body("Fixture renewals", ["The same words twice."]) },
  { pageId: "p-shared-desc-2", tenantId: T, html: body("Fixture appeals", ["The same words twice."]) },
  { pageId: "p-no-body", tenantId: T, html: "" },
];

/* ================= C1 ================= */
test("T38-C1 · F38 C1 THE USEFUL ANSWER EARLY: F37's own render of a need F35 chose has the direct answer first after the top heading; a block planted before the answer, or before the first question, is refused; an existing page's answer placement is NOT MEASURED, named", () => {
  const c = chosen();
  const d = render(c);
  assert.equal(d.state, "RENDERED");
  assert.deepEqual(answerFirst(d).verdict, V38.PASS, answerFirst(d).why);
  const before = { ...d, html: d.html.replace('<section class="direct-answer"', '<p class="intro">Welcome to the fixture page.</p>\n<section class="direct-answer"') };
  assert.equal(answerFirst(before).verdict, V38.FAIL, "a block before the answer was accepted");
  const at = d.html.indexOf("</section>", d.html.indexOf('id="answer"')) + "</section>".length;
  const between = { ...d, html: `${d.html.slice(0, at)}\n<p class="intro">More before the questions.</p>${d.html.slice(at)}` };
  assert.ok(d.html.includes('<section class="qa"'), "the fixture draft has no question section — the second control would prove nothing");
  assert.equal(answerFirst(between).verdict, V38.FAIL, "content before the first question was accepted");
  assert.equal(render(c).html, d.html, "F38 changed F37's render");
  const a = auditExistingPages({ tenantId: T, pages: FIXTURE_PAGES.slice(0, 1), completeness: COMPLETE_INV });
  assert.equal(a.results[0].answerPlacement, ANSWER_PLACEMENT_NOT_MEASURED);
});

/* ================= C2 ================= */
test("T38-C2 · F38 C2 KEYWORD-AWARE BY THE NEED'S OWN WORDS, NO NUMBER DECIDES: the title is the central question's wording; a title missing those words and one adding a keyword are refused; no count, density, length or quota of words, keywords or characters is in F38's path", () => {
  const c = chosen();
  const d = render(c);
  const h = headForDraft({ spec: c.d.spec, draft: d, others: NONE, completeness: COMPLETE_INV });
  assert.equal(h.title, c.d.spec.title.trim());
  assert.deepEqual(headFaults(h, { spec: c.d.spec, draft: d }), []);
  for (const title of ["Fixture licence", `${c.d.spec.title} | best renewal tips`]) {
    assert.ok(headFaults({ ...h, title, headHtml: h.headHtml.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`) }, { spec: c.d.spec, draft: d }).map((f) => f.code).includes("TITLE_IS_NOT_THE_CENTRAL_QUESTION"), `title ${JSON.stringify(title)} was accepted`);
  }
  const QUOTA = /\b(MAX|MIN)_\w*|density|\b(words?|wordCount|chars?|characters)\b[^;\n]*[<>]=?\s*\d|\.length\s*[<>]=?\s*([2-9]|\d{2,})/i;
  for (const m of [SP, SE]) assert.doesNotMatch(code(m), QUOTA, `${m} decides by a number`);
  assert.match("if (title.length > 60) return refuse();", QUOTA, "the census cannot see a planted length gate");
  assert.doesNotMatch(code(SP), /repetition|quality-judgements/, "F38 re-judges repetition");
});

/* ================= C3 ================= */
test("T38-C3 · F38 C3 TRUTHFUL, NO PROMISE: the description is the supported central claims as rendered; an UNKNOWN claim's text, an overstating sentence and a ranking promise are each refused; F40's records read unchanged", () => {
  const c = chosen();
  const d = render(c);
  const h = headForDraft({ spec: c.d.spec, draft: d, others: NONE, completeness: COMPLETE_INV });
  assert.equal(h.description, CENTRAL.text, "the description is not the rendered central claim");
  assert.deepEqual(h.descriptionClaims, ["c-central"]);
  assert.ok(!d.html.includes(UNSUPPORTED.text) && !h.description.includes(UNSUPPORTED.text));
  const faultsOf = (x) => headFaults(x, { spec: c.d.spec, draft: d }).map((f) => f.code);
  const withDesc = (desc) => ({ ...h, description: desc, headHtml: h.headHtml.replace(/content="[^"]*"/, `content="${desc}"`) });
  assert.ok(faultsOf(withDesc(`${h.description} ${UNSUPPORTED.text}`)).includes("DESCRIPTION_IS_NOT_THE_RENDERED_SUPPORTED_CLAIMS"), "an UNKNOWN claim's text was accepted");
  assert.ok(faultsOf(withDesc(`${h.description} It is the fastest renewal anywhere.`)).includes("DESCRIPTION_IS_NOT_THE_RENDERED_SUPPORTED_CLAIMS"), "an overstating sentence was accepted");
  const unknownWhy = d.html.match(/<p class="unknown"[^>]*>UNKNOWN — ([^<]*)<\/p>/)[1];
  assert.ok(faultsOf(withDesc(`${h.description} ${unknownWhy}`)).includes("AN_UNKNOWN_PART_IN_THE_HEAD"), "an UNKNOWN part's wording was accepted in the head");
  assert.ok(faultsOf({ ...h, title: `${h.title} — this page will rank first` }).includes("A_PROMISE_IN_THE_HEAD"), "a ranking promise was accepted");
  assert.doesNotMatch(JSON.stringify(h), PROMISE);
  assert.doesNotMatch(code(SP), /export function (judge|engaging|useful)/i, "F38 judges useful or engaging itself");
});

/* ================= C4 ================= */
test("T38-C4 · F38 C4 EXACTLY ONE TITLE AND ONE DESCRIPTION, BESIDE THE BODY: one of each, unique, PASS; none, two, an empty one, a recorded page's title and another draft's title — each refused; F37's body and F40's verdicts byte-identical with and without the head; no supported central claim → description ABSENT, a finding", () => {
  const c = chosen();
  const d = render(c);
  const bodyBefore = d.html, f40Before = JSON.stringify(judgeDraft({ spec: c.d.spec, decision: c.d.decision, draft: d, parts: null, population: POPULATION.FIXTURE }));
  const h = headForDraft({ spec: c.d.spec, draft: d, others: { titles: ["Another page"], descriptions: ["Another description."] }, completeness: INCOMPLETE_INV });
  assert.deepEqual([headOfBody(h.headHtml).titles.length, headOfBody(h.headHtml).descriptions.length], [1, 1]);
  assert.deepEqual([h.verdict, h.findings, h.unique], [V38.PASS, [], UNIQUE.RECORDED]);
  assert.deepEqual(headFaults(h, { spec: c.d.spec, draft: d }), []);
  assert.equal(d.html, bodyBefore, "the head changed the body");
  assert.deepEqual(headOfBody(d.html), { titles: [], descriptions: [] }, "the head is inside the body F40 judges");
  assert.equal(JSON.stringify(judgeDraft({ spec: c.d.spec, decision: c.d.decision, draft: d, parts: null, population: POPULATION.FIXTURE })), f40Before, "F40's verdicts moved");
  const faultsOf = (headHtml) => headFaults({ ...h, headHtml }, { spec: c.d.spec, draft: d }).map((f) => f.code);
  assert.ok(faultsOf("").includes("NOT_EXACTLY_ONE_NON_EMPTY_TITLE") && faultsOf("").includes("NOT_EXACTLY_ONE_NON_EMPTY_DESCRIPTION"));
  assert.ok(faultsOf(`${h.headHtml}\n<title>${h.title}</title>`).includes("NOT_EXACTLY_ONE_NON_EMPTY_TITLE"), "two titles were accepted");
  assert.ok(faultsOf(h.headHtml.replace(/content="[^"]*"/, 'content=""')).includes("NOT_EXACTLY_ONE_NON_EMPTY_DESCRIPTION"), "an empty description was accepted");
  assert.ok(headFaults(h, { spec: c.d.spec, draft: { ...d, html: d.html.replace("<article", `${h.headHtml}\n<article`) } }).map((f) => f.code).includes("THE_HEAD_IS_INSIDE_THE_BODY"));
  const dupRecorded = headForDraft({ spec: c.d.spec, draft: d, others: { titles: [c.d.spec.title.trim()], descriptions: [] }, completeness: COMPLETE_INV });
  assert.deepEqual([dupRecorded.verdict, dupRecorded.findings.map((f) => [f.part, f.kind]), dupRecorded.unique], [V38.FAIL, [["title", FINDING.DUPLICATED]], null], "a recorded page's title was accepted as unique");
  const dupDesc = headForDraft({ spec: c.d.spec, draft: d, others: { titles: [], descriptions: [CENTRAL.text] }, completeness: COMPLETE_INV });
  assert.deepEqual(dupDesc.findings.map((f) => [f.part, f.kind]), [["description", FINDING.DUPLICATED]]);
  /* another draft of the run with the same title: the runner's reader (spy world) hands the other drafts' titles in */
  const W = spyWorld();
  const twin = readClientHeads({ tenantId: T, chosen: [c.d, c.d], io: W.io });
  assert.deepEqual(twin.heads.map((x) => x.findings.map((f) => f.kind)), [[FINDING.DUPLICATED], [FINDING.DUPLICATED]], "another draft's title was accepted");
  const bare = { ...d, html: d.html.replace(/<div class="claim" data-claim-id="c-central">[\s\S]*?<\/div>/, "") };
  const noClaim = headForDraft({ spec: c.d.spec, draft: bare, others: NONE, completeness: COMPLETE_INV });
  assert.deepEqual([noClaim.description, noClaim.findings.map((f) => [f.part, f.kind])], [null, [["description", FINDING.ABSENT]]], "a description was invented");
});

/* ================= C5 ================= */
test("T38-C5 · F38 C5 EVERY EXISTING PAGE: each fixture page its finding; no stored body NOT MEASURED; overstating NOT MEASURED, named; nothing written or generated; the counts agree with the head-elements check on the same bodies", () => {
  const a = auditExistingPages({ tenantId: T, pages: FIXTURE_PAGES, completeness: COMPLETE_INV });
  const r = Object.fromEntries(a.results.map((x) => [x.pageId, x]));
  const f = (id, part) => r[id][part].findings;
  assert.deepEqual([f("p-clean", "title"), f("p-clean", "description"), r["p-clean"].title.unique], [[], [], UNIQUE.CLIENT]);
  assert.deepEqual(f("p-no-title", "title"), [FINDING.ABSENT]);
  assert.deepEqual(f("p-empty-desc", "description"), [FINDING.EMPTY]);
  assert.deepEqual(f("p-two-descs", "description"), [FINDING.MULTIPLE]);
  assert.deepEqual([f("p-shared-title-1", "title"), f("p-shared-title-2", "title")], [[FINDING.DUPLICATED], [FINDING.DUPLICATED]]);
  assert.deepEqual([f("p-shared-desc-1", "description"), f("p-shared-desc-2", "description")], [[FINDING.DUPLICATED], [FINDING.DUPLICATED]]);
  assert.deepEqual([r["p-no-body"].measured, r["p-no-body"].why], [false, NO_BODY], "a page with no stored body was reported clean");
  assert.ok(a.results.every((x) => x.overstating === OVERSTATING_NOT_MEASURED), "overstating was reported as measured");
  assert.deepEqual([a.pages, a.measured, a.notMeasured], [9, 8, 1]);
  assert.doesNotMatch(code(SP), /writeFileSync|appendFileSync|createJsonlStore|export function (rewrite|generate|fix)/i, "F38 writes or generates an existing page's title or description");
  /* agreement with the head-elements check, on the same bodies (the limbs both hold) */
  const withBody = FIXTURE_PAGES.filter((p) => p.html);
  const titleCounts = new Map();
  for (const p of withBody) { const t = parseHead(p.html).title; if (t) titleCounts.set(t, (titleCounts.get(t) ?? 0) + 1); }
  const he = withBody.map((p) => HEAD_ELEMENTS.run({ page: { canonical_url: `https://fixture.invalid/${p.pageId}` }, observations: [{ observation_id: `obs:${p.pageId}` }], siteContext: { bodyHtml: p.html, titleCounts, openedAt: AT } })?.summary ?? "");
  const n = (re) => he.filter((s) => re.test(s)).length;
  assert.equal(n(/no <title>/), a.title[FINDING.ABSENT] + a.title[FINDING.EMPTY]);
  assert.equal(n(/no meta description/), a.description[FINDING.ABSENT] + a.description[FINDING.EMPTY]);
  assert.equal(n(/\d+ meta descriptions/), a.description[FINDING.MULTIPLE]);
  assert.equal(n(/title is shared/), a.title[FINDING.DUPLICATED]);
});

/* ================= C6 ================= */
function realVerdict(resolve, tenantId) {
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId, resolve });
  const sm = readTenantPartition({ batchId: SITEMAP_BATCH_ID, tenantId, resolve });
  const declared = declaredScope({ tenantId });
  return scopeCompleteness({ origins: declared.origins, observations: part.records.filter((r) => r.record_type === "observation"), sitemaps: sm.records.filter((r) => r.record_type === "observation"), edges: readPartitionEdges({ batchId: BATCH_ID, observationIds: part.observationIds }), freshnessRule: declared.freshnessRule, now: new Date() });
}
function spyWorld() {
  const asked = [];
  const pages = { [T]: FIXTURE_PAGES.slice(0, 2), [T2]: [{ pageId: "b-page", tenantId: T2, html: body("Fixture opening hours", ["When the fixture office is open."]) }] };
  return { asked, io: { population: ({ tenantId }) => { asked.push(tenantId); return { population: { pages: pages[tenantId] ?? [], completeness: INCOMPLETE_INV }, fault: null }; } } };
}
test("T38-C6 · F38 C6 THE BOUND, ONE TENANT, READ-ONLY: no real tenant's inventory is COMPLETE, so no real result says unique among the client's pages; a COMPLETE fixture may; a two-tenant fixture world reads only its own tenant; F38's path calls out to nothing and writes nothing", () => {
  const resolve = createTenantResolver();
  const tenants = (readDeclarations().tenants ?? []).map((t) => t.tenantId).filter((id) => declaredScope({ tenantId: id }).origins.length > 0);
  assert.ok(tenants.length > 0, "no real tenant was read — the control would prove nothing");
  const tally = {};
  const c = chosen(), d = render(c);
  for (const id of tenants) {
    const v = realVerdict(resolve, id);
    tally[v.state] = (tally[v.state] ?? 0) + 1;
    assert.notEqual(v.state, "COMPLETE");
    const h = headForDraft({ spec: c.d.spec, draft: d, others: NONE, completeness: v });
    assert.equal(h.unique, UNIQUE.RECORDED, "a real result said unique among the client's pages");
    assert.ok(auditExistingPages({ tenantId: T, pages: FIXTURE_PAGES.slice(0, 1), completeness: v }).results.every((x) => x.title.unique !== UNIQUE.CLIENT && x.description.unique !== UNIQUE.CLIENT));
  }
  console.log(`  REAL (count-only, records only): ${tenants.length} tenant(s) · ${Object.entries(tally).map(([k, x]) => `${k} ${x}`).join(" · ")} · every result UNIQUE AMONG RECORDED PAGES`);
  assert.equal(headForDraft({ spec: c.d.spec, draft: d, others: NONE, completeness: COMPLETE_INV }).unique, UNIQUE.CLIENT, "CONTROL: a COMPLETE fixture could not say unique among the client's pages");
  /* two tenants */
  const W = spyWorld();
  const r = readClientHeads({ tenantId: T, chosen: [], io: W.io });
  assert.deepEqual([...new Set(W.asked)], [T], "a read asked for another tenant");
  assert.deepEqual([r.audit.inventory, r.audit.bound], ["INCOMPLETE", INCOMPLETE_INV.bound], "a result lacks its bound");
  assert.ok(r.audit.results.every((x) => x.pageId !== "b-page"));
  const mixed = auditExistingPages({ tenantId: T, pages: [...FIXTURE_PAGES.slice(0, 1), { pageId: "b-page", tenantId: T2, html: FIXTURE_PAGES[0].html }], completeness: COMPLETE_INV });
  assert.deepEqual([mixed.refused.map((x) => x.pageId), mixed.results[0].title.findings], [["b-page"], []], "another tenant's page was read into the audit");
  /* calls out to nothing, writes nothing */
  for (const m of [SP, SE]) assert.deepEqual(decisionCallPaths({ entries: [m] }).faults, [], `${m} can call out`);
  const planted = decisionCallPaths({ entries: [SP], read: (f) => { const t = existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), "utf8") : null; return f === SP ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  const WRITES = /from "node:fs"|writeFileSync|appendFileSync|createWriteStream|createJsonlStore|recordDecision|recordPartition|publish\(/;
  for (const m of [SP, SE]) assert.doesNotMatch(code(m), WRITES, `${m} writes or records`);
  assert.ok(code(SE).includes(`${"read"}ExistingPagePopulation({ scope: { tenantId }, resolve, env, now })`), "F31's reader is handed a scope that can record");
});

/* ================= C7 ================= */
const OTHER_ROWS = Object.freeze({
  "src/page/draft-render.mjs": "fa5ebe27a4dbc8499be502bdfc302b8f584b0ca12b436f95f99f962a99c54a3b",
  "src/page/construct.mjs": "24d1fc41da3ada728b5218d33a54d510994df9f9a72a001e9ceafe97dd440b4f",
  "bin/build-page.mjs": "dd4adb6a99ce4ae648278ed3ca8fda8f9c711ce6295c3d48256dfbd3d3cb3211",
  "src/page/quality-judgements.mjs": "f4511418885bfbb3994e842dd6ba42610e49b8e6368401f0791ca79cb482fda2",
  "src/page/content-brief.mjs": "5771c6955fcc621430391b9c34a525a74673e81a3ff4d3b05cf429d358ad5c06",
  "src/page/content-brief-evidence.mjs": "b1af103909fa3ef4782686380c4d1c5e14c473f5e73e1080f29fb1c06c37abe6",
  "src/page/site-plan.mjs": "8f3101e2bd7fa717bcdb92a15282e408e948699cd0934121da850c767643a393",
  "src/page/site-plan-evidence.mjs": "07130708a534f699c241b8f9696fa85ca10c919a1525b66cf08e98a2f5d40992",
  "src/audit/technical-checks.mjs": "1dd7777395fbda442c175f839fc8c33ac0014bd6aee755fa6486fc5872328494",
});
const lfSha = (f) => createHash("sha256").update(readFileSync(join(REPO, f), "utf8").replace(/\r\n/g, "\n")).digest("hex");
const mjsUnder = (dir) => readdirSync(join(REPO, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? mjsUnder(`${dir}/${e.name}`) : e.name.endsWith(".mjs") ? [`${dir}/${e.name}`] : []));
test("T38-C7 · F38 C7 CHANGES NO OTHER ROW: F37, F40, F41, F94 and the head-elements check byte for byte at base 24069ee3; nothing but F38's own entry point imports F38", () => {
  for (const [f, sha] of Object.entries(OTHER_ROWS)) assert.equal(lfSha(f), sha, `${f} changed — F38 changes no other row's code`);
  const importers = ["src", "bin", "tools"].flatMap(mjsUnder).filter((f) => ![SE, "bin/answer-first.mjs"].includes(f) && /answer-first(-evidence)?\.mjs["']/.test(readFileSync(join(REPO, f), "utf8")));
  assert.deepEqual(importers, [], "another row's code reads F38's head");
  assert.match(STANDING, /changes no other row/);
});

/* ================= [ALL] ================= */
test("T38-ALL · F38 [ALL]: no proof reads a page body of the 27 pages set aside or a real run's output; a run reports only the heads and findings it produced — the census fires on a planted real read", () => {
  const REAL = /readPartitionBodies|readExistingPagePopulation|\bREADERS\b|readClientActionEvidence\(|readClientBriefs\(|first-real-crawl|spawnSync|execFileSync/;
  const src = readFileSync(new URL(import.meta.url), "utf8").replace(/const REAL = [^\n]*\n/, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(src, REAL, "an F38 proof reads a page body or a real run's output");
  assert.match(`const p = ${"read"}ExistingPagePopulation({ scope });`, REAL, "the census cannot see a planted real read");
  for (const call of src.match(/readClientHeads\([^;]*;/g) ?? []) assert.match(call, /io: W\.io/, "a proof runs F38's reader on real data");
  const W = spyWorld();
  const c = chosen();
  const r = readClientHeads({ tenantId: T, chosen: [c.d], io: W.io });
  assert.deepEqual([r.heads.length, r.audit.pages, r.audit.measured], [1, 2, 2]);
  const recount = (part) => Object.fromEntries(Object.values(FINDING).map((k) => [k, r.audit.results.filter((x) => x.measured && x[part].findings.includes(k)).length]));
  assert.deepEqual([r.audit.title, r.audit.description], [recount("title"), recount("description")], "the reported counts are not the results'");
});

test("R38-BOARD · F38 moves only through the production validator and the audit trail: frozen and started under its own acceptance, VERIFIED-PASS only with a REAL VERIFIED event, every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const row = DECLARED.F38;
  assert.deepEqual(row.events.slice(0, 2).map((e) => e.kind), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION"]);
  assert.equal(row.events[0].ruling.commit, "96ae49ef487c0f80d0acfff28fb37030e0e7559c");
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F38" && e.occurredAt.startsWith("2026-10-07")), "F38's movement is not in the trail");
  if (row.state === "VERIFIED-PASS") {
    const v = row.events.find((e) => e.kind === "VERIFIED");
    assert.equal(v.population, "REAL");
    assert.deepEqual(Object.keys(v.clauses), ["C1", "C2", "C3", "C4", "C5", "C6", "C7"]);
    assert.ok(Object.values(v.clauses).every((x) => x === "PROVED"));
  } else assert.equal(row.state, "IN-PROGRESS");
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
