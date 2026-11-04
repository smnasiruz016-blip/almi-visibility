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
import { SERP, ONPAGE, QUEUE, serpTask, readSerp, notForReading, blocksOfContent, searchTermOf } from "../desktop/serp.mjs";
import { cleanCoverage, junkWhy } from "../desktop/coverage.mjs";
import { secondSearch } from "../desktop/recipe.mjs";
import { blocksOfHtml, blueprintOf } from "../desktop/blocks.mjs"; // RR-363: R15
import { COUNTRIES } from "../desktop/world.mjs";
import { ENV_NAMES, TOP_PAGES_CAPS, TOP_PAGES_JOB, TOP_PAGES_READS_JOB, topPagesCaps, topPagesBudget, collectorPlan, allTopics, useClientTemplates, LIVE_JOBS, clientTopicsToWork, planLimits, sharedFailHosts, FAIL_KEY, PAID_FAIL, TOP_PAGES_REUSED_JOB, TOP_PAGES_SKIPPED_JOB } from "./almiseo.mjs";
import { DEFAULT_QUEUE } from "./queue.mjs";
import { recordRun } from "./health.mjs";
import { readFailures, hostOf } from "../desktop/read-failures.mjs"; // RR-369b item 5

const PRODUCT_CATEGORY = Object.freeze({ oet: "exam", prep: "exam", pte: "exam", toefl: "exam", det: "exam", celpip: "exam" });
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
  return { headings, questions: headings.filter((h) => QUESTION.test(h) || h.endsWith("?")), tables: (main.match(/<table\b/gi) ?? []).length, lists: (main.match(/<(?:ul|ol)\b/gi) ?? []).length, words, date, droppedHeadings: dropped.length, blocks: blocksOfHtml(html) };
}
/** a paywall or a sign-in wall is left unread: nothing behind it is taken */
export const walled = (html) => /<(?:input)[^>]+type=["']password["']/i.test(String(html ?? "")) || /\b(subscribe to (?:continue|read)|sign in to (?:continue|read)|log in to (?:continue|read)|this content is for (?:members|subscribers)|premium members only)\b/i.test(String(html ?? ""));

/** the intents of a topic: what its plan will ask (its pages), without a question already asked for another page */
export function intentsOf({ topic, facts }) {
  const seen = new Set();
  return [...collectorPlan({ topic, facts }).map((p) => p.title), ...(topic.intents ?? [])].filter((t) => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}

/** one run. → { ok, day, searches, cost, reads, lists, coverage, stoppedBy, why } */
/* 🔴 RR-366 Part 7: the Standard queue. A list is posted and paid once; its task id is kept (kv) until its answer is collected, free, by this run or the next: never paid twice. Each top page's blocks through On-Page parsing, once, kept in tp_page; a page it cannot read goes to the polite reader as before */
const PENDING_KEY = "av:tp:pending";
export async function runTopPages({ seo, cf, kv = null, env = process.env, reader, fetchImpl = fetch, now = () => Date.now(), budgetMs = TOP_PAGES.runBudgetMs, groups = [], queue = DEFAULT_QUEUE, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), pollMs = QUEUE.everyMs }) {
  const start = now(), today = dayOf(start), id = randomBytes(8).toString("hex");
  if (!topPagesConnected(env)) return { ok: false, day: today, why: `The top-pages collector is off (${ENV_NAMES.topPagesOn}, ${ENV_NAMES.dfsLogin}, ${ENV_NAMES.dfsPassword}) — the owner's decision.` };
  if (kv) { const [locked] = await kv.run([["SET", "av:tp:lock", id, "NX", "EX", TOP_PAGES.lockSeconds]]); if (locked !== "OK") return { ok: false, day: today, why: "Another top-pages run is working — this one did nothing." }; }
  const caps = topPagesCaps(env), spent = await seo.spend(today, TOP_PAGES_JOB), readsToday = (await seo.spend(today, TOP_PAGES_READS_JOB)).units, budget0 = await topPagesBudget({ seo, env }), out = { ok: true, day: today, searches: 0, cost: 0, reads: 0, lists: 0, coverage: 0, stoppedBy: null, why: null };
  const auth = `Basic ${Buffer.from(`${env[ENV_NAMES.dfsLogin]}:${env[ENV_NAMES.dfsPassword]}`).toString("base64")}`;
  const reads0 = reader.requests();
  const stop = (code, why) => { out.stoppedBy = code; out.why = why; };
  let lastCost = 0, pending = {};
  if (kv) try { pending = JSON.parse((await kv.run([["GET", PENDING_KEY]]))[0] ?? "{}") ?? {}; } catch { pending = {}; }
  const keepPending = async () => { if (kv) await kv.run([["SET", PENDING_KEY, JSON.stringify(pending)]]).catch(() => null); };
  try {
    /* RULING 1: AlmiWorld's own products only, in the owner's queue order: AlmiOET first */
    const rank = (t) => { const i = queue.products.indexOf(t.id); return i < 0 ? 1e6 : i; }, all = await allTopics({ seo, groups }), limits = await planLimits(seo), month = today.slice(0, 7), topics = all.filter((t) => t.owner === "almiworld" && !t.paused && (t.jobs ?? LIVE_JOBS).includes("top-pages")).sort((a, b) => rank(a) - rank(b));
    /* RR-362 item 9 (R14): AlmiWorld's products first. Later, by the owner's switch, a client's subject too, after them and inside its plan's monthly limit; the client still sees pages only */
    if (env[ENV_NAMES.topPagesClients] === "1") topics.push(...await clientTopicsToWork({ seo, topics: all, today, limits }));
    const facts = await cf.facts();
    /* 🔴 RR-369b item 5: what is known to fail is not paid for; what fails here is remembered for everyone */
    const fails = readFailures({ own: await sharedFailHosts(seo).catch(() => ({})) }) /* its own failures add to what everyone reported */, hostsHere = {}, noteHere = (u, ok, why) => { fails.note(u, { ok, why }); const h = hostOf(u); if (h && !/too long/i.test(String(why ?? ""))) { hostsHere[h] ??= { ok: 0, fail: 0 }; hostsHere[h][ok ? "ok" : "fail"]++; } };
    for (let pass = 0; ; pass++) {
    for (const topic of topics) {
      if (out.stoppedBy) break;
      const have = new Map((await seo.lists(topic.id)).map((l) => [l.intent, l])), covered = new Map((await seo.coverage(topic.id)).map((c) => [c.intent, c])), payerLimit = topic.payer ? limits[topic.planOf?.[topic.payer]]?.usdMonth ?? 0 : null;
      for (const intent of intentsOf({ topic, facts })) {
        if (now() - start > budgetMs) { stop("TIME", "This run's time is used — the next run continues."); break; }
        const old = have.get(intent);
        /* saved once: reused until it is due again — the same list is never bought twice */
        if (old && daysBetween(old.day, today) < TOP_PAGES_CAPS.refreshDays && covered.get(intent)?.day >= old.day) continue;
        let list = old && daysBetween(old.day, today) < TOP_PAGES_CAPS.refreshDays ? old : null;
        if (!list) {
          const waiting = pending[`${topic.id}|${intent}`];
          let got = null;
          /* 🔴 RR-369 (owner, R13): an app bought this very search and saved it: reused free. Bought once, by whoever came first */
          const appKeys = [`${intent}||`, `${searchTermOf(intent)}||`], app = waiting ? null : (await seo.searches?.(topic.id, appKeys) ?? []).sort((a, b) => appKeys.indexOf(a.key) - appKeys.indexOf(b.key))[0]; /* the app searches what people search: a page's subject, not its whole heading */
          if (app && daysBetween(app.day, today) < TOP_PAGES_CAPS.refreshDays) { out.reused = (out.reused ?? 0) + 1; got = { ok: true, cost: 0, results: app.data.results ?? [], paa: app.data.paa ?? [], related: app.data.related ?? [] }; }
          else if (waiting) {
            let r = null; try { r = await fetchImpl(`${SERP.getUrl}${waiting.id}`, { method: "GET", headers: { authorization: auth }, signal: AbortSignal.timeout(30000) }); } catch { r = null; }
            const said = r ? await r.json().catch(() => null) : null, st = said?.tasks?.[0]?.status_code; if (!said || QUEUE.waiting.has(st)) continue;
            delete pending[`${topic.id}|${intent}`]; await keepPending(); got = readSerp(said); if (!got.ok) { if (got.stop) { stop("DATAFORSEO", got.why); break; } continue; } got.cost = 0; /* booked when it was posted */
          } else {
          /* the next search may not cross the total, even by a cent: the dearest search this account has been charged ($0.01, RR-359) is held back for it */
          const price = Math.max(SERP.pricePerSearch, lastCost);
          if (budget0.spent + out.cost + Math.max(price, TOP_PAGES_CAPS.searchReserveUsd) > caps.budget + 1e-9) { stop("BUDGET", `The top-pages budget is spent ($${caps.budget} in total) — the collector has stopped by itself.`); break; }
          if (topic.payer && (await seo.accountSpend(month, topic.payer)) + price > payerLimit + 1e-9) break; // this client's month is used: the next topic
          if (spent.usd + out.cost + price > caps.usd + 1e-9) { stop("CAP", `Today's top-pages cap ($${caps.usd}) is reached — tomorrow continues.`); break; }
          let r = null; try { r = await fetchImpl(SERP.url, { method: "POST", headers: { "content-type": "application/json", authorization: auth }, body: JSON.stringify(serpTask(intent, { location: TOP_PAGES.location, language: TOP_PAGES.language })), signal: AbortSignal.timeout(30000) }); } catch { r = null; }
          const said = r ? await r.json().catch(() => ({})) : null, task = said?.tasks?.[0];
          out.searches++;
          if (task?.status_code === QUEUE.created && task.id) { const cost = Number(task.cost) || SERP.pricePerSearch; out.cost += cost; lastCost = cost; pending[`${topic.id}|${intent}`] = { id: task.id, at: today }; await seo.addSpend(today, TOP_PAGES_JOB, { usd: cost, units: 1 }); if (topic.payer) await seo.addAccountSpend(month, topic.payer, cost); await keepPending(); continue; }
          got = said ? readSerp(said) : { ok: false, why: "DataForSEO did not answer" };
          if (!got.ok) { if (got.stop) { stop("DATAFORSEO", got.why); break; } continue; }
          const cost = got.cost || SERP.pricePerSearch; out.cost += cost; lastCost = cost;
          /* booked at once: a run that dies later never forgets money spent */
          await seo.addSpend(today, TOP_PAGES_JOB, { usd: cost, units: 1 }); if (topic.payer) await seo.addAccountSpend(month, topic.payer, cost);
          }
          list = { topic: topic.id, intent, location: TOP_PAGES.location, language: TOP_PAGES.language, day: today, results: got.results.map((x) => ({ url: x.url, title: x.title })), paa: got.paa, related: got.related };
          await seo.putList(list); out.lists++;
        }
        /* each top page once a month; only its structure */
        const urls = list.results.map((x) => x.url).filter((u) => !notForReading(u)), kept = new Map((await seo.pages(urls)).map((p) => [p.url, p])), tops = [];
        for (const u of urls) {
          let p = kept.get(u);
          if (!p || daysBetween(p.day, today) >= TOP_PAGES_CAPS.refreshDays) {
            /* RR-366: On-Page parsing first, inside the same money caps */
            let paidFail = false;
            if (!p?.structure?.paidFail && !String(p?.why ?? "").includes(PAID_FAIL) && !fails.skip(u) && budget0.spent + out.cost + ONPAGE.price <= caps.budget + 1e-9 && spent.usd + out.cost + ONPAGE.price <= caps.usd + 1e-9) {
              let said = null; try { const r = await fetchImpl(ONPAGE.url, { method: "POST", headers: { "content-type": "application/json", authorization: auth }, body: JSON.stringify([{ url: u, markdown_view: true, accept_language: "en" }]), signal: AbortSignal.timeout(60000) }); said = await r.json().catch(() => null); } catch { said = null; }
              const t = said?.tasks?.[0], item = t?.result?.[0]?.items?.[0];
              if (said?.status_code === 20000 && t?.status_code === 20000 && item?.page_content) { const c = Number(t.cost) || ONPAGE.price, b = blocksOfContent(item, { title: list.results.find((x) => x.url === u)?.title ?? null }), head = [...new Set(b.headings)].filter((x) => !junkWhy(x, { now: new Date(now()).toISOString(), names: COUNTRIES })).slice(0, TOP_PAGES.maxHeadings); out.cost += c; noteHere(u, true); await seo.addSpend(today, TOP_PAGES_JOB, { usd: c, units: 0 }); p = { url: u, day: today, ok: true, why: null, structure: { headings: head, questions: head.filter((x) => QUESTION.test(x) || x.endsWith("?")), tables: b.blocks.tables, lists: 0, words: b.blocks.words, date: null, droppedHeadings: 0, blocks: b.blocks } }; await seo.putPage(p); tops.push({ url: u, rank: list.results.findIndex((x) => x.url === u) + 1, blocks: b.blocks, title: list.results.find((x) => x.url === u)?.title ?? "", headings: head, text: "" }); continue; }
              /* a failed reading is charged too: booked, and remembered */
              { const c = Number(t?.cost) || 0; if (c > 0) { out.cost += c; await seo.addSpend(today, TOP_PAGES_JOB, { usd: c, units: 0 }); } noteHere(u, false, t?.status_message ?? said?.status_message); paidFail = !/too long/i.test(String(t?.status_message ?? "")); }
            } else out.readsSkipped = (out.readsSkipped ?? 0) + 1;
            if (reader.requests() - reads0 + readsToday >= caps.reads) { stop("READS", `Today's ${caps.reads} page reads are used — tomorrow continues.`); break; }
            const h = await Promise.resolve(reader.raw(u, "text/html")).catch(() => null);
            p = !h ? { url: u, day: today, ok: false, why: `it refused to be read (robots.txt, a security check or an error) — never gone around${paidFail ? `; ${PAID_FAIL}` : ""}`, structure: null } : walled(h) ? { url: u, day: today, ok: false, why: `behind a login or a paywall — left unread${paidFail ? `; ${PAID_FAIL}` : ""}`, structure: null } : { url: u, day: today, ok: true, why: null, structure: { ...pageStructure(h, { now: new Date(now()).toISOString() }), ...(paidFail ? { paidFail: true } : {}) } };
            await seo.putPage(p);
          }
          if (p.ok && p.structure) tops.push({ url: u, rank: list.results.findIndex((x) => x.url === u) + 1, blocks: p.structure.blocks ?? null, title: list.results.find((x) => x.url === u)?.title ?? "", headings: p.structure.headings, text: "" });
        }
        if (out.stoppedBy) break;
        const iso = new Date(now()).toISOString(), words = { subject: topic.subject, title: intent, now: iso, names: COUNTRIES }, coverage = cleanCoverage({ results: tops, paa: list.paa, ...words });
        /* G6: judged from the best result's own headings (its text is never kept) */
        const second = secondSearch({ best: tops[0] ?? null, paa: list.paa, coverage, subject: topic.subject, title: intent });
        await seo.putCoverage({ topic: topic.id, intent, day: list.day, coverage, second, read: tops.map((t) => t.url), blueprint: blueprintOf({ tops, category: PRODUCT_CATEGORY[topic.id] ?? "general", on: list.day }) }); out.coverage++;
      }
    }
    /* what is still being prepared: looked for again while this run has time; the rest waits for the next run, already paid */
    if (out.stoppedBy || !Object.keys(pending).length || now() - start > budgetMs - pollMs) break;
    await sleep(pollMs);
    }
    out.reads = reader.requests() - reads0;
    await seo.addSpend(today, TOP_PAGES_READS_JOB, { units: out.reads });
    /* 🔴 RR-369b item 4: what it reused and what it did not pay for stay readable */
    if (out.reused) await seo.addSpend(today, TOP_PAGES_REUSED_JOB, { units: out.reused }); if (out.readsSkipped) await seo.addSpend(today, TOP_PAGES_SKIPPED_JOB, { units: out.readsSkipped });
    { const was = new Map(((await seo.failHosts?.()) ?? []).filter((r) => r.topic === "fail:collector").map((r) => [String(r.key).slice(FAIL_KEY.length), r.data])), rows = Object.entries(hostsHere).map(([h, v]) => ({ topic: "fail:collector", key: `${FAIL_KEY}${h}`, kind: "failhost", day: today, data: { ok: (was.get(h)?.ok ?? 0) + v.ok, fail: (was.get(h)?.fail ?? 0) + v.fail } })); if (rows.length) await seo.putSearches?.(rows, { at: new Date(now()).toISOString() }); }
    if (kv) await recordRun(kv, "top-pages", today, { progress: out.lists + out.coverage, reused: out.reused ?? 0, readsSkipped: out.readsSkipped ?? 0, code: ["TIME", "CAP", "BUDGET"].includes(out.stoppedBy) ? null : out.stoppedBy, why: out.why }).catch(() => null);
    return out;
  } finally { if (kv) try { const [held] = await kv.run([["GET", "av:tp:lock"]]); if (held === id) await kv.run([["DEL", "av:tp:lock"]]); } catch { /* it expires by itself */ } }
}
