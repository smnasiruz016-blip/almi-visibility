/**
 * F40 · THE 350-WORD FLOOR, LIFTED BY THE OWNER'S RULING (RR-127 §2a; ruling _handoffs 4761236).
 *
 * What is proved here: the lift is lawful and loses nothing; F40 is UNASSESSED, not implementable, not passed; and any acceptance frozen
 * for F40 later is REFUSED unless it carries the owner's check ("whether the page answers its stated need") and refuses a word count —
 * a control that fires. The lift is recorded under the ruling that made it, never under the authority it supersedes.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { ROW_CONSTRAINTS } from "../config/fboard/row-constraints.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors } from "../src/fboard/board.mjs";
import { familyBCandidates } from "../src/audit-trail/population.mjs";

const board = () => buildBoard(CAPABILITIES, DECLARED);
const ctx = { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } };

/** A stand-in F40 freeze carrying the given text in its EXPECTED clause — never committed, only offered to the validator. */
function withStandInFreeze(expected) {
  const acc = { ...ACCEPTANCES.F05, featureId: "F40", input: "", expected, failure: "", evidence: "" };
  const rows = board().map((r) => (r.featureId === "F40" ? { ...r, events: [...r.events, { kind: "ACCEPTANCE_FROZEN", on: "2026-10-02", ruling: acc.ruling, contractSha256: acc.contractSha256 }] } : r));
  return boardErrors(rows, { ...ctx, acceptances: { ...ACCEPTANCES, F40: acc } }).filter((e) => e.code === "ROW_CONSTRAINT_UNMET" && e.id === "F40").map((e) => e.why.match(/"([^"]+)"/)[1]).sort();
}

test("F40 · the board is valid with the lift; the lift passed nothing — F40 moved on only by its OWN acceptance, frozen and started after it (RR-184)", () => {
  assert.deepEqual(boardErrors(board(), ctx), []);
  /* RR-184: the lift itself left F40 UNASSESSED; its later movement is its own acceptance frozen (6d64c27), then IMPLEMENTATION, after the lift */
  const kinds = DECLARED.F40.events.map((e) => e.kind);
  assert.deepEqual(kinds.slice(0, 4), ["BLOCKER_RECORDED", "BLOCKER_LIFTED", "ACCEPTANCE_FROZEN", "IMPLEMENTATION"]);
  assert.deepEqual([DECLARED.F40.events[1].to, DECLARED.F40.events[3].from], ["UNASSESSED", "UNASSESSED"]);
  assert.ok(["IN-PROGRESS", "VERIFIED-PASS"].includes(DECLARED.F40.state), DECLARED.F40.state);
  assert.equal(DECLARED.F40.events.findIndex((e) => e.kind === "VERIFIED") < 0 || DECLARED.F40.state === ((r) => (r.state === "IN-PROGRESS" && r.events.at(-1)?.kind === "REOPENED" && r.events.at(-1)?.reason === "AUTHORITATIVE_REQUIREMENT_CHANGE" && r.events.at(-2)?.kind === "ACCEPTANCE_AMENDED" ? "IN-PROGRESS" : "VERIFIED-PASS"))(DECLARED.F40), true, "a VERIFIED event without the VERIFIED-PASS state, or a reopen without its own amendment" /* RR-188: F40's lawful state — VERIFIED-PASS, or IN-PROGRESS while its own Amendment 1 has reopened it */);
});

test("F40 · FIRING CONTROL: an F40 acceptance WITHOUT the owner's check, or without refusing a word count, cannot be frozen; with both it can", () => {
  assert.deepEqual(withStandInFreeze("a page passes when it has at least 350 words"), ["no fixed minimum and no fixed maximum page word count", "whether the page answers its stated need"]);
  assert.deepEqual(withStandInFreeze("judged by whether the page answers its stated need"), ["no fixed minimum and no fixed maximum page word count"]);
  assert.deepEqual(withStandInFreeze("judged by whether the page answers its stated need, with no fixed minimum and no fixed maximum page word count"), []);
  assert.deepEqual(ROW_CONSTRAINTS.filter((c) => c.featureId === "F40").map((c) => c.authority.propositionId), ["OWNER_RULING_F40_ANSWER_SUFFICIENCY", "OWNER_RULING_F40_ANSWER_SUFFICIENCY"]);
});

test("F40 · FIRING CONTROL: the lift is recorded under ITS OWN authority, not the blocker source it supersedes", () => {
  const blockerAuthority = { F40: { propositionId: "CC_COMMAND_F05_CURRENT_AUTHORITY_REGISTER_CHAIN", scope: ["ALMIVISIBILITY", "F05"] } };
  const declared = { F40: DECLARED.F40 };
  const run = (decl) => familyBCandidates({ declared: decl, versions: [], recorded: [], softwareVersion: "t", correlationId: "run:t", migratedAt: "2026-10-02T00:00:00Z", blockerAuthority });
  const of = (out, kind) => out.find((c) => c.sourceId?.startsWith(`F40:${kind}`))?.draft?.authorityRef?.propositionId ?? out.find((c) => c.sourceId?.startsWith(`F40:${kind}`))?.event?.authorityRef?.propositionId;
  const out = run(declared);
  assert.equal(of(out, "BLOCKER_RECORDED"), "CC_COMMAND_F05_CURRENT_AUTHORITY_REGISTER_CHAIN");
  assert.equal(of(out, "BLOCKER_LIFTED"), "OWNER_RULING_F40_ANSWER_SUFFICIENCY", "the lift was recorded under the authority it supersedes");
  /* control: strip the event's own authority — the recorder falls back to the blocker source, and this test would see it */
  const stripped = run({ F40: { ...DECLARED.F40, events: DECLARED.F40.events.map((e) => (e.kind === "BLOCKER_LIFTED" ? { ...e, authority: undefined } : e)) } });
  assert.equal(of(stripped, "BLOCKER_LIFTED"), "CC_COMMAND_F05_CURRENT_AUTHORITY_REGISTER_CHAIN");
});
