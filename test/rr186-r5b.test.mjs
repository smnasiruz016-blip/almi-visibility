/**
 * 🔴 RR-186 · R5b — F37 ACCEPTANCE AMENDMENT 1, C7 · EACH DISTINCT CLAIM ONCE; LATER MENTIONS REFER BACK (acceptance _handoffs 998ef05,
 * approved by its hash 3be6e3bd…, contract 4f98d214…; the owner's ruling in RR-185).
 *
 * ONE TEST FOR THE C7 EVIDENCE LINE (C1–C6 keep theirs in test/rr180-r4b.test.mjs); each C7 FAILURE limb has its sabotage in
 * test/helpers/rr186-sabotage.mjs. FIXTURE STRUCTURES ONLY (RR-177): planning rows by F91's and F16's own functions, drafts by F37's own
 * render, judged by F40's UNCHANGED judgements. Nothing here writes to the production trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { renderCompiledDraft } from "../src/page/draft-render.mjs";
import { judgeDraft, CRITERIA, METHOD_SOURCE, VERDICT, POPULATION } from "../src/page/quality-judgements.mjs";
import { assessPage, STATE as MARKUP } from "../src/page/structured-data.mjs";
import { decideGroupedNeeds } from "../src/page/action-evidence.mjs";
import { constructCandidates, decisionsForConstruction } from "../src/page/construct.mjs";
import { connectQuestions, coverageRecords, CONNECTION } from "../src/page/demand-connection.mjs";
import { coverageJudgementRecords } from "../src/page/grouped-need-coverage.mjs";
import { possibleCombinations } from "../src/page/page-opportunities.mjs";
import { researchDerivedQuestion, assessmentRecord, ROUTES } from "../src/research/research-derived.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const sha = (s) => createHash("sha256").update(String(s).replace(/\r\n/g, "\n"), "utf8").digest("hex");
/* F40 as frozen and built at main 4ca0e5af — its criteria and its method file, pinned from those committed bytes (F40 is not reopened) */
const F40_CRITERIA_SHA = "6b734b4577090f6209368b56f3d98ab17adb5da8c070e3bd8aac6fd6c523827f";
const F40_MODULE_SHA = "b495f2372184825624a43a4266f77f51091f5763763ccc8987861891e11fe841";
const ON = "2026-10-06", AT = `${ON}T00:00:00Z`, NOW = new Date(`${ON}T12:00:00Z`);
const T = "tenant:rr186-fixture", S = "rr186-fixture-subject";

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
const page = (id, h1) => ({ pageId: id, tenantId: T, html: `<article><h1>${h1}</h1><p>Fixture body text about ${h1.toLowerCase()} and nothing else of the subject.</p></article>`, bodyObservationId: `obs:${id}` });
const PAGES = [page("fixture-page-a", "Fixture opening hours"), page("fixture-page-b", "Fixture contact details")];
const POP = { tenantId: T, coverageState: "COMPLETE", pages: PAGES, inventory: { pages: PAGES.map((p) => ({ pageId: p.pageId, fingerprints: [{ observationId: p.bodyObservationId, verified: true }] })) } };
const LINKS = Object.freeze({ completeness: "COMPLETE", out: [{ pageId: "fixture-page-a", url: "https://fixture-world.invalid/hours", title: "Fixture opening hours" }], inboundFrom: [{ pageId: "fixture-page-b" }], selfUrl: "https://fixture-world.invalid/renewal", ref: "links:fixture" });
function chosen(grouped) {
  const qs = grouped ? [Q1, Q2, Q3] : [Q1];
  const same = (q) => ({ questionId: Q1.question_id, judgementRef: `same:${q.question_id}`, reason: "the same meaning and need" });
  const conn = connectQuestions({ subject: S, possible: POSSIBLE, records: qs, assessments: (grouped ? [Q1, Q3] : [Q1]).map(relevant), on: ON, drafts: [
    { questionId: Q1.question_id, combination: { axis: "one" }, answer: { claims: [CENTRAL, BODY, UNSUPPORTED] } },
    ...(grouped ? [{ questionId: Q2.question_id, combination: { axis: "one" }, sameAs: same(Q2) }, { questionId: Q3.question_id, combination: { axis: "one" }, sameAs: same(Q3) }] : []),
  ] });
  assert.deepEqual(conn.refused, []);
  const judgements = coverageJudgementRecords(qs.flatMap((q) => PAGES.map((p) => ({ questionId: q.question_id, pageId: p.pageId, verdict: "DOES_NOT_COVER", reason: "the page's sections compared with the question", source: { kind: "METHOD", ref: "fixture-coverage-method" } }))), { on: ON }).records;
  const rows = [...conn.records, ...coverageRecords({ subject: S, rows: conn.records, tenantId: T, population: POP, judgements, on: ON })];
  const needId = rows.find((r) => r.record_type === CONNECTION).needId;
  const g = decideGroupedNeeds({ tenantId: T, product: PRODUCT, population: POP, planningRows: rows, duplicationReviews: PAGES.map((p) => ({ needId, against: p.pageId, verdict: "DISTINCT", needsGuidance: false, ref: `review:${p.pageId}` })) });
  assert.equal(g.compiled.forConstruction.length, 1, "F35 did not choose the fixture need");
  return { g, d: g.compiled.forConstruction[0] };
}
/** F37 C7's own reading of a draft: each distinct claim once, every refer-back resolving to a rendered claim, no new visible text */
function claimsOnce(html, spec) {
  const ids = [...html.matchAll(/<div class="claim" data-claim-id="([^"]+)">/g)].map((m) => m[1]);
  const refs = [...html.matchAll(/<section class="qa"[^>]* data-refers-to="([^"]*)">\n<h2><a href="#answer">([^<]*)<\/a><\/h2>/g)];
  const sectionText = [...html.matchAll(/<section class="qa"[^>]*>([\s\S]*?)<\/section>/g)].map((m) => m[1].replace(/<p class="unknown"[\s\S]*?<\/p>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  return {
    once: ids.length === new Set(ids).size, blocks: ids.length, distinct: new Set(ids).size,
    answerAnchor: (html.match(/ id="answer"/g) ?? []).length === 1,
    everyHeadingLinksBack: refs.length === spec.sections.length && refs.every((m, i) => m[2] === spec.sections[i].heading.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")),
    refersResolve: refs.every((m) => m[1].split(" ").filter(Boolean).every((id) => ids.includes(id))),
    noNewVisibleText: sectionText.every((t, i) => t === `${spec.sections[i].heading} ${(/<p class="qa-tier">([^<]*)<\/p>/.exec([...html.matchAll(/<section class="qa"[^>]*>([\s\S]*?)<\/section>/g)][i][1]) ?? [])[1]}`),
  };
}

test("T37-C7 · F37 C7 EACH DISTINCT CLAIM ONCE: F37's own render of a one-question need and of a grouped need, judged by F40's UNCHANGED repetition and filler judgements, PASS — every distinct claim rendered once with its label, source and trace, every refer-back a link resolving to a rendered claim, no new visible text; a claim rendered twice is refused; markup checked by F48's rule; F40's criteria and method byte for byte as frozen", () => {
  for (const grouped of [false, true]) {
    const c = chosen(grouped);
    const d = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: LINKS });
    const r = claimsOnce(d.html, c.d.spec);
    assert.deepEqual([r.once, r.answerAnchor, r.everyHeadingLinksBack, r.refersResolve, r.noNewVisibleText], [true, true, true, true, true], `${grouped ? "grouped" : "one-question"}: ${JSON.stringify(r)}`);
    assert.deepEqual([r.blocks, r.distinct], [2, 2], "the RR-180 fixture's two supported claims, each once (5 blocks for 2 claims before Amendment 1)");
    assert.deepEqual(d.trace.map((t) => t.claimId).sort(), ["c-body", "c-central"], "a claim lost its trace by being referred to");
    for (const t of d.trace) assert.ok(t.label && t.source && t.link && t.readOn, `${t.claimId} lost its label, source or date read`);
    assert.equal(d.checks.headingsMatch.state, "PASS", "a heading's wording changed to carry its refer-back");
    assert.deepEqual([assessPage({ pageId: "d", html: d.html, verified: true }).state, d.checks.markup.state], [MARKUP.ALIGNED, "PASS"], "markup carries an answer not visible on the page");
    const r0 = constructCandidates({ pageSpecs: {}, variants: PRODUCT.variants, records: [], requested: [c.d.slug], tenantId: T, existingPages: POP, gainEvidence: null, decisions: decisionsForConstruction({ compiled: c.g.compiled }).decisions, links: LINKS, now: NOW })[0];
    const q = judgeDraft({ spec: c.d.spec, decision: c.d.decision, draft: d, parts: r0.parts, population: POPULATION.REAL });
    assert.equal(q.judged, true, q.why);
    assert.deepEqual([q.judgements.repetition.verdict, q.judgements.filler.verdict], [VERDICT.PASS, VERDICT.PASS], `${grouped ? "grouped" : "one-question"}: F40's repetition or filler FAILS F37's render: ${q.judgements.repetition.observation} / ${q.judgements.filler.observation}`);
  }
  /* a control rendering a claim twice is refused by the same reading */
  const c = chosen(true);
  const d = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: LINKS });
  const twice = d.html.replace(/(<div class="claim" data-claim-id="c-body">[\s\S]*?<\/p><\/div>)/, "$1\n$1");
  assert.equal(claimsOnce(twice, c.d.spec).once, false, "a claim rendered twice was not seen");
  assert.equal(claimsOnce(d.html.replace('href="#answer"', 'href="#elsewhere"'), c.d.spec).everyHeadingLinksBack, false, "a broken refer-back was not seen");
  /* F40's text, criteria and method: unchanged, byte for byte */
  assert.equal(sha(JSON.stringify({ CRITERIA, METHOD_SOURCE })), F40_CRITERIA_SHA, "F40's criteria changed");
  assert.equal(sha(readFileSync(join(REPO, "src/page/quality-judgements.mjs"), "utf8")), F40_MODULE_SHA, "F40's method changed");
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
