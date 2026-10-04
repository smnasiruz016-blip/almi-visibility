/**
 * F16 · C17/C25 · THE AI-PROVIDER ADAPTER REGISTRY (RR-159; RR-161) — EMPTY, deliberately, and for a measured reason.
 *
 * ONE adapter is BUILT under the owner's issued provider record (RR-161 Ruling 1, _handoffs 0bee240), listed — options check only — in
 * ./built.mjs, and proved against a FAKE network exit (test/rr161-provider-adapter.test.mjs). It is NOT REGISTERED here, so the engine cannot
 * construct it: a live AI-led plan naming that provider is refused PROVIDER_ADAPTER_BUILT_NOT_REGISTERED (any other, PROVIDER_ADAPTER_ABSENT)
 * before any provider call.
 *
 * Why not registered: registering it makes a REAL paid provider constructible. The owner's RR-82 §2.2 ruling says the first real paid
 * provider "MUST trigger a reopening and a real paid-path proof before any PASS claim about that provider", and F77's paid and metered
 * call-path census (tools/paid-metered-call-census.mjs) fails while that limb stands NOT MEASURED. RR-161 forbids any live call, so that
 * proof cannot be made in RR-161. Registering the adapter is therefore the PILOT round's act, made together with the reopening of F77 and
 * its real paid-path proof under the owner's fresh GREEN.
 *
 * An entry, when one is added: `{ create({ opened, credentialName, pricePerCall, options }), optionsRefusals(options) }`.
 */
export const AI_PROVIDER_ADAPTERS = Object.freeze({});
