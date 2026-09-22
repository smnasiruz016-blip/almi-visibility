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
    // 🔴 VERIFIED-PASS — AND THE ROW IS THE AUTHORITY FOR THAT, BY RULING.
    //
    // The acceptance was committed ALONE in the governance repository (19e6b7b) BEFORE any F08 schema,
    // implementation, migration or test change. Freezing an acceptance and recording a verification are two
    // different events, and this row correctly read IN-PROGRESS while F08's own pull request was open: a PR cannot
    // truthfully write a tick for evidence that does not exist until after it merges.
    //
    // That evidence now exists and PREDATES this change: PR #142 merged as 5630617, and main CI run 35784138199
    // was green on that exact SHA. The row was lagging an already-proved state, not claiming an unproved one.
    // `_handoffs/AlmiVisibility_OWNER_RULING_2026-09-22_BOARD_AUTHORITY.md` (sha256 ce6aeb06…c256) rules that THIS
    // FILE is authoritative for active F-product accounting and that an evidence record may never override it.
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-22", ruling: ACCEPTANCES.F08.ruling, contractSha256: ACCEPTANCES.F08.contractSha256 }),
      // Implementation began only after the acceptance was committed: src/audit-trail/{event,store,reader,population,
      // recorder,callers,wiring}.mjs, config/audit-store.mjs, bin/audit-trail.mjs, and the append wired into
      // bin/authority-migrate.mjs ahead of its governed write.
      Object.freeze({ kind: "IMPLEMENTATION", on: "2026-09-22", after: "ACCEPTANCE_FROZEN" }),
      /* Verified UNDER F08 over the REAL populations — never a fixture, never a historical row's result.
       *
       * 🔴 ON `changeKind`. The only DECLARED changeKind vocabulary in this repository is the historical ledger's
       * (src/checklist/classification.mjs): "work" · "vocabulary" · "none". "work" is recorded because it is true of
       * why F08's STATUS moved — F08 was built and proved — and not of what the reconciliation pull request did,
       * which built nothing. It is a vocabulary term, not a status: none of its three values collides with an
       * F-board state, so it creates none of the two-board ambiguity `fBoardState` refuses. NO HISTORICAL STATE IS
       * IMPORTED and authorityImported stays false. The ACTIVE board's own movement vocabulary is the event `kind`
       * set, and "VERIFIED" is not a choice here — `boardErrors` demands it for this state. */
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F08",
        population: "REAL",
        on: "2026-09-22",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> ACCEPTANCE-FROZEN -> IN-PROGRESS -> VERIFIED-PASS",
        changeKind: "work",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F08.ruling.sha256, contract: ACCEPTANCES.F08.contractSha256 }),
        boardAuthorityRuling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-09-22_BOARD_AUTHORITY.md", commit: "91b4121b2cbb51a494092a8f4a28783f5019aabd", sha256: "ce6aeb06f752577858d002c0c90a317cba8e2a7e91e62cd7b6e477470af8c256" }),
        pullRequest: 142,
        mergedSha: "56306175337b44ba51d203fdfa91a4c533d0fc9a",
        ciRun: "35784138199",
        ciConclusion: "success",
        evidenceRecord: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F08_VERIFIED_PASS_EVIDENCE_2026-09-22.md", commit: "8395eed757cdc0826b110d47c0b2cb2922d6f050", sha256: "2b84452c769ba4e62b38f2d8648ae029a1c13f44d802441d40145c502559ca64" }),
        occurredAt: "2026-09-22T21:06:13Z",
        proofs: "P1–P34: 41 of 41 pass, each with a control shown capable of the other verdict",
        sabotage: "S1–S22: 22 of 22 RED on the named test for the intended reason, restored byte-identically",
        populations: "121 real candidate events, remainder 0; committed trail 124 events (97 migrated, 27 native)",
      }),
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
