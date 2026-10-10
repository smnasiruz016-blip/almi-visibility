/**
 * 🔴 F78 · ACCEPTANCE AMENDMENT 1, A1 — THE BOUNDED C1: every cost gap the recorded ledgers show, decided against the frozen boundary
 * and the frozen pre-boundary gap list (config/cost/pre-boundary-gaps.mjs).
 *
 *   LISTED        dated before the boundary and named by the list — reported by name, never PROVED, never hidden; it does not disprove C1
 *   UNLISTED      dated before the boundary and NOT named by the list — refused: C1 reads DISPROVED
 *   POST_BOUNDARY dated on or after the boundary — C1 reads DISPROVED
 *
 * A gap the ledgers can show is a part read MEASURABLE_BUT_NOT_RECORDED (ref "<entry_id> · <part>", dated by the entry's recorded_at).
 * The list's other kinds (a connector run with no entry; a record from before the connectors existed) are reported from the list alone:
 * no ledger can show a run that wrote nothing, which is why C8 makes every run write one. Pure; reads nothing.
 */
import { createHash } from "node:crypto";
import { coverageFailures } from "./ledger.mjs";

export const GAP_STATE = Object.freeze({ LISTED: "LISTED", UNLISTED: "UNLISTED", POST_BOUNDARY: "POST_BOUNDARY" });
export const listSha256 = (list) => createHash("sha256").update(JSON.stringify(list)).digest("hex");

/** The ledger gaps of `entries`, each decided: { ref, date, state, listId }. */
export function decideGaps({ entries, list, boundary }) {
  const byRef = new Map(list.filter((g) => g.kind === "LEDGER_PART_NOT_RECORDED").map((g) => [g.ref, g]));
  const at = new Map(entries.map((e) => [e.entry_id, e]));
  return coverageFailures(entries).map((g) => {
    const ref = `${g.entry_id} · ${g.part}`;
    const date = String(at.get(g.entry_id)?.recorded_at ?? "").slice(0, 10);
    if (!(date < boundary)) return { ref, date, state: GAP_STATE.POST_BOUNDARY, listId: null };
    const listed = byRef.get(ref);
    return listed && listed.date === date ? { ref, date, state: GAP_STATE.LISTED, listId: listed.id } : { ref, date, state: GAP_STATE.UNLISTED, listId: null };
  });
}

/** C1's gap part: the decided gaps, the whole list reported by kind and by name, and the verdict. Count-only apart from the list's names. */
export function boundedGapReport({ entries, list, boundary, listShaPinned }) {
  const decided = decideGaps({ entries, list, boundary });
  const count = (s) => decided.filter((d) => d.state === s).length;
  const listIntact = listSha256(list) === listShaPinned;
  const byKind = list.reduce((m, g) => ((m[g.kind] = (m[g.kind] ?? 0) + 1), m), {});
  const disproved = !listIntact || count(GAP_STATE.UNLISTED) > 0 || count(GAP_STATE.POST_BOUNDARY) > 0;
  return Object.freeze({
    boundary,
    listIntact,
    listed: Object.freeze({ total: list.length, byKind: Object.freeze(byKind), names: Object.freeze(list.map((g) => g.id)), seenInLedgers: count(GAP_STATE.LISTED) }),
    unlisted: Object.freeze(decided.filter((d) => d.state === GAP_STATE.UNLISTED).map((d) => d.ref)),
    postBoundary: Object.freeze(decided.filter((d) => d.state === GAP_STATE.POST_BOUNDARY).map((d) => d.ref)),
    verdict: disproved ? "DISPROVED" : "PROVED",
    why: !listIntact ? "the frozen gap list does not hash to its pin" : count(GAP_STATE.UNLISTED) ? `${count(GAP_STATE.UNLISTED)} pre-boundary gap(s) the list does not name` : count(GAP_STATE.POST_BOUNDARY) ? `${count(GAP_STATE.POST_BOUNDARY)} gap(s) dated on or after the boundary` : "every gap the ledgers show is listed and pre-boundary",
  });
}
