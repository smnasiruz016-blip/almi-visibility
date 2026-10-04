/**
 * 🔴 F16 · WITHDRAWN COLLECTION PLANS — DEAD, WHATEVER GREEN NAMES THEM (RR-156 §2).
 *
 * A plan is withdrawn by an append-only correction record in _handoffs; its hash is then listed here, in code that is reviewed and merged,
 * so no GREEN — old or new, valid in every other respect — can bring it back to life. The collection preflight (src/research/collection.mjs)
 * refuses a listed plan with PLAN_WITHDRAWN before any request. Entries are appended, never removed: the plan, its proposal and any refusal
 * it drew stay readable where they are.
 */
export const WITHDRAWN_PLANS = Object.freeze([
  Object.freeze({
    planSha256: "5e97c4d3235d30eda162f629006628c92d9bd32a13b264ee07187557d50c9954",
    withdrawnOn: "2026-10-04",
    record: "_handoffs AlmiVisibility_RR-156_WITHDRAWAL_CONCRETE_ROOF_PLAN_2026-10-04.md (50af0cc)",
    reason: "it did not serve the product: a generic do-it-yourself repair query for a home design-and-build company (RR-156 §1)",
  }),
]);
