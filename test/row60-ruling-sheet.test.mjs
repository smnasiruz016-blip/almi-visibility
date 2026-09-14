/**
 * 🔴 ROW 60 — THE OWNER RULING SHEET IS GENERATED FROM THE STORE, AND REFUSES TO DRIFT.
 * GREEN: the committed sheet, the register and the store agree. RED: each reconciliation limb alone.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { buildRulingSheet, reconcileSheet, renderRulingSheet } from "../src/audit/ruling-sheet.mjs";
import { CONSEQUENCE_REGISTER } from "../config/consequence-register.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const walk = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : n.endsWith(".jsonl") ? [join(dir, n)] : []));
const FILES = walk(join(REPO, "runs")).sort().map((p) => ({ file: relative(REPO, p).split("\\").join("/"), records: createJsonlStore(p).readAll() }));
const FRESH = buildRulingSheet({ files: FILES, register: CONSEQUENCE_REGISTER, generatedAt: "test" });
const COMMITTED = JSON.parse(readFileSync(join(REPO, "runs", "export", "row60-ruling-sheet.json"), "utf8"));
const clone = () => JSON.parse(JSON.stringify(COMMITTED));
const limbs = (r) => [...new Set(r.errors.map((e) => e.limb))];

test("🟢 GREEN: the committed sheet, the register and the store agree", () => {
  const r = reconcileSheet({ sheet: COMMITTED, fresh: FRESH, register: CONSEQUENCE_REGISTER });
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
  // The store says so — not this test: every issue whose record reads OPEN but which a state change moved.
  const firstStateOpen = (k) => FILES.flatMap((f) => f.records).filter((r) => r.record_type === "issue" && r.issue_class === k && (r.state ?? "OPEN") === "OPEN");
  const naiveOpen = (k) => new Set(firstStateOpen(k).map((r) => r.issue_id)).size;
  const differs = COMMITTED.classes.filter((c) => naiveOpen(c.issue_class) !== c.open).map((c) => c.issue_class);
  assert.ok(differs.length > 0, "no class is moved by a state change — the join would be untested");
  for (const k of differs) assert.ok(Object.keys(by[k].ruled).length > 0, `${k} differs from its first-state count but carries no ruling`);
});

test("🔴 the sheet proposes nothing: every current level UNCLASSIFIED, every LEVEL and WHY blank, classes ordered by name, no severity", () => {
  assert.deepEqual(COMMITTED.classes.map((c) => c.issue_class), [...COMMITTED.classes.map((c) => c.issue_class)].sort());
  for (const c of COMMITTED.classes) {
    assert.deepEqual([c.currentLevel, c.level, c.why], ["UNCLASSIFIED", "", ""], c.issue_class);
    assert.ok(!("severity" in c), `${c.issue_class} carries a severity`);
  }
  // The class rows are where leaning wording would hide. Part A's own fixed question (A4 quotes the law "never as
  // low") is not a proposal, so the check reads the class table, not the whole page.
  const md = readFileSync(join(REPO, "runs", "export", "row60-ruling-sheet.md"), "utf8").replace(/\r\n/g, "\n");
  const rows = md.split("\n").filter((l) => /^\| \d+ \| `/.test(l));
  assert.equal(rows.length, COMMITTED.classes.length, "the class table does not hold one row per class");
  for (const row of rows) assert.doesNotMatch(row, /\b(critical|high|medium|low|severe|harm|harmful|serious|minor|urgent)\b/i, `a class row leans toward a level: ${row}`);
});

test("🔴 the Markdown is the JSON rendered — the two cannot say different things", () => {
  assert.equal(readFileSync(join(REPO, "runs", "export", "row60-ruling-sheet.md"), "utf8").replace(/\r\n/g, "\n"), renderRulingSheet(COMMITTED));
});

test("🔴 RED: a class in the store MISSING from the sheet is refused — alone", () => {
  const s = clone();
  s.classes = s.classes.filter((c) => c.issue_class !== "canonical");
  assert.deepEqual(limbs(reconcileSheet({ sheet: s, fresh: FRESH, register: CONSEQUENCE_REGISTER })), ["missing-class"]);
});

test("🔴 RED: a COUNT that disagrees with the store is refused — alone", () => {
  const s = clone();
  const c = s.classes.find((x) => x.issue_class === "noindex");
  c.open = c.distinct;
  assert.deepEqual(limbs(reconcileSheet({ sheet: s, fresh: FRESH, register: CONSEQUENCE_REGISTER })), ["count"]);
});

test("🔴 RED: a class in the REGISTER that is not in use is refused — alone", () => {
  const reg = { ...CONSEQUENCE_REGISTER, "a-class-no-store-holds": { what: "x", level: "UNCLASSIFIED", why: "y", ruledBy: null, ruledOn: null } };
  assert.deepEqual(limbs(reconcileSheet({ sheet: COMMITTED, fresh: FRESH, register: reg })), ["stale-register"]);
});

test("🔴 RED: a level written onto the generated sheet is refused", () => {
  const s = clone();
  s.classes[0].level = "anything";
  assert.deepEqual(limbs(reconcileSheet({ sheet: s, fresh: FRESH, register: CONSEQUENCE_REGISTER })), ["register-text"]);
});
