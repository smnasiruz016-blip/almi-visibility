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
  /* Every event that records a row MOVING — whatever kind of movement. Keying the reverse check on the verification
   * kind alone was wrong: a reopening is a movement too, and a guard blind to it cannot tell a superseded pass from
   * a forged one. Verifications are still singled out for the forward check, because only they can justify a pass. */
  const boardEvents = events.filter((e) => e.eventType === "BOARD_TRANSITION" && e.metadata?.featureId);
  const movements = boardEvents.filter((e) => e.metadata.to);
  /* 🔴 A VERIFICATION IS A VERIFICATION EVEN WITHOUT from/to. Events recorded before those fields existed carry
   * neither, and filtering them out made an already-verified row look unaudited. They still prove the row was
   * verified; they simply cannot be compared on destination, and the destination check skips them for that reason. */
  const verifications = boardEvents.filter((e) => e.action === "VERIFIED");
  const order = new Map(boardEvents.map((e, i) => [e, `${e.occurredAt}|${String(i).padStart(6, "0")}`]));

  // FORWARD — a claimed pass must be backed by a verification event, and its LATEST movement must be that pass.
  for (const row of board.filter((r) => STATES_NEEDING_A_TRANSITION_EVENT.includes(r.state))) {
    const mine = verifications.filter((e) => e.metadata.featureId === row.featureId);
    if (mine.length === 0) {
      errs.push({ code: "MOVEMENT_NOT_AUDITED", id: row.featureId, why: `${row.featureId} is ${row.state} and the trail holds no verification event for it — a movement whose audit append failed does not stand` });
      continue;
    }
    /* 🔴 A ROW MAY LAWFULLY BE VERIFIED MORE THAN ONCE — reopened on contradictory evidence and verified again.
     * What is never lawful is the SAME movement recorded twice, so that is what is checked: same row, same from,
     * same to, same instant. A re-verification after a reopening differs in every one of those. */
    /* 🔴 D-RECORDER-1, the guard's half (26 Sep 2026): board movements are dated to the DAY, so two lawful re-verifications
     * on one day — each under its OWN governing acceptance (F07 Amendments 2 and 3) — share row, from, to and instant. The
     * movement's identity therefore also carries the authority that governed it, and, where the repaired recorder wrote one,
     * its identitySubject (which counts same-day movements). Same authority and the same identitySubject — or a legacy event
     * without one — is still the same movement recorded twice. */
    const seen = new Map();
    for (const e of mine) {
      const key = `${e.metadata.featureId}|${e.metadata.from}|${e.metadata.to}|${e.occurredAt}|${e.authorityRef?.propositionId ?? "NONE"}`;
      const subject = e.metadata.identitySubject ?? null;
      const earlier = seen.get(key) ?? [];
      if (earlier.some((s) => s === null || subject === null || s === subject)) errs.push({ code: "DUPLICATE_TRANSITION_EVENT", id: row.featureId, eventId: e.eventId, why: `${row.featureId}: the same movement (${e.metadata.from} -> ${e.metadata.to} at ${e.occurredAt}) is recorded more than once` });
      seen.set(key, [...earlier, subject]);
    }
    const latestVerification = mine.reduce((m, e) => (m === null || order.get(e) > order.get(m) ? e : m), null);
    if (latestVerification.metadata.to && latestVerification.metadata.to !== row.state) {
      errs.push({ code: "TRANSITION_DESTINATION_MISMATCH", id: row.featureId, why: `${row.featureId}: its latest verification records to=${latestVerification.metadata.to}, the board reads ${row.state}` });
    }
  }

  /* REVERSE — an event that names a destination must find the board in it. This is what stops a false record.
   *
   * 🔴 ONLY THE LATEST TRANSITION PER ROW IS COMPARED, AND THE REOPENING IS WHY.
   * The first version compared EVERY transition event against the board. The moment F08 moved
   * VERIFIED-PASS → FAILED on contradictory evidence, the earlier VERIFIED event was reported as a movement that
   * "did not happen" — but it did happen, and it is immutable history. A guard that cannot tell a SUPERSEDED past
   * movement from a FALSE one would make every lawful reopening look like a forged record, and would push whoever
   * hit it toward deleting history to get green. So the row's LATEST transition must match the board; earlier ones
   * are history and are returned as superseded, not as errors. The guard keeps all of its power: a latest
   * transition that does not match is still MOVEMENT_NOT_OBSERVED. */
  const latestPerRow = new Map();
  for (const e of movements) {
    const id = e.metadata.featureId;
    const prev = latestPerRow.get(id);
    if (!prev || order.get(e) > order.get(prev)) latestPerRow.set(id, e);
  }
  for (const e of latestPerRow.values()) {
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
