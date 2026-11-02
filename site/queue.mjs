/**
 * 🔴 RR-329 A · THE PRIORITY QUEUE — ONE order for both collectors (keywords and Country Facts), the owner's (26 Oct 2026, rule R4):
 *   · PRODUCTS: AlmiOET → AlmiCV → AlmiJob, AlmiStudy, AlmiSalary → the test products (IELTS, PTE, TOEFL, DET, CELPIP) → the language
 *     products → (keywords only) AlmiVisibility, then the general categories and YouTube niches;
 *   · COUNTRIES, for every product: his first 15, his next 15, then every other country (AlmiWorld's list, A–Z);
 *   · a product's FIRST 30 countries are finished before the next product starts; its other countries go on in the background (low
 *     priority: one task in BACKGROUND_EVERY);
 *   · "finished" for the queue = each part of that country was TRIED once (a council still searched for every day — rule R1 — is background
 *     work, so one body nobody can find never stops the products after it);
 *   · the owner may move a product or a country up on /owner/queue (kept in the store, merged with this default: a new product or country
 *     always appears, an unknown one is dropped).
 * Pure: no store, no network.
 */
import { COUNTRIES } from "../desktop/world.mjs";

export const FIRST_15 = Object.freeze(["India", "Philippines", "Pakistan", "Nigeria", "Kenya", "Egypt", "Bangladesh", "Nepal", "Ghana", "Zimbabwe", "Sri Lanka", "United Arab Emirates", "Saudi Arabia", "United Kingdom", "Ireland"]);
export const NEXT_15 = Object.freeze(["Australia", "New Zealand", "Canada", "United States", "Qatar", "Kuwait", "Oman", "Singapore", "Malaysia", "Uganda", "Tanzania", "South Africa", "Jordan", "Sudan", "Iran"]);
export const FRONT = 30;
export const BACKGROUND_EVERY = 4;
export const QUEUE_COUNTRIES = Object.freeze([...FIRST_15, ...NEXT_15, ...COUNTRIES.filter((c) => !FIRST_15.includes(c) && !NEXT_15.includes(c))]);
/* the products by the keys of the keyword seed list (site/kw-seeds.mjs product:<key>); tier = the owner's numbering */
export const QUEUE_PRODUCTS = Object.freeze([
  /* RR-333 D (owner, 27 Oct): AlmiVisibility SECOND, right after AlmiOET — it needs its own pages at launch */
  /* RR-362 item 8 (owner, 2 Nov): AlmiOET → AlmiVisibility → AlmiWorld → AlmiCV → AlmiJob → AlmiSalary → then the rest */
  ["oet", 1], ["visibility", 1], ["almiworld", 1], ["cv", 2], ["jobs", 3], ["salary", 3], ["study", 3], ["prep", 4], ["pte", 4], ["toefl", 4], ["det", 4], ["celpip", 4],
  ["french", 5], ["goethe", 5], ["spanish", 5], ["italian", 5], ["portuguese", 5], ["dutch", 5], ["japanese", 5], ["korean", 5], ["danish", 5], ["norwegian", 5], ["swedish", 5], ["icelandic", 5], ["swiss", 5],
].map(([key, tier]) => Object.freeze({ key, tier })));
export const DEFAULT_QUEUE = Object.freeze({ products: Object.freeze(QUEUE_PRODUCTS.map((p) => p.key)), countries: QUEUE_COUNTRIES });

/** the owner's saved order merged with the default: his order first, every product/country he has not placed after it in the default order */
export function queueOf(saved = null) {
  const merge = (mine, all) => { const m = (Array.isArray(mine) ? mine : []).filter((x, i, xs) => all.includes(x) && xs.indexOf(x) === i); return Object.freeze([...m, ...all.filter((x) => !m.includes(x))]); };
  return Object.freeze({ products: merge(saved?.products, DEFAULT_QUEUE.products), countries: merge(saved?.countries, DEFAULT_QUEUE.countries) });
}
/** one place up (the first stays first) → a new list */
export function moveUp(list, item) { const i = list.indexOf(item); if (i <= 0) return [...list]; const l = [...list]; [l[i - 1], l[i]] = [l[i], l[i - 1]]; return l; }

/**
 * The order of work. `units`: [{ product, country, background? }] — what is still to do (a unit finished and not yet due is not here).
 * → the units in queue order, product by product: each product's FIRST 30 countries (the front), then the next product's — and every
 *   BACKGROUND_EVERY-th place goes to background work: the other countries of the products already passed, and units marked `background`
 *   (a daily re-search). A product whose first 30 are all done has no front: its other countries join the background at once. Then the
 *   background that is left, then units of no product in the queue (the general categories and YouTube niches — keywords only).
 * Processed in this order, a product's first 30 are finished before the next product's start (a unit that failed comes first again next run).
 */
export function orderWork(units, { queue = DEFAULT_QUEUE, front: size = FRONT } = {}) {
  const pRank = new Map(queue.products.map((p, i) => [p, i])), cRank = new Map(queue.countries.map((c, i) => [c, i])), first = new Set(queue.countries.slice(0, size));
  const byRank = (a, b) => (pRank.get(a.product) ?? 1e6) - (pRank.get(b.product) ?? 1e6) || (cRank.get(a.country) ?? 1e6) - (cRank.get(b.country) ?? 1e6) || String(a.id ?? "").localeCompare(String(b.id ?? ""));
  const sorted = [...units].sort(byRank), byProduct = new Map();
  for (const u of sorted) if (!u.background && pRank.has(u.product)) (byProduct.get(u.product) ?? byProduct.set(u.product, []).get(u.product)).push(u);
  const out = [], pool = sorted.filter((u) => u.background);
  for (const p of queue.products) {
    const mine = byProduct.get(p); if (!mine) continue;
    for (const u of mine.filter((x) => first.has(x.country))) { if (pool.length && (out.length + 1) % BACKGROUND_EVERY === 0) out.push(pool.shift()); out.push(u); }
    pool.push(...mine.filter((x) => !first.has(x.country)));
  }
  return [...out, ...pool, ...sorted.filter((u) => !u.background && !pRank.has(u.product))];
}

/** how far a product is: its first 30 finished, all its countries finished → { first, firstDone, all, allDone } */
export function progressOf(product, { queue = DEFAULT_QUEUE, finished = () => false, countries = queue.countries } = {}) {
  const first = queue.countries.slice(0, FRONT).filter((c) => countries.includes(c));
  return { first: first.length, firstDone: first.filter((c) => finished(product, c)).length, all: countries.length, allDone: countries.filter((c) => finished(product, c)).length };
}

/**
 * RR-329 C · the ETA: the days left for each product's first 30 countries, in queue order — at a daily AI budget and the AI cost of a country,
 * AND at the daily page reads and the reads of a country (both measured; defaults until enough runs): whichever is slower decides. The front
 * gets (BACKGROUND_EVERY-1)/BACKGROUND_EVERY of each day.
 * → [{ product, left, cost, days, aiDays, readDays, date }] cumulative (a product's date counts the products before it)
 */
export function etaOf({ queue = DEFAULT_QUEUE, products, finished, perDayUsd, costOf, readsPerDay = Infinity, readsOf = () => 0, today, countries = queue.countries }) {
  const share = (BACKGROUND_EVERY - 1) / BACKGROUND_EVERY, at = (d) => new Date(Date.parse(`${today}T00:00:00Z`) + Math.ceil(d) * 86400000).toISOString().slice(0, 10);
  let ai = 0, reads = 0, days = 0;
  return queue.products.filter((p) => products.includes(p)).map((p) => {
    const pr = progressOf(p, { queue, finished, countries }), left = pr.first - pr.firstDone, cost = costOf(p);
    const a = left && perDayUsd > 0 ? (left * cost) / (perDayUsd * share) : 0, r = left && readsPerDay > 0 && readsPerDay !== Infinity ? (left * readsOf(p)) / (readsPerDay * share) : 0;
    ai += a; reads += r; days += Math.max(a, r);
    return { product: p, left, cost, days: Math.ceil(days), aiDays: Math.ceil(ai), readDays: Math.ceil(reads), date: at(days) };
  });
}
/** the owner's rule: AlmiOET's first 30 taking longer than 3 weeks → "raise to $3 to finish by <date>" (null when it is fine); when the page
 * reads are what holds it back, the advice says so too (a higher budget alone would not help) */
export function raiseAdvice({ eta, perDayUsd, today, product = "oet", maxDays = 21, raiseTo = 3, readsPerDay = null }) {
  const e = eta.find((x) => x.product === product); if (!e || e.days <= maxDays) return null;
  /* the reads hold it back only when they are the slower of the two NOW; at $3 the date is whichever is slower then */
  const aiAt3 = perDayUsd < raiseTo ? (e.aiDays * perDayUsd) / raiseTo : e.aiDays, readsBind = e.readDays >= e.aiDays && e.readDays > 0;
  if (perDayUsd >= raiseTo && !readsBind) return null;
  const at = (d) => new Date(Date.parse(`${today}T00:00:00Z`) + Math.ceil(d) * 86400000).toISOString().slice(0, 10);
  if (!readsBind) return `AlmiOET's first 30 countries need about ${e.days} days at $${perDayUsd.toFixed(2)} a day — raise to $${raiseTo} to finish by ${at(Math.max(aiAt3, e.readDays))} (COUNTRY_FACTS_AI_USD_PER_DAY in Vercel).`;
  const reads2 = (e.readDays * (readsPerDay ?? 200)) / ((readsPerDay ?? 200) * 2);
  return `AlmiOET's first 30 countries need about ${e.days} days — the daily page reads hold it back: raise COUNTRY_FACTS_READS_PER_DAY to ${2 * (readsPerDay ?? 200)}${perDayUsd < raiseTo ? ` and the budget to $${raiseTo}` : ""} to finish by ${at(Math.max(aiAt3, reads2))} (both in Vercel).`;
}
