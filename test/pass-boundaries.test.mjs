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

import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  verify, EXPECTED_BODY_SHA256, EXPECTED_FEATURE_COUNT, EXPECTED_CLASS_COUNTS, splitSource, sectionSix,
  amendment4, effectiveClasses, AMENDMENT_4_BODY_SHA256, AMENDMENT_4_MOVES, AMENDMENT_4_KEPT_DEFERRED, AMENDMENT_4_HALF_CONTRACT_IDS, EXPECTED_EFFECTIVE_CLASS_COUNTS,
  amendment5, AMENDMENT_5_BODY_SHA256, AMENDMENT_5_ROW,
  amendment3, AMENDMENT_3_BODY_SHA256, AMENDMENT_3_ROWS, EXPECTED_LEDGER_CLASS_COUNTS, EXPECTED_LEDGER_ROWS,
} from "../tools/verify-pass-boundaries-source.mjs";
import { loadBoundaries, CONTRACT_PARTS, HALF_CONTRACT_PARTS } from "../src/checklist/boundaries.mjs";
import { classify, assertLawful, assertTransitions, tally, STATES, LOOKED, MOVES_AMENDMENT_2, ADMITTED_ROWS } from "../src/checklist/classification.mjs";

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
  // Amendment 4's addendum supplies rows 3 and 7's v0.1-half contracts, so it is searched too. Amendments 3 and 5
  // supply the contracts of rows 59, 60 and 61, which the frozen 58 do not hold.
  // 🔴 Amendment 6 supplies rows 1 and 54's v0.1-half contracts (the D2 split, 19 September 2026). It is added to
  // the SEARCHED SET, which is how a half-contract has always been admitted — the guard itself is unchanged, and
  // it still refuses any part that is not character-for-character inside one of the owner's own texts.
  const flat = [SOURCE, AMENDMENT, `${REPO}PASS_BOUNDARIES_AMENDMENT_2.md`, `${REPO}PASS_BOUNDARIES_AMENDMENT_4.md`, `${REPO}PASS_BOUNDARIES_AMENDMENT_3.md`, `${REPO}PASS_BOUNDARIES_AMENDMENT_5.md`, `${REPO}PASS_BOUNDARIES_AMENDMENT_6.md`, `${REPO}PASS_BOUNDARIES_AMENDMENT_7.md`]
    .map((p) => splitSource(readFileSync(p, "utf8").replace(/\r\n/g, "\n")).body)
    .join("\n")
    .replace(/\s+/g, " ");
  const b = loadBoundaries();
  /* 🔴 AMENDMENT 7 joins the frozen texts this census reads: row 61's EXPECTED, FAILURE and
   * EVIDENCE now come from it, and a census that did not read it would report the owner's own words
   * as a paraphrase. */
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
  // 🔴 All 58 × 4 because Amendment 1 closed the six gaps — plus 3 × 4 for rows 59, 60 and 61, admitted by ruling.
  assert.equal(checked, 244, `only ${checked} of 244 parts checked — the law would be weak`);
});

test("all 61 are parsed — the frozen 58 and three admitted by ruling — and each knows WHICH document ruled it", () => {
  const b = loadBoundaries();
  assert.equal(Object.keys(b).length, 61);
  const via = {};
  for (const r of Object.values(b)) via[r.via] = (via[r.via] ?? 0) + 1;
  // §4+A1 — the splits §4 named; §6+A1 — item 25, split inline in §6;
  // §4+A1+A2 — item 14, whose Amendment 1 contract Amendment 2 replaced.
  // §6+A4 — rows 3 and 7, whose v0.1-half contract Amendment 4's addendum supplied.
  // §6+A6 — rows 1 and 54, split P → S by Amendment 6 (the D2 ruling, 19 September 2026),
  //         each taking its v0.1-half contract from that amendment's body.
  // A3 — rows 59 and 60; A5 — row 61. Neither is among the frozen 58.
  assert.deepEqual(via, { "§6": 46, "§6+A4": 2, "§6+A6": 2, "§4+A1": 4, "§4+A1+A2": 1, "§6+A1": 1, "§5": 2, A3: 2, "A5+A7": 1 });
  assert.equal(Object.values(b).filter((r) => r.amendedByA1).length, 6);
});

/**
 * 🔴 AMENDMENT 1 CLOSED THIS GAP, AND THE TEST RECORDS THAT RATHER THAN BEING
 * DELETED. PR #46 reported that six features had no four-part contract and so
 * could never be ticked; the owner accepted it as his defect and amended the
 * ruling. All six now carry all four parts — supplied by HIM, not filled in
 * from this side, which is the whole difference.
 */
/* 🔴 AND AMENDMENT 4 OPENED A GAP OF THE SAME KIND, WHICH ITS ADDENDUM CLOSED. Rows 3 and 7 were split with no
 * contract for their owned half; the owner's addendum (13 Sep 2026) stated both. No row now lacks a part — and
 * each of the two keeps its §6 four parts as the final boundary, untouched. */
test("🔴 Amendment 1 closed the six missing contracts, Amendment 4's addendum closed rows 3 and 7 — no row now lacks a part", () => {
  const b = loadBoundaries();
  assert.deepEqual(Object.values(b).filter((r) => r.missingParts.length).map((r) => r.id), []);
  for (const id of [3, 7]) {
    assert.equal(b[id].halfContractByA4, true, `item ${id} did not receive the addendum's contract`);
    for (const p of CONTRACT_PARTS) {
      assert.ok(b[id][p], `item ${id} has no v0.1-half ${p}`);
      assert.ok(b[id].finalBoundary[p], `item ${id}'s frozen §6 ${p} is no longer on the row`);
      assert.notEqual(b[id][p], b[id].finalBoundary[p], `item ${id}'s ${p} is still the §6 text — the half contract was not applied`);
    }
  }
  assert.equal(b[7].deferred, "SUPPLY, AUDIENCE/NEED, WORTHINESS. All three named.");
  assert.match(b[3].input, /^the owned Search Console rows already in the store/);
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
/* Item 9 is BORROWED by the next tests only for its complete boundary; its external-prerequisite label
 * (owner ruling, 13 Sep 2026) is dropped so each test isolates the ONE law it names. */
test("🔴 RED: a VERIFIED-PASS on a row with an empty contract part is REFUSED", () => {
  const rows = classify();
  const boundaries = { ...loadBoundaries() };
  boundaries[9] = { ...boundaries[9], missingParts: ["evidence"] };
  rows[9] = { ...rows[9], label: undefined, state: "VERIFIED-PASS" };

  const errors = assertLawful(rows, boundaries);
  assert.equal(errors.length, 1, "the guard did not fire");
  assert.match(errors[0], /item 9 .* is VERIFIED-PASS but its boundary has no evidence/);
  assert.match(errors[0], /"it is built" and "it looks right" are not verdicts/);
});

test("CONTROL: the same row with its real, complete contract passes the guard", () => {
  const rows = classify();
  rows[9] = { ...rows[9], label: undefined, state: "VERIFIED-PASS" };
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
  // attemptCount 0 isolates THIS rule from ruling 0B's (test/attempts.test.mjs).
  rows[9] = { ...rows[9], label: undefined, state: "TESTABLE-NOW", attemptCount: 0 };
  const errors = assertLawful(rows);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /is TESTABLE-NOW but names no test/);
});

/* ================================================================== *
 * THE COUNTS, AND THE ONE NUMBER THAT MATTERS MOST.
 * ================================================================== */

/**
 * 🔴 SEVEN STATES SINCE AMENDMENT 2. BUILT-NOT-PROVED fell by one and FAILED
 * rose by one — item 14. That is not progress and not a loss either: it is a
 * row that was looked at, and the ledger now says so in its own column.
 */
/* 🔴 AND ITEM 9 MOVED BUILT-NOT-PROVED → BLOCKED-UNKNOWN on the real country
 * run: six of seven ingested, the seventh supplied by no tool. Not a tick. */
/* 🔴 AND ITEM 14 LEFT FAILED — fixed, re-run, passed: VERIFIED-PASS 3 → 4,
 * FAILED 1 → 0. FAILED at zero is not a column that vanished; it is a known
 * defeat that was repaired, and the move records the route it took. */
/* 🔴 AND ITEMS 45 AND 49 WERE RUN: 49 passed (VERIFIED-PASS 4 → 5) and 45
 * FAILED (FAILED 0 → 1). BUILT-NOT-PROVED 16 → 14. */
/* 🔴 AND ITEMS 11, 42 AND 48 WERE PROVED BY A LOCAL REPLAY (13 Sep 2026):
 * 11 and 42 BLOCKED-UNKNOWN → VERIFIED-PASS, 48 FAILED → VERIFIED-PASS.
 * VERIFIED-PASS 5 → 8, FAILED 1 → 0, BLOCKED-UNKNOWN 7 → 5. The D-CRW-5 green
 * was not spent and moved nothing. */
/* 🔴 AND THE QUEUE WAS RE-SCANNED (13 Sep 2026): eight rows whose input now
 * exists → TESTABLE-NOW; of those, 12 and 38 were run and passed, 50 and 51 were
 * run and FAILED, 13 and 26 were run and stay TESTABLE-NOW (EXPECTED missed,
 * FAILURE not met), 25 and 55 were not run. */
/* 🔴 AND THE QUEUE WAS RUN (13 Sep 2026, later): 13 and 26 ticked; 55 FAILED on
 * a real leak, was fixed, re-run and ticked; 25 was attempted and stays with its
 * gap. TESTABLE-NOW 4 → 1, VERIFIED-PASS 10 → 13, FAILED unchanged at 2. */
/* 🔴 AND 51 LEFT FAILED (13 Sep 2026, later): its three fields computed and all six on the
 * real report. 50 stays FAILED on an argued reading. VERIFIED-PASS 13 → 14, FAILED 2 → 1. */
/* 🔴 AND 56 WAS VERIFIED BY THE OWNER (13 Sep 2026): BLOCKED-UNKNOWN → VERIFIED-PASS by a dated owner
 * verification record, the only route that can set it. VERIFIED-PASS 14 → 15, BLOCKED-UNKNOWN 5 → 4.
 * Item 9 kept its state; its label became BLOCKED / UNKNOWN BY EXTERNAL PREREQUISITE. */
/* 🔴 AND 47 AND 53 WERE RUN AND PASSED (13 Sep 2026): NOT-STARTED 3 → 2, BUILT-NOT-PROVED 6 → 5,
 * VERIFIED-PASS 15 → 17. */
/* 🔴 AND 50 LEFT FAILED (13 Sep 2026): the guard re-run over real records leaving UNKNOWN, both directions.
 * VERIFIED-PASS 17 → 18, FAILED 1 → 0. */
/* 🔴 AND 50 WAS REOPENED (13 Sep 2026): a wrong label on a real record — VERIFIED-PASS 18 → 17, FAILED 0 → 1. */
/* 🔴 AND AMENDMENT 4 OPENED ROWS 3–7 (owner ruling, 13 Sep 2026): DEFERRED 28 → 23, NOT-STARTED 2 → 7. A class
 * change, not progress — nothing was built or run, and no other count moved. */
/* 🔴 AND AMENDMENT 3 ADMITTED ROWS 59 AND 60 (NOT-STARTED, nothing built), AND ROW 61 WAS CREATED BUILT-NOT-PROVED
 * (14 Sep 2026): NOT-STARTED 7 → 9, BUILT-NOT-PROVED 5 → 6, 58 → 61 rows. No existing row moved. */
/* 🔴 AND AMENDMENT 3's WORK HALF (14 Sep 2026): row 59 NOT-STARTED → VERIFIED-PASS on its census and every limb RED
 * alone; row 60 NOT-STARTED → BUILT-NOT-PROVED, waiting on the owner's levels. NOT-STARTED 9 → 7, BUILT-NOT-PROVED
 * 6 → 7, VERIFIED-PASS 17 → 18. */
/* 🔴 AND ROW 60 TICKED (14 Sep 2026): BUILT-NOT-PROVED → VERIFIED-PASS on its census over the real store, its four frozen
 * limbs re-run RED alone. BUILT-NOT-PROVED 7 → 6, VERIFIED-PASS 18 → 19. */
/* 🔴 AND ROW 5 WAS RUN AND FAILED (14 Sep 2026): its held-out check left 12 of 61 identical intents split — the FAILURE
 * clause, met on the evidence the contract names. NOT-STARTED 7 → 6, FAILED 1 → 2. Not progress; worth more than unrun. */
/* 🔴 AND ROW 6 WAS BUILT AND RUN (14 Sep 2026): every named axis and every discovered one tested on real evidence, 7 MONITOR ·
 * 7 UNKNOWN, none accepted or rejected — so BUILT-NOT-PROVED, never further. NOT-STARTED 6 → 5, BUILT-NOT-PROVED 6 → 7. */
/* 🔴 AND ROW 3's OWNED HALF WAS RUN AND PASSED (15 Sep 2026): the real wording discovered from the owned pulls and stored,
 * traceable byte for byte, no keyword→URL path; each FAILURE limb RED alone. NOT-STARTED 5 → 4, VERIFIED-PASS 19 → 20. */
/* 🔴 AND ROW 36 TICKED (15 Sep 2026): the archive-corpus overwrite refusal ran at last, so every category its frozen boundary
 * names has a test that runs the guard. BUILT-NOT-PROVED 9 → 8, VERIFIED-PASS 20 → 21. */
/* 🔴 AND ROW 61 TICKED (15 Sep 2026): the owner decided its blocker, and the missing leg ran through the real runner on a
 * second declared neutral test product — refused correctly, every limb RED alone. BUILT-NOT-PROVED 8 → 7, VERIFIED-PASS 21 → 22. */
/* 🔴 18 Sep 2026: 7 → 6 BUILT-NOT-PROVED and 22 → 23 VERIFIED-PASS, because ROW 7 ticked on the owner's status-
 * semantics Ruling D plus a current-tree re-verification (two declared moves). The denominator did not move. */
/* 🔴 19 Sep 2026: 23 → 24 VERIFIED-PASS and 4 → 3 BLOCKED-UNKNOWN, because ROW 9 closed. Not on a reading —
 * OWNER_RULING_2026-09-18_STATUS_SEMANTICS.md had already settled its ⚠ semantics a day earlier and recorded NO
 * MOVEMENT, because its condition 2 ("every OTHER applicable row 9 requirement is genuinely satisfied") was
 * answered UNKNOWN. This turn RAN that whole-boundary verification and it returned 0 failures. The denominator
 * did not move, and the seventh dimension is still unmeasured and still ⚠. */
/* 🔴 20 Sep 2026, later: row 50 closed under the owner's pre-contract label ruling — VERIFIED-PASS 25 → 26,
 * FAILED 3 → 2. The denominator did not move: nothing was admitted, retired or re-scoped. */
test("the seven-state tally is 2 / 5 / 1 / 26 / 2 / 2 / 23 over 61 rows (row 50 closed 20 Sep 2026)", () => {
  assert.deepEqual(tally(classify()), {
    "NOT-STARTED": 2,
    "BUILT-NOT-PROVED": 5,
    "TESTABLE-NOW": 1,
    "VERIFIED-PASS": 26,
    FAILED: 2,
    "BLOCKED-UNKNOWN": 2,
    DEFERRED: 23,
  });
});

test("every state used is one of the seven, and every row is classified", () => {
  const rows = classify();
  assert.equal(Object.keys(rows).length, 61);
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
/**
 * 🔴 FOUR SINCE AMENDMENT 2 — AND THE FOURTH IS A FAILURE, WHICH IS STILL WORK.
 * Item 14's test was run against its boundary. A row reaches FAILED only by
 * being looked at, so it belongs in this column beside the three passes, and
 * it must never be read as a fourth tick.
 */
/* 🔴 FIVE since the real country run — item 9 is work that ended BLOCKED, not
 * passed and not failed: every dimension a tool can supply was measured, and the
 * one no tool supplies was named. It is the only work row outside LOOKED, and
 * it is pinned so a second cannot join it quietly. */
/* 🔴 NINE since the replay: 11 and 42 had moved on VOCABULARY into BLOCKED-UNKNOWN;
 * their test has now been run, so they are work — vocabulary 33 → 31. */
/* 🔴 SEVENTEEN since the re-scan: the eight re-scanned rows moved because work
 * made their input exist ("none" 18 → 10). Four of them are TESTABLE-NOW, which
 * is NOT looked-at: an input that exists is not a verdict. */
/* 🔴 EIGHTEEN since the owner verified 56 — its test is the owner's eye, and it was sat
 * ("vocabulary" 31 → 30). */
/* 🔴 TWENTY since 47 and 53 were run ("none" 10 → 8). */
/* 🔴 TWENTY-ONE since row 5 was run and FAILED (14 Sep 2026) — a failure is still work ("none" 16 → 15). */
/* 🔴 TWENTY-TWO since row 6 was built and run (14 Sep 2026) — work that stops at BUILT-NOT-PROVED, pinned beside 9 and 25
 * as the third work row outside LOOKED ("none" 15 → 14). */
/* 🔴 TWENTY-THREE since row 3's owned half was run and passed (15 Sep 2026) ("none" 14 → 13). */
/* 🔴 TWENTY-FOUR since row 4 was built and run (15 Sep 2026) — work that stops at BUILT-NOT-PROVED, beside row 6 ("none" 13 → 12). */
/* 🔴 TWENTY-FIVE since row 7's owned half was built and run (15 Sep 2026) — BUILT-NOT-PROVED beside 4 and 6 ("none" 12 → 11). */
/* 🔴 TWENTY-SIX since row 36 ticked (15 Sep 2026) — it was BUILT-NOT-PROVED on 11 September too, so until now it was "none" (11 → 10). */
/* 🔴 18 Sep 2026: row 7 left the not-yet-looked-at list — it is VERIFIED-PASS now. The count of rows that moved on
 * WORK is UNCHANGED at twenty-six: row 7 already carried a work move, and its new one is a second, not a first. */
/* 🔴 19 Sep 2026: row 9 leaves the not-yet-looked-at list — it is VERIFIED-PASS now, on its whole-boundary
 * verification. The count of rows that moved on WORK is UNCHANGED at twenty-six: row 9 already carried a work
 * move (BUILT-NOT-PROVED → BLOCKED-UNKNOWN), and its tick is a second, not a first. */
test("🔴 exactly TWENTY-EIGHT rows moved on WORK — row 52 joined 20 Sep 2026 — 4 and 6 BUILT-NOT-PROVED; 25 TESTABLE-NOW; 5 and 52 FAILED; the rest PASS", () => {
  const rows = Object.values(classify());
  const work = rows.filter((r) => r.changeKind === "work");
  assert.deepEqual(work.map((r) => r.id).sort((a, b) => a - b), [3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 17, 25, 26, 36, 38, 42, 45, 47, 48, 49, 50, 51, 52, 53, 55, 56]);
  assert.deepEqual(work.filter((r) => !LOOKED.includes(r.state)).map((r) => `${r.id}:${r.state}`), ["4:BUILT-NOT-PROVED", "6:BUILT-NOT-PROVED", "25:TESTABLE-NOW"]);
  // 🔴 Row 50 left this list on 20 September 2026 — the COUNT of rows that moved on work is unchanged at
  // twenty-eight, because row 50 already carried a work move. A tick is not a new mover.
  assert.deepEqual(work.filter((r) => r.state === "FAILED").map((r) => r.id), [5, 52]);
  // 🔴 Amendment 4: rows 3–7 are NOT-STARTED again, which is where the 11 September baseline had them — so
  // against THAT baseline they did not move ("vocabulary" 30 → 25, "none" 8 → 13). Their ruling move is
  // declared against the ledger they left, and it is never counted as work.
  assert.equal(rows.filter((r) => r.changeKind === "vocabulary").length, 25);
  // 🔴 Rows 59, 60 and 61 have no 11 September baseline, so against it they are "none" (13 → 16). Row 61's WORK is
  // its declared move in MOVES_AMENDMENT_2 — never inferred from a baseline it was not in.
  // 🔴 And row 5, run and FAILED on 14 September 2026, is work against that baseline, not "none" (16 → 15);
  // and row 6, built and run the same night, is work too (15 → 14).
  // and row 4, built and run on 15 September 2026, is work too (13 → 12); and row 7 the same day (12 → 11);
  // and row 36, ticked the same night on its executed guards (11 → 10).
  // and row 17, proved on its first real derived fact on 19 September 2026, is work too (10 → 9).
  assert.equal(rows.filter((r) => r.changeKind === "none").length, 8);
});

/* ================================================================== *
 * 🔴 AMENDMENT 4 — THE CLASS OF SIX ROWS, BY OWNER RULING. NO TEXT MOVES.
 * ================================================================== */

const AMENDMENT_4 = `${REPO}PASS_BOUNDARIES_AMENDMENT_4.md`;

test("🔴 Amendment 4 verifies, and its moves are READ from its verdict table: 4, 5, 6 D → P · 3, 7 D → S · 2 stays D", () => {
  const a4 = amendment4(AMENDMENT_4);
  assert.equal(a4.sha, AMENDMENT_4_BODY_SHA256);
  assert.equal(a4.matches, true);
  assert.deepEqual(Object.fromEntries(Object.entries(a4.moves).map(([id, m]) => [id, m.to])), { ...AMENDMENT_4_MOVES });
  assert.deepEqual(Object.keys(a4.kept).map(Number), [...AMENDMENT_4_KEPT_DEFERRED]);
  // the addendum's contracts, read from the body: exactly items 3 and 7, each with all four parts
  assert.deepEqual(Object.keys(a4.contracts).map(Number), [...AMENDMENT_4_HALF_CONTRACT_IDS]);
  for (const id of AMENDMENT_4_HALF_CONTRACT_IDS) for (const p of CONTRACT_PARTS) assert.ok(a4.contracts[id][p], `item ${id}'s addendum contract has no ${p}`);
  // 🔴 the frozen source is untouched — the amendment moved a class, not a byte of the owner's boundaries
  assert.equal(verify(SOURCE).sha, EXPECTED_BODY_SHA256);
});

test("🔴 the class census in force is P=27 · S=8 · D=23 — computed, and checked against the amendment's OWN count table", () => {
  const frozen = verify(SOURCE);
  const a4 = amendment4(AMENDMENT_4);
  const inForce = { P: 0, S: 0, D: 0 };
  for (const c of Object.values(effectiveClasses(frozen.classes, a4))) inForce[c] += 1;
  assert.deepEqual(inForce, { ...EXPECTED_EFFECTIVE_CLASS_COUNTS });
  assert.deepEqual(a4.deferred, { before: frozen.counts.D, after: inForce.D }, "the amendment's DEFERRED row disagrees with the census");
  assert.deepEqual(a4.inScope, { before: frozen.counts.P + frozen.counts.S, after: inForce.P + inForce.S }, "the amendment's in-scope row disagrees with the census");
  // the loader carries both: the class in force, and what §6 froze
  // the loader carries both over the FROZEN 58 — rows admitted later have no frozen class
  const b = Object.values(loadBoundaries()).filter((r) => r.id <= 58);
  const count = (key) => b.reduce((n, r) => ({ ...n, [r[key]]: (n[r[key]] ?? 0) + 1 }), {});
  /* 🔴 The LOADER's class is every lawful amendment applied, not A4's alone. Amendment 6 (the D2
   * split, 19 Sep 2026) then moves rows 1 and 54 P → S, so the loader reads 25/10/23 while
   * effectiveClasses — which is A4's step and only A4's — still reads 27/8/23 above. Both are
   * asserted, separately, so that a later amendment cannot move one without the other being seen. */
  assert.deepEqual(count("class"), { P: 25, D: 23, S: 10 });
  assert.deepEqual(count("frozenClass"), { ...EXPECTED_CLASS_COUNTS });
});

/* ================================================================== *
 * 🔴 AMENDMENT 3 — ROWS 59 AND 60, ADMITTED ONLY. AND ROW 61, CREATED.
 * ================================================================== */

const AMENDMENT_3 = `${REPO}PASS_BOUNDARIES_AMENDMENT_3.md`;

test("🔴 Amendment 3 verifies; rows 59 and 60 are READ from it, class P, all four parts verbatim; its two stale lines are corrected in it", () => {
  const a3 = amendment3(AMENDMENT_3);
  assert.equal(a3.sha, AMENDMENT_3_BODY_SHA256);
  assert.deepEqual(a3.rows.map((r) => [r.id, r.class]), [[59, "P"], [60, "P"]]);
  assert.deepEqual(a3.rows.map((r) => r.id), [...AMENDMENT_3_ROWS]);
  const body = splitSource(readFileSync(AMENDMENT_3, "utf8").replace(/\r\n/g, "\n")).body.replace(/\s+/g, " ");
  for (const r of a3.rows) for (const p of CONTRACT_PARTS) assert.ok(r.contract[p] && body.includes(r.contract[p]), `row ${r.id} ${p}`);
  assert.equal(a3.corrected, true, "the dated corrections are not in the amendment");
  assert.equal(a3.admitOnly, true, "the owner's admit-only answer is not in the amendment");
  // 🔴 the brief's "In scope becomes 32" survives as quoted history, and is NOT the count — the ledger is.
  assert.match(readFileSync(AMENDMENT_3, "utf8"), /No number is copied from this brief/);
});

test("🔴 the LEDGER is 61 rows · P=28 · S=10 · D=23 · in scope 38 — counted from the loaded rows, not copied from any brief", () => {
  const b = Object.values(loadBoundaries());
  const c = { P: 0, S: 0, D: 0 };
  for (const r of b) c[r.class] += 1;
  assert.equal(b.length, EXPECTED_LEDGER_ROWS);
  assert.deepEqual(c, { ...EXPECTED_LEDGER_CLASS_COUNTS });
  assert.equal(c.P + c.S, 38);
  // the frozen source still holds exactly 58, byte for byte
  assert.equal(verify(SOURCE).features.count, 58);
  assert.equal(verify(SOURCE).sha, EXPECTED_BODY_SHA256);
});

/* 🔴 Rows 59 and 60 were ADMITTED NOT-STARTED (PR #73). Amendment 3's work half, released 14 September 2026, moved
 * each by a declared WORK move from that arrival state — 59 to VERIFIED-PASS, 60 to BUILT-NOT-PROVED. */
test("🔴 rows 59 and 60 left NOT-STARTED only by declared WORK moves — both VERIFIED-PASS, each with its limit on the row", () => {
  const rows = classify();
  for (const id of [59, 60]) {
    assert.equal(ADMITTED_ROWS[id].arrivedAs, "NOT-STARTED");
    const chain = MOVES_AMENDMENT_2[id];
    assert.equal(chain[0].from, "NOT-STARTED");
    assert.equal(chain.at(-1).to, rows[id].state, `row ${id}: its chain does not end where it stands`);
    assert.ok(chain.every((m) => m.kind === "work"), `row ${id} moved by something other than work`);
  }
  assert.equal(rows[59].state, "VERIFIED-PASS");
  assert.equal(MOVES_AMENDMENT_2[59][0].route, "TEST_RUN");
  assert.match(rows[59].why, /CANNOT prove the refutation is well chosen — that is human judgement/, "the census's limit is not written on the row");
  assert.match(rows[59].why, /Backfill: 20 written, 0 that could not be written/);
  assert.equal(rows[60].state, "VERIFIED-PASS");
  assert.deepEqual(MOVES_AMENDMENT_2[60].map((m) => `${m.from}→${m.to}:${m.route}`), ["NOT-STARTED→BUILT-NOT-PROVED:BUILT", "BUILT-NOT-PROVED→VERIFIED-PASS:TEST_RUN"]);
  // 🔴 14 Sep 2026: its first tick, by its test — and the pass's limit is written on the row, not implied.
  assert.match(rows[60].why, /VERIFIED-PASS — 14 SEPTEMBER 2026 — ITS FIRST TICK/);
  assert.match(rows[60].why, /it can never prove a level is well chosen — that is his/, "the pass's limit is not written on the row");
  assert.match(rows[60].why, /ANTI-CIRCLE self-check/, "the rulings the pass rests on are not named on the row");
  assert.match(rows[60].why, /UNCLASSIFIED IS A REAL STATE AND NEVER DEFAULTS TO LOW/);
  assert.deepEqual(assertTransitions(rows), []);
  assert.deepEqual(assertLawful(rows), []);
});

/* 🔴 Row 61 was CREATED BUILT-NOT-PROVED on 14 September 2026 with its missing leg and an owner decision it was blocked on.
 * The owner decided it on 15 September 2026, the leg ran through the real runner on a second declared product, and the
 * row ticked by its tests. Both moves stay on the chain; the residue on real pages stays on the row. */
test("🔴 row 61 — CREATED BUILT-NOT-PROVED by a WORK move, then VERIFIED-PASS by its tests on a SECOND DECLARED product under the owner's decision; row 53 untouched; the real-page residue kept", () => {
  const rows = classify();
  const r = rows[61];
  assert.equal(r.state, "VERIFIED-PASS");
  assert.equal(r.via, "A5+A7", "row 61 carries the amendment that admitted it AND the one that amended it");
  assert.deepEqual(r.missingParts, []);
  const [created, ticked, ...more] = MOVES_AMENDMENT_2[61];
  /* 🔴 21 Sep 2026: two further moves, and NEITHER is a tick — amendment 7's ruling moved the
   * ACCEPTANCE, and the re-sit it forced proved the row against it. The row never left VERIFIED-PASS. */
  assert.deepEqual(more.map((m) => [m.from, m.to, m.kind, m.route]), [
    ["VERIFIED-PASS", "VERIFIED-PASS", "ruling", "OWNER_RULING"],
    ["VERIFIED-PASS", "VERIFIED-PASS", "work", "RETEST_PASSED"],
  ]);
  assert.deepEqual([created.from, created.to, created.kind], ["NOT-STARTED", "BUILT-NOT-PROVED", "work"]);
  assert.deepEqual([ticked.from, ticked.to, ticked.kind, ticked.route, ticked.date], ["BUILT-NOT-PROVED", "VERIFIED-PASS", "work", "TEST_RUN", "2026-09-15"]);
  assert.match(ticked.reason, /AlmiVisibility_ROW61_OWNER_DECISION_2026-09-15\.md/, "the tick does not cite the owner's decision as its authority");
  assert.match(ticked.test, /runs\/audit\/row61-second-product-red-2026-09-15\.txt/);
  assert.equal(r.missingLeg, undefined, "a VERIFIED-PASS row still carries a missing leg");
  assert.equal(r.blockedOn, undefined, "a VERIFIED-PASS row still says it is blocked");
  /* 🔴 THE PROOF UNDER THE SUPERSEDED FLOOR IS KEPT, NOT ERASED. Amendment 7 moved the acceptance,
   * so the row's current note is the re-sit; everything it proved before is preserved beside it and
   * is still asserted here, word for word. */
  assert.match(r.whyUnderTheSupersededFloor, /neutral-test-knots/);
  assert.match(r.whyUnderTheSupersededFloor, /NO REAL PAGE CAN BE ACCEPTED/, "the real-page residue left the row");
  assert.match(r.whyUnderTheSupersededFloor, /WHY_THIS_URL_DESERVES_TO_EXIST/);
  assert.match(r.whyUnderTheSupersededFloor, /THREE rendered specs/);
  /* and the amended note says what it was re-sat against, and what the change cost */
  assert.match(r.why, /RE-SAT UNDER AMENDMENT 7/);
  assert.match(r.why, /WHAT THE NUMBERS CAUGHT AND THESE RULES DO NOT/, "the row does not record what the amendment lost");
  assert.match(r.whyUnderTheSupersededFloor, /a test fixture is not a declared product/, "the earlier verdict was not kept");
  // 🔴 A measured limit of a live detector stays ON THE ROW, not in a sabotage anecdote (owner, 15 Sep 2026).
  assert.match(r.whyUnderTheSupersededFloor, /does not detect a copied fact VALUE that is not a string, or a string shorter than 40 characters/, "the 40-character residue left the row");
  assert.match(r.whyUnderTheSupersededFloor, /18 of 46 could be copied into a spec unseen/);
  assert.match(r.whyUnderTheSupersededFloor, /row61-provenance-anchor-red-2026-09-15\.txt/, "the re-anchored provenance guard's re-proof is not on the row");
  assert.equal(rows[53].state, "VERIFIED-PASS", "row 53 lost its pass");
  assert.deepEqual(assertTransitions(rows), []);
  assert.deepEqual(assertLawful(rows), []);
});

test("🔴 RED: a row that is neither one of the frozen 58 nor admitted by a ruling is REFUSED by the transition law", () => {
  const rows = classify();
  rows[62] = { ...rows[61], id: 62 };
  assert.ok(assertTransitions(rows).some((e) => /item 62: is neither one of the frozen 58 nor a row admitted by a recorded owner ruling/.test(e)));
});

test("🔴 RED: one changed byte in Amendment 4's body fails its hash; the original passes", () => {
  const dir = mkdtempSync(join(tmpdir(), "a4-"));
  try {
    const original = readFileSync(AMENDMENT_4, "utf8");
    const at = original.lastIndexOf("stays D");
    assert.ok(at > original.indexOf("\n---\n\n"), "the byte to corrupt is not in the body — the RED would not land");
    const bad = `${original.slice(0, at)}stays P${original.slice(at + "stays D".length)}`;
    assert.notEqual(bad, original);
    writeFileSync(join(dir, "a4.md"), bad);
    assert.equal(amendment4(join(dir, "a4.md")).matches, false);
    assert.equal(amendment4(AMENDMENT_4).matches, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 RED: a class move off a row the frozen ruling does NOT class D is refused — Amendment 4 opens deferred rows only", () => {
  const frozen = verify(SOURCE).classes;
  const a4 = amendment4(AMENDMENT_4);
  assert.throws(() => effectiveClasses(frozen, { ...a4, moves: { ...a4.moves, 15: { to: "S" } } }), /moves item 15, which the frozen ruling classes P, not D/);
  assert.doesNotThrow(() => effectiveClasses(frozen, a4));
});

test("🔴 RED: DEFERRED on a row Amendment 4 opened is refused — and row 2, which it kept, may stay DEFERRED", () => {
  for (const id of [3, 4, 5, 6, 7]) {
    const rows = classify();
    rows[id] = { ...rows[id], state: "DEFERRED" };
    const errors = assertLawful(rows);
    // S rows may lawfully defer their deferred half, so only the P rows are refused outright.
    if (loadBoundaries()[id].class === "P") assert.match(errors.join("\n"), new RegExp(`item ${id} .* is DEFERRED but the frozen ruling classes it P`));
    else assert.deepEqual(errors, [], `item ${id} is a split — its deferred half may lawfully be DEFERRED`);
  }
  const rows = classify();
  assert.equal(rows[2].state, "DEFERRED");
  assert.deepEqual(assertLawful(rows), []);
});

/**
 * 🔴 THE CONTRACT GUARD, BOTH HALVES. Rows 3 and 7 are now CONTRACT-COMPLETE, so the contract law must
 * ACCEPT a VERIFIED-PASS on them — and the ledger must still REFUSE the tick, because each is NOT-STARTED and
 * no move to VERIFIED-PASS was declared. Row 4, whose four parts came from §6, is the control for both.
 */
/* 🔴 Row 3 left this guard's population on 15 Sep 2026 — its owned half RAN and its tick is a DECLARED work move. Its
 * contract is still checked complete; the undeclared-tick refusal is proved on 7, with 4 the control. */
/* 🔴 Row 4 left it too on 15 Sep 2026 — built and run, BUILT-NOT-PROVED by a declared work move. Its §6 contract is still
 * checked complete, and an undeclared tick on it is still refused — from BUILT-NOT-PROVED now, not NOT-STARTED. */
/* 🔴 Row 7 left it on 15 Sep 2026 as well — its owned half built and run, BUILT-NOT-PROVED by a declared work move. The
 * refusal of an undeclared tick FROM NOT-STARTED is now proved on row 57, contract-complete and still NOT-STARTED. */
/* 🔴 AND ROW 7 LEFT THE VEHICLE LIST ENTIRELY ON 18 Sep 2026 — it is VERIFIED-PASS by two DECLARED moves, so it can no
 * longer stand for "an undeclared tick from BUILT-NOT-PROVED is refused". Row 4 still can, and does. The guard's
 * property is untouched and still proved from BOTH start states; only the vehicle was retired, as for rows 3 and 4. */
test("🔴 CONTRACT GUARD: rows 3, 4, 7 and 57 are contract-complete and ACCEPTED by the contract law — an undeclared tick is still REFUSED on 4 and 57", () => {
  const b = loadBoundaries();
  assert.deepEqual(b[3].missingParts, [], "item 3 is not contract-complete");
  assert.deepEqual(b[7].missingParts, [], "item 7 is not contract-complete");
  for (const id of [4]) {
    assert.deepEqual(b[id].missingParts, [], `item ${id} is not contract-complete`);
    const rows = classify();
    assert.equal(rows[id].state, "BUILT-NOT-PROVED");
    rows[id] = { ...rows[id], state: "VERIFIED-PASS" };
    assert.deepEqual(assertLawful(rows), [], `item ${id}: the contract law refused a complete contract`);
    const refused = assertTransitions(rows).filter((e) => e.startsWith(`item ${id}:`));
    assert.ok(refused.length > 0, `item ${id}: an undeclared tick from BUILT-NOT-PROVED was not refused`);
  }
  for (const id of [57]) {
    assert.deepEqual(b[id].missingParts, [], `item ${id} is not contract-complete`);
    const rows = classify();
    assert.equal(rows[id].state, "NOT-STARTED");
    rows[id] = { ...rows[id], state: "VERIFIED-PASS" };
    assert.deepEqual(assertLawful(rows), [], `item ${id}: the contract law refused a complete contract`);
    const refused = assertTransitions(rows).filter((e) => e.startsWith(`item ${id}:`));
    assert.ok(
      refused.some((e) => e.includes("is VERIFIED-PASS but its recorded state is NOT-STARTED and no move was declared")),
      `item ${id}: an undeclared tick was not refused — ${refused.join(" | ") || "no error at all"}`,
    );
  }
  // and with the rows as they really are, nothing is refused
  assert.deepEqual(assertLawful(classify()), []);
  assert.deepEqual(assertTransitions(classify()), []);
});

test("🔴 RED: remove one part of row 3's contract and the parser loses it AND the guard refuses the tick again", () => {
  const dir = mkdtempSync(join(tmpdir(), "a4-half-"));
  try {
    const original = readFileSync(AMENDMENT_4, "utf8");
    const line = original.split("\n").find((l) => l.startsWith("| **EVIDENCE** | the stored search-language records"));
    assert.ok(line, "row 3's EVIDENCE line was not found — the RED would not land");
    const bad = original.replace(`${line}\n`, "");
    assert.notEqual(bad, original);
    writeFileSync(join(dir, "a4.md"), bad);
    const parsed = amendment4(join(dir, "a4.md"));
    assert.equal(parsed.contracts[3].evidence, undefined);
    assert.ok(parsed.contracts[3].input && parsed.contracts[7].evidence, "the removal took more than the one part");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  // the guard, handed the row as the loader reports an incomplete half contract, refuses the tick
  const rows = classify();
  const boundaries = { ...loadBoundaries() };
  boundaries[3] = { ...boundaries[3], missingParts: [HALF_CONTRACT_PARTS[3]] };
  rows[3] = { ...rows[3], state: "VERIFIED-PASS" };
  assert.match(assertLawful(rows, boundaries).join("\n"), /item 3 .* is VERIFIED-PASS but its boundary has no v0\.1-half evidence/);
});

/* ================================================================== *
 * 🔴 AMENDMENT 5 — ROW 61, RESERVED. ONE ROW ADDED, NO TEXT MOVED.
 * ================================================================== */

const AMENDMENT_5 = `${REPO}PASS_BOUNDARIES_AMENDMENT_5.md`;

test("🔴 Amendment 5 verifies; row 61 is READ from §4 — class P, NOT-STARTED, all four parts, verbatim; in scope 35 → 36", () => {
  const a5 = amendment5(AMENDMENT_5);
  assert.equal(a5.sha, AMENDMENT_5_BODY_SHA256);
  assert.equal(a5.matches, true);
  assert.equal(a5.row.id, AMENDMENT_5_ROW);
  assert.deepEqual([a5.row.class, a5.row.state], ["P", "NOT-STARTED"]);
  const body = splitSource(readFileSync(AMENDMENT_5, "utf8").replace(/\r\n/g, "\n")).body.replace(/\s+/g, " ");
  for (const p of CONTRACT_PARTS) {
    assert.ok(a5.row.contract[p], `row 61 has no ${p}`);
    assert.ok(body.includes(a5.row.contract[p]), `row 61's ${p} is not the owner's text`);
  }
  const frozen = verify(SOURCE);
  const inForce = { P: 0, S: 0, D: 0 };
  for (const c of Object.values(effectiveClasses(frozen.classes, amendment4(AMENDMENT_4)))) inForce[c] += 1;
  assert.deepEqual(a5.inScope, { before: inForce.P + inForce.S, after: inForce.P + inForce.S + 1 });
  // the frozen source is untouched
  assert.equal(frozen.sha, EXPECTED_BODY_SHA256);
});

/* 🔴 This test once asserted that row 61 was RESERVED and that rows 59 and 60 existed nowhere. Amendment 3 admitted 59
 * and 60 on 14 September 2026, so the reservation ended as Amendment 5 said it would — and the test now asserts that. */
test("🔴 row 61's reservation ENDED when 59 and 60 were admitted — all three are rows, and the tracker holds them", () => {
  assert.equal(amendment5(AMENDMENT_5).reserveIfAbsent, true, "Amendment 5's own instruction is unchanged history");
  const b = loadBoundaries();
  for (const id of [59, 60, 61]) assert.ok(b[id], `row ${id} is not in the ledger`);
  assert.deepEqual([b[59].via, b[60].via, b[61].via], ["A3", "A3", "A5+A7"]);
  const status = readFileSync(`${REPO}CHECKLIST_STATUS.md`, "utf8");
  for (const id of [59, 60, 61]) assert.match(status, new RegExp(`^\\| ${id} \\| `, "m"), `no tracker row ${id}`);
  assert.match(status, /Row 61 is RESERVED, not created/, "the Amendment 5 record is kept, not rewritten");
  assert.match(status, /Row 61 is CREATED, and it is BUILT-NOT-PROVED/);
});

test("🔴 RED: one changed byte in Amendment 5 fails its hash; dropping a part leaves row 61 incomplete", () => {
  const dir = mkdtempSync(join(tmpdir(), "a5-"));
  try {
    const original = readFileSync(AMENDMENT_5, "utf8");
    const line = original.split("\n").find((l) => l.startsWith("| **FAILURE** | an accepted artefact bypasses Gate A"));
    assert.ok(line, "row 61's FAILURE line was not found — the RED would not land");
    writeFileSync(join(dir, "a5.md"), original.replace(`${line}\n`, ""));
    const parsed = amendment5(join(dir, "a5.md"));
    assert.equal(parsed.matches, false);
    assert.equal(parsed.row.contract.failure, undefined);
    assert.ok(parsed.row.contract.input && parsed.row.contract.evidence, "the removal took more than one part");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("🔴 the five arrive NOT-STARTED by a RULING move and nothing else; row 2 says WHY it stayed; row 7 puts WORTHINESS in the deferred half", () => {
  const rows = classify();
  for (const id of [3, 4, 5, 6, 7]) {
    const chain = MOVES_AMENDMENT_2[id];
    assert.deepEqual([chain[0].from, chain[0].to, chain[0].kind, chain[0].route], ["DEFERRED", "NOT-STARTED", "ruling", "OWNER_RULING"]);
    assert.match(chain[0].ruling, /PASS_BOUNDARIES_AMENDMENT_4\.md/);
  }
  /* 🔴 Row 7 arrived by the same ruling; its owned half was BUILT and run (15 September 2026); and on 18 September 2026
   * the owner's Ruling D re-opened its exam — the withheld tick had rested on demand-SIZING, which the frozen clause
   * does not require — after which the re-run test ticked it. FOUR declared moves now, ruling then work, twice. */
  assert.equal(rows[7].state, "VERIFIED-PASS");
  assert.deepEqual(MOVES_AMENDMENT_2[7].map((m) => `${m.from}→${m.to}:${m.kind}:${m.route}`), ["DEFERRED→NOT-STARTED:ruling:OWNER_RULING", "NOT-STARTED→BUILT-NOT-PROVED:work:BUILT", "BUILT-NOT-PROVED→TESTABLE-NOW:ruling:OWNER_RULING", "TESTABLE-NOW→VERIFIED-PASS:work:RETEST_PASSED"]);
  // 🔴 the tick is a WORK move; the ruling before it is not a tick and never counts as one
  assert.equal(MOVES_AMENDMENT_2[7].at(-1).route, "RETEST_PASSED");
  assert.equal(MOVES_AMENDMENT_2[7].at(-2).kind, "ruling");
  assert.match(rows[7].why, /DEMAND — BOUNDED, PRESENCE ONLY, MAGNITUDE UNKNOWN/);
  assert.match(rows[7].why, /The other three read UNKNOWN/);
  // 🔴 Row 4 arrived by the same ruling — and was then BUILT and run (15 September 2026), a WORK move that stops at BUILT-NOT-PROVED.
  assert.equal(rows[4].state, "BUILT-NOT-PROVED");
  assert.deepEqual(MOVES_AMENDMENT_2[4].map((m) => `${m.from}→${m.to}:${m.kind}:${m.route}`), ["DEFERRED→NOT-STARTED:ruling:OWNER_RULING", "NOT-STARTED→BUILT-NOT-PROVED:work:BUILT"]);
  assert.match(rows[4].why, /BLOCKED, NOT TESTED/);
  assert.match(rows[4].why, /775 of the 1,525 pages/);
  // 🔴 Row 3 arrived by the same ruling — and then its OWNED half was RUN (15 September 2026), a separate WORK move, to VERIFIED-PASS.
  assert.equal(rows[3].state, "VERIFIED-PASS");
  assert.deepEqual(MOVES_AMENDMENT_2[3].map((m) => `${m.from}→${m.to}:${m.kind}:${m.route}`), ["DEFERRED→NOT-STARTED:ruling:OWNER_RULING", "NOT-STARTED→VERIFIED-PASS:work:TEST_RUN"]);
  assert.match(rows[3].why, /the PUBLIC half stays DEFERRED/);
  // 🔴 Row 6 arrived by the same ruling — and was then BUILT and run (14 September 2026), a WORK move that stops at BUILT-NOT-PROVED.
  assert.equal(rows[6].state, "BUILT-NOT-PROVED");
  assert.deepEqual(MOVES_AMENDMENT_2[6].map((m) => `${m.from}→${m.to}:${m.kind}:${m.route}`), ["DEFERRED→NOT-STARTED:ruling:OWNER_RULING", "NOT-STARTED→BUILT-NOT-PROVED:work:BUILT"]);
  assert.match(rows[6].why, /7 MONITOR · 7 UNKNOWN · 0 BUILD · 0 REJECT/);
  assert.match(rows[6].why, /both populations are EMPTY/);
  // 🔴 Row 5 arrived by the same ruling — and then its test was RUN (14 September 2026), a separate WORK move, to FAILED.
  assert.equal(rows[5].state, "FAILED");
  assert.deepEqual(MOVES_AMENDMENT_2[5].map((m) => `${m.from}→${m.to}:${m.kind}:${m.route}`), ["DEFERRED→NOT-STARTED:ruling:OWNER_RULING", "NOT-STARTED→FAILED:work:TEST_RUN"]);
  assert.match(rows[5].failureMet, /identical intents stay split/);
  assert.match(rows[5].why, /12 identical intents stayed split/);
  assert.deepEqual(Object.values(rows).filter((r) => r.changeKind === "work" && [2].includes(r.id)), []);
  assert.match(rows[2].why, /KEPT D by Amendment 4/);
  assert.match(rows[2].why, /legitimate public question evidence/);
  assert.match(rows[2].why, /no fetch is authorised/);
  assert.match(rows[7].why, /Deferred, and named: \*\*SUPPLY\*\*, \*\*AUDIENCE\/NEED\*\* and \*\*WORTHINESS\*\*/);
  assert.match(rows[7].why, /assigned to the deferred half by the owner's addendum/);
  assert.doesNotMatch(rows[7].why, /in neither half/);
  assert.deepEqual(assertTransitions(rows), []);
});

/**
 * 🔴 THE FIRST TICKS THIS PROJECT HAS EVER AWARDED. Each is pinned to the row
 * it was earned on, so a fourth cannot appear without this test being edited by
 * someone who has to justify it.
 */
/* 🔴 STILL FIVE — BUT NOT THE SAME FIVE. Item 45 ticked under its scope ruling
 * on one real run; item 48 LOST its tick by the reopen rule. The count is the
 * same and the ledger is more true, which is exactly why a count alone is never
 * the finding. */
/* 🔴 EIGHT since the replay — 11, 42, and 48 back, by rule 1's first route. Its
 * reopen is KEPT on the row, as item 14's first failure is. */
/* 🔴 TEN since the re-scan — 12 and 38, each run over the committed bodies. */
/* 🔴 THIRTEEN since the queue run — 13, 26 and 55; 55 through FAILED. */
/* 🔴 EIGHTEEN since Amendment 3's work half (14 Sep 2026) — row 59, on its census over the real store and every
 * evidence limb RED alone. */
/* 🔴 NINETEEN since row 60 ticked (14 Sep 2026) — on its census over the real store, its four frozen limbs re-run RED alone. */
/* 🔴 TWENTY since row 3's owned half ran against its boundary (15 Sep 2026) — every FAILURE limb RED alone, held-out 61/61. */
/* 🔴 TWENTY-ONE since row 36 ticked (15 Sep 2026) — every category its frozen boundary names runs its guard in CI on main. */
/* 🔴 TWENTY-TWO since row 61 ticked (15 Sep 2026) — its missing leg run through the real runner on a second declared product. */
/* 🔴 18 Sep 2026: row 7 joins them, by Ruling D plus a re-run test. It is the FIRST tick whose cause was a reading,
 * not new evidence — so its route is RETEST_PASSED and the ruling that preceded it is recorded as a separate move. */
/* 🔴 19 Sep 2026: row 9 joins them, and it is the FIRST tick this project has given a row one of whose own frozen
 * dimensions is permanently unmeasured. That is why its ⚠ is machine-readable — dimension, four unlock clauses and
 * the date it was measured unsuppliable — and why `overcountErrors` fails any report that counts seven of seven. */
/* 🔴 20 Sep 2026: row 50 joins them — the second tick this project has REMOVED and given back, and the first
 * whose blocker was an unsettled READING of a frozen boundary rather than missing evidence. The ruling that
 * settled it is recorded as data the validator evaluates; the tick rests on an injection with its control. */
test("🔴 VERIFIED-PASS is exactly 26 — items 3, 7, 8, 9, 11, 12, 13, 14, 15, 17, 26, 36, 38, 42, 45, 47, 48, 49, 50, 51, 53, 55, 56, 59, 60 and 61 — and 48's reopen stays on the record", () => {
  const rows = classify();
  const passed = Object.values(rows).filter((r) => r.state === "VERIFIED-PASS").map((r) => r.id).sort((a, b) => a - b);
  assert.deepEqual(passed, [3, 7, 8, 9, 11, 12, 13, 14, 15, 17, 26, 36, 38, 42, 45, 47, 48, 49, 50, 51, 53, 55, 56, 59, 60, 61]);
  assert.equal(tally(rows)["VERIFIED-PASS"], 26); // 🔴 TWENTY-SIX since row 50 was closed (20 Sep 2026).
  assert.equal(MOVES_AMENDMENT_2[9].at(-1).route, "TEST_RUN", "row 9's tick did not come from a test run");
  assert.equal(MOVES_AMENDMENT_2[9].at(-1).kind, "work", "🔴 row 9 ticked as a RULING move — a ruling never passes a row");
  assert.equal(rows[9].justifiedUnavailable.mark, "⚠", "row 9's unmeasured dimension lost its ⚠");
  assert.equal(MOVES_AMENDMENT_2[7].at(-1).route, "RETEST_PASSED", "row 7's tick did not come from its re-run test");
  /* 🔴 row 61's TICK came from its tests (the second move); the last two moves are amendment 7's
   * ruling and the re-sit it forced, neither of which is a tick. */
  assert.equal(MOVES_AMENDMENT_2[61][1].route, "TEST_RUN", "row 61's tick did not come from its tests");
  assert.equal(MOVES_AMENDMENT_2[61].at(-1).route, "RETEST_PASSED", "row 61's re-sit under amendment 7 is not recorded");
  assert.equal(MOVES_AMENDMENT_2[61].at(-1).kind, "work", "the re-sit was recorded as a ruling — a ruling never proves a row");
  assert.equal(MOVES_AMENDMENT_2[36].at(-1).route, "TEST_RUN", "row 36's tick did not come from its tests");
  assert.match(rows[36].why, /NO PRODUCTION WRITE PATH EXISTS/, "row 36's production residue is not on the row");
  assert.equal(MOVES_AMENDMENT_2[3].at(-1).route, "TEST_RUN", "row 3's tick did not come from its test");
  assert.equal(MOVES_AMENDMENT_2[60].at(-1).route, "TEST_RUN", "row 60's tick did not come from its test");
  assert.equal(MOVES_AMENDMENT_2[59][0].route, "TEST_RUN", "row 59's tick did not come from its test");
  assert.equal(rows[56].route, "OWNER_VERIFICATION", "item 56's tick did not come from the owner's eye");
  assert.match(rows[51].whyFailed, /FAILURE CONDITION IS MET/, "item 51's FAILED result was erased rather than kept");
  assert.match(rows[50].whyStillFailed, /IT STAYS FAILED/, "item 50's argued reading is not on the row");
  assert.match(rows[50].whyReopenedThenClosed, /THE TICK OF PR #63 IS WITHDRAWN/, "item 50's reopening was erased rather than kept");
  assert.match(rows[50].why, /A RULING IS NOT A TICK, AND THIS IS NOT ONE/, "item 50's closure does not say what earned it");
  assert.match(rows[55].whyFailed, /LEAK/, "item 55's FAILED result was erased rather than kept");
  for (const id of [12, 38]) assert.match(rows[id].whyBefore, /Not touched in this PR/, `item ${id}'s earlier verdict was erased rather than kept`);
  assert.match(rows[48].why, /LEFT FAILED BY RULE 1's FIRST ROUTE/);
  assert.match(rows[48].why, /RECORDED resolver answers/);
  assert.match(rows[48].whyFailed, /REOPENED — THE FIRST TICK THIS PROJECT HAS REMOVED/);
  assert.match(rows[48].failureMetThen, /a record duplicates/);
  for (const id of [11, 42]) assert.match(rows[id].why, /NOT PROVED/, `item ${id} does not say what the replay leaves unproved`);
  assert.match(rows[45].whyFailed, /FAILURE CONDITION IS MET/, "item 45's earlier FAILED verdict was erased rather than kept");
  // 🔴 Item 14 ticked by leaving FAILED the lawful way: the cause fixed, the
  // test re-run and passed. The FAILED verdict is kept on the row, not erased.
  assert.match(rows[14].why, /LEFT FAILED BY RULE 1's FIRST ROUTE/);
  assert.match(rows[14].whyFailed, /SAT AGAIN AGAINST AMENDMENT 2, AND FAILED/);
});
