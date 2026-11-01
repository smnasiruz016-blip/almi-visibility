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
import { coverageOf, secondSearch } from "./recipe.mjs"; // RR-358: G5 + G6 for every page
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
/*
 * 🔴 RR-358 (owner's real run on 1.15.10: ONE search for 29 pages). His ledger: four "Test the connection" searches and one run search, none
 * kept as a result — every one was refused. The run stopped after the first because the old loop stopped on any reason with "login" in it,
 * and DataForSEO's 40100 says "You are not authorized to access this resource. See your login details here…". The reason was thrown away,
 * and each refused search was booked at $0.002 — so "$0.0100 spent" looked like five searches done. Now: DataForSEO's own code and
 * message are kept, said in plain words with how to fix it; a refusal that stops every search (the login, the account, the money) stops
 * the run once, said; and the ledger books what DataForSEO charged — a refused search costs nothing.
 */
export const STOPS_EVERY_SEARCH = new Set([40100, 40104, 40200, 40201, 40203, 40204, 40207, 40210]);
export function plainSerpWhy(code, message) {
  const said = message ? ` (DataForSEO answered: "${String(message).slice(0, 160)}")` : "";
  if (code === 40100) return `DataForSEO did not accept your login and API password${said}. The API password is not the password you sign in with: in DataForSEO open "API Access", copy the API password, and save it again in Search results data → step 2.`;
  if (code === 40104) return `DataForSEO asks you to verify your account first${said} — finish the verification in your DataForSEO account, then try again.`;
  if (code === 40200 || code === 40210) return `your DataForSEO balance is too low${said} — top up your DataForSEO account, then try again.`;
  if (code === 40203) return `your own cost limit in DataForSEO was reached${said} — raise it in DataForSEO (API settings) or wait for tomorrow.`;
  if (code === 40201 || code === 40204 || code === 40207) return `DataForSEO did not allow this search${said} — open your DataForSEO account to see why.`;
  if (code === 40202 || code === 40209) return `DataForSEO asked to slow down${said} — Visibility tries again on the next run.`;
  return `DataForSEO did not return the results${said || " (no answer)"}.`;
}
/** DataForSEO's answer → { results: [{ url, title, snippet }], paa: [question], related: [search], cost } (status 20000 = ok) */
export function readSerp(json) {
  const t = json?.tasks?.[0]; if (json?.status_code !== 20000 || t?.status_code !== 20000) { const code = Number(t?.status_code && t.status_code !== 20000 ? t.status_code : json?.status_code) || null, message = (t?.status_code && t.status_code !== 20000 ? t?.status_message : json?.status_message) ?? null; return { ok: false, code, message, stop: STOPS_EVERY_SEARCH.has(code), why: json && Object.keys(json).length ? plainSerpWhy(code, message) : "DataForSEO did not answer with results (the answer could not be read).", cost: Number(t?.cost ?? json?.cost ?? 0) || 0 }; }
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
  if (!login || !password) return { ok: false, stop: true, why: "your DataForSEO login is not saved on this computer (Search results data → step 2)" };
  const key = `${keyword}|${location ?? ""}|${language ?? ""}`; if (!test && ledger.serpCache?.[key]) return { ...ledger.serpCache[key], cached: true };
  const cap = Number(settings.capDay) > 0 ? Number(settings.capDay) : SERP.capPerDay, capMonth = Number(settings.capMonth) > 0 ? Number(settings.capMonth) : Infinity;
  const m = mayBuy(ledger, { now, cap, capMonth }); if (!m.ok) return { ok: false, stop: true, capped: true, why: `the cap is reached ($${m.spent.toFixed(4)} today of $${Math.min(cap, SERP.capPerDay)}, $${m.month.toFixed(4)} this month) — nothing more is bought until it resets` };
  let r; try { r = await fetchImpl(SERP.url, { method: "POST", headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}` }, body: JSON.stringify(serpTask(keyword, { location, language })), signal: AbortSignal.timeout(30000) }); } catch { return { ok: false, why: "the search-results service did not answer" }; }
  const got = readSerp(await r.json().catch(() => ({})));
  /* RR-358: the cost DataForSEO charged (a refused search: nothing); a search that came back is at least the list price */
  (ledger.spent ??= []).push({ on: now, cost: got.ok ? got.cost || SERP.pricePerSearch : got.cost, q: keyword, what: test ? "search results (connection test)" : "search results", ...(got.ok ? { ok: true } : { ok: false, code: got.code, why: got.why }) });
  if (got.ok) (ledger.serpCache ??= {})[key] = got;
  return got;
}

/**
 * 🔴 RR-358 · G1 + G5 + G6 FOR EVERY PAGE ON A REAL RUN (owner's run on 1.15.10 made ONE search for 29 pages): for each page's intent —
 * Google's top results (up to 10) read for what they cover, "People also ask", related searches, and Reddit and Quora as Google shows them —
 * each search cached, inside the caps. A stop (the cap, the login, the account, the money) is said ONCE and on every page not searched.
 * `readHtml(url)` reads a top result's page (robots obeyed by the caller's reader). Mutates each page: questions, coverage, second,
 * topRead, serpWhy. → { searches, cost, read, of, reddit, quora, stopped, notes, line }
 */
export async function searchPages({ pages = [], ledger, settings, login, password, now = new Date().toISOString(), readHtml = async () => null, fetchImpl }) {
  let reddit = 0, quora = 0, pagesRead = 0, stopped = null; const notes = [], spentBefore = (ledger.spent ?? []).length;
  const ask = async (k) => { const r = await searchGoogle({ keyword: k, settings, ledger, login, password, now, ...(fetchImpl ? { fetchImpl } : {}) }); if (!r.ok && r.stop && !stopped) stopped = r.why; return r; };
  for (const p of pages) {
    delete p.serpWhy;
    if (stopped) { p.serpWhy = stopped; continue; } // every page after a stop says why it was not searched
    const main = await ask(p.title); if (!main.ok) { p.serpWhy = main.why; notes.push(`${p.title}: ${main.why}`); continue; }
    pagesRead++;
    const rq = communityQuestions((await ask(`${p.title} reddit`)).results ?? [], "reddit.com"), qq = communityQuestions((await ask(`site:quora.com ${p.title}`)).results ?? [], "quora.com");
    reddit += rq.length; quora += qq.length;
    const day = String(now).slice(0, 10), q = (text, src) => ({ question: text, source: src, on: day });
    p.questions = [...(p.questions ?? []), ...main.paa.map((t) => q(t, `Google "People also ask" (${day})`)), ...main.related.map((t) => q(t, `Google related searches (${day})`)), ...rq.map((t) => q(t, `a Reddit result as Google shows it (${day})`)), ...qq.map((t) => q(t, `a Quora result as Google shows it (${day})`))];
    /* the top results' own headings — read only to see what they cover; nothing is copied, no fact is taken */
    const tops = [];
    for (const r of main.results.slice(0, SERP.depth)) { if (/reddit\.com|quora\.com/.test(r.url)) continue; const h = await Promise.resolve(readHtml(r.url)).catch(() => null); if (!h) continue; tops.push({ url: r.url, title: r.title, headings: [...String(h).matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 40), text: String(h).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").slice(0, 20000) }); }
    p.coverage = coverageOf(tops); p.second = secondSearch({ best: tops[0] ?? null, paa: main.paa, coverage: p.coverage }); p.topRead = tops.map((r) => r.url);
  }
  const mine = (ledger.spent ?? []).slice(spentBefore), searches = mine.length /* every search sent is in the ledger, refused or not */, cost = mine.reduce((t, x) => t + (Number(x.cost) || 0), 0);
  const line = `Google's results (your DataForSEO account): ${searches} search${searches === 1 ? "" : "es"}, $${cost.toFixed(4)} — ${pagesRead} of ${pages.length} pages read what ranks, "People also ask", related searches, Reddit and Quora as Google shows them.${stopped ? ` Stopped: ${stopped}` : notes.length ? ` Not read for ${notes.length}: ${notes[0]}` : ""}`;
  return { searches, cost, read: pagesRead, of: pages.length, reddit, quora, stopped, notes, line };
}
