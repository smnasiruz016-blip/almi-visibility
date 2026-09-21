/**
 * 🔴 RESOURCE ATTACHMENTS — WHEN TWO RESOURCES MAY EXCHANGE EVIDENCE.
 *
 * Owner architecture ruling, 21 September 2026
 * (`_handoffs/AlmiVisibility_OWNER_RULING_2026-09-21_TENANT_RESOURCE_ATTACHMENTS.md`):
 * a tenant is the client or subject isolation boundary; a site, a fact registry, an observation batch, a source
 * register and an evidence store are RESOURCE ATTACHMENTS. Two of them may exchange evidence ONLY when both
 * explicitly declare the same subject, the relationship is machine-readable, neither identity is inferred from a
 * hostname, directory, product name, record prefix or model knowledge, each stays separately named and auditable,
 * and a resource attached to another subject stays cross-tenant and INVALID.
 *
 * ── WHAT THIS MODULE DOES, AND THE ONE THING IT NEVER DOES ─────────────────
 *
 * It asks the production resolver (./resolver.mjs) about EACH resource separately and compares the two ANSWERS. It
 * never compares the two REFERENCES: a host that looks like a registry's name, a directory that shares a word with a
 * product, a record prefix — none of those is ever read as a subject. A caller that brings an identity it inferred is
 * REFUSED before the resolver is asked, so an inference cannot be laundered through a lookup.
 *
 * ── THE SIX OUTCOMES ───────────────────────────────────────────────────────
 *
 *   BOUND                 both resolve, by explicit declaration, to the SAME subject
 *   INVALID_CROSS_TENANT  both resolve, to DIFFERENT subjects
 *   UNBOUND               at least one resolves UNDECLARED — a missing declaration is never "the usual subject"
 *   AMBIGUOUS             at least one resolves AMBIGUOUS
 *   REFUSED               an identity was inferred (hostname, directory, product name, record prefix, model knowledge)
 *   INVALID               a FIXTURE resource and a REAL resource are mixed, or a declaration is malformed or points nowhere
 *
 * UNKNOWN (the declaration source could not be read) is carried as UNKNOWN — "could not look" is not "unbound".
 * Only BOUND carries a subject, and it names no product.
 */

export const BINDINGS = Object.freeze(["BOUND", "INVALID_CROSS_TENANT", "UNBOUND", "AMBIGUOUS", "REFUSED", "INVALID", "UNKNOWN"]);

/** The bases a reference may NOT rest on. A reference is read from a stored field, never derived from a name. */
export const INFERENCE_BASES = Object.freeze(["HOSTNAME", "DIRECTORY", "PRODUCT_NAME", "RECORD_PREFIX", "MODEL_KNOWLEDGE"]);

export const EVIDENCE_CLASSES = Object.freeze(["REAL", "FIXTURE"]);

const result = (binding, tenantId, why, a = null, b = null) => Object.freeze({ binding, tenantId, why, resolved: Object.freeze([a, b]) });

/**
 * Bind two resources.
 * @param {(ref: {resourceKind: string, resourceRef: string}) => {state: string, tenantId: string|null}} resolve
 *        the production resolver — injected, never built here, so the dependency is declared and testable
 * @param {{resourceKind: string, resourceRef: string, evidenceClass: string, inferredFrom?: string}} a
 * @param {{resourceKind: string, resourceRef: string, evidenceClass: string, inferredFrom?: string}} b
 */
export function bindResources(resolve, a, b) {
  if (typeof resolve !== "function") throw new TypeError("bindResources needs the production resolver — a subject is declared, never assumed");
  for (const r of [a, b]) {
    if (r?.inferredFrom !== undefined) {
      return result("REFUSED", null, `${r?.resourceKind} ${JSON.stringify(r?.resourceRef)} carries an identity inferred from ${JSON.stringify(r.inferredFrom)} — only an explicit declaration may attach a resource to a subject`);
    }
  }
  for (const r of [a, b]) {
    if (!EVIDENCE_CLASSES.includes(r?.evidenceClass)) {
      return result("INVALID", null, `${r?.resourceKind} ${JSON.stringify(r?.resourceRef)} declares evidenceClass ${JSON.stringify(r?.evidenceClass)}; it must be one of ${EVIDENCE_CLASSES.join(", ")}`);
    }
  }
  if (a.evidenceClass !== b.evidenceClass) {
    return result("INVALID", null, `a ${a.evidenceClass} resource and a ${b.evidenceClass} resource are mixed — a fixture never exchanges evidence with a real subject`);
  }
  const ra = resolve({ resourceKind: a.resourceKind, resourceRef: a.resourceRef });
  const rb = resolve({ resourceKind: b.resourceKind, resourceRef: b.resourceRef });
  const states = [ra?.state, rb?.state];
  if (states.includes("UNKNOWN")) return result("UNKNOWN", null, "the declaration source could not be read — could not look is not unbound", ra, rb);
  if (states.includes("INVALID")) return result("INVALID", null, "a declaration is malformed or attaches a resource to a scope that is not declared", ra, rb);
  if (states.includes("AMBIGUOUS")) return result("AMBIGUOUS", null, "a resource is attached to more than one subject — never resolved by order or recency", ra, rb);
  if (states.includes("UNDECLARED") || states.some((s) => s !== "RESOLVED")) return result("UNBOUND", null, "a resource has no declaration attaching it to a subject", ra, rb);
  if (typeof ra.tenantId !== "string" || typeof rb.tenantId !== "string") return result("INVALID", null, "a RESOLVED answer carried no subject", ra, rb);
  if (ra.tenantId !== rb.tenantId) return result("INVALID_CROSS_TENANT", null, "the two resources are declared to different subjects — cross-tenant evidence is INVALID, never UNKNOWN and never a pass", ra, rb);
  return result("BOUND", ra.tenantId, "both resources are explicitly declared to the same subject", ra, rb);
}
