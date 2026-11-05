/**
 * 🔴 RR-375 item 4 (owner, 5 Nov 2026) · FREE SEARCH ALLOWANCES, EACH THROUGH ITS OWN OFFICIAL API: Tavily, Brave Search and Exa answer a search; Firecrawl and Jina read a page our own reader could not get text from. Never Google's or Bing's own pages.
 * EVERY PROVIDER HAS ITS OWN COUNTER, and it stops at OUR limit, below what the provider gives free, so there is never a surprise bill. The count goes up BEFORE the call, so a crash cannot undercount. A provider that says "no credit" or "too many" (402, 429, 432) stops for the month.
 * The limits are the lowest figures found on 5 Nov 2026: the providers' own pages could not all be read, and third-party pages disagree. A low limit costs a few searches; a high one could cost money. Brave asks for a card when you sign up: said on the screen.
 * With no key, nothing here runs and everything else works. A key is kept in Windows' secure store by name; here it is handed in, and goes only to its own provider.
 * A page that refused us (401, 403, 429, a robots rule, a security check) is NEVER sent to a reader: that would go round the site's refusal. It waits for the owner's own browser. Pure but for the fetch handed in.
 */
export const USAGE_FILE = "free-search-usage.json";
export const PROVIDERS = Object.freeze([
  Object.freeze({ id: "tavily", name: "Tavily", kind: "search", keyName: "TAVILY_API_KEY", limit: 900, free: "1,000 searches a month, no card", signup: "https://app.tavily.com/" }),
  Object.freeze({ id: "brave", name: "Brave Search", kind: "search", keyName: "BRAVE_SEARCH_API_KEY", limit: 800, free: "$5 credit a month, about 1,000 searches; Brave asks for a card to check you", signup: "https://api-dashboard.search.brave.com/" }),
  Object.freeze({ id: "exa", name: "Exa", kind: "search", keyName: "EXA_API_KEY", limit: 800, free: "$10 credit a month", signup: "https://dashboard.exa.ai/" }),
  Object.freeze({ id: "firecrawl", name: "Firecrawl", kind: "read", keyName: "FIRECRAWL_API_KEY", limit: 400, free: "free credits each month, no card; reads pages", signup: "https://www.firecrawl.dev/app/api-keys" }),
  Object.freeze({ id: "jina", name: "Jina Reader", kind: "read", keyName: "JINA_API_KEY", limit: 400, free: "free tokens with a new key; reads pages", signup: "https://jina.ai/reader/" }),
]);
export const FREE_KEY_NAMES = Object.freeze(PROVIDERS.map((p) => p.keyName));
const BASES = Object.freeze({ tavily: "https://api.tavily.com", brave: "https://api.search.brave.com", exa: "https://api.exa.ai", firecrawl: "https://api.firecrawl.dev", jina: "https://r.jina.ai" });
const STOP_STATUS = new Set([401, 402, 403, 429, 432, 433]);
/** a page that refused us stays refused: only a page that failed for another reason, or held no text, may go to a reader */
export const REFUSED = /\brobots\b|\b40[13]\b|\b429\b|captcha|security|forbidden|refus|sign[- ]?in|log[- ]?in|paywall|payment/i;
export const mayReadThrough = (page) => (page?.ok ? !String(page.text ?? "").trim() : !REFUSED.test(String(page?.why ?? "")));

const monthOf = (now) => new Date(now).toISOString().slice(0, 7);
export function usageOf(file = {}, now = Date.now()) { const m = file?.months?.[monthOf(now)] ?? {}; return Object.fromEntries(PROVIDERS.map((p) => [p.id, { used: Number(m[p.id]?.used) || 0, stopped: m[p.id]?.stopped ?? null, limit: p.limit }])); }
const bump = (file, id, now, change) => { const m = monthOf(now); file.months ??= {}; file.months[m] ??= {}; file.months[m][id] = change(file.months[m][id] ?? { used: 0 }); };

const asks = Object.freeze({
  tavily: (q, key, base) => [`${base}/search`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${key}` }, body: JSON.stringify({ query: q, max_results: 8, search_depth: "basic" }) }],
  brave: (q, key, base) => [`${base}/res/v1/web/search?q=${encodeURIComponent(q)}&count=8`, { headers: { accept: "application/json", "x-subscription-token": key } }],
  exa: (q, key, base) => [`${base}/search`, { method: "POST", headers: { "content-type": "application/json", "x-api-key": key }, body: JSON.stringify({ query: q, numResults: 8, type: "auto" }) }],
});
const results = Object.freeze({
  tavily: (j) => (j?.results ?? []).map((r) => ({ url: r.url, title: r.title ?? "" })),
  brave: (j) => (j?.web?.results ?? []).map((r) => ({ url: r.url, title: r.title ?? "" })),
  exa: (j) => (j?.results ?? []).map((r) => ({ url: r.url, title: r.title ?? "" })),
});
/**
 * One search through the allowances, first with a key and room. → results (never empty for a real answer), or [] when none could answer. keyOf(name) reads a key by name; usage is the counter's file, kept by save(usage) at each change. `used` tells which provider answered.
 */
export function freeSearch({ keyOf, usage, save = () => {}, fetchImpl = fetch, now = () => Date.now(), bases = BASES, order = ["tavily", "brave", "exa"] }) {
  const list = order.map((id) => PROVIDERS.find((p) => p.id === id)).filter((p) => keyOf(p.keyName));
  if (!list.length) return null;
  return async (q) => {
    for (const p of list) {
      const u = usageOf(usage, now())[p.id]; if (u.stopped || u.used >= p.limit) continue;
      bump(usage, p.id, now(), (x) => ({ ...x, used: (x.used ?? 0) + 1 })); save(usage);
      let r; const [url, init] = asks[p.id](q, keyOf(p.keyName), bases[p.id]); try { r = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(30000) }); } catch { continue; }
      if (STOP_STATUS.has(r.status)) { bump(usage, p.id, now(), (x) => ({ ...x, stopped: `${p.name} answered ${r.status}` })); save(usage); continue; }
      if (!r.ok) continue;
      const got = results[p.id](await r.json().catch(() => null)).filter((x) => /^https?:/.test(x.url ?? "")); if (got.length) return got;
    }
    return [];
  };
}
/** A page's text through a reader, only for a page that did not refuse us. → the same shape as our own reader, or null */
export function freeReader({ keyOf, usage, save = () => {}, fetchImpl = fetch, now = () => Date.now(), bases = BASES }) {
  const list = ["firecrawl", "jina"].map((id) => PROVIDERS.find((p) => p.id === id)).filter((p) => keyOf(p.keyName));
  if (!list.length) return null;
  return async (url) => {
    for (const p of list) {
      const u = usageOf(usage, now())[p.id]; if (u.stopped || u.used >= p.limit) continue;
      bump(usage, p.id, now(), (x) => ({ ...x, used: (x.used ?? 0) + 1 })); save(usage);
      let r; try { r = p.id === "firecrawl" ? await fetchImpl(`${bases.firecrawl}/v1/scrape`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${keyOf(p.keyName)}` }, body: JSON.stringify({ url, formats: ["markdown"] }), signal: AbortSignal.timeout(60000) }) : await fetchImpl(`${bases.jina}/${url}`, { headers: { accept: "application/json", authorization: `Bearer ${keyOf(p.keyName)}` }, signal: AbortSignal.timeout(60000) }); } catch { continue; }
      if (STOP_STATUS.has(r.status)) { bump(usage, p.id, now(), (x) => ({ ...x, stopped: `${p.name} answered ${r.status}` })); save(usage); continue; }
      if (!r.ok) continue;
      const j = await r.json().catch(() => null), d = j?.data ?? null, text = String(d?.markdown ?? d?.content ?? "").trim(); if (text.length < 200) continue;
      return { ok: true, url, title: String(d?.metadata?.title ?? d?.title ?? ""), h1: null, text, links: [], via: p.name };
    }
    return null;
  };
}
/** the screen's rows: never a key, only whether one is saved */
export const allowanceRows = (usage, hasKey, now = Date.now()) => { const u = usageOf(usage, now); return PROVIDERS.map((p) => ({ id: p.id, name: p.name, kind: p.kind, keyName: p.keyName, free: p.free, signup: p.signup, saved: Boolean(hasKey(p.keyName)), used: u[p.id].used, limit: p.limit, stopped: u[p.id].stopped })); };
