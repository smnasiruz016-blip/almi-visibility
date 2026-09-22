/**
 * 🔴 WHICH RECORD CARRIES AN ACTIVE F-ROW'S STATE, WHEN TWO RECORDS DISAGREE (22 September 2026).
 *
 * Owner ruling `_handoffs/AlmiVisibility_OWNER_RULING_2026-09-22_BOARD_AUTHORITY.md`
 * (sha256 ce6aeb06f752577858d002c0c90a317cba8e2a7e91e62cd7b6e477470af8c256):
 * the ENGINE F-BOARD is authoritative for active F-product accounting; an evidence record SUPPORTS a movement and
 * may never OVERRIDE one.
 *
 * ── THE TWO HALVES, AND WHY BOTH ARE HERE ──────────────────────────────────
 *
 * A check that flags every comparison proves nothing, and a check that flags none proves less. So this answers two
 * questions in one call and a caller cannot have one without the other:
 *
 *   AGREE      the two records say the same thing → nothing is flagged, and the state stands.
 *   CONFLICT   they differ → it IS flagged, AND the engine board's state is the one returned. A conflict is a
 *              DEFECT TO REPORT, never a discrepancy to interpret and never an average of the two.
 *
 * 🔴 IT FAILS CLOSED ON ITS OWN AUTHORITY. The ruling's hash must be handed in. Without it the comparison is
 * refused: "the engine board wins" is a rule somebody wrote down, and a function that applies it while unable to
 * name where it came from is asserting, not resolving.
 *
 * Generic: no subject, product, client or host. It compares two declared state strings and nothing else.
 */
export const RECORD_KINDS = Object.freeze(["ENGINE_BOARD", "EVIDENCE_RECORD"]);
export const AUTHORITATIVE_RECORD = "ENGINE_BOARD";
export const BOARD_AUTHORITY_RULING_SHA256 = "ce6aeb06f752577858d002c0c90a317cba8e2a7e91e62cd7b6e477470af8c256";

export class RecordAuthorityRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.code = code; }
}

/**
 * Compare what the engine board says with what an evidence record claims.
 *
 * @param {object} o
 * @param {string} o.featureId
 * @param {string} o.boardState    the state the engine board holds
 * @param {string} o.recordState   the state an evidence record claims
 * @param {string} o.rulingSha256  the sha256 of the ruling that makes the board authoritative
 * @returns {{agree: boolean, flagged: boolean, authoritative: string, state: string, why: string}}
 */
export function compareRecords({ featureId, boardState, recordState, rulingSha256 } = {}) {
  if (rulingSha256 !== BOARD_AUTHORITY_RULING_SHA256) {
    throw new RecordAuthorityRefused(
      "BOARD_AUTHORITY_RULING_UNNAMED",
      "the ruling that makes the engine board authoritative was not named, or its hash does not match the committed bytes — the comparison is refused rather than asserted",
    );
  }
  if (typeof featureId !== "string" || featureId.trim() === "") throw new RecordAuthorityRefused("FEATURE_UNNAMED", "a comparison needs the row it is about");
  if (typeof boardState !== "string" || boardState.trim() === "") throw new RecordAuthorityRefused("BOARD_STATE_ABSENT", "the engine board's state is required — an absent state is never read as agreement");
  if (typeof recordState !== "string" || recordState.trim() === "") throw new RecordAuthorityRefused("RECORD_STATE_ABSENT", "the evidence record's claimed state is required");

  if (boardState === recordState) {
    return Object.freeze({
      agree: true, flagged: false, authoritative: AUTHORITATIVE_RECORD, state: boardState,
      why: `${featureId}: the engine board and the evidence record both read ${boardState}`,
    });
  }
  return Object.freeze({
    agree: false, flagged: true, authoritative: AUTHORITATIVE_RECORD, state: boardState,
    why: `${featureId}: the engine board reads ${boardState} and an evidence record claims ${recordState} — the board governs, and this disagreement is a defect to report`,
  });
}
