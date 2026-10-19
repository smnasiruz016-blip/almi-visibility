/**
 * 🔴 LIGHT PROOF RULE 3 (the owner's light-proof decision of 19 Oct 2026, recorded in the governance repository): a clause that needs
 * something that does not exist yet is DEFERRED-TO-FIRST-CLIENT, never PROVED; a row with every other clause proved may be VERIFIED, and the
 * board shows it as "VERIFIED (n deferred)". Read from the row's own latest VERIFIED event — nothing is inferred. Pure.
 */
export const DEFERRED = "DEFERRED-TO-FIRST-CLIENT";
export function deferredRows(board) {
  return board.filter((r) => r.state === "VERIFIED-PASS").map((r) => {
    const v = (r.events ?? []).filter((e) => e.kind === "VERIFIED").at(-1);
    const ids = Object.entries(v?.clauses ?? {}).filter(([, s]) => s === DEFERRED).map(([c]) => c);
    return ids.length ? Object.freeze({ featureId: r.featureId, deferred: Object.freeze(ids), why: Object.freeze({ ...(v.deferred ?? {}) }) }) : null;
  }).filter(Boolean);
}
export const deferredLine = (rows) => (rows.length ? `deferred (light proof rule 3): ${rows.map((r) => `${r.featureId} VERIFIED (${r.deferred.length} deferred: ${r.deferred.join(", ")})`).join(" · ")}` : "deferred (light proof rule 3): none");
