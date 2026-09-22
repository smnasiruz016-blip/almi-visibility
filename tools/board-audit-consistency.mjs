#!/usr/bin/env node
/**
 * 🔴 THE BOARD AND ITS AUDIT TRAIL MUST AGREE — IN BOTH DIRECTIONS (22 September 2026).
 *
 *   node tools/board-audit-consistency.mjs [--check]
 *
 * READ-ONLY. It writes nothing and needs no write gate.
 *
 * ── WHY BOTH DIRECTIONS, AND WHY THIS IS WHAT MAKES THE ORDERING SAFE ──────
 *
 * A board movement and its audit event live in two files. Nothing at the filesystem level makes two writes atomic,
 * so the guarantee is made HERE and enforced by the suite and by CI:
 *
 *   FORWARD   a row that claims VERIFIED-PASS must have exactly ONE matching transition event in the trail.
 *             A movement whose audit append failed therefore cannot stand: the tree is invalid and CI refuses it.
 *   REVERSE   a transition event that names a destination state must find the board in that state.
 *             An event written for a movement that then failed therefore cannot read as a success: it is INVALID
 *             and it is named. A false record is louder than a missing one, which is the point.
 *
 * Together the two make the pair effectively atomic at the only level that matters — what `main` holds — because
 * neither half can be committed alone without CI going red.
 *
 * It reports ids, states, counts and codes. Never payload.
 */
import { CAPABILITIES } from "../config/fboard/capabilities.mjs";
import { ACCEPTANCES } from "../config/fboard/acceptances.mjs";
import { DECLARED } from "../config/fboard/f-board.mjs";
import { AUTHORITY_CORPUS, CORPUS_PROVENANCE } from "../config/authority/corpus.mjs";
import { buildBoard, boardErrors, progress } from "./../src/fboard/board.mjs";
import { productionAuditStore } from "../src/audit-trail/wiring.mjs";
import { compareRecords, BOARD_AUTHORITY_RULING_SHA256 } from "../src/fboard/record-authority.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** States whose truth rests on a recorded verification, and therefore on a transition event in the trail. */
export const STATES_NEEDING_A_TRANSITION_EVENT = Object.freeze(["VERIFIED-PASS"]);

/**
 * Every inconsistency between a board and an audit trail. `[]` means the pair is coherent.
 * Both arguments are injected so a test can point this at a fixture and prove the check FIRES.
 */
export function consistencyErrors({ board, events }) {
  const errs = [];
  const transitions = events.filter((e) => e.eventType === "BOARD_TRANSITION" && e.action === "VERIFIED");

  // FORWARD — a claimed pass needs exactly one transition event that names it.
  for (const row of board.filter((r) => STATES_NEEDING_A_TRANSITION_EVENT.includes(r.state))) {
    const mine = transitions.filter((e) => e.metadata?.featureId === row.featureId);
    if (mine.length === 0) {
      errs.push({ code: "MOVEMENT_NOT_AUDITED", id: row.featureId, why: `${row.featureId} is ${row.state} and the trail holds no transition event for it — a movement whose audit append failed does not stand` });
      continue;
    }
    if (mine.length > 1) errs.push({ code: "DUPLICATE_TRANSITION_EVENT", id: row.featureId, why: `${row.featureId} has ${mine.length} transition events; exactly one is lawful` });
    for (const e of mine) {
      if (e.metadata?.to && e.metadata.to !== row.state) {
        errs.push({ code: "TRANSITION_DESTINATION_MISMATCH", id: row.featureId, why: `${row.featureId}: the event records to=${e.metadata.to}, the board reads ${row.state}` });
      }
    }
  }

  // REVERSE — an event that names a destination must find the board in it. This is what stops a false record.
  for (const e of transitions) {
    const id = e.metadata?.featureId;
    const to = e.metadata?.to;
    if (!to) continue;
    const row = board.find((r) => r.featureId === id);
    if (!row) { errs.push({ code: "MOVEMENT_NOT_OBSERVED", id: id ?? "?", eventId: e.eventId, why: `a transition event names ${id}, which is not a row on this board` }); continue; }
    /* 🔴 THE COMPARISON IS MADE BY THE MODULE THAT OWNS THE RULE, not reimplemented here. An audit event is a
     * record like any other: where it disagrees with the board about an active row, the board governs and the
     * disagreement is reported. src/fboard/record-authority.mjs applies that ruling and fails closed without it. */
    const verdict = compareRecords({ featureId: id, boardState: row.state, recordState: to, rulingSha256: BOARD_AUTHORITY_RULING_SHA256 });
    if (verdict.flagged) {
      errs.push({ code: "MOVEMENT_NOT_OBSERVED", id, eventId: e.eventId, why: `a transition event records ${id} moving to ${to}, but the board reads ${verdict.state} — the movement the event describes did not happen` });
    }
  }
  return errs;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split("\\").join("/").split("/").pop())) {
  const board = buildBoard(CAPABILITIES, DECLARED);
  const events = productionAuditStore({ repo: REPO, forbiddenSubstrings: [] }).readAll().events;
  const errs = consistencyErrors({ board, events });
  const bErrs = boardErrors(board, { capabilities: CAPABILITIES, acceptances: ACCEPTANCES, authority: { records: AUTHORITY_CORPUS, now: CORPUS_PROVENANCE.now } });
  const p = progress(board);
  const transitions = events.filter((e) => e.eventType === "BOARD_TRANSITION" && e.action === "VERIFIED");
  console.log(`BOARD ↔ AUDIT CONSISTENCY — ${board.length} rows · ${events.length} audit events · ${transitions.length} VERIFIED transition event(s)`);
  console.log(`  rows needing a transition event: ${board.filter((r) => STATES_NEEDING_A_TRANSITION_EVENT.includes(r.state)).map((r) => r.featureId).join(", ") || "none"}`);
  console.log(`  board validator errors: ${bErrs.length}`);
  for (const e of bErrs) console.log(`    🔴 ${e.code} ${e.id ?? ""} — ${e.why}`);
  console.log(`  consistency errors    : ${errs.length}`);
  for (const e of errs) console.log(`    🔴 ${e.code} ${e.id} — ${e.why}`);
  console.log(`  F-progress (computed from the board file): ${p.passed}/${p.denominator}`);
  if (process.argv.includes("--check") && (errs.length || bErrs.length)) process.exit(1);
}
