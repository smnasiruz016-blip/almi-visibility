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
import { constructCandidates, decisionsForConstruction } from "../src/page/construct.mjs";
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
const LINKS = Object.freeze({ completeness: "COMPLETE", out: [{ pageId: "fixture-page-a", url: "https://fixture-world.invalid/hours", title: "Fixture opening hours" }], inboundFrom: [{ pageId: "fixture-page-b" }], selfUrl: "https://fixture-world.invalid/renewal", ref: "links:fixture" });
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
  reviews: PAGES.map((p) => ({ pair: [`candidate:${slug}`, p.pageId], compared: ASPECTS, duplicate: false, documentedDistinctValue: "a different need", ref: `f32:${p.pageId}` })),
});
/** The production path: construction judges F35's chosen spec; the draft is F37's own render of it; F40 reads both. */
function judged(c, { links = LINKS, withGain = true, population = POPULATION.FIXTURE, judgements = [], repeatJustifications = [], round = 0, previous = null, spec = c.d.spec, draft = null } = {}) {
  /* construction is handed the SAME spec the draft renders (a changed spec rides in F35's construction set) */
  const compiled = { ...c.g.compiled, forConstruction: c.g.compiled.forConstruction.map((x) => (x.slug === c.d.slug ? { ...x, spec } : x)) };
  const r = constructCandidates({ pageSpecs: {}, variants: PRODUCT.variants, records: [], requested: [c.d.slug], tenantId: T, existingPages: POP, gainEvidence: gainFor(c.d.slug, withGain), decisions: decisionsForConstruction({ compiled }).decisions, links, now: NOW })[0];
  const d = draft ?? renderCompiledDraft({ spec, decision: c.d.decision, links });
  return { r, d, q: judgeDraft({ spec, decision: c.d.decision, draft: d, parts: r.parts, population, judgements, repeatJustifications, round, previous }) };
}
const fixtureJudgement = (name, verdict) => ({ name, verdict, criterionId: CRITERIA[name].id, observation: `the fixture judge's recorded observation of the rendered draft (${verdict})`, source: { kind: "FIXTURE", ref: `fixture-judge:${name}` } });
const PASSING_JUDGEMENTS = [fixtureJudgement("engaging", VERDICT.PASS), fixtureJudgement("hookable", VERDICT.PASS)];
const justifyAll = (html) => [...new Set([...html.matchAll(/<div class="claim" data-claim-id="([^"]+)">/g)].map((m) => m[1]))].map((claimId) => ({ claimId, adds: "the answer restated under the question's own wording for a reader who arrives at that question", ref: `fixture-justification:${claimId}` }));

/* ================= C1 ================= */
test("T40-C1 · F40 C1 THE PRODUCTION PATH: the draft F37 renders on fixture pages is judged through the runner's own path with F37's checks read unchanged; a FAILING F37 check is carried unchanged; a draft for a need F35 did not choose is never judged", () => {
  const c = chosen();
  const { r, d, q } = judged(c);
  assert.equal(q.judged, true, q.why);
  assert.deepEqual(Object.fromEntries(Object.entries(r.parts.draft.checks).map(([k, v]) => [k, v.state])), Object.fromEntries(Object.entries(d.checks).map(([k, v]) => [k, v.state])), "construction judged other checks");
  assert.deepEqual(q.assessments.technicalIndexability.detail, { technical: d.checks.technical.state, internalLinks: d.checks.internalLinks.state, markup: d.checks.markup.state });
  assert.deepEqual([q.assessments.verifiedFacts.verdict, d.checks.everyClaimSourced.state], [VERDICT.PASS, "PASS"]);
  /* a FAILING F37 check, carried unchanged: a planted promise of ranking fails F37's markup check, so technical indexability FAILS */
  const promised = { ...c.d.spec, answer: { ...c.d.spec.answer, labels: c.d.spec.answer.labels.map((l) => (l.claimId === "c-central" ? { ...l, text: "This page is guaranteed to rank first." } : l)) } };
  const p = judged(c, { spec: promised });
  assert.equal(p.d.checks.markup.state, "FAIL");
  assert.deepEqual([p.q.judged, p.q.assessments.technicalIndexability.detail.markup, p.q.assessments.technicalIndexability.verdict], [true, "FAIL", VERDICT.FAIL]);
  /* F40 never rebuilds: a draft whose checks are not the ones construction judged is refused */
  const doctored = { ...d, checks: { ...d.checks, markup: { state: "PASS" } } };
  assert.equal(judgeDraft({ spec: c.d.spec, decision: c.d.decision, draft: { ...doctored, checks: { ...doctored.checks, technical: { state: "FAIL" } } }, parts: r.parts, population: POPULATION.FIXTURE }).verdict, NOT_JUDGED);
  /* a need F35 did not choose is never judged */
  const unchosen = { ...c.d.decision, decision: "CANNOT_DECIDE", actions: [] };
  assert.equal(judgeDraft({ spec: c.d.spec, decision: unchosen, draft: d, parts: r.parts, population: POPULATION.FIXTURE }).verdict, NOT_JUDGED);
  /* an unsupported material claim never passes: verified facts reads F37's every-claim-sourced FAIL */
  assert.equal(judgeDraft({ spec: c.d.spec, decision: c.d.decision, draft: { ...d, checks: { ...d.checks, everyClaimSourced: { state: "FAIL" } } }, parts: { ...r.parts, draft: { ...r.parts.draft, checks: { ...r.parts.draft.checks, everyClaimSourced: { state: "FAIL" } } } }, population: POPULATION.FIXTURE }).assessments.verifiedFacts.verdict, VERDICT.FAIL);
  /* the runner's own path: bin/build-page.mjs judges exactly F35's chosen specs, rendered by F37's function, reading construction's parts */
  const bin = code("bin/build-page.mjs");
  assert.match(bin, /chosen\.decisions\.filter\(\(d\) => d\.spec\)\.map\(\(d\) => \(\{ slug: d\.slug, q: judgeDraft\(\{ spec: d\.spec, decision: d\.decision,/);
  assert.match(bin, /parts: results\.find\(\(r\) => r\.slug === d\.slug\)\?\.parts, population: POPULATION\.REAL/);
});

/* ================= C2 ================= */
test("T40-C2 · F40 C2 ANSWER SUFFICIENCY, NOT LENGTH: a supported central answer is sufficient; the same draft with its central claim's support removed is insufficient (FAIL) with the UNKNOWN part named; a short and a long draft answering the same need equally are judged alike", () => {
  const c = chosen();
  const ok = judged(c).q;
  assert.equal(ok.assessments.answerQuality.verdict, VERDICT.PASS);
  assert.match(ok.assessments.answerQuality.observation, /other UNKNOWN part\(s\), named: c-unknown/);
  /* the same draft with its central claim's support removed: the claim leaves the supported labels and stays a central UNKNOWN part */
  const removedSpec = { ...c.d.spec, answer: { ...c.d.spec.answer, labels: c.d.spec.answer.labels.filter((l) => l.claimId !== "c-central"),
    unknown: [...c.d.spec.answer.unknown, { claimId: "c-central", central: true, state: "UNKNOWN", why: "its supporting finding was removed" }] } };
  const bad = judged(c, { spec: removedSpec }).q;
  assert.equal(bad.judged, true, bad.why);
  /* and with the direct answer still supported, a SECOND central part left UNKNOWN is insufficient on its own */
  const secondSpec = { ...c.d.spec, answer: { ...c.d.spec.answer, unknown: [...c.d.spec.answer.unknown, { claimId: "c-central-2", central: true, state: "UNKNOWN", why: "no supporting finding recorded" }] } };
  const { d: secondDraft, q: second } = judged(c, { spec: secondSpec });
  assert.equal(second.judged, true, second.why);
  assert.equal(secondDraft.checks.directAnswer.state, "PASS", "the direct answer is not supported in this control");
  assert.equal(second.assessments.answerQuality.verdict, VERDICT.FAIL, "a central part left UNKNOWN was judged sufficient");
  assert.match(second.assessments.answerQuality.observation, /central part\(s\) UNKNOWN: c-central-2/);
  assert.equal(bad.assessments.answerQuality.verdict, VERDICT.FAIL);
  assert.match(bad.assessments.answerQuality.observation, /central part\(s\) UNKNOWN: c-central/);
  const long = chosen({ claims: [{ ...CENTRAL, text: `${CENTRAL.text} ${"The fixture renewal office processes forms in the order they arrive, by post or in person. ".repeat(12)}` }, BODY, UNSUPPORTED] });
  assert.equal(judged(long).q.assessments.answerQuality.verdict, ok.assessments.answerQuality.verdict, "length decided answer sufficiency");
  assert.doesNotMatch(ok.assessments.answerQuality.criterion, /word|length|count/i);
});

/* ================= C3 ================= */
test("T40-C3 · F40 C3 FIVE SEPARATE ASSESSMENTS: every record carries all five, each its own result; F39 CANNOT DECIDE gives distinct value CANNOT DECIDE while the other four are still assessed; one FAIL among PASSes stays separate; nothing sums or collapses them", () => {
  const c = chosen();
  /* RR-186: F37 now renders each claim once, so its render no longer supplies the FAIL this test keeps separate; a recorded FAIL judgement does */
  const q = judged(c, { judgements: [fixtureJudgement("engaging", VERDICT.FAIL), fixtureJudgement("hookable", VERDICT.PASS)] }).q;
  assert.deepEqual(Object.keys(q.assessments), ASSESSMENTS);
  for (const a of ASSESSMENTS) assert.ok(q.assessments[a] && [VERDICT.PASS, VERDICT.FAIL, VERDICT.NOT_MEASURED, CANNOT_DECIDE].includes(q.assessments[a].verdict), `${a} is missing or carries no verdict of its own`);
  const noGain = judged(c, { withGain: false }).q;
  assert.equal(noGain.judged, true, `F39's CANNOT DECIDE stopped F40 from judging: ${noGain.why}`);
  assert.equal(noGain.assessments.distinctValue.verdict, CANNOT_DECIDE);
  for (const a of ASSESSMENTS.filter((x) => x !== "distinctValue")) assert.notEqual(noGain.assessments[a].verdict, CANNOT_DECIDE, `${a} was not assessed`);
  assert.equal(noGain.assessments.answerQuality.verdict, VERDICT.PASS);
  /* one FAIL (the engaging judgement) among PASSes, kept separate and visible */
  assert.equal(q.assessments.engagingPresentation.verdict, VERDICT.FAIL);
  assert.deepEqual(["technicalIndexability", "answerQuality", "verifiedFacts", "distinctValue"].map((a) => q.assessments[a].verdict), [VERDICT.PASS, VERDICT.PASS, VERDICT.PASS, VERDICT.PASS]);
  assert.ok(q.gate.blockers.includes("engagingPresentation FAIL"));
  assert.doesNotMatch(code(MODULE), /\b(score|weight(ed)?|average|total)\b|ASSESSMENTS\.reduce/i, "a code path sums or collapses the assessments");
  assert.doesNotMatch(JSON.stringify(q), /\bstrong\b|\bgood page\b/i, "a page is called strong");
});

/* ================= C4 ================= */
test("T40-C4 · F40 C4 THE JUDGEMENTS: a fixture draft judged FILLER is blocked — it does not pass F40; each judgement FAILs on its criterion and PASSes a clean fixture by the same criterion; the repetition judgement applied to F37's render of a grouped need is recorded as given", () => {
  const c = chosen();
  const clean = judged(c, { judgements: PASSING_JUDGEMENTS });
  const justified = judged(c, { judgements: PASSING_JUDGEMENTS, repeatJustifications: justifyAll(clean.d.html) }).q;
  assert.equal(justified.judgements.filler.verdict, VERDICT.PASS);
  assert.equal(justified.gate.verdict, VERDICT.PASS);
  const filler = { ...clean.d, html: clean.d.html.replace("</section>", "</section>\n<p>In today's fast-moving world, many people wonder about many things.</p>") };
  const fq = judged(c, { judgements: PASSING_JUDGEMENTS, repeatJustifications: justifyAll(clean.d.html), draft: filler }).q;
  assert.deepEqual([fq.judgements.filler.verdict, fq.gate.verdict, fq.gate.passesF40], [VERDICT.FAIL, VERDICT.FAIL, false], "a fixture judged FILLER was not blocked");
  assert.match(fq.judgements.filler.observation, /1 visible text block/);
  for (const n of JUDGEMENTS) {
    const r = justified.judgements[n];
    assert.ok(r.criterion && r.criterionId === CRITERIA[n].id && r.refutation && r.observation && r.source, `${n} lacks its criterion, observation, refutation or source`);
  }
  /* engaging / hookable: FAIL on the declared criterion is a verdict, never refused */
  const failing = judged(c, { judgements: [fixtureJudgement("engaging", VERDICT.FAIL), fixtureJudgement("hookable", VERDICT.FAIL)], repeatJustifications: justifyAll(clean.d.html) }).q;
  assert.deepEqual([failing.judgements.engaging.verdict, failing.judgements.hookable.verdict], [VERDICT.FAIL, VERDICT.FAIL]);
  /* a judgement naming another criterion, or with no observation, or waiting on a person, is refused — NOT MEASURED, never PASS */
  const wrong = judged(c, { judgements: [{ ...fixtureJudgement("engaging", VERDICT.PASS), criterionId: "a criterion written after the observation" }, { ...fixtureJudgement("hookable", VERDICT.PASS), source: { kind: "PERSON", ref: "a named person" } }] }).q;
  assert.deepEqual([wrong.judgements.engaging.verdict, wrong.judgements.hookable.verdict], [VERDICT.NOT_MEASURED, VERDICT.NOT_MEASURED]);
  assert.equal(judged(c, { judgements: [{ ...fixtureJudgement("engaging", VERDICT.PASS), observation: "" }] }).q.judgements.engaging.verdict, VERDICT.NOT_MEASURED);
  /* the repetition judgement on F37's OWN render of the grouped need (RR-184 I-5), no justification recorded: recorded as given */
  /* RR-186: restated to F37's NEW real output (Amendment 1, each distinct claim once). Before it: FAIL, "5 claim block(s) rendered for 2
   * distinct claim(s); repeated: c-central ×3, c-body ×2". Recorded as given, by F40's unchanged criterion. */
  const f37 = clean.q.judgements.repetition;
  assert.equal(f37.verdict, VERDICT.PASS);
  assert.match(f37.observation, /^2 claim block\(s\) rendered for 2 distinct claim\(s\); repeated: none$/);
  const oneQ = judged(chosen({ grouped: false })).q.judgements.repetition;
  assert.deepEqual([oneQ.verdict, oneQ.observation], [VERDICT.PASS, "2 claim block(s) rendered for 2 distinct claim(s); repeated: none"], "F37's one-question render repeats a claim");
  /* the criterion still FAILs a claim rendered twice — F37's render is not exempted, it simply no longer repeats */
  const twice = { ...clean.d, html: clean.d.html.replace(/(<div class="claim" data-claim-id="c-body">[\s\S]*?<\/div><\/div>|<div class="claim" data-claim-id="c-body">[\s\S]*?<\/p><\/div>)/, "$1\n$1") };
  const tq = judged(c, { draft: twice }).q;
  assert.equal(tq.judged, true, tq.why);
  assert.deepEqual([tq.judgements.repetition.verdict, tq.judgements.repetition.observation], [VERDICT.FAIL, "3 claim block(s) rendered for 2 distinct claim(s); repeated: c-body ×2"], "the repetition criterion cannot see a claim rendered twice");
});

/* ================= C5 ================= */
test("T40-C5 · F40 C5 WHO JUDGES: a REAL run with no lawful agent leaves engaging and hookable NOT MEASURED with the missing judge named, and the draft does not pass; a fixture judgement carries its declared source; F40's path loads no provider, network, process or connector module", () => {
  const c = chosen();
  const real = judged(c, { population: POPULATION.REAL, withGain: true }).q;
  for (const n of ["engaging", "hookable"]) assert.deepEqual([real.judgements[n].verdict, real.judgements[n].why, real.judgements[n].source], [VERDICT.NOT_MEASURED, NO_LAWFUL_JUDGE, null]);
  assert.notEqual(real.gate.verdict, VERDICT.PASS);
  assert.equal(real.assessments.engagingPresentation.verdict === VERDICT.PASS, false);
  /* NOT MEASURED is never counted as passing: a real run whose only open judgements are the unjudged two */
  const onlyUnjudged = judged(c, { population: POPULATION.REAL, repeatJustifications: justifyAll(judged(c).d.html) }).q;
  assert.deepEqual([onlyUnjudged.judgements.filler.verdict, onlyUnjudged.judgements.repetition.verdict], [VERDICT.PASS, VERDICT.PASS]);
  assert.deepEqual([onlyUnjudged.assessments.engagingPresentation.verdict, onlyUnjudged.gate.verdict, onlyUnjudged.gate.passesF40], [VERDICT.NOT_MEASURED, VERDICT.NOT_MEASURED, false], "a NOT MEASURED judgement was counted as passing");
  /* a fixture judgement is never carried into a real run; an unregistered agent is refused; a registered agent's recorded call is lawful */
  assert.equal(judged(c, { population: POPULATION.REAL, judgements: PASSING_JUDGEMENTS }).q.judgements.engaging.verdict, VERDICT.NOT_MEASURED);
  const agent = (provider, callRef) => ({ ...fixtureJudgement("engaging", VERDICT.PASS), source: { kind: "AGENT", provider, callRef } });
  assert.equal(judged(c, { population: POPULATION.REAL, judgements: [agent("unregistered-provider", "call:1")] }).q.judgements.engaging.verdict, VERDICT.NOT_MEASURED);
  const lawful = judgeDraft({ ...((x) => ({ spec: c.d.spec, decision: c.d.decision, draft: x.d, parts: x.r.parts }))(judged(c)), population: POPULATION.REAL, judgements: [agent("a-registered-provider", "call:recorded-1")], registeredProviders: ["a-registered-provider"] });
  assert.deepEqual([lawful.judgements.engaging.verdict, lawful.judgements.engaging.source?.kind], [VERDICT.PASS, "AGENT"], "CONTROL: a lawful judge's recorded call is accepted");
  const fixture = judged(c, { judgements: PASSING_JUDGEMENTS }).q;
  assert.deepEqual(fixture.judgements.engaging.source, { kind: "FIXTURE", ref: "fixture-judge:engaging" });
  assert.deepEqual(decisionCallPaths({ entries: [MODULE] }).faults, []);
  const planted = decisionCallPaths({ entries: [MODULE], read: (f) => { const t = existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), "utf8") : null; return f === MODULE ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

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
test("T40-C7 · F40 C7 THE GATE: a fixture draft passing all five passes F40; the same draft with one judgement FAIL, then one NOT MEASURED, then distinct value CANNOT DECIDE — none passes and none is put forward; a third repair round is refused", () => {
  const c = chosen();
  const base = judged(c);
  const J = justifyAll(base.d.html);
  const pass = judged(c, { judgements: PASSING_JUDGEMENTS, repeatJustifications: J }).q;
  assert.deepEqual([pass.gate.verdict, pass.gate.passesF40, pass.gate.blockers.length], [VERDICT.PASS, true, 0]);
  const oneFail = judged(c, { judgements: [fixtureJudgement("engaging", VERDICT.FAIL), fixtureJudgement("hookable", VERDICT.PASS)], repeatJustifications: J }).q;
  const oneNotMeasured = judged(c, { judgements: [fixtureJudgement("engaging", VERDICT.PASS)], repeatJustifications: J }).q;
  const cannot = judged(c, { judgements: PASSING_JUDGEMENTS, repeatJustifications: J, withGain: false }).q;
  assert.deepEqual([oneFail.gate.verdict, oneNotMeasured.gate.verdict, cannot.gate.verdict], [VERDICT.FAIL, VERDICT.NOT_MEASURED, VERDICT.NOT_MEASURED]);
  assert.deepEqual([oneFail, oneNotMeasured, cannot].map((x) => x.gate.passesF40), [false, false, false]);
  assert.equal(cannot.assessments.distinctValue.verdict, CANNOT_DECIDE, "CANNOT DECIDE was turned into a pass or a fail");
  assert.match(pass.gate.standing, /never a complete passing preview \(D5\)/);
  assert.match(pass.gate.standing, /decides no ranking/, "F40 is presented as a ranking gate");
  assert.doesNotMatch(JSON.stringify(pass), PROMISE, "F40's record promises ranking, indexing or citation");
  /* repair rounds: F42's, never F40's; F40 counts them and refuses a third; a round that removes no failed judgement stops early */
  const r1 = judged(c, { round: 1, previous: oneFail }).q;
  assert.equal(r1.judged, true);
  assert.equal(judged(c, { round: MAX_REPAIR_ROUNDS + 1 }).q.verdict, NOT_JUDGED);
  assert.match(judged(c, { round: MAX_REPAIR_ROUNDS + 1 }).q.why, /a third repair round/);
  const same = judged(c, { round: 1, judgements: [fixtureJudgement("engaging", VERDICT.FAIL), fixtureJudgement("hookable", VERDICT.PASS)], repeatJustifications: J, previous: oneFail }).q;
  assert.equal(same.stopsEarly, true, "a round that removed no failed judgement did not stop");
  assert.equal(judged(c, { round: 1, judgements: PASSING_JUDGEMENTS, repeatJustifications: J, previous: oneFail }).q.stopsEarly, false);
  assert.doesNotMatch(code(MODULE), /export function (repair|rewrite|fix)/i, "F40 runs a repair itself");
});

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
