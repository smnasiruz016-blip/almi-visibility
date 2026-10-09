/**
 * 🔴 F07 §5.6 · THE MANDATORY-READING MANIFEST — DECLARED (23 September 2026).
 *
 * The files a builder or a command must read: every CURRENT authority record the F05 register resolves, every
 * acceptance source the F-board pins, and the configuration the board and the authority loaders read. Checked by
 * src/governance/mandatory-reading.mjs against the loaders in BOTH directions — a missing required source and a
 * sealed or protected entry each turn the check RED. Generated from the loaders at corpus governance commit
 * 1429928b4813 (now 2026-09-24); regenerate after every corpus migration — the
 * check fails loudly until you do, which is the point.
 *
 * Paths only. No content of any listed file is copied here.
 */
export const BOARD_AND_AUTHORITY_CONFIG = Object.freeze(["config/fboard/acceptances.mjs","config/fboard/capabilities.mjs","config/fboard/crosswalk.mjs","config/fboard/f-board.mjs","config/authority/corpus.mjs","config/authority/inclusion.mjs","config/evidence-roles.mjs"]);
export const MANDATORY_READING = Object.freeze([
  Object.freeze({ repo: "engine", path: "config/authority/corpus.mjs", loader: "F-board configuration" }),
  Object.freeze({ repo: "engine", path: "config/authority/inclusion.mjs", loader: "F-board configuration" }),
  Object.freeze({ repo: "engine", path: "config/evidence-roles.mjs", loader: "F-board configuration" }),
  Object.freeze({ repo: "engine", path: "config/fboard/acceptances.mjs", loader: "F-board configuration" }),
  Object.freeze({ repo: "engine", path: "config/fboard/capabilities.mjs", loader: "F-board configuration" }),
  Object.freeze({ repo: "engine", path: "config/fboard/crosswalk.mjs", loader: "F-board configuration" }),
  Object.freeze({ repo: "engine", path: "config/fboard/f-board.mjs", loader: "F-board configuration" }),
  Object.freeze({ repo: "engine", path: "PASS_BOUNDARIES_AMENDMENT_1.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "engine", path: "PASS_BOUNDARIES_AMENDMENT_2.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "engine", path: "PASS_BOUNDARIES_AMENDMENT_3.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "engine", path: "PASS_BOUNDARIES_AMENDMENT_4.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "engine", path: "PASS_BOUNDARIES_AMENDMENT_5.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "engine", path: "PASS_BOUNDARIES_AMENDMENT_6.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "engine", path: "PASS_BOUNDARIES_AMENDMENT_7.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "engine", path: "PASS_BOUNDARIES_SOURCE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_BETA_G_RULING_9_AMBIGUOUS_2026-09-13_NIGHT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-19_ERROR_REGISTER_AND_PERSISTENCE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-19_ROW17_CLOSE_OR_HALT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-19_ROW9_CLOSE_OR_HALT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-19_SELECT_AND_CLOSE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-20_ROW6_CLOSE_OR_HALT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-20_ROW6_OWNER_INPUT_AND_CLOSE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-21_AMEND_ROW61_AND_RESUME_ROW6.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-21_ROW25_COMPLETE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-21_ROW4_COMPLETE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-21_ROW50_COMPLETE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-21_ROW50_OWNER_REOPEN_APPLIED.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-21_ROW6_DEMAND_RESEARCH_AND_CLOSE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-22_F05_CHAIN_PART3_REMEDIATION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-22_F05_CHAIN_PART4_OWNER_ANSWERS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-22_F05_CURRENT_AUTHORITY_REGISTER_CHAIN.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-22_F08_CONTRADICTORY_EVIDENCE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-22_ROW5_COMPLETE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-23_F07_COMPLETE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-23_F07_SINK_REPAIR.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-23_F08_COMPLETE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-24_BRANCH_DISPOSITION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-24_AUDIT_STORE_PRIMITIVES.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-24_F01_COMPLETE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-24_F02_POST_MERGE_PREREQUISITES.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-24_F02_TENANT_ISOLATION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-24_F06_COMPLETE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-24_F06_CORRECTION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-24_PRIMITIVES_AND_SESSION_SAVE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F02_DISPOSITION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F03_SUBJECT_ROOT_AND_CONNECTOR_REGISTRY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F03_CLOSE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F04_ROLES_PERMISSIONS_APPROVALS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F04_POST_MERGE_CLOSE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F09_CROSS_CLIENT_PORTABILITY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F09_OPTION_A_EXTERNAL_SUBJECT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F09_CLOSE_OUT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F10_COMPLETE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F10_DEPENDENCY_PREPARATION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F10_PREP_ROUND2.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F10_PREP_ROUND3.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-25_F07_NARROW_AMENDMENT_REISSUE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F07_AMENDMENT_1_POST_MERGE_CLOSE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_SHEET_SAFE_LABELS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_OWNER_SHEET.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_RA4_SAFE_LABELS_RULING.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_OWNER_INPUT_HOLD.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_OWNER_DECISION_GATE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_RESOLVE_GATE_AND_ADVANCE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_OWNER_DIRECTION_OF1_OF4.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_FREEZE_BUILD_SELECT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F07_AMENDMENT_2_MARKING_KEY_EVALUATOR.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F10_OWNER_DECISION_GATE_2026-09-26.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F10_OWNER_DECISIONS_STATUS_2026-09-26.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-26_RA4_SAFE_DISPLAY_LABELS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_RESUME_EXTERNAL_SEALED_KEY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-26_F10_STORAGE_S.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-26_F10_SCORER_ROUTE_AND_MISSING_OUTPUT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-26_F10_ALLOCATION_ADOPTED.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_OF4_AMENDMENT_1_DECIDED.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_PR165_CLOSE_AND_C7_AMENDMENT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-26_F10_C7_SCOPE_DECISION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_C7_BAR_APPROVAL_FREEZE_AND_IMPLEMENT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_F10_C7_COMPLETION_PATH.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_REPAIR_D_RECORDER_1_THEN_RESUME.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-26_168_MERGED_CONTINUE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-27_CONTINUE_F10_AFTER_169.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-27_POST_MERGE_170_STORAGE_S_BOUNDARY_THEN_SELECTION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-27_WITHDRAW_CI_SCOPE_PROCEED_UNDER_STORAGE_S.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-27_REPAIR_171_BEFORE_MERGE_PRESERVE_SEAL.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F01_FROZEN_ACCEPTANCE_2026-09-24.md", loader: "F-board acceptance F01" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F02_ACCEPTANCE_2026-09-24.md", loader: "authority register (CURRENT record) — the original F02 acceptance, amended by Amendment 1" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F02_ACCEPTANCE_AMENDMENT_1_2026-09-25.md", loader: "F-board acceptance F02" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F03_FROZEN_ACCEPTANCE_2026-09-25.md", loader: "F-board acceptance F03" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F04_ACCEPTANCE_2026-09-25.md", loader: "authority register (CURRENT record) — the original F04 acceptance, amended by Amendment 1" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F04_ACCEPTANCE_AMENDMENT_1_2026-09-25.md", loader: "F-board acceptance F04" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F09_ACCEPTANCE_2026-09-25.md", loader: "F-board acceptance F09" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F10_ACCEPTANCE_2026-09-26.md", loader: "authority register (CURRENT record) — the original F10 acceptance, amended by Amendment 1" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F10_ACCEPTANCE_AMENDMENT_1_2026-09-26.md", loader: "authority register (CURRENT record) — Amendment 1, amended by Amendment 2" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F10_ACCEPTANCE_AMENDMENT_2_2026-09-27.md", loader: "authority register (CURRENT record) — Amendment 2, amended by Amendment 3" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F10_ACCEPTANCE_AMENDMENT_3_2026-09-28.md", loader: "F-board acceptance F10" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-27_PR171_AUDIT_INCIDENT_RECONCILE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-27_FINISH_F10_ON_FROZEN_CONTRACT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-27_FINISH_F10_CONTINUE_AFTER_171_MERGE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-27_F10_REAL_HELDOUT_EVALUATION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_PRODUCT_DIRECTION_AND_REUSE_MEASUREMENT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_APPLY_BEST_PAGE_RECIPE_V3_TO_REUSE_CENSUS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-27_CORRECT_V3_ADOPTION_AND_RECOVER_F10.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-28_V3_ADOPTION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_STOP_F10_A3_PATH_RECONCILE_TWO_BOARDS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_61_89_ARTIFACT_TRANSFER_FEATURE_LISTS_NEXT_FEATURE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_COMPLETE_ROWS_WITH_WORK_ONE_BY_ONE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-28_SPECIFICATION_AMENDMENT_1_F90.md", loader: "authority register (CURRENT record) — Specification Amendment 1: F90, denominator 90" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F14_ACCEPTANCE_2026-09-28.md", loader: "authority register (CURRENT record) — F14 acceptance, frozen; F14 PAUSED by owner decision 2" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F19_ACCEPTANCE_2026-09-28.md", loader: "authority register (CURRENT record) — F19 acceptance, frozen; F19 PARKED pending the owner's GREEN for a live crawl" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F06_FROZEN_ACCEPTANCE_2026-09-24.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F07_FROZEN_ACCEPTANCE_2026-09-23.md", loader: "F-board acceptance F07" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F07_ACCEPTANCE_AMENDMENT_1_2026-09-25.md", loader: "authority register (CURRENT record) — Amendment 1, amended by Amendment 2" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F07_ACCEPTANCE_AMENDMENT_2_2026-09-26.md", loader: "authority register (CURRENT record) — Amendment 2, amended by Amendment 3" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F07_ACCEPTANCE_AMENDMENT_3_2026-09-26.md", loader: "F-board acceptance F07" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_FEATURE_MASTER_COMMAND_ROW1_2026-09-18.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_FEATURE_MASTER_COMMAND_ROW5_2026-09-18.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_FEATURE_MASTER_COMMAND_ROW9_2026-09-18.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_CLARIFICATION_2026-09-19_PRODUCT_PRIORITY_AND_ISOLATION_BOUNDARY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-09-19_ROW1_CLOSED_BLOCKED_PROVED.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-09-22_ROW50_PRODUCT_BOUNDARY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-09-24_F02_RELOCATE_SINGLE_CLIENT_TOOLS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-13_AMENDMENT_4_SCOPE_OPENS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-13_AMENDMENT_5_PORTABLE_PAGE_CONSTRUCTION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-19_ARTEFACT_PERSISTENCE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-19_COMMIT_MECHANISM_SCOPE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-19_D2_MIXED_LIMB_SPLIT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-19_U1_ROW1_COST_ISOLATION_SEMANTICS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-21_ROW4_CONJUNCTION_AND_REASONING.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-21_ROW50_LABEL_ON_FACE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-21_TENANT_RESOURCE_ATTACHMENTS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-22_BOARD_AUTHORITY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-22_F05_ACCEPTANCE.md", loader: "F-board acceptance F05" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-22_F08_ACCEPTANCE.md", loader: "F-board acceptance F08" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-22_F08_GOVERNED_WRITE_BOUNDARY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-22_HELDOUT_ROLE_SCOPE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-22_RETIRED_CONTAMINATED_HELDOUT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-23_F08_TARGET_AWARE_DURABILITY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-24_AUDIT_STORE_ONLY_PRIMITIVES.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-24_F02_RESOURCE_ATTACHMENTS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_A_2026-09-15_READ_ONLY_DEPLOY_KEY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULINGS_2026-09-14_ROWS_5_6_STATES.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-25_F04_ZERO_APPROVED_ACTION_POPULATION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-25_F02_DISPOSITION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_STATUS_SEMANTICS_RULING_RECORD_2026-09-18.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_ROW61_OWNER_DECISION_2026-09-15.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-13_SESSION_SAVE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-14_OPTION_A_SUBJECT_REGISTRY_LEAVES_THE_REPO.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-14_ROWS_5_6_INTENT_CLUSTERING_AXIS_DISCOVERY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-15_GAP1_UNGATED_WRITERS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-15_GAP3_ARCHIVE_CORPUS_OUT_ROW36.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-15_RENDERER_LIVE_ONCE_ON_MAIN.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-15_ROW25_PAGE_QUALITY_GATE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-15_ROW3_SEARCH_LANGUAGE_OWNED_HALF.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-15_ROW36_DCRW4_GUARD.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-15_ROW36_DESTRUCTIVE_GUARDS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-15_ROW4_LOCALIZED_THINKING.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_2026-09-15_ROW7_MARKET_MEASUREMENT_OWNED_HALF.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "CC_COMMAND_AMENDMENT_3_ROWS_59_60.md", loader: "authority register (CURRENT record)" }),
  /* RR-82 (28 Sep 2026): the corpus re-migrated at _handoffs b443e5e — the 17 sources the loaders now read and this manifest lacked, computed by manifestErrors (never typed from memory). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-76_PREBUILD_REVIEW_OWNER_ADDITION_GAP_G.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-76_PREBUILD_REVIEW_OWNER_ADDITION_GAP_H.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-76_PREBUILD_REVIEW_OWNER_CORRECTION_GAP_H_THREE_STATES.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-76_PREBUILD_REVIEW_THEN_COMPLETE_ROWS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-76_SAVE_AND_PAUSE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-78_RESOLVE_THE_PREBUILD_REVIEW_BEFORE_F77.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-79_ADDITION_5_THE_MISSING_DOCUMENT_NOW_AVAILABLE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-79_APPLY_THE_OWNERS_NEW_DIRECTION_ON_TOP_OF_RR-78.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-80_RESOLVE_AUTHORITY_AND_FINISH_THE_PREBUILD_SPECIFICATION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-81_CLOSE_THE_LIST_REVIEW_COMPLETE_F77_NEXT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-82_F77_POST_MERGE_CLOSEOUT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F07_ACCEPTANCE_AMENDMENT_4_2026-09-28.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F14_ACCEPTANCE_AMENDMENT_1_2026-09-28.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F77_ACCEPTANCE_2026-09-28.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F77_ACCEPTANCE_AMENDMENT_1_2026-09-28.md", loader: "F-board acceptance F77" }),
  /* RR-83 (28 Sep 2026): the F34 command, a CURRENT record after the corpus re-migration at _handoffs 53f74b4, and F34's frozen acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-28_RR-83_F34_REUSE_AND_COMPLETE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F34_ACCEPTANCE_2026-09-28.md", loader: "F-board acceptance F34" }),
  /* RR-84 (29 Sep 2026): the F33 command, a CURRENT record after the corpus re-migration at _handoffs 9dc9bc2, and F33's frozen acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-84_CLOSE_180_THEN_F33.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F33_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F33" }),
  /* RR-85 (29 Sep 2026): the F31 command, a CURRENT record after the corpus re-migration at _handoffs 3a8f7ba, and F31's frozen acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-85_F31_VERIFY_THE_EXISTING_PAGE_INVENTORY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F31_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F31" }),
  /* RR-86 (29 Sep 2026): the next-feature command, a CURRENT record after the corpus re-migration at _handoffs 804ebd1, and F21's frozen acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-86_NEXT_ALMIVISIBILITY_FEATURE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F21_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F21" }),
  /* RR-87 (29 Sep 2026): the standing continuous-build command, a CURRENT record after the corpus re-migration at _handoffs 2635153, and F36's frozen acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-87_CONTINUOUS_BUILD.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F36_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F36" }),
  /* RR-88 (29 Sep 2026): close #184, then F35 — a CURRENT record after the corpus re-migration at _handoffs da659bd, and F35's frozen acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-88_CLOSE_184_THEN_F35.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F35_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F35" }),
  /* RR-87 row 3 (29 Sep 2026): F32's frozen acceptance, a CURRENT record after the corpus re-migration at _handoffs 0d0f354. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F32_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F32" }),
  /* RR-89 (29 Sep 2026): owner direction, then the F35 MERGE repair — a CURRENT record after the corpus re-migration at _handoffs 2f010f3. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-89_OWNER_DIRECTION_THEN_REPAIR_F35_MERGE.md", loader: "authority register (CURRENT record)" }),
  /* RR-90 (29 Sep 2026): F39 — a CURRENT record after the corpus re-migration at _handoffs 90e798d, and F39's frozen acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-90_F39_NEXT_STANDALONE_FEATURE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F39_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F39" }),
  /* RR-87 continuous build (per RR-90's override), 29 Sep 2026: F41's frozen acceptance, a CURRENT record after the re-migration at _handoffs 454396e. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F41_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F41" }),
  /* RR-91 (29 Sep 2026, with its resumption): a CURRENT record after the re-migration at _handoffs 6c7627a, and F43's frozen acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-91_CLOSE_188_189_THEN_F43.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F43_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F43" }),
  /* RR-92 (29 Sep 2026): a CURRENT record after the re-migration at _handoffs 25c7f49, and F82's frozen acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-92_CONTINUE_THE_STANDALONE_PRODUCT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F82_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F82" }),
  /* RR-92, F48 (29 Sep 2026): its original acceptance (a CURRENT record) and Amendment 1 (the board's acceptance), after the re-migration at _handoffs 7f212cd. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F48_ACCEPTANCE_2026-09-29.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F48_ACCEPTANCE_AMENDMENT_1_2026-09-29.md", loader: "F-board acceptance F48" }),
  /* RR-93, F78 (29 Sep 2026): the command (a CURRENT record) and F78's acceptance, after the migration at _handoffs a1885de. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-93_CONTINUE_AFTER_21_90.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F78_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F78" }),
  /* RR-93, F79 (29 Sep 2026): its original acceptance (a CURRENT record) and Amendment 1 (the board's acceptance), after the migration at _handoffs 60dee9b. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F79_ACCEPTANCE_2026-09-29.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F79_ACCEPTANCE_AMENDMENT_1_2026-09-29.md", loader: "F-board acceptance F79" }),
  /* RR-93, F55 (29 Sep 2026): its acceptance, after the migration at _handoffs 7323446. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F55_ACCEPTANCE_2026-09-29.md", loader: "F-board acceptance F55" }),
  /* RR-94, F45 (30 Sep 2026): the command (a CURRENT record) and F45's acceptance, after the migration at _handoffs dcb9fbb. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-29_RR-94_CONTINUE_FROM_23_90.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F45_ACCEPTANCE_2026-09-30.md", loader: "F-board acceptance F45" }),
  /* RR-95, F26 (30 Sep 2026): the command (a CURRENT record) and F26's acceptance, after the migration at _handoffs b1a94e7. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-95_CLOSE_F45_CONTINUE_F26.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F26_ACCEPTANCE_2026-09-30.md", loader: "F-board acceptance F26" }),
  /* RR-96, F46 (30 Sep 2026): the command (a CURRENT record) and F46's acceptance, after the migration at _handoffs 2e76216. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-96_CLOSE_197_CONTINUE_F46.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F46_ACCEPTANCE_2026-09-30.md", loader: "F-board acceptance F46" }),
  /* RR-96 continuous build, F47 (30 Sep 2026): its acceptance, after the migration at _handoffs ccd4c1e. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F47_ACCEPTANCE_2026-09-30.md", loader: "F-board acceptance F47" }),
  /* RR-96 continuous build, F20 (30 Sep 2026): its acceptance, after the migration at _handoffs f566059. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F20_ACCEPTANCE_2026-09-30.md", loader: "F-board acceptance F20" }),
  /* RR-96 continuous build, F29 (30 Sep 2026): its acceptance, after the migration at _handoffs c8eee0c. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F29_ACCEPTANCE_2026-09-30.md", loader: "F-board acceptance F29" }),
  /* RR-97, F73 (30 Sep 2026): the command (a CURRENT record) and F73's acceptance, after the migration at _handoffs 366476c. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-97_CONTINUE_FROM_29_90_ASSESS_F73.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F73_ACCEPTANCE_2026-09-30.md", loader: "F-board acceptance F73" }),
  /* RR-98 to RR-101 (30 Sep 2026): commands recorded after the last migration, admitted as CURRENT records by the migration at _handoffs c3c0cbe. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-98_REPAIR_THREE_REFERENCES_THEN_NEXT_ROW.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-99_CONTINUE_FROM_30_90_AFTER_203.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-100_REPAIR_F90_PREREQUISITE_THEN_CONTINUE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-101_SAVE_AND_PAUSE.md", loader: "authority register (CURRENT record)" }),
  /* RR-102 §2 (30 Sep 2026): the owner's page-planning decision — direction only; no row, no board movement. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-09-30_RR-102_PAGE_PLANNING_THREE_NUMBERS.md", loader: "authority register (CURRENT record)" }),
  /* RR-102, F90 (30 Sep 2026): the command (a CURRENT record) and F90's acceptance, after the migration at _handoffs c3c0cbe. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-102_FINISH_F90_PREREQUISITE_RECORD_PAGE_PLANNING.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F90_ACCEPTANCE_2026-09-30.md", loader: "F-board acceptance F90" }),
  /* RR-103, F75 (30 Sep 2026): the command (a CURRENT record) and F75's acceptance, after the migration at _handoffs 01275a9. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-103_CLOSE_F90_ADD_PAGE_OPPORTUNITY_ROW_THEN_CONTINUE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F75_ACCEPTANCE_2026-09-30.md", loader: "F-board acceptance F75" }),
  /* RR-104 to RR-110 (30 Sep - 1 Oct 2026): seven commands admitted CURRENT by the migration at _handoffs d3c8e79 (RR-111). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-104_IMPROVE_THE_COLLECTOR_PREPARE_ONE_BOUNDED_COLLECTION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-105_GREEN_RUN_THE_ONE_BOUNDED_COLLECTION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-09-30_RR-106_RR-105_FAILURE_REPAIR_ONLY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-107_RUN_THE_ONE_BOUNDED_COLLECTION_UNDER_THE_FRESH_GREEN.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-108_REPAIR_THE_PACER_CLASSIFY_THE_KEPT_EVIDENCE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-109_213_MERGED_VERIFY_EVERY_GATE_BEFORE_ANY_NEW_COLLECTION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-110_PAUSE_THE_CRAWL_LOOP_CONTINUE_BUILDING.md", loader: "authority register (CURRENT record)" }),
  /* RR-111, F23 (1 Oct 2026): the command, the owner's every-limb refinement (both CURRENT records) and F23's acceptance, after the migration at _handoffs d3c8e79. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-111_BUILD_F23_FROM_RECORDED_DATA.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-10-01_RR-111_EVERY_LIMB_RULE_REFINEMENT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F23_ACCEPTANCE_2026-10-01.md", loader: "F-board acceptance F23" }),
  /* RR-111 §5 and §9, F27 (1 Oct 2026): F23's open owner decision (a CURRENT record), and F27's acceptance and its amendment, after the migration at _handoffs 93fa696. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OPEN_OWNER_DECISION_2026-10-01_RR-111_F23_EXCESSIVE_AND_WEAK_LINKS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F27_ACCEPTANCE_2026-10-01.md", loader: "F-board acceptance F27" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F27_ACCEPTANCE_AMENDMENT_1_2026-10-01.md", loader: "F-board acceptance F27" }),
  /* RR-112 and RR-113 (1 Oct 2026): eight records admitted CURRENT by the migration at _handoffs 2048dd3 — the two commands, the F87 and F27 open decisions, the RR-112 decision list, F87's acceptance and amendment, and F91's acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-112_RESOLVE_THE_F27_HEADER_CONTRADICTION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-113_CLOSE_RR-112_BUILD_THE_F91_PAGE_PLANNER.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OPEN_OWNER_DECISION_2026-10-01_RR-111_F27_HEADERS_AND_PUBLIC_EXPOSURE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OPEN_OWNER_DECISION_2026-10-01_RR-111_F87_SCOPE_OF_OPERATIONAL_MONITORING.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_RR-112_OUTSTANDING_OWNER_DECISIONS_2026-10-01.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F87_ACCEPTANCE_2026-10-01.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F87_ACCEPTANCE_AMENDMENT_1_2026-10-01.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F91_ACCEPTANCE_2026-10-01.md", loader: "F-board acceptance F91" }),
  /* RR-113 §9, F44 (1 Oct 2026): F44's acceptance, after the migration at _handoffs eecdfe4. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F44_ACCEPTANCE_2026-10-01.md", loader: "F-board acceptance F44" }),
  /* RR-114, F16 (1 Oct 2026): the command (a CURRENT record) and F16's acceptance, after the migration at _handoffs 29a7c2c. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-114_BUILD_THE_PUBLIC_QUESTION_RESEARCH_INTAKE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F16_ACCEPTANCE_2026-10-01.md", loader: "F-board acceptance F16" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_CLARIFICATION_2026-09-28_RR-76_TEST_ONLY_PERMISSION_IS_GENERAL.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-09-28_RR-80_F07_A_LIMIT_IS_NOT_A_PERMISSION.md", loader: "authority register (CURRENT record)" }),
  /* RR-127 (2 Oct 2026): the fourteen CURRENT records admitted by the migration at _handoffs 4761236 — commands RR-115 to RR-127 and the
   * owner ruling on F40. The RR-120 decision record was also admitted but resolves INVALID (no issuer), so it is not required here. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-115_PREPARE_ONE_REAL_PUBLIC_QUESTION_SAMPLE_FOR_F16.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-116_CORRECT_RR-115_BUILD_A_GOVERNED_HUMAN_OBSERVATION_PATH.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-117_VERIFY_219_MERGE_THEN_PROVE_PRODUCT_NEUTRALITY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-118_BUILD_THE_PRODUCT_NEUTRAL_SOURCE_ADAPTER_BOUNDARY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-119_CLOSE_221_READ_PRIMARY_TERMS_FINISH_ONE_ADAPTER.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-120_READ_TWO_PUBLIC_TERMS_FINISH_OR_PARK_ADAPTER.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-121_VERIFY_REAL_API_SHAPE_PREPARE_ONE_PILOT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-122_VERIFY_224_MERGE_CORRECT_THE_PILOT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-123_THE_PILOTS_SUBJECT_WAS_WRONG_CORRECT_IT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-124_FIND_A_REAL_RELEVANT_PUBLIC_QUESTION_SAMPLE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-125_CORRECT_RR124_ADD_TRUTHFUL_AGENT_OBSERVER_ROUTE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-126_VERIFY_225_RECORD_PAGE_DIRECTION_CONTINUE_F16.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-01_RR-127_CLOSE_226_RECONCILE_DECISIONS_FINISH_IN_PROGRESS_ROWS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-10-02_F40_ANSWER_SUFFICIENCY.md", loader: "authority register (CURRENT record)" }),
  /* RR-129 (2 Oct 2026): the four CURRENT records admitted by the migration at _handoffs da11ed5 — commands RR-128 and RR-129, the owner's
   * page law and its Amendment 1. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-128_RECORD_THE_OWNERS_PAGE_LAW.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-129_BUILD_FROM_MERGED_227_NO_MORE_SURVEYS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-10-02_PAGE_LAW.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-10-02_PAGE_LAW_AMENDMENT_1.md", loader: "authority register (CURRENT record)" }),
  /* RR-129 §3, F27 (2 Oct 2026): F27's Acceptance Amendment 2, after the migration at _handoffs 258141f. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F27_ACCEPTANCE_AMENDMENT_2_2026-10-02.md", loader: "F-board acceptance F27" }),
  /* RR-130 (2 Oct 2026): the two CURRENT records admitted by the migration at _handoffs 4ef1b9c — command RR-130 and F91's Acceptance
   * Amendment 1. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-130_WATCHMAN_SCOPE_THEN_F91_THREE_COUNT_PLANNER.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F91_ACCEPTANCE_AMENDMENT_1_2026-10-02.md", loader: "F-board acceptance F91" }),
  /* RR-131 (2 Oct 2026): the two CURRENT records admitted by the migration at _handoffs 0ca24d3 — command RR-131 and F13's acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-131_STOP_PREPARING_FINISH_ROWS_ONE_AT_A_TIME.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F13_ACCEPTANCE_2026-10-02.md", loader: "F-board acceptance F13" }),
  /* RR-132 (2 Oct 2026): the two CURRENT records admitted by the migration at _handoffs ae4834b — command RR-132 and F81's acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-132_CONFIRM_33_PREPARE_F81_HONESTLY_KEEP_CLOSING_ROWS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F81_ACCEPTANCE_2026-10-02.md", loader: "F-board acceptance F81" }),
  /* RR-135 (2 Oct 2026): the three CURRENT records admitted by the migration at _handoffs 34fff79 — commands RR-133, RR-134 and RR-135. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-133_CLOSE_235_TAKE_F19_TO_ITS_REAL_PASS_GATE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-134_STANDING_CONTINUATION_WHILE_THE_OWNER_RESTS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-135_GENERIC_CRAWLER_DATA_CI_F19_BY_REAL_RUNS.md", loader: "authority register (CURRENT record)" }),
  /* RR-137 (2 Oct 2026): the two CURRENT records admitted by the migration at _handoffs e4d1986 — command RR-137 and F22's acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-137_RESOLVE_THE_RULE_TEXT_THEN_KEEP_BUILDING.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F22_ACCEPTANCE_2026-10-02.md", loader: "F-board acceptance F22" }),
  /* RR-137 §4 (2 Oct 2026): the one CURRENT record admitted by the migration at _handoffs a23d374 — F25's acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F25_ACCEPTANCE_2026-10-02.md", loader: "F-board acceptance F25" }),
  /* RR-144 (3 Oct 2026): of the CURRENT records the migration at _handoffs 24cd44f admitted, the two F25's movement stands on — command
   * RR-144 and F25's Acceptance Amendment 1 (the owner's declaration it quotes, 12ecf91, matches no inclusion rule and is read through it). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-144_OWNER_GREEN_COMPLETE_F25_NOW.md", loader: "authority register (CURRENT record)" }),
  /* the other CURRENT records the same migration admitted — every CURRENT record is required reading (P20–P22); found missing by the full
   * suite on cb4588f, not by me before it */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-02_RR-138_FINISH_F22_F25_KEEP_F27_F30_MOVING.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-139_OWNER_GREEN_FOR_THE_RENDER_RUN.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-140_CONTINUE_AUTONOMOUSLY_AND_COMPLETE_FEATURES.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-141_COMPLETE_F25_ONLY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-142_FRESH_WINDOW_COMPLETE_F25_ONLY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-143_F25_ONLY_REPLACE_THE_IMPOSSIBLE_RENDER_PLAN.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F30_ACCEPTANCE_2026-10-03.md", loader: "authority register (CURRENT record)" }),
  /* RR-145 (3 Oct 2026): the two CURRENT records admitted by the migration at _handoffs dd91e92 — command RR-145 and the owner's
   * product-scope decision, the authority Board Amendment 1 (config/fboard/required-path.mjs) is pinned to. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-145_OWNER_PRODUCT_SCOPE_CORRECTION_F25_LEAVES_THE_REQUIRED_PATH.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-03_RR-145_PRODUCT_SCOPE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F25_ACCEPTANCE_AMENDMENT_1_2026-10-03.md", loader: "F-board acceptance F25" }),
  /* RR-148 (3 Oct 2026): the five records admitted by the migration at _handoffs a5ec9f1 — RR-146's command and its owner addendum (no
   * migration ran in RR-146 or RR-147), the RR-147 and RR-148 commands, and F62's acceptance. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-146_BUILD_PRODUCT_LED_QUESTION_RESEARCH_F16_ONLY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-146_OWNER_ADDENDUM_PRODUCT_APPLICABILITY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-147_FRESH_WINDOW_VERIFY_PRESERVE_REPORT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-148_ONE_FEATURE_PRODUCT_APPLICABILITY.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F62_ACCEPTANCE_2026-10-03.md", loader: "F-board acceptance F62" }),
  /* RR-152 (3 Oct 2026): the five CURRENT records admitted by the migration at _handoffs 1c5f103 — commands RR-149, RR-150, RR-151
   * (superseded by RR-152 as a round; recorded at _handoffs 618e1b4, the register holds no whole-command supersession) and RR-152, and the
   * owner's sameness decision, the declared grouping value. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-149_F62_ONLY_DERIVE_THE_REAL_INPUT_PATH.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-150_F62_ONLY_BUILD_THE_EVIDENCE_TO_VERDICT_PATH.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-151_CORRECT_THE_FALSE_HUMAN_CHECKER_RECORD.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-152_ONE_FEATURE_THE_MISSING_PLANNING_DEMAND_WRITER.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-03_RR-152_SAMENESS_RULE.md", loader: "authority register (CURRENT record)" }),
  /* RR-153 (4 Oct 2026): the three CURRENT records admitted by the migration at _handoffs fff60df — command RR-153, the owner's decisions of
   * 4 October, and F91's Acceptance Amendment 2. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-153_GIVE_F91_ITS_MISSING_WRITER_AND_BUILD_IT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-153_ANSWER_SOURCE_AND_PRESENTATION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F91_ACCEPTANCE_AMENDMENT_2_2026-10-04.md", loader: "F-board acceptance F91" }),
  /* RR-153 timing correction (3 Oct 2026): the four CURRENT records admitted by the migration at _handoffs b91ef2a — RR-153 revision 2, the
   * owner's two-leg source rule, the timing-correction command, and the owner's DATE CORRECTION (the 4 October date was beta-g's error). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-153_REVISION_2_GIVE_F91_ITS_MISSING_WRITER_AND_BUILD_IT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-153_REVISION_2_SOURCE_RULE_TWO_LEGS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-153_TIMING_CORRECTION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-03_RR-153_DATE_CORRECTION.md", loader: "authority register (CURRENT record)" }),
  /* RR-154 (3 Oct 2026): the three CURRENT records admitted by the migration at _handoffs 3dba784 — command RR-154, the owner's ruling on
   * datasets and page count, and his Stack Exchange source decision (it replaces RR-120's record, which stays INVALID: ISSUER_UNDECLARED). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-03_RR-154.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-10-03_RR-154_DATASETS_AND_PAGE_COUNT.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-03_RR-154_STACK_EXCHANGE_SOURCE.md", loader: "authority register (CURRENT record)" }),
  /* RR-155 (4 Oct 2026): the three CURRENT records admitted by the migration at _handoffs a03a11f — command RR-155, F16's Acceptance
   * Amendment 1 (collection as a separate, separately-gated limb), and the owner's values declaring that client as a subject. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-155.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F16_ACCEPTANCE_AMENDMENT_1_2026-10-04.md", loader: "F-board acceptance F16" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-155_LAMZISH_SUBJECT.md", loader: "authority register (CURRENT record)" }),
  /* RR-156 (4 Oct 2026): the two CURRENT records admitted by the migration at _handoffs 9fb9bb4 — command RR-156 and the owner's declaration
   * of what that client is (its eight services are its dimensions; origin country is audience context). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-156.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-156_LAMZISH_PRODUCT_DECLARATION.md", loader: "authority register (CURRENT record)" }),
  /* RR-157 (4 Oct 2026): the three CURRENT records admitted by the migration at _handoffs 8a37495 — the owner's correction RR-157, F16's
   * Acceptance Amendment 2 (meaning on the original post; question source is not answer source), and his ruling recorded verbatim. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-157.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F16_ACCEPTANCE_AMENDMENT_2_2026-10-04.md", loader: "F-board acceptance F16" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-157_MEANING_NOT_LABELS_AND_TWO_KINDS_OF_SOURCE.md", loader: "authority register (CURRENT record)" }),
  /* RR-159 (4 Oct 2026): the four CURRENT records admitted by the migration at _handoffs 08cbd0c — the owner's save-and-stand-down command (not
   * migrated in its own round), the RR-159 command, his answers to Q1–Q3, and F16's Acceptance Amendment 3 (the client's own AI connection). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_SAVE_AND_STAND_DOWN.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-159.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F16_ACCEPTANCE_AMENDMENT_3_2026-10-04.md", loader: "F-board acceptance F16" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-159_Q1_Q2_Q3_ANSWERS.md", loader: "authority register (CURRENT record)" }),
  /* RR-188 (6 Oct 2026): the one CURRENT record admitted by the migration at _handoffs fc3555d — F41's Acceptance Amendment 2 (REV2: a
   * preview only on a full F40 PASS for the same subject and contentSha256), approved by its hash. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F41_ACCEPTANCE_AMENDMENT_2_2026-10-06.md", loader: "F-board acceptance F41" }),
  /* RR-192 (6 Oct 2026): the CURRENT record admitted by the migration at _handoffs 69fa57d — F39's Acceptance Amendment 1. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F39_ACCEPTANCE_AMENDMENT_1_2026-10-06.md", loader: "F-board acceptance F39" }),
  /* RR-192 (6 Oct 2026): the four CURRENT records admitted by the migration at _handoffs 3317b25 — the owner's PG-A1 ruling (Page Generator
   * FINAL v2 Amendment 1, b5b616e), the RR-192 command, the owner's decisions (F32 A1 REV2, F39 A1 and PG-A1 approved by hash; R6a scope), and
   * F32's Acceptance Amendment 1. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-10-06_PG-A1_PAGE_GENERATOR_AMENDMENT_1.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-06_RR-192.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-06_RR-192_APPROVE_F32_A1_REV2_F39_A1_PG-A1.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F32_ACCEPTANCE_AMENDMENT_1_2026-10-06.md", loader: "F-board acceptance F32" }),
  /* RR-243 (9 Oct 2026): the three CURRENT records admitted by the migration at _handoffs d2bfd22 — the T1 and T2 tenant consent records
   * (RR-239, admitted by the RR-233 tenant-consent-record rule) and F78's Acceptance Amendment 1. The RR-241 approval and command record,
   * the RR-242 report and every RR-238..RR-240 record are named without an admitted token, so the register does not admit them. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_TENANT_CONSENT_T1_2026-10-08.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_TENANT_CONSENT_T2_2026-10-09.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F78_ACCEPTANCE_AMENDMENT_1_2026-10-09.md", loader: "F-board acceptance F78 (Amendment 1)" }),
  /* RR-229 (8 Oct 2026): the one CURRENT record admitted by the migration at _handoffs 51e28c8 — the RR-229 (REV2) command. Its step-0
   * gate report and the RR-228 records are named without an admitted token, so the register does not admit them. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-08_RR-229.md", loader: "authority register (CURRENT record)" }),
  /* RR-227 (8 Oct 2026): the two CURRENT records admitted by the migration at _handoffs b6b3382 — the RR-227 command and F19's Acceptance
   * Amendment 1. The owner's approval by hash is named without RULING or DECISION (RR-226), so the register does not admit it. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-08_RR-227.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F19_ACCEPTANCE_AMENDMENT_1_2026-10-08.md", loader: "F-board acceptance F19 (Amendment 1)" }),
  /* RR-225 (8 Oct 2026): the three CURRENT records admitted by the migration at _handoffs fb0613a — the RR-225 command, the owner's
   * approval of F02's Acceptance Amendment 2 by its hash, and that amendment. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-08_RR-225.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-08_RR-225_APPROVE_F02_AMENDMENT_2.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F02_ACCEPTANCE_AMENDMENT_2_2026-10-08.md", loader: "F-board acceptance F02 (Amendment 2)" }),
  /* RR-223 (8 Oct 2026): the four CURRENT records admitted by the migration at _handoffs 7805047 — the RR-217 command (RR-216's
   * continuation, first admitted here), the RR-223 command, the owner's approval of F31's Acceptance Amendment 1 by its hash, and that
   * amendment. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-08_RR-217.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-08_RR-223.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-08_RR-223_APPROVE_F31_AMENDMENT_1.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F31_ACCEPTANCE_AMENDMENT_1_2026-10-08.md", loader: "F-board acceptance F31 (Amendment 1)" }),
  /* RR-216 (8 Oct 2026): the three CURRENT records admitted by the migration at _handoffs 06cdb82 — the RR-216 command, the owner's
   * approval of F92's acceptance by its hash, and F92's first Acceptance (image and video visibility). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-08_RR-216.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-08_RR-216_APPROVE_F92_ACCEPTANCE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F92_ACCEPTANCE_2026-10-08.md", loader: "F-board acceptance F92" }),
  /* RR-214 (8 Oct 2026): the four CURRENT records admitted by the migration at _handoffs 4938f07 — the owner's ruling raising the audit
   * store's reported ceiling to 32 MiB (f11a415, RR-212), the RR-214 command, the owner's approval of F93's acceptance by its hash, and
   * F93's first Acceptance (trust and identity signals). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-10-08_AUDIT_STORE_CEILING_32MiB.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-08_RR-214.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-08_RR-214_APPROVE_F93_ACCEPTANCE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F93_ACCEPTANCE_2026-10-08.md", loader: "F-board acceptance F93" }),
  /* RR-210 (7 Oct 2026): the three CURRENT records admitted by the migration at _handoffs 96ae49e — the RR-210 command, the owner's
   * approval of F38's acceptance by its hash, and F38's first Acceptance (answer-first, titles and meta descriptions). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-07_RR-210.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-07_RR-210_APPROVE_F38_ACCEPTANCE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F38_ACCEPTANCE_2026-10-07.md", loader: "F-board acceptance F38" }),
  /* RR-208 (7 Oct 2026): the three CURRENT records admitted by the migration at _handoffs f9edf2a — the RR-208 command, the owner's
   * approval of F37's Acceptance Amendment 2 by its hash, and F37's Acceptance Amendment 2 (internal links and URL from F94's plan). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-07_RR-208.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-07_RR-208_APPROVE_F37_AMENDMENT_2.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F37_ACCEPTANCE_AMENDMENT_2_2026-10-07.md", loader: "F-board acceptance F37" }),
  /* RR-206 (7 Oct 2026): the three CURRENT records admitted by the migration at _handoffs 959ae05 — the RR-206 command, the owner's
   * approval of F94's acceptance (REV2) by its hash, and F94's first Acceptance (the site architecture and internal-linking plan). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-07_RR-206.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-07_RR-206_APPROVE_F94_ACCEPTANCE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F94_ACCEPTANCE_2026-10-07.md", loader: "F-board acceptance F94" }),
  /* RR-188 (6 Oct 2026): the three CURRENT records admitted by the migration at _handoffs e51b27f — the RR-188 command, the owner's
   * decisions (F40 A1 and F41 A2 REV2 approved by hash; one round; policy A; strict subject match), and F40's Acceptance Amendment 1. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-06_RR-188.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-06_RR-188_APPROVE_F40_A1_F41_A2_REV2.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F40_ACCEPTANCE_AMENDMENT_1_2026-10-06.md", loader: "F-board acceptance F40" }),
  /* RR-186 (6 Oct 2026): the three CURRENT records admitted by the migration at _handoffs 998ef05 — the RR-186 command, the owner's
   * decisions (F37 Amendment 1 approved by its hash; F41 A2 deferred to R5c; policy A), and F37's Acceptance Amendment 1 (each claim once). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-06_RR-186.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-06_RR-186_APPROVE_F37_AMENDMENT_1_POLICY_A.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F37_ACCEPTANCE_AMENDMENT_1_2026-10-06.md", loader: "F-board acceptance F37" }),
  /* RR-184 (6 Oct 2026): the three CURRENT records admitted by the migration at _handoffs 6d64c27 — the RR-184 command, the owner's
   * approval of F40's acceptance by its hash (with I-1 to I-6), and F40's first Acceptance (the quality judgements), approved by its hash. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-06_RR-184.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-06_RR-184_APPROVE_F40_ACCEPTANCE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F40_ACCEPTANCE_2026-10-06.md", loader: "F-board acceptance F40" }),
  /* RR-182 §2–§3 (6 Oct 2026): the three CURRENT records admitted by the migration at _handoffs 7acd99c — the RR-182 command, the owner's
   * approval of Specification Amendment 5, and Specification Amendment 5 itself (the approved draft, byte-identical: F92–F96 added; F17,
   * F38, F58, F62, F76 and F81 each extended by one sentence). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-06_RR-182.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-06_RR-182_APPROVE_SPECIFICATION_AMENDMENT_5.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_RULING_2026-10-06_SPECIFICATION_AMENDMENT_5.md", loader: "authority register (CURRENT record) — Specification Amendment 5" }),
  /* RR-180 §4 (5 Oct 2026): the three CURRENT records admitted by the migration at _handoffs 9516f2c — the RR-180 command, the owner's
   * RR-180 rulings on the R4 findings, and F37's first Acceptance (the complete-draft render), approved by its hash. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-05_RR-180.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-05_RR-180_R4B_RULINGS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F37_ACCEPTANCE_2026-10-05.md", loader: "F-board acceptance F37" }),
  /* RR-179 §4.3 (5 Oct 2026): the one CURRENT record admitted by the migration at _handoffs d014ca1 — the owner's record B, the lone-page
   * rule at F36's site (why-this-url.mjs l.123–126), approved as written in 76d6a99. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-05_RR-179_RECORD_B_LONE_PAGE_AT_F36.md", loader: "authority register (CURRENT record)" }),
  /* RR-179 §4.2 (5 Oct 2026): the one CURRENT record admitted by the migration at _handoffs be0ec9d — F41's Acceptance Amendment 1 (C1 as
   * amended under D5, C8 the tier and the grouped need), approved by its hash. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F41_ACCEPTANCE_AMENDMENT_1_2026-10-05.md", loader: "F-board acceptance F41" }),
  /* RR-179 §4.1 (5 Oct 2026): the five CURRENT records admitted by the migration at _handoffs 0abcd15 — the owner's RR-177 ruling (the 27
   * existing pages of the first connected product SET ASIDE), the RR-178 and RR-179 commands, the owner's RR-179 rulings on the RR-178 findings, and F91's
   * Acceptance Amendment 4 (C19, the spec compiler), approved by its hash. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-05_RR-177_27_PAGES_SET_ASIDE.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-05_RR-178.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-05_RR-179.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-05_RR-179_R4_RULINGS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F91_ACCEPTANCE_AMENDMENT_4_2026-10-05.md", loader: "F-board acceptance F91" }),
  /* RR-174 §4.2 (5 Oct 2026): the one CURRENT record admitted by the migration at _handoffs 348f029 — F34's Acceptance Amendment 1 (C7,
   * the explicit MONITOR mapping M1–M6), approved by its hash. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F34_ACCEPTANCE_AMENDMENT_1_2026-10-05.md", loader: "F-board acceptance F34" }),
  /* RR-174 §4.1 (5 Oct 2026): the four CURRENT records admitted by the migration at _handoffs dcddcb0 — the RR-173 command, the RR-174
   * command, the owner's RR-174 rulings on the R3 choices, and F35's Acceptance Amendment 1, approved by its hash. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-05_RR-173.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-05_RR-174.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-05_RR-174_R3_RULINGS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F35_ACCEPTANCE_AMENDMENT_1_2026-10-05.md", loader: "F-board acceptance F35" }),
  /* RR-172 §4.2 (5 Oct 2026): the one CURRENT record admitted by the migration at _handoffs 6ecc99f — F33's Acceptance Amendment 1 (C8,
   * coverage for a grouped need), approved by its hash. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F33_ACCEPTANCE_AMENDMENT_1_2026-10-05.md", loader: "F-board acceptance F33" }),
  /* RR-172 §4.1 (5 Oct 2026): the four CURRENT records admitted by the migration at _handoffs b8a4ea5 — the owner's RR-171 rulings on the R1
   * findings, the RR-172 command, his RR-172 rulings on F33's coverage, and F91's Acceptance Amendment 3 (C13–C18), approved by its hash. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-05_RR-172.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F91_ACCEPTANCE_AMENDMENT_3_2026-10-05.md", loader: "F-board acceptance F91" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-05_RR-171_RULINGS_ON_R1_FINDINGS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-05_RR-172_F33_COVERAGE_RULINGS.md", loader: "authority register (CURRENT record)" }),
  /* RR-170 (5 Oct 2026): the ten CURRENT records admitted by the migration at _handoffs 91ef421 — the RR-162, RR-162 continued (v2), RR-163
   * and RR-170 commands; F16's Acceptance Amendment 5 (research-derived questions, C27–C32), approved by its hash; the owner's RR-162 and
   * RR-163 decisions; and his RR-170 issue of RTP-1 Revision 6 with Correction 1. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-162.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-162_CONTINUED_V2.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-163.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-05_RR-170.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F16_ACCEPTANCE_AMENDMENT_5_2026-10-05.md", loader: "F-board acceptance F16" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-162_FOUR_FINAL_DECISIONS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-162_RESEARCH_DERIVED_QUESTIONS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-163_A2_SEVEN_CORRECTIONS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-163_FIVE_SETTLED_RULINGS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-05_RR-170_ISSUE_RTP-1_REV6.md", loader: "authority register (CURRENT record)" }),
  /* RR-161 (4 Oct 2026): the six CURRENT records admitted by the migration at _handoffs 9321cd8 — the RR-160 and RR-161 commands, F16's
   * Acceptance Amendment 4 (the one adapter; the hard budget cap), and the owner's three RR-161 rulings: the issued provider record, the
   * downloadable version (option 5 plus 1), and the client-received-questions direction. */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-160.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-161.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_F16_ACCEPTANCE_AMENDMENT_4_2026-10-04.md", loader: "F-board acceptance F16" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-161_ANTHROPIC_PROVIDER_RECORD.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-161_CLIENT_RECEIVED_QUESTIONS_DIRECTION.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-161_DOWNLOADABLE_VERSION_OPTION_5_AND_1.md", loader: "authority register (CURRENT record)" }),
  /* RR-158 (4 Oct 2026): the three CURRENT records admitted by the migration at _handoffs b36244f — the owner's correction RR-158, his GREEN
   * for the terms reads, and his direction (discovery from the product, leads only; answers from the body that owns the fact). */
  Object.freeze({ repo: "governance", path: "AlmiVisibility_CC_COMMAND_2026-10-04_RR-158.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-158_GREEN_TERMS_READS.md", loader: "authority register (CURRENT record)" }),
  Object.freeze({ repo: "governance", path: "AlmiVisibility_OWNER_DECISION_2026-10-04_RR-158_GOOGLE_LED_DISCOVERY_AND_ANSWER_SOURCES.md", loader: "authority register (CURRENT record)" }),
]);
