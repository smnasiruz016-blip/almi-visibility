/**
 * 🔴 ROW 60 — THE CONSEQUENCE SHEET IS GENERATED FROM THE STORE, AND REFUSES TO DRIFT.
 * GREEN: the committed sheet, the register, the scale and the store agree. RED: each reconciliation limb alone.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { buildRulingSheet, reconcileSheet, renderRulingSheet } from "../src/audit/ruling-sheet.mjs";
import { CONSEQUENCE_REGISTER, UNREACHABLE_RECOMMENDATIONS } from "../config/consequence-register.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith(".jsonl") ? [join(dir, n)] : []));
const FILES = walk(join(REPO, "runs")).sort().map((p) => ({ file: relative(REPO, p).split("\\").join("/"), records: createJsonlStore(p).readAll() }));
const LAW = { register: CONSEQUENCE_REGISTER, unreachable: UNREACHABLE_RECOMMENDATIONS, scale: SEVERITY_SCALE };
const FRESH = buildRulingSheet({ files: FILES, ...LAW, generatedAt: "test" });
const COMMITTED = JSON.parse(readFileSync(join(REPO, "runs", "export", "row60-ruling-sheet.json"), "utf8"));
const clone = () => JSON.parse(JSON.stringify(COMMITTED));
const limbs = (r) => [...new Set(r.errors.map((e) => e.limb))];
const reconcile = (sheet, over = {}) => reconcileSheet({ sheet, fresh: FRESH, ...LAW, ...over });

test("🟢 GREEN: the committed sheet, the register, the scale and the store agree", () => {
  const r = reconcile(COMMITTED);
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});

test("🔴 every .jsonl under runs/ is read and reported — none skipped", () => {
  assert.deepEqual(COMMITTED.sources.map((s) => s.file), FILES.map((f) => f.file));
  for (const s of COMMITTED.sources) assert.equal(s.records, FILES.find((f) => f.file === s.file).records.length, s.file);
});

test("🔴 counts are the JOIN's, not each issue's first recorded state — and the three units stay apart", () => {
  const by = Object.fromEntries(COMMITTED.classes.map((c) => [c.issue_class, c]));
  assert.equal(COMMITTED.classes.length, Object.keys(CONSEQUENCE_REGISTER).length);
  for (const c of COMMITTED.classes) {
    assert.equal(c.open + Object.values(c.ruled).reduce((a, b) => a + b, 0), c.distinct, `${c.issue_class}: open + ruled is not distinct`);
    assert.ok(c.raw >= c.distinct, `${c.issue_class}: fewer records than issues`);
  }
  const firstStateOpen = (k) => FILES.flatMap((f) => f.records).filter((r) => r.record_type === "issue" && r.issue_class === k && (r.state ?? "OPEN") === "OPEN");
  const naiveOpen = (k) => new Set(firstStateOpen(k).map((r) => r.issue_id)).size;
  const differs = COMMITTED.classes.filter((c) => naiveOpen(c.issue_class) !== c.open).map((c) => c.issue_class);
  assert.ok(differs.length > 0, "no class is moved by a state change — the join would be untested");
  for (const k of differs) assert.ok(Object.keys(by[k].ruled).length > 0, `${k} differs from its first-state count but carries no ruling`);
});

test("🔴 the sheet SETS nothing: every level, escalation and Part C gap is the register's, the scale is the owner's, no severity shown", () => {
  for (const c of COMMITTED.classes) {
    assert.equal(c.level, CONSEQUENCE_REGISTER[c.issue_class].level, c.issue_class);
    assert.ok(!("severity" in c), `${c.issue_class} carries a severity`);
  }
  assert.deepEqual(COMMITTED.classes.map((c) => c.issue_class), [...COMMITTED.classes.map((c) => c.issue_class)].sort());
  assert.deepEqual(COMMITTED.scale.map((s) => s.level), ["CRITICAL", "HIGH", "MODERATE", "LOW", "NONE"]);
  assert.deepEqual(COMMITTED.unreachableByAnyEntry.map((u) => [u.recommendation_id, u.level]), [["REC-AI-CRAWLER-BLOCK", "UNCLASSIFIED"]]);
  assert.deepEqual(COMMITTED.order.unranked.map((u) => u.id), ["indexability-preflight", "noindex", "sitemap-advertises-blocked-url"]);
});

test("🔴 the Markdown is the JSON rendered — the two cannot say different things", () => {
  assert.equal(readFileSync(join(REPO, "runs", "export", "row60-ruling-sheet.md"), "utf8").replace(/\r\n/g, "\n"), renderRulingSheet(COMMITTED));
});

test("🔴 RED: a class in the store MISSING from the sheet is refused — alone", () => {
  const s = clone();
  s.classes = s.classes.filter((c) => c.issue_class !== "canonical");
  assert.deepEqual(limbs(reconcile(s)), ["missing-class"]);
});

test("🔴 RED: a COUNT that disagrees with the store is refused — alone", () => {
  const s = clone();
  const c = s.classes.find((x) => x.issue_class === "noindex");
  c.open = c.distinct;
  assert.deepEqual(limbs(reconcile(s)), ["count"]);
});

test("🔴 RED: a class in the REGISTER that is not in use is refused — alone", () => {
  const reg = { ...CONSEQUENCE_REGISTER, "a-class-no-store-holds": { what: "x", level: "UNCLASSIFIED", why: "y", ruledBy: null, ruledOn: null } };
  assert.deepEqual(limbs(reconcile(COMMITTED, { register: reg })), ["stale-register"]);
});

test("🔴 RED: a level on the sheet that the register does not declare is refused — alone", () => {
  const s = clone();
  s.classes.find((c) => c.issue_class === "noindex").level = "LOW";
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
