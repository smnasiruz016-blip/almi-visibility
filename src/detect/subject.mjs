/**
 * THE SUBJECT BINDING CONTRACT, V1 — what a detector result is ABOUT, said in machine-readable form.
 *
 * ── 🔴 WHY THIS EXISTS, AND IT IS NOT A TIDYING EXERCISE ────────────────────────────────────────
 *
 * The Case Study was sat once and failed 1 of 6, and the diagnosis was not sensitivity: the
 * comparators fired 6,640 times and five of six planted defects went unfound. The findings and the
 * subjects being scored were largely DISJOINT POPULATIONS — thousands of results attached to file
 * paths nobody was asking about, while the pages under examination drew nothing. An engine that
 * reports that much and still misses the question is not short of detection. It is short of a way
 * to say WHICH SUBJECT it is talking about, and to refuse when it cannot.
 *
 * So V1 gives every result three things it did not have: a TENANT, a TYPED SUBJECT, and a BINDING
 * STATE that says whether the link between them is lawful. It does not discover new relationships
 * and it does not repair the failed run. It makes the gap legible, and it makes an unbound result
 * unable to pass itself off as an actionable finding.
 *
 * 🔴 THE FOUR STATES ARE NOT A CONFIDENCE SCALE. They are four different situations, and the whole
 * value is in never collapsing them:
 *
 *   BOUND       exactly one lawful subject, and evidence that binds it
 *   AMBIGUOUS   two or more lawful candidates — ALL of them named, never silently picked between
 *   UNBOUND     a candidate exists and no lawful evidence edge reaches it
 *   INVALID     missing identity, a cross-tenant edge, contradictory identity, or a malformed edge
 *
 * AMBIGUOUS and UNBOUND are honest coverage gaps. INVALID is a fault. Merging them would let a
 * broken tenant boundary read as "we could not tell", which is precisely the shape that lets bad
 * evidence travel.
 */

/** The binding states. Frozen: a fifth state is a deliberate change to this contract, not a patch. */
export const BINDING_STATES = Object.freeze(["BOUND", "AMBIGUOUS", "UNBOUND", "INVALID"]);

/**
 * The subject types V1 recognises — exactly the inputs the existing A–F comparators already read,
 * and not one more. A type added speculatively is a type nothing can bind, and it would make the
 * coverage numbers below look better than the engine is.
 */
export const SUBJECT_TYPES = Object.freeze([
  "PAGE",
  "URL_ROUTE",
  "SERVED_OBSERVATION",
  "RENDERED_OBSERVATION",
  "SITEMAP_ENTRY",
  "SOURCE_ARTIFACT",
  "PRODUCER",
  "PUBLIC_CLAIM",
  "FACT_RECORD",
]);

/**
 * 🔴 THE IDENTITY KINDS THAT MAY STAND ALONE, AND THE ONES THAT MAY NEVER.
 *
 * Everything on the left is a stable identifier something else already assigned: a tenant id, a
 * page id, a canonicalised URL, an observation id, a path pinned to a commit, a fact id. Everything
 * that is merely SUGGESTIVE — matching text, an equal number, a similar filename, sitting in the
 * same directory, arriving first — is not identity and is not a binding.
 *
 * That list is not hypothetical caution. "Same number" and "same words" are exactly how a binder
 * starts attaching a correct page to an unrelated collection and inventing a defect on it.
 */
export const IDENTITY_KINDS = Object.freeze([
  "TENANT_ID",
  "PAGE_ID",
  "CANONICAL_URL",
  "OBSERVATION_ID",
  "PATH_AT_COMMIT",
  "FACT_ID",
  "STRUCTURED_REFERENCE",
]);

const filled = (v) => typeof v === "string" && v.trim() !== "";

/**
 * A typed reference to one subject.
 *
 * 🔴 NO FIELD CARRIES A DEFAULT. A subject with a missing tenant is not a subject with an assumed
 * tenant; it is a subject nothing may be concluded about, and it must be impossible to build one
 * quietly. Every absence throws here rather than travelling as a plausible-looking record.
 */
export function subjectRef({ type, tenantId, identityKind, identity, locator }) {
  if (!SUBJECT_TYPES.includes(type)) {
    throw new TypeError(`subjectRef: type ${JSON.stringify(type)} is not one of ${SUBJECT_TYPES.join(", ")} — V1 adds no subject types`);
  }
  if (!filled(tenantId)) {
    throw new TypeError(`subjectRef(${type}): tenantId is required — a subject with no tenant cannot be isolated, and an absent tenant never means "the usual one"`);
  }
  if (!IDENTITY_KINDS.includes(identityKind)) {
    throw new TypeError(`subjectRef(${type}): identityKind ${JSON.stringify(identityKind)} is not a stable identity. Resemblance, proximity, position and order are not identity`);
  }
  if (!filled(identity)) throw new TypeError(`subjectRef(${type}): identity is required`);
  if (!filled(locator)) throw new TypeError(`subjectRef(${type}): locator is required — a reference nobody can follow is not evidence`);
  return Object.freeze({ type, tenantId, identityKind, identity, locator });
}

/** Two references are the same subject when tenant, type and identity all agree. */
export function sameSubject(a, b) {
  return Boolean(a && b && a.tenantId === b.tenantId && a.type === b.type && a.identity === b.identity);
}

/** A reference, rendered for the findings output — stable, sorted-friendly, no clock. */
export function refLabel(ref) {
  return ref ? `${ref.tenantId}:${ref.type}:${ref.identity}` : null;
}
