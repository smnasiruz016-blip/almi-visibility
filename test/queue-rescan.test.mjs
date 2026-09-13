/**
 * 🔴 THE QUEUE RE-SCAN OF 13 SEPTEMBER 2026 — EVERY VERDICT PINNED TO ITS EVIDENCE.
 *
 * TESTABLE-NOW read 0, computed before a cost ledger, six deduplicating writers,
 * a replay harness and a committed body archive existed. Every non-deferred row
 * was asked one question — DOES ITS INPUT NOW EXIST? — and every row whose test
 * needed nothing new was run. These tests hold each answer to the data it came
 * from, so a verdict cannot outlive the fact behind it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { canonicalUrl } from "../src/evidence/ids.mjs";
import { detectCannibalization } from "../src/audit/content-checks.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { classify } from "../src/checklist/classification.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const CONTENT_RUN = readFileSync(`${REPO}runs/audit/item-12-38-content-run-2026-09-13.txt`, "utf8");
const TECHNICAL_RUN = readFileSync(`${REPO}runs/audit/item-12-38-technical-run-2026-09-13.txt`, "utf8");
const tallyOf = (text, id) => {
  const m = new RegExp(`^\\s*${id}\\s+FAIL=\\s*(\\d+)\\s+UNKNOWN=\\s*(\\d+)\\s+silent=\\s*(\\d+)`, "m").exec(text);
  assert.ok(m, `no tally for ${id} in the recorded run`);
  return { FAIL: Number(m[1]), UNKNOWN: Number(m[2]), silent: Number(m[3]) };
};

/* ---- 12 · VERIFIED-PASS ------------------------------------------------- */

test("🔴 ITEM 12: the run read the COMMITTED archive, and each of the four classifications accounts for all 394 pages", () => {
  assert.match(CONTENT_RUN, /^corpus: .*bodies-2026-09-12\.jsonl\.br \(committed archive\)/m);
  assert.match(CONTENT_RUN, /^SHELL = /m, "the shell definition is not printed beside the result");
  const expected = { "exact-duplicate": [0, 0, 394], "thin-content": [118, 2, 274], "near-duplicate": [5, 2, 387], "template-dominance": [2, 2, 390] };
  for (const [id, [f, u, s]] of Object.entries(expected)) {
    const t = tallyOf(CONTENT_RUN, id);
    assert.deepEqual([t.FAIL, t.UNKNOWN, t.silent], [f, u, s], id);
    assert.equal(t.FAIL + t.UNKNOWN + t.silent, 394, `${id} did not classify every page`);
  }
  assert.match(CONTENT_RUN, /No recommendation was emitted by any check/);
  assert.match(CONTENT_RUN, /^exit=0$/m);
});

/* ---- 38 · VERIFIED-PASS ------------------------------------------------- */

test("🔴 ITEM 38: a preflight state for all 394 pages over the committed archive, with INDEXABLE ≠ INDEXED printed", () => {
  assert.match(TECHNICAL_RUN, /^corpus {2}: .*bodies-2026-09-12\.jsonl\.br \(committed archive\)/m);
  assert.match(TECHNICAL_RUN, /INDEXABLE ≠ INDEXED/);
  const t = tallyOf(TECHNICAL_RUN, "indexability-preflight");
  assert.deepEqual(t, { FAIL: 158, UNKNOWN: 210, silent: 26 }, "BLOCKED / UNKNOWN / ELIGIBLE");
  assert.equal(t.FAIL + t.UNKNOWN + t.silent, 394);
  assert.match(TECHNICAL_RUN, /^exit=0$/m);
});

/* ---- 13 · TESTABLE-NOW, run: detection right, reporting absent ----------- */

test("🔴 ITEM 13: over the real query×page pulls — 337 queries searched, 21 overlaps, 0 that are one canonical page", () => {
  const pulls = createJsonlStore(`${REPO}runs/evidence/evidence.jsonl`).readAll().filter((r) => r.method === "gsc.searchAnalytics.query:query-page");
  assert.equal(pulls.length, 3);
  for (const p of pulls) assert.equal(p.value.dataState, "COMPLETE");
  const rows = pulls.flatMap((p) => p.value.rows);
  const overlaps = detectCannibalization(rows);
  assert.equal(new Set(rows.map((r) => r.query)).size, 337);
  assert.equal(overlaps.length, 21);
  const falseOverlaps = overlaps.filter((o) => new Set(o.urls.map((u) => canonicalUrl(u))).size < 2);
  assert.deepEqual(falseOverlaps, [], "a single-page query was reported as an overlap");
});

test("🔴 ITEM 13 does not tick: the runner prints a COUNT — no query, no competing URLs, no positions, no number searched", () => {
  assert.match(CONTENT_RUN, /21 queries on >1 URL/);
  assert.doesNotMatch(CONTENT_RUN, /queries searched/i, "the runner now states queries searched — re-sit item 13");
  assert.equal(classify()[13].state, "TESTABLE-NOW");
});

/* ---- 26 · TESTABLE-NOW, run: two counts for one thing -------------------- */

test("🔴 ITEM 26 does not tick: the two runners count zero-inbound pages over the SAME bodies and disagree", () => {
  const content = tallyOf(CONTENT_RUN, "orphan-within-crawled-set");
  const technical = Number(/pages with zero inbound links inside the crawled set: (\d+)/.exec(TECHNICAL_RUN)?.[1]);
  assert.equal(content.FAIL, 0, "an orphan was reported as a FAIL — 'could not see' recorded as 'not there'");
  assert.equal(content.UNKNOWN, 340);
  assert.equal(technical, 341);
  assert.notEqual(content.UNKNOWN, technical, "the counts now agree — re-sit item 26");
  assert.equal(classify()[26].state, "TESTABLE-NOW");
});

/* ---- 50 · FAILED -------------------------------------------------------- */

test("🔴 ITEM 50 FAILED: the UNKNOWN→PASS guard (F23) governs only fact supersessions, and 0 real facts carry one", async () => {
  const { records } = await loadRegistry(`${REPO}products/almi-oet/facts`, "almi-oet");
  assert.equal(records.length, 46);
  assert.equal(records.filter((r) => r.life?.supersedes).length, 0, "a real supersession now exists — re-sit item 50");
  assert.match(readFileSync(`${REPO}src/facts/validate.mjs`, "utf8"), /next\?\.life\?\.supersedes/, "the guard no longer reads life.supersedes — the premise moved");
  assert.equal(classify()[50].state, "FAILED");
  assert.match(classify()[50].failureMet, /polices an empty population/);
});

/* ---- 51 · FAILED -------------------------------------------------------- */

test("🔴 ITEM 51 FAILED: every real recommendation lacks priority, confidence and cost, and the report renders none of them", () => {
  const drafts = createJsonlStore(`${REPO}runs/audit/recommendations.jsonl`).readAll().filter((r) => r.record_type === "draft_recommendation");
  assert.equal(drafts.length, 3);
  for (const d of drafts) {
    for (const field of ["priority", "confidence", "cost"]) assert.equal(d[field], undefined, `${d.recommendation_id} now carries ${field} — re-sit item 51`);
    assert.ok(d.status && d.finding, "status and reason are present");
  }
  assert.doesNotMatch(readFileSync(`${REPO}src/report/view.mjs`, "utf8"), /draft_recommendation|recommendation_id/);
  assert.equal(classify()[51].state, "FAILED");
});

/* ---- 1 and 54 · the learning record ------------------------------------- */

test("🔴 ITEMS 1 AND 54: NO learning record exists — and no cost entry names a product, so the cost half is not product-private either", () => {
  const tracked = execFileSync("git", ["ls-files", "src", "bin", "runs"], { cwd: REPO, encoding: "utf8" }).split("\n");
  assert.deepEqual(tracked.filter((f) => /learning/i.test(f)), [], "a learning module or record now exists — re-scan items 1 and 54");
  const entries = createJsonlStore(`${REPO}runs/cost/ledger.jsonl`).readAll();
  assert.ok(entries.length > 0);
  assert.equal(entries.filter((e) => e.product_id || e.productId || e.product).length, 0);
  for (const id of [1, 54]) assert.equal(classify()[id].state, "BLOCKED-UNKNOWN");
});

/* ---- the queue itself ---------------------------------------------------- */

test("🔴 every TESTABLE-NOW row names ONE runnable test, and TESTABLE-NOW is exactly 13, 25, 26, 55", () => {
  const rows = Object.values(classify()).filter((r) => r.state === "TESTABLE-NOW");
  assert.deepEqual(rows.map((r) => r.id), [13, 25, 26, 55]);
  for (const r of rows) assert.ok(typeof r.test === "string" && r.test.length > 40, `item ${r.id} names no specific test`);
});
