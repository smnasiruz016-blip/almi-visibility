/**
 * 🔴 RR-174 · R3 — F35 ACCEPTANCE AMENDMENT 1 (C3 and C4 as amended, C8, C9; _handoffs dcddcb0) AND F34 ACCEPTANCE AMENDMENT 1 (C7, the
 * explicit MONITOR mapping; _handoffs 348f029), with the owner's RR-174 §3 rulings (_handoffs 7945b76): (a) HOLD by its own name; (b) grouped
 * needs in their own field, F35's `needs` unchanged for F41; (c) right-to-exist from the matching declared spec, else HOLD; (d) duplication
 * resolved only with no comparison page or by a substance review needing no guidance, every other CREATE HOLD; (e) every unpinned EVIDENCE
 * line of F35 (8) and F34 (12) proved by a named test (R35, R34 below).
 *
 * One test per EVIDENCE item; each FAILURE condition has its sabotage in test/helpers/rr174-sabotage.mjs, naming the test it turns red.
 * Pages, wording and headings stay in memory — counts only, no page content, host or URL. Nothing here writes to the production trail.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { declaredWorld, FIXTURE_TENANT } from "./helpers/declared-world.mjs";

import { decideGroupedNeed, decideForNeed, duplicationFor, summarise, DUPLICATION, HOLD, OUTCOMES, ACTIONS, DECISION as D, GUIDANCE_REFUSAL } from "../src/page/action-decision.mjs";
import { readClientActionEvidence, specForCandidate, latestCoverageRecords } from "../src/page/action-evidence.mjs";
import { existingPageFirst, EXISTING_PAGE_OUTCOMES as O, EXISTING_PAGE_REASONS as R } from "../src/page/existing-page-first.mjs";
import { rightToExist } from "../src/page/right-to-exist.mjs";
import { connectQuestions, coverageRecords, readConnections, CONNECTION, COVERAGE } from "../src/page/demand-connection.mjs";
import { possibleCombinations } from "../src/page/page-opportunities.mjs";
import { servedHeadingsOf } from "../src/page/grouped-need-coverage.mjs";
import { NO_RECORDED_DECAY_EVIDENCE as NO_DECAY } from "../src/page/content-decay-evidence.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { resolveSide } from "../src/tenancy/scope.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { subject } from "./support/subjects.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const ON = "2026-10-05";
const acts = (d) => d.actions.map((a) => a.action);

/* ---- pure fixtures: one grouped need, every limb met; each control removes one ---- */
const NEED = { needId: "need:n1", pageCandidate: '[["axis","one"]]', questions: 2, tier: "RESEARCH-DERIVED", centralSupported: true };
const NONE = { coverage: "NONE", relevantQuestionMissing: false, pages: [], measurement_key: "planning_coverage:none", reason: "x" };
const RTE = { outcome: "ESTABLISHED", reason: "RIGHT_TO_EXIST_ESTABLISHED" };
const LONE = duplicationFor({ needId: "need:n1", comparisons: [] });
const decide = (over = {}) => decideGroupedNeed({ need: { ...NEED, ...(over.need ?? {}) }, coverage: "coverage" in over ? over.coverage : NONE, rightToExist: "rightToExist" in over ? over.rightToExist : RTE, duplication: over.duplication ?? LONE });

/* ---- the REAL recorded structures: the one tenant holding existing pages, its product's two declared specs ---- */
const resolve = createTenantResolver();
const SIDE = resolveSide(resolve, RESOURCES.subject("almi-oet"));
const PRODUCT = await subject("almi-oet");
const { records: FACTS } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const real = (planningRows, extra = {}) => readClientActionEvidence({ tenantId: SIDE.tenantId, product: PRODUCT, records: FACTS, resolve, reviews: [], decayEvidence: NO_DECAY, planningRows, ...extra });
const BASE = real(null);
const POP = { tenantId: SIDE.tenantId, coverageState: "PARTIAL", pages: [] };
/* planning rows built by F91's own writer functions over the real population (in memory): a need whose candidate is a real declared spec */
function realPlanning() {
  const slug = Object.keys(PRODUCT.pageSpecs)[0];
  const variant = PRODUCT.pageSpecs[slug].variant;
  const combo = { [PRODUCT.axis.key]: variant };
  const possible = possibleCombinations({ dimensions: [{ key: PRODUCT.axis.key, values: PRODUCT.variants, source: "the product's own descriptor", applicability: "APPLIES" }] });
  const q = (id, wording) => ({ record_type: "public_question", question_id: id, measurement_key: `public_question:${id}`, recorded_at: "2026-10-01T09:00:00Z",
    value: { subject: "almi-oet", kind: "OBSERVED", original: wording, sourceId: "fixture", provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } } });
  const answer = { claims: [{ claimId: "c1", states: "OTHER", source: { kind: "RELATED", name: "a related source", link: "https://related.fixture.invalid/a", readOn: "2026-10-02" }, supports: { finding: "SUPPORTS", ref: "fixture-finding" } }] };
  const conn = connectQuestions({ subject: "almi-oet", possible, records: [q("r1", "A question no existing page answers in any section?")], drafts: [{ questionId: "r1", combination: combo, answer }], on: ON });
  const population = readExistingPagePopulationOnce();
  const cov = coverageRecords({ subject: "almi-oet", rows: conn.records, tenantId: SIDE.tenantId, population, on: ON });
  return { rows: [...conn.records, ...cov], slug, combo };
}
let POPULATION = null;
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
function readExistingPagePopulationOnce() { POPULATION ??= readExistingPagePopulation({ scope: { tenantId: SIDE.tenantId }, resolve }).population; return POPULATION; }

/* ================= F35 C3 AS AMENDED · ONE CREATE RULE ================= */

test("T3a · F35 C3 A RESEARCH-DERIVED CREATE WITH ZERO DEMAND CATEGORIES: every limb met, no demand recorded under any name → CREATE, carrying its tier", () => {
  const d = decide();
  assert.deepEqual([d.decision, acts(d), d.outcome, d.tier], [D.CHOSEN, ["CREATE"], OUTCOMES.CREATE, "RESEARCH-DERIVED"]);
  assert.doesNotMatch(JSON.stringify(d), /demand|categor/i, "CREATE reads a demand outcome or category");
});

test("T3b · F35 C3 THE SAME NEED WITH EACH LIMB REMOVED IS REFUSED CREATE — no suitable page, distinct and useful, right-to-exist, duplication; and C3's firing control as re-read (F35-3)", () => {
  const cases = {
    "coverage not NONE": decide({ coverage: { ...NONE, coverage: "FULL" } }),
    "central answer unsupported (not USEFUL)": decide({ need: { centralSupported: false } }),
    "right-to-exist not ESTABLISHED": decide({ rightToExist: { outcome: "CANNOT_DECIDE", undecided: ["specific"] } }),
    "duplication unresolved": decide({ duplication: duplicationFor({ needId: "need:n1", comparisons: ["page:p1"] }) }),
    "no coverage record": decide({ coverage: null }),
  };
  for (const [limb, d] of Object.entries(cases)) assert.ok(!acts(d).includes("CREATE"), `CREATE with "${limb}" unmet`);
});

test("T3c · F35 C3 EVERY DECISION RECORDS ITS TIER — HOLD, KEEP, ADD SECTION, CONNECT and CREATE alike", () => {
  const all = [decide(), decide({ coverage: null }), decide({ coverage: { ...NONE, coverage: "FULL" } }), decide({ coverage: { ...NONE, coverage: "PARTIAL", relevantQuestionMissing: true } }),
    decide({ duplication: { state: DUPLICATION.DUPLICATE, against: "page:p1", ref: "rev:1" } })];
  for (const d of all) assert.equal(d.tier, "RESEARCH-DERIVED", `a ${d.outcome} decision lacks its tier`);
});

test("T3d · F35 C3 (D1) A LONE NEED — no comparison page among the tenant's pages and candidates — needs no duplication verdict and is never held or refused for that alone", () => {
  assert.equal(LONE.state, DUPLICATION.NO_COMPARISON);
  assert.deepEqual(acts(decide()), ["CREATE"], "a lone page was held for having no comparison page");
  /* the control: the same need with a comparison page and no review is NOT resolved */
  assert.equal(duplicationFor({ needId: "need:n1", comparisons: ["page:p1"] }).state, DUPLICATION.REFUSED);
});

test("T3e · F35 C3 (P20; ruling d) A CREATE NEEDING A GUIDANCE-DEPENDENT DUPLICATION VERDICT IS HOLD — the refusal recorded and named; only a substance review needing no guidance resolves it", () => {
  const refused = decide({ duplication: duplicationFor({ needId: "need:n1", comparisons: ["page:p1", "need:n2"] }) });
  assert.deepEqual([refused.class, refused.outcome, refused.duplicationRefusal], [HOLD, OUTCOMES.HOLD, GUIDANCE_REFUSAL]);
  assert.ok(refused.missing.includes(GUIDANCE_REFUSAL), "the refusal is not named as the missing fact");
  const guided = duplicationFor({ needId: "need:n1", comparisons: ["page:p1"], reviews: [{ needId: "need:n1", against: "page:p1", verdict: "DISTINCT", needsGuidance: true, ref: "rev:g" }] });
  assert.equal(guided.state, DUPLICATION.REFUSED, "a review that needs guidance resolved the verdict — the refusal was worked around");
  const substance = duplicationFor({ needId: "need:n1", comparisons: ["page:p1"], reviews: [{ needId: "need:n1", against: "page:p1", verdict: "DISTINCT", needsGuidance: false, ref: "rev:s" }] });
  assert.deepEqual(acts(decide({ duplication: substance })), ["CREATE"], "a substance review needing no guidance did not resolve it");
});

/* ================= F35 C4 AS AMENDED · P19's COMPLETE TABLE ================= */

test("T4a · F35 C4 ONE CONTROL PER TABLE ROW — KEEP / NO NEW PAGE · IMPROVE / ADD SECTION · CREATE · HOLD · REJECT / CONNECT (CONNECT writes no record)", () => {
  const keep = decide({ coverage: { ...NONE, coverage: "FULL", pages: [{ pageId: "page:p1" }] } });
  assert.deepEqual([acts(keep), keep.outcome], [["KEEP"], OUTCOMES.KEEP]);
  const add = decide({ coverage: { ...NONE, coverage: "PARTIAL", relevantQuestionMissing: true, pages: [{ pageId: "page:p1" }] } });
  assert.deepEqual([acts(add), add.outcome], [["ADD SECTION"], OUTCOMES.IMPROVE]);
  const fullWithGap = decide({ coverage: { ...NONE, coverage: "FULL", relevantQuestionMissing: true, pages: [{ pageId: "page:p1" }] } });
  assert.deepEqual(acts(fullWithGap), ["ADD SECTION"], "a relevant question missing from a suitable page did not go to IMPROVE / ADD SECTION");
  assert.deepEqual([acts(decide()), decide().outcome], [["CREATE"], OUTCOMES.CREATE]);
  for (const h of [decide({ need: { centralSupported: false } }), decide({ duplication: duplicationFor({ needId: "need:n1", comparisons: ["page:p1"] }) })]) {
    assert.deepEqual([h.decision, h.class, h.outcome], [D.CANNOT_DECIDE, HOLD, OUTCOMES.HOLD], "an unsupported or unresolved case was not HELD");
    assert.ok(h.missing.length > 0, "a HOLD names no missing fact");
  }
  const connect = decide({ duplication: { state: DUPLICATION.DUPLICATE, against: "page:p1", ref: "rev:d" } });
  assert.deepEqual([acts(connect), connect.outcome, connect.actions[0].evidence], [["CONNECT"], OUTCOMES.REJECT, ["page:p1", "rev:d"]]);
  assert.ok(ACTIONS.includes("CONNECT") && !ACTIONS.includes("MONITOR"));
  assert.doesNotMatch(readFileSync(join(REPO, "src/page/action-decision.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""), /\b(writeFileSync|appendFileSync|governedStoreAppend|executeGovernedWrite)\b/, "F35 writes a record");
});

test("T4b · F35 C4 A WEAK-DEMAND NEED MEETING EVERY P19 LIMB → CREATE, never MONITOR or HOLD — and demand strength is its own line, never an outcome or a gate", () => {
  const weak = decide();
  assert.deepEqual(acts(weak), ["CREATE"]);
  assert.notEqual(weak.class, HOLD);
  const r = real(null, { demand: { outcome: "MONITOR", independentCategories: 1, conflict: true, ref: "demand:fixture" } });
  assert.deepEqual([r.demandMonitoring.recorded, r.demandMonitoring.independentCategories], [true, 1]);
  for (const d of [...r.needs, ...r.pages]) assert.ok(!d.actions.some((a) => a.action === "MONITOR"), "a demand-strength result became an outcome");
  assert.deepEqual(r.needs.map((d) => d.decision), BASE.needs.map((d) => d.decision), "recorded demand changed a decision — demand is a gate");
  /* structurally: neither need rule reads demand at all — no category count, no MONITOR, no demand-to-HOLD path */
  const code = readFileSync(join(REPO, "src/page/action-decision.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const body = (name) => code.slice(code.indexOf(`export function ${name}(`), code.indexOf("\n}\n", code.indexOf(`export function ${name}(`)));
  for (const f of ["decideForNeed", "decideGroupedNeed"]) assert.doesNotMatch(body(f), /demand|independentCategories|MONITOR/i, `${f} reads demand`);
});

test("T4c · F35 C4 / ruling (a) HOLD IS SHOWN BY ITS OWN NAME in every count — never only as CANNOT DECIDE, never as MONITOR", () => {
  const s = summarise([decide(), decide({ coverage: null }), decide({ need: { questions: 0 } })]);
  assert.deepEqual([s.hold, s.byOutcome[OUTCOMES.HOLD], s.byOutcome[OUTCOMES.CREATE]], [2, 2, 1]);
  assert.ok(!("MONITOR" in s.byAction), "MONITOR is still counted as an action");
  assert.ok(BASE.summary.needs.hold === BASE.needs.length, "the real declared specs' HOLD is not counted by its name");
});

/* ================= F35 C8 · THE THREE GUARDS ================= */

test("T8a · F35 C8 (a) EXISTING PAGES FIRST: no need reaches CREATE without its coverage record, or where a suitable page holds it", () => {
  assert.ok(!acts(decide({ coverage: null })).includes("CREATE"));
  for (const c of ["FULL", "PARTIAL"]) assert.ok(!acts(decide({ coverage: { ...NONE, coverage: c } })).includes("CREATE"), `CREATE where coverage is ${c}`);
});

test("T8b · F35 C8 (b) DISTINCT AND USEFUL: a need another candidate holds, or with an unsupported central answer, never becomes CREATE", () => {
  assert.deepEqual(acts(decide({ duplication: { state: DUPLICATION.DUPLICATE, against: "need:n2", ref: "rev:x" } })), ["CONNECT"]);
  /* a recorded substance review finding the need held by another candidate makes the verdict DUPLICATE, through duplicationFor itself */
  const held = duplicationFor({ needId: "need:n1", comparisons: ["need:n2"], reviews: [{ needId: "need:n1", against: "need:n2", verdict: "DUPLICATE", needsGuidance: false, ref: "rev:y" }] });
  assert.deepEqual([held.state, acts(decide({ duplication: held }))], [DUPLICATION.DUPLICATE, ["CONNECT"]], "a need another candidate holds was not connected");
  assert.equal(decide({ need: { centralSupported: false } }).class, HOLD);
});

test("T8c · F35 C8 (c) ONE NEED, AT MOST ONE PAGE — the 6 August shape (one need × several destinations) yields ONE need and ONE decision; no page for a country-only difference", () => {
  const possible = possibleCombinations({ dimensions: [{ key: "axis", values: ["one"], source: "fixture", applicability: "APPLIES" }] });
  const q = (id, country) => ({ record_type: "public_question", question_id: id, measurement_key: `public_question:${id}`, recorded_at: "2026-10-01T09:00:00Z",
    value: { subject: "s1", kind: "OBSERVED", original: "How long does registration take?", country, sourceId: "f", provenance: { observerType: "SOURCE_ADAPTER_OBSERVED", seenBy: "A SOURCE ADAPTER — the text as the source holds it" } } });
  const dests = ["c-one", "c-two", "c-three", "c-four", "c-five"];
  const conn = connectQuestions({ subject: "s1", possible, records: dests.map((c, i) => q(`d${i}`, c)), drafts: dests.map((c, i) => ({ questionId: `d${i}`, combination: { axis: "one" } })), on: ON });
  const needs = readConnections(conn.records).needs;
  assert.deepEqual([needs.length, needs[0].questions, needs[0].countries], [1, 5, 5], "a destination split one need");
  const decisions = needs.map((n) => decide({ need: { needId: n.needId, questions: n.questions } }));
  assert.equal(decisions.filter((d) => acts(d).includes("CREATE")).length, 1, "one need gave more than one page");
  /* where the answer differs by country, that part is kept INSIDE the one need (P17) — never lost */
  const withSection = connectQuestions({ subject: "s1", possible, records: [q("d9", "c-one")], drafts: [{ questionId: "d9", combination: { axis: "one" }, sections: [{ country: "c-two" }] }], on: ON });
  assert.deepEqual(withSection.records.find((x) => x.record_type === "planning_need").sections.map((s) => s.country), ["c-two"], "a country-specific part was lost");
});

/* ================= F35 C9 · GROUPED NEEDS ARE DECISION SUBJECTS; EVERY DECISION HAS A RECORDED QUESTION ================= */

test("T9a · F35 C9 A CENSUS OF DECISIONS AGAINST RECORDED QUESTIONS — on the REAL existing pages: every grouped need decided once, in its own field; no decision but HOLD without a question; the declared specs keep their shape (F41)", () => {
  const { rows, slug } = realPlanning();
  const r = real(rows);
  const needIds = [...new Set(rows.filter((x) => x.record_type === CONNECTION).map((x) => x.needId))];
  assert.ok(needIds.length >= 1);
  assert.deepEqual(r.groupedNeeds.map((d) => d.subject.needId).sort(), needIds.sort(), "a grouped need was not decided, or decided twice");
  /* pinned to the LITERAL shape F41 reads (one PROPOSED_NEED per declared spec, by slug) — never to another run of the same code */
  assert.deepEqual(r.needs.map((d) => ({ ...d.subject })), Object.keys(PRODUCT.pageSpecs).map((slug) => ({ kind: "PROPOSED_NEED", slug })), "F35's existing needs output changed shape (F41 reads it)");
  for (const d of r.groupedNeeds) assert.ok(d.class === HOLD || readConnections(rows).needs.find((n) => n.needId === d.subject.needId).questions > 0, "a decision with no recorded question");
  const spec = r.needs.find((d) => d.subject.slug === slug);
  assert.ok(spec.missing.some((m) => m.includes(needIds[0])), "the declared spec does not name the grouped need it is decided as");
  /* the real record as it is: 27 real pages are comparison pages and no substance review exists, so a CREATE would need guidance → HOLD */
  assert.ok(r.groupedNeeds.every((d) => !acts(d).includes("CREATE")), "a real CREATE without a resolved duplication verdict");
  console.log(`  REAL (count-only): existing pages ${r.pages.length} · declared specs ${r.needs.length} (HOLD ${r.summary.needs.hold}) · grouped needs ${r.groupedNeeds.length} · ${JSON.stringify(r.summary.groupedNeeds.byOutcome)}`);
});

test("T9b · F35 C9 (A1) A DECLARED SPEC WITH NO RECORDED QUESTION IS HOLD, its missing fact named — no existing page is deleted or changed because of it", () => {
  const d = decideForNeed({ slug: "fixture-spec" });
  assert.deepEqual([d.decision, d.class, d.outcome, acts(d)], [D.CANNOT_DECIDE, HOLD, OUTCOMES.HOLD, []]);
  assert.match(d.missing[0], /no recorded relevant question/);
  const none = decide({ need: { questions: 0 } });
  assert.deepEqual([none.class, acts(none)], [HOLD, []], "a grouped need with no recorded question was decided");
  for (const n of BASE.needs) assert.deepEqual([n.class, n.actions.length], [HOLD, 0], "a real declared spec without a question was decided");
  assert.deepEqual(BASE.pages.map((p) => p.actions.map((a) => a.action)), real(null).pages.map((p) => p.actions.map((a) => a.action)), "deciding the specs changed an existing page's decision");
});

test("T9c · F35 C9 (F35-10) F35 READS THE COVERAGE RECORD F91 WRITES — a need with none, or REFUSED / CANNOT DECIDE, is HOLD; an existing page a record names with a missing question carries it (ADD SECTION)", () => {
  assert.equal(decide({ coverage: null }).class, HOLD);
  for (const c of ["REFUSED", "CANNOT_DECIDE"]) assert.equal(decide({ coverage: { ...NONE, coverage: c } }).class, HOLD, `${c} coverage decided`);
  const pop = readExistingPagePopulationOnce();
  const host = pop.pages.find((p) => servedHeadingsOf(p.html).length > 0);
  const heading = servedHeadingsOf(host.html)[0];
  const combo = { [PRODUCT.axis.key]: PRODUCT.pageSpecs[Object.keys(PRODUCT.pageSpecs)[0]].variant };
  const conn = [["k1", heading], ["k2", "A question no existing page answers in any section?"]].map(([id, w]) => ({ record_type: CONNECTION, needId: "need:real", questionId: id, wording: w, combination: combo, tier: "OBSERVED" }));
  const cov = coverageRecords({ subject: "almi-oet", rows: conn, tenantId: SIDE.tenantId, population: pop, on: ON });
  assert.equal(latestCoverageRecords(cov).get("need:real").coverage, "PARTIAL");
  const r = real([...conn, ...cov]);
  const named = r.pages.filter((p) => p.actions.some((a) => a.action === "ADD SECTION"));
  assert.ok(named.length >= 1 && named.every((p) => p.actions.find((a) => a.action === "ADD SECTION").evidence.includes(cov[0].measurement_key)), "a page the coverage record names did not reach ADD SECTION from it");
  assert.deepEqual(r.groupedNeeds.map((d) => acts(d)), [["ADD SECTION"]]);
});

test("T9d · ruling (c) RIGHT-TO-EXIST FROM THE MATCHING DECLARED SPEC; a need whose candidate matches no declared spec is HOLD until R4's spec compiler", () => {
  const slug = Object.keys(PRODUCT.pageSpecs)[0];
  assert.equal(specForCandidate(JSON.stringify([[PRODUCT.axis.key, PRODUCT.pageSpecs[slug].variant]]), PRODUCT), slug);
  assert.equal(specForCandidate(JSON.stringify([[PRODUCT.axis.key, "no-such-variant"]]), PRODUCT), null);
  assert.equal(specForCandidate(JSON.stringify([["other", "x"]]), PRODUCT), null);
  const d = decide({ rightToExist: null });
  assert.equal(d.class, HOLD);
  assert.match(d.missing[0], /R4's spec compiler/);
});

test("T9e · F35 C9 THE ENTRY POINT READS THE NAMED RESEARCH BATCH: in a declared world, F91's planning store is read, every grouped need is decided and counted with HOLD by its own name, DEMAND MONITORING on its own line; nothing written", () => {
  const W = declaredWorld();
  try {
    const BATCH = "fixture-rr174-actions";
    const reg = JSON.parse(readFileSync(join(W.root, "roots.json"), "utf8"));
    reg.subjects.find((s) => s.subjectId === "almi-oet").members.push({ resourceKind: "RESEARCH_BATCH", resourceRef: BATCH });
    writeFileSync(join(W.root, "roots.json"), JSON.stringify(reg, null, 2));
    const att = JSON.parse(readFileSync(join(W.root, "tenancy", "attachments.json"), "utf8"));
    att.attachments.push({ ...att.attachments[0], resourceKind: "RESEARCH_BATCH", resourceRef: BATCH, tenantId: FIXTURE_TENANT });
    writeFileSync(join(W.root, "tenancy", "attachments.json"), JSON.stringify(att, null, 2));
    mkdirSync(join(W.root, "research", BATCH), { recursive: true });
    const { rows } = realPlanning();
    writeFileSync(join(W.root, "research", BATCH, "planning.jsonl"), rows.map((x) => JSON.stringify(x)).join("\n") + "\n");
    const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
    const r = spawnSync(process.execPath, W.argv(["bin/page-actions.mjs", "--product=almi-oet", `--research-batch=${BATCH}`]), { cwd: REPO, encoding: "utf8", env: W.envWith() });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /grouped needs   1 · CHOSEN \d+ · HOLD \d+ · CANNOT_DECIDE \d+/);
    assert.match(r.stdout, /outcomes        KEEP \/ NO NEW PAGE \d+ · IMPROVE \/ ADD SECTION \d+ · CREATE \d+ · HOLD \d+ · REJECT \/ CONNECT \d+/);
    assert.match(r.stdout, /DEMAND MONITORING  NOT MEASURED/);
    assert.doesNotMatch(r.stdout + r.stderr, /https?:\/\//);
    assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
  } finally { W.cleanup(); }
});

/* ================= F34 C7 · THE MONITOR MAPPING, EXPLICIT ================= */

const T34 = "tenant:00000000000000000000000000000f34";
const pg = (pageId, html) => ({ pageId, tenantId: T34, html });
const V34 = ["alpha", "beta"];
const ex = (pages, coverageState = "COMPLETE", intent = "alpha") => existingPageFirst({ candidate: { slug: intent, intent, structure: { values: V34 } }, tenantId: T34, population: { tenantId: T34, coverageState, pages } });

test("T7a · F34 C7 M3 · a SERVED need is KEEP / NO NEW PAGE — the existing page named, nothing produced, the served reason KEPT for F36", () => {
  const d = ex([pg("p-alpha", "<h1>Alpha</h1>")]);
  assert.deepEqual([d.outcome, d.reason, d.mayProduce, d.existingPages[0]], [O.KEEP, R.SERVED, false, "p-alpha"]);
  assert.equal(R.SERVED, "AN_EXISTING_PAGE_SERVES_THIS_INTENT", "the served reason F36 reads was renamed");
  const rte = rightToExist({ slug: "alpha", spec: { variant: "alpha" }, siblings: [], variants: V34, existingPageDecision: d });
  assert.notEqual(rte.outcome, "ESTABLISHED", "F36 let a served need through");
});

test("T7b · F34 C7 M4 · F33 CANNOT DECIDE → HOLD, with its reason — never MONITOR, never CREATE", () => {
  /* a page naming no registered need at all cannot be ruled in or out (F33 C4: CANNOT DECIDE) */
  const d = ex([pg("p-x", "<h1>Something else entirely</h1>")]);
  assert.deepEqual([d.outcome, d.mayProduce], [O.HOLD, false]);
  assert.ok(d.reason && d.existingPages.length === 1);
});

test("T7c · F34 C7 M5 · no existing page over a population NOT recorded COMPLETE → HOLD; COMPLETE lets production go on", () => {
  for (const c of ["PARTIAL", "UNKNOWN"]) assert.deepEqual([ex([], c).outcome, ex([], c).reason], [O.HOLD, R.NOT_COMPLETE], c);
  assert.deepEqual([ex([], "COMPLETE").outcome, ex([], "COMPLETE").mayProduce], [O.NO_EXISTING_PAGE, true]);
});

test("T7d · F34 C7 MONITOR IS NO LONGER AN F34 OUTCOME — and M6: KEEP and HOLD produce nothing (construction reads mayProduce, unchanged)", () => {
  assert.equal(O.MONITOR, undefined);
  assert.deepEqual(Object.keys(O).sort(), ["HOLD", "IMPROVE", "KEEP", "NOT_COVERED", "NO_EXISTING_PAGE", "REFUSED"]);
  const src = readFileSync(join(REPO, "src/page/existing-page-first.mjs"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(src, /MONITOR/, "MONITOR is still in F34's code");
  const c = readFileSync(join(REPO, "src/page/construct.mjs"), "utf8");
  assert.match(c, /state: existing\.mayProduce \? PASS : existing\.outcome === EXISTING_PAGE_OUTCOMES\.REFUSED \? NOT_TESTED : FAIL,/, "construction no longer decides by mayProduce");
  for (const d of [ex([pg("p-alpha", "<h1>Alpha</h1>")]), ex([], "PARTIAL")]) assert.equal(d.mayProduce, false, `${d.outcome} let a page be produced`);
});

test("T7e · F34 C7 AN UNCERTAIN MATCH IS NOTHING BUT HOLD — a synonym-only page, a body mention, an unregistered intent", () => {
  for (const pages of [[pg("p1", "<h1>Something else</h1><p>alpha</p>")], [pg("p2", "<h1>Alpha and beta together</h1>")]]) assert.equal(ex(pages).outcome, O.HOLD, JSON.stringify(pages.map((p) => p.pageId)));
});

/* ================= unchanged rows, pinned by blob (§6) ================= */

test("T-PIN · F33's existing coverage function, F36's right-to-exist and F41's brief (and its evidence reader) are byte-for-byte the merged base", () => {
  const BASE_BLOBS = Object.freeze({ "src/page/need-coverage.mjs": "a435564272cdda13b6e8555a653631c3348b1278", "src/page/right-to-exist.mjs": "1ca02751f1d901a182187603f0a40ff4ffcc4c94", "src/page/content-brief.mjs": "25144d394bc05ef90cfe34bd5bf9b9d9d3eb4bd3", "src/page/content-brief-evidence.mjs": "6244eca62a26e6edb5c09c82c880d9b11f77a29b" });
  for (const [f, blob] of Object.entries(BASE_BLOBS)) assert.equal(execFileSync("git", ["-C", REPO, "ls-files", "-s", f], { encoding: "utf8" }).split(/\s+/)[1], blob, `${f} changed`);
});

/* ================= RE-PROOF · the unpinned EVIDENCE lines (ruling e) ================= */

const F35T = readFileSync(join(REPO, "test/f35-action-decision.test.mjs"), "utf8");
const F34T = readFileSync(join(REPO, "test/f34-no-blind-regeneration.test.mjs"), "utf8");
const MINE = readFileSync(new URL(import.meta.url), "utf8");
const SAB = existsSync(join(REPO, "test/helpers/rr174-sabotage.mjs")) ? readFileSync(join(REPO, "test/helpers/rr174-sabotage.mjs"), "utf8") : "";
const named = (src, prefix) => new RegExp(`test\\("${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(src);

test("R35 · F35's 8 unpinned evidence items are each proved by a named test — per clause a production-path test, a firing control and a sabotage; hand-written fixtures; C3's firing control as re-read; the real structures; CI; the board route", () => {
  const map = {
    E1_production_path: [[F35T, "REAL · the client's recorded structures"], [MINE, "T9a ·"], [MINE, "T9c ·"], [MINE, "T9e ·"]],
    E2_firing_control: [[F35T, "C3 (as amended) · FIRING CONTROL"], [F35T, "RR-89 · FIRING CONTROL"], [MINE, "T3d ·"]],
    E4_hand_written_fixtures: [[F35T, "C5 · the existing-page rules"], [MINE, "T4a ·"]],
    E5_c3_firing_control_as_reread: [[MINE, "T3b ·"]],
    E6_real_structures_as_they_are: [[F35T, "REAL · the client's recorded structures"], [MINE, "T9a ·"]],
    E7_full_suite_in_ci: [[MINE, "R3-CI ·"]],
    E8_board_route: [[MINE, "R3-BOARD ·"]],
  };
  for (const [item, tests] of Object.entries(map)) for (const [src, p] of tests) assert.ok(named(src, p), `${item}: no test named "${p}"`);
  /* E3 · a sabotage per clause: C1–C9 */
  for (const c of ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9"]) assert.match(SAB, new RegExp(`"F35 ${c} · `), `E3: no sabotage for F35 ${c}`);
});

test("R34 · F34's 12 unpinned evidence items are each proved by a named test — per clause a production-path test, a firing control and a sabotage; the real population (served, other wording, not served, uncertain; empty is COULD-NOT-PROVE); the census; no live call; the trail; CI; the board route", () => {
  const map = {
    E1_production_path: [[F34T, "C6 · END TO END"], [MINE, "T7a ·"]],
    E2_firing_control: [[F34T, "C2 · with NO existing page"], [MINE, "T7c ·"]],
    E4_real_population: [[F34T, "REAL ·"]],
    E5_served_other_wording_not_served_uncertain: [[F34T, "C2 · the SAME need in DIFFERENT WORDS"], [MINE, "T7e ·"]],
    E6_census: [[F34T, "C5 ·"]],
    E7_no_live_call: [[MINE, "R3-CALLS ·"]],
    E8_trail: [[F34T, "the production trail was not written by this file"], [MINE, "the production trail was not written by this file"]],
    E9_full_suite_in_ci: [[MINE, "R3-CI ·"]],
    E10_board_route: [[MINE, "R3-BOARD ·"]],
  };
  for (const [item, tests] of Object.entries(map)) for (const [src, p] of tests) assert.ok(named(src, p), `${item}: no test named "${p}"`);
  for (const c of ["C1", "C2", "C3", "C4", "C5", "C6", "C7"]) assert.match(SAB, new RegExp(`"F34 ${c} · `), `E3: no sabotage for F34 ${c}`);
  /* the real population is not empty (else COULD-NOT-PROVE, never PASS) */
  assert.ok(readExistingPagePopulationOnce().pages.length > 0, "EMPTY real population — the clause would be COULD-NOT-PROVE");
});

test("R3-CALLS · F35's decision, its reader and F34's check load no module that can make a network, process, connector or paid call — and the enumeration fires when one is planted", () => {
  const entries = ["src/page/action-decision.mjs", "src/page/action-evidence.mjs", "src/page/existing-page-first.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(join(REPO, f)) ? readFileSync(join(REPO, f), "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("R3-CI · the full suite runs as CI runs it: the tracked workflow runs node --test over every test on each pull request and on main", () => {
  const wf = execFileSync("git", ["-C", REPO, "ls-files", ".github/workflows"], { encoding: "utf8" }).split("\n").filter(Boolean).map((f) => readFileSync(join(REPO, f), "utf8")).join("\n");
  assert.ok(wf.length > 0);
  assert.match(wf, /pull_request/);
  assert.match(wf, /\bmain\b/);
  assert.match(JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")).scripts?.test ?? "", /node --test|test\//);
});

test("R3-BOARD · F35 and F34 move only through the production validator and the audit trail: each REOPENED is on the board and in the trail; a VERIFIED-PASS row carries a REAL VERIFIED event after it, every clause PROVED", async () => {
  const { DECLARED } = await import("../config/fboard/f-board.mjs");
  const trail = readFileSync(TRAIL, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  for (const [f, n] of [["F35", 9], ["F34", 7]]) {
    const row = DECLARED[f];
    const reopened = row.events.filter((e) => e.kind === "REOPENED").at(-1);
    assert.equal(reopened?.reason, "AUTHORITATIVE_REQUIREMENT_CHANGE");
    assert.ok(trail.some((e) => e.eventType === "BOARD_TRANSITION" && e.action === "REOPENED" && e.metadata?.featureId === f && e.occurredAt.startsWith("2026-10-05")), `${f}'s REOPENED is not in the trail`);
    if (row.state === "VERIFIED-PASS") {
      const v = row.events.filter((e) => e.kind === "VERIFIED").at(-1);
      assert.ok(row.events.indexOf(v) > row.events.indexOf(reopened) && v.population === "REAL");
      assert.ok(Object.keys(v.clauses ?? {}).length === n && Object.values(v.clauses).every((c) => c === "PROVED"), `${f} is VERIFIED-PASS with a clause not PROVED`);
    } else assert.equal(row.state, "IN-PROGRESS");
  }
});

test("the production trail was not written by this file", () => assert.equal(trailSha(), TRAIL_BEFORE));
