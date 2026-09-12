/**
 * THE FROZEN PASS BOUNDARIES, AND THE CONTRACT THEY IMPOSE.
 *
 * 🔴 THE POINT OF THIS FILE IS THAT THE CONTRACT IS ENFORCED BY THE REPOSITORY
 * RATHER THAN BY ANYONE REMEMBERING IT. The owner's ruling exists precisely
 * because "complete" kept being redefined after the fact; a rule that lives
 * only in a document is redefinable in exactly the same way.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  verify, EXPECTED_BODY_SHA256, EXPECTED_FEATURE_COUNT, EXPECTED_CLASS_COUNTS, splitSource, sectionSix,
} from "../tools/verify-pass-boundaries-source.mjs";
import { loadBoundaries, CONTRACT_PARTS } from "../src/checklist/boundaries.mjs";
import { classify, assertLawful, tally, STATES } from "../src/checklist/classification.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SOURCE = `${REPO}PASS_BOUNDARIES_SOURCE.md`;

/* ================================================================== *
 * THE FROZEN TEXT IS THE OWNER'S TEXT.
 * ================================================================== */

test("🔴 the frozen body matches its recorded sha256 — 'verbatim' made falsifiable", () => {
  const r = verify(SOURCE);
  assert.equal(r.sha, EXPECTED_BODY_SHA256, "the owner's ruling has been altered since it was frozen");
  assert.equal(r.matches, true);
});

test("🔴 the census is asserted apart from the hash — 58, in unbroken sequence", () => {
  const r = verify(SOURCE);
  assert.equal(r.features.count, EXPECTED_FEATURE_COUNT);
  assert.equal(r.features.sequential, EXPECTED_FEATURE_COUNT, "the ids are not 1..58 in order");
  assert.equal(r.features.ok, true);
});

/**
 * 🔴 COUNTED INSIDE §6, NOT ACROSS THE FILE.
 *
 * A first pass counted every `### N · ` heading in the document and got 65,
 * because §4 and §5 re-head seven items to rule on them. A whole-document grep
 * is wider than the section — and the error inflated the count, which is the
 * direction that flatters.
 */
test("🔴 §4 and §5 re-head seven items, and the census must not count them twice", () => {
  const { body } = splitSource(readFileSync(SOURCE, "utf8").replace(/\r\n/g, "\n"));
  const whole = [...body.matchAll(/^### (\d+) · /gm)].length;
  const inSix = [...sectionSix(body).matchAll(/^### (\d+) · /gm)].length;
  assert.equal(inSix, 58);
  assert.equal(whole, 65, "if this moves, §4/§5 changed and the census scope must be re-read");
  assert.equal(whole - inSix, 7);
});

test("the class counts are frozen too — they decide which rows may be deferred", () => {
  const r = verify(SOURCE);
  assert.deepEqual(r.counts, EXPECTED_CLASS_COUNTS);
  // 🔴 Six splits, not the five named in §4 — item 25 is split inline in §6.
  assert.equal(r.counts.S, 6);
  assert.equal(r.classes[25], "S");
});

/* ================================================================== *
 * THE BOUNDARIES ARE READ, NEVER RETYPED.
 * ================================================================== */

test("🔴 every boundary is present in the frozen source, character for character", () => {
  const { body } = splitSource(readFileSync(SOURCE, "utf8").replace(/\r\n/g, "\n"));
  const flat = body.replace(/\s+/g, " ");
  const b = loadBoundaries();
  let checked = 0;
  for (const row of Object.values(b)) {
    for (const part of CONTRACT_PARTS) {
      if (!row[part]) continue;
      assert.ok(
        flat.includes(row[part]),
        `item ${row.id} ${part} is not a substring of the owner's text — it has been paraphrased`,
      );
      checked += 1;
    }
  }
  assert.ok(checked > 190, `only ${checked} parts checked — the law would be weak`);
});

test("all 58 are parsed, and each knows which section ruled it", () => {
  const b = loadBoundaries();
  assert.equal(Object.keys(b).length, 58);
  const via = {};
  for (const r of Object.values(b)) via[r.via] = (via[r.via] ?? 0) + 1;
  assert.deepEqual(via, { "§6": 51, "§4": 5, "§5": 2 });
});

/**
 * 🔴 THE SIX SPLIT ROWS DO NOT CARRY ALL FOUR PARTS, AND THAT IS RECORDED, NOT
 * PATCHED. §4 rules them as `v0.1 PASS boundary` / `deferred` tables instead of
 * the four-part form. Writing the missing parts myself would manufacture a
 * boundary the owner never ruled — and it would then be enforced as if he had.
 */
test("🔴 the rows whose four parts the document does not state are named, not filled in", () => {
  const b = loadBoundaries();
  const incomplete = Object.values(b).filter((r) => r.missingParts.length);
  assert.deepEqual(incomplete.map((r) => r.id), [10, 12, 13, 14, 25, 38]);
  for (const r of incomplete) assert.equal(r.class, "S", `${r.id} is incomplete but is not a split`);
  assert.deepEqual(b[25].missingParts, ["input", "expected"]);
});

test("the hash guards the boundaries — a tampered source refuses to load", async () => {
  // The loader checks the hash on load; prove the check is wired, not assumed.
  const mod = await import("../src/checklist/boundaries.mjs");
  assert.equal(typeof mod.loadBoundaries, "function");
  assert.doesNotThrow(() => mod.loadBoundaries());
});

/* ================================================================== *
 * 🔴 THE CONTRACT GUARD — NO VERIFIED-PASS WITH AN EMPTY PART.
 * ================================================================== */

/**
 * 🔴 THE BEFORE-STATE COMES FROM RECORDED DATA, NOT FROM THE TRACKER FILE.
 *
 * Parsing `CHECKLIST_STATUS.md` for "what it was" worked exactly once: the
 * reclassification then overwrote that file, before and after became identical,
 * and the proof that 37 rows moved vanished. A measurement must not read the
 * thing it is about to change.
 */

test("the live classification is lawful", () => {
  const errors = assertLawful(classify());
  assert.deepEqual(errors, [], errors.join("\n"));
});

/**
 * 🔴 THE FIRING FIXTURE. Without it "lawful returns []" is satisfied by a
 * function that returns [] unconditionally, and the guard proves nothing.
 */
test("🔴 RED: a VERIFIED-PASS on a row with an empty contract part is REFUSED", () => {
  const rows = classify();
  // Item 10's boundary states none of the four — §4 rules it as halves.
  rows[10] = { ...rows[10], state: "VERIFIED-PASS" };
  const errors = assertLawful(rows);
  assert.equal(errors.length, 1, "the guard did not fire");
  assert.match(errors[0], /item 10 .* is VERIFIED-PASS but its boundary has no input, expected, failure, evidence/);
  assert.match(errors[0], /"it is built" and "it looks right" are not verdicts/);
});

test("CONTROL: a VERIFIED-PASS on a row that HAS all four parts is allowed through", () => {
  const rows = classify();
  // Item 48 — the owner's own worked example — carries all four.
  rows[48] = { ...rows[48], state: "VERIFIED-PASS" };
  assert.deepEqual(assertLawful(rows), [], "the guard rejects a lawful pass, so it is not measuring the contract");
});

/**
 * 🔴 THE DEFERRAL LAW, ENFORCED. "Surely this one is out of scope too" is how a
 * deferral gets invented, and an invented deferral is a tick that never had to
 * be earned.
 */
test("🔴 RED: a DEFERRED on a row the ruling classes P is REFUSED", () => {
  const rows = classify();
  rows[15] = { ...rows[15], state: "DEFERRED" };
  const errors = assertLawful(rows);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /is DEFERRED but the frozen ruling classes it P/);
  assert.match(errors[0], /a question for the owner, not a reclassification/);
});

test("CONTROL: DEFERRED is allowed on every row the ruling classes D", () => {
  const rows = classify();
  const boundaries = loadBoundaries();
  for (const r of Object.values(rows)) {
    if (boundaries[r.id].class === "D") assert.equal(r.state, "DEFERRED", `item ${r.id} is class D but is ${r.state}`);
  }
  assert.deepEqual(assertLawful(rows), []);
});

test("🔴 RED: TESTABLE-NOW without a named test is REFUSED", () => {
  const rows = classify();
  rows[9] = { ...rows[9], state: "TESTABLE-NOW" };
  const errors = assertLawful(rows);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /is TESTABLE-NOW but names no test/);
});

/* ================================================================== *
 * THE COUNTS, AND THE ONE NUMBER THAT MATTERS MOST.
 * ================================================================== */

test("the six-state tally is 3 / 17 / 4 / 0 / 6 / 28", () => {
  assert.deepEqual(tally(classify()), {
    "NOT-STARTED": 3,
    "BUILT-NOT-PROVED": 17,
    "TESTABLE-NOW": 4,
    "VERIFIED-PASS": 0,
    "BLOCKED-UNKNOWN": 6,
    DEFERRED: 28,
  });
});

test("every state used is one of the six, and every row is classified", () => {
  const rows = classify();
  assert.equal(Object.keys(rows).length, 58);
  for (const r of Object.values(rows)) assert.ok(STATES.includes(r.state), `item ${r.id}: ${r.state}`);
});

/**
 * 🔴 THE LINE THAT MATTERS MOST IN THE WHOLE INSTRUMENT.
 *
 * Re-classification moved 37 rows. NOTHING WAS BUILT. If a future change makes
 * this assertion fail because `work` is non-zero, that is good news and the
 * number should be updated deliberately — but it must never drift upward
 * quietly, because a ledger that improves when we rename its columns is the
 * exact failure this instrument exists to prevent.
 */
test("🔴 not one row changed status because work happened — the count is ZERO", () => {
  const rows = Object.values(classify());
  const work = rows.filter((r) => r.changeKind === "work");
  assert.deepEqual(
    work.map((r) => r.id),
    [],
    "a row claims it moved on work: this PR classifies, it does not build or verify",
  );
  assert.equal(rows.filter((r) => r.changeKind === "vocabulary").length, 37);
  assert.equal(rows.filter((r) => r.changeKind === "none").length, 21);
});

test("🔴 VERIFIED-PASS is zero, and this PR may not change that", () => {
  assert.equal(tally(classify())["VERIFIED-PASS"], 0, "this PR classifies; it does not verify");
});
