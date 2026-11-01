/**
 * RR-326 E · THE APP'S KEYWORD DATA FROM ALMIWORLD'S OWN KEYWORD SERVICE (almivisibility.almiworld.com/v1/keywords) — keyword ideas and
 * Google's search volumes (Google Ads Keyword Planner data), with NO Google Ads account and NO Google sign-in for the client: the service
 * checks the client's licence (the app's own signed licence, or the owner's), counts the plan's monthly searches, and answers from AlmiWorld's
 * keyword database — asking Google once for a search it does not hold yet. The client's own Google Ads sign-in (google-ads.mjs) stays an
 * OPTIONAL extra, off by default. Nothing secret is sent: a licence is a signed statement of a plan, not a key.
 */
import { PLAN_LOCATIONS } from "../site/kw-seeds.mjs";
import { isOwnerLicence } from "./licence.mjs";

export const SERVICE_URL = "https://almivisibility.almiworld.com/";
export const LICENCE_HEADER = "x-almivisibility-licence";
export const SERVICE_LOCATIONS = PLAN_LOCATIONS; // RR-329: the collector covers every country; a page plan still asks these 19
/** the licence as the service reads it: the owner's avo_ text, or avl_ + the signed licence */
export const licenceHeaderOf = (signed) => `${isOwnerLicence(signed?.licence) ? "avo" : "avl"}_${Buffer.from(JSON.stringify(signed)).toString("base64url")}`;

/** the plain line about this month's searches */
export const usageLine = (u) => (u ? (u.limit === null || u.limit === undefined ? `Keyword searches this month: ${u.used.toLocaleString("en-US")} — no limit (owner).` : `Keyword searches this month: ${u.used.toLocaleString("en-US")} of ${u.limit.toLocaleString("en-US")}.`) : null);

/* RR-327 · the lines the app shows: the service on (and what is left this month), the source of every number, and the plain fallback */
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const periodSay = (p) => { const m = /^(\d{4})-(\d{2})-\d{2}\.\.(\d{4})-(\d{2})-\d{2}$/.exec(String(p ?? "")); return m ? `${MON[Number(m[2]) - 1]} ${m[1]} – ${MON[Number(m[4]) - 1]} ${m[3]}` : null; };
export const sourceLine = (period) => `Google Ads Keyword Planner, average monthly searches${periodSay(period) ? `, ${periodSay(period)}` : ""}`;
export const serviceOnLine = (u) => `AlmiWorld keyword service: on — ${!u ? "searches left this month: not known yet" : u.limit === null || u.limit === undefined ? "no monthly limit (owner)" : `${Math.max(0, u.limit - u.used).toLocaleString("en-US")} searches left this month`}`;
export const SERVICE_OFF_LINE = "AlmiWorld keyword service: not reachable just now — the plan uses your own data (your files and Search Console); no number is invented.";
/** the per-country searches the plan asks for: all locations first, then each country — at most this many in one count */
export const PLAN_REUSE_DAYS = 30;

/**
 * RR-327 · the plan's searches: `service` = keywordService(…) (null = no plan), `store` = the product's ONE keyword database
 * (keyword-db.mjs localKeywordStore), `merge` = keyword-db's mergeObservations, `source` = its SOURCES.service. The subject for all locations,
 * then per country; a location asked within PLAN_REUSE_DAYS is not asked again. → { on, asked, reused, line, source, why? }
 */
/*
 * 🔴 RR-359 (owner's run: the product "almiworld youtube" made OET pages — its subject had been guessed as "OET", and AlmiWorld's keyword
 * service was asked for OET into ITS keyword database). Each answer is kept under the subject it was asked for (in its name: AlmiWorld
 * keyword service — "OET", …); a product reads only the answers for its OWN subject — another subject's are set aside, never deleted.
 */
export const askedSubjectOf = (file) => file?.subject ?? /^AlmiWorld keyword service — "([^"]+)"/.exec(file?.name ?? "")?.[1] ?? null;
export function ownDb(db, subject) {
  const mine = String(subject ?? "").trim().toLowerCase();
  const foreign = new Set(Object.entries(db?.files ?? {}).filter(([, x]) => { const a = askedSubjectOf(x); return a != null && String(a).trim().toLowerCase() !== mine; }).map(([k]) => k));
  if (!foreign.size) return db;
  const keywords = {};
  for (const [k, kw] of Object.entries(db.keywords ?? {})) { const files = (kw.files ?? []).filter((x) => !foreign.has(x)); if (files.length || !(kw.files ?? []).length) keywords[k] = { ...kw, files }; }
  return { ...db, keywords, files: Object.fromEntries(Object.entries(db.files).filter(([k]) => !foreign.has(k))), setAside: { files: foreign.size, keywords: Object.keys(db.keywords ?? {}).length - Object.keys(keywords).length, subjects: [...new Set([...foreign].map((k) => askedSubjectOf(db.files[k])))] } };
}
export async function collectForPlan({ service, store, merge, fileIdOf, source, subject, today = new Date().toISOString().slice(0, 10) }) {
  if (!service) return { on: false, asked: 0, reused: 0, line: "AlmiWorld keyword service: add your plan (Your plan) to use it — until then the plan uses your own data; no number is invented." };
  let db = store.load();
  const isPlan = (f) => f.source === source && /^AlmiWorld keyword service — "/.test(f.name ?? "") && String(askedSubjectOf(f)).toLowerCase() === String(subject).toLowerCase(); // RR-359: the SAME subject's answers only
  const fresh = Object.values(db.files ?? {}).filter((f) => isPlan(f) && (Date.parse(today) - Date.parse(f.on)) / 864e5 <= PLAN_REUSE_DAYS);
  const skip = SERVICE_LOCATIONS.filter((l) => fresh.some((f) => f.location === l.name)).map((l) => l.code);
  const out = await service.forPlan({ seeds: [String(subject).toLowerCase()], skip });
  if (!out.ok) return { on: false, asked: 0, reused: skip.length, line: out.line, why: out.why };
  for (const r of out.results) { const m = merge(db, { id: `svc-plan-${fileIdOf(JSON.stringify([r.location, r.period, r.rows]))}`, name: `AlmiWorld keyword service — "${subject}", ${r.locationName}`, on: today, source, period: r.period, location: r.locationName }, r.rows); if (!m.alreadyRead) db = m.db; }
  if (out.results.length) store.save(db);
  const usage = out.usage ?? (await service.usage().catch(() => null));
  /* every location still fresh, and the service does not answer now: said so — the figures it gave within PLAN_REUSE_DAYS are what the plan uses */
  if (!out.asked && usage?.ok === false) return { on: false, asked: 0, reused: skip.length, line: `AlmiWorld keyword service: not reachable just now — the plan uses the figures it gave within ${PLAN_REUSE_DAYS} days and your own data; no number is invented.`, why: usage.why, source: sourceLine(fresh.find((f) => f.period)?.period ?? null) };
  const period = out.period ?? fresh.find((f) => f.period)?.period ?? null;
  return { on: true, asked: out.asked, reused: skip.length, line: `${serviceOnLine(usage?.ok === false ? null : usage)}${out.stopped ? ` (stopped after ${out.asked} searches: ${out.stopped})` : ""}`, source: sourceLine(period) };
}

/**
 * RR-328 C · the plan's country facts: asked of the service once a day (`cache` = the product folder's country-facts.json: { on, countries });
 * the service unreachable → the last answer it gave, said so. → { on, countries: { name: packet }, line, from }
 */
export const CF_REUSE_DAYS = 1;
export async function countryFactsForPlan({ service, cache, countries, today = new Date().toISOString().slice(0, 10) }) {
  const old = cache.load(), fresh = old?.on && (Date.parse(today) - Date.parse(old.on)) / 864e5 < CF_REUSE_DAYS && countries.every((c) => old.countries?.[c]);
  if (fresh) return { on: true, countries: old.countries, line: `AlmiWorld country facts: from today's answer (${old.on})`, from: "cache" };
  const r = service ? await service.countryFacts({ countries }) : { ok: false, why: "Add your plan (Your plan) to use AlmiWorld's country facts." };
  if (r.ok) { cache.save({ on: today, countries: r.countries }); return { on: true, countries: r.countries, line: `AlmiWorld country facts: ${Object.values(r.countries).filter((x) => x.complete).length} of ${countries.length} countries have all five parts`, from: "service" }; }
  if (old?.countries) return { on: false, countries: old.countries, line: `AlmiWorld country facts: not reachable just now (${r.why}) — the answer of ${old.on} is used`, from: "old" };
  return { on: false, countries: {}, line: `AlmiWorld country facts: not reachable (${r.why}) — no country page can show all five parts without them`, from: "none" };
}

/** signed: the licence the app runs under (or null). fetchImpl handed in (tests: the service's own handler on 127.0.0.1) */
export function keywordService({ siteUrl = SERVICE_URL, signed = null, fetchImpl = fetch } = {}) {
  const call = async (path, init = {}) => {
    if (!signed) return { ok: false, why: "Add your plan first (Your plan) — the keyword service checks it." };
    let r, j;
    try { r = await fetchImpl(new URL(path, siteUrl), { ...init, headers: { ...(init.headers ?? {}), [LICENCE_HEADER]: licenceHeaderOf(signed) }, signal: AbortSignal.timeout(30000) }); j = await r.json().catch(() => ({})); }
    catch { return { ok: false, why: "The keyword service did not answer — check the internet connection and try again." }; }
    return r.ok && j.ok ? j : { ok: false, why: j.why ?? `The keyword service answered ${r.status}.`, usage: j.usage ?? null };
  };
  /** → { ok, rows (the keyword database's shape), period, location, usage } */
  const search = async ({ seeds, location = "ALL" }) => {
    const j = await call("v1/keywords", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ seeds, location }) });
    if (!j.ok) return j;
    return { ok: true, location: j.location, locationName: j.locationName, period: j.period, fromDatabase: j.fromDatabase, usage: j.usage,
      rows: (j.rows ?? []).map((x) => ({ text: x.keyword, said: x.volume, months: x.months ?? null, competition: null, change3m: null, yoy: null })) };
  };
  return Object.freeze({
    usage: () => call("v1/keywords/usage"),
    search,
    /** RR-328 C · AlmiWorld's country facts for these countries (only facts read on their own official pages — never an unconfirmed one) */
    countryFacts: ({ countries = [] } = {}) => call(`v1/countries/facts${countries.length ? `?countries=${encodeURIComponent(countries.join(","))}` : ""}`),
    /** RR-348 c · AlmiWorld's creator data for a niche on YouTube, TikTok or Instagram → { ok, niche, data } (data null when there is none) */
    creators: ({ platform, niche, country = "" }) => call(`v1/creators?platform=${encodeURIComponent(platform)}&niche=${encodeURIComponent(niche)}${country ? `&country=${encodeURIComponent(country)}` : ""}`),
    /**
     * RR-327 · the plan's keyword data: the seeds once for ALL locations, then once per country (`skip` = locations whose service figures are
     * still fresh — never asked again within PLAN_REUSE_DAYS). Stops at the first refusal that is not about one country (no plan, unreachable,
     * the month used). → { ok, results: [{ location, locationName, period, rows }], usage, asked, line, source } | { ok: false, why, results }
     */
    async forPlan({ seeds, locations = SERVICE_LOCATIONS.map((l) => l.code), skip = [] }) {
      const results = []; let usage = null, period = null, stopped = null;
      for (const code of locations.filter((c) => !skip.includes(c))) {
        const r = await search({ seeds, location: code });
        if (!r.ok) { if (results.length) { stopped = r.why; usage = r.usage ?? usage; break; } return { ok: false, why: r.why, usage: r.usage ?? null, results, line: SERVICE_OFF_LINE }; }
        results.push({ location: code, locationName: SERVICE_LOCATIONS.find((l) => l.code === code)?.name ?? r.locationName ?? code, /* our own name for the location asked: the reuse check reads it */ period: r.period, rows: r.rows }); usage = r.usage ?? usage; period ??= r.period;
      }
      return { ok: true, results, usage, asked: results.length, period, stopped, line: `${serviceOnLine(usage)}${stopped ? ` (stopped after ${results.length} searches: ${stopped})` : ""}`, source: sourceLine(period) };
    },
  });
}
