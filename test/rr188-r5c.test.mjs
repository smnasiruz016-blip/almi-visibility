/**
 * 🔴 RR-188 · R5c — F40 ACCEPTANCE AMENDMENT 1, C8 (the record names the exact content it judged) and F41 ACCEPTANCE AMENDMENT 2, C9 (a
 * preview only on a full F40 PASS for the same subject and the same content sha256; policy A), approved by their hashes (0785e178…,
 * 580041c9…), with the owner's strict subject match (RR-188 decision 4) — each case its own test.
 *
 * ONE TEST PER NEW EVIDENCE LINE (F40 [C8], F41 "For C9"), and one per subject case; each FAILURE limb has its sabotage in
 * test/helpers/rr188-sabotage.mjs. FIXTURE STRUCTURES ONLY (RR-177): planning rows by F91's and F16's own functions, drafts by F37's own render,
 * judged by F40's own function. Nothing here writes to the production trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { renderCompiledDraft } from "../src/page/draft-render.mjs";
import { judgeDraft, CRITERIA, METHOD_SOURCE, VERDICT, CANNOT_DECIDE, NOT_JUDGED, POPULATION, JUDGED_KIND } from "../src/page/quality-judgements.mjs";
import { previewForOwner, PREVIEW } from "../src/page/content-brief.mjs";
import { decideGroupedNeeds } from "../src/page/action-evidence.mjs";
import { constructCandidates, decisionsForConstruction, ACCEPTED } from "../src/page/construct.mjs";
import { connectQuestions, coverageRecords, CONNECTION } from "../src/page/demand-connection.mjs";
import { coverageJudgementRecords } from "../src/page/grouped-need-coverage.mjs";
import { possibleCombinations } from "../src/page/page-opportunities.mjs";
import { researchDerivedQuestion, assessmentRecord, ROUTES } from "../src/research/research-derived.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const sha = (s) => createHash("sha256").update(String(s).replace(/\r\n/g, "\n"), "utf8").digest("hex");
const html256 = (h) => createHash("sha256").update(h).digest("hex");
/* F40 Acceptance Amendment 1's pins (main 74d664af): the criteria and the three judgement methods, byte for byte */
const PIN = Object.freeze({ criteria: "6b734b4577090f6209368b56f3d98ab17adb5da8c070e3bd8aac6fd6c523827f", fillerJudgement: "1c3d18fffff3b61044847da264861dda26949d6f9192946b839cac32e4999af4",
  repetitionJudgement: "1b63ea813b1039cc375e1011f3c5548eee91a6a342ab8420ea4de413edc522e4", recordedJudgement: "3503fde206ade00d8848b34195b1f702f26929317d069872d14b7f578f05483e" });
/* R5's fixtures and tests, re-run unchanged: test/rr184-r5.test.mjs as it stands at main 74d664af, less its R40-BOARD test (restated in RR-188
 * to read R5's own VERIFIED; the board is not a fixture) — the stripped text's sha256, re-derived from main's blob */
const RR184_TEST_SHA = "7353481ed162bac39360f2055a46c96fb7943793d6cb0033f91d13576188cf03";
const withoutR40Board = (t) => { t = t.replace(/\r\n/g, "\n"); const s = t.indexOf('test("R40-BOARD'); return s < 0 ? t : t.slice(0, s) + t.slice(t.indexOf("\n});\n", s) + 5); };
const ON = "2026-10-06", AT = `${ON}T00:00:00Z`, NOW = new Date(`${ON}T12:00:00Z`);
const T = "tenant:rr188-fixture", S = "rr188-fixture-subject";

/* ---- fixture planning rows, by F91's and F16's own functions (the RR-180 fixture, renamed) ---- */
const POSSIBLE = possibleCombinations({ dimensions: [{ key: "axis", values: ["one", "two"], source: "the fixture descriptor", applicability: "APPLIES" }] });
const PRODUCT = Object.freeze({ productId: S, axis: { key: "axis" }, variants: ["one", "two"], pageSpecs: {} });
const relevant = (q) => assessmentRecord({ question: q, draft: { verdict: "RELEVANT", declarationVersion: "fixture-v1", meaningTest: "within the declared field", reason: "about the declared product", source: { kind: "METHOD", ref: "fixture-method" } }, at: AT }).record;
const rd = (queryId, wording) => researchDerivedQuestion({ subject: S, queryId, route: ROUTES.CLIENT_AI, wording, providerId: "fixture-provider", at: AT });
const related = (name, path) => ({ kind: "RELATED", name, link: `https://related.fixture.invalid/${path}`, readOn: "2026-10-02" });
const CENTRAL = { claimId: "c-central", states: "OTHER", text: "A fixture licence renewal takes about four weeks.", source: related("a related fixture source", "a"), supports: { finding: "SUPPORTS", ref: "finding:central" } };
const BODY = { claimId: "c-body", central: false, states: "RESPONSIBLE_BODY_RULE", body: "Fixture Licensing Board", text: "The Fixture Licensing Board requires the renewal form.", source: { kind: "RESPONSIBLE_BODY", body: "Fixture Licensing Board", name: "Fixture Licensing Board", link: "https://board.fixture.invalid/renewal", readOn: "2026-10-02" }, supports: { finding: "SUPPORTS", ref: "finding:body" } };
const Q1 = rd("formed-1", "How long does a fixture licence renewal take?");
const page = (id, h1) => ({ pageId: id, tenantId: T, html: `<article><h1>${h1}</h1><p>Fixture body text about ${h1.toLowerCase()} and nothing else of the subject.</p></article>`, bodyObservationId: `obs:${id}` });
const PAGES = [page("fixture-page-a", "Fixture opening hours"), page("fixture-page-b", "Fixture contact details")];
const POP = { tenantId: T, coverageState: "COMPLETE", pages: PAGES, inventory: { pages: PAGES.map((p) => ({ pageId: p.pageId, fingerprints: [{ observationId: p.bodyObservationId, verified: true }] })) } };
const LINKS = Object.freeze({ completeness: "COMPLETE", out: [{ pageId: "fixture-page-a", url: "https://fixture-world.invalid/hours", title: "Fixture opening hours" }], inboundFrom: [{ pageId: "fixture-page-b" }], selfUrl: "https://fixture-world.invalid/renewal", ref: "links:fixture" });
const ASPECTS = ["intent", "answer", "facts", "architecture", "examples", "userValue"];
function chosen() {
  const conn = connectQuestions({ subject: S, possible: POSSIBLE, records: [Q1], assessments: [relevant(Q1)], on: ON, drafts: [{ questionId: Q1.question_id, combination: { axis: "one" }, answer: { claims: [CENTRAL, BODY] } }] });
  assert.deepEqual(conn.refused, []);
  const judgements = coverageJudgementRecords(PAGES.map((p) => ({ questionId: Q1.question_id, pageId: p.pageId, verdict: "DOES_NOT_COVER", reason: "the page's sections compared with the question", source: { kind: "METHOD", ref: "fixture-coverage-method" } })), { on: ON }).records;
  const rows = [...conn.records, ...coverageRecords({ subject: S, rows: conn.records, tenantId: T, population: POP, judgements, on: ON })];
  const needId = rows.find((r) => r.record_type === CONNECTION).needId;
  const g = decideGroupedNeeds({ tenantId: T, product: PRODUCT, population: POP, planningRows: rows, duplicationReviews: PAGES.map((p) => ({ needId, against: p.pageId, verdict: "DISTINCT", needsGuidance: false, ref: `review:${p.pageId}` })) });
  assert.equal(g.compiled.forConstruction.length, 1, "F35 did not choose the fixture need");
  return { g, d: g.compiled.forConstruction[0], needId };
}
const gainFor = (slug, withGain) => ({
  gainRecords: withGain ? [{ pageId: `candidate:${slug}`, kind: "USEFUL_COMPARISON", adds: "the renewal time and the form answered in one place", ref: `gain:${slug}` }] : [],
  competitorComparisons: withGain ? [{ pageId: `candidate:${slug}`, competitorsCompared: 1, gainBeyond: true, ref: `cmp:${slug}` }] : [],
  reviews: PAGES.map((p) => ({ pair: [`candidate:${slug}`, p.pageId], compared: ASPECTS, duplicate: false, documentedDistinctValue: "a different need", ref: `f32:${p.pageId}` })),
});
const fj = (name, verdict = VERDICT.PASS) => ({ name, verdict, criterionId: CRITERIA[name].id, observation: `the fixture judge's recorded observation (${verdict})`, source: { kind: "FIXTURE", ref: `fixture-judge:${name}` } });
/** the production path: construction, F37's own render of the same spec, F40's own judgement of it */
function judged({ withGain = true, judgements = [fj("engaging"), fj("hookable")] } = {}) {
  const c = chosen();
  const r = constructCandidates({ pageSpecs: {}, variants: PRODUCT.variants, records: [], requested: [c.d.slug], tenantId: T, existingPages: POP, gainEvidence: gainFor(c.d.slug, withGain), decisions: decisionsForConstruction({ compiled: c.g.compiled }).decisions, links: LINKS, now: NOW })[0];
  const d = renderCompiledDraft({ spec: c.d.spec, decision: c.d.decision, links: LINKS });
  const q = judgeDraft({ spec: c.d.spec, decision: c.d.decision, draft: d, parts: r.parts, population: POPULATION.FIXTURE, judgements });
  return { c, r, d, q, brief: Object.freeze({ subject: Object.freeze({ kind: "GROUPED_NEED", id: c.needId }), state: "READY" }) };
}

/* ================= F40 C8 ================= */
test("T40-C8 · F40 C8 THE RECORD NAMES THE EXACT CONTENT IT JUDGED: contentSha256 is the sha256 of the HTML judged; one character changed gives another; a NOT JUDGED result for a presented draft carries it; no verdict changes; R5's fixtures re-run unchanged; the four pins re-derived from the code", () => {
  const { c, r, d, q } = judged();
  assert.equal(q.judged, true, q.why);
  assert.equal(q.contentSha256, html256(d.html), "the record's contentSha256 is not the sha256 of the content it judged");
  const changed = { ...d, html: d.html.replace("</h1>", " </h1>") };
  const q2 = judgeDraft({ spec: c.d.spec, decision: c.d.decision, draft: changed, parts: r.parts, population: POPULATION.FIXTURE, judgements: [fj("engaging"), fj("hookable")] });
  assert.equal(q2.contentSha256, html256(changed.html));
  assert.notEqual(q2.contentSha256, q.contentSha256, "one character changed did not change contentSha256");
  /* a NOT JUDGED result for a presented draft carries the hash of what was presented */
  const refused = judgeDraft({ spec: c.d.spec, decision: { ...c.d.decision, decision: "CANNOT_DECIDE", actions: [] }, draft: d, parts: r.parts, population: POPULATION.FIXTURE });
  assert.deepEqual([refused.verdict, refused.contentSha256], [NOT_JUDGED, html256(d.html)]);
  assert.equal(judgeDraft({ spec: c.d.spec, decision: c.d.decision, draft: { ...d, html: "" }, parts: r.parts, population: POPULATION.FIXTURE }).contentSha256, null, "a draft with no content was given a hash");
  /* the field decides nothing: every verdict field is what F40 decides for these inputs, hand-written */
  assert.deepEqual([q.gate.verdict, q.gate.blockers.length, ...Object.values(q.assessments).map((a) => a.verdict), ...Object.values(q.judgements).map((j) => j.verdict)],
    [VERDICT.PASS, 0, VERDICT.PASS, VERDICT.PASS, VERDICT.PASS, VERDICT.PASS, VERDICT.PASS, VERDICT.PASS, VERDICT.PASS, VERDICT.PASS, VERDICT.PASS]);
  assert.equal(sha(withoutR40Board(readFileSync(join(REPO, "test/rr184-r5.test.mjs"), "utf8"))), RR184_TEST_SHA, "R5's fixtures changed — they must re-run unchanged");
  /* the four pins, re-derived from the code */
  assert.equal(sha(JSON.stringify({ CRITERIA, METHOD_SOURCE })), PIN.criteria, "F40's criteria changed");
  const qj = readFileSync(join(REPO, "src/page/quality-judgements.mjs"), "utf8").replace(/\r\n/g, "\n");
  for (const name of ["fillerJudgement", "repetitionJudgement", "recordedJudgement"]) { const s = qj.indexOf(`function ${name}(`); assert.equal(sha(qj.slice(s, qj.indexOf("\n}\n", s) + 2)), PIN[name], `F40's ${name} changed`); }
});

/* ================= F41 C9 ================= */
test("T41-C9 · F41 C9 A PREVIEW ONLY ON A FULL F40 PASS FOR THE SAME SUBJECT AND CONTENT: a PASS draft is put forward; one judgement FAIL, one NOT MEASURED, distinct value CANNOT DECIDE are each NOT_PUT_FORWARD with F40's verdict and blockers word for word; other content, no contentSha256 and no F40 result are refused; the runner hands F40's result to the preview", () => {
  const ok = judged();
  assert.equal(ok.r.verdict, ACCEPTED, JSON.stringify(ok.r.rejects));
  assert.equal(previewForOwner({ construction: ok.r, brief: ok.brief, f40: ok.q }).state, PREVIEW.PUT_FORWARD);
  for (const [label, x] of [["one judgement FAIL", judged({ judgements: [fj("engaging", VERDICT.FAIL), fj("hookable")] })], ["one NOT MEASURED", judged({ judgements: [fj("engaging")] })]]) {
    const p = previewForOwner({ construction: x.r, brief: x.brief, f40: x.q });
    assert.equal(p.state, PREVIEW.NOT_PUT_FORWARD, `${label} was put forward`);
    assert.deepEqual(p.missing.slice(-1 - x.q.gate.blockers.length), [`F40 gate ${x.q.gate.verdict}`, ...x.q.gate.blockers], `${label}: F40's verdict or blockers not carried word for word`);
  }
  /* distinct value CANNOT DECIDE: construction refuses first, and F40's CANNOT DECIDE is carried, never counted as a pass */
  const cd = judged({ withGain: false });
  assert.equal(cd.q.assessments.distinctValue.verdict, CANNOT_DECIDE);
  const pcd = previewForOwner({ construction: cd.r, brief: cd.brief, f40: cd.q });
  assert.equal(pcd.state, PREVIEW.NOT_PUT_FORWARD);
  assert.ok(pcd.missing.includes("distinctValue CANNOT DECIDE"), "CANNOT DECIDE was not carried");
  /* other content, no contentSha256, no F40 result */
  for (const [label, f40, re] of [["other content", { ...ok.q, contentSha256: "0".repeat(64) }, /F40's result is for other content/], ["no contentSha256", { ...ok.q, contentSha256: undefined }, /names no contentSha256/], ["no F40 result", null, /no F40 result for this draft/]]) {
    const p = previewForOwner({ construction: ok.r, brief: ok.brief, f40 });
    assert.equal(p.state, PREVIEW.NOT_PUT_FORWARD, `${label} was put forward`);
    assert.ok(p.missing.some((m) => re.test(m)), `${label}: the reason is not named — ${p.missing.join(" | ")}`);
  }
  /* F41 never re-judges: a result F40 recorded as PASS is read as PASS, and one recorded FAIL stays FAIL, whatever the draft holds */
  assert.equal(previewForOwner({ construction: ok.r, brief: ok.brief, f40: { ...ok.q, gate: { verdict: VERDICT.FAIL, blockers: ["engagingPresentation FAIL"] } } }).state, PREVIEW.NOT_PUT_FORWARD, "F41 overrode F40's FAIL");
  /* the runner's own path */
  const bin = readFileSync(join(REPO, "bin/build-page.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(bin, /const pv = previewForOwner\(\{ construction, brief: null, f40: q \}\);/, "the runner does not hand F40's result for that draft to the preview");
});

/* ================= the owner's strict subject match — each case its own test ================= */
test("T41-C9-KIND · STRICT SUBJECT: a brief whose subject is not of the kind F40 judges is NOT_PUT_FORWARD, the reason named", () => {
  const ok = judged();
  assert.equal(JUDGED_KIND, "GROUPED_NEED");
  const p = previewForOwner({ construction: ok.r, brief: { ...ok.brief, subject: { kind: "PAGE", id: ok.c.needId } }, f40: ok.q });
  assert.equal(p.state, PREVIEW.NOT_PUT_FORWARD, "a brief of another kind was put forward");
  assert.ok(p.missing.includes("the brief's subject is of kind PAGE, not the kind F40 judges (GROUPED_NEED)"), p.missing.join(" | "));
});

test("T41-C9-NOID · STRICT SUBJECT: a brief whose subject has no id is NOT_PUT_FORWARD, the reason named", () => {
  const ok = judged();
  for (const id of [undefined, ""]) {
    const p = previewForOwner({ construction: ok.r, brief: { ...ok.brief, subject: { kind: "GROUPED_NEED", id } }, f40: ok.q });
    assert.equal(p.state, PREVIEW.NOT_PUT_FORWARD, "a brief with no subject id was put forward");
    assert.ok(p.missing.includes("the brief's subject has no id to match F40's subject"), p.missing.join(" | "));
  }
});

test("T41-C9-OTHERID · STRICT SUBJECT: a brief whose subject id differs from F40's subject is NOT_PUT_FORWARD, the reason named", () => {
  const ok = judged();
  const p = previewForOwner({ construction: ok.r, brief: { ...ok.brief, subject: { kind: "GROUPED_NEED", id: "need:another" } }, f40: ok.q });
  assert.equal(p.state, PREVIEW.NOT_PUT_FORWARD, "a brief for another subject was put forward");
  assert.ok(p.missing.includes(`F40's result is for subject ${ok.c.needId}, not this brief's subject need:another`), p.missing.join(" | "));
});

test("R188-BOARD · F40 and F41 move only through the production validator and the audit trail: each reopened by its own amendment on 6 Oct, VERIFIED-PASS only with a REAL VERIFIED event after it, every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const [f, n] of [["F40", 8], ["F41", 9]]) {
    const row = DECLARED[f];
    const i = row.events.findIndex((e) => e.kind === "ACCEPTANCE_AMENDED" && e.on === "2026-10-06" && /RR-188|_ACCEPTANCE_AMENDMENT_(1|2)_2026-10-06/.test(JSON.stringify(e.ruling)));
    assert.ok(i >= 0 && row.events[i + 1]?.kind === "REOPENED", `${f}'s amendment and REOPENED are not on the board`);
    assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.action === "REOPENED" && e.metadata?.featureId === f && e.occurredAt.startsWith("2026-10-06")), `${f}'s REOPENED is not in the trail`);
    if (row.state === "VERIFIED-PASS") {
      const v = row.events.filter((e) => e.kind === "VERIFIED").at(-1);
      assert.ok(row.events.indexOf(v) > i + 1 && v.population === "REAL");
      assert.ok(Object.keys(v.clauses).length === n && Object.values(v.clauses).every((x) => x === "PROVED"), `${f}: a clause not PROVED`);
    } else assert.equal(row.state, "IN-PROGRESS");
  }
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
