/**
 * 🔴 RR-326 B + G · THE DAILY KEYWORD COLLECTOR (Vercel Cron → /cron/keywords, several times a night; each run continues where the last
 * stopped). Google's own data only (KeywordPlanIdeaService, kw-google.mjs) — never a Google result page.
 *   1. AlmiWorld's own products FIRST, every day: one request per (product, location) with all its seeds.
 *   2. Then the general database — categories and YouTube niches: one request per (seed, location), the OLDEST first; each is refreshed
 *      at least once a week (a daily share of ~1/6 of them, so a week always has room).
 *   · never the same thing twice in a day: a unit fetched today is skipped, and the store refuses a second save of the same day anyway;
 *   · one run at a time (a lock in the store); a run stops at its time budget, at our daily cap (one third of Google's 15,000 — the
 *     collector's own share, kw-google.mjs QUOTA.collector), or at a refusal that says stop (sign-in ended, access refused, Google's
 *     limit) — said in plain words for the owner's page.
 */
import { randomBytes } from "node:crypto";
import { DEFAULT_SEEDS, parseSeeds, unitsOf, LANGUAGES } from "./kw-seeds.mjs";

export const COLLECTOR = Object.freeze({ runBudgetMs: 240000, weeklyDays: 6, lockSeconds: 290 });
const STOP = new Set(["OUR_DAILY_LIMIT", "NOT_CONNECTED", "UNAUTHENTICATED", "AUTHORIZATION_ERROR", "RESOURCE_EXHAUSTED", "PERMISSION_DENIED", "ACTION_NOT_PERMITTED", "CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION", "USER_PERMISSION_DENIED", "CUSTOMER_NOT_ENABLED"]);
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const daysBefore = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);

/** the owner's list (or the first list, if he has none or it no longer reads) */
export async function currentGroups(store) {
  const saved = await store.seedList(), p = saved ? parseSeeds(saved.text) : null;
  return p?.ok ? { groups: p.groups, from: "owner", at: saved.at } : { groups: parseSeeds(DEFAULT_SEEDS).groups, from: saved ? "first list (the saved list does not read)" : "first list", at: null };
}

/** what is due today, in order: products not fetched today, then weekly units not fetched for 7 days (oldest first), up to today's share */
export function plan(units, fetched, today) {
  const last = (u) => fetched.get(`${u.seedKey}|${u.location}|${u.language}`) ?? null;
  const daily = units.filter((u) => u.cadence === "daily" && last(u) !== today);
  const weekly = units.filter((u) => u.cadence === "weekly");
  const share = Math.ceil(weekly.length / COLLECTOR.weeklyDays), doneToday = weekly.filter((u) => last(u) === today).length;
  const due = weekly.filter((u) => { const l = last(u); return l === null || l <= daysBefore(today, 7); }).sort((a, b) => (last(a) ?? "").localeCompare(last(b) ?? ""));
  return { daily, weekly: due.slice(0, Math.max(0, share - doneToday)), share, weeklyTotal: weekly.length, dailyTotal: units.filter((u) => u.cadence === "daily").length };
}

/** one run. → { ok, day, saved, duplicates, skipped, stoppedBy, why, left: { daily, weekly }, ops } */
export async function runCollector({ store, ads, kv, now = () => Date.now(), budgetMs = COLLECTOR.runBudgetMs }) {
  const start = now(), today = dayOf(start), id = randomBytes(8).toString("hex");
  const [locked] = await kv.run([["SET", "av:collector:lock", id, "NX", "EX", COLLECTOR.lockSeconds]]);
  if (locked !== "OK") return { ok: false, day: today, why: "Another collector run is working — this one did nothing." };
  const out = { ok: true, day: today, saved: 0, keywords: 0, duplicates: 0, skipped: 0, ops: 0, stoppedBy: null, why: null };
  try {
    const { groups } = await currentGroups(store);
    const units = unitsOf(groups), fetched = await store.fetchedSince(daysBefore(today, 7));
    const p = plan(units, fetched, today), todo = [...p.daily, ...p.weekly];
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
      const s = await store.saveFetch({ unitId: u.id, kind: "collector", group: u.group, seedKey: u.seedKey, location: u.location, language: u.language, day: today, at: new Date(now()).toISOString(), period: r.period, ops: r.ops, rows: r.rows });
      if (s.duplicate) out.duplicates++; else { out.saved++; out.keywords += s.stored; }
    }
    const rest = todo.slice(i);
    out.left = { daily: rest.filter((u) => u.cadence === "daily").length, weekly: rest.filter((u) => u.cadence === "weekly").length };
    out.plan = { dailyTotal: p.dailyTotal, weeklyTotal: p.weeklyTotal, weeklyShare: p.share };
    try { await kv.run([["SET", "av:collector:last", JSON.stringify({ at: new Date(now()).toISOString(), ...out }), "EX", 14 * 86400]]); } catch { /* the owner's page only */ }
    return out;
  } finally { try { const [held] = await kv.run([["GET", "av:collector:lock"]]); if (held === id) await kv.run([["DEL", "av:collector:lock"]]); } catch { /* it expires by itself */ } }
}
