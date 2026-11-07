/**
 * 🔴 RR-389 PART 4 · THE FREE COLLECTORS THAT WERE STILL MISSING (RR-388's coverage table, 7 Nov 2026). Each one: twice a day with the PC off
 * (tools/bundle-site.mjs MC_CRONS), inside the ONE $2 a day of every collector (they cost $0: the shared cap is read before each run and a run
 * that finds it spent does nothing), an off switch, a lock, and its source and date on every row it keeps. Official and open sources only:
 * every address is read only when its own robots.txt allows us; no Google, Bing, Maps or store page is ever read; no captcha is worked round.
 *   · NEWS (item 10, "rules that change"): the official news feeds and pages of the exam owners, regulators, visa offices and Google Search
 *     Central. A new item that speaks of a fee, a date, a score, a rule or a requirement marks every fact we hold from that site as due: the rules
 *     collector (more-collectors.mjs runRules) reads those facts again on their own pages at once, a changed number goes on the changed list, and
 *     the app rebuilds the pages that use it through the gate (the app's own flow). Every new item is kept with its source and date.
 *   · JOBS (AlmiJob, AlmiSalary, AlmiCV): US wages by detailed occupation from the BLS public API (OEWS, US public domain), and the O*NET
 *     occupations (titles and descriptions, CC BY 4.0, credited). Other countries' official statistics only where the licence allows: see
 *     the coverage table for what each still needs.
 *   · LANGUAGES (item 14): the owner's Keyword Planner asked in each product's own languages, in the countries that speak them (Google's own
 *     language codes, read on developers.google.com/google-ads/api/data/codes-formats on 7 Nov 2026). The keyword collector runs these units
 *     with its own pace; Search Console already returns every language our own sites are searched in.
 *   · PLACES, specialties (AlmiHealth): OpenStreetMap's own tag healthcare:speciality is kept with each place (desktop/local-seo.mjs placesOf).
 *     Links only, never medical advice, never Google Maps.
 */
import { randomBytes } from "node:crypto";
import { collectorsCapOf, collectorsSpentToday } from "./collectors-day.mjs";

const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
export const UA = "AlmiVisibility/1.0 (+https://almivisibility.almiworld.com)";
const lockRun = async (kv, name, seconds, fn) => { if (kv) { const [locked] = await kv.run([["SET", `av:${name}:lock`, randomBytes(8).toString("hex"), "NX", "EX", seconds]]); if (locked !== "OK") return { ok: false, why: `Another ${name} run is working: this one did nothing.` }; } try { return await fn(); } finally { if (kv) await kv.run([["DEL", `av:${name}:lock`]]).catch(() => null); } };
const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return null; } };

/* ───────── robots.txt: the group for "*" (or our own name), the longest matching rule wins, Allow wins a tie (RFC 9309) ───────── */
export function robotsAllows(robotsText, url, agent = "AlmiVisibility") {
  let u; try { u = new URL(url); } catch { return false; } const path = `${u.pathname}${u.search}`;
  const groups = []; let cur = null, lastWasAgent = false;
  for (const raw of String(robotsText ?? "").split(/\r?\n/)) { const l = raw.replace(/#.*/, "").trim(); const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(l); if (!m) continue; const k = m[1].toLowerCase(), v = m[2].trim(); if (k === "user-agent") { if (!lastWasAgent || !cur) { cur = { agents: [], rules: [] }; groups.push(cur); } cur.agents.push(v.toLowerCase()); lastWasAgent = true; continue; } lastWasAgent = false; if (!cur) continue; if (k === "allow" || k === "disallow") cur.rules.push({ allow: k === "allow", path: v }); }
  const mine = groups.filter((g) => g.agents.some((a) => a !== "*" && agent.toLowerCase().includes(a))), any = groups.filter((g) => g.agents.includes("*")), rules = (mine.length ? mine : any).flatMap((g) => g.rules).filter((r) => r.path);
  const re = (p) => new RegExp(`^${p.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$|\$$/, "$")}`);
  let best = null; for (const r of rules) { if (!re(r.path).test(path)) continue; if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r; }
  return !best || best.allow;
}
export async function mayRead(url, { fetchImpl = fetch, cache = new Map() } = {}) {
  let o; try { o = new URL(url).origin; } catch { return false; }
  if (!cache.has(o)) { let t = ""; try { const r = await fetchImpl(`${o}/robots.txt`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(15000) }); t = r.ok ? await r.text() : ""; } catch { t = null; } cache.set(o, t); }
  const t = cache.get(o); return t === null ? false /* robots.txt could not be read: wait */ : robotsAllows(t, url);
}

/* ───────── NEWS ───────── */
export const NEWS = Object.freeze({ job: "news", offEnv: "ALMISEO_NEWS_OFF", lockSeconds: 290, perRun: 12, keep: 60 });
/* every address opened and its robots.txt read on 7 Nov 2026 (proof-rr389-feeds); a source that 404s or refuses us is not listed */
export const NEWS_SOURCES = Object.freeze([
  { id: "google-search-central", name: "Google Search Central blog", url: "https://developers.google.com/search/blog/feed.xml", products: ["visibility"] },
  { id: "google-search-status", name: "Google Search Status Dashboard", url: "https://status.search.google.com/en/feed.atom", products: ["visibility"] },
  { id: "ukvi", name: "UK Visas and Immigration (GOV.UK)", url: "https://www.gov.uk/government/organisations/uk-visas-and-immigration.atom", products: ["pathway", "oet", "ielts", "pte", "study", "job"] },
  { id: "nmc", name: "Nursing and Midwifery Council: news", url: "https://www.nmc.org.uk/news/news-and-updates/", products: ["oet", "ielts"] },
  { id: "ahpra", name: "Ahpra: news", url: "https://www.ahpra.gov.au/News.aspx", products: ["oet", "ielts", "pte"] },
  { id: "ielts", name: "IELTS: news and insights", url: "https://ielts.org/news-and-insights", products: ["ielts"] },
  { id: "pte", name: "Pearson PTE: news", url: "https://www.pearsonpte.com/news", products: ["pte"] },
  { id: "ircc", name: "Immigration, Refugees and Citizenship Canada: news", url: "https://www.canada.ca/en/immigration-refugees-citizenship/news.html", products: ["pathway", "celpip", "study", "job"] },
]);
/* an item that may change a fact we show */
export const RULE_WORDS = /\b(?:fees?|prices?|costs?|charges?|scores?|grades?|bands?|dates?|deadlines?|rules?|requirements?|required|eligib\w*|changes?|changing|updated?|new|increase[sd]?|introduc\w*|replac\w*|from \d{1,2} [A-Z][a-z]+|visa|licen[cs]\w*|registration|test|exam|ranking|core update|spam update|indexing)\b/i;
const unXml = (s) => String(s ?? "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
/** an RSS or Atom feed → [{ title, link, date }] */
export function feedItems(xml) {
  const t = String(xml ?? ""), out = [];
  for (const m of t.matchAll(/<item\b[\s\S]*?<\/item>/gi)) { const b = m[0]; out.push({ title: unXml(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(b)?.[1]), link: unXml(/<link\b[^>]*>([\s\S]*?)<\/link>/i.exec(b)?.[1]) || /<guid\b[^>]*>(https?:[^<]+)<\/guid>/i.exec(b)?.[1] || null, date: unXml(/<pubDate>([\s\S]*?)<\/pubDate>|<dc:date>([\s\S]*?)<\/dc:date>/i.exec(b)?.slice(1).find(Boolean)) || null }); }
  for (const m of t.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)) { const b = m[0]; out.push({ title: unXml(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(b)?.[1]), link: /<link\b[^>]*rel="alternate"[^>]*href="([^"]+)"/i.exec(b)?.[1] ?? /<link\b[^>]*href="([^"]+)"/i.exec(b)?.[1] ?? null, date: unXml(/<updated>([\s\S]*?)<\/updated>|<published>([\s\S]*?)<\/published>/i.exec(b)?.slice(1).find(Boolean)) || null }); }
  return out.filter((x) => x.title && x.link).map((x) => ({ ...x, date: Number.isFinite(Date.parse(x.date)) ? new Date(Date.parse(x.date)).toISOString().slice(0, 10) : null }));
}
/** a news page → its own news links: on its own site, under a news-like path, with a headline's length */
export function pageItems(html, pageUrl) {
  let base; try { base = new URL(pageUrl); } catch { return []; } const seen = new Set(), out = [];
  for (const m of String(html ?? "").matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    let u; try { u = new URL(m[1].replace(/&amp;/g, "&"), base); } catch { continue; } const title = unXml(m[2]);
    if (u.hostname !== base.hostname || title.length < 25 || title.length > 220 || seen.has(u.href) || u.href === base.href) continue;
    if (!/news|media|press|article|insight|update|announce|release/i.test(u.pathname) || u.pathname.replace(/\/+$/, "") === base.pathname.replace(/\/+$/, "")) continue;
    seen.add(u.href); out.push({ title, link: u.href, date: null });
  }
  return out.slice(0, 40);
}
export const newsRow = (s, it, { on, ruleChange }) => ({ topic: `news:${s.id}`, key: it.link, kind: "news", day: on, data: { title: it.title, link: it.link, published: it.date, products: s.products, ruleChange, source: { name: s.name, url: s.url, readOn: on } } });
/** the run: each source read once (robots allowing), new items kept; a rule-like item marks its site's facts due → { ok, day, read, items, ruleItems, skipped, why } */
export async function runNews({ seo, cf = null, kv = null, env = process.env, fetchImpl = fetch, now = () => Date.now(), sources = NEWS_SOURCES, robots = new Map() }) {
  const start = now(), at = new Date(start).toISOString(), today = dayOf(start), out = { ok: true, day: today, read: [], items: 0, ruleItems: 0, skipped: [], usd: 0, why: null };
  if (env[NEWS.offEnv] === "1") return { ok: false, day: today, why: `The news collector is switched off (${NEWS.offEnv}).` };
  const spent = await collectorsSpentToday({ seo, cf, kv, today }).catch(() => null); if (spent && spent.total >= collectorsCapOf(env)) return { ok: false, day: today, why: `Every collector together has spent today's $${collectorsCapOf(env)}: this run waits for tomorrow.` };
  return lockRun(kv, "news", NEWS.lockSeconds, async () => {
    const seen = (await seo.setting("news-seen").catch(() => null)) ?? {}, due = (await seo.setting("rules-due-hosts").catch(() => null)) ?? {};
    for (const s of sources.slice(0, NEWS.perRun)) {
      if (!(await mayRead(s.url, { fetchImpl, cache: robots }))) { out.skipped.push({ source: s.id, why: "its robots.txt does not let us read it (or could not be read)" }); continue; }
      let text = null; try { const r = await fetchImpl(s.url, { headers: { "user-agent": UA, accept: "application/rss+xml, application/atom+xml, text/html;q=0.8" }, signal: AbortSignal.timeout(30000) }); text = r.ok ? await r.text() : null; if (!r.ok) out.skipped.push({ source: s.id, why: `answered ${r.status}` }); } catch { out.skipped.push({ source: s.id, why: "did not answer" }); }
      if (text == null) continue;
      const items = /<(?:rss|feed)\b/i.test(text) ? feedItems(text) : pageItems(text, s.url), was = new Set(seen[s.id] ?? []), first = !seen[s.id];
      const fresh = items.filter((it) => !was.has(it.link)), rows = fresh.map((it) => newsRow(s, it, { on: today, ruleChange: !first && RULE_WORDS.test(it.title) }));
      if (rows.length) await seo.putSearches(rows, { at });
      /* the first read only learns what is there: nothing old is called new */
      const ruleRows = rows.filter((r) => r.data.ruleChange); if (ruleRows.length) for (const h of new Set([hostOf(s.url), ...ruleRows.map((r) => hostOf(r.data.link))].filter(Boolean))) due[h] = today;
      seen[s.id] = [...new Set([...items.map((it) => it.link), ...was])].slice(0, NEWS.keep);
      out.read.push({ source: s.id, items: items.length, new: first ? 0 : fresh.length, ruleChange: ruleRows.length }); out.items += first ? 0 : fresh.length; out.ruleItems += ruleRows.length;
    }
    await seo.setSetting("news-seen", seen, { at }); await seo.setSetting("rules-due-hosts", due, { at }); await seo.setSetting("news-last-run", { on: at, ...out }, { at }).catch(() => null);
    return out;
  });
}

/* ───────── JOBS ───────── */
export const JOBS = Object.freeze({ job: "jobs", offEnv: "ALMISEO_JOBS_OFF", lockSeconds: 290, refreshDays: 30, bls: "https://api.bls.gov/publicAPI/v1/timeseries/data/", onet: "https://www.onetcenter.org/dl_files/database/db_31_0_json/occupation_data.json", perCall: 25 });
/* the roles our job, salary and CV pages ask about first (US SOC codes, BLS's own); the owner may add more on /owner (setting jobs-roles) */
export const JOB_ROLES = Object.freeze([["291141", "Registered nurses"], ["291228", "Physicians, all other"], ["291021", "Dentists, general"], ["291051", "Pharmacists"], ["291123", "Physical therapists"], ["292010", "Clinical laboratory technologists and technicians"], ["151252", "Software developers"], ["132011", "Accountants and auditors"], ["172051", "Civil engineers"], ["252031", "Secondary school teachers, except special and career/technical education"], ["131111", "Management analysts"], ["111021", "General and operations managers"]]);
/** OEWS series: national (N, area 0000000), all industries (000000), the occupation, the datatype (04 annual mean wage, 13 annual median wage) */
export const oewsSeries = (soc, type) => `OEUN0000000000000${soc}${type}`;
export const BLS_SOURCE = Object.freeze({ name: "U.S. Bureau of Labor Statistics, Occupational Employment and Wage Statistics (OEWS)", licence: "US public domain", url: "https://www.bls.gov/oes/" });
export const ONET_SOURCE = Object.freeze({ name: "O*NET 31.0 Database, U.S. Department of Labor (O*NET is a trademark of USDOL/ETA)", licence: "CC BY 4.0", url: "https://www.onetcenter.org/database.html" });
/** the BLS answer → rows (one per occupation: mean and median annual wage, the year, the source) */
export function wageRows(j, roles, { on }) {
  const by = new Map((j?.Results?.series ?? []).map((s) => [s.seriesID, (s.data ?? []).find((d) => d.latest === "true") ?? (s.data ?? [])[0] ?? null]));
  return roles.flatMap(([soc, title]) => { const mean = by.get(oewsSeries(soc, "04")), median = by.get(oewsSeries(soc, "13")); const n = (d) => (d && /^\d+$/.test(String(d.value)) ? Number(d.value) : null); if (n(mean) == null && n(median) == null) return []; return [{ topic: "jobs:US", key: `wage|US|${soc}`, kind: "wage", day: on, data: { country: "US", soc, title, meanAnnualUsd: n(mean), medianAnnualUsd: n(median), year: (mean ?? median)?.year ?? null, source: { ...BLS_SOURCE, readOn: on } } }]; });
}
/** O*NET's occupation table (JSON) → rows: title and description per O*NET-SOC code, credited */
export function onetRows(j, { on, max = 2000 }) {
  const cols = (j?.column ?? []).map((c) => c.column_id), rows = Array.isArray(j?.row) ? j.row : Array.isArray(j?.rows) ? j.rows : [];
  return rows.slice(0, max).map((r) => (Array.isArray(r) ? Object.fromEntries(cols.map((c, i) => [c, r[i]])) : r)).filter((r) => r.onetsoc_code && r.title).map((r) => ({ topic: "jobs:onet", key: `onet|${r.onetsoc_code}`, kind: "occupation", day: on, data: { code: r.onetsoc_code, title: r.title, description: r.description ?? null, source: { ...ONET_SOURCE, readOn: on } } }));
}
export async function runJobs({ seo, cf = null, kv = null, env = process.env, fetchImpl = fetch, now = () => Date.now(), robots = new Map() }) {
  const start = now(), at = new Date(start).toISOString(), today = dayOf(start), out = { ok: true, day: today, wages: 0, occupations: 0, usd: 0, why: null };
  if (env[JOBS.offEnv] === "1") return { ok: false, day: today, why: `The jobs collector is switched off (${JOBS.offEnv}).` };
  const spent = await collectorsSpentToday({ seo, cf, kv, today }).catch(() => null); if (spent && spent.total >= collectorsCapOf(env)) return { ok: false, day: today, why: `Every collector together has spent today's $${collectorsCapOf(env)}: this run waits for tomorrow.` };
  return lockRun(kv, "jobs", JOBS.lockSeconds, async () => {
    const last = (await seo.setting("jobs-last-run").catch(() => null)) ?? null; if (last?.complete && (Date.parse(today) - Date.parse(String(last.on).slice(0, 10))) / 864e5 < JOBS.refreshDays) return { ...out, why: `Read on ${String(last.on).slice(0, 10)}: read again after ${JOBS.refreshDays} days.` };
    const roles = (await seo.setting("jobs-roles").catch(() => null))?.roles ?? JOB_ROLES;
    for (let i = 0; i < roles.length; i += Math.floor(JOBS.perCall / 2)) { const part = roles.slice(i, i + Math.floor(JOBS.perCall / 2)); let j = null; try { const r = await fetchImpl(JOBS.bls, { method: "POST", headers: { "content-type": "application/json", "user-agent": UA }, body: JSON.stringify({ seriesid: part.flatMap(([soc]) => [oewsSeries(soc, "04"), oewsSeries(soc, "13")]) }), signal: AbortSignal.timeout(30000) }); j = r.ok ? await r.json().catch(() => null) : null; } catch { j = null; } if (!j || j.status !== "REQUEST_SUCCEEDED") { out.why = "The BLS public API did not answer: read again next run."; break; } const rows = wageRows(j, part, { on: today }); if (rows.length) await seo.putSearches(rows, { at }); out.wages += rows.length; }
    if (await mayRead(JOBS.onet, { fetchImpl, cache: robots })) { let j = null; try { const r = await fetchImpl(JOBS.onet, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(60000) }); j = r.ok ? await r.json().catch(() => null) : null; } catch { j = null; } const rows = j ? onetRows(j, { on: today }) : []; for (let i = 0; i < rows.length; i += 200) await seo.putSearches(rows.slice(i, i + 200), { at }); out.occupations = rows.length; if (!j) out.why = `${out.why ? `${out.why} ` : ""}O*NET's file did not answer: read again next run.`; }
    else out.why = `${out.why ? `${out.why} ` : ""}O*NET's robots.txt does not let us read its file.`;
    await seo.setSetting("jobs-last-run", { on: at, ...out, complete: !out.why }, { at }).catch(() => null); return out;
  });
}

/* ───────── LANGUAGES ───────── */
/* Google's own language codes (developers.google.com/google-ads/api/data/codes-formats, read 7 Nov 2026) */
export const MORE_LANGUAGES = Object.freeze({ ar: { name: "Arabic", constant: "languageConstants/1019" }, ur: { name: "Urdu", constant: "languageConstants/1041" }, hi: { name: "Hindi", constant: "languageConstants/1023" }, bn: { name: "Bengali", constant: "languageConstants/1056" }, fr: { name: "French", constant: "languageConstants/1002" }, de: { name: "German", constant: "languageConstants/1001" }, es: { name: "Spanish", constant: "languageConstants/1003" }, it: { name: "Italian", constant: "languageConstants/1004" }, pt: { name: "Portuguese", constant: "languageConstants/1014" }, ja: { name: "Japanese", constant: "languageConstants/1005" }, ko: { name: "Korean", constant: "languageConstants/1012" }, nl: { name: "Dutch", constant: "languageConstants/1010" }, da: { name: "Danish", constant: "languageConstants/1009" }, no: { name: "Norwegian", constant: "languageConstants/1013" }, sv: { name: "Swedish", constant: "languageConstants/1015" }, is: { name: "Icelandic", constant: "languageConstants/1026" } });
/* where each language is asked: the countries of the plan that speak it */
export const LANGUAGE_PLACES = Object.freeze({ ar: ["AE", "SA", "QA"], ur: ["PK"], hi: ["IN"], bn: ["BD"], fr: ["CA"], es: ["US"], de: [], it: [], pt: [], ja: [], ko: [], nl: [], da: [], no: [], sv: [], is: [] });
/* a product's own languages: its learners' languages, and for a language product the language it teaches (asked where the plan has a country for it) */
export const PRODUCT_LANGUAGES = Object.freeze({ oet: ["ur", "hi", "ar"], ielts: ["ur", "hi", "ar", "bn"], pte: ["ur", "hi", "ar"], celpip: ["hi", "ur", "fr"], toefl: ["hi", "ar"], det: ["hi", "ar"], cv: ["ur", "hi", "ar"], job: ["ur", "hi", "ar"], salary: ["ur", "hi", "ar"], study: ["ur", "hi", "ar", "bn"], halal: ["ar", "ur"], health: ["ur", "hi", "ar"], pathway: ["ur", "hi", "ar"], visibility: ["es", "fr"] });
/** the keyword collector's extra units: one per product × language × country (the product's own seeds), its language named */
export function languageUnits(groups, { languages = MORE_LANGUAGES, places = LANGUAGE_PLACES, byProduct = PRODUCT_LANGUAGES, locations = [], seedKeyOf = (s) => s.join("|") } = {}) {
  const out = [];
  for (const g of groups) { if (g.kind !== "product") continue; for (const lang of byProduct[g.key] ?? []) for (const code of places[lang] ?? []) { const loc = locations.find((l) => l.code === code); if (!loc || !languages[lang]) continue; out.push(Object.freeze({ id: `${g.id}|${loc.code}|${lang}`, group: g.id, kind: g.kind, cadence: "monthly", refreshDays: 30, product: g.key, country: loc.name, seeds: Object.freeze([...g.seeds]), location: loc.code, geo: loc.geo, language: lang, seedKey: seedKeyOf([...g.seeds]) })); } }
  return out;
}
