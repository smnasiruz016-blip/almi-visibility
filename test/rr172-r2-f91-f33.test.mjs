/**
 * 🔴 RR-172 · R2 — F91 ACCEPTANCE AMENDMENT 3 (C13–C18, _handoffs b8a4ea5) AND F33 ACCEPTANCE AMENDMENT 1 (C8, _handoffs 6ecc99f), with the
 * owner's RR-172 §3 rulings (_handoffs 48ae366): (a) a grouped need's coverage is a RECORDED per-question judgement (a method or an agent) or
 * an EXACT match after one declared normalisation — never similarity; (b) its own function beside F33's existing one, which (with F34, its
 * only caller) stays unchanged; (c) F33's ten unparsed evidence lines are each still proved by a test (R33 below).
 *
 * One test per EVIDENCE item; each FAILURE condition has its sabotage in test/helpers/rr172-sabotage.mjs, naming the test it turns red.
 * Every page, wording and heading stays in memory: nothing here prints page content, a host or a URL — counts only.
 * 🔴 NOTHING HERE WRITES TO THE PRODUCTION TRAIL: pure decisions, and governed runs only in a disposable declared world; hashed at the end.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync, execFileSync } from "node:child_process";

import { decideGroupedNeedCoverage, coverageJudgementRecords, judgementRefusal, servedHeadingsOf, GROUPED, AS_F33, GROUPED_REASONS, COVERAGE_JUDGEMENT } from "../src/page/grouped-need-coverage.mjs";
import { NEED_OUTCOMES } from "../src/page/need-coverage.mjs";
import { connectQuestions, coverageRecords, questionCoverageFor, readConnections, refusalOf, REFUSAL, TIERS, CONNECTION, NEED, COVERAGE, RECOMMENDATION } from "../src/page/demand-connection.mjs";
import { claimSupport, answerSupport, CLAIM_KINDS, SOURCE_KINDS, LABEL, ANSWER_STATES, CLAIM_UNKNOWN } from "../src/page/answer-support.mjs";
import { planPages, neededNewPages, possibleCombinations, formatLine, formatNumber, normaliseWording, NOT_MEASURED, DEMAND_RULES, ACTION_LINES, TIER_NAMES, F35_GROUPED, NO_CLIENT_INTAKE, LABELS } from "../src/page/page-opportunities.mjs";
import { planningInputs } from "../src/page/page-opportunities-reader.mjs";
import { decideForPage } from "../src/page/action-decision.mjs";
import { researchDerivedQuestion, assessmentRecord, ROUTES, RELEVANCE } from "../src/research/research-derived.mjs";
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { declaredWorld, FIXTURE_TENANT, inputPathRef } from "./helpers/declared-world.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-rr172-${process.pid}`);
const ON = "2026-10-05";
const AT = "2026-10-05T00:00:00Z";
const SITE = "https://product.fixture.invalid";

/* ---------------- fixtures: two UNLIKE subjects, each with observed and research-derived questions ---------------- */
const observed = (subject, id, wording, over = {}, rec = {}) => ({
  record_type: "public_question", question_id: id, measurement_key: `public_question:${id}`, recorded_at: "2026-10-01T09:00:00Z",
  value: { subject, sourceId: "fixture-source", country: "c-one", language: "l-one", limits: "one fixture listing", kind: "OBSERVED", original: wording, reference: `https://qa.fixture.invalid/q/${id}`,
    provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" }, source: "fixture-source", surface: "source adapter", method: "source-adapter:fixture-source", ...over },
  ...rec,
});
const derived = (subject, wording, { queryId = "formed-1", planId = "plan-1", reference = null } = {}) => researchDerivedQuestion({ subject, planId, queryId, route: ROUTES.CLIENT_RESEARCH, wording, reference, at: AT });
const assess = (question, verdict = RELEVANCE.RELEVANT) => assessmentRecord({ question, draft: { verdict, declarationVersion: "declaration-v1", meaningTest: "the subject's declared offering", reason: "asks about the declared offering", source: { kind: "METHOD", ref: "fixture-relevance-method" } }, at: AT }).record;

const A = "fixture-subject-alpha", B = "fixture-subject-beta";
const DIM_A = possibleCombinations({ dimensions: [{ key: "knot", values: ["bowline", "sheet-bend"], source: "the fixture descriptor", applicability: "APPLIES" }] });
const DIM_B = possibleCombinations({ dimensions: [{ key: "ferment", values: ["miso", "kimchi", "kefir"], source: "the fixture descriptor", applicability: "APPLIES" }] });
const BOW = { knot: "bowline" }, SHEET = { knot: "sheet-bend" };
const MISO = { ferment: "miso" }, KIM = { ferment: "kimchi" };

/* C17 claim fixtures */
const src = (kind, over = {}) => ({ kind, name: `${kind.toLowerCase()} source`, link: `https://${kind.toLowerCase().replace(/_/g, "-")}.fixture.invalid/p`, readOn: "2026-10-02", ...over });
const finding = (ref = "fixture-finding") => ({ finding: "SUPPORTS", ref });
const claim = (states, source, over = {}) => ({ claimId: over.claimId ?? "c1", states, source, supports: finding(), ...over });
const BODY = "the fixture licensing body";
const bodyFee = (over = {}) => claim(CLAIM_KINDS.BODY_RULE, src(SOURCE_KINDS.BODY, { body: BODY }), { body: BODY, ...over });
const productFact = (link = `${SITE}/about`) => claim(CLAIM_KINDS.PRODUCT_FACT, src(SOURCE_KINDS.PRODUCT_SITE, { link }));
const ordinary = (over = {}) => claim(CLAIM_KINDS.OTHER, src(SOURCE_KINDS.RELATED), over);

/* existing pages */
const page = (pageId, headings, tenantId) => ({ pageId, tenantId, html: `<html><title>t</title><body>${headings.map((h) => `<h2>${h}</h2><p>body</p>`).join("")}</body></html>` });
const pop = (tenantId, pages, coverageState = "COMPLETE") => ({ tenantId, coverageState, pages });
const judged = (questionId, pageId, verdict, kind = "AGENT") => ({ questionId, pageId, verdict, reason: "the page answers this question in its own section", source: { kind, ref: "fixture-coverage-agent" } });
const judgements = (drafts) => coverageJudgementRecords(drafts, { on: ON }).records;

/* the REAL registered structure: the one subject whose tenant holds existing pages today (read once, read-only) */
const resolve = createTenantResolver();
const REAL_SIDE = resolveSide(resolve, RESOURCES.subject("almi-oet"));
const REAL = readExistingPagePopulation({ scope: { tenantId: REAL_SIDE.tenantId }, resolve }).population;
const REAL_T = REAL_SIDE.tenantId;
const realHeadings = () => {
  const all = REAL.pages.flatMap((p) => [...new Set(servedHeadingsOf(p.html).map(normaliseWording))].map((n) => ({ pageId: p.pageId, n, h: servedHeadingsOf(p.html).find((x) => normaliseWording(x) === n) })));
  const pagesOf = (n) => new Set(all.filter((x) => x.n === n).map((x) => x.pageId)).size;
  return all.filter((x) => x.n.length > 3 && pagesOf(x.n) === 1);
};

/* ================= F91 C13 · SEPARATE LINES, NEVER SUMMED, HONESTLY LABELLED ================= */

function allTiersRun() {
  const records = [observed(A, "o1", "How long does the result take?"), observed(A, "o2", "What does the fee include?", { country: "c-two" })];
  const r1 = derived(A, "How long does the result take?"), r2 = derived(A, "Which knot holds under load?", { queryId: "formed-2" });
  const conn = connectQuestions({ subject: A, possible: DIM_A, records: [...records, r1, r2], drafts: [
    { questionId: "o1", combination: BOW }, { questionId: r1.question_id, combination: BOW }, { questionId: r2.question_id, combination: SHEET }, { questionId: "o2", combination: BOW },
  ], on: ON, assessments: [assess(r1), assess(r2)] });
  const rows = [...conn.records,
    { record_type: "planning_demand", combination: BOW, state: "OWNED_OBSERVED", questionId: "owned-1", wording: "an owned query" },
    { record_type: "planning_demand", combination: SHEET, state: "CLIENT_CLAIM" },
    ...[BOW, SHEET].map((c) => ({ record_type: "planning_limbs", combination: c, credibleSource: true, productFit: true, distinctNeed: true }))];
  const inputs = planningInputs(rows);
  const plan = planPages({ dimensions: [{ key: "knot", values: ["bowline", "sheet-bend"], source: "the fixture descriptor", applicability: "APPLIES" }], ...inputs, needs: inputs.connected.needs, asAt: "as at 2026-10-05T00:00:00Z" });
  return { conn, rows, inputs, plan, r1, r2 };
}

test("T13a · C13 A RUN WITH ALL TIERS PRESENT, checked line by line: verified holds observed only; research-derived, client-received and owned search each on its own line; number 3 and the five action lines NOT MEASURED with the missing input named — never 0, never summed", () => {
  const { plan, inputs, conn } = allTiersRun();
  assert.deepEqual(conn.refused, [], "a lawful question of either tier was refused");
  assert.equal(inputs.malformed, 0);
  const L = plan.lines;
  assert.equal(L.possible.value, 2);
  /* verified: observed and verified only — the candidate with only research-derived demand is excluded by its demand limb, never verified */
  assert.deepEqual([L.verified.value, L.verified.excluded.demand, L.verified.kinds.researchDerived, L.verified.kinds.observedQuestions], [1, 1, 2, 2]);
  assert.deepEqual(plan.verified.opportunities, [BOW], "a candidate verified by a research-derived item");
  assert.equal(L.researchDerived.value, 2, "the research-derived line is not the count of candidates a research-derived question connects to");
  assert.equal(L.clientReceived.value, NOT_MEASURED);
  assert.equal(L.clientReceived.missing, NO_CLIENT_INTAKE, "client-received questions read as measured with no intake");
  assert.equal(L.ownedSearch.value, 1, "owned search evidence was not counted on its own line");
  assert.deepEqual(inputs.connected.needs.map((n) => n.tier).sort(), ["OBSERVED", "OBSERVED", "RESEARCH-DERIVED"]);
  for (const [tier, n] of [["OBSERVED", 2], ["RESEARCH-DERIVED", 1]]) assert.deepEqual([plan.needed[tier].value, plan.needed[tier].missing, plan.needed[tier].leftOut], [NOT_MEASURED, F35_GROUPED, n], `number 3 for ${tier}`);
  assert.deepEqual(Object.keys(plan.actions), ACTION_LINES);
  for (const a of ACTION_LINES) assert.deepEqual([plan.actions[a].value, plan.actions[a].missing], [NOT_MEASURED, F35_GROUPED], `${a} read as measured`);
  /* every line AS AT its time, with its left-out count; NOT MEASURED never printed as 0 */
  const every = [...Object.values(L), ...Object.values(plan.needed), ...Object.values(plan.actions)];
  for (const n of every) {
    const line = formatLine(n, plan.asAt);
    assert.ok(line.includes(plan.asAt) && / · left out (NOT MEASURED|\d+) \(/.test(line), `a line lacks its AS AT or its left-out count: ${n.label}`);
    if (n.value === NOT_MEASURED) assert.doesNotMatch(formatNumber(n), /: 0\b/, `a NOT MEASURED line reads 0: ${n.label}`);
  }
  assert.ok(!Object.keys(plan).some((k) => /total|sum/i.test(k)), "a summed line exists");
});

test("T13b · C13 THE ENTRY POINT prints each line on its own, AS AT and with its left-out count: client-received, number 3 by tier and the five action lines NOT MEASURED with the missing input named — never 0, never a total", () => {
  const W = declaredWorld();
  try {
    const r = spawnSync(process.execPath, W.argv(["bin/page-opportunities.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const lines = r.stdout.split("\n").filter((l) => /^ {4}\S/.test(l));
    const want = [LABELS.possible, LABELS.verified, LABELS.researchDerived, LABELS.clientReceived, LABELS.ownedSearch, ...TIER_NAMES.map((t) => `3 ${LABELS.needed} · ${t}`), ...ACTION_LINES];
    for (const w of want) {
      const l = lines.find((x) => x.trim().startsWith(w));
      assert.ok(l, `line missing: ${w}`);
      assert.match(l, / · as at \d{4}-\d{2}-\d{2}T/, `line lacks AS AT: ${w}`);
      assert.match(l, / · left out \S+/, `line lacks its left-out count: ${w}`);
    }
    for (const w of [LABELS.clientReceived, ...TIER_NAMES.map((t) => `3 ${LABELS.needed} · ${t}`), ...ACTION_LINES]) {
      const l = lines.find((x) => x.trim().startsWith(w));
      assert.match(l, /NOT MEASURED — missing /, `${w} is not NOT MEASURED`);
      assert.doesNotMatch(l.split(" · as at")[0], /: 0$/, `${w} reads 0`);
    }
    assert.doesNotMatch(r.stdout, /\btotal\b(?! or quota exists)|≥|≤/i, "a total or an order was printed");
    assert.doesNotMatch(r.stdout + r.stderr, /https?:\/\//);
  } finally { W.cleanup(); }
});

/* ================= F91 C14 · THE FLOW, IN ORDER, AND THE COVERAGE RECORD F35 READS ================= */

function declareBatch(W, subject, batch) {
  const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  reg.subjects.find((s) => s.subjectId === subject).members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: batch });
  writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2));
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  att.attachments.push({ ...att.attachments[0], resourceKind: "RESEARCH_BATCH", resourceRef: batch, tenantId: FIXTURE_TENANT });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  mkdirSync(join(W.root, "research", batch), { recursive: true });
}
function input(W, name, content) {
  mkdirSync(TMP, { recursive: true });
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(content));
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  att.attachments.push({ ...att.attachments[0], resourceKind: "INPUT_PATH", resourceRef: inputPathRef(p), tenantId: FIXTURE_TENANT });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  return p;
}
const jsonl = (p) => (existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);

test("T14a · C14 A CENSUS OF DECISIONS AGAINST COVERAGE RECORDS: the governed writer records one coverage record for EVERY need, in the same append as its connections — a need connected in a later run gets its own in that run", async () => {
  const W = declaredWorld();
  try {
    const DEMO = "almi-oet", BATCH = "fixture-rr172-coverage";
    declareBatch(W, DEMO, BATCH);
    const product = await productFromArgv(["node", "x", `--product=${DEMO}`], { scope: censusSubjectScope(DEMO) });
    const combo = { [product.axis.key]: product.variants[0] };
    const rd = derived(DEMO, "Which section explains the timing?");
    writeFileSync(join(W.root, "research", BATCH, "questions.jsonl"), [observed(DEMO, "e1", "How long does the result take?"), observed(DEMO, "e2", "how long does the result take", { country: "c-two", language: "l-two" }), observed(DEMO, "e3", "What does the fee include?")].map((x) => JSON.stringify(x)).join("\n") + "\n");
    writeFileSync(join(W.root, "research", BATCH, "research-derived-questions.jsonl"), JSON.stringify(rd) + "\n");
    writeFileSync(join(W.root, "research", BATCH, "relevance-assessments.jsonl"), JSON.stringify(assess(rd)) + "\n");
    const go = (drafts) => spawnSync(process.execPath, W.argv(["bin/demand-connect.mjs", `--subject=${DEMO}`, `--product=${DEMO}`, `--research-batch=${BATCH}`, `--on=${ON}`, `--drafts=${drafts}`, "--confirm"]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    const first = go(input(W, "d1.json", [{ questionId: "e1", combination: combo }, { questionId: "e2", combination: combo }, { questionId: "e3", combination: combo }]));
    assert.equal(first.status, 0, first.stdout + first.stderr);
    const store = join(W.root, "research", BATCH, "planning.jsonl");
    const census = () => { const rows = jsonl(store); const needs = new Set(rows.filter((x) => x.record_type === CONNECTION).map((x) => x.needId)); const cov = rows.filter((x) => x.record_type === COVERAGE); return { needs, cov, rows }; };
    let c = census();
    assert.equal(c.needs.size, 2);
    assert.deepEqual([...new Set(c.cov.map((x) => x.needId))].sort(), [...c.needs].sort(), "a need reached the store without its coverage record");
    assert.equal(c.cov.length, c.needs.size, "a need has more than one coverage record for one state");
    assert.match(first.stdout, /needs without a coverage record 0/);
    /* a LATER run connects a research-derived question to a NEW need: its coverage record is written in that same run, after its connection */
    const second = go(input(W, "d2.json", [{ questionId: rd.question_id, combination: combo }]));
    assert.equal(second.status, 0, second.stdout + second.stderr);
    c = census();
    assert.equal(c.needs.size, 3);
    assert.deepEqual([...new Set(c.cov.map((x) => x.needId))].sort(), [...c.needs].sort(), "the new need has no coverage record — coverage ran before its connection");
    const idx = (pred) => c.rows.findIndex(pred);
    const newNeed = c.rows.find((x) => x.record_type === CONNECTION && x.questionId === rd.question_id).needId;
    assert.ok(idx((x) => x.record_type === COVERAGE && x.needId === newNeed) > idx((x) => x.record_type === CONNECTION && x.questionId === rd.question_id), "the coverage record preceded the connection it covers");
    assert.match(second.stdout, /needs without a coverage record 0/);
    for (const cov of c.cov) assert.ok(Object.values(GROUPED).includes(cov.coverage) && typeof cov.relevantQuestionMissing === "boolean" && Array.isArray(cov.pages), "a coverage record lacks FULL · PARTIAL · NONE · CANNOT DECIDE, its pages or its missing-question flag");
    assert.doesNotMatch(first.stdout + second.stdout, /https?:\/\//);
  } finally { W.cleanup(); rmSync(TMP, { recursive: true, force: true }); }
});

test("T14b · C14 ADD SECTION IS REACHED BY F35's REAL DECISION RULE (src/page/action-decision.mjs) FED THE COVERAGE RECORD F91 WROTE — on the REAL existing pages; a FULL need gives no ADD SECTION (control)", () => {
  assert.ok(REAL && REAL.pages.length > 0, "EMPTY real population — the proof would be vacuous");
  const H = realHeadings();
  const host = [...new Set(H.map((x) => x.pageId))].find((id) => H.filter((x) => x.pageId === id).length >= 2);
  const samePage = H.filter((x) => x.pageId === host);
  const h1 = samePage[0];
  assert.ok(samePage.length >= 2, "the real covering page has fewer than two served headings");
  const cn = (needId, qs) => qs.map(([qid, wording]) => ({ record_type: CONNECTION, needId, questionId: qid, wording, combination: { axis: "one" }, tier: TIERS.OBSERVED }));
  const rows = [...cn("need:partial", [["p1", h1.h], ["p2", "A question no existing page answers in any of its sections?"]]), ...cn("need:full", [["f1", samePage[0].h], ["f2", samePage[1].h]])];
  const recs = coverageRecords({ subject: "almi-oet", rows, tenantId: REAL_T, population: REAL, on: ON });
  const partial = recs.find((r) => r.needId === "need:partial"), full = recs.find((r) => r.needId === "need:full");
  assert.deepEqual([partial.coverage, partial.relevantQuestionMissing, [...partial.missingQuestions]], [GROUPED.PARTIAL, true, ["p2"]]);
  assert.equal(full.coverage, GROUPED.FULL);
  const decide = (rec, pageId) => decideForPage({ pageId, questionCoverage: questionCoverageFor(rec, pageId), staleFacts: [], sameNeedPeers: [], sameIntentPeers: [] });
  const add = decide(partial, h1.pageId);
  const section = add.actions.find((a) => a.action === "ADD SECTION");
  assert.ok(section, "F35's real rule did not choose ADD SECTION from the coverage record F91 wrote");
  assert.ok(JSON.stringify(section).includes(partial.measurement_key), "ADD SECTION does not cite the coverage record");
  assert.ok(!decide(full, samePage[0].pageId).actions.some((a) => a.action === "ADD SECTION"), "CONTROL: a FULL need gave ADD SECTION");
  assert.equal(questionCoverageFor(partial, "no-such-page"), null);
  console.log(`  REAL (count-only): ${REAL.pages.length} existing pages · coverage ${REAL.coverageState} · PARTIAL → ADD SECTION 1 · FULL → ADD SECTION 0`);
});

test("T14c · C14/C10 GROUPING CONTROLS ON TWO UNLIKE SUBJECTS: country or language never splits a need; a translation joins only by a recorded judgement; two intents never merge; identical wording of either tier is one need", () => {
  for (const [subject, possible, combo, words] of [
    [A, DIM_A, BOW, ["How long does the result take?", "how long does the RESULT take", "How much does the test cost?", "How long does the result take to arrive?", "Kitna waqt lagta hai result mein?"]],
    [B, DIM_B, MISO, ["Why does the brine go cloudy?", "why does the brine go CLOUDY", "Can it be frozen?", "Why does the brine go cloudy at night?", "Pourquoi la saumure devient-elle trouble ?"]],
  ]) {
    const recs = [observed(subject, "g1", words[0]), observed(subject, "g2", words[1], { country: "c-two", language: "l-two" }), observed(subject, "g3", words[2]), observed(subject, "g4", words[3]), observed(subject, "g5", words[4], { language: "l-three" })];
    const rd = derived(subject, words[0]);
    const r = connectQuestions({ subject, possible, records: [...recs, rd], on: ON, assessments: [assess(rd)], drafts: [
      { questionId: "g1", combination: combo }, { questionId: "g2", combination: combo }, { questionId: "g3", combination: combo }, { questionId: "g4", combination: combo },
      { questionId: "g5", combination: combo, sameAs: { questionId: "g1", judgementRef: "fixture-judgement", reason: "the same question in another language" } }, { questionId: rd.question_id, combination: combo },
    ] });
    const needOf = (q) => r.records.find((x) => x.record_type === CONNECTION && x.questionId === q).needId;
    assert.equal(needOf("g2"), needOf("g1"), `${subject}: country or language split one need`);
    assert.equal(needOf("g5"), needOf("g1"), `${subject}: a recorded judgement did not join the translation`);
    assert.equal(needOf(rd.question_id), needOf("g1"), `${subject}: the same wording of the other tier became a second need`);
    assert.notEqual(needOf("g3"), needOf("g1"), `${subject}: two intents merged`);
    assert.notEqual(needOf("g4"), needOf("g1"), `${subject}: near-identical wording merged by similarity`);
    const unjudged = connectQuestions({ subject, possible, records: recs, on: ON, drafts: [{ questionId: "g1", combination: combo }, { questionId: "g5", combination: combo }] });
    assert.equal(new Set(unjudged.records.filter((x) => x.record_type === CONNECTION).map((x) => x.needId)).size, 2, `${subject}: a translation joined without a recorded judgement`);
  }
});

test("T14d · C14 NUMBER 3 TAKES NO NUMBER-2 OR DEMAND LIMB, for any tier: with number 2 NOT MEASURED, F35's recorded CREATE decisions are counted by tier; with none, every tier is NOT MEASURED — never 0", () => {
  const needs = [{ needId: "n1", tier: "OBSERVED" }, { needId: "n2", tier: "RESEARCH-DERIVED" }, { needId: "n3", tier: "RESEARCH-DERIVED" }];
  const decisions = new Map([["n1", { actions: [{ action: "CREATE" }] }], ["n2", { actions: [{ action: "CREATE" }] }], ["n3", { actions: [{ action: "MONITOR" }] }]]);
  const plan = planPages({ dimensions: [{ key: "d", values: ["a"], source: "fixture", applicability: "APPLIES" }], needs, decisions });
  assert.equal(plan.verified.value, NOT_MEASURED, "the fixture must hold number 2 NOT MEASURED");
  assert.deepEqual([plan.needed.OBSERVED.value, plan.needed["RESEARCH-DERIVED"].value, plan.needed["RESEARCH-DERIVED"].of], [1, 1, 2], "number 3 required a number-2 or demand limb");
  const none = neededNewPages({ needs });
  for (const t of TIER_NAMES) assert.deepEqual([none[t].value, none[t].missing], [NOT_MEASURED, F35_GROUPED]);
  const partly = neededNewPages({ needs, decisions: new Map([["n1", { actions: [{ action: "CREATE" }] }]]) });
  assert.equal(partly["RESEARCH-DERIVED"].value, NOT_MEASURED, "an undecided need was counted as not CREATE");
});

/* ================= F91 C15 · NO ORDER IS ASSERTED BETWEEN THE COUNTS ================= */

test("T15a · C15 A FIXTURE WITH NEEDED NEW PAGES EXCEEDING COMBINATIONS PASSES: no order is asserted, checked or implied, and possible combinations is never a ceiling", () => {
  const needs = ["x1", "x2", "x3"].map((id) => ({ needId: id, tier: "OBSERVED" }));
  const plan = planPages({ dimensions: [{ key: "d", values: ["a"], source: "fixture", applicability: "APPLIES" }], needs, decisions: new Map(needs.map((n) => [n.needId, { actions: [{ action: "CREATE" }] }])) });
  assert.deepEqual([plan.possible.value, plan.needed.OBSERVED.value], [1, 3]);
  assert.ok(!Object.keys(plan).some((k) => /order|verdict|ceiling|bound/i.test(k)), "the plan carries an order, an order verdict or a ceiling");
  assert.match(LABELS.possible, /not an upper bound on any other line/);
  for (const n of [plan.possible, ...Object.values(plan.lines), ...Object.values(plan.needed)]) assert.doesNotMatch(formatLine(n, "as at x"), /≥|≤|ceiling|DISPROVED|BREACH/i, `a line implies an order: ${n.label}`);
});

/* ================= F91 C16 · ADMISSION, BUILD ORDER AND CONNECTION, BY TIER ================= */

test("T16a · C16 A RELEVANT RESEARCH-DERIVED QUESTION IS ADMITTED, with its tier — never refused as 'not a question'", () => {
  const rd = derived(A, "Which knot holds under load?");
  assert.equal(refusalOf(rd, { subject: A, assessments: [assess(rd)] }), null);
  const r = connectQuestions({ subject: A, possible: DIM_A, records: [rd], drafts: [{ questionId: rd.question_id, combination: BOW }], on: ON, assessments: [assess(rd)] });
  assert.deepEqual([r.refused.length, r.records.filter((x) => x.record_type === CONNECTION).length], [0, 1]);
});

test("T16b · C16 IT IS NEVER HANDED ON AS OBSERVED: its connection carries the RESEARCH-DERIVED tier, its wording unchanged, its route and the formed question it answers — no observed date, country or sampling guessed", () => {
  const rd = derived(A, "  Which knot holds under load?  ", { reference: "a client's page they gave" });
  const [c] = connectQuestions({ subject: A, possible: DIM_A, records: [rd], drafts: [{ questionId: rd.question_id, combination: BOW }], on: ON, assessments: [assess(rd)] }).records.filter((x) => x.record_type === CONNECTION);
  assert.deepEqual([c.tier, c.wording, c.route, c.formedQuestion.queryId, c.formedQuestion.planId], [TIERS.RESEARCH_DERIVED, rd.wording.text, ROUTES.CLIENT_RESEARCH, "formed-1", "plan-1"]);
  assert.deepEqual([c.observedOn, c.country, c.language, c.sampling.method, c.source.reference], [NOT_MEASURED, NOT_MEASURED, NOT_MEASURED, NOT_MEASURED, NOT_MEASURED]);
  assert.equal(c.reference.value, rd.reference.value, "the optional reference was not kept as given");
  assert.equal(evidenceStateOf(c).meta?.inputRefs?.[0]?.startsWith("research_derived_question:"), true, "its connection is read as derived from a public question");
});

test("T16c · C16 IT NEVER ENTERS VERIFIED DEMAND: through the planner's own reader, a candidate with only research-derived connections stays out of verified opportunities", () => {
  const rd = derived(A, "Which knot holds under load?");
  const rows = [...connectQuestions({ subject: A, possible: DIM_A, records: [rd], drafts: [{ questionId: rd.question_id, combination: SHEET }], on: ON, assessments: [assess(rd)] }).records,
    { record_type: "planning_limbs", combination: SHEET, credibleSource: true, productFit: true, distinctNeed: true }];
  const inputs = planningInputs(rows);
  const plan = planPages({ dimensions: [{ key: "knot", values: ["sheet-bend"], source: "fixture", applicability: "APPLIES" }], ...inputs, needs: inputs.connected.needs });
  assert.deepEqual([plan.verified.value, plan.verified.excluded.demand, plan.lines.researchDerived.value], [0, 1, 1], "a research-derived question entered verified demand");
  assert.equal(DEMAND_RULES["RESEARCH-DERIVED"].qualifies, false);
});

test("T16d · C16 IT IS CONNECTED ONLY THROUGH C9's PATH: the same candidate, duplicate and one-need-one-candidate checks bind it — a non-candidate is refused", () => {
  const rd = derived(A, "Which knot holds under load?");
  const run = (drafts, existing = []) => connectQuestions({ subject: A, possible: DIM_A, records: [rd], drafts, existing, on: ON, assessments: [assess(rd)] });
  assert.deepEqual(run([{ questionId: rd.question_id, combination: { knot: "clove-hitch" } }]).refused.map((x) => x.code), [REFUSAL.CANDIDATE]);
  const once = run([{ questionId: rd.question_id, combination: BOW }]);
  assert.deepEqual(run([{ questionId: rd.question_id, combination: BOW }], once.records).refused.map((x) => x.code), [REFUSAL.DUPLICATE]);
});

test("T16e · C16 ONLY A RELEVANT ONE: a research-derived question HELD (not yet assessed) or REJECTED is refused by name", () => {
  const rd = derived(A, "Which knot holds under load?");
  assert.equal(refusalOf(rd, { subject: A, assessments: [] }), REFUSAL.NOT_RELEVANT);
  assert.equal(refusalOf(rd, { subject: A, assessments: [assess(rd, RELEVANCE.REJECTED)] }), REFUSAL.NOT_RELEVANT);
  assert.equal(refusalOf(rd, { subject: A, assessments: [assess(rd, RELEVANCE.HELD)] }), REFUSAL.NOT_RELEVANT);
});

test("T16f · C16 A LEAD, KEYWORD IDEA, CLIENT CLAIM OR FIXTURE STILL NEVER ENTERS — and another subject's research-derived question is refused", () => {
  const rd = derived(A, "Which knot holds under load?");
  const fixtureRd = { ...rd, question_id: "rd-fixture", fixture: true };
  const otherRd = derived(B, "Which knot holds under load?");
  const recs = [{ record_type: "research_lead", lead_id: "l1" }, { record_type: "keyword_signal", signal_id: "k1" }, observed(A, "c1", "Is it good?", { kind: "CLIENT_CLAIM" }), fixtureRd, otherRd];
  const r = connectQuestions({ subject: A, possible: DIM_A, records: recs, on: ON, assessments: [assess(fixtureRd), assess(otherRd)], drafts: ["l1", "k1", "c1", "rd-fixture", otherRd.question_id].map((id) => ({ questionId: id, combination: BOW })) });
  assert.deepEqual(r.refused.map((x) => x.code), [REFUSAL.LEAD, REFUSAL.KEYWORD, REFUSAL.CLIENT_CLAIM, REFUSAL.FIXTURE, REFUSAL.OTHER_SUBJECT]);
});

test("T16g · C16 A FIELD IT DOES NOT HAVE IS NOT MEASURED, never guessed and never a refusal: no plan id and no reference still admits it", () => {
  const rd = derived(A, "Which knot holds under load?", { planId: null, reference: null });
  const r = connectQuestions({ subject: A, possible: DIM_A, records: [rd], drafts: [{ questionId: rd.question_id, combination: BOW }], on: ON, assessments: [assess(rd)] });
  assert.deepEqual(r.refused, [], "a research-derived question was refused for a field it does not have");
  const [c] = r.records.filter((x) => x.record_type === CONNECTION);
  assert.deepEqual([c.formedQuestion.planId, c.reference], [NOT_MEASURED, NOT_MEASURED]);
});

/* ================= F91 C17 · ONE ANSWER-SOURCE RULE, BY FIELD AND CLAIM (RTP-1 P14's controls, one per limb) ================= */

const viaPath = (answer) => connectQuestions({ subject: A, possible: DIM_A, records: [observed(A, "a1", "What is the fee?")], drafts: [{ questionId: "a1", combination: BOW, answer }], officialSites: [SITE], on: ON }).records.find((x) => x.record_type === NEED).answer;

test("T17a · P14 · A BODY'S FEE FROM THAT BODY PASSES — labelled the responsible body's own source", () => {
  const a = viaPath({ claims: [bodyFee()] });
  assert.deepEqual([a.state, a.claims[0].label, a.centralSupported], [ANSWER_STATES.SUPPORTED, LABEL.BODY, true]);
});

test("T17b · P14 · THE SAME FEE FROM A THIRD PARTY PRESENTED AS OFFICIAL FAILS: a body's rule cites only that body", () => {
  for (const s of [src(SOURCE_KINDS.RELATED), src(SOURCE_KINDS.BODY, { body: "another body" }), src(SOURCE_KINDS.PRODUCT_SITE, { link: `${SITE}/fees` })]) {
    const a = viaPath({ claims: [claim(CLAIM_KINDS.BODY_RULE, s, { body: BODY })] });
    assert.deepEqual([a.state, a.claims[0].why], [ANSWER_STATES.UNKNOWN, CLAIM_UNKNOWN.BODY], `a body's rule was accepted from ${s.kind}`);
  }
});

test("T17c · P14 · THAT THIRD PARTY'S FIGURE STATED AS ITS ESTIMATE, LABELLED SECONDARY, PASSES — never an official fee or a guaranteed time", () => {
  const a = viaPath({ claims: [ordinary({ estimate: true })] });
  assert.deepEqual([a.state, a.claims[0].label], [ANSWER_STATES.SUPPORTED, LABEL.SECONDARY]);
  assert.match(a.claims[0].statedAs, /estimate — not an official fee, not a guaranteed time/);
  assert.doesNotMatch(JSON.stringify(a), /"label":"[^"]*(OFFICIAL|VERIFIED|RESPONSIBLE BODY)/i, "an estimate was presented as official or verified");
  assert.equal(viaPath({ claims: [bodyFee({ estimate: true })] }).claims[0].why, CLAIM_UNKNOWN.ESTIMATE_AS_OFFICIAL, "an estimate was presented as an official fee");
});

test("T17d · P14 · AN ORDINARY CLAIM WITH A SUPPORTING RELATED SOURCE PASSES — labelled SECONDARY, never SECONDARY VERIFIED, never official", () => {
  const a = viaPath({ claims: [ordinary()] });
  assert.deepEqual([a.state, a.claims[0].label], [ANSWER_STATES.SUPPORTED, LABEL.SECONDARY]);
  assert.equal(LABEL.SECONDARY, "SECONDARY");
  assert.doesNotMatch(Object.values(LABEL).join(" "), /SECONDARY VERIFIED|OFFICIAL/);
});

test("T17e · P14 · THE SAME ORDINARY CLAIM IS NEVER REFUSED FOR WANT OF AN OFFICIAL BODY (supported is never tightened to officially supported)", () => {
  for (const s of [src(SOURCE_KINDS.RELATED), src(SOURCE_KINDS.RELATED, { name: "a trade guide" })]) assert.equal(claimSupport(ordinary({ source: s })).state, ANSWER_STATES.SUPPORTED, "an ordinary claim was refused for want of an official body");
});

test("T17f · P14 · A NON-SUPPORTING SOURCE IS REFUSED — and an unnamed, unlinked or undated one is never loosened into support", () => {
  assert.equal(claimSupport(ordinary({ supports: { finding: "DOES_NOT_SUPPORT", ref: "f" } })).why, CLAIM_UNKNOWN.NOT_SUPPORTED);
  assert.equal(claimSupport(ordinary({ supports: undefined })).why, CLAIM_UNKNOWN.NOT_SUPPORTED);
  for (const k of ["name", "link", "readOn"]) assert.equal(claimSupport(ordinary({ source: src(SOURCE_KINDS.RELATED, { [k]: "" }) })).why, CLAIM_UNKNOWN.SOURCE, `a source without its ${k} was accepted`);
});

test("T17g · P14 · AN UNSUPPORTED ANSWER IS UNKNOWN; a partly supported one states the supported part and marks the rest UNKNOWN", () => {
  assert.equal(viaPath({ claims: [ordinary({ supports: { finding: "DOES_NOT_SUPPORT", ref: "f" } })] }).state, ANSWER_STATES.UNKNOWN);
  assert.equal(viaPath({ claims: [] }).state, ANSWER_STATES.UNKNOWN);
  const p = viaPath({ claims: [ordinary({ claimId: "c1" }), ordinary({ claimId: "c2", central: false, supports: { finding: "DOES_NOT_SUPPORT", ref: "f" } })] });
  assert.deepEqual([p.state, p.claims.map((c) => c.state)], [ANSWER_STATES.PARTLY, [ANSWER_STATES.SUPPORTED, ANSWER_STATES.UNKNOWN]]);
});

test("T17h · C17 A PRODUCT-FACT CONTROL: a fact about the product from its own declared site is supported — F44's capability-claim rule is never consulted", () => {
  assert.deepEqual([viaPath({ claims: [productFact()] }).state, viaPath({ claims: [productFact()] }).claims[0].label], [ANSWER_STATES.SUPPORTED, LABEL.PRODUCT]);
  assert.equal(viaPath({ claims: [productFact("https://elsewhere.fixture.invalid/about")] }).claims[0].why, CLAIM_UNKNOWN.PRODUCT);
  const code = readFileSync(join(REPO, "src/page/answer-support.mjs"), "utf8");
  assert.doesNotMatch(code.replace(/\/\*[\s\S]*?\*\//g, ""), /import[^;]*(capabilit|f44|claim-qualifier)/i, "the answer path consults F44's capability-claim rule");
});

test("T17i · C17 A TIER-4 SUPPORTING-SOURCE CONTROL: a source of the registry's tier 4 that actually supports an ordinary claim is accepted — no source category is refused as a whole (FS-A1)", () => {
  const c = claimSupport(ordinary({ source: src(SOURCE_KINDS.RELATED, { registryTier: 4, category: "community" }) }));
  assert.deepEqual([c.state, c.label], [ANSWER_STATES.SUPPORTED, LABEL.SECONDARY]);
});

test("T17j · C17 A FORUM REPLY NEVER ANSWERS; RESEARCH-PROVIDER ANSWER TEXT IS NEVER EVIDENCE; NO CHECKER STANDS IN FOR A SOURCE — and the answer path never calls the fact-registry validator", () => {
  assert.equal(claimSupport(ordinary({ source: src(SOURCE_KINDS.FORUM) })).why, CLAIM_UNKNOWN.FORUM);
  assert.equal(claimSupport(ordinary({ source: src(SOURCE_KINDS.PROVIDER_TEXT) })).why, CLAIM_UNKNOWN.PROVIDER);
  assert.equal(claimSupport({ ...ordinary(), checkedBy: "someone" }).why, CLAIM_UNKNOWN.CHECKER);
  const paths = decisionCallPaths({ entries: ["src/page/answer-support.mjs", "src/page/demand-connection.mjs"] });
  assert.deepEqual(paths.faults, []);
  for (const f of ["src/page/answer-support.mjs", "src/page/demand-connection.mjs", "src/page/grouped-need-coverage.mjs"]) assert.doesNotMatch(readFileSync(join(REPO, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""), /facts\/validate/, `${f} calls the fact-registry validator`);
});

/* ================= F91 C18 · HELD MEANS UNSUPPORTED ================= */

test("T18 · C18 A CONTROL PAIR: a group whose central answer is SECONDARY-supported is NOT held (and a non-central UNKNOWN never holds it); an unsupported central answer IS held", () => {
  const rows = (answer) => { const r = connectQuestions({ subject: A, possible: DIM_A, records: [observed(A, "h1", "Is it waterproof?")], drafts: [{ questionId: "h1", combination: BOW, answer }], officialSites: [SITE], on: ON }).records; const needId = r.find((x) => x.record_type === NEED).needId; return [...r, { record_type: COVERAGE, needId, coverage: GROUPED.NONE }]; };
  const rec = (answer) => readConnections(rows(answer)).needs[0].recommendation;
  assert.equal(rec({ claims: [ordinary()] }), RECOMMENDATION.NOT_COVERED, "a SECONDARY-supported central answer was HELD");
  assert.equal(rec({ claims: [ordinary(), ordinary({ claimId: "c2", central: false, supports: undefined })] }), RECOMMENDATION.NOT_COVERED, "a non-central UNKNOWN held the group");
  assert.equal(rec({ claims: [ordinary({ supports: undefined })] }), RECOMMENDATION.HELD_ANSWER, "an unsupported central answer was not HELD");
});

/* ================= F33 C8 · COVERAGE FOR A GROUPED NEED (its own function, rulings 3a and 3b) ================= */

const need = (needId, qs) => ({ needId, questions: qs.map(([questionId, wording]) => ({ questionId, wording })) });

test("T33a · F33 C8 A CONTROL FOR EACH COVERAGE VALUE — on the REAL existing pages (FULL and PARTIAL by exact match; CANNOT DECIDE as the real record stands; NONE over a population SET COMPLETE by the test, with recorded positive evidence against every page)", () => {
  assert.ok(REAL && REAL.pages.length > 0, "EMPTY real population");
  const H = realHeadings();
  const [x, y] = [H[0], H.find((h) => h.pageId !== H[0].pageId)];
  const D = (n, population, js = []) => decideGroupedNeedCoverage({ need: n, tenantId: REAL_T, population, judgements: js });
  const full = D(need("n-full", [["q1", x.h], ["q2", `  ${y.h.toUpperCase()}?`]]), REAL);
  assert.deepEqual([full.outcome, full.asF33, [...full.coveringPages].sort()], [GROUPED.FULL, NEED_OUTCOMES.COVERED, [x.pageId, y.pageId].sort()]);
  const partial = D(need("n-part", [["q1", x.h], ["q3", "A question no existing page answers anywhere?"]]), REAL);
  assert.deepEqual([partial.outcome, partial.asF33, [...partial.missingQuestions]], [GROUPED.PARTIAL, NEED_OUTCOMES.COVERED, ["q3"]]);
  /* the REAL record as it stands (coverage recorded PARTIAL, no evidence): CANNOT DECIDE with the missing fact named — never NONE */
  const asIs = D(need("n-none", [["q3", "A question no existing page answers anywhere?"]]), REAL);
  assert.deepEqual([asIs.outcome, asIs.asF33, asIs.missingFact?.undecided?.[0]?.pageIds?.length], [GROUPED.CANNOT_DECIDE, NEED_OUTCOMES.CANNOT_DECIDE, REAL.pages.length]);
  /* NONE: positive evidence (a recorded agent judgement) against EVERY real page, over the population SET COMPLETE by the test — said so */
  const against = judgements(REAL.pages.map((p) => judged("q3", p.pageId, "DOES_NOT_COVER")));
  const none = D(need("n-none", [["q3", "A question no existing page answers anywhere?"]]), { ...REAL, coverageState: "COMPLETE" }, against);
  assert.deepEqual([none.outcome, none.asF33], [GROUPED.NONE, NEED_OUTCOMES.NOT_COVERED]);
  const notComplete = D(need("n-none", [["q3", "A question no existing page answers anywhere?"]]), REAL, against);
  assert.deepEqual([notComplete.outcome, notComplete.missingFact?.populationRecordedComplete], [GROUPED.CANNOT_DECIDE, false], "NONE was given over a population not recorded COMPLETE");
  const oneShort = D(need("n-none", [["q3", "A question no existing page answers anywhere?"]]), { ...REAL, coverageState: "COMPLETE" }, against.slice(1));
  assert.equal(oneShort.outcome, GROUPED.CANNOT_DECIDE, "NONE was given without positive evidence against every existing page");
  /* REFUSED, as F34 refuses: missing, unknown-shape or another tenant's information is never read as empty */
  assert.equal(D(need("n", [["q1", x.h]]), null).outcome, GROUPED.REFUSED);
  assert.equal(D(need("n", [["q1", x.h]]), { ...REAL, coverageState: "SOMETIMES" }).outcome, GROUPED.REFUSED);
  assert.equal(decideGroupedNeedCoverage({ need: need("n", [["q1", x.h]]), tenantId: "tenant:00000000000000000000000000000abc", population: REAL }).outcome, GROUPED.REFUSED);
  console.log(`  REAL (count-only): ${REAL.pages.length} existing pages · FULL 1 · PARTIAL 1 (1 missing question named) · CANNOT DECIDE as recorded 1 · NONE over a population set COMPLETE by the test 1`);
});

test("T33b · F33 C8 THE SAME CONTROLS ON AN UNLIKE SUBJECT (constructed: no other tenant holds existing pages today) — FULL by recorded judgements in other words; PARTIAL naming the missing question; NONE; CANNOT DECIDE", () => {
  const T2 = "tenant:00000000000000000000000000000b02";
  const pages = [page("k1", ["Brine and its clarity", "Storage"], T2), page("k2", ["Fermenting at home"], T2)];
  const P = pop(T2, pages);
  const n = need("brine", [["b1", "Why does the brine go cloudy?"], ["b2", "Can it be frozen?"]]);
  const D = (js, population = P) => decideGroupedNeedCoverage({ need: n, tenantId: T2, population, judgements: judgements(js) });
  /* the same need expressed WITHOUT the page's own words: only a recorded judgement can say it is served (ruling 3a) */
  assert.equal(D([judged("b1", "k1", "COVERS"), judged("b2", "k1", "COVERS", "METHOD")]).outcome, GROUPED.FULL);
  const part = D([judged("b1", "k1", "COVERS")]);
  assert.deepEqual([part.outcome, [...part.missingQuestions], [...part.coveringPages]], [GROUPED.PARTIAL, ["b2"], ["k1"]]);
  const all = pages.flatMap((p) => ["b1", "b2"].map((q) => judged(q, p.pageId, "DOES_NOT_COVER")));
  assert.equal(D(all).outcome, GROUPED.NONE);
  assert.equal(D(all.slice(1)).outcome, GROUPED.CANNOT_DECIDE);
  assert.equal(D(all, pop(T2, pages, "PARTIAL")).outcome, GROUPED.CANNOT_DECIDE);
  assert.equal(D([]).outcome, GROUPED.CANNOT_DECIDE, "no evidence at all decided coverage");
});

test("T33c · F33 C8 RULING 3(a): NEVER BY SIMILARITY — a heading one word away, or sharing a stem, never covers; only an EXACT match after the one declared normalisation (case, white space, terminal punctuation) does", () => {
  const T2 = "tenant:00000000000000000000000000000b02";
  const P = pop(T2, [page("s1", ["Why does the brine go cloudy at night?", "Cloudiness of brines"], T2)]);
  const D = (wording) => decideGroupedNeedCoverage({ need: need("n", [["q", wording]]), tenantId: T2, population: P }).outcome;
  assert.equal(D("why does the brine go CLOUDY   at night"), GROUPED.FULL, "an exact match after the declared normalisation did not cover");
  assert.equal(D("Why does the brine go cloudy?"), GROUPED.CANNOT_DECIDE, "a heading one phrase away covered the question — similarity decided coverage");
  assert.equal(D("Why does the brine go cloudy at noon?"), GROUPED.CANNOT_DECIDE, "a heading one word away covered the question");
  assert.equal(D("Cloudy brine"), GROUPED.CANNOT_DECIDE, "a shared stem covered the question");
  assert.equal(servedHeadingsOf("<h4>x</h4><p>Why does the brine go cloudy?</p>").length, 0, "body text or a minor heading was read as a served question");
});

test("T33d · F33 C8 RULING 3(a): A RECORDED JUDGEMENT IS A METHOD'S OR AN AGENT'S — never an approval, never the word human; a malformed one is refused and decides nothing", () => {
  const ok = judged("q", "p", "COVERS");
  assert.equal(judgementRefusal({ record_type: COVERAGE_JUDGEMENT, value: ok }), null);
  for (const [bad, code] of [
    [{ ...ok, approvedBy: "owner" }, "A_COVERAGE_JUDGEMENT_IS_NEVER_AN_APPROVAL"], [{ ...ok, source: { ...ok.source, approval: true } }, "A_COVERAGE_JUDGEMENT_IS_NEVER_AN_APPROVAL"],
    [{ ...ok, source: { kind: "AGENT", ref: "a human reviewer" } }, "JUDGEMENT_SOURCE_IS_A_METHOD_OR_AN_AGENT_NEVER_HUMAN"], [{ ...ok, source: { kind: "PERSON", ref: "x" } }, "JUDGEMENT_NAMES_NO_METHOD_OR_AGENT"],
    [{ ...ok, reason: "one\ntwo" }, "JUDGEMENT_REASON_NOT_ONE_LINE"], [{ ...ok, verdict: "PROBABLY" }, "JUDGEMENT_VERDICT_NOT_COVERS_OR_DOES_NOT_COVER"],
  ]) assert.equal(coverageJudgementRecords([bad], { on: ON }).refused[0], code, JSON.stringify(Object.keys(bad)));
  const T2 = "tenant:00000000000000000000000000000b02";
  const r = decideGroupedNeedCoverage({ need: need("n", [["q", "Can it be frozen?"]]), tenantId: T2, population: pop(T2, [page("p", ["Storage"], T2)]), judgements: [{ record_type: COVERAGE_JUDGEMENT, value: { ...ok, approvedBy: "owner" } }] });
  assert.deepEqual([r.outcome, [...r.refusedJudgements]], [GROUPED.CANNOT_DECIDE, ["A_COVERAGE_JUDGEMENT_IS_NEVER_AN_APPROVAL"]]);
});

test("T33e · F33 C8 A GROUPED NEED IS NEVER REFUSED FOR NOT BEING A REGISTERED VALUE; PARTIAL is never FULL or NONE; the missing relevant question is NAMED in the coverage record F91 writes", () => {
  const T2 = "tenant:00000000000000000000000000000b02";
  const P = pop(T2, [page("p", ["Can it be frozen?"], T2)]);
  const r = decideGroupedNeedCoverage({ need: need("free-wording", [["q1", "Can it be frozen?"], ["q2", "How long does it keep once opened?"]]), tenantId: T2, population: P });
  assert.notEqual(r.outcome, GROUPED.REFUSED, "a grouped need was refused for not being a registered value");
  assert.notEqual(r.reason, "CANDIDATE_NEED_IS_NOT_A_REGISTERED_VALUE");
  assert.deepEqual([r.outcome, [...r.missingQuestions]], [GROUPED.PARTIAL, ["q2"]]);
  const rows = [["q1", "Can it be frozen?"], ["q2", "How long does it keep once opened?"]].map(([q, w]) => ({ record_type: CONNECTION, needId: "free-wording", questionId: q, wording: w, combination: { x: "y" } }));
  const [rec] = coverageRecords({ subject: B, rows, tenantId: T2, population: P, on: ON });
  assert.deepEqual([rec.coverage, rec.relevantQuestionMissing, [...rec.missingQuestions], rec.pages[0]?.newQuestionInIntent], [GROUPED.PARTIAL, true, ["q2"], true]);
  assert.equal(evidenceStateOf(rec).state, "INFERRED");
});

test("T33f · F33 C8 RULING 3(b): ITS OWN FUNCTION — F33's existing function, F34 (its only caller) and F35's rule are byte-for-byte the merged base; the new function imports F33's outcome names only", () => {
  const BASE = Object.freeze({ "src/page/need-coverage.mjs": "a435564272cdda13b6e8555a653631c3348b1278", "src/page/existing-page-first.mjs": "0f26022318a7522f6df6c1545a3044fa66bd6a1f", "src/page/existing-page-population.mjs": "bf88e69fe6922ae2f6bee315ef8a2d12e824eedf", "src/page/action-decision.mjs": "075da1fdb24db4f47ff2fdd4c206d6f6e0fa1b95", "src/page/action-evidence.mjs": "f87f4525e00bddf09ddddc80bebfe87d5cb09e40" });
  for (const [f, blob] of Object.entries(BASE)) assert.equal(execFileSync("git", ["-C", REPO, "ls-files", "-s", f], { encoding: "utf8" }).split(/\s+/)[1], blob, `${f} changed — F33's existing function, F34 or F35 is not untouched`);
  const g = readFileSync(join(REPO, "src/page/grouped-need-coverage.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.match(g, /import \{ NEED_OUTCOMES \} from "\.\/need-coverage\.mjs";/);
  assert.doesNotMatch(g, /decideNeedCoverage|judgePage|sameStem|\bstem\(/, "the grouped-need function reuses F33's stem matcher — similarity");
  assert.deepEqual(AS_F33, { FULL: "COVERED", PARTIAL: "COVERED", NONE: "NOT_COVERED", CANNOT_DECIDE: "CANNOT_DECIDE", REFUSED: "REFUSED" });
  assert.equal(GROUPED_REASONS.FULL.length > 0, true);
});

/* ================= F33 RE-PROOF · the ten EVIDENCE lines its parser does not pin (ruling 3c) ================= */

const F33_TESTS = readFileSync(join(REPO, "test/f33-need-coverage.test.mjs"), "utf8");
const MINE = readFileSync(new URL(import.meta.url), "utf8");
const SAB = existsSync(join(REPO, "test/helpers/rr172-sabotage.mjs")) ? readFileSync(join(REPO, "test/helpers/rr172-sabotage.mjs"), "utf8") : "";
const named = (src, prefix) => new RegExp(`test\\("${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(src);

test("R33 · F33's ten unparsed evidence items are each proved by a named test — production path, firing control and sabotage per clause C1–C8; REAL structures; the real record as it is; different wording; the call-path enumeration; the trail; the full suite in CI; the board route", () => {
  const map = {
    E1_production_path: [[F33_TESTS, "C1 ·"], [F33_TESTS, "C6 ·"], [MINE, "T14a ·"]],
    E2_firing_control: [[F33_TESTS, "C3 · NOT COVERED is NEVER given"], [F33_TESTS, "C7 ·"], [MINE, "T33c ·"], [MINE, "T33d ·"]],
    E4_three_outcomes_on_real_structures: [[F33_TESTS, "C2 · COVERED on the REAL structure"], [F33_TESTS, "C3 · NOT COVERED on the REAL structure"], [F33_TESTS, "C4 · CANNOT DECIDE — the REAL record"], [MINE, "T33a ·"]],
    E5_real_record_as_it_is: [[F33_TESTS, "C4 · CANNOT DECIDE — the REAL record as it is"], [MINE, "T33a ·"]],
    E6_different_wording: [[F33_TESTS, "C2 · the SAME need in DIFFERENT WORDS"], [MINE, "T33b ·"]],
    E7_call_path_enumeration: [[F33_TESTS, "C6 ·"], [MINE, "R33-E7 ·"]],
    E8_trail_before_and_after: [[F33_TESTS, "the production trail was not written by this file"], [MINE, "the production trail was not written by this file"]],
    E9_full_suite_as_ci_runs: [[MINE, "R33-E9 ·"]],
    E10_board_route: [[MINE, "R33-E10 ·"]],
  };
  for (const [item, tests] of Object.entries(map)) for (const [src, prefix] of tests) assert.ok(named(src, prefix), `${item}: no test named "${prefix}"`);
  /* E3 · a sabotage per clause, C1–C8, each naming its test (test/helpers/rr172-sabotage.mjs) */
  for (const clause of ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"]) assert.match(SAB, new RegExp(`"F33 ${clause} · `), `E3: no sabotage for F33 ${clause}`);
});

test("R33-E7 · the call paths of the grouped-need decision and its writer, enumerated over the real tree with its bound, reach no network, process, connector or paid call — and the enumeration fires when one is planted", () => {
  const entries = ["src/page/grouped-need-coverage.mjs", "src/page/demand-connection.mjs"];
  const r = decisionCallPaths({ entries });
  assert.deepEqual(r.faults, []);
  assert.ok((r.visited ?? r.modules ?? []).length !== 0 || r.faults.length === 0);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("R33-E9 · the full suite runs as CI runs it: the CI workflow runs every test file with node --test on each pull request and on main", () => {
  const dir = join(REPO, ".github", "workflows");
  const wf = execFileSync("git", ["-C", REPO, "ls-files", ".github/workflows"], { encoding: "utf8" }).split("\n").filter(Boolean).map((f) => readFileSync(join(REPO, f), "utf8")).join("\n");
  assert.ok(existsSync(dir) && wf.length > 0, "no CI workflow is tracked");
  assert.match(wf, /pull_request/);
  assert.match(wf, /\bmain\b/);
  assert.match(wf, /npm test|node --test/);
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.match(pkg.scripts?.test ?? "", /node --test|test\//, "npm test does not run the test files");
});

test("R33-E10 · F33 moves only through the production validator and the audit trail: its REOPENED is on the board and in the trail, and a VERIFIED-PASS row carries a REAL VERIFIED event with every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const f33 = DECLARED.F33;
  const reopened = f33.events.filter((e) => e.kind === "REOPENED");
  assert.equal(reopened.at(-1)?.reason, "AUTHORITATIVE_REQUIREMENT_CHANGE");
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.action === "REOPENED" && e.metadata?.featureId === "F33"), "F33's REOPENED is not in the audit trail");
  if (f33.state === "VERIFIED-PASS") {
    const v = f33.events.filter((e) => e.kind === "VERIFIED").at(-1);
    assert.ok(f33.events.indexOf(v) > f33.events.indexOf(reopened.at(-1)), "F33 is VERIFIED-PASS with no VERIFIED event after its reopening");
    assert.equal(v.population, "REAL");
    assert.ok(Object.values(v.clauses ?? {}).length >= 8 && Object.values(v.clauses).every((c) => c === "PROVED" || c?.verdict === "PROVED"), "F33 is VERIFIED-PASS with a clause not PROVED");
  } else assert.equal(f33.state, "IN-PROGRESS");
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
