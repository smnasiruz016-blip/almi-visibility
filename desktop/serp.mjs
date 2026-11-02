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
import { COUNTRIES } from "./world.mjs"; // RR-359: a heading that is only a country's name is no subtopic
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
  if (code === 40100) return `DataForSEO did not accept your login and API password${said}. Open app.dataforseo.com/api-access: copy the "API login" shown there (not your sign-in e-mail) and the API password (not your sign-in password — shown there for 24 hours after you register, later sent by e-mail or reset on that page), and save both again in Search results data → step 2.`;
  if (code === 40104) return `DataForSEO asks you to verify your account first${said} — finish the verification in your DataForSEO account, then try again.`;
  if (code === 40200 || code === 40210) return `your DataForSEO balance is too low${said} — top up your DataForSEO account, then try again.`;
  if (code === 40203) return `your own cost limit in DataForSEO was reached${said} — raise it in DataForSEO (API settings) or wait for tomorrow.`;
  if (code === 40201 || code === 40204 || code === 40207) return `DataForSEO did not allow this search${said} — open your DataForSEO account to see why.`;
  if (code === 40202 || code === 40209) return `DataForSEO asked to slow down${said} — Visibility tries again on the next run.`;
  return `DataForSEO did not return the results${said || " (no answer)"}.`;
}
/*
 * 🔴 RR-359 (owner's first real run: "Internal SE Server Error" on 4 pages, and each failed search booked at $0.002 or $0.01). A search that
 * failed on DataForSEO's side — its server error, a time-out, "slow down", no answer — is tried again, at most RETRY.times more, with a pause
 * that grows; a refusal that stops every search (the login, the account, the money, the cap) is never retried. A failed search costs $0.
 */
export const RETRY = Object.freeze({ times: 2, pauseMs: 3000 });
export const tryAgain = (got) => !got.ok && !got.stop && !got.capped && !got.off && (got.code == null || got.code >= 50000 || [40101, 40202, 40209, 40501, 40502, 40503].includes(got.code) || /internal|server error|time ?out|timed out|try again|did not answer|temporar/i.test(`${got.message ?? ""} ${got.why ?? ""}`));
/** DataForSEO's answer → { results: [{ url, title, snippet }], paa: [question], related: [search], cost } (status 20000 = ok) */
export function readSerp(json) {
  const t = json?.tasks?.[0]; if (json?.status_code !== 20000 || t?.status_code !== 20000) { const code = Number(t?.status_code && t.status_code !== 20000 ? t.status_code : json?.status_code) || null, message = (t?.status_code && t.status_code !== 20000 ? t?.status_message : json?.status_message) ?? null; return { ok: false, code, message, stop: STOPS_EVERY_SEARCH.has(code), why: json && Object.keys(json).length ? plainSerpWhy(code, message) : "DataForSEO did not answer with results (the answer could not be read).", cost: Number(t?.cost ?? json?.cost ?? 0) || 0 }; }
  const items = t.result?.[0]?.items ?? [];
  return { ok: true, cost: Number(t.cost ?? 0) || 0,
    results: items.filter((i) => i.type === "organic" && i.url).slice(0, SERP.depth).map((i) => ({ url: i.url, title: i.title ?? "", snippet: i.description ?? "" })),
    paa: items.filter((i) => i.type === "people_also_ask").flatMap((i) => (i.items ?? []).map((x) => x.title)).filter(Boolean),
    related: items.filter((i) => i.type === "related_searches").flatMap((i) => i.items ?? []).map((x) => (typeof x === "string" ? x : x?.title)).filter(Boolean) };
}
/* RR-362 (found in the crash hunt: Google's own redirect links among the results were being read): a result on Google's own site, Reddit or Quora is never opened */
export const notForReading = (u) => /^https?:\/\/(?:[^/]*\.)?(?:google\.[a-z.]+|reddit\.com|quora\.com)(?:[/:?#]|$)/i.test(String(u));
/** R4: a Reddit or Quora result, as Google shows it → a question in people's words (its title, or a question in its snippet) — never a fact */
export function communityQuestions(results = [], site) {
  return results.filter((r) => { try { return new URL(r.url).hostname.replace(/^www\./, "").endsWith(site); } catch { return false; } })
    .map((r) => String(r.title).replace(/\s*[:|-]\s*r\/\w+.*$/i, "").replace(/\s*-\s*(?:Reddit|Quora)\s*$/i, "").trim()).filter((q) => q.length >= 12 && q.length <= 200);
}
/**
 * One search through the service, inside the cap. `settings` = { on }; `ledger` = { spent: [{ on, cost, q }], cache: { key: answer } } (kept by
 * the caller); `login`/`password` from the secure store. → readSerp's answer, or { ok:false, why } (switched off, the cap, no key).
 */
/* RR-362 item 14 (R13: "each result is saved once and reused"): a search already kept and still fresh is reused free, whether the switch is on or off: never paid twice. A month old, it may be bought again (the same month as the server collector) */
export const KEEP_SEARCH_DAYS = 30;
const flying = new WeakMap();
export async function searchGoogle({ keyword, settings = {}, ledger, login, password, fetchImpl = fetch, now = new Date().toISOString(), location, language, test = false, retry = RETRY, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) }) {
  const key = `${keyword}|${location ?? ""}|${language ?? ""}`, kept = !test ? ledger.serpCache?.[key] : null;
  if (kept && (!kept.at || (Date.parse(now) - Date.parse(kept.at)) / 864e5 <= KEEP_SEARCH_DAYS)) return { ...kept, cached: true };
  if (settings.on !== true && !test) return { ok: false, off: true, why: SERP_OFF }; // "Test the connection" is the client's own click — inside the caps
  if (!login || !password) return { ok: false, stop: true, why: "your DataForSEO login is not saved on this computer (Search results data → step 2)" };
  const cap = Number(settings.capDay) > 0 ? Number(settings.capDay) : SERP.capPerDay, capMonth = Number(settings.capMonth) > 0 ? Number(settings.capMonth) : Infinity;
  /* RR-362: searches now run side by side: one already on its way counts against the cap, so a search that could pass it is still refused before it is sent */
  const fly = flying.get(ledger) ?? 0, m = mayBuy(ledger, { now, cap, capMonth, price: SERP.pricePerSearch * (fly + 1) }); if (!m.ok) return { ok: false, stop: true, capped: true, why: `the cap is reached ($${m.spent.toFixed(4)} today of $${Math.min(cap, SERP.capPerDay)}, $${m.month.toFixed(4)} this month) — nothing more is bought until it resets` };
  flying.set(ledger, fly + 1);
  let got, tries = 0;
  try { for (;;) {
    tries++;
    let r = null; try { r = await fetchImpl(SERP.url, { method: "POST", headers: { "content-type": "application/json", authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}` }, body: JSON.stringify(serpTask(keyword, { location, language })), signal: AbortSignal.timeout(30000) }); } catch { r = null; }
    got = r ? readSerp(await r.json().catch(() => ({}))) : { ok: false, code: null, message: null, why: "the search-results service did not answer" };
    /* RR-358: the cost DataForSEO charged; RR-359: a failed search is never booked as a cost — every search sent is in the ledger */
    (ledger.spent ??= []).push({ on: tries > 1 ? new Date().toISOString() : now, cost: got.ok ? got.cost || SERP.pricePerSearch : 0, q: keyword, what: test ? "search results (connection test)" : "search results", ...(got.ok ? { ok: true } : { ok: false, code: got.code, why: got.why }), ...(tries > 1 ? { retry: tries - 1 } : {}) });
    if (got.ok || !tryAgain(got) || tries > (retry?.times ?? 0)) break;
    await sleep((retry?.pauseMs ?? 0) * tries);
  } } finally { flying.set(ledger, (flying.get(ledger) ?? 1) - 1); }
  if (!got.ok && tries > 1) got = { ...got, why: `${got.why} Tried ${tries} times, with a pause; nothing was charged.` };
  if (got.ok) (ledger.serpCache ??= {})[key] = { ...got, at: now };
  return { ...got, tries };
}

/**
 * 🔴 RR-358 · G1 + G5 + G6 FOR EVERY PAGE ON A REAL RUN (owner's run on 1.15.10 made ONE search for 29 pages): for each page's intent —
 * Google's top results (up to 10) read for what they cover, "People also ask", related searches, and Reddit and Quora as Google shows them —
 * each search cached, inside the caps. A stop (the cap, the login, the account, the money) is said ONCE and on every page not searched.
 * `readHtml(url)` reads a top result's page (robots obeyed by the caller's reader). Mutates each page: questions, coverage, second,
 * topRead, serpWhy. → { searches, cost, read, of, reddit, quora, stopped, notes, line }
 */
/* RR-362 items 14 + 17: `concurrency` pages side by side (each site is still read politely, desktop/official.mjs), `topCache` = { get(url), set(url, value) }: a top page's headings kept a month, never read twice; `onPage`: the progress bar */
export async function searchPages({ pages = [], ledger, settings, login, password, now = new Date().toISOString(), readHtml = async () => null, fetchImpl, subject = null, retry = RETRY, sleep, concurrency = 1, topCache = null, onPage = null }) {
  let reddit = 0, quora = 0, pagesRead = 0, stopped = null, reused = 0, topsReused = 0; const reading = new Map(), notes = [], spentBefore = (ledger.spent ?? []).length;
  const ask = async (k) => { const r = await searchGoogle({ keyword: k, settings, ledger, login, password, now, retry, ...(sleep ? { sleep } : {}), ...(fetchImpl ? { fetchImpl } : {}) }); if (r.cached) reused++; if (!r.ok && r.stop && !stopped) stopped = r.why; return r; };
  const headingsOf = (h) => [...String(h).matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 40);
  const onePage = async (p) => {
    delete p.serpWhy;
    if (stopped) { p.serpWhy = stopped; return; } // every page after a stop says why it was not searched
    onPage?.(p, "search");
    const main = await ask(p.title); if (!main.ok) { p.serpWhy = main.why; notes.push(`${p.title}: ${main.why}`); return; }
    pagesRead++; p.paa = main.paa; p.related = main.related;
    const rq = communityQuestions((await ask(`${p.title} reddit`)).results ?? [], "reddit.com"), qq = communityQuestions((await ask(quoraSearch(p.title))).results ?? [], "quora.com");
    reddit += rq.length; quora += qq.length;
    const day = String(now).slice(0, 10), q = (text, src) => ({ question: text, source: src, on: day });
    p.questions = [...(p.questions ?? []), ...main.paa.map((t) => q(t, `Google "People also ask" (${day})`)), ...main.related.map((t) => q(t, `Google related searches (${day})`)), ...rq.map((t) => q(t, `a Reddit result as Google shows it (${day})`)), ...qq.map((t) => q(t, `a Quora result as Google shows it (${day})`))];
    /* the top results' own headings — read only to see what they cover; nothing is copied, no fact is taken */
    const tops = (await Promise.all(main.results.slice(0, SERP.depth).filter((r) => !notForReading(r.url)).map(async (r) => {
      const was = topCache?.get(r.url); if (was && (Date.parse(now) - Date.parse(was.on ?? 0)) / 864e5 <= KEEP_SEARCH_DAYS) { topsReused++; return was.headings ? { url: r.url, title: r.title, headings: was.headings, text: "" } : null; }
      /* the same page wanted by two pages side by side is read once */
      if (!reading.has(r.url)) reading.set(r.url, Promise.resolve(readHtml(r.url)).catch(() => null));
      const h = await reading.get(r.url); topCache?.set(r.url, { on: String(now).slice(0, 10), headings: h ? headingsOf(h) : null }); if (!h) return null;
      return { url: r.url, title: r.title, headings: headingsOf(h), text: String(h).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").slice(0, 20000) };
    }))).filter(Boolean);
    /* RR-359: only the topic's real subtopics (desktop/coverage.mjs), judged with the page's own subject and title; covered by meaning */
    const words = { subject, title: p.title, now, names: COUNTRIES };
    p.coverage = coverageOf(tops, { ...words, paa: main.paa }); p.second = secondSearch({ best: tops[0] ?? null, paa: main.paa, coverage: p.coverage, subject, title: p.title }); p.topRead = tops.map((r) => r.url); p.searchedOn = String(now).slice(0, 10);
  };
  /* in order, at most `concurrency` at a time; a stop is seen by every page not started yet */
  let at = 0; await Promise.all(Array.from({ length: Math.max(1, concurrency) }, async () => { while (at < pages.length) { const p = pages[at++]; await onePage(p); onPage?.(p, "done"); } }));
  const mine = (ledger.spent ?? []).slice(spentBefore), bought = mine.filter((x) => x.ok !== false).length, searches = mine.length /* every search sent is in the ledger, refused or not */, cost = mine.reduce((t, x) => t + (Number(x.cost) || 0), 0), retried = mine.filter((x) => x.retry).length, failed = mine.filter((x) => x.ok === false).length;
  const line = `Google's results (your DataForSEO account): ${searches} search${searches === 1 ? "" : "es"}, $${cost.toFixed(4)} — ${pagesRead} of ${pages.length} pages read what ranks, "People also ask", related searches, Reddit and Quora as Google shows them.${retried ? ` ${retried} tried again after DataForSEO failed; ${failed} failed search${failed === 1 ? "" : "es"} charged nothing.` : ""}${stopped ? ` Stopped: ${stopped}` : notes.length ? ` Not read for ${notes.length}: ${notes[0]}` : ""}`;
  return { searches, cost, retried, failed, read: pagesRead, of: pages.length, reddit, quora, stopped, notes, line, reused, bought, topsReused };
}

/* RR-359 (owner: Quora as "site:quora.com …" cost $0.01 a search — DataForSEO charges five times for a search with an operator): Quora as
 * Google shows it for "<topic> quora", the same plain price as every other search */
export const quoraSearch = (title) => `${title} quora`;
/*
 * 🔴 RR-359 · THE REAL PRICE PER SEARCH (owner: the estimate said about $0.19, the run cost $0.40 for 88 searches): the price DataForSEO
 * charged this account for its latest successful plain searches (the ledger), else its list price, said as such → { price, from, on }
 */
export function realPrice(ledger = {}) {
  const paid = (ledger.spent ?? []).filter((x) => x.ok !== false && Number(x.cost) > 0 && !/^site:|\b(inurl|intitle|allintitle|allinurl):/i.test(String(x.q ?? ""))).slice(-20);
  if (!paid.length) return { price: SERP.pricePerSearch, from: "DataForSEO's list price (no search of yours yet)", on: null };
  const sorted = paid.map((x) => Number(x.cost)).sort((a, b) => a - b), price = sorted[Math.floor(sorted.length / 2)];
  return { price, from: `what DataForSEO charged you (your last ${paid.length} search${paid.length === 1 ? "" : "es"})`, on: String(paid.at(-1).on).slice(0, 10) };
}
/** one run's searches and cost: 3 searches a page (the intent, Reddit, Quora), less the ones already kept → { pages, searches, cached, cost, line } */
export function runEstimate({ titles = [], ledger = {}, price = realPrice(ledger).price } = {}) {
  const kw = titles.flatMap((t) => [t, `${t} reddit`, quoraSearch(t)]), cached = kw.filter((k) => ledger.serpCache?.[`${k}||`]).length, searches = kw.length - cached, cost = searches * price;
  return { pages: titles.length, searches, cached, price, cost, line: titles.length ? `One run for ${titles.length} page${titles.length === 1 ? "" : "s"}: ${searches} search${searches === 1 ? "" : "es"} × $${price.toFixed(4)} ≈ $${cost.toFixed(2)}${cached ? ` (${cached} already kept — free)` : ""}. A search DataForSEO fails is tried again and costs nothing.` : "One run: 3 searches a page (the question, Reddit, Quora) — the pages are known after the first Create SEO pages." };
}
