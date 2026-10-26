/**
 * 🔴 RR-329 C/E/F · WHAT THE OWNER SEES FIRST on /owner (his phone, twice a week): the red lines (a collector failing 3 days), "This week",
 * each product's progress and ETA (its first 30 countries) for both collectors, the AI spend today and this month, the database's size and
 * when it will be full. Read from the stores; nothing here asks Google or the AI.
 */
import { queueOf, progressOf, etaOf, raiseAdvice, FRONT } from "./queue.mjs";
import { daysOf, redLine, weekOf } from "./health.mjs";
import { finishedIn, costKey, capsOf, CF_COLLECTOR } from "./cf-collector.mjs";
import { currentGroups, plan, storageLimitOf, COLLECTOR } from "./kw-collector.mjs";
import { unitsOf, LOCATIONS } from "./kw-seeds.mjs";
import { FACT_PRODUCTS } from "../desktop/product-facts.mjs";

export const QUEUE_KEY = "av:queue";
/* the keyword collector's requests a day until enough days are measured: 8 runs of about 4 minutes at Google's pace */
export const KW_DEFAULT_PER_DAY = 1500;
const dayBefore = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/** the owner's saved order (KV), merged with the default */
export async function queueNow(kv) { try { const [s] = kv ? await kv.run([["GET", QUEUE_KEY]]) : [null]; return queueOf(s ? JSON.parse(s) : null); } catch { return queueOf(null); } }
export async function saveQueue(kv, q) { await kv.run([["SET", QUEUE_KEY, JSON.stringify({ products: q.products, countries: q.countries })]]); }
export const PRODUCT_NAMES = Object.freeze({ oet: "AlmiOET", cv: "AlmiCV", jobs: "AlmiJob", study: "AlmiStudy", salary: "AlmiSalary", prep: "AlmiPrep (IELTS)", pte: "AlmiPTE", toefl: "AlmiTOEFL", det: "AlmiDET", celpip: "AlmiCELPIP",
  french: "AlmiFrench", goethe: "AlmiGoethe", spanish: "AlmiSpanish", italian: "AlmiItalian", portuguese: "AlmiPortuguese", dutch: "AlmiDutch", japanese: "AlmiJapanese", korean: "AlmiKorean", danish: "AlmiDanish", norwegian: "AlmiNorwegian", swedish: "AlmiSwedish", icelandic: "AlmiIcelandic", swiss: "AlmiSwiss", visibility: "AlmiVisibility" });
export const productName = (p) => PRODUCT_NAMES[p] ?? p;

export async function ownerStatus({ kv, db = null, cf = null, env = process.env, now = () => Date.now() }) {
  const today = new Date(now()).toISOString().slice(0, 10), queue = await queueNow(kv), caps = capsOf(env);
  const out = { today, queue, red: [], facts: null, keywords: null, spend: null, storage: null, week: null, advice: null };
  const [kwDays, cfDays] = await Promise.all([daysOf(kv, "keywords", today, 8), daysOf(kv, "facts", today, 8)]);
  /* F · the red lines (only for a collector that can run: the keyword collector needs Google and the database) */
  if (db) { const r = redLine("keywords", kwDays); if (r) out.red.push(r); }
  if (cf) { const r = redLine("facts", cfDays); if (r) out.red.push(r); }
  /* C · the country facts: progress, ETA, the "$3" advice, the spend */
  let waiting = 0, unconfirmed = 0;
  if (cf) {
    const tasks = await cf.tasks(), finished = finishedIn(tasks), costs = {}, reads = {};
    for (const p of FACT_PRODUCTS) {
      let c = null; try { const [v] = kv ? await kv.run([["GET", costKey(p)]]) : [null]; c = v ? JSON.parse(v) : null; } catch { c = null; }
      const k = p === "oet" ? "oet" : "other", measured = c && c.n >= 3;
      costs[p] = measured ? c.usd : CF_COLLECTOR.defaultCost[k]; reads[p] = measured && c.reads !== undefined ? c.reads : CF_COLLECTOR.defaultReads[k];
    }
    const eta = etaOf({ queue, products: FACT_PRODUCTS, finished, perDayUsd: caps.aiUsd, costOf: (p) => costs[p], readsPerDay: caps.reads, readsOf: (p) => reads[p], today });
    out.facts = eta.map((e) => ({ ...e, name: productName(e.product), ...progressOf(e.product, { queue, finished }) }));
    out.advice = raiseAdvice({ eta, perDayUsd: caps.aiUsd, today, readsPerDay: caps.reads });
    const month = today.slice(0, 8) + "01", days = await cf.spendSince(month);
    out.spend = { today: days.find((d) => d.day === today)?.aiUsd ?? 0, month: Math.round(days.reduce((a, d) => a + d.aiUsd, 0) * 100) / 100, cap: caps.aiUsd, days: days.slice(-7) };
    const facts = await cf.facts(); waiting = facts.filter((f) => f.status === "confirmed" && f.by === "collector").length; unconfirmed = facts.filter((f) => f.status === "unconfirmed").length;
  }
  /* A · the keywords: each product's first 30 countries (and "All locations") asked within 30 days; what is left; days at the measured pace */
  if (db) {
    try {
      const { groups } = await currentGroups(db), units = unitsOf(groups), fetched = await db.fetchedSince(dayBefore(today, 61)), p = plan(units, fetched, today, { queue });
      /* a country Google cannot target (Iran is the owner's 30th) is never asked — not counted as done */
      const due = new Set(p.due.map((u) => `${u.product}|${u.country}`)), first = ["All locations", ...queue.countries.slice(0, FRONT).filter((c) => LOCATIONS.some((l) => l.name === c))];
      const products = queue.products.filter((k) => groups.some((g) => g.kind === "product" && g.key === k));
      const measured = kwDays.slice(1).filter((r) => r && r.progress > 0), perDay = measured.length >= 2 ? Math.round(measured.reduce((a, r) => a + r.progress, 0) / measured.length) : KW_DEFAULT_PER_DAY;
      out.keywords = { products: products.map((k) => ({ product: k, name: productName(k), first: first.length, firstDone: first.filter((c) => !due.has(`${k}|${c}`)).length })), due: p.due.length, total: p.total, perDay, measured: measured.length >= 2, days: Math.ceil(p.due.length / Math.max(1, perDay)) };
    } catch { out.keywords = null; }
    /* F · the database: its size now, its growth a day (measured), the day it would be full */
    const sized = kwDays.filter((r) => r && typeof r.sizeMb === "number"), limit = storageLimitOf(env);
    let mb = sized[0]?.sizeMb ?? null; if (mb === null) { try { mb = (await db.sizeMb?.()) ?? null; } catch { mb = null; } }
    const growth = sized.length >= 2 ? (sized[0].sizeMb - sized.at(-1).sizeMb) / Math.max(1, kwDays.indexOf(sized.at(-1)) - kwDays.indexOf(sized[0])) : null;
    const left = mb === null ? null : limit * COLLECTOR.stopAtShare - mb, fullIn = growth && growth > 0 && left !== null ? Math.max(0, Math.floor(left / growth)) : null;
    out.storage = { mb, limit, growth: growth === null ? null : Math.round(growth * 10) / 10, fullOn: fullIn === null ? null : addDays(today, fullIn), fullIn };
  }
  out.week = weekOf({ keywords: kwDays.slice(0, 7), facts: cfDays.slice(0, 7), waiting, unconfirmed, problems: out.red.map((r) => r.line) });
  return out;
}
