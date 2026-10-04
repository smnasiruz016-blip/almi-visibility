/**
 * 🔴 THE ACTIVE F-BOARD — WHAT IS DECLARED. Every capability not listed here is UNASSESSED (src/fboard/board.mjs
 * `buildBoard`), and UNASSESSED is not PASS.
 *
 * Each declared row names its board (F_BOARD), its state, and the events that earned it. A state moves only with its
 * event: a frozen acceptance for leaving UNASSESSED, a recorded verification for VERIFIED-PASS, a named blocker for a
 * BLOCKED state. No row carries historical state.
 */
import { ACCEPTANCES, F02_ORIGINAL, F04_ORIGINAL, F07_ORIGINAL, F07_AMENDMENT_1, F07_AMENDMENT_2, F10_ORIGINAL, F10_AMENDMENT_1, F10_AMENDMENT_2, F77_ORIGINAL, F48_ORIGINAL, F79_ORIGINAL, F27_ORIGINAL, F27_AMENDMENT_1, F27_AMENDMENT_2, F91_ORIGINAL, F91_AMENDMENT_1, F91_AMENDMENT_2, F16_ORIGINAL, F16_AMENDMENT_1, F16_AMENDMENT_2, F16_AMENDMENT_3, F13_ORIGINAL, F19_ORIGINAL, F22_ORIGINAL, F25_ORIGINAL, F25_AMENDMENT_1, F81_ORIGINAL } from "./acceptances.mjs";

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
  /* 🔴 F10 · HUMAN QUESTION DISCOVERY — MOVEMENT 1 (owner command _handoffs 991eb9e, §3 B1). The acceptance was frozen ALONE
   * (504dbb9) after the storage ruling S (84abe3d), the scorer-route and missing-output resolutions (3adb716), the allocation
   * adoption (f45a33c) and the A2 determinations (fd1e1bf); implementation begins on branch f10-human-question-discovery cut
   * from main 59060fa (exact-SHA main CI 36223662080, success). By the owner's ruling 1.6 the follow-up limb (C7) is
   * NOT_MEASURED until real sequence evidence exists, and capturing it belongs to no row of the 89 — so F10 stays IN-PROGRESS,
   * open-ended. That is the owner's choice, not a defect. No VERIFIED movement is made or implied here. */
  F10: Object.freeze({
    featureId: "F10",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-26", ruling: F10_ORIGINAL.ruling, contractSha256: F10_ORIGINAL.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F10",
        on: "2026-09-26",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS; VERIFIED-PASS is unavailable while clause C7 (follow-up questions) is NOT_MEASURED",
        reason: "FROZEN_ACCEPTANCE_COMMITTED_BEFORE_ENGINE_CHANGE",
        acceptanceUnchanged: Object.freeze({ ruling: F10_ORIGINAL.ruling.sha256, contract: F10_ORIGINAL.contractSha256 }),
        branch: "f10-human-question-discovery",
        baseSha: "59060fa5393585ab1afb347316fec5ea3a813ead",
        baseCiRun: "36223662080",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_RESUME_EXTERNAL_SEALED_KEY.md", commit: "991eb9e1c0548c50cacefe9f7ae626c462c0f4c7", sha256: "f60f875adb344e28403e88e3d92599c25429f6f380fde4897910441fde06567e" }),
      }),
      /* Amendment 1 (2ee6c2a, committed ALONE): C7 only, after the owner approved its nine pre-run values without alteration
       * (ed85493). It names the original by both hashes. NO state change: F10 stays IN-PROGRESS and C7 NOT_MEASURED. */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F10", on: "2026-09-26", ruling: F10_AMENDMENT_1.ruling, contractSha256: F10_AMENDMENT_1.contractSha256, amends: F10_AMENDMENT_1.amends }),
      /* F10 Amendment 2 (27 Sep 2026, 370a3b3): C3's CI clause only. NO board movement — F10 stays IN-PROGRESS. */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F10", on: "2026-09-27", ruling: F10_AMENDMENT_2.ruling, contractSha256: F10_AMENDMENT_2.contractSha256, amends: F10_AMENDMENT_2.amends }),
      /* F10 Amendment 3 (28 Sep 2026, 9c8b9f7): C3 only — this seal is DISCLOSED; the membership-blind class is permanently unavailable
       * for it. NO board movement — F10 stays IN-PROGRESS. */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F10", on: "2026-09-28", ruling: ACCEPTANCES.F10.ruling, contractSha256: ACCEPTANCES.F10.contractSha256, amends: ACCEPTANCES.F10.amends }),
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
    /* 🔴 REOPENED 25 Sep 2026 — AUTHORITATIVE_REQUIREMENT_CHANGE, by the owner's route (R-A2): Amendment 1 was frozen ALONE
     * (a0b7e4b) and widens what the leak census must enumerate. NOT a claim that the old implementation failed its old
     * population: existing F07 evidence remains historically valid; the current population of registered sealed
     * HELD_OUT_EVIDENCE and MARKING_KEY entries is zero; the reopen is caused by the newly frozen wider requirement, not by
     * concealed contradictory evidence. F-progress drops while this stands, and the drop is the honest route. */
    /* 🔴 VERIFIED-PASS AGAIN — under Amendment 1, by the route the reopening recorded. The PASS is EARNED only when main
     * CI is green on the exact merged SHA; the VERIFIED event says so (afterMerge), and a red main run means this movement
     * must be reverted. The new limbs' REAL population is zero (NOT_MEASURED) and the event says exactly what they are
     * proved against. */
    /* 🔴 REOPENED 26 Sep 2026 — AUTHORITATIVE_REQUIREMENT_CHANGE, by the same route: Amendment 2 was frozen ALONE (051feb9)
     * and adds the evaluator limb the frozen text always implied (linked grant, governed read, aggregate score, complete
     * census in both marking-key location shapes). Amendment 1's evidence remains historically valid for what it measured;
     * live MARKING_KEY entries number zero; the reopen is caused by the newly frozen wider requirement. */
    /* 🔴 VERIFIED-PASS AGAIN — under Amendment 2, by the route the reopening recorded, EARNED only when main CI is green on
     * the exact merged SHA (afterMerge). The four added limbs' REAL population is zero (NOT_MEASURED): the event says what
     * they are, and are not yet, proved against. */
    /* 🔴 REOPENED a third time, 26 Sep 2026 — AUTHORITATIVE_REQUIREMENT_CHANGE, by the same route: Amendment 3 was frozen ALONE
     * (264c680) after the limb census (4fc5656). It adds the paired release F10's C7 needs (three count-only aggregates, a
     * real ABSTAIN, set/key preflight before the claim). Amendments 1 and 2 remain historically valid for what they measured; live
     * HELD_OUT_EVIDENCE and MARKING_KEY entries number zero; the reopen is caused by the newly frozen wider requirement. */
    /* 🔴 REOPENED 27 Sep 2026 — CONCRETE_CONTRADICTORY_EVIDENCE, NOT a requirement change. GOVERNED READ requires every read to
     * "record a durable ACCESS event before the value is used". Two real production sealed reads (the census at 04:13:57Z) did
     * append their ACCESS events, and `git checkout` then destroyed both. The production trail lived in a git working tree,
     * so for those two reads the durable ACCESS record does not exist, and the requirement was NOT met. The requirement
     * did not change; the world failed to meet it. Timeline and blast radius: _handoffs 5fd0435. */
    /* 🔴 VERIFIED-PASS AGAIN — 27 Sep 2026, by the route the reopening recorded, under the UNCHANGED Amendment 3. The history is
     * represented, not repaired: AUDIT_CORRECTION fc623f98… records that those two reads' ACCESS records were destroyed and
     * are UNRECOVERABLE, and that the later census is a different pair of reads. What is proved is the mechanism: an ACCESS
     * event appended through the production path now survives checkout/restore/reset/stash (out-of-tree witness), and a
     * shortened trail refuses further appends. EARNED only when main CI is green on the exact merged SHA (afterMerge). */
    /* 🔴 REOPENED 28 Sep 2026 — CONCRETE_CONTRADICTORY_EVIDENCE, NOT a requirement change. Eight reads of storage S, by CC's own
     * scratch scripts and one run of the owner's tool, between the seal (27 Sep 02:19:02Z) and the owner's labelling, read the set side
     * — both registered HELD_OUT_EVIDENCE sets, and the packet queues with wording — WITHOUT a durable ACCESS event and through a
     * path other than the sealed lifecycle. F07's FAILURE limbs "a read of either side reaches its value without a durable ACCESS
     * recorded first, or through any path other than the sealed lifecycle" and "a payload item … or an item-level result crosses out
     * of the boundary" are MET by those events; THE LIMIT disclaims OBSERVATION, it does not remove the limbs. No label and no key was
     * read. The requirement did not change; no amendment. Classification: _handoffs be583fa. */
    state: "IN-PROGRESS",
    events: Object.freeze([
      // The acceptance was committed ALONE in the governance repository (cd149ae) before any F07 engine change.
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-23", ruling: F07_ORIGINAL.ruling, contractSha256: F07_ORIGINAL.contractSha256 }),
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
        acceptanceUnchanged: Object.freeze({ ruling: F07_ORIGINAL.ruling.sha256, contract: F07_ORIGINAL.contractSha256 }),
        populations: "runs/audit/f07-populations-2026-09-23.txt — sealed paths, manifest, access paths, access log, payload, freeze; decision-site census HELDOUT family LIVE_AUDITED with 0 unrecorded exits",
        proofs: "P1–P34 in test/f07-heldout-firewall.test.mjs, each with a control able to give the other verdict",
        sabotage: "16 of 16 EXECUTED and RED on the named proof for the intended reason, restored by raw-byte hash, production trail untouched (runs/audit/f07-sabotage-2026-09-23.txt)",
        fullSuite: "two full runs and the named counting control on the final tree (runs/audit/f07-suite-2026-09-23.txt)",
        afterMerge: "main CI green on the exact merged SHA — verified after merge and reported in _handoffs/AlmiVisibility_F07_VERIFIED_PASS_EVIDENCE_2026-09-23.md; a red main run means this record is wrong and must be reverted",
      }),
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F07", on: "2026-09-25", ruling: F07_AMENDMENT_1.ruling, contractSha256: F07_AMENDMENT_1.contractSha256, amends: F07_AMENDMENT_1.amends }),
      Object.freeze({
        kind: "REOPENED",
        featureId: "F07",
        on: "2026-09-25",
        from: "VERIFIED-PASS",
        to: "IN-PROGRESS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (authoritative requirement change: Amendment 1)",
        reason: "AUTHORITATIVE_REQUIREMENT_CHANGE",
        reopenRule: "one of the owner's five reopen grounds (src/checklist/classification.mjs REOPEN_REASONS), matched word for word",
        rationale: "existing F07 evidence remains historically valid; the current population of registered sealed HELD_OUT_EVIDENCE and MARKING_KEY entries is zero; the reopen is caused by the newly frozen wider requirement, not by concealed contradictory evidence",
        amendment: Object.freeze({ ruling: F07_AMENDMENT_1.ruling, contractSha256: F07_AMENDMENT_1.contractSha256 }),
        ownerRulings: Object.freeze({ repo: "_handoffs", d8: "9fdda821627126db133a3493d0500aa89506f5b5", rA2: "1faafaeab846dd9d782f9993557da82021b6a458" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F07_NARROW_AMENDMENT_REISSUE.md", commit: "a5bfa0dfaef4716430712275a04c25565502bc92", sha256: "a6f46d580e22cea46fa568d16f640092cdeb4fc08d6ff2ead55cfe0d62c30f2a" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F07",
        population: "REAL",
        on: "2026-09-25",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (authoritative requirement change: Amendment 1)",
        reason: "AMENDED_CONTRACT_PROVED_EXISTING_LIMBS_ON_REAL_POPULATIONS",
        acceptanceUnchanged: Object.freeze({ ruling: F07_AMENDMENT_1.ruling.sha256, contract: F07_AMENDMENT_1.contractSha256 }),
        realPopulationNewLimbs: "NOT_MEASURED (F06) — 0 registered HELD_OUT_EVIDENCE and 0 registered MARKING_KEY entries in the real registry; zero is not a pass, and the amended EVIDENCE clause requires the count stated, including zero",
        provedAgainst: "the existing limbs on the real registry, the real sealed paths (never opened), the real manifest and the real authority corpus; the new limbs on constructed, non-sensitive stand-ins registered only in scratch trees — a planted leak of each new role FOUND and named by role, category and path, never by content; every unreadable or unverifiable registered entry failed closed; the in-boundary read recorded as one durable ACCESS",
        notYetProvedAgainst: "a REAL registered HELD_OUT_EVIDENCE set or MARKING_KEY — none exists; the first real registration is the first real population for these limbs",
        proofs: "test/f07-amendment-leak-census.test.mjs (10), with F07's existing proofs re-run: test/f07-heldout-firewall.test.mjs, test/heldout-firewall.test.mjs, test/f07-sink-repair.test.mjs, test/f07-closure.test.mjs",
        sabotage: "F7A-S1–S11 (new) · F7-S1–S16 and K1–K10 (existing, re-run; K6 re-anchored to the changed classification line, intent unchanged)",
        afterMerge: "main CI green on the exact merged SHA — verified after merge and reported in _handoffs/AlmiVisibility_F07_AMENDMENT_1_EVIDENCE_2026-09-25.md; a red main run means this record is wrong and must be reverted",
      }),
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F07", on: "2026-09-26", ruling: F07_AMENDMENT_2.ruling, contractSha256: F07_AMENDMENT_2.contractSha256, amends: F07_AMENDMENT_2.amends }),
      Object.freeze({
        kind: "REOPENED",
        featureId: "F07",
        on: "2026-09-26",
        from: "VERIFIED-PASS",
        to: "IN-PROGRESS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (authoritative requirement change: Amendment 2)",
        reason: "AUTHORITATIVE_REQUIREMENT_CHANGE",
        reopenRule: "one of the owner's five reopen grounds (src/checklist/classification.mjs REOPEN_REASONS), matched word for word",
        rationale: "Amendment 1's evidence remains historically valid for what it measured; live MARKING_KEY entries number zero; the reopen is caused by the newly frozen wider requirement (the evaluator limb), not by concealed contradictory evidence",
        amendment: Object.freeze({ ruling: F07_AMENDMENT_2.ruling, contractSha256: F07_AMENDMENT_2.contractSha256 }),
        ownerRulings: Object.freeze({ repo: "_handoffs", optionA: "c4f55d79e3c49122cb5eff2be2b9424a43852036", rA2: "1faafaeab846dd9d782f9993557da82021b6a458" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F07_AMENDMENT_2_MARKING_KEY_EVALUATOR.md", commit: "c4f55d79e3c49122cb5eff2be2b9424a43852036", sha256: "7db208549f2c592a819b7e293ffcc411a57ba0c7ac35ec88b96af55901c99d17" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F07",
        population: "REAL",
        on: "2026-09-26",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (authoritative requirement change: Amendment 2)",
        reason: "AMENDED_CONTRACT_PROVED_EXISTING_LIMBS_ON_REAL_POPULATIONS",
        acceptanceUnchanged: Object.freeze({ ruling: F07_AMENDMENT_2.ruling.sha256, contract: F07_AMENDMENT_2.contractSha256 }),
        realPopulationNewLimbs: "NOT_MEASURED (F06) — 0 registered HELD_OUT_EVIDENCE, 0 registered MARKING_KEY and 0 declared governed sealed stores in the real registry; zero is not a pass, and the amended EVIDENCE clause requires the count stated, including zero",
        provedAgainst: "the existing limbs on the real registry, the real sealed paths (never opened), the real manifest and the real authority corpus, with the production firewall and evaluator entry points run confined; the four added limbs (linked grant, governed read, aggregate score, complete census) on constructed, non-sensitive stand-ins in scratch trees, an OS temporary store and in-memory audit stores, in BOTH marking-key location shapes — hand-worked tables reproduced exactly, every refusal named and recorded, every read recorded before use, one valid run per frozen combination",
        notYetProvedAgainst: "a REAL registered HELD_OUT_EVIDENCE set, MARKING_KEY or governed sealed store — none exists; the first real registration is the first real population for these limbs; activity outside the governed paths (an independent git show, a direct file read) is not observable by F07 and is not claimed",
        proofs: "test/f07-amendment2-marking-key.test.mjs (17), with F07's existing proofs re-run: test/f07-heldout-firewall.test.mjs, test/heldout-firewall.test.mjs, test/f07-sink-repair.test.mjs, test/f07-closure.test.mjs, test/f07-amendment-leak-census.test.mjs",
        sabotage: "F7B-S1–S21 (new) · F7-S1–S16, K1–K10 and F7A-S1–S11 (existing, re-run; F7-S1 re-anchored to the changed readUnsealed line, intent unchanged)",
        afterMerge: "main CI green on the exact merged SHA — verified after merge and reported in _handoffs; a red main run means this record is wrong and must be reverted",
      }),
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F07", on: "2026-09-26", ruling: ACCEPTANCES.F07.ruling, contractSha256: ACCEPTANCES.F07.contractSha256, amends: ACCEPTANCES.F07.amends }),
      Object.freeze({
        kind: "REOPENED",
        featureId: "F07",
        on: "2026-09-26",
        from: "VERIFIED-PASS",
        to: "IN-PROGRESS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (authoritative requirement change: Amendment 3)",
        reason: "AUTHORITATIVE_REQUIREMENT_CHANGE",
        reopenRule: "one of the owner's five reopen grounds (src/checklist/classification.mjs REOPEN_REASONS), matched word for word",
        rationale: "Amendments 1 and 2 remain historically valid for what they measured; live HELD_OUT_EVIDENCE and MARKING_KEY entries number zero; the reopen is caused by the newly frozen wider requirement (the paired release F10 C7 needs), not by concealed contradictory evidence",
        amendment: Object.freeze({ ruling: ACCEPTANCES.F07.ruling, contractSha256: ACCEPTANCES.F07.contractSha256 }),
        limbCensus: Object.freeze({ repo: "_handoffs", commit: "4fc565696b769c0dba6396c9993757aee57e12d6" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_C7_COMPLETION_PATH.md", commit: "148d48f94dfca10123580d8cf9b279c056d03e5d", sha256: "5bdd8100f025a8fd7850e57b3c009acf1e7503fa36840a0747be68ac6f10e69e" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F07",
        population: "REAL",
        on: "2026-09-26",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (authoritative requirement change: Amendment 3)",
        reason: "AMENDED_CONTRACT_PROVED_EXISTING_LIMBS_ON_REAL_POPULATIONS",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F07.ruling.sha256, contract: ACCEPTANCES.F07.contractSha256 }),
        realPopulationNewLimbs: "NOT_MEASURED (F06) — 0 registered HELD_OUT_EVIDENCE and 0 registered MARKING_KEY in the real registry; the one declared governed sealed store (f10-marking-key) is required by no entry; zero is not a pass, and the amended EVIDENCE clause requires the count stated, including zero",
        provedAgainst: "the existing limbs re-run on the amended tree; the four added limbs (paired release, ABSTAIN distinct from NO, pair structure, set/key preflight before the claim) and the paired ceiling on constructed, non-sensitive stand-ins in scratch trees, an OS temporary store and in-memory audit stores, in BOTH marking-key location shapes — hand-worked counts reproduced exactly (tables, abstentions 2, discordant pairs 3, correct both ways 2), every refusal named by code, the once-only run unspent after a set/key fault",
        notYetProvedAgainst: "a REAL registered paired set or its marking key — none exists; the first real registration is the first real population for these limbs; activity outside the governed paths is not observable by F07 and is not claimed",
        proofs: "test/f07-amendment3-paired.test.mjs (11), with F07's existing proofs re-run and three re-sat to the amendment (F07A2 C3 fail-closed; F10 C4 route order; F10 C4 wrong key): test/f07-amendment2-marking-key.test.mjs, test/f07-heldout-firewall.test.mjs, test/heldout-firewall.test.mjs, test/f07-sink-repair.test.mjs, test/f07-closure.test.mjs, test/f07-amendment-leak-census.test.mjs",
        sabotage: "F7C-S1–S16 (new) · F7B-S1–S21, F7-S1–S16, K1–K10 and F7A-S1–S11 (existing, re-run; F7B-S10 and S17 re-anchored to the preflight's refuse, intent unchanged)",
        afterMerge: "main CI green on the exact merged SHA — verified after merge and reported in _handoffs; a red main run means this record is wrong and must be reverted",
      }),
      Object.freeze({
        kind: "REOPENED",
        featureId: "F07",
        on: "2026-09-27",
        from: "VERIFIED-PASS",
        to: "IN-PROGRESS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (concrete contradictory evidence: two ACCESS records destroyed by a source-control operation)",
        reason: "CONCRETE_CONTRADICTORY_EVIDENCE",
        reopenRule: "one of the owner's five reopen grounds (src/checklist/classification.mjs REOPEN_REASONS), matched word for word",
        rationale: "GOVERNED READ requires every read of either side to record a durable ACCESS event before the value is used; two real production sealed reads appended their ACCESS events (trail 1131 -> 1133) and a git checkout in the same command removed both, so no durable ACCESS record of those two reads exists — the requirement did not change, the store that holds the record was deletable by an ordinary git operation",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F07.ruling.sha256, contract: ACCEPTANCES.F07.contractSha256 }),
        evidenceRecord: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_PR171_AUDIT_INCIDENT_TIMELINE_AND_BLAST_RADIUS_2026-09-27.md", commit: "5fd0435127540d9879c7b573e7a33bf859d0a59c", sha256: "a67dedd4faa0ff5c707371cab647078463e98ff60506556427ab5643999697ca" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-27_PR171_AUDIT_INCIDENT_RECONCILE.md", commit: "788919908338c3ddb39217a7d60c62733eb29381", sha256: "4e56ffae5818346437381347ecd73c2b912f687215e18151e2a8b277cd69559d" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F07",
        population: "REAL",
        on: "2026-09-27",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (concrete contradictory evidence: two ACCESS records destroyed by a source-control operation)",
        reason: "GOVERNED_READ_DURABILITY_REPAIRED_HISTORY_RECORDED_AS_A_GAP",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F07.ruling.sha256, contract: ACCEPTANCES.F07.contractSha256 }),
        historyRepresented: "AUDIT_CORRECTION fc623f98b8a3b3bd31d790b2279e3ef6 (GAP-2026-09-27-A): the two lost ACCESS records do not exist, their bytes and ids are UNRECOVERABLE, and the later census (70af1508…, 6075a9c3…) is a different pair of reads — no lost event is recreated or claimed",
        provedAgainst: "the REAL registration on the owner machine: a fresh PRODUCTION census after the repair, FAILURES 0, HELD_OUT_EVIDENCE 2 read in the boundary, two durable ACCESS events 7ef97808… and 7b23adfc… appended before use and mirrored to the out-of-tree witness (EQUAL); durability against checkout, restore, reset --hard and stash proved with real git on the production store path (test/f08-witness.test.mjs W2), each with a control",
        notYetProvedAgainst: "a loss that also removes the witness, or occurs where no witness exists (a fresh clone before its first append, CI) — the witness's declared limit; activity outside the governed paths is not observable by F07 and is not claimed",
        proofs: "test/f08-witness.test.mjs (12), test/f08-audit-gap.test.mjs (3), with every existing F07 proof re-run: f07-amendment3-paired, f07-amendment2-marking-key, f07-heldout-firewall, heldout-firewall, f07-sink-repair, f07-closure, f07-amendment-leak-census, f10-storage-s-registration",
        sabotage: "WS-S1–S9 and GP-S1–S4 (new, 13/13) · F7C 16/16, F7B 21/21, F7A 11/11, F7 16/16, F07 sink 10/10, SL 17/17, C7 24/24, F10 23/23 (existing, re-run), residue 0, production trail untouched",
        afterMerge: "main CI green on the exact merged SHA — verified after merge and reported in _handoffs; a red main run means this record is wrong and must be reverted",
      }),
      Object.freeze({
        kind: "REOPENED",
        featureId: "F07",
        on: "2026-09-28",
        from: "VERIFIED-PASS",
        to: "IN-PROGRESS",
        route: "VERIFIED-PASS -> IN-PROGRESS (concrete contradictory evidence: eight out-of-band reads of the set side of storage S, no ACCESS recorded)",
        reason: "CONCRETE_CONTRADICTORY_EVIDENCE",
        reopenRule: "one of the owner's five reopen grounds (src/checklist/classification.mjs REOPEN_REASONS), matched word for word",
        rationale: "between the seal (2026-09-27T02:19:02Z) and the owner's labelling, eight reads of storage S read both registered HELD_OUT_EVIDENCE sets' members and the packet queues' wording without a durable ACCESS event and outside the sealed lifecycle; F07 FAILURE 'a read of either side reaches its value without a durable ACCESS recorded first, or through any path other than the sealed lifecycle' and 'a payload item … or an item-level result crosses out of the boundary' are met; no label and no marking key was read; THE LIMIT disclaims observation and does not remove the limbs",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F07.ruling.sha256, contract: ACCEPTANCES.F07.contractSha256 }),
        evidenceRecord: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F10_C3_INCIDENT_CLASSIFICATION_2026-09-28.md", commit: "be583fa523427593debe259da1134cd6ca6a62cb", sha256: "63c6c54b9c564984f1f7d2c3ecf53cfd57acfbe7098d1d787ce0475d023a4f21" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-27_CORRECT_V3_ADOPTION_AND_RECOVER_F10.md", commit: "af4e9c89a8cd1d5216696858bc4c5dae67eb3120", sha256: "3c6144c0beadacd28724a27aa991fe384aed60791e737c0a1defdf8d7d8aab72" }),
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
    /* 🔴 REOPENED 26 Sep 2026 — CONCRETE_CONTRADICTORY_EVIDENCE (D-RECORDER-1). F08's own frozen text requires every governed
     * event recorded "under which authority as it stood at the time of the event", and fails when "a governed action produces no
     * audit event" or "superseded authority is reported as the authority at the event". The shipped recorder re-attributed
     * historical board movements to a later amendment's authority and refused a real reopen (census _handoffs 99f0732). The
     * requirement did not change; the shipped code never met it. No amendment is frozen. */
    /* 🔴 REOPENED 27 Sep 2026 — CONCRETE_CONTRADICTORY_EVIDENCE. EXPECTED: "Every governed event is recorded in an append-only
     * … audit trail". 65 governed events, appended through the production path in four separate runs, were removed by
     * ordinary git operations (checkout of the trail files); two of them were ACCESS events of real sealed reads
     * (_handoffs 5fd0435). A store that a routine source-control operation can shorten is not append-only as operated. The
     * FAILURE limb on deletion is bounded "within the declared detection boundary", and a consistent truncation of events
     * and head together is this store's DECLARED undetected case. This reopen does not claim that limb was met. It rests
     * on EXPECTED, which the world contradicted 65 times. The requirement did not change. */
    /* 🔴 VERIFIED-PASS AGAIN — 27 Sep 2026, under F08's UNCHANGED acceptance. The production store now has an out-of-tree
     * witness (src/audit-trail/witness.mjs), so the consistent truncation a git checkout performs is DETECTED by verify
     * and REFUSES further appends; the 65 lost events are recorded as one AUDIT_CORRECTION gap (fc623f98…), never
     * recreated. The witness's own limit is declared (WITNESS_BOUNDARY). EARNED only when main CI is green on the exact
     * merged SHA (afterMerge). */
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
      Object.freeze({
        kind: "REOPENED",
        featureId: "F08",
        on: "2026-09-26",
        from: "VERIFIED-PASS",
        to: "IN-PROGRESS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (concrete contradictory evidence: D-RECORDER-1)",
        reason: "CONCRETE_CONTRADICTORY_EVIDENCE",
        reopenRule: "one of the owner's five reopen grounds (src/checklist/classification.mjs REOPEN_REASONS), matched word for word",
        rationale: "the recorder gives every historical board movement the row's CURRENT acceptance authority and CURRENT state (src/audit-trail/population.mjs familyBCandidates), so an amendment re-attributes earlier movements, re-emits an old VERIFIED after a new REOPENED, and refuses a real same-day reopen as EVENT_ID_CONFLICT — F08's EXPECTED and FAILURE clauses already forbid this",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F08.ruling.sha256, contract: ACCEPTANCES.F08.contractSha256 }),
        census: Object.freeze({ repo: "_handoffs", commit: "99f073295fcb2af13e50b70477160c318b1049c8" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-26_REPAIR_D_RECORDER_1_THEN_RESUME.md", commit: "d861f470453fc9ccdb3dcd4f8b2fa66a077c6c33", sha256: "fdb091be5a53a8dc3a071fd9f9e13e62f251c1765e77f00af6bc9f1442cc42b1" }),
      }),
      /* Verified UNDER F08's UNCHANGED acceptance after the recorder repair (dc60844): every board movement now binds to the
       * acceptance that governed it and the state after it; this very movement was recorded THROUGH the repaired recorder. */
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F08",
        population: "REAL",
        on: "2026-09-26",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (concrete contradictory evidence D-RECORDER-1, repaired)",
        reason: "FAILURE_CLAUSES_NO_LONGER_MET_AFTER_RECORDER_REPAIR",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F08.ruling.sha256, contract: ACCEPTANCES.F08.contractSha256 }),
        populations: "real board: 45 declared movements before this one, 45 already audited, 0 re-emitted, 0 NOT_MIGRATABLE, 0 INVALID (test/d-recorder-1.test.mjs REAL, on a copy of the trail)",
        proofs: "test/d-recorder-1.test.mjs 9/9: two same-day amendments on one row; two same-kind movements under one acceptance; legacy events consumed once; idempotent re-derivation; old VERIFIED then new REOPENED; collision refusal; the real board; no default",
        sabotage: "D-RECORDER-1 6/6 RED on the named test for the intended reason, restored; F08 34/34; ASP 15/15; production trail untouched",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
      Object.freeze({
        kind: "REOPENED",
        featureId: "F08",
        on: "2026-09-27",
        from: "VERIFIED-PASS",
        to: "IN-PROGRESS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (concrete contradictory evidence: governed events removed from the trail by source-control operations)",
        reason: "CONCRETE_CONTRADICTORY_EVIDENCE",
        reopenRule: "one of the owner's five reopen grounds (src/checklist/classification.mjs REOPEN_REASONS), matched word for word",
        rationale: "EXPECTED requires every governed event recorded in an append-only audit trail; 65 governed events appended through the production path in four runs were removed by git checkout of the trail files (2 of them ACCESS events of real sealed reads), because the only copy of the trail lived in a git working tree — the deletion limb is bounded by the declared detection boundary and is not claimed met; EXPECTED is what the world contradicted",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F08.ruling.sha256, contract: ACCEPTANCES.F08.contractSha256 }),
        evidenceRecord: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_PR171_AUDIT_INCIDENT_TIMELINE_AND_BLAST_RADIUS_2026-09-27.md", commit: "5fd0435127540d9879c7b573e7a33bf859d0a59c", sha256: "a67dedd4faa0ff5c707371cab647078463e98ff60506556427ab5643999697ca" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-27_PR171_AUDIT_INCIDENT_RECONCILE.md", commit: "788919908338c3ddb39217a7d60c62733eb29381", sha256: "4e56ffae5818346437381347ecd73c2b912f687215e18151e2a8b277cd69559d" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F08",
        population: "REAL",
        on: "2026-09-27",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (concrete contradictory evidence: governed events removed from the trail by source-control operations)",
        reason: "APPEND_ONLY_HELD_AGAINST_SOURCE_CONTROL_OPERATIONS_GAP_RECORDED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F08.ruling.sha256, contract: ACCEPTANCES.F08.contractSha256 }),
        historyRepresented: "AUDIT_CORRECTION fc623f98b8a3b3bd31d790b2279e3ef6 (GAP-2026-09-27-A) points to the 65 removed events (L1 25 · L2 1 · L3 37 · L4 2) and their evidence (_handoffs 5fd0435); none is recreated",
        populations: "the REAL production trail: 1166 events, chain verifies, witness EQUAL 1166; the earlier prefixes byte-identical (9a7565c: 1133 lines; origin/main: 1084 lines)",
        proofs: "test/f08-witness.test.mjs 12/12 — write -> checkout / restore / reset --hard / stash -> TRAIL_BEHIND_WITNESS and AUDIT_WITNESS_REFUSED on the production store with real git, a control reaching the other verdict, divergence refused, seed and catch-up lawful, confined stores and worktrees separate; test/f08-audit-gap.test.mjs 3/3 — a gap claiming recovered records, ids, bytes or a replacing census is refused",
        sabotage: "WS-S1–S9 and GP-S1–S4 13/13 (new); F08 34/34, D-RECORDER-1 9/9, ASP 15/15 (re-run), residue 0, production trail untouched; the governed-caller census caught a direct append in the first gap command (c4f3954) and it was routed through recordCandidates (73bd9d4)",
        declaredLimit: "a loss that also removes the witness, or that occurs where no witness exists (a fresh clone before its first append, CI), is NOT DETECTED; the witness is a second copy under the same user's control, not a remote notary",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F35 · Action decision engine. Frozen 29 Sep (_handoffs da659bd, RR-88 §2) ALONE. The PAGE DECISION cluster's second row.
   * Historical row 20 was DEFERRED (class D) with no code and never proved; its wording ("exactly one primary action", no REMOVE) is
   * CHANGED. The verified rows F31, F33, F34, F36 and F21 supply every input; nothing is collected. */
  /* 🔴 REOPENED 29 Sep 2026 — CONCRETE_CONTRADICTORY_EVIDENCE, NOT a requirement change (RR-89 §3). On the real data F35 chose MERGE
   * for 17 pages while printing that whether they duplicate one intent was NOT MEASURED — the only evidence was a shared broad need
   * (F33 headline coverage). MERGE's authority is V3 §8 "Multiple pages split or duplicate one intent"; C2's FAILURE limb "Missing or
   * insufficient evidence yields an action instead of CANNOT DECIDE" is MET. The fault is CC's: the preamble resolved MERGE's rule
   * more loosely than its authority, and tests and record accepted it. Classification: _handoffs 2f010f3. The board count FALLS
   * while this stands, because a wrong PASS was corrected. */
  /* 🔴 VERIFIED-PASS AGAIN — 29 Sep 2026, by the route the reopening recorded, under the UNCHANGED acceptance (da659bd). MERGE and
   * REDIRECT now need a RECORDED semantic review finding one intent duplicated or split; a shared need or similarity alone is CANNOT
   * DECIDE naming that review. EARNED only when main CI is green on the exact merged SHA (afterMerge). */
  F35: Object.freeze({
    featureId: "F35",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F35.ruling, contractSha256: ACCEPTANCES.F35.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F35",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F35.ruling.sha256, contract: ACCEPTANCES.F35.contractSha256 }),
        branch: "rr88-f35-action-decision",
        baseSha: "522b47815cfd3783a2a725bc1df8e9b23a8b6d2b",
        baseCiRun: "36518431124",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-88_CLOSE_184_THEN_F35.md", commit: "b8c1463eafbe020de17d5af345946ba1a80a827f", sha256: "7f0f6e93ef624165f33a8a8efe0dabe6fa158b9c45e0b69fc5e1062adeb5ae5e" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F35",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F35.ruling.sha256, contract: ACCEPTANCES.F35.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · inventory INCOMPLETE · 47 registry facts · demand NOT RECORDED): the subject's 2 proposed needs — CHOSEN 0, CANNOT_DECIDE 2 (an existing page covers each; KEEP needs a recorded quality measurement, ADD SECTION recorded question-level coverage) — never CREATE; its 27 existing pages — CHOSEN 17 (MERGE 17, each owner-approval-required and each carrying the NOT MEASURED duplication caveat), CANNOT_DECIDE 10. On all 27: KEEP needs a recorded quality measurement (F40 blocked); indexability signals NOT MEASURED (F21: the Link header was never recorded); LINK needs a COMPLETE inventory — every page reads 0 inbound links, and the recorded crawl links no fetched page to another (0 of 1,275 recorded edges, also 0 under a loosened path match; control: 27 of 27 page URLs map into the set).",
        proofs: "test/f35-action-decision.test.mjs — C3 FIRING CONTROL: an ESTABLISHED right-to-exist with unmeasured demand is CANNOT DECIDE naming the missing demand, never CREATE; only recorded STRONG demand (three agreeing categories, no conflict) reaches CREATE; a covered need never becomes CREATE (a recorded defect → IMPROVE; otherwise CANNOT DECIDE, never KEEP); REJECT only for a doorway-like reason; each existing-page action exactly on its own recorded evidence; contradicting actions CANNOT DECIDE with the contradiction named; every action carries its rule and evidence and is a RECOMMENDATION, the four owner-approval actions say so (pinned to literals); LINK's input counted from the recorded inbound links, absent = unknown; the entry point prints counts only, writes nothing and is REFUSED on the real declarations; no network, process, connector or paid call (firing control); hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f35-sabotage-2026-09-29.txt: 25 of 25 proved, every span pre-flighted once; F31 22/22 re-run on the changed inventory module",
        historicalReuse: "historical row 20 was DEFERRED with no code — nothing proved to reuse; the verified F31 population and completeness, F33 coverage, F34 existing-page check, F36 right-to-exist and F21 signals, and the fact registry's freshness rule, are reused unchanged as the decision's inputs",
        declaredLimit: "CREATE is unreachable on real data: no row issues a recorded V3 §5 demand outcome (missing fact: demand evidence — F14 has no public-evidence path). KEEP is unreachable: no authoritative quality measurement (F40 blocked). LINK is unreachable: the inventory is INCOMPLETE (F19 crawl on hold; freshness rule UNSET). MERGE's need is F33's headline-level need — whether the pages duplicate one intent in substance is NOT MEASURED and every MERGE says so.",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
      Object.freeze({
        kind: "REOPENED",
        featureId: "F35",
        on: "2026-09-29",
        from: "VERIFIED-PASS",
        to: "IN-PROGRESS",
        route: "VERIFIED-PASS -> IN-PROGRESS (concrete contradictory evidence: 17 real MERGE recommendations with their defining condition NOT MEASURED)",
        reason: "CONCRETE_CONTRADICTORY_EVIDENCE",
        reopenRule: "one of the owner's five reopen grounds (src/checklist/classification.mjs REOPEN_REASONS), matched word for word",
        rationale: "F35's real result chose MERGE for 17 existing pages on a shared registered value alone (F33 headline coverage), each carrying F35's own caveat that whether the pages duplicate one intent was NOT MEASURED; no semantic review was recorded (F32: 0 reviews, 351 pairs NOT_JUDGED). MERGE's authority (V3 §8) is 'Multiple pages split or duplicate one intent'; the frozen FAILURE limb [C2] 'Missing or insufficient evidence yields an action instead of CANNOT DECIDE' is met. Similarity, and a shared broad need, is a review trigger, never proof that two pages should be merged (F32, V3 G15).",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F35.ruling.sha256, contract: ACCEPTANCES.F35.contractSha256 }),
        evidenceRecord: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_F35_MERGE_CONTRADICTION_2026-09-29.md", commit: "2f010f39a98f9ab88f3b9dd2ccaf5c9e2df3773b", sha256: "1784950ea38921e45f6441312513fab59c1992a798cbba4f31c8d92195a2fddc" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-89_OWNER_DIRECTION_THEN_REPAIR_F35_MERGE.md", commit: "2d82434fcae2005a08df855e3f76fbb781a2ab49", sha256: "911761164cfc7961b83bce69d0ef10489bb3824cbe5d097132e6848a68c1578e" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F35",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "VERIFIED-PASS -> IN-PROGRESS -> VERIFIED-PASS (reopened on concrete contradictory evidence; returned on the corrected behaviour)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F35.ruling.sha256, contract: ACCEPTANCES.F35.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 2 proposed needs · 27 existing pages · inventory INCOMPLETE · 47 registry facts · demand NOT RECORDED · semantic reviews recorded 0): proposed needs CHOSEN 0, CANNOT_DECIDE 2; existing pages CHOSEN 0, CANNOT_DECIDE 27 — MERGE 0 (was 17): the 17 pages that share a registered need with another page now name the missing semantic review. Positive control on the REAL structures: one real same-need pair given a test-only review (all six aspects compared, one intent duplicated) is MERGE for exactly those two pages, owner approval required, the review carried as evidence.",
        proofs: "test/f35-action-decision.test.mjs — RR-89 FIRING CONTROL: an unreviewed shared need is CANNOT DECIDE with the review named, never MERGE or REDIRECT (a not-served page keeps FIX on its own evidence); one reviewed peer among two gives MERGE with that peer and its review only; a review counts only with all six aspects compared and one intent duplicated or split (a DISTINCT or partial review is no successor); the reader keeps only qualifying reviews and refuses a defaulted review list; REAL, both controls: no review → MERGE 0 and 17 pages name the review, one reviewed real pair → MERGE 2 — plus every earlier F35 proof (C1–C7), hand-written expectations, production trail byte-identical",
        sabotage: "runs/audit/f35-sabotage-2026-09-29.txt: 31 of 31 proved, every span pre-flighted once — incl. S21 (an unreviewed shared need turned into MERGE) and S10 (a reviewed MERGE suppressed), S26–S31 on the review rule; re-run on the changed code: F32 23/23, F36 12/12, F34 19/19, F33 18/18, F31 22/22, production trail untouched",
        historicalReuse: "the first verification's evidence stays valid for every action but MERGE and REDIRECT; F32's semantic-review shape (six aspects, V3 §14.2) is reused as MERGE's evidence rule",
        declaredLimit: "MERGE and REDIRECT are unreachable on real data until a semantic review is recorded (missing fact: a recorded semantic review — none exists, none may be bought, no new owner labels). CREATE (no recorded demand outcome), KEEP (no authoritative quality measurement; F40 blocked) and LINK (inventory INCOMPLETE; F19 on hold, freshness rule unset) stay unreachable as before.",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F36 · URL right-to-exist test. Frozen 29 Sep (_handoffs 2635153, RR-87 §4.1) ALONE. The PAGE DECISION cluster's first row.
   * Historical row 21 was DEFERRED and never proved; Gate A's part-4 reason check (judgeWhy) is reused inside the one function. */
  F36: Object.freeze({
    featureId: "F36",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F36.ruling, contractSha256: ACCEPTANCES.F36.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F36",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F36.ruling.sha256, contract: ACCEPTANCES.F36.contractSha256 }),
        branch: "rr87-f36-right-to-exist",
        baseSha: "f2944ff5622eecf2c9d3bae6bec0b1dfaefc78eb",
        baseCiRun: "36513899797",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-87_CONTINUOUS_BUILD.md", commit: "7239df5ffdfb41fea3c082a74a4169c63117a062", sha256: "28b8dc8b9b44b8c48767b0d32b5ee45182dd9f95b214ad56118fda1a002f2567" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F36",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F36.ruling.sha256, contract: ACCEPTANCES.F36.contractSha256 }),
        populations: "REAL: the subject's 2 declared candidates — both declare a specific reason (Gate A part-4 checks PASS) and both are REFUSED because an existing page of the tenant already covers their need (F33 COVERED); ESTABLISHED 0 · REFUSED 2 · CANNOT_DECIDE 0. NOT MEASURED on every outcome: whether the need is real and the value distinct in substance — no demand evidence is recorded. The page-producing census: 8 paths, ROUTED 4 through the right-to-exist gate or construction, 0 faults.",
        proofs: "test/f36-right-to-exist.test.mjs and 'F36 ·' in page-construction — ESTABLISHED only for a specific reason AND an unserved need; no / variable-only / templated / near-identical reasons REFUSED with the failure named; a missing sibling reason or no sibling CANNOT DECIDE; COVERED and IMPROVE refuse creation, F33 CANNOT DECIDE and refused information CANNOT DECIDE; a named failure outranks a missing judgement; the unmeasured residue on every outcome; the tools' gate refuses even when the existing-page check allows; construction reaches the one function and ACCEPTED holds exactly when the outcome is ESTABLISHED (part 4 keeps Gate A's specificity meaning); census firing controls; hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f36-sabotage-2026-09-29.txt: 12 of 12 proved, every span pre-flighted once; F31 22/22, F33 18/18, F34 19/19 re-run on the changed code (F34 S8 had stopped biting once part 4 also refused — F34's test now asserts its own part's state)",
        historicalReuse: "historical row 21 was DEFERRED; Gate A's part-4 reason check (judgeWhy) is reused unchanged inside the one right-to-exist function",
        declaredLimit: "whether the named need is real and the value distinct in substance is NOT MEASURED (missing fact: demand evidence — F14 has no public-evidence path); a candidate can only be ESTABLISHED where F33 can decide NOT COVERED, which needs a COMPLETE inventory (F31: the real one is INCOMPLETE)",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F21 · Robots sitemap canonical and noindex audit. Frozen 29 Sep (_handoffs 804ebd1, RR-86 §3) ALONE, before any F21 code
   * was read. Matched to historical rows 38 (Indexability Preflight, historically VERIFIED-PASS: one state per page from the same
   * signals) and 10 (never proved) only AFTER the freeze. Neither compared signals with each other — F21's core. */
  /* 🔴 F23 · Internal and external link audit. Frozen 1 Oct (_handoffs d3c8e79, RR-111 §3) — its FIRST freeze — ALONE, before any F23
   * code was read. Built under the owner's refinement (RR-111 §0): the row reports absent evidence; its real population is INCOMPLETE for
   * every declared client, so it earns IN-PROGRESS only — never a pass from an incomplete population. */
  F23: Object.freeze({
    featureId: "F23",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-10-01", ruling: ACCEPTANCES.F23.ruling, contractSha256: ACCEPTANCES.F23.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F23",
        on: "2026-10-01",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F23.ruling.sha256, contract: ACCEPTANCES.F23.contractSha256 }),
        branch: "f23-link-audit",
        baseSha: "2fb5e0128ccd9d9b9800ee47eed8e0e08a066216",
        baseCiRun: "36799713792",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-111_BUILD_F23_FROM_RECORDED_DATA.md", commit: "766a74b3d5a5a20315d07ce76294079db80503b1", sha256: "e3c24104505735ac0dfe1be5995d1d303beffa2ae9a5e6d9518b69983cb84d2d" }),
      }),
    ]),
  }),
  /* 🔴 F27 · Security and transport checks. Frozen 1 Oct (_handoffs 8a6312b, RR-111 §9) — its FIRST freeze — ALONE, before any F27
   * code; AMENDED alone (93fa696) before any code, for the row's NAME only. Built under the owner's refinement (RR-111 §0): TLS, the http:
   * redirect, headers and public exposure were never collected or declared, so it earns IN-PROGRESS only. */
  F27: Object.freeze({
    featureId: "F27",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-10-01", ruling: F27_ORIGINAL.ruling, contractSha256: F27_ORIGINAL.contractSha256 }),
      /* named EXPLICITLY since 2 Oct 2026: ACCEPTANCES.F27 now points at Amendment 2, and this 1 Oct event must keep naming Amendment 1 */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F27", on: "2026-10-01", ruling: F27_AMENDMENT_1.ruling, contractSha256: F27_AMENDMENT_1.contractSha256, amends: F27_AMENDMENT_1.amends }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F27",
        on: "2026-10-01",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F27.ruling.sha256, contract: ACCEPTANCES.F27.contractSha256 }),
        branch: "f27-security-transport",
        baseSha: "5ea5beeb18efceeab4e5e967e3b0bfea924ac432",
        baseCiRun: "36804707198",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-111_BUILD_F23_FROM_RECORDED_DATA.md", commit: "766a74b3d5a5a20315d07ce76294079db80503b1", sha256: "e3c24104505735ac0dfe1be5995d1d303beffa2ae9a5e6d9518b69983cb84d2d" }),
      }),
      /* RR-129 §3: Amendment 2, after the row's 1 Oct implementation — in date order, so that implementation stays under Amendment 1 */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F27", on: "2026-10-02", ruling: F27_AMENDMENT_2.ruling, contractSha256: F27_AMENDMENT_2.contractSha256, amends: F27_AMENDMENT_2.amends }),
    ]),
  }),
  /* 🔴 F91 · Page opportunity planning. Scope reconciled (_handoffs 24c44d0), then frozen ALONE (2048dd3, RR-113 §2) before any F91 code.
   * Three numbers, never one. On the real product number 1 is measured; numbers 2 and 3 are NOT MEASURED (no owner declaration of qualifying
   * demand states, no recorded demand outcome, no grouping rule) — so it earns IN-PROGRESS only. */
  F91: Object.freeze({
    featureId: "F91",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      /* named EXPLICITLY since 2 Oct 2026: ACCEPTANCES.F91 now points at Amendment 1, and these 1 Oct events must keep naming the original */
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-10-01", ruling: F91_ORIGINAL.ruling, contractSha256: F91_ORIGINAL.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F91",
        on: "2026-10-01",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: F91_ORIGINAL.ruling.sha256, contract: F91_ORIGINAL.contractSha256 }),
        branch: "f91-page-planner",
        baseSha: "2b0a2144397e09a360538d88dc0cec3d7db5458b",
        baseCiRun: "36808650669",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-113_CLOSE_RR-112_BUILD_THE_F91_PAGE_PLANNER.md", commit: "0e1924bf2366a635b0d58fbb492ebe5b3649f6b7", sha256: "4b035e9ce223812ebb75b25d1f298a05db914ad2b4aa65c8837652c19531264e" }),
      }),
      /* 2 Oct 2026 (RR-130 §3): Amendment 1, frozen ALONE before any F91 implementation change; F91 stays IN-PROGRESS */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F91", on: "2026-10-02", ruling: F91_AMENDMENT_1.ruling, contractSha256: F91_AMENDMENT_1.contractSha256, amends: F91_AMENDMENT_1.amends }),
      /* 4 Oct 2026 (RR-153 §3): Amendment 2, frozen ALONE after Specification Amendment 4 and before any F91 implementation was read; F91
       * owns the question-to-page-candidate connection; F91 stays IN-PROGRESS — 0 admitted real public questions, numbers 2 and 3 NOT MEASURED */
      /* dated 2026-10-03, the TRUE date (UTC and the owner's local time). RR-153 carried "4 October", which was beta-g's error; the owner ruled
       * the effective date is 3 October, recorded by an appended correction (_handoffs b91ef2a) that the register applies to the amendment's
       * record. Two earlier record runs refused this event — OCCURRED_AT_IN_FUTURE at 2026-10-04, then AUTHORITY_NOT_CURRENT_AT_EVENT before
       * the correction existed; both are on the trail. */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F91", on: "2026-10-03", ruling: F91_AMENDMENT_2.ruling, contractSha256: F91_AMENDMENT_2.contractSha256, amends: F91_AMENDMENT_2.amends }),
    ]),
  }),
  /* 🔴 F13 · Context and axis discovery. Frozen ALONE (_handoffs 0ca24d3, RR-131 §3) before any F13 code; every clause PROVED on the real
   * population (the demonstration product's own registry and its tenant's own crawl partition) and on two unrelated declared products. */
  F13: Object.freeze({
    featureId: "F13",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-10-02", ruling: F13_ORIGINAL.ruling, contractSha256: F13_ORIGINAL.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F13",
        on: "2026-10-02",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: F13_ORIGINAL.ruling.sha256, contract: F13_ORIGINAL.contractSha256 }),
        branch: "rr131-f13-axis-discovery",
        baseSha: "aab807d7ccab2ecf427d7534c6d8303473d94f8b",
        baseCiRun: "36961977049",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-131_STOP_PREPARING_FINISH_ROWS_ONE_AT_A_TIME.md", commit: "48ca85bec4ae221ac0e1af888745dcc8c2d2ccb1", sha256: "c9cf4a0b923f1acb6e2b46f80eaadd08a377f7c386254128f443e7fecf18926f" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F13",
        population: "REAL",
        on: "2026-10-02",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: F13_ORIGINAL.ruling.sha256, contract: F13_ORIGINAL.contractSha256 }),
        populations: "REAL (count-only; bound: the demonstration product's fact registry, 47 records of which 26 carry a key=value qualifier, and the 27 stored pages of the one tenant that registry is declared to — 27 readable; nothing fetched, rendered or written): 6 dimensions discovered (5 from fact qualifiers, 1 from declared page language), the declared axis EVIDENCED, 5 CANDIDATES never added; two unrelated declared test products each discover only their own axis.",
        proofs: "test/f13-context-axes.test.mjs — C1 discovered only where a record carries it, once per record, values counted never printed; C2 EVIDENCED / NOT EVIDENCED / CANDIDATE, the declaration unchanged; C3 VERIFIED apart, a served page never verified; C4 an unread registry, an empty or truncated page set and an unfetched page are NOT MEASURED, no language assigned; C5 one record suffices, no threshold in the code; C6 neutrality scanners fire on a planted product word and dimension, two products, the entry point prints keys and counts only, no network module; REAL counts cross-checked against F91's qualifier reader; production trail unchanged.",
        sabotage: "runs/audit/f13-sabotage-rr131-2026-10-02.txt: 18 of 18 proved, every span pre-flighted once, named tests confirmed GREEN before the run (RR-131 §7), every named test red by assertion (X3, X12, X15 isolated), production trail unchanged.",
        historicalReuse: "reused unchanged: F27's page reader (transportPages), F02's crawl partition and body readers, the fact registry loader, the product scope and F91's qualifier reader (as a cross-check). The historical axis-discovery runner (row 6) is NOT reused: it decides with thresholds this acceptance forbids.",
        declaredLimit: "discovery reads two evidence kinds — fact-record qualifiers and declared page language; a dimension carried by no record of either (a stage or a use case, say) is not discovered, and nothing infers one. Discovery never declares: a CANDIDATE enters page planning only if the product declares it (F91).",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F19 · Website crawler. Frozen ALONE (_handoffs 61407eb, 28 Sep 2026) before any F19 change. Every clause PROVED: the five
   * controls, dry run and owner green, robots and F02 scope on fixtures with sabotages; and the REAL population — two real live runs on two
   * UNRELATED declared sites (different subjects, tenants, origins and batch sizes), each censused count-only against every bound (RR-135). */
  F19: Object.freeze({
    featureId: "F19",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-28", ruling: F19_ORIGINAL.ruling, contractSha256: F19_ORIGINAL.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F19",
        on: "2026-10-02",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: F19_ORIGINAL.ruling.sha256, contract: F19_ORIGINAL.contractSha256 }),
        branch: "rr135-f19-generic-crawl",
        baseSha: "9cb73a27502e6a730ebb81436043948d6bed6389",
        baseCiRun: "36975155594",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-135_GENERIC_CRAWLER_DATA_CI_F19_BY_REAL_RUNS.md", commit: "fa22aa7a3ebd37400ab546ff0971aed3b715320e", sha256: "350f6fcb72e9bae0d9c3943f5ac4b4e64f2b1dbf26572937e0b011f36e38f821" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F19",
        population: "REAL",
        on: "2026-10-02",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: F19_ORIGINAL.ruling.sha256, contract: F19_ORIGINAL.contractSha256 }),
        populations: "REAL (count-only; bound: two runs, each declared before its first request at _handoffs 34fff79, each preceded by a zero-external preflight that PROVED every limb on the exact heads): run A — one declared product site, 5 seeds, 1 robots + 5 page requests, 5 × 200, pacing 5 gaps fastest 1004.3 ms 0 breaches, 0 truncations, 0 refusals, 0 redirect hops, KEPT; run B — an UNRELATED declared site (another subject, tenant and origin, on a different registered domain from run A), 3 seeds, 1 robots + 3 page requests, 3 × 200, pacing 3 gaps fastest 1012.5 ms 0 breaches, 0 truncations, 0 refusals, 0 redirect hops, KEPT; money NOT MEASURED on both (self-operated, no paid provider, U-COST-5)",
        proofs: "test/f19-crawler-bounds.test.mjs (the five controls at their limits, robots, refusals, cost, declared plan and record) · test/f19-real-append-path.test.mjs (the binary's live path, no egress: every governed append COMMITS; no green and an undeclared batch refused with 0 network calls) · test/f19-generic-crawl.test.mjs (GENERIC on two unrelated declared sites; RESUMABLE without duplicating an observation; SITE-HELD: an off-site seed and no seed refused with 0 calls, an undeclared redirect not followed; PACED HOPS on the production fetcher) · test/f19-real-run-census.test.mjs (GENERIC: the population is DISCOVERED — every committed run of the current crawler — and must span at least two tenants and two registered domains; every clause on each run, 21 tests; it names no subject, batch or site) · test/owner-authorization-gates.test.mjs (D-CRW-4)",
        sabotage: "runs/audit/f19-sabotage-rr135-2026-10-02-repointed.txt 15/15 (S5 and S8 re-pointed at the code live now: their anchors had matched 0 times since RR-108, so they were NOT RUN until RR-135) · runs/audit/f19-generic-crawl-sabotage-rr135-2026-10-02.txt 8/8 · runs/audit/f19-append-path-sabotage-rr133-2026-10-02.txt 3/3 · runs/audit/f19-real-census-controls-rr135-2026-10-02-1790960745467.txt 10/10 (each clause of the real census shown failing on a corrupted copy; the NAMED test's own failing line required — two earlier control runs, 9/10 and 0/10, are kept: their name patterns matched no test, a harness defect, not a census result) — named tests confirmed GREEN first; production trail unchanged by every harness",
        historicalReuse: "none: acceptanceRelation NEW — the 61↔89 artifact links F19 to no historical row",
        declaredLimit: "depth 0 by design: links are recorded, never followed; no rendering (renderMode RAW_HTML on every record); redirects are followed only to a declared origin, each hop paced, at most 5; a run's money is NOT MEASURED. The per-run caps (500 URLs, 200 per host) bound ONE run, never the product: a client continues batch after batch.",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F22 · JavaScript rendering audit. Frozen ALONE (_handoffs 2d20a63, RR-137 §3) before any F22 code. IN-PROGRESS only:
   * the detector, the tenant-scoped render audit and the bounded same-origin live path are built and proved on fixtures and on the offline
   * real run; every real render is PARTIAL or FAILED offline, so every real comparison is NOT MEASURED — and F22 never passes from PARTIAL
   * renders. The live run waits on its reviewed bounded request (_handoffs AlmiVisibility_RR-137_F22_LIVE_RENDER_BOUNDED_REQUEST). */
  F22: Object.freeze({
    featureId: "F22",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-10-02", ruling: F22_ORIGINAL.ruling, contractSha256: F22_ORIGINAL.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F22",
        on: "2026-10-02",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: F22_ORIGINAL.ruling.sha256, contract: F22_ORIGINAL.contractSha256 }),
        branch: "rr137-f22-render-audit",
        baseSha: "bc5ebef411063c7108ef77ec3d1f1eef9e5d9de3",
        baseCiRun: "37040949554",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-137_RESOLVE_THE_RULE_TEXT_THEN_KEEP_BUILDING.md", commit: "54934288d40f548039f1ccfb495781a9d74dba4d", sha256: "4d2763418935fdce5518c1ff54463da5037a53510f2e17a66c5e38f222ea82ba" }),
      }),
    ]),
  }),
  /* 🔴 F25 · Mobile readiness assessment. Frozen ALONE (_handoffs b56655a, RR-137 §4) before any F25 code. IN-PROGRESS only:
   * the viewport (C2) is measured on the real stored pages (8 of 8 PRESENT, device-width 8, zoom restricted 0); overflow, tap targets and
   * mobile content need COMPLETE renders, and every real render is PARTIAL or FAILED offline — NOT MEASURED. The live renders wait on
   * their reviewed bounded request (_handoffs AlmiVisibility_RR-137_F25_LIVE_RENDER_BOUNDED_REQUEST). */
  F25: Object.freeze({
    featureId: "F25",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-10-02", ruling: F25_ORIGINAL.ruling, contractSha256: F25_ORIGINAL.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F25",
        on: "2026-10-02",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: F25_ORIGINAL.ruling.sha256, contract: F25_ORIGINAL.contractSha256 }),
        branch: "rr137-f25-mobile-readiness",
        baseSha: "c780d76de8fda73282cf2f2e82d57bdb5ce0e15a",
        baseCiRun: "37071935783",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-137_RESOLVE_THE_RULE_TEXT_THEN_KEEP_BUILDING.md", commit: "54934288d40f548039f1ccfb495781a9d74dba4d", sha256: "4d2763418935fdce5518c1ff54463da5037a53510f2e17a66c5e38f222ea82ba" }),
      }),
      /* 3 Oct 2026 (RR-144 §1): Amendment 1, frozen ALONE before any F25 implementation change for it; F25 stays IN-PROGRESS here */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F25", on: "2026-10-03", ruling: F25_AMENDMENT_1.ruling, contractSha256: F25_AMENDMENT_1.contractSha256, amends: F25_AMENDMENT_1.amends }),
    ]),
  }),
  /* 🔴 F81 · Search performance and rank tracking. Frozen ALONE (_handoffs ae4834b, RR-132 §3) before any F81 code. Built on recorded data:
   * the per-client tracker (F02's partition by a row's own page origin) and the dated, device and country pull types behind the governed
   * connector, proved on the fake provider. IN-PROGRESS only: on the real population the device and country dimensions and the trend are
   * NOT MEASURED — no recorded observation carries them, and fixtures never satisfy a real-population clause. */
  F81: Object.freeze({
    featureId: "F81",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-10-02", ruling: F81_ORIGINAL.ruling, contractSha256: F81_ORIGINAL.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F81",
        on: "2026-10-02",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: F81_ORIGINAL.ruling.sha256, contract: F81_ORIGINAL.contractSha256 }),
        branch: "rr132-f81-search-performance",
        baseSha: "ce7bd8b1d2a6903b69a040571f140cc76408f461",
        baseCiRun: "36965874939",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-132_CONFIRM_33_PREPARE_F81_HONESTLY_KEEP_CLOSING_ROWS.md", commit: "d9ee137ffcf7e0eb436403db5dcb6e47b7ee05e9", sha256: "482d50d914f4fbd549940b71a4eac33931113870af6bf09dd3e0dd14455654e7" }),
      }),
    ]),
  }),
  /* 🔴 F62 · International and locale intelligence. Frozen ALONE (_handoffs a5ec9f1, RR-148 §2) before any F62 code was read or written
   * that round. Built: where a product applies, from records that STATE an outcome, decided only by F46-PROVED, F45-CURRENT, tier-1 records
   * of the exact scope, bounded to the routes in hand, handed to F16 as routes only. IN-PROGRESS only: on the real population (3 Oct
   * 2026) no declared product declares an applicability dimension or a research block, 0 of 47 active records state an outcome, and no
   * checker is declared a person — and C8 (language, cultural and search differences) has no owner-defined evidence path, so it is NOT
   * MEASURED by its own clause. Fixtures never satisfy a real-population clause. */
  F62: Object.freeze({
    featureId: "F62",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-10-03", ruling: ACCEPTANCES.F62.ruling, contractSha256: ACCEPTANCES.F62.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F62",
        on: "2026-10-03",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F62.ruling.sha256, contract: ACCEPTANCES.F62.contractSha256 }),
        branch: "rr148-f62-applicability",
        baseSha: "9ba2a954ce8360a98c2334c8a59fac58d6e381b6",
        baseCiRun: "37111226893",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-148_ONE_FEATURE_PRODUCT_APPLICABILITY.md", commit: "e10099e88e8548cbee912c34b8649b7a28996acd", sha256: "2cb7548638f583e7825f15800a2a66fe502e1f71d06a22a24a5d29eda8b9dec3" }),
      }),
    ]),
  }),
  /* 🔴 F44 · Verified fact supply. Frozen ALONE (_handoffs eecdfe4, RR-113 §9) before any F44 code. Every non-derived record carries
   * the nine recorded fields; the unit is never judged (no declared rule) and no capability claim is recorded — so IN-PROGRESS only. */
  F44: Object.freeze({
    featureId: "F44",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-10-01", ruling: ACCEPTANCES.F44.ruling, contractSha256: ACCEPTANCES.F44.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F44",
        on: "2026-10-01",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F44.ruling.sha256, contract: ACCEPTANCES.F44.contractSha256 }),
        branch: "f44-fact-supply",
        baseSha: "a09c40f6da7a5c6c42e8d2bb548cbd6da8be8c77",
        baseCiRun: "36813939064",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-113_CLOSE_RR-112_BUILD_THE_F91_PAGE_PLANNER.md", commit: "0e1924bf2366a635b0d58fbb492ebe5b3649f6b7", sha256: "4b035e9ce223812ebb75b25d1f298a05db914ad2b4aa65c8837652c19531264e" }),
      }),
    ]),
  }),
  /* 🔴 F16 · SERP and answer-surface census. Frozen ALONE (_handoffs 944f769, RR-114 §5) before any F16 code, built to RR-89 §1 (397e809).
   * The public-question intake is built; its real recorded sample is EMPTY and the census parts need result-page observations that
   * may not be harvested (RR-89 §1.3) — so IN-PROGRESS only. */
  F16: Object.freeze({
    featureId: "F16",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      /* named EXPLICITLY since 4 Oct 2026: ACCEPTANCES.F16 now points at Amendment 1, and these 1 Oct events must keep naming the original */
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-10-01", ruling: F16_ORIGINAL.ruling, contractSha256: F16_ORIGINAL.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F16",
        on: "2026-10-01",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: F16_ORIGINAL.ruling.sha256, contract: F16_ORIGINAL.contractSha256 }),
        branch: "f16-public-question-intake",
        baseSha: "997e54eaa85a374ef4220c61605116115af85374",
        baseCiRun: "36816375768",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-114_BUILD_THE_PUBLIC_QUESTION_RESEARCH_INTAKE.md", commit: "72f260b1bd52343a8b07c6bf4d013684f2402d91", sha256: "d43bf7a066d697f48c3f50f7158196d15edbe640df0f19c60d22b1c78ca264ce" }),
      }),
      /* RR-155 §1: F16's own Acceptance Amendment 1 (_handoffs 45a1cbf), frozen ALONE — collection added as a separate, separately-gated limb */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F16", on: "2026-10-04", ruling: F16_AMENDMENT_1.ruling, contractSha256: F16_AMENDMENT_1.contractSha256, amends: F16_AMENDMENT_1.amends }),
      /* RR-157: F16's own Acceptance Amendment 2 (_handoffs 2a842c1), frozen ALONE — meaning on the original post (C15); question source is not answer source (C16) */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F16", on: "2026-10-04", ruling: F16_AMENDMENT_2.ruling, contractSha256: F16_AMENDMENT_2.contractSha256, amends: F16_AMENDMENT_2.amends }),
      /* RR-159: F16's own Acceptance Amendment 3 (_handoffs 1e48cb8), frozen ALONE — the client's own AI connection under an owner provider record (C17–C24) */
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F16", on: "2026-10-04", ruling: F16_AMENDMENT_3.ruling, contractSha256: F16_AMENDMENT_3.contractSha256, amends: F16_AMENDMENT_3.amends }),
    ]),
  }),
  F21: Object.freeze({
    featureId: "F21",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F21.ruling, contractSha256: ACCEPTANCES.F21.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F21",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F21.ruling.sha256, contract: ACCEPTANCES.F21.contractSha256 }),
        branch: "rr86-f21-indexability-signals",
        baseSha: "acbc781893587ae062b372b1a95704146fd3c707",
        baseCiRun: "36509172899",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-86_NEXT_ALMIVISIBILITY_FEATURE.md", commit: "70285e19b33b72ecf6eeb362d28841dd28f7af0c", sha256: "32554fba7612f123decff855c2c9fe28eb9df6f27f71a7eb7ab7dabdd07465b0" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F21",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F21.ruling.sha256, contract: ACCEPTANCES.F21.contractSha256 }),
        populations: "REAL: the declared client's 20,016 in-scope URLs (27 observed with stored bodies, 20,000 listed in its stored sitemap) and its one recorded robots.txt: CONTRADICTED 0 · CONSISTENT 0 · NOT_MEASURED 20,016. K1 judged for every listed URL (0 listed and disallowed). No real URL can be CONSISTENT because the collector never recorded the Link header, so a header canonical can be neither seen nor ruled out.",
        proofs: "test/f21-indexability-signals.test.mjs — C1 each signal from its own source (robots group rules, 4xx/5xx, recorded X-Robots-Tag, every canonical tag, 'not listed' only over a fully stored sitemap); C2 K1–K6 each exposed with HAND-WRITTEN expectations; C3 agreeing signals never reported, one URL per spelling; C4 three states, every unknown path NOT_MEASURED; C5 same client only, robots rows attributed through declared origins, and the entry point refused against the real declarations; C6 bound, identities and sources, never a URL; C7 32 modules, 0 call-out paths; production trail byte-identical across every suite run",
        sabotage: "runs/audit/f21-sabotage-2026-09-29.txt: 20 of 20 proved, every span pre-flighted exactly once in the live code; the first run caught one test that could not fail (S14) — fixed before any movement",
        historicalReuse: "row 38 (Indexability Preflight) read the same signals per page — its parsers (parseHead, noindexState) and the robots group matcher are reused; neither row 38 nor row 10 compared signals with each other",
        declaredLimit: "the recorded collector kept no Link header, so no real URL can be CONSISTENT; page-level signals of URLs never observed are UNKNOWN; the entry point reads the shared robots store and is refused for any client the shared evidence store is not declared to",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F31 · Existing page inventory. Frozen 29 Sep (_handoffs 3a8f7ba, RR-85 §2) ALONE, before any F31 code was read. Matched to
   * historical row 11 ("Existing Page Inventory", historically VERIFIED-PASS) only AFTER the freeze: that row proved stable identity
   * across two local replays; it proves part of C1 and C2 only. The client's page list is INCOMPLETE and says so — F31 moves on the
   * inventory and its verdict being PROVED CORRECT, never on a completeness the recorded data cannot support. */
  F31: Object.freeze({
    featureId: "F31",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F31.ruling, contractSha256: ACCEPTANCES.F31.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F31",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F31.ruling.sha256, contract: ACCEPTANCES.F31.contractSha256 }),
        branch: "rr85-f31-inventory",
        baseSha: "8c37c695f3e79cd24a84c7ce93634679e9b42fbc",
        baseCiRun: "36505203525",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-85_F31_VERIFY_THE_EXISTING_PAGE_INVENTORY.md", commit: "5774427dbefaddcf8ddedc39f2fb131bf156a1d8", sha256: "24f7ac224d28dd165e0363f0a865c454d81878ef9b45df296e68f3b61c5cef83" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F31",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F31.ruling.sha256, contract: ACCEPTANCES.F31.contractSha256 }),
        populations: "REAL: the declared client's partition of the recorded batch — 27 known pages, 0 identity conflicts, 27/27 fingerprints verified against stored bytes, 27/27 served states observed, all owned by its tenant; 4 batch members placed in no tenant, counted. REAL VERDICT: INCOMPLETE (method RECORDED_SITEMAPS_AND_LINKS, 1 declared origin, as of 2026-09-12T00:44:54Z, NO freshness rule declared): its recorded sitemap lists 240,328 URLs (20,000 stored, 19,989 of those unobserved), and its observed pages link to 368 in-scope URLs never observed.",
        proofs: "test/f31-inventory.test.mjs — C1 identity on the real 27 plus planted conflicts; C2 real fingerprints verified, changed bytes caught, none invented; C3 UNKNOWN when unanswered; C4 real ownership, a second-tenant world, and only the client's own 1,275 of 19,730 links read; C5 evidence per attribute; C6 the real verdict with its basis, every state (COMPLETE, INCOMPLETE ×7 gaps, UNKNOWN ×3, OUT OF SCOPE, STALE) distinct and named, the declared freshness rule read, the verdict recorded once; C7 5.1 INCOMPLETE, UNKNOWN, STALE and OUT OF SCOPE hold an unrelated new page, 5.2 a COMPLETE inventory lets F33 decide NOT COVERED and still blocks a covering page; C8 23 modules, 0 call-out paths; production trail byte-identical across every suite run",
        sabotage: "runs/audit/f31-sabotage-2026-09-29.txt: 22 of 22 proved, every span pre-flighted exactly once in the live code, residue 0; F33 18 of 18 and F34 19 of 19 re-run on the changed code",
        reading: "F31 moves on its inventory and its completeness verdict being PROVED CORRECT on the real data; the real verdict is INCOMPLETE and is recorded as such. No COMPLETE was manufactured; F33 and F34 still hold new pages for this client.",
        blocker: "to make the real list COMPLETE the recorded data lacks: a served state for every in-scope URL the client's own sitemap lists (240,328; 20,000 stored, 11 observed) and every URL its pages link to (368) — no recorded source can supply it; it needs a new collection (F19's second crawl, ON HOLD for the owner's GREEN) — and a freshness rule declared for the client's scope (an owner decision; none is declared)",
        historicalReuse: "historical row 11 (Existing Page Inventory) proved identity stable across two local replays — part of C1 and C2; everything else proved fresh",
        declaredLimit: "COMPLETE means complete as discoverable by the client's recorded sitemaps and links, as of the earliest evidence; a page no recorded source lists or links cannot be claimed; the freshness window counts from that as-of time",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F32 · Duplicate thin and template detection. Frozen 29 Sep (_handoffs a0b9776, RR-87) ALONE, before any F32 code was read.
   * Matched to historical row 12 ("Duplicate / Thin / Template Detection", historically VERIFIED-PASS) only AFTER the freeze. The
   * reconciliation labels it SAME; clause by clause it is CHANGED: row 12 rejects on a 0.9 near-duplicate score, a 350-word floor and a
   * 75% template share, which V3 §13–§14 replace with a 40% review trigger, no length floor and no invented threshold. The legacy audit
   * checks are untouched; their body extraction and shingle method are reused. The PAGE DECISION cluster's third row. */
  F32: Object.freeze({
    featureId: "F32",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F32.ruling, contractSha256: ACCEPTANCES.F32.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F32",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F32.ruling.sha256, contract: ACCEPTANCES.F32.contractSha256 }),
        branch: "rr87-f32-duplicate-thin-template",
        baseSha: "8a282b7a7d23cef1c43bddbd8ad6ea2e6e99579d",
        baseCiRun: "36523359240",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-87_CONTINUOUS_BUILD.md", commit: "7239df5ffdfb41fea3c082a74a4169c63117a062", sha256: "28b8dc8b9b44b8c48767b0d32b5ee45182dd9f95b214ad56118fda1a002f2567" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F32",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F32.ruling.sha256, contract: ACCEPTANCES.F32.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 27 pages · 27 measured, every body verified by its own fingerprint · 351 sibling pairs · semantic reviews recorded 0 · unique-value records 0 · no paid or metered call): exact duplicates 0 (0 groups); textual overlap REVIEW_REQUIRED 220 · BELOW_TRIGGER 131 of 351 pairs (Jaccard of 8-word main-text shingles, median 0.456, range 0.104–0.840); semantic duplication NOT_JUDGED on all 351 pairs; shared-shell share measured on all 27 (range 0.341–0.903, median 0.789), SHELL_ONLY 0; unique value NOT_JUDGED on all 27.",
        proofs: "test/f32-duplication.test.mjs — identical main text grouped whatever the chrome and case, one changed word ungroups, an unreadable body NOT MEASURED; C2 FIRING CONTROL: exactly 40 percent (2/5) is below the trigger, 3/7 is REVIEW REQUIRED, and neither becomes a semantic, exact or unique-value verdict; a recorded review decides, low overlap cannot rescue a reviewed duplicate, high overlap passes only with documented distinct value, a review missing an aspect does not count; shell share by recurrence (3/13 hand-counted), nav-only SHELL ONLY, a 97%-shell page with one unique shingle is not SHELL ONLY (no invented threshold); C5 FIRING CONTROL: a three-word unique page is NOT insufficient, only exact duplicate, SHELL ONLY or a recorded record decides; no action field in the result, the legacy thresholds unchanged and unread; an unverified body NOT MEASURED, verification by the body's OWN fingerprint; the entry point prints counts and its bound and writes nothing; no network, process, connector or paid call (firing control); hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f32-sabotage-2026-09-29.txt: 23 of 23 proved, every span pre-flighted once; F31 22/22 re-run on the changed population module",
        historicalReuse: "historical row 12 (VERIFIED-PASS, 394 bodies of the whole batch) is CHANGED against every clause but exact duplication (which it judged on whole-response bytes, not the main text): its 0.9 near-duplicate verdict, 350-word thin floor and 75% template threshold are what V3 §13–§14 replace. Reused unchanged: shell.mjs body extraction, words, 8-word shingles and Jaccard; F31's population and body verification. The legacy audit checks and Row 25's gate are untouched.",
        declaredLimit: "semantic duplication and unique value are NOT JUDGED on real data (missing fact: a recorded semantic review or information-gain record — none exists, none may be bought, no new owner labels); 220 of 351 real pairs are flagged for that review and remain unreviewed. Shared shell is measured within the client's 27 recorded pages only (the inventory is INCOMPLETE).",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F33 · Cannibalization prevention. Frozen 29 Sep (_handoffs 9dc9bc2, RR-84 §2) ALONE, before any F33 code was read. Matched to
   * historical row 13 ("Cannibalization Prevention", historically VERIFIED-PASS) only AFTER the freeze: that row detected and
   * reported EXISTING-vs-EXISTING competition in query×page data and DEFERRED exactly F33's core ("where a suitable existing URL
   * already serves the same intent → default CREATE is not allowed"). It proves none of F33's current clauses; it imports nothing. */
  F33: Object.freeze({
    featureId: "F33",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F33.ruling, contractSha256: ACCEPTANCES.F33.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F33",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F33.ruling.sha256, contract: ACCEPTANCES.F33.contractSha256 }),
        branch: "rr84-f33-cannibalization",
        baseSha: "a673e100199bb81e4e62e01efd8914917f9139d5",
        baseCiRun: "36501632527",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-84_CLOSE_180_THEN_F33.md", commit: "d055c1bc94663f66b9bbf12bae18bb3c0e56fdee", sha256: "3bf51f43b28d97e1f152179af7a69428e8f0fe824ec6719186924430d09f1312" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F33",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F33.ruling.sha256, contract: ACCEPTANCES.F33.contractSha256 }),
        populations: "REAL: the subject's registered page structure (12 declared values) and the 27 existing pages of its tenant (coverage UNKNOWN), count-only. COVERED: both real declared specs, each by a real page whose headline names its need only. NOT COVERED: shown for the 2 registered values no real page covers, over their real DIFFERENT pages with the population set COMPLETE by the test (stated). The real record as it is: those 2 values are CANNOT DECIDE — 1 real page names no registered need and the population is not recorded COMPLETE.",
        proofs: "test/f33-need-coverage.test.mjs — C1 F34's refusals first, F33 never judges refused information; C2 COVERED on real specs, the same need in different words for 10 of 12 registered values; C3 NOT COVERED on real DIFFERENT pages, never over a population not COMPLETE nor with an undecidable page; C4 every undecidable world; C5 one REFUSAL or one EVALUATION per decision with per-page evidence counts, and end to end through bin/build-page on a confined store; C6 the one routed check reaches F33 for every page; C7 8 modules, 0 call-out paths, with a firing control; F34's proofs re-run on the changed code; production trail byte-identical across every suite run",
        sabotage: "runs/audit/f33-sabotage-2026-09-29.txt: 18 of 18 proved, residue 0; F34 re-run on the changed code runs/audit/f34-sabotage-2026-09-29.txt: 19 of 19 (S4, S5, S7 re-pointed to the code that now carries them)",
        matcher: "FREE, local, deterministic: the subject's registered values read against each existing page's served headline and body, with a fixed suffix list and a 5-letter prefix rule for different wording. No model, no embedding, no metered or paid call (RR-84 §5).",
        historicalReuse: "historical row 13 (Cannibalization Prevention) detected existing-vs-existing query overlap; it compares no candidate with existing pages and proves none of F33's current clauses; not reused",
        declaredLimit: "a synonym that shares no stem with a registered value is not recognised, and two registered values are measured limits (a practitioner name unrelated to the field's name; a two-word field whose practitioner name does not repeat both words) — each can only yield CANNOT DECIDE, never a new page; a page naming no registered need can never be ruled out, so one such page holds every uncovered candidate; NOT COVERED needs a population recorded COMPLETE, which the stored crawl is not",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F34 · No blind regeneration. Frozen 28 Sep (_handoffs 53f74b4, RR-83 §2) ALONE, before any F34 code was read. Matched to
   * historical row 14 ("No Blind Regeneration", historically VERIFIED-PASS) only AFTER the freeze: that row proved no product-repo
   * write, no publish, no bulk generation, registered writers and a stable page_id — and DEFERRED exactly F34's core ("an unchanged
   * existing page rediscovered → KEEP; automatic recreate or overwrite forbidden"). The historical PASS imports nothing. */
  F34: Object.freeze({
    featureId: "F34",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-28", ruling: ACCEPTANCES.F34.ruling, contractSha256: ACCEPTANCES.F34.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F34",
        on: "2026-09-28",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F34.ruling.sha256, contract: ACCEPTANCES.F34.contractSha256 }),
        branch: "rr83-f34-no-blind-regeneration",
        baseSha: "2f15c5bd475b87c9b115b89d4cb2ae18faf94dc5",
        baseCiRun: "36494244386",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-83_F34_REUSE_AND_COMPLETE.md", commit: "6104f677695bd83e4dd4c61e0e140cc004667542", sha256: "d4449a8161ddda3d675c08b21f7a0354512d5231d8402fed6caa4ca5711a8286" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F34",
        population: "REAL",
        on: "2026-09-28",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F34.ruling.sha256, contract: ACCEPTANCES.F34.contractSha256 }),
        populations: "REAL: the subject that declares page specs resolves lawfully to one tenant, whose partition of the stored observation batch holds 27 existing pages (coverage UNKNOWN — the batch's run records are not in the tenant's partition, and the run's COMPLETE was corrected to PARTIAL); both real declared page specs are stopped (MONITOR), each naming existing pages. The page-producing census over 338 committed modules outside test/ plus the 7-entry page-writer register: 8 paths — 1 CHECKS, 4 ROUTED, 3 NOT_PAGE_PRODUCTION, 0 unclassified, 0 faults.",
        proofs: "C1/C2/C4 through constructCandidates on a family Gate A otherwise ACCEPTS (test/page-construction.test.mjs, F34 ·); C1–C6 in test/f34-no-blind-regeneration.test.mjs — missing, malformed and foreign populations REFUSED; same need in different words MONITOR naming the page; empty COMPLETE the only way through (control); unknown quality protected, recorded defect → IMPROVE; the real runner end to end in a declared world on a confined store: 2 candidates, 2 recorded decisions, nothing written; census with firing controls; no product-repository write, publish or bulk path, with firing controls; real population count-only; production trail byte-identical across every suite run",
        sabotage: "runs/audit/f34-sabotage-2026-09-28.txt: 19 of 19 proved (C1 ×4, C2 ×3, C3 ×3, C4, C5 ×3, C6 ×4, coverage correction), residue 0, production trail untouched",
        historicalReuse: "historical row 14 (No Blind Regeneration) re-run fresh for C3 — no product-repository write, no publish, no bulk generation, a rediscovered URL keeps its page_id; its deferred half (KEEP; no recreate or overwrite) was never built and is F34's new code",
        declaredLimit: "same-need detection in other words is F33's and does not exist: while any existing page of the tenant exists, a candidate is never produced (MONITOR naming every existing page), so different wording can change what is named first, never whether a page is produced; no page-quality measurement is authoritative (F40 BLOCKED), so no existing page is presumed bad; the census is a source check and cannot see a dynamic import or a renderer copied rather than imported; no live fetch or metered call in any proof",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F77 · Idempotency retry and rollback safety. Frozen 28 Sep (_handoffs 7042c77, RR-81) BEFORE its code was read; the first
   * verdict FAILED under that contract (limb map 84f26b9, outcomes 7ee7799, RR-81 result 4b0accd) and stays on the record as it is.
   * Amended by the owner's ruling RR-82 §2 (a726cc3 → Amendment 1, b443e5e): a retry is the same operation identity; a fresh
   * authorised collection is a new operation; the PAID call paths leave the current scope and stand NOT MEASURED, with a checkable
   * reopening trigger (config/fboard/deferred-limbs.mjs). Scope narrowed, bar unchanged. */
  F77: Object.freeze({
    featureId: "F77",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-28", ruling: F77_ORIGINAL.ruling, contractSha256: F77_ORIGINAL.contractSha256 }),
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F77", on: "2026-09-28", ruling: ACCEPTANCES.F77.ruling, contractSha256: ACCEPTANCES.F77.contractSha256, amends: ACCEPTANCES.F77.amends }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F77",
        on: "2026-09-28",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F77.ruling.sha256, contract: ACCEPTANCES.F77.contractSha256 }),
        branch: "rr82-f77-amendment-1",
        baseSha: "76a443609d66d7f7b7ede40bf870e70aa01e5a92",
        baseCiRun: "36488822047",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-82_F77_POST_MERGE_CLOSEOUT.md", commit: "f81e3b4c13440d8bebe5ad15f42c0f4a030f7612", sha256: "aa3f5d752ff74420d81d7c04ed5f5b56f721da805b6690f20727394da4da5f93" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F77",
        population: "REAL",
        on: "2026-09-28",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_LIMB_OF_THE_AMENDED_CURRENT_SCOPE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F77.ruling.sha256, contract: ACCEPTANCES.F77.contractSha256 }),
        scope: "the existing governed writes and the real metered Search Console path. Today's F77 verdict does not cover any paid provider or any paid call path: that limb is NOT MEASURED, and no F77 verdict is proof about a paid provider.",
        populations: "REAL: every governed writer routes through the one boundary (governed-caller census: 66 entry points, 47 state-changing, 46 routed, 1 audit-store exemption, 0 bypassing); the production ingest's metered call sequence (8 calls per operation); the paid and metered call-path census over 249 committed production files (bound 2000): 1 egress, 1 metered kind, 0 real paid providers",
        proofs: "R1b/R3 test/f77-idempotency-retry-recovery.test.mjs — 8 parallel identical governed writes: 1 COMMITTED + 7 ALREADY_COMMITTED, chain whole; 8 distinct appends all land, 8 identical land once; R6 a retry in a later second appends nothing; R4 recovery 1,0,0; R5 census. R2 test/f77-metered-retry.test.mjs — interrupted 3 + retry 5 = 8 (no reissue), uncertain call refused, retry after commit 0 asked 0 saved, fresh collection 8 asked 9 new sightings, end to end through the entry point's synthetic seam; R2P trigger fails on a planted real paid provider",
        sabotage: "runs/audit/f77-sabotage-2026-09-28.txt: 17 of 17 proved (M1, M2 ×4, M4 ×3, M5, R2 ×7, R2P), residue 0, production trail untouched",
        earlierVerdict: "FAILED under the original contract (_handoffs 7ee7799) — preserved as it is",
        declaredLimit: "paid call paths NOT MEASURED (reopened by the first real paid provider, checked by tools/paid-metered-call-census.mjs); the cross-process lock bound is 30000 ms and fails closed; a retry refuses an uncertain metered call rather than reissue it; live Search Console never called in any proof",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F39 · Original information gain. Frozen 29 Sep (_handoffs 90e798d, RR-90 §2) ALONE, before any F39 code was read. Matched to
   * historical row 24 ("Original Information Gain") only AFTER the freeze: DEFERRED (class D), never proved, no code — nothing to reuse.
   * F32's shared-shell, duplication and semantic-review measures, F31's verified bodies and F36's gate are reused as its inputs. */
  F39: Object.freeze({
    featureId: "F39",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F39.ruling, contractSha256: ACCEPTANCES.F39.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F39",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F39.ruling.sha256, contract: ACCEPTANCES.F39.contractSha256 }),
        branch: "rr90-f39-information-gain",
        baseSha: "5846e8f4d3bab932ddecca82a3c3aadf2e0272d6",
        baseCiRun: "36530852937",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-90_F39_NEXT_STANDALONE_FEATURE.md", commit: "56f53924fcb2a82c9a9874c4c6bbe9a1907281f0", sha256: "315d86cc26e06a715edb29a258f7f997883e635f3dab7b89c3c0c8d58ecadb58" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F39",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F39.ruling.sha256, contract: ACCEPTANCES.F39.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 27 pages · information-gain records 0 · competitor comparisons 0 · semantic reviews 0 · nothing collected): CANNOT_DECIDE 27, ESTABLISHED 0, REFUSED 0 — shared templates NOT_MEASURED 27 (every page has text outside the shared shell; whether it is useful value needs a recorded gain record), current pages NOT_MEASURED 27 (no sibling pair reviewed), competitors NOT_MEASURED 27 (no recorded competitor comparison). THE CHECKER IS NOT THE VERDICT: no real page is reported as having information gain, and none as lacking it. The page-production census: 8 paths, CHECKS 1, ROUTED 4, 0 faults, F39 on every accepting path.",
        proofs: "test/f39-information-gain.test.mjs — every page carries three baseline verdicts with evidence or missing fact; C2 FIRING CONTROL: all baselines otherwise clear but no recorded gain record is CANNOT DECIDE, a declared intention or malformed record is no record; SHELL ONLY, an exact duplicate (also under a different nav), a reviewed duplicate and a recorded no-gain comparison each refuse on their own baseline; no recorded comparison, or one naming no competitor, is NOT MEASURED; C5 FIRING CONTROL: unmeasured never becomes a verdict, every missing fact named; the gate produces nothing unless gain is ESTABLISHED and the census fires when F39 is removed from construction; an unverified body measures nothing; evidence passed explicitly; the entry point prints counts and its bound and never PASS. test/page-construction.test.mjs — ACCEPTED exactly when right-to-exist AND information gain are ESTABLISHED (non-vacuous), no gain evidence or no competitor comparison refuses, a population without verified bodies is never 'no other current page'. Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f39-sabotage-2026-09-29.txt: 22 of 22 proved, every span pre-flighted once (S15 first stayed GREEN: F32's own guard masked F39's — the test now isolates F39's guard). Re-run on the changed code: F36 12/12, F34 19/19 (F36 S9 and F34 S10 re-pointed — F39 rewrote their lines; F36 S10 had been masked by F39's new part — its test now isolates part 4), F33 18/18, F31 22/22, F32 23/23, F35 31/31",
        historicalReuse: "historical row 24 was DEFERRED with no code — nothing proved to reuse. Reused unchanged as inputs: F32's shared shell, exact duplication and semantic-review shape; F31's verified bodies; F36's gate. Gate A's adaptive rule C is not an information-gain measure.",
        declaredLimit: "information gain is NOT MEASURED on every real page (missing facts: a recorded information-gain record, recorded semantic reviews of sibling pairs, and a recorded competitor-supply comparison — no store of any exists; none may be collected, bought or labelled). As a consequence no candidate can be ACCEPTED by construction or written by a subject tool until such records exist — by design, the frozen C6.",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F41 · Content brief engine. Frozen 29 Sep (_handoffs 454396e, RR-87 continuous build per RR-90's override) ALONE, before any F41
   * code existed. Matched to historical row 34 ("Content Brief Engine") only AFTER the freeze: DEFERRED (class D),
   * never proved, no code — its four parts are the owner's own words and are the PROVENANCE of the eleven sections, nothing more. */
  F41: Object.freeze({
    featureId: "F41",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F41.ruling, contractSha256: ACCEPTANCES.F41.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F41",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F41.ruling.sha256, contract: ACCEPTANCES.F41.contractSha256 }),
        branch: "rr90-f41-next",
        baseSha: "64e21ae4abc81371a4bb6c229b99ecc3ab6043b0",
        baseCiRun: "36540475129",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-87_CONTINUOUS_BUILD.md", commit: "7239df5ffdfb41fea3c082a74a4169c63117a062", sha256: "28b8dc8b9b44b8c48767b0d32b5ee45182dd9f95b214ad56118fda1a002f2567" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F41",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F41.ruling.sha256, contract: ACCEPTANCES.F41.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 29 subjects (2 proposed needs, 27 existing pages) · owner approvals 0 · semantic reviews 0 · 47 registry facts · inventory INCOMPLETE · nothing collected): NOT_ISSUED 29 — F35 chose no action for any subject and no owner approval is recorded. Control on the REAL structures: one real same-need pair given a TEST-ONLY review and one real page a TEST-ONLY approval gives exactly one brief, INCOMPLETE: intent (from F33) and acceptance criteria FILLED; 9 sections MISSING, each named (that page carries no VERIFIED registry fact). No brief is READY; nothing is reported as a finished brief.",
        proofs: "test/f41-content-brief.test.mjs — C1 FIRING CONTROL: no recorded approval is NOT ISSUED with the approval named; an approval of another action, another subject or without a ref is no approval; CANNOT DECIDE is NOT ISSUED for want of an action; approvals passed explicitly. Every one of the eleven sections FILLED only from recorded evidence with rule and identities, and removing each input makes exactly its own section MISSING; an unreferenced input fills nothing; links need a COMPLETE inventory. Only VERIFIED, sourced, fresh facts enter, every other excluded and named. C4 FIRING CONTROL: one missing section makes INCOMPLETE, never READY, every missing section named. No length or word field anywhere; competitor evidence only a diagnostic; F41 writes and renders nothing. REAL and its control; the entry point prints counts and its bound and writes nothing; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f41-sabotage-2026-09-29.txt: 18 of 18 proved, every span pre-flighted once. F41 changed no shared module, so no other row's harness was affected",
        historicalReuse: "historical row 34 was DEFERRED with no code — nothing proved to reuse; its four parts (the owner's words) are the provenance of the section list. Reused unchanged as inputs: F35's decisions, F33's coverage, F31's inventory and completeness, the fact registry's lifecycle",
        declaredLimit: "no brief can be issued on real data until an owner approval of a chosen action is recorded (none is; none may be requested). Nine of eleven sections have no recorded source today — entities, questions (F10 held), locale terms, CTA, schema, prohibited claims, unique value (F39: no gain record), verified facts on pages without registry facts, internal links (inventory INCOMPLETE). Facts are included only when USABLE or FRESH — stricter than the frozen 'not STALE'.",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F43 · Content decay refresh and pruning. Frozen 29 Sep (_handoffs 6c7627a, RR-91 §2 and its resumption) ALONE, before any F43
   * code existed. Matched to historical row 33 ("Content Decay & Pruning") only AFTER the freeze: DEFERRED (class D), never proved, no
   * code — its four parts are the owner's own words and the provenance of "a pruning path that works". F43 supplies F35's
   * post-publication and removal evidence from recorded performance only; AGE IS NOT MEASURED WHERE IT IS NOT RECORDED. */
  F43: Object.freeze({
    featureId: "F43",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F43.ruling, contractSha256: ACCEPTANCES.F43.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F43",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F43.ruling.sha256, contract: ACCEPTANCES.F43.contractSha256 }),
        branch: "rr91-f43-decay",
        baseSha: "5b94e87b387c8f6538bcece7463d7b7184d6488f",
        baseCiRun: "36599624495",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-91_CLOSE_188_189_THEN_F43.md", commit: "ac623af9508538716f3c2e4d94927bef4e76e926", sha256: "5642001ccdc2dedd353a049d7822f8242b4752e861187a2a65bcc98fc4ffedf1" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F43",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F43.ruling.sha256, contract: ACCEPTANCES.F43.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 27 pages · performance window 2026-08-15..2026-09-12 covering 27 of 27 pages (1,525 rows; 103 attributed to this client by declared host) · publication dates 0 · improvements 0 · re-measurements 0 · indexing checks 0 · inventory INCOMPLETE · nothing collected): evaluation NOT_MEASURED 27, result UNKNOWN 27, world NOT_MEASURED 27 — every page names its missing publication date (age is never inferred) and its missing technical state (F21 not measured). No contraction evidence is supplied; nothing is presented as a result. Control on the REAL structures: one real page given TEST-ONLY records (publication date, indexing check, one improvement, one re-measurement) reaches FALLBACK_REVIEW on the REAL recorded window and an F35 NOINDEX recommendation (owner approval required) — only that page.",
        proofs: "test/f43-content-decay.test.mjs — one evaluation state per page by V3 §17.1 (BLOCKED first, TOO_EARLY, EVALUABLE at 100 impressions, FALLBACK_REVIEW at day 90, the 28–90-day gap NOT MEASURED, an unknown technical state not clear); C6 FIRING CONTROL: no recorded publication date is never 'old enough' (5,000 impressions stay NOT MEASURED) nor 'too new', supplies no removal, and an uncovered page is never zero; WEAK only at the fallback review, and WEAK alone supplies no removal or noindex; C3 FIRING CONTROL: no improvement → IMPROVE ONCE with no noindex evidence, a re-measurement under 28 days after or overlapping the improvement does not count, still-weak → NOINDEX evidence, recovered → none; removal only with all three recorded facts, and FIX + REMOVE is CANNOT DECIDE, never a deletion; the pruning path through F35 reaches NOINDEX and REMOVE, each owner-approval; REAL and its control; the entry point prints counts and its bound and writes nothing; evidence passed explicitly; no network, process, connector or paid call (firing control). Hand-written ages; production trail byte-identical",
        sabotage: "runs/audit/f43-sabotage-2026-09-29.txt: 19 of 19 proved, every span pre-flighted once. Re-run on the changed code: F35 31/31, F41 18/18. Not sabotaged, with reasons (parked): an uncovered page read as zero, and the removal hand-off in F35's reader — no real page is uncovered or not served, both proved at the unit level; the declared-host partition — rows of another tenant never map to this client's page ids",
        historicalReuse: "historical row 33 was DEFERRED with no code — nothing proved to reuse; its four parts (the owner's words) are the provenance of the pruning path. Reused unchanged: the recorded Search Console page rows and the declared-host partition (as F21 reads its store), F31's inventory, F21's signals, F33's peers, F35's NOINDEX and REMOVE rules",
        declaredLimit: "on real data no page can be evaluated: no publication date is recorded (age is never inferred), and F21's technical state is NOT MEASURED; a recorded indexing check can stand in only where F21 cannot decide. No improvement or re-measurement is recorded, so the weak-result cycle has not started for any page. The recorded window's impressions (2–4 per page) are real and used; they decide nothing until age is recorded.",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F82 · Real indexation learning. Frozen 29 Sep (_handoffs 25c7f49, RR-92 §3.1) ALONE, before any F82 code existed. CHOSEN by a
   * count-only measurement of held facts (_handoffs 16a0db8): it supplies, from OWNED Search Console evidence already recorded for all
   * 27 pages, the discovered-and-crawled fact V3 §17.1 requires and F43 lacked. Historical row 39 (DEFERRED) is provenance only; row 38
   * (Indexability Preflight) survives as F21, which F82 reports beside — never as — the index state. */
  F82: Object.freeze({
    featureId: "F82",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F82.ruling, contractSha256: ACCEPTANCES.F82.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F82",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F82.ruling.sha256, contract: ACCEPTANCES.F82.contractSha256 }),
        branch: "rr92-f82-indexation",
        baseSha: "805de675900f35c836032bd1e7d72dd2944ecdd1",
        baseCiRun: "36610858772",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-92_CONTINUE_THE_STANDALONE_PRODUCT.md", commit: "6bbfdd2f1d2decdd2796678908b2e0287304cca3", sha256: "6af57fae16dbc67e4420507a7cd7c0b28dda360a6eaa0def07ea00fe94f18230" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F82",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F82.ruling.sha256, contract: ACCEPTANCES.F82.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · OWNED Search Console evidence · 27 pages · window 2026-08-15..2026-09-12 · inspections 0 · no inspection request, no live call): OBSERVED_INDEXED 27 (each dated to the window, each with its source observation), OBSERVED_NOT_INDEXED 0 (no inspection recorded), UNKNOWN 0; indexability (F21) NOT_MEASURED 27, reported beside and never as the index state; queries NOT_OBSERVED 27 (no recorded owned query-page row maps to these pages — never zero). Supplied to F43: 27 indexing checks; F43's missing technical fact goes from 27 pages to 0, and its missing age (no publication date recorded) stays visible on all 27.",
        proofs: "test/f82-indexation.test.mjs — one state per page (OBSERVED_INDEXED only with a recorded impression, OBSERVED_NOT_INDEXED only from a recorded inspection with a ref, the most recent dated observation decides); C2 FIRING CONTROL: absence or zero impressions is UNKNOWN, never 'not indexed', and an indexable page with no observation is UNKNOWN, never indexed; INDEXABLE ≠ INDEXED on every state; every observed state dated, no prediction or promise; OWNED_SEARCH_CONSOLE label, no demand/public/category field, unrecorded queries NOT OBSERVED never zero; CLEAR only for OBSERVED_INDEXED, BLOCKED only for OBSERVED_NOT_INDEXED, nothing for UNKNOWN; REAL, including F43 before/after; the entry point prints counts, its bound and the notice and writes nothing; inspections passed explicitly; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f82-sabotage-2026-09-29.txt: 16 of 16 proved, every span pre-flighted once. Re-run on the changed entry points: F43, F35 and F41 in full. Not sabotaged (parked): the declared-host partition — another client's rows never map to this client's pages",
        historicalReuse: "historical row 39 was DEFERRED with no code — its words are provenance only; row 38's indexability survives as F21, re-proved under its own acceptance. Reused unchanged: F43's owned Search Console page-row reader (declared host, then own pages), F21's reader, F31's inventory",
        declaredLimit: "the index state holds only for the recorded window (2026-08-15..2026-09-12); nothing is carried beyond it. No inspection or coverage record exists, so OBSERVED_NOT_INDEXED has no real input. Queries per page are NOT OBSERVED in the recorded rows. The publication date F43 needs is not obtainable from held data — its gate is recorded in _handoffs 16a0db8 (a bounded re-fetch of 27 pages' headers or the client's sitemap with lastmod), not run.",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F48 · Structured data and rich-result validation. Frozen 29 Sep (_handoffs 8d03429, RR-92 per its §6 override) ALONE, before any F48
   * code existed; AMENDED ALONE (d09dd5e, renamed 7f212cd) before any movement, because on the real data the original C2 ("otherwise
   * MISALIGNED") and C4 (no unsupported recommendation) contradicted each other: 70 of 162 marked-up texts sit only inside a script, and
   * their rendered visibility is not recorded. No historical row (NO MATCH). */
  F48: Object.freeze({
    featureId: "F48",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: F48_ORIGINAL.ruling, contractSha256: F48_ORIGINAL.contractSha256 }),
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F48", on: "2026-09-29", ruling: ACCEPTANCES.F48.ruling, contractSha256: ACCEPTANCES.F48.contractSha256, amends: ACCEPTANCES.F48.amends }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F48",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F48.ruling.sha256, contract: ACCEPTANCES.F48.contractSha256 }),
        branch: "rr92-f48-structured-data",
        baseSha: "a74232abe6beddd308504ea07d7cdcf83679dfba",
        baseCiRun: "36621666220",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-92_CONTINUE_THE_STANDALONE_PRODUCT.md", commit: "6bbfdd2f1d2decdd2796678908b2e0287304cca3", sha256: "6af57fae16dbc67e4420507a7cd7c0b28dda360a6eaa0def07ea00fe94f18230" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F48",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F48.ruling.sha256, contract: ACCEPTANCES.F48.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 27 pages · stored verified bodies · JSON-LD only · no live rich-result test, no rendering): every page carries one JSON-LD FAQPage block (types Answer+FAQPage+Question), 81 questions and 81 answers; VISIBLE 92, NOT VISIBLE 0, RENDER-ONLY 70 (58 answers, 12 questions — each found only inside another script on the page); state NOT_MEASURED 27 (missing: the page's rendered visible text, F22), ALIGNED 0, MISALIGNED 0; recommendations 0; schema facts supplied to F41: 0. No page is called hidden, invalid or rich-result eligible.",
        proofs: "test/f48-structured-data.test.mjs — every JSON-LD block found; an unparseable or untyped block INVALID, never skipped; C2 FIRING CONTROLS: a text absent from the whole page MISALIGNS it, a text only inside a script is RENDER-ONLY (NOT MEASURED, never misaligned), a certain misalignment outranks an unmeasured one, tags and case inside visible text still match; the requirement set is named NOT MEASURED; the notice states markup guarantees nothing and no code promises it; ALIGN only for NOT VISIBLE, REPAIR for invalid, nothing for RENDER-ONLY, no type for a page without markup (page-kind classification named missing); only an ALIGNED page supplies a schema fact, and F41's brief takes it with its source; an unverified body is NOT_MEASURED; REAL; the entry point prints counts and its bound and writes nothing; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f48-sabotage-2026-09-29.txt: 16 of 16 proved, every span pre-flighted once. F41 re-run on its changed reader. Not sabotaged (parked): F41's reader hand-off of the schema fact — no real page is ALIGNED to drive it; proved at unit level through buildBrief",
        historicalReuse: "no historical row (NO MATCH) — nothing to reuse from the 61-row work. Reused unchanged: F31's verified bodies, the shell module's visible-text extraction, F41's brief",
        declaredLimit: "rendered visibility is NOT MEASURED for 70 real texts on all 27 pages: the crawl recorded raw HTML only (F22 unassessed). GATE (RR-92 §4, recorded in Amendment 1, not run): render the 27 stored pages with their scripts — needs their script bundles fetched, a live collection; bound 27 renders, no crawl expansion; it would decide ALIGNED or MISALIGNED. A type's full requirement set and which type applies to a page are NOT MEASURED (no committed authority, no page-kind classification).",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F78 · Cost budget and provider governor. Frozen 29 Sep (_handoffs a1885de, RR-93 §4.1) ALONE, before any F78 code was read.
   * CHOSEN by measured inputs (RR-93 §3): recorded cost ledgers exist (engine 22 entries, research 2). Historical item 47 (paid
   * provider controls) survives as the gate F78 extends with tenant-scoped, expiring approvals; attribution by tenant is new. */
  F78: Object.freeze({
    featureId: "F78",
    board: "F_BOARD",
    state: "IN-PROGRESS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F78.ruling, contractSha256: ACCEPTANCES.F78.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F78",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F78.ruling.sha256, contract: ACCEPTANCES.F78.contractSha256 }),
        branch: "rr93-f78-cost-governor",
        baseSha: "7b54514127044cf9382fa2f1ebbcfd3d357747ba",
        baseCiRun: "36625336427",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-93_CONTINUE_AFTER_21_90.md", commit: "a5f9fa2b4caa6853fae718ddb657d38f27fcb680", sha256: "6c518951641b3f7d4f01227071d3e80cea12c12461b6dfb4ae99405e7da3e98d" }),
      }),
    ]),
  }),
  /* 🔴 F79 · Evidence cache before re-research. Frozen 29 Sep (_handoffs f34f3af, RR-93 continuous build) ALONE, before any F79 code;
   * AMENDED alone (60dee9b) before any code: raw_ref is null on 31 of 31 real observations, so "recorded raw bytes" is the inline content
   * when no raw file is recorded. CHOSEN by measured inputs: 19 recorded repeat requests (resightings) in the held store. Carries F02
   * tenant-isolation conformance (row constraint, ruling 1145012). Historical rows 15 and 46 (the fact cache) are provenance only. */
  F79: Object.freeze({
    featureId: "F79",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: F79_ORIGINAL.ruling, contractSha256: F79_ORIGINAL.contractSha256 }),
      Object.freeze({ kind: "ACCEPTANCE_AMENDED", featureId: "F79", on: "2026-09-29", ruling: ACCEPTANCES.F79.ruling, contractSha256: ACCEPTANCES.F79.contractSha256, amends: ACCEPTANCES.F79.amends }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F79",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F79.ruling.sha256, contract: ACCEPTANCES.F79.contractSha256 }),
        branch: "rr93-f79-evidence-cache",
        baseSha: "74e39e713abd5b789d0952739e66292bb13aade8",
        baseCiRun: "36639871167",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-93_CONTINUE_AFTER_21_90.md", commit: "a5f9fa2b4caa6853fae718ddb657d38f27fcb680", sha256: "6c518951641b3f7d4f01227071d3e80cea12c12461b6dfb4ae99405e7da3e98d" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F79",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F79.ruling.sha256, contract: ACCEPTANCES.F79.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 50 held records · 19 recorded repeat requests · freshness rule NONE DECLARED · source-change signals 0 · no re-research run, no call made): for the client and for every one of the 19 declared tenants, 0 of 19 repeats served — all OUTSIDE SCOPE under F02 (a domain property spanning 18 tenants 11, a URL-prefix property whose origin is undeclared 4, no property 4). Integrity: 31 of 31 held observations re-hash to their recorded hash (inline content). The same REAL records in a confined declared world where one tenant owns the properties: 11 of 19 served (9 metered requests recorded on them; 2 served records carry no request count, counted as unrecorded, never zero), 4 FRESHNESS NOT DECLARED (unwindowed), 4 OUTSIDE SCOPE; with one covered origin moved to a second tenant, every domain-property repeat is refused to both.",
        proofs: "test/f79-evidence-cache.test.mjs — one lookup one answer (most recent valid record; NOT_HELD; source changes passed explicitly); C2 FIRING CONTROL: another tenant's record, a domain property spanning tenants, an undeclared origin and no property are never served, and a domain property owned by one tenant is served to it and to no other; C3 own window only, undeclared age NOT MEASURED, declared rule both ways (EXPIRED), later source change forces a miss; C4 FIRING CONTROL on confined copies: tampered inline content, missing content, an altered and a missing raw file are misses; REAL over the recorded store for the client and every declared tenant; C5/C2 on REAL records in declared worlds (served with their recorded request counts; spanning two tenants refused to both); the entry point prints its own tenant's answers and bound and writes nothing; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f79-sabotage-2026-09-29.txt: 18 of 18 proved, every span pre-flighted once, production trail unchanged. Not sabotaged (parked): the fail-closed refusal of a declared freshness rule of an unread shape — no such rule exists and no test drives it",
        historicalReuse: "historical rows 15 (SPLIT) and 46 (MERGED) are the FACT cache (src/facts/lifecycle.mjs createFactCache) — read after the freeze, provenance only; F79's evidence cache is new code. Reused unchanged: the F02 decision (decideResolvedTenants), the evidence store reader, the declarations, the declared world",
        declaredLimit: "no freshness rule is declared for any tenant, so an unwindowed record's age is NOT MEASURED and never served; no source-change store exists (0 signals, passed explicitly); two miss reasons are named beyond the frozen list — NOT_HELD (no record of the measurement at all) and EXPIRED (past a declared rule) — each names its failed test; neither occurs in the real population. A declared freshness rule of a shape F79 does not read fails closed (a guard not yet driven by a test — no such rule exists).",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F55 · AI crawler access audit. Frozen 29 Sep (_handoffs 7323446, RR-93 continuous build) ALONE, before any F55 code was written
   * or its configuration opened. CHOSEN by measured inputs: the client's recorded robots.txt (1 of 5 in the shared store) and 27 stored
   * page bodies. No historical row maps to F55 (reconciliation reverse map empty). */
  F55: Object.freeze({
    featureId: "F55",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-29", ruling: ACCEPTANCES.F55.ruling, contractSha256: ACCEPTANCES.F55.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F55",
        on: "2026-09-29",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F55.ruling.sha256, contract: ACCEPTANCES.F55.contractSha256 }),
        branch: "rr93-f55-ai-crawler-access",
        baseSha: "5cb15b42da45bee9216330d2a0b1715339e9ee49",
        baseCiRun: "36643902756",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-93_CONTINUE_AFTER_21_90.md", commit: "a5f9fa2b4caa6853fae718ddb657d38f27fcb680", sha256: "6c518951641b3f7d4f01227071d3e80cea12c12461b6dfb4ae99405e7da3e98d" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F55",
        population: "REAL",
        on: "2026-09-29",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F55.ruling.sha256, contract: ACCEPTANCES.F55.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 8 declared AI crawlers · 27 pages · the client's robots.txt 1 of 5 in the shared store, the rest other clients' and never read · recorded retrievals 0 · X-Robots-Tag not recorded · nothing fetched): policy ALLOWED 216 of 216 crawler-page pairs, every one decided by the wildcard group (the recorded robots.txt names no AI crawler); retrieval NOT MEASURED 216 — no recorded retrieval by any declared crawler; page directives addressed 48 pairs, noindex/none 0, reported beside and never merged.",
        proofs: "test/f55-ai-crawler-access.test.mjs — RFC 9309's own cases (specific group over wildcard, longest match, allow-wins tie, 4xx ALLOWED, 5xx and a failed fetch DISALLOWED, none NOT MEASURED); C2 FIRING CONTROL: ALLOWED policy still reports retrieval NOT MEASURED, a retrieval counts only for its own crawler, dated, with a ref; C3 directives beside, never changing the verdict; C4 only the declared AI crawlers with a documented token, empty is COULD-NOT-PROVE; REAL; C5 on a confined copy of the real shared store: a planted disallow-all for another real client changes nothing, the same plant at the client's own origin (control) decides it; the entry point prints its own tenant's counts and bound and writes nothing; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f55-sabotage-2026-09-29.txt: 17 of 17 proved, every span pre-flighted once, production trail unchanged",
        historicalReuse: "no historical row maps to F55. Reused unchanged: F21's RFC 9309 matcher (src/audit/robots-scope.mjs) and its robots reader partitioned by declared host, the crawl partition and stored bodies, config/blocked-crawlers.mjs (the declared list, read-dated 2026-09-12)",
        declaredLimit: "the declared list is the 16-agent block-list classification (8 AI agents with an operator-documented token); crawlers it does not declare are not audited. Observed retrieval is NOT MEASURED — no server log and no AI-user-agent fetch is recorded; recording one needs a live act, not run. The X-Robots-Tag header was not recorded by the collector.",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F45 · Fact conflict freshness and recomputation. Frozen 30 Sep (_handoffs dcb9fbb, RR-94 §3.1) ALONE, before any F45 implementation
   * was read. CHOSEN by measured inputs: the client's fact registry (47 records; 46 with a declared rule and a recorded check date; 1 derived).
   * Historical rows 16 and 17 (MERGED) survive in src/facts/lifecycle.mjs, whose conflict detector, formulas, recomputer and dependency walk
   * are reused unchanged and re-proved; its clock-defaulted, extraction-dated freshness is NOT reused. */
  F45: Object.freeze({
    featureId: "F45",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-30", ruling: ACCEPTANCES.F45.ruling, contractSha256: ACCEPTANCES.F45.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F45",
        on: "2026-09-30",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F45.ruling.sha256, contract: ACCEPTANCES.F45.contractSha256 }),
        branch: "rr94-f45-fact-lifecycle",
        baseSha: "17887f6f67aaf7940eacc91b42aa1d0ca8dd80e4",
        baseCiRun: "36646130728",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-94_CONTINUE_FROM_23_90.md", commit: "1334661f89a3cec21f1dc53e2b38ed9f7c0d80a9", sha256: "7ec3df0d8c8ee4d03124515e34020b54cdeb73cc0546a6fc1d9b4cd10f057b37" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F45",
        population: "REAL",
        on: "2026-09-30",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F45.ruling.sha256, contract: ACCEPTANCES.F45.contractSha256 }),
        populations: "REAL (count-only; bound: recorded registry only · 47 active facts, 0 retired · judged on 2026-09-30, stated · nothing fetched or re-checked): contradictions 0 (every claim held by one record); recorded settlements 1; freshness — THREE WORLDS — CURRENT 46 · EXPIRED 0 · NOT MEASURED 1 (the derived fact: no declared freshness rule of its own); the recorded recheck window disagrees with the declared rule on 9 facts (the earlier governs); derived facts 1, recomputed MATCH, yet REVIEW REQUIRED because its own freshness is NOT MEASURED; presentation CURRENT 46 · REVIEW REQUIRED 1. Positive control on the SAME real records at a later stated date (2027-04-01): every fact with a rule and a check date EXPIRED and REVIEW REQUIRED.",
        proofs: "test/f45-fact-health.test.mjs — C1 FIRING CONTROL on the real registry with one planted variant (both retained, neither presented; identical value, other qualifier and retired are not contradictions; a recorded settlement reported as recorded); C2 own rule from own check date on a stated date, all three worlds, missing facts named, disagreeing check dates not resolved, an earlier recorded recheck governs and a later one never extends, no default date; C3 only a sound fact presented, a retired fact neither judged nor presented, no delete or noindex; C4 MATCH/MISMATCH/NOT MEASURED, a bad input marks the derived fact and — transitively, listed out of order — what is built on it; REAL on the stated date and the later-date control; the entry point refuses without a stated date, prints its bound and writes nothing; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f45-sabotage-2026-09-30.txt: 19 of 19 proved, every span pre-flighted once, production trail unchanged. Not separately provable (finding): the retired-record skip inside the reused detectConflicts is masked by F45's own filter, which is proved (S11)",
        historicalReuse: "historical rows 16 and 17 (MERGED) — src/facts/lifecycle.mjs detectConflicts, FORMULAS, recomputeDerived and markForReview reused unchanged and re-proved under this acceptance (S2 and S16 sabotage them). NOT reused: freshnessOf (a clock default and an extraction date where F45 requires a stated date and a check date); bin/facts-lifecycle.mjs keeps using it — parked",
        declaredLimit: "freshness is judged only from recorded check dates — no source was re-checked; a derived fact carries no freshness rule of its own, so it fails closed; no external observation of a claim was compared (that is a separate detector); the acceptance preamble's '3 claims held by more than one record' was a count that ignored the qualifier — the true count is 0",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F26 · Accessibility assessment. Frozen 30 Sep (_handoffs b1a94e7, RR-95 §2) — its FIRST freeze — ALONE, before any F26 code (none
   * existed; no historical row maps to F26). Assessed on the client's 27 stored page bodies. An automated scan never proves accessibility. */
  F26: Object.freeze({
    featureId: "F26",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-30", ruling: ACCEPTANCES.F26.ruling, contractSha256: ACCEPTANCES.F26.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F26",
        on: "2026-09-30",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F26.ruling.sha256, contract: ACCEPTANCES.F26.contractSha256 }),
        branch: "rr95-f26-accessibility",
        baseSha: "b2f4607e7103d163cac9eec53ef612618ec359d7",
        baseCiRun: "36650798607",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-95_CLOSE_F45_CONTINUE_F26.md", commit: "47703a00a348f3b2b19fa37c5e34c434ca9b7790", sha256: "ae02051562e90cbf9f2803b16b978bbced332c8abbcd828687f7513d7f841ca2" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F26",
        population: "REAL",
        on: "2026-09-30",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F26.ruling.sha256, contract: ACCEPTANCES.F26.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 27 pages in the client's partition, 27 with a stored untruncated body · 6 machine checks · stored bodies, NOT rendered pages — excludes script-inserted content, styles and interaction · nothing fetched or rendered): THREE POPULATIONS, never merged — MACHINE-CHECKED: 0 instances across the 6 checks (the bodies hold no img element); NEEDS A PERSON: 27 decorative claims (every inline graphic is hidden from assistive technology), 27 page titles, 2112 link and button names — located, never judged; NOT MEASURED: 7 render- or interaction-dependent criteria (contrast, resize, reflow, keyboard, focus order, focus visible, script-inserted content). Verdicts: COULD-NOT-PROVE 27, DISPROVED 0, PROVED impossible by construction.",
        proofs: "test/f26-accessibility.test.mjs — each of the 6 machine checks fires on a failing fixture and stays quiet on its clean one; names from an image alternative and aria-labelledby, hidden elements, and markup inside script/style/template/comments handled; FIRING CONTROL on REAL bodies (planted link, button, frame, image and a removed language are each found; truncated and missing bodies NOT MEASURED); needs-a-person counted apart and never merged; NOT MEASURED criteria named with their missing fact and the exclusion stated; FIRING CONTROL no page PROVED, one failure DISPROVED; REAL; the entry point prints its three populations and bound and writes nothing; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f26-sabotage-2026-09-30.txt: 16 of 16 proved, every span pre-flighted once, production trail unchanged",
        historicalReuse: "no historical row maps to F26 and no F26 code existed. Reused unchanged: the crawl partition and stored bodies (declared host), the F02 entry-point scope",
        declaredLimit: "a zero machine count covers the 6 declared checks only and proves nothing about accessibility; 2166 located items await a person; everything that needs a rendered, styled or operated page is NOT MEASURED — a bounded render was not run",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F46 · Source integrity and citation audit. Frozen 30 Sep (_handoffs 2e76216, RR-96 §2) — its FIRST freeze (only a branch existed) —
   * ALONE, before any F46 code was read. Five checks kept apart; a working link is not a correct citation; FIT is a person's judgement. */
  F46: Object.freeze({
    featureId: "F46",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-30", ruling: ACCEPTANCES.F46.ruling, contractSha256: ACCEPTANCES.F46.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F46",
        on: "2026-09-30",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F46.ruling.sha256, contract: ACCEPTANCES.F46.contractSha256 }),
        branch: "rr96-f46-source-integrity",
        baseSha: "eed349aac66c2640b363db396ed490115b80a9b3",
        baseCiRun: "36654041719",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-96_CLOSE_197_CONTINUE_F46.md", commit: "6eccb9ba7c62a1b51f2b6d37016c6429154791cc", sha256: "8422c1fd911fff92ffc28ec6b9a9cff07572e2334209c8e41e0e130d60d2828c" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F46",
        population: "REAL",
        on: "2026-09-30",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F46.ruling.sha256, contract: ACCEPTANCES.F46.contractSha256 }),
        populations: "REAL (count-only; bound: recorded registry only · 47 active facts · outcomes recorded 2026-09-10, not re-checked · checkers declared a person: 0 · nothing fetched): FIVE CHECKS, never merged — LINK: WORKED 46 · NOT MEASURED 1; QUOTATION: MATCHED 19 · NOT APPLICABLE 27 · NOT MEASURED 1; FINGERPRINT: MATCHED 27 · NOT MEASURED 20; AUTHORITY: ADMISSIBLE 46 · NOT MEASURED 1; FIT: NEEDS A PERSON 47 (no checker is declared a person; recorded verdicts reported beside, never as FIT: VERIFIED 33, CONFLICT 6, QUALIFIED 4, UNKNOWN 3). CITATIONS: COULD-NOT-PROVE 47 — none PROVED, none DISPROVED.",
        proofs: "test/f46-citation-audit.test.mjs — five separate results per fact, no score; a failed fetch is NOT MEASURED, never a dead link, and an unrecognised outcome fails closed; C2 FIRING CONTROL: all mechanical checks green with FIT unconfirmed is COULD-NOT-PROVE, FIT CONFIRMED completes it, each recorded failure DISPROVES; C3 FIRING CONTROL: a claim wholly overlapping its source with no person's verdict is NEEDS A PERSON, a verdict by an undeclared checker never decides FIT, CONFLICT or a missing element REFUTES; C4 tiers through the engine's one tier reader, V3 §10.1 and §10.3; REAL; the entry point prints the five checks apart, the recorded dates and the fresh-fetch gate and writes nothing; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f46-sabotage-2026-09-30.txt: 16 of 16 proved, every span pre-flighted once, production trail unchanged",
        historicalReuse: "no historical row maps to F46. Reused: the engine's one tier reader (src/evidence/source-tiers.mjs sourceTierOfFact) and the law of src/audit/source-integrity.mjs that a failed fetch is not a dead link; that module's LIVE link checker is the named fresh-fetch gate and was not run",
        declaredLimit: "every outcome is a recording dated 2026-09-10 — whether a link still works or a page still matches today needs a bounded fetch under its own authorisation (bin/source-integrity.mjs), not run; FIT needs a person on all 47 facts because no roster declares any checker a person; borrowing support from the wrong subject or scope is part of FIT and is therefore also a person's judgement",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F47 · Entity relationship map. Frozen 30 Sep (_handoffs ccd4c1e, RR-96 continuous build) — its first freeze — ALONE, before any F47
   * code (none existed). Built only from recorded structures; a declared awaiting reference is its own population, never silent. */
  F47: Object.freeze({
    featureId: "F47",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-30", ruling: ACCEPTANCES.F47.ruling, contractSha256: ACCEPTANCES.F47.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F47",
        on: "2026-09-30",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F47.ruling.sha256, contract: ACCEPTANCES.F47.contractSha256 }),
        branch: "rr96-f47-entity-map",
        baseSha: "76188dce92c456d7da3f58303bf871c51857e98d",
        baseCiRun: "36656538111",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-96_CLOSE_197_CONTINUE_F46.md", commit: "6eccb9ba7c62a1b51f2b6d37016c6429154791cc", sha256: "8422c1fd911fff92ffc28ec6b9a9cff07572e2334209c8e41e0e130d60d2828c" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F47",
        population: "REAL",
        on: "2026-09-30",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F47.ruling.sha256, contract: ACCEPTANCES.F47.contractSha256 }),
        populations: "REAL (count-only; bound: recorded registry, placement, page specs and stored page bodies only · 47 facts · 27 pages · questions from machine-readable data, text never printed · nothing fetched): NODES entities 9 · attributes 34 · scopes 4 · sources 15 · publishers 9 · facts 47 · pages 27 · questions 81; RELATIONSHIPS about 47 · has-attribute 47 · in-scope 47 · cites 46 · published-by 15 · placed 42 · asks 81; REFERENCES 47 — RESOLVED 42 · DECLARED AWAITING 5 · UNRESOLVED 0; INCONSISTENT 0; NEEDS A PERSON 0; pages not measured 0. MAP VERDICT: COULD-NOT-PROVE — the 5 declared awaiting references are open.",
        proofs: "test/f47-entity-map.test.mjs — nodes and relationships from recorded fields only, prose never counted as questions, retired facts excluded; C2 FIRING CONTROL: unresolved references named where they appear, declared awaiting entries their own population, no entry dropped (objects included); C3 a fact id held twice and a source with two publishers INCONSISTENT, names differing only in form NEEDS A PERSON and never merged; C4 questions from machine-readable data, text never kept, a page without a body NOT MEASURED; C5 FIRING CONTROL PROVED only when nothing is open; REAL with every real reference accounted for; the entry point prints its counts, verdict and bound and writes nothing; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f47-sabotage-2026-09-30.txt: 14 of 14 proved, every span pre-flighted once, production trail unchanged",
        historicalReuse: "historical row 27 (SAME, code none) — provenance only. Reused unchanged: F48's machine-readable-data discovery (discoverBlocks), the fact registry, F31's page population",
        declaredLimit: "a first cut read only string placement entries and silently dropped the 5 declared awaiting entries (objects), so the map first read PROVED — found by comparing the reference count to the recorded lists, and fixed; the map is internal consistency only — whether an entity is important, or a relationship true, is not judged",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F20 · Status redirect and URL audit. Frozen 30 Sep (_handoffs f566059, RR-96 continuous build) — its first freeze — ALONE, before its
   * historical row-10 code was read. Observed and linked-only URLs kept apart; a failed fetch is NOT MEASURED, never broken. */
  F20: Object.freeze({
    featureId: "F20",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-30", ruling: ACCEPTANCES.F20.ruling, contractSha256: ACCEPTANCES.F20.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F20",
        on: "2026-09-30",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F20.ruling.sha256, contract: ACCEPTANCES.F20.contractSha256 }),
        branch: "rr96-f20-status-audit",
        baseSha: "eb02e0256d64a7590ec8d8539c8460437df02a62",
        baseCiRun: "36659504027",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-96_CLOSE_197_CONTINUE_F46.md", commit: "6eccb9ba7c62a1b51f2b6d37016c6429154791cc", sha256: "8422c1fd911fff92ffc28ec6b9a9cff07572e2334209c8e41e0e130d60d2828c" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F20",
        population: "REAL",
        on: "2026-09-30",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F20.ruling.sha256, contract: ACCEPTANCES.F20.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 27 observed URLs · 416 linked-only URLs, never fetched · 27 stored bodies read for link targets as written · 1275 recorded link edges · nothing fetched): OBSERVED — status OK 27, redirects NONE 27, hops 0; LINKED-ONLY — 416, status and redirects NOT MEASURED (missing: a fetch of each, not run); LINK TARGETS AS WRITTEN — well-formed 2085, malformed 0, non-web 0; PREFERRED LOCATION — linked in more than one form 0 (no observed page is linked from another observed page, so this limb has an empty real population), canonical names another form 0, no canonical 0, canonical names another page 0. VERDICT: COULD-NOT-PROVE — the linked-only population is open.",
        proofs: "test/f20-url-audit.test.mjs — one status per observed URL, a recorded fetch error NOT MEASURED never broken, linked-only URLs NOT MEASURED and an observed page reached in another form not counted as linked-only; NONE / CHAIN / LOOP from the recorded chain, no chain NOT MEASURED, a loop DISPROVES; C3 FIRING CONTROL on REAL bodies (planted whitespace, parser-rejected and non-web targets); C4 FIRING CONTROL on REAL bodies (a real canonical re-planted in another form) and fixtures for two link forms and no canonical; C5 PROVED only when nothing is open; REAL; the entry point prints its populations and bound and writes nothing; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f20-sabotage-2026-09-30.txt: 16 of 16 proved, every span pre-flighted once, production trail unchanged",
        historicalReuse: "historical row 10 (SPLIT) — src/audit/technical-checks.mjs STATUS_AND_REDIRECTS was read and NOT reused: it reads a failed fetch as a high-severity failure, which F20's law forbids. Reused unchanged: F21's parseHead (declared canonical), F26's scannable (script-free markup), the crawl partition, stored bodies and edges",
        declaredLimit: "every status is the recorded one; 416 linked-only URLs need a fetch each to be judged — not run; the two-link-forms limb has an empty real population today (proved on fixtures and a real body plant)",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F29 · Technical issue prioritization. Frozen 30 Sep (_handoffs c8eee0c, RR-96 continuous build) — its first freeze — ALONE, before any
   * F29 code. Ranks each client's OWN recorded issues by dominance only: the spec gives no weights, and none is invented. */
  F29: Object.freeze({
    featureId: "F29",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-30", ruling: ACCEPTANCES.F29.ruling, contractSha256: ACCEPTANCES.F29.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F29",
        on: "2026-09-30",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F29.ruling.sha256, contract: ACCEPTANCES.F29.contractSha256 }),
        branch: "rr96-f29-issue-prioritization",
        baseSha: "3ac5f395cda65e1de541a6730d7826666ad624f6",
        baseCiRun: "36662501213",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-96_CLOSE_197_CONTINUE_F46.md", commit: "6eccb9ba7c62a1b51f2b6d37016c6429154791cc", sha256: "8422c1fd911fff92ffc28ec6b9a9cff07572e2334209c8e41e0e130d60d2828c" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F29",
        population: "REAL",
        on: "2026-09-30",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F29.ruling.sha256, contract: ACCEPTANCES.F29.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 107 open issues in the findings store · ranked per client from its own partition · reach from each client's own owned page rows with their window · nothing fetched, nothing changed): the issues belong to 4 declared clients (62, 41, 2 and 1) and 1 is unattributed (host-level, no page); the reference client owns 0 — an empty population, reported as such. Largest client: 62 issues in 4 dominance layers (1, 3, 15, 43) — severity, evidence and affected population are equal across its issues, so only recorded reach separates them; effort and reversibility NOT MEASURED on all 62. No issue is ranked for two clients.",
        proofs: "test/f29-issue-priority.test.mjs — C3 FIRING CONTROL: a dominated issue below its dominator, incomparable issues share a layer, no tie broken by id; a dimension recorded for one issue only never decides an order (on a pair that WOULD dominate if it were skipped), a non-numeric effort is NOT MEASURED, recorded effort and reversibility ranked, affected population per class; C1 REAL: each client ranks only its own issues, none ranked twice, the reference client's empty population reported; C2 REAL: severity recorded, reach carries its window; the entry point prints its ranking, bound and 'changes nothing', leaves the findings store byte-identical and writes nothing; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f29-sabotage-2026-09-30.txt: 12 of 12 proved, every span pre-flighted once, production trail unchanged. FINDING on the first run: S4 and S5 did not turn their test red — the fixtures could not tell 'skip a missing dimension' from 'incomparable', and never gave a non-numeric effort; both tests were sharpened and the whole harness re-run",
        historicalReuse: "no historical row maps to F29. Reused unchanged: the recorded findings store, the crawl partition, F43's owned page-row reader (clientPerformance)",
        declaredLimit: "no order or weight across the six dimensions is authorised, so issues that trade one dimension against another are incomparable — an owner ruling on weights would be needed to order them; effort and reversibility are recorded for no issue; ranking changes nothing and predicts no gain",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F73 · Recommendation explainability. Frozen 30 Sep (_handoffs 366476c, RR-97 §3) — its first freeze — ALONE, after measuring its real
   * population (3 recorded recommendations) and before reading any F73 code. A field is RECORDED or NOT MEASURED; nothing is filled. */
  F73: Object.freeze({
    featureId: "F73",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-30", ruling: ACCEPTANCES.F73.ruling, contractSha256: ACCEPTANCES.F73.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F73",
        on: "2026-09-30",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F73.ruling.sha256, contract: ACCEPTANCES.F73.contractSha256 }),
        branch: "rr96-f73-explainability",
        baseSha: "6ba2f41b959b96f9dc58ef95291a76985f27be59",
        baseCiRun: "36665344162",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-97_CONTINUE_FROM_29_90_ASSESS_F73.md", commit: "63b5248a911b4eaa0e7e8a63f1ee2eb89f50f7da", sha256: "725920ea1c6ad793aec7247a97e5d6fcf8326a7da219e01459d34d32f0658670" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F73",
        population: "REAL",
        on: "2026-09-30",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F73.ruling.sha256, contract: ACCEPTANCES.F73.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 3 recommendations (record type draft_recommendation) · 275 linked evidence references resolved against 6 recorded stores · nothing derived, estimated, fetched or written): RULE — a recommendation is a persisted record proposing an action with its own id, drafter and status; issues (1,897), lifecycle records (1,013), evidence links (3), rankings, assessments and fixtures are not. FIELDS on the 3 — evidence RECORDED 3 (through recorded evidence links; 275 references, 0 broken), reason RECORDED 3 (the recorded finding each rests on, labelled so), priority NOT MEASURED 3, confidence NOT MEASURED 3, dependencies NOT MEASURED 3, expected cost NOT MEASURED 3, reversibility NOT MEASURED 3. Status as recorded: RECOMMENDED — NOT APPROVED — NOT APPLIED on all 3. VERDICTS: COULD-NOT-PROVE 3.",
        proofs: "test/f73-recommendation-explain.test.mjs — C1 only persisted recommendations counted (issues, lifecycle, links, rankings, assessments excluded); C2 FIRING CONTROL: an absent cost and reversibility stay NOT MEASURED with the missing fact named, no field carries a manufactured value, evidence never assumed without a link, a reason from a finding labelled; C3 FIRING CONTROL: a dangling reference is BROKEN and disproves; C4 status, approval and application exactly as recorded; C5 REAL with an independent cross-check that no reference read broken is a record in any persisted store, and a narrowed store list breaks the real references (non-vacuous); the entry point prints every field, the broken count and its bound and writes nothing; no network, process, connector or paid call (firing control). Hand-written expectations; production trail byte-identical",
        sabotage: "runs/audit/f73-sabotage-2026-09-30.txt: 14 of 14 proved, every span pre-flighted once, production trail unchanged. FINDING on the first run: S11 (a store dropped from the resolver) did not turn its test red — the REAL test never checked that a reference read broken is truly absent; an independent cross-check was added and the whole harness re-run",
        historicalReuse: "historical rows 51 and 60 — src/report/recommendation-fields.mjs was read after the freeze and NOT reused: it DERIVES priority, confidence and cost from other stores, which F73's law (RR-97: never infer or fill) forbids; bin/report.mjs keeps using it — parked. Reused: the recorded recommendation and evidence-link records and the audit stores",
        declaredLimit: "priority, confidence, dependencies, expected cost and reversibility are recorded on no recommendation — each needs to be recorded by whoever drafts or approves a recommendation; the recommendations carry no client scope, so the entry point is NOT_TENANT_GOVERNED by the census",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F75 · Task ticket and workflow integration. Frozen 30 Sep (_handoffs 01275a9, RR-103 §3) — its first freeze — ALONE, after measuring
   * every limb on real data and before any F75 code existed. Tickets are DRAFTS: returned, never written, filed or sent. */
  F75: Object.freeze({
    featureId: "F75",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-30", ruling: ACCEPTANCES.F75.ruling, contractSha256: ACCEPTANCES.F75.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F75",
        on: "2026-09-30",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F75.ruling.sha256, contract: ACCEPTANCES.F75.contractSha256 }),
        branch: "f75-tickets",
        baseSha: "84ca961781a00989b045dff66e724d967e818079",
        baseCiRun: "36777574333",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-103_CLOSE_F90_ADD_PAGE_OPPORTUNITY_ROW_THEN_CONTINUE.md", commit: "4ff0fc8fec61649ecf829fd2da39da85c1012c94", sha256: "642b48e7eae2665f83e6267d28e59ea013ad7b7d445f5330146469091776461f" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F75",
        population: "REAL",
        on: "2026-09-30",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F75.ruling.sha256, contract: ACCEPTANCES.F75.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · F90's actionable population, 528 findings in 8 tracked stores through the production lifecycle reader · 22 ACTIVE declared clients, each through its own crawl partition · nothing fetched, re-run, written, filed or sent): 527 findings ticketed exactly once, for 17 clients (5 clients have none, reported so); 1 finding unattributed, named apart; 46 ticket drafts — DEVELOPER 23, CONTENT 23, NOT MEASURED 0; every ticket complete: every finding with recorded evidence, affected pages counted with the findings behind them, and an acceptance check taken from the raising check's declared boundary. An independent attribution (no ticket code) agrees on 527. Satisfaction is claimed for no ticket.",
        proofs: "test/f75-task-tickets.test.mjs (11) — C1 only the client's actionable findings (another client's, UNKNOWN, closed, superseded excluded; not-this-client counted); C1 FIRING CONTROL: an unreadable findings population drafts no ticket (COULD-NOT-PROVE, named); C2 CONTENT for a declared content-supply check, DEVELOPER otherwise, an unregistered detector NOT MEASURED with its fact; C2 the declared list is exactly item 12's four registered checks, the orphan excluded; C3 evidence ids kept, affected pages distinct with their findings, a finding without evidence named; C4 the acceptance check is the held check's own boundary object, satisfaction NOT CLAIMED; C4 FIRING CONTROL: no boundary leaves the acceptance check NOT MEASURED, named; REAL every ACTIVE declared client, each finding once, independent attribution agrees, both kinds occur; C5 the drafter imports nothing and the reader nothing that fetches or writes, no URL in a ticket; C5 the entry point in the declared fixture world prints bound, kinds and the not-this-client count and writes nothing",
        sabotage: "runs/audit/f75-sabotage-2026-09-30.txt: 14 of 14 proved, every span pre-flighted once, production trail unchanged. K12 (the missing-boundary branch removed) turns its test red through a TypeError on the unfilled part, not a filled value — reported, as F90's S10",
        historicalReuse: "no historical row maps to F75 (crosswalk UNASSESSED, no module or test). Reused: F90's actionable population and lifecycle reader, F29's own-partition attribution (clientPageIds), and the registered checks' declared boundaries (#204, #205)",
        declaredLimit: "tickets are drafts returned by the entry point: filing them into an external tracker needs a connector the product does not hold — NOT MEASURED, never implied; nothing is re-run, so no ticket is ever called satisfied; the developer/content split follows where a check is declared (item 12's content-supply checks), not a judgement of who should fix it; the three content thresholds behind many CONTENT tickets remain an unvalidated parked gap (GAP-RR103-THRESHOLD-VALUES)",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  /* 🔴 F90 · Falsifiability of findings. Frozen 30 Sep (_handoffs 73b50bf, RR-99 §4) — its first freeze — ALONE, before any F90 code was read.
   * Its prerequisites were repaired first, each in its own PR: the eight technical checks' boundaries (#204) and the four content checks'
   * (#205). Every refutation part is TAKEN from the held check's declaration or NOT MEASURED — never written freehand. */
  F90: Object.freeze({
    featureId: "F90",
    board: "F_BOARD",
    state: "VERIFIED-PASS",
    events: Object.freeze([
      Object.freeze({ kind: "ACCEPTANCE_FROZEN", on: "2026-09-30", ruling: ACCEPTANCES.F90.ruling, contractSha256: ACCEPTANCES.F90.contractSha256 }),
      Object.freeze({
        kind: "IMPLEMENTATION",
        featureId: "F90",
        on: "2026-09-30",
        from: "UNASSESSED",
        to: "IN-PROGRESS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "ACCEPTANCE_FROZEN_AND_REPAIR_BEGUN",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F90.ruling.sha256, contract: ACCEPTANCES.F90.contractSha256 }),
        branch: "f90-falsifiability",
        baseSha: "9c5689ea20aea2dcd4e23daaa6ba0d82789e08b6",
        baseCiRun: "36761136012",
        baseCiConclusion: "success",
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-102_FINISH_F90_PREREQUISITE_RECORD_PAGE_PLANNING.md", commit: "216d7a0687ee776a4e9445321c5b1defb7d1c913", sha256: "7536a0f1e8b9f44c4bbde0060bc45f399415292cd9fc998917ae8e6e703d62b6" }),
      }),
      Object.freeze({
        kind: "VERIFIED",
        featureId: "F90",
        population: "REAL",
        on: "2026-09-30",
        from: "IN-PROGRESS",
        to: "VERIFIED-PASS",
        route: "UNASSESSED -> IN-PROGRESS -> VERIFIED-PASS (two movements; no jump)",
        reason: "EVERY_CLAUSE_OF_THE_FROZEN_ACCEPTANCE_PROVED",
        acceptanceUnchanged: Object.freeze({ ruling: ACCEPTANCES.F90.ruling.sha256, contract: ACCEPTANCES.F90.contractSha256 }),
        populations: "REAL (count-only; bound: recorded data only · 19 tracked stores under runs/ listed, 8 holding findings · 2,033 logical findings · 528 actionable (1,036 physical copies) · 16 registered checks · nothing fetched, re-run or written): RULE — actionable = latest recorded state OPEN (through the production lifecycle reader), verdict FAIL, superseded by no later record; one finding in several stores (the two replays, content-findings and supply-labels) is ONE finding with its copies counted; counted apart: UNKNOWN 1,360, CLOSED 11, SUPERSEDED 134. METHODS: 11 held checks, each at its declared live version 1 — indexability-preflight 158, thin-content 118, robots-scope 106, exact-duplicate 106, head-elements 18, status-and-redirects 7, canonical 6, near-duplicate 5, template-dominance 2, dns-family 1, query-parameters 1. RESULT: FALSIFIABLE 528 · NOT FALSIFIABLE 0 · missing METHOD 0, OBSERVATION 0, THRESHOLD 0 · an independent count (no lifecycle reader, no census) agrees on 528 · verdict PROVED. RR-99's 471 is not used (its correction is recorded, _handoffs 5599181).",
        proofs: "test/f90-falsifiability.test.mjs (13) — C1 exactly OPEN+FAIL+not-superseded, UNKNOWN/closed/superseded apart, one finding in two stores is one; C1 FIRING CONTROLS: a supersession with no recorded move, one finding reading differently across stores, an unparseable line and a lifecycle error each make the population UNREADABLE (COULD-NOT-PROVE), named; C2 a held method is the registered check at its declared live version — an unregistered detector, a version mismatch and an undeclared version are each named; C3 the parts are the held check's own declaration objects; C3 FIRING CONTROL: no boundary leaves OBSERVATION and THRESHOLD NOT MEASURED with the missing fact named; C4 PROVED only when all are falsifiable, a non-falsifiable class DISPROVES under its own class and part, bound printed; C4 FIRING CONTROL: an empty population is COULD-NOT-PROVE; C4 tracked stores only, a newly committed store cannot be missed (temp git repo); REAL PROVED with an independent count; REAL POSITIVE CONTROL: withdrawing one real detector's boundary or version (thin-content, indexability-preflight, exact-duplicate) DISPROVES by exactly its findings; C5 the census imports only the lifecycle reader and the reader nothing that fetches or writes; C5 the entry point in the declared fixture world prints bound and verdict and writes nothing. The rr100 and rr102 crossing tests now also require every FAIL to name its check and carry the check's declared version, so the declaration and the stamp cannot drift",
        sabotage: "runs/audit/f90-sabotage-2026-09-30.txt: 18 of 18 proved, every span pre-flighted once, production trail unchanged. S10 (the missing-boundary branch removed) turns its test red through a TypeError on the unfilled part, not through a filled value — reported, not hidden",
        historicalReuse: "legacy row 59 — src/audit/falsifiability.mjs with config/refutation-register.mjs was read after the freeze and NOT reused: its refutations are written by hand per issue class in a register, which C3 forbids (never freehand), and it counts classes, not findings; bin/refutation-census.mjs keeps using it — parked. Reused: the production lifecycle reader (src/evidence/lifecycle.mjs) and the registered checks' declared boundaries (#204, #205)",
        declaredLimit: "a refutation states what would overturn a finding, taken from the held check's declaration; nothing is re-run, so whether a fresh observation would in fact overturn a finding is not measured. Three held thresholds (thin-content 350 unique words, near-duplicate Jaccard 0.9, template-dominance share 0.75) are legacy constants whose authority V3 disputes (F40 BLOCKED; parked in _handoffs c3c0cbe): F90 proves they are declared and crossed both ways, not that they are right. The recorded run artefacts carry no client scope, so the real census is taken through the reader and the entry point is proved in the declared fixture world",
        afterMerge: "main CI green on the exact merged SHA; a red main run means this record is wrong and must be reverted",
      }),
    ]),
  }),
  F40: Object.freeze({
    featureId: "F40",
    board: "F_BOARD",
    state: "UNASSESSED",
    note: "The universal 350-word floor no longer governs F40: the owner's ruling of 2 October 2026 (no fixed minimum and no fixed maximum page word count; the assessment is whether the page answers its stated need) supersedes the blocker recorded on 22 September, which stays in this row's history. F40 has no frozen acceptance and is not implemented; when one is frozen it must carry that check (config/fboard/row-constraints.mjs). Lifting a blocker passes nothing.",
    events: Object.freeze([
      Object.freeze({ kind: "BLOCKER_RECORDED", on: "2026-09-22", source: "_handoffs/AlmiVisibility_CC_COMMAND_2026-09-22_F05_CURRENT_AUTHORITY_REGISTER_CHAIN.md §0.7" }),
      /* RR-127 §2a — the blocking authority is superseded by an owner ruling; the row returns to UNASSESSED, never further. The note
       * this event replaced is kept verbatim below, so nothing of the earlier record is lost. */
      Object.freeze({
        kind: "BLOCKER_LIFTED", on: "2026-10-02", from: "BLOCKED-BY-AUTHORITY", to: "UNASSESSED",
        route: "BLOCKED-BY-AUTHORITY -> UNASSESSED (the blocking authority superseded by an owner ruling; no acceptance, no implementation, no pass)",
        reason: "OWNER_RULING_SUPERSEDES_BLOCKER",
        liftedBlocker: "UNIVERSAL_350_WORD_FLOOR_STILL_APPLICABLE",
        supersededNote: "Amendment 7 changed only the fact floor. It is not credited with changing the universal 350-word floor, which still applies — and the specification's F40 asks for no universal word quota. F40 is not implemented.",
        authority: Object.freeze({ propositionId: "OWNER_RULING_F40_ANSWER_SUFFICIENCY", scope: Object.freeze(["ALMIVISIBILITY", "F40"]) }),
        authorityRecord: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_OWNER_RULING_2026-10-02_F40_ANSWER_SUFFICIENCY.md", commit: "4761236e81f1fe6f0bd0d03172132d4109fcb36f", sha256: "3e1fbc5c36dd97bb3a7db5a72e38cc80d58310429ec84dacc2b620940b24f2ba" }),
        command: Object.freeze({ repo: "_handoffs", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-127_CLOSE_226_RECONCILE_DECISIONS_FINISH_IN_PROGRESS_ROWS.md", commit: "ab5aca48af3328dc1f20481f22d82b7bd26e0616", sha256: "523153c9623d986dbc8262e75ec7ceabb371f0d90f81a16348e2888da1effbf6" }),
      }),
    ]),
  }),
});
