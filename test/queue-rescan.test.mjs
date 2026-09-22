/**
 * 🔴 THE QUEUE — EVERY VERDICT PINNED TO ITS EVIDENCE.
 *
 * Re-scanned 13 September 2026 (every non-deferred row asked: does its input
 * now exist?), then run the same night: 13, 26 and 55 ticked, 25 was attempted
 * and fell short with its gap named. These tests hold each answer to the data it
 * came from, so a verdict cannot outlive the fact behind it.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { canonicalUrl } from "../src/evidence/ids.mjs";
import { detectCannibalization } from "../src/audit/content-checks.mjs";
import { loadRegistry, primaryFacts, derivedFacts } from "../src/facts/registry.mjs";
import { judgeLeavingUnknown } from "../src/evidence/verdict.mjs";
import { classify, assertLawful } from "../src/checklist/classification.mjs";
import { lifecycleOf } from "../src/evidence/lifecycle.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const read = (p) => readFileSync(`${REPO}${p}`, "utf8");
const CONTENT_RUN = read("runs/audit/item-12-38-content-run-2026-09-13.txt");
const TECHNICAL_RUN = read("runs/audit/item-12-38-technical-run-2026-09-13.txt");
const CONTENT_RUN_2 = read("runs/audit/item-13-26-content-run-2026-09-13.txt");
const TECHNICAL_RUN_2 = read("runs/audit/item-26-technical-run-2026-09-13.txt");
const PAGE_QUALITY = read("runs/audit/item-25-page-quality-run-2026-09-13.txt");
const tallyOf = (text, id) => {
  const m = new RegExp(`^\\s*${id}\\s+FAIL=\\s*(\\d+)\\s+UNKNOWN=\\s*(\\d+)\\s+silent=\\s*(\\d+)`, "m").exec(text);
  assert.ok(m, `no tally for ${id} in the recorded run`);
  return { FAIL: Number(m[1]), UNKNOWN: Number(m[2]), silent: Number(m[3]) };
};

/* ---- 12 and 38 · VERIFIED-PASS (re-scan) -------------------------------- */

test("🔴 ITEM 12: the run read the COMMITTED archive, and each of the four classifications accounts for all 394 pages", () => {
  assert.match(CONTENT_RUN, /^corpus: .*bodies-2026-09-12\.jsonl\.br \(committed archive\)/m);
  assert.match(CONTENT_RUN, /^SHELL = /m);
  const expected = { "exact-duplicate": [0, 0, 394], "thin-content": [118, 2, 274], "near-duplicate": [5, 2, 387], "template-dominance": [2, 2, 390] };
  for (const [id, [f, u, s]] of Object.entries(expected)) {
    for (const run of [CONTENT_RUN, CONTENT_RUN_2]) assert.deepEqual(Object.values(tallyOf(run, id)), [f, u, s], id);
  }
  assert.match(CONTENT_RUN, /No recommendation was emitted by any check/);
});

test("🔴 ITEM 38: a preflight state for all 394 pages, with INDEXABLE ≠ INDEXED printed — unchanged by the item 26 re-run", () => {
  for (const run of [TECHNICAL_RUN, TECHNICAL_RUN_2]) {
    assert.match(run, /INDEXABLE ≠ INDEXED/);
    assert.deepEqual(tallyOf(run, "indexability-preflight"), { FAIL: 158, UNKNOWN: 210, silent: 26 });
  }
});

/* ---- 13 · VERIFIED-PASS ------------------------------------------------- */

test("🔴 ITEM 13: the recorded run REPORTS every overlap with its query, competing URLs and positions, beside the number searched", () => {
  assert.match(CONTENT_RUN_2, /\[bound: 337 queries searched · 574 query×page rows · pull c97334fdd102df8e/);
  assert.match(CONTENT_RUN_2, /21 of 337 queries drew impressions on more than one URL/);
  assert.equal((CONTENT_RUN_2.match(/^\s+query: "/gm) ?? []).length, 21, "not every overlap names its query");
  const positions = CONTENT_RUN_2.match(/^\s+position [\d.—]+ · \d+ impression\(s\) · https:\/\//gm) ?? [];
  const pull = createJsonlStore(`${REPO}runs/evidence/evidence.jsonl`).readAll().find((r) => r.observation_id === "c97334fdd102df8e");
  const found = detectCannibalization(pull.value.rows);
  assert.equal(found.length, 21);
  assert.equal(positions.length, found.reduce((n, f) => n + f.positions.length, 0), "a competing URL was reported without its position");
  assert.deepEqual(found.filter((f) => new Set(f.urls.map((u) => canonicalUrl(u))).size < 2), [], "a single-page query was reported as an overlap");
  for (const w of ["opportunity", "should create", "worth creating", "demand", "underserved", "gap to fill"]) {
    assert.ok(!CONTENT_RUN_2.toLowerCase().includes(w), `the overlap report said "${w}"`);
  }
  assert.equal(classify()[13].state, "VERIFIED-PASS");
});

/* ---- 26 · VERIFIED-PASS ------------------------------------------------- */

test("🔴 ITEM 26: both runners, re-run over the stored graph, print the SAME count under the ONE definition — 335", () => {
  assert.equal(tallyOf(CONTENT_RUN_2, "orphan-within-crawled-set").UNKNOWN, 335);
  assert.equal(tallyOf(CONTENT_RUN_2, "orphan-within-crawled-set").FAIL, 0, "'could not see' was recorded as 'not there'");
  assert.equal(Number(/pages with no inbound links inside the crawled set: (\d+)/.exec(TECHNICAL_RUN_2)[1]), 335);
  for (const run of [CONTENT_RUN_2, TECHNICAL_RUN_2]) assert.match(run, /A link from ANY crawled host counts/);
  // The first runs, kept, still show the disagreement that was found.
  assert.equal(tallyOf(CONTENT_RUN, "orphan-within-crawled-set").UNKNOWN, 340);
  assert.match(TECHNICAL_RUN, /zero inbound links inside the crawled set: 341/);
  assert.equal(classify()[26].state, "VERIFIED-PASS");
});

test("🔴 ITEM 26 · 1A: the disagreement was RAISED as 11 Issues in the evidence store — and every one is CLOSED on evidence", () => {
  const records = createJsonlStore(`${REPO}runs/audit/instrument-findings.jsonl`).readAll();
  const issues = records.filter((r) => r.record_type === "issue" && r.issue_class === "instrument-disagreement");
  assert.equal(issues.length, 11);
  const life = lifecycleOf(records);
  for (const i of issues) {
    const e = life.issues.get(i.issue_id);
    assert.equal(e.state, "CLOSED", `${i.issue_id} is still ${e.state}`);
  }
  assert.ok(records.filter((r) => r.record_type === "issue_state_change").every((c) => /same count: 335/.test(c.reason)));
});

/* ---- 25 · TESTABLE-NOW, attempted --------------------------------------- */

/* 🔴 21 Sep 2026: row 25 left TESTABLE-NOW by a declared WORK move (TEST_RUN) — the four checks reached real pages' claims bound to a VERIFIED fact, tenancy first. The 13 September record below is still TRUE of that run and is kept; the row's state is what moved, and its
 * gap is kept on the row as gapBefore, renamed, not erased. */
test("🔴 ITEM 25: the 13 Sep run measured all four parts with part 4 unreportable — kept as history; on 21 Sep the row left TESTABLE-NOW on work", () => {
  assert.match(PAGE_QUALITY, /measured 389 of 389 · at or above 350: 122/);
  assert.match(PAGE_QUALITY, /MEASURED 327 of 389/);
  assert.match(PAGE_QUALITY, /VACUOUS 52 .* UNMEASURABLE 10/);
  assert.match(PAGE_QUALITY, /carrying at least one verified fact: 0/);
  assert.match(PAGE_QUALITY, /LIVE 15 · GONE 0 · UNKNOWN 0/);
  assert.match(PAGE_QUALITY, /NOT an existing page/);
  const r = classify()[25];
  assert.equal(r.state, "VERIFIED-PASS");
  assert.equal(r.attemptCount, 2);
  assert.equal(r.lastAttempt, "2026-09-21");
  assert.match(r.gapBefore, /0 verified facts on all 389 existing pages/);
  assert.match(r.whyTestableNow, /IT DOES NOT TICK, AND IT IS NOT FAILED/);
});

/* ---- 50, 51 · FAILED (re-scan) ------------------------------------------ */

/* 13 Sep 2026: F23 still judges no real supersession — the guard that governs real records leaving UNKNOWN is F24
 * (test/item-50-real-transitions.test.mjs), and item 50 left FAILED on it. */
test("🔴 ITEM 50: F23 still has 0 real supersessions to judge — the real population is F24's, and the row was REOPENED on it", async () => {
  const { records } = await loadRegistry((await (await import("./support/subjects.mjs")).subject("almi-oet")).factsDir, "almi-oet");
  /* 🔴 ROW 50's OWN POPULATION, AND THE DERIVED RECORD IS NOT IN IT. Row 50's frozen boundary reads
   * "the guard governs **real** records" and fails if "the guard polices an empty population". The
   * guard's population is the records LEAVING UNKNOWN through the verdict path — a derived record
   * carries no verification and no `previous`, so `judgeLeavingUnknown` returns null for it and it
   * never enters that population. The 46 is kept exactly, on the population row 50 actually
   * governs, and the line below PROVES the derived record stayed out rather than assuming it. */
  assert.equal(primaryFacts(records).length, 46);
  assert.equal(derivedFacts(records).every((r) => judgeLeavingUnknown(r.id, r.verification, r.claimElements, r) === null), true,
    "a derived record entered row 50's pre-contract guard population — it does not belong there");
  assert.equal(records.filter((r) => r.life?.supersedes).length, 0, "a real supersession now exists — re-sit item 50");
  // 🔴 21 Sep 2026: row 50 REOPENED by AUTHORITATIVE_REQUIREMENT_CHANGE (owner ruling, label on face) and FAILED by measurement — the 20 Sep tick was lawful when made; the 46 and the 0 supersessions above are unchanged by either move.
  assert.equal(classify()[50].state, "FAILED");
});

/* 51 was FAILED by the re-scan; its fields are now computed (test/recommendation-fields.test.mjs). */
test("🔴 ITEM 51: the drafts themselves still carry no chosen priority, confidence or cost — the report COMPUTES them, and the row passed", () => {
  const drafts = createJsonlStore(`${REPO}runs/audit/recommendations.jsonl`).readAll().filter((r) => r.record_type === "draft_recommendation");
  assert.equal(drafts.length, 3);
  for (const d of drafts) for (const field of ["priority", "confidence", "cost"]) assert.equal(d[field], undefined, "a number was written onto a recommendation instead of derived");
  assert.match(read("src/report/view.mjs"), /renderRecommendations/);
  assert.equal(classify()[51].state, "VERIFIED-PASS");
  assert.match(classify()[51].whyFailed, /FAILURE CONDITION IS MET/);
});

test("🔴 ITEM 25 after D-GATEA-1: the re-run over the same 389 pages — pair and single-page measurements now real", () => {
  const after = read("runs/audit/item-25-page-quality-run-after-gatea-fix-2026-09-13.txt");
  assert.match(after, /at or above 350: 155 · below: 228 · UNMEASURABLE 6/);
  assert.match(after, /MEASURED 337 of 389 · within 0\.4: 243 · above: 94/);
  assert.match(after, /VACUOUS 52 .* UNMEASURABLE 0/);
});

/* ---- 1 and 54 · the learning record ------------------------------------- */

test("🔴 ITEMS 1 AND 54: NO learning record exists — and no cost entry names a product", () => {
  const tracked = execFileSync("git", ["ls-files", "src", "bin", "runs"], { cwd: REPO, encoding: "utf8" }).split("\n");
  assert.deepEqual(tracked.filter((f) => /learning/i.test(f)), []);
  const entries = createJsonlStore(`${REPO}runs/cost/ledger.jsonl`).readAll();
  assert.equal(entries.filter((e) => e.product_id || e.productId || e.product).length, 0);
  for (const id of [1, 54]) assert.equal(classify()[id].state, "BLOCKED-UNKNOWN");
});

/* ---- the queue itself ---------------------------------------------------- */

/* 🔴 21 Sep 2026: row 25 left TESTABLE-NOW by a declared WORK move (TEST_RUN) — the four checks reached real pages' claims bound to a VERIFIED fact, tenancy first, and the queue is EMPTY. The loop below still polices any future TESTABLE-NOW row, but over an empty queue
 * it proves nothing — so the PROPERTY is now proved by driving the ledger's own law (assertLawful) on a moved copy of a
 * real row: a TESTABLE-NOW row with no test, no attempt count, or an attempt with no date and gap is REFUSED; the same
 * row carrying all of them is accepted. */
test("🔴 the TESTABLE-NOW queue is EMPTY since row 25 ticked — and a TESTABLE-NOW row must still name its test, its attempts and its gap", () => {
  const rows = Object.values(classify()).filter((r) => r.state === "TESTABLE-NOW");
  assert.deepEqual(rows.map((r) => r.id), []);
  for (const r of rows) assert.ok(r.test.length > 40 && r.gap.length > 40);
  const base = classify();
  const moved = (patch) => ({ ...base, 25: { ...base[25], state: "TESTABLE-NOW", ...patch } });
  const errs = (rows) => assertLawful(rows).filter((e) => e.startsWith("item 25 "));
  assert.ok(errs(moved({ test: undefined })).some((e) => /names no test/.test(e)), "a TESTABLE-NOW row with no test was not refused");
  assert.ok(errs(moved({ attemptCount: undefined })).some((e) => /no attemptCount/.test(e)), "a TESTABLE-NOW row with no attemptCount was not refused");
  assert.ok(errs(moved({ attemptCount: 1, lastAttempt: undefined })).length > 0, "an attempted TESTABLE-NOW row with no date was not refused");
  assert.deepEqual(errs(moved({ attemptCount: 1, lastAttempt: "2026-09-13", gap: base[25].gapBefore })), [], "control: a complete TESTABLE-NOW row is accepted");
});
