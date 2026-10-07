/**
 * 🔴 ROW 60 — THE CONSEQUENCE SHEET IS GENERATED FROM THE STORE, AND REFUSES TO DRIFT.
 * GREEN: the committed sheet, the register, the scale, the splits and the store agree — the ten ruled levels
 * attributed, the twelve halves with blank LEVEL and WHY. RED: each reconciliation limb alone.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { buildRulingSheet, reconcileSheet, renderRulingSheet } from "../src/audit/ruling-sheet.mjs";
import { classOf } from "../src/audit/class-split.mjs";
import { CONSEQUENCE_REGISTER, UNREACHABLE_RECOMMENDATIONS, SUPERSEDED_ENTRIES } from "../config/consequence-register.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";
import { CLASS_SPLITS, UNMEASURED_REASON_CODES } from "../config/class-splits.mjs";
import { COVERAGE_REGISTER } from "../config/coverage-register.mjs";
import { DECISION_REGISTER } from "../config/decision-register.mjs";
import { AUDIT_TRAIL } from "../config/audit-trail.mjs";
import { declaredObservationSources } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith(".jsonl") ? [join(dir, n)] : []));
/**
 * 🔴 THE MIGRATED RECORDS ARE STILL SOURCES OF THIS SHEET — THEY MOVED, THEY DID NOT GO.
 *
 * The sheet counts 999 crawl records and 5 sitemap records. Both sets still exist, in the external
 * observation batches, and the sheet now names each under its external canonical path rather than
 * the engine path it used to occupy. The population is runs/ PLUS every declared external source.
 *
 * This cannot hide a source silently disappearing: the enumerator REFUSES when a root or a batch
 * cannot be resolved, so an unavailable source fails this file loudly rather than shortening the
 * population.
 */
/**
 * 🔴 WHAT THE `MIGRATED_AS` MAP HERE USED TO DO, AND WHY IT IS GONE.
 *
 * It held one hand-written entry relabelling the externalised crawl file back to the engine path it
 * used to occupy, so the sheet could keep naming a path that no longer existed. It caught one real
 * thing — a record file appearing in the batch that nobody expected — via `assert.ok(file, ...)`.
 *
 * Two defects came with it. It knew about ONE batch (`batchJsonlFiles()` defaults to the crawl
 * capture), so when a second batch was declared this test simply did not look at it. And it judged
 * "expected" against a constant in a test file rather than against the manifest that travelled with
 * the bytes.
 *
 * Both are now handled in production, by the same enumerator the generator uses — so this test and
 * the generator cannot drift apart, and the property the old assertion protected is stronger: a
 * record file the manifest does not declare RAISES, for every declared batch, not just one.
 */
const FILES = [
  ...walk(join(REPO, "runs")).map((p) => ({ file: relative(REPO, p).split("\\").join("/"), records: createJsonlStore(p).readAll() })),
  ...declaredObservationSources().map((s) => ({ file: s.canonical, records: createJsonlStore(s.path).readAll() })),
].sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
const LAW = { register: CONSEQUENCE_REGISTER, unreachable: UNREACHABLE_RECOMMENDATIONS, scale: SEVERITY_SCALE };
const FRESH = buildRulingSheet({ files: FILES, ...LAW, splits: CLASS_SPLITS, superseded: SUPERSEDED_ENTRIES, coverage: COVERAGE_REGISTER, decisions: DECISION_REGISTER, auditTrail: AUDIT_TRAIL, unmeasuredCodes: UNMEASURED_REASON_CODES, generatedAt: "test" });
const COMMITTED = JSON.parse(readFileSync(join(REPO, "runs", "export", "row60-ruling-sheet.json"), "utf8"));
const MD = readFileSync(join(REPO, "runs", "export", "row60-ruling-sheet.md"), "utf8").replace(/\r\n/g, "\n");
const clone = () => JSON.parse(JSON.stringify(COMMITTED));
const limbs = (r) => [...new Set(r.errors.map((e) => e.limb))];
const reconcile = (sheet, over = {}) => reconcileSheet({ sheet, fresh: FRESH, ...LAW, superseded: SUPERSEDED_ENTRIES, coverage: COVERAGE_REGISTER, decisions: DECISION_REGISTER, auditTrail: AUDIT_TRAIL, ...over });

test("🟢 GREEN: the committed sheet, the register, the scale, the splits and the store agree", () => {
  const r = reconcile(COMMITTED);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test("🔴 every .jsonl under runs/ is read and reported — none skipped", () => {
  assert.deepEqual(COMMITTED.sources.map((s) => s.file), FILES.map((f) => f.file));
  for (const s of COMMITTED.sources) assert.equal(s.records, FILES.find((f) => f.file === s.file).records.length, s.file);
});

test("🔴 counts are the JOIN's, not each issue's first recorded state — and the units stay apart", () => {
  const by = Object.fromEntries(COMMITTED.classes.map((c) => [c.issue_class, c]));
  assert.equal(COMMITTED.classes.length, Object.keys(CONSEQUENCE_REGISTER).length);
  for (const c of COMMITTED.classes) {
    assert.equal(c.open + Object.values(c.ruled).reduce((a, b) => a + b, 0), c.distinct, `${c.issue_class}: open + ruled is not distinct`);
    assert.ok(c.raw >= c.distinct, `${c.issue_class}: fewer records than issues`);
    assert.ok(c.notRun <= c.distinct);
    assert.equal(c.notRun === c.distinct && c.distinct > 0, c.issue_class.endsWith("-check-not-run"), `${c.issue_class}: its name and its checks-not-run disagree`);
  }
  const firstStateOpen = (k) => FILES.flatMap((f) => f.records).filter((r) => r.record_type === "issue" && classOf(r, CLASS_SPLITS).class === k && (r.state ?? "OPEN") === "OPEN");
  const naiveOpen = (k) => new Set(firstStateOpen(k).map((r) => r.issue_id)).size;
  const differs = COMMITTED.classes.filter((c) => naiveOpen(c.issue_class) !== c.open).map((c) => c.issue_class);
  // the withdrawn claims are the audit trail's since Option A; instrument-disagreement is the finding a state change moves
  assert.deepEqual(differs.sort(), ["instrument-disagreement"], "the join is untested unless a state change moves a class");
  for (const k of differs) assert.ok(Object.keys(by[k].ruled).length > 0, `${k} differs from its first-state count but carries no ruling`);
});

/* RR-196: 14 → 11 ruled levels — thin-content-found, near-duplicate-found and template-dominance-found are RETIRED (SUPERSEDED_ENTRIES), their
 * records now a DECISION ON RECORD (the 125 version-2 review signals, PG-A1) and AUDIT TRAIL (the 125 withdrawn version-1 FAILs). Populations
 * 541 / 1224 / 134 / 134 = 2033 → 416 / 1224 / 259 / 259 = 2158: the 125 replacements are new distinct issues; nothing else moved. */
test("🔴 the sheet SETS nothing: the 11 ruled levels copied and attributed, and every other population apart — coverage, decisions on record, audit trail", () => {
  for (const c of COMMITTED.classes) {
    const e = CONSEQUENCE_REGISTER[c.issue_class];
    assert.deepEqual([c.level, c.ruledBy, c.ruledOn, c.splitFrom], [e.level, e.ruledBy, e.ruledOn, e.splitFrom ?? null], c.issue_class);
    assert.ok(!("severity" in c), `${c.issue_class} carries a severity`);
  }
  const halves = COMMITTED.classes.filter((c) => c.splitFrom && c.level === "UNCLASSIFIED");
  assert.equal(halves.length, 0);
  for (const h of halves) {
    const row = MD.split("\n").find((l) => l.startsWith("| ") && l.includes(`| \`${h.issue_class}\` | \`${h.splitFrom}\` |`));
    assert.ok(row, `${h.issue_class} has no row in the owner's ruling table`);
    assert.match(row, /\| \| \|$/, `${h.issue_class}'s LEVEL and WHY are not blank`);
  }
  assert.match(MD, /## Part B — the 11 levels already ruled \(unchanged, attributed\)/);
  assert.match(MD, /## Part B1 — the 0 finding classes for the owner to rule: LEVEL and WHY are blank/);
  // 🔴 Option A: the decisions on record and the audit trail, each apart, and the four totals summing to the store
  assert.deepEqual(COMMITTED.decisions.map((d) => [d.issue_class, d.count, d.open, d.awaits, d.signals.length]), [
    ["near-duplicate-review-signal", 5, 5, "PG-A1", 5], ["noindex-declared-deliberate", 134, 134, "REC-NOINDEX-CV-GUIDE", 0],
    ["template-dominance-review-signal", 2, 2, "PG-A1", 2], ["thin-content-review-signal", 118, 118, "PG-A1", 118],
  ]);
  assert.deepEqual(COMMITTED.auditTrail.map((a) => [a.issue_class, a.count, a.states]), [
    ["near-duplicate-claim-withdrawn", 5, { SUPERSEDED: 5 }], ["noindex-defect-claim-withdrawn", 134, { SUPERSEDED: 134 }],
    ["template-dominance-claim-withdrawn", 2, { SUPERSEDED: 2 }], ["thin-content-claim-withdrawn", 118, { SUPERSEDED: 118 }],
  ]);
  assert.deepEqual(COMMITTED.populations, { FINDINGS: 416, "COVERAGE GAP": 1224, "DECISION ON RECORD": 259, "AUDIT TRAIL": 259, distinct: 2158 });
  // RR-196: every review-signal page stays visible on the owner's sheet, with its measured value
  for (const d of COMMITTED.decisions.filter((x) => x.signals.length)) for (const s of d.signals) assert.ok(MD.includes(`| \`${s.target_page_id}\` | ${s.signal} | ${s.value} | ${s.bound} | ${s.state} |`), `${d.issue_class}: ${s.issue_id} is not on the sheet`);
  assert.match(MD, /## Part E — DECISIONS ON RECORD/);
  assert.match(MD, /## Part F — THE AUDIT TRAIL/);
  assert.equal((MD.match(/\| owner 2026-09-14 \|/g) ?? []).length, 11);
  // 🔴 the coverage population: its own part, its own total, no level, and not one of its classes among the findings
  assert.match(MD, /## Part D — THE COVERAGE POPULATION: checks that never ran\. Not findings, never a level, never ranked/);
  assert.deepEqual(COMMITTED.coverage.map((c) => [c.issue_class, c.count]), Object.entries(COVERAGE_REGISTER).map(([k, e]) => [k, e.count]).sort());
  assert.equal(COMMITTED.coverage.reduce((n, c) => n + c.count, 0), 1224);
  for (const c of COMMITTED.coverage) assert.ok(!("level" in c) && !COMMITTED.classes.some((x) => x.issue_class === c.issue_class), c.issue_class);
  assert.ok(![...COMMITTED.order.ranked, ...COMMITTED.order.unranked].some((r) => COVERAGE_REGISTER[r.id]), "a coverage class is in the findings order");
  assert.deepEqual(COMMITTED.scale.map((s) => s.level), ["CRITICAL", "HIGH", "MODERATE", "LOW", "NONE"]);
  assert.deepEqual(COMMITTED.supersededClasses.map((s) => s.issue_class), Object.keys(SUPERSEDED_ENTRIES).sort());
  assert.deepEqual(COMMITTED.unreachableByAnyEntry.map((u) => [u.recommendation_id, u.level]), [["REC-AI-CRAWLER-BLOCK", "UNCLASSIFIED"]]);
  assert.equal(COMMITTED.order.unranked.length, 0);
});

test("🔴 the Markdown is the JSON rendered — the two cannot say different things", () => {
  assert.equal(MD, renderRulingSheet(COMMITTED));
});

test("🔴 RED: a class in the store MISSING from the sheet is refused — alone", () => {
  const s = clone();
  s.classes = s.classes.filter((c) => c.issue_class !== "canonical");
  assert.deepEqual(limbs(reconcile(s)), ["missing-class"]);
});

test("🔴 RED: a COUNT that disagrees with the store is refused — alone", () => {
  const s = clone();
  s.classes.find((x) => x.issue_class === "exact-duplicate").open = 0;
  assert.deepEqual(limbs(reconcile(s)), ["count"]);
});

test("🔴 RED: a class in the REGISTER that is not in use is refused — alone", () => {
  const reg = { ...CONSEQUENCE_REGISTER, "a-class-no-store-holds": { what: "x", level: "UNCLASSIFIED", why: "y", ruledBy: null, ruledOn: null } };
  assert.deepEqual(limbs(reconcile(COMMITTED, { register: reg })), ["stale-register"]);
});

test("🔴 RED: a level on the sheet that the register does not declare is refused — alone", () => {
  const s = clone();
  s.classes.find((c) => c.issue_class === "canonical").level = "HIGH";
  assert.deepEqual(limbs(reconcile(s)), ["register-text"]);
});

test("🔴 RED: an ORDER on the sheet that the store and register do not produce is refused — alone", () => {
  const s = clone();
  [s.order.ranked[0], s.order.ranked[4]] = [s.order.ranked[4], s.order.ranked[0]];
  assert.deepEqual(limbs(reconcile(s)), ["order"]);
});

test("🔴 RED: a DECISION ON RECORD on the sheet that disagrees with the store — or four totals that do not sum — is refused, alone", () => {
  const s = clone();
  s.decisions[0].open = 0;
  assert.deepEqual(limbs(reconcile(s)), ["populations"]);
  const t = clone();
  t.populations["AUDIT TRAIL"] = 0;
  assert.deepEqual(limbs(reconcile(t)), ["populations"]);
});

test("🔴 RED: a COVERAGE count on the sheet that disagrees with the store is refused — alone", () => {
  const s = clone();
  s.coverage.find((c) => c.issue_class === "orphan-within-crawled-set-check-not-run").count = 0;
  assert.deepEqual(limbs(reconcile(s)), ["coverage"]);
});

test("🔴 RED: a scale on the sheet that is not the owner's is refused — alone", () => {
  const s = clone();
  s.scale.push({ level: "UNCLASSIFIED", definition: "a state dressed as a level" });
  assert.deepEqual(limbs(reconcile(s)), ["scale"]);
});
