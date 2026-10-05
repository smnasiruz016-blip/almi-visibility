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
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors, progress } from "../src/fboard/board.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const board = () => buildBoard(CAPABILITIES, DECLARED);
const ctx = { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } }; // the corpus's measuring day: a later ruling (e.g. F02's Amendment 1, 25 Sep) is judged in force
const trail = () => productionAuditStore({ repo: REPO, forbiddenSubstrings: [] }).readAll().events;

test("F1-BOARD · F01 is VERIFIED-PASS by UNASSESSED → IN-PROGRESS → VERIFIED-PASS; the board reads 5/89; F05–F08 and F40 unchanged", () => {
  const b = board();
  assert.deepEqual(boardErrors(b, ctx), []);
  const p = progress(b);
  /* F04 VERIFIED-PASS on 25 Sep 2026 (movement 2 under Amendment 1, owner command 89e8664 §7) — the board reads 8/89. */
  /* F09 started on 25 Sep 2026 (movement 1 only: UNASSESSED -> IN-PROGRESS, owner commands e5f5fd4 / 474d27a) — VERIFIED-PASS unchanged. */
  /* F09 VERIFIED-PASS on 25 Sep 2026 (movement 2, close-out command 2601cb3 §10) — the board reads 9/89, measured on the closure tree. */
  /* F07 REOPENED 28 Sep 2026 (CONCRETE_CONTRADICTORY_EVIDENCE, eight out-of-band reads, _handoffs be583fa) — the board reads 8/89; test/f07-closure.test.mjs owns that movement. */
  /* F90 appended 28 Sep 2026 by Specification Amendment 1 (_handoffs a3a777b) — the board reads 8/90: F90 starts UNASSESSED. */
  assert.deepEqual(p.split, { UNASSESSED: 45, "ACCEPTANCE-FROZEN": 0, READY: 0, "IN-PROGRESS": 12, "BLOCKED-BY-AUTHORITY": 0, "BLOCKED-BY-EVIDENCE": 0, FAILED: 0, "VERIFIED-PASS": 34 }); /* F35 and F34 REOPENED 5 Oct 2026 (AUTHORITATIVE_REQUIREMENT_CHANGE, RR-174 §4) and RE-PROVED the same day under their Amendments 1 (RR-174 §8) — the board reads 34/90 again */
  assert.equal(p.passed, 34); /* F35 and F34 REOPENED 5 Oct 2026 (AUTHORITATIVE_REQUIREMENT_CHANGE, RR-174 §4) and RE-PROVED the same day under their Amendments 1 (RR-174 §8) — the board reads 34/90 again */
  assert.deepEqual(["F05", "F06", "F07", "F08", "F40"].map((f) => DECLARED[f].state), ["VERIFIED-PASS", "VERIFIED-PASS", "IN-PROGRESS", "VERIFIED-PASS", "UNASSESSED"]); // F40 unblocked 2 Oct by the owner ruling (_handoffs 4761236); F07 reopened 28 Sep
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
  // CONTROL: the same filter finds F07's three movements under its ORIGINAL acceptance (F07 Amendment 1 added three more under its own).
  assert.ok(trail().filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F07" && e.authorityRef?.propositionId === "F07_FROZEN_ACCEPTANCE").length === 3, "CONTROL: the same filter finds F07's three");
});
