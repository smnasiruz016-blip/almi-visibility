/**
 * EVIDENCE EDGES AND TENANT ISOLATION — the half of the contract that can REFUSE.
 *
 * A subject reference says what a result is about. An edge says WHY that is lawful, and this module
 * is what decides whether the edge is one. Its default answer is no.
 *
 * ── 🔴 THE DIRECTION OF THE DEFAULT ─────────────────────────────────────────────────────────────
 *
 * Everything here starts UNBOUND or INVALID and only positive, well-formed, same-tenant evidence
 * moves it. Written the other way round — assume bound, subtract on suspicion — a missing edge
 * would read as a binding, which is the failure this whole contract exists to prevent.
 *
 * ── 🔴 TENANT ISOLATION IS A REFUSAL, NOT A FILTER ──────────────────────────────────────────────
 *
 * A cross-tenant edge does not yield a weaker result. It yields INVALID, loudly, because one
 * tenant's evidence reaching another tenant's subject is not a coverage gap — it is a boundary
 * failure, and a boundary failure that degrades gracefully is one nobody notices for a month.
 * Generic engine code is shared freely; a tenant's own subjects and edges never are.
 */
import { BINDING_STATES, sameSubject, refLabel } from "./subject.mjs";

/**
 * The edge types V1 admits. Each names a relationship something else already recorded — a tenant
 * registration, an observation of a page, a render of an observation, a route a framework derived,
 * a sitemap entry, an artifact a claim came from, a fact supporting a claim, a producer behind one.
 *
 * 🔴 CLOSED ON PURPOSE. An edge type invented to make a particular result bind is not evidence; it
 * is a story about why this one should count.
 */
export const EDGE_TYPES = Object.freeze([
  "BELONGS_TO_TENANT",
  "OBSERVATION_OF_PAGE",
  "RENDER_OF_OBSERVATION",
  "PAGE_HAS_ROUTE",
  "SITEMAP_ADVERTISES_PAGE",
  "CLAIM_FROM_ARTIFACT",
  "CLAIM_SUPPORTED_BY_FACT",
  "CLAIM_PRODUCED_BY",
]);

/** Why a binding is not BOUND. Frozen, so "it did not bind" can itself be audited. */
export const BINDING_REASONS = Object.freeze({
  BOUND_SINGLE_LAWFUL_EDGE: "exactly one lawful same-tenant edge reaches exactly one subject",
  AMBIGUOUS_MULTIPLE_CANDIDATES: "two or more lawful candidates; none may be chosen between",
  UNBOUND_NO_EDGE: "a candidate exists and no lawful evidence edge reaches it",
  INVALID_NO_TENANT: "a subject or edge carries no tenant",
  INVALID_CROSS_TENANT: "the edge joins two different tenants",
  INVALID_EDGE_SHAPE: "the edge is malformed or names a type outside the contract",
  INVALID_CONTRADICTORY_IDENTITY: "one stable identity is claimed by two disagreeing subjects",
});

const filled = (v) => typeof v === "string" && v.trim() !== "";

/**
 * An evidence edge.
 *
 * 🔴 IT MUST NAME ITS ARTIFACT AND ITS METHOD. "These are related" is not evidence; "this
 * observation record, read this way, records that relationship" is. Without both, an edge is an
 * assertion wearing a schema.
 */
export function evidenceEdge({ from, to, edgeType, tenantId, method, artifact, reason }) {
  if (!EDGE_TYPES.includes(edgeType)) {
    throw new TypeError(`evidenceEdge: edgeType ${JSON.stringify(edgeType)} is not one of ${EDGE_TYPES.join(", ")} — V1 adds no edge types`);
  }
  if (!filled(tenantId)) throw new TypeError("evidenceEdge: tenantId is required");
  if (!filled(method)) throw new TypeError("evidenceEdge: method is required — how the relationship was read");
  if (!filled(artifact)) throw new TypeError("evidenceEdge: artifact is required — the record it was read from");
  if (!filled(reason)) throw new TypeError("evidenceEdge: reason is required, and it must be deterministic");
  if (!from || !to) throw new TypeError("evidenceEdge: both endpoints are required");
  return Object.freeze({ from, to, edgeType, tenantId, method, artifact, reason });
}

/** An edge is well-formed and stays inside one tenant, or it is INVALID. Never "mostly fine". */
export function edgeFault(edge) {
  if (!edge || typeof edge !== "object") return "INVALID_EDGE_SHAPE";
  if (!EDGE_TYPES.includes(edge.edgeType)) return "INVALID_EDGE_SHAPE";
  if (!filled(edge.tenantId) || !filled(edge.from?.tenantId) || !filled(edge.to?.tenantId)) return "INVALID_NO_TENANT";
  if (edge.from.tenantId !== edge.tenantId || edge.to.tenantId !== edge.tenantId) return "INVALID_CROSS_TENANT";
  if (!filled(edge.method) || !filled(edge.artifact) || !filled(edge.reason)) return "INVALID_EDGE_SHAPE";
  return null;
}

/**
 * Decide the binding for one result.
 *
 * `candidates` are the lawful subjects this result could be about; `edges` are the evidence reaching
 * them. The order below is not arbitrary — a fault is checked BEFORE a count, so a cross-tenant edge
 * can never be reported as mere ambiguity.
 */
export function bindSubject({ tenantId, candidates, edges } = {}) {
  if (!filled(tenantId)) {
    return Object.freeze({ state: "INVALID", reason: "INVALID_NO_TENANT", subject: null, edges: [], candidates: [], detail: "no tenant was supplied for this result" });
  }
  const cands = Array.isArray(candidates) ? candidates : [];
  const es = Array.isArray(edges) ? edges : [];

  /* 🔴 FAULTS FIRST. A malformed or cross-tenant edge is a fault about this result, not a reason to
   * fall back to a softer state — and it is reported even when other lawful edges also exist. */
  for (const e of es) {
    const fault = edgeFault(e);
    if (fault) {
      return Object.freeze({ state: "INVALID", reason: fault, subject: null, edges: [], candidates: cands.map(refLabel), detail: `edge ${e?.edgeType ?? "(malformed)"}: ${BINDING_REASONS[fault]}` });
    }
  }
  const foreign = cands.filter((c) => c?.tenantId !== tenantId);
  if (foreign.length > 0) {
    return Object.freeze({ state: "INVALID", reason: "INVALID_CROSS_TENANT", subject: null, edges: [], candidates: cands.map(refLabel), detail: `candidate(s) from another tenant: ${foreign.map(refLabel).join(", ")}` });
  }

  /* One stable identity claimed by two subjects that disagree is a contradiction, not a choice. */
  const byIdentity = new Map();
  for (const c of cands) {
    const key = `${c.type}:${c.identity}`;
    const prior = byIdentity.get(key);
    if (prior && !sameSubject(prior, c)) {
      return Object.freeze({ state: "INVALID", reason: "INVALID_CONTRADICTORY_IDENTITY", subject: null, edges: [], candidates: cands.map(refLabel), detail: `identity ${key} is claimed twice and the two disagree` });
    }
    byIdentity.set(key, c);
  }

  const distinct = [...byIdentity.values()];
  if (distinct.length === 0) {
    return Object.freeze({ state: "UNBOUND", reason: "UNBOUND_NO_EDGE", subject: null, edges: [], candidates: [], detail: "no lawful candidate subject was offered for this result" });
  }
  if (distinct.length > 1) {
    return Object.freeze({ state: "AMBIGUOUS", reason: "AMBIGUOUS_MULTIPLE_CANDIDATES", subject: null, edges: es, candidates: distinct.map(refLabel), detail: `${distinct.length} lawful candidates, all named: ${distinct.map(refLabel).join(", ")}` });
  }

  const subject = distinct[0];
  const reaching = es.filter((e) => sameSubject(e.to, subject) || sameSubject(e.from, subject));
  if (reaching.length === 0) {
    return Object.freeze({ state: "UNBOUND", reason: "UNBOUND_NO_EDGE", subject: null, edges: [], candidates: [refLabel(subject)], detail: `the candidate ${refLabel(subject)} exists and no lawful edge reaches it` });
  }
  return Object.freeze({ state: "BOUND", reason: "BOUND_SINGLE_LAWFUL_EDGE", subject, edges: reaching, candidates: [refLabel(subject)], detail: `${reaching.length} lawful same-tenant edge(s) reach ${refLabel(subject)}` });
}

/**
 * 🔴 THE RULE THAT CHANGES WHAT LEAVES THE ENGINE.
 *
 * A FINDING is an accusation someone will act on, so it may leave only on a BOUND subject. A CLEAN
 * is a statement that something was examined and is well, so it needs the same. Everything else
 * becomes UNKNOWN with a COVERAGE_GAP reason — visible, countable, and useless to anyone trying to
 * report progress with it.
 *
 * NOT_APPLICABLE passes through untouched: it already means "nothing of this kind is here", which
 * is a statement about the DETECTOR's scope rather than about a subject, and it is unscored.
 */
export const COVERAGE_REASONS = Object.freeze({
  COVERAGE_GAP_AMBIGUOUS: "the result could be about more than one subject, and none was chosen",
  COVERAGE_GAP_UNBOUND: "the result names no subject that lawful evidence reaches",
  BINDING_INVALID: "the binding is faulty — this fails closed and is never reported as a finding",
});

export function effectiveOutcome(detectorOutcome, bindingState) {
  if (!BINDING_STATES.includes(bindingState)) throw new TypeError(`unknown binding state ${JSON.stringify(bindingState)}`);
  if (detectorOutcome === "NOT_APPLICABLE" || detectorOutcome === "UNKNOWN") return { outcome: detectorOutcome, reason: null };
  if (bindingState === "BOUND") return { outcome: detectorOutcome, reason: null };
  if (bindingState === "AMBIGUOUS") return { outcome: "UNKNOWN", reason: "COVERAGE_GAP_AMBIGUOUS" };
  if (bindingState === "UNBOUND") return { outcome: "UNKNOWN", reason: "COVERAGE_GAP_UNBOUND" };
  return { outcome: "UNKNOWN", reason: "BINDING_INVALID" };
}
