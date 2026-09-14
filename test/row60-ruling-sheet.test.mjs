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

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith(".jsonl") ? [join(dir, n)] : []));
const FILES = walk(join(REPO, "runs")).sort().map((p) => ({ file: relative(REPO, p).split("\\").join("/"), records: createJsonlStore(p).readAll() }));
const LAW = { register: CONSEQUENCE_REGISTER, unreachable: UNREACHABLE_RECOMMENDATIONS, scale: SEVERITY_SCALE };
const FRESH = buildRulingSheet({ files: FILES, ...LAW, splits: CLASS_SPLITS, superseded: SUPERSEDED_ENTRIES, unmeasuredCodes: UNMEASURED_REASON_CODES, generatedAt: "test" });
const COMMITTED = JSON.parse(readFileSync(join(REPO, "runs", "export", "row60-ruling-sheet.json"), "utf8"));
const MD = readFileSync(join(REPO, "runs", "export", "row60-ruling-sheet.md"), "utf8").replace(/\r\n/g, "\n");
const clone = () => JSON.parse(JSON.stringify(COMMITTED));
const limbs = (r) => [...new Set(r.errors.map((e) => e.limb))];
const reconcile = (sheet, over = {}) => reconcileSheet({ sheet, fresh: FRESH, ...LAW, superseded: SUPERSEDED_ENTRIES, ...over });

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
  assert.deepEqual(differs.sort(), ["instrument-disagreement", "noindex-defect-claim-withdrawn"], "the join is untested unless a state change moves a class");
  for (const k of differs) assert.ok(Object.keys(by[k].ruled).length > 0, `${k} differs from its first-state count but carries no ruling`);
});

test("🔴 the sheet SETS nothing: the ten ruled levels copied and attributed, the twelve halves with LEVEL and WHY blank", () => {
  for (const c of COMMITTED.classes) {
    const e = CONSEQUENCE_REGISTER[c.issue_class];
    assert.deepEqual([c.level, c.ruledBy, c.ruledOn, c.splitFrom], [e.level, e.ruledBy, e.ruledOn, e.splitFrom ?? null], c.issue_class);
    assert.ok(!("severity" in c), `${c.issue_class} carries a severity`);
  }
  const halves = COMMITTED.classes.filter((c) => c.splitFrom);
  assert.equal(halves.length, 12);
  for (const h of halves) {
    const row = MD.split("\n").find((l) => l.startsWith("| ") && l.includes(`| \`${h.issue_class}\` | \`${h.splitFrom}\` |`));
    assert.ok(row, `${h.issue_class} has no row in the owner's ruling table`);
    assert.match(row, /\| \| \|$/, `${h.issue_class}'s LEVEL and WHY are not blank`);
  }
  assert.match(MD, /## Part B — the 10 levels already ruled \(unchanged, attributed\)/);
  assert.match(MD, /## Part B1 — the 12 classes for the owner to rule: LEVEL and WHY are blank/);
  assert.equal((MD.match(/\| owner 2026-09-14 \|/g) ?? []).length, 10);
  assert.deepEqual(COMMITTED.scale.map((s) => s.level), ["CRITICAL", "HIGH", "MODERATE", "LOW", "NONE"]);
  assert.deepEqual(COMMITTED.supersededClasses.map((s) => s.issue_class), Object.keys(SUPERSEDED_ENTRIES).sort());
  assert.deepEqual(COMMITTED.unreachableByAnyEntry.map((u) => [u.recommendation_id, u.level]), [["REC-AI-CRAWLER-BLOCK", "UNCLASSIFIED"]]);
  assert.equal(COMMITTED.order.unranked.length, 12);
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
  s.classes.find((x) => x.issue_class === "orphan-within-crawled-set-check-not-run").notRun = 0;
  assert.deepEqual(limbs(reconcile(s)), ["count"]);
});

test("🔴 RED: a class in the REGISTER that is not in use is refused — alone", () => {
  const reg = { ...CONSEQUENCE_REGISTER, "a-class-no-store-holds": { what: "x", level: "UNCLASSIFIED", why: "y", ruledBy: null, ruledOn: null } };
  assert.deepEqual(limbs(reconcile(COMMITTED, { register: reg })), ["stale-register"]);
});

test("🔴 RED: a level on the sheet that the register does not declare is refused — alone", () => {
  const s = clone();
  s.classes.find((c) => c.issue_class === "noindex-declared-deliberate").level = "LOW";
  assert.deepEqual(limbs(reconcile(s)), ["register-text"]);
});

test("🔴 RED: an ORDER on the sheet that the store and register do not produce is refused — alone", () => {
  const s = clone();
  [s.order.ranked[0], s.order.ranked[4]] = [s.order.ranked[4], s.order.ranked[0]];
  assert.deepEqual(limbs(reconcile(s)), ["order"]);
});

test("🔴 RED: a scale on the sheet that is not the owner's is refused — alone", () => {
  const s = clone();
  s.scale.push({ level: "UNCLASSIFIED", definition: "a state dressed as a level" });
  assert.deepEqual(limbs(reconcile(s)), ["scale"]);
});
