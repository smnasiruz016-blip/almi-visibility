/**
 * 🔴 RR-326 B + G, RR-329 A · THE KEYWORD COLLECTOR (Vercel Cron → /cron/keywords, several times a day; each run continues where the last
 * stopped). Google's own data only (KeywordPlanIdeaService, kw-google.mjs) — never a Google result page.
 *   · EVERY country Google can target (kw-seeds.mjs LOCATIONS, rule R5), in the owner's PRIORITY QUEUE (queue.mjs, rule R4): AlmiOET's first
 *     30 countries, then AlmiCV's … each product's other countries in the background; then the general categories and YouTube niches;
 *   · a product is asked again after 30 days, a category or niche after 60 (Google's figures are 12-month averages it updates monthly) — so
 *     every location fits in our share of Google's limit: one third of its 15,000 a day (kw-google.mjs QUOTA.collector);
 *   · RR-329 F: each fetch keeps its 300 most-searched keywords and up to 100 more that ASK something (the questions of a country) — so two
 *     months of every country fit in the database; a run stops before the database is full (NEON_STORAGE_LIMIT_MB, Neon's free plan: 1 GB);
 *   · never the same thing twice in a day; one run at a time (a lock); a run stops at its time budget, at our daily cap, or at a refusal that
 *     says stop — said in plain words for the owner's page, and recorded for the 3-day health check (health.mjs).
 */
import { randomBytes } from "node:crypto";
import { DEFAULT_SEEDS, parseSeeds, unitsOf, LANGUAGES } from "./kw-seeds.mjs";
import { DEFAULT_QUEUE, FRONT, orderWork } from "./queue.mjs";
import { recordRun } from "./health.mjs";
import { isQuestion } from "../desktop/country-facts.mjs";

export const COLLECTOR = Object.freeze({ runBudgetMs: 240000, lockSeconds: 290, keepTop: 300, keepQuestions: 100, storageLimitMb: 1024, stopAtShare: 0.95 });
const STOP = new Set(["OUR_DAILY_LIMIT", "NOT_CONNECTED", "UNAUTHENTICATED", "AUTHORIZATION_ERROR", "RESOURCE_EXHAUSTED", "PERMISSION_DENIED", "ACTION_NOT_PERMITTED", "CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION", "USER_PERMISSION_DENIED", "CUSTOMER_NOT_ENABLED"]);
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const daysBefore = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
export const storageLimitOf = (env = process.env) => (Number(env.NEON_STORAGE_LIMIT_MB) > 0 ? Number(env.NEON_STORAGE_LIMIT_MB) : COLLECTOR.storageLimitMb);

/** the owner's list (or the first list, if he has none or it no longer reads) */
export async function currentGroups(store) {
  const saved = await store.seedList(), p = saved ? parseSeeds(saved.text) : null;
  return p?.ok ? { groups: p.groups, from: "owner", at: saved.at } : { groups: parseSeeds(DEFAULT_SEEDS).groups, from: saved ? "first list (the saved list does not read)" : "first list", at: null };
}

/**
 * What is due today, in the queue's order: units never asked or older than their refresh days (a unit asked within them is finished and
 * not in the list). → { due, total, fresh }
 */
export function plan(units, fetched, today, { queue = DEFAULT_QUEUE } = {}) {
  const last = (u) => fetched.get(`${u.seedKey}|${u.location}|${u.language}`) ?? null;
  const isFresh = (u) => { const l = last(u); return l !== null && l > daysBefore(today, u.refreshDays); };
  /* "All locations" first: it stands before the countries of every product, inside the first 30 */
  const q = { products: queue.products, countries: ["All locations", ...queue.countries] };
  const due = orderWork(units.filter((u) => !isFresh(u)), { queue: q, front: FRONT + 1 });
  return { due, total: units.length, fresh: units.length - due.length };
}

/** the keywords a fetch keeps: its most-searched, and the ones that ask something (they give each country its questions) */
export function keepRows(rows, { top = COLLECTOR.keepTop, questions = COLLECTOR.keepQuestions } = {}) {
  const byVol = [...rows].sort((a, b) => (Number(b.said ?? -1) - Number(a.said ?? -1)));
  const head = byVol.slice(0, top), asks = byVol.slice(top).filter((r) => isQuestion(r.text)).slice(0, questions);
  return [...head, ...asks];
}

/** one run. → { ok, day, saved, keywords, duplicates, skipped, ops, stoppedBy, why, left, plan, sizeMb } */
export async function runCollector({ store, ads, kv, now = () => Date.now(), budgetMs = COLLECTOR.runBudgetMs, queue = DEFAULT_QUEUE, limitMb = COLLECTOR.storageLimitMb }) {
  const start = now(), today = dayOf(start), id = randomBytes(8).toString("hex");
  const [locked] = await kv.run([["SET", "av:collector:lock", id, "NX", "EX", COLLECTOR.lockSeconds]]);
  if (locked !== "OK") return { ok: false, day: today, why: "Another collector run is working — this one did nothing." };
  const out = { ok: true, day: today, saved: 0, keywords: 0, duplicates: 0, skipped: 0, ops: 0, stoppedBy: null, why: null, sizeMb: null, finished: [] };
  try {
    /* the database's size first: a run never fills it (Neon stops writing when a project is full) */
    try { out.sizeMb = (await store.sizeMb?.()) ?? null; } catch { out.sizeMb = null; }
    if (out.sizeMb !== null && out.sizeMb >= limitMb * COLLECTOR.stopAtShare) { out.stoppedBy = "DB_FULL"; out.why = `The database holds ${Math.round(out.sizeMb)} MB of its ${limitMb} MB — the collector stopped before it is full.`; }
    const { groups } = await currentGroups(store);
    const units = unitsOf(groups), fetched = await store.fetchedSince(daysBefore(today, 61));
    const p = plan(units, fetched, today, { queue }), todo = out.stoppedBy ? [] : p.due;
    let i = 0;
    for (; i < todo.length; i++) {
      if (now() - start > budgetMs) { out.stoppedBy = "TIME"; out.why = "This run's time is used — the next run continues."; break; }
      const u = todo[i];
      const r = await ads.ideas({ seeds: u.seeds, geo: u.geo, language: LANGUAGES[u.language].constant, purpose: "collector", maxPages: 1, waitMs: 10000 });
      out.ops += r.ops ?? 0;
      if (!r.ok) {
        if (STOP.has(r.code)) { out.stoppedBy = r.code; out.why = r.ownerWhy ?? r.why; break; } // RR-327: the owner's words (an account not active yet is never "Google's known fault")
        out.skipped++; continue; // busy or no answer in time: the next run asks again
      }
      let s;
      try { s = await store.saveFetch({ unitId: u.id, kind: "collector", group: u.group, seedKey: u.seedKey, location: u.location, language: u.language, day: today, at: new Date(now()).toISOString(), period: r.period, ops: r.ops, rows: keepRows(r.rows) }); }
      catch (e) { out.stoppedBy = /size|exceed|quota|disk/i.test(String(e?.message)) ? "DB_FULL" : "DB_ERROR"; out.why = out.stoppedBy === "DB_FULL" ? "The database refused to store more (it is full)." : "The database could not be reached."; break; }
      if (s.duplicate) out.duplicates++; else { out.saved++; out.keywords += s.stored; if (u.kind === "product") out.finished.push(`${u.product}|${u.country}`); }
    }
    const rest = todo.slice(i);
    out.left = { due: rest.length, products: rest.filter((u) => u.kind === "product").length };
    out.plan = { total: p.total, fresh: p.fresh, due: p.due.length };
    try { await kv.run([["SET", "av:collector:last", JSON.stringify({ at: new Date(now()).toISOString(), ...out, finished: out.finished.length }), "EX", 14 * 86400]]); } catch { /* the owner's page only */ }
    /* RR-329 F: a run that saved nothing because every request was skipped (Google busy, no answer) is a failure too — never a silent day */
    const busy = !out.stoppedBy && out.saved === 0 && out.skipped > 0;
    await recordRun(kv, "keywords", today, { progress: out.saved, code: busy ? "BUSY" : out.stoppedBy === "TIME" ? null : out.stoppedBy, why: busy ? `Google did not answer any of ${out.skipped} requests (busy or too slow).` : out.why, keywords: out.keywords, finished: out.finished, sizeMb: out.sizeMb });
    return out;
  } finally { try { const [held] = await kv.run([["GET", "av:collector:lock"]]); if (held === id) await kv.run([["DEL", "av:collector:lock"]]); } catch { /* it expires by itself */ } }
}
