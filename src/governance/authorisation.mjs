/**
 * 🔴 F04 · THE ONE AUTHORISATION DECISION — every governed action reaches THIS before it reads protected data, changes
 * state, opens a connection, commits money, exports or publishes.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F04_ACCEPTANCE_2026-09-25.md (b439309, contract 2a2a98bf…).
 *
 * THE DECISION, in this order, and nothing else (each refusal is its own outcome — clarification 9):
 *   1. IDENTITY   the actor is named (IDENTITY_MISSING) and declared (IDENTITY_UNDECLARED). The actor is whatever the
 *                 caller NAMES — an explicit declared reference. It is never inferred from a git author, an email, a chat
 *                 speaker, an environment user or a process name (R4, clarification 4), and naming it grants nothing.
 *   2. ACTION     the action is in the registry (ACTION_UNSUPPORTED otherwise) — never classified by guessing.
 *   3. ROLE       the actor holds at least one role (ROLE_MISSING). A class implies no permission (clarification 2).
 *   4. SCOPE      the scope is what F02 already decided: a TENANT action carries the tenant F02 resolved for the run, or
 *                 it refuses (SCOPE_UNRESOLVED). F04 never widens or re-decides it (clarification 5, R3).
 *   5. PERMISSION among the actor's roles' permissions for this family and resource class: a DENY wins (DENIED_BY_RULE;
 *                 CONFLICTING when an ALLOW matched too — clarification 8); none at all → PERMISSION_MISSING; only for
 *                 another scope → PERMISSION_WRONG_SCOPE; only revoked → PERMISSION_REVOKED; only expired →
 *                 PERMISSION_EXPIRED; more than one live ALLOW → PERMISSION_AMBIGUOUS.
 *   6. APPROVAL   for an approval-gated family: an approval must be named (APPROVAL_MISSING), exist (APPROVAL_UNKNOWN),
 *                 be for exactly this action, resource and scope (APPROVAL_WRONG_TARGET — a stale or unrelated approval
 *                 is never reused), unrevoked (APPROVAL_REVOKED), unexpired (APPROVAL_EXPIRED), unconsumed if one-use
 *                 (APPROVAL_CONSUMED), issued by a HUMAN (APPROVER_NOT_HUMAN — a model, tool, process or commit author is
 *                 never a human approver: clarification 3), and never by the executor itself (SELF_APPROVAL).
 *   7. AUTHORISED — and nothing else is.
 *
 * WHAT A DECISION CARRIES: the outcome, a reason code, the actor CLASS, the family, the action id, the resource class, the
 * scope TYPE and 16-hex digests of the actor, resource and approval references. No tenant id, no path, no payload, no
 * credential (R5). A decision is remembered by identity (isGenuineAuthorisation): an object that merely looks like one
 * authorises nothing.
 *
 * A CLI flag (--confirm, --actor, --approval) EXPRESSES intent and names references; it never grants (clarification 16):
 * the grant is the declared permission and the recorded approval, decided here. Diagnostic inspection decides nothing and
 * grants nothing (clarification 13).
 *
 * Generic: this file names no client, host, tenant or subject.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { ACTOR_CLASSES, ACTORS, PERMISSIONS, ACTIONS, ACTION_PATTERNS, FAMILY_RULES } from "../../config/governance/authorisation.mjs";

export const APPROVALS_FILE = "config/governance/approvals.jsonl";
const ENGINE = new URL("../../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

export const AUTHORISATION_OUTCOMES = Object.freeze([
  "AUTHORISED",
  "IDENTITY_MISSING", "IDENTITY_UNDECLARED", "ACTION_UNSUPPORTED", "ROLE_MISSING", "SCOPE_UNRESOLVED",
  "DENIED_BY_RULE", "PERMISSION_CONFLICTING", "PERMISSION_MISSING", "PERMISSION_WRONG_SCOPE", "PERMISSION_REVOKED",
  "PERMISSION_EXPIRED", "PERMISSION_AMBIGUOUS",
  "APPROVAL_MISSING", "APPROVAL_UNKNOWN", "APPROVAL_WRONG_TARGET", "APPROVAL_REVOKED", "APPROVAL_EXPIRED",
  "APPROVAL_CONSUMED", "APPROVER_NOT_HUMAN", "SELF_APPROVAL",
  "REGISTRY_UNREADABLE",
]);

const digest = (v) => createHash("sha256").update(String(v ?? ""), "utf8").digest("hex").slice(0, 16);
/** The 16-hex digest a decision carries for a reference — so a consumer can check WHICH resource it was decided for. */
export const authorisationRefDigest = digest;
const GENUINE = new WeakSet();
/** True only for a decision this module produced. */
export const isGenuineAuthorisation = (d) => d !== null && typeof d === "object" && GENUINE.has(d);

/** The declared action an id names: its registry entry, or its one declared pattern, or null (UNSUPPORTED). */
export function actionEntry(actionId, { actions = ACTIONS, patterns = ACTION_PATTERNS } = {}) {
  if (typeof actionId !== "string" || actionId === "") return null;
  if (Object.hasOwn(actions, actionId)) return actions[actionId];
  const p = patterns.find((x) => x.pattern.test(actionId));
  return p ? { family: p.family, resourceClass: p.resourceClass } : null;
}

/**
 * The approval registry's CURRENT state, derived from its immutable history (config/governance/approvals.jsonl): one
 * ISSUED event makes an approval; a REVOKED event revokes it; a CONSUMED event spends a one-use approval. History is never
 * rewritten — the current state is computed. Returns { readable, approvals: Map id → current record }.
 */
export function readApprovals({ file = join(ENGINE, APPROVALS_FILE) } = {}) {
  if (!existsSync(file)) return { readable: true, approvals: new Map(), events: 0 };
  let lines;
  try { lines = readFileSync(file, "utf8").split("\n").filter((l) => l.trim() !== "").map((l) => JSON.parse(l)); } catch { return { readable: false, approvals: new Map(), events: 0 }; }
  const approvals = new Map();
  for (const e of lines) {
    if (e?.event === "ISSUED" && e.approval?.approvalId && !approvals.has(e.approval.approvalId)) approvals.set(e.approval.approvalId, { ...e.approval, revoked: false, consumed: false });
    else if (e?.event === "REVOKED" && approvals.has(e.approvalId)) approvals.get(e.approvalId).revoked = true;
    else if (e?.event === "CONSUMED" && approvals.has(e.approvalId)) approvals.get(e.approvalId).consumed = true;
  }
  return { readable: true, approvals, events: lines.length };
}

/**
 * THE DECISION. Pure over its inputs: the declarations are the module's config, the approvals are read (or handed in).
 * @param {{ actorRef: string|null, action: string, scope: { scopeType: "TENANT"|"GLOBAL_PRODUCT", tenantId?: string|null },
 *           resourceRef?: string, approvalRef?: string|null, now?: string, registry?: object }} request
 */
export function authorise(request, { actors = ACTORS, permissions = PERMISSIONS, actions = ACTIONS, patterns = ACTION_PATTERNS, familyRules = FAMILY_RULES, approvals = null } = {}) {
  const { actorRef = null, action, scope = {}, resourceRef = "", approvalRef = null, now = new Date().toISOString() } = request ?? {};
  const entry = actionEntry(action, { actions, patterns });
  const actor = typeof actorRef === "string" ? actors.find((a) => a.actorRef === actorRef) : null;
  const base = {
    action: typeof action === "string" ? action : null,
    family: entry?.family ?? null,
    resourceClass: entry?.resourceClass ?? null,
    scopeType: scope?.scopeType ?? null,
    actorClass: actor?.actorClass ?? null,
    actorRefDigest: digest(actorRef),
    resourceRefDigest: digest(resourceRef),
    approvalRefDigest: approvalRef ? digest(approvalRef) : null,
  };
  const decide = (outcome, reason) => { const d = Object.freeze({ ...base, outcome, allowed: outcome === "AUTHORISED", reason }); GENUINE.add(d); return d; };

  // 1 · identity — named, then declared
  if (typeof actorRef !== "string" || actorRef.trim() === "") return decide("IDENTITY_MISSING", "NO_ACTOR_NAMED");
  if (!actor || !ACTOR_CLASSES.includes(actor.actorClass)) return decide("IDENTITY_UNDECLARED", "ACTOR_NOT_IN_THE_DECLARED_REGISTRY");
  // 2 · action — registered, never guessed
  if (!entry) return decide("ACTION_UNSUPPORTED", "ACTION_NOT_IN_THE_REGISTRY");
  // 3 · role
  if (!Array.isArray(actor.roles) || actor.roles.length === 0) return decide("ROLE_MISSING", "ACTOR_HOLDS_NO_ROLE");
  // 4 · scope — F02's, never widened
  if (!["TENANT", "GLOBAL_PRODUCT"].includes(scope?.scopeType)) return decide("SCOPE_UNRESOLVED", "NO_DECLARED_SCOPE_TYPE");
  if (scope.scopeType === "TENANT" && (typeof scope.tenantId !== "string" || scope.tenantId === "")) return decide("SCOPE_UNRESOLVED", "TENANT_ACTION_WITHOUT_AN_F02_RESOLVED_TENANT");
  // 5 · permission — deny overrides allow; each non-grant its own outcome
  const forFamily = permissions.filter((p) => actor.roles.includes(p.role) && p.family === entry.family && p.resourceClass === entry.resourceClass);
  const inScope = forFamily.filter((p) => p.scopeType === scope.scopeType);
  const live = (p) => !p.revoked && !(p.expiresAt && p.expiresAt <= now);
  const denies = inScope.filter((p) => p.effect === "DENY" && live(p));
  const allows = inScope.filter((p) => p.effect === "ALLOW" && live(p));
  if (denies.length && allows.length) return decide("PERMISSION_CONFLICTING", "A_DENY_AND_AN_ALLOW_MATCH_AND_THE_DENY_WINS");
  if (denies.length) return decide("DENIED_BY_RULE", "A_DENY_MATCHES");
  if (allows.length > 1) return decide("PERMISSION_AMBIGUOUS", "MORE_THAN_ONE_LIVE_ALLOW_MATCHES");
  if (allows.length === 0) {
    if (inScope.some((p) => p.effect === "ALLOW" && p.revoked)) return decide("PERMISSION_REVOKED", "THE_ONLY_MATCHING_ALLOW_IS_REVOKED");
    if (inScope.some((p) => p.effect === "ALLOW" && p.expiresAt && p.expiresAt <= now)) return decide("PERMISSION_EXPIRED", "THE_ONLY_MATCHING_ALLOW_HAS_EXPIRED");
    if (forFamily.some((p) => p.effect === "ALLOW")) return decide("PERMISSION_WRONG_SCOPE", "AN_ALLOW_EXISTS_ONLY_FOR_ANOTHER_SCOPE_TYPE");
    return decide("PERMISSION_MISSING", "NO_PERMISSION_FOR_THIS_FAMILY_AND_RESOURCE_CLASS");
  }
  // 6 · approval — for the gated families only
  const rule = familyRules[entry.family];
  if (rule?.approval === "REQUIRED") {
    if (typeof approvalRef !== "string" || approvalRef === "") return decide("APPROVAL_MISSING", "AN_APPROVAL_GATED_FAMILY_NAMED_NO_APPROVAL");
    const reg = approvals ?? readApprovals();
    if (!reg.readable) return decide("REGISTRY_UNREADABLE", "THE_APPROVAL_REGISTRY_COULD_NOT_BE_READ");
    const a = reg.approvals.get(approvalRef);
    if (!a) return decide("APPROVAL_UNKNOWN", "NO_SUCH_APPROVAL_IN_THE_REGISTRY");
    const sameScope = (a.scope?.scopeType ?? null) === scope.scopeType && (a.scope?.tenantId ?? null) === (scope.tenantId ?? null);
    if (a.action !== action || a.resource?.resourceClass !== entry.resourceClass || a.resource?.resourceRef !== resourceRef || !sameScope) return decide("APPROVAL_WRONG_TARGET", "THE_APPROVAL_NAMES_ANOTHER_ACTION_RESOURCE_OR_SCOPE");
    if (a.revoked) return decide("APPROVAL_REVOKED", "THE_APPROVAL_WAS_REVOKED");
    if (a.expiresAt && a.expiresAt <= now) return decide("APPROVAL_EXPIRED", "THE_APPROVAL_HAS_EXPIRED");
    if (a.oneUse && a.consumed) return decide("APPROVAL_CONSUMED", "THE_ONE_USE_APPROVAL_WAS_ALREADY_SPENT");
    const approver = actors.find((x) => x.actorRef === a.approverRef);
    if (!approver || approver.actorClass !== (rule.approverClass ?? "HUMAN") || a.approverClass !== approver.actorClass) return decide("APPROVER_NOT_HUMAN", "THE_APPROVER_IS_NOT_A_DECLARED_HUMAN");
    if (rule.separation && a.approverRef === actorRef) return decide("SELF_APPROVAL", "THE_EXECUTOR_IS_ITS_OWN_APPROVER");
  }
  return decide("AUTHORISED", "EVERY_CHECK_PASSED");
}

/** The actor a run NAMES (`--actor=<declared reference>`) — a claim to be decided, never a fallback and never a grant. */
export const ACTOR_ARG = "actor";
export const APPROVAL_ARG = "approval";
export const namedActor = (argv = process.argv) => { const h = argv.find((a) => typeof a === "string" && a.startsWith(`--${ACTOR_ARG}=`)); return h ? h.slice(ACTOR_ARG.length + 3) : null; };
export const namedApproval = (argv = process.argv) => { const h = argv.find((a) => typeof a === "string" && a.startsWith(`--${APPROVAL_ARG}=`)); return h ? h.slice(APPROVAL_ARG.length + 3) : null; };

/** The exit code of a run refused by the authorisation decision — distinct from scope (3), usage (2) and a check (1). */
export const AUTHORISATION_REFUSED_EXIT = 5;

/**
 * The guard-sink decision for ONE authorisation decision — allowed or refused, both durable in a governed run (an access
 * that was granted or refused is ACCESS under the owner's 23 Sep line). Payload-free.
 */
export function authorisationEvent(d) {
  if (!isGenuineAuthorisation(d)) throw new TypeError("only a decision the authorisation module made is recorded");
  return {
    eventType: "AUTHORISATION_DECISION",
    action: String(d.action ?? "UNNAMED_ACTION").slice(0, 120),
    outcome: d.allowed ? "ALLOWED" : "REFUSED",
    reasonCode: d.outcome,
    metadata: {
      guard: "authorisation",
      classification: d.outcome,
      ruleEntry: String(d.reason).slice(0, 120),
      role: `${d.actorClass ?? "NO_CLASS"}>${d.family ?? "NO_FAMILY"}`,
      resourceRef: d.resourceRefDigest,
    },
  };
}
