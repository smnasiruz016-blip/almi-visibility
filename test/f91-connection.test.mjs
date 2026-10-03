/**
 * 🔴 RR-153 · F91 · THE QUESTION-TO-PAGE-CANDIDATE CONNECTION (Acceptance Amendment 2, _handoffs fff60df).
 *
 * Fixtures DRIVE the rules; they never move F91 on real data. Every refusal has a CONTROL that admits the correct case, so each assertion
 * can fail both ways. The entry point runs in a declared world (a confined copy of the data root). REAL reads the real stores.
 *
 *   K1 C9 one connection keeps the original, its source, date, country, language and sampling      K7 C11 one sourced answer or UNKNOWN
 *   K2 C9 each refused kind, by name, with its control                                             K8 C11 no checker field, anywhere
 *   K3 C10 country and language never split one need                                               K9 C12 coverage before a new page
 *   K4 C10 materially different intents stay apart; never by similarity                            K10 the planner reads what the writer wrote
 *   K5 C10 a country-specific difference is a SECTION, never a second need                         K11 two unrelated products
 *   K6 C10 one need, one page candidate                                                            K12 evidence states · K13 neutrality
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

import { connectQuestions, readConnections, refusalOf, answerOf, REFUSAL, ANSWER_UNKNOWN, RECOMMENDATION, CONNECTION, SAMENESS, NEED } from "../src/page/demand-connection.mjs";
import { possibleCombinations, NOT_MEASURED } from "../src/page/page-opportunities.mjs";
import { readProductPlan, planningInputs } from "../src/page/page-opportunities-reader.mjs";
import { evidenceStateOf } from "../src/evidence/evidence-state-adapters.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld, FIXTURE_TENANT, inputPathRef, DATA_ROOT } from "./helpers/declared-world.mjs";
import { PRODUCT as KNOTS } from "../products/neutral-test-knots/product.mjs";
import { PRODUCT as FERMENTS } from "../products/neutral-test-ferments/product.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const TMP = join(tmpdir(), `almi-f91-connect-${process.pid}`);
const ON = "2026-10-04";
const S = "fixture-subject-one";
const OFFICIAL = "https://official.fixture.invalid";

const q = (id, wording, over = {}, rec = {}) => ({
  record_type: "public_question", question_id: id, measurement_key: `public_question:${id}`, recorded_at: "2026-10-01T09:00:00Z",
  value: { subject: S, sourceId: "fixture-source", country: "c-one", language: "l-one", limits: "one fixture listing", kind: "OBSERVED", original: wording, reference: `https://fixture-qa.invalid/q/${id}`,
    provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" }, source: "fixture-source", surface: "source adapter", method: "source-adapter:fixture-source", ...over },
  ...rec,
});
const POSSIBLE = possibleCombinations({ dimensions: [{ key: "knot", values: ["bowline", "sheet-bend"], source: "the fixture descriptor", applicability: "APPLIES" }] });
const BOW = { knot: "bowline" }, SHEET = { knot: "sheet-bend" };
const QS = [
  q("q1", "How long does the result take?"),
  q("q2", "how long does the RESULT take", { country: "c-two", language: "l-one" }),
  q("q3", "Kitna waqt lagta hai result mein?", { country: "c-three", language: "l-two" }),
  q("q4", "How much does the test cost?"),
  q("q5", "How long does the result take to arrive?", { country: "c-two" }),
];
const run = (drafts, over = {}) => connectQuestions({ subject: S, possible: POSSIBLE, records: QS, drafts, officialSites: [OFFICIAL], on: ON, ...over });
const conn = (r) => r.records.filter((x) => x.record_type === CONNECTION);
const needsOf = (r) => new Set(conn(r).map((c) => c.needId));

test("K1 · C9 ONE CONNECTION PER ADMITTED QUESTION: original wording unchanged, source reference, observed date, country, language and sampling kept — NOT MEASURED where not recorded, never guessed", () => {
  const r = run([{ questionId: "q1", combination: BOW }]);
  assert.deepEqual(r.refused, []);
  const [c] = conn(r);
  assert.deepEqual([c.wording, c.source.reference, c.observedOn, c.country, c.language, c.sampling.method, c.sampling.limits, c.state, c.subject], ["How long does the result take?", "https://fixture-qa.invalid/q/q1", "2026-10-01", "c-one", "l-one", "source-adapter:fixture-source", "one fixture listing", "OBSERVED", S]);
  const unknownPlace = connectQuestions({ subject: S, possible: POSSIBLE, records: [q("qx", "Where is it?", { country: undefined, language: "" })], drafts: [{ questionId: "qx", combination: BOW }], on: ON });
  assert.deepEqual([conn(unknownPlace)[0].country, conn(unknownPlace)[0].language], [NOT_MEASURED, NOT_MEASURED], "a missing country or language was guessed");
});

test("K2 · C9 REFUSED AS VERIFIED DEMAND, each by name: a lead, a keyword idea, a client claim, an inferred suggestion, a fixture, another tenant's question, an unsupported attribute, a duplicate, a non-candidate — each with a control that admits", () => {
  const recs = [
    { record_type: "research_lead", lead_id: "l1" }, { record_type: "keyword_signal", signal_id: "k1" },
    q("c1", "Is it good?", { kind: "CLIENT_CLAIM" }), q("i1", "Is it hard?", { kind: "INFERRED" }),
    q("f1", "Is it free?", { dataPurpose: "TEST_PILOT" }), q("f2", "Is it open?", {}, { fixture: true }),
    q("t1", "Is it here?", { subject: "fixture-subject-two" }),
    q("a1", "Is it mine?", { authorCountry: "c-nine" }), q("a2", "Is it yours?", { provenance: { observerType: "PERSON_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } }),
    q("ok", "Is it ready?"), q("ok2", "Is it there?", { authorCountry: "c-nine", authorEvidence: "STATED_ON_THE_ORIGINAL_POST" }),
  ];
  const d = (id, combination = BOW) => ({ questionId: id, combination });
  const r = connectQuestions({ subject: S, possible: POSSIBLE, records: recs, drafts: ["l1", "k1", "c1", "i1", "f1", "f2", "t1", "a1", "a2"].map((id) => d(id)), on: ON });
  assert.deepEqual(r.refused.map((x) => x.code), [REFUSAL.LEAD, REFUSAL.KEYWORD, REFUSAL.CLIENT_CLAIM, REFUSAL.INFERRED, REFUSAL.FIXTURE, REFUSAL.FIXTURE, REFUSAL.OTHER_SUBJECT, REFUSAL.UNSUPPORTED_ATTRIBUTE, REFUSAL.UNSUPPORTED_ATTRIBUTE]);
  assert.equal(conn(r).length, 0, "a refused kind entered verified demand");
  /* CONTROLS: an admitted question, and one whose author attribute IS stated on the original post */
  assert.equal(conn(connectQuestions({ subject: S, possible: POSSIBLE, records: recs, drafts: [d("ok"), d("ok2")], on: ON })).length, 2);
  /* duplicate: twice in one run, and once already in the store */
  const dup = run([d("q1"), d("q1")]);
  assert.deepEqual([conn(dup).length, dup.refused.map((x) => x.code)], [1, [REFUSAL.DUPLICATE]]);
  assert.deepEqual(run([d("q1")], { existing: conn(dup) }).refused.map((x) => x.code), [REFUSAL.DUPLICATE]);
  /* a page candidate that is not one of F91's possible combinations, and none at all while number 1 is NOT MEASURED */
  assert.deepEqual(run([d("q1", { knot: "clove-hitch" })]).refused.map((x) => x.code), [REFUSAL.CANDIDATE]);
  assert.deepEqual(run([d("q1")], { possible: possibleCombinations({ dimensions: [] }) }).refused.map((x) => x.code), [REFUSAL.CANDIDATE]);
});

test("K3 · C10 COUNTRY AND LANGUAGE NEVER SPLIT ONE NEED: the same wording from another country or language joins the SAME need; a translation joins only by a RECORDED judgement — and then it is one need too", () => {
  const r = run([{ questionId: "q1", combination: BOW }, { questionId: "q2", combination: BOW }]);
  assert.equal(needsOf(r).size, 1, "country or language split one need");
  const tr = run([{ questionId: "q1", combination: BOW }, { questionId: "q3", combination: BOW, sameAs: { questionId: "q1", judgementRef: "fixture-judgement-1", reason: "the same question in another language" } }]);
  assert.equal(needsOf(tr).size, 1, "a recorded sameness judgement did not join the translation");
  assert.deepEqual(tr.records.filter((x) => x.record_type === SAMENESS).map((x) => [...x.questions]), [["q1", "q3"]]);
  const rb = readConnections(tr.records);
  assert.deepEqual([rb.needs.length, rb.needs[0].countries, rb.needs[0].languages, rb.needs[0].originals.length], [1, 2, 2, 2]);
  assert.deepEqual([...rb.needs[0].originals].sort(), ["How long does the result take?", "Kitna waqt lagta hai result mein?"], "an original wording was lost in the join");
  /* a judgement naming a question that is not connected is refused, never invented */
  assert.deepEqual(run([{ questionId: "q3", combination: BOW, sameAs: { questionId: "q9", judgementRef: "x" } }]).refused.map((x) => x.code), [REFUSAL.JUDGEMENT]);
});

test("K4 · C10 MATERIALLY DIFFERENT INTENTS STAY APART — and near-identical wording is never merged by similarity", () => {
  const r = run([{ questionId: "q1", combination: BOW }, { questionId: "q4", combination: BOW }, { questionId: "q5", combination: BOW }]);
  assert.equal(needsOf(r).size, 3, "two different needs merged (by intent or by resemblance)");
});

test("K5 · C10 A COUNTRY-SPECIFIC ANSWER DIFFERENCE IS A SECTION of the one need — kept even when UNKNOWN, never dropped, never a second need", () => {
  const r = run([{ questionId: "q1", combination: BOW, answer: { sourceRef: `${OFFICIAL}/results`, readOn: "2026-10-02" }, sections: [{ country: "c-two", sourceRef: `${OFFICIAL}/results-c-two`, readOn: "2026-10-02" }, { country: "c-three" }] }, { questionId: "q2", combination: BOW }]);
  const needs = r.records.filter((x) => x.record_type === NEED);
  assert.equal(needs.length, 1, "a country section became a second need");
  assert.deepEqual(needs[0].sections.map((s) => [s.country, s.answer.state]), [["c-two", "SOURCED"], ["c-three", "UNKNOWN"]], "a country section was dropped");
  assert.equal(needsOf(r).size, 1);
});

test("K6 · C10 ONE NEED, ONE PAGE CANDIDATE: the same need is never attached to a second candidate", () => {
  const r = run([{ questionId: "q1", combination: BOW }, { questionId: "q2", combination: SHEET }]);
  assert.deepEqual([conn(r).length, r.refused.map((x) => x.code)], [1, [REFUSAL.SPANS_CANDIDATES]]);
});

test("K7 · C11 ONE SOURCED ANSWER: only the product's own official site and the day it was read; every other case UNKNOWN with its reason — and every question of the need points to the one answer", () => {
  assert.deepEqual({ ...answerOf({ sourceRef: `${OFFICIAL}/a`, readOn: "2026-10-02" }, [OFFICIAL]) }, { state: "SOURCED", sourceRef: `${OFFICIAL}/a`, readOn: "2026-10-02" });
  assert.equal(answerOf({ sourceRef: "https://blog.invalid/a", readOn: "2026-10-02" }, [OFFICIAL]).why, ANSWER_UNKNOWN.notOfficial);
  assert.equal(answerOf({ sourceRef: `${OFFICIAL}/a`, readOn: "2026-10-02" }, []).why, ANSWER_UNKNOWN.noOfficialSite);
  assert.equal(answerOf({ sourceRef: `${OFFICIAL}/a` }, [OFFICIAL]).why, ANSWER_UNKNOWN.noDate);
  assert.equal(answerOf(null, [OFFICIAL]).why, ANSWER_UNKNOWN.none);
  const two = run([{ questionId: "q1", combination: BOW, answer: { sourceRef: `${OFFICIAL}/a`, readOn: "2026-10-02" } }, { questionId: "q2", combination: BOW, answer: { sourceRef: `${OFFICIAL}/b`, readOn: "2026-10-02" } }]);
  assert.match(two.records.find((x) => x.record_type === NEED).answer.why, /two different answer sources/);
  const one = run([{ questionId: "q1", combination: BOW, answer: { sourceRef: `${OFFICIAL}/a`, readOn: "2026-10-02" } }, { questionId: "q2", combination: BOW }]);
  const rb = readConnections(one.records);
  assert.deepEqual([rb.needs.length, rb.needs[0].questions, rb.needs[0].answer.state], [1, 2, "SOURCED"]);
});

test("K8 · C11 NO CHECKER: a draft carrying a checker, signature or credential field is refused; the writer's code holds no such field — and the scan fires", () => {
  for (const f of ["checkedBy", "verifiedBy", "signature", "credential"]) assert.deepEqual(run([{ questionId: "q1", combination: BOW, [f]: "someone" }]).refused.map((x) => x.code), [REFUSAL.CHECKER_FIELD], `${f} was accepted`);
  assert.deepEqual(run([{ questionId: "q1", combination: BOW, answer: { sourceRef: `${OFFICIAL}/a`, readOn: "2026-10-02", checkedBy: "someone" } }]).refused.map((x) => x.code), [REFUSAL.CHECKER_FIELD]);
  const code = readFileSync(join(REPO, "src/page/demand-connection.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const scan = (t) => /\b(checkedBy|verifiedBy|isHuman|humanVerified|human:)\b|"human/.test(t.replace(/const CHECKER_FIELDS = .*$/m, ""));
  assert.equal(scan(code), false, "a checker condition is in the writer");
  assert.equal(scan(`${code}\nconst gate = (r) => r.verification?.checkedBy;\n`), true, "CONTROL: the scan cannot fire");
});

test("K9 · C12 COVERAGE BEFORE A NEW PAGE: a need an existing page serves is COVERED, never recommended; undecided coverage is HELD; an UNKNOWN answer is HELD; only NOT COVERED with a sourced answer goes on to F91's number 3", () => {
  const rows = run([{ questionId: "q1", combination: BOW, answer: { sourceRef: `${OFFICIAL}/a`, readOn: "2026-10-02" } }, { questionId: "q4", combination: SHEET }]).records;
  const group = (c, coverage) => ({ record_type: "planning_group", members: [c], coverage });
  const rec = (extra) => Object.fromEntries(readConnections([...rows, ...extra]).needs.map((n) => [n.pageCandidate.includes("bowline") ? "bow" : "sheet", n.recommendation]));
  assert.deepEqual(rec([group(BOW, "COVERED"), group(SHEET, "COVERED")]), { bow: RECOMMENDATION.COVERED, sheet: RECOMMENDATION.COVERED }, "an existing page that serves the need was ignored");
  assert.deepEqual(rec([]), { bow: RECOMMENDATION.HELD_COVERAGE, sheet: RECOMMENDATION.HELD_COVERAGE });
  assert.deepEqual(rec([group(BOW, "NOT_COVERED"), group(SHEET, "NOT_COVERED")]), { bow: RECOMMENDATION.NOT_COVERED, sheet: RECOMMENDATION.HELD_ANSWER }, "an UNKNOWN answer went on toward a page");
  assert.doesNotMatch(JSON.stringify(readConnections(rows)), /"(page|pages|newPages|pageCount)":/i, "the readback carried a page or a page count");
});

const registryOf = (name) => { const d = join(TMP, name); mkdirSync(d, { recursive: true }); writeFileSync(join(d, "facts.mjs"), "export default [];\n"); return d; };
const storeOf = (name, rows) => { mkdirSync(TMP, { recursive: true }); const p = join(TMP, `${name}.jsonl`); writeFileSync(p, rows.map((r) => JSON.stringify(r)).join("\n") + "\n"); return p; };

test("K10 · THE PLANNER READS WHAT THE WRITER WROTE: F91's reader takes the connections as demand and questions, the need record is neither a limb nor MALFORMED, and a recorded join reaches number 3's merge", () => {
  const r = run([{ questionId: "q1", combination: BOW }, { questionId: "q3", combination: BOW, sameAs: { questionId: "q1", judgementRef: "j1" } }, { questionId: "q4", combination: SHEET }]);
  const inputs = planningInputs(r.records);
  assert.deepEqual([inputs.malformed, inputs.needs, inputs.sameness.length], [0, 2, 1]);
  assert.equal(inputs.records.get(JSON.stringify([["knot", "bowline"]])).demand.length, 2);
  assert.deepEqual(inputs.questions.get(JSON.stringify([["knot", "bowline"]])).map((x) => x.id), ["q1", "q3"]);
});

test("K11 · TWO UNRELATED PRODUCTS: the writer and F91's reader on two products with different dimensions — one product's question never reaches the other's plan", async () => {
  try {
    const subjFerm = "fixture-subject-ferm";
    const ferm = { ...FERMENTS, factsDir: registryOf("f") };
    const knots = { ...KNOTS, factsDir: registryOf("k") };
    const fq = [q("m1", "Why does the brine go cloudy?", { subject: subjFerm, country: "c-four", language: "l-three" }), q("m2", "why does the brine go cloudy", { subject: subjFerm, country: "c-five" })];
    const pk = (await readProductPlan(knots)).plan.possible, pf = (await readProductPlan(ferm)).plan.possible;
    const rk = connectQuestions({ subject: S, possible: pk, records: QS, drafts: [{ questionId: "q1", combination: { knot: "bowline" } }], on: ON });
    const rf = connectQuestions({ subject: subjFerm, possible: pf, records: [...fq, ...QS], drafts: [{ questionId: "m1", combination: { ferment: "miso" } }, { questionId: "m2", combination: { ferment: "miso" } }, { questionId: "q1", combination: { ferment: "miso" } }], on: ON });
    assert.deepEqual([conn(rk).length, conn(rf).length, needsOf(rf).size], [1, 2, 1]);
    assert.deepEqual(rf.refused.map((x) => x.code), [REFUSAL.OTHER_SUBJECT], "a record crossed tenants");
    const plannedK = (await readProductPlan({ ...knots, planning: { records: storeOf("k-plan", rk.records) } })).plan;
    const plannedF = (await readProductPlan({ ...ferm, planning: { records: storeOf("f-plan", rf.records) } })).plan;
    assert.deepEqual([plannedK.possible.value, plannedF.possible.value], [KNOTS.variants.length, FERMENTS.variants.length]);
    assert.equal(plannedK.verified.kinds.observedQuestions, 1);
    assert.equal(plannedF.verified.kinds.observedQuestions, 2);
    for (const p of [plannedK, plannedF]) assert.equal(p.verified.value, NOT_MEASURED, "a connection alone verified an opportunity — the other three limbs are not recorded");
  } finally { rmSync(TMP, { recursive: true, force: true }); }
});

test("K12 · EVIDENCE STATES: a connection and a join are INFERRED from stored questions; a need with an UNKNOWN answer is UNKNOWN, with a sourced one INFERRED; a record missing its key is UNMAPPED", () => {
  const r = run([{ questionId: "q1", combination: BOW, answer: { sourceRef: `${OFFICIAL}/a`, readOn: "2026-10-02" } }, { questionId: "q3", combination: BOW, sameAs: { questionId: "q1", judgementRef: "j1" } }, { questionId: "q4", combination: SHEET }]);
  const by = (t) => r.records.filter((x) => x.record_type === t);
  assert.deepEqual([evidenceStateOf(by(CONNECTION)[0]).state, evidenceStateOf(by(SAMENESS)[0]).state], ["INFERRED", "INFERRED"]);
  assert.deepEqual(by(NEED).map((n) => evidenceStateOf(n).state).sort(), ["INFERRED", "UNKNOWN"]);
  assert.equal(evidenceStateOf({ ...by(CONNECTION)[0], measurement_key: "" }).unmapped, true);
});

test("K13 · the writer, its readback and its entry point name no product and the decision code reaches no network — and each control fires", () => {
  const files = ["src/page/demand-connection.mjs", "bin/demand-connect.mjs"];
  for (const f of files) assert.deepEqual(scanSource(readFileSync(join(REPO, f), "utf8")).code, [], `${f} names a product`);
  assert.ok(scanSource(`${readFileSync(join(REPO, files[0]), "utf8")}\nexport const X = "${PRODUCT_WORDS[0]}";\n`).code.length > 0);
  assert.deepEqual(decisionCallPaths({ entries: [files[0]] }).faults, []);
  assert.deepEqual(decisionCallPaths({ entries: [files[0]], read: (f) => { const t = readFileSync(join(REPO, f), "utf8"); return f === files[0] ? `${t}\nawait fetch(u);\n` : t; } }).faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

/* ================= the governed entry point, in a declared world ================= */

function declareBatchForSubject(W, subject, batch) {
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

test("ENTRY4 · bin/demand-connect.mjs in a declared world: no --confirm writes nothing; --confirm keeps the connections once; a re-run is a duplicate; a lead is refused; another subject's run is refused by name; counts only", async () => {
  const W = declaredWorld();
  try {
    const DEMO = "almi-oet", BATCH = "fixture-connection-batch";
    declareBatchForSubject(W, DEMO, BATCH);
    const product = await productFromArgv(["node", "x", `--product=${DEMO}`], { scope: censusSubjectScope(DEMO) });
    const value = product.variants[0];
    const recs = [q("e1", "How long does the result take?", { subject: DEMO }), q("e2", "how long does the result take", { subject: DEMO, country: "c-two", language: "l-two" }), q("e3", "What does the fee include?", { subject: DEMO }), { record_type: "research_lead", lead_id: "lead-1", recorded_at: "2026-10-01T09:00:00Z", sourceId: "fixture" }];
    writeFileSync(join(W.root, "research", BATCH, "questions.jsonl"), recs.filter((r) => r.record_type === "public_question").map((r) => JSON.stringify(r)).join("\n") + "\n");
    writeFileSync(join(W.root, "research", BATCH, "leads.jsonl"), JSON.stringify(recs[3]) + "\n");
    const combo = { [product.axis.key]: value };
    const drafts = input(W, "drafts.json", [{ questionId: "e1", combination: combo }, { questionId: "e2", combination: combo }, { questionId: "e3", combination: combo }, { questionId: "lead-1", combination: combo }]);
    const go = (args, subject = DEMO, batch = BATCH) => spawnSync(process.execPath, W.argv(["bin/demand-connect.mjs", `--subject=${subject}`, `--product=${DEMO}`, `--research-batch=${batch}`, `--on=${ON}`, ...args]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    const dry = go([`--drafts=${drafts}`]);
    assert.equal(dry.status, 0, dry.stdout + dry.stderr);
    assert.match(dry.stdout, /drafts {11}4 read · 3 connected · refused 1 \(SEARCH_LEAD_IS_NOT_A_QUESTION 1\)/);
    assert.match(dry.stdout, /NOT WRITTEN — no --confirm/);
    const store = join(W.root, "research", BATCH, "planning.jsonl");
    assert.ok(!existsSync(store), "a run without --confirm wrote");
    const first = go([`--drafts=${drafts}`, "--confirm"]);
    assert.equal(first.status, 0, first.stdout + first.stderr);
    assert.match(first.stdout, /readback {9}3 connected question\(s\) · 2 underlying need\(s\) · 1 page candidate\(s\)/);
    assert.match(first.stdout, /coverage {9}COVERED 0 · HELD \(coverage undecided\) 2 · HELD \(answer UNKNOWN\) 0 · NOT COVERED 0/);
    assert.match(first.stdout, /official sites declared 0 \(turn order — not a gap\)/);
    const second = go([`--drafts=${drafts}`, "--confirm"]);
    assert.match(second.stdout, /4 read · 0 connected · refused 4 \(DUPLICATE_WRITE 3 · SEARCH_LEAD_IS_NOT_A_QUESTION 1\)/);
    /* TENANT CROSSOVER at the entry point: the other declared subject, with a batch of its own — refused by name, nothing written there */
    const OTHER = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8")).subjects.map((s) => s.subjectId).find((id) => id !== DEMO);
    assert.ok(OTHER, "no second subject — the crossover case would be vacuous");
    declareBatchForSubject(W, OTHER, "fixture-other-connection");
    const other = go([`--drafts=${drafts}`, "--confirm"], OTHER, "fixture-other-connection");
    assert.equal(other.status, 3, other.stdout + other.stderr);
    assert.match(other.stderr, /PRODUCT_IS_NOT_THIS_SUBJECTS/);
    for (const out of [dry.stdout, first.stdout]) for (const w of ["How long", "fee include", value]) assert.ok(!out.includes(w), "the entry point printed a wording or a value");
  } finally { W.cleanup(); rmSync(TMP, { recursive: true, force: true }); }
});

/* ================= the owner's two named subjects (RR-153 revision 2 §6), in a declared world ================= */

/* A product declaration for a subject, written ONLY into the confined copy: the subjects' real catalogues are not read (no live fetch is
 * authorised), so the dimension and its two values are FIXTURE values — they prove the code carries no product-specific assumption, never
 * what either subject sells. The official site is the subject's own declared origin. */
function declareProductInWorld(W, subjectId, origin) {
  const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
  let s = reg.subjects.find((x) => x.subjectId === subjectId);
  if (!s) { s = { subjectId, path: subjectId, members: [{ resourceKind: "SITE_ORIGIN", resourceRef: origin }], connectors: [] }; reg.subjects.push(s); }
  s.members.push({ resourceKind: "FACT_REGISTRY", resourceRef: `${subjectId}/facts` });
  writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2));
  const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
  for (const [kind, ref] of [["FACT_REGISTRY", `${subjectId}/facts`], ["SITE_ORIGIN", origin]]) if (!att.attachments.some((a) => a.resourceKind === kind && a.resourceRef === ref)) att.attachments.push({ ...att.attachments[0], resourceKind: kind, resourceRef: ref, tenantId: FIXTURE_TENANT });
  writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
  const dir = join(W.root, s.path ?? subjectId);
  mkdirSync(join(dir, "facts"), { recursive: true });
  writeFileSync(join(dir, "facts", "records.mjs"), "export default [];\n");
  writeFileSync(join(dir, "product.mjs"), `import { join, dirname } from "node:path";\nimport { fileURLToPath } from "node:url";\nimport { registerProduct } from "../../src/product.mjs";\nconst HERE = dirname(fileURLToPath(import.meta.url));\nexport const PRODUCT = registerProduct({ productId: ${JSON.stringify(subjectId)}, axis: { key: "offering", label: "Offering" }, variants: ["offering-one", "offering-two"], factsDir: join(HERE, "facts"), pageSpecs: {}, officialSites: [${JSON.stringify(origin)}] });\n`);
}

test("ENTRY5 · THE OWNER'S TWO SUBJECTS: the same governed writer on both — one need across countries and languages, a lead refused, the sourced answer from each subject's own declared official site — and neither subject's run reaches the other", async () => {
  const W = declaredWorld();
  try {
    const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
    /* the declared subject is found in the registry, never named in a generic test (F09); the second was named by the owner (RR-153 rev 2 §6) */
    const DECLARED = reg.subjects.map((s) => s.subjectId).find((id) => id !== "almi-oet");
    const DECLARED_ORIGIN = reg.subjects.find((s) => s.subjectId === DECLARED).members.find((m) => m.resourceKind === "SITE_ORIGIN").resourceRef;
    const NAMED = "lamzish", NAMED_ORIGIN = "https://www.lamzish.com";
    assert.ok(DECLARED && DECLARED_ORIGIN, "the declared subject or its origin is missing — the proof would be vacuous");
    const runs = {};
    for (const [subject, origin] of [[DECLARED, DECLARED_ORIGIN], [NAMED, NAMED_ORIGIN]]) {
      declareProductInWorld(W, subject, origin);
      const batch = `fixture-${subject.length}-connection`;
      declareBatchForSubject(W, subject, batch);
      const rows = [q("s1", "Where do I start?", { subject }), q("s2", "where do i start", { subject, country: "c-two", language: "l-two" }), q("s3", "Can it be returned?", { subject })];
      writeFileSync(join(W.root, "research", batch, "questions.jsonl"), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
      writeFileSync(join(W.root, "research", batch, "leads.jsonl"), JSON.stringify({ record_type: "research_lead", lead_id: "lead-x", recorded_at: "2026-10-01T09:00:00Z", sourceId: "fixture" }) + "\n");
      const combo = { offering: "offering-one" };
      const drafts = input(W, `drafts-${subject.length}.json`, [{ questionId: "s1", combination: combo, answer: { sourceRef: `${origin}/fixture-page`, readOn: "2026-10-02" } }, { questionId: "s2", combination: combo }, { questionId: "s3", combination: combo }, { questionId: "lead-x", combination: combo }]);
      const r = spawnSync(process.execPath, W.argv(["bin/demand-connect.mjs", `--subject=${subject}`, `--product=${subject}`, `--research-batch=${batch}`, `--on=${ON}`, `--drafts=${drafts}`, "--confirm"]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      runs[subject] = { r, batch, drafts };
      assert.match(r.stdout, /page candidates  2 possible combination\(s\)/);
      assert.match(r.stdout, /official sites declared 1/);
      assert.match(r.stdout, /drafts {11}4 read · 3 connected · refused 1 \(SEARCH_LEAD_IS_NOT_A_QUESTION 1\)/);
      assert.match(r.stdout, /readback {9}3 connected question\(s\) · 2 underlying need\(s\) · 1 page candidate\(s\)/, "country or language split one need, or two needs merged");
      const kept = readFileSync(join(W.root, "research", batch, "planning.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
      const sourced = kept.filter((x) => x.record_type === NEED && x.answer.state === "SOURCED");
      assert.equal(sourced.length, 1, "the answer from the subject's own declared official site was not kept");
    }
    /* each subject's product reaches only its own run: the declared subject's run with the named subject's product is refused by name */
    const cross = spawnSync(process.execPath, W.argv(["bin/demand-connect.mjs", `--subject=${DECLARED}`, `--product=${NAMED}`, `--research-batch=${runs[DECLARED].batch}`, `--on=${ON}`, `--drafts=${runs[DECLARED].drafts}`, "--confirm"]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    assert.equal(cross.status, 3, cross.stdout + cross.stderr);
    assert.match(cross.stderr, /PRODUCT_IS_NOT_THIS_SUBJECTS/);
    /* and one subject's question placed in the other's batch is refused as another tenant's, never connected */
    const mixed = connectQuestions({ subject: NAMED, possible: possibleCombinations({ dimensions: [{ key: "offering", values: ["offering-one"], source: "fixture", applicability: "APPLIES" }] }), records: [q("z1", "Where do I start?", { subject: DECLARED })], drafts: [{ questionId: "z1", combination: { offering: "offering-one" } }], on: ON });
    assert.deepEqual(mixed.refused.map((x) => x.code), [REFUSAL.OTHER_SUBJECT], "a record crossed tenants");
  } finally { W.cleanup(); rmSync(TMP, { recursive: true, force: true }); }
});

/* ================= REAL ================= */

test("REAL · every declared subject in the real data root: admitted public questions, connections and F91's three numbers — count-only; fixtures never counted here", async () => {
  const roots = JSON.parse(readFileSync(join(DATA_ROOT, "roots.json"), "utf8")).subjects;
  const out = [];
  for (const s of roots) {
    const batches = s.members.filter((m) => m.resourceKind === "RESEARCH_BATCH").map((m) => m.resourceRef);
    const rows = batches.flatMap((b) => ["questions.jsonl", "planning.jsonl"].flatMap((f) => { const p = join(DATA_ROOT, "research", b, f); return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []; }));
    const admitted = rows.filter((r) => r.record_type === "public_question" && refusalOf(r, { subject: s.subjectId }) === null).length;
    const connections = rows.filter((r) => r.record_type === CONNECTION).length;
    let numbers = NOT_MEASURED;
    if (existsSync(join(DATA_ROOT, s.path ?? s.subjectId, "product.mjs"))) {
      const product = await productFromArgv(["node", "x", `--product=${s.subjectId}`], { scope: censusSubjectScope(s.subjectId) });
      const { plan } = await readProductPlan(product);
      numbers = { possible: plan.possible.value, verified: plan.verified.value, needed: plan.needed.value };
    }
    out.push({ subject: s.subjectId.length, batches: batches.length, admittedQuestions: admitted, connections, numbers });
  }
  console.log(`  REAL (${ON}, count-only, every declared subject): ${JSON.stringify(out)}`);
  /* pins — re-measured, never assumed: 0 admitted real public questions today, so numbers 2 and 3 are NOT MEASURED, never 0 */
  assert.equal(out.reduce((n, x) => n + x.admittedQuestions, 0), 0, "the real store now holds admitted public questions — re-measure, never assume");
  assert.equal(out.reduce((n, x) => n + x.connections, 0), 0);
  for (const x of out.filter((y) => y.numbers !== NOT_MEASURED)) assert.deepEqual([x.numbers.verified, x.numbers.needed], [NOT_MEASURED, NOT_MEASURED]);
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
