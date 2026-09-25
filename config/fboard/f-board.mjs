/**
 * 🔴 THE ACTIVE F-BOARD — WHAT IS DECLARED. Every capability not listed here is UNASSESSED (src/fboard/board.mjs
 * `buildBoard`), and UNASSESSED is not PASS.
 *
 * Each declared row names its board (F_BOARD), its state, and the events that earned it. A state moves only with its
 * event: a frozen acceptance for leaving UNASSESSED, a recorded verification for VERIFIED-PASS, a named blocker for a
 * BLOCKED state. No row carries historical state.
 */
import { ACCEPTANCES, F02_ORIGINAL, F04_ORIGINAL } from "./acceptances.mjs";

export const DECLARED = Object.freeze({
  F01: Object.freeze({
    featureId: "F01",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      // The acceptance was committed ALONE in the governance repository (1429928) before any F01 engine change.
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-24", ruling: ACCEPTANCES.F01.ruling, contractSha256: ACCEPTANCES.F01.contractSha256 }),
      /* Implementation began only after that commit: the corpus re-migration and acceptance pin (e49826f), then
       * src/intake/ (contract, secret firewall, origin normalisation, store, decision, legacy adapter) and
       * bin/project-intake.mjs, with the declaration root declared in the data repository (PR #10, 47cc35d). */
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F01",
        on: "2026-09-24",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        reason: "FROZEN_ACCEPTANCE_COMMITTED_BEFORE_ENGINE_CHANGE",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-24_F01_COMPLETE.md", commit: "dc8e50e679242c8e621af0b51e364dcd45b555db", sha256: "0bc1c1ff2797ce39c540eabd21d95d0aa158a6766eec80a81dc997c39d03410d" }),
      }),
      /* Verified UNDER F01 over the REAL population — the 21 declared tenants and 21 attachments of the tenancy
       * registry, read through the contract (21 refused with every absent field named, none fabricated), the real
       * declaration root (resolved, 0 accepted projects — stated, not hidden) — and a NEW unrelated neutral declaration
       * accepted through the production path with no source change. */
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F01",
        population: "REAL",
        on: "2026-09-24",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        reason: "EVERY_FAILURE_CLAUSE_UNMET_ON_REAL_POPULATIONS",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F01.ruling.sha256, contract: ACCEPTANCES.F01.contractSha256 }),
        populations: "runs/audit/f01-census-2026-09-24.txt — tenancy 21 tenants = 21 active, 21 attachments = 18 public origins + 3 excluded by declared kind, remainder 0; 21 candidates REFUSED, 0 adapted, 0 unmapped; real declaration root 0 accepted; neutral world 1 project, 2 submissions; every zero with a firing control",
        proofs: "P1–P48 with P11b, P43b and P48b in test/f01-intake.test.mjs, each with a control able to give the other verdict; P46 re-run separately",
        sabotage: "S1–S20: 20 RAN, 20 LANDED (bytes and behaviour), 20 COULD-FAIL, 20 RED on the named proof for the intended reason, restored, production trail untouched (runs/audit/f01-sabotage-2026-09-24.txt)",
        acceptanceRerun: "F05, F06 (with its correction), F07, F08 re-run on the F01 tree (runs/audit/f01-acceptance-rerun-2026-09-24.txt)",
        fullSuite: "two full runs and the named counting control on the final tree (runs/audit/f01-suite-2026-09-24.txt)",
        afterMerge: "main CI green on the exact merged SHA — verified after merge and reported in _handoffs/AlmiVisibility_F01_VERIFIED_PASS_EVIDENCE_2026-09-24.md; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  F02: Object.freeze({
    featureId: "F02",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      // The acceptance was committed ALONE in the governance repository (3ea6fda) before any F02 engine change.
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-24", ruling: F02_ORIGINAL.ruling, contractSha256: F02_ORIGINAL.contractSha256 }),
      /* Implementation began only after that commit: first the dependency repair that lets the acceptance resolve at all
       * (inclusion rule f-row-acceptance, corpus re-migrated at 3ea6fda), then the crosswalk entry and the census. */
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F02",
        on: "2026-09-24",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        reason: "FROZEN_ACCEPTANCE_COMMITTED_BEFORE_ENGINE_CHANGE",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-24_F02_TENANT_ISOLATION.md", commit: "6b7422ae8e906f0e87f2df01afe0a7d410b2ede7", sha256: "9646e2f91170e71618925f0538d05260caf5821c6dd3151f4344f85afd03ecf1" }),
      }),
      /* Amendment 1, committed ALONE (ad14a64) under the owner's disposition ruling (1145012, Decision 3): the learning
       * population is deferred to F79. It names, by both hashes, the freeze it amends. */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F02", on: "2026-09-25", ruling: ACCEPTANCES.F02.ruling, contractSha256: ACCEPTANCES.F02.contractSha256, amends: ACCEPTANCES.F02.amends }),
      /* Earned under Amendment 1 on the REAL populations (test/f02-disposition.test.mjs and the F02 proofs before it). The
       * two learning rows are DEFERRED-TO-F79, not proved; the whole-collection retirement is the data precondition, and
       * test D8 turns red while any shared collection is still attached whole in the current declarations. */
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F02",
        population: "REAL",
        on: "2026-09-25",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        reason: "EVERY_CURRENT_CLAUSE_PROVED_ON_REAL_POPULATIONS_UNDER_AMENDMENT_1",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F02.ruling.sha256, contract: ACCEPTANCES.F02.contractSha256 }),
        deferredToF79: Object.freeze(["real learning write evidence", "real learning reuse evidence"]),
        dataPrecondition: "almi-visibility-data: the whole crawl-batch and sitemap-collection attachments retired (owner ruling 1145012, Decision 2)",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F02_DISPOSITION.md", commit: "ab2dfd80b6c9b0fd1ab6c290924dcd25827e86dc" }),
      }),
    ]),
  }),
  /* 🔴 F03 · SUBJECT ROOT AND CONNECTOR REGISTRY — closed on MERGED MAIN (owner command _handoffs 62347c6), in TWO lawful
   * movements, never one jump. The acceptance was frozen ALONE (f9d1888) before any engine change; the build merged as
   * #157 (04912681…) with data #13 (997cc99f…) and #11 (f321b2b…); exact-SHA main CI 36102818055 succeeded on attempt 1.
   * Each movement carries the F-board's own event `kind` and an explicit `reason` code, never the historical ledger's
   * changeKind vocabulary (owner ruling 29ef6d74…, §12). Both reach the trail as BOARD_TRANSITION events through the
   * production recorder (bin/audit-trail.mjs record --confirm); test/f03-closure.test.mjs requires them there. */
  F03: Object.freeze({
    featureId: "F03",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      // The freeze record: the acceptance was committed ALONE in the governance repository (f9d1888) before any F03 engine change.
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-25", ruling: ACCEPTANCES.F03.ruling, contractSha256: ACCEPTANCES.F03.contractSha256 }),
      /* MOVEMENT 1 · UNASSESSED → IN-PROGRESS: the frozen acceptance, and the implementation measured against it (PR #157). */
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F03",
        on: "2026-09-25",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_IMPLEMENTATION_MEASURED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F03.ruling.sha256, contract: ACCEPTANCES.F03.contractSha256 }),
        pullRequest: 157,
        mergedSha: "04912681a009d37e48621637356c5bd2383c6416",
        dataMergedShas: Object.freeze(["997cc99fdf0d3f7ceff1702682cc18a96b200a82", "f321b2b133355a9e5f4c88f007713e199f62b646"]),
        ciRun: "36102818055",
        ciConclusion: "success",
        governingRuling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-09-23_F08_TARGET_AWARE_DURABILITY.md", commit: "47dc66c1ca9e39e7f19adc4ac630081ca090328b", sha256: "29ef6d74fc85944f7cf69f33c39fd0946e5eab77e8317fa5893fa086cfff4f0d" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F03_SUBJECT_ROOT_AND_CONNECTOR_REGISTRY.md", commit: "b445d25bbd35ea5f81acf05fa2ebde63b20150ec", sha256: "2681310a049505515e7a0f7aa6e6b507891d622164398f37d7dd9da15f81aa4c" }),
      }),
      /* MOVEMENT 2 · IN-PROGRESS → VERIFIED-PASS: every frozen clause re-sat and PROVED on merged main — portability by the
       * exact-SHA main CI run (linux) against the local and a relocated real root (win32): one registry blob, one outcome
       * digest over 105 rows. Sabotage route (b): 18 of 18 on merged main. */
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F03",
        population: "REAL",
        on: "2026-09-25",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "RETEST_PASSED_ON_MERGED_MAIN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F03.ruling.sha256, contract: ACCEPTANCES.F03.contractSha256 }),
        pullRequest: 157,
        mergedSha: "04912681a009d37e48621637356c5bd2383c6416",
        dataMergedShas: Object.freeze(["997cc99fdf0d3f7ceff1702682cc18a96b200a82", "f321b2b133355a9e5f4c88f007713e199f62b646"]),
        ciRun: "36102818055",
        ciConclusion: "success",
        evidenceRecord: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F03_VERIFIED_PASS_EVIDENCE_2026-09-25.md", commit: "511d8084c4fce75d16dcffd6d2e35b544b4e9c12", sha256: "8774d8b85c94054882cd90d3853150010f5e2fc21db3f7260dacff62764426ba" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F03_CLOSE.md", commit: "62347c68a50a3ea2c3fefa20aee2f1929013dbf8", sha256: "447f182189dc95992093235605bbf8fe8b7a3626a2cd580d2576fa8dd8d99e0b" }),
        proofs: "C1a–C9 + P: 27 of 27 on merged main (local, relocated real root, and exact-SHA CI), each with a control that fired",
        sabotage: "F3-S1–F3-S18: 18 of 18 RED on the named test for the intended reason on merged main, restored byte-identically",
        populations: "stores 4 · subjects 3 (1 external + 2 fixtures) · connectors 2 · subject×tenant 63, remainder 0 · outcome rows 105",
      }),
    ]),
  }),
  /* 🔴 F04 · ROLES, PERMISSIONS AND APPROVALS — MOVEMENT 1 ONLY (owner command _handoffs 94acbb7, §15). The acceptance was
   * frozen ALONE (b439309) before any engine change; the implementation began on branch f04-roles-permissions-approvals cut
   * from main 8d5214e (exact-SHA main CI 36110352941, success). Movement 2 (→ VERIFIED-PASS) is lawful only when EVERY frozen
   * clause is PROVED on merged main; it is not written here. Reason codes, never the historical changeKind vocabulary
   * (owner ruling 29ef6d74…, §12). Recorded as BOARD_TRANSITION events by bin/audit-trail.mjs record --confirm. */
  F04: Object.freeze({
    featureId: "F04",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      // The freeze record: the acceptance was committed ALONE in the governance repository (b439309) before any F04 engine change.
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-25", ruling: F04_ORIGINAL.ruling, contractSha256: F04_ORIGINAL.contractSha256 }),
      /* MOVEMENT 1 · UNASSESSED → IN-PROGRESS: the frozen acceptance, and the implementation begun against it. */
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F04",
        on: "2026-09-25",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_IMPLEMENTATION_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: F04_ORIGINAL.ruling.sha256, contract: F04_ORIGINAL.contractSha256 }),
        branch: "f04-roles-permissions-approvals",
        baseSha: "8d5214e5d003b778c1f32135f4ecf08140f3e542",
        baseCiRun: "36110352941",
        baseCiConclusion: "success",
        governingRuling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-09-23_F08_TARGET_AWARE_DURABILITY.md", commit: "47dc66c1ca9e39e7f19adc4ac630081ca090328b", sha256: "29ef6d74fc85944f7cf69f33c39fd0946e5eab77e8317fa5893fa086cfff4f0d" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F04_ROLES_PERMISSIONS_APPROVALS.md", commit: "94acbb73822eb6448ed4c065b49ca3e758e192dd", sha256: "5911b5544cc1df160fb8f9fb469b998f33780d4f2775bd8ee1dcb620dba9c56c" }),
      }),
      /* Amendment 1, committed ALONE (68bd208) under the owner's ruling (4bf7b1d, decision c): the EVIDENCE interpretation for
       * a high-risk family with zero current owner-approved real actions. It names, by both hashes, the freeze it amends. */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F04", on: "2026-09-25", ruling: ACCEPTANCES.F04.ruling, contractSha256: ACCEPTANCES.F04.contractSha256, amends: ACCEPTANCES.F04.amends }),
      /* MOVEMENT 2 · IN-PROGRESS → VERIFIED-PASS: F04 re-sat under the CURRENT acceptance (Amendment 1) on merged main
       * 41513bd (#159; exact-SHA main CI 36134428770 success). Research, Approval and Merge keep their real authorised and
       * refused populations; SPEND, EXPORT, VERIFICATION, PUBLISH and CONNECTED_PROPERTY_CHANGE are measured ZERO-APPROVED
       * (tools/zero-population-census.mjs): real refusals before effect, the authorised branch reached only by confined
       * controls excluded from the real population, fail-closed, and REOPEN_F04 on the first approved real action. */
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F04",
        population: "REAL",
        on: "2026-09-25",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "RETEST_PASSED_UNDER_CURRENT_ACCEPTANCE",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F04.ruling.sha256, contract: ACCEPTANCES.F04.contractSha256 }),
        pullRequest: 159,
        mergedSha: "41513bd21ce8e5f3d12ce706bcd009481885ec73",
        ciRun: "36134428770",
        ciConclusion: "success",
        zeroApprovedFamilies: ACCEPTANCES.F04.zeroApprovedFamilies,
        ownerRuling: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-09-25_F04_ZERO_APPROVED_ACTION_POPULATION.md", commit: "4bf7b1d754854e4074307ff7cee116e0ac7db23a", sha256: "52e8343892f6a8ae921ba748c3a00a3e9befdfe1767ef32a92bbdc39f1a62cbf" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F04_POST_MERGE_CLOSE.md", commit: "89e86640362622eda3ce2c5a31bc1ae102930e56", sha256: "7d5a05e57b50a599f240c08c6a3fcad01675d70be19e359e25506aedb79e03f3" }),
      }),
    ]),
  }),
  /* 🔴 F09 · CROSS-CLIENT PORTABILITY PROOF — MOVEMENT 1 (owner commands _handoffs e5f5fd4 and 474d27a, §14). The acceptance
   * was frozen ALONE (cf10494) before any measurement; the owner supplied a real external subject (Option A); the re-census and
   * ranked list were published before onboarding (e81665b); onboarding began on branch f09-cross-client-portability cut from
   * main f8b4a13 (exact-SHA main CI 36142248760, success). Movement 2 recorded under the close-out command (2601cb3) — see the VERIFIED event. */
  F09: Object.freeze({
    featureId: "F09",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-25", ruling: ACCEPTANCES.F09.ruling, contractSha256: ACCEPTANCES.F09.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F09",
        on: "2026-09-25",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_ONBOARDING_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F09.ruling.sha256, contract: ACCEPTANCES.F09.contractSha256 }),
        branch: "f09-cross-client-portability",
        baseSha: "f8b4a1387ffcc18c9f5d9483b295d53891b45062",
        baseCiRun: "36142248760",
        baseCiConclusion: "success",
        rankedListPublished: Object.freeze({ repo: "_handoffs", commit: "e81665b8dc2b8f96d4018afceab8b6e38fd32977" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F09_CROSS_CLIENT_PORTABILITY.md", commit: "e5f5fd40562bb241d0ba04522a08c7e3f703ea82", sha256: "77fde27bc0741a9b9b5cbca3df95184a53315292f5ebefa882c60550e35caf00" }),
        continuation: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F09_OPTION_A_EXTERNAL_SUBJECT.md", commit: "474d27a2672257fb9754f848de45a377c8a8c903", sha256: "bcece6bfaaa3199cce41055984473642bd1bb14f4e218fa191064a05b52e3e15" }),
      }),
      /* MOVEMENT 2 · IN-PROGRESS → VERIFIED-PASS: every frozen clause re-proved on merged main — engine 81e62ae (#161) with data
       * 11138ea (#14). Portable resolution in TWO environments: win32 local and linux CI (exact-SHA main run 36181029216, success,
       * data 11138ea checked out) resolve the same identity fingerprint, with a sensitivity control (a changed declaration or a
       * changed identity set moves the digest) and an invariance control (a relocated root does not). The unrelated-dimension
       * margin is EXACTLY THREE — the floor: if any one of those three measurements is later found wrong, F09 falls. */
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F09",
        population: "REAL",
        on: "2026-09-25",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "REAL_UNRELATED_SUBJECT_PROOF_CLOSED_EVERY_CLAUSE",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F09.ruling.sha256, contract: ACCEPTANCES.F09.contractSha256 }),
        pullRequest: 161,
        mergedSha: "81e62ae2d75aa85f084cc129559e8f357599028f",
        dataPullRequest: 14,
        dataMergedSha: "11138eac11c2a3f9388e769bcc84f67959efa5ee",
        ciRun: "36181029216",
        ciConclusion: "success",
        unrelatedDimensionMargin: 3,
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F09_CLOSE_OUT.md", commit: "2601cb335fb692a2422154344b5ad8cd1bd46c46", sha256: "42a73486fe2043fdbf08d87ab7bb86c3c046881a1030d852592f32f77317ba7c" }),
      }),
    ]),
  }),
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
  F06: Object.freeze({
    featureId: "F06",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      // The acceptance was committed ALONE in the governance repository (a0c94ce) before any F06 engine change.
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-24", ruling: ACCEPTANCES.F06.ruling, contractSha256: ACCEPTANCES.F06.contractSha256 }),
      /* Implementation began only after that commit: src/evidence/evidence-state.mjs (the canonical model),
       * src/evidence/evidence-state-adapters.mjs (the lossless adapters), and their wiring into the report labels, the
       * ledger, the governed store append and the one production supersession writer. */
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F06",
        on: "2026-09-24",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        reason: "FROZEN_ACCEPTANCE_COMMITTED_BEFORE_ENGINE_CHANGE",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-24_F06_COMPLETE.md", commit: "f9110f9fe194a59eb56acc7bab0645c893449188", sha256: "832d4090276a8cd20341c0a51a222dfb8cb3bbfba4b0201a041688b583dd76f9" }),
      }),
      /* Verified UNDER F06 over the REAL governed populations: every record the engine reports — engine stores, the
       * external observation batches, the reasoning batch, the product fact registries and the cost-ledger parts —
       * placed by structure, 7,853 items, remainder 0, UNMAPPED 0. NOT_APPLICABLE has no real population (no stored
       * record declares a scope) and is proved by synthetic control only, as the acceptance allows. */
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F06",
        population: "REAL",
        on: "2026-09-24",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        reason: "EVERY_FAILURE_CLAUSE_UNMET_ON_REAL_POPULATIONS",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F06.ruling.sha256, contract: ACCEPTANCES.F06.contractSha256 }),
        populations: "runs/audit/f06-populations-and-censuses-2026-09-24.txt — 7,853 real items, remainder 0, UNMAPPED 0, forbidden conversions 0; 40 *State names registered, remainder 0",
        proofs: "P1–P42 and P40b in test/f06-evidence-state.test.mjs, each with a control able to give the other verdict",
        sabotage: "16 of 16 RAN, 16 LANDED (bytes and behaviour), 16 RED on the named proof for the intended reason, restored, production trail untouched (runs/audit/f06-sabotage-2026-09-24.txt)",
        acceptanceRerun: "F05, F07, F08 re-run on their real populations on the F06 tree: 240/240; sabotage 16/16, 34/34, 10/10 (runs/audit/f06-acceptance-rerun-2026-09-24.txt)",
        fullSuite: "two full runs and the named counting control on the final tree (runs/audit/f06-suite-2026-09-24.txt)",
        afterMerge: "main CI green on the exact merged SHA — verified after merge and reported in _handoffs/AlmiVisibility_F06_VERIFIED_PASS_EVIDENCE_2026-09-24.md; a red main run means this record is wrong and must be reverted",
      }),
      /* 🔴 24 SEPTEMBER 2026 — A BOUNDED CORRECTION OF F06, RECORDED AS TWO LAWFUL MOVEMENTS. NOT ROUTINE MAINTENANCE.
       *
       * WHAT CONTRADICTED F06, IN PRODUCTION AT ITS CLOSURE (main e11d143):
       *   · Row 7's market-measurement writer checks every label against LABELS, which F06 made the canonical states,
       *     and wrote UNKNOWN for three dimensions it never measured (SUPPLY, AUDIENCE/NEED, WORTHINESS). Under F06
       *     that is NOT_MEASURED. The byte-pinned 15 September artefact carries the same UNKNOWN (sha256 34bcac07…).
       *     F06's own evidence record called this writer "classified H and never consumed as a canonical state" —
       *     that was false: it is a canonical-state writer.
       *   · OUTCOME_ALIASES collapsed "not-applicable" and "could-not-check" into UNKNOWN, so NOT_APPLICABLE and
       *     NOT_MEASURED could not be told from UNKNOWN on any fact check outcome.
       * FOUND on 24 September 2026: F06's own evidence record named both at closure (§8, "new findings") and put them
       * outside F06; the owner ruled the same day that they must be corrected.
       * §A — OUTSIDE F06's declared populations, by execution at e11d143: the census read no runs/discovery path, never
       * loaded market-measurement.mjs, and never called the OUTCOME_ALIASES path (every sabotage landed; a call-sabotage
       * on the adapter the census does call turned it red). F06's §5 asked for "check results" and "applicability
       * decisions" to be inspected, and the declared denominator left them out: it was INCOMPLETE, so the movement is
       * corrective, not FAILED (runs/audit/f06-correction-section-a-2026-09-24.txt).
       * The frozen F06 acceptance is unchanged; this is F06 applied to populations it should have counted.
       * Each movement carries its OWN kind: the audit identity includes (kind, day), and F06's IMPLEMENTATION and
       * VERIFIED are already recorded for this day, so reusing either would be refused as a conflict, never merged.
       * F06's first VERIFIED stays as history and still satisfies the board's pass rule; test/f06-closure.test.mjs
       * requires the correction's verification to be the row's LATEST movement, in the board and in the trail. */
      Object.freeze({
        kind: "CORRECTION_OPENED",
        featureId: "F06",
        on: "2026-09-24",
        from: "VERIFIED-PASS",
        to: "IN-PROGRESS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (bounded correction; the declared population was incomplete)",
        reason: "DECLARED_POPULATION_INCOMPLETE_CONTRADICTION_OUTSIDE_IT",
        contradiction: "Row 7's canonical-state writer wrote UNKNOWN for three never-measured dimensions (15 September bytes sha256 34bcac0714db248e16a342a0a57f2b72bc97be9e41fffff71eb3f67fd152d2bd); OUTCOME_ALIASES collapsed not-applicable and could-not-check into UNKNOWN",
        sectionA: "OUTSIDE — by execution at e11d1437271aac333838b584bf23258282e2f92b (runs/audit/f06-correction-section-a-2026-09-24.txt)",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-24_F06_CORRECTION.md", commit: "911b39c1bfe9bdd678fca3706b7ac991b3015e8f", sha256: "aad7f8a391f1b122936cc420d9d171f5a6d6df179766bed46d653c60f54954f2" }),
      }),
      Object.freeze({
        kind: "CORRECTION_VERIFIED",
        featureId: "F06",
        population: "REAL",
        on: "2026-09-24",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (bounded correction; the declared population was incomplete)",
        reason: "CORRECTION_PROVED_ON_REAL_POPULATIONS",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F06.ruling.sha256, contract: ACCEPTANCES.F06.contractSha256 }),
        repaired: "the live Row 7 writer (NOT_MEASURED for what it did not measure); a lossless, byte-bound compatibility reading of the 15 September artefact (3 NOT_MEASURED by declared measured:false, 6 UNMAPPED); OUTCOME_ALIASES' four branches placed by structure; the census widened to every runs/discovery artefact and every fact check outcome",
        populations: "runs/audit/f06-correction-census-2026-09-24.txt — 159 correction items: legacy 9 (NOT_MEASURED 3, UNMAPPED 6), current writer 9, check outcomes 141 (PASS 92, NOT_APPLICABLE 26, NOT_MEASURED 3, UNKNOWN 0, UNMAPPED 20); zeros 0/0/0/0, each control firing; the 24 governed lines byte-identical to F06's",
        proofs: "K1–K12 and K4b in test/f06-correction.test.mjs, each able to give the other verdict",
        sabotage: "X1–X16: 16 RAN, 16 LANDED (bytes and behaviour), 16 RED on the named proof for the intended reason (runs/audit/f06-correction-sabotage-2026-09-24.txt); F06's E1–E16 re-run 16/16 (runs/audit/f06-correction-f06-sabotage-rerun-2026-09-24.txt)",
        acceptanceRerun: "F05, F07, F08 re-run on the correction tree: 240/240; sabotage 16/16, 34/34, 10/10 (runs/audit/f06-correction-acceptance-rerun-2026-09-24.txt)",
        parked: "localized-reasoning memberState (class H) holds 63 UNKNOWN members with no read attempt recorded; VERIFICATION_OUTCOME maps UNVERIFIED to UNKNOWN as judgeLeavingUnknown's population predicate only; 19 fingerprint and 1 quote outcome stay UNMAPPED for want of a positive marker",
        afterMerge: "main CI green on the exact merged SHA — verified after merge and reported in _handoffs/AlmiVisibility_F06_CORRECTION_EVIDENCE_2026-09-24.md; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  F07: Object.freeze({
    featureId: "F07",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      // The acceptance was committed ALONE in the governance repository (cd149ae) before any F07 engine change.
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-23", ruling: ACCEPTANCES.F07.ruling, contractSha256: ACCEPTANCES.F07.contractSha256 }),
      /* Implementation began only after that commit: src/governance/sealed-paths.mjs (classification before read),
       * src/heldout/lifecycle.mjs (freeze, access, scoring), src/governance/mandatory-reading.mjs and its manifest,
       * bin/heldout-evaluation.mjs. Movements carry a `reason`, never the historical changeKind vocabulary. */
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F07",
        on: "2026-09-23",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        reason: "FROZEN_ACCEPTANCE_COMMITTED_BEFORE_ENGINE_CHANGE",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-23_F07_COMPLETE.md", commit: "5474dc4051bf268570ce261935be205d009f75a0", sha256: "e607364b50d87374e0f83a52cb4dfa2ced3388b2e4e45daa1d7280a00932b6a1" }),
      }),
      /* Verified UNDER F07 over the REAL populations — the real evidence-role registry, the real 61-path sealed
       * population (never opened), the real manifest and the real authority corpus. Lifecycle proofs are synthetic by
       * design, and say so. */
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F07",
        population: "REAL",
        on: "2026-09-23",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        reason: "EVERY_FAILURE_CLAUSE_UNMET_ON_REAL_POPULATIONS",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F07.ruling.sha256, contract: ACCEPTANCES.F07.contractSha256 }),
        populations: "runs/audit/f07-populations-2026-09-23.txt — sealed paths, manifest, access paths, access log, payload, freeze; decision-site census HELDOUT family LIVE_AUDITED with 0 unrecorded exits",
        proofs: "P1–P34 in test/f07-heldout-firewall.test.mjs, each with a control able to give the other verdict",
        sabotage: "16 of 16 EXECUTED and RED on the named proof for the intended reason, restored by raw-byte hash, production trail untouched (runs/audit/f07-sabotage-2026-09-23.txt)",
        fullSuite: "two full runs and the named counting control on the final tree (runs/audit/f07-suite-2026-09-23.txt)",
        afterMerge: "main CI green on the exact merged SHA — verified after merge and reported in _handoffs/AlmiVisibility_F07_VERIFIED_PASS_EVIDENCE_2026-09-23.md; a red main run means this record is wrong and must be reverted",
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
