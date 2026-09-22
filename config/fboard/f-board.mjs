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
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-22", ruling: ACCEPTANCES.F05.ruling, contractSha256: ACCEPTANCES.F05.contractSha256 }),
      // Implementation began only after the acceptance was committed (governance 5868599): src/authority/register.mjs,
      // src/authority/corpus.mjs, bin/authority-migrate.mjs, bin/authority-resolve.mjs, and the board's authority check.
      Object.freeze({ kind: "IMPLEMENTATION", on: "2026-09-22", after: "ACCEPTANCE_FROZEN" }),
      // Verified UNDER F05 over the REAL committed authority corpus — never a fixture, never a historical row's result.
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F05",
        population: "REAL",
        on: "2026-09-22",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F05.ruling.sha256, contract: ACCEPTANCES.F05.contractSha256 }),
        corpus: "governance 5868599 · engine bd72bfd — 80 records, CURRENT 60 · INVALID 20 · remainder 0; no controlling OPEN_CONFLICT (runs/audit/f05-authority-census-2026-09-22.txt)",
        proofs: "P1–P26 and P-R26: 31 of 31 pass, locally and in PR #141's CI (run 35696857297, head c856f9f)",
        sabotage: "S1–S15, S9b, S-R13: 17 of 17 RED on the named test for the intended reason, restored, zero residue (runs/audit/f05-sabotage-2026-09-22.txt)",
        fullSuite: "committed tree c856f9f: 1749 tests, 1749 pass, 0 fail; counting control named its planted failure. PR CI: 1749 · 1745 pass · 0 fail · 4 skipped (the pre-existing playwright renderer skips, as on main)",
        // 🔴 Recorded in the PR, as this repository records every PASS; the one condition only a merge can meet is named, not assumed.
        afterMerge: "main CI green on the exact merged SHA — verified after merge and reported; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  F08: Object.freeze({
    featureId: "F08",
    board: "F_BOARD",
    // 🔴 ACCEPTANCE-FROZEN, and no further. The acceptance was committed ALONE in the governance repository (19e6b7b)
    // BEFORE any F08 schema, implementation, migration or test change. Freezing is not passing: only a recorded
    // verification over the real population, after a merge whose main CI is green, can move this row again.
    state: "ACCEPTANCE-FROZEN",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-22", ruling: ACCEPTANCES.F08.ruling, contractSha256: ACCEPTANCES.F08.contractSha256 }),
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
