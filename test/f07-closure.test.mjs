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

import { ACCEPTANCES, F07_ORIGINAL, F07_AMENDMENT_1 } from "../config/fboard/acceptances.mjs";
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
  assert.deepEqual(p.split, { UNASSESSED: 79, "ACCEPTANCE-FROZEN": 0, READY: 0, "IN-PROGRESS": 0, "BLOCKED-BY-AUTHORITY": 1, "BLOCKED-BY-EVIDENCE": 0, FAILED: 0, "VERIFIED-PASS": 9 });
  assert.equal(p.passed, 9); // F09 moved to VERIFIED-PASS on 25 Sep 2026 (close-out 2601cb3), measured on its closure tree. F02 moved to VERIFIED-PASS on 25 Sep 2026 under its own Amendment 1 (test/f02-disposition.test.mjs owns that movement). F03 moved to VERIFIED-PASS on 25 Sep 2026 on merged main, in two movements (test/f03-closure.test.mjs owns that movement). // 3/89 at F07's closure; F06 then moved under its own acceptance (24 Sep 2026) — test/f06-closure.test.mjs owns it; F01 the same day — test/f01-closure.test.mjs. F04 moved to VERIFIED-PASS on 25 Sep 2026 under its Amendment 1 (test/f04-amendment-zero-population.test.mjs owns that movement).
  assert.equal(p.total, 89);
  assert.deepEqual(["F05", "F08", "F40"].map((f) => DECLARED[f].state), ["VERIFIED-PASS", "VERIFIED-PASS", "BLOCKED-BY-AUTHORITY"]);

  const f07 = DECLARED.F07;
  assert.equal(f07.state, "VERIFIED-PASS");
  /* F07 Amendment 1 (25 Sep 2026, governance a0b7e4b): reopened on AUTHORITATIVE_REQUIREMENT_CHANGE and re-verified under the
   * amended contract. The first three events are history, frozen under the ORIGINAL acceptance (F07_ORIGINAL). */
  /* F07 Amendment 2 (26 Sep 2026, governance 051feb9): reopened again on AUTHORITATIVE_REQUIREMENT_CHANGE and re-verified under the
   * Amendment 2 contract. Amendment 1's three events are history, frozen under F07_AMENDMENT_1. */
  assert.deepEqual(f07.events.map((e) => `${e.kind}@${e.on}`), ["ACCEPTANCE_FROZEN@2026-09-23", "IMPLEMENTATION@2026-09-23", "VERIFIED@2026-09-23", "ACCEPTANCE_AMENDED@2026-09-25", "REOPENED@2026-09-25", "VERIFIED@2026-09-25", "ACCEPTANCE_AMENDED@2026-09-26", "REOPENED@2026-09-26", "VERIFIED@2026-09-26"]);
  const [frozen, impl, verified, amended, reopened, reverified, amended2, reopened2, reverified2] = f07.events;
  assert.equal(frozen.ruling, F07_ORIGINAL.ruling);
  assert.equal(frozen.contractSha256, F07_ORIGINAL.contractSha256);
  assert.equal(amended.contractSha256, F07_AMENDMENT_1.contractSha256);
  assert.deepEqual(amended.amends, { ruling: F07_ORIGINAL.ruling, contractSha256: F07_ORIGINAL.contractSha256 });
  assert.deepEqual([reopened.from, reopened.to, reopened.reason], ["VERIFIED-PASS", "IN-PROGRESS", "AUTHORITATIVE_REQUIREMENT_CHANGE"]);
  assert.match(reopened.rationale, /existing F07 evidence remains historically valid/);
  assert.match(reopened.rationale, /not by concealed contradictory evidence/);
  assert.deepEqual([reverified.from, reverified.to, reverified.featureId, reverified.population], ["IN-PROGRESS", "VERIFIED-PASS", "F07", "REAL"]);
  assert.deepEqual(reverified.acceptanceUnchanged, { ruling: F07_AMENDMENT_1.ruling.sha256, contract: F07_AMENDMENT_1.contractSha256 });
  assert.equal(amended2.contractSha256, ACCEPTANCES.F07.contractSha256);
  assert.deepEqual(amended2.amends, { ruling: F07_AMENDMENT_1.ruling, contractSha256: F07_AMENDMENT_1.contractSha256 });
  assert.deepEqual([reopened2.from, reopened2.to, reopened2.reason], ["VERIFIED-PASS", "IN-PROGRESS", "AUTHORITATIVE_REQUIREMENT_CHANGE"]);
  assert.match(reopened2.rationale, /Amendment 1's evidence remains historically valid for what it measured/);
  assert.match(reopened2.rationale, /live MARKING_KEY entries number zero/);
  assert.deepEqual([reverified2.from, reverified2.to, reverified2.featureId, reverified2.population], ["IN-PROGRESS", "VERIFIED-PASS", "F07", "REAL"]);
  assert.deepEqual(reverified2.acceptanceUnchanged, { ruling: ACCEPTANCES.F07.ruling.sha256, contract: ACCEPTANCES.F07.contractSha256 });
  assert.match(reverified2.realPopulationNewLimbs, /^NOT_MEASURED/, "the added limbs' zero real population is not recorded as NOT_MEASURED");
  assert.match(reverified2.afterMerge, /exact merged SHA/);
  assert.match(reverified.realPopulationNewLimbs, /^NOT_MEASURED/, "the new limbs' zero real population is not recorded as NOT_MEASURED");
  assert.match(reverified.afterMerge, /exact merged SHA/);
  assert.deepEqual([impl.from, impl.to], ["UNASSESSED", "IN-PROGRESS"]);
  assert.deepEqual([verified.from, verified.to, verified.featureId, verified.population], ["IN-PROGRESS", "VERIFIED-PASS", "F07", "REAL"]);
  assert.deepEqual(verified.acceptanceUnchanged, { ruling: F07_ORIGINAL.ruling.sha256, contract: F07_ORIGINAL.contractSha256 });
  for (const e of [impl, verified, reopened, reverified, reopened2, reverified2]) {
    assert.ok(!Object.hasOwn(e, "changeKind"), `${e.kind} carries the historical changeKind vocabulary`);
    assert.ok(e.reason, `${e.kind} moved with no stated reason`);
  }
  assert.match(verified.afterMerge, /exact merged SHA/);
});

test("F7-BOARD · CONTROL — the same board without F07's REAL verification, or with implementation before the freeze, is refused", () => {
  const without = board().map((r) => (r.featureId === "F07" ? { ...r, events: r.events.filter((e) => e.kind !== "VERIFIED") } : r));
  assert.deepEqual(boardErrors(without, ctx).map((e) => `${e.code}:${e.id}`), ["PASS_WITHOUT_VERIFICATION:F07"]);
  const fixture = board().map((r) => (r.featureId === "F07" ? { ...r, events: r.events.map((e) => (e.kind === "VERIFIED" ? { ...e, population: "FIXTURE" } : e)) } : r));
  assert.deepEqual(boardErrors(fixture, ctx).map((e) => `${e.code}:${e.id}`), ["PASS_WITHOUT_VERIFICATION:F07"]);
  const early = board().map((r) => (r.featureId === "F07" ? { ...r, events: [r.events[1], r.events[0], r.events[2]] } : r));
  assert.ok(boardErrors(early, ctx).some((e) => e.code === "IMPLEMENTATION_BEFORE_ACCEPTANCE" && e.id === "F07"));
});

test("F7-TRAIL · each F07 movement is in the production trail EXACTLY ONCE, under the acceptance that governed it, naming its states", () => {
  const mine = trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F07");
  assert.deepEqual(mine.map((e) => e.action), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION", "VERIFIED", "ACCEPTANCE_AMENDED", "REOPENED", "VERIFIED", "ACCEPTANCE_AMENDED", "REOPENED", "VERIFIED"], `${mine.length} transition event(s) for F07`);
  for (const e of mine.slice(0, 3)) {
    assert.deepEqual(e.authorityRef, { propositionId: "F07_FROZEN_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F07"] });
    assert.equal(e.occurredAt.slice(0, 10), "2026-09-23");
  }
  for (const e of mine.slice(3, 6)) {
    assert.deepEqual(e.authorityRef, { propositionId: "F07_ACCEPTANCE_AMENDMENT_1", scope: ["ALMIVISIBILITY", "F07"] });
    assert.equal(e.occurredAt.slice(0, 10), "2026-09-25");
  }
  for (const e of mine.slice(6)) {
    assert.deepEqual(e.authorityRef, { propositionId: "F07_ACCEPTANCE_AMENDMENT_2", scope: ["ALMIVISIBILITY", "F07"] });
    assert.equal(e.occurredAt.slice(0, 10), "2026-09-26");
  }
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
  assert.match(r.stdout, /rows needing a transition event: F01, F02, F03, F04, F05, F06, F07, F08/); // F06 and F01 joined on 24 September 2026; F03 on 25 September 2026; F04 on 25 September 2026
  assert.match(r.stdout, /consistency errors\s*: 0/);
  assert.match(r.stdout, /F-progress \(computed from the board file\): 9\/89/); // F09 moved on 25 Sep (close-out 2601cb3), measured 9/89 on the closure tree; 3/89 at F07's closure; F06 and F01 moved on 24 Sep; F02 and F03 on 25 Sep (measured 7/89 on the F03 closure tree); F04 on 25 Sep (8/89)
});
