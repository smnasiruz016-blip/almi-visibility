/**
 * 🔴 F02 · THE ONE TENANT-SCOPE DECISION — every governed relationship reaches THIS, and no path decides tenancy itself.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F02_ACCEPTANCE_2026-09-24.md (3ea6fda, contract 9b6273d6…).
 *
 * A RESOURCE is { resourceKind, resourceRef, scopeClass }. `resourceKind` is null when the resource has no declared
 * kind at all (an evidence store, a cost ledger, a cache); `resourceRef` is read from a STORED field or a declared
 * location, never computed from a name to CREATE a scope — a host or path may only LOCATE a declaration through the
 * production resolver (./resolver.mjs), which is the sole authority. `scopeClass` is TENANT unless the caller holds a
 * resource of another class; GLOBAL_PRODUCT and SUBJECT resources are never joined through tenancy.
 *
 * THE DECISION, in this order, and nothing else:
 *   1. both sides are RESOLVED first — nothing about either is compared before both answers exist;
 *   2. a non-TENANT scope class on either side refuses (SCOPE_MISMATCH): GLOBAL_PRODUCT is not a tenant join, and a
 *      SUBJECT resource does not silently become TENANT-scoped. No CURRENT declaration defines a SUBJECT/TENANT
 *      relationship today, so there is no exception to consult — the day one exists, it is a declared kind the
 *      resolver answers, not a branch here;
 *   3. UNKNOWN (the declaration source could not be read), INVALID, AMBIGUOUS and UNDECLARED each refuse, by name;
 *   4. two RESOLVED answers naming different tenants refuse (CROSS_TENANT); only the same tenant is ALLOWED.
 *
 * ALLOWED is NECESSARY, never sufficient: the caller's own role, permission and write-law checks still apply.
 *
 * WHAT A DECISION CARRIES: the outcome, a reason code, and per side the resource kind, a 16-hex digest of the reference,
 * the scope class and the resolver's state. It carries NO tenant identifier of either side and no payload — a refusal
 * cannot tell one tenant anything about another's.
 */
import { createHash } from "node:crypto";

export const SCOPE_CLASSES = Object.freeze(["GLOBAL_PRODUCT", "TENANT", "SUBJECT"]);
export const SCOPE_OUTCOMES = Object.freeze([
  "SAME_TENANT_ALLOWED", "CROSS_TENANT_REFUSED", "UNDECLARED_REFUSED", "AMBIGUOUS_REFUSED",
  "SCOPE_MISMATCH_REFUSED", "INVALID_REFUSED", "UNKNOWN_REFUSED",
]);

const digest = (kind, ref) => createHash("sha256").update(`${kind ?? "NO_KIND"}\u0000${ref ?? ""}`, "utf8").digest("hex").slice(0, 16);

/** One side, resolved — never compared to anything before this returns. */
export function resolveSide(resolve, resource) {
  if (typeof resolve !== "function") throw new TypeError("a tenant-scope decision needs the production resolver — a scope is declared, never assumed");
  const scopeClass = resource?.scopeClass ?? "TENANT";
  const side = { resourceKind: resource?.resourceKind ?? null, resourceRefDigest: digest(resource?.resourceKind, resource?.resourceRef), scopeClass };
  if (!SCOPE_CLASSES.includes(scopeClass)) return { ...side, state: "INVALID", reason: "UNDECLARED_SCOPE_CLASS", tenantId: null };
  if (scopeClass !== "TENANT") return { ...side, state: "NOT_TENANT", reason: `${scopeClass}_IS_NOT_A_TENANT_RESOURCE`, tenantId: null };
  if (resource?.resourceKind === null || resource?.resourceKind === undefined) return { ...side, state: "UNDECLARED", reason: "NO_DECLARED_RESOURCE_KIND", tenantId: null };
  /* A store partitioned BY the declared tenant id: its key is a declaration, so it resolves exactly as a requested tenant
   * does — to that id when it is ACTIVE, and never otherwise. No name, host or path takes part. */
  if (resource.resourceKind === "TENANT_PARTITION") { const p = requestSide(resolve, resource.resourceRef); return { ...side, state: p.state, reason: p.reason === "EXPLICIT_DECLARED_TENANT" ? "PARTITION_KEY_IS_A_DECLARED_TENANT" : p.reason, tenantId: p.tenantId }; }
  const a = resolve({ resourceKind: resource.resourceKind, resourceRef: resource.resourceRef });
  const own = { ...side, state: a?.state ?? "UNKNOWN", reason: a?.reason ?? "NO_ANSWER", tenantId: a?.state === "RESOLVED" ? a.tenantId : null };
  if (own.state !== "RESOLVED" || !Array.isArray(resource.members)) return own;
  /* 🔴 A CONTAINER'S MEMBERS CARRY THEIR OWN IDENTITY (a crawled page is its site's page). A member whose identity is
   * declared to ANOTHER tenant gives that item two declared scopes — the container's and its own — and an item with two
   * scopes has no one scope: the container is AMBIGUOUS. A member nobody declared makes no competing claim. */
  for (const m of resource.members) {
    const r = resolve({ resourceKind: m.resourceKind, resourceRef: m.resourceRef });
    if (r?.state === "RESOLVED" && r.tenantId !== own.tenantId) return { ...own, state: "AMBIGUOUS", reason: "MEMBER_DECLARED_TO_ANOTHER_TENANT", tenantId: null };
    if (r?.state === "AMBIGUOUS") return { ...own, state: "AMBIGUOUS", reason: "MEMBER_ATTACHMENTS_CONFLICT", tenantId: null };
    if (r?.state === "INVALID" || r?.state === "UNKNOWN") return { ...own, state: r.state, reason: `MEMBER_${r.reason}`, tenantId: null };
  }
  return own;
}

const publicSide = ({ tenantId, ...rest }) => Object.freeze(rest);
const decision = (outcome, reason, a, b) => Object.freeze({ outcome, allowed: outcome === "SAME_TENANT_ALLOWED", reason, source: publicSide(a), target: publicSide(b) });

/** The outcome of two resolved sides. Pure: it never resolves, never reads, never falls back. */
export function decideSides(a, b) {
  for (const s of [a, b]) if (s.state === "NOT_TENANT") return decision("SCOPE_MISMATCH_REFUSED", s.reason, a, b);
  const states = [a.state, b.state];
  if (states.includes("UNKNOWN")) return decision("UNKNOWN_REFUSED", "DECLARATION_SOURCE_NOT_READ", a, b);
  if (states.includes("INVALID")) return decision("INVALID_REFUSED", [a, b].find((s) => s.state === "INVALID").reason, a, b);
  if (states.includes("AMBIGUOUS")) return decision("AMBIGUOUS_REFUSED", [a, b].find((s) => s.state === "AMBIGUOUS").reason, a, b);
  if (states.some((s) => s !== "RESOLVED")) return decision("UNDECLARED_REFUSED", [a, b].find((s) => s.state !== "RESOLVED").reason, a, b);
  if (typeof a.tenantId !== "string" || typeof b.tenantId !== "string") return decision("INVALID_REFUSED", "RESOLVED_WITHOUT_TENANT", a, b);
  if (a.tenantId !== b.tenantId) return decision("CROSS_TENANT_REFUSED", "DECLARED_TO_DIFFERENT_TENANTS", a, b);
  return decision("SAME_TENANT_ALLOWED", "DECLARED_TO_THE_SAME_TENANT", a, b);
}

/**
 * Two tenant ids that the production resolver ALREADY answered upstream (each object carries the id its own resolution
 * returned, or null) — decided by the same decision, so a module holding resolved answers never compares them itself.
 * A missing id is UNDECLARED; an id of the wrong shape is INVALID.
 */
export function decideResolvedTenants(aTenantId, bTenantId, { sourceKind = "RESOLVED_UPSTREAM", targetKind = "RESOLVED_UPSTREAM" } = {}) {
  const side = (t, k) => {
    const base = { resourceKind: k, resourceRefDigest: digest(k, t), scopeClass: "TENANT" };
    if (t === null || t === undefined || t === "") return { ...base, state: "UNDECLARED", reason: "NO_RESOLVED_TENANT", tenantId: null };
    /* The SHAPE of a tenant id is the resolver's to enforce (TENANT_ID_PATTERN, upstream): every id reaching here came from
     * a resolution. What this decides is presence and sameness. A non-string is never an id. */
    if (typeof t !== "string") return { ...base, state: "INVALID", reason: "NOT_A_TENANT_ID", tenantId: null };
    return { ...base, state: "RESOLVED", reason: "RESOLVED_UPSTREAM", tenantId: t };
  };
  return decideSides(side(aTenantId, sourceKind), side(bTenantId, targetKind));
}

/** A relationship between two resources: BOTH resolved, then decided. */
export const decideRelationship = (resolve, source, target) => decideSides(resolveSide(resolve, source), resolveSide(resolve, target));

/**
 * A resource against a run's REQUESTED tenant. The request is itself checked: it must name an ACTIVE declared tenant,
 * or every decision under it refuses — an absent or unknown request never means "the usual tenant".
 */
export function decideForTenant(resolve, requestedTenantId, resource) {
  const requested = requestSide(resolve, requestedTenantId);
  return decideSides(requested, resolveSide(resolve, resource));
}

function requestSide(resolve, tenantId) {
  const side = { resourceKind: "REQUESTED_TENANT", resourceRefDigest: digest("REQUESTED_TENANT", tenantId), scopeClass: "TENANT" };
  const active = resolve?.declarations?.readable ? (resolve.declarations.tenants ?? []).filter((t) => t?.status === "ACTIVE").map((t) => t.tenantId) : null;
  if (active === null) return { ...side, state: "UNKNOWN", reason: "DECLARATION_SOURCE_NOT_READ", tenantId: null };
  if (typeof tenantId !== "string" || tenantId === "") return { ...side, state: "UNDECLARED", reason: "NO_TENANT_REQUESTED", tenantId: null };
  if (!active.includes(tenantId)) return { ...side, state: "INVALID", reason: "REQUESTED_TENANT_NOT_ACTIVE_DECLARED", tenantId: null };
  return { ...side, state: "RESOLVED", reason: "EXPLICIT_DECLARED_TENANT", tenantId };
}

/** The guard-sink decision for a refusal (F08: a REFUSAL is ACCESS, durable in a governed run). Payload-free. */
export function scopeRefusalEvent(d, { resource = "target" } = {}) {
  const side = d[resource];
  return {
    eventType: "REFUSAL",
    action: "REFUSE_TENANT_SCOPE_RELATIONSHIP",
    outcome: "REFUSED",
    reasonCode: d.outcome,
    metadata: {
      guard: "tenant-scope",
      classification: d.outcome,
      ruleEntry: String(d.reason).slice(0, 120),
      role: `${d.source.scopeClass}>${d.target.scopeClass}`,
      resourceRef: side.resourceRefDigest,
    },
  };
}
