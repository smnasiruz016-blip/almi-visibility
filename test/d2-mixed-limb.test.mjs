/**
 * THE D2 MIXED-LIMB SPLIT — `OWNER-RULING-D2-2026-09-19`.
 *
 * 🔴 WHAT THIS FILE IS FOR, AND WHAT IT DELIBERATELY DOES NOT CLAIM.
 *
 * D2 performed a BOUNDARY ACT: rows 1 and 54 move class P → S, each with a
 * v0.1-half contract and a named deferred limb. It created no new status
 * semantics — RR-02's Deferral Law and RR-52 Ruling 0 already hold — and it
 * ticked nothing. A RULING IS NOT A TICK.
 *
 * Each test below states which of the ruling's seven boundary-law clauses it
 * exercises, and — where the honest answer is that no detector exists — says
 * so in words rather than passing quietly. AN ABSENT DETECTOR NEVER SILENTLY
 * PASSES.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  amendment6, applySplitAmendment, AMENDMENT_6_BODY_SHA256, AMENDMENT_6_SPLIT_IDS,
  EXPECTED_SPLIT_CLASS_COUNTS, EXPECTED_EFFECTIVE_CLASS_COUNTS, EXPECTED_LEDGER_CLASS_COUNTS, EXPECTED_LEDGER_ROWS,
  effectiveClasses, verify, amendment4, EXPECTED_BODY_SHA256,
} from "../tools/verify-pass-boundaries-source.mjs";
import { loadBoundaries, CONTRACT_PARTS } from "../src/checklist/boundaries.mjs";
import { classify, assertLawful, tally } from "../src/checklist/classification.mjs";
import { provenanceErrors, classClause, movedBy } from "../src/checklist/provenance.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const A6 = `${REPO}PASS_BOUNDARIES_AMENDMENT_6.md`;
const SOURCE = `${REPO}PASS_BOUNDARIES_SOURCE.md`;
const A4 = `${REPO}PASS_BOUNDARIES_AMENDMENT_4.md`;

/* ================================================================== *
 * THE AMENDMENT ITSELF
 * ================================================================== */

test("🔴 Amendment 6 verifies against its recorded hash, and its moves are READ from the body — never typed", () => {
  const a6 = amendment6(A6);
  assert.equal(a6.sha, AMENDMENT_6_BODY_SHA256, "Amendment 6 has been altered since it was frozen");
  assert.equal(a6.matches, true);
  assert.deepEqual(Object.keys(a6.moves).map(Number).sort((x, y) => x - y), [...AMENDMENT_6_SPLIT_IDS]);
  for (const id of AMENDMENT_6_SPLIT_IDS) {
    assert.equal(a6.moves[id].to, "S");
    assert.equal(a6.moves[id].deferredLimb, "learning");
    for (const p of CONTRACT_PARTS) assert.ok(a6.contracts[id][p], `row ${id}'s v0.1 half has no ${p}`);
    assert.ok(a6.contracts[id].deferred, `row ${id} names no deferred half`);
    assert.ok(a6.contracts[id].deferredLimbs, `row ${id} declares no machine-readable deferred limbs`);
  }
});

test("🔴 RED: one changed byte in Amendment 6's body fails its hash; the original passes", () => {
  const dir = mkdtempSync(join(tmpdir(), "a6-"));
  try {
    const p = join(dir, "PASS_BOUNDARIES_AMENDMENT_6.md");
    const original = readFileSync(A6, "utf8");
    writeFileSync(p, original.replace("learning — rows 39, 40 and 41", "learning — rows 39, 40 and 42"));
    assert.equal(amendment6(p).matches, false, "a changed body still matched — the hash proves nothing");
    writeFileSync(p, original);
    assert.equal(amendment6(p).matches, true, "the restored body no longer matches — the harness is broken");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * 🔴 THE GUARD WAS NOT WIDENED, AND THIS IS THE PROOF.
 *
 * The cheapest way to land a P → S move was to relax `effectiveClasses`'s
 * `frozen[id] !== "D"` refusal. The ruling forbids it. So Amendment 4's rule is
 * untouched and STILL REFUSES, and the split rides on a second, separately
 * refusing function. Two narrow rules, not one wider one.
 */
test("🔴 RED: effectiveClasses STILL refuses a move off a non-D row — Amendment 4's guard was not widened", () => {
  const frozen = verify(SOURCE).classes;
  const a4 = amendment4(A4);
  assert.equal(frozen[1], "P", "row 1 is not frozen P — the premise of this test has moved");
  assert.equal(frozen[54], "P", "row 54 is not frozen P — the premise of this test has moved");
  assert.throws(
    () => effectiveClasses(frozen, { ...a4, moves: { ...a4.moves, 1: { to: "S" } } }),
    /moves item 1, which the frozen ruling classes P, not D/,
    "Amendment 4's D-only refusal has been widened to admit P",
  );
  assert.doesNotThrow(() => effectiveClasses(frozen, a4));
});

test("🔴 RED: applySplitAmendment refuses anything that is not currently P — it cannot re-class a deferred row, and cannot move a row twice", () => {
  const inForce = { 1: "P", 2: "D", 7: "S" };
  assert.throws(() => applySplitAmendment(inForce, { moves: { 2: { to: "S" } } }), /splits item 2, which is currently classed D, not P/);
  assert.throws(() => applySplitAmendment(inForce, { moves: { 7: { to: "S" } } }), /splits item 7, which is currently classed S, not P/);
  assert.deepEqual(applySplitAmendment(inForce, { moves: { 1: { to: "S" } } }), { 1: "S", 2: "D", 7: "S" });
});

/* ================================================================== *
 * §6 · 1 — RULE A CANNOT OVERRIDE ROW 9's FROZEN NOTE
 * ================================================================== */

/**
 * DETECTOR: EXISTS + FIRES. Row 9's NOTE is read from the frozen source and
 * survives the split amendment; the boundary-law's clause 2 admits a limb only
 * where an existing ruling classifies it DEFERRED or N/A, and a "justified
 * unavailable dimension" is neither — so D2 never reaches row 9.
 */
test("🔴 row 9's frozen NOTE survives D2 — a dimension no tool can supply is ⚠, and D2 does not make it a failure", () => {
  const b = loadBoundaries();
  assert.equal(b[9].class, "P", "row 9 was split — D2 does not authorise that");
  assert.equal(b[9].classByA6, undefined, "row 9 is carried by Amendment 6, which never names it");
  assert.match(b[9].note, /a dimension no tool can supply is `⚠`, not a failure/);
  assert.match(b[9].failure, /any dimension missing/);
  assert.notEqual(classify()[9].state, "FAILED", "row 9 has been forced to FAILED — Rule A's outcome, which was not ruled");
  /* 🔴 19 Sep 2026: row 9 is VERIFIED-PASS. D2 still does not touch it — that is what this test guards, and
   * `classByA6 === undefined` above is the proof. What moved it was its own whole-boundary verification under
   * OWNER_RULING_2026-09-18_STATUS_SEMANTICS.md, not the mixed-limb split. The NOTE is unchanged, and the
   * dimension it protects is still ⚠ and still unmeasured. */
  assert.equal(classify()[9].state, "VERIFIED-PASS");
  assert.equal(classify()[9].justifiedUnavailable.dimension, "downstream outcomes", "row 9 ticked without naming its ⚠ dimension");
});

/* ================================================================== *
 * §6 · 2 — AGGREGATION CANNOT HIDE AN APPLICABLE LIMB
 * ================================================================== */

/**
 * DETECTOR: EXISTS + FIRES for the part D2 authorised — a split must not
 * improve the row, and it did not.
 *
 * 🔴 DETECTOR: ABSENT for the general case, AND THE ABSENCE IS ASSERTED RATHER
 * THAN PASSED OVER. A guard refusing a whole-row DEFERRED on a class-S row was
 * written and then REMOVED: it contradicted the documented convention at
 * test/pass-boundaries.test.mjs, whose comment reads "S rows may lawfully defer
 * their deferred half". On a split row a single `state` field is therefore
 * OVERLOADED — it can mean the v0.1 half's verdict or the deferred half's, and
 * nothing in the data says which. That is an open owner question, recorded here
 * so the gap is visible in the suite rather than only in a document.
 */
test("🔴 the split did NOT improve either row — both stay exactly where their unsatisfied applicable limb leaves them", () => {
  const rows = classify();
  for (const id of AMENDMENT_6_SPLIT_IDS) {
    assert.equal(rows[id].class, "S", `row ${id} was not split`);
    assert.equal(rows[id].state, "BLOCKED-UNKNOWN", `row ${id} moved. A ruling is not a tick — RR-52 Ruling 0.3`);
  }
  /* 🔴 19 Sep 2026: the tally moved to 24 / 3 — and NOT because of the split. Rows 1 and 54, the only two
   * Amendment 6 touches, are asserted UNMOVED directly above; the rows that moved are 9 and 17, which Amendment 6
   * never names. The tally is pinned here so a future split cannot hide a movement inside it. */
  /* 🔴 20 Sep 2026: 26 / 2 — and again NOT because of the split. Row 50 left FAILED under the owner's
   * pre-contract label ruling; rows 1 and 54 are untouched, and the split's own populations did not move. */
  assert.deepEqual(tally(rows), { "NOT-STARTED": 2, "BUILT-NOT-PROVED": 5, "TESTABLE-NOW": 1, "VERIFIED-PASS": 26, FAILED: 2, "BLOCKED-UNKNOWN": 2, DEFERRED: 23 });
});

test("🔴 ABSENT DETECTOR, DECLARED: nothing refuses a whole-row DEFERRED on a split row — the `state` field is overloaded", () => {
  const rows = classify();
  rows[1] = { ...rows[1], state: "DEFERRED" };
  const errors = assertLawful(rows);
  assert.deepEqual(
    errors, [],
    "a detector now exists for this — good, but this test records its ABSENCE and must be rewritten, not deleted",
  );
});

/* ================================================================== *
 * §6 · 3 — DEFERRED LIMBS REMAIN MACHINE-READABLE (CLAUSE 5)
 * ================================================================== */

test("🔴 clause 5: every row D2 split carries its deferred limb as DATA, in the boundary AND in the status", () => {
  const b = loadBoundaries();
  const rows = classify();
  for (const id of AMENDMENT_6_SPLIT_IDS) {
    assert.deepEqual(b[id].deferredLimbs, ["learning"], `row ${id}'s boundary lost its machine-readable limbs`);
    assert.deepEqual(rows[id].deferredLimbs, ["learning"], `row ${id}'s STATUS lost its machine-readable limbs`);
    assert.equal(rows[id].deferredLimbsDeclared, true);
    assert.ok(b[id].deferred, `row ${id} lost its human-readable boundary prose`);
  }
});

test("🔴 RED: take the declared limbs away from a D2-split row and the clause-5 guard FIRES — restored, it is silent again", () => {
  const rows = classify();
  const real = loadBoundaries();

  // clean side first: a green that has not been broken proves nothing
  assert.deepEqual(assertLawful(rows, real), [], "the board is already unlawful — this RED proof would be meaningless");

  // sabotage ONE field on ONE row, in a COPY. The real boundaries are never mutated.
  const damaged = { ...real, 1: { ...real[1], deferredLimbs: null, deferredLimbsDeclared: false } };
  const errors = assertLawful(rows, damaged);
  assert.equal(errors.length, 1, "the guard fired on more or less than the one row that was damaged");
  assert.match(errors[0], /item 1 .* was split by Amendment 6 but declares no machine-readable deferred limbs/);
  assert.match(errors[0], /clause 5/);

  // and the control: row 54, untouched in the same run, did NOT fire
  assert.ok(!errors.join("\n").includes("item 54"), "the sabotage tripped a second row — it proves neither");

  // restore and prove silence returns
  assert.deepEqual(assertLawful(rows, real), [], "the guard stayed RED after restoration — it is not reading what it claims to");
  assert.equal(loadBoundaries()[1].deferredLimbsDeclared, true, "the real boundaries were mutated by this test");
});

test("🔴 CLAUSE 5 IS NOT YET UNIVERSAL, AND THE CENSUS SAYS SO — 8 of the 10 splits declare no structured limbs", () => {
  const b = loadBoundaries();
  const splits = Object.values(b).filter((r) => r.class === "S");
  assert.equal(splits.length, 10);
  const declared = splits.filter((r) => r.deferredLimbsDeclared).map((r) => r.id);
  const undeclared = splits.filter((r) => !r.deferredLimbsDeclared).map((r) => r.id);
  assert.deepEqual(declared, [1, 54], "only the rows D2 authorised declare structured limbs");
  assert.deepEqual(undeclared, [3, 7, 10, 12, 13, 14, 25, 38]);
  // 🔴 RECORDED, NOT FIXED: seven of the eight carry the deferred half as PROSE; row 3 carries neither.
  // Deriving limbs by parsing those sentences would be the invention this repository refuses.
  assert.deepEqual(splits.filter((r) => !r.deferredLimbsDeclared && !r.deferred).map((r) => r.id), [3]);
});

/* ================================================================== *
 * PROVENANCE — THE ROW MUST CREDIT THE AMENDMENT THAT ACTUALLY MOVED IT
 * ================================================================== */

/**
 * 🔴 THIS DEFECT LANDED IN THIS TURN AND THE REPOSITORY CAUGHT IT.
 *
 * `classClause` read "the class in force differs from the frozen one → moved by Amendment 4".
 * Amendment 6 moved rows 1 and 54, so both credited an amendment that never names them — the
 * 14 September defect exactly, one amendment later. `provenanceErrors` refused it in the
 * generated output. The rule now asks WHICH amendment moved the row.
 */
test("🔴 rows 1 and 54 credit Amendment 6, not Amendment 4 — the ledger names the amendment that actually moved them", () => {
  const b = loadBoundaries();
  for (const id of AMENDMENT_6_SPLIT_IDS) {
    assert.equal(movedBy(b[id]), 6);
    assert.equal(classClause(b[id]), " (frozen `P`, moved by Amendment 6)");
  }
  assert.equal(movedBy(b[4]), 4, "row 4 is Amendment 4's, and must stay so");
  assert.equal(classClause(b[4]), " (frozen `D`, moved by Amendment 4)");
  assert.deepEqual(provenanceErrors(readFileSync(`${REPO}CHECKLIST_BOUNDARIES.md`, "utf8"), b).errors, []);
});

test("🔴 RED: crediting the WRONG mover is refused — not merely 'was it moved at all'", () => {
  const b = loadBoundaries();
  const ledger = readFileSync(`${REPO}CHECKLIST_BOUNDARIES.md`, "utf8").replace(/\r\n/g, "\n");
  const bad = ledger.replace(
    /(### 1 · [^\n]*\n\n[^\n]*)moved by Amendment 6/,
    "$1moved by Amendment 4",
  );
  assert.notEqual(bad, ledger, "the sabotage did not land — the RED proves nothing");
  const { errors } = provenanceErrors(bad, b);
  assert.equal(errors.length, 1, `the sabotage tripped more than the one row it damaged: ${errors.join(" | ")}`);
  assert.match(errors[0], /item 1: its class clause says "moved by Amendment 4" but the boundaries say Amendment 6 moved it/);
  // restore side: the untouched ledger is silent again
  assert.deepEqual(provenanceErrors(ledger, b).errors, []);
});

/* ================================================================== *
 * §6 · 4 — A v0.1 TICK IS NOT FULL-PRODUCT DONE
 * ================================================================== */

test("🔴 clause 4: each split row keeps its §6 four parts as the FINAL boundary — the full-product bar is still on the row", () => {
  const b = loadBoundaries();
  for (const id of AMENDMENT_6_SPLIT_IDS) {
    assert.ok(b[id].finalBoundary, `row ${id} lost its final boundary — a v0.1 tick would then look like DONE`);
    for (const p of CONTRACT_PARTS) assert.ok(b[id].finalBoundary[p], `row ${id}'s final boundary has no ${p}`);
    assert.notEqual(b[id].finalBoundary.input, b[id].input, `row ${id}'s v0.1 half and final boundary are the same text — the split would be cosmetic`);
  }
  // the frozen full-product text still names all four classes; the v0.1 half names three
  assert.match(b[1].finalBoundary.input, /data, evidence, cost and learning/);
  assert.match(b[1].input, /data, evidence and cost/);
  assert.match(b[54].finalBoundary.input, /evidence, facts, \*\*costs\*\* and \*\*learning\*\*/);
  assert.match(b[54].input, /evidence, facts and costs/);
});

/* ================================================================== *
 * §6 · 5 — ONLY STATUSES THE EVIDENCE SUPPORTS
 * ================================================================== */

test("🔴 rows 1, 4 and 54 hold only what their evidence supports — and row 4 was NOT split", () => {
  const b = loadBoundaries();
  const rows = classify();
  assert.equal(b[4].class, "P", "row 4 was split — the fit test said it does not fit and the ruling did not authorise it");
  assert.equal(b[4].classByA6, undefined);
  assert.equal(rows[4].state, "BUILT-NOT-PROVED");
  assert.equal(rows[1].state, "BLOCKED-UNKNOWN");
  assert.equal(rows[54].state, "BLOCKED-UNKNOWN");
  assert.deepEqual(assertLawful(rows), []);
});

/* ================================================================== *
 * §6 · 6 and 7 — COUNTS, DENOMINATORS AND THE SEPARATE INVENTORIES
 * ================================================================== */

test("🔴 the split moved a row between two IN-SCOPE classes — the denominator did not move", () => {
  const b = Object.values(loadBoundaries());
  const c = { P: 0, S: 0, D: 0 };
  for (const r of b) c[r.class] += 1;
  assert.deepEqual(c, { ...EXPECTED_LEDGER_CLASS_COUNTS });
  assert.equal(b.length, EXPECTED_LEDGER_ROWS);
  assert.equal(c.P + c.S, 38, "the v0.1 denominator moved — a split must never admit or defer a row");
  // the 58-row set, counted on its own
  const fifty8 = b.filter((r) => r.id <= 58);
  const c58 = { P: 0, S: 0, D: 0 };
  for (const r of fifty8) c58[r.class] += 1;
  assert.deepEqual(c58, { ...EXPECTED_SPLIT_CLASS_COUNTS });
  // 🔴 and Amendment 4's own census is untouched and still true at ITS step
  assert.deepEqual(EXPECTED_EFFECTIVE_CLASS_COUNTS, { P: 27, S: 8, D: 23 });
  assert.equal(verify(SOURCE).sha, EXPECTED_BODY_SHA256, "the frozen source moved — a split must change class, never text");
});

test("🔴 the four inventories stay SEPARATE, and 58/58 stays unreachable inside v0.1 — R5, 19 September 2026", () => {
  const rows = Object.values(classify());
  const legacy = rows.filter((r) => r.id <= 58);
  const legacyPass = legacy.filter((r) => r.state === "VERIFIED-PASS").length;
  const legacyDeferred = legacy.filter((r) => r.state === "DEFERRED").length;
  assert.equal(legacy.length, 58);
  // 🔴 23 since row 50 closed (20 Sep 2026). Row 50 is id ≤ 58, so it moves THIS inventory too — which
  // is exactly why the four are counted apart rather than derived from one another.
  assert.equal(legacyPass, 23, "the legacy 58-row inventory is x / 58 and is reported on its own");
  assert.equal(legacyDeferred, 23);
  // 🔴 THE POINT OF R5: 23 of the 58 are deferred, so the legacy inventory can never reach 58.
  assert.equal(58 - legacyDeferred, 35, "the maximum reachable value of the legacy inventory inside v0.1");
  assert.ok(legacyPass < 58 - legacyDeferred || legacyPass === 35);
  // the other three inventories, each counted separately
  assert.equal(rows.length, 61);
  assert.equal(rows.filter((r) => r.state === "VERIFIED-PASS").length, 26, "x / 61");
  const inScope = rows.filter((r) => r.state !== "DEFERRED");
  assert.equal(inScope.length, 38);
  assert.equal(inScope.filter((r) => r.state === "VERIFIED-PASS").length, 26, "x / 38");
});

/* ================================================================== *
 * §6 · 8 — PD-6, PD-7 AND PD-13 ARE NOT RETARGETED
 * ================================================================== */

/**
 * DETECTOR: EXISTS + FIRES on the text it can reach. The PD entries themselves
 * live in `_handoffs`, outside this repository, so this asserts what IS here:
 * the backlog carries PD-1…PD-5 only, and neither the D2 ruling's operative
 * amendment nor this repository re-words a 58/58 trigger as 38/38.
 */
test("🔴 PD-6, PD-7 and PD-13 are not silently retargeted from 58/58 to 38/38", () => {
  const backlog = readFileSync(`${REPO}POST_DONE_BACKLOG.md`, "utf8");
  for (const pd of ["PD-6", "PD-7", "PD-8", "PD-9", "PD-10", "PD-13"]) {
    assert.ok(!backlog.includes(pd), `${pd} appeared in the backlog — it was ruled into it but has never been there, and this turn did not add it`);
  }
  const a6 = readFileSync(A6, "utf8");
  assert.ok(!/58\s*\/\s*58/.test(a6), "Amendment 6 mentions 58/58 — it must not restate, retarget or reinterpret that trigger");
  assert.match(a6, /THE IN-SCOPE COUNT DOES NOT MOVE/, "Amendment 6 must say plainly that it changes no denominator");
});
