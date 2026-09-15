/**
 * AMENDMENT 2 — THE SEVENTH STATE, AND ITEM 14's REPLACED CONTRACT.
 *
 * 🔴 FOUR RULES GO WITH `FAILED`, AND EACH IS EXECUTABLE HERE:
 *   1. a row leaves FAILED by exactly two routes;
 *   2. FAILED is never quietly returned to BUILT-NOT-PROVED;
 *   3. FAILED is counted and named separately, never folded, never progress;
 *   4. a FAILED row is worth more than a BUILT-NOT-PROVED one — it means we looked.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { amendment2, amendmentContracts, splitSource, AMENDMENT_2_BODY_SHA256 } from "../tools/verify-pass-boundaries-source.mjs";
import { loadBoundaries, CONTRACT_PARTS } from "../src/checklist/boundaries.mjs";
import {
  STATES, LOOKED, hasBeenLookedAt, classify, assertLawful, assertTransitions, tally,
  BEFORE_AMENDMENT_2, MOVES_AMENDMENT_2, LEAVE_FAILED_ROUTES,
} from "../src/checklist/classification.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const A1 = `${REPO}PASS_BOUNDARIES_AMENDMENT_1.md`;
const A2 = `${REPO}PASS_BOUNDARIES_AMENDMENT_2.md`;

/* ================================================================== *
 * THE FROZEN TEXT.
 * ================================================================== */

test("🔴 Amendment 2's body matches its recorded sha256", () => {
  const r = amendment2(A2);
  assert.equal(r.sha, AMENDMENT_2_BODY_SHA256);
  assert.equal(r.matches, true);
  assert.equal(r.definesFailed, true, "the amendment's own state list does not define FAILED");
});

test("🔴 the parser reads all four parts of item 14's new contract — an empty block would pass the hash and fail the law", () => {
  const r = amendment2(A2);
  assert.deepEqual(Object.keys(r.contracts), ["14"]);
  for (const p of CONTRACT_PARTS) assert.ok(r.contracts[14][p]?.length > 20, `item 14 ${p} was not parsed`);
});

test("🔴 item 14's contract is REPLACED by Amendment 2's, verbatim — not merged with Amendment 1's", () => {
  const b = loadBoundaries()[14];
  const a2 = amendment2(A2).contracts[14];
  const a1 = amendmentContracts(A1).contracts[14];
  for (const p of CONTRACT_PARTS) assert.equal(b[p], a2[p], `item 14 ${p} is not Amendment 2's text`);
  /* 🔴 THREE PARTS CHANGED, NOT FOUR. A first version of this test asserted all
   * four differ from Amendment 1 and went red on correct data: the owner kept
   * INPUT word for word ("the repository as it stands, and a rediscovered
   * URL"). A replacement test that demands a change the ruling did not make
   * tests my expectation, not the ruling. */
  for (const p of ["expected", "failure", "evidence"]) {
    assert.notEqual(b[p], a1[p], `item 14 ${p} is still Amendment 1's text — the replacement did not happen`);
  }
  assert.equal(a2.input, a1.input, "Amendment 2 kept item 14's INPUT unchanged — if this moved, re-read the ruling");
  assert.equal(b.via, "§4+A1+A2");
  assert.equal(b.replacedByA2, true);
  const flatA2 = splitSource(readFileSync(A2, "utf8").replace(/\r\n/g, "\n")).body.replace(/\s+/g, " ");
  for (const p of CONTRACT_PARTS) assert.ok(flatA2.includes(b[p]), `item 14 ${p} is not a substring of the amendment`);
  // The deferred half is untouched — Amendment 2 replaces the v0.1 half only.
  assert.match(b.deferred, /KEEP/);
});

test("no other row is touched by Amendment 2", () => {
  const b = loadBoundaries();
  assert.deepEqual(Object.values(b).filter((r) => r.replacedByA2).map((r) => r.id), [14]);
});

/* ================================================================== *
 * THE SEVENTH STATE.
 * ================================================================== */

test("the vocabulary is SEVEN states, FAILED among them", () => {
  assert.deepEqual([...STATES], ["NOT-STARTED", "BUILT-NOT-PROVED", "TESTABLE-NOW", "VERIFIED-PASS", "FAILED", "BLOCKED-UNKNOWN", "DEFERRED"]);
});

test("🔴 RULE 3 — FAILED is its own count in the tally, never folded into another — including at ZERO", () => {
  const t = tally(classify());
  assert.deepEqual(Object.keys(t), [...STATES], "the tally has a bucket that is not a state, or lacks one");
  // Item 14 emptied it; item 45 refilled it; item 48 filled it and emptied it
  // again by a re-run that passed; the 13 Sep re-scan ran 50 and 51 and both
  // FAILED; 51 then left by a re-run that passed, and 50 stayed on an argued
  // reading — until 13 Sep 2026, when 50 left by a re-run that passed on real
  // records. The bucket is at ZERO again and still here: it never vanished at
  // zero, which is why every refill is visible — a column that vanishes when
  // empty cannot be watched.
  // 13 Sep 2026, later: item 50 was REOPENED on a wrong label, and the bucket holds 1 again.
  // 14 Sep 2026: row 5 was run and FAILED on its held-out check — the bucket holds 2.
  assert.equal(t.FAILED, 2);
  assert.ok("FAILED" in t);
  // 58 frozen rows plus rows 59, 60 and 61, admitted by owner ruling (Amendments 3 and 5, 14 September 2026).
  assert.equal(Object.values(t).reduce((a, b) => a + b, 0), 61);
});

test("🔴 RULE 4 — FAILED counts as LOOKED; BUILT-NOT-PROVED does not", () => {
  assert.equal(hasBeenLookedAt("FAILED"), true);
  assert.equal(hasBeenLookedAt("VERIFIED-PASS"), true);
  for (const s of STATES.filter((x) => !LOOKED.includes(x))) assert.equal(hasBeenLookedAt(s), false, s);
});

test("🔴 a FAILED row must name the test that ran AND the failure condition that was met", () => {
  // No real row is FAILED today, so the guard is driven with one — a guard with
  // no vehicle left to fire on would quietly become decoration.
  const rows = classify();
  rows[14] = { ...rows[14], state: "FAILED", test: "t", failureMet: "" };
  const errors = assertLawful(rows);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /is FAILED but does not name the FAILURE condition that was met/);

  const noTest = classify();
  noTest[14] = { ...noTest[14], state: "FAILED", test: undefined, failureMet: "x" };
  assert.match(assertLawful(noTest)[0], /is FAILED but does not name the test that was run/);

  const complete = classify();
  complete[14] = { ...complete[14], state: "FAILED", test: "t", failureMet: "x" };
  assert.deepEqual(assertLawful(complete), [], "CONTROL: a FAILED row with both is lawful");
});

test("CONTROL: the whole real ledger is lawful, transitions included", () => {
  assert.deepEqual(assertLawful(classify()), []);
  assert.deepEqual(assertTransitions(classify()), []);
});

/* ================================================================== *
 * 🔴 RULES 1 AND 2 — THE WAYS OUT OF FAILED.
 * ================================================================== */

const failedBefore = { ...BEFORE_AMENDMENT_2, 14: "FAILED" };
const at = (state) => {
  const rows = classify();
  rows[14] = { ...rows[14], state };
  return rows;
};

test("exactly two routes out of FAILED exist", () => {
  assert.deepEqual([...LEAVE_FAILED_ROUTES], ["RETEST_PASSED", "OWNER_RULING"]);
});

test("🔴 RULE 1 RED: FAILED → VERIFIED-PASS with NO declared route is refused", () => {
  const errors = assertTransitions(at("VERIFIED-PASS"), failedBefore, {});
  assert.ok(errors.some((e) => /leaves FAILED for VERIFIED-PASS by no declared route/.test(e)), errors.join("\n"));
});

test("🔴 RULE 1 RED: an owner ruling with no REASON is not a way out", () => {
  const moves = { 14: [{ from: "FAILED", to: "TESTABLE-NOW", kind: "ruling", route: "OWNER_RULING", ruling: "A3", date: "2026-10-01" }] };
  const errors = assertTransitions(at("TESTABLE-NOW"), failedBefore, moves);
  assert.ok(errors.some((e) => /EXACTLY TWO routes/.test(e)), errors.join("\n"));
  assert.ok(errors.some((e) => /must record the ruling, its date AND its reason/.test(e)));
});

test("🔴 RULE 1 RED: a re-run that did not reach VERIFIED-PASS is not a way out", () => {
  const moves = { 14: [{ from: "FAILED", to: "DEFERRED", kind: "work", route: "RETEST_PASSED", test: "t", date: "2026-10-01" }] };
  const errors = assertTransitions(at("DEFERRED"), failedBefore, moves);
  assert.ok(errors.some((e) => /leaves FAILED for DEFERRED by route RETEST_PASSED/.test(e)), errors.join("\n"));
});

test("🔴 RULE 1 RED: a route that is neither of the two is refused", () => {
  const moves = { 14: [{ from: "FAILED", to: "VERIFIED-PASS", kind: "work", route: "LOOKS_FIXED", test: "t", date: "2026-10-01" }] };
  assert.ok(assertTransitions(at("VERIFIED-PASS"), failedBefore, moves).some((e) => /by route LOOKS_FIXED/.test(e)));
});

test("CONTROL: the two lawful routes out of FAILED are accepted", () => {
  /* Every OTHER row keeps its real declared moves — a control that dropped them
   * would fail on item 9's real move and say nothing about item 14. */
  const retest = { ...MOVES_AMENDMENT_2, 14: [{ from: "FAILED", to: "VERIFIED-PASS", kind: "work", route: "RETEST_PASSED", test: "test/permitted-writers.test.mjs", date: "2026-10-01" }] };
  const withTest = at("VERIFIED-PASS");
  assert.deepEqual(assertTransitions(withTest, failedBefore, retest), []);

  const ruling = { ...MOVES_AMENDMENT_2, 14: [{ from: "FAILED", to: "TESTABLE-NOW", kind: "ruling", route: "OWNER_RULING", ruling: "A3", date: "2026-10-01", reason: "boundary changed" }] };
  assert.deepEqual(assertTransitions(at("TESTABLE-NOW"), failedBefore, ruling), []);
});

test("🔴 RULE 2 RED: FAILED → BUILT-NOT-PROVED is refused EVEN WITH a complete owner ruling", () => {
  const moves = { 14: [{ from: "FAILED", to: "BUILT-NOT-PROVED", kind: "ruling", route: "OWNER_RULING", ruling: "A3", date: "2026-10-01", reason: "r" }] };
  const errors = assertTransitions(at("BUILT-NOT-PROVED"), failedBefore, moves);
  assert.ok(errors.some((e) => /FAILED may NEVER be returned to BUILT-NOT-PROVED/.test(e)), errors.join("\n"));
});

test("🔴 RULE 2 RED: FAILED quietly relabelled BUILT-NOT-PROVED, with no move at all, is refused", () => {
  const errors = assertTransitions(at("BUILT-NOT-PROVED"), failedBefore, {});
  assert.ok(errors.some((e) => /FAILED may NEVER be returned to BUILT-NOT-PROVED/.test(e)));
});

test("🔴 RED: any state change with no declared move is refused — a move is never inferred", () => {
  const rows = classify();
  rows[9] = { ...rows[9], state: "TESTABLE-NOW", test: "x" };
  const errors = assertTransitions(rows);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /item 9: is TESTABLE-NOW but its recorded state is BLOCKED-UNKNOWN and no move was declared/);
});

test("🔴 RED: a 'ruling' move that is not an owner ruling is refused — the two lists cannot blend", () => {
  const moves = { 14: [{ ...MOVES_AMENDMENT_2[14][0], route: "TEST_RUN" }, MOVES_AMENDMENT_2[14][1]] };
  assert.ok(assertTransitions(classify(), BEFORE_AMENDMENT_2, moves).some((e) => /only an owner ruling is a ruling move/.test(e)));
});

/* ================================================================== *
 * 4D — THE TWO CHANGE LISTS, KEPT APART.
 * ================================================================== */

/* 🔴 SEVEN BY RULING SINCE AMENDMENT 4 (owner ruling, 13 September 2026): rows 3–7 DEFERRED → NOT-STARTED, their
 * class opened and nothing built. The WORK list below is deliberately UNCHANGED — that is the proof, in this test,
 * that none of the five was counted as work. */
test("🔴 moves since Amendment 2: SEVEN by ruling (3–7 → NOT-STARTED by Amendment 4; 14 and 45 → TESTABLE-NOW); the work list unchanged — including the first tick ever REMOVED (48) and its return", () => {
  const all = Object.entries(MOVES_AMENDMENT_2).flatMap(([id, chain]) => chain.map((s) => ({ id: Number(id), ...s })));
  assert.deepEqual(all.filter((s) => s.kind === "ruling").map((s) => `${s.id}:${s.from}→${s.to}`), [
    "3:DEFERRED→NOT-STARTED", "4:DEFERRED→NOT-STARTED", "5:DEFERRED→NOT-STARTED", "6:DEFERRED→NOT-STARTED", "7:DEFERRED→NOT-STARTED",
    "14:BUILT-NOT-PROVED→TESTABLE-NOW", "45:FAILED→TESTABLE-NOW",
  ]);
  assert.deepEqual(all.filter((s) => s.kind === "work").map((s) => `${s.id}:${s.from}→${s.to}`), [
    // 🔴 Row 3, 15 September 2026: its owned half run against its boundary and PASSED — work, after its ruling move.
    "3:NOT-STARTED→VERIFIED-PASS",
    // 🔴 Row 4, 15 September 2026: built and run on owned evidence; half (b) of FAILURE needs answers the store lacks — BUILT-NOT-PROVED.
    "4:NOT-STARTED→BUILT-NOT-PROVED",
    // 🔴 Row 5, 14 September 2026: run against its boundary and FAILED on its held-out check — work, after its ruling move.
    "5:NOT-STARTED→FAILED",
    // 🔴 Row 6, 14 September 2026: built and run on real evidence; no axis could be accepted or rejected — BUILT-NOT-PROVED.
    "6:NOT-STARTED→BUILT-NOT-PROVED",
    "9:BUILT-NOT-PROVED→BLOCKED-UNKNOWN", "11:BLOCKED-UNKNOWN→VERIFIED-PASS",
    "12:BUILT-NOT-PROVED→TESTABLE-NOW", "12:TESTABLE-NOW→VERIFIED-PASS", "13:BUILT-NOT-PROVED→TESTABLE-NOW", "13:TESTABLE-NOW→VERIFIED-PASS",
    "14:TESTABLE-NOW→FAILED", "14:FAILED→VERIFIED-PASS",
    "25:BUILT-NOT-PROVED→TESTABLE-NOW", "26:BUILT-NOT-PROVED→TESTABLE-NOW", "26:TESTABLE-NOW→VERIFIED-PASS",
    "38:BUILT-NOT-PROVED→TESTABLE-NOW", "38:TESTABLE-NOW→VERIFIED-PASS",
    "42:BLOCKED-UNKNOWN→VERIFIED-PASS", "45:BUILT-NOT-PROVED→FAILED", "45:TESTABLE-NOW→VERIFIED-PASS", "47:NOT-STARTED→VERIFIED-PASS",
    "48:VERIFIED-PASS→FAILED", "48:FAILED→VERIFIED-PASS", "49:BUILT-NOT-PROVED→VERIFIED-PASS",
    "50:BUILT-NOT-PROVED→TESTABLE-NOW", "50:TESTABLE-NOW→FAILED", "50:FAILED→VERIFIED-PASS", "50:VERIFIED-PASS→FAILED",
    "51:BUILT-NOT-PROVED→TESTABLE-NOW", "51:TESTABLE-NOW→FAILED", "51:FAILED→VERIFIED-PASS", "53:BUILT-NOT-PROVED→VERIFIED-PASS",
    "55:BUILT-NOT-PROVED→TESTABLE-NOW", "55:TESTABLE-NOW→FAILED", "55:FAILED→VERIFIED-PASS",
    "56:BLOCKED-UNKNOWN→VERIFIED-PASS",
    // 🔴 Rows 59 and 60, Amendment 3's work half (14 September 2026): 59's test run and passed; 60 built, waiting on the owner's levels.
    "59:NOT-STARTED→VERIFIED-PASS", "60:NOT-STARTED→BUILT-NOT-PROVED",
    // 🔴 Row 60's first tick (14 September 2026): its census run over the real store, its frozen limbs re-run alone.
    "60:BUILT-NOT-PROVED→VERIFIED-PASS",
    // 🔴 Row 61, created 14 September 2026: the work of PR #72, recorded as work — and it stops at BUILT-NOT-PROVED.
    "61:NOT-STARTED→BUILT-NOT-PROVED",
  ]);
  // 🔴 56 reached its tick by the owner's eye — the only route that may set it.
  assert.equal(MOVES_AMENDMENT_2[56][0].route, "OWNER_VERIFICATION");
  // 🔴 55 left FAILED the way 14 and 48 did — its test re-run and passing, after the leak was fixed.
  const out55 = MOVES_AMENDMENT_2[55].find((s) => s.from === "FAILED");
  assert.equal(out55.route, "RETEST_PASSED");
  // 🔴 A re-scan move says the INPUT exists — never that the row passed.
  for (const s of all.filter((x) => x.route === "INPUT_EXISTS")) {
    assert.equal(s.to, "TESTABLE-NOW", `item ${s.id}: an input-exists move went somewhere other than TESTABLE-NOW`);
    assert.ok(s.input && s.date, `item ${s.id}: an input-exists move must name the input and the date`);
  }
  // 🔴 48 left FAILED the same way 14 did — a re-run that passed, never a ruling.
  const back = MOVES_AMENDMENT_2[48][1];
  assert.equal(back.route, "RETEST_PASSED");
  assert.ok(back.test && back.date);
  // 🔴 The way out of FAILED is rule 1's FIRST route, naming its test and date.
  const out = all.find((s) => s.from === "FAILED");
  assert.equal(out.route, "RETEST_PASSED");
  assert.ok(out.test && out.date);
});

test("before Amendment 2 the ledger was 3 / 18 / 0 / 3 / 0 / 6 / 28", () => {
  const before = Object.fromEntries(STATES.map((s) => [s, 0]));
  for (const s of Object.values(BEFORE_AMENDMENT_2)) before[s] += 1;
  assert.deepEqual(before, {
    "NOT-STARTED": 3, "BUILT-NOT-PROVED": 18, "TESTABLE-NOW": 0, "VERIFIED-PASS": 3, FAILED: 0, "BLOCKED-UNKNOWN": 6, DEFERRED: 28,
  });
});

/* 🔴 FIFTEEN since Amendment 3's work half (14 Sep 2026): row 59 — admitted NOT-STARTED, so never VERIFIED-PASS before
 * Amendment 2 either — ticked on its census and every evidence limb RED alone. */
/* 🔴 SIXTEEN since row 60 ticked (14 Sep 2026). */
test("🔴 since Amendment 2, SEVENTEEN rows hold VERIFIED-PASS (3, 11, 12, 13, 14, 26, 38, 42, 45, 47, 49, 51, 53, 55, 56, 59, 60) — 50 reached it and was REOPENED; 48 LOST it and EARNED IT BACK", () => {
  const rows = classify();
  const newPasses = Object.values(rows).filter((r) => r.state === "VERIFIED-PASS" && BEFORE_AMENDMENT_2[r.id] !== "VERIFIED-PASS");
  assert.deepEqual(newPasses.map((r) => r.id), [3, 11, 12, 13, 14, 26, 38, 42, 45, 47, 49, 51, 53, 55, 56, 59, 60]);
  const lost = Object.values(rows).filter((r) => BEFORE_AMENDMENT_2[r.id] === "VERIFIED-PASS" && r.state !== "VERIFIED-PASS");
  assert.deepEqual(lost.map((r) => r.id), []);
  // The count hides a round trip — the chain does not.
  assert.deepEqual(MOVES_AMENDMENT_2[48].map((s) => s.to), ["FAILED", "VERIFIED-PASS"]);
});
