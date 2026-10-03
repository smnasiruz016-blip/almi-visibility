/**
 * 🔴 F04 · THE AUTHORISATION DECLARATIONS — who may do what, over which scope and resource class, with which approval.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F04_ACCEPTANCE_2026-09-25.md (b439309, contract 2a2a98bf…).
 *
 * Read by ONE decision (src/governance/authorisation.mjs); nothing else interprets this file.
 *
 * ── WHAT IS DECLARED HERE, AND WHAT IS NOT ────────────────────────────────────────────────────────────────────────────
 *   ACTORS       stable references and their CLASS (clarification 1) and roles. A reference is a role handle, never a
 *                person's name, an email, a credential or any protected identity datum (L5). A class never implies a
 *                permission (clarification 2): every permission comes from a role below.
 *   PERMISSIONS  one entry per (role, family, resource class, scope type): ALLOW or DENY, with an optional expiry and
 *                revocation. A permission grants only its family over its resource class and scope type (clarification
 *                7). DENY overrides ALLOW (clarification 8).
 *   ACTIONS      every governed action the engine performs, by its stable id, with its family and resource class. An
 *                action that is not here is UNSUPPORTED and refuses — never classified by guessing.
 *   FAMILY_RULES which families need a HUMAN approval recorded in the approval registry (config/governance/approvals.mjs),
 *                with separation of duties: the executor of an action is never its approver (clarification 17).
 *
 *   NOT HERE: tenant or subject scope (F02 decides it — clarification 5), resource resolution (F03 — clarification 6),
 *   current authority (F05). A role name carries no scope; a permission name carries no resource.
 *
 * Generic: this file names no client, host, tenant id or subject.
 */

export const ACTOR_CLASSES = Object.freeze(["HUMAN", "SERVICE", "AUTOMATION", "MODEL", "SYSTEM"]);

/**
 * The action FAMILIES — what an action does to the world. PUBLISH and CONNECTED_PROPERTY_CHANGE are declared with no
 * action: the engine has no such code path today (their real population is EMPTY, reported, not manufactured).
 */
export const FAMILIES = Object.freeze([
  "RESEARCH", "GOVERNED_STATE", "CONTENT_BUILD", "EVIDENCE_STATE_CHANGE", "DECLARATION_CHANGE", "AUTHORITY_CHANGE",
  "BOARD_CHANGE", "AUDIT_RECORD", "EVALUATION", "VERIFICATION", "APPROVAL", "EXPORT", "SPEND", "PUBLISH",
  "CONNECTED_PROPERTY_CHANGE", "MERGE",
]);

/** Families whose action needs a recorded HUMAN approval (clarification 12 and the frozen FAILURE clause), with separation. */
export const FAMILY_RULES = Object.freeze({
  VERIFICATION: Object.freeze({ approval: "REQUIRED", approverClass: "HUMAN", separation: true }),
  EXPORT: Object.freeze({ approval: "REQUIRED", approverClass: "HUMAN", separation: true }),
  SPEND: Object.freeze({ approval: "REQUIRED", approverClass: "HUMAN", separation: true }),
  PUBLISH: Object.freeze({ approval: "REQUIRED", approverClass: "HUMAN", separation: true }),
  CONNECTED_PROPERTY_CHANGE: Object.freeze({ approval: "REQUIRED", approverClass: "HUMAN", separation: true }),
  MERGE: Object.freeze({ approval: "REQUIRED", approverClass: "HUMAN", separation: true }),
});

export const ACTORS = Object.freeze([
  Object.freeze({ actorRef: "actor:owner", actorClass: "HUMAN", roles: Object.freeze(["owner"]) }),
  Object.freeze({ actorRef: "actor:cc", actorClass: "AUTOMATION", roles: Object.freeze(["operator-automation"]) }),
  Object.freeze({ actorRef: "actor:ci", actorClass: "SERVICE", roles: Object.freeze(["ci-service"]) }),
  Object.freeze({ actorRef: "actor:engine", actorClass: "SYSTEM", roles: Object.freeze([]) }),
  Object.freeze({ actorRef: "actor:model", actorClass: "MODEL", roles: Object.freeze(["proposer"]) }),
]);

const allow = (role, family, resourceClass, scopeType) => Object.freeze({ permissionId: `perm:${role}:${family}:${resourceClass}:${scopeType}`, role, family, resourceClass, scopeType, effect: "ALLOW", expiresAt: null, revoked: false });
const deny = (role, family, resourceClass, scopeType) => Object.freeze({ permissionId: `deny:${role}:${family}:${resourceClass}:${scopeType}`, role, family, resourceClass, scopeType, effect: "DENY", expiresAt: null, revoked: false });

/** The resource classes each family acts on (an action names one of them in ACTIONS). */
export const RESOURCE_CLASSES = Object.freeze({
  RESEARCH: Object.freeze(["PROTECTED_TENANT_DATA", "EXTERNAL_SOURCE"]),
  GOVERNED_STATE: Object.freeze(["RUN_EVIDENCE", "GENERATED_REPORT"]),
  CONTENT_BUILD: Object.freeze(["CANDIDATE_CONTENT"]),
  EVIDENCE_STATE_CHANGE: Object.freeze(["EVIDENCE_STATE"]),
  DECLARATION_CHANGE: Object.freeze(["DECLARATION"]),
  AUTHORITY_CHANGE: Object.freeze(["AUTHORITY_CORPUS"]),
  BOARD_CHANGE: Object.freeze(["BOARD_CONFIG"]),
  AUDIT_RECORD: Object.freeze(["AUDIT_TRAIL"]),
  EVALUATION: Object.freeze(["HELDOUT_EVALUATION"]),
  VERIFICATION: Object.freeze(["VERIFICATION_RECORD"]),
  APPROVAL: Object.freeze(["APPROVAL_REGISTRY"]),
  EXPORT: Object.freeze(["EXPORT_ARTIFACT"]),
  SPEND: Object.freeze(["PAID_PROVIDER"]),
  PUBLISH: Object.freeze(["PUBLIC_CONTENT"]),
  CONNECTED_PROPERTY_CHANGE: Object.freeze(["CONNECTED_PROPERTY"]),
  MERGE: Object.freeze(["PULL_REQUEST"]),
});

const everyResource = (role, family, effect) => (RESOURCE_CLASSES[family] ?? []).flatMap((rc) => ["TENANT", "GLOBAL_PRODUCT"].map((st) => (effect === "DENY" ? deny : allow)(role, family, rc, st)));

/**
 * 🔴 THE ROLES, AS PERMISSIONS.
 *   owner                the owner may act in every family; approval-gated families still need an approval record, and
 *                        the owner can never approve an action the owner also executes (separation).
 *   operator-automation  CC: the local governed work every earlier row did under owner commands. It may EXECUTE the
 *                        approval-gated families only on a HUMAN approval, and it may never itself be the approver.
 *   ci-service           CI: research reads only (it runs the suite; it performs no governed write).
 *   proposer             a MODEL: it may propose work and nothing more — every effectful family is DENIED (clarification 3).
 */
export const PERMISSIONS = Object.freeze([
  ...FAMILIES.flatMap((f) => everyResource("owner", f, "ALLOW")),
  ...["RESEARCH", "GOVERNED_STATE", "CONTENT_BUILD", "EVIDENCE_STATE_CHANGE", "DECLARATION_CHANGE", "AUTHORITY_CHANGE", "BOARD_CHANGE", "AUDIT_RECORD", "EVALUATION", "APPROVAL", "VERIFICATION", "EXPORT", "SPEND", "PUBLISH", "CONNECTED_PROPERTY_CHANGE", "MERGE"].flatMap((f) => everyResource("operator-automation", f, "ALLOW")),
  ...everyResource("ci-service", "RESEARCH", "ALLOW"),
  ...FAMILIES.flatMap((f) => everyResource("proposer", f, "DENY")),
]);

/* ── THE ACTION REGISTRY — every governed action by its stable id ─────────────────────────────────────────────────── */
const A = (family, resourceClass) => Object.freeze({ family, resourceClass });
const many = (family, resourceClass, names) => Object.fromEntries(names.map((n) => [n, A(family, resourceClass)]));

export const ACTIONS = Object.freeze({
  /* protected reads and remote work — decided at the scoped entry point and at a connector's opening */
  READ_PROTECTED_TENANT_DATA: A("RESEARCH", "PROTECTED_TENANT_DATA"),
  /* RR-130 §2 (owner, 2 Oct 2026): the engine operator's CROSS-TENANT OPERATIONAL OVERVIEW — counts and states of jobs, writes,
   * refusals, cost-record completeness and stale evidence, for running and repairing the engine, never for reading a client's research
   * or content. It IS a protected read, so it is this class, decided at GLOBAL_PRODUCT scope (never a tenant's); what it may RELEASE is
   * bounded in code (src/ops/operator-overview.mjs: counts and state codes only). No new family and no new permission. */
  READ_OPERATIONS_OVERVIEW: A("RESEARCH", "PROTECTED_TENANT_DATA"),
  OPEN_CONNECTOR_PUBLIC_SITE: A("RESEARCH", "EXTERNAL_SOURCE"),
  OPEN_CONNECTOR_CITED_SOURCES: A("RESEARCH", "EXTERNAL_SOURCE"),
  OPEN_CONNECTOR_SEARCH_CONSOLE_API: A("RESEARCH", "EXTERNAL_SOURCE"),
  ...many("GOVERNED_STATE", "RUN_EVIDENCE", [
    "WRITE_BODY_ARCHIVE", "APPEND_CONTENT_AUDIT_FINDINGS", "APPEND_ROBOTS_AND_DNS_FINDINGS", "APPEND_ACTIONS_TIMING_OBSERVATION",
    "APPEND_COST_LEDGER_BACKFILL", "APPEND_CRAWL_OBSERVATIONS", "WRITE_CRAWL_BODY", "APPEND_CRAWL_RUN_RECORD", "APPEND_CRAWL_COST_ENTRY",
    "APPEND_SEARCH_CONSOLE_OBSERVATIONS", "WRITE_INGEST_OPERATION_JOURNAL", "RAISE_INSTRUMENT_DISAGREEMENT_ISSUES", "CLOSE_INSTRUMENT_DISAGREEMENT_ISSUES",
    "LINK_RECOMMENDATION_EVIDENCE", "APPEND_RENDER_OBSERVATIONS", "WRITE_RENDERED_BODY_ARCHIVE", "WRITE_RENDER_EVIDENCE",
    "APPEND_RENDER_COST_ENTRIES", "REPLACE_RECOVERED_CRAWL_CORPUS", "RECORD_REPLAY_CRAWL_STORE", "RECORD_REPLAY_AUDIT_STORE",
    "APPEND_REPLAY_COST_ENTRIES", "RECORD_REPLAY_EVIDENCE", "APPEND_SOURCE_INTEGRITY_OBSERVATIONS", "APPEND_SOURCE_INTEGRITY_COST_ENTRY",
    "WRITE_SOURCE_INTEGRITY_EVIDENCE", "APPEND_DUPLICATE_SUPERSESSION_NOTES", "APPEND_NOINDEX_REPLACEMENT_ISSUES",
    "APPEND_SUPPLY_LABEL_FINDINGS", "WRITE_CORPUS_PAGE", "WRITE_CORPUS_MANIFEST", "WRITE_SIBLING_PAGE_CACHE",
    "APPEND_PAID_PROVIDER_REFUSAL_ENTRIES",
    /* Found by tools/authorisation-census.mjs on 25 Sep 2026 — named at write sites and missing from the first registry, so
     * each of these writers would have been refused ACTION_UNSUPPORTED on its first confirmed run. */
    "APPEND_SITEMAP_OBSERVATIONS", "APPEND_TECHNICAL_AUDIT_FINDINGS", "APPEND_INGEST_STOPPED_COST_ENTRY", "APPEND_INGEST_COST_ENTRY",
    "APPEND_VERIFICATION_OBSERVATIONS", "APPEND_VERIFICATION_ISSUES",
    /* RR-116 (1 Oct 2026): the human-observation writer (bin/observe-question.mjs) — the same family and resource class as the
     * crawler's observation append; a classification only, granting no permission a role does not already hold. */
    "APPEND_HUMAN_OBSERVATIONS",
    /* RR-118 (1 Oct 2026): the source-intake writer (bin/source-intake.mjs) — the same family and resource class; a classification only. */
    "APPEND_SOURCE_QUESTIONS", "APPEND_KEYWORD_SIGNALS",
    "WRITE_EXHIBIT_FILE", "WRITE_EXHIBIT_LISTING", "WRITE_EXHIBIT_PROVENANCE", "WRITE_EXHIBIT_INDEX",
    /* RR-138 §2 (2 Oct 2026): the shared render collection (bin/render-collect.mjs) — the same family and resource class as the
     * crawler's observation append and body write; a classification only, granting no permission a role does not already hold. */
    "APPEND_RENDER_EVIDENCE", "WRITE_RENDER_BODY",
  ]),
  ...many("GOVERNED_STATE", "GENERATED_REPORT", [
    "WRITE_DETECT_FINDINGS", "WRITE_DETECT_FINDINGS_DIGEST", "WRITE_DETECT_SCORE", "WRITE_EDGE_GRAPH", "WRITE_FACTS_CENSUS",
    "WRITE_GATE_A_REPORT", "WRITE_GATE_A_CSV", "WRITE_TEXT_KIND_REPORT", "WRITE_QUOTE_MATCH_REPORT", "WRITE_ESTATE_REPORT",
    "WRITE_RULING_SHEET_JSON", "WRITE_RULING_SHEET_MARKDOWN", "WRITE_ACCEPTANCE_TEST_REPORT", "WRITE_OVERLAP_DIAGNOSTIC",
    "WRITE_CHAIN_REPORT", "WRITE_PLACEMENT_REPORT", "WRITE_VARIANT_CHAIN_REPORT",
  ]),
  ...many("CONTENT_BUILD", "CANDIDATE_CONTENT", ["WRITE_CANDIDATE_PAGE", "WRITE_CANDIDATE_TRACE", "WRITE_CHAIN_CANDIDATE_PAGE", "WRITE_PLACEMENT_PAGE", "WRITE_VARIANT_CHAIN_PAGE"]),
  /* (SUPERSEDE_EVIDENCE_STATE is the ACTION LABEL of an F06 audit event, not an action anyone performs — removed 25 Sep.) */
  ...many("EVIDENCE_STATE_CHANGE", "EVIDENCE_STATE", ["APPEND_NOINDEX_STATE_CHANGES"]),
  ...many("DECLARATION_CHANGE", "DECLARATION", ["DECLARE_STRUCTURAL_ATTACHMENT", "RETIRE_UNLAWFUL_WHOLE_COLLECTION_ATTACHMENT", "WRITE_PROJECT_DECLARATION", "WRITE_PROJECT_DECLARATION_CURRENT_VIEW"]),
  ...many("AUTHORITY_CHANGE", "AUTHORITY_CORPUS", ["WRITE_AUTHORITY_CORPUS"]),
  ...many("BOARD_CHANGE", "BOARD_CONFIG", ["GENERATE_FBOARD_CROSSWALK", "GENERATE_FBOARD_CAPABILITIES", "GENERATE_CHECKLIST_BOUNDARIES"]),
  ...many("AUDIT_RECORD", "AUDIT_TRAIL", ["WRITE_AUDIT_TRAIL_STORE"]),
  ...many("EVALUATION", "HELDOUT_EVALUATION", ["RECORD_HELDOUT_EVALUATION"]),
  ...many("APPROVAL", "APPROVAL_REGISTRY", ["ISSUE_APPROVAL", "REVOKE_APPROVAL", "CONSUME_APPROVAL"]),
  ...many("EXPORT", "EXPORT_ARTIFACT", ["EXPORT_FACTS_FOR_VERIFICATION"]),
  ...many("SPEND", "PAID_PROVIDER", ["CALL_PAID_PROVIDER"]),
  ...many("MERGE", "PULL_REQUEST", ["MERGE_PULL_REQUEST"]),
});

/**
 * 🔴 ONE DECLARED PATTERN, AND ONLY ONE: bin/export.mjs names each export `EXPORT_<format>`. Every such id is the EXPORT
 * family over an export artefact — declared here once, exactly, rather than an action classified by its spelling anywhere
 * else. No other prefix rule exists.
 */
export const ACTION_PATTERNS = Object.freeze([
  Object.freeze({ pattern: /^EXPORT_[A-Z0-9_]+$/, ...A("EXPORT", "EXPORT_ARTIFACT"), declaredFor: "bin/export.mjs EXPORT_<format>" }),
]);
