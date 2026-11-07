/**
 * RR-388 PART B2 · the ten DataForSEO collectors (A2 B5 C5 D1 D2 D5 F1 F2 G1 I2): each OFF until switched on, each priced from DataForSEO's own
 * page (source + day; "price not confirmed" refuses), each inside the shared caps ($1 a day, $50 in total, with top-pages), built against the
 * SANDBOX's documented answer shapes only. No call here leaves the machine: fetch is a stand-in.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runDfs, dfsTable, setSwitch, priceOf, worstOf, mayBuy, rowsOf, tasksFor, DFS, DFS_COLLECTORS, DFS_IDS, DFS_SANDBOX, DFS_LIVE, PRICES, PRICE_MAX_DAYS, jobOf } from "../site/dfs-collectors.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";
import { topPagesBudget } from "../site/almiseo.mjs";
import { MC_CRONS } from "../tools/bundle-site.mjs";

const ENV = { ALMISEO_DATAFORSEO_LOGIN: "l", ALMISEO_DATAFORSEO_PASSWORD: "p" }, NOW = () => Date.parse("2026-11-07T08:00:00Z"), TODAY = "2026-11-07";
const TOPICS = [{ id: "oet", name: "AlmiOET", subject: "OET", seeds: ["oet exam", "oet nursing"], owner: "almiworld" }, { id: "visibility", name: "AlmiVisibility", subject: "seo tool", seeds: ["seo tool"], owner: "almiworld" }, { id: "x", name: "client", seeds: ["client words"], owner: "client" }];
/* the documented answer shapes (docs.dataforseo.com/v3, the sandbox gives the same shapes with made-up values) */
const RESULT = {
  A2: [{ items: [{ keyword: "oet exam", keyword_difficulty: 34 }] }],
  D1: [{ items: [{ keyword_data: { keyword: "oet practice" }, ranked_serp_element: { serp_item: { rank_absolute: 7, url: "https://almioet.almiworld.com/" } } }] }],
  D2: [{ items: [{ target: "almioet.almiworld.com", metrics: { organic: { etv: 120.5 } } }] }],
  D5: [{ domain: "oet.com", technologies: { content: { cms: ["WordPress"] } } }],
  F1: [{ total_count: 42, connotation_types: { positive: 30, negative: 2, neutral: 10 }, sentiment_connotations: { happiness: 5 } }],
  F2: [{ items: [{ url: "https://a.example/p", content_info: { title: "A page", date_published: "2026-10-01", main_text: "NEVER KEPT" } }] }],
  G1: [{ items: [{ keyword: "oet exam", ai_search_volume: 880 }] }],
  B5: [{ keyword: "oet exam", items: [{ type: "people_also_ask", items: [{ title: "Is OET hard?" }, { title: "How long is OET valid?" }] }, { type: "organic" }] }],
  C5: [{ keyword: "oet exam", item_types: ["organic", "video", "people_also_ask", "images"], items: [] }],
};
const idOf = (path) => DFS_COLLECTORS.find((c) => path.includes(c.path))?.id;
const fx = (asked, { cost = 0.01, status = 20000 } = {}) => async (u, init) => {
  asked.push({ u, method: init?.method, body: init?.body ? JSON.parse(init.body) : null });
  const path = u.replace(/^https:\/\/[^/]+\/v3/, ""), id = idOf(path);
  if (status !== 20000) return new Response(JSON.stringify({ status_code: status, status_message: "refused", tasks: [] }), { status: 200 });
  if (path.endsWith("/task_post")) return new Response(JSON.stringify({ status_code: 20000, tasks: [{ id: `t-${id}`, status_code: 20100, cost }] }), { status: 200 });
  if (path.includes("/task_get/advanced/")) return new Response(JSON.stringify({ status_code: 20000, tasks: [{ id: "t", status_code: 20000, cost: 0, result: RESULT[id] }] }), { status: 200 });
  return new Response(JSON.stringify({ status_code: 20000, tasks: [{ id: "t", status_code: 20000, cost, result: RESULT[id] ?? [] }] }), { status: 200 });
};

test("1 · OFF BY DEFAULT: nothing is sent while every switch is off, or without the server's account", async () => {
  const seo = seoMemoryStore(), asked = [];
  const r = await runDfs({ seo, env: ENV, fetchImpl: fx(asked), now: NOW, topics: TOPICS }); assert.equal(r.sent, 0); assert.equal(asked.length, 0); assert.match(r.why, /off/);
  assert.equal((await runDfs({ seo, env: {}, fetchImpl: fx(asked), now: NOW, topics: TOPICS })).ok, false); assert.equal(asked.length, 0);
  assert.deepEqual(DFS_IDS, ["A2", "B5", "C5", "D1", "D2", "D5", "F1", "F2", "G1", "I2"]);
});

test("2 · THE PRICE: each from DataForSEO's own page with its day; stale or missing = 'price not confirmed', the switch refuses and stays off", async () => {
  for (const c of DFS_COLLECTORS) { const p = priceOf(c, TODAY); assert.equal(p.ok, true, c.id); assert.match(p.url, /^https:\/\/dataforseo\.com\/pricing\//); assert.equal(p.on, "2026-11-07"); assert.ok(Number.isFinite(worstOf(c))); }
  assert.equal(worstOf(DFS_COLLECTORS.find((c) => c.id === "A2")), 0.024, "$0.012 + 100 × $0.00012");
  const seo = seoMemoryStore(), late = new Date(Date.parse(`${PRICES.labs.on}T00:00:00Z`) + (PRICE_MAX_DAYS + 1) * 864e5).toISOString().slice(0, 10);
  const no = await setSwitch({ seo, id: "A2", on: true, today: late, at: "x" }); assert.equal(no.ok, false); assert.match(no.why, /price not confirmed/);
  assert.equal((await seo.setting(DFS.switches))?.A2 ?? false, false, "it stays off");
  const t = dfsTable({ today: TODAY, prices: { ...PRICES, labs: undefined } }); assert.deepEqual(t.unconfirmed, ["A2", "D1", "D2"]); assert.equal(t.rows.find((r) => r.id === "A2").priceWhy, "price not confirmed");
  /* a run never buys an unconfirmed collector even if its switch was on */
  await seo.setSetting(DFS.switches, { A2: true }); const asked = []; const r = await runDfs({ seo, env: ENV, fetchImpl: fx(asked), now: NOW, topics: TOPICS, prices: { ...PRICES, labs: undefined } }); assert.equal(asked.length, 0); assert.equal(r.sent, 0);
});

test("3 · THE OWNER'S TABLE: each collector, what it gives, per run and per month, and the TOTAL if all are on", () => {
  const t = dfsTable({ today: TODAY });
  assert.equal(t.rows.length, 10); for (const r of t.rows) { assert.ok(r.gives && r.products); assert.ok(r.perRunUsd !== null && r.perMonthUsd !== null); }
  assert.equal(t.totalPerMonthUsd, Math.round(t.rows.reduce((a, r) => a + r.perMonthUsd, 0) * 1e4) / 1e4);
  assert.ok(t.totalPerMonthUsd < 2, `all ten on cost about $${t.totalPerMonthUsd} a month`);
  assert.equal(t.rows.find((r) => r.id === "I2").tasksPerRun, 0, "no product sells goods: 0 planned");
});

test("4 · LIVE collectors: switched on → sent once, only fields kept (never a page's text), its own spend line; not again inside its refresh days", async () => {
  const seo = seoMemoryStore(), asked = [];
  await seo.setSetting(DFS.switches, { A2: true, F2: true, G1: true, D1: true });
  const r = await runDfs({ seo, env: ENV, fetchImpl: fx(asked), now: NOW, topics: TOPICS });
  assert.equal(r.ok, true); assert.ok(asked.every((a) => a.u.startsWith(DFS_LIVE)));
  assert.equal(asked.filter((a) => a.u.includes("bulk_keyword_difficulty")).length, 2, "one task per own topic; the client's topic is not paid for");
  assert.ok(!JSON.stringify(asked).includes("client words"));
  const kept = await seo.searches("dfs:F2", ["oet|https://a.example/p"]).catch(() => null);
  assert.ok(!JSON.stringify(await seo.spendSince("2000-01-01")).includes("NEVER KEPT"));
  const spend = await seo.spendSince(TODAY); assert.ok(spend.some((x) => x.job === jobOf("A2") && x.usd > 0)); assert.ok(r.usd > 0);
  const again = []; await runDfs({ seo, env: ENV, fetchImpl: fx(again), now: () => Date.parse("2026-11-20T08:00:00Z"), topics: TOPICS }); assert.equal(again.length, 0, "nothing again inside 30 days");
  const rows = rowsOf(DFS_COLLECTORS.find((c) => c.id === "F2"), RESULT.F2, { key: "k", on: TODAY }); assert.deepEqual(Object.keys(rows[0].data).sort(), ["collector", "date", "on", "title", "url"]); void kept;
});

test("5 · STANDARD collectors (B5, C5): posted (paid once), collected FREE next run; the questions and result kinds kept", async () => {
  const seo = seoMemoryStore(), asked = [];
  await seo.setSetting(DFS.switches, { B5: true, C5: true });
  const a = await runDfs({ seo, env: ENV, fetchImpl: fx(asked), now: NOW, topics: TOPICS }); assert.equal(a.kept, 0); assert.ok(asked.every((x) => x.u.endsWith("/task_post")));
  assert.equal(asked[0].body[0].people_also_ask_click_depth, 2);
  const b = await runDfs({ seo, env: ENV, fetchImpl: fx(asked, { cost: 99 }), now: () => Date.parse("2026-11-08T08:00:00Z"), topics: TOPICS });
  assert.equal(b.usd, 0, "collecting is free"); assert.ok(b.collected >= 2); assert.ok(b.kept >= 2);
  const q = rowsOf(DFS_COLLECTORS.find((c) => c.id === "B5"), RESULT.B5, { key: "k", on: TODAY })[0].data; assert.deepEqual(q.questions, ["Is OET hard?", "How long is OET valid?"]);
  const f = rowsOf(DFS_COLLECTORS.find((c) => c.id === "C5"), RESULT.C5, { key: "k", on: TODAY })[0].data; assert.equal(f.video, true); assert.equal(f.images, true); assert.equal(f.news, false);
});

test("6 · THE CAPS (shared with top-pages): $1 a day, $50 in total, each collector's own day cap; a task that could pass one is NOT sent", async () => {
  const caps = { usd: 1, budget: 50 }, m = (today, total, job = 0) => ({ today, total, byJobToday: { "dfs-a2": job } });
  assert.equal(mayBuy({ money: m(0.99, 10), caps, worst: 0.024, job: "dfs-a2" }).code, "CAP");
  assert.equal(mayBuy({ money: m(0, 49.99), caps, worst: 0.024, job: "dfs-a2" }).code, "BUDGET");
  assert.equal(mayBuy({ money: m(0, 0, DFS.perDayUsd), caps, worst: 0.024, job: "dfs-a2" }).code, "JOB_CAP");
  assert.equal(mayBuy({ money: m(0, 0), caps, worst: Infinity, job: "dfs-a2" }).code, "PRICE");
  /* the top-pages collector already spent today's $1 → the ten send nothing */
  const seo = seoMemoryStore(), asked = []; await seo.addSpend(TODAY, "top-pages", { usd: 0.99, units: 1 }); await seo.setSetting(DFS.switches, { A2: true });
  const r = await runDfs({ seo, env: ENV, fetchImpl: fx(asked), now: NOW, topics: TOPICS }); assert.equal(asked.length, 0); assert.equal(r.stoppedBy, "CAP");
  /* and the other way: the ten's money counts in the $50 total the top-pages collector reads */
  const s2 = seoMemoryStore(); await s2.addSpend(TODAY, "dfs-a2", { usd: 2, units: 1 }); await s2.addSpend(TODAY, "top-pages", { usd: 3, units: 1 });
  assert.equal((await topPagesBudget({ seo: s2, env: {} })).spent, 5);
  const tp = readFileSync(new URL("../site/top-pages.mjs", import.meta.url), "utf8"); assert.match(tp, /spent = await sharedToday\(seo, today\)/, "top-pages' $1 a day counts the ten too");
});

test("7 · THE SANDBOX: every call goes to sandbox.dataforseo.com and books $0; the owner's button tests one collector", async () => {
  const seo = seoMemoryStore(), asked = [];
  const r = await runDfs({ seo, env: ENV, fetchImpl: fx(asked, { cost: 5 }), now: NOW, topics: TOPICS, sandbox: true, only: ["G1"] });
  assert.ok(asked.length > 0); assert.ok(asked.every((a) => a.u.startsWith(DFS_SANDBOX))); assert.equal(r.usd, 0); assert.equal((await seo.spendSince(TODAY)).length, 0);
  const app = readFileSync(new URL("../site/app.mjs", import.meta.url), "utf8"); assert.match(app, /\/owner\/almiseo\/dfs-sandbox/); assert.match(app, /sandbox: true, only: \[id\]/);
});

test("8 · A REFUSAL STOPS: a login refused (40100) stops the run at once; the cron is daily; the page shows the TOTAL", async () => {
  const seo = seoMemoryStore(), asked = []; await seo.setSetting(DFS.switches, { A2: true, G1: true });
  const r = await runDfs({ seo, env: ENV, fetchImpl: fx(asked, { status: 40100 }), now: NOW, topics: TOPICS }); assert.equal(r.stoppedBy, "DATAFORSEO"); assert.equal(asked.length, 1);
  assert.ok(MC_CRONS.some((x) => x.path === "/cron/dfs"));
  const { dfsSection } = await import("../site/pages.mjs"); const h = dfsSection(dfsTable({ today: TODAY }));
  assert.match(h, /TOTAL if all are on/); assert.equal((h.match(/action="\/owner\/almiseo\/dfs-switch"/g) ?? []).length, 10); assert.match(h, /read 2026-11-07/);
  assert.equal(tasksFor(DFS_COLLECTORS.find((c) => c.id === "I2"), { topics: TOPICS }).length, 0);
});
