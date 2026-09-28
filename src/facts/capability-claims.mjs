/**
 * 🔴 F44 · THE CAPABILITY-CLAIM PRECONDITION — what the fact store must be able to say BEFORE it may hold a claim about what a
 * product can do.
 *
 *   Acceptance: _handoffs/AlmiVisibility_F44_CAPABILITY_CLAIM_PRECONDITION_ACCEPTANCE_2026-09-28.md (d6a41a3, contract block
 *   93badec1…). It is NOT F44's row acceptance and moves no row. Authority: owner direction RR-79 (b9efa74), owner ruling
 *   RR-78 §1.2 (b3c66e4), command RR-79 §3 (54c18eb).
 *
 * The owner's three conditions, in his words, each a limb here:
 *   P1  "add a SELF-SOURCED marking, and prove by test that a self-sourced claim can never be counted as independent
 *        corroboration of itself";
 *   P2  "remove a first-party claim about its own product from the independent tier, and prove the demotion by test";
 *   P3  "add product/tenant scope, and prove a claim cannot be read outside its own scope."
 *   P4  the admission fields of RR-78 §1.2: "the correct product/tenant scope, the source, the checker, the date, the
 *        freshness state and the provenance chain".
 *
 * ── 🔴 FIRST-PARTY IS DECIDED, NEVER TAKEN FROM THE RECORD'S WORD ────────────
 *
 * A claim is SELF-SOURCED when its source is the product owner's own declaration, OR when its source origin resolves through
 * F02 to the SAME tenant the claim is scoped to — a product's own site speaking about the product is first-party however the
 * record labels itself. That second test is CC's derivation from "a first-party claim about its own product", stated in the
 * frozen text (P1). It FAILS CLOSED: an origin F02 cannot place (UNKNOWN, INVALID, AMBIGUOUS) is refused, never assumed
 * independent. An origin declared to no tenant, or to another tenant, is not first-party.
 *
 * ── WHAT THIS MODULE IS NOT ─────────────────────────────────────────────────
 *
 * It reads no store and writes none. Nothing here puts a capability claim into any registry: "Store no capability fact until
 * all three pass" (RR-79 §3), and no command has yet ordered one stored. It names no product, tenant, host or subject.
 */
import { decideForTenant } from "../tenancy/scope.mjs";

export const CAPABILITY_KIND = "capability";
export const SELF_SOURCED = "SELF-SOURCED";
export const INDEPENDENT = "INDEPENDENT";

export const SOURCE_CLASSES = Object.freeze({
  [SELF_SOURCED]: "first-party: the product owner's own declaration, or a source of the claim's own tenant. Outside every independent tier; never independent corroboration of itself; never third-party evidence",
  [INDEPENDENT]: "a source that is neither the owner's declaration nor declared to the claim's own tenant",
});

/** The fact tiers that rank an INDEPENDENT source (schema.mjs TIERS 1–3). A self-sourced claim may hold none of them. */
export const INDEPENDENT_FACT_TIERS = Object.freeze([1, 2, 3]);

/** LAW-BOUND-1: the one bound on every population this module walks, printed beside every result that walks one. */
export const MAX_CLAIMS_PER_CALL = 5000;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const nonEmpty = (v) => typeof v === "string" && v.trim() !== "";

export const isCapabilityClaim = (r) => r?.kind === CAPABILITY_KIND;

function bounded(claims) {
  if (!Array.isArray(claims)) throw new TypeError("a capability-claim population must be an array");
  if (claims.length > MAX_CLAIMS_PER_CALL) throw new RangeError(`POPULATION_OVER_BOUND: ${claims.length} claims exceed the bound of ${MAX_CLAIMS_PER_CALL}`);
  return { population: claims.length, bound: MAX_CLAIMS_PER_CALL };
}

/**
 * P1 · Is this claim's source first-party? Decided by F02, for the claim's own tenant — never by the record's own label.
 * Returns { decided: true, selfSourced, basis } or { decided: false, reason }.
 */
export function firstPartyOf(claim, { resolve }) {
  if (nonEmpty(claim?.source?.declarationRef)) return { decided: true, selfSourced: true, basis: "OWNER_DECLARATION" };
  const origin = claim?.source?.origin;
  if (!nonEmpty(origin)) return { decided: false, reason: "SOURCE_ORIGIN_ABSENT" };
  const d = decideForTenant(resolve, claim?.scope?.tenantId, { resourceKind: "SITE_ORIGIN", resourceRef: origin });
  if (d.outcome === "SAME_TENANT_ALLOWED") return { decided: true, selfSourced: true, basis: "ORIGIN_OF_THE_CLAIMS_OWN_TENANT" };
  if (d.outcome === "CROSS_TENANT_REFUSED") return { decided: true, selfSourced: false, basis: "ORIGIN_OF_ANOTHER_TENANT" };
  /* The requested side must itself have resolved; only then does an undeclared ORIGIN mean "outside every tenant". */
  if (d.outcome === "UNDECLARED_REFUSED" && d.source.state === "RESOLVED" && d.target.state === "UNDECLARED") return { decided: true, selfSourced: false, basis: "ORIGIN_DECLARED_TO_NO_TENANT" };
  return { decided: false, reason: `FIRST_PARTY_UNDECIDABLE_${d.outcome}` };
}

/**
 * P1–P4 · Admit one capability claim, or refuse it with every reason. An admitted record carries the source class the
 * DECISION gave it; a self-sourced record carries no independent tier (its declared tier is kept apart, for audit only).
 */
export function admitCapabilityClaim(claim, { resolve, productResourceOf }) {
  const refusals = [];
  if (!isCapabilityClaim(claim)) refusals.push("NOT_A_CAPABILITY_CLAIM");
  // ── P4 · every field RR-78 §1.2 names ──
  if (!nonEmpty(claim?.scope?.tenantId)) refusals.push("SCOPE_TENANT_ABSENT");
  if (!nonEmpty(claim?.scope?.productId)) refusals.push("SCOPE_PRODUCT_ABSENT");
  if (claim?.source === null || typeof claim?.source !== "object") refusals.push("SOURCE_ABSENT");
  if (!Object.hasOwn(SOURCE_CLASSES, claim?.source?.class ?? "")) refusals.push("SOURCE_CLASS_ABSENT_OR_UNKNOWN");
  if (!nonEmpty(claim?.checker)) refusals.push("CHECKER_ABSENT");
  if (!(typeof claim?.date === "string" && ISO_DAY.test(claim.date))) refusals.push("DATE_ABSENT_OR_MALFORMED");
  if (!nonEmpty(claim?.freshness?.state)) refusals.push("FRESHNESS_STATE_ABSENT");
  if (!(Array.isArray(claim?.provenance) && claim.provenance.length > 0)) refusals.push("PROVENANCE_CHAIN_ABSENT");
  if (refusals.length > 0) return { admitted: false, record: null, refusals };

  // ── P3 · the product belongs to the claim's tenant, decided by F02 ──
  const productResource = typeof productResourceOf === "function" ? productResourceOf(claim.scope.productId) : null;
  if (!productResource) refusals.push("PRODUCT_NOT_DECLARED");
  else {
    const d = decideForTenant(resolve, claim.scope.tenantId, productResource);
    if (!d.allowed) refusals.push(`PRODUCT_NOT_OF_THIS_TENANT_${d.outcome}`);
  }

  // ── P1 · first-party is decided, whatever the record says ──
  const fp = firstPartyOf(claim, { resolve });
  if (!fp.decided) refusals.push(fp.reason);
  const sourceClass = fp.decided && fp.selfSourced ? SELF_SOURCED : claim.source.class;

  // ── P2 · a self-sourced claim holds no independent tier and never reaches VERIFIED ──
  if (sourceClass === SELF_SOURCED && claim.verificationState === "VERIFIED") refusals.push("SELF_SOURCED_CANNOT_BE_VERIFIED");
  if (refusals.length > 0) return { admitted: false, record: null, refusals };

  const declaredTier = claim.source.tier ?? null;
  const tier = sourceClass === SELF_SOURCED ? null : declaredTier;
  const record = Object.freeze({
    ...claim,
    source: Object.freeze({ ...claim.source, class: sourceClass, tier, declaredTier }),
    firstParty: Object.freeze({ selfSourced: sourceClass === SELF_SOURCED, basis: fp.basis, reclassified: sourceClass !== claim.source.class }),
  });
  return { admitted: true, record, refusals: [] };
}

/**
 * P1 · Independent corroboration of ONE capability (same tenant, product and capability id). Every candidate is admitted
 * here, through the one admission — a self-sourced record, or one refused, is never counted. A claim supported only by
 * self-sourced records has zero independent corroboration.
 */
export function independentCorroboration(capabilityId, claims, ctx) {
  const b = bounded(claims);
  const admitted = claims.map((c) => admitCapabilityClaim(c, ctx)).filter((a) => a.admitted).map((a) => a.record);
  const same = admitted.filter((r) => r.capabilityId === capabilityId);
  const independent = same.filter((r) => r.source.class === INDEPENDENT).length;
  const selfSourcedExcluded = same.filter((r) => r.source.class === SELF_SOURCED).length;
  return { capabilityId, independent, selfSourcedExcluded, refused: claims.length - admitted.length, ...b };
}

/** P1 · A record may be shown as third-party evidence only when it is independent. A self-sourced one throws, by name. */
export function presentAsThirdParty(record) {
  if (record?.source?.class !== INDEPENDENT) throw new Error(`SELF_SOURCED_IS_NOT_THIRD_PARTY: a ${record?.source?.class ?? "unclassified"} capability claim is never presented as third-party evidence`);
  return Object.freeze({ capabilityId: record.capabilityId, sourceClass: INDEPENDENT, tier: record.source.tier, checker: record.checker, date: record.date });
}

/** P2 · the tier an independent-tier reader may use for a capability claim: null for anything not independent. */
export const independentTierOf = (record) => (record?.source?.class === INDEPENDENT && INDEPENDENT_FACT_TIERS.includes(record.source.tier) ? record.source.tier : null);

/**
 * P3 · Read the capability claims of ONE requested tenant and product. The tenant is decided by F02 for every record (the
 * requested tenant must be an ACTIVE declaration); a request naming no tenant returns nothing.
 */
export function readCapabilityClaims(records, { resolve, requestedTenantId, productId }) {
  const b = bounded(records);
  if (!nonEmpty(requestedTenantId)) return { claims: [], returned: 0, withheld: records.length, refused: "NO_TENANT_REQUESTED", ...b };
  if (!nonEmpty(productId)) return { claims: [], returned: 0, withheld: records.length, refused: "NO_PRODUCT_REQUESTED", ...b };
  const claims = records.filter((r) => {
    if (!isCapabilityClaim(r) || r?.scope?.productId !== productId) return false;
    return decideForTenant(resolve, requestedTenantId, { resourceKind: "TENANT_PARTITION", resourceRef: r?.scope?.tenantId }).allowed;
  });
  return { claims, returned: claims.length, withheld: records.length - claims.length, refused: null, ...b };
}

/** P4 · How many capability claims a registry holds. Printed with its population and bound (LAW-BOUND-1). */
export function registryCapabilityCensus(records) {
  const b = bounded(records);
  return { capabilityClaims: records.filter(isCapabilityClaim).length, ...b };
}
