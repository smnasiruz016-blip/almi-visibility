/**
 * 🔴 THE REQUIRED PRODUCT-COMPLETION PATH — WHICH F-ROWS ARE NOT REQUIRED (Board Amendment 1, 3 October 2026).
 *
 * Every specification row stays on the board, with its state, acceptance and history. A row listed HERE is NOT REQUIRED: it is left out
 * of REQUIRED progress (numerator and denominator alike) and never counts as passed. "NOT REQUIRED" is the owner's word (RR-145 §2); the
 * board law's eight states have none for a row outside the required path, so it is a separate, frozen register, not a ninth state.
 *
 * An entry is lawful only when its owner authority resolves CURRENT in the authority register AND names the very bytes pinned here, and
 * its amendment record's bytes are pinned too (src/fboard/board.mjs boardErrors). Append-only: an entry is added by an owner decision
 * and a committed board amendment, never edited away silently.
 */
export const NOT_REQUIRED = Object.freeze({
  F25: Object.freeze({
    featureId: "F25",
    since: "2026-10-03",
    /* the owner's own words — CURRENT in the register (OWNER issuer by inclusion rule), admitted by the migration at _handoffs dd91e92 */
    authority: Object.freeze({
      propositionId: "OWNER_DECISION_RR-145_PRODUCT_SCOPE",
      scope: Object.freeze(["ALMIVISIBILITY"]),
      ruling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_DECISION_2026-10-03_RR-145_PRODUCT_SCOPE.md", commit: "f8fa5e9e1ff9c2c9c59acaf6136d497422d7d545", sha256: "432d46944ceaeed547029236005c834fcb8bac15f12444b7e28cdfb212200202" }),
    }),
    /* the board amendment drafted under it, committed ALONE before this file */
    amendment: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_BOARD_AMENDMENT_1_2026-10-03_F25_NOT_REQUIRED.md", commit: "dd91e92c68d6c99aa77f880a39a1f1365e8eaeb4", sha256: "9a47cdb1a9741c94788a07468087b74975d0ac82a79c74061c76be3a61106eb4" }),
    reason: "the owner's product-scope decision: repairing a client's existing mobile layout, buttons, tap targets or site design belongs to the client and its workers; the core product and page creation are not held behind a full mobile usability audit",
    /* reported, never gated on, never a blocker — information for the client's own workers */
    optionalFindings: Object.freeze(["viewport declaration present on 8 of 8 stored pages (RR-137, from the stored HTML)"]),
  }),
});
