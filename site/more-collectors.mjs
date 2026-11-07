/**
 * 🔴 RR-380 items 2–4 + 6 (owner, 6 Nov 2026: "collectors for everything") · THREE NEW COLLECTOR JOBS on the AlmiSEO Data server, each on the
 * research collector's pattern (an off switch, a lock, a cap read before each paid call, its own spend line, its last run kept):
 *   · PLACES: businesses, professionals and places by city for the local directories (AlmiHalal: halal food, mosques; AlmiHealth: doctors,
 *     hospitals, clinics, dentists; AlmiArchitect: architects), from OpenStreetMap (open data, ODbL, named with its date). Links only.
 *     A public register's status (PMDC, an architects' council) is never guessed: it stays "not checked" until a register gives open data.
 *   · RULES THAT CHANGE: every saved fee, date and rule (the country facts and the saved answers), each with its next recheck day (fees and
 *     dates monthly, rules every 3 months, Q&A LAW 7). Due ones are read again on their own source page (free: our own reader); a number that
 *     is gone marks the fact "changed", and the pages that use it "needs rebuild" (the app's own list). A page that would not open is no change.
 *   · TRENDS: rising topics and questions per product and country from our own keyword store over time (free), our own Search Console rows,
 *     and DataForSEO Trends only inside the DataForSEO caps; a monthly "what is rising" part for the Research report.
 *   · DATA QUALITY: every row carries its source and date; duplicates are merged by key; one fact, one value (the newest checked value wins and
 *     the older one is kept as "was").
 * Official APIs and lawful open data only: no Google, Bing, Maps or store page is read.
 */
import { randomBytes } from "node:crypto";
import { DIRECTORY_KINDS, overpassQuery, placesOf } from "../desktop/local-seo.mjs";
import { recheck, RECHECK_DAYS } from "../desktop/freshness.mjs";
import { numbersOf } from "../desktop/country-facts.mjs";
import { PRODUCT_DATA, RECHECK } from "./product-data.mjs";

const dayOf = (t) => new Date(t).toISOString().slice(0, 10), daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
const lockRun = async (kv, name, id, seconds, fn) => { if (kv) { const [locked] = await kv.run([["SET", `av:${name}:lock`, id, "NX", "EX", seconds]]); if (locked !== "OK") return { ok: false, why: `Another ${name} run is working: this one did nothing.` }; } try { return await fn(); } finally { if (kv) await kv.run([["GET", `av:${name}:lock`]]).then(async ([v]) => { if (v === id) await kv.run([["DEL", `av:${name}:lock`]]); }).catch(() => null); } };

/* ───────── PLACES ───────── */
export const PLACES = Object.freeze({ job: "places", offEnv: "ALMISEO_PLACES_OFF", lockSeconds: 290, perRun: 6, refreshDays: 90, overpass: "https://overpass-api.de/api/interpreter", userAgent: "AlmiVisibility/1.0 (+https://almivisibility.almiworld.com)" });
/** which kinds each directory lists */
export const DIRECTORIES = Object.freeze({ halal: ["mosque", "halal"], health: ["doctor", "hospital", "clinic", "dentist"], architect: ["architect"] });
/** the first cities (the owner's first countries' largest cities); the owner may add more on /owner (setting places-cities) */
export const PLACE_CITIES = Object.freeze(["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Peshawar", "London", "Birmingham", "Manchester", "Leeds", "Bradford", "Glasgow", "Dubai", "Abu Dhabi", "Riyadh", "Jeddah", "Doha", "Toronto", "New York", "Sydney", "Melbourne", "Dhaka", "Delhi", "Mumbai", "Lagos", "Nairobi", "Cairo", "Kuala Lumpur", "Singapore", "Dublin"]);
/** one row per place, merged by its OpenStreetMap id (one place, one row; the newest read wins) */
export const placeRow = (p, { kind, city, product, on }) => ({ topic: `places:${product}`, key: `${kind}|${city}|${p.osm}`, kind: "place", day: on, data: { ...p, kind, city, product, register: null /* never guessed */, source: { name: "OpenStreetMap contributors (ODbL)", url: p.osm, licence: "https://www.openstreetmap.org/copyright", checked: on } } });
export async function runPlaces({ seo, kv = null, env = process.env, fetchImpl = fetch, now = () => Date.now(), cities = null, pace = (ms) => new Promise((r) => setTimeout(r, ms)), paceMs = 2000 }) {
  const start = now(), at = new Date(start).toISOString(), today = dayOf(start), out = { ok: true, day: today, read: [], places: 0, usd: 0, why: null };
  if (env[PLACES.offEnv] === "1") return { ok: false, day: today, why: `The places collector is switched off (${PLACES.offEnv}).` };
  return lockRun(kv, "places", randomBytes(8).toString("hex"), PLACES.lockSeconds, async () => {
    const list = cities ?? (await seo.setting("places-cities").catch(() => null))?.cities ?? PLACE_CITIES, done = (await seo.setting("places-done").catch(() => null)) ?? {}; let runs = 0;
    for (const [product, kinds] of Object.entries(DIRECTORIES)) for (const city of list) for (const kind of kinds) {
      if (runs >= PLACES.perRun) break; const k = `${product}|${kind}|${city}`; if (done[k] && daysBetween(done[k], today) < PLACES.refreshDays) continue;
      runs++; let j = null; try { const r = await fetchImpl(PLACES.overpass, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": PLACES.userAgent }, body: `data=${encodeURIComponent(overpassQuery(kind, city))}`, signal: AbortSignal.timeout(90000) }); j = r.ok ? await r.json().catch(() => null) : null; } catch { j = null; }
      if (!j) { out.why = "OpenStreetMap's public server did not answer: tried again next run."; break; }
      const rows = placesOf(j).map((p) => placeRow(p, { kind, city, product, on: today })); if (rows.length) await seo.putSearches(rows, { at });
      done[k] = today; out.read.push({ product, kind, city, places: rows.length }); out.places += rows.length; await pace(paceMs);
    }
    await seo.setSetting("places-done", done, { at }); await seo.setSetting("places-last-run", { on: at, ...out }, { at }).catch(() => null); return out;
  });
}

/* ───────── RULES THAT CHANGE ───────── */
export const RULES = Object.freeze({ job: "rules", offEnv: "ALMISEO_RULES_OFF", lockSeconds: 290, perRun: 40 });
/** a country fact's class: a fee or a date monthly, a rule every 3 months, the rest every 6 */
export const factClass = (f) => (/fee|price|cost/.test(`${f.part} ${f.kind}`) ? "money" : /date/.test(`${f.part} ${f.kind}`) ? "date" : /rule|council|regulat|score|format/.test(`${f.part} ${f.kind}`) ? "rule" : "other");
export const factDue = (f, today, checked = {}) => { const from = checked[f.key] ?? f.readOn; if (!from) return true; return daysBetween(String(from).slice(0, 10), today) >= RECHECK[factClass(f)]; };
/** what a fact says, as text whose numbers can be looked for on its page */
/* 🔴 RR-380 proof (real, 6 Nov): 6 of 6 fees were called "changed" because our own currency estimate ("≈ PHP 25,957 … rate 44.22") was looked for on the exam owner's page. Only what the SOURCE says is checked: a fee's official price */
const factText = (f) => { const v = f.value; if (v == null) return ""; if (typeof v !== "object") return String(v); if (/fee|price|cost/.test(`${f.part} ${f.kind}`)) return String(v.official ?? (v.local ? "" : v.amount ?? "")); return [v.score, v.text].filter((x) => x != null).join(" "); };
/** the register: every fee, date and rule held, with its next check day → [{ key, product?, country, part, cls, readOn, due, source, changed }] */
export function rulesRegister(facts, today, { checked = {}, changed = {} } = {}) {
  return (facts ?? []).filter((f) => f.sourceUrl && f.status !== "rejected").map((f) => { const cls = factClass(f), from = String(checked[f.key] ?? f.readOn ?? "").slice(0, 10); return { key: f.key, country: f.country, part: f.part, cls, readOn: from || null, next: from ? new Date(Date.parse(`${from}T00:00:00Z`) + RECHECK[cls] * 864e5).toISOString().slice(0, 10) : today, due: factDue(f, today, checked), source: f.sourceUrl, changed: changed[f.key] ?? null }; });
}
export async function runRules({ seo, cf, kv = null, env = process.env, reader, now = () => Date.now(), limit = RULES.perRun }) {
  const start = now(), at = new Date(start).toISOString(), today = dayOf(start), out = { ok: true, day: today, checked: 0, changed: 0, unread: 0, due: 0, why: null };
  if (env[RULES.offEnv] === "1") return { ok: false, day: today, why: `The rules collector is switched off (${RULES.offEnv}).` };
  return lockRun(kv, "rules", randomBytes(8).toString("hex"), RULES.lockSeconds, async () => {
    /* the day each fact was last read again, and what changed, are the collector's own (the country-facts store keeps the fact itself) */
    const changed = (await seo.setting("rules-changed").catch(() => null)) ?? { rows: {} }, checked = (await seo.setting("rules-checked").catch(() => null)) ?? {};
    const facts = await cf.facts(), reg = rulesRegister(facts, today, { checked, changed: changed.rows }), due = reg.filter((r) => r.due && !r.changed); out.due = due.length;
    const order = { money: 0, date: 1, rule: 2, other: 3 };
    for (const r of due.sort((a, b) => order[a.cls] - order[b.cls]).slice(0, limit)) {
      const f = facts.find((x) => x.key === r.key), text = factText(f); if (!numbersOf(text).length) continue; /* a fact with no number is rechecked by the country-facts collector itself */
      out.checked++; const page = await Promise.resolve(reader.read(f.sourceUrl)).catch(() => null), c = recheck({ ok: true, answer: text }, page);
      if (c.state === "unread") { out.unread++; continue; }
      if (c.state === "changed") { out.changed++; changed.rows[f.key] = { country: f.country, part: f.part, cls: r.cls, why: c.why, on: today, source: f.sourceUrl, was: text.slice(0, 200) }; }
      checked[f.key] = today;
    }
    await seo.setSetting("rules-changed", changed, { at }); await seo.setSetting("rules-checked", checked, { at }); await seo.setSetting("rules-last-run", { on: at, ...out }, { at }).catch(() => null); return out;
  });
}

/* ───────── TRENDS ───────── */
export const TRENDS = Object.freeze({ job: "trends", offEnv: "ALMISEO_TRENDS_OFF", rise: 0.3, minVolume: 50, top: 15 });
/** a keyword's monthly volumes { "YYYY-MM": n } → the last 3 months against the 3 before → { change, recent, before } (null when too little) */
export function riseOf(months) {
  const keys = Object.keys(months ?? {}).sort(); if (keys.length < 6) return null; const last = keys.slice(-6), sum = (ks) => ks.reduce((t, k) => t + (Number(months[k]) || 0), 0), before = sum(last.slice(0, 3)), recent = sum(last.slice(3));
  /* RR-380 proof: "+6250%" from a near-empty start says nothing: under 10 a month before, a search is "new" */
  if (before / 3 < 10) return recent > 0 ? { change: Infinity, recent, before } : null; return { change: (recent - before) / before, recent, before };
}
/** rows [{ text, months, country, product, source }] → the rising ones, biggest first; each with its source and the months it stands on */
export function risingOf(rows, { rise = TRENDS.rise, minVolume = TRENDS.minVolume, top = TRENDS.top } = {}) {
  const seen = new Map();
  for (const r of rows ?? []) { const x = riseOf(r.months); if (!x || x.change < rise || x.recent / 3 < minVolume) continue; const k = `${String(r.text).toLowerCase()}|${r.country ?? "*"}|${r.product ?? "*"}`; const was = seen.get(k); if (!was || was.change < x.change) seen.set(k, { text: r.text, country: r.country ?? null, product: r.product ?? null, change: x.change, perMonth: Math.round(x.recent / 3), months: Object.keys(r.months).sort().slice(-6), source: r.source }); }
  return [...seen.values()].sort((a, b) => b.change - a.change || b.perMonth - a.perMonth).slice(0, top);
}
/** Search Console rows of two windows (query, clicks, impressions) → questions and searches rising on our own sites */
export function risingOwn(now, before, { minImpressions = 20, rise = TRENDS.rise } = {}) {
  const b = new Map((before ?? []).map((r) => [String(r.query).toLowerCase(), r.impressions]));
  return (now ?? []).filter((r) => r.impressions >= minImpressions).map((r) => ({ text: r.query, was: b.get(String(r.query).toLowerCase()) ?? 0, now: r.impressions })).filter((r) => r.was === 0 ? r.now >= minImpressions * 2 : (r.now - r.was) / r.was >= rise).sort((a, b) => b.now - b.was - (a.now - a.was)).slice(0, TRENDS.top);
}
export async function runTrends({ seo, kw, env = process.env, now = () => Date.now(), products = PRODUCT_DATA.map((p) => p.key) }) {
  const start = now(), at = new Date(start).toISOString(), today = dayOf(start), month = today.slice(0, 7);
  if (env[TRENDS.offEnv] === "1") return { ok: false, day: today, why: `The trends collector is switched off (${TRENDS.offEnv}).` };
  const held = await seo.setting(`trends:${month}`).catch(() => null); if (held?.on) return { ok: true, day: today, why: "This month's trends are already read.", kept: true };
  const out = { on: today, month, products: {} };
  for (const p of products) { const rows = (await kw.monthly?.([`product:${p}`]).catch(() => [])) ?? []; const r = risingOf(rows.map((x) => ({ ...x, country: x.location === "ALL" ? null : x.location, product: p, source: "AlmiWorld's keyword store (Google Ads Keyword Planner, 12 months)" }))); if (r.length) out.products[p] = r; }
  /* our own sites: Bing's own query rows (the answers collector keeps them per product), kept once a month, this month against the last */
  const prevMonth = new Date(Date.parse(`${month}-15T00:00:00Z`) - 30 * 864e5).toISOString().slice(0, 7); out.ownSites = [];
  for (const p of products) { const b = await seo.setting(`bing-queries:${p}`).catch(() => null); if (!b?.rows?.length) continue; await seo.setSetting(`trends-own:${p}:${month}`, { on: today, rows: b.rows.map((r) => ({ query: r.query, impressions: r.impressions })) }, { at }); const was = await seo.setting(`trends-own:${p}:${prevMonth}`).catch(() => null); if (was?.rows) out.ownSites.push(...risingOwn(b.rows, was.rows).map((r) => ({ ...r, product: p, source: "Bing Webmaster (our own site)" }))); }
  await seo.setSetting(`trends:${month}`, out, { at }); await seo.setSetting("trends-last-run", { on: at, products: Object.keys(out.products).length }, { at }).catch(() => null);
  return { ok: true, day: today, products: Object.keys(out.products).length };
}
/** the monthly part of the Research report: short, bad news first (nothing rising is said too) */
export function risingNote(t, names = Object.fromEntries(PRODUCT_DATA.map((p) => [p.key, p.name]))) {
  if (!t) return ["## What is rising", "- Not read yet this month."].join("\n");
  const lines = ["## What is rising (" + t.month + ")"], ps = Object.entries(t.products ?? {});
  if (!ps.length && !t.ownSites?.length) lines.push("- Nothing rose by 30% or more in the last 3 months against the 3 before.");
  for (const [p, rows] of ps) lines.push(`- ${names[p] ?? p}: ${rows.slice(0, 5).map((r) => `"${r.text}"${r.country ? ` (${r.country})` : ""} ${r.change === Infinity ? "new" : `+${Math.round(r.change * 100)}%`}, about ${r.perMonth} a month`).join("; ")}. Source: ${rows[0].source ?? "our keyword store"}.`);
  if (t.ownSites?.length) lines.push(`- Our own sites (Bing Webmaster): ${t.ownSites.slice(0, 5).map((r) => `"${r.text}" ${r.was} → ${r.now} views`).join("; ")}.`);
  return lines.join("\n");
}

/* ───────── GENERAL MARKET DATA (RR-380 item 5; the owner's 25 Oct ruling) ───────── */
/** the seed list's categories and YouTube niches as slow topics for the top-pages collector: each seed one search, AFTER AlmiWorld's own
 *  products, inside the same $1 a day and $50 in total. Their keywords already come from the keyword collector (category:, youtube:) */
export const GENERAL_OFF = "ALMISEO_GENERAL_OFF";
export const generalTopics = (groups = []) => groups.filter((g) => g.kind === "category" || g.kind === "youtube").map((g) => ({ id: `g-${g.kind}-${g.key}`, name: g.name ?? g.key, subject: g.name ?? g.key, words: [...(g.seeds ?? [])].slice(0, 3), seeds: [...(g.seeds ?? [])], intents: [...(g.seeds ?? [])].slice(0, 12), plainIntents: true, countries: [], languages: ["en"], jobs: ["top-pages"], owner: "general", paused: false }));

/* ───────── DATA QUALITY (one fact, one value) ───────── */
/** rows of one kind (any collector) → merged by key: the newest checked value wins; a different older value is kept as "was"; a row with no
 *  source or no date is refused (Q&A LAW 3: every answer shows its source and the date we checked it) */
export function mergeFacts(rows) {
  const by = new Map(), refused = [];
  for (const r of rows ?? []) { const on = r.checked ?? r.on ?? r.readOn, src = r.source?.url ?? r.sourceUrl ?? r.url; if (!src || !on) { refused.push({ key: r.key, why: !src ? "no source" : "no date" }); continue; }
    const had = by.get(r.key); if (!had) { by.set(r.key, { ...r }); continue; } const newer = String(on) >= String(had.checked ?? had.on ?? had.readOn), [win, lose] = newer ? [r, had] : [had, r];
    const differs = JSON.stringify(win.value ?? win.answer) !== JSON.stringify(lose.value ?? lose.answer); by.set(r.key, { ...win, ...(differs ? { was: { value: lose.value ?? lose.answer, on: lose.checked ?? lose.on ?? lose.readOn, source: lose.source?.url ?? lose.sourceUrl ?? lose.url } } : {}) }); }
  return { rows: [...by.values()], refused };
}

/* ───────── THE COLLECTOR PAGE (per product: what is collected, how fresh, what is missing, money) ───────── */
export const COLLECTOR_JOBS = Object.freeze(["keywords", "facts", "answers", "top-pages", "research", "places", "rules", "trends", /* RR-382 */ "lists"]);
export async function collectorsStatus({ seo, cf = null, today, counts = {}, caps = {} }) {
  const month = today.slice(0, 7), spend = (await seo.spendSince?.(`${month}-01`).catch(() => [])) ?? [], money = (job) => ({ today: spend.filter((x) => x.job === job && x.day === today).reduce((t, x) => t + (Number(x.usd) || 0), 0), month: spend.filter((x) => x.job === job).reduce((t, x) => t + (Number(x.usd) || 0), 0), cap: caps[job] ?? null });
  const last = Object.fromEntries(await Promise.all(["places", "rules", "trends", "research", "answers", "lists"].map(async (j) => [j, (await seo.setting(`${j}-last-run`).catch(() => null))?.on ?? null])));
  const products = PRODUCT_DATA.map((p) => { const c = counts[p.key] ?? {}; return { key: p.key, name: p.name, data: p.data.map((item) => { const n = c[item.job] ?? null; const state = !item.built ? "not built yet" : n == null ? "not counted" : n > 0 ? "collected" : "missing"; return { what: item.what, job: item.job, every: `${item.recheckDays} days`, state, rows: n ?? 0 }; }) }; });
  /* the country facts' and answers' AI money is the "AI (the collectors)" line the app already shows (answers status); places, rules and trends are free */
  return { on: today, last, money: Object.fromEntries(["top-pages", "research", "places", "rules", "trends"].map((j) => [j, money(j)])), products };
}

/* 🔴 RR-387 PART C · D6 WHOIS / DOMAIN AGE: RDAP, the registries' own protocol (free, official): the IANA bootstrap file names the RDAP server of
 * each top-level domain; each domain is asked once in 180 days, at most 20 a run, paced. The domains are the ones our collectors already hold
 * (the top results of every topic). Kept as a "whois" record with its source and date; nothing is guessed when a registry gives no date. */
export const WHOIS = Object.freeze({ job: "whois", offEnv: "ALMISEO_WHOIS_OFF", lockSeconds: 290, perRun: 20, refreshDays: 180, bootstrap: "https://data.iana.org/rdap/dns.json", userAgent: "AlmiVisibility/1.0 (+https://almivisibility.almiworld.com)" });
const TWO_PART = /\.(?:co|com|org|net|ac|gov|edu|nic|or|ne|go)\.[a-z]{2}$/i;
export const registrable = (host) => { const h = String(host ?? "").toLowerCase().replace(/^www\./, "").replace(/\.$/, ""); if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(h)) return null; const p = h.split("."); return p.slice(TWO_PART.test(h) ? -3 : -2).join("."); };
export const rdapBase = (boot, domain) => { const tld = String(domain).split(".").pop(); for (const [tlds, urls] of boot?.services ?? []) if (tlds.includes(tld)) return (urls.find((u) => u.startsWith("https://")) ?? urls[0]).replace(/\/?$/, "/"); return null; };
export function whoisRow(domain, j, { on, url }) {
  const ev = (a) => (j?.events ?? []).find((e) => e.eventAction === a)?.eventDate ?? null, reg = ev("registration"), exp = ev("expiration");
  const registrar = (j?.entities ?? []).find((e) => (e.roles ?? []).includes("registrar"));
  const name = registrar?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] ?? registrar?.handle ?? null;
  const years = reg ? Math.floor((Date.parse(on) - Date.parse(reg)) / (365.25 * 864e5)) : null;
  return { topic: "whois", key: domain, kind: "whois", day: on, data: { domain, registered: reg ? reg.slice(0, 10) : null, expires: exp ? exp.slice(0, 10) : null, ageYears: years, registrar: name ? String(name).slice(0, 120) : null, status: (j?.status ?? []).slice(0, 6), source: { name: "RDAP — the registry's own record", url, on } } };
}
export async function runWhois({ seo, kv = null, env = process.env, fetchImpl = fetch, now = () => Date.now(), domains = null, pace = (ms) => new Promise((r) => setTimeout(r, ms)), paceMs = 1000 }) {
  const start = now(), at = new Date(start).toISOString(), today = dayOf(start), out = { ok: true, day: today, read: 0, kept: 0, usd: 0, why: null };
  if (env[WHOIS.offEnv] === "1") return { ok: false, day: today, why: `The whois collector is switched off (${WHOIS.offEnv}).` };
  return lockRun(kv, "whois", randomBytes(8).toString("hex"), WHOIS.lockSeconds, async () => {
    let list = domains; if (!list) { const hosts = new Set(); for (const t of await seo.topics().catch(() => [])) for (const l of await seo.lists(t.id).catch(() => [])) for (const r of l.results ?? []) { try { hosts.add(new URL(r.url ?? r).hostname); } catch { /* not an address */ } } list = [...hosts]; }
    const doms = [...new Set(list.map(registrable).filter(Boolean))], done = (await seo.setting("whois-done").catch(() => null)) ?? {};
    const todo = doms.filter((d) => !done[d] || daysBetween(done[d], today) >= WHOIS.refreshDays).slice(0, WHOIS.perRun); if (!todo.length) return out;
    const boot = await fetchImpl(WHOIS.bootstrap, { headers: { "user-agent": WHOIS.userAgent }, signal: AbortSignal.timeout(30000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!boot) return { ...out, ok: false, why: "The IANA RDAP list did not answer: tried again next run." };
    const rows = [];
    for (const d of todo) { const base = rdapBase(boot, d); if (!base) { done[d] = today; continue; } const url = `${base}domain/${d}`; out.read++;
      const j = await fetchImpl(url, { headers: { accept: "application/rdap+json", "user-agent": WHOIS.userAgent }, signal: AbortSignal.timeout(30000) }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (j) { rows.push(whoisRow(d, j, { on: today, url })); done[d] = today; } await pace(paceMs); }
    if (rows.length) await seo.putSearches(rows, { at }); out.kept = rows.length;
    await seo.setSetting("whois-done", done, { at }); await seo.setSetting("whois-last-run", { on: at, ...out }, { at }).catch(() => null); return out;
  });
}
