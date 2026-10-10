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
  assert.deepEqual(p.split, { UNASSESSED: 44, "ACCEPTANCE-FROZEN": 0, READY: 0, "IN-PROGRESS": 11, "BLOCKED-BY-AUTHORITY": 0, "BLOCKED-BY-EVIDENCE": 0, FAILED: 0, "VERIFIED-PASS": 41 }); /* RR-244: F78 PROVED under its Amendment 2 on the real ledgers and the census (rr244-sabotage-2026-10-09T2236: 16 of 16; rr243-sabotage-2026-10-09T2240: 35 of 35; f78-sabotage-2026-10-09T2320: 22 of 22) — 40 -> 41, IN-PROGRESS 12 -> 11 */ /* RR-229 (c): F19 PROVED under its Amendment 1 on the committed real data (rr229c-sabotage-2026-10-08T2147: 14 of 14; rr227 68 of 68) — 39 -> 40, IN-PROGRESS 13 -> 12 */ /* RR-229: F31 re-proved under its same acceptance (rr229-sabotage-2026-10-08T1956: 37 of 37) — 38 -> 39, IN-PROGRESS 14 -> 13 */ /* RR-229: F31 REOPENED under its same acceptance (concrete contradictory evidence, _handoffs 57d6fe1) — VERIFIED-PASS -> IN-PROGRESS (39 -> 38, IN-PROGRESS 13 -> 14) until re-proved */ /* RR-227: F19 REOPENED by its own Amendment 1 (_handoffs b6b3382) — VERIFIED-PASS -> IN-PROGRESS (40 -> 39, IN-PROGRESS 12 -> 13) until re-proved in RR-228 */ /* RR-216: F92 PROVED (rr216-sabotage-2026-10-08T0359: 35 of 35) */ /* RR-216: F92 frozen under its own first acceptance (_handoffs 06cdb82) and started — UNASSESSED -> IN-PROGRESS (45 -> 44, IN-PROGRESS 12 -> 13) */ /* RR-214: F93 PROVED (rr214-sabotage-2026-10-08T0218: 31 of 31) */ /* RR-210: F38 PROVED (rr210-sabotage-2026-10-07T2305: 37 of 37) */ /* RR-208: F37 RE-PROVED under its Amendment 2 (rr208-sabotage-2026-10-07T2045: 59 of 59) */ /* RR-208: F37 REOPENED by its own Amendment 2 (_handoffs f9edf2a) — VERIFIED-PASS -> IN-PROGRESS */ /* RR-206: F94 PROVED in R7 (rr206-sabotage-2026-10-07T1855: 33 of 33) */ /* RR-192: F39 re-proved under Amendment 1 */ /* RR-206: F94 frozen under its own acceptance (_handoffs 959ae05) and started — UNASSESSED -> IN-PROGRESS (48 -> 47, IN-PROGRESS 12 -> 13) */ /* RR-210: F38 frozen under its own first acceptance (_handoffs 96ae49e) and started — UNASSESSED -> IN-PROGRESS (47 -> 46, IN-PROGRESS 12 -> 13) */ /* RR-214: F93 frozen under its own first acceptance (_handoffs 4938f07) and started — UNASSESSED -> IN-PROGRESS (46 -> 45, IN-PROGRESS 12 -> 13) */ /* RR-225: F02 (Amendment 2) and F31 (Amendment 1) RE-PROVED (rr225-sabotage-2026-10-08T0805: 52 of 52) — the board back to 40/95, restated */
  assert.equal(p.passed, 41); /* RR-244: F78 PROVED under its Amendment 2 on the real ledgers and the census (rr244-sabotage-2026-10-09T2236: 16 of 16; rr243-sabotage-2026-10-09T2240: 35 of 35; f78-sabotage-2026-10-09T2320: 22 of 22) — 40 -> 41, IN-PROGRESS 12 -> 11 */ /* RR-229 (c): F19 PROVED under its Amendment 1 on the committed real data (rr229c-sabotage-2026-10-08T2147: 14 of 14; rr227 68 of 68) — 39 -> 40, IN-PROGRESS 13 -> 12 */ /* RR-229: F31 re-proved under its same acceptance (rr229-sabotage-2026-10-08T1956: 37 of 37) — 38 -> 39, IN-PROGRESS 14 -> 13 */ /* RR-229: F31 REOPENED under its same acceptance (concrete contradictory evidence, _handoffs 57d6fe1) — VERIFIED-PASS -> IN-PROGRESS (39 -> 38, IN-PROGRESS 13 -> 14) until re-proved */ /* RR-227: F19 REOPENED by its own Amendment 1 (_handoffs b6b3382) — VERIFIED-PASS -> IN-PROGRESS (40 -> 39, IN-PROGRESS 12 -> 13) until re-proved in RR-228 */ /* RR-216: F92 PROVED (rr216-sabotage-2026-10-08T0359: 35 of 35) */ /* RR-214: F93 PROVED (rr214-sabotage-2026-10-08T0218: 31 of 31) */ /* RR-210: F38 PROVED (rr210-sabotage-2026-10-07T2305: 37 of 37) */ /* RR-208: F37 RE-PROVED under its Amendment 2 (rr208-sabotage-2026-10-07T2045: 59 of 59) */ /* RR-208: F37 REOPENED by its own Amendment 2 (_handoffs f9edf2a) — VERIFIED-PASS -> IN-PROGRESS */ /* RR-206: F94 PROVED in R7 (rr206-sabotage-2026-10-07T1855: 33 of 33) */ /* RR-192: F39 re-proved under Amendment 1 */ /* RR-225: F02 (Amendment 2) and F31 (Amendment 1) RE-PROVED (rr225-sabotage-2026-10-08T0805: 52 of 52) — the board back to 40/95, restated */
  /* RR-182 §3: Specification Amendment 5 appended F92–F96 UNASSESSED — UNASSESSED 44 → 49, rows 91 → 96, required 90 → 95; passed unchanged */
  assert.equal(p.total, 96); // F90 appended 28 Sep 2026 by Specification Amendment 1 (_handoffs a3a777b) — the board reads 8/90; F91 appended 30 Sep 2026 by Specification Amendment 3 (RR-103) — 91 rows
  assert.deepEqual(["F05", "F07", "F08", "F40"].map((f) => DECLARED[f].state), ["VERIFIED-PASS", "IN-PROGRESS", "VERIFIED-PASS", ((r) => (r.state === "IN-PROGRESS" && r.events.at(-1)?.kind === "REOPENED" && r.events.at(-1)?.reason === "AUTHORITATIVE_REQUIREMENT_CHANGE" && r.events.at(-2)?.kind === "ACCEPTANCE_AMENDED" ? "IN-PROGRESS" : "VERIFIED-PASS"))(DECLARED.F40)]); /* RR-188: F40's lawful state — VERIFIED-PASS, or IN-PROGRESS while its own Amendment 1 has reopened it */ /* RR-184: F40 frozen under its own acceptance (_handoffs 6d64c27), started after its lift, then PROVED (rr184-sabotage-2026-10-06T0301: 37 of 37) */ // F40 unblocked 2 Oct by the owner ruling (_handoffs 4761236); F07 reopened 28 Sep
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
  assert.match(r.stdout, /rows needing a transition event: F01, F02, F03, F04, F05, F06, F08, F09/); // F07 left the list on 28 Sep (reopened, IN-PROGRESS); F09 is VERIFIED-PASS since 25 Sep. F01 joined on 24 September 2026; F03 on 25 September 2026; F04 on 25 September 2026 /* RR-225: F02 (Amendment 2) and F31 (Amendment 1) RE-PROVED (rr225-sabotage-2026-10-08T0805: 52 of 52) — the board back to 40/95, restated */
  assert.match(r.stdout, /consistency errors\s*: 0/);
  assert.match(r.stdout, /F-progress \(computed from the board file\): 41\/95 required rows · all rows 41\/96 · NOT REQUIRED F25/); /* RR-244: F78 PROVED under its Amendment 2 on the real ledgers and the census (rr244-sabotage-2026-10-09T2236: 16 of 16; rr243-sabotage-2026-10-09T2240: 35 of 35; f78-sabotage-2026-10-09T2320: 22 of 22) — 40 -> 41, IN-PROGRESS 12 -> 11 */ /* RR-229 (c): F19 PROVED under its Amendment 1 on the committed real data (rr229c-sabotage-2026-10-08T2147: 14 of 14; rr227 68 of 68) — 39 -> 40, IN-PROGRESS 13 -> 12 */ /* RR-229: F31 re-proved under its same acceptance (rr229-sabotage-2026-10-08T1956: 37 of 37) — 38 -> 39, IN-PROGRESS 14 -> 13 */ /* RR-229: F31 REOPENED under its same acceptance (concrete contradictory evidence, _handoffs 57d6fe1) — VERIFIED-PASS -> IN-PROGRESS (39 -> 38, IN-PROGRESS 13 -> 14) until re-proved */ /* RR-227: F19 REOPENED by its own Amendment 1 (_handoffs b6b3382) — VERIFIED-PASS -> IN-PROGRESS (40 -> 39, IN-PROGRESS 12 -> 13) until re-proved in RR-228 */ /* RR-216: F92 PROVED (rr216-sabotage-2026-10-08T0359: 35 of 35) */ /* RR-214: F93 PROVED (rr214-sabotage-2026-10-08T0218: 31 of 31) */ /* RR-192: F39 re-proved under Amendment 1 */ /* RR-225: F02 (Amendment 2) and F31 (Amendment 1) RE-PROVED (rr225-sabotage-2026-10-08T0805: 52 of 52) — the board back to 40/95, restated */
});
