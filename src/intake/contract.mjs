/**
 * 🔴 F01 · THE PROJECT DECLARATION CONTRACT — VERSIONED, PRODUCT-NEUTRAL, DENY BY DEFAULT (24 September 2026).
 *
 * A declaration records what a submitter SAYS about one project of one tenant. It proves no ownership, grants no
 * permission, verifies no fact and creates no tenant. Everything this module decides is decided from the document's
 * own declared structure plus the tenant registry it is handed — never from a hostname, a directory, a repository,
 * a branch, a product name, observed content or anything a previous client did.
 *
 * ── THE CONTRACT ─────────────────────────────────────────────────────────────
 *   exactly the fifteen top-level fields below; an unknown field or version is REFUSED, never ignored
 *   identity      declarationId (this immutable submission) · projectId (the continuing project) · tenantId
 *                 (mandatory, and it must resolve to an ACTIVE declared tenant — never defaulted, never inferred)
 *   properties    public web origins, each bound to a DECLARED environment, normalised by structure only
 *   environments  owner-declared; never derived from a hostname
 *   goals         the submitter's wording kept as isolated data; the SUBMISSION is OBSERVED, the goal's truth is
 *                 NOT_MEASURED (F06) — a goal is never a fact, demand or recommendation
 *   permissions   REQUESTS only. Every permission kind starts DENIED; a requested one is PENDING; nothing a
 *                 submitter writes can make one GRANTED
 *   constraints   kept as bounded owner-declared data; their meaning is never interpreted here
 *   connectors    intent and a REFERENCE to an approved secret mechanism — never a secret value
 *
 * 🔴 NO CLIENT KNOWLEDGE. Every vocabulary below is generic. A client's words live only inside a declaration.
 */
import { findSecrets } from "./secrets.mjs";
import { normaliseOrigin } from "./origin.mjs";
import { makeEvidenceState } from "../evidence/evidence-state.mjs";
import { TENANT_ID_PATTERN } from "../tenancy/resolver.mjs";

export const SCHEMA_VERSION = 1;
export const CONTRACT_ID = "project-declaration/1";

export const TOP_LEVEL_FIELDS = Object.freeze([
  "schemaVersion", "declarationId", "projectId", "tenantId", "displayName", "submittedBy", "submittedAt",
  "properties", "environments", "goals", "permissions", "constraints", "connectors", "declarationState", "supersedes",
]);

/** The declaration workflow — kept apart from F06's evidence states by construction (disjoint vocabularies). */
export const DECLARATION_STATES = Object.freeze(["SUBMITTED", "VALIDATED", "ACCEPTED", "REFUSED", "SUPERSEDED"]);
export const DECLARATION_TRANSITIONS = Object.freeze({
  SUBMITTED: Object.freeze(["VALIDATED", "REFUSED"]),
  VALIDATED: Object.freeze(["ACCEPTED", "REFUSED"]),
  ACCEPTED: Object.freeze(["SUPERSEDED"]),
  REFUSED: Object.freeze([]),
  SUPERSEDED: Object.freeze([]),
});
export const canMoveDeclaration = (from, to) => (DECLARATION_TRANSITIONS[from] ?? []).includes(to);

/** The permissions a declaration may REQUEST, each separate. There is no umbrella permission. */
export const PERMISSION_KINDS = Object.freeze([
  "RESEARCH_PUBLIC_PROPERTY", "CRAWL_PUBLIC_PROPERTY", "USE_EXTERNAL_PROVIDER", "SPEND_MONEY",
  "ACCESS_AUTHENTICATED_PROPERTY", "CREATE_RECOMMENDATION", "CREATE_DRAFT", "PUBLISH_OR_MODIFY_PROPERTY",
  "EXPORT_EVIDENCE", "CONTACT_OR_NOTIFY_PEOPLE",
]);
export const REQUESTED_STATES = Object.freeze(["REQUESTED", "NOT_REQUESTED"]);
/** What intake itself can ever set. GRANTED is absent on purpose: granting is not an intake act. */
export const INTAKE_GRANT_STATES = Object.freeze(["DENIED", "PENDING"]);

export const GOAL_CATEGORIES = Object.freeze(["VISIBILITY", "TRAFFIC", "CONVERSION", "REPUTATION", "COVERAGE", "TECHNICAL_HEALTH", "OTHER"]);
export const GOAL_PRIORITIES = Object.freeze(["HIGH", "MEDIUM", "LOW"]);
export const CONSTRAINT_TYPES = Object.freeze([
  "TIME", "BUDGET", "JURISDICTION", "LANGUAGE", "TECHNOLOGY", "CONTENT", "LEGAL_COMPLIANCE", "PUBLISHING", "PROVIDER", "RATE", "EXCLUSION",
]);
export const ENVIRONMENT_VISIBILITY = Object.freeze(["PUBLIC", "NON_PUBLIC"]);
export const PROPERTY_KINDS = Object.freeze(["WEB_ORIGIN"]);
export const CLAIMED_RELATIONSHIPS = Object.freeze(["OWNER", "OPERATOR", "AGENT", "UNSTATED"]);
export const SECRET_MECHANISMS = Object.freeze(["ENV_REFERENCE"]);

export const DECLARATION_ID = /^decl_[0-9a-f]{32}$/;
export const PROJECT_ID = /^proj_[0-9a-f]{32}$/;
const LOCAL_ID = /^[a-z][a-z0-9-]{0,63}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const ENV_NAME = /^[A-Z][A-Z0-9_]{2,63}$/;
const TEXT_MAX = 2000;

const FIELD_SETS = Object.freeze({
  submittedBy: ["actorType", "actorRef"],
  property: ["propertyId", "kind", "origin", "environmentId", "scope", "authority", "label"],
  scope: ["pathPrefixes"],
  authority: ["claimedRelationship"],
  environment: ["environmentId", "label", "visibility", "allowedOperations", "constraintIds"],
  goal: ["goalId", "wording", "category", "priority", "successMeasure"],
  permission: ["permission", "requestedState", "scope", "effectiveFrom", "expiresAt"],
  constraint: ["constraintId", "type", "statement", "bounds"],
  connector: ["connectorId", "kind", "intent", "configRef"],
  configRef: ["mechanism", "name"],
});
const OPTIONAL = Object.freeze({ property: ["label", "scope"], goal: ["category", "successMeasure"], permission: ["scope", "effectiveFrom", "expiresAt"], constraint: ["bounds"], connector: ["configRef"], environment: ["constraintIds"] });

const isText = (v, max = TEXT_MAX) => typeof v === "string" && v.trim() !== "" && v.length <= max;
const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Validate a submitted declaration against the contract and the tenant registry it is handed.
 *
 *   tenants   the ACTIVE tenant ids in force (from the production resolver), or null when the registry could not be
 *             read — then every declaration is REFUSED: "I could not look" never passes for "it is declared"
 *   attachedTo(origin) → the tenantId a SITE_ORIGIN attachment names, or null (optional; from the same registry)
 *
 * Returns { ok, refusals: [{ code, path }], normalised }. A refusal carries a code and a JSON path, never a value.
 */
export function validateDeclaration(doc, { tenants, attachedTo = () => null } = {}) {
  const refusals = [];
  const no = (code, path) => refusals.push(Object.freeze({ code, path }));

  if (!isObj(doc)) { no("DECLARATION_NOT_AN_OBJECT", "$"); return result(refusals, null); }

  // 🔴 THE SECRET FIREWALL RUNS FIRST, OVER EVERYTHING — keys included — and a finding refuses the whole document.
  for (const f of findSecrets(doc)) no(`SECRET_SHAPED_VALUE:${f.detector}`, f.path);

  // ── version and shape ─────────────────────────────────────────────────────
  if (!Object.hasOwn(doc, "schemaVersion")) no("SCHEMA_VERSION_ABSENT", "$.schemaVersion");
  else if (doc.schemaVersion !== SCHEMA_VERSION) no("SCHEMA_VERSION_UNSUPPORTED", "$.schemaVersion");
  for (const k of Object.keys(doc)) if (!TOP_LEVEL_FIELDS.includes(k)) no("UNKNOWN_FIELD", "$[top-level]");
  for (const k of TOP_LEVEL_FIELDS) if (!Object.hasOwn(doc, k)) no("FIELD_ABSENT", `$.${k}`);

  // ── identity ──────────────────────────────────────────────────────────────
  if (Object.hasOwn(doc, "declarationId") && !(typeof doc.declarationId === "string" && DECLARATION_ID.test(doc.declarationId))) no("DECLARATION_ID_INVALID", "$.declarationId");
  if (Object.hasOwn(doc, "projectId") && !(typeof doc.projectId === "string" && PROJECT_ID.test(doc.projectId))) no("PROJECT_ID_INVALID", "$.projectId");
  if (!Object.hasOwn(doc, "tenantId") || doc.tenantId === null || doc.tenantId === "") no("TENANT_ABSENT", "$.tenantId");
  else if (!(typeof doc.tenantId === "string" && TENANT_ID_PATTERN.test(doc.tenantId))) no("TENANT_ID_INVALID", "$.tenantId");
  else if (tenants === null || tenants === undefined) no("TENANT_REGISTRY_UNREADABLE", "$.tenantId");
  else if (!tenants.includes(doc.tenantId)) no("TENANT_UNRESOLVED", "$.tenantId");
  if (Object.hasOwn(doc, "displayName") && !isText(doc.displayName, 200)) no("DISPLAY_NAME_INVALID", "$.displayName");
  if (Object.hasOwn(doc, "submittedBy")) {
    const s = doc.submittedBy;
    if (!isObj(s) || !exact(s, FIELD_SETS.submittedBy) || !["HUMAN", "EXTERNAL_SYSTEM"].includes(s.actorType) || !isText(s.actorRef, 200)) no("SUBMITTED_BY_INVALID", "$.submittedBy");
  }
  if (Object.hasOwn(doc, "submittedAt") && !(typeof doc.submittedAt === "string" && ISO_INSTANT.test(doc.submittedAt) && !Number.isNaN(Date.parse(doc.submittedAt)))) no("SUBMITTED_AT_INVALID", "$.submittedAt");
  if (Object.hasOwn(doc, "declarationState") && doc.declarationState !== "SUBMITTED") no("DECLARATION_STATE_NOT_SUBMITTED", "$.declarationState");
  if (Object.hasOwn(doc, "supersedes") && doc.supersedes !== null && !(typeof doc.supersedes === "string" && DECLARATION_ID.test(doc.supersedes))) no("SUPERSEDES_INVALID", "$.supersedes");
  if (typeof doc.supersedes === "string" && doc.supersedes === doc.declarationId) no("SUPERSEDES_ITSELF", "$.supersedes");

  // ── the lists ─────────────────────────────────────────────────────────────
  const list = (k) => (Array.isArray(doc[k]) ? doc[k] : (Object.hasOwn(doc, k) && no("NOT_A_LIST", `$.${k}`), []));
  const environments = list("environments");
  const constraints = list("constraints");
  const properties = list("properties");
  const goals = list("goals");
  const permissions = list("permissions");
  const connectors = list("connectors");

  const constraintIds = new Set();
  constraints.forEach((c, i) => {
    const p = `$.constraints[${i}]`;
    if (!item(c, "constraint")) return no("CONSTRAINT_SHAPE_INVALID", p);
    if (!LOCAL_ID.test(String(c.constraintId))) no("CONSTRAINT_ID_INVALID", `${p}.constraintId`);
    else if (constraintIds.has(c.constraintId)) no("DUPLICATE_ID", `${p}.constraintId`);
    else constraintIds.add(c.constraintId);
    if (!CONSTRAINT_TYPES.includes(c.type)) no("CONSTRAINT_TYPE_UNKNOWN", `${p}.type`);
    if (!isText(c.statement)) no("CONSTRAINT_STATEMENT_INVALID", `${p}.statement`);
    if (Object.hasOwn(c, "bounds") && !(isObj(c.bounds) && Object.values(c.bounds).every((v) => ["string", "number", "boolean"].includes(typeof v)) && Object.keys(c.bounds).length <= 12)) no("CONSTRAINT_BOUNDS_INVALID", `${p}.bounds`);
  });

  const environmentIds = new Set();
  environments.forEach((e, i) => {
    const p = `$.environments[${i}]`;
    if (!item(e, "environment")) return no("ENVIRONMENT_SHAPE_INVALID", p);
    if (!LOCAL_ID.test(String(e.environmentId))) no("ENVIRONMENT_ID_INVALID", `${p}.environmentId`);
    else if (environmentIds.has(e.environmentId)) no("DUPLICATE_ID", `${p}.environmentId`);
    else environmentIds.add(e.environmentId);
    if (!isText(e.label, 120)) no("ENVIRONMENT_LABEL_INVALID", `${p}.label`);
    if (!ENVIRONMENT_VISIBILITY.includes(e.visibility)) no("ENVIRONMENT_VISIBILITY_INVALID", `${p}.visibility`);
    if (!Array.isArray(e.allowedOperations) || e.allowedOperations.some((o) => !PERMISSION_KINDS.includes(o)) || new Set(e.allowedOperations).size !== e.allowedOperations.length) no("ENVIRONMENT_OPERATIONS_INVALID", `${p}.allowedOperations`);
    if (Object.hasOwn(e, "constraintIds") && !(Array.isArray(e.constraintIds) && e.constraintIds.every((c) => constraintIds.has(c)))) no("ENVIRONMENT_CONSTRAINT_UNDECLARED", `${p}.constraintIds`);
  });

  const propertyIds = new Set();
  const origins = new Set();
  const normalisedProperties = [];
  properties.forEach((pr, i) => {
    const p = `$.properties[${i}]`;
    if (!item(pr, "property")) return no("PROPERTY_SHAPE_INVALID", p);
    if (!LOCAL_ID.test(String(pr.propertyId))) no("PROPERTY_ID_INVALID", `${p}.propertyId`);
    else if (propertyIds.has(pr.propertyId)) no("DUPLICATE_ID", `${p}.propertyId`);
    else propertyIds.add(pr.propertyId);
    if (!PROPERTY_KINDS.includes(pr.kind)) no("PROPERTY_KIND_UNSUPPORTED", `${p}.kind`);
    // 🔴 An environment is DECLARED and REFERENCED. It is never derived from the host.
    if (!(typeof pr.environmentId === "string" && environmentIds.has(pr.environmentId))) no("PROPERTY_ENVIRONMENT_UNDECLARED", `${p}.environmentId`);
    if (!(isObj(pr.authority) && exact(pr.authority, FIELD_SETS.authority) && CLAIMED_RELATIONSHIPS.includes(pr.authority.claimedRelationship))) no("PROPERTY_AUTHORITY_INVALID", `${p}.authority`);
    if (Object.hasOwn(pr, "label") && !isText(pr.label, 200)) no("PROPERTY_LABEL_INVALID", `${p}.label`);
    if (Object.hasOwn(pr, "scope") && !(isObj(pr.scope) && exact(pr.scope, FIELD_SETS.scope) && Array.isArray(pr.scope.pathPrefixes) && pr.scope.pathPrefixes.every((x) => typeof x === "string" && /^\/[^\s?#]*$/.test(x) && !x.includes("..")))) no("PROPERTY_SCOPE_INVALID", `${p}.scope`);
    const o = normaliseOrigin(pr.origin);
    if (!o.ok) return no(o.code, `${p}.origin`);
    if (origins.has(o.origin)) no("DUPLICATE_ORIGIN", `${p}.origin`);
    origins.add(o.origin);
    const attached = attachedTo(o.origin);
    if (attached && typeof doc.tenantId === "string" && attached !== doc.tenantId) no("PROPERTY_ATTACHED_TO_ANOTHER_TENANT", `${p}.origin`);
    normalisedProperties.push({ ...pr, origin: o.origin, authority: { claimedRelationship: pr.authority?.claimedRelationship, verificationState: "UNVERIFIED" } });
  });

  const goalIds = new Set();
  goals.forEach((g, i) => {
    const p = `$.goals[${i}]`;
    if (!item(g, "goal")) return no("GOAL_SHAPE_INVALID", p);
    if (!LOCAL_ID.test(String(g.goalId))) no("GOAL_ID_INVALID", `${p}.goalId`);
    else if (goalIds.has(g.goalId)) no("DUPLICATE_ID", `${p}.goalId`);
    else goalIds.add(g.goalId);
    if (!isText(g.wording)) no("GOAL_WORDING_INVALID", `${p}.wording`);
    if (Object.hasOwn(g, "category") && !GOAL_CATEGORIES.includes(g.category)) no("GOAL_CATEGORY_UNKNOWN", `${p}.category`);
    if (!GOAL_PRIORITIES.includes(g.priority)) no("GOAL_PRIORITY_INVALID", `${p}.priority`);
    if (Object.hasOwn(g, "successMeasure") && !isText(g.successMeasure)) no("GOAL_SUCCESS_MEASURE_INVALID", `${p}.successMeasure`);
  });

  const requested = new Set();
  permissions.forEach((q, i) => {
    const p = `$.permissions[${i}]`;
    // 🔴 A submitter cannot write a grant: any grant-shaped key is outside the shape and refused here.
    if (isObj(q) && ["grantState", "granted", "grantedBy", "grantingAuthority"].some((k) => Object.hasOwn(q, k))) return no("SUBMITTER_CANNOT_GRANT", p);
    if (!item(q, "permission")) return no("PERMISSION_SHAPE_INVALID", p);
    if (!PERMISSION_KINDS.includes(q.permission)) no("PERMISSION_KIND_UNKNOWN", `${p}.permission`);
    else if (requested.has(q.permission)) no("DUPLICATE_PERMISSION", `${p}.permission`);
    else requested.add(q.permission);
    if (!REQUESTED_STATES.includes(q.requestedState)) no("PERMISSION_REQUESTED_STATE_INVALID", `${p}.requestedState`);
    if (Object.hasOwn(q, "scope") && !isText(q.scope, 500)) no("PERMISSION_SCOPE_INVALID", `${p}.scope`);
    for (const t of ["effectiveFrom", "expiresAt"]) if (Object.hasOwn(q, t) && !(typeof q[t] === "string" && ISO_INSTANT.test(q[t]))) no("PERMISSION_TIME_INVALID", `${p}.${t}`);
  });

  const connectorIds = new Set();
  connectors.forEach((c, i) => {
    const p = `$.connectors[${i}]`;
    if (!item(c, "connector")) return no("CONNECTOR_SHAPE_INVALID", p);
    if (!LOCAL_ID.test(String(c.connectorId))) no("CONNECTOR_ID_INVALID", `${p}.connectorId`);
    else if (connectorIds.has(c.connectorId)) no("DUPLICATE_ID", `${p}.connectorId`);
    else connectorIds.add(c.connectorId);
    if (!LOCAL_ID.test(String(c.kind))) no("CONNECTOR_KIND_INVALID", `${p}.kind`);
    if (!isText(c.intent, 500)) no("CONNECTOR_INTENT_INVALID", `${p}.intent`);
    if (Object.hasOwn(c, "configRef") && !(isObj(c.configRef) && exact(c.configRef, FIELD_SETS.configRef) && SECRET_MECHANISMS.includes(c.configRef.mechanism) && ENV_NAME.test(String(c.configRef.name)))) no("CONNECTOR_CONFIG_REF_INVALID", `${p}.configRef`);
  });

  if (refusals.length) return result(refusals, null);

  // ── the normalised form: the submitter's words kept verbatim, the intake's own judgements added beside them ──
  const effectivePermissions = PERMISSION_KINDS.map((kind) => {
    const q = permissions.find((x) => x.permission === kind);
    const wanted = q?.requestedState === "REQUESTED";
    return {
      permission: kind,
      requestedState: q ? q.requestedState : "NOT_REQUESTED",
      requestDeclared: Boolean(q),
      grantState: wanted ? "PENDING" : "DENIED",
      grantingAuthority: null,
      scope: q?.scope ?? null,
      effectiveFrom: q?.effectiveFrom ?? null,
      expiresAt: q?.expiresAt ?? null,
    };
  });
  const normalised = {
    contract: CONTRACT_ID,
    schemaVersion: doc.schemaVersion,
    declarationId: doc.declarationId,
    projectId: doc.projectId,
    tenantId: doc.tenantId,
    displayName: doc.displayName,
    submittedBy: { actorType: doc.submittedBy.actorType, actorRef: doc.submittedBy.actorRef },
    submittedAt: doc.submittedAt,
    properties: normalisedProperties,
    environments,
    goals: goals.map((g) => ({ ...g, evidence: goalEvidence(doc, g) })),
    permissions: effectivePermissions,
    constraints,
    connectors,
    declarationState: "SUBMITTED",
    supersedes: doc.supersedes,
  };
  return result(refusals, normalised);
}

/**
 * 🔴 F06, APPLIED — a goal's SUBMISSION is observed (someone did write these words), its TRUTH is not measured.
 * Both states are built by the canonical model, so a goal cannot be given a state the model would refuse.
 */
export function goalEvidence(doc, g) {
  const submission = makeEvidenceState("OBSERVED", { evidenceRef: `${doc.declarationId}#goal:${g.goalId}`, sourceId: `declaration:${doc.declarationId}`, observedAt: doc.submittedAt, assignedBy: "intake.goal-submission" });
  const validity = makeEvidenceState("NOT_MEASURED", { checkId: "goal-validity", noMeasurementReason: "NO_FEATURE_HAS_MEASURED_THIS_GOAL", assignedBy: "intake.goal-validity" });
  return { submission: submission.state, validity: validity.state };
}

function exact(o, keys, optional = []) {
  const ks = Object.keys(o);
  return ks.every((k) => keys.includes(k)) && keys.filter((k) => !optional.includes(k)).every((k) => Object.hasOwn(o, k));
}
function item(v, kind) {
  return isObj(v) && exact(v, FIELD_SETS[kind], OPTIONAL[kind] ?? []);
}
function result(refusals, normalised) {
  return Object.freeze({ ok: refusals.length === 0, refusals: Object.freeze(refusals), normalised });
}
