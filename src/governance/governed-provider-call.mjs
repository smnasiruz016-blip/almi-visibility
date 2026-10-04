/**
 * 🔴 RR-159 · F16 C24 · THE GOVERNED PROVIDER CALL — the client's own AI provider, called ONLY through the paid-provider controls
 * (src/cost/paid-provider-gate.mjs: off by default, an explicit authorization for the tenant with a budget, a cap and an expiry, a kill
 * switch, a ledger entry for every call and every refusal), with the F04 spend decision first.
 *
 * It lives in the governance boundary because the gate is a writer: here its ledger is IN MEMORY. Nothing in this module reaches a durable
 * store — its caller persists every entry through the governed write path (bin/collect-public-questions.mjs, APPEND_PROVIDER_CALL_LEDGER).
 *
 *   THE PROVIDER   a live one comes ONLY from the declared AI-provider adapter registry (src/research/ai-providers/index.mjs — empty
 *                  today, so none can be constructed); a test run's FAKE provider is handed in by the caller's test seam alone.
 *   THE CREDENTIAL is a NAME handed to the adapter, never a value: nothing here reads the environment.
 * Generic: it names no provider, plan tier, tenant or host.
 */
import { createPaidProviderGate, createKillSwitch } from "../cost/paid-provider-gate.mjs";
import { AI_PROVIDER_ADAPTERS } from "../research/ai-providers/index.mjs";
import { providerCallEntry } from "../research/ai-connection.mjs";

/**
 * @param {{ providerId: string, fakeProvider?: object|null, opened?: object|null, credentialName?: string|null, pricePerCall: {amount:number,currency:string},
 *           authorization: object, spendAuthority: object, now: () => string }} o
 * @returns {{ call: (query: string) => Promise<unknown>, entries: () => object[] }}
 */
export function governedProviderCall({ providerId, fakeProvider = null, opened = null, credentialName = null, pricePerCall, authorization, spendAuthority, now }) {
  if (fakeProvider && fakeProvider.fake !== true) throw new TypeError("a handed-in provider must be a declared fake — a live one comes from the registry alone");
  if (!fakeProvider && !Object.hasOwn(AI_PROVIDER_ADAPTERS, providerId)) throw new TypeError("PROVIDER_ADAPTER_ABSENT — no adapter is declared for this provider");
  const impl = fakeProvider ?? AI_PROVIDER_ADAPTERS[providerId].create({ opened, credentialName, pricePerCall });
  const kept = [];
  const keep = (e) => { if (kept.some((x) => x.entry_id === e.entry_id)) return { appended: false }; kept.push(e); return { appended: true }; };
  const gate = createPaidProviderGate({ providers: { [providerId]: impl }, authorizations: [authorization], killSwitch: createKillSwitch(),
    ledger: Object.freeze({ append: keep, readAll: () => [...kept] }), spendAuthority });
  let seq = 0;
  return Object.freeze({
    async call(query) {
      const r = await gate.call(providerId, { query });
      seq += 1;
      keep(providerCallEntry({ at: now(), seq, provider: providerId, tenantId: authorization.tenantId, cap: authorization.cap.maxCalls, callsSoFar: r.calls - 1, pricePerCall, fake: impl.fake === true }));
      return r.result;
    },
    entries: () => [...kept],
  });
}
