/**
 * RR-324 C · THE DATAFORSEO CONNECTOR — Google Ads search volume and keyword ideas bought pay-as-you-go, READY BUT OFF.
 *   · The owner is asking DataForSEO in writing whether their data may be shown to our customers: it stays OFF, with the line "waiting for
 *     the provider's written permission", until the owner turns it on (the permission ticked AND the switch on — both his).
 *   · Its key (login and API password) is stored like the other keys: Windows' Credential Manager (secrets.mjs), by name only.
 *   · A SPENDING CAP per day and per month the client sets; the running total is kept and shown; a purchase that could pass a cap is
 *     refused BEFORE it is sent (counted at the highest price a task can cost); the price DataForSEO reports afterwards is what is added.
 *   · A CACHE: a keyword already bought (for that location and language) is never bought again.
 *   · The request and the answer follow DataForSEO's documented shape (docs.dataforseo.com/v3/keywords_data/google_ads/search_volume/live,
 *     …/keywords_for_keywords/live: one task per call, up to 1,000 keywords for volume, 20 seeds for ideas, status_code 20000 = ok).
 *     Results go into the keyword database marked "DataForSEO", shown as Google's RANGE. Tests use the documented answers only.
 */
import { SOURCES } from "./keyword-db.mjs";

export const DFS = Object.freeze({ base: "https://api.dataforseo.com/v3/keywords_data/google_ads", volume: "/search_volume/live", ideas: "/keywords_for_keywords/live", maxVolume: 1000, maxSeeds: 20 });
export const DFS_KEYS = Object.freeze({ login: "DATAFORSEO_LOGIN", password: "DATAFORSEO_PASSWORD" });
/** the prices the owner was quoted (USD): volume about $0.06–0.09 per 1,000 keywords; ideas about $0.13 per 1,000 — a cap counts the high end */
export const PRICES = Object.freeze({ volumePerTask: 0.09, ideasPerTask: 0.13 });
export const WAITING = "Switched off — waiting for the provider's written permission.";

const dayOf = (now) => new Date(now).toISOString().slice(0, 10), monthOf = (now) => dayOf(now).slice(0, 7);
const cacheKey = (k, loc, lang) => `${String(k).toLowerCase().replace(/\s+/g, " ").trim()}|${loc ?? "-"}|${lang ?? "-"}`;
export const emptyLedger = () => ({ spent: [], cache: {} });

/** what the client set → the plain state of the connector */
export function dfsStatus(settings = {}, ledger = emptyLedger(), { keySaved = false, now = Date.now() } = {}) {
  const day = spentIn(ledger, dayOf(now)), month = spentIn(ledger, monthOf(now));
  const caps = { day: Number(settings.capDay) || 0, month: Number(settings.capMonth) || 0 };
  const why = !settings.permission ? WAITING : !settings.on ? "Switched off." : !keySaved ? "On, but no key saved — add your DataForSEO login and API password." : !(caps.day > 0 && caps.month > 0) ? "On, but no spending cap set — set a cap per day and per month first." : null;
  return { on: !why, permission: Boolean(settings.permission), line: why ?? `On — ${usd(day)} of ${usd(caps.day)} today, ${usd(month)} of ${usd(caps.month)} this month.`,
    spent: { day, month }, caps, cached: Object.keys(ledger.cache ?? {}).length };
}
export const usd = (n) => `$${(Math.round(n * 10000) / 10000).toFixed(n && n < 0.1 ? 4 : 2)}`;
export const spentIn = (ledger, prefix) => (ledger?.spent ?? []).filter((s) => String(s.on).startsWith(prefix)).reduce((t, s) => t + (Number(s.cost) || 0), 0);

/**
 * PLAN a volume purchase: which keywords are already bought (cache), which would be bought, how many tasks, the most it can cost, and
 * whether a cap refuses it — nothing is sent. keywords: [text]; location / language: DataForSEO's codes.
 */
export function planVolume(keywords, { location = null, language = null, settings = {}, ledger = emptyLedger(), now = Date.now() } = {}) {
  const seen = new Set(), buy = [], cached = [];
  for (const k of keywords) { const c = cacheKey(k, location, language); if (seen.has(c)) continue; seen.add(c); (ledger.cache?.[c] ? cached : buy).push(String(k).toLowerCase().trim()); }
  const tasks = Math.ceil(buy.length / DFS.maxVolume), most = tasks * (Number(settings.priceVolume) || PRICES.volumePerTask);
  return { buy, cached, tasks, most, ...capCheck(most, settings, ledger, now) };
}
export function capCheck(most, settings, ledger, now) {
  const day = spentIn(ledger, dayOf(now)), month = spentIn(ledger, monthOf(now)), capD = Number(settings.capDay) || 0, capM = Number(settings.capMonth) || 0;
  if (!(capD > 0 && capM > 0)) return { allowed: false, why: "No spending cap set — nothing is bought." };
  if (day + most > capD) return { allowed: false, why: `Refused: it could cost up to ${usd(most)} — today's cap ${usd(capD)} has ${usd(Math.max(0, capD - day))} left.` };
  if (month + most > capM) return { allowed: false, why: `Refused: it could cost up to ${usd(most)} — this month's cap ${usd(capM)} has ${usd(Math.max(0, capM - month))} left.` };
  return { allowed: true, why: null };
}

/** DataForSEO's documented answer → { ok, cost, rows, why } (a task's own status_code 20000 = ok) */
export function rowsOfAnswer(answer) {
  if (answer?.status_code !== 20000) return { ok: false, cost: Number(answer?.cost) || 0, rows: [], why: `DataForSEO refused (${answer?.status_code ?? "no answer"}: ${answer?.status_message ?? ""}).` };
  const tasks = answer.tasks ?? [], bad = tasks.find((t) => t.status_code !== 20000);
  const rows = tasks.filter((t) => t.status_code === 20000).flatMap((t) => (t.result ?? []).filter((r) => r?.keyword).map((r) => {
    const ms = Object.fromEntries((r.monthly_searches ?? []).filter((x) => x.year && x.month).map((x) => [`${x.year}-${String(x.month).padStart(2, "0")}`, Number(x.search_volume ?? 0)]));
    return { text: r.keyword, said: r.search_volume ?? null, months: Object.keys(ms).length ? ms : null, competition: r.competition ? r.competition[0] + r.competition.slice(1).toLowerCase() : null, change3m: null, yoy: null, location: r.location_code ?? null, language: r.language_code ?? null };
  }));
  return { ok: !bad, cost: Number(answer.cost) || tasks.reduce((t, x) => t + (Number(x.cost) || 0), 0), rows, why: bad ? `DataForSEO refused a task (${bad.status_code}: ${bad.status_message}).` : null };
}

/**
 * the connection. keys = secrets.keyStore; settings = { permission, on, capDay, capMonth, priceVolume? }; ledger = { spent, cache } (the
 * caller keeps it); fetchImpl handed in. Every call is refused while the connector is off, before anything is sent.
 */
export function dataForSeo({ keys, settings = {}, ledger = emptyLedger(), save = () => {}, fetchImpl = (u, i) => fetch(u, { ...i, signal: AbortSignal.timeout(30000) }), now = () => Date.now(), base = DFS.base }) {
  const keySaved = () => Boolean(keys.get(DFS_KEYS.login) && keys.get(DFS_KEYS.password));
  const status = () => dfsStatus(settings, ledger, { keySaved: keySaved(), now: now() });
  const auth = () => `Basic ${Buffer.from(`${keys.get(DFS_KEYS.login)}:${keys.get(DFS_KEYS.password)}`).toString("base64")}`;
  const post = async (path, task) => { const r = await fetchImpl(`${base}${path}`, { method: "POST", headers: { authorization: auth(), "content-type": "application/json" }, body: JSON.stringify([task]) }); return r.json().catch(() => ({ status_code: r.status })); };
  return Object.freeze({
    status,
    /** volume for keywords: the cache first, then the rest, each task within the caps → { ok, rows, bought, cached, cost, why } */
    async volume(keywords, { location = null, language = null } = {}) {
      const st = status(); if (!st.on) return { ok: false, off: true, why: `${st.line} Nothing was bought.` };
      const p = planVolume(keywords, { location, language, settings, ledger, now: now() }); if (!p.allowed) return { ok: false, why: p.why, cached: p.cached.length };
      const rows = [], fromCache = p.cached.map((k) => ledger.cache[cacheKey(k, location, language)]); let cost = 0;
      for (let i = 0; i < p.buy.length; i += DFS.maxVolume) {
        const part = p.buy.slice(i, i + DFS.maxVolume), out = rowsOfAnswer(await post(DFS.volume, { keywords: part, ...(location ? { location_code: location } : {}), ...(language ? { language_code: language } : {}) }));
        cost += out.cost; ledger.spent.push({ on: new Date(now()).toISOString(), cost: out.cost, what: `volume of ${part.length} keywords` });
        for (const r of out.rows) ledger.cache[cacheKey(r.text, location, language)] = { ...r, boughtOn: dayOf(now()) };
        rows.push(...out.rows); save(ledger); if (!out.ok) return { ok: false, why: out.why, rows: [...fromCache, ...rows], cost };
      }
      return { ok: true, rows: [...fromCache, ...rows], bought: p.buy.length, cached: p.cached.length, cost, source: SOURCES.dataforseo };
    },
    /** keyword ideas for up to 20 seeds (one task) → { ok, rows, cost } — counted against the caps at the ideas price */
    async ideas(seeds, { location = null, language = null } = {}) {
      const st = status(); if (!st.on) return { ok: false, off: true, why: `${st.line} Nothing was bought.` };
      const most = Number(settings.priceIdeas) || PRICES.ideasPerTask, c = capCheck(most, settings, ledger, now()); if (!c.allowed) return { ok: false, why: c.why };
      const out = rowsOfAnswer(await post(DFS.ideas, { keywords: seeds.slice(0, DFS.maxSeeds), ...(location ? { location_code: location } : {}), ...(language ? { language_code: language } : {}) }));
      ledger.spent.push({ on: new Date(now()).toISOString(), cost: out.cost, what: `ideas for ${Math.min(seeds.length, DFS.maxSeeds)} seeds` });
      for (const r of out.rows) ledger.cache[cacheKey(r.text, location, language)] ??= { ...r, boughtOn: dayOf(now()) };
      save(ledger); return { ok: out.ok, rows: out.rows, cost: out.cost, why: out.why, source: SOURCES.dataforseo };
    },
  });
}
