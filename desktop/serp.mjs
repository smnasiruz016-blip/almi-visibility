/**
 * 🔴 RR-356 · G1 + G5 — WHAT GOOGLE SHOWS FOR A SEARCH, through a paid search-results service (DataForSEO's Google organic SERP, documented
 * at docs.dataforseo.com/v3/serp/google/organic/task_post, the Standard queue since RR-366): the top results (up to 10), "People also ask" and related searches.
 *   · OWNER'S MONEY DECISION: OFF by default; switched on only by the client in Settings; a HARD CAP of $1 a day — a search that could pass
 *     it is refused BEFORE it is sent; every cost is kept. With the switch off, nothing is bought and the ledger says what could not be read.
 *   · R4: Reddit and Quora are read ONLY as Google shows them — the titles and snippets of the results for "<topic> reddit" and
 *     "site:quora.com <topic>". Visibility never calls Reddit's API and never opens reddit.com or quora.com. Their words are QUESTIONS, never facts.
 *   · The key is the DataForSEO login already kept in Windows' secure store (desktop/secrets.mjs) — by name only.
 * Pure parts (the request, the answer read, the cap) are exported for the tests; the call is handed fetch.
 */
import { coverageOf, secondSearch } from "./recipe.mjs"; // RR-358: G5 + G6 for every page
import { COUNTRIES } from "./world.mjs"; // RR-359: a heading that is only a country's name is no subtopic
import { blocksOfHtml, blueprintOf } from "./blocks.mjs"; // RR-363: R15
import { coreOf } from "./page-types.mjs";
import { meaningOf } from "./coverage.mjs";
import { localSeeds } from "./subject-demand.mjs";
import { STANDARD } from "./research.mjs";
/* 🔴 RR-366 Part 7 (owner + DataForSEO's account manager, 2 Nov 2026): the STANDARD queue, $0.0006 a search against $0.002 live; results come within minutes and collecting them is free. Nothing here needs real time */
export const SERP = Object.freeze({ url: "https://api.dataforseo.com/v3/serp/google/organic/task_post", getUrl: "https://api.dataforseo.com/v3/serp/google/organic/task_get/advanced/", pricePerSearch: 0.0006, capPerDay: 1, depth: 10 });
/* 🔴 RR-366 X1 (owner's ruling, 15 Oct): paid search only enriches, in the background; it never stops a page. The cap is said in these words, never as a reason */
export const CAP_LATER = "More data will be added when the budget resets.";
const laterWhy = (why) => (/cap is reached/.test(String(why ?? "")) ? CAP_LATER : why);
export const QUEUE = Object.freeze({ everyMs: 15000, maxMs: 900000 /* measured in the live proof: some answers took over ten minutes; what is later waits, paid, for the next run */, perPost: 100, side: 12, waiting: new Set([40601, 40602]), created: 20100 });
/* On-Page content parsing reads one page's structure (headings, lists, tables, text) for $0.00015; each page once, kept and reused */
export const ONPAGE = Object.freeze({ url: "https://api.dataforseo.com/v3/on_page/content_parsing/live", price: 0.00015 });
export const SERP_OFF = "Google's own results were not read — the search-results service is switched off (Settings → Search results data; about $0.0006 a search, at most $1 a day). Visibility used every free source it may: its own search data, your Search Console, AlmiWorld's question collector and the official pages.";

/** the day's spend and whether one more search may be bought — never past the cap */
export function mayBuy(ledger = { spent: [] }, { now = new Date().toISOString(), cap = SERP.capPerDay, capMonth = Infinity, price = SERP.pricePerSearch } = {}) {
  const sum = (p) => (ledger.spent ?? []).filter((s) => String(s.on).startsWith(p)).reduce((t, s) => t + (Number(s.cost) || 0), 0);
  const spent = sum(String(now).slice(0, 10)), month = sum(String(now).slice(0, 7)), day = Math.min(cap, SERP.capPerDay); // R10: never more than $1 a day
  return { ok: spent + price <= day + 1e-9 && month + price <= capMonth + 1e-9, spent, month, left: Math.max(0, day - spent) };
}
/** the request body (one task) for a search in a country and language */
export const serpTask = (keyword, { location = "United States", language = "en" } = {}) => [{ keyword, location_name: location, language_code: language, depth: SERP.depth, priority: 1 }];
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
/* RR-363 (found in the owner's saved results: 846 of 1,220 addresses were Google's own redirect links, never opened): the page's own address, from the result's breadcrumb; none: the redirect stays, and is left unread */
const realUrl = (i) => { if (!/^https?:\/\/(?:[^/]*\.)?google\./i.test(i.url)) return i.url; const b = String(i.breadcrumb ?? "").split(/\s*›\s*/).map((x) => x.trim()).filter(Boolean); return /^https?:\/\/[^\s/]+\.[a-z]/i.test(b[0] ?? "") && !/\.\.\.|…/.test(String(i.breadcrumb ?? "")) /* RR-366: a breadcrumb cut short ("oet-test-centr...") is no address */ && b.every((x, k) => k === 0 || /^[\w%.~-]+$/.test(x)) ? b.join("/").replace(/([^:])\/\//g, "$1/") : i.url; };
/**
 * 🔴 RR-366 Part 7 · THE STANDARD QUEUE. A search is posted once and paid once: its task id stays in the ledger (ledger.pending) until its answer is collected, free, so a run that stops, or an answer not ready yet, is never paid again.
 * `tasksOf` posts up to QUEUE.perPost at a time, `collectOne` asks for one answer. An answer that comes at once (a stand-in, a test) is taken as it is.
 */
const authOf = (login, password) => `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}`;
const GET_OF = Object.freeze({ serp: SERP.getUrl, auto: "https://api.dataforseo.com/v3/serp/google/autocomplete/task_get/advanced/" });
const readOf = (kind, json) => (kind === "auto" ? readAutocomplete(json) : readSerp(json));
const isCreated = (t) => t?.status_code === QUEUE.created && t?.id;
export async function collectOne({ pending, login, password, fetchImpl = fetch }) {
  let r = null; try { r = await fetchImpl(`${GET_OF[pending.kind ?? "serp"]}${pending.id}`, { method: "GET", headers: { authorization: authOf(login, password) }, signal: AbortSignal.timeout(30000) }); } catch { return { waiting: true }; }
  const json = await r.json().catch(() => null), t = json?.tasks?.[0]; if (!json) return { waiting: true };
  if (QUEUE.waiting.has(t?.status_code) || QUEUE.waiting.has(json?.status_code)) return { waiting: true };
  return readOf(pending.kind ?? "serp", json);
}
/** every search not kept and not on its way is posted, inside the cap → { posted, cost, stop } */
export async function queueSearches({ wanted = [], settings = {}, ledger, login, password, fetchImpl = fetch, now = new Date().toISOString() }) {
  if (settings.on !== true) return { posted: 0, cost: 0, off: true };
  if (!login || !password) return { posted: 0, cost: 0, stop: "your DataForSEO login is not saved on this computer (Search results data → step 2)" };
  const cap = Number(settings.capDay) > 0 ? Number(settings.capDay) : SERP.capPerDay, capMonth = Number(settings.capMonth) > 0 ? Number(settings.capMonth) : Infinity, price = SERP.pricePerSearch;
  const fresh = (k) => { const c = ledger.serpCache?.[k]; return c && usable(c) && (!c.at || (Date.parse(now) - Date.parse(c.at)) / 864e5 <= KEEP_SEARCH_DAYS); }, seen = new Set(), wasUnusable = (k) => Boolean(ledger.serpCache?.[k]?.results?.length) && !usable(ledger.serpCache[k]);
  const todo = wanted.filter((w) => !fresh(w.key) && !ledger.pending?.[w.key] && !seen.has(w.key) && seen.add(w.key));
  let posted = 0, cost = 0, stop = null, left = todo;
  while (left.length && !stop) {
    /* never past the cap: only as many as it still allows are sent */
    const m = mayBuy(ledger, { now, cap, capMonth, price: 0 }), room = Math.min(Math.floor((Math.min(cap, SERP.capPerDay) - m.spent + 1e-9) / price), Math.floor((capMonth - m.month + 1e-9) / price)), batch = left.slice(0, Math.min(QUEUE.perPost, Math.max(0, room)));
    if (!batch.length) { stop = `the cap is reached ($${m.spent.toFixed(4)} today of $${Math.min(cap, SERP.capPerDay)}, $${m.month.toFixed(4)} this month) — nothing more is bought until it resets`; break; }
    const sameKind = batch.filter((w) => (w.kind ?? "serp") === (batch[0].kind ?? "serp")), url = batch[0].kind === "auto" ? AUTOCOMPLETE.url : SERP.url;
    let r = null; try { r = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/json", authorization: authOf(login, password) }, body: JSON.stringify(sameKind.flatMap((w) => w.task)), signal: AbortSignal.timeout(60000) }); } catch { r = null; }
    const json = r ? await r.json().catch(() => null) : null; if (!json || json.status_code !== 20000) { const bad = readSerp(json ?? {}); stop = bad.stop ? bad.why : `the search-results service did not take the searches: ${bad.why}`; break; }
    sameKind.forEach((w, i) => { const t = json.tasks?.[i]; if (isCreated(t)) { const c = Number(t.cost) || price; (ledger.pending ??= {})[w.key] = { id: t.id, kind: w.kind ?? "serp", at: now, cost: c, q: w.q, ...(wasUnusable(w.key) ? { again: true } : {}) }; (ledger.spent ??= []).push({ on: now, cost: c, q: w.q, what: w.kind === "auto" ? "autocomplete" : "search results", queued: true, ok: true }); posted++; cost += c; } else { const g = readOf(w.kind ?? "serp", { status_code: 20000, tasks: [t] }); (ledger.spent ??= []).push({ on: now, cost: g.ok ? g.cost || price : 0, q: w.q, what: w.kind === "auto" ? "autocomplete" : "search results", ok: g.ok, ...(g.ok ? {} : { code: g.code, why: g.why }) }); if (g.ok) { (ledger.serpCache ??= {})[w.key] = { ...g, at: now }; posted++; cost += g.cost || price; } else if (g.stop) stop = g.why; } });
    left = left.filter((w) => !sameKind.includes(w));
  }
  return { posted, cost, stop };
}
/** what is on its way, collected free; waits at most maxMs. An answer that failed leaves the queue (said), one still waiting stays for the next run */
export async function collectQueued({ ledger, login, password, fetchImpl = fetch, now = new Date().toISOString(), maxMs = QUEUE.maxMs, everyMs = QUEUE.everyMs, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), clock = Date.now, onWait = null } = {}) {
  const t0 = clock(), failed = []; let got = 0;
  for (;;) {
    const keys = Object.keys(ledger.pending ?? {}); if (!keys.length) break;
    for (let at = 0; at < keys.length; at += QUEUE.side) await Promise.all(keys.slice(at, at + QUEUE.side).map(async (k) => {
      const p = ledger.pending[k], a = await collectOne({ pending: p, login, password, fetchImpl }); if (a.waiting) return;
      delete ledger.pending[k];
      /* 🔴 RR-366 (the live proof: "No Search Results" was not kept, so the page step posted it again and paid twice): nothing to show is an answer, kept like any other */
      if (!a.ok && /no search results/i.test(String(a.why ?? a.message ?? ""))) { (ledger.serpCache ??= {})[k] = { ok: true, empty: true, results: [], paa: [], related: [], phrases: [], cost: p.cost, at: now }; got++; return; }
      if (a.ok) { (ledger.serpCache ??= {})[k] = { ...a, cost: p.cost, at: now, ...(p.again ? { again: true } : {}) }; got++; } else { failed.push({ q: p.q, why: a.why }); const row = [...(ledger.spent ?? [])].reverse().find((x) => x.q === p.q && x.queued); if (row) Object.assign(row, { ok: false, why: a.why }); }
    }));
    const left = Object.keys(ledger.pending ?? {}).length; onWait?.(left); if (!left || clock() - t0 >= maxMs) break;
    await sleep(everyMs);
  }
  return { got, failed, waiting: Object.keys(ledger.pending ?? {}).length };
}
const words = (t) => String(t ?? "").split(/\s+/).filter(Boolean).length;
/** 🔴 RR-366 · what On-Page content parsing says of a page → its building blocks and headings; never a sentence of its text. A search box and fold-outs cannot be seen this way: said in `cannotSee` */
export function blocksOfContent(item, { title = null } = {}) {
  const pc = item?.page_content ?? {}, topics = [...(pc.main_topic ?? []), ...(pc.secondary_topic ?? [])], heads = topics.map((t) => String(t.h_title ?? "").trim()).filter(Boolean), content = topics.flatMap((t) => [...(t.primary_content ?? []), ...(t.secondary_content ?? [])]);
  const rowsOf = (x) => [].concat(x?.header ?? [], x?.body ?? []).filter(Boolean), tables = topics.flatMap((t) => [].concat(t.table_content ?? [])).filter((x) => rowsOf(x).length), columnsOf = (x) => (rowsOf(x)[0]?.row_cells ?? []).map((c) => String(c.text ?? "").trim().slice(0, 40)).filter(Boolean).slice(0, 8), mdTables = (String(item?.page_as_markdown ?? "").match(/^\s*\|?\s*:?-{2,}:?\s*\|/gm) ?? []).length;
  let steps = 0, run = 0, last = 0; for (const l of String(item?.page_as_markdown ?? "").split(/\r?\n/)) { const m = /^\s*(\d{1,2})[.)]\s+\S/.exec(l); if (m && Number(m[1]) === last + 1) { run++; last = Number(m[1]); steps = Math.max(steps, run); } else if (m && Number(m[1]) === 1) { run = 1; last = 1; } else if (l.trim()) { run = 0; last = 0; } }
  const anchors = content.flatMap((c) => c.urls ?? []).map((u) => String(u.anchor_text ?? "")), said = words(content.map((c) => c.text).join(" "));
  return { blocks: { search: false, tables: Math.max(tables.length, mdTables), columns: tables.slice(0, 3).map(columnsOf), steps: steps >= 2 ? steps : 0, bar: heads.some((h) => /^(?:table of )?contents$/i.test(h)) || anchors.filter((a) => /^(?:overview|dates?|fees?|results?|book(?:ing)?|faqs?)$/i.test(a.trim())).length >= 3, foldouts: 0, faqs: heads.filter((h) => /\?\s*$/.test(h)).length, action: anchors.some((a) => /^(?:book|try|start|get started|sign up|register|enrol|apply)\b/i.test(a.trim())), related: heads.some((h) => /\b(?:related|you may also|read next|see also|more guides)\b/i.test(h)), comments: (pc.comments?.length ?? 0) > 0, year: /\b20\d\d\b/.test(String(title ?? topics[0]?.main_title ?? "")), tips: heads.some((h) => /\btips?\b/i.test(h)), words: said, thin: said < 150, via: "on-page", cannotSee: ["search", "foldouts"] }, headings: heads.slice(0, 40) };
}
/** one top page through On-Page parsing, inside the cap. → { ok, blocks, headings, cost } or { ok:false, stop?, why } */
export async function parseTopPage({ url, title = null, settings = {}, ledger, login, password, fetchImpl = fetch, now = new Date().toISOString() }) {
  if (settings.on !== true) return { ok: false, off: true };
  if (!login || !password) return { ok: false, stop: true, why: "your DataForSEO login is not saved on this computer" };
  const cap = Number(settings.capDay) > 0 ? Number(settings.capDay) : SERP.capPerDay, capMonth = Number(settings.capMonth) > 0 ? Number(settings.capMonth) : Infinity, m = mayBuy(ledger, { now, cap, capMonth, price: ONPAGE.price });
  if (!m.ok) return { ok: false, stop: true, capped: true, why: `the cap is reached ($${m.spent.toFixed(4)} today)` };
  let json = null; try { const r = await fetchImpl(ONPAGE.url, { method: "POST", headers: { "content-type": "application/json", authorization: authOf(login, password) }, body: JSON.stringify([{ url, markdown_view: true, accept_language: "en" }]), signal: AbortSignal.timeout(60000) }); json = await r.json().catch(() => null); } catch { json = null; }
  const t = json?.tasks?.[0], item = t?.result?.[0]?.items?.[0], ok = json?.status_code === 20000 && t?.status_code === 20000 && item?.page_content, cost = ok ? Number(t.cost) || ONPAGE.price : Number(t?.cost) || 0; /* what was really charged, a page that could not be read too */
  (ledger.spent ??= []).push({ on: now, cost, q: url, what: "top page read", ok: Boolean(ok), ...(ok ? {} : { why: item?.status_code ? `the page answered ${item.status_code}` : t?.status_message ?? json?.status_message ?? "no answer" }) });
  return ok ? { ok: true, cost, ...blocksOfContent(item, { title }) } : { ok: false, code: t?.status_code ?? json?.status_code ?? null, why: t?.status_message ?? json?.status_message ?? "the page could not be read this way" };
}
/** DataForSEO's answer → { results: [{ url, title, snippet }], paa: [question], related: [search], cost } (status 20000 = ok) */
export function readSerp(json) {
  const t = json?.tasks?.[0]; if (json?.status_code !== 20000 || t?.status_code !== 20000) { const code = Number(t?.status_code && t.status_code !== 20000 ? t.status_code : json?.status_code) || null, message = (t?.status_code && t.status_code !== 20000 ? t?.status_message : json?.status_message) ?? null; return { ok: false, code, message, stop: STOPS_EVERY_SEARCH.has(code), why: json && Object.keys(json).length ? plainSerpWhy(code, message) : "DataForSEO did not answer with results (the answer could not be read).", cost: Number(t?.cost ?? json?.cost ?? 0) || 0 }; }
  const items = t.result?.[0]?.items ?? [];
  return { ok: true, cost: Number(t.cost ?? 0) || 0,
    results: items.filter((i) => i.type === "organic" && i.url).slice(0, SERP.depth).map((i, n) => ({ url: realUrl(i), rank: n + 1, title: i.title ?? "", snippet: i.description ?? "" })),
    paa: items.filter((i) => i.type === "people_also_ask").flatMap((i) => (i.items ?? []).map((x) => x.title)).filter(Boolean),
    related: items.filter((i) => i.type === "related_searches").flatMap((i) => i.items ?? []).map((x) => (typeof x === "string" ? x : x?.title)).filter(Boolean) };
}
/* RR-362 (found in the crash hunt: Google's own redirect links among the results were being read): a result on Google's own site, Reddit or Quora is never opened */
/* 🔴 item 34b: Google's autocomplete in a country, through the same service, ledger and caps; a kept answer is reused free */
export const AUTOCOMPLETE = Object.freeze({ url: "https://api.dataforseo.com/v3/serp/google/autocomplete/task_post" });
export const autoKey = (keyword, country) => `auto|${keyword}|${country}`, autoTask = (keyword, country) => [{ keyword, location_name: country, language_code: "en", priority: 1 }];
export const readAutocomplete = (json) => { const t = json?.tasks?.[0]; if (json?.status_code !== 20000 || t?.status_code !== 20000) return { ok: false, why: t?.status_message ?? json?.status_message ?? "no answer" }; return { ok: true, cost: Number(t.cost) || 0, phrases: (t.result?.[0]?.items ?? []).filter((i) => i.type === "autocomplete" && i.suggestion).map((i) => String(i.suggestion).trim()) }; };
export async function autocompleteIn({ keyword, country, settings = {}, ledger, login, password, fetchImpl = fetch, now = new Date().toISOString(), wait = true, poll = {} }) {
  const key = autoKey(keyword, country), kept = ledger.serpCache?.[key];
  if (kept && (!kept.at || (Date.parse(now) - Date.parse(kept.at)) / 864e5 <= KEEP_SEARCH_DAYS)) return { ...kept, cached: true };
  if (settings.on !== true) return { ok: false, off: true };
  if (!login || !password) return { ok: false, stop: true, why: "your DataForSEO login is not saved on this computer" };
  /* wait false: the run already posted everything together: here it is only collected, never posted again */
  if (!ledger.pending?.[key] && wait) { const q = await queueSearches({ wanted: [{ key, q: keyword, kind: "auto", task: autoTask(keyword, country) }], settings, ledger, login, password, fetchImpl, now }); if (q.stop) return { ok: false, stop: true, capped: /cap is reached/.test(q.stop), why: q.stop }; }
  if (ledger.pending?.[key]) { if (wait) await collectQueued({ ledger, login, password, fetchImpl, now, ...poll }); else await collectQueued({ ledger, login, password, fetchImpl, now, maxMs: 0, everyMs: 0 }); }
  return ledger.serpCache?.[key] ?? { ok: false, waiting: Boolean(ledger.pending?.[key]), why: ledger.pending?.[key] ? "still being prepared — collected free on the next run" : "the service did not answer" };
}
/* item 29: a country page's questions, most typed there first; a question people there type in the same words takes their wording */
export function rankByLocal(items = [], phrases = [], subject = null) {
  const sets = phrases.map((p, rank) => ({ p, rank, w: new Set(meaningOf(p, { drop: [subject] })) })).filter((x) => x.w.size);
  const best = (q) => { const m = meaningOf(q, { drop: [subject] }); let top = null; for (const x of sets) { const both = m.filter((w) => x.w.has(w)).length; if (both && both / Math.max(m.length, 1) > 0.5 && (!top || x.rank < top.rank)) top = x; } return top; };
  const slots = items.map((it, i) => (/^questions\d*$/.test(it.part) ? i : -1)).filter((i) => i >= 0), asks = slots.map((i) => items[i]).map((it, n) => ({ it, n, hit: best(it.question) })).sort((a, b) => (a.hit?.rank ?? 1e9) - (b.hit?.rank ?? 1e9) || a.n - b.n);
  const out = [...items]; slots.forEach((i, n) => { const { it, hit } = asks[n], same = hit && [...hit.w].sort().join() === meaningOf(it.question, { drop: [subject] }).join() && /^(how|what|why|which|where|when|who|is|are|can|does|do)\b/i.test(hit.p); out[i] = same ? { ...it, question: `${hit.p.charAt(0).toUpperCase()}${hit.p.slice(1).replace(/[?.]*$/, "")}?`, localWording: true } : it; });
  return out;
}
export const notForReading = (u) => /^https?:\/\/(?:[^/]*\.)?(?:google\.[a-z.]+|reddit\.com|quora\.com)(?:[/:?#]|$)/i.test(String(u)) || /\.\.\.$|…$/.test(String(u));
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
/* 🔴 RR-366: a saved answer whose results are nearly all Google's own redirect links can never be read for its blocks (846 of 1,220 at RR-363): it is bought once more, marked, and never again */
const usable = (c) => { const rs = c?.results; if (!rs?.length || c.again) return true; return rs.filter((r) => !/^https?:\/\/(?:[^/]*\.)?google\./i.test(r.url)).length * 2 >= rs.length; };
export const serpKey = (keyword, location = "", language = "") => `${keyword}|${location ?? ""}|${language ?? ""}`;
export async function searchGoogle({ postOnly = false /* RR-368: paid and kept; collected on the next run or by the run's own collecting step. The run does not stand and wait */, keyword, settings = {}, ledger, login, password, fetchImpl = fetch, now = new Date().toISOString(), location, language, test = false, retry = RETRY, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), wait = true, poll = {} }) {
  const key = `${keyword}|${location ?? ""}|${language ?? ""}`, kept = !test ? ledger.serpCache?.[key] : null;
  if (kept && (settings.on !== true || usable(kept)) && (!kept.at || (Date.parse(now) - Date.parse(kept.at)) / 864e5 <= KEEP_SEARCH_DAYS)) return { ...kept, cached: true };
  if (settings.on !== true && !test) return { ok: false, off: true, why: SERP_OFF }; // "Test the connection" is the client's own click — inside the caps
  if (!login || !password) return { ok: false, stop: true, why: "your DataForSEO login is not saved on this computer (Search results data → step 2)" };
  /* RR-366: already posted and paid: only collected, free */
  const collectIt = async () => { if (postOnly) return ledger.serpCache?.[key] ? { ...ledger.serpCache[key], cached: true } : { ok: false, waiting: true, why: "Google's results for this page are still being prepared" }; if (wait) await collectQueued({ ledger, login, password, fetchImpl, now, sleep, ...poll }); else if (ledger.pending?.[key]) await collectQueued({ ledger, login, password, fetchImpl, now, maxMs: 0, everyMs: 0 }); return ledger.serpCache?.[key] ? { ...ledger.serpCache[key], cached: !wait } : { ok: false, waiting: true, why: "Google's results for this page are still being prepared — they are collected free on the next run." }; };
  if (ledger.pending?.[key]) return collectIt();
  /* wait false: the run already posted everything together: what is not here failed or was stopped by the cap: never posted a second time */
  if (!wait) return { ok: false, why: "Google's results for this page could not be read in this run." };
  const cap = Number(settings.capDay) > 0 ? Number(settings.capDay) : SERP.capPerDay, capMonth = Number(settings.capMonth) > 0 ? Number(settings.capMonth) : Infinity;
  /* RR-362: searches now run side by side: one already on its way counts against the cap, so a search that could pass it is still refused before it is sent */
  const fly = flying.get(ledger) ?? 0, m = mayBuy(ledger, { now, cap, capMonth, price: SERP.pricePerSearch * (fly + 1) }); if (!m.ok) return { ok: false, stop: true, capped: true, why: `the cap is reached ($${m.spent.toFixed(4)} today of $${Math.min(cap, SERP.capPerDay)}, $${m.month.toFixed(4)} this month) — nothing more is bought until it resets` };
  flying.set(ledger, fly + 1);
  let got, tries = 0;
  try { for (;;) {
    tries++;
    let r = null; try { r = await fetchImpl(SERP.url, { method: "POST", headers: { "content-type": "application/json", authorization: authOf(login, password) }, body: JSON.stringify(serpTask(keyword, { location, language })), signal: AbortSignal.timeout(30000) }); } catch { r = null; }
    const said = r ? await r.json().catch(() => ({})) : null, task = said?.tasks?.[0];
    /* RR-366: the queue took it: paid once, its id kept; the answer is collected free */
    if (isCreated(task)) { const c = Number(task.cost) || SERP.pricePerSearch; (ledger.pending ??= {})[key] = { id: task.id, kind: "serp", at: now, cost: c, q: keyword }; (ledger.spent ??= []).push({ on: now, cost: c, q: keyword, what: test ? "search results (connection test)" : "search results", queued: true, ok: true }); return collectIt(); }
    got = said ? readSerp(said) : { ok: false, code: null, message: null, why: "the search-results service did not answer" };
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
/* 🔴 RR-366 (the live proof: "OET in the United Kingdom: fee, centres and councils" brought a government data catalogue): what people search is the page's subject, not its whole heading */
export const searchTermOf = (p) => String(p?.title ?? p ?? "").split(/:\s|\?\s/)[0].trim().replace(/^(What is .+)$/i, "$1?");
/* RR-366 (`queue`: a real run): every search of the run is posted first and collected together, so a run waits minutes once, never per search. `parse`: each top page through On-Page parsing, once */
export async function searchPages({ pages = [], ledger, settings, login, password, now = new Date().toISOString(), readHtml = async () => null, fetchImpl, subject = null, retry = RETRY, sleep, concurrency = 1, topCache = null, onPage = null, officialPageOf = null, queue = null, parse = false, onQueue = null, maxTops = SERP.depth }) {
  let reddit = 0, quora = 0, pagesRead = 0, stopped = null, reused = 0, topsReused = 0; const reading = new Map(), notes = [], spentBefore = (ledger.spent ?? []).length, bought = new Set();
  if (queue && settings?.on === true) {
    const wanted = pages.flatMap((p) => [...[searchTermOf(p), `${searchTermOf(p)} reddit`, quoraSearch(searchTermOf(p))].map((k) => ({ key: serpKey(k), q: k, task: serpTask(k) })), ...(p.kind === "country" && p.country && subject ? localSeeds(subject, p.country, p.category ?? "exam").map((k) => ({ key: autoKey(k, p.country), q: k, kind: "auto", task: autoTask(k, p.country) })) : [])]);
    const before = new Set(Object.keys(ledger.pending ?? {})), had = new Set(Object.keys(ledger.serpCache ?? {}));
    /* the two kinds of search have two addresses */
    /* X4: a search that failed on the service's side ("Internal SE Server Error") is tried again, at most RETRY.times; still failing, its page carries on without it */
    let c = null, ask = wanted; for (let round = 0; round <= (retry?.times ?? 0); round++) {
      for (const kind of ["serp", "auto"]) { const q = await queueSearches({ wanted: ask.filter((w) => (w.kind ?? "serp") === kind), settings, ledger, login, password, now, ...(fetchImpl ? { fetchImpl } : {}) }); if (q.stop && !stopped) stopped = q.stop; }
      c = await collectQueued({ ledger, login, password, now, ...(fetchImpl ? { fetchImpl } : {}), ...(sleep ? { sleep } : {}), onWait: onQueue, ...queue });
      const again = new Set(c.failed.filter((f) => tryAgain({ ok: false, why: f.why })).map((f) => f.q)); if (!again.size || stopped) break; ask = wanted.filter((w) => again.has(w.q)); if (sleep) await sleep((retry?.pauseMs ?? 0) * (round + 1));
    }
    for (const k of Object.keys(ledger.serpCache ?? {})) if (!had.has(k)) bought.add(k);
    if (c.waiting) notes.push(`${c.waiting} searches are still being prepared: they are collected free on the next run.`);
    void before;
  }
  const ask = async (k) => { const r = await searchGoogle({ keyword: k, settings, ledger, login, password, now, retry, ...(queue ? { wait: false } : {}), ...(sleep ? { sleep } : {}), ...(fetchImpl ? { fetchImpl } : {}) }); if (r.cached && !bought.has(serpKey(k))) reused++; if (!r.ok && r.stop && !stopped) stopped = r.why; return r; };
  const headingsOf = (h) => [...String(h).matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()).slice(0, 40);
  const onePage = async (p) => {
    delete p.serpWhy;
    if (stopped) { p.serpWhy = laterWhy(stopped); return; } // every page after a stop says why it was not searched
    onPage?.(p, "search");
    /* RR-366 (the live proof): what people of a country type does not wait for the page's own search */
    if (p.kind === "country" && p.country && subject) { const said = []; for (const keyword of localSeeds(subject, p.country, p.category ?? "exam")) { const a = await autocompleteIn({ keyword, country: p.country, settings, ledger, login, password, now, ...(queue ? { wait: false } : {}), ...(fetchImpl ? { fetchImpl } : {}) }); if (a.stop && !stopped) stopped = a.why; if (a.ok) said.push(...a.phrases); } if (said.length) { p.localAsked = [...new Set(said)]; p.items = rankByLocal(p.items ?? [], p.localAsked, subject); } }
    const term = searchTermOf(p), main = await ask(term); if (!main.ok) { p.serpWhy = laterWhy(main.why); notes.push(`${p.title}: ${laterWhy(main.why)}`); return; }
    pagesRead++; p.paa = main.paa; p.related = [...new Set([...main.related, ...(p.localAsked ?? [])])];
    const rq = communityQuestions((await ask(`${term} reddit`)).results ?? [], "reddit.com"), qq = communityQuestions((await ask(quoraSearch(term))).results ?? [], "quora.com");
    reddit += rq.length; quora += qq.length;
    const day = String(now).slice(0, 10), q = (text, src) => ({ question: text, source: src, on: day });
    p.questions = [...(p.questions ?? []), ...main.paa.map((t) => q(t, `Google "People also ask" (${day})`)), ...main.related.map((t) => q(t, `Google related searches (${day})`)), ...rq.map((t) => q(t, `a Reddit result as Google shows it (${day})`)), ...qq.map((t) => q(t, `a Quora result as Google shows it (${day})`))];
    /* the top results' own headings — read only to see what they cover; nothing is copied, no fact is taken */
    const results = main.results.slice(0, SERP.depth).map((r, n) => ({ ...r, rank: r.rank ?? n + 1 })), own = officialPageOf?.(p);
    /* the subject's own page on this topic is read beside them (free, and Google's first result more often than not), said as such */
    const toRead = [...results.filter((r) => !notForReading(r.url)).slice(0, maxTops), ...(own && !results.some((r) => r.url === own) ? [{ url: own, title: "", rank: null, official: true }] : [])];
    const tops = (await Promise.all(toRead.map(async (r) => {
      const was = topCache?.get(r.url); if (was && (was.blocks || !was.headings) /* RR-363: a read from before blocks is read again */ && (Date.parse(now) - Date.parse(was.on ?? 0)) / 864e5 <= KEEP_SEARCH_DAYS) { topsReused++; return was.headings ? { url: r.url, rank: r.rank ?? null, official: r.official, title: r.title, headings: was.headings, blocks: was.blocks, text: "" } : null; }
      /* the same page wanted by two pages side by side is read once */
      /* 🔴 RR-366: each top page's blocks through On-Page parsing first, once, kept; a page it cannot read is read as before, politely. Its text is never kept */
      if (parse && !r.official) { if (!reading.has(`p|${r.url}`)) reading.set(`p|${r.url}`, parseTopPage({ url: r.url, title: r.title || null, settings, ledger, login, password, now, ...(fetchImpl ? { fetchImpl } : {}) }).catch(() => ({ ok: false }))); const a = await reading.get(`p|${r.url}`); if (a.stop && !stopped) stopped = a.why; if (a.ok) { topCache?.set(r.url, { on: String(now).slice(0, 10), headings: a.headings, blocks: a.blocks }); return { url: r.url, rank: r.rank ?? null, official: r.official, title: r.title, blocks: a.blocks, headings: a.headings, text: "" }; } }
      if (!reading.has(r.url)) reading.set(r.url, Promise.resolve(readHtml(r.url)).catch(() => null));
      const h = await reading.get(r.url); const blocks = h ? blocksOfHtml(h, { title: r.title || null }) : null; topCache?.set(r.url, { on: String(now).slice(0, 10), headings: h ? headingsOf(h) : null, blocks }); if (!h) return null;
      return { url: r.url, rank: r.rank ?? null, official: r.official, title: r.title, blocks, headings: headingsOf(h), text: String(h).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, " ").slice(0, 20000) };
    }))).filter(Boolean);
    /* RR-359: only the topic's real subtopics (desktop/coverage.mjs), judged with the page's own subject and title; covered by meaning */
    const words = { subject, title: p.title, now, names: COUNTRIES };
    p.coverage = coverageOf(tops, { ...words, paa: main.paa }); p.second = secondSearch({ best: tops[0] ?? null, paa: main.paa, coverage: p.coverage, subject, title: p.title }); p.topRead = tops.map((r) => r.url); p.searchedOn = String(now).slice(0, 10);
    p.blueprint = blueprintOf({ tops: tops.map((x) => ({ url: x.url, rank: x.rank, official: x.official, blocks: x.blocks })), core: coreOf(p.kind) ?? Object.fromEntries((STANDARD[p.category ?? "exam"]?.topic?.[p.topic] ?? []).map((n) => [n, n])) /* a topic page: its standard questions */, category: p.category ?? "general", on: p.searchedOn }); p.unreadTops = results.filter((r) => notForReading(r.url)).length;
  };
  /* in order, at most `concurrency` at a time; a stop is seen by every page not started yet */
  let at = 0; await Promise.all(Array.from({ length: Math.max(1, concurrency) }, async () => { while (at < pages.length) { const p = pages[at++]; await onePage(p); onPage?.(p, "done"); } }));
  const mine = (ledger.spent ?? []).slice(spentBefore), boughtN = mine.filter((x) => x.ok !== false).length, searches = mine.length /* every search sent is in the ledger, refused or not */, cost = mine.reduce((t, x) => t + (Number(x.cost) || 0), 0), retried = mine.filter((x) => x.retry).length, failed = mine.filter((x) => x.ok === false).length;
  const line = `Google's results (your DataForSEO account): ${searches} search${searches === 1 ? "" : "es"}, $${cost.toFixed(4)} — ${pagesRead} of ${pages.length} pages read what ranks, "People also ask", related searches, Reddit and Quora as Google shows them.${retried ? ` ${retried} tried again after DataForSEO failed; ${failed} failed search${failed === 1 ? "" : "es"} charged nothing.` : ""}${stopped ? (laterWhy(stopped) === CAP_LATER ? ` ${CAP_LATER}` : ` Stopped: ${stopped}`) : notes.length ? ` Not read for ${notes.length}: ${notes[0]}` : ""}`;
  return { searches, cost, retried, failed, read: pagesRead, of: pages.length, reddit, quora, stopped, notes, line, reused, bought: boughtN, topsReused };
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
