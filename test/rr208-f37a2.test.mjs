/**
 * 🔴 RR-208 · F37 · ACCEPTANCE AMENDMENT 2 (_handoffs f9edf2a, approved by its hash 9c6c9d90…, contract 9120e6b5…) — C8: the draft takes its
 * internal links and its URL ONLY from F94's plan for that page; a PARTIAL plan is labelled; no plan is said, never invented.
 *
 * ONE TEST FOR C8's EVIDENCE LINE (C1–C7 keep theirs in test/rr180-r4b.test.mjs and test/rr186-r5b.test.mjs, re-run under Amendment 2) and the
 * board test; each FAILURE limb has its sabotage in test/helpers/rr208-sabotage.mjs. FIXTURE PAGES ONLY (RR-177): the RR-184 fixture chain (planning
 * rows by F91's and F16's own functions, F35's own decision, F37's own render) and F94's OWN plan over a fixture site. The one real read is C8's
 * count-only real-path control. Nothing here writes to the production trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
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
import { planSite, planFaults } from "../src/page/site-plan.mjs";
import { readClientSitePlans } from "../src/page/site-plan-evidence.mjs";
import { planFor } from "../src/page/construct.mjs";
import { CHECK } from "../src/page/draft-render.mjs";
import { METHOD_SOURCE } from "../src/page/quality-judgements.mjs";
import { scopeCompleteness } from "../src/crawl/scope-completeness.mjs";
import { readClientActionEvidence } from "../src/page/action-evidence.mjs";
import { NO_RECORDED_DECAY_EVIDENCE } from "../src/page/content-decay-evidence.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { subject } from "./support/subjects.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const ON = "2026-10-06", AT = `${ON}T00:00:00Z`, NOW = new Date(`${ON}T12:00:00Z`);
const T = "tenant:rr208-fixture", S = "rr208-fixture-subject";
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
const html256 = (h) => createHash("sha256").update(h).digest("hex");
const lfSha = (f) => html256(readFileSync(join(REPO, f), "utf8").replace(/\r\n/g, "\n"));
/* F40's criteria and method sources as Amendment 1 pinned them (test/rr188-r5c.test.mjs PIN.criteria); F94's code at base 4a74689a (LF) */
const F40_CRITERIA = "6b734b4577090f6209368b56f3d98ab17adb5da8c070e3bd8aac6fd6c523827f";
const F94_PLAN_AT_BASE = "8f3101e2bd7fa717bcdb92a15282e408e948699cd0934121da850c767643a393", F94_EVIDENCE_AT_BASE = "07130708a534f699c241b8f9696fa85ca10c919a1525b66cf08e98a2f5d40992";

/* ---- RR-208 · F94's OWN plan for the chosen need, over a fixture site (never the 27 pages): the hub-less spokes of need "one" under /guides ---- */
const A = "https://fixture-world.invalid";
const SITE = [
  { pageId: "fixture-root", tenantId: T, url: `${A}/`, covers: [] },
  { pageId: "fixture-guides", tenantId: T, url: `${A}/guides`, covers: [] },
  { pageId: "fixture-page-a", tenantId: T, url: `${A}/guides/hours`, covers: ["one"] },
  { pageId: "fixture-page-b", tenantId: T, url: `${A}/guides/contact`, covers: ["one"] },
];
const ok200 = (u) => (SITE.some((p) => p.url === u || `${p.url}/` === u) ? [{ status: 200, error: null, skipped: false }] : []);
const obs = (id, url) => ({ record_type: "observation", observation_id: id, observed_at: AT, value: { requested_url: url, final_url: url, status: 200, redirect_chain: [], truncated: false } });
const inventory = (extra = []) => scopeCompleteness({ origins: [A], observations: SITE.map((p, i) => obs(`o${i}`, p.url)), sitemaps: [{ record_type: "observation", observation_id: "sm", observed_at: AT, value: { origin: A, urls: [...SITE.map((p) => p.url), ...extra], coverageState: "COMPLETE", childrenSkipped: 0, urlsTotal: SITE.length + extra.length, urlsStored: SITE.length + extra.length } }], edges: [], freshnessRule: { freshnessDays: 30 }, now: NOW });
const f94Plan = (c, { complete = true, pages = SITE } = {}) => planSite({ tenantId: T, subject: { decision: c.d.decision, slug: c.d.slug, need: "one" }, pages, edges: [], recordsOf: ok200, completeness: complete ? inventory() : inventory([`${A}/guides/unobserved`]), origins: [A] });
/** the production path: construction reads F35's chosen spec and F94's plans; the draft is F37's own render of it with the plan for its need */
function built(c, plans) {
  const r = constructCandidates({ pageSpecs: {}, variants: PRODUCT.variants, records: [], requested: [c.d.slug], tenantId: T, existingPages: POP, gainEvidence: gainFor(c.d.slug), decisions: decisionsForConstruction({ compiled: c.g.compiled }).decisions, plans, now: NOW });
  const d = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: planFor(plans, c.d.decision) });
  const q = judgeDraft({ spec: c.d.spec, decision: c.d.decision, draft: d, parts: r.find((x) => x.slug === c.d.slug)?.parts, population: POPULATION.FIXTURE });
  return { r, d, q };
}
const navOf = (html) => (html.match(/<nav class="related">[\s\S]*?<\/nav>/g) ?? []);
const hrefs = (html) => navOf(html).flatMap((n) => [...n.matchAll(/<a href="([^"]+)">([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]));
const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]+)">/)?.[1] ?? null;

/* ================= C8 ================= */
test("T37-C8 · F37 C8 (Amendment 2) THE PLAN INTO THE DRAFT: over a COMPLETE fixture inventory exactly the plan's links and URL, both checks PASS; over an INCOMPLETE one the same, labelled PARTIAL inside the related-pages navigation, both checks NOT MEASURED; with no plan a visible UNKNOWN part and no link or URL; another need's plan, a planted link and a NOT MEASURED URL are never rendered; F40's filler and repetition PASS on each", () => {
  const c = chosen();
  /* COMPLETE */
  const plan = f94Plan(c);
  assert.deepEqual(planFaults(plan, { tenantId: T, pages: SITE, origins: [A], recordsOf: ok200 }), [], "F94 refuses its own fixture plan");
  assert.equal(plan.complete, true);
  const full = built(c, [plan]);
  assert.deepEqual(hrefs(full.d.html), plan.linksOut.map((l) => [l.url, l.url]), "the draft's links are not exactly the plan's (the visible text is the recorded URL)");
  assert.equal(canonicalOf(full.d.html), plan.url.url);
  assert.deepEqual([full.d.checks.internalLinks.state, full.d.checks.technical.state, full.d.plan.state], [CHECK.PASS, CHECK.PASS, "COMPLETE"]);
  assert.doesNotMatch(full.d.html, /PARTIAL|no F94 plan/);
  /* INCOMPLETE → PARTIAL */
  const partialPlan = f94Plan(c, { complete: false });
  assert.equal(partialPlan.complete, false);
  const partial = built(c, [partialPlan]);
  assert.deepEqual(hrefs(partial.d.html), partialPlan.linksOut.map((l) => [l.url, l.url]));
  assert.equal(canonicalOf(partial.d.html), partialPlan.url.url);
  assert.equal(navOf(partial.d.html).length, 1);
  assert.match(navOf(partial.d.html)[0], /<p class="plan-partial">PARTIAL — this site plan stands on an INCOMPLETE inventory/, "the PARTIAL plan is not labelled inside the navigation");
  assert.deepEqual([partial.d.checks.internalLinks.state, partial.d.checks.technical.state], [CHECK.NOT_MEASURED, CHECK.NOT_MEASURED], "a PARTIAL plan passed a check");
  assert.match(partial.d.checks.technical.why, /uniqueness NOT MEASURED/);
  /* no plan */
  const none = built(c, []);
  assert.deepEqual([navOf(none.d.html).length, canonicalOf(none.d.html), hrefs(none.d.html).length], [0, null, 0], "a link or URL was rendered with no plan");
  assert.match(none.d.html, /<p class="unknown" data-claim-id="none">UNKNOWN — no F94 plan is recorded for this page — its internal links and its URL are NOT MEASURED<\/p>/);
  assert.deepEqual([none.d.checks.internalLinks.state, none.d.checks.technical.state], [CHECK.NOT_MEASURED, CHECK.NOT_MEASURED]);
  /* controls: another need's plan; a planted link without a reason; a planted broken target; a plan whose URL is NOT MEASURED */
  const other = { ...plan, subject: { ...plan.subject, ref: "F35:CREATE:need:another" } };
  const planted = { ...plan, linksOut: [...plan.linksOut, { pageId: "fixture-invented", url: `${A}/guides/invented`, reason: null, targetStatus: "WORKING" }] };
  const broken = { ...plan, linksOut: [{ ...plan.linksOut[0], targetStatus: "BROKEN" }] };
  /* another need's plan: construction never hands it (planFor), and the render refuses it when handed directly */
  assert.equal(planFor([other], c.d.decision), null, "construction would hand another need's plan to the draft");
  assert.equal(planFor([other, plan], c.d.decision), plan, "construction does not pick the plan for its own need");
  assert.equal(built(c, [other]).d.plan.state, "ABSENT", "construction handed another need's plan to the draft");
  for (const [x, why] of [[other, /not this page(?:'|&#39;)s plan/], [planted, /a link F94 would not plan/], [broken, /a link F94 would not plan/]]) {
    const d = x === other ? renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: other }) : built(c, [x]).d;
    assert.deepEqual([navOf(d.html).length, canonicalOf(d.html), d.plan.state], [0, null, "ABSENT"], "a plan that is not this page's, or carries a link F94 would not plan, was read");
    assert.match(d.html, why);
  }
  const noUrl = built(c, [{ ...plan, url: { state: "NOT MEASURED", url: null, missing: "a structure the site uses", readFrom: [] } }]).d;
  assert.equal(canonicalOf(noUrl.html), null, "a URL was rendered the plan does not hold");
  assert.match(noUrl.html, /<p class="unknown" data-claim-id="none">UNKNOWN — the plan(?:'|&#39;)s URL is NOT MEASURED \(missing: a structure the site uses\) in the F94 plan — the page(?:'|&#39;)s URL is NOT MEASURED<\/p>/);
  assert.equal(noUrl.checks.technical.state, CHECK.NOT_MEASURED);
  /* F40's unchanged filler and repetition on each render: the label and the notice sit only in parts its criterion names */
  for (const [name, x] of [["complete", full], ["partial", partial], ["none", none]]) {
    assert.deepEqual([x.q.judgements.filler.verdict, x.q.judgements.repetition.verdict], [VERDICT.PASS, VERDICT.PASS], `F40 judged the ${name} render filler or repetition: ${x.q.judgements.filler.observation}`);
  }
  /* the runner (bin/build-page.mjs): construction and F40's judged draft both read F94's plans for the run's tenant — and nothing else */
  const bp = readFileSync(join(REPO, "bin/build-page.mjs"), "utf8");
  assert.match(bp, /const sitePlans = readClientSitePlans\(\{ tenantId: SCOPE\.tenantId, /, "the runner does not read F94's plans for its own tenant");
  assert.match(bp, /decisions: chosen\.decisions [^\n]*, plans \/\* F37 C8/, "construction is not handed F94's plans");
  assert.match(bp, /draft: renderCompiledDraft\(\{ spec: d\.spec, decision: d\.decision, plan: planFor\(plans, d\.decision\) \}\)/, "F40's judged draft is not rendered with its F94 plan");
  assert.doesNotMatch(bp, /\blinks: (null|\{)/, "the runner still hands a draft hand-made links");
  /* F40's and F94's frozen code, byte for byte */
  assert.equal(html256(JSON.stringify({ CRITERIA, METHOD_SOURCE })), F40_CRITERIA, "F40's criteria changed");
  assert.equal(lfSha("src/page/site-plan.mjs"), F94_PLAN_AT_BASE, "F94's plan code changed");
  assert.equal(lfSha("src/page/site-plan-evidence.mjs"), F94_EVIDENCE_AT_BASE, "F94's reader changed");
});

test("T37-C8-REAL · F37 C8 the real-path control, count-only, no trail write: what a real draft receives today — no real plan exists, so the no-plan notice", async () => {
  const resolve = createTenantResolver();
  const tenantId = resolveSide(resolve, RESOURCES.subject("almi-oet")).tenantId;
  const product = await subject("almi-oet");
  const { records } = await loadRegistry(product.factsDir, product.productId);
  const ae = readClientActionEvidence({ tenantId, product, records, resolve, reviews: [], decayEvidence: NO_RECORDED_DECAY_EVIDENCE });
  const r = readClientSitePlans({ tenantId, actionEvidence: ae, values: product.variants ?? [], resolve });
  assert.equal(r.fault, null);
  const chosenReal = ae.compiled?.forConstruction ?? [];
  console.log(`  REAL (count-only): ${r.records.pages} recorded page(s) · ${r.records.edges} link(s) · inventory ${r.records.completeness} · F35 chose ${chosenReal.length} CREATE · F94 plans ${r.plans.length}`);
  for (const d of chosenReal) assert.equal(planFor(r.plans, d.decision)?.complete ?? false, false, "a real plan was presented as complete");
  if (!r.plans.length) {
    const c = chosen();
    const d = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, plan: planFor(r.plans, c.d.decision) });
    assert.deepEqual([d.plan.state, d.checks.internalLinks.state, d.checks.technical.state], ["ABSENT", CHECK.NOT_MEASURED, CHECK.NOT_MEASURED], "with no real plan the draft did not say so");
  }
});

test("R37-A2-BOARD · F37 moves only through the production validator and the audit trail: Amendment 2 frozen alone, an explicit REOPENED, VERIFIED-PASS only with a REAL VERIFIED event after it, every clause C1–C8 PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const row = DECLARED.F37;
  const i = row.events.findIndex((e) => e.kind === "ACCEPTANCE_AMENDED" && e.contractSha256 === "9120e6b545742b34e72e7cda799601ab560373c59cceadbb96b83857de7b7d2e");
  assert.ok(i > 0, "Amendment 2's freeze is not on F37's row");
  assert.deepEqual([row.events[i + 1]?.kind, row.events[i + 1]?.reason], ["REOPENED", "AUTHORITATIVE_REQUIREMENT_CHANGE"]);
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.action === "REOPENED" && e.metadata?.featureId === "F37" && e.occurredAt.startsWith("2026-10-07")), "F37's reopen is not in the trail");
  const after = row.events.slice(i + 2);
  if (row.state === "VERIFIED-PASS") {
    const v = after.find((e) => e.kind === "VERIFIED");
    assert.equal(v?.population, "REAL");
    assert.deepEqual(Object.keys(v.clauses), ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"]);
    assert.ok(Object.values(v.clauses).every((x) => x === "PROVED"));
  } else assert.equal(row.state, "IN-PROGRESS");
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
