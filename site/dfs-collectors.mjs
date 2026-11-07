/**
 * 🔴 RR-388 PART B2 · THE TEN DATAFORSEO COLLECTORS (A2 B5 C5 D1 D2 D5 F1 F2 G1 I2 of ALMIWORLD_COLLECTORS_MAP_2026-11.md), on the AlmiSEO
 * Data server, through AlmiWorld's OWN server-side DataForSEO account (the top-pages account: ENV_NAMES.dfsLogin / dfsPassword).
 *   · EACH IS OFF until the owner switches it on (/owner/almiseo → "DataForSEO collectors"); nothing is bought while it is off.
 *   · Each shows its cost per run from DataForSEO's OWN price page (PRICES: the page and the day it was read). A price older than
 *     PRICE_MAX_DAYS, or none, is "price not confirmed": the switch refuses and a run buys nothing.
 *   · ALL STAY INSIDE THE EXISTING DATAFORSEO CAPS, shared with the top-pages collector: $1 a day and $50 in total (topPagesCaps). The most a
 *     task can cost is counted BEFORE it is sent; a task that could pass either cap is not sent and the run stops. The caps are never raised.
 *   · Each has its own job line (dfs-<id>), its own daily cap (DFS.perDayUsd, inside the shared $1) and its own refresh days.
 *   · Built and proved against DataForSEO's free SANDBOX only (sandbox.dataforseo.com: same shapes, no charge). ALMISEO_DATAFORSEO_SANDBOX=1, or
 *     the owner's "Test in the sandbox" button, sends every call there and books $0.
 *   · Official API only (docs.dataforseo.com/v3). Only fields are kept, never a page's text. Customer text never names DataForSEO.
 */
import { randomBytes } from "node:crypto";
import { ENV_NAMES, topPagesCaps } from "./almiseo.mjs";

export const DFS_LIVE = "https://api.dataforseo.com/v3", DFS_SANDBOX = "https://sandbox.dataforseo.com/v3";
export const DFS = Object.freeze({ switches: "dfs-switches", pending: "dfs-pending", done: "dfs-done", last: "dfs-last-run", sandboxEnv: "ALMISEO_DATAFORSEO_SANDBOX", lockSeconds: 290, perDayUsd: 0.35, budgetMs: 240000 });
export const PRICE_MAX_DAYS = 90;
const dayOf = (t) => new Date(t).toISOString().slice(0, 10), daysBetween = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 864e5);
const r4 = (x) => Math.round(x * 1e4) / 1e4;

/** DataForSEO's own price pages, read 7 Nov 2026 with the app's official reader (robots.txt obeyed). task: per task; item: per item/row/keyword/click */
export const PRICES = Object.freeze({
  labs: { task: 0.012, item: 0.00012, url: "https://dataforseo.com/pricing/dataforseo-labs/dataforseo-google-api", on: "2026-11-07", says: "DataForSEO Labs Google endpoints: per task + per item $0.012 + $0.00012" },
  organicStandard: { task: 0.0006, item: 0.00015, url: "https://dataforseo.com/pricing/google-serp/google-organic-serp-api", on: "2026-11-07", says: "Google Organic, Standard queue: $0.0006 per SERP (10 results); people_also_ask_click_depth +$0.00015 per click" },
  technologies: { task: 0.012, item: 0, url: "https://dataforseo.com/pricing/domain-analytics-api/domain-technologies-api", on: "2026-11-07", says: "Domain Technologies: a flat $0.012 per task, no separate result fee" },
  content: { task: 0.024, item: 0.000036, url: "https://dataforseo.com/pricing/content-analysis-api/content-analysis", on: "2026-11-07", says: "All Content Analysis endpoints: per task + per row $0.024 + $0.000036" },
  aiVolume: { task: 0.01, item: 0.0001, url: "https://dataforseo.com/pricing/ai-optimization/ai-keyword-search-volume", on: "2026-11-07", says: "AI Keyword Search Volume: per task + per row $0.01 + $0.0001" },
  shopping: { task: 0.001, item: 0, url: "https://dataforseo.com/pricing/merchant/google-shopping-api", on: "2026-11-07", says: "Google Shopping Products, Standard queue: $0.001 per SERP (40 products)" },
});
/** a price the owner may trust today, or why not */
export const priceOf = (c, today, prices = PRICES) => { const p = prices[c.price]; if (!p) return { ok: false, why: "price not confirmed" }; if (daysBetween(p.on, today) > PRICE_MAX_DAYS) return { ok: false, why: `price not confirmed (read ${p.on}, more than ${PRICE_MAX_DAYS} days ago)` }; return { ok: true, ...p }; };
/** the most one task can cost, from the price page: task fee + the most items it may return */
export const worstOf = (c, prices = PRICES) => { const p = prices[c.price]; return p ? r4(p.task + p.item * c.items) : Infinity; };

const kwTask = (words) => ({ keywords: words, location_name: "United States", language_code: "en" });
/**
 * the ten. mode live: one POST answers; standard: posted (paid), collected free next run. perRun: the most tasks one run sends; runsPerMonth:
 * the planned rate (refreshDays apart); items: the most items one task may return (the price's per-item part)
 */
export const DFS_COLLECTORS = Object.freeze([
  { id: "A2", title: "Keyword difficulty", gives: "How hard each keyword is to rank for (0–100), for every product's keyword list: the plan picks the winnable keywords first.", products: "all AlmiWorld products", path: "/dataforseo_labs/google/bulk_keyword_difficulty/live", mode: "live", price: "labs", items: 100, perRun: 10, refreshDays: 30, input: "keywords" },
  { id: "B5", title: "Question trees", gives: "The questions under each question (People Also Ask, two levels), grouped by our own question grouping, for Q&A pages.", products: "AlmiOET, AlmiVisibility, the exam and career products", path: "/serp/google/organic", mode: "standard", price: "organicStandard", items: 12, perRun: 10, refreshDays: 60, input: "keyword", extra: { depth: 10, people_also_ask_click_depth: 2 } },
  { id: "C5", title: "Videos, images, news, shopping and jobs in results", gives: "Which kinds of results Google shows for each topic, so each page is made in the shape that wins (a video, a table, a list).", products: "all AlmiWorld products", path: "/serp/google/organic", mode: "standard", price: "organicStandard", items: 0, perRun: 10, refreshDays: 60, input: "keyword", extra: { depth: 10 } },
  { id: "D1", title: "Keywords a site ranks for", gives: "The keywords each of our own sites already ranks for, with the position and the page.", products: "AlmiOET, AlmiVisibility, almiworld.com", path: "/dataforseo_labs/google/ranked_keywords/live", mode: "live", price: "labs", items: 100, perRun: 3, refreshDays: 30, input: "ownSite", extra: { limit: 100 } },
  { id: "D2", title: "Traffic estimate", gives: "An estimate of each site's search traffic (ours and the top sites of each topic), labelled as an estimate.", products: "AlmiVisibility's competitor screen", path: "/dataforseo_labs/google/bulk_traffic_estimation/live", mode: "live", price: "labs", items: 100, perRun: 1, refreshDays: 30, input: "domains" },
  { id: "D5", title: "Technologies a site uses", gives: "What each top site of a topic is built with (its site builder, shop, analytics).", products: "AlmiVisibility's competitor screen", path: "/domain_analytics/technologies/domain_technologies/live", mode: "live", price: "technologies", items: 0, perRun: 10, refreshDays: 180, input: "domain" },
  { id: "F1", title: "Brand mentions with sentiment", gives: "How often each of our brands is mentioned on the web, and whether positively or negatively.", products: "AlmiOET, AlmiVisibility, almiworld.com", path: "/content_analysis/summary/live", mode: "live", price: "content", items: 1, perRun: 3, refreshDays: 30, input: "brand" },
  { id: "F2", title: "Content by topic", gives: "Recent pages written on each topic (address, title and date only), so our pages answer what others miss.", products: "all AlmiWorld products", path: "/content_analysis/search/live", mode: "live", price: "content", items: 100, perRun: 10, refreshDays: 30, input: "keyword", extra: { limit: 100 } },
  { id: "G1", title: "AI search volume", gives: "How often each keyword is asked of AI assistants, next to its Google volume.", products: "all AlmiWorld products", path: "/ai_optimization/ai_keyword_data/keywords_search_volume/live", mode: "live", price: "aiVolume", items: 200, perRun: 10, refreshDays: 30, input: "keywords" },
  { id: "I2", title: "Google Shopping", gives: "Products, prices and sellers on Google Shopping, only for a topic that sells a product.", products: "none of today's products (no product sells goods): 0 runs planned", path: "/merchant/google/products", mode: "standard", price: "shopping", items: 0, perRun: 10, refreshDays: 30, input: "shopping" },
].map((c) => Object.freeze(c)));
export const DFS_IDS = Object.freeze(DFS_COLLECTORS.map((c) => c.id));
export const jobOf = (id) => `dfs-${id.toLowerCase()}`;
const byId = (id) => DFS_COLLECTORS.find((c) => c.id === id) ?? null;

/** our own sites (D1, F1): the product, its address, its brand words */
export const OWN_SITES = Object.freeze([{ topic: "oet", site: "almioet.almiworld.com", brand: "AlmiOET" }, { topic: "visibility", site: "almivisibility.almiworld.com", brand: "AlmiVisibility" }, { topic: "almiworld", site: "almiworld.com", brand: "AlmiWorld" }]);

/** the owner's table: each collector, what it gives, cost per run and per month at the planned rate, and the TOTAL if all are on */
export function dfsTable({ today, switches = {}, prices = PRICES, planned = {} } = {}) {
  const rows = DFS_COLLECTORS.map((c) => { const p = priceOf(c, today, prices), tasks = planned[c.id] ?? (c.input === "shopping" ? 0 : c.perRun), run = p.ok ? r4(worstOf(c, prices) * tasks) : null, perMonth = run === null ? null : r4(run * 30 / c.refreshDays); return { id: c.id, title: c.title, gives: c.gives, products: c.products, on: switches[c.id] === true && p.ok, price: p.ok ? { says: p.says, url: p.url, on: p.on } : null, priceWhy: p.ok ? null : p.why, tasksPerRun: tasks, perRunUsd: run, everyDays: c.refreshDays, perMonthUsd: perMonth }; });
  const sum = (k) => r4(rows.reduce((t, r) => t + (r[k] ?? 0), 0));
  return { rows, totalPerRunUsd: sum("perRunUsd"), totalPerMonthUsd: sum("perMonthUsd"), unconfirmed: rows.filter((r) => !r.price).map((r) => r.id) };
}
/** the owner's switch: refused while the price is not confirmed */
export async function setSwitch({ seo, id, on, today, at, prices = PRICES }) {
  const c = byId(id); if (!c) return { ok: false, why: "No such collector." };
  if (on && !priceOf(c, today, prices).ok) return { ok: false, why: `${c.id} ${c.title}: price not confirmed — it stays off.` };
  const sw = { ...((await seo.setting(DFS.switches).catch(() => null)) ?? {}) }; sw[c.id] = on === true; await seo.setSetting(DFS.switches, sw, { at });
  return { ok: true, why: `${c.id} ${c.title} is ${on ? "ON" : "OFF"}.` };
}

/** all DataForSEO money today and in total: the top-pages collector and these ten share the same caps */
export const dfsJob = (job) => job === "top-pages" || String(job).startsWith("dfs-");
export async function dfsMoney(seo, today) { const rows = (await seo.spendSince("2000-01-01").catch(() => [])) ?? [], ours = rows.filter((r) => dfsJob(r.job)); return { today: r4(ours.filter((r) => r.day === today).reduce((t, r) => t + (Number(r.usd) || 0), 0)), total: r4(ours.reduce((t, r) => t + (Number(r.usd) || 0), 0)), byJobToday: Object.fromEntries(DFS_IDS.map((id) => [id, r4(ours.filter((r) => r.day === today && r.job === jobOf(id)).reduce((t, r) => t + (Number(r.usd) || 0), 0))])) }; }
/** may one more task be bought? (before it is sent) */
export function mayBuy({ money, caps, worst, job, runSpent = 0 }) {
  if (!(Number.isFinite(worst))) return { ok: false, code: "PRICE", why: "price not confirmed" };
  if (money.total + runSpent + worst > caps.budget + 1e-9) return { ok: false, code: "BUDGET", why: `The DataForSEO total ($${caps.budget}) would be passed: stopped by itself.` };
  if (money.today + runSpent + worst > caps.usd + 1e-9) return { ok: false, code: "CAP", why: `Today's DataForSEO cap ($${caps.usd}) would be passed: tomorrow continues.` };
  if ((money.byJobToday[job] ?? 0) + runSpent + worst > DFS.perDayUsd + 1e-9) return { ok: false, code: "JOB_CAP", why: `This collector's daily cap ($${DFS.perDayUsd}) is reached.` };
  return { ok: true };
}

/** the tasks a collector would send, from the topics the server holds (AlmiWorld's own, not paused) */
export function tasksFor(c, { topics = [], lists = {} } = {}) {
  const own = topics.filter((t) => t.owner === "almiworld" && !t.paused), seedsOf = (t) => [...new Set([t.subject, ...(t.seeds ?? []), ...(t.intents ?? [])].filter(Boolean).map((s) => String(s).toLowerCase().trim()))];
  const hosts = (t) => [...new Set((lists[t.id] ?? []).flatMap((l) => (l.results ?? []).map((r) => { try { return new URL(r.url ?? r).hostname.replace(/^www\./, ""); } catch { return null; } })).filter(Boolean))];
  let out = [];
  if (c.input === "keywords") out = own.map((t) => ({ key: t.id, task: kwTask(seedsOf(t).slice(0, c.items)) })).filter((x) => x.task.keywords.length);
  else if (c.input === "keyword") out = own.flatMap((t) => seedsOf(t).slice(0, 1).map((k) => ({ key: `${t.id}|${k}`, task: { keyword: k, location_name: "United States", language_code: "en", ...(c.extra ?? {}) } })));
  else if (c.input === "ownSite") out = OWN_SITES.map((s) => ({ key: s.site, task: { target: s.site, location_name: "United States", language_code: "en", ...(c.extra ?? {}) } }));
  else if (c.input === "brand") out = OWN_SITES.map((s) => ({ key: s.brand, task: { keyword: s.brand } }));
  else if (c.input === "domains") { const ds = [...new Set([...OWN_SITES.map((s) => s.site), ...own.flatMap(hosts)])].slice(0, c.items); out = ds.length ? [{ key: "all", task: { targets: ds, location_name: "United States", language_code: "en" } }] : []; }
  else if (c.input === "domain") out = [...new Set(own.flatMap(hosts))].map((d) => ({ key: d, task: { target: d } }));
  else if (c.input === "shopping") out = own.filter((t) => t.sells === true).flatMap((t) => seedsOf(t).slice(0, 1).map((k) => ({ key: `${t.id}|${k}`, task: { keyword: k, location_name: "United States", language_code: "en" } })));
  return out;
}

/** a documented answer → only the fields kept (never a page's text) */
export function rowsOf(c, result, { key, on }) {
  const r0 = (result ?? [])[0] ?? {}, items = r0.items ?? [], row = (k, data) => ({ topic: `dfs:${c.id}`, key: `${key}|${k}`, kind: jobOf(c.id), day: on, data: { ...data, collector: c.id, on } });
  switch (c.id) {
    case "A2": return items.filter((i) => i?.keyword).map((i) => row(i.keyword, { keyword: i.keyword, difficulty: i.keyword_difficulty ?? null }));
    case "B5": { const qs = []; for (const i of items) if (i?.type === "people_also_ask") for (const e of i.items ?? []) if (e?.title) qs.push(e.title); return [row("questions", { keyword: r0.keyword ?? null, questions: [...new Set(qs)] })]; }
    case "C5": { const kinds = {}; for (const t of r0.item_types ?? items.map((i) => i?.type)) if (t) kinds[t] = (kinds[t] ?? 0) + 1; return [row("features", { keyword: r0.keyword ?? null, kinds, video: Boolean(kinds.video), images: Boolean(kinds.images), news: Boolean(kinds.top_stories), shopping: Boolean(kinds.shopping || kinds.popular_products), jobs: Boolean(kinds.jobs) })]; }
    case "D1": return items.map((i) => ({ k: i?.keyword_data?.keyword, s: i?.ranked_serp_element?.serp_item })).filter((x) => x.k).map((x) => row(x.k, { keyword: x.k, position: x.s?.rank_absolute ?? null, url: x.s?.url ?? null }));
    case "D2": return items.filter((i) => i?.target).map((i) => row(i.target, { site: i.target, estimate: i.metrics?.organic?.etv ?? null, label: "an estimate, not measured traffic" }));
    case "D5": return [row("tech", { site: r0.domain ?? key, technologies: r0.technologies ?? {} })];
    case "F1": return [row("mentions", { brand: key, mentions: r0.total_count ?? null, sentiment: r0.connotation_types ?? null, connotations: r0.sentiment_connotations ?? null })];
    case "F2": return items.filter((i) => i?.url).map((i) => row(i.url, { url: i.url, title: i.content_info?.title ?? i.title ?? null, date: i.content_info?.date_published ?? i.fetch_time ?? null }));
    case "G1": return items.filter((i) => i?.keyword).map((i) => row(i.keyword, { keyword: i.keyword, aiVolume: i.ai_search_volume ?? null }));
    case "I2": return items.filter((i) => i?.title).map((i) => row(i.product_id ?? i.title, { title: i.title, price: i.price ?? null, currency: i.currency ?? null, seller: i.seller ?? null, url: i.url ?? null }));
    default: return [];
  }
}
const taskOf = (a) => { if (!a || a.status_code !== 20000) return { ok: false, why: `DataForSEO refused (${a?.status_code ?? "no answer"}${a?.status_message ? `: ${a.status_message}` : ""})`, stop: [40100, 40200, 40201, 40210, 40501].includes(a?.status_code) }; const t = (a.tasks ?? [])[0]; if (!t) return { ok: false, why: "no task back" }; const cost = Number(t.cost) || 0; if (t.status_code === 20000) return { ok: true, cost, result: t.result ?? [], id: t.id }; if (t.status_code === 20100) return { ok: true, queued: true, cost, id: t.id }; if (t.status_code === 40601 || t.status_code === 40602) return { ok: false, waiting: true, cost, id: t.id }; return { ok: false, cost, why: `refused (${t.status_code}${t.status_message ? `: ${t.status_message}` : ""})` }; };

/** one run of every collector that is ON and due. → { ok, day, sandbox, sent, collected, kept, usd, byCollector, stoppedBy, why } */
export async function runDfs({ seo, kv = null, env = process.env, fetchImpl = fetch, now = () => Date.now(), topics = null, sandbox = env[DFS.sandboxEnv] === "1", only = null, prices = PRICES }) {
  const start = now(), today = dayOf(start), at = new Date(start).toISOString(), out = { ok: true, day: today, sandbox, sent: 0, collected: 0, kept: 0, usd: 0, byCollector: {}, stoppedBy: null, why: null };
  if (!env[ENV_NAMES.dfsLogin] || !env[ENV_NAMES.dfsPassword]) return { ...out, ok: false, why: `No DataForSEO account on the server (${ENV_NAMES.dfsLogin}, ${ENV_NAMES.dfsPassword}): nothing was sent.` };
  const sw = (await seo.setting(DFS.switches).catch(() => null)) ?? {}, on = DFS_COLLECTORS.filter((c) => (only ? only.includes(c.id) : sw[c.id] === true) && priceOf(c, today, prices).ok);
  if (!on.length) return { ...out, why: only ? "price not confirmed" : "Every DataForSEO collector is off: nothing was sent." };
  const lockId = randomBytes(8).toString("hex");
  if (kv) { const [locked] = await kv.run([["SET", "av:dfs:lock", lockId, "NX", "EX", DFS.lockSeconds]]); if (locked !== "OK") return { ...out, ok: false, why: "Another DataForSEO collector run is working: this one did nothing." }; }
  try {
    const base = sandbox ? DFS_SANDBOX : DFS_LIVE, auth = `Basic ${Buffer.from(`${env[ENV_NAMES.dfsLogin]}:${env[ENV_NAMES.dfsPassword]}`).toString("base64")}`;
    const call = async (path, body, method = "POST") => { try { const r = await fetchImpl(`${base}${path}`, { method, headers: { authorization: auth, "content-type": "application/json" }, ...(method === "POST" ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) }); return await r.json().catch(() => ({ status_code: r.status })); } catch { return null; } };
    const caps = topPagesCaps(env), money = await dfsMoney(seo, today), done = (await seo.setting(DFS.done).catch(() => null)) ?? {}, pending = (await seo.setting(DFS.pending).catch(() => null)) ?? {};
    const all = topics ?? (await seo.topics().catch(() => [])), lists = {}; for (const t of all) if (t.owner === "almiworld") lists[t.id] = await seo.lists(t.id).catch(() => []);
    const book = async (c, cost) => { if (sandbox || !(cost > 0)) return; out.usd = r4(out.usd + cost); money.today = r4(money.today + cost); money.total = r4(money.total + cost); money.byJobToday[jobOf(c.id)] = r4((money.byJobToday[jobOf(c.id)] ?? 0) + cost); await seo.addSpend(today, jobOf(c.id), { usd: cost, units: 1 }); };
    for (const c of on) {
      const mine = (out.byCollector[c.id] = { sent: 0, collected: 0, kept: 0, usd: 0, why: null }), worst = worstOf(c, prices);
      /* a standard task posted before is collected first: free */
      for (const [k, p] of Object.entries(pending).filter(([k]) => k.startsWith(`${c.id}|`))) {
        const g = taskOf(await call(`${c.path}/task_get/advanced/${p.id}`, null, "GET"));
        if (g.waiting) continue; delete pending[k];
        if (g.ok && g.result) { const rows = rowsOf(c, g.result, { key: k.slice(c.id.length + 1), on: today }); if (rows.length) await seo.putSearches(rows, { at }); mine.kept += rows.length; out.kept += rows.length; mine.collected++; out.collected++; done[k] = today; }
      }
      for (const { key, task } of tasksFor(c, { topics: all, lists })) {
        if (mine.sent >= c.perRun || out.stoppedBy) break; if (now() - start > DFS.budgetMs) { out.stoppedBy = "TIME"; out.why = "This run's time is used: the next run continues."; break; }
        const k = `${c.id}|${key}`; if (pending[k] || (done[k] && daysBetween(done[k], today) < c.refreshDays)) continue;
        const g = sandbox ? { ok: true } : mayBuy({ money, caps, worst, job: jobOf(c.id) }); if (!g.ok) { if (g.code === "JOB_CAP") { mine.why = g.why; break; } out.stoppedBy = g.code; out.why = g.why; break; }
        const path = c.mode === "standard" ? `${c.path}/task_post` : c.path, t = taskOf(await call(path, [task])); mine.sent++; out.sent++;
        await book(c, t.cost ?? 0); mine.usd = r4(mine.usd + (sandbox ? 0 : t.cost ?? 0));
        if (!t.ok) { mine.why = t.why ?? mine.why; if (t.stop) { out.stoppedBy = "DATAFORSEO"; out.why = t.why; break; } continue; }
        if (c.mode === "standard") { pending[k] = { id: t.id, on: today }; continue; }
        const rows = rowsOf(c, t.result, { key, on: today }); if (rows.length) await seo.putSearches(rows, { at }); mine.kept += rows.length; out.kept += rows.length; done[k] = today;
      }
    }
    await seo.setSetting(DFS.done, done, { at }); await seo.setSetting(DFS.pending, pending, { at });
    await seo.setSetting(DFS.last, { on: at, ...out }, { at }).catch(() => null);
    return out;
  } finally { if (kv) await kv.run([["DEL", "av:dfs:lock"]]).catch(() => null); }
}
