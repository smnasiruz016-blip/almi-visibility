/**
 * F16 · THE REQUEST GOVERNOR — a collector that stops ITSELF (RR-121). Source-neutral: a source's documented numbers are passed in.
 *
 * Before every request it refuses, without calling the transport, when:
 *   REQUEST_CAP_REACHED              the run's own absolute cap is spent;
 *   QUOTA_EXHAUSTED                  the source last reported no quota remaining;
 *   BACKOFF_IN_FORCE                 the source asked this METHOD to wait, and the wait has not passed;
 *   IDENTICAL_REQUEST_WITHIN_WINDOW  a semantically identical request was sent less than the window ago.
 * A request's identity is its method and its parameters in canonical order, with any credential parameter left out — a credential
 * never decides identity, and is never held, logged or measured here.
 * 🔴 There is NO transport in this repository that reaches a network. The governor is driven by an injected transport; tests inject a
 * recorded fixture. A live transport is added only after the owner's GREEN for one bounded pilot.
 */
const CREDENTIAL_PARAMS = new Set(["key", "access_token"]);
export const identityOf = (method, params = {}) =>
  `${method}?${Object.keys(params).filter((k) => !CREDENTIAL_PARAMS.has(k)).sort().map((k) => `${k}=${JSON.stringify(params[k])}`).join("&")}`;

export function createGovernor({ cap, dedupeWindowSeconds, clock }) {
  if (!Number.isInteger(cap) || cap < 1) throw new Error("GOVERNOR_CAP_UNDECLARED");
  if (!Number.isInteger(dedupeWindowSeconds) || dedupeWindowSeconds < 1) throw new Error("GOVERNOR_WINDOW_UNDECLARED");
  let sent = 0, quotaRemaining = null;
  const lastSent = new Map(), backoffUntil = new Map(), refused = {};
  const refuse = (why) => { refused[why] = (refused[why] ?? 0) + 1; return { refused: why, response: null }; };
  return {
    async request(method, params, transport) {
      const id = identityOf(method, params);
      if (sent >= cap) return refuse("REQUEST_CAP_REACHED");
      if (quotaRemaining !== null && quotaRemaining <= 0) return refuse("QUOTA_EXHAUSTED");
      if (backoffUntil.has(method) && clock() < backoffUntil.get(method)) return refuse("BACKOFF_IN_FORCE");
      if (lastSent.has(id) && clock() - lastSent.get(id) < dedupeWindowSeconds) return refuse("IDENTICAL_REQUEST_WITHIN_WINDOW");
      sent += 1;
      lastSent.set(id, clock());
      const response = await transport(method, params);
      if (Number.isInteger(response?.backoff) && response.backoff > 0) backoffUntil.set(method, clock() + response.backoff);
      if (Number.isInteger(response?.quota_remaining)) quotaRemaining = response.quota_remaining;
      return { refused: null, response };
    },
    tally: () => ({ sent, cap, quotaRemaining, refused: { ...refused } }),
  };
}
