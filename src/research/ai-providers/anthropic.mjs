/**
 * F16 · C25 · THE ONE AI-PROVIDER ADAPTER — built under the owner's ISSUED provider record (RR-161 Ruling 1, _handoffs 0bee240; F16
 * Acceptance Amendment 4, _handoffs 5c232f5). 🔴 BUILT, NOT REGISTERED: src/research/ai-providers/index.mjs keeps it out of the registry,
 * so the engine cannot construct it. Registering it makes a REAL paid provider constructible, which by the owner's RR-82 §2.2 ruling
 * reopens F77's paid-provider limb and requires a real paid-path proof — the pilot round's act, under its own fresh GREEN.
 *
 * Built ONLY from what the owner's GREEN reads quoted (RR-160, read 2026-10-04):
 *   ORIGIN     "The Claude API is a RESTful API at https://api.anthropic.com"; Messages API "( POST /v1/messages )"
 *   HEADERS    "x-api-key Your API key from Console"; "anthropic-version API version (for example, 2023-06-01 ) Yes"; "content-type
 *              application/json Yes"
 *   SEARCH     a web search tool { type, name: "web_search", max_uses } — "For a hard constraint, use max_uses to cap the number of searches
 *              for each request"; results are "web_search_tool_result" blocks of "web_search_result" items, each with "url : The URL of the
 *              source page"
 *   PRICE      "$10 per 1,000 searches, plus standard token costs" — the token cost was NOT READ, so the price per call is NOT MEASURED:
 *              `priceMeasured: false`, and the plan's declared per-call charge only bounds the hard budget (C26).
 *
 * 🔴 THE CREDENTIAL is the CLIENT'S OWN key, named by the client's connector. It is set on the outgoing request at the moment of sending,
 * straight from the named variable, and is never read into a kept variable, logged, hashed or measured (C25). The request leaves only through
 * the client's own OPENED connector, whose one exit reaches only its declared origin.
 * 🔴 WHERE ONLY: `invoke` returns the addresses of the search results and the provider's usage counts — never its prose, never an address the
 * model wrote in its own text (C19, C25). A refusal, an HTTP error or a search error is thrown with a code: the run stops (C26).
 */
export const PROVIDER_ID = "anthropic";
export const ORIGIN = "https://api.anthropic.com";
const MESSAGES = "/v1/messages";
const API_VERSION = "2023-06-01";
const OPTION_FIELDS = Object.freeze(["model", "toolType", "maxSearchesPerCall", "maxOutputTokens"]);
export const LIMITS = Object.freeze({ maxSearchesPerCall: 5, maxOutputTokens: 4096 });

/** The plan's provider options, exact: every field present, in shape, within the hard limits. */
export function optionsRefusals(o) {
  if (!o || typeof o !== "object" || Array.isArray(o)) return ["PROVIDER_OPTIONS_ABSENT"];
  const r = [];
  if (Object.keys(o).sort().join() !== [...OPTION_FIELDS].sort().join()) r.push("PROVIDER_OPTIONS_NOT_EXACT");
  if (typeof o.model !== "string" || !/^[a-z0-9-]{3,64}$/.test(o.model)) r.push("PROVIDER_OPTIONS_MODEL");
  if (typeof o.toolType !== "string" || !/^web_search_\d{8}$/.test(o.toolType)) r.push("PROVIDER_OPTIONS_SEARCH_TOOL");
  if (!Number.isInteger(o.maxSearchesPerCall) || o.maxSearchesPerCall < 1 || o.maxSearchesPerCall > LIMITS.maxSearchesPerCall) r.push("PROVIDER_OPTIONS_SEARCH_CAP");
  if (!Number.isInteger(o.maxOutputTokens) || o.maxOutputTokens < 1 || o.maxOutputTokens > LIMITS.maxOutputTokens) r.push("PROVIDER_OPTIONS_OUTPUT_CAP");
  return r;
}

const coded = (code) => Object.assign(new Error(`PROVIDER_REFUSED: ${code}`), { code });

/** The search results' addresses only — from `web_search_tool_result` blocks; an error object there is a search error (C26). */
export function searchAddressesOf(body) {
  const out = [];
  for (const b of Array.isArray(body?.content) ? body.content : []) {
    if (b?.type !== "web_search_tool_result") continue;
    if (!Array.isArray(b.content)) throw coded(`SEARCH_ERROR_${/^[a-z_]{1,40}$/.test(String(b.content?.error_code ?? "")) ? String(b.content.error_code).toUpperCase() : "UNNAMED"}`);
    for (const r of b.content) if (r?.type === "web_search_result" && typeof r.url === "string") out.push(r.url);
  }
  return out;
}

/** The provider's usage as COUNTS only — every numeric field of its usage object, nested once; nothing else. */
export function usageCountsOf(body) {
  const u = body?.usage, out = {};
  if (!u || typeof u !== "object") return out;
  for (const [k, v] of Object.entries(u)) {
    if (Number.isInteger(v) && v >= 0) out[k] = v;
    else if (v && typeof v === "object" && !Array.isArray(v)) for (const [k2, v2] of Object.entries(v)) if (Number.isInteger(v2) && v2 >= 0) out[`${k}.${k2}`] = v2;
  }
  return out;
}

/**
 * @param {{ opened: { admits: (u: string) => boolean, fetch: Function }, credentialName: string, pricePerCall: {amount:number,currency:string}, options: object }} o
 */
export function create({ opened, credentialName, pricePerCall, options }) {
  const bad = optionsRefusals(options);
  if (bad.length) throw coded(bad[0]);
  if (typeof credentialName !== "string" || credentialName === "") throw coded("CREDENTIAL_UNNAMED");
  const url = new URL(MESSAGES, ORIGIN).toString();
  if (!opened || typeof opened.fetch !== "function" || typeof opened.admits !== "function" || !opened.admits(url)) throw coded("ORIGIN_NOT_THE_CONNECTORS");
  return Object.freeze({
    name: PROVIDER_ID, fake: false, priceMeasured: false, pricePerCall: Object.freeze({ ...pricePerCall }),
    async invoke(request) {
      const body = JSON.stringify({
        model: options.model, max_tokens: options.maxOutputTokens,
        messages: [{ role: "user", content: String(request?.query ?? "") }],
        tools: [{ type: options.toolType, name: "web_search", max_uses: options.maxSearchesPerCall }],
      });
      let res;
      /* the client's own key, from its NAMED variable, on the outgoing request only — at the moment of sending */
      try { res = await opened.fetch(url, { method: "POST", headers: { "content-type": "application/json", "anthropic-version": API_VERSION, "x-api-key": process.env[credentialName] ?? "" }, body }); }
      catch { throw coded("TRANSPORT_REFUSED"); }
      let parsed;
      try { parsed = await res.json(); } catch { throw coded("NOT_JSON"); }
      if (!res.ok) throw coded(`HTTP_${Number.isInteger(res.status) ? res.status : "UNKNOWN"}`);
      if (parsed?.stop_reason === "refusal") throw coded("REFUSAL");
      return Object.freeze({ addresses: Object.freeze(searchAddressesOf(parsed)), usage: Object.freeze(usageCountsOf(parsed)) });
    },
  });
}
