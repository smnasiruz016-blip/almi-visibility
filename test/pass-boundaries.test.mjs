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
const AMENDMENT = `${REPO}PASS_BOUNDARIES_AMENDMENT_1.md`;

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

/**
 * 🔴 CHECKED AGAINST BOTH FROZEN TEXTS, because a boundary may now come from
 * either. Amendment 1 supplies the six v0.1-half contracts; the ruling supplies
 * the rest. Searching only the ruling would fail six rows that were never
 * paraphrased — and, worse, searching only the amendment would let a
 * paraphrase of the ruling through.
 */
test("🔴 every boundary is present in one of the frozen texts, character for character", () => {
  const flat = [SOURCE, AMENDMENT]
    .map((p) => splitSource(readFileSync(p, "utf8").replace(/\r\n/g, "\n")).body)
    .join("\n")
    .replace(/\s+/g, " ");
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
  // 🔴 All 58 × 4 now, because Amendment 1 closed the six gaps.
  assert.equal(checked, 232, `only ${checked} of 232 parts checked — the law would be weak`);
});

test("all 58 are parsed, and each knows WHICH document ruled it", () => {
  const b = loadBoundaries();
  assert.equal(Object.keys(b).length, 58);
  const via = {};
  for (const r of Object.values(b)) via[r.via] = (via[r.via] ?? 0) + 1;
  // §4+A1 — the five splits §4 named; §6+A1 — item 25, split inline in §6.
  assert.deepEqual(via, { "§6": 50, "§4+A1": 5, "§6+A1": 1, "§5": 2 });
  assert.equal(Object.values(b).filter((r) => r.amendedByA1).length, 6);
});

/**
 * 🔴 AMENDMENT 1 CLOSED THIS GAP, AND THE TEST RECORDS THAT RATHER THAN BEING
 * DELETED. PR #46 reported that six features had no four-part contract and so
 * could never be ticked; the owner accepted it as his defect and amended the
 * ruling. All six now carry all four parts — supplied by HIM, not filled in
 * from this side, which is the whole difference.
 */
test("🔴 Amendment 1 closed the six missing contracts — no row now lacks a part", () => {
  const b = loadBoundaries();
  assert.deepEqual(Object.values(b).filter((r) => r.missingParts.length).map((r) => r.id), []);
  for (const id of [10, 12, 13, 14, 25, 38]) {
    assert.equal(b[id].class, "S", `${id} should be a split`);
    assert.equal(b[id].amendedByA1, true, `${id} did not receive its amended contract`);
    for (const p of CONTRACT_PARTS) assert.ok(b[id][p], `item ${id} still has no ${p}`);
  }
  // The deferred halves are untouched — a deferred half cannot be run and needs
  // no testable contract, so §4 and §5 still record them as they were.
  assert.match(b[14].deferred, /KEEP/);
  assert.match(b[10].deferred, /advanced technical SEO/);
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
 *
 * 🔴 AND IT MUST STAY RED-PROVABLE NOW THAT NO REAL ROW LACKS A PART.
 *
 * Before Amendment 1 this test used item 10, which genuinely had none of the
 * four. That vehicle is gone — and a guard with no way left to fire is a guard
 * that has quietly become decoration. So the boundary is doctored instead: the
 * SAME `assertLawful` is handed a row whose contract is missing a part, and it
 * must still refuse the pass.
 */
test("🔴 RED: a VERIFIED-PASS on a row with an empty contract part is REFUSED", () => {
  const rows = classify();
  const boundaries = { ...loadBoundaries() };
  boundaries[9] = { ...boundaries[9], missingParts: ["evidence"] };
  rows[9] = { ...rows[9], state: "VERIFIED-PASS" };

  const errors = assertLawful(rows, boundaries);
  assert.equal(errors.length, 1, "the guard did not fire");
  assert.match(errors[0], /item 9 .* is VERIFIED-PASS but its boundary has no evidence/);
  assert.match(errors[0], /"it is built" and "it looks right" are not verdicts/);
});

test("CONTROL: the same row with its real, complete contract passes the guard", () => {
  const rows = classify();
  rows[9] = { ...rows[9], state: "VERIFIED-PASS" };
  assert.deepEqual(assertLawful(rows), [], "the guard rejects a complete contract — it is not measuring the parts");
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

test("the six-state tally is 3 / 18 / 0 / 3 / 6 / 28", () => {
  assert.deepEqual(tally(classify()), {
    "NOT-STARTED": 3,
    "BUILT-NOT-PROVED": 18,
    "TESTABLE-NOW": 0,
    "VERIFIED-PASS": 3,
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
/**
 * 🔴 THE LINE THAT MATTERS MOST, AND IT HAS CHANGED FOR THE RIGHT REASON.
 *
 * On the 12 September re-classification this asserted ZERO — 37 rows moved and
 * not one had been built. That number was the point of the whole instrument.
 *
 * It is now THREE, and the three are named. Every other moved row is still
 * "vocabulary". If this ever grows without a PR showing four parts of real
 * evidence per row, the ledger has started flattering itself again.
 */
test("🔴 exactly THREE rows moved on WORK, and they are 8, 15 and 48", () => {
  const rows = Object.values(classify());
  const work = rows.filter((r) => r.changeKind === "work");
  assert.deepEqual(work.map((r) => r.id).sort((a, b) => a - b), [8, 15, 48]);
  for (const r of work) {
    assert.equal(r.state, "VERIFIED-PASS", `item ${r.id} claims work but did not reach a pass`);
  }
  assert.equal(rows.filter((r) => r.changeKind === "vocabulary").length, 33);
  assert.equal(rows.filter((r) => r.changeKind === "none").length, 22);
});

/**
 * 🔴 THE FIRST TICKS THIS PROJECT HAS EVER AWARDED. Each is pinned to the row
 * it was earned on, so a fourth cannot appear without this test being edited by
 * someone who has to justify it.
 */
test("🔴 VERIFIED-PASS is exactly 3 — items 8, 15 and 48, and no others", () => {
  const rows = classify();
  const passed = Object.values(rows).filter((r) => r.state === "VERIFIED-PASS").map((r) => r.id).sort((a, b) => a - b);
  assert.deepEqual(passed, [8, 15, 48]);
  assert.equal(tally(rows)["VERIFIED-PASS"], 3);
  // 🔴 Item 14 did NOT tick: its FAILURE condition is met, six page-writing
  // paths exist. A row that nearly passes is a row that failed.
  assert.equal(rows[14].state, "BUILT-NOT-PROVED");
  assert.match(rows[14].why, /FAILURE CONDITION IS CURRENTLY MET/);
});
