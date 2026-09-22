/**
 * 🔴 THE ACTIVE F-BOARD — WHAT IS DECLARED. Every capability not listed here is UNASSESSED (src/fboard/board.mjs
 * `buildBoard`), and UNASSESSED is not PASS.
 *
 * Each declared row names its board (F_BOARD), its state, and the events that earned it. A state moves only with its
 * event: a frozen acceptance for leaving UNASSESSED, a recorded verification for VERIFIED-PASS, a named blocker for a
 * BLOCKED state. No row carries historical state.
 */
import { ACCEPTANCES } from "./acceptances.mjs";

export const DECLARED = Object.freeze({
  F05: Object.freeze({
    featureId: "F05",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-22", ruling: ACCEPTANCES.F05.ruling, contractSha256: ACCEPTANCES.F05.contractSha256 }),
      // Implementation began only after the acceptance was committed (governance 5868599): src/authority/register.mjs,
      // src/authority/corpus.mjs, bin/authority-migrate.mjs, bin/authority-resolve.mjs, and the board's authority check.
      Object.freeze({ kind: "IMPLEMENTATION", on: "2026-09-22", after: "ACCEPTANCE_FROZEN" }),
    ]),
  }),
  F40: Object.freeze({
    featureId: "F40",
    board: "F_BOARD",
    state: "BLOCKED-BY-AUTHORITY",
    blocker: "UNIVERSAL_350_WORD_FLOOR_STILL_APPLICABLE",
    note: "Amendment 7 changed only the fact floor. It is not credited with changing the universal 350-word floor, which still applies — and the specification's F40 asks for no universal word quota. F40 is not implemented.",
    events: Object.freeze([
      Object.freeze({ kind: "BLOCKER_RECORDED", on: "2026-09-22", source: "_handoffs/AlmiVisibility_CC_COMMAND_2026-09-22_F05_CURRENT_AUTHORITY_REGISTER_CHAIN.md §0.7" }),
    ]),
  }),
});
