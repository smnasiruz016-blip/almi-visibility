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
} from "../tools/verify-pass-boundaries-source.mjs";
import { loadBoundaries, CONTRACT_PARTS, HALF_CONTRACT_PARTS } from "../src/checklist/boundaries.mjs";
import { classify, assertLawful, assertTransitions, tally, STATES, LOOKED, MOVES_AMENDMENT_2 } from "../src/checklist/classification.mjs";

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
  // Amendment 4's addendum supplies rows 3 and 7's v0.1-half contracts, so it is searched too.
  const flat = [SOURCE, AMENDMENT, `${REPO}PASS_BOUNDARIES_AMENDMENT_2.md`, `${REPO}PASS_BOUNDARIES_AMENDMENT_4.md`]
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
  // §4+A1 — the splits §4 named; §6+A1 — item 25, split inline in §6;
  // §4+A1+A2 — item 14, whose Amendment 1 contract Amendment 2 replaced.
  // §6+A4 — rows 3 and 7, whose v0.1-half contract Amendment 4's addendum supplied.
  assert.deepEqual(via, { "§6": 48, "§6+A4": 2, "§4+A1": 4, "§4+A1+A2": 1, "§6+A1": 1, "§5": 2 });
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
test("the seven-state tally is 7 / 5 / 1 / 17 / 1 / 4 / 23", () => {
  assert.deepEqual(tally(classify()), {
    "NOT-STARTED": 7,
    "BUILT-NOT-PROVED": 5,
    "TESTABLE-NOW": 1,
    "VERIFIED-PASS": 17,
    FAILED: 1,
    "BLOCKED-UNKNOWN": 4,
    DEFERRED: 23,
  });
});

test("every state used is one of the seven, and every row is classified", () => {
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
test("🔴 exactly TWENTY rows moved on WORK — 9 BLOCKED; 25 TESTABLE-NOW; 50 FAILED (reopened); the rest PASS", () => {
  const rows = Object.values(classify());
  const work = rows.filter((r) => r.changeKind === "work");
  assert.deepEqual(work.map((r) => r.id).sort((a, b) => a - b), [8, 9, 11, 12, 13, 14, 15, 25, 26, 38, 42, 45, 47, 48, 49, 50, 51, 53, 55, 56]);
  assert.deepEqual(work.filter((r) => !LOOKED.includes(r.state)).map((r) => `${r.id}:${r.state}`), ["9:BLOCKED-UNKNOWN", "25:TESTABLE-NOW"]);
  assert.deepEqual(work.filter((r) => r.state === "FAILED").map((r) => r.id), [50]);
  // 🔴 Amendment 4: rows 3–7 are NOT-STARTED again, which is where the 11 September baseline had them — so
  // against THAT baseline they did not move ("vocabulary" 30 → 25, "none" 8 → 13). Their ruling move is
  // declared against the ledger they left, and it is never counted as work.
  assert.equal(rows.filter((r) => r.changeKind === "vocabulary").length, 25);
  assert.equal(rows.filter((r) => r.changeKind === "none").length, 13);
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
  const b = Object.values(loadBoundaries());
  const count = (key) => b.reduce((n, r) => ({ ...n, [r[key]]: (n[r[key]] ?? 0) + 1 }), {});
  assert.deepEqual(count("class"), { P: 27, D: 23, S: 8 });
  assert.deepEqual(count("frozenClass"), { ...EXPECTED_CLASS_COUNTS });
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
test("🔴 CONTRACT GUARD: rows 3 and 7 are contract-complete and ACCEPTED by the contract law — and still REFUSED a tick; row 4 is the control", () => {
  const b = loadBoundaries();
  for (const id of [3, 7, 4]) {
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

test("🔴 the five arrive NOT-STARTED by a RULING move and nothing else; row 2 says WHY it stayed; row 7 puts WORTHINESS in the deferred half", () => {
  const rows = classify();
  for (const id of [3, 4, 5, 6, 7]) {
    assert.equal(rows[id].state, "NOT-STARTED");
    const chain = MOVES_AMENDMENT_2[id];
    assert.equal(chain.length, 1);
    assert.deepEqual([chain[0].from, chain[0].to, chain[0].kind, chain[0].route], ["DEFERRED", "NOT-STARTED", "ruling", "OWNER_RULING"]);
    assert.match(chain[0].ruling, /PASS_BOUNDARIES_AMENDMENT_4\.md/);
    assert.match(rows[id].why, /a class change is not progress/);
  }
  assert.deepEqual(Object.values(rows).filter((r) => r.changeKind === "work" && [2, 3, 4, 5, 6, 7].includes(r.id)), []);
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
test("🔴 VERIFIED-PASS is exactly 17 — items 8, 11, 12, 13, 14, 15, 26, 38, 42, 45, 47, 48, 49, 51, 53, 55 and 56 — and 48's reopen stays on the record", () => {
  const rows = classify();
  const passed = Object.values(rows).filter((r) => r.state === "VERIFIED-PASS").map((r) => r.id).sort((a, b) => a - b);
  assert.deepEqual(passed, [8, 11, 12, 13, 14, 15, 26, 38, 42, 45, 47, 48, 49, 51, 53, 55, 56]);
  assert.equal(tally(rows)["VERIFIED-PASS"], 17);
  assert.equal(rows[56].route, "OWNER_VERIFICATION", "item 56's tick did not come from the owner's eye");
  assert.match(rows[51].whyFailed, /FAILURE CONDITION IS MET/, "item 51's FAILED result was erased rather than kept");
  assert.match(rows[50].whyStillFailed, /IT STAYS FAILED/, "item 50's argued reading is not on the row");
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
