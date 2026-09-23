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
    /* 🔴 REOPENED — FAILED, ON CONCRETE CONTRADICTORY EVIDENCE (22 September 2026).
     *
     * The route is MEASURED, not invented: FAILED is a declared F-state, it sits inside NEEDS_ACCEPTANCE (so the
     * frozen acceptance still governs — this is not an un-acceptance) and inside IMPLEMENTABLE (so repair may
     * proceed from it). `boardErrors` accepts it, and refuses UNASSESSED, which would have been the un-acceptance.
     *   VERIFIED-PASS → FAILED → IN-PROGRESS → VERIFIED-PASS only on new evidence.
     *
     * The contradictory evidence is recorded in the governance repository at ba2ed2e
     * (sha256 d16ea317…9b06). TWO defects meet clause [F1] of the frozen FAILURE text — "A governed action
     * produces no audit event": 38 of 40 governed write-gate decisions emit nothing, and 102 of 142 engine
     * decision sites emit nothing. Two further defects were reproduced and do NOT meet any clause, and are parked.
     *
     * 🔴 F-PROGRESS DROPS WHILE THIS STANDS, AND THE DROP IS THE POINT. */
    /* 🔴 VERIFIED-PASS AGAIN — 23 SEPTEMBER 2026, ON NEW EVIDENCE, BY THE ROUTE THE REOPENING RECORDED.
     * FAILED -> IN-PROGRESS (the repair) -> VERIFIED-PASS (the reclosure): the two events at the end of this row.
     * Everything above stays as written — the first verification and the contradiction that reopened it are history,
     * not errors. The PASS is EARNED only when main CI is green on the exact merged SHA; the VERIFIED event says so
     * (afterMerge), and a red main run means this movement must be reverted. */
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
      /* The verification above is NOT deleted — it happened, and it is immutable history. What follows is the
       * evidence that contradicted it. The row's STATE is what moved; the record of the past did not. */
      Object.freeze({
        kind: "CONTRADICTORY_EVIDENCE_RECORDED",
        featureId: "F08",
        on: "2026-09-22",
        from: "VERIFIED-PASS",
        to: "FAILED",
        route: "VERIFIED-PASS -> FAILED -> IN-PROGRESS -> VERIFIED-PASS only on new evidence",
        changeKind: "work",
        failureClause: "F1 · a governed action produces no audit event",
        defects: "B: 102 of 142 engine decision sites emit no event · C: 38 of 40 governed write-gate decisions emit no event",
        parked: "A (cross-build replay) and D (unenforced ceiling) reproduced; no clause of the frozen FAILURE text covers either",
        evidenceRecord: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F08_CONTRADICTORY_EVIDENCE_2026-09-22.md", commit: "ba2ed2e885afb7c96b8395afffedaf7cfaf66f60", sha256: "d16ea317068e2f2fc85cafa840e9d8193be78b9d9c924a407e5e3fab57339b06" }),
        supersedes: Object.freeze([
          Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F08_VERIFIED_PASS_EVIDENCE_2026-09-22.md", sha256: "2b84452c769ba4e62b38f2d8648ae029a1c13f44d802441d40145c502559ca64" }),
          Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F08_BOARD_RECONCILIATION_2026-09-22.md", sha256: "86c0f97774187244853b6f90c72f5261ba810c0e40a6c0f1cda1d16a9f5d024f" }),
        ]),
      }),
      /* 🔴 23 SEPTEMBER 2026 — THE REPAIR AND THE RECLOSURE, AS TWO LAWFUL MOVEMENTS ALONG THE ROUTE RECORDED ABOVE.
       *
       * FAILED sits inside IMPLEMENTABLE, so repair proceeds from it without un-accepting anything; the frozen
       * acceptance is unchanged (the pins below are re-derived by the board). Neither movement uses the historical
       * `changeKind` vocabulary: the target-aware ruling (29ef6d74…, §12) forbids importing it into the F-board, so
       * each carries an explicit `reason` code instead. Both reach the audit trail as BOARD_TRANSITION events through
       * the production recorder (bin/audit-trail.mjs record --confirm), and test/f08-closure.test.mjs requires them
       * there. */
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F08",
        on: "2026-09-23",
        from: "FAILED",
        to: "IN-PROGRESS",
        route: "VERIFIED-PASS -> FAILED -> IN-PROGRESS -> VERIFIED-PASS only on new evidence",
        reason: "REPAIR_OF_RECORDED_CONTRADICTION",
        repairs: "F1 · a governed action produces no audit event — 10 of 40 governed callers wrote outside the shared boundary and 12 of 64 decision sites decided without auditing",
        governingRuling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-09-23_F08_TARGET_AWARE_DURABILITY.md", commit: "47dc66c1ca9e39e7f19adc4ac630081ca090328b", sha256: "29ef6d74fc85944f7cf69f33c39fd0946e5eab77e8317fa5893fa086cfff4f0d" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-23_F08_COMPLETE.md", commit: "42324318358e20dcba0e95b3383f1cd1b67f62e9", sha256: "f0ed3fb9a1d517a36d6d1aa16ad7bc2bd1b199cd4065896bd8cb4b2f93676ef4" }),
      }),
      /* Verified UNDER F08 over the REAL populations, on new evidence. The first VERIFIED above stays as history. */
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F08",
        population: "REAL",
        on: "2026-09-23",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "VERIFIED-PASS -> FAILED -> IN-PROGRESS -> VERIFIED-PASS only on new evidence",
        reason: "FAILURE_CLAUSE_F1_NO_LONGER_MET_ON_REAL_POPULATIONS",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F08.ruling.sha256, contract: ACCEPTANCES.F08.contractSha256 }),
        populations: "entry points 58 = 40 governed + 18 read-only; governed 40 = 39 BOUNDARY_ROUTED + 1 CHECKED_AUDIT_STORE_EXEMPTION + 0 bypass, remainder 0 (tools/governed-caller-census.mjs); decision sites 64 = LIVE_AUDITED 42 + NO_RUNTIME_MUTATION_ENTRY_POINT 7 + DUPLICATE_OBSERVATION 9 + NOT_GOVERNED_WITH_REASON 6 + DEFECT 0, remainder 0 (tools/decision-site-census.mjs)",
        proofs: "the §9 matrix, 30 of 30 items mapped to named tests (governed-write, governed-directory-replace, shared-guard-audit, governed-caller-vocabulary, test-store-hygiene, f08-acceptance-pin, f08-closure, audit-trail, audit-store-exemption, bypass-control, decision-site-census, f08-board-reconciliation, entry-points), each with a control shown capable of the other verdict",
        sabotage: "33 of 33 RED on the named test for the intended reason, restored byte-identically, production trail untouched (runs/audit/f08-sabotage-2026-09-23.txt, tree 30a36a3)",
        fullSuite: "tree c065982, node --test test/*.test.mjs twice: 1895 · 1895 pass · 0 fail · 0 skipped, both runs; production trail byte-identical; .test-scratch/audit 652 -> 652; planted counting control named, +1 loaded, +1 failed, removed byte-identically (runs/audit/f08-suite-2026-09-23.txt)",
        replay: "bin/replay-crawl.mjs end to end under STAGED_DIRECTORY_REPLACE, two real artifact downloads (runs/audit/f08-replay-crawl-e2e-2026-09-23.txt)",
        acceptanceDerivation: "92d20a63… re-derived from the ruling's committed bytes (runs/audit/f08-acceptance-derivation-2026-09-23.txt)",
        afterMerge: "main CI green on the exact merged SHA — verified after merge and reported in _handoffs/AlmiVisibility_F08_VERIFIED_PASS_EVIDENCE_2026-09-23.md; a red main run means this record is wrong and must be reverted",
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
