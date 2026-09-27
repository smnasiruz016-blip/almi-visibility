/**
 * 🔴 F10 · THE FOUR VERSIONS — each an id and the files whose bytes ARE it (C6 and C7 mechanisms and scorers).
 *
 * STANDING LAW (_handoffs ec3bbaf §3.3): a frozen version is a CLAIM ABOUT CODE. When the code it covers moves, the claim EXPIRES —
 * even if behaviour is identical. Never run a scorer whose frozen version no longer matches production code; re-freeze first.
 * `versionStates` measures that claim against the trail: FROZEN (at this code) · EXPIRED (frozen only at other code) · NOT_FROZEN.
 *
 * This file is in NO version's file list, so reading the versions never moves one.
 */
import { MECHANISM_ID, MECHANISM_FILES } from "./human-questions.mjs";
import { MECHANISM_ID as FU_MECHANISM_ID, MECHANISM_FILES as FU_MECHANISM_FILES } from "./follow-up-questions.mjs";
import { SCORER_ID, SCORER_FILES, versionHash } from "../governance/governed-scoring.mjs";
import { FOLLOW_UP_SCORER_ID, FOLLOW_UP_SCORER_FILES } from "../heldout/follow-up-rule.mjs";
import { EVALUATION_ACTIONS } from "../heldout/lifecycle.mjs";

export const F10_VERSIONS = Object.freeze([
  Object.freeze({ role: "C6 mechanism", id: MECHANISM_ID, files: MECHANISM_FILES }),
  Object.freeze({ role: "C6 scorer", id: SCORER_ID, files: SCORER_FILES }),
  Object.freeze({ role: "C7 mechanism", id: FU_MECHANISM_ID, files: FU_MECHANISM_FILES }),
  Object.freeze({ role: "C7 scorer", id: FOLLOW_UP_SCORER_ID, files: FOLLOW_UP_SCORER_FILES }),
]);

/** Each version's current code hash, measured against the FROZEN events of a trail. Returns [{ role, id, codeHash, state, frozenAt }]. */
export function versionStates(repo, events) {
  const frozen = events.filter((e) => e.action === EVALUATION_ACTIONS.FROZEN);
  return F10_VERSIONS.map((v) => {
    const codeHash = versionHash(repo, v.files);
    const mine = frozen.filter((e) => e.metadata?.mechanismId === v.id);
    const at = mine.filter((e) => e.metadata.mechanismHash === codeHash).map((e) => e.occurredAt).sort()[0] ?? null;
    return { role: v.role, id: v.id, codeHash, state: at ? "FROZEN" : mine.length ? "EXPIRED" : "NOT_FROZEN", frozenAt: at };
  });
}
