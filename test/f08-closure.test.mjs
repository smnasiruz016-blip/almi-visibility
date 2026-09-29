/**
 * 🔴 F08 · CLOSURE PROOFS — the acceptance pin, the board movement, and the audit of that movement (23 September 2026).
 *
 * What only this closure can prove, each with a control shown able to go the other way (the acceptance pin and its
 * one-word control are test/f08-acceptance-pin.test.mjs):
 *   · F-TEXT  a routed text caller kept its mixed line endings byte for byte;
 *   · F-BOARD the board reads 2/89 with F08 VERIFIED-PASS by its own lawful route, F05 and F40 unchanged, history kept;
 *   · F-TRAIL both movements are in the production audit trail as BOARD_TRANSITION events — a row that moved with no
 *             audit event would be F08's own FAILURE clause, committed by F08.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors, progress } from "../src/fboard/board.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const board = () => buildBoard(CAPABILITIES, DECLARED);

test("F-TEXT · P9 · a routed text caller kept its MIXED line endings byte for byte — the one bare LF survives beside the CRLF lines", () => {
  /* bin/quote-match.mjs held 115 CRLF lines and ONE bare LF before it was routed (origin/main 2c7e6e1). A normalising
   * edit would have rewritten every line; the byte-preserving edit touched only its anchors. Measured on the file. */
  // The committed BLOB, not the checkout: a checkout's line endings depend on the machine, the blob's do not.
  const b = execFileSync("git", ["-C", REPO, "show", "HEAD:bin/quote-match.mjs"]);
  let crlf = 0, bare = 0;
  for (let i = 0; i < b.length; i += 1) if (b[i] === 10) { if (i > 0 && b[i - 1] === 13) crlf += 1; else bare += 1; }
  assert.equal(bare, 1, `the file now holds ${bare} bare LF line(s) — its line endings were normalised`);
  assert.ok(crlf >= 115, `only ${crlf} CRLF lines remain`);
});

test("F-BOARD · F08 is VERIFIED-PASS by FAILED → IN-PROGRESS → VERIFIED-PASS; the board reads 2/89; F05, F40 and F08's history are unchanged", () => {
  const b = board();
  assert.deepEqual(boardErrors(b, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } }), []); // the corpus's measuring day (F06, 24 Sep, did not exist on the 23rd)
  const p = progress(b);
  /* Read 2/89 at F08's closure. F07 then moved to VERIFIED-PASS under its own acceptance (23 September 2026), so the
   * board reads 3/89, and after F06 (24 September 2026) 4/89, and after F01 (the same day) 5/89; F08's own assertions below are unchanged. test/f07-closure.test.mjs owns F07's movement. */
  /* F04 VERIFIED-PASS on 25 Sep 2026 (movement 2 under Amendment 1, owner command 89e8664 §7) — the board reads 8/89. */
  /* F09 started on 25 Sep 2026 (movement 1 only: UNASSESSED -> IN-PROGRESS, owner commands e5f5fd4 / 474d27a) — VERIFIED-PASS unchanged. */
  /* F09 VERIFIED-PASS on 25 Sep 2026 (movement 2, close-out command 2601cb3 §10) — the board reads 9/89, measured on the closure tree. */
  /* F07 REOPENED 28 Sep 2026 (CONCRETE_CONTRADICTORY_EVIDENCE, eight out-of-band reads, _handoffs be583fa) — the board reads 8/89; test/f07-closure.test.mjs owns that movement. */
  /* F90 appended 28 Sep 2026 by Specification Amendment 1 (_handoffs a3a777b) — the board reads 8/90: F90 starts UNASSESSED. */
  assert.deepEqual(p.split, { UNASSESSED: 69, "ACCEPTANCE-FROZEN": 0, READY: 0, "IN-PROGRESS": 2, "BLOCKED-BY-AUTHORITY": 1, "BLOCKED-BY-EVIDENCE": 0, FAILED: 0, "VERIFIED-PASS": 18 }); // F10 IN-PROGRESS on 26 Sep (movement 1, acceptance 504dbb9); VERIFIED-PASS still 9/89
  assert.equal(p.passed, 18); /* F41 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 454396e) — the board reads 18/90 */ /* F39 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-90, acceptance 90e798d) — the board reads 17/90 */ /* F32 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance a0b9776) — the board reads 16/90 */ /* F35 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-88, acceptance da659bd) — the board reads 15/90 */ /* F36 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-87, acceptance 2635153) — the board reads 14/90 */ /* F21 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-86, acceptance 804ebd1) — the board reads 13/90 */ /* F31 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-85, acceptance 3a8f7ba) — the board reads 12/90 */ /* F33 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 29 Sep 2026 (RR-84, acceptance 9dc9bc2) — the board reads 11/90 */ /* F34 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-83, acceptance 53f74b4) — the board reads 10/90 */ /* F77 moved UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS on 28 Sep 2026 (RR-82, Amendment 1 b443e5e) — the board reads 9/90 */ // F07 REOPENED 28 Sep 2026 (CONCRETE_CONTRADICTORY_EVIDENCE, eight out-of-band reads, _handoffs be583fa) — the board reads 8/89. F09 moved to VERIFIED-PASS on 25 Sep 2026 (close-out 2601cb3), measured on its closure tree. F02 moved to VERIFIED-PASS on 25 Sep 2026 under its own Amendment 1 (test/f02-disposition.test.mjs owns that movement). F03 moved to VERIFIED-PASS on 25 Sep 2026 on merged main, in two movements (test/f03-closure.test.mjs owns that movement). F04 moved to VERIFIED-PASS on 25 Sep 2026 under its Amendment 1 (test/f04-amendment-zero-population.test.mjs owns that movement).
  assert.equal(p.total, 90); // F90 appended 28 Sep 2026 by Specification Amendment 1 (_handoffs a3a777b) — the board reads 8/90
  assert.equal(DECLARED.F05.state, "VERIFIED-PASS");
  assert.equal(DECLARED.F40.state, "BLOCKED-BY-AUTHORITY");
  const f08 = DECLARED.F08;
  assert.equal(f08.state, "VERIFIED-PASS");
  const kinds = f08.events.map((e) => `${e.kind}@${e.on}`);
  // History is immutable: the first verification and the contradiction that reopened it are still there, in order.
  assert.deepEqual(kinds.slice(0, 4), ["ACCEPTANCE_FROZEN@2026-09-22", "IMPLEMENTATION@2026-09-22", "VERIFIED@2026-09-22", "CONTRADICTORY_EVIDENCE_RECORDED@2026-09-22"]);
  const [repair, verified] = f08.events.slice(4, 6);
  assert.deepEqual([repair.kind, repair.from, repair.to, repair.on], ["IMPLEMENTATION", "FAILED", "IN-PROGRESS", "2026-09-23"]);
  assert.deepEqual([verified.kind, verified.from, verified.to, verified.on, verified.featureId, verified.population], ["VERIFIED", "IN-PROGRESS", "VERIFIED-PASS", "2026-09-23", "F08", "REAL"]);
  /* 8 since 26 Sep 2026: F08 was REOPENED on CONCRETE_CONTRADICTORY_EVIDENCE (D-RECORDER-1, _handoffs 99f0732) and re-VERIFIED under
   * its UNCHANGED acceptance after the recorder repair. The six events above are unchanged, in order. */
  /* 10 since 27 Sep 2026: REOPENED again on CONCRETE_CONTRADICTORY_EVIDENCE (65 governed events removed by git checkout of the
   * trail, _handoffs 5fd0435) and re-VERIFIED after the out-of-tree witness repair, under the UNCHANGED acceptance. */
  assert.equal(f08.events.length, 10);
  assert.deepEqual(f08.events.slice(8).map((e) => [e.kind, e.from, e.to, e.on, e.reason]), [["REOPENED", "VERIFIED-PASS", "IN-PROGRESS", "2026-09-27", "CONCRETE_CONTRADICTORY_EVIDENCE"], ["VERIFIED", "IN-PROGRESS", "VERIFIED-PASS", "2026-09-27", "APPEND_ONLY_HELD_AGAINST_SOURCE_CONTROL_OPERATIONS_GAP_RECORDED"]]);
  assert.deepEqual(f08.events.slice(6, 8).map((e) => [e.kind, e.from, e.to, e.on, e.reason]), [["REOPENED", "VERIFIED-PASS", "IN-PROGRESS", "2026-09-26", "CONCRETE_CONTRADICTORY_EVIDENCE"], ["VERIFIED", "IN-PROGRESS", "VERIFIED-PASS", "2026-09-26", "FAILURE_CLAUSES_NO_LONGER_MET_AFTER_RECORDER_REPAIR"]]);
  // 🔴 The target-aware ruling (§12): the historical changeKind vocabulary is NOT used by the new movements.
  for (const e of [repair, verified]) assert.ok(!Object.hasOwn(e, "changeKind"), `${e.kind} carries the historical changeKind vocabulary`);
  assert.ok(repair.reason && verified.reason, "a movement without a stated reason");
  assert.deepEqual(verified.acceptanceUnchanged, { ruling: ACCEPTANCES.F08.ruling.sha256, contract: ACCEPTANCES.F08.contractSha256 });
});

test("F-TRAIL · both 23 September movements are BOARD_TRANSITION events in the production trail — and the chain verifies", () => {
  const events = readFileSync(join(REPO, "audit-trail/events.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const moved = events.filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F08" && e.occurredAt.startsWith("2026-09-23"));
  assert.deepEqual(moved.map((e) => [e.action, e.metadata.from, e.metadata.to]).sort(), [["IMPLEMENTATION", "FAILED", "IN-PROGRESS"], ["VERIFIED", "IN-PROGRESS", "VERIFIED-PASS"]]);
  for (const e of moved) {
    assert.equal(e.authorityRef.propositionId, ACCEPTANCES.F08.authority.propositionId);
    assert.equal(e.migration, true, "a declared board event is recorded as migrated, never as natively observed");
    assert.equal(e.metadata.changeKind, "", "the historical changeKind vocabulary reached the trail");
  }
  const v = productionAuditStore({ repo: REPO, forbiddenSubstrings: [] }).verify();
  assert.equal(v.ok, true, `the production chain does not verify: ${JSON.stringify(v.findings)}`);
  // CONTROL — the same filter does find the 22 September movements, so an empty result above could not pass.
  assert.ok(events.some((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId === "F08" && e.action === "CONTRADICTORY_EVIDENCE_RECORDED"));
});
