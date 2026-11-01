/**
 * 🔴 RR-356 · G1 + G5 — WHAT GOOGLE SHOWS FOR A SEARCH, through a paid search-results service (DataForSEO's Google organic SERP, documented
 * at docs.dataforseo.com/v3/serp/google/organic/live/advanced): the top results (up to 10), "People also ask" and related searches.
 *   · OWNER'S MONEY DECISION: OFF by default; switched on only by the client in Settings; a HARD CAP of $1 a day — a search that could pass
 *     it is refused BEFORE it is sent; every cost is kept. With the switch off, nothing is bought and the ledger says what could not be read.
 *   · R4: Reddit and Quora are read ONLY as Google shows them — the titles and snippets of the results for "<topic> reddit" and
 *     "site:quora.com <topic>". Visibility never calls Reddit's API and never opens reddit.com or quora.com. Their words are QUESTIONS, never facts.
 *   · The key is the DataForSEO login already kept in Windows' secure store (desktop/secrets.mjs) — by name only.
 * Pure parts (the request, the answer read, the cap) are exported for the tests; the call is handed fetch.
 */
export const SERP = Object.freeze({ url: "https://api.dataforseo.com/v3/serp/google/organic/live/advanced", pricePerSearch: 0.002, capPerDay: 1, depth: 10 });
export const SERP_OFF = "Google's own results were not read — the search-results service is switched off (Settings → Search results data; about $0.002 a search, at most $1 a day). Visibility used every free source it may: its own search data, your Search Console, AlmiWorld's question collector and the official pages.";

/** the day's spend and whether one more search may be bought — never past the cap */
export function mayBuy(ledger = { spent: [] }, { now = new Date().toISOString(), cap = SERP.capPerDay, capMonth = Infinity, price = SERP.pricePerSearch } = {}) {
  const sum = (p) => (ledger.spent ?? []).filter((s) => String(s.on).startsWith(p)).reduce((t, s) => t + (Number(s.cost) || 0), 0);
  const spent = sum(String(now).slice(0, 10)), month = sum(String(now).slice(0, 7)), day = Math.min(cap, SERP.capPerDay); // R10: never more than $1 a day
  return { ok: spent + price <= day + 1e-9 && month + price <= capMonth + 1e-9, spent, month, left: Math.max(0, day - spent) };
}
/** the request body (one task) for a search in a country and language */
export const serpTask = (keyword, { location = "United States", language = "en" } = {}) => [{ keyword, location_name: location, language_code: language, depth: SERP.depth }];
/** DataForSEO's answer → { results: [{ url, title, snippet }], paa: [question], related: [search], cost } (status 20000 = ok) */
export function readSerp(json) {
  const t = json?.tasks?.[0]; if (json?.status_code !== 20000 || t?.status_code !== 20000) return { ok: false, why: t?.status_message ?? json?.status_message ?? "the search-results service did not answer", cost: Number(t?.cost ?? json?.cost ?? 0) || 0 };
  const items = t.result?.[0]?.items ?? [];
  return { ok: true, cost: Number(t.cost ?? 0) || 0,
    results: items.filter((i) => i.type === "organic" && i.url).slice(0, SERP.depth).map((i) => ({ url: i.url, title: i.title ?? "", snippet: i.description ?? "" })),
    paa: items.filter((i) => i.type === "people_also_ask").flatMap((i) => (i.items ?? []).map((x) => x.title)).filter(Boolean),
    related: items.filter((i) => i.type === "related_searches").flatMap((i) => i.items ?? []).map((x) => (typeof x === "string" ? x : x?.title)).filter(Boolean) };
}
/** R4: a Reddit or Quora result, as Google shows it → a question in people's words (its title, or a question in its snippet) — never a fact */
export function communityQuestions(results = [], site) {
  return results.filter((r) => { try { return new URL(r.url).hostname.replace(/^www\./, "").endsWith(site); } catch { return false; } })
    .map((r) => String(r.title).replace(/\s*[:|-]\s*r\/\w+.*$/i, "").replace(/\s*-\s*(?:Reddit|Quora)\s*$/i, "").trim()).filter((q) => q.length >= 12 && q.length <= 200);
}
/**
 * One search through the service, inside the cap. `settings` = { on }; `ledger` = { spent: [{ on, cost, q }], cache: { key: answer } } (kept by
 * the caller); `login`/`password` from the secure store. → readSerp's answer, or { ok:false, why } (switched off, the cap, no key).
 */
export async function searchGoogle({ keyword, settings = {}, ledger, login, password, fetchImpl = fetch, now = new Date().toISOString(), location, language, test = false }) {
  if (settings.on !== true && !test) return { ok: false, off: true, why: SERP_OFF }; // "Test the connection" is the client's own click — inside the caps
  if (!login || !password) return { ok: false, why: "the search-results service's login is not saved on this computer (Settings → Search results data)" };
  const key = `${keyword}|${location ?? ""}|${language ?? ""}`; if (!test && ledger.serpCache?.[key]) return { ...ledger.serpCache[key], cached: true };
  const cap = Number(settings.capDay) > 0 ? Number(settings.capDay) : SERP.capPerDay, capMonth = Number(settings.capMonth) > 0 ? Number(settings.capMonth) : Infinity;
  const m = mayBuy(ledger, { now, cap, capMonth }); if (!m.ok) return { ok: false, why: `the cap is reached ($${m.spent.toFixed(4)} today of $${Math.min(cap, SERP.capPerDay)}, $${m.month.toFixed(4)} this month) — nothing more is bought until it resets` };
  let r; try { r = await fetchImpl(SERP.url, { method: "POST", headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}` }, body: JSON.stringify(serpTask(keyword, { location, language })), signal: AbortSignal.timeout(30000) }); } catch { return { ok: false, why: "the search-results service did not answer" }; }
  const got = readSerp(await r.json().catch(() => ({})));
  (ledger.spent ??= []).push({ on: now, cost: got.cost || SERP.pricePerSearch, q: keyword, what: "search results" });
  if (got.ok) (ledger.serpCache ??= {})[key] = got;
  return got;
}
