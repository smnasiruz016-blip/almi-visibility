/**
 * 🔴 RULING 0B, beta-g, 13 September 2026 — "NEVER TRIED" AND "TRIED, AND HERE
 * IS EXACTLY WHAT IS MISSING" ARE DIFFERENT ROWS.
 *
 * FAILED means the FAILURE condition was met, and nothing else (ruling 0A). So a
 * row that was RUN and fell short stays TESTABLE-NOW — and without these fields
 * the queue could not tell it from a row nobody ever attempted, and rows would
 * drift in a comfortable middle. Every TESTABLE-NOW row carries attemptCount;
 * one that has been attempted carries lastAttempt and the SPECIFIC gap.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { classify, assertLawful } from "../src/checklist/classification.mjs";

const rowsWith = (id, patch) => {
  const rows = classify();
  rows[id] = { ...rows[id], state: "TESTABLE-NOW", test: "a named, runnable test that settles the row", ...patch };
  return rows;
};

test("🔴 RED: a TESTABLE-NOW row attempted once with NO named gap is refused", () => {
  const errors = assertLawful(rowsWith(25, { attemptCount: 1, lastAttempt: "2026-09-13", gap: undefined }));
  assert.ok(errors.some((e) => /item 25 .*attempted 1 time\(s\), and names no gap/.test(e)), errors.join("\n"));
});

test("🔴 RED: an attempted row with no lastAttempt date is refused; a row with no attemptCount at all is refused", () => {
  assert.ok(assertLawful(rowsWith(25, { attemptCount: 2, lastAttempt: null, gap: "the specific thing that stopped it, named" })).some((e) => /records no lastAttempt date/.test(e)));
  assert.ok(assertLawful(rowsWith(25, { attemptCount: undefined, gap: undefined })).some((e) => /TESTABLE-NOW with no attemptCount/.test(e)));
});

test("🔴 RED: a gap too vague to act on is refused", () => {
  assert.ok(assertLawful(rowsWith(25, { attemptCount: 1, lastAttempt: "2026-09-13", gap: "not done" })).some((e) => /names no gap/.test(e)));
});

test("CONTROL: a never-attempted row needs no gap, and an attempted row with its date and gap is lawful", () => {
  assert.deepEqual(assertLawful(rowsWith(25, { attemptCount: 0, lastAttempt: undefined, gap: undefined })), []);
  assert.deepEqual(assertLawful(rowsWith(25, { attemptCount: 3, lastAttempt: "2026-09-13", gap: "verified-fact presence has no real positive on an existing page" })), []);
});

test("🔴 REAL: every TESTABLE-NOW row in the ledger carries attemptCount, and every attempted one its date and its gap", () => {
  const rows = Object.values(classify()).filter((r) => r.state === "TESTABLE-NOW");
  for (const r of rows) {
    assert.ok(Number.isInteger(r.attemptCount), `item ${r.id} has no attemptCount`);
    if (r.attemptCount > 0) {
      assert.match(r.lastAttempt, /^\d{4}-\d{2}-\d{2}$/, `item ${r.id} has no lastAttempt`);
      assert.ok(r.gap && r.gap.length >= 20, `item ${r.id} has no named gap`);
    }
  }
  assert.deepEqual(assertLawful(classify()), []);
});
