/**
 * 🔴 RR-329 F · THE COLLECTORS' HEALTH (owner, rule R10): every run adds its outcome to TODAY's record of its collector (in the limit store,
 * kept 21 days). A collector that FAILED 3 days in a row — or did not run at all for 3 days — puts a red line on /owner with the reason and
 * the fix: it never stops silently. A day counts as failed when it made no progress and its runs stopped for a reason (Google's refusal, the
 * AI key, today's budget, the database full …); a day with progress is a good day even when its budget ran out.
 * The same records give the owner's weekly summary ("This week").
 */
export const HEALTH = Object.freeze({ failDays: 3, keepDays: 21 });
/* RR-333 B4 (autonomy 10 Nov – 7 Jan): EVERY collector has its red line — the test dates and the Search Console reader too */
export const COLLECTORS = Object.freeze({ keywords: "The keyword collector", facts: "The country-facts collector", dates: "The test-dates collector", gsc: "The Search Console reader" });
/* the fix for each reason, in the owner's words (names of settings only, never a value) */
export const FIX = Object.freeze({
  NOT_CONNECTED: "Google is not connected: run the sign-in script in the deploy folder again (node owner-google-sign-in.mjs), then redeploy.",
  UNAUTHENTICATED: "Google's sign-in has ended: run the sign-in script in the deploy folder again (node owner-google-sign-in.mjs).",
  AUTHORIZATION_ERROR: "Google refused the access: press \"Check Google access\" below and send CC the reason it shows.",
  PERMISSION_DENIED: "Google refused the access: press \"Check Google access\" below and send CC the reason it shows.",
  RESOURCE_EXHAUSTED: "Google's own daily limit was reached: nothing to do — it starts again tomorrow. If it repeats every day, tell CC.",
  BUSY: "Google did not answer any request all day: nothing to change if it passes; if it repeats, press \"Check Google access\" below and send CC what it shows.",
  OUR_DAILY_LIMIT:"Today's share of Google's limit was used before anything new was saved: tell CC (the queue may be stuck on one country).",
  AI_KEY: "The AI key is missing or refused: check ANTHROPIC_API_KEY in Vercel (Production), then redeploy.",
  AI_BUDGET: "Today's AI budget was used before anything was finished: raise COUNTRY_FACTS_AI_USD_PER_DAY in Vercel (for example to 3), then redeploy.",
  AI_ERROR: "The AI did not answer: if it repeats, check your Anthropic workspace (its monthly limit) and ANTHROPIC_API_KEY.",
  READS: "Today's page reads were used before anything was finished: raise COUNTRY_FACTS_READS_PER_DAY in Vercel (for example to 400).",
  DB_FULL: "The database is nearly full: upgrade the Neon project to the Launch plan (no minimum; about $0.35 per GB a month) in Neon's console, or tell CC to keep less history.",
  DB_ERROR: "The database could not be reached: check the Neon project in Neon's console (DATABASE_URL in Vercel).",
  GSC: "Search Console could not be read: press \"Read Search Console\" below to see the reason now; if it is about the sign-in, run the sign-in script in the deploy folder again (node owner-google-sign-in.mjs), then redeploy.",
  NO_RUN: "No run at all: check Settings → Cron Jobs in Vercel (the site must be deployed, CRON_SECRET set), and that Google, the store and the database are connected.",
});
const dayBefore = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) - n * 86400000).toISOString().slice(0, 10);
const keyOf = (c, d) => `av:health:${c}:${d}`;

/** one run's outcome → today's record (merged). `progress`: new things saved; `code`/`why`: why it stopped (null: it finished or ran out of time) */
export async function recordRun(kv, collector, day, { progress = 0, code = null, why = null, aiUsd = 0, keywords = 0, facts = 0, finished = [], sizeMb = null } = {}) {
  if (!kv) return null;
  try {
    const [old] = await kv.run([["GET", keyOf(collector, day)]]), r = old ? JSON.parse(old) : { day, runs: 0, progress: 0, keywords: 0, facts: 0, aiUsd: 0, finished: [], stops: {} };
    r.runs++; r.progress += progress; r.keywords += keywords; r.facts += facts; r.aiUsd = Math.round((r.aiUsd + aiUsd) * 1e4) / 1e4; r.finished = [...new Set([...r.finished, ...finished])].slice(0, 400);
    if (code) { r.stops[code] = (r.stops[code] ?? 0) + 1; r.lastCode = code; r.lastWhy = why; }
    if (sizeMb !== null) r.sizeMb = sizeMb;
    await kv.run([["SET", keyOf(collector, day), JSON.stringify(r), "EX", HEALTH.keepDays * 86400]]);
    return r;
  } catch { return null; }
}
/** the last `n` days of a collector (newest first; null for a day without a run) */
export async function daysOf(kv, collector, today, n = 7) {
  if (!kv) return [];
  try { const got = await kv.run(Array.from({ length: n }, (_, i) => ["GET", keyOf(collector, dayBefore(today, i))])); return got.map((v) => (v ? JSON.parse(v) : null)); } catch { return []; }
}
const failed = (r) => !r || (r.progress === 0 && Boolean(r.lastCode));
/**
 * The red line: the 3 days BEFORE today all failed (or had no run), and today has made no progress yet.
 * → null | { collector, code, line, fix }
 */
export function redLine(collector, days) {
  const [today, ...before] = days, last3 = before.slice(0, HEALTH.failDays);
  if (last3.length < HEALTH.failDays || !last3.every(failed) || (today && today.progress > 0)) return null;
  if (last3.every((r) => !r) && !today) return { collector, code: "NO_RUN", line: `${COLLECTORS[collector]} has not run for ${HEALTH.failDays} days.`, fix: FIX.NO_RUN };
  const newest = [today, ...last3].find((r) => r?.lastCode) ?? null, code = newest?.lastCode ?? "NO_RUN";
  return { collector, code, line: `${COLLECTORS[collector]} has failed ${HEALTH.failDays} days in a row — last reason: ${newest?.lastWhy ?? "no run"}`, fix: FIX[code] ?? "Tell CC the reason shown here." };
}
/** the owner's "This week": the last 7 days of both collectors, in plain numbers (+ what waits for him, + the problems) */
export function weekOf({ keywords = [], facts = [], waiting = 0, unconfirmed = 0, problems = [] }) {
  const sum = (xs, k) => xs.filter(Boolean).reduce((a, r) => a + (r[k] ?? 0), 0);
  const kwDays = keywords.filter(Boolean).length, cfDays = facts.filter(Boolean).length;
  return { keywords: sum(keywords, "keywords"), requests: sum(keywords, "progress"), facts: sum(facts, "facts"), finished: [...new Set(facts.filter(Boolean).flatMap((r) => r.finished ?? []))], aiUsd: Math.round(sum(facts, "aiUsd") * 100) / 100,
    kwDays, cfDays, waiting, unconfirmed, problems };
}
