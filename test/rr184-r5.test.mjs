/**
 * 🔴 RR-184 · R5 — F40 · ADAPTIVE PAGE-QUALITY GATE, THE QUALITY JUDGEMENTS OF THE COMPLETE DRAFT F37 BUILDS (acceptance _handoffs 6d64c27,
 * approved by its hash 56832af1…, contract d24b9085…; the owner's decisions I-2 to I-6, RR-184).
 *
 * ONE TEST PER EVIDENCE LINE of the frozen acceptance (C1–C7 and [ALL]); each FAILURE limb has its sabotage in test/helpers/rr184-sabotage.mjs,
 * naming the test it turns red. FIXTURE STRUCTURES ONLY (RR-177): a fixture tenant, two fixture pages, planning rows built by F91's and
 * F16's own functions, drafts rendered by F37's own function. Nothing here writes to the production trail.
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

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const ON = "2026-10-06", AT = `${ON}T00:00:00Z`, NOW = new Date(`${ON}T12:00:00Z`);
const T = "tenant:rr184-fixture", S = "rr184-fixture-subject";
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

/* ================= C1 ================= */
/* ================= C2 ================= */
/* ================= C3 ================= */
/* ================= C4 ================= */
/* ================= C5 ================= */
/* ================= C6 ================= */
test("T40-C6 · F40 C6 NO WORD, FACT-COUNT OR PERCENTAGE THRESHOLD DECIDES: the census over F40's decision path names the six constants and any length or count comparison, and fires on a planted one", () => {
  const SIX = /\b(MIN_UNIQUE_WORDS|MIN_FACTS|MAX_SIBLING_OVERLAP|THIN_UNIQUE_WORD_FLOOR|NEAR_DUPLICATE_THRESHOLD|TEMPLATE_DOMINANCE_THRESHOLD)\b/;
  /* a quota is a count compared to 2 or more (the RR-180 census form); a presence check (> 0) is not a threshold */
  const COUNT = /\b(words?|wordCount|uniqueWords|facts?Count|countFacts)\b[^;\n]*[<>]=?|\.length\s*[<>]=?\s*([2-9]|\d{2,})/;
  const src = code(MODULE);
  assert.doesNotMatch(src, SIX, "F40 imports or reads a threshold constant");
  assert.doesNotMatch(src, COUNT, "F40 decides by a word or fact count");
  assert.doesNotMatch(src, /from "\.\.\/gate-a\/|from "\.\.\/audit\//, "F40 imports Gate A or the audit");
  assert.match(`import { MIN_UNIQUE_WORDS } from "../gate-a/run.mjs";`, SIX, "the census cannot see a planted constant");
  assert.match("if (words.length >= 350) return PASS;", COUNT, "the census cannot see a planted count");
});

/* ================= C7 ================= */
/* ================= [ALL] ================= */
test("T40-ALL · F40 [ALL]: no proof reads the 27 pages set aside or any real partition, and F40 reads no file — the census fires on a planted real read", () => {
  const REAL = /readExistingPagePopulation|createTenantResolver|almi-visibility-data|first-real-crawl|subject\("almi-oet"\)|readClientActionEvidence\(|readClientBriefs\(/;
  const src = readFileSync(new URL(import.meta.url), "utf8").replace(/const REAL = [^\n]*\n/, "").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(src, REAL, "an F40 proof reads a real partition");
  assert.match(`const p = ${"read"}ExistingPagePopulation({ scope });`, REAL, "the census cannot see a planted real read");
  assert.doesNotMatch(code(MODULE), /from "node:(fs|net|http|https|child_process)"|fetch\(|ai-providers/, "F40 reads a file, fetches or reaches a provider");
  assert.doesNotMatch(code(MODULE), REAL, "F40 reads a real partition or the 27 pages");
});

test("R40-BOARD · F40 moves only through the production validator and the audit trail: frozen and started under its own acceptance after its lift, VERIFIED-PASS only with a REAL VERIFIED event, every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const row = DECLARED.F40;
  assert.deepEqual(row.events.slice(0, 4).map((e) => e.kind), ["BLOCKER_RECORDED", "BLOCKER_LIFTED", "ACCEPTANCE_FROZEN", "IMPLEMENTATION"]);
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F40" && e.occurredAt.startsWith("2026-10-06")), "F40's movement is not in the trail");
  if (row.state === "VERIFIED-PASS") {
    /* RR-188: R5's own VERIFIED (under the acceptance as first frozen, C1–C7); the re-proof under Amendment 1 (C1–C8) is R188-BOARD's */
    const v = row.events.find((e) => e.kind === "VERIFIED");
    assert.equal(v.population, "REAL");
    assert.deepEqual(Object.keys(v.clauses), ["C1", "C2", "C3", "C4", "C5", "C6", "C7"]);
    assert.ok(Object.values(v.clauses).every((x) => x === "PROVED"));
  } else assert.equal(row.state, "IN-PROGRESS");
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
