/**
 * F91 · PAGE OPPORTUNITY PLANNING (acceptance _handoffs 2048dd3, RR-113).
 *
 * Fixtures DRIVE the rules (hand-counted below); they never stand in for the real population. The REAL test reads the demonstration
 * product's own descriptor and registry through its own scope and is the only source of reported figures. Nothing is fetched or
 * rendered; the production trail is not written (last test).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync, execFileSync } from "node:child_process";

import { planPages, possibleCombinations, verifiedOpportunities, neededPages, orderLaw, formatNumber, NOT_MEASURED, VERDICT, MISSING, LABELS } from "../src/page/page-opportunities.mjs";
import { readProductPlan, qualifierKeys } from "../src/page/page-opportunities-reader.mjs";
import { productFromArgv } from "../src/product-cli.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { censusSubjectScope } from "../src/tenancy/scoped-run.mjs";
import { PRODUCT_WORDS, scanSource } from "../tools/product-boundary.mjs";
import { decisionCallPaths } from "../tools/need-coverage-call-paths.mjs";
import { declaredWorld } from "./helpers/declared-world.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const TRAIL = join(REPO, "audit-trail", "events.jsonl");
const trailSha = () => (existsSync(TRAIL) ? createHash("sha256").update(readFileSync(TRAIL)).digest("hex") : "absent");
const TRAIL_BEFORE = trailSha();
const PLANNER = ["src/page/page-opportunities.mjs", "src/page/page-opportunities-reader.mjs", "bin/page-opportunities.mjs"];

const DIM = [{ key: "role", values: ["a", "b", "c"] }];
const k = (c) => JSON.stringify(Object.keys(c).sort().map((x) => [x, c[x]]));
const rec = (state, more = {}) => ({ demand: { state, owned: false, observed: true }, reliableSource: true, productFit: true, distinctNeed: true, ...more });

/* ================= C1 — possible combinations ================= */

test("C1 · FIRING CONTROL: one dimension counts its declared values; several are NEVER multiplied without a declared combination rule; an empty one is omitted", () => {
  assert.equal(possibleCombinations({ dimensions: DIM }).value, 3);
  const two = [{ key: "role", values: ["a", "b", "c"] }, { key: "place", values: ["x", "y"] }];
  const blind = possibleCombinations({ dimensions: two });
  assert.equal(blind.value, NOT_MEASURED, "two dimensions were multiplied without the product declaring which combinations are relevant");
  assert.equal(blind.missing, MISSING.combinationRule);
  assert.equal(possibleCombinations({ dimensions: two, declaredCombinations: [{ role: "a", place: "x" }, { role: "b", place: "y" }] }).value, 2);
  const withEmpty = possibleCombinations({ dimensions: [...DIM, { key: "unused", values: [] }] });
  assert.deepEqual([withEmpty.value, withEmpty.omittedDimensions], [3, 1], "an empty dimension was filled instead of omitted");
  assert.equal(possibleCombinations({ dimensions: [] }).value, NOT_MEASURED);
  assert.match(LABELS.possible, /candidates only; not pages, not a plan, not a target, not a potential, not a page estimate/);
});

/* ================= C2 — verified opportunities ================= */

test("C2 · FIRING CONTROL: no owner declaration of qualifying states → NOT MEASURED; all four limbs recorded → counted; a limb not met → excluded and named", () => {
  const possible = possibleCombinations({ dimensions: DIM });
  const records = new Map([[k({ role: "a" }), rec("STRONG")], [k({ role: "b" }), rec("WEAK")], [k({ role: "c" }), rec("STRONG", { productFit: false })]]);
  const none = verifiedOpportunities({ possible, records });
  assert.equal(none.value, NOT_MEASURED, "number 2 was computed with no owner declaration of qualifying demand states");
  assert.equal(none.missing, MISSING.qualifyingStates);
  const v = verifiedOpportunities({ possible, qualifyingDemandStates: ["STRONG"], records });
  assert.equal(v.value, 1);
  assert.deepEqual(v.excluded, { demand: 1, reliableSource: 0, productFit: 1, distinctNeed: 0 });
});

test("C2 · an UNRECORDED limb leaves its candidate undecided and the number NOT MEASURED — fails closed; owned and inferred demand are counted apart", () => {
  const possible = possibleCombinations({ dimensions: DIM });
  const partial = new Map([[k({ role: "a" }), rec("STRONG")], [k({ role: "b" }), rec("STRONG", { reliableSource: undefined })]]);
  const v = verifiedOpportunities({ possible, qualifyingDemandStates: ["STRONG"], records: partial });
  assert.equal(v.value, NOT_MEASURED, "a candidate with an unrecorded limb was counted or excluded instead of left undecided");
  assert.equal(v.undecided, 2);
  const full = new Map(["a", "b", "c"].map((r, i) => [k({ role: r }), { ...rec("STRONG"), demand: { state: "STRONG", owned: i === 0, observed: i !== 2 } }]));
  const w = verifiedOpportunities({ possible, qualifyingDemandStates: ["STRONG"], records: full });
  assert.deepEqual([w.value, w.ownedEvidence, w.inferredDemand], [3, 1, 1]);
});

/* ================= C3 — genuinely needed pages ================= */

test("C3 · FIRING CONTROL: number 3 needs number 2, a declared grouping rule and recorded coverage and unique value; groups, not combinations, become pages", () => {
  const possible = possibleCombinations({ dimensions: DIM });
  const records = new Map(["a", "b", "c"].map((r) => [k({ role: r }), rec("STRONG")]));
  const verified = verifiedOpportunities({ possible, qualifyingDemandStates: ["STRONG"], records });
  assert.equal(neededPages({ verified: { value: NOT_MEASURED, missing: "x" } }).value, NOT_MEASURED);
  assert.equal(neededPages({ verified }).missing, MISSING.groupingRule, "a grouping rule was assumed");
  const groupOf = (c) => (c.role === "c" ? "g2" : "g1");
  assert.equal(neededPages({ verified, groupOf }).missing, MISSING.coverage);
  assert.equal(neededPages({ verified, groupOf, assessments: new Map([["g1", { covered: false }], ["g2", { covered: false }]]) }).missing, MISSING.uniqueValue);
  const n = neededPages({ verified, groupOf, assessments: new Map([["g1", { covered: false, uniqueValue: true }], ["g2", { covered: true, uniqueValue: true }]]) });
  assert.deepEqual([n.value, n.groups, n.excluded], [1, 2, { coveredByAnExistingPage: 1, noUniqueValue: 0 }]);
});

/* ================= C5 — a combination never authorises a page; the order law ================= */

test("C5 · CONTROL: a combination with NO evidence never becomes a verified opportunity or a needed page, whatever else is declared", () => {
  const p = planPages({ dimensions: DIM, qualifyingDemandStates: ["STRONG"], records: new Map(), groupOf: () => "g", assessments: new Map([["g", { covered: false, uniqueValue: true }]]) });
  assert.equal(p.possible.value, 3);
  assert.equal(p.verified.value, NOT_MEASURED, "evidence-free candidates were counted as opportunities");
  assert.equal(p.needed.value, NOT_MEASURED, "an evidence-free candidate reached a page");
});

test("C5 · FIRING CONTROL: the order law holds, is NOT CHECKABLE with any NOT MEASURED, and a breach is a DEFECT — never reordered", () => {
  const n = (v) => ({ value: v });
  assert.deepEqual(orderLaw(n(3), n(2), n(1)), { state: "HOLDS", verdict: VERDICT.PROVED });
  assert.equal(orderLaw(n(3), n(NOT_MEASURED), n(NOT_MEASURED)).state, "NOT CHECKABLE");
  const breach = orderLaw(n(2), n(3), n(1));
  assert.equal(breach.verdict, VERDICT.DISPROVED, "a breached order was accepted");
  assert.match(breach.state, /BREACHED — a planner defect/);
});

/* ================= C4 / C6 — three numbers, NOT MEASURED never zero ================= */

test("C6 · CONTROL: NOT MEASURED is never printed as 0, never a pass; C4 the three numbers stay separate and nothing sums them", () => {
  const p = planPages({ dimensions: DIM });
  for (const x of [p.verified, p.needed]) {
    assert.equal(x.value, NOT_MEASURED);
    const line = formatNumber(x);
    assert.match(line, /NOT MEASURED — missing /);
    assert.doesNotMatch(line, /:\s*0\b/, "NOT MEASURED was printed as 0");
  }
  assert.equal(p.verdict, VERDICT.COULD_NOT_PROVE, "a plan with NOT MEASURED numbers read PROVED");
  assert.equal(p.order.state, "NOT CHECKABLE");
  const src = readFileSync(join(REPO, "src/page/page-opportunities.mjs"), "utf8");
  assert.doesNotMatch(src, /possible\.value\s*\+|verified\.value\s*\+|needed\.value\s*\+|\bTOTAL_PAGES\b|\bquota\s*=/i, "a sum or quota appeared in the planner");
});

/* ================= C7 — any client, one at a time ================= */

test("C7 · FIRING CONTROL: the planner names no declared product word — and the scanner fires when one is planted", () => {
  assert.ok(PRODUCT_WORDS.length > 0, "an empty vocabulary would make every scan pass");
  for (const f of PLANNER) assert.deepEqual(scanSource(readFileSync(join(REPO, f), "utf8")).code, [], `${f} names a product in code`);
  const planted = `${readFileSync(join(REPO, PLANNER[0]), "utf8")}\nexport const X = "${PRODUCT_WORDS[0]}";\n`;
  assert.ok(scanSource(planted).code.length > 0, "the neutrality scanner did not fire on a planted product word");
});

test("C7 · the reader counts qualifier keys from a registry's claims without reading anything else", () => {
  const keys = qualifierKeys([{ claim: { qualifier: "role=a,place=x" } }, { claim: { qualifier: { role: "b" } } }, { claim: {} }]);
  assert.deepEqual([...keys.entries()], [["role", 2], ["place", 1]]);
});

/* ================= REAL — the demonstration product ================= */

test("REAL · the demonstration product: number 1 from its own declaration, numbers 2 and 3 NOT MEASURED with their missing inputs named", async () => {
  const product = await productFromArgv(["node", "x", "--product=almi-oet"], { scope: censusSubjectScope("almi-oet") });
  const { plan, inputs } = await readProductPlan(product);
  assert.ok(inputs.declaredValues > 0 && inputs.factRecords > 0, "EMPTY real population");
  assert.equal(plan.possible.value, inputs.declaredValues, "number 1 is not the declared values of the one declared dimension");
  const keys = qualifierKeys((await loadRegistry(product.factsDir, product.productId)).records);
  assert.equal(inputs.excludedDataKeys, [...keys.keys()].filter((x) => x !== product.axis.key).length, "a data-only qualifier key was combined, or a declared one excluded");
  assert.equal(plan.verified.missing, MISSING.qualifyingStates);
  assert.equal(plan.needed.value, NOT_MEASURED);
  assert.equal(plan.order.state, "NOT CHECKABLE");
  assert.notEqual(plan.verdict, VERDICT.PROVED);
  console.log(`  REAL (count-only, the demonstration product's own descriptor and registry): ${JSON.stringify({ n1: plan.possible.value, n2: plan.verified.value, n3: plan.needed.value, order: plan.order.state, verdict: plan.verdict, inputs })}`);
});

/* ================= the entry point, no network ================= */

test("C4 · THE ENTRY POINT: in a declared world it prints three separate numbers with inputs, method, exclusions and unknowns, no URL, and writes nothing", () => {
  const before = execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" });
  const WORLD = declaredWorld();
  try {
    const env = WORLD.envWith();
    const ok = spawnSync(process.execPath, WORLD.argv(["bin/page-opportunities.mjs", "--product=almi-oet"]), { cwd: REPO, encoding: "utf8", env });
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    for (const n of ["  1 POSSIBLE COMBINATIONS — candidates only", "  2 VERIFIED OPPORTUNITIES", "  3 GENUINELY NEEDED PAGES"]) assert.ok(ok.stdout.includes(n), `missing ${n}`);
    for (const part of ["inputs: ", "method: ", "excluded: ", "unknown: ", "order 1 ≥ 2 ≥ 3: "]) assert.ok(ok.stdout.includes(part), `missing ${part}`);
    assert.match(ok.stdout, /never summed and no page total or quota exists/);
    assert.doesNotMatch(ok.stdout + ok.stderr, /https?:\/\//, "the entry point printed a URL");
  } finally { WORLD.cleanup(); }
  assert.equal(execFileSync("git", ["-C", REPO, "status", "--porcelain"], { encoding: "utf8" }), before, "the entry point wrote into the repository");
});

test("C7 · the planner and its reader load no module that can make a network, process, connector or paid call — and it fires", () => {
  const entries = ["src/page/page-opportunities.mjs", "src/page/page-opportunities-reader.mjs"];
  assert.deepEqual(decisionCallPaths({ entries }).faults, []);
  const planted = decisionCallPaths({ entries, read: (f) => { const t = existsSync(REPO + f) ? readFileSync(REPO + f, "utf8") : null; return f === entries[0] ? `${t}\nawait fetch(u);\n` : t; } });
  assert.deepEqual(planted.faults.map((x) => x.code), ["RAW_NETWORK_CALL"]);
});

test("the production trail was not written by this file", () => {
  assert.equal(trailSha(), TRAIL_BEFORE);
});
