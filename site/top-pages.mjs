/**
 * 🔴 RR-360 C · THE TOP-PAGES COLLECTOR (Vercel Cron → /cron/top-pages), inside AlmiSEO Data. For each intent of a topic: Google's top 10 through
 * AlmiWorld's OWN server-side DataForSEO account — asked ONCE, saved with its date, reused free by every client, product and run, asked again
 * after about a month. Never scraping Google; never around a captcha or a security check.
 *   · each top page is read politely (the official reader: robots.txt obeyed, public addresses only, paced, no sign-in; a page that refuses or
 *     needs a login or a payment is left unread, said so);
 *   · ONLY ITS STRUCTURE IS SAVED — headings and questions through the RR-359 junk filter, the counts of tables and lists, its length, its date.
 *     Its text is never saved, never reused, and nothing from it is ever a fact;
 *   · that makes the G5 coverage list and the G6 second-search questions, ready before any client runs.
 * OFF until the owner sets ALMISEO_TOP_PAGES_ON=1 and adds the account's login and password himself (names in site/almiseo.mjs ENV_NAMES).
 * OWNER'S RULING 1: AlmiWorld's OWN products only, AlmiOET first; a TOTAL budget ($50), and a daily cap: a search that could pass either is not sent, and the run stops by itself.
 */
import { randomBytes } from "node:crypto";
import { SERP, serpTask, readSerp } from "../desktop/serp.mjs";
import { cleanCoverage, junkWhy } from "../desktop/coverage.mjs";
import { secondSearch } from "../desktop/recipe.mjs";
import { COUNTRIES } from "../desktop/world.mjs";
import { ENV_NAMES, TOP_PAGES_CAPS, TOP_PAGES_JOB, TOP_PAGES_READS_JOB, topPagesCaps, topPagesBudget, collectorPlan, allTopics, useClientTemplates, LIVE_JOBS } from "./almiseo.mjs";
import { DEFAULT_QUEUE } from "./queue.mjs";
import { recordRun } from "./health.mjs";

export const TOP_PAGES = Object.freeze({ runBudgetMs: 240000, lockSeconds: 290, maxHeadings: 40, location: "United States", language: "en" });
const dayOf = (t) => new Date(t).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
export const topPagesConnected = (env = process.env) => env[ENV_NAMES.topPagesOn] === "1" && Boolean(env[ENV_NAMES.dfsLogin]) && Boolean(env[ENV_NAMES.dfsPassword]);
const QUESTION = /^(what|how|which|when|where|why|who|can|could|is|are|do|does|did|should|will|would|may|must|has|have)\b/i;
const tag = (html, re) => [...String(html).matchAll(re)].map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim()).filter(Boolean);

/** a page's HTML → ONLY its structure (never a sentence of its text): the headings the junk filter keeps, questions, counts, length, date */
export function pageStructure(html, { now = new Date().toISOString() } = {}) {
  const clean = String(html ?? "").replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/gi, " ");
  const main = /<(?:main|article)\b[\s\S]*<\/(?:main|article)>/i.exec(clean)?.[0] ?? clean;
  const dropped = [], heads = tag(main, /<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi);
  const headings = [...new Set(heads)].filter((h) => { const w = junkWhy(h, { now, names: COUNTRIES }); if (w) dropped.push(w); return !w; }).slice(0, TOP_PAGES.maxHeadings);
  const words = main.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean).length;
  const date = /<meta[^>]+(?:article:modified_time|article:published_time|og:updated_time|name=["']date["'])[^>]*content=["'](\d{4}-\d{2}-\d{2})/i.exec(clean)?.[1] ?? /<time[^>]+datetime=["'](\d{4}-\d{2}-\d{2})/i.exec(clean)?.[1] ?? null;
  return { headings, questions: headings.filter((h) => QUESTION.test(h) || h.endsWith("?")), tables: (main.match(/<table\b/gi) ?? []).length, lists: (main.match(/<(?:ul|ol)\b/gi) ?? []).length, words, date, droppedHeadings: dropped.length };
}
/** a paywall or a sign-in wall is left unread: nothing behind it is taken */
export const walled = (html) => /<(?:input)[^>]+type=["']password["']/i.test(String(html ?? "")) || /\b(subscribe to (?:continue|read)|sign in to (?:continue|read)|log in to (?:continue|read)|this content is for (?:members|subscribers)|premium members only)\b/i.test(String(html ?? ""));

/** the intents of a topic: what its plan will ask (its pages), without a question already asked for another page */
export function intentsOf({ topic, facts }) {
  const seen = new Set();
  return [...collectorPlan({ topic, facts }).map((p) => p.title), ...(topic.intents ?? [])].filter((t) => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

/** one run. → { ok, day, searches, cost, reads, lists, coverage, stoppedBy, why } */
export async function runTopPages({ seo, cf, kv = null, env = process.env, reader, fetchImpl = fetch, now = () => Date.now(), budgetMs = TOP_PAGES.runBudgetMs, groups = [], queue = DEFAULT_QUEUE }) {
  const start = now(), today = dayOf(start), id = randomBytes(8).toString("hex");
  if (!topPagesConnected(env)) return { ok: false, day: today, why: `The top-pages collector is off (${ENV_NAMES.topPagesOn}, ${ENV_NAMES.dfsLogin}, ${ENV_NAMES.dfsPassword}) — the owner's decision.` };
  if (kv) { const [locked] = await kv.run([["SET", "av:tp:lock", id, "NX", "EX", TOP_PAGES.lockSeconds]]); if (locked !== "OK") return { ok: false, day: today, why: "Another top-pages run is working — this one did nothing." }; }
  const caps = topPagesCaps(env), spent = await seo.spend(today, TOP_PAGES_JOB), readsToday = (await seo.spend(today, TOP_PAGES_READS_JOB)).units, budget0 = await topPagesBudget({ seo, env }), out = { ok: true, day: today, searches: 0, cost: 0, reads: 0, lists: 0, coverage: 0, stoppedBy: null, why: null };
  const auth = `Basic ${Buffer.from(`${env[ENV_NAMES.dfsLogin]}:${env[ENV_NAMES.dfsPassword]}`).toString("base64")}`;
  const reads0 = reader.requests();
  const stop = (code, why) => { out.stoppedBy = code; out.why = why; };
  let lastCost = 0;
  try {
    /* RULING 1: AlmiWorld's own products only, in the owner's queue order: AlmiOET first */
    const rank = (t) => { const i = queue.products.indexOf(t.id); return i < 0 ? 1e6 : i; }, topics = (await allTopics({ seo, groups })).filter((t) => t.owner === "almiworld" && !t.paused && (t.jobs ?? LIVE_JOBS).includes("top-pages")).sort((a, b) => rank(a) - rank(b));
    const facts = await cf.facts();
    for (const topic of topics) {
      if (out.stoppedBy) break;
      const have = new Map((await seo.lists(topic.id)).map((l) => [l.intent, l])), covered = new Map((await seo.coverage(topic.id)).map((c) => [c.intent, c]));
      for (const intent of intentsOf({ topic, facts })) {
        if (now() - start > budgetMs) { stop("TIME", "This run's time is used — the next run continues."); break; }
        const old = have.get(intent);
        /* saved once: reused until it is due again — the same list is never bought twice */
        if (old && daysBetween(old.day, today) < TOP_PAGES_CAPS.refreshDays && covered.get(intent)?.day >= old.day) continue;
        let list = old && daysBetween(old.day, today) < TOP_PAGES_CAPS.refreshDays ? old : null;
        if (!list) {
          /* the next search may not cross the total, even by a cent: the dearest search this account has been charged ($0.01, RR-359) is held back for it */
          const price = Math.max(SERP.pricePerSearch, lastCost);
          if (budget0.spent + out.cost + Math.max(price, TOP_PAGES_CAPS.searchReserveUsd) > caps.budget + 1e-9) { stop("BUDGET", `The top-pages budget is spent ($${caps.budget} in total) — the collector has stopped by itself.`); break; }
          if (spent.usd + out.cost + price > caps.usd + 1e-9) { stop("CAP", `Today's top-pages cap ($${caps.usd}) is reached — tomorrow continues.`); break; }
          let r = null; try { r = await fetchImpl(SERP.url, { method: "POST", headers: { "content-type": "application/json", authorization: auth }, body: JSON.stringify(serpTask(intent, { location: TOP_PAGES.location, language: TOP_PAGES.language })), signal: AbortSignal.timeout(30000) }); } catch { r = null; }
          const got = r ? readSerp(await r.json().catch(() => ({}))) : { ok: false, why: "DataForSEO did not answer" };
          out.searches++;
          if (!got.ok) { if (got.stop) { stop("DATAFORSEO", got.why); break; } continue; }
          const cost = got.cost || SERP.pricePerSearch; out.cost += cost; lastCost = cost;
          /* booked at once: a run that dies later never forgets money spent */
          await seo.addSpend(today, TOP_PAGES_JOB, { usd: cost, units: 1 });
          list = { topic: topic.id, intent, location: TOP_PAGES.location, language: TOP_PAGES.language, day: today, results: got.results.map((x) => ({ url: x.url, title: x.title })), paa: got.paa, related: got.related };
          await seo.putList(list); out.lists++;
        }
        /* each top page once a month; only its structure */
        const urls = list.results.map((x) => x.url).filter((u) => !/reddit\.com|quora\.com/.test(u)), kept = new Map((await seo.pages(urls)).map((p) => [p.url, p])), tops = [];
        for (const u of urls) {
          let p = kept.get(u);
          if (!p || daysBetween(p.day, today) >= TOP_PAGES_CAPS.refreshDays) {
            if (reader.requests() - reads0 + readsToday >= caps.reads) { stop("READS", `Today's ${caps.reads} page reads are used — tomorrow continues.`); break; }
            const h = await Promise.resolve(reader.raw(u, "text/html")).catch(() => null);
            p = !h ? { url: u, day: today, ok: false, why: "it refused to be read (robots.txt, a security check or an error) — never gone around", structure: null } : walled(h) ? { url: u, day: today, ok: false, why: "behind a login or a paywall — left unread", structure: null } : { url: u, day: today, ok: true, why: null, structure: pageStructure(h, { now: new Date(now()).toISOString() }) };
            await seo.putPage(p);
          }
          if (p.ok && p.structure) tops.push({ url: u, title: list.results.find((x) => x.url === u)?.title ?? "", headings: p.structure.headings, text: "" });
        }
        if (out.stoppedBy) break;
        const iso = new Date(now()).toISOString(), words = { subject: topic.subject, title: intent, now: iso, names: COUNTRIES }, coverage = cleanCoverage({ results: tops, paa: list.paa, ...words });
        /* G6: judged from the best result's own headings (its text is never kept) */
        const second = secondSearch({ best: tops[0] ?? null, paa: list.paa, coverage, subject: topic.subject, title: intent });
        await seo.putCoverage({ topic: topic.id, intent, day: list.day, coverage, second, read: tops.map((t) => t.url) }); out.coverage++;
      }
    }
    out.reads = reader.requests() - reads0;
    await seo.addSpend(today, TOP_PAGES_READS_JOB, { units: out.reads });
    if (kv) await recordRun(kv, "top-pages", today, { progress: out.lists + out.coverage, code: ["TIME", "CAP", "BUDGET"].includes(out.stoppedBy) ? null : out.stoppedBy, why: out.why }).catch(() => null);
    return out;
  } finally { if (kv) try { const [held] = await kv.run([["GET", "av:tp:lock"]]); if (held === id) await kv.run([["DEL", "av:tp:lock"]]); } catch { /* it expires by itself */ } }
}
