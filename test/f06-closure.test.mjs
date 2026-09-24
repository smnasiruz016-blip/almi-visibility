/**
 * 🔴 F06 · CLOSURE PROOFS — the board movement and its audit (24 September 2026).
 *
 *   · F6-BOARD  the board reads 4/89 (84 · 0 · 1 · 4) with F06 VERIFIED-PASS by UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS
 *               after its acceptance froze; F05, F07, F08 and F40 unchanged.
 *   · F6-TRAIL  each of F06's three declared events is in the production trail exactly once as a BOARD_TRANSITION, under
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
import { AUTHORITY_CORPUS } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors, progress } from "../src/fboard/board.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const board = () => buildBoard(CAPABILITIES, DECLARED);
const ctx = { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: "2026-09-24" } };
const trail = () => productionAuditStore({ repo: REPO, forbiddenSubstrings: [] }).readAll().events;

test("F6-BOARD · F06 is VERIFIED-PASS by UNASSESSED → IN-PROGRESS → VERIFIED-PASS; the board reads 4/89; F05, F07, F08, F40 unchanged", () => {
  const b = board();
  assert.deepEqual(boardErrors(b, ctx), []);
  const p = progress(b);
  assert.deepEqual(p.split, { UNASSESSED: 84, "ACCEPTANCE-FROZEN": 0, READY: 0, "IN-PROGRESS": 0, "BLOCKED-BY-AUTHORITY": 1, "BLOCKED-BY-EVIDENCE": 0, FAILED: 0, "VERIFIED-PASS": 4 });
  assert.equal(p.passed, 4);
  assert.equal(p.total, 89);
  assert.deepEqual(["F05", "F07", "F08", "F40"].map((f) => DECLARED[f].state), ["VERIFIED-PASS", "VERIFIED-PASS", "VERIFIED-PASS", "BLOCKED-BY-AUTHORITY"]);
  const f06 = DECLARED.F06;
  assert.equal(f06.state, "VERIFIED-PASS");
  assert.deepEqual(f06.events.map((e) => `${e.kind}@${e.on}`), ["ACCEPTANCE_FROZEN@2026-09-24", "IMPLEMENTATION@2026-09-24", "VERIFIED@2026-09-24"]);
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

test("F6-BOARD · CONTROL — without F06's REAL verification, or with implementation before the freeze, the board is refused", () => {
  const without = board().map((r) => (r.featureId === "F06" ? { ...r, events: r.events.filter((e) => e.kind !== "VERIFIED") } : r));
  assert.deepEqual(boardErrors(without, ctx).map((e) => `${e.code}:${e.id}`), ["PASS_WITHOUT_VERIFICATION:F06"]);
  const early = board().map((r) => (r.featureId === "F06" ? { ...r, events: [r.events[1], r.events[0], r.events[2]] } : r));
  assert.ok(boardErrors(early, ctx).some((e) => e.code === "IMPLEMENTATION_BEFORE_ACCEPTANCE" && e.id === "F06"));
});

test("F6-TRAIL · each F06 movement is in the production trail EXACTLY ONCE, under F06's own frozen acceptance", () => {
  const mine = trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F06");
  assert.deepEqual(mine.map((e) => e.action), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION", "VERIFIED"], `${mine.length} transition event(s) for F06`);
  for (const e of mine) assert.deepEqual(e.authorityRef, { propositionId: "F06_FROZEN_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F06"] });
  assert.deepEqual([mine[2].metadata.from, mine[2].metadata.to, mine[2].metadata.population], ["IN-PROGRESS", "VERIFIED-PASS", "REAL"]);
  assert.ok(trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F07").length === 3, "CONTROL: the same filter finds F07's three");
});

test("F6-TRAIL · the board ↔ audit consistency check is clean and names F06", () => {
  const r = spawnSync(process.execPath, [join(REPO, "tools/board-audit-consistency.mjs")], { cwd: REPO, encoding: "utf8" });
  assert.match(r.stdout, /rows needing a transition event: F05, F06, F07, F08/);
  assert.match(r.stdout, /consistency errors\s*: 0/);
  assert.match(r.stdout, /F-progress \(computed from the board file\): 4\/89/);
});
