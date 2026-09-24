/**
 * 🔴 F01 · CLOSURE PROOFS — the board movement and its audit (24 September 2026).
 *
 *   · F1-BOARD  the board reads 5/89 (83 · 0 · 1 · 5) with F01 VERIFIED-PASS by UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS
 *               after its acceptance froze; F05, F06, F07, F08 and F40 unchanged.
 *   · F1-TRAIL  each of F01's three declared events is in the production trail exactly once as a BOARD_TRANSITION, under
 *               F01's own frozen acceptance.
 * Each carries a control able to give the other verdict.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

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

test("F1-BOARD · F01 is VERIFIED-PASS by UNASSESSED → IN-PROGRESS → VERIFIED-PASS; the board reads 5/89; F05–F08 and F40 unchanged", () => {
  const b = board();
  assert.deepEqual(boardErrors(b, ctx), []);
  const p = progress(b);
  assert.deepEqual(p.split, { UNASSESSED: 83, "ACCEPTANCE-FROZEN": 0, READY: 0, "IN-PROGRESS": 0, "BLOCKED-BY-AUTHORITY": 1, "BLOCKED-BY-EVIDENCE": 0, FAILED: 0, "VERIFIED-PASS": 5 });
  assert.equal(p.passed, 5);
  assert.deepEqual(["F05", "F06", "F07", "F08", "F40"].map((f) => DECLARED[f].state), ["VERIFIED-PASS", "VERIFIED-PASS", "VERIFIED-PASS", "VERIFIED-PASS", "BLOCKED-BY-AUTHORITY"]);
  const f01 = DECLARED.F01;
  assert.equal(f01.state, "VERIFIED-PASS");
  assert.deepEqual(f01.events.map((e) => `${e.kind}@${e.on}`), ["ACCEPTANCE_FROZEN@2026-09-24", "IMPLEMENTATION@2026-09-24", "VERIFIED@2026-09-24"]);
  const [frozen, impl, verified] = f01.events;
  assert.equal(frozen.ruling, ACCEPTANCES.F01.ruling);
  assert.equal(frozen.contractSha256, ACCEPTANCES.F01.contractSha256);
  assert.deepEqual([impl.from, impl.to], ["UNASSESSED", "IN-PROGRESS"]);
  assert.deepEqual([verified.from, verified.to, verified.featureId, verified.population], ["IN-PROGRESS", "VERIFIED-PASS", "F01", "REAL"]);
  assert.deepEqual(verified.acceptanceUnchanged, { ruling: ACCEPTANCES.F01.ruling.sha256, contract: ACCEPTANCES.F01.contractSha256 });
  for (const e of [impl, verified]) {
    assert.ok(!Object.hasOwn(e, "changeKind"), `${e.kind} carries the historical changeKind vocabulary`);
    assert.ok(e.reason, `${e.kind} moved with no stated reason`);
  }
  assert.match(verified.afterMerge, /exact merged SHA/);
});

test("F1-BOARD · CONTROL — without F01's REAL verification, or with implementation before the freeze, the board is refused", () => {
  const without = board().map((r) => (r.featureId === "F01" ? { ...r, events: r.events.filter((e) => e.kind !== "VERIFIED") } : r));
  assert.deepEqual(boardErrors(without, ctx).map((e) => `${e.code}:${e.id}`), ["PASS_WITHOUT_VERIFICATION:F01"]);
  const early = board().map((r) => (r.featureId === "F01" ? { ...r, events: [r.events[1], r.events[0], r.events[2]] } : r));
  assert.ok(boardErrors(early, ctx).some((e) => e.code === "IMPLEMENTATION_BEFORE_ACCEPTANCE" && e.id === "F01"));
});

test("F1-TRAIL · each F01 movement is in the production trail EXACTLY ONCE, under F01's own frozen acceptance", () => {
  const mine = trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F01");
  assert.deepEqual(mine.map((e) => e.action), ["ACCEPTANCE_FROZEN", "IMPLEMENTATION", "VERIFIED"], `${mine.length} transition event(s) for F01`);
  for (const e of mine) assert.deepEqual(e.authorityRef, { propositionId: "F01_FROZEN_ACCEPTANCE", scope: ["ALMIVISIBILITY", "F01"] });
  assert.deepEqual([mine[2].metadata.from, mine[2].metadata.to, mine[2].metadata.population], ["IN-PROGRESS", "VERIFIED-PASS", "REAL"]);
  assert.ok(trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F07").length === 3, "CONTROL: the same filter finds F07's three");
});
