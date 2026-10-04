/**
 * F16 · C17 · THE AI-PROVIDER ADAPTER REGISTRY (RR-159) — EMPTY, deliberately.
 *
 * An entry exists only for a provider whose OWN terms and documentation an OWNER PROVIDER RECORD cites, with the date read, and whose
 * permitted capability that record declares (Acceptance Amendment 3, C17). No such record has been issued, so no adapter exists, and the
 * collection entry point refuses every live AI-led plan with PROVIDER_ADAPTER_ABSENT before any provider call. Only a test run's FAKE
 * provider (test/, honoured inside node --test alone) reaches the AI-led path.
 *
 * An adapter, when one is added: `create({ opened, credentialName, pricePerCall })` → { name, fake: false, pricePerCall, invoke(request) },
 * reaching only its opened connector's declared origin, setting the credential from the NAMED variable at the moment of sending and never
 * reading it into a variable, logging, hashing or measuring it. Adding one makes a REAL paid provider constructible, which F77's paid and
 * metered call-path census (tools/paid-metered-call-census.mjs) then counts — so F77's paid limb must be proved on it that day.
 */
export const AI_PROVIDER_ADAPTERS = Object.freeze({});
