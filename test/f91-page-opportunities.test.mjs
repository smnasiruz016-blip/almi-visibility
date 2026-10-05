/**
 * F91 · PAGE OPPORTUNITY PLANNING (acceptance _handoffs 2048dd3; Amendment 1 _handoffs 4ef1b9c, RR-130).
 *
 * Fixtures DRIVE the rules (hand-counted below); they never stand in for the real population. The two-product proof runs the production
 * reader over the engine's two unrelated neutral test products (different dimensions, their own fact registries), each with a planning
 * store written to a temporary directory. The REAL test reads the demonstration product through its own scope and is the only source of
 * reported figures. Nothing is fetched or rendered; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { planPages, possibleCombinations, verifiedOpportunities, groupOpportunities, neededNewPages, formatNumber, formatLine, F35_GROUPED, TIER_NAMES, demandOf, normaliseWording, candidateKey, NOT_MEASURED, VERDICT, MISSING, LABELS, APPLICABILITY, DEMAND_RULES, SAMPLE_NOTICE } from "../src/page/page-opportunities.mjs";
import { readProductPlan, qualifierKeys, planningInputs } from "../src/page/page-opportunities-reader.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { COMPLETENESS_CLAIM } from "../src/research/public-questions.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";
import { PRODUCT as KNOTS } from "../products/neutral-test-knots/product.mjs";
import { PRODUCT as FERMENTS } from "../products/neutral-test-ferments/product.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PLANNER = ["src/page/page-opportunities.mjs", "src/page/page-opportunities-reader.mjs", "bin/page-opportunities.mjs"];

const SRC = "a recorded declaration";
const dim = (key, values, applicability = APPLICABILITY.APPLIES, source = SRC) => ({ key, values, source, applicability, limits: "declared values only", exclusions: "none" });
const all4 = (demand) => ({ demand, credibleSource: true, productFit: true, distinctNeed: true });
const recs = (entries) => new Map(entries.map(([c, r]) => [candidateKey(c), r]));

/* ================= C1 — possible combinations ================= */

test("C1 · FIRING CONTROL: one applying dimension counts its values; several are NEVER multiplied without declared combinations; universes, inapplicable and sourceless dimensions are excluded", () => {
  assert.equal(possibleCombinations({ dimensions: [dim("d1", ["a", "b", "c"])] }).value, 3);
  const two = [dim("d1", ["a", "b", "c"]), dim("d2", ["x", "y", "z", "w"])];
  const none = possibleCombinations({ dimensions: two });
  assert.equal(none.value, NOT_MEASURED, "3 × 4 were multiplied with no declaration");
  assert.equal(none.missing, MISSING.combinationRule);
  assert.equal(possibleCombinations({ dimensions: two, declaredCombinations: [{ d1: "a", d2: "x" }, { d1: "b", d2: "y" }, { d1: "a", d2: "x" }, { d1: "q", d2: "x" }] }).value, 2, "a repeated or undeclared-value combination was counted");
  /* a candidate universe, an inapplicable dimension and a dimension with no recorded source never enter the arithmetic */
  const mixed = possibleCombinations({ dimensions: [dim("d1", ["a", "b"]), dim("universe", Array.from({ length: 196 }, (_, i) => `u${i}`), APPLICABILITY.CANDIDATE_UNIVERSE), dim("na", ["n"], APPLICABILITY.NOT_APPLICABLE), dim("nosrc", ["s"], APPLICABILITY.APPLIES, "")] });
  assert.equal(mixed.value, 2, "an excluded dimension entered the count");
  assert.deepEqual(mixed.excluded.map((x) => x.key), ["universe", "na", "nosrc"]);
  assert.match(mixed.excluded[0].why, /CANDIDATE UNIVERSE .* never multiplied, never a target/);
  assert.deepEqual(mixed.dimensions.map((d) => [d.key, d.values, d.source]), [["d1", 2, SRC]]);
  assert.equal(possibleCombinations({ dimensions: [dim("d1", [])] }).value, NOT_MEASURED);
  /* a declared combination naming an excluded dimension is dropped and counted */
  const viaExcluded = possibleCombinations({ dimensions: [dim("d1", ["a"]), dim("d2", ["x"]), dim("u", ["z"], APPLICABILITY.CANDIDATE_UNIVERSE)], declaredCombinations: [{ d1: "a", d2: "x" }, { d1: "a", u: "z" }] });
  assert.equal(viaExcluded.value, 1);
  assert.match(LABELS.possible, /candidates only; not pages, not a plan, not a target, not a potential, not a page estimate/);
});

/* ================= C2 — verified opportunities ================= */

test("C2 · FIRING CONTROL: the demand mapping — OBSERVED, OWNED and STRONG qualify; INFERRED, CLIENT_CLAIM, MONITOR and competitor coverage never do; anything else is UNKNOWN", () => {
  for (const s of ["OBSERVED", "OWNED_OBSERVED", "STRONG"]) assert.equal(demandOf([{ state: s }]), true, s);
  for (const s of ["INFERRED", "CLIENT_CLAIM", "MONITOR", "COMPETITOR_COVERAGE"]) assert.equal(demandOf([{ state: s }]), false, s);
  for (const s of ["MODERATE", "WEAK", "UNKNOWN", "SOMETHING_NEW"]) assert.equal(demandOf([{ state: s }]), undefined, `${s} was decided by the implementation`);
  assert.equal(demandOf([]), undefined, "an empty sample was read as no demand");
  assert.equal(demandOf([{ state: "INFERRED" }, { state: "OBSERVED" }]), true);
  assert.equal(demandOf([{ state: "INFERRED" }, { state: "MODERATE" }]), undefined, "an undecided state was overridden by a non-qualifying one");
  for (const [s, r] of Object.entries(DEMAND_RULES)) assert.ok(typeof r.by === "string" && r.by.length > 0, `${s} names no deciding contract`);
});

test("C2 · FIRING CONTROL: every limb must be recorded; a limb not met is excluded and named; one UNKNOWN candidate makes number 2 NOT MEASURED — never 0; the four kinds are counted apart", () => {
  const possible = possibleCombinations({ dimensions: [dim("d", ["a", "b", "c", "d", "e"])] });
  const r = verifiedOpportunities({ possible, records: recs([
    [{ d: "a" }, all4([{ state: "OBSERVED" }, { state: "INFERRED" }])],
    [{ d: "b" }, all4([{ state: "OWNED_OBSERVED" }])],
    [{ d: "c" }, all4([{ state: "CLIENT_CLAIM" }])],
    [{ d: "d" }, { ...all4([{ state: "OBSERVED" }]), productFit: false }],
  ]) });
  assert.equal(r.value, NOT_MEASURED, "number 2 was a number while a candidate is UNKNOWN");
  assert.match(r.missing, /never zero demand/);
  assert.deepEqual([r.verifiedSoFar, r.unknown, r.excluded.demand, r.excluded.productFit], [2, 1, 1, 1]);
  assert.deepEqual([r.kinds.observedQuestions, r.kinds.inferredSuggestions, r.kinds.ownedEvidence, r.kinds.clientClaims], [2, 1, 1, 1], "one kind of demand evidence was counted as another");
  const done = verifiedOpportunities({ possible: possibleCombinations({ dimensions: [dim("d", ["a", "b"])] }), records: recs([[{ d: "a" }, all4([{ state: "STRONG" }])], [{ d: "b" }, all4([{ state: "MONITOR" }])]]) });
  assert.deepEqual([done.value, done.excluded.demand], [1, 1]);
  const empty = verifiedOpportunities({ possible: possibleCombinations({ dimensions: [dim("d", ["a"])] }) });
  assert.equal(empty.value, NOT_MEASURED, "a candidate with no record read as verified or as zero");
});

/* ================= C3 — genuinely needed pages ================= */

const v = (cands) => ({ value: cands.length, opportunities: cands });
const g = (members, rec) => [JSON.stringify(members.map(candidateKey).sort()), rec];
const NEW_REC = { coverage: "NOT_COVERED", rightToExist: "ESTABLISHED", verifiedFacts: true, verifiedAnswer: true };

test("C3 · FIRING CONTROL: identical wording merges inside one combination only; similar wording never merges; a recorded judgement joins two combinations", () => {
  const A = { d: "a" }, B = { d: "b" }, C = { d: "c" };
  const questions = new Map([
    [candidateKey(A), [{ id: "q1", wording: "How long is it valid?" }, { id: "q2", wording: "  how long is it VALID " }, { id: "q3", wording: "How long does it stay valid?" }]],
    [candidateKey(B), [{ id: "q4", wording: "How long is it valid?" }]],
    [candidateKey(C), [{ id: "q5", wording: "Where do I take it?" }]],
  ]);
  const plain = groupOpportunities({ verified: v([A, B, C]), questions, groupRecords: new Map() });
  assert.equal(plain.merged.questions, 1, "only q1/q2 are identical after the stated normalisation");
  assert.equal(plain.groups, 3, "identical wording in two different combinations was merged without a recorded judgement");
  const judged = groupOpportunities({ verified: v([A, B, C]), questions, sameness: [["q1", "q4"], ["q9", "q5"]], groupRecords: new Map() });
  assert.deepEqual([judged.groups, judged.merged.candidatesJoined, judged.merged.judgementsApplied, judged.merged.judgementsIgnored], [2, 1, 1, 1]);
  assert.equal(normaliseWording("  How long is it VALID?? "), "how long is it valid");
});

test("C3 · FIRING CONTROL: COVERED is never new; CANNOT DECIDE, a missing right to exist, facts or answer HOLD with the reason; only a fully recorded group is NEW", () => {
  const cands = ["a", "b", "c", "d", "e", "f", "h", "i"].map((x) => ({ d: x }));
  const groupRecords = new Map([
    g([cands[0]], { coverage: "COVERED" }),
    g([cands[1]], { coverage: "CANNOT_DECIDE" }),
    g([cands[2]], { coverage: "NOT_COVERED", rightToExist: "REFUSED" }),
    g([cands[3]], { coverage: "NOT_COVERED", rightToExist: "ESTABLISHED", verifiedFacts: true }),
    g([cands[4]], { coverage: "NOT_COVERED", rightToExist: "CANNOT DECIDE" }),
    g([cands[5]], NEW_REC),
    g([cands[6]], { ...NEW_REC, uniqueValue: false }),
    g([cands[7]], { coverage: "NOT_COVERED", rightToExist: "ESTABLISHED" }),
  ]);
  const r = groupOpportunities({ verified: v(cands), groupRecords });
  assert.deepEqual([r.value, r.covered, r.refused, r.held], [1, 1, 2, 4]);
  assert.deepEqual(r.heldBy, { coverage: 1, rightToExist: 1, facts: 1, answer: 1 });
  const none = groupOpportunities({ verified: v([{ d: "z" }]) });
  assert.deepEqual([none.value, none.held, none.heldBy.coverage], [0, 1, 1], "a group with no records at all was counted as a page");
  /* Amendment 3 C14 (RR-172): this grouping of number 2's opportunities is NOT number 3 — it cannot group what number 2 has not measured. Number 3
   * (neededNewPages) takes no number-2 limb at all: test/rr172-r2-f91-f33.test.mjs T14d proves it. */
  assert.equal(groupOpportunities({ verified: { value: NOT_MEASURED, missing: "x" } }).value, NOT_MEASURED, "number 2's opportunities were grouped while number 2 is NOT MEASURED");
});

/* ================= C4–C6 ================= */

test("C5 · CONTROL: a combination with NO evidence never becomes a verified opportunity or a needed page, whatever else is recorded", () => {
  const p = planPages({ dimensions: [dim("d", ["a"])], groupRecords: new Map([g([{ d: "a" }], NEW_REC)]) });
  assert.equal(p.verified.value, NOT_MEASURED);
  /* Amendment 3 C14: number 3 is by tier, from F35's decisions only — NOT MEASURED here, never a page */
  for (const n of Object.values(p.needed)) assert.equal(n.value, NOT_MEASURED);
  assert.equal(p.groups.value, NOT_MEASURED);
});

/* C5's order law ('number 1 ≥ number 2 ≥ number 3 must hold …') is SUPERSEDED by Amendment 3 C15 (RR-172): no ordering is asserted, checked
 * or implied. Its proof — a fixture with needed new pages exceeding combinations, passing, and a sabotage restoring the order check — is
 * test/rr172-r2-f91-f33.test.mjs T15. Here only the absence: no order law is exported and no plan carries one. */
test("C5 → C15 · no order law exists: the planner exports none and a plan carries no order or order verdict", async () => {
  const mod = await import("../src/page/page-opportunities.mjs");
  assert.equal(mod.orderLaw, undefined, "an order law is still exported");
  const p = planPages({ dimensions: [dim("d", ["a"])] });
  assert.ok(!("order" in p) && !("verdict" in p), "a plan still carries an order or an order verdict");
});

test("C6 · CONTROL: NOT MEASURED is never printed as 0; C4 the three numbers stay separate and nothing sums them", () => {
  const p = planPages({ dimensions: [] });
  for (const n of [p.possible, p.verified, ...Object.values(p.needed), ...Object.values(p.actions), p.lines.clientReceived]) assert.match(formatNumber(n), /NOT MEASURED — missing /);
  assert.doesNotMatch(formatNumber(p.verified), /: 0\b/);
  assert.equal(formatNumber({ label: "X", value: 0 }), "X: 0");
  const src = readFileSync(join(REPO, PLANNER[0]), "utf8");
  assert.doesNotMatch(src, /possible\.value\s*\+|verified\.value\s*\+|needed\.value\s*\+/, "the planner sums two of its numbers");
});

/* ================= C7 — any client, one client at a time ================= */

const QUOTA = /\b(max|limit|quota|cap|target)_?pages?\b|\bpages?_?(quota|cap|limit|target)\b|quota\s*[:=]\s*\d/i;
const DIMENSION_NAMES = () => [...new Set([KNOTS.axis.key, FERMENTS.axis.key, "profession", "country", "institution", "university", "course", "destination", "origin"])];

test("C7 · FIRING CONTROL: the planner names no declared product word, no product's dimension and no page quota — and each scanner fires when one is planted", () => {
  assert.ok(PRODUCT_WORDS.length > 0, "an empty vocabulary would make every scan pass");
  for (const f of PLANNER) {
    const text = readFileSync(join(REPO, f), "utf8");
    assert.deepEqual(scanSource(text).code, [], `${f} names a product in code`);
    const code = text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
    for (const d of DIMENSION_NAMES()) assert.doesNotMatch(code, new RegExp(`["'\`]${d}["'\`]`, "i"), `${f} names the dimension "${d}" in code`);
    assert.doesNotMatch(code, QUOTA, `${f} carries a page quota`);
  }
  const planted = `${readFileSync(join(REPO, PLANNER[0]), "utf8")}\nexport const X = "${PRODUCT_WORDS[0]}";\nconst MAX_PAGES = 50;\nconst DIM = "profession";\n`;
  assert.ok(scanSource(planted).code.length > 0, "the neutrality scanner did not fire on a planted product word");
  assert.match(planted, QUOTA, "the quota scanner did not fire on a planted quota");
  assert.match(planted.replace(/\/\*[\s\S]*?\*\//g, ""), /["']profession["']/, "the dimension scanner did not fire on a planted dimension");
});

/** A product object as the descriptor gives it, with a planning store in a temporary directory. */
function withPlanning(product, planning, rows) {
  const dir = mkdtempSync(join(tmpdir(), "almi-f91-"));
  const records = join(dir, "planning.jsonl");
  writeFileSync(records, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return { product: { ...product, planning: { ...planning, records } }, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("C7 · TWO UNRELATED PRODUCTS, DIFFERENT DIMENSIONS — sparse data, duplicate questions and existing-page coverage, through the production reader", async () => {
  const [k0, k1, k2] = KNOTS.variants;
  /* product 1: its own axis + a second applying dimension, combinations declared; one candidate UNKNOWN (sparse) → number 2 NOT MEASURED */
  const K = withPlanning(KNOTS, {
    dimensions: [{ key: "use", values: ["sailing", "climbing"], source: "a recorded declaration", applicability: APPLICABILITY.APPLIES, limits: "two uses", exclusions: "none" }],
    relevantCombinations: [{ [KNOTS.axis.key]: k0, use: "sailing" }, { [KNOTS.axis.key]: k1, use: "climbing" }, { [KNOTS.axis.key]: k2, use: "sailing" }],
  }, [
    { record_type: "planning_demand", combination: { [KNOTS.axis.key]: k0, use: "sailing" }, state: "OBSERVED", questionId: "kq1", wording: "W1" },
    { record_type: "planning_limbs", combination: { [KNOTS.axis.key]: k0, use: "sailing" }, credibleSource: true, productFit: true, distinctNeed: true },
    { record_type: "planning_demand", combination: { [KNOTS.axis.key]: k1, use: "climbing" }, state: "INFERRED" },
    { record_type: "planning_limbs", combination: { [KNOTS.axis.key]: k1, use: "climbing" }, credibleSource: true, productFit: true, distinctNeed: true },
    { record_type: "not_a_planning_record" },
  ]);
  /* product 2: its own axis + a CANDIDATE UNIVERSE that never enters; every candidate decided; duplicates; one covered, one new */
  const [f0, f1, f2] = FERMENTS.variants;
  const fc = (x) => ({ [FERMENTS.axis.key]: x });
  const F = withPlanning(FERMENTS, {
    dimensions: [{ key: "region", values: Array.from({ length: 196 }, (_, i) => `r${i}`), source: "an inventory", applicability: APPLICABILITY.CANDIDATE_UNIVERSE, limits: "unverified", exclusions: "all" }],
  }, [
    ...[f0, f1, f2].map((x) => ({ record_type: "planning_limbs", combination: fc(x), credibleSource: true, productFit: true, distinctNeed: true })),
    { record_type: "planning_demand", combination: fc(f0), state: "OBSERVED", questionId: "fq1", wording: "Same question?" },
    { record_type: "planning_demand", combination: fc(f0), state: "OBSERVED", questionId: "fq2", wording: "same   QUESTION" },
    { record_type: "planning_demand", combination: fc(f1), state: "OWNED_OBSERVED", questionId: "fq3", wording: "Other question" },
    { record_type: "planning_demand", combination: fc(f2), state: "CLIENT_CLAIM" },
    ...FERMENTS.variants.slice(3).flatMap((x) => [{ record_type: "planning_demand", combination: fc(x), state: "MONITOR" }, { record_type: "planning_limbs", combination: fc(x), credibleSource: true, productFit: true, distinctNeed: true }]),
    { record_type: "planning_group", members: [fc(f0)], coverage: "COVERED" },
    { record_type: "planning_group", members: [fc(f1)], ...NEW_REC },
  ]);
  try {
    const k = (await readProductPlan(K.product)).plan;
    const f = (await readProductPlan(F.product));
    assert.deepEqual([k.possible.value, k.verified.value, k.verified.unknown, k.verified.verifiedSoFar, k.verified.excluded.demand, k.groups.value], [3, NOT_MEASURED, 1, 1, 1, NOT_MEASURED]);
    for (const n of Object.values(k.needed)) assert.equal(n.value, NOT_MEASURED, "number 3 was a number with no F35 decision");
    assert.deepEqual([f.plan.possible.value, f.plan.possible.excluded.map((x) => x.key)], [FERMENTS.variants.length, ["region"]], "a candidate universe entered product 2's arithmetic");
    assert.deepEqual([f.plan.verified.value, f.plan.verified.excluded.demand, f.plan.verified.kinds.ownedEvidence, f.plan.verified.kinds.clientClaims], [2, FERMENTS.variants.length - 2, 1, 1]);
    assert.deepEqual([f.plan.groups.value, f.plan.groups.covered, f.plan.groups.merged.questions, f.plan.groups.groups], [1, 1, 1, 2]);
    /* Amendment 3 C14/C15: number 3 waits for F35 (R3) — NOT MEASURED, never 0 — and no order is checked */
    for (const n of Object.values(f.plan.needed)) assert.equal(n.value, NOT_MEASURED);
    assert.ok(!("order" in f.plan));
    assert.equal(f.inputs.malformedRecords, 0);
    assert.notDeepEqual(k.possible.dimensions.map((d) => d.key), f.plan.possible.dimensions.map((d) => d.key), "the two products did not differ in dimensions");
  } finally { K.cleanup(); F.cleanup(); }
});

test("C7 · the reader shapes only well-formed planning records; anything else is counted MALFORMED, never read as a limb", () => {
  const i = planningInputs([{ record_type: "planning_limbs", combination: { d: "a" }, credibleSource: true }, { record_type: "planning_limbs", combination: "d=a" }, { record_type: "planning_sameness", questions: ["a"] }]);
  assert.equal(i.malformed, 2);
  assert.equal(i.records.size, 1);
  const keys = qualifierKeys([{ claim: { qualifier: "role=a,place=x" } }, { claim: { qualifier: { role: "b" } } }, { claim: {} }]);
  assert.deepEqual([...keys.entries()], [["role", 2], ["place", 1]]);
});

/* ================= C8 — a sample, and the handoff ================= */

test("C8 · the planner claims no complete sample and promises no ranking; it drafts, answers and writes nothing", () => {
  assert.match(SAMPLE_NOTICE, /a recorded SAMPLE, never every question asked; no ranking, indexing or AI citation is promised/);
  assert.match(LABELS.needed, /nothing is drafted or written here/);
  for (const f of PLANNER.slice(0, 2)) assert.doesNotMatch(readFileSync(join(REPO, f), "utf8"), /\b(writeFileSync|appendFileSync|createWriteStream|renameSync)\b/, `${f} writes`);
});

/* ================= REAL — the demonstration product ================= */

test("REAL · the demonstration product: number 1 from its own declaration; numbers 2 and 3 NOT MEASURED with every candidate UNKNOWN — never zero", async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const { plan, inputs } = await readProductPlan(product);
  assert.ok(inputs.factRecords > 0 && product.variants.length > 0, "EMPTY real population");
  assert.equal(plan.possible.value, product.variants.length, "number 1 is not the declared values of the one applying dimension");
  const keys = qualifierKeys((await loadRegistry(product.factsDir, product.productId)).records);
  assert.equal(inputs.excludedDataKeys, [...keys.keys()].filter((x) => x !== product.axis.key).length, "a data-only qualifier key was combined, or a declared one excluded");
  assert.equal(plan.verified.value, NOT_MEASURED);
  assert.equal(plan.verified.unknown, plan.possible.value, "a real candidate was decided without a recorded demand record");
  for (const n of Object.values(plan.needed)) assert.equal(n.value, NOT_MEASURED);
  assert.ok(!("order" in plan), "an order is still checked (C15)");
  console.log(`  REAL (count-only, the demonstration product's own descriptor and registry): ${JSON.stringify({ n1: plan.possible.value, n2: plan.verified.value, unknown: plan.verified.unknown, verifiedSoFar: plan.verified.verifiedSoFar, n3: Object.fromEntries(Object.entries(plan.needed).map(([t, n]) => [t, n.value])), _: plan.verdict, inputs })}`);
});

/* ================= the entry point, no network ================= */

test("C4 · THE ENTRY POINT: in a declared world it prints three separate numbers with inputs, method, exclusions and unknowns, no URL, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/page-opportunities.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    for (const n of ["  1 POSSIBLE COMBINATIONS — candidates only", "  2 VERIFIED OPPORTUNITIES — observed and verified only; verified does not authorise a page", "    3 NEEDED NEW PAGES — the needs F35 chooses CREATE for"]) assert.ok(ok.stdout.includes(n), `missing ${n}`);
    for (const part of ["inputs: ", "method: ", "excluded: ", "unknown: ", "counts: verified so far ", "lines — each its own, never summed, no order between them", `bound: ${SAMPLE_NOTICE}`]) assert.ok(ok.stdout.includes(part), `missing ${part}`);
    assert.match(ok.stdout, /no page total or quota exists; no line is a ceiling for another/);
    assert.doesNotMatch(ok.stdout, /order 1 ≥ 2 ≥ 3|≥/, "an order is still printed (C15)");
    /* the demonstration product declares no planning store: its demand kinds are NOT MEASURED, never a row of zeros */
    assert.match(ok.stdout, /demand kinds counted apart: NOT MEASURED — no planning record was read/);
    assert.doesNotMatch(ok.stdout, /observedQuestions 0/, "an unread store was printed as zero observed questions");
    for (const line of ok.stdout.split("\n").filter((l) => !l.includes(SAMPLE_NOTICE))) assert.doesNotMatch(line, COMPLETENESS_CLAIM, `a line claims completeness: ${line}`);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C7 · the planner and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = PLANNER.slice(0, 2);
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
