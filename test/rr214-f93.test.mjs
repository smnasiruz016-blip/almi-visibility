/**
 * 🔴 RR-214 · F93 · TRUST AND IDENTITY SIGNALS (acceptance _handoffs 4938f07, approved by its hash 87522358…, contract a83e76ec…).
 *
 * ONE TEST PER EVIDENCE LINE of the frozen acceptance (C1–C7 and [ALL]); each FAILURE limb has its sabotage in test/helpers/rr214-sabotage.mjs,
 * naming the test it turns red. FIXTURE PAGES ONLY (RR-177): hand-written fixture bodies on a fixture origin, and the RR-184 fixture chain
 * (planning rows by F91's and F16's own functions, F35's own decision, F37's own render) for the new page. The one real read is C6's
 * count-only control on the recorded inventory SHAPES (records, edges, sitemap records, declarations; no page body). Nothing here writes to
 * the production trail.
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
import { SIGNAL, identityOf, kindOf, reachOf, dateOf, visibleDateOf, sourcesOfDraft, sourcesOfPage, auditTrust, planForDraft, NOT_VERIFIED, NO_ORG_RECORD, NO_CITATION_RECORD, DATE_BEFORE_PUBLICATION, STANDING } from "../src/page/trust-signals.mjs";
import { readClientTrust } from "../src/page/trust-signals-evidence.mjs";
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
const T = "tenant:rr214-fixture", S = "rr214-fixture-subject";
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

/* ---- RR-214 · F93 · the fixture site (never the 27 pages): one tenant, one origin; bodies written by hand ---- */
const TS = "src/page/trust-signals.mjs", TE = "src/page/trust-signals-evidence.mjs";
const A = "https://trust-fixture.invalid";
const T2 = "tenant:rr214-other";
const COMPLETE_INV = { state: "COMPLETE", bound: "the fixture inventory (RR-177)" };
const INCOMPLETE_INV = { state: "INCOMPLETE", bound: "the fixture inventory, one listed URL unobserved (RR-177)" };
const html = (head = "", body = "") => `<html><head>${head}</head><body><h1>A fixture page</h1>${body}</body></html>`;
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`;
const pg = (pageId, path, h = html(), fingerprints = [{ sha256: "s1", observedAt: "2026-09-01T00:00:00Z" }], tenantId = T) => ({ pageId, tenantId, url: `${A}${path}`, html: h, fingerprints });
const ok = [{ status: 200, error: null, skipped: false }];
const recs = (map) => (u) => map[u] ?? [];
const SITE = [pg("p-home", "/"), pg("p-about", "/about"), pg("p-contact", "/contact"), pg("p-guide", "/guides/renewal")];
const EDGES = [{ fromPageId: "p-guide", toUrl: `${A}/about` }, { fromPageId: "p-guide", toUrl: `${A}/contact` }];
const SERVED = recs({ [`${A}/about`]: ok, [`${A}/contact`]: ok });
const SIGNALS = new Set(Object.values(SIGNAL));

/* ================= C1 ================= */
test("T93-C1 · F93 C1 WHO IS RESPONSIBLE: each identity marker PRESENT and named; none — ABSENT, a finding; credentials and experience NOT MEASURED on every page; a new page with no recorded organisation — ABSENT, nothing invented", () => {
  const cases = [
    [html('<meta name="author" content="Fixture Desk">'), ["meta-author"]],
    [html('<link rel="author" href="/team">'), ["rel-author"]],
    [html(ld({ "@type": "Article", author: { name: "Fixture Writer" } })), ["structured-data-author"]],
    [html(ld({ "@type": "Article", publisher: { name: "Fixture Board" } })), ["structured-data-publisher"]],
  ];
  for (const [h, markers] of cases) assert.deepEqual([identityOf(h).signal, [...identityOf(h).markers]], [SIGNAL.PRESENT, markers]);
  for (const h of [html(), html('<meta name="author" content="">'), html('<meta name="keywords" content="renewal">')]) {
    const r = identityOf(h);
    assert.deepEqual([r.signal, r.markers.length], [SIGNAL.FINDING, 0], "an identity marker was reported that the body does not hold");
    assert.match(r.why, /no identity marker/);
  }
  for (const [h] of cases) assert.equal(identityOf(h).credentials, NOT_VERIFIED);
  const c = chosen();
  const d = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: null });
  const none = planForDraft({ draft: d, organisation: null, pages: SITE, recordsOf: SERVED, tenantId: T, completeness: COMPLETE_INV });
  assert.deepEqual([none.identity.signal, none.identity.why, none.identity.credentials], [SIGNAL.FINDING, NO_ORG_RECORD, NOT_VERIFIED]);
  assert.ok(!JSON.stringify(none).includes("Fixture Writer") && !("organisation" in none.identity), "an identity was invented for a new page");
  const rec = planForDraft({ draft: d, organisation: { name: "Fixture Licensing Board", ref: "declaration:fixture:organisation" }, pages: SITE, recordsOf: SERVED, tenantId: T, completeness: COMPLETE_INV });
  assert.deepEqual([rec.identity.signal, rec.identity.organisation, rec.identity.ref], [SIGNAL.PRESENT, "Fixture Licensing Board", "declaration:fixture:organisation"], "CONTROL: a recorded organisation was not carried");
  assert.doesNotMatch(code(TS), /export function (write|add|generate|invent)\w*/i);
});

/* ================= C2 ================= */
test("T93-C2 · F93 C2 REACHABLE ABOUT AND CONTACT: recorded WORKING pages linked — reachable; an unobserved contact URL — NOT MEASURED; a contact page recorded broken — a finding; no such link — a finding; a word outside the declared list — NOT MEASURED; a new page's plan names the WORKING pages", () => {
  const a = auditTrust({ tenantId: T, pages: SITE, edges: EDGES, recordsOf: SERVED, completeness: COMPLETE_INV });
  const g = a.results.find((r) => r.pageId === "p-guide");
  assert.deepEqual([g.about.signal, g.contact.signal], [SIGNAL.REACHABLE, SIGNAL.REACHABLE]);
  assert.deepEqual([kindOf(`${A}/about`), kindOf(`${A}/contact-us`), kindOf(`${A}/about-our-team`), kindOf(`${A}/guides/renewal`)], ["about", "contact", null, null]);
  const unobserved = reachOf({ pageId: "p-x", kind: "contact", edges: [{ fromPageId: "p-x", toUrl: `${A}/contact-us` }], recordsOf: SERVED });
  assert.equal(unobserved.signal, SIGNAL.NOT_MEASURED, "an unobserved contact URL was reported reachable");
  const broken = reachOf({ pageId: "p-guide", kind: "contact", edges: EDGES, recordsOf: recs({ [`${A}/contact`]: [{ status: 404, error: null, skipped: false }] }) });
  assert.deepEqual([broken.signal], [SIGNAL.FINDING], "a contact page recorded broken was reported reachable");
  for (const [code_, status] of [[301, "REDIRECTED"], [null, "NOT SERVED"]]) {
    const r = reachOf({ pageId: "p-guide", kind: "contact", edges: EDGES, recordsOf: recs({ [`${A}/contact`]: [{ status: code_, error: code_ ? null : "connection reset", skipped: false }] }) });
    assert.equal(r.signal, SIGNAL.FINDING, `a contact page recorded ${status} was reported reachable`);
  }
  assert.equal(a.results.find((r) => r.pageId === "p-home").about.signal, SIGNAL.FINDING, "a page linking to no about page carried no finding");
  const near = reachOf({ pageId: "p-x", kind: "about", edges: [{ fromPageId: "p-x", toUrl: `${A}/about-our-team` }], recordsOf: recs({ [`${A}/about-our-team`]: ok }) });
  assert.deepEqual([near.signal], [SIGNAL.NOT_MEASURED], "a word outside the declared list was decided");
  const c = chosen();
  const plan = planForDraft({ draft: renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: null }), pages: SITE, recordsOf: SERVED, tenantId: T, completeness: COMPLETE_INV });
  assert.deepEqual([plan.about.link, plan.contact.link], [["p-about"], ["p-contact"]]);
  const noPages = planForDraft({ draft: null, pages: [SITE[0], SITE[3]], recordsOf: SERVED, tenantId: T });
  assert.deepEqual([noPages.about.signal, noPages.contact.signal], [SIGNAL.FINDING, SIGNAL.FINDING]);
});

/* ================= C3 ================= */
test("T93-C3 · F93 C3 A DATED UPDATE: a visible date between the latest recorded change and the latest observation MATCHES; earlier or later — a finding; one fingerprint — NOT MEASURED; no date — a finding; a new page — NOT MEASURED, no date invented", () => {
  const FP = [{ sha256: "a", observedAt: "2026-09-01T00:00:00Z" }, { sha256: "b", observedAt: "2026-09-20T00:00:00Z" }, { sha256: "b", observedAt: "2026-09-28T00:00:00Z" }];
  const at = (d) => dateOf({ html: html("", `<p>Updated <time datetime="${d}">then</time></p>`), fingerprints: FP });
  assert.deepEqual([at("2026-09-25").signal, at("2026-09-25").latestChange, at("2026-09-25").latestObservation], [SIGNAL.MATCHES, "2026-09-20", "2026-09-28"]);
  assert.equal(at("2026-09-10").signal, SIGNAL.FINDING, "a date earlier than the latest change was reported as matching");
  assert.equal(at("2026-09-30").signal, SIGNAL.FINDING, "a date later than the latest observation was reported as matching");
  assert.equal(dateOf({ html: html(ld({ "@type": "WebPage", dateModified: "2026-09-21T10:00:00Z" })), fingerprints: FP }).signal, SIGNAL.MATCHES);
  assert.equal(dateOf({ html: html("", "<p>Last updated: 22 September 2026</p>"), fingerprints: FP }).signal, SIGNAL.MATCHES);
  const one = dateOf({ html: html("", '<time datetime="2026-09-25">x</time>'), fingerprints: FP.slice(0, 1) });
  assert.deepEqual([one.signal], [SIGNAL.NOT_MEASURED], "a match was decided with fewer than two fingerprints");
  const none = dateOf({ html: html(), fingerprints: FP });
  assert.deepEqual([none.signal], [SIGNAL.FINDING]);
  assert.equal(visibleDateOf(html()), null, "a date was reported that the body does not hold");
  const c = chosen();
  const plan = planForDraft({ draft: renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: null }), pages: SITE, recordsOf: SERVED, tenantId: T });
  assert.deepEqual([plan.date.signal, plan.date.why], [SIGNAL.NOT_MEASURED, DATE_BEFORE_PUBLICATION]);
});

/* ================= C4 ================= */
test("T93-C4 · F93 C4 TRANSPARENT SOURCES: F37's every-claim-sourced record read unchanged; a draft whose record says a claim lacks its source — reported as that record says; an existing page with no citation verdict — NOT MEASURED; with a recorded verdict — that verdict", () => {
  const c = chosen();
  const d = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: null });
  const s = sourcesOfDraft(d);
  assert.deepEqual([s.signal, s.record], [SIGNAL.PRESENT, { ...d.checks.everyClaimSourced }]);
  const failing = { ...d, checks: { ...d.checks, everyClaimSourced: { state: "FAIL", why: "a written claim lacks its source or its trace" } } };
  assert.deepEqual([sourcesOfDraft(failing).signal, sourcesOfDraft(failing).record], [SIGNAL.FINDING, { state: "FAIL", why: "a written claim lacks its source or its trace" }], "F37's record was re-judged or changed");
  assert.deepEqual([sourcesOfPage("p-guide", []).signal, sourcesOfPage("p-guide", []).why], [SIGNAL.NOT_MEASURED, NO_CITATION_RECORD]);
  assert.deepEqual([sourcesOfPage("p-guide", [{ pageId: "p-guide", verdict: "PASS", ref: "verdict:fixture" }]).signal], [SIGNAL.PRESENT]);
  assert.deepEqual([sourcesOfPage("p-guide", [{ pageId: "p-guide", verdict: "FAIL", ref: "verdict:fixture" }]).signal], [SIGNAL.FINDING]);
});

/* ================= C5 ================= */
test("T93-C5 · F93 C5 A MISSING SIGNAL IS A FINDING, NEVER INVENTED: every fixture page's every signal is PRESENT, REACHABLE, MATCHES, a FINDING or NOT MEASURED, each with its evidence or reason; F93 writes nothing", () => {
  const pages = [...SITE, pg("p-dated", "/guides/dated", html('<meta name="author" content="Desk">', '<time datetime="2026-09-25">x</time>'), [{ sha256: "a", observedAt: "2026-09-01T00:00:00Z" }, { sha256: "b", observedAt: "2026-09-20T00:00:00Z" }, { sha256: "b", observedAt: "2026-09-28T00:00:00Z" }])];
  const a = auditTrust({ tenantId: T, pages, edges: EDGES, recordsOf: SERVED, completeness: INCOMPLETE_INV });
  for (const r of a.results) for (const k of ["identity", "about", "contact", "date", "sources"]) {
    assert.ok(SIGNALS.has(r[k]?.signal), `${r.pageId}.${k} has no lawful signal`);
    assert.ok(r[k].signal === SIGNAL.PRESENT || r[k].signal === SIGNAL.REACHABLE || r[k].signal === SIGNAL.MATCHES || (typeof r[k].why === "string" && r[k].why !== ""), `${r.pageId}.${k} carries no reason`);
  }
  assert.equal(a.results.find((r) => r.pageId === "p-dated").date.signal, SIGNAL.MATCHES);
  const WRITES = /from "node:fs"|writeFileSync|appendFileSync|createWriteStream|createJsonlStore|recordDecision|recordPartition|publish\(/;
  for (const m of [TS, TE]) assert.doesNotMatch(code(m), WRITES, `${m} writes or records`);
  assert.match('import { writeFileSync } from "node:fs";', WRITES, "the census cannot see a planted write");
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
  const pagesOf = { [T]: SITE, [T2]: [pg("b-about", "/about", html(), undefined, T2)] };
  const io = {
    population: ({ tenantId }) => { asked.push(tenantId); return { population: { pages: (pagesOf[tenantId] ?? []).map((p) => ({ pageId: p.pageId, tenantId: p.tenantId, html: p.html })), completeness: INCOMPLETE_INV, inventory: { pages: (pagesOf[tenantId] ?? []).map((p) => ({ pageId: p.pageId, fingerprints: p.fingerprints })) } }, fault: null }; },
    partition: ({ tenantId }) => { asked.push(tenantId); return { records: (pagesOf[tenantId] ?? []).map((p) => ({ record_type: "page", page_id: p.pageId, canonical_url: p.url, observations: [`o-${p.pageId}`] })), observationIds: (pagesOf[tenantId] ?? []).map((p) => `o-${p.pageId}`) }; },
    edges: () => [{ from_observation_id: "o-p-guide", to: `${A}/about` }],
    organisation: ({ tenantId }) => { asked.push(tenantId); return null; },
  };
  return { io, asked };
}
test("T93-C6 · F93 C6 THE BOUND, ONE TENANT, READ-ONLY: no real tenant's inventory is COMPLETE, so no real result says the site has no about or contact page; a COMPLETE fixture may; a two-tenant fixture world reads only its own tenant; F93 calls out to nothing", () => {
  const resolve = createTenantResolver();
  const tenants = (readDeclarations().tenants ?? []).map((t) => t.tenantId).filter((id) => declaredScope({ tenantId: id }).origins.length > 0);
  assert.ok(tenants.length > 0, "no real tenant was read — the control would prove nothing");
  const tally = {};
  const bare = [SITE[0], SITE[3]];
  for (const id of tenants) {
    const v = realVerdict(resolve, id);
    tally[v.state] = (tally[v.state] ?? 0) + 1;
    assert.notEqual(v.state, "COMPLETE");
    const a = auditTrust({ tenantId: T, pages: bare, edges: [], recordsOf: SERVED, completeness: v });
    assert.deepEqual([a.site.siteHasNoAboutPage, a.site.siteHasNoContactPage], [SIGNAL.NOT_MEASURED, SIGNAL.NOT_MEASURED], "a real result said the site has no about or contact page");
    assert.equal(a.bound.state, v.state);
  }
  console.log(`  REAL (count-only, records only): ${tenants.length} tenant(s) · ${Object.entries(tally).map(([k, x]) => `${k} ${x}`).join(" · ")} · no result claims a page the inventory does not hold`);
  assert.deepEqual(auditTrust({ tenantId: T, pages: bare, completeness: COMPLETE_INV }).site.siteHasNoAboutPage, true, "CONTROL: a COMPLETE fixture could not decide it");
  assert.deepEqual([auditTrust({ tenantId: T, pages: SITE, completeness: INCOMPLETE_INV }).site.aboutPageRecorded], [true]);
  const W = spyWorld();
  const r = readClientTrust({ tenantId: T, chosen: [], io: W.io });
  assert.deepEqual([...new Set(W.asked)], [T], "a read asked for another tenant");
  assert.deepEqual([r.audit.pages, r.audit.bound.state, r.audit.bound.text], [4, "INCOMPLETE", INCOMPLETE_INV.bound], "a result lacks its bound");
  const mixed = auditTrust({ tenantId: T, pages: [...SITE, pg("b-page", "/b", html(), undefined, T2)], completeness: COMPLETE_INV });
  assert.deepEqual([mixed.refused.map((x) => x.pageId), mixed.pages], [["b-page"], 4], "another tenant's page was read into the audit");
  for (const m of [TS, TE]) assert.deepEqual(decisionCallPaths({ entries: [m] }).faults, [], `${m} can call out`);
  const planted = decisionCallPaths({ entries: [TS], read: (f) => { const t = existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), "utf8") : null; return f === TS ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
  assert.ok(code(TE).includes(`${"read"}ExistingPagePopulation({ scope: { tenantId }, resolve, env, now })`), "F31's reader is handed a scope that can record");
  assert.doesNotMatch(code(TE), /construct\.mjs|\/render\.mjs/, "F93 imports a page producer (F34's page-path census)");
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
  "src/page/answer-first.mjs": "b5f49a4990243970152ddc1af14dbe6e73b0cb692d512b41b10f68a282114a1f",
  "src/page/answer-first-evidence.mjs": "7f5e9748bfa666ad97edd4c758999b1f1eedb3ad52aadc9a0b447e64d0ca8c2d",
  "src/audit/link-audit.mjs": "ff1361bc9339d7cb811208c24d05fcd3f255567e7e8e20202ac9ada6e91a4206",
  "src/audit/link-audit-reader.mjs": "714a7d9107a490f259219369d9aa0094d159ad3468e9b5fb587e5e81f4c12c75",
  "src/facts/citation-audit.mjs": "1833508d0476f808b5394941a2d225b59da546fa205738af688224d44a5afa94",
});
const lfSha = (f) => createHash("sha256").update(readFileSync(join(REPO, f), "utf8").replace(/\r\n/g, "\n")).digest("hex");
const mjsUnder = (dir) => readdirSync(join(REPO, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? mjsUnder(`${dir}/${e.name}`) : e.name.endsWith(".mjs") ? [`${dir}/${e.name}`] : []));
test("T93-C7 · F93 C7 CHANGES NO OTHER ROW: F37, F38, F40, F41, F46, F23 and F94 byte for byte at base 87591a97; nothing but F93's own entry point imports F93", () => {
  for (const [f, sha] of Object.entries(OTHER_ROWS)) assert.equal(lfSha(f), sha, `${f} changed — F93 changes no other row's code`);
  const importers = ["src", "bin", "tools"].flatMap(mjsUnder).filter((f) => ![TE, "bin/trust-signals.mjs"].includes(f) && /trust-signals(-evidence)?\.mjs["']/.test(readFileSync(join(REPO, f), "utf8")));
  assert.deepEqual(importers, [], "another row's code reads F93's plan");
  assert.match(STANDING, /changes no other row/);
});

/* ================= [ALL] ================= */
test("T93-ALL · F93 [ALL]: no proof reads a page body of the 27 pages set aside or a real run's output; a run reports only the findings it produced — the census fires on a planted real read", () => {
  const REAL = /readPartitionBodies|readExistingPagePopulation|\bREADERS\b|readClientActionEvidence\(|readClientBriefs\(|first-real-crawl|spawnSync|execFileSync/;
  const src = readFileSync(new URL(import.meta.url), "utf8").replace(/const REAL = [^\n]*\n/, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(src, REAL, "an F93 proof reads a page body or a real run's output");
  assert.match(`const p = ${"read"}ExistingPagePopulation({ scope });`, REAL, "the census cannot see a planted real read");
  for (const call of src.match(/readClientTrust\([^;]*;/g) ?? []) assert.match(call, /io: W\.io/, "a proof runs F93's reader on real data");
  const W = spyWorld();
  const c = chosen();
  const r = readClientTrust({ tenantId: T, chosen: [c.d], io: W.io });
  assert.deepEqual([r.plans.length, r.audit.measured], [1, 4]);
  const recount = (part) => r.audit.results.filter((x) => x.measured).reduce((m, x) => ((m[x[part].signal] = (m[x[part].signal] ?? 0) + 1), m), {});
  for (const part of ["identity", "about", "contact", "date", "sources"]) assert.deepEqual(r.audit.counts[part], recount(part), `the reported ${part} counts are not the results'`);
  assert.equal(r.organisationRecorded, false);
});

test("R93-BOARD · F93 moves only through the production validator and the audit trail: frozen and started under its own acceptance, VERIFIED-PASS only with a REAL VERIFIED event, every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const row = DECLARED.F93;
  assert.deepEqual(row.events.slice(0, 2).map((e) => e.kind), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION"]);
  assert.equal(row.events[0].ruling.commit, "4938f071a5823c42a25730a073436e795a39c244");
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F93" && e.occurredAt.startsWith("2026-10-08")), "F93's movement is not in the trail");
  if (row.state === "VERIFIED-PASS") {
    const v = row.events.find((e) => e.kind === "VERIFIED");
    assert.equal(v.population, "REAL");
    assert.deepEqual(Object.keys(v.clauses), ["C1", "C2", "C3", "C4", "C5", "C6", "C7"]);
    assert.ok(Object.values(v.clauses).every((x) => x === "PROVED"));
  } else assert.equal(row.state, "IN-PROGRESS");
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
