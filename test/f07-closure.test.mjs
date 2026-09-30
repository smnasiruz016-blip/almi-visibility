/**
 * 🔴 F07 · CLOSURE PROOFS — the board movement and the audit of that movement (23 September 2026).
 *
 *   · F7-BOARD  the board reads 3/89 (85 · 0 · 1 · 3) with F07 VERIFIED-PASS by UNASSESSED -> IN-PROGRESS ->
 *               VERIFIED-PASS, after its acceptance froze; F05, F08 and F40 unchanged.
 *   · F7-TRAIL  each of F07's three declared events is in the production trail exactly once as a BOARD_TRANSITION,
 *               under F07's own frozen acceptance — a row that moved with no audit event would be F08's FAILURE
 *               clause, committed by F07.
 * Each carries a control shown able to give the other verdict.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { ACCEPTANCES, F07_ORIGINAL, F07_AMENDMENT_1, F07_AMENDMENT_2 } from "../config/fboard/acceptances.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors, progress } from "../src/fboard/board.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const board = () => buildBoard(CAPABILITIES, DECLARED);
const ctx = { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } }; // the corpus's measuring day: on 23 Sep, F06's 24 Sep acceptance does not exist yet
const trail = () => productionAuditStore({ repo: REPO, forbiddenSubstrings: [] }).readAll().events;

test("F7-BOARD · F07 is VERIFIED-PASS by UNASSESSED → IN-PROGRESS → VERIFIED-PASS; the board reads 3/89; F05, F08, F40 unchanged", () => {
  const b = board();
  assert.deepEqual(boardErrors(b, ctx), []);
  const p = progress(b);
  /* F04 VERIFIED-PASS on 25 Sep 2026 (movement 2 under Amendment 1, owner command 89e8664 §7) — the board reads 8/89. */
  /* F09 started on 25 Sep 2026 (movement 1 only: UNASSESSED -> IN-PROGRESS, owner commands e5f5fd4 / 474d27a) — VERIFIED-PASS unchanged. */
  /* F09 VERIFIED-PASS on 25 Sep 2026 (movement 2, close-out command 2601cb3 §10) — the board reads 9/89, measured on the closure tree. */
  /* F07 REOPENED 28 Sep 2026 (CONCRETE_CONTRADICTORY_EVIDENCE, eight out-of-band reads, _handoffs be583fa) — the board reads 8/89; test/f07-closure.test.mjs owns that movement. */
  /* F90 appended 28 Sep 2026 by Specification Amendment 1 (_handoffs a3a777b) — the board reads 8/90: F90 starts UNASSESSED. */
  assert.deepEqual(p.split, { UNASSESSED: 56, "ACCEPTANCE-FROZEN": 0, READY: 0, "IN-PROGRESS": 3, "BLOCKED-BY-AUTHORITY": 1, "BLOCKED-BY-EVIDENCE": 0, FAILED: 0, "VERIFIED-PASS": 30 }); // F10 IN-PROGRESS on 26 Sep (movement 1, acceptance 504dbb9); VERIFIED-PASS still 9/89
  assert.equal(p.passed, 30); /* F73 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-97, acceptance 366476c) — the board reads 30/90 */ /* F29 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance c8eee0c) — the board reads 29/90 */ /* F20 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance f566059) — the board reads 28/90 */ /* F47 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance ccd4c1e) — the board reads 27/90 */ /* F46 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance 2e76216) — the board reads 26/90 */ /* F26 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-95, acceptance b1a94e7) — the board reads 25/90 */ /* F45 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-94, acceptance dcb9fbb) — the board reads 24/90 */ /* F55 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-93, acceptance 7323446) — the board reads 23/90 */ /* F79 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-93, acceptance f34f3af) — the board reads 22/90 */ /* F48 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 8d03429) — the board reads 21/90 */ /* F82 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 25c7f49) — the board reads 20/90 */ /* F43 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-91, acceptance 6c7627a) — the board reads 19/90 */ /* F41 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 454396e) — the board reads 18/90 */ /* F39 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-90, acceptance 90e798d) — the board reads 17/90 */ /* F32 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance a0b9776) — the board reads 16/90 */ /* F35 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-88, acceptance da659bd) — the board reads 15/90 */ /* F36 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 2635153) — the board reads 14/90 */ /* F21 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-86, acceptance 804ebd1) — the board reads 13/90 */ /* F31 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-85, acceptance 3a8f7ba) — the board reads 12/90 */ /* F33 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-84, acceptance 9dc9bc2) — the board reads 11/90 */ /* F34 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-83, acceptance 53f74b4) — the board reads 10/90 */ /* F77 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-82, Amendment 1 b443e5e) — the board reads 9/90 */ // F07 REOPENED 28 Sep 2026 (CONCRETE_CONTRADICTORY_EVIDENCE, eight out-of-band reads, _handoffs be583fa) — the board reads 8/89. F09 moved to VERIFIED-PASS on 25 Sep 2026 (close-out 2601cb3), measured on its closure tree. F02 moved to VERIFIED-PASS on 25 Sep 2026 under its own Amendment 1 (test/f02-disposition.test.mjs owns that movement). F03 moved to VERIFIED-PASS on 25 Sep 2026 on merged main, in two movements (test/f03-closure.test.mjs owns that movement). // 3/89 at F07's closure; F06 then moved under its own acceptance (24 Sep 2026) — test/f06-closure.test.mjs owns it; F01 the same day — test/f01-closure.test.mjs. F04 moved to VERIFIED-PASS on 25 Sep 2026 under its Amendment 1 (test/f04-amendment-zero-population.test.mjs owns that movement).
  assert.equal(p.total, 90); // F90 appended 28 Sep 2026 by Specification Amendment 1 (_handoffs a3a777b) — the board reads 8/90
  assert.deepEqual(["F05", "F08", "F40"].map((f) => DECLARED[f].state), ["VERIFIED-PASS", "VERIFIED-PASS", "BLOCKED-BY-AUTHORITY"]);

  const f07 = DECLARED.F07;
  /* 🔴 28 Sep 2026: REOPENED on CONCRETE_CONTRADICTORY_EVIDENCE — eight out-of-band reads of storage S's set side, no ACCESS recorded
   * (_handoffs be583fa). Requirement UNCHANGED (Amendment 3); no re-verification in the same command — F07 stays IN-PROGRESS. */
  assert.equal(f07.state, "IN-PROGRESS");
  const reopened4 = f07.events[f07.events.length - 1];
  assert.deepEqual([reopened4.kind, reopened4.on, reopened4.from, reopened4.to, reopened4.reason], ["REOPENED", "2026-09-28", "VERIFIED-PASS", "IN-PROGRESS", "CONCRETE_CONTRADICTORY_EVIDENCE"]);
  assert.deepEqual(reopened4.acceptanceUnchanged, { ruling: ACCEPTANCES.F07.ruling.sha256, contract: ACCEPTANCES.F07.contractSha256 }, "the reopen changed the requirement");
  assert.deepEqual([reopened4.evidenceRecord.commit, reopened4.evidenceRecord.sha256], ["be583fa523427593debe259da1134cd6ca6a62cb", "63c6c54b9c564984f1f7d2c3ecf53cfd57acfbe7098d1d787ce0475d023a4f21"]);
  assert.match(reopened4.rationale, /no label and no marking key was read/);
  /* F07 Amendment 1 (25 Sep 2026, governance a0b7e4b): reopened on AUTHORITATIVE_REQUIREMENT_CHANGE and re-verified under the
   * amended contract. The first three events are history, frozen under the ORIGINAL acceptance (F07_ORIGINAL). */
  /* F07 Amendment 2 (26 Sep 2026, governance 051feb9): reopened again on AUTHORITATIVE_REQUIREMENT_CHANGE and re-verified under the
   * Amendment 2 contract. Amendment 1's three events are history, frozen under F07_AMENDMENT_1. */
  assert.deepEqual(f07.events.map((e) => `${e.kind}@${e.on}`), ["ACCEPTANCE_FROZEN@2026-09-23", "IMPLEMENTATION@2026-09-23", "VERIFIED@2026-09-23", "ACCEPTANCE_AMENDED@2026-09-25", "REOPENED@2026-09-25", "VERIFIED@2026-09-25", "ACCEPTANCE_AMENDED@2026-09-26", "REOPENED@2026-09-26", "VERIFIED@2026-09-26", "ACCEPTANCE_AMENDED@2026-09-26", "REOPENED@2026-09-26", "VERIFIED@2026-09-26", "REOPENED@2026-09-27", "VERIFIED@2026-09-27", "REOPENED@2026-09-28"]);
  /* F07 Amendment 3 (26 Sep 2026, governance 264c680): reopened a third time on AUTHORITATIVE_REQUIREMENT_CHANGE and re-verified
   * under the Amendment 3 contract, the same day as Amendment 2. Amendment 2's three events are history, frozen under F07_AMENDMENT_2. */
  const [frozen, impl, verified, amended, reopened, reverified, amended2, reopened2, reverified2, amended3, reopened3, reverified3] = f07.events;
  assert.equal(amended3.contractSha256, ACCEPTANCES.F07.contractSha256);
  assert.deepEqual(amended3.amends, { ruling: F07_AMENDMENT_2.ruling, contractSha256: F07_AMENDMENT_2.contractSha256 });
  assert.deepEqual([reopened3.from, reopened3.to, reopened3.reason], ["VERIFIED-PASS", "IN-PROGRESS", "AUTHORITATIVE_REQUIREMENT_CHANGE"]);
  assert.match(reopened3.rationale, /Amendments 1 and 2 remain historically valid for what they measured/);
  assert.deepEqual([reverified3.from, reverified3.to, reverified3.featureId, reverified3.population], ["IN-PROGRESS", "VERIFIED-PASS", "F07", "REAL"]);
  assert.deepEqual(reverified3.acceptanceUnchanged, { ruling: ACCEPTANCES.F07.ruling.sha256, contract: ACCEPTANCES.F07.contractSha256 });
  assert.match(reverified3.realPopulationNewLimbs, /^NOT_MEASURED/, "the paired limbs' zero real population is not recorded as NOT_MEASURED");
  assert.match(reverified3.afterMerge, /exact merged SHA/);
  assert.equal(frozen.ruling, F07_ORIGINAL.ruling);
  assert.equal(frozen.contractSha256, F07_ORIGINAL.contractSha256);
  assert.equal(amended.contractSha256, F07_AMENDMENT_1.contractSha256);
  assert.deepEqual(amended.amends, { ruling: F07_ORIGINAL.ruling, contractSha256: F07_ORIGINAL.contractSha256 });
  assert.deepEqual([reopened.from, reopened.to, reopened.reason], ["VERIFIED-PASS", "IN-PROGRESS", "AUTHORITATIVE_REQUIREMENT_CHANGE"]);
  assert.match(reopened.rationale, /existing F07 evidence remains historically valid/);
  assert.match(reopened.rationale, /not by concealed contradictory evidence/);
  assert.deepEqual([reverified.from, reverified.to, reverified.featureId, reverified.population], ["IN-PROGRESS", "VERIFIED-PASS", "F07", "REAL"]);
  assert.deepEqual(reverified.acceptanceUnchanged, { ruling: F07_AMENDMENT_1.ruling.sha256, contract: F07_AMENDMENT_1.contractSha256 });
  assert.equal(amended2.contractSha256, F07_AMENDMENT_2.contractSha256);
  assert.deepEqual(amended2.amends, { ruling: F07_AMENDMENT_1.ruling, contractSha256: F07_AMENDMENT_1.contractSha256 });
  assert.deepEqual([reopened2.from, reopened2.to, reopened2.reason], ["VERIFIED-PASS", "IN-PROGRESS", "AUTHORITATIVE_REQUIREMENT_CHANGE"]);
  assert.match(reopened2.rationale, /Amendment 1's evidence remains historically valid for what it measured/);
  assert.match(reopened2.rationale, /live MARKING_KEY entries number zero/);
  assert.deepEqual([reverified2.from, reverified2.to, reverified2.featureId, reverified2.population], ["IN-PROGRESS", "VERIFIED-PASS", "F07", "REAL"]);
  assert.deepEqual(reverified2.acceptanceUnchanged, { ruling: F07_AMENDMENT_2.ruling.sha256, contract: F07_AMENDMENT_2.contractSha256 });
  assert.match(reverified2.realPopulationNewLimbs, /^NOT_MEASURED/, "the added limbs' zero real population is not recorded as NOT_MEASURED");
  assert.match(reverified2.afterMerge, /exact merged SHA/);
  assert.match(reverified.realPopulationNewLimbs, /^NOT_MEASURED/, "the new limbs' zero real population is not recorded as NOT_MEASURED");
  assert.match(reverified.afterMerge, /exact merged SHA/);
  assert.deepEqual([impl.from, impl.to], ["UNASSESSED", "IN-PROGRESS"]);
  assert.deepEqual([verified.from, verified.to, verified.featureId, verified.population], ["IN-PROGRESS", "VERIFIED-PASS", "F07", "REAL"]);
  assert.deepEqual(verified.acceptanceUnchanged, { ruling: F07_ORIGINAL.ruling.sha256, contract: F07_ORIGINAL.contractSha256 });
  for (const e of [impl, verified, reopened, reverified, reopened2, reverified2, reopened3, reverified3]) {
    assert.ok(!Object.hasOwn(e, "changeKind"), `${e.kind} carries the historical changeKind vocabulary`);
    assert.ok(e.reason, `${e.kind} moved with no stated reason`);
  }
  assert.match(verified.afterMerge, /exact merged SHA/);
});

test("F7-BOARD · CONTROL — the same board without F07's REAL verification, or with implementation before the freeze, is refused", () => {
  const claimed = (r) => ({ ...r, state: "VERIFIED-PASS" }); // F07 is IN-PROGRESS since 28 Sep: the control CLAIMS the pass, then removes its support
  assert.deepEqual(boardErrors(board(), ctx), [], "CONTROL: the real reopened board is clean");
  const without = board().map((r) => (r.featureId === "F07" ? claimed({ ...r, events: r.events.filter((e) => e.kind !== "VERIFIED") }) : r));
  assert.deepEqual(boardErrors(without, ctx).map((e) => `${e.code}:${e.id}`), ["PASS_WITHOUT_VERIFICATION:F07"]);
  const fixture = board().map((r) => (r.featureId === "F07" ? claimed({ ...r, events: r.events.map((e) => (e.kind === "VERIFIED" ? { ...e, population: "FIXTURE" } : e)) }) : r));
  assert.deepEqual(boardErrors(fixture, ctx).map((e) => `${e.code}:${e.id}`), ["PASS_WITHOUT_VERIFICATION:F07"]);
  const early = board().map((r) => (r.featureId === "F07" ? { ...r, events: [r.events[1], r.events[0], r.events[2]] } : r));
  assert.ok(boardErrors(early, ctx).some((e) => e.code === "IMPLEMENTATION_BEFORE_ACCEPTANCE" && e.id === "F07"));
});

test("F7-TRAIL · each F07 movement is in the production trail EXACTLY ONCE, under the acceptance that governed it, naming its states", () => {
  const mine = trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F07");
  assert.deepEqual(mine.map((e) => e.action), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION", "VERIFIED", "ACCEPTANCE_AMENDED", "REOPENED", "VERIFIED", "ACCEPTANCE_AMENDED", "REOPENED", "VERIFIED", "ACCEPTANCE_AMENDED", "REOPENED", "VERIFIED", "REOPENED", "VERIFIED", "REOPENED"], `${mine.length} transition event(s) for F07`);
  for (const e of mine.slice(0, 3)) {
    assert.deepEqual(e.authorityRef, { propositionId: "F07_FROZEN_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F07"] });
    assert.equal(e.occurredAt.slice(0, 10), "2026-09-23");
  }
  for (const e of mine.slice(3, 6)) {
    assert.deepEqual(e.authorityRef, { propositionId: "F07_ACCEPTANCE_AMENDMENT_1", scope: ["ALMIVISIBILITY", "F07"] });
    assert.equal(e.occurredAt.slice(0, 10), "2026-09-25");
  }
  for (const e of mine.slice(6, 9)) {
    assert.deepEqual(e.authorityRef, { propositionId: "F07_ACCEPTANCE_AMENDMENT_2", scope: ["ALMIVISIBILITY", "F07"] });
    assert.equal(e.occurredAt.slice(0, 10), "2026-09-26");
  }
  // Amendment 3 (264c680): the same day as Amendment 2 — the repaired recorder (D-RECORDER-1) keeps both, each under its own authority
  for (const e of mine.slice(9, 12)) {
    assert.deepEqual(e.authorityRef, { propositionId: "F07_ACCEPTANCE_AMENDMENT_3", scope: ["ALMIVISIBILITY", "F07"] });
    assert.equal(e.occurredAt.slice(0, 10), "2026-09-26");
  }
  /* 27 Sep 2026: REOPENED on CONCRETE_CONTRADICTORY_EVIDENCE (two ACCESS records destroyed by git checkout, _handoffs 5fd0435) and
   * re-VERIFIED after the out-of-tree witness repair — both under the UNCHANGED Amendment 3, no new amendment. */
  for (const e of mine.slice(12, 14)) {
    assert.deepEqual(e.authorityRef, { propositionId: "F07_ACCEPTANCE_AMENDMENT_3", scope: ["ALMIVISIBILITY", "F07"] });
    assert.equal(e.occurredAt.slice(0, 10), "2026-09-27");
  }
  /* 28 Sep 2026: REOPENED on CONCRETE_CONTRADICTORY_EVIDENCE (eight out-of-band reads, _handoffs be583fa), under the UNCHANGED Amendment 3. */
  assert.deepEqual(mine[14].authorityRef, { propositionId: "F07_ACCEPTANCE_AMENDMENT_3", scope: ["ALMIVISIBILITY", "F07"] });
  assert.deepEqual([mine[14].occurredAt.slice(0, 10), mine[14].metadata.from, mine[14].metadata.to, mine[14].eventId], ["2026-09-28", "VERIFIED-PASS", "IN-PROGRESS", "8c2df937603f7a525920eeef573183f1"]);
  assert.deepEqual([mine[12].metadata.from, mine[12].metadata.to], ["VERIFIED-PASS", "IN-PROGRESS"]);
  assert.deepEqual([mine[13].metadata.from, mine[13].metadata.to, mine[13].metadata.population], ["IN-PROGRESS", "VERIFIED-PASS", "REAL"]);
  assert.deepEqual(mine.slice(6, 9).map((e) => e.eventId.slice(0, 8)), ["e97c2be7", "833037a7", "955d8571"], "an Amendment 2 event lost its original identity");
  assert.deepEqual([mine[10].metadata.from, mine[10].metadata.to], ["VERIFIED-PASS", "IN-PROGRESS"]);
  assert.deepEqual([mine[11].metadata.from, mine[11].metadata.to, mine[11].metadata.population], ["IN-PROGRESS", "VERIFIED-PASS", "REAL"]);
  assert.deepEqual([mine[7].metadata.from, mine[7].metadata.to], ["VERIFIED-PASS", "IN-PROGRESS"]);
  assert.deepEqual([mine[8].metadata.from, mine[8].metadata.to, mine[8].metadata.population], ["IN-PROGRESS", "VERIFIED-PASS", "REAL"]);
  assert.deepEqual([mine[4].metadata.from, mine[4].metadata.to], ["VERIFIED-PASS", "IN-PROGRESS"]);
  assert.deepEqual([mine[5].metadata.from, mine[5].metadata.to, mine[5].metadata.population], ["IN-PROGRESS", "VERIFIED-PASS", "REAL"]);
  assert.deepEqual([mine[1].metadata.from, mine[1].metadata.to], ["UNASSESSED", "IN-PROGRESS"]);
  assert.deepEqual([mine[2].metadata.from, mine[2].metadata.to, mine[2].metadata.population], ["IN-PROGRESS", "VERIFIED-PASS", "REAL"]);
  // CONTROL, PROVED CAPABLE: the same filter finds F08's movements, so "exactly these three" is a count, not a vacancy.
  assert.ok(trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F08").length >= 2);
});

test("F7-TRAIL · the board ↔ audit consistency check is clean, and names F07 among the rows that needed a transition", () => {
  const r = spawnSync(process.execPath, [join(REPO, "tools/board-audit-consistency.mjs")], { cwd: REPO, encoding: "utf8" });
  assert.match(r.stdout, /rows needing a transition event: F01, F02, F03, F04, F05, F06, F08, F09/); // F07 left the list on 28 Sep (reopened, IN-PROGRESS). F06 and F01 joined on 24 September 2026; F03 on 25 September 2026; F04 on 25 September 2026
  assert.match(r.stdout, /consistency errors\s*: 0/);
  assert.match(r.stdout, /F-progress \(computed from the board file\): 30\/90/); /* F73 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-97, acceptance 366476c) — the board reads 30/90 */ /* F29 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance c8eee0c) — the board reads 29/90 */ /* F20 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance f566059) — the board reads 28/90 */ /* F47 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance ccd4c1e) — the board reads 27/90 */ /* F46 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-96, acceptance 2e76216) — the board reads 26/90 */ /* F26 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-95, acceptance b1a94e7) — the board reads 25/90 */ /* F45 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 30 Sep 2026 (RR-94, acceptance dcb9fbb) — the board reads 24/90 */ /* F55 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-93, acceptance 7323446) — the board reads 23/90 */ /* F79 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-93, acceptance f34f3af) — the board reads 22/90 */ /* F48 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 8d03429) — the board reads 21/90 */ /* F82 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-92, acceptance 25c7f49) — the board reads 20/90 */ /* F43 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-91, acceptance 6c7627a) — the board reads 19/90 */ /* F41 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 454396e) — the board reads 18/90 */ /* F39 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-90, acceptance 90e798d) — the board reads 17/90 */ /* F32 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance a0b9776) — the board reads 16/90 */ /* F35 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-88, acceptance da659bd) — the board reads 15/90 */ /* F36 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 2635153) — the board reads 14/90 */ /* F21 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-86, acceptance 804ebd1) — the board reads 13/90 */ /* F31 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-85, acceptance 3a8f7ba) — the board reads 12/90 */ /* F33 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-84, acceptance 9dc9bc2) — the board reads 11/90 */ /* F34 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-83, acceptance 53f74b4) — the board reads 10/90 */ /* F77 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-82, Amendment 1 b443e5e) — the board reads 9/90 */ // F07 REOPENED 28 Sep 2026 (CONCRETE_CONTRADICTORY_EVIDENCE, eight out-of-band reads, _handoffs be583fa) — the board reads 8/89. F09 moved on 25 Sep (close-out 2601cb3), measured 9/89 on the closure tree; 3/89 at F07's closure; F06 and F01 moved on 24 Sep; F02 and F03 on 25 Sep (measured 7/89 on the F03 closure tree); F04 on 25 Sep (8/89)
});
