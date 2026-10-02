/**
 * 🔴 F06 · CLOSURE PROOFS — the board movement and its audit (24 September 2026).
 *
 *   · F6-BOARD  the board reads 4/89 (84 · 0 · 1 · 4) with F06 VERIFIED-PASS by UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS
 *               after its acceptance froze; F05, F07, F08 and F40 unchanged.
 *   · F6-CORRECTION  the bounded correction (24 September 2026): VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS, its
 *               verification the latest movement, the acceptance unchanged.
 *   · F6-TRAIL  each of F06's declared events (three, then the correction's two) is in the production trail exactly once as a BOARD_TRANSITION, under
 *               F06's own frozen acceptance.
 * Each carries a control able to give the other verdict.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors, progress } from "../src/fboard/board.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const board = () => buildBoard(CAPABILITIES, DECLARED);
const ctx = { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } }; // the corpus's measuring day: a later ruling (e.g. F02's Amendment 1, 25 Sep) is judged in force
const trail = () => productionAuditStore({ repo: REPO, forbiddenSubstrings: [] }).readAll().events;

test("F6-BOARD · F06 is VERIFIED-PASS by UNASSESSED → IN-PROGRESS → VERIFIED-PASS; the board reads 4/89; F05, F07, F08, F40 unchanged", () => {
  const b = board();
  assert.deepEqual(boardErrors(b, ctx), []);
  const p = progress(b);
  // 4/89 at F06's closure; F01 then moved under its own acceptance (24 Sep 2026) — test/f01-closure.test.mjs owns it.
  /* F04 VERIFIED-PASS on 25 Sep 2026 (movement 2 under Amendment 1, owner command 89e8664 §7) — the board reads 8/89. */
  /* F09 started on 25 Sep 2026 (movement 1 only: UNASSESSED -> IN-PROGRESS, owner commands e5f5fd4 / 474d27a) — VERIFIED-PASS unchanged. */
  /* F09 VERIFIED-PASS on 25 Sep 2026 (movement 2, close-out command 2601cb3 §10) — the board reads 9/89, measured on the closure tree. */
  /* F07 REOPENED 28 Sep 2026 (CONCRETE_CONTRADICTORY_EVIDENCE, eight out-of-band reads, _handoffs be583fa) — the board reads 8/89; test/f07-closure.test.mjs owns that movement. */
  /* F90 appended 28 Sep 2026 by Specification Amendment 1 (_handoffs a3a777b) — the board reads 8/90: F90 starts UNASSESSED. */
  assert.deepEqual(p.split, { UNASSESSED: 51, "ACCEPTANCE-FROZEN": 0, READY: 0, "IN-PROGRESS": 8, "BLOCKED-BY-AUTHORITY": 0, "BLOCKED-BY-EVIDENCE": 0, FAILED: 0, "VERIFIED-PASS": 32 }); /* F40 BLOCKED-BY-AUTHORITY -> UNASSESSED on 2 Oct 2026: its blocker lifted by the owner ruling _handoffs 4761236 (RR-127 §2a); no pass */ /* F16 moved UNASSESSED -> IN-PROGRESS on 1 Oct 2026 (RR-114, acceptance 944f769) — IN-PROGRESS only; the board still reads 32/91 */ /* F44 moved UNASSESSED -> IN-PROGRESS on 1 Oct 2026 (RR-113 §9, acceptance eecdfe4) — IN-PROGRESS only; the board still reads 32/91 */ /* F91 moved UNASSESSED -> IN-PROGRESS on 1 Oct 2026 (RR-113, acceptance 2048dd3) — IN-PROGRESS only; the board still reads 32/91 */ /* F27 moved UNASSESSED -> IN-PROGRESS on 1 Oct 2026 (RR-111, acceptance 8a6312b amended 93fa696) — IN-PROGRESS only; the board still reads 32/91 */ /* F23 moved UNASSESSED -> IN-PROGRESS on 1 Oct 2026 (RR-111, acceptance d3c8e79) — IN-PROGRESS only: its real population is INCOMPLETE; the board still reads 32/91 */ /* F75 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-103, acceptance 01275a9) — the board reads 32/91 */ /* F91 appended UNASSESSED on 30 Sep 2026 (Specification Amendment 3, RR-103) — the board reads 31/91 */ // F10 IN-PROGRESS on 26 Sep (movement 1, acceptance 504dbb9); VERIFIED-PASS still 9/89
  assert.equal(p.passed, 32); /* F75 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-103, acceptance 01275a9) — the board reads 32/91 */ /* F90 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-102, acceptance 73b50bf) — the board reads 31/90 */ /* F73 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-97, acceptance 366476c) — the board reads 30/90 */ /* F29 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance c8eee0c) — the board reads 29/90 */ /* F20 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance f566059) — the board reads 28/90 */ /* F47 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance ccd4c1e) — the board reads 27/90 */ /* F46 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance 2e76216) — the board reads 26/90 */ /* F26 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-95, acceptance b1a94e7) — the board reads 25/90 */ /* F45 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-94, acceptance dcb9fbb) — the board reads 24/90 */ /* F55 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-93, acceptance 7323446) — the board reads 23/90 */ /* F79 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-93, acceptance f34f3af) — the board reads 22/90 */ /* F48 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 8d03429) — the board reads 21/90 */ /* F82 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 25c7f49) — the board reads 20/90 */ /* F43 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-91, acceptance 6c7627a) — the board reads 19/90 */ /* F41 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 454396e) — the board reads 18/90 */ /* F39 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-90, acceptance 90e798d) — the board reads 17/90 */ /* F32 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance a0b9776) — the board reads 16/90 */ /* F35 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-88, acceptance da659bd) — the board reads 15/90 */ /* F36 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 2635153) — the board reads 14/90 */ /* F21 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-86, acceptance 804ebd1) — the board reads 13/90 */ /* F31 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-85, acceptance 3a8f7ba) — the board reads 12/90 */ /* F33 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-84, acceptance 9dc9bc2) — the board reads 11/90 */ /* F34 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-83, acceptance 53f74b4) — the board reads 10/90 */ /* F77 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-82, Amendment 1 b443e5e) — the board reads 9/90 */ // F07 REOPENED 28 Sep 2026 (CONCRETE_CONTRADICTORY_EVIDENCE, eight out-of-band reads, _handoffs be583fa) — the board reads 8/89. F09 moved to VERIFIED-PASS on 25 Sep 2026 (close-out 2601cb3), measured on its closure tree. F02 moved to VERIFIED-PASS on 25 Sep 2026 under its own Amendment 1 (test/f02-disposition.test.mjs owns that movement). F03 moved to VERIFIED-PASS on 25 Sep 2026 on merged main, in two movements (test/f03-closure.test.mjs owns that movement). F04 moved to VERIFIED-PASS on 25 Sep 2026 under its Amendment 1 (test/f04-amendment-zero-population.test.mjs owns that movement).
  assert.equal(p.total, 91); // F90 appended 28 Sep 2026 by Specification Amendment 1 (_handoffs a3a777b) — the board reads 8/90; F91 appended 30 Sep 2026 by Specification Amendment 3 (RR-103) — 91 rows
  assert.deepEqual(["F05", "F07", "F08", "F40"].map((f) => DECLARED[f].state), ["VERIFIED-PASS", "IN-PROGRESS", "VERIFIED-PASS", "UNASSESSED"]); // F40 unblocked 2 Oct by the owner ruling (_handoffs 4761236); F07 reopened 28 Sep
  const f06 = DECLARED.F06;
  assert.equal(f06.state, "VERIFIED-PASS");
  assert.deepEqual(f06.events.map((e) => `${e.kind}@${e.on}`), ["ACCEPTANCE_FROZEN@2026-09-24", "IMPLEMENTATION@2026-09-24", "VERIFIED@2026-09-24", "CORRECTION_OPENED@2026-09-24", "CORRECTION_VERIFIED@2026-09-24"]);
  const [frozen, impl, verified] = f06.events;
  assert.equal(frozen.ruling, ACCEPTANCES.F06.ruling);
  assert.equal(frozen.contractSha256, ACCEPTANCES.F06.contractSha256);
  assert.deepEqual([impl.from, impl.to], ["UNASSESSED", "IN-PROGRESS"]);
  assert.deepEqual([verified.from, verified.to, verified.featureId, verified.population], ["IN-PROGRESS", "VERIFIED-PASS", "F06", "REAL"]);
  assert.deepEqual(verified.acceptanceUnchanged, { ruling: ACCEPTANCES.F06.ruling.sha256, contract: ACCEPTANCES.F06.contractSha256 });
  for (const e of [impl, verified]) {
    assert.ok(!Object.hasOwn(e, "changeKind"), `${e.kind} carries the historical changeKind vocabulary`);
    assert.ok(e.reason, `${e.kind} moved with no stated reason`);
  }
  assert.match(verified.afterMerge, /exact merged SHA/);
});

test("F6-CORRECTION · the bounded correction is VERIFIED-PASS → IN-PROGRESS → VERIFIED-PASS, its verification is the LATEST movement, and the acceptance is unchanged", () => {
  const [, , , opened, reverified] = DECLARED.F06.events;
  assert.deepEqual([opened.from, opened.to, opened.reason], ["VERIFIED-PASS", "IN-PROGRESS", "DECLARED_POPULATION_INCOMPLETE_CONTRADICTION_OUTSIDE_IT"]);
  assert.match(opened.sectionA, /^OUTSIDE/);
  assert.match(opened.contradiction, /34bcac0714db248e16a342a0a57f2b72bc97be9e41fffff71eb3f67fd152d2bd/);
  assert.deepEqual(opened.command, { repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-24_F06_CORRECTION.md", commit: "911b39c1bfe9bdd678fca3706b7ac991b3015e8f", sha256: "aad7f8a391f1b122936cc420d9d171f5a6d6df179766bed46d653c60f54954f2" });
  assert.deepEqual([reverified.from, reverified.to, reverified.featureId, reverified.population], ["IN-PROGRESS", "VERIFIED-PASS", "F06", "REAL"]);
  assert.deepEqual(reverified.acceptanceUnchanged, { ruling: ACCEPTANCES.F06.ruling.sha256, contract: ACCEPTANCES.F06.contractSha256 });
  for (const e of [opened, reverified]) {
    assert.ok(!Object.hasOwn(e, "changeKind"), `${e.kind} carries the historical changeKind vocabulary`);
    assert.ok(e.reason, `${e.kind} moved with no stated reason`);
  }
  // the chain is continuous and ends where the row stands
  const moves = DECLARED.F06.events.filter((e) => e.to);
  for (let i = 1; i < moves.length; i += 1) assert.equal(moves[i].from, moves[i - 1].to, `${moves[i].kind} does not start where ${moves[i - 1].kind} ended`);
  assert.equal(moves.at(-1).to, DECLARED.F06.state);
  // CONTROL — stop the chain at CORRECTION_OPENED and it no longer ends where the row stands
  assert.notEqual(moves.slice(0, -1).at(-1).to, DECLARED.F06.state);
});

test("F6-BOARD · CONTROL — without F06's REAL verification, or with implementation before the freeze, the board is refused", () => {
  const without = board().map((r) => (r.featureId === "F06" ? { ...r, events: r.events.filter((e) => e.kind !== "VERIFIED") } : r));
  assert.deepEqual(boardErrors(without, ctx).map((e) => `${e.code}:${e.id}`), ["PASS_WITHOUT_VERIFICATION:F06"]);
  const early = board().map((r) => (r.featureId === "F06" ? { ...r, events: [r.events[1], r.events[0], r.events[2]] } : r));
  assert.ok(boardErrors(early, ctx).some((e) => e.code === "IMPLEMENTATION_BEFORE_ACCEPTANCE" && e.id === "F06"));
});

test("F6-TRAIL · each F06 movement is in the production trail EXACTLY ONCE, under F06's own frozen acceptance", () => {
  const mine = trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F06");
  assert.deepEqual(mine.map((e) => e.action), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION", "VERIFIED", "CORRECTION_OPENED", "CORRECTION_VERIFIED"], `${mine.length} transition event(s) for F06`);
  for (const e of mine) assert.deepEqual(e.authorityRef, { propositionId: "F06_FROZEN_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F06"] });
  assert.deepEqual([mine[2].metadata.from, mine[2].metadata.to, mine[2].metadata.population], ["IN-PROGRESS", "VERIFIED-PASS", "REAL"]);
  assert.deepEqual([mine[3].metadata.from, mine[3].metadata.to], ["VERIFIED-PASS", "IN-PROGRESS"]);
  assert.deepEqual([mine[4].metadata.from, mine[4].metadata.to, mine[4].metadata.population], ["IN-PROGRESS", "VERIFIED-PASS", "REAL"]);
  // CONTROL: the same filter finds F07's three movements under its ORIGINAL acceptance (F07 Amendment 1 added three more under its own).
  assert.ok(trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F07" && e.authorityRef?.propositionId === "F07_FROZEN_ACCEPTANCE").length === 3, "CONTROL: the same filter finds F07's three");
});

test("F6-TRAIL · the board ↔ audit consistency check is clean and names F06", () => {
  const r = spawnSync(process.execPath, [join(REPO, "tools/board-audit-consistency.mjs")], { cwd: REPO, encoding: "utf8" });
  assert.match(r.stdout, /rows needing a transition event: F01, F02, F03, F04, F05, F06, F08, F09/); // F07 left the list on 28 Sep (reopened, IN-PROGRESS); F09 is VERIFIED-PASS since 25 Sep. F01 joined on 24 September 2026; F03 on 25 September 2026; F04 on 25 September 2026
  assert.match(r.stdout, /consistency errors\s*: 0/);
  assert.match(r.stdout, /F-progress \(computed from the board file\): 32\/91/); /* F75 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-103, acceptance 01275a9) — the board reads 32/91 */ /* F91 appended UNASSESSED on 30 Sep 2026 (Specification Amendment 3, RR-103) — the board reads 31/91 */ /* F90 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-102, acceptance 73b50bf) — the board reads 31/90 */ /* F73 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-97, acceptance 366476c) — the board reads 30/90 */ /* F29 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance c8eee0c) — the board reads 29/90 */ /* F20 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance f566059) — the board reads 28/90 */ /* F47 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance ccd4c1e) — the board reads 27/90 */ /* F46 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance 2e76216) — the board reads 26/90 */ /* F26 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-95, acceptance b1a94e7) — the board reads 25/90 */ /* F45 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-94, acceptance dcb9fbb) — the board reads 24/90 */ /* F55 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-93, acceptance 7323446) — the board reads 23/90 */ /* F79 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-93, acceptance f34f3af) — the board reads 22/90 */ /* F48 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 8d03429) — the board reads 21/90 */ /* F82 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 25c7f49) — the board reads 20/90 */ /* F43 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-91, acceptance 6c7627a) — the board reads 19/90 */ /* F41 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 454396e) — the board reads 18/90 */ /* F39 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-90, acceptance 90e798d) — the board reads 17/90 */ /* F32 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance a0b9776) — the board reads 16/90 */ /* F35 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-88, acceptance da659bd) — the board reads 15/90 */ /* F36 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 2635153) — the board reads 14/90 */ /* F21 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-86, acceptance 804ebd1) — the board reads 13/90 */ /* F31 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-85, acceptance 3a8f7ba) — the board reads 12/90 */ /* F33 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-84, acceptance 9dc9bc2) — the board reads 11/90 */ /* F34 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-83, acceptance 53f74b4) — the board reads 10/90 */ /* F77 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-82, Amendment 1 b443e5e) — the board reads 9/90 */ // F07 REOPENED 28 Sep 2026 (CONCRETE_CONTRADICTORY_EVIDENCE, eight out-of-band reads, _handoffs be583fa) — the board reads 8/89. F09 moved on 25 Sep (close-out 2601cb3), measured 9/89 on the closure tree; 4/89 at F06's closure; F01 moved on 24 Sep; F02 and F03 on 25 Sep (measured 7/89 on the F03 closure tree); F04 on 25 Sep (8/89)
});
