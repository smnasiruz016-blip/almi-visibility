/**
 * RR-380 (owner, 6 Nov 2026: "collectors for everything"): the product queue with each product's data list, places (OpenStreetMap), rules
 * that change, trends, general market data, one fact one value, the collector page; collectors on Sonnet. Memory stores and documented
 * answers only; nothing is paid.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_DATA, PLAN_ORDER, RECHECK, dataStatus } from "../site/product-data.mjs";
import { QUEUE_PRODUCTS } from "../site/queue.mjs";
import { runPlaces, runRules, runTrends, rulesRegister, factClass, riseOf, risingOf, risingOwn, risingNote, mergeFacts, generalTopics, collectorsStatus, placeRow, DIRECTORIES } from "../site/more-collectors.mjs";
import { intentsOf } from "../site/top-pages.mjs";
import { seoMemoryStore } from "../site/almiseo-store.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { CF_AI } from "../site/cf-ai.mjs";
import { MC_CRONS, VERCEL_JSON_LITE } from "../tools/bundle-site.mjs";
import { COLLECTORS } from "../site/health.mjs";
import { almiSeoAnswer } from "../site/almiseo.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const json = (o, status = 200) => ({ ok: status < 400, status, json: async () => o });
const kvMem = () => { const m = new Map(); return { run: async (cmds) => cmds.map(([c, k, v, ...rest]) => { if (c === "SET") { if (rest.includes("NX") && m.has(k)) return null; m.set(k, v); return "OK"; } if (c === "GET") return m.get(k) ?? null; if (c === "DEL") { m.delete(k); return 1; } return null; }) }; };

test("QUEUE: every live product and AlmiPathway in the plan's order, each with its own data list; what no job fills yet says so", () => {
  assert.deepEqual(PLAN_ORDER.slice(0, 14), ["oet", "visibility", "almiworld", "cv", "jobs", "salary", "study", "pathway", "prep", "pte", "toefl", "det", "celpip", "goethe"]);
  for (const k of ["french", "spanish", "japanese", "korean", "italian", "portuguese", "dutch", "icelandic", "danish", "norwegian", "swedish", "swiss", "ebooks", "halal", "health", "architect"]) assert.ok(PLAN_ORDER.includes(k), k);
  assert.equal(PLAN_ORDER.indexOf("ebooks"), 26);
  assert.deepEqual(QUEUE_PRODUCTS.map((p) => p.key).slice(0, 14), PLAN_ORDER.slice(0, 14), "the collectors' queue follows the same order");
  const oet = PRODUCT_DATA.find((p) => p.key === "oet"); assert.ok(oet.data.some((d) => /fees per country/.test(d.what) && d.recheckDays === 30)); assert.ok(oet.data.some((d) => /regulators/.test(d.what) && d.recheckDays === 90));
  assert.ok(PRODUCT_DATA.find((p) => p.key === "study").data.some((d) => d.built === false), "a data item no job fills yet is said, never dropped");
  const st = dataStatus(oet, (k, item) => (item.job === "facts" ? { rows: 3, oldest: "2026-07-01" } : null), "2026-11-06");
  assert.ok(st.some((x) => x.state === "due for recheck")); assert.ok(st.some((x) => x.state === "missing"));
  assert.deepEqual([RECHECK.money, RECHECK.rule, RECHECK.other], [30, 90, 180]);
});

test("PLACES: OpenStreetMap only, links only, source + licence + date on every row; one place one row; refreshed every 90 days; off switch and lock", async () => {
  const seo = seoMemoryStore(), seen = []; const fetchImpl = async (u, init) => { seen.push({ u, body: decodeURIComponent(String(init.body)) }); return json({ elements: [{ type: "node", id: 9, lat: 53.8, lon: -1.5, tags: { name: "Masjid A", "addr:street": "Road", website: "masjid.example" } }, { type: "node", id: 10, tags: {} }] }); };
  const r = await runPlaces({ seo, env: {}, fetchImpl, cities: ["Leeds"], paceMs: 0, now: () => Date.parse("2026-11-06T02:17:00Z") });
  assert.equal(r.ok, true); assert.ok(seen.every((x) => x.u === "https://overpass-api.de/api/interpreter"), "only OpenStreetMap's public API"); assert.ok(seen.some((x) => /religion"="muslim"/.test(x.body)));
  const rows = await seo.searches("places:halal", await seo.searchKeys("places:halal")); assert.ok(rows.length >= 1);
  const p = rows[0].data; assert.equal(p.source.name, "OpenStreetMap contributors (ODbL)"); assert.equal(p.source.checked, "2026-11-06"); assert.equal(p.register, null, "a register status is never guessed"); assert.match(p.osm, /openstreetmap\.org\/node\/9/);
  const again = await runPlaces({ seo, env: {}, fetchImpl, cities: ["Leeds"], paceMs: 0, now: () => Date.parse("2026-11-20T02:17:00Z") }); assert.equal(again.read.filter((x) => x.city === "Leeds" && x.product === "halal").length, 0, "read again only after 90 days");
  assert.equal((await runPlaces({ seo, env: { ALMISEO_PLACES_OFF: "1" }, fetchImpl })).ok, false);
  const kv = kvMem(); await kv.run([["SET", "av:places:lock", "other", "NX", "EX", 290]]); assert.match((await runPlaces({ seo, kv, env: {}, fetchImpl, cities: ["York"], paceMs: 0 })).why, /Another places run/);
  assert.deepEqual(Object.keys(DIRECTORIES), ["halal", "health", "architect"]);
  assert.equal(placeRow({ osm: "x" }, { kind: "mosque", city: "Leeds", product: "halal", on: "d" }).key, "mosque|Leeds|x");
});

test("RULES THAT CHANGE: fees and dates monthly, rules every 3 months; due ones read again on their own page (free); a gone number marks the fact and lists it; an unread page is no change", async () => {
  assert.equal(factClass({ part: "fee", kind: "fee" }), "money"); assert.equal(factClass({ part: "councils", kind: "council" }), "rule"); assert.equal(factClass({ part: "centres", kind: "venue" }), "other");
  const cf = cfMemoryStore(), seo = seoMemoryStore(), at = "2026-07-01T00:00:00Z";
  await cf.putFact({ key: "fee|India", country: "India", part: "fee", kind: "fee", value: { official: "AUD 587", line: "AUD 587" }, sourceUrl: "https://oet.example/fees", sourceTitle: "Fees", readOn: "2026-07-01", proposedBy: "t", aiWritten: false, status: "confirmed" }, { at });
  await cf.putFact({ key: "fee|Kenya", country: "Kenya", part: "fee", kind: "fee", value: { official: "AUD 587", line: "AUD 587" }, sourceUrl: "https://blocked.example/x", sourceTitle: "x", readOn: "2026-07-01", proposedBy: "t", aiWritten: false, status: "confirmed" }, { at });
  /* RR-380 real proof: our own currency estimate is never looked for on the exam owner's page (6 of 6 fees were falsely "changed") */
  await cf.putFact({ key: "fee|Philippines", country: "Philippines", part: "fee", kind: "fee", value: { official: "AUD 587", line: "AUD 587 ≈ PHP 25,957 — an estimate from the RBA rate of 2026-11-05 (1 AUD = 44.22 PHP)", amount: 25957, local: true }, sourceUrl: "https://oet.example/fees2", sourceTitle: "Fees", readOn: "2026-07-01", proposedBy: "t", aiWritten: false, status: "confirmed" }, { at });
  const reg = rulesRegister(await cf.facts(), "2026-11-06"); assert.ok(reg.every((r) => r.due && r.cls === "money" && r.next === "2026-07-31"));
  const reader = { read: async (u) => (u.includes("blocked") ? { ok: false, why: "403" } : u.endsWith("fees2") ? { ok: true, title: "Fees", text: "The OET fee is AUD 587." } : { ok: true, title: "Fees", text: "The OET fee is now AUD 599." }) };
  const r = await runRules({ seo, cf, env: {}, reader, now: () => Date.parse("2026-11-06T03:17:00Z") });
  assert.deepEqual([r.checked, r.changed, r.unread], [3, 1, 1]); assert.equal((await seo.setting("rules-changed")).rows["fee|Philippines"], undefined, "the official price is still there: no change");
  const ch = await seo.setting("rules-changed"); assert.match(ch.rows["fee|India"].why, /587/); assert.equal(ch.rows["fee|Kenya"], undefined, "a page that would not open is not a change");
  assert.equal((await seo.setting("rules-checked"))["fee|India"], "2026-11-06"); assert.equal((await runRules({ seo, cf, env: {}, reader, now: () => Date.parse("2026-11-07T03:17:00Z") })).checked, 1, "next day: only the unread one is tried again; the changed one waits for its rebuild");
});

test("TRENDS: the last 3 months against the 3 before, from our own keyword store (free); our own sites' rising searches; the monthly note says it plainly, nothing rising included", async () => {
  const months = (a) => Object.fromEntries(a.map((n, i) => [`2026-${String(i + 4).padStart(2, "0")}`, n]));
  assert.ok(Math.abs(riseOf(months([100, 100, 100, 150, 150, 150])).change - 0.5) < 1e-9); assert.equal(riseOf({ "2026-01": 5 }), null);
  const rows = [{ text: "oet for nurses uk", months: months([100, 100, 100, 200, 220, 240]), source: "s" }, { text: "oet fee", months: months([500, 500, 500, 500, 500, 500]), source: "s" }, { text: "tiny", months: months([1, 1, 1, 9, 9, 9]), source: "s" }];
  assert.deepEqual(risingOf(rows).map((r) => r.text), ["oet for nurses uk"], "flat and tiny ones are not rising");
  assert.deepEqual(risingOwn([{ query: "a", impressions: 60 }, { query: "b", impressions: 30 }], [{ query: "a", impressions: 30 }, { query: "b", impressions: 30 }]).map((r) => r.text), ["a"]);
  const seo = seoMemoryStore(); await seo.setSetting("bing-queries:oet", { rows: [{ query: "oet uk", impressions: 80 }] }, { at: "x" }); await seo.setSetting("trends-own:oet:2026-10", { rows: [{ query: "oet uk", impressions: 20 }] }, { at: "x" });
  const t = await runTrends({ seo, kw: { monthly: async (g) => (g[0] === "product:oet" ? rows.map((r) => ({ ...r, location: "ALL" })) : []) }, env: {}, now: () => Date.parse("2026-11-06T04:17:00Z"), products: ["oet"] });
  assert.equal(t.products, 1); assert.equal((await runTrends({ seo, kw: { monthly: async () => [] }, env: {}, now: () => Date.parse("2026-11-07T04:17:00Z"), products: ["oet"] })).kept, true, "one read a month");
  const note = risingNote(await seo.setting("trends:2026-11")); assert.match(note, /AlmiOET: "oet for nurses uk" \+\d+%/); assert.match(note, /Bing Webmaster/); assert.match(risingNote(null), /Not read yet/);
  assert.match(risingNote({ month: "2026-11", products: {} }), /Nothing rose/);
});

test("DATA QUALITY: one fact, one value — the newest checked wins and the older is kept as \"was\"; no source or no date is refused", () => {
  const m = mergeFacts([{ key: "fee|IN", value: "AUD 587", sourceUrl: "https://a", readOn: "2026-09-01" }, { key: "fee|IN", value: "AUD 599", sourceUrl: "https://b", readOn: "2026-11-01" }, { key: "x", value: 1, readOn: "2026-11-01" }, { key: "y", value: 1, sourceUrl: "https://c" }]);
  assert.equal(m.rows.length, 1); assert.equal(m.rows[0].value, "AUD 599"); assert.equal(m.rows[0].was.value, "AUD 587"); assert.deepEqual(m.refused.map((r) => r.why), ["no source", "no date"]);
});

test("GENERAL MARKET DATA: the seed list's categories and YouTube niches become slow top-pages topics after AlmiWorld's own, their seeds the searches", () => {
  const g = generalTopics([{ kind: "product", key: "oet", seeds: ["oet"] }, { kind: "category", key: "food", name: "Food", seeds: ["restaurants", "halal food"] }, { kind: "youtube", key: "niches", name: "YouTube niches", seeds: ["daily vlog"] }]);
  assert.deepEqual(g.map((t) => t.id), ["g-category-food", "g-youtube-niches"]); assert.equal(g[0].owner, "general");
  assert.deepEqual(intentsOf({ topic: g[0], facts: [] }), ["restaurants", "halal food"]);
  const tp = readFileSync(join(REPO, "site", "top-pages.mjs"), "utf8"); assert.match(tp, /topics\.push\(\.\.\.generalTopics\(groups\)\)/); assert.ok(tp.indexOf("generalTopics(groups)") > tp.indexOf("clientTopicsToWork"), "after AlmiWorld's own and the clients'");
});

test("CRONS + HEALTH + SONNET: three new crons behind CRON_SECRET, on the health page; every collector asks Sonnet", () => {
  assert.deepEqual([...new Set(MC_CRONS.map((c) => c.path))], ["/cron/places", "/cron/rules", "/cron/trends", /* RR-382 */ "/cron/lists", /* RR-387 C */ "/cron/whois", /* RR-389 Part 4 */ "/cron/news", "/cron/jobs", /* RR-388 B2 */ "/cron/dfs"]);
  for (const p of ["/cron/places", "/cron/rules", "/cron/trends", "/cron/lists", "/cron/whois"]) assert.equal(MC_CRONS.filter((c) => c.path === p).length, 2, `${p}: twice a day (RR-388 B: free collectors)`); for (const c of MC_CRONS) assert.ok(VERCEL_JSON_LITE.crons.some((x) => x.path === c.path && x.schedule === c.schedule));
  const app = readFileSync(join(REPO, "site", "app.mjs"), "utf8"); assert.match(app, /"\/cron\/places" \|\| u\.pathname === "\/cron\/rules" \|\| u\.pathname === "\/cron\/trends" \|\| u\.pathname === "\/cron\/lists" \|\| u\.pathname === "\/cron\/whois" \|\| u\.pathname === "\/cron\/dfs" \|\| u\.pathname === "\/cron\/news" \|\| u\.pathname === "\/cron\/jobs"\)\) \{\n\s+if \(!cronAuth\(\)\)/); /* RR-389 Part 4 */
  for (const k of ["places", "rules", "trends"]) assert.ok(COLLECTORS[k]);
  assert.equal(CF_AI.model, "claude-sonnet-5-5"); assert.equal(CF_AI.price.inPerM, 2);
});

test("THE COLLECTOR PAGE: per product what is collected, how fresh, what is missing, and each job's money — for the owner only", async () => {
  const seo = seoMemoryStore(); await seo.addSpend("2026-11-06", "top-pages", { usd: 0.12, units: 1 });
  const s = await collectorsStatus({ seo, today: "2026-11-06", counts: { oet: { facts: 10, answers: 4, "top-pages": 2 } }, caps: { "top-pages": 1, research: 1, places: 0, rules: 0, trends: 0 } });
  assert.equal(s.money["top-pages"].today, 0.12); assert.equal(s.money.places.cap, 0);
  const oet = s.products.find((p) => p.key === "oet"); assert.ok(oet.data.some((d) => d.state === "collected")); assert.ok(oet.data.some((d) => d.state !== "collected"));
  const client = await almiSeoAnswer({ part: "collectors", subject: "oet", lic: { owner: false }, stores: { seo, cf: cfMemoryStore(), db: null } }); assert.equal(client.ok, false, "never to an outside client");
  const owner = await almiSeoAnswer({ part: "collectors", subject: "AlmiOET", lic: { owner: true }, stores: { seo, cf: cfMemoryStore(), db: null }, now: () => Date.parse("2026-11-06T10:00:00Z") });
  assert.equal(owner.ok, true, JSON.stringify(owner).slice(0, 300)); assert.ok(owner.products.length >= 27);
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8"); assert.match(ui, /id="collectorscard"/);
});
