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
import { connectQuestions, coverageRecords, CONNECTION } from "../src/page/demand-connection.mjs";
import { coverageJudgementRecords } from "../src/page/grouped-need-coverage.mjs";
import { possibleCombinations } from "../src/page/page-opportunities.mjs";
import { researchDerivedQuestion, assessmentRecord, ROUTES } from "../src/research/research-derived.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { planSite, planFaults } from "../src/page/site-plan.mjs";
import { readClientSitePlans } from "../src/page/site-plan-evidence.mjs";
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
const navOf = (html) => (html.match(/<nav class="related">[\s\S]*?<\/nav>/g) ?? []);
const hrefs = (html) => navOf(html).flatMap((n) => [...n.matchAll(/<a href="([^"]+)">([^<]*)<\/a>/g)].map((m) => [m[1], m[2]]));
const canonicalOf = (html) => html.match(/<link rel="canonical" href="([^"]+)">/)?.[1] ?? null;

/* ================= C8 ================= */
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
