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

import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
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
  assert.deepEqual(p.split, { UNASSESSED: 80, "ACCEPTANCE-FROZEN": 0, READY: 0, "IN-PROGRESS": 0, "BLOCKED-BY-AUTHORITY": 1, "BLOCKED-BY-EVIDENCE": 0, FAILED: 0, "VERIFIED-PASS": 8 });
  assert.equal(p.passed, 8); // F02 moved to VERIFIED-PASS on 25 Sep 2026 under its own Amendment 1 (test/f02-disposition.test.mjs owns that movement). F03 moved to VERIFIED-PASS on 25 Sep 2026 on merged main, in two movements (test/f03-closure.test.mjs owns that movement). // 3/89 at F07's closure; F06 then moved under its own acceptance (24 Sep 2026) — test/f06-closure.test.mjs owns it; F01 the same day — test/f01-closure.test.mjs. F04 moved to VERIFIED-PASS on 25 Sep 2026 under its Amendment 1 (test/f04-amendment-zero-population.test.mjs owns that movement).
  assert.equal(p.total, 89);
  assert.deepEqual(["F05", "F08", "F40"].map((f) => DECLARED[f].state), ["VERIFIED-PASS", "VERIFIED-PASS", "BLOCKED-BY-AUTHORITY"]);

  const f07 = DECLARED.F07;
  assert.equal(f07.state, "VERIFIED-PASS");
  assert.deepEqual(f07.events.map((e) => `${e.kind}@${e.on}`), ["ACCEPTANCE_FROZEN@2026-09-23", "IMPLEMENTATION@2026-09-23", "VERIFIED@2026-09-23"]);
  const [frozen, impl, verified] = f07.events;
  assert.equal(frozen.ruling, ACCEPTANCES.F07.ruling);
  assert.equal(frozen.contractSha256, ACCEPTANCES.F07.contractSha256);
  assert.deepEqual([impl.from, impl.to], ["UNASSESSED", "IN-PROGRESS"]);
  assert.deepEqual([verified.from, verified.to, verified.featureId, verified.population], ["IN-PROGRESS", "VERIFIED-PASS", "F07", "REAL"]);
  assert.deepEqual(verified.acceptanceUnchanged, { ruling: ACCEPTANCES.F07.ruling.sha256, contract: ACCEPTANCES.F07.contractSha256 });
  for (const e of [impl, verified]) {
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

test("F7-TRAIL · each F07 movement is in the production trail EXACTLY ONCE, under F07's own frozen acceptance, naming its states", () => {
  const mine = trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F07");
  assert.deepEqual(mine.map((e) => e.action), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION", "VERIFIED"], `${mine.length} transition event(s) for F07`);
  for (const e of mine) {
    assert.deepEqual(e.authorityRef, { propositionId: "F07_FROZEN_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F07"] });
    assert.equal(e.occurredAt.slice(0, 10), "2026-09-23");
  }
  assert.deepEqual([mine[1].metadata.from, mine[1].metadata.to], ["UNASSESSED", "IN-PROGRESS"]);
  assert.deepEqual([mine[2].metadata.from, mine[2].metadata.to, mine[2].metadata.population], ["IN-PROGRESS", "VERIFIED-PASS", "REAL"]);
  // CONTROL, PROVED CAPABLE: the same filter finds F08's movements, so "exactly these three" is a count, not a vacancy.
  assert.ok(trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F08").length >= 2);
});

test("F7-TRAIL · the board ↔ audit consistency check is clean, and names F07 among the rows that needed a transition", () => {
  const r = spawnSync(process.execPath, [join(REPO, "tools/board-audit-consistency.mjs")], { cwd: REPO, encoding: "utf8" });
  assert.match(r.stdout, /rows needing a transition event: F01, F02, F03, F04, F05, F06, F07, F08/); // F06 and F01 joined on 24 September 2026; F03 on 25 September 2026; F04 on 25 September 2026
  assert.match(r.stdout, /consistency errors\s*: 0/);
  assert.match(r.stdout, /F-progress \(computed from the board file\): 8\/89/); // 3/89 at F07's closure; F06 and F01 moved on 24 Sep; F02 and F03 on 25 Sep (measured 7/89 on the F03 closure tree); F04 on 25 Sep (8/89)
});
