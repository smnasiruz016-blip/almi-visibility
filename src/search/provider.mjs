/**
 * SEARCH DATA PROVIDER — the provider-neutral interface (V5.1 §64).
 *
 * ── 🔴 WHAT THIS DELIBERATELY DOES NOT DO ───────────────────────────────────
 *
 * THERE IS NO REGISTRY AND NO ROUTER. One adapter exists. A registry built for
 * one implementation is a lookup table with a single row, and the second entry
 * — whenever it arrives — will want a shape nobody can predict today. So the
 * interface is a written contract plus an assertion, and callers hold a
 * provider directly.
 *
 * The purchase of the interface is not pluggability. It is that the ENGINE
 * cannot reach for a Google-shaped field: everything downstream of `queryRows`
 * sees `SearchQueryResult`, so a second provider is an addition rather than a
 * rewrite of every caller.
 *
 * ── 🔴 AND IT INVENTS NO COSTS ──────────────────────────────────────────────
 *
 * `CostRecord.amountState` exists so that "this was free" and "nobody measured
 * this" cannot look the same. A rate without a volume is not a cost (U-COST-4),
 * so nothing here multiplies anything by anything.
 */

/** Whether the account may read a property. Never inferred from an empty result. */
export const AUTH_STATES = Object.freeze(["GRANTED", "FORBIDDEN", "UNKNOWN"]);

/** Search Console's two property kinds. */
export const PROPERTY_TYPES = Object.freeze(["DOMAIN", "URL_PREFIX"]);

/**
 * Whether a result is the WHOLE answer.
 *
 * 🔴 There is no 'PARTIAL'. A result is either provably complete or UNKNOWN,
 * because "partial" reads as a mild sort of complete and gets quoted as a total.
 * That is exactly the defect of 11 September 2026 (see paginate.mjs).
 */
export const DATA_STATES = Object.freeze(["COMPLETE", "UNKNOWN"]);

/** Why a result stopped short. `null` when it did not. */
export const TRUNCATION_REASONS = Object.freeze([null, "MAX_REQUESTS", "API_ERROR"]);

/** How a money figure was arrived at. See the header note. */
export const AMOUNT_STATES = Object.freeze(["MEASURED", "ZERO_BY_TARIFF", "UNKNOWN"]);

/**
 * Build a CostRecord.
 *
 * 🔴 `amount` and `amountState` are BOTH required and are not derived from each
 * other. An amount of 0 with no state would be indistinguishable from an
 * unmeasured field defaulting to zero, and a zero that means "nobody looked" is
 * the quietest wrong number in a cost report.
 */
export function costRecord({ provider, apiCalls, billableUnits, currency, amount, amountState, basis }) {
  if (typeof provider !== "string" || provider === "") throw new TypeError("costRecord: provider is required");
  if (!Number.isInteger(apiCalls) || apiCalls < 0) throw new TypeError("costRecord: apiCalls must be a non-negative integer");
  if (!AMOUNT_STATES.includes(amountState)) throw new TypeError(`costRecord: amountState must be one of ${AMOUNT_STATES.join("|")}`);
  if (amountState !== "UNKNOWN" && typeof amount !== "number") throw new TypeError("costRecord: a non-UNKNOWN amount must be a number");
  if (amountState === "UNKNOWN" && amount !== null) throw new TypeError("costRecord: an UNKNOWN amount must be null, not 0");
  if (typeof basis !== "string" || basis === "") throw new TypeError("costRecord: basis is required — a figure without a basis is a guess");
  return Object.freeze({ provider, apiCalls, billableUnits, currency, amount, amountState, basis });
}

/**
 * Assert that an object satisfies the SearchDataProvider contract.
 *
 * 🔴 This checks SHAPE ONLY and says so. It cannot tell a working adapter from
 * one that returns nonsense, and a caller that treats a pass here as proof of
 * a working connector has mistaken a type check for §252.
 */
export function assertProviderShape(provider) {
  if (!provider || typeof provider !== "object") throw new TypeError("provider must be an object");
  if (typeof provider.providerId !== "string" || provider.providerId === "") {
    throw new TypeError("provider.providerId must be a non-empty string");
  }
  for (const method of ["listProperties", "queryRows"]) {
    if (typeof provider[method] !== "function") {
      throw new TypeError(`provider.${method} must be a function`);
    }
  }
  return provider;
}

/** Freeze a PropertyRecord, rejecting any state outside the enumerations. */
export function propertyRecord({ propertyId, propertyType, permissionLevel, authState, observedAt }) {
  if (!PROPERTY_TYPES.includes(propertyType)) throw new TypeError(`propertyType must be one of ${PROPERTY_TYPES.join("|")}`);
  if (!AUTH_STATES.includes(authState)) throw new TypeError(`authState must be one of ${AUTH_STATES.join("|")}`);
  return Object.freeze({ propertyId, propertyType, permissionLevel, authState, observedAt });
}
