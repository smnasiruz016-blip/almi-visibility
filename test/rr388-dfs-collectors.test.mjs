/**
 * RR-388 PART B2 · the ten DataForSEO collectors (A2 B5 C5 D1 D2 D5 F1 F2 G1 I2), as the command was rewritten (7 Nov 08:36–08:41): ON by
 * default once a day with the PC off (each its own switch to turn it off); priced from DataForSEO's own page (source + day; "price not
 * confirmed" → off); ALL collectors together inside ONE $2 a day; the prepaid balance read from DataForSEO's own account call and said once
 * when low; built against the SANDBOX's documented shapes only. No call here leaves the machine: fetch is a stand-in.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runDfs, dfsTable, setSwitch, priceOf, worstOf, mayBuy, rowsOf, tasksFor, collectorsCapOf, isOn, DFS, DFS_COLLECTORS, DFS_IDS, DFS_SANDBOX, DFS_LIVE, PRICES, PRICE_MAX_DAYS, jobOf } from "../site/dfs-collectors.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";
import { topPagesBudget } from "../site/almiseo.mjs";
import { MC_CRONS } from "../tools/bundle-site.mjs";
import { findIssues, WHO } from "../desktop/issues.mjs";

const ENV = { ALMISEO_DATAFORSEO_LOGIN: "l", ALMISEO_DATAFORSEO_PASSWORD: "p" }, NOW = () => Date.parse("2026-11-07T08:00:00Z"), TODAY = "2026-11-07";
const TOPICS = [{ id: "oet", name: "AlmiOET", subject: "OET", seeds: ["oet exam", "oet nursing"], owner: "almiworld" }, { id: "visibility", name: "AlmiVisibility", subject: "seo tool", seeds: ["seo tool"], owner: "almiworld" }, { id: "x", name: "client", seeds: ["client words"], owner: "client" }];
const ONLY = (ids) => Object.fromEntries(DFS_IDS.map((id) => [id, ids.includes(id)])); /* the owner's switches: these on, the rest off */
const cfOf = (aiUsd) => ({ spend: async () => ({ aiUsd }) });
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
const fx = (asked, { cost = 0.01, status = 20000, balance = 40 } = {}) => async (u, init) => {
  asked.push({ u, method: init?.method, body: init?.body ? JSON.parse(init.body) : null });
  const path = u.replace(/^https:\/\/[^/]+\/v3/, ""), id = idOf(path);
  if (path === "/appendix/user_data") return new Response(JSON.stringify({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0, result: [{ money: { balance } }] }] }), { status: 200 });
  if (status !== 20000) return new Response(JSON.stringify({ status_code: status, status_message: "refused", tasks: [] }), { status: 200 });
  if (path.endsWith("/task_post")) return new Response(JSON.stringify({ status_code: 20000, tasks: [{ id: `t-${id}`, status_code: 20100, cost }] }), { status: 200 });
  if (path.includes("/task_get/advanced/")) return new Response(JSON.stringify({ status_code: 20000, tasks: [{ id: "t", status_code: 20000, cost: 0, result: RESULT[id] }] }), { status: 200 });
  return new Response(JSON.stringify({ status_code: 20000, tasks: [{ id: "t", status_code: 20000, cost, result: RESULT[id] ?? [] }] }), { status: 200 });
};
const paid = (asked) => asked.filter((a) => a.u !== `${DFS_LIVE}/appendix/user_data`);

test("1 · ON BY DEFAULT (owner, 08:36), once a day; each switch turns one OFF; nothing at all without the server's own account", async () => {
  assert.equal(isOn({}, "A2"), true); assert.equal(isOn({ A2: false }, "A2"), false);
  const seo = seoMemoryStore(), asked = [];
  const r = await runDfs({ seo, env: ENV, fetchImpl: fx(asked), now: NOW, topics: TOPICS }); assert.ok(r.sent > 0, "no switch set: they run"); assert.ok(paid(asked).every((a) => a.u.startsWith(DFS_LIVE)));
  const s2 = seoMemoryStore(), a2 = []; await s2.setSetting(DFS.switches, ONLY([])); const off = await runDfs({ seo: s2, env: ENV, fetchImpl: fx(a2), now: NOW, topics: TOPICS }); assert.equal(off.sent, 0); assert.equal(a2.length, 0); assert.match(off.why, /off/);
  const a3 = []; assert.equal((await runDfs({ seo: seoMemoryStore(), env: {}, fetchImpl: fx(a3), now: NOW, topics: TOPICS })).ok, false); assert.equal(a3.length, 0);
  assert.equal(MC_CRONS.filter((x) => x.path === "/cron/dfs").length, 1, "DataForSEO once a day");
  assert.deepEqual(DFS_IDS, ["A2", "B5", "C5", "D1", "D2", "D5", "F1", "F2", "G1", "I2"]);
});

test("2 · THE PRICE from DataForSEO's own page with its day; stale or missing = 'price not confirmed': the switch refuses, a run buys nothing", async () => {
  for (const c of DFS_COLLECTORS) { const p = priceOf(c, TODAY); assert.equal(p.ok, true, c.id); assert.match(p.url, /^https:\/\/dataforseo\.com\/pricing\//); assert.equal(p.on, "2026-11-07"); assert.ok(Number.isFinite(worstOf(c))); }
  assert.equal(worstOf(DFS_COLLECTORS.find((c) => c.id === "A2")), 0.024, "$0.012 + 100 × $0.00012");
  const seo = seoMemoryStore(), late = new Date(Date.parse(`${PRICES.labs.on}T00:00:00Z`) + (PRICE_MAX_DAYS + 1) * 864e5).toISOString().slice(0, 10);
  const no = await setSwitch({ seo, id: "A2", on: true, today: late, at: "x" }); assert.equal(no.ok, false); assert.match(no.why, /price not confirmed/);
  const t = dfsTable({ today: TODAY, prices: { ...PRICES, labs: undefined } }); assert.deepEqual(t.unconfirmed, ["A2", "D1", "D2"]); assert.equal(t.rows.find((r) => r.id === "A2").on, false, "not confirmed → off, whatever the switch");
  const asked = []; await seo.setSetting(DFS.switches, ONLY(["A2"])); const r = await runDfs({ seo, env: ENV, fetchImpl: fx(asked), now: NOW, topics: TOPICS, prices: { ...PRICES, labs: undefined } }); assert.equal(paid(asked).length, 0); assert.equal(r.sent, 0);
});

test("3 · THE OWNER'S TABLE: each collector, what it gives, per run and per month, and the TOTAL if all are on", () => {
  const t = dfsTable({ today: TODAY });
  assert.equal(t.rows.length, 10); assert.ok(t.rows.every((r) => r.on), "on by default"); for (const r of t.rows) { assert.ok(r.gives && r.products); assert.ok(r.perRunUsd !== null && r.perMonthUsd !== null); }
  assert.equal(t.totalPerMonthUsd, Math.round(t.rows.reduce((a, r) => a + r.perMonthUsd, 0) * 1e4) / 1e4); assert.ok(t.totalPerMonthUsd < 2, `all ten cost about $${t.totalPerMonthUsd} a month`);
  assert.equal(t.rows.find((r) => r.id === "I2").tasksPerRun, 0, "no product sells goods: 0 planned");
});

test("4 · LIVE collectors: sent once, only fields kept (never a page's text), their own spend line; not again inside their refresh days", async () => {
  const seo = seoMemoryStore(), asked = []; await seo.setSetting(DFS.switches, ONLY(["A2", "F2", "G1", "D1"]));
  const r = await runDfs({ seo, env: ENV, fetchImpl: fx(asked), now: NOW, topics: TOPICS });
  assert.equal(r.ok, true); assert.equal(asked.filter((a) => a.u.includes("bulk_keyword_difficulty")).length, 2, "one task per own topic; the client's topic is not paid for"); assert.ok(!JSON.stringify(asked).includes("client words"));
  const spend = await seo.spendSince(TODAY); assert.ok(spend.some((x) => x.job === jobOf("A2") && x.usd > 0)); assert.ok(r.usd > 0);
  const again = []; await runDfs({ seo, env: ENV, fetchImpl: fx(again), now: () => Date.parse("2026-11-20T08:00:00Z"), topics: TOPICS }); assert.equal(paid(again).length, 0, "nothing bought again inside 30 days");
  assert.deepEqual(Object.keys(rowsOf(DFS_COLLECTORS.find((c) => c.id === "F2"), RESULT.F2, { key: "k", on: TODAY })[0].data).sort(), ["collector", "date", "on", "title", "url"]);
});

test("5 · STANDARD collectors (B5, C5): posted (paid once), collected FREE next run; the questions and result kinds kept", async () => {
  const seo = seoMemoryStore(), asked = []; await seo.setSetting(DFS.switches, ONLY(["B5", "C5"]));
  const a = await runDfs({ seo, env: ENV, fetchImpl: fx(asked), now: NOW, topics: TOPICS }); assert.equal(a.kept, 0); assert.ok(paid(asked).every((x) => x.u.endsWith("/task_post")));
  assert.equal(paid(asked)[0].body[0].people_also_ask_click_depth, 2);
  const b = await runDfs({ seo, env: ENV, fetchImpl: fx(asked, { cost: 99 }), now: () => Date.parse("2026-11-08T08:00:00Z"), topics: TOPICS }); assert.equal(b.usd, 0, "collecting is free"); assert.ok(b.collected >= 2 && b.kept >= 2);
  assert.deepEqual(rowsOf(DFS_COLLECTORS.find((c) => c.id === "B5"), RESULT.B5, { key: "k", on: TODAY })[0].data.questions, ["Is OET hard?", "How long is OET valid?"]);
  const f = rowsOf(DFS_COLLECTORS.find((c) => c.id === "C5"), RESULT.C5, { key: "k", on: TODAY })[0].data; assert.equal(f.video, true); assert.equal(f.images, true); assert.equal(f.news, false);
});

test("6 · ONE $2 A DAY FOR ALL COLLECTORS (the AI collectors' money counts), the $50 total, each collector's day cap, the BALANCE: a task that could pass one is NOT sent", async () => {
  assert.equal(collectorsCapOf({}), 2); assert.equal(collectorsCapOf({ COUNTRY_FACTS_AI_USD_PER_DAY: "1.5" }), 1.5);
  const caps = { usd: 1, budget: 50 }, m = (today, total, job = 0) => ({ today, total, byJobToday: { "dfs-a2": job } });
  assert.equal(mayBuy({ money: m(0.2, 10), caps, worst: 0.024, job: "dfs-a2", otherToday: 1.79, collectorsCap: 2 }).code, "CAP", "AI collectors $1.79 + DataForSEO $0.20 + $0.024 > $2");
  assert.equal(mayBuy({ money: m(0, 49.99), caps, worst: 0.024, job: "dfs-a2" }).code, "BUDGET");
  assert.equal(mayBuy({ money: m(0, 0, DFS.perDayUsd), caps, worst: 0.024, job: "dfs-a2" }).code, "JOB_CAP");
  assert.equal(mayBuy({ money: m(0, 0), caps, worst: 0.024, job: "dfs-a2", balance: 0.01 }).code, "BALANCE"); assert.equal(mayBuy({ money: m(0, 0), caps, worst: Infinity, job: "dfs-a2" }).code, "PRICE");
  /* the AI collectors already spent $1.99 today → the ten buy nothing */
  const seo = seoMemoryStore(), asked = []; await seo.setSetting(DFS.switches, ONLY(["A2"]));
  const r = await runDfs({ seo, cf: cfOf(1.99), env: ENV, fetchImpl: fx(asked), now: NOW, topics: TOPICS }); assert.equal(paid(asked).length, 0); assert.equal(r.stoppedBy, "CAP"); assert.match(r.why, /all collectors together \(\$2\)/);
  /* the other way: the AI collectors and top pages count the DataForSEO money */
  const s2 = seoMemoryStore(); await s2.addSpend(TODAY, "dfs-a2", { usd: 2, units: 1 }); await s2.addSpend(TODAY, "top-pages", { usd: 3, units: 1 }); assert.equal((await topPagesBudget({ seo: s2, env: {} })).spent, 5);
  const read = (f) => readFileSync(new URL(`../site/${f}`, import.meta.url), "utf8");
  assert.match(read("cf-collector.mjs"), /spent\.aiUsd \+ otherUsd \+ out\.aiUsd/); assert.match(read("answers-collector.mjs"), /spent0 \+ otherUsd \+ out\.usd/); assert.match(read("top-pages.mjs"), /cfAiToday \+ spent\.usd \+ out\.cost \+ price > collectorsCap/);
  assert.match(read("app.mjs"), /otherUsd: seo \? \(await dfsMoney\(seo/); assert.match(read("app.mjs"), /runAnswers\(\{ seo, cf, kv, otherUsd: \(await dfsMoney\(seo/);
});

test("7 · THE BALANCE: read from DataForSEO's own account call (free) before buying; low → kept, and the owner's Issues list says so once", async () => {
  const seo = seoMemoryStore(), asked = []; await seo.setSetting(DFS.switches, ONLY(["G1"]));
  const r = await runDfs({ seo, env: ENV, fetchImpl: fx(asked, { balance: 3.2 }), now: NOW, topics: TOPICS });
  assert.equal(asked[0].u, `${DFS_LIVE}/appendix/user_data`); assert.equal(r.balance, 3.2); const b = await seo.setting(DFS.balance); assert.equal(b.low, true);
  const none = []; await runDfs({ seo: seoMemoryStore(), env: ENV, fetchImpl: fx(none, { balance: 0.005 }), now: NOW, topics: TOPICS }); assert.equal(paid(none).length, 0, "a balance that cannot pay the next task: nothing bought");
  const issue = findIssues({ dfsBalance: { balance: 3.2, low: true, on: "2026-11-07T08:00:00Z" } }).find((x) => x.source === "DataForSEO"); assert.equal(issue.who, WHO.YOU); assert.match(issue.step, /never tops it up/);
  assert.equal(findIssues({ dfsBalance: { balance: 40, low: false } }).some((x) => x.source === "DataForSEO"), false);
  assert.match(readFileSync(new URL("../site/more-collectors.mjs", import.meta.url), "utf8"), /dfs: dfs \? \{ balance: dfs\.balance, low: dfs\.low === true/);
});

test("8 · THE SANDBOX: every call goes to sandbox.dataforseo.com and books $0; the owner's button tests one; a refused login stops at once", async () => {
  const seo = seoMemoryStore(), asked = [];
  const r = await runDfs({ seo, env: ENV, fetchImpl: fx(asked, { cost: 5 }), now: NOW, topics: TOPICS, sandbox: true, only: ["G1"] });
  assert.ok(asked.length > 0); assert.ok(asked.every((a) => a.u.startsWith(DFS_SANDBOX))); assert.equal(r.usd, 0); assert.equal((await seo.spendSince(TODAY)).length, 0);
  assert.match(readFileSync(new URL("../site/app.mjs", import.meta.url), "utf8"), /sandbox: true, only: \[id\]/);
  const s2 = seoMemoryStore(), a2 = []; await s2.setSetting(DFS.switches, ONLY(["A2", "G1"]));
  const x = await runDfs({ seo: s2, env: ENV, fetchImpl: fx(a2, { status: 40100 }), now: NOW, topics: TOPICS }); assert.equal(x.stoppedBy, "DATAFORSEO"); assert.equal(paid(a2).length, 1);
  const { dfsSection } = await import("../site/pages.mjs"); const h = dfsSection(dfsTable({ today: TODAY })); assert.match(h, /TOTAL if all are on/); assert.equal((h.match(/action="\/owner\/almiseo\/dfs-switch"/g) ?? []).length, 10);
  assert.equal(tasksFor(DFS_COLLECTORS.find((c) => c.id === "I2"), { topics: TOPICS }).length, 0);
});
