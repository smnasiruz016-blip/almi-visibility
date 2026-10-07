/**
 * 🔴 ROW 60 — THE CONSEQUENCE REGISTER, RULED BY THE OWNER ON 14 SEPTEMBER 2026 AND SPLIT THE SAME DAY. Every class in
 * use present: 10 with a level on the owner's scale and all six parts, 12 halves of split classes UNCLASSIFIED and
 * unruled; every presented priority states its basis and the entries that applied, consequence first.
 * Real GREEN; every Amendment 3 limb RED, ALONE.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { reconcileRegister, consequenceFor, priorityCensus, UNCLASSIFIED, BASIS_KINDS } from "../src/audit/consequence.mjs";
import { effectiveClassesInUse, nonFindingClassesOf } from "../src/audit/class-split.mjs";
import { computeRecommendationFields } from "../src/report/recommendation-fields.mjs";
import { CONSEQUENCE_REGISTER } from "../config/consequence-register.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";
import { CLASS_SPLITS } from "../config/class-splits.mjs";
import { batchJsonlFiles } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (dir) => readdirSync(join(REPO, dir)).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(join(REPO, dir, f)).readAll());
const AUDIT = read("runs/audit");
const fieldsWith = (register, scale = SEVERITY_SCALE) =>
  computeRecommendationFields({
    recommendations: AUDIT.filter((r) => r.record_type === "draft_recommendation"),
    links: AUDIT.filter((r) => r.record_type === "recommendation_evidence"),
    records: [...AUDIT, ...read("runs/evidence"), ...batchJsonlFiles().flatMap((p) => createJsonlStore(p).readAll())],
    ledger: createJsonlStore(join(REPO, "runs", "cost", "ledger.jsonl")).readAll(),
    consequenceRegister: register,
    consequenceScale: scale,
    classSplits: CLASS_SPLITS,
    classPopulations: POPULATIONS,
  });
const clone = () => JSON.parse(JSON.stringify(CONSEQUENCE_REGISTER));
const reconcile = (register) => reconcileRegister({ records: AUDIT, register, scale: SEVERITY_SCALE, splits: CLASS_SPLITS });

// the two halves the owner left UNCLASSIFIED (14 Sep 2026): NONE is not what their records verify
// since Option A (14 Sep 2026) no finding class is left unrated
const HALVES = [];
const POPULATIONS = { "noindex-declared-deliberate": "DECISION ON RECORD", "noindex-defect-claim-withdrawn": "AUDIT TRAIL" };

/* RR-196: 14 → 11 finding classes in use — thin-content-found, near-duplicate-found and template-dominance-found (MODERATE each) retired to
 * SUPERSEDED_ENTRIES; their records are now a decision on record (review signals) and audit trail (withdrawn claims) */
test("🟢 REAL: the register holds exactly the 11 FINDING classes in use — every one ruled and attributed; no coverage gap, decision on record or audit trail among them", () => {
  const r = reconcile(CONSEQUENCE_REGISTER);
  assert.equal(r.ok, true, JSON.stringify(r));
  const notFindings = nonFindingClassesOf(CLASS_SPLITS);
  assert.deepEqual(Object.keys(CONSEQUENCE_REGISTER).sort(), effectiveClassesInUse(AUDIT, CLASS_SPLITS).filter((k) => !notFindings.has(k)));
  assert.equal(r.classesInUse.length, 11);
  assert.deepEqual(r.onCoverage, []);
  assert.deepEqual(r.unclassified, HALVES);
  const byLevel = {};
  for (const [k, e] of Object.entries(CONSEQUENCE_REGISTER)) {
    (byLevel[e.level] ??= []).push(k);
    if (e.splitFrom && e.level === UNCLASSIFIED) assert.deepEqual([e.ruledBy, e.ruledOn], [null, null], `${k} claims a ruling`);
    else if (e.splitFrom) assert.deepEqual([e.ruledFor, e.ruledBy, e.ruledOn], [k, "owner", "2026-09-14"], `${k}: a half is ruled only by a ruling that names it`);
    else assert.deepEqual([e.ruledBy, e.ruledOn], ["owner", "2026-09-14"], `${k} carries no dated owner ruling`);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(byLevel).map(([l, ks]) => [l, ks.length])), { HIGH: 4, MODERATE: 3, LOW: 4 });
});

test("🔴 the splits are REQUIRED — a reconciliation that leaves them out would reconcile against a bundle", () => {
  assert.throws(() => reconcileRegister({ records: AUDIT, register: CONSEQUENCE_REGISTER, scale: SEVERITY_SCALE }), /needs the declared class splits/);
});

test("🟢 REAL: every presented recommendation states its priority, its BASIS and its entries — consequence first, UNKNOWN never ranked", () => {
  const fields = fieldsWith(CONSEQUENCE_REGISTER);
  const pc = priorityCensus({ fields, register: CONSEQUENCE_REGISTER });
  assert.deepEqual(pc.errors, []);
  assert.equal(pc.checked, 3);
  const by = Object.fromEntries(fields.map((f) => [f.recommendation_id, f.priority]));
  assert.deepEqual([by["REC-NOINDEX-CV-GUIDE"].rank, by["REC-NOINDEX-CV-GUIDE"].basisKind], [1, "MEASURED VOLUME"]);
  assert.deepEqual([by["REC-ROBOTS-CORRIDOR"].rank, by["REC-ROBOTS-CORRIDOR"].basisKind], [2, "BOTH"]);
  // its evidence is the 134 withdrawn defect claims — counted under the half that says so
  // its evidence is the 134 withdrawn defect claims — the AUDIT TRAIL, named as not a finding
  assert.deepEqual(by["REC-NOINDEX-CV-GUIDE"].consequence.entries, [{ issue_class: "noindex-defect-claim-withdrawn", level: UNCLASSIFIED, inRegister: false, population: "AUDIT TRAIL" }]);
  assert.match(by["REC-NOINDEX-CV-GUIDE"].consequence.reason, /is AUDIT TRAIL — not a finding, so no level applies/);
  assert.deepEqual(by["REC-ROBOTS-CORRIDOR"].consequence.entries, [{ issue_class: "robots-blocks-search-crawler", level: "MODERATE", inRegister: true }]);
  const w = by["REC-ROBOTS-CORRIDOR"].consequenceWeightedRank;
  assert.deepEqual([w.state, w.rank, w.of, w.level], ["DERIVED", 1, 1, "MODERATE"]);
  assert.match(w.basis, /^declared consequence MODERATE first; 219 search impressions only as the amplifier inside MODERATE$/);
  for (const id of ["REC-NOINDEX-CV-GUIDE", "REC-AI-CRAWLER-BLOCK"]) {
    assert.equal(by[id].consequence.state, "UNKNOWN");
    assert.match(by[id].consequence.reason, /never low/);
    assert.deepEqual([by[id].consequenceWeightedRank.state, by[id].consequenceWeightedRank.route], ["UNKNOWN", "OWNER REVIEW"]);
  }
  for (const p of Object.values(by)) assert.ok(BASIS_KINDS.includes(p.basisKind));
});

test("🔴 no scale supplied → a ruled level cannot be stated, and nothing ranks", () => {
  const by = Object.fromEntries(fieldsWith(CONSEQUENCE_REGISTER, null).map((f) => [f.recommendation_id, f.priority]));
  assert.equal(by["REC-ROBOTS-CORRIDOR"].consequence.state, "UNKNOWN");
  assert.equal(by["REC-ROBOTS-CORRIDOR"].consequenceWeightedRank.state, "UNKNOWN");
});

test("🔴 RED: a level HARD-CODED in the engine — one the register does not declare — is refused, alone", () => {
  const fields = fieldsWith(CONSEQUENCE_REGISTER);
  fields[0].priority.consequence.entries = fields[0].priority.consequence.entries.map((e) => ({ ...e, level: "LOW" }));
  const pc = priorityCensus({ fields, register: CONSEQUENCE_REGISTER });
  assert.ok(pc.errors.length > 0);
  assert.deepEqual([...new Set(pc.errors.map((e) => e.limb))], ["level"], JSON.stringify(pc.errors));
});

test("🔴 RED: a register entry REMOVED — the class becomes unclassified, is NOT ranked, and the register fails to reconcile, alone", () => {
  const reg = clone();
  delete reg["robots-blocks-search-crawler"];
  const r = reconcile(reg);
  assert.deepEqual([r.missing, r.stale, r.invalid], [["robots-blocks-search-crawler"], [], []]);
  assert.equal(r.ok, false);
  assert.equal(consequenceFor(["robots-blocks-search-crawler"], reg, SEVERITY_SCALE).state, "UNKNOWN", "a class with no entry was given a consequence");
  const fields = fieldsWith(reg);
  assert.deepEqual(priorityCensus({ fields, register: reg }).errors, [], "the unclassified class was ranked or given a level");
  assert.equal(fields.find((f) => f.recommendation_id === "REC-ROBOTS-CORRIDOR").priority.consequenceWeightedRank.state, "UNKNOWN");
});

test("🔴 RED: the BASIS emptied is refused, alone", () => {
  const fields = fieldsWith(CONSEQUENCE_REGISTER);
  fields[0].priority.basisKind = "";
  assert.deepEqual(priorityCensus({ fields, register: CONSEQUENCE_REGISTER }).errors.map((e) => e.limb), ["basis"]);
});

test("🔴 RED: a STALE register entry — a class not in use, including a superseded parent put back — is refused, alone", () => {
  const reg = { ...clone(), "a-class-no-store-holds": { what: "x".repeat(20), level: UNCLASSIFIED, consequence: null, reversibility: null, blastRadius: null, why: "y".repeat(20), ruledBy: null, ruledOn: null } };
  const r = reconcile(reg);
  assert.deepEqual([r.missing, r.stale, r.invalid], [[], ["a-class-no-store-holds"], []]);
  assert.equal(r.ok, false);
  assert.deepEqual(reconcile({ ...clone(), noindex: { what: "x".repeat(20), level: UNCLASSIFIED, why: "y".repeat(20), ruledBy: null, ruledOn: null } }).stale, ["noindex"]);
});

test("🔴 RED: a level with no dated OWNER ruling is refused — neither the engine nor CC may set one", () => {
  const reg = clone();
  reg["exact-duplicate"] = { ...reg["exact-duplicate"], ruledBy: null, ruledOn: null };
  const r = reconcile(reg);
  assert.ok(r.invalid.some((x) => x.class === "exact-duplicate" && /no dated owner ruling/.test(x.why)));
  assert.equal(r.ok, false);
});

test("🔴 UNCLASSIFIED never becomes a consequence, and a claim of a consequence basis over it is refused", () => {
  assert.equal(consequenceFor(["noindex-declared-deliberate"], CONSEQUENCE_REGISTER, SEVERITY_SCALE).state, "UNKNOWN");
  const fields = fieldsWith(CONSEQUENCE_REGISTER);
  fields.find((f) => f.recommendation_id === "REC-NOINDEX-CV-GUIDE").priority.basisKind = "BOTH";
  assert.ok(priorityCensus({ fields, register: CONSEQUENCE_REGISTER }).errors.some((e) => e.limb === "unclassified-ranked"));
});

test("🔴 REAL: the committed report leads with the consequence-weighted rank, and puts measured volume UNDER it", () => {
  const html = readFileSync(`${REPO}runs/report/index.html`, "utf8");
  assert.match(html, /REC-ROBOTS-CORRIDOR[\s\S]*?consequence-weighted rank: <strong>1 of 1<\/strong> at <strong>MODERATE<\/strong>[\s\S]*?under it, measured volume \(the amplifier inside a level\): <strong>2 of 2<\/strong>[\s\S]*?basis: <strong>BOTH<\/strong>[\s\S]*?<code>robots-blocks-search-crawler<\/code> = <strong>MODERATE<\/strong>/);
  assert.match(html, /REC-NOINDEX-CV-GUIDE[\s\S]*?consequence-weighted rank: <span class="lbl lbl-UNKNOWN">UNKNOWN<\/span>[\s\S]*?routed to owner review[\s\S]*?<strong>1 of 2<\/strong>[\s\S]*?basis: <strong>MEASURED VOLUME<\/strong>[\s\S]*?<code>noindex-defect-claim-withdrawn<\/code> = <strong>AUDIT TRAIL \(not a finding\)<\/strong>/);
  assert.match(html, /REC-AI-CRAWLER-BLOCK[\s\S]*?basis: <strong>NONE<\/strong>[\s\S]*?none — no finding class is linked/);
});
