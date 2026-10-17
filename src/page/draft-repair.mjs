/**
 * 🔴 F42 · DRAFT REPAIR ASSISTANT (acceptance _handoffs 1fcee4a, AlmiVisibility_F42_ACCEPTANCE_2026-10-17.md, RR-283 item 6).
 *
 * A draft that fails its gate is repaired at most twice, never by changing what it states or where it got it:
 *
 *   GATE        the engine's own builder law the approved text names — "to the point" (src/page/joined-page.mjs joinedChecks
 *               toThePoint, RR-265: every answer opens with one short sentence, every sourced line is one short sentence, no declared
 *               filler phrase stands in an answer). Its named failures are the law's own: each filler phrase hit, each opening, each line.
 *   C1/C5       the PROTECTED part of a draft — every claim's text, quotation, source and evidence state, and every owner-approved
 *               product statement — must be byte-equal after a round; a proposal that touches it is refused and changes nothing
 *   C2          at most MAX_REPAIR_ROUNDS (F40's own constant: two) rounds follow the initial draft; the repair is never asked a third time
 *   C3          a round that removes no named failure ends the repair
 *   C4          a draft still failing is PARKED with its gate and its remaining failures, and no approval can be made for it
 *
 * The repair itself is PROPOSED in the existing agent session (`propose(draft, failures, round)` is handed in); this module only judges and
 * keeps the boundary. Pure: no file, network, process, provider or clock. Names no product, host or tenant.
 */
import { joinedChecks } from "./joined-page.mjs";
import { MAX_REPAIR_ROUNDS } from "./quality-judgements.mjs";

export { MAX_REPAIR_ROUNDS };
export const REPAIR_GATE = "toThePoint";
export const REPAIR = Object.freeze({ NOT_NEEDED: "NOT_NEEDED", REPAIRED: "REPAIRED", PARKED: "PARKED" });
export const REPAIR_REFUSAL = Object.freeze({ TOUCHED_PROTECTED: "REPAIR_TOUCHED_PROTECTED", NO_PROGRESS: "NO_NAMED_FAILURE_REMOVED", ROUNDS_SPENT: "TWO_ROUNDS_SPENT", PARKED_NOT_APPROVABLE: "PARKED_DRAFT_IS_NEVER_OFFERED_FOR_APPROVAL" });

/** The gate's named failures for one draft: the law's own why, each named item on its own. */
export function gateFailures(draft, { fillerPhrases = [] } = {}) {
  const r = joinedChecks({ fillerPhrases, items: draft.itemList ?? [], html: draft.html ?? "" })[REPAIR_GATE];
  if (r.state === "PASS") return Object.freeze([]);
  return Object.freeze(String(r.why ?? "").split("; ").flatMap((part) => {
    const at = part.indexOf(": ");
    /* the law lists its named items with ", " — one failure each */
    return at < 0 ? [part] : part.slice(at + 2).split(", ").map((x) => `${part.slice(0, at)}: ${x}`);
  }));
}

/** The part of a draft a repair may never change: every claim's words, quotation, source and evidence state; every owner-approved statement. */
export function protectedPart(draft) {
  return JSON.stringify((draft.itemList ?? []).map((it) => [
    it.needKey,
    (it.claims ?? []).map((c) => [c.claimId, c.text ?? null, c.quotation ?? null, c.source ?? null, c.supports ?? null, c.states ?? null, c.label ?? null]),
    (it.statements ?? []).map((s) => [s.answerId ?? null, s.text ?? null]),
  ]));
}

/**
 * Repair one draft. Returns the record of the repair: its state, the rounds it took, the failures before and after, and — when PARKED — the
 * gate and the exact remaining failures. `propose` is asked at most MAX_REPAIR_ROUNDS times.
 */
export function repairDraft({ draft, propose, fillerPhrases = [] }) {
  const judge = (d) => gateFailures(d, { fillerPhrases });
  const initial = judge(draft);
  if (initial.length === 0) return Object.freeze({ state: REPAIR.NOT_NEEDED, rounds: 0, gate: REPAIR_GATE, before: initial, after: initial, draft });
  const guard = protectedPart(draft);
  let current = draft, failures = initial, rounds = 0, stop = null;
  const log = [];
  while (rounds < MAX_REPAIR_ROUNDS) {
    rounds += 1;
    const proposed = propose(current, failures, rounds);
    if (!proposed || protectedPart(proposed) !== guard) { log.push(Object.freeze({ round: rounds, refused: REPAIR_REFUSAL.TOUCHED_PROTECTED })); stop = REPAIR_REFUSAL.TOUCHED_PROTECTED; break; }
    const after = judge(proposed);
    const removed = failures.filter((f) => !after.includes(f));
    log.push(Object.freeze({ round: rounds, removed: removed.length, remaining: after.length }));
    if (removed.length === 0) { stop = REPAIR_REFUSAL.NO_PROGRESS; break; }
    current = proposed; failures = after;
    if (failures.length === 0) return Object.freeze({ state: REPAIR.REPAIRED, rounds, gate: REPAIR_GATE, before: initial, after: failures, log: Object.freeze(log), draft: current });
  }
  return Object.freeze({ state: REPAIR.PARKED, rounds, gate: REPAIR_GATE, reason: stop ?? REPAIR_REFUSAL.ROUNDS_SPENT, before: initial, after: failures, log: Object.freeze(log), draft: current });
}

/** C4 · an approval may be made only for a draft that passes its gate; a PARKED draft is refused by name. */
export function approvalFor(record) {
  if (record?.state === REPAIR.PARKED || (record?.after ?? []).length > 0) return Object.freeze({ refused: REPAIR_REFUSAL.PARKED_NOT_APPROVABLE, gate: record?.gate ?? REPAIR_GATE, remaining: record?.after ?? [] });
  return Object.freeze({ offered: true, gate: record.gate });
}
