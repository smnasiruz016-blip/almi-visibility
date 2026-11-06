/**
 * 🔴 RR-382 item 1d (owner, 6 Nov 2026) · THE DATA LISTS THAT WERE "NOT BUILT YET" (collectors plan section 12), one collector job ("lists")
 * on the research collector's pattern: an off switch (ALMISEO_LISTS_OFF), a lock, a few units per run, each unit refreshed on its own clock.
 *   · AlmiJob: job titles and their essential skills by role, from ESCO (the European Commission's open classification; EU-wide, not per country).
 *   · AlmiSalary: average hourly earnings by occupation group and country (ILOSTAT, the ILO's official statistics, local currency, latest year);
 *     the price level per country (World Bank: PPP conversion factor ÷ exchange rate). No official open source gives cost of living by CITY:
 *     that stays "not built" and is said, never filled from a private index.
 *   · AlmiStudy: universities per country with website, founding year and founders (Wikidata, CC0); tuition per university only where an
 *     official open source exists (the US Department of Education's College Scorecard, with the free api.data.gov key the owner adds).
 *   · AlmiHalal: prayer times by city with the calculation method that gives them (AlAdhan API); the places themselves are the places collector.
 * Every row carries its source name, link and the day it was read (Q&A LAW 3). Free: no paid route. Pure parts are exported for the tests.
 */
import { randomBytes } from "node:crypto";
import { PLACE_CITIES } from "./more-collectors.mjs";

export const LISTS = Object.freeze({ job: "lists", offEnv: "ALMISEO_LISTS_OFF", keyEnv: "DATA_GOV_API_KEY", lockSeconds: 290, perRun: 8, refreshDays: { roles: 180, salaries: 180, prices: 180, universities: 180, fees: 90, prayer: 30 }, userAgent: "AlmiVisibility/1.0 (+https://almivisibility.almiworld.com)" });
export const ROLES = Object.freeze(["nurse", "doctor", "pharmacist", "dentist", "physiotherapist", "software developer", "data analyst", "accountant", "civil engineer", "mechanical engineer", "electrician", "plumber", "teacher", "chef", "truck driver", "carer", "architect", "sales manager", "marketing manager", "customer service representative"]);
/** ISO 3166 alpha-3 for ILOSTAT and the World Bank; alpha-2 and Wikidata's country item for the study lists */
export const COUNTRIES = Object.freeze([["PAK", "PK", "Q843", "Pakistan"], ["GBR", "GB", "Q145", "United Kingdom"], ["USA", "US", "Q30", "United States"], ["CAN", "CA", "Q16", "Canada"], ["AUS", "AU", "Q408", "Australia"], ["IRL", "IE", "Q27", "Ireland"], ["NZL", "NZ", "Q664", "New Zealand"], ["DEU", "DE", "Q183", "Germany"], ["ARE", "AE", "Q878", "United Arab Emirates"], ["SAU", "SA", "Q851", "Saudi Arabia"], ["QAT", "QA", "Q846", "Qatar"], ["IND", "IN", "Q668", "India"], ["BGD", "BD", "Q902", "Bangladesh"], ["MYS", "MY", "Q833", "Malaysia"], ["NGA", "NG", "Q1033", "Nigeria"], ["PHL", "PH", "Q928", "Philippines"]].map(([iso3, iso2, qid, name]) => Object.freeze({ iso3, iso2, qid, name })));
/** ILOSTAT's ISCO-08 major groups */
export const ISCO = Object.freeze({ OCU_ISCO08_1: "Managers", OCU_ISCO08_2: "Professionals", OCU_ISCO08_3: "Technicians and associate professionals", OCU_ISCO08_4: "Clerical support workers", OCU_ISCO08_5: "Service and sales workers", OCU_ISCO08_6: "Skilled agricultural, forestry and fishery workers", OCU_ISCO08_7: "Craft and related trades workers", OCU_ISCO08_8: "Plant and machine operators and assemblers", OCU_ISCO08_9: "Elementary occupations" });
export const URLS = Object.freeze({
  escoSearch: (role) => `https://ec.europa.eu/esco/api/search?text=${encodeURIComponent(role)}&type=occupation&language=en&limit=1`,
  escoOccupation: (uri) => `https://ec.europa.eu/esco/api/resource/occupation?uri=${encodeURIComponent(uri)}&language=en`,
  ilo: (iso3) => `https://rplumber.ilo.org/data/indicator/?id=EAR_EHRA_SEX_OCU_NB_A&ref_area=${iso3}&sex=SEX_T&timefrom=2018&format=.csv`,
  wb: (iso3s, ind) => `https://api.worldbank.org/v2/country/${iso3s.join(";")}/indicator/${ind}?format=json&mrnev=1&per_page=500`,
  wikidata: "https://query.wikidata.org/sparql",
  scorecard: (key, page) => `https://api.data.gov/ed/collegescorecard/v1/schools?api_key=${encodeURIComponent(key)}&school.degrees_awarded.predominant=3&fields=id,school.name,school.school_url,latest.cost.tuition.in_state,latest.cost.tuition.out_of_state&per_page=100&page=${page}&sort=latest.student.size:desc`,
  aladhan: (city, iso2) => `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=${encodeURIComponent(iso2)}`,
});
const clean = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const src = (name, url, on, licence = null) => ({ name, url, checked: on, ...(licence ? { licence } : {}) });

/* ── pure readers of each documented answer ── */
/** ESCO search + occupation resource → { title, uri, isco, skills } */
export function escoRole(role, search, occ) {
  const hit = search?._embedded?.results?.[0]; if (!hit) return null;
  const skills = (occ?._links?.hasEssentialSkill ?? []).map((s) => clean(s.title)).filter(Boolean).slice(0, 25);
  return { role, title: clean(hit.title ?? occ?.title), uri: hit.uri, isco: clean(occ?.code ?? "") || null, skills, description: clean(occ?.description?.en?.literal ?? "").slice(0, 400) || null };
}
/** ILOSTAT CSV (ref_area, source, indicator, sex, classif1, time, obs_value, …) → the latest year's hourly earnings per ISCO major group */
export function iloEarnings(csv) {
  const lines = String(csv ?? "").replace(/^﻿/, "").split(/\r?\n/).filter(Boolean); if (lines.length < 2) return null;
  const head = lines[0].split(",").map((h) => h.replace(/"/g, "")), at = (k) => head.indexOf(k), rows = lines.slice(1).map((l) => l.split(",").map((c) => c.replace(/"/g, "")));
  const groups = rows.filter((r) => ISCO[r[at("classif1")]] && r[at("obs_value")] !== "");
  if (!groups.length) return null; const year = groups.map((r) => r[at("time")]).sort().pop();
  return { year, groups: groups.filter((r) => r[at("time")] === year).map((r) => ({ group: ISCO[r[at("classif1")]], hourly: Number(r[at("obs_value")]) })).sort((a, b) => b.hourly - a.hourly) };
}
/** World Bank answers for PPP (LCU per international $) and the exchange rate (LCU per US$) → price level vs the US (US = 1.00) */
export function priceLevels(pppJ, fxJ) {
  const by = (j) => new Map(((Array.isArray(j) ? j[1] : null) ?? []).filter((x) => x?.value != null).map((x) => [x.countryiso3code, { value: Number(x.value), year: x.date }]));
  const p = by(pppJ), f = by(fxJ), out = [];
  for (const [iso3, v] of p) { const fx = f.get(iso3); if (fx && fx.value > 0) out.push({ iso3, level: Math.round((v.value / fx.value) * 100) / 100, pppYear: v.year, fxYear: fx.year }); }
  return out;
}
export const universitiesQuery = (qid, limit = 150) => `SELECT ?u ?uLabel ?site ?inception (GROUP_CONCAT(DISTINCT ?fLabel; separator="; ") AS ?founders) WHERE { ?u wdt:P31/wdt:P279* wd:Q3918; wdt:P17 wd:${qid}; wdt:P856 ?site. OPTIONAL { ?u wdt:P571 ?inception. } OPTIONAL { ?u wdt:P112 ?f. ?f rdfs:label ?fLabel. FILTER(LANG(?fLabel) = "en") } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } GROUP BY ?u ?uLabel ?site ?inception LIMIT ${limit}`;
/** Wikidata's SPARQL JSON → universities (one per item; a label that is only the Q-id is dropped) */
export const universitiesOf = (j) => { const seen = new Map(); for (const b of j?.results?.bindings ?? []) { const id = b.u?.value?.split("/").pop(), name = clean(b.uLabel?.value); if (!id || !name || /^Q\d+$/.test(name) || seen.has(id)) continue; seen.set(id, { qid: id, name, website: b.site?.value ?? null, founded: b.inception?.value ? (/^\+?(\d{3,4})-/.exec(b.inception.value)?.[1] ?? null) : null, founders: clean(b.founders?.value) || null }); } return [...seen.values()]; };
/** College Scorecard (documented fields) → tuition rows */
export const scorecardRows = (j) => (j?.results ?? []).map((r) => ({ id: String(r.id), name: clean(r["school.name"]), website: r["school.school_url"] ?? null, tuitionInState: r["latest.cost.tuition.in_state"] ?? null, tuitionOutOfState: r["latest.cost.tuition.out_of_state"] ?? null })).filter((r) => r.name && (r.tuitionInState != null || r.tuitionOutOfState != null));
/** AlAdhan's timingsByCity answer → the day's times and the method that calculates them */
export const prayerOf = (j) => (j?.code === 200 && j.data?.timings ? { date: j.data.date?.gregorian?.date ?? j.data.date?.readable ?? null, times: Object.fromEntries(["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"].map((k) => [k, String(j.data.timings[k] ?? "").slice(0, 5)])), method: clean(j.data.meta?.method?.name) || null, school: clean(j.data.meta?.school) || null, timezone: j.data.meta?.timezone ?? null } : null);

/** the work units, in order; each one is a single read (or two) of an open service */
export function units({ hasScorecardKey = false, cities = [] } = {}) {
  return [
    ...ROLES.map((r) => ({ kind: "roles", key: `role|${r}`, role: r })),
    ...COUNTRIES.map((c) => ({ kind: "salaries", key: `salary|${c.iso3}`, country: c })),
    { kind: "prices", key: "prices|all" },
    ...COUNTRIES.map((c) => ({ kind: "universities", key: `uni|${c.iso2}`, country: c })),
    ...(hasScorecardKey ? [1, 2, 3].map((page) => ({ kind: "fees", key: `fees|us|${page}`, page })) : []),
    ...cities.map(([city, iso2]) => ({ kind: "prayer", key: `prayer|${city}`, city, iso2 })),
  ];
}
const TOPIC = { roles: "lists:jobs", salaries: "lists:salary", prices: "lists:salary", universities: "lists:study", fees: "lists:study", prayer: "lists:halal" };

/** one run: the next due units, each read once, every row with its source and date */
export async function runLists({ seo, kv = null, env = process.env, fetchImpl = fetch, now = () => Date.now(), cities = null, perRun = LISTS.perRun, pace = (ms) => new Promise((r) => setTimeout(r, ms)), paceMs = 1500 }) {
  const start = now(), at = new Date(start).toISOString(), today = at.slice(0, 10), out = { ok: true, day: today, read: [], rows: 0, failed: [], why: null, parked: env[LISTS.keyEnv] ? null : `University fees (US College Scorecard) wait for the free api.data.gov key (${LISTS.keyEnv}).` };
  if (env[LISTS.offEnv] === "1") return { ok: false, day: today, why: `The lists collector is switched off (${LISTS.offEnv}).` };
  const id = randomBytes(8).toString("hex");
  if (kv) { const [locked] = await kv.run([["SET", "av:lists:lock", id, "NX", "EX", LISTS.lockSeconds]]); if (locked !== "OK") return { ok: false, day: today, why: "Another lists run is working: this one did nothing." }; }
  const get = async (url, { json = true, init = {} } = {}) => { try { const r = await fetchImpl(url, { ...init, headers: { "user-agent": LISTS.userAgent, accept: json ? "application/json" : "text/csv", ...(init.headers ?? {}) }, signal: AbortSignal.timeout(60000) }); if (!r.ok) return { status: r.status }; return { body: json ? await r.json().catch(() => null) : await r.text() }; } catch { return { status: 0 }; } };
  try {
    const done = (await seo.setting("lists-done").catch(() => null)) ?? {}, cityList = cities ?? ((await seo.setting("places-cities").catch(() => null))?.cities ?? PLACE_CITIES).map((c) => [c, CITY_COUNTRY[c] ?? null]).filter(([, cc]) => cc);
    const due = units({ hasScorecardKey: Boolean(env[LISTS.keyEnv]), cities: cityList }).filter((u) => !done[u.key] || (Date.parse(today) - Date.parse(done[u.key])) / 864e5 >= LISTS.refreshDays[u.kind]).slice(0, perRun);
    for (const u of due) {
      let rows = [], noData = false;
      if (u.kind === "roles") { const s = await get(URLS.escoSearch(u.role)), uri = s.body?._embedded?.results?.[0]?.uri, o = uri ? await get(URLS.escoOccupation(uri)) : {}, r = s.body ? escoRole(u.role, s.body, o.body) : null; if (r) rows = [{ key: u.key, data: { ...r, source: src("ESCO, European Commission (EU-wide classification)", r.uri, today, "https://esco.ec.europa.eu/en/about-esco/data-science-and-esco/legal-notice") } }]; }
      else if (u.kind === "salaries") { const c = await get(URLS.ilo(u.country.iso3), { json: false }), e = c.body ? iloEarnings(c.body) : null; noData = Boolean(c.body) && !e; /* RR-382 proof: ILOSTAT holds no earnings by occupation for CAN, AUS, NZL, ARE, SAU, QAT: said, rechecked on the unit's own clock, never retried each run */ if (e) rows = [{ key: u.key, data: { country: u.country.name, iso3: u.country.iso3, year: e.year, unit: "average hourly earnings of employees, local currency", groups: e.groups, source: src("ILOSTAT, International Labour Organization (EAR_EHRA_SEX_OCU_NB)", `https://rplumber.ilo.org/data/indicator/?id=EAR_EHRA_SEX_OCU_NB_A&ref_area=${u.country.iso3}`, today) } }]; }
      else if (u.kind === "prices") { const iso = COUNTRIES.map((c) => c.iso3), p = await get(URLS.wb(iso, "PA.NUS.PRVT.PP")), f = await get(URLS.wb(iso, "PA.NUS.FCRF")); rows = priceLevels(p.body, f.body).map((x) => ({ key: `price|${x.iso3}`, data: { ...x, country: COUNTRIES.find((c) => c.iso3 === x.iso3)?.name, meaning: "price level of household consumption against the United States (1.00), country average", source: src("World Bank: PA.NUS.PRVT.PP ÷ PA.NUS.FCRF", "https://data.worldbank.org/indicator/PA.NUS.PRVT.PP", today, "CC BY 4.0") } })); }
      else if (u.kind === "universities") { const j = await get(`${URLS.wikidata}?format=json&query=${encodeURIComponent(universitiesQuery(u.country.qid))}`, { init: { headers: { accept: "application/sparql-results+json" } } }); rows = universitiesOf(j.body).map((x) => ({ key: `uni|${x.qid}`, data: { ...x, country: u.country.name, source: src("Wikidata (CC0)", `https://www.wikidata.org/wiki/${x.qid}`, today, "CC0") } })); }
      else if (u.kind === "fees") { const j = await get(URLS.scorecard(env[LISTS.keyEnv], u.page)); rows = scorecardRows(j.body).map((x) => ({ key: `fees|us|${x.id}`, data: { ...x, currency: "USD", year: "latest", source: src("College Scorecard, US Department of Education", "https://collegescorecard.ed.gov/data/", today) } })); }
      else if (u.kind === "prayer") { const j = await get(URLS.aladhan(u.city, u.iso2)), p = prayerOf(j.body); if (p) rows = [{ key: u.key, data: { city: u.city, country: u.iso2, ...p, note: "Calculated times; the local mosque or authority may announce different ones.", source: src(`AlAdhan API (Islamic Network), method: ${p.method ?? "default"}`, URLS.aladhan(u.city, u.iso2), today) } }]; }
      if (noData) { (out.none ??= []).push(u.key); done[u.key] = today; continue; }
      if (!rows.length) { out.failed.push(u.key); continue; } /* nothing read is nothing kept: tried again next run */
      await seo.putSearches(rows.map((r) => ({ topic: TOPIC[u.kind], key: r.key, kind: `list-${u.kind}`, day: today, data: r.data })), { at });
      done[u.key] = today; out.read.push({ unit: u.key, rows: rows.length }); out.rows += rows.length; await pace(paceMs);
    }
    if (out.failed.length && !out.read.length) out.why = "No open service answered this run: tried again next run.";
    await seo.setSetting("lists-done", done, { at }); await seo.setSetting("lists-last-run", { on: at, ...out }, { at }).catch(() => null); return out;
  } finally { if (kv) await kv.run([["GET", "av:lists:lock"]]).then(async ([v]) => { if (v === id) await kv.run([["DEL", "av:lists:lock"]]); }).catch(() => null); }
}
/** the places collector's cities with their country (AlAdhan wants the country) */
export const CITY_COUNTRY = Object.freeze({ Karachi: "PK", Lahore: "PK", Islamabad: "PK", Rawalpindi: "PK", Faisalabad: "PK", Peshawar: "PK", London: "GB", Birmingham: "GB", Manchester: "GB", Leeds: "GB", Bradford: "GB", Glasgow: "GB", Dubai: "AE", "Abu Dhabi": "AE", Riyadh: "SA", Jeddah: "SA", Doha: "QA", Toronto: "CA", "New York": "US", Sydney: "AU", Melbourne: "AU", Dhaka: "BD", Delhi: "IN", Mumbai: "IN", Lagos: "NG", Nairobi: "KE", Cairo: "EG", "Kuala Lumpur": "MY", Singapore: "SG", Dublin: "IE" });
