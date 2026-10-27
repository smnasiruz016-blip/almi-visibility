/**
 * 🔴 RR-331 · THE TEST DATES COLLECTOR (Vercel Cron → /cron/test-dates; owner decision 27 Oct 2026). For each test × country, in the
 * owner's queue (site/queue.mjs: OET first, then IELTS, PTE, TOEFL, CELPIP, then the language tests; his first 15, next 15, then the rest):
 * upcoming dates with city/centre, format, booking link, source and the day checked — ONE AI question (web search) for a few countries of
 * one test; each date kept only when the collector reads its page itself (robots obeyed, the official reader) and finds it there
 * (desktop/test-dates.mjs checkDate). An official page with no dates → "no public dates", dated. Weekly; past dates drop off. Its own lock;
 * the SAME daily caps as the Country Facts collector (cf_day: AI dollars, page reads) — it spends only what is left of them.
 */
import { randomBytes } from "node:crypto";
import { DATE_TESTS, NO_DATES, FORMATS, checkDate, officialFor, hostOnly, upcoming } from "../desktop/test-dates.mjs";
import { DEFAULT_QUEUE, orderWork } from "./queue.mjs";
import { capsOf, CF_COLLECTOR } from "./cf-collector.mjs";
import { askAi, aiConfigured, testDatesQuestion } from "./cf-ai.mjs";
import { recordRun } from "./health.mjs";
import { refuseBlocked } from "../desktop/country-facts.mjs"; // RR-333

export const CF_DATES = Object.freeze({ runBudgetMs: 240000, lockSeconds: 290, batch: 5, refreshDays: 7, noDatesRefreshDays: 30, maxDates: 6 });
const ALL = "*";
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
export const datesKey = (product, country) => `${product === "oet" ? "" : `${product}:`}dates|${country}`;
export const datesTask = (product) => `${product}:dates`;
const OWNERS = { prep: "ielts.org, the British Council or IDP (IELTS's official partners)", pte: "Pearson's own PTE website", toefl: "ETS's own website", oet: "OET's own website (oet.com)", celpip: "CELPIP's own website (Paragon Testing)" };

/** one run → { ok, day, saved, dates, none, unconfirmed, done: ["OET · Pakistan", …], stoppedBy, why, aiUsd, reads } */
export async function runTestDates({ store, kv = null, env = process.env, reader, ai = askAi, now = () => Date.now(), budgetMs = CF_DATES.runBudgetMs, queue = DEFAULT_QUEUE, countries = null, tests = null }) {
  const start = now(), today = dayOf(start), at = () => new Date(now()).toISOString(), id = randomBytes(8).toString("hex");
  reader = refuseBlocked(reader); // RR-333 C: the owner's blocked private sites are never read
  if (kv) { const [locked] = await kv.run([["SET", "av:td:lock", id, "NX", "EX", CF_DATES.lockSeconds]]); if (locked !== "OK") return { ok: false, day: today, why: "Another test-dates run is working — this one did nothing." }; }
  const caps = capsOf(env), spent = await store.spend(today), r0 = reader.requests(), tasks = await store.tasks();
  const out = { ok: true, day: today, saved: 0, dates: 0, none: 0, unconfirmed: 0, done: [], stoppedBy: null, why: null, aiUsd: 0, reads: 0, searches: 0, aiError: null };
  const stop = (code, why) => { out.stoppedBy = code; out.why = why; return false; };
  const room = (needAi = false) => {
    if (now() - start > budgetMs) return stop("TIME", "This run's time is used — the next run continues.");
    if (spent.reads + reader.requests() - r0 >= caps.reads) return stop("READS", `Today's ${caps.reads} page reads are used — the next day continues.`);
    if (needAi && spent.aiUsd + out.aiUsd + CF_COLLECTOR.aiReserveUsd > caps.aiUsd) return stop("AI_BUDGET", `Today's AI budget ($${caps.aiUsd.toFixed(2)}) is used — the next day continues.`);
    return true;
  };
  const due = (c, t, days) => { const x = tasks.get(`${c}|${t}`); return !x || x.state !== "done" || daysBetween(x.day, today) >= days; };
  const finish = async (c, t, note) => { await store.setTask(c, t, { day: today, state: "done", note }); tasks.set(`${c}|${t}`, { day: today, state: "done" }); };
  const put = async (f) => { const r = await store.putFact({ aiWritten: false, ...f }, { at: at() }); if (r.saved) out.saved++; return r; };
  const list = countries ?? queue.countries, want = (tests ?? queue.products).filter((p) => DATE_TESTS[p] || NO_DATES[p]);
  try {
    /* the tests with no dates at all (DET): recorded once, its own page read again monthly */
    for (const p of want.filter((k) => NO_DATES[k])) {
      if (!due(ALL, datesTask(p), CF_DATES.noDatesRefreshDays) || !room()) continue;
      const T = NO_DATES[p], page = await reader.read(T.page), ok = page.ok && T.says.test(`${page.title ?? ""} ${page.text}`);
      await put({ key: datesKey(p, ALL), product: p, country: ALL, part: "dates", kind: "dates", value: { test: T.name, dates: [], none: true, text: `${T.name}: online, taken at any time — it has no test dates.` }, sourceUrl: page.ok ? page.url : T.page, sourceTitle: page.title ?? null, readOn: page.checkedOn ?? today, proposedBy: "official", status: ok ? "confirmed" : "unconfirmed", why: ok ? null : page.ok ? "its page does not say it is taken at any time" : `its page could not be read (${page.why})` });
      await finish(ALL, datesTask(p), ok ? "no dates: online, any time" : "its page could not be confirmed");
    }
    /* the dated tests, in the owner's queue: a product's first 30 countries first, then the next product's */
    const units = [];
    for (const p of want.filter((k) => DATE_TESTS[k])) for (const c of list) if (due(c, datesTask(p), CF_DATES.refreshDays)) units.push({ id: `${p}|${c}`, product: p, country: c, tasks: [datesTask(p)], background: false });
    const ordered = orderWork(units, { queue });
    for (let i = 0; i < ordered.length && !out.stoppedBy;) {
      const p = ordered[i].product, batch = []; while (i < ordered.length && ordered[i].product === p && batch.length < CF_DATES.batch) batch.push(ordered[i++].country);
      if (!aiConfigured(env)) { out.why = "ANTHROPIC_API_KEY is not set in Vercel — no test dates can be searched."; out.stoppedBy = "AI_KEY"; break; } // RR-333 B4: a reason, so 3 such days are a red line
      if (!room(true)) break;
      const T = DATE_TESTS[p], r = await ai({ env, ...testDatesQuestion({ test: T.name, owners: OWNERS[p] ?? `${T.name}'s own website or its official partners'`, countries: batch, today }) });
      out.aiUsd += r.usd ?? 0; out.searches += r.searches ?? 0;
      if (!r.ok) { out.aiError = r.why; continue; }
      for (const c of batch) {
        const got = (r.data.dates ?? []).filter((x) => x.country === c).slice(0, CF_DATES.maxDates + 1), kept = [], why = [];
        let none = null;
        for (const x of got) {
          if (!room()) break;
          const page = await reader.read(x.sourceUrl);
          if (x.noPublicDates) { if (page.ok && officialFor(p, hostOnly(page.url))) none ??= { sourceUrl: page.url, sourceTitle: page.title ?? null, checkedOn: page.checkedOn ?? today }; else why.push("a \"no dates\" page that is not official or could not be read"); continue; }
          const bad = checkDate(x, { product: p, today, page });
          if (bad) { why.push(`${x.date}: ${bad}`); continue; }
          kept.push({ date: x.date, city: x.city || null, centre: x.centre || null, format: FORMATS.includes(x.format) ? x.format : null, bookingUrl: /^https:\/\//.test(x.bookingUrl ?? "") && officialFor(p, hostOnly(x.bookingUrl)) ? x.bookingUrl : null, sourceUrl: page.url, quote: x.quote, checkedOn: page.checkedOn ?? today });
        }
        out.unconfirmed += why.length;
        const dates = upcoming(kept, today).slice(0, CF_DATES.maxDates);
        if (dates.length || none) {
          await put({ key: datesKey(p, c), product: p, country: c, part: "dates", kind: "dates", value: { test: T.name, dates, none: !dates.length, ...(dates.length ? {} : { text: `No public dates on ${T.name}'s official page for ${c} (checked ${none.checkedOn}).` }) },
            sourceUrl: dates[0]?.sourceUrl ?? none.sourceUrl, sourceTitle: none?.sourceTitle ?? null, readOn: today, proposedBy: "ai", aiWritten: false, status: "confirmed", why: why.length ? `${why.length} proposed date(s) not kept: ${why.slice(0, 3).join("; ")}` : null });
          if (dates.length) out.dates += dates.length; else out.none++;
        }
        await finish(c, datesTask(p), dates.length ? `${dates.length} upcoming dates` : none ? "no public dates on the official page" : `nothing confirmed on an official page${why.length ? ` (${why.length} proposed, not kept)` : ""}`);
        out.done.push(`${T.name} · ${c}`);
      }
    }
    out.reads = reader.requests() - r0;
    await store.addSpend(today, { aiUsd: out.aiUsd, reads: out.reads, searches: out.searches });
    if (kv) try { await kv.run([["SET", "av:td:last", JSON.stringify({ at: at(), ...out }), "EX", 14 * 86400]]); } catch { /* the owner's page only */ }
    await recordRun(kv, "dates", today, { progress: out.saved + out.done.length, code: out.stoppedBy === "TIME" ? null : out.stoppedBy ?? (out.aiError && !out.saved ? "AI_ERROR" : null), why: out.why ?? out.aiError, aiUsd: out.aiUsd, facts: out.saved });
    return out;
  } finally { if (kv) try { const [held] = await kv.run([["GET", "av:td:lock"]]); if (held === id) await kv.run([["DEL", "av:td:lock"]]); } catch { /* it expires by itself */ } }
}
