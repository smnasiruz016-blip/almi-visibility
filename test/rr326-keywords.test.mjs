/**
 * RR-326 · the free keyword finder on almivisibility.almiworld.com and the daily keyword collector (AlmiWorld's products first, then the
 * general database of categories and YouTube niches), on Google's own KeywordPlanIdeaService with the owner's Basic access.
 *   A the owner's one-time sign-in (site/owner-google-sign-in.mjs) puts the sign-in into Vercel without showing it
 *   B the collector: every product and country, within our caps, never twice in a day, history kept; the owner's page; the cron's secret
 *   C the finder: from the database first, from Google once, grouped, a CSV, Google named as the source; limits, ticket, hidden field
 *   D the owner without limits — a key only he sets, a cookie that proves it without holding it
 *   E the app's line with Basic access   F the privacy addition, exactly   G categories and YouTube niches, weekly
 * Google, the store and the database are stand-ins of their documented shapes — no network, no key. The database contract runs on the
 * memory store here and, when ALMIV_TEST_PG_URL names a THROWAWAY Postgres on 127.0.0.1 (and ALMIV_TEST_PG_MODULE the `pg` package), on
 * real Postgres too.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, mkdirSync, rmSync, readFileSync, existsSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createApp } from "../site/app.mjs";
import * as P from "../site/pages.mjs";
import { DEFAULT_SEEDS, parseSeeds, unitsOf, LOCATIONS, NOT_IN_GOOGLE } from "../site/kw-seeds.mjs";
import { QUEUE_COUNTRIES } from "../site/queue.mjs"; // RR-329
import { memoryStore, pgStore, dbUrlOf } from "../site/kw-store.mjs";
import { siteAds, QUOTA, ACCESS_LINE, adsConfigOf, CHECK, failureOf } from "../site/kw-google.mjs";
import { runCollector, plan, COLLECTOR } from "../site/kw-collector.mjs";
import { findKeywords, finderQuery, groupOf, csvOf, SOURCE_LINE, FINDER } from "../site/kw-finder.mjs";
import { isOwner, ownerCookie, OWNER_RULES } from "../site/owner.mjs";
import { kvStore } from "../site/limits.mjs";
import { loadLegal } from "../site/legal.mjs";
import { adsStatus } from "../desktop/google-ads.mjs";
import { main as signIn, clientFromFile, cleanPath } from "../site/owner-google-sign-in.mjs";
import { CRONS, VERCEL_JSON_LITE, LITE_DEPENDENCIES, siteFiles } from "../tools/bundle-site.mjs";
import { importFiles, phraseTest } from "../site/kw-import.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SECRETS = { GOOGLE_ADS_CLIENT_ID: "client-for-tests.apps.googleusercontent.com", GOOGLE_ADS_CLIENT_SECRET: "client-secret-for-tests-XYZ", GOOGLE_ADS_REFRESH_TOKEN: "refresh-token-for-tests-QRS", GOOGLE_ADS_CUSTOMER_ID: "123-456-7890" };
const KV_ENV = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "kv-token-for-tests" };
const OWNER_KEY = "owner-key-for-tests-0123456789-abcdefghij";
const FULL_ENV = { ...KV_ENV, ...SECRETS, OWNER_ACCESS_KEY: OWNER_KEY, CRON_SECRET: "cron-secret-for-tests-1234" };

/* a clock the stand-ins share: waiting moves it on */
const clockAt = (iso = "2026-10-26T01:00:00Z") => { const c = { t: Date.parse(iso) }; c.now = () => c.t; c.sleep = async (ms) => { c.t += ms; }; return c; };
/* the store's documented REST pipeline, with expiry on the shared clock */
function fakeKv(clock) {
  const m = new Map(), calls = [];
  const live = (k) => { const e = m.get(k); if (e && e.until !== null && e.until <= clock.t) m.delete(k); return m.get(k); };
  const fetchImpl = async (url, init) => {
    calls.push(String(url));
    const out = JSON.parse(init.body).map(([cmd, k, ...a]) => {
      const C = cmd.toUpperCase();
      if (C === "SET") { if (a.includes("NX") && live(k)) return { result: null }; const ex = a.indexOf("EX"), px = a.indexOf("PX"); m.set(k, { v: String(a[0]), until: ex > 0 ? clock.t + Number(a[ex + 1]) * 1000 : px > 0 ? clock.t + Number(a[px + 1]) : null }); return { result: "OK" }; }
      if (C === "GET") return { result: live(k)?.v ?? null };
      if (C === "GETDEL") { const v = live(k)?.v ?? null; m.delete(k); return { result: v }; }
      if (C === "DEL") return { result: m.delete(k) ? 1 : 0 };
      if (C === "INCR" || C === "DECR") { const v = Number(live(k)?.v ?? 0) + (C === "INCR" ? 1 : -1); m.set(k, { v: String(v), until: live(k)?.until ?? null }); return { result: v }; }
      if (C === "EXPIRE") { const e = live(k); if (e) e.until = clock.t + Number(a[0]) * 1000; return { result: e ? 1 : 0 }; }
      return { error: `ERR unknown command ${cmd}` };
    });
    return { ok: true, status: 200, json: async () => out };
  };
  return { m, calls, fetchImpl, kv: kvStore({ url: "https://kv.example", token: "t" }, { fetchImpl }) };
}
/* Google's documented REST shapes: the token endpoint and generateKeywordIdeas (int64 as strings, 12 months) */
const MONTHS = ["OCTOBER", "NOVEMBER", "DECEMBER", "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER"];
function fakeGoogle(clock, { fail = null } = {}) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    const u = String(url);
    if (u === "https://oauth2.googleapis.com/token") { calls.push({ kind: "token", at: clock.t }); return new Response(JSON.stringify({ access_token: "access-for-tests", expires_in: 3599, token_type: "Bearer" }), { status: 200 }); }
    const m = /^https:\/\/googleads\.googleapis\.com\/v26\/customers\/(\d{10}):generateKeywordIdeas$/.exec(u);
    if (!m) return new Response("{}", { status: 404 });
    const body = JSON.parse(init.body); calls.push({ kind: "ideas", at: clock.t, customer: m[1], body, headers: init.headers });
    if (fail) return new Response(JSON.stringify(fail), { status: 403 });
    const seed = body.keywordSeed.keywords[0], g = Number(String(body.geoTargetConstants[0] ?? "x/0").split("/")[1]) || 1;
    const words = [seed, `how to pass ${seed}`, `${seed} near me`, `${seed} fees`, `${seed} vs ielts`, `what is ${seed}`, `${seed} online`, ...body.keywordSeed.keywords.slice(1)];
    const results = [...new Set(words)].map((text, i) => ({ text, keywordIdeaMetrics: { competition: "LOW", avgMonthlySearches: String(((g % 97) + 1) * (10 - Math.min(i, 9)) * 10), monthlySearchVolumes: MONTHS.map((month, j) => ({ month, year: j < 3 ? "2025" : "2026", monthlySearches: String(100 + j) })) } }));
    results.push({ text: `${seed} rare`, keywordIdeaMetrics: {} }); // a keyword Google gives no figure for
    return new Response(JSON.stringify({ results, totalSize: String(results.length) }), { status: 200 });
  };
  return { calls, fetchImpl, ideas: () => calls.filter((c) => c.kind === "ideas") };
}

/* the database stores under test: memory always; real Postgres when a THROWAWAY one on 127.0.0.1 is named */
const PG_URL = process.env.ALMIV_TEST_PG_URL ?? "", PG_MODULE = process.env.ALMIV_TEST_PG_MODULE ?? "";
const pgOk = /^postgres(ql)?:\/\/[^@]*@127\.0\.0\.1:\d+\//.test(PG_URL) && PG_MODULE;
async function freshPg() {
  const { Pool } = (await import(pathToFileURL(PG_MODULE).href)).default;
  const p = new Pool({ connectionString: PG_URL }); await p.query("DROP TABLE IF EXISTS kw_fetch_keyword, kw_group_keyword, kw_observation, kw_fetch, kw_seed_list CASCADE"); await p.end();
  return pgStore({ url: PG_URL, Pool });
}
const STORES = [["memory", async () => memoryStore()], ...(pgOk ? [["postgres", freshPg]] : [])];

for (const [name, make] of STORES) {
  test(`B · the database (${name}): a fetch once a day — the same again stores nothing; a later day keeps the old figures (history); the finder reads a fetch back`, async () => {
    const s = await make();
    try {
      const f = { unitId: "u1", kind: "collector", group: "product:oet", seedKey: "seeds:a", location: "PK", language: "en", day: "2026-10-26", at: "2026-10-26T01:00:00.000Z", period: "2025-10-01..2026-09-30", ops: 1, rows: [{ text: "OET Exam", said: 1000, months: { "2026-09": 900 } }, { text: "oet exam", said: 5 }, { text: "oet near me", said: null }] };
      assert.deepEqual(await s.saveFetch(f), { duplicate: false, stored: 2 }, "the same keyword twice in one answer is kept once (lower case, one space)");
      assert.deepEqual(await s.saveFetch(f), { duplicate: true, stored: 0 }, "the same thing twice in a day");
      await s.saveFetch({ ...f, day: "2026-10-27", at: "2026-10-27T01:00:00.000Z", rows: [{ text: "oet exam", said: 2000 }] });
      const c = await s.counts("2026-10-27");
      assert.equal(c.keywords, 2); assert.equal(c.observations, 3, "the old day's figures are kept"); assert.equal(c.today, 1);
      assert.deepEqual(c.groups.map((g) => [g.grp, g.keywords, g.locations, g.last]), [["product:oet", 2, 1, "2026-10-27"]]);
      assert.deepEqual(c.locations.map((l) => [l.location, l.keywords, l.today]), [["PK", 2, 1]]);
      assert.deepEqual(c.fetchesToday, { collector: { fetches: 1, ops: 1 } });
      const old = await s.findFetch({ seedKey: "seeds:a", location: "PK", language: "en", since: "2026-10-26" });
      assert.equal(old.day, "2026-10-27"); assert.deepEqual(old.rows.map((r) => [r.keyword, r.volume]), [["oet exam", 2000]], "the newest day, its own figures");
      const first = await s.findFetch({ seedKey: "seeds:a", location: "PK", language: "en", since: "2026-10-26" });
      assert.equal(first.period, "2025-10-01..2026-09-30");
      assert.equal(await s.findFetch({ seedKey: "seeds:a", location: "IN", language: "en", since: "2026-10-01" }), null);
      const since = await s.fetchedSince("2026-10-20"); assert.equal(since.get("seeds:a|PK|en"), "2026-10-27");
      assert.equal(await s.seedList(), null); await s.setSeedList("product:x | X | x", "2026-10-27T02:00:00.000Z"); assert.equal((await s.seedList()).text, "product:x | X | x");
      /* a day with nulls sorts last */
      await s.saveFetch({ ...f, seedKey: "q:oet", kind: "finder", group: null, day: "2026-10-27" });
      const q = await s.findFetch({ seedKey: "q:oet", location: "PK", language: "en", since: "2026-10-27" });
      assert.deepEqual(q.rows.map((r) => r.keyword), ["oet exam", "oet near me"]); assert.equal(q.rows[1].volume, null);
    } finally { await s.close(); }
  });

  /* RR-329 (rules R4 + R5 replace RR-326's "every product in 19 locations every day, categories weekly"): every location Google can target, in
   * the owner's queue; a product asked again after 30 days, a category or niche after 60 */
  test(`B + G · RR-329 a simulated day (${name}): EVERY location Google can target, in the owner's queue — AlmiOET's first 30 countries (and all locations) first, then AlmiCV's with AlmiOET's other countries in the background (one in four), the categories last; the same day again asks Google NOTHING; a product again after 30 days, a category not before 60`, async () => {
    const s = await make(), clock = clockAt(), K = fakeKv(clock), G = fakeGoogle(clock);
    try {
      await s.setSeedList("product:oet | AlmiOET | oet, oet exam\nproduct:cv | AlmiCV | cv maker\ncategory:food | Food | recipes", "2026-10-26T00:00:00.000Z");
      const ads = siteAds({ env: FULL_ENV, kv: K.kv, fetchImpl: G.fetchImpl, now: clock.now, sleep: clock.sleep });
      assert.equal(LOCATIONS.length, 193, "all locations and 192 countries (Google's own country criteria)"); assert.deepEqual([...NOT_IN_GOOGLE].sort(), ["Cuba", "Iran", "Kosovo", "North Korea", "Palestine"]);
      assert.equal(parseSeeds(DEFAULT_SEEDS).groups.filter((g) => g.kind === "product").length, 24);
      let saved = 0, ops = 0;
      for (let run = 0; run < 20; run++) { const r = await runCollector({ store: s, ads, kv: K.kv, now: clock.now, budgetMs: 1e9 }); saved += r.saved; ops += r.ops; if (!r.left.due) break; }
      const ideas = G.ideas(), prod = (c) => ({ "oet,oet exam": "oet", "cv maker": "cv", recipes: "food" })[c.body.keywordSeed.keywords.join()], where = (c) => LOCATIONS.find((l) => (l.geo ?? "ALL") === (c.body.geoTargetConstants[0] ?? "ALL")).name;
      assert.equal(saved, 3 * 193, "every product and the category in every location"); assert.equal(ideas.length, saved); assert.equal(ops, ideas.length);
      assert.ok(ideas.length <= QUOTA.collector, "inside the collector's cap — one third of Google's day");
      const seq = ideas.map((c) => `${prod(c)}|${where(c)}`), first = QUEUE_COUNTRIES.slice(0, 30).filter((c) => !NOT_IN_GOOGLE.includes(c)); // Iran (30th) has no Google location
      assert.deepEqual(seq.slice(0, 30), ["oet|All locations", ...first.map((c) => `oet|${c}`)], "AlmiOET's first 30 (and all locations) first, in the owner's order");
      assert.deepEqual(seq.filter((x) => x.startsWith("cv|")).slice(0, 30), ["cv|All locations", ...first.map((c) => `cv|${c}`)], "then AlmiCV's first 30");
      const lastCvFirst = seq.indexOf(`cv|${first.at(-1)}`), background = seq.slice(30, lastCvFirst + 1).filter((x) => x.startsWith("oet|"));
      assert.ok(background.length >= 9 && background.length <= 12, `AlmiOET's other countries go on in the background, one in four (${background.length})`);
      assert.deepEqual(background.slice(0, 2), [`oet|${QUEUE_COUNTRIES[30]}`, `oet|${QUEUE_COUNTRIES[31]}`], "the background in the queue's order too");
      assert.ok(seq.findIndex((x) => x.startsWith("food|")) > seq.lastIndexOf(seq.filter((x) => !x.startsWith("food|")).at(-1)), "the category after every product");
      /* one request a second, every one counted before it was sent */
      for (let i = 1; i < ideas.length; i++) assert.ok(ideas[i].at - ideas[i - 1].at >= QUOTA.paceMs, `two requests ${ideas[i].at - ideas[i - 1].at} ms apart`);
      assert.equal(Number(K.m.get("av:ads:ops:2026-10-26:collector").v), ideas.length);
      /* Google's documented request: no developer token, English, Google Search only, adult ideas excluded, the right customer */
      const c0 = ideas[0];
      assert.equal(c0.customer, "1234567890"); assert.equal(c0.headers.authorization, "Bearer access-for-tests"); assert.equal(c0.headers["developer-token"], undefined); assert.equal(c0.headers["login-customer-id"], undefined);
      assert.equal(c0.body.language, "languageConstants/1000"); assert.equal(c0.body.keywordPlanNetwork, "GOOGLE_SEARCH"); assert.equal(c0.body.includeAdultKeywords, false);
      assert.ok(ideas.some((c) => c.body.geoTargetConstants[0] === "geoTargetConstants/2586"), "Pakistan by Google's own id");
      const c = await s.counts("2026-10-26");
      assert.ok(c.groups.every((g) => g.locations === 193)); assert.equal(c.locations.length, 193); assert.equal(c.fetchesToday.collector.fetches, saved);
      /* the same day again: nothing */
      const before = G.ideas().length, again = await runCollector({ store: s, ads, kv: K.kv, now: clock.now, budgetMs: 1e9 });
      assert.equal(G.ideas().length, before, "Google was asked again on the same day"); assert.equal(again.saved, 0);
      /* 31 days later: the products again (in every location), the category not yet (60 days) */
      clock.t += 31 * 86400000;
      for (let run = 0; run < 20; run++) { const r = await runCollector({ store: s, ads, kv: K.kv, now: clock.now, budgetMs: 1e9 }); if (!r.left.due) break; }
      const later = G.ideas().slice(before).map(prod);
      assert.equal(later.length, 2 * 193); assert.equal(later.filter((p) => p === "food").length, 0, "a category is not asked again before 60 days");
    } finally { await s.close(); }
  });
}

test("B · RR-329 plan(): due = never asked, or older than its refresh days (a product 30, a category 60) — in the queue's order", () => {
  const units = unitsOf(parseSeeds("product:oet | A | a\ncategory:c | C | x").groups);
  const key = (u) => `${u.seedKey}|${u.location}|${u.language}`;
  const fetched = new Map(units.map((u) => [key(u), u.kind === "product" ? (["India", "Pakistan"].includes(u.country) ? "2026-09-20" : "2026-10-20") : u.country === "Kenya" ? "2026-08-20" : "2026-09-01"]));
  const p = plan(units, fetched, "2026-10-26");
  assert.deepEqual(p.due.map((u) => `${u.kind}|${u.country}`), ["product|India", "product|Pakistan", "category|Kenya"], "36 days old for a product, 67 for a category; India before Pakistan (the owner's order)");
  assert.equal(p.total, 2 * 193); assert.equal(p.fresh, 2 * 193 - 3);
  assert.equal(plan(units, new Map(), "2026-10-26").due[0].country, "All locations", "never asked: all locations first, then the queue");
});

test("B · the collector STOPS in plain words: our daily cap (given back, never sent), Google's AUTHORIZATION_ERROR, a sign-in that ended; one run at a time", async () => {
  const clock = clockAt(), K = fakeKv(clock), G = fakeGoogle(clock), s = memoryStore();
  const capped = siteAds({ env: FULL_ENV, kv: K.kv, fetchImpl: G.fetchImpl, now: clock.now, sleep: clock.sleep, caps: { collector: 5 } });
  const r = await runCollector({ store: s, ads: capped, kv: K.kv, now: clock.now, budgetMs: 1e9 });
  assert.equal(r.saved, 5); assert.equal(G.ideas().length, 5); assert.equal(r.stoppedBy, "OUR_DAILY_LIMIT"); assert.match(r.why, /all used/);
  assert.equal(Number(K.m.get("av:ads:ops:2026-10-26:collector").v), 5, "the refused one was given back");
  const auth = { error: { code: 403, status: "PERMISSION_DENIED", details: [{ "@type": "type.googleapis.com/google.ads.googleads.v26.errors.GoogleAdsFailure", errors: [{ errorCode: { authorizationError: "ACTION_NOT_PERMITTED" }, message: "x" }] }] } };
  const G2 = fakeGoogle(clock, { fail: auth }), K2 = fakeKv(clock);
  const r2 = await runCollector({ store: memoryStore(), ads: siteAds({ env: FULL_ENV, kv: K2.kv, fetchImpl: G2.fetchImpl, now: clock.now, sleep: clock.sleep }), kv: K2.kv, now: clock.now, budgetMs: 1e9 });
  assert.equal(r2.stoppedBy, "AUTHORIZATION_ERROR"); assert.equal(G2.ideas().length, 1, "it stopped at the first refusal");
  assert.match(r2.why, /known fault for projects upgraded after 9 Sep 2026/); assert.match(K2.m.get("av:ads:last").v, /AUTHORIZATION_ERROR/);
  const noToken = siteAds({ env: FULL_ENV, kv: K2.kv, fetchImpl: async () => new Response("{}", { status: 400 }), now: clock.now, sleep: clock.sleep });
  assert.equal((await runCollector({ store: memoryStore(), ads: noToken, kv: K2.kv, now: clock.now, budgetMs: 1e9 })).stoppedBy, "UNAUTHENTICATED");
  await K.kv.run([["SET", "av:collector:lock", "someone", "NX", "EX", 290]]);
  const busy = await runCollector({ store: s, ads: capped, kv: K.kv, now: clock.now }); assert.equal(busy.ok, false); assert.match(busy.why, /Another collector run/);
  assert.deepEqual(adsConfigOf({}).missing, ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CUSTOMER_ID"]);
  assert.deepEqual(adsConfigOf({ ...SECRETS, GOOGLE_ADS_CUSTOMER_ID: "12345" }).missing, ["GOOGLE_ADS_CUSTOMER_ID (10 digits)"]);
  assert.deepEqual([QUOTA.googleDaily, QUOTA.ceiling, QUOTA.collector], [15000, 10000, 5000], "the collector one third, everything at most two thirds");
});

/* the public-lite app with every stand-in */
async function site({ env = FULL_ENV, clock = clockAt("2026-10-26T10:00:00Z"), kv = null, google = null, store = memoryStore(), mode = "public-lite" } = {}) {
  const K = kv ?? fakeKv(clock), G = google ?? fakeGoogle(clock);
  const app = createApp({ mode, env, kvFetch: K.fetchImpl, adsFetch: G.fetchImpl, kwStore: store, now: clock.now, sleep: clock.sleep, resolve: async () => [{ address: "93.184.216.34" }] });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const req = (p, { method = "GET", form = null, ip = "203.0.113.9", cookie = null, headers = {} } = {}) => fetch(base + p, { method, redirect: "manual", headers: { "x-real-ip": ip, ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}), ...(cookie ? { cookie } : {}), ...headers }, body: form ? new URLSearchParams(form) : undefined }).then(async (r) => ({ status: r.status, text: await r.text(), headers: r.headers }));
  const tickets = async (cookie) => { const h = (await req("/", { cookie })).text; clock.t += 3000; return { score: /action="\/score"[\s\S]*?name="ticket" value="([^"]+)"/.exec(h)?.[1], finder: /action="\/keywords#keywords"><input type="hidden" name="ticket" value="([^"]+)"/.exec(h)?.[1], html: h }; };
  const search = async (q, location = "ALL", o = {}) => req("/keywords", { method: "POST", form: { q, location, ticket: (await tickets(o.cookie)).finder, ...(o.extra ?? {}) }, ...o });
  return { base, req, tickets, search, K, G, store, clock, close: () => new Promise((r) => srv.close(r)) };
}
const secretValues = Object.values(FULL_ENV);

test("C · the finder: an OET search asks Google ONCE and is stored; the next visitor gets it from the database; grouped; Google named with the period; a CSV; no invented number", async () => {
  const a = await site();
  try {
    const home = (await a.tickets()).html;
    assert.match(home, /<h2 id="keywords">Free keyword finder<\/h2>/); assert.doesNotMatch(home, /Free keyword finder<span class="soon">/);
    assert.ok(home.indexOf('id="keywords"') > home.indexOf('action="/score"') && home.indexOf('id="keywords"') < home.indexOf('id="app"'), "the score first, the finder, then the app");
    const r = await a.search("OET", "PK");
    assert.equal(r.status, 200); assert.equal(a.G.ideas().length, 1);
    assert.match(r.text, /Keyword ideas for “oet” — Pakistan/); assert.match(r.text, /<b>Search volumes: Google Ads Keyword Planner data<\/b> · average monthly searches, Oct 2025 – Sep 2026 · English/);
    for (const g of ["How to …", "Near me", "Prices and fees", "Comparisons", "Questions", "Other ideas"]) assert.match(r.text, new RegExp(`<h4>${g.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} <span class="note">`), g);
    assert.match(r.text, /<td>oet rare<\/td><td><span class="nmtext">no figure from Google<\/span><\/td>/, "no figure is never a number");
    assert.doesNotMatch(r.text.replace(/<style>[\s\S]*?<\/style>/, ""), /difficulty|\bCPC\b|cost per click/i);
    assert.match(r.text, /<a class="pill" href="\/#score">Get the score of your site<\/a> <a class="pill ghost" href="#app">AlmiVisibility app: coming soon<\/a>/);
    assert.match(r.text, /4 free searches left today/);
    const again = await a.search("oet", "PK", { ip: "198.51.100.4" });
    assert.equal(again.status, 200); assert.equal(a.G.ideas().length, 1, "the second search went to Google again");
    const other = await a.search("oet", "IN", { ip: "198.51.100.4" }); assert.equal(a.G.ideas().length, 2, "another country is another question");
    assert.match(other.text, /— India/);
    const csv = await a.req("/keywords.csv?q=oet&location=PK");
    assert.equal(csv.status, 200); assert.match(csv.headers.get("content-type"), /text\/csv/); assert.match(csv.headers.get("content-disposition"), /attachment; filename="keywords-oet-pk\.csv"/);
    const lines = csv.text.trim().split("\r\n");
    assert.equal(lines[0], "keyword,avg_monthly_searches,group,location,language,period,source"); assert.equal(lines.length, 9);
    assert.ok(lines.slice(1).every((l) => l.endsWith(",Pakistan,English,2025-10-01..2026-09-30,Google Ads Keyword Planner")));
    assert.equal(a.G.ideas().length, 2, "a CSV never asks Google");
    assert.equal((await a.req("/keywords.csv?q=never-searched&location=PK")).status, 404);
    const nonOet = await a.search("wedding photographer", "AE", { ip: "198.51.100.5" }); assert.match(nonOet.text, /Keyword ideas for “wedding photographer” — United Arab Emirates/);
    for (const page of [home, r.text, again.text, csv.text, nonOet.text]) for (const v of secretValues) assert.ok(!page.includes(v), "a key's value reached a page");
    /* what is stored: words and Google's figures — no address */
    assert.ok([...a.K.m.keys()].every((k) => !k.includes("203.0.113.9") && !k.includes("198.51.100")));
  } finally { await a.close(); }
  assert.equal(csvOf({ rows: [{ keyword: "=cmd()", volume: 1, group: "other" }], locationName: "X", language: "English", period: "" }).split("\r\n")[1].split(",")[0], "'=cmd()", "a formula is plain text in the CSV");
  assert.deepEqual(["how to pass oet", "oet near me", "oet fees", "oet vs ielts", "what is oet", "oet online"].map(groupOf), ["howto", "nearme", "prices", "compare", "questions", "other"]);
  for (const bad of ["", "   ", "https://x.example", "www.example.com", "a ".repeat(12), "x".repeat(81), "<script>", "!!!"]) assert.equal(finderQuery(bad).ok, false, JSON.stringify(bad));
});

test("C · the finder's limits: per visitor per day, a daily total for the site, the one-use ticket and the hidden field; off until Google, the store and the database are all connected", async () => {
  const a = await site();
  try {
    for (let i = 1; i <= FINDER.perVisitorPerDay; i++) assert.equal((await a.search(`word${i}`)).status, 200, `search ${i}`);
    const sixth = await a.search("word6"); assert.equal(sixth.status, 429); assert.match(sixth.text, /The free keyword finder can be used 5 times a day\. Please come back tomorrow\./);
    assert.equal(a.G.ideas().length, 5, "a refused search never reaches Google");
    const t = (await a.tickets()).finder;
    assert.equal((await a.req("/keywords", { method: "POST", form: { q: "x", location: "ALL", ticket: t }, ip: "192.0.2.50" })).status, 200);
    const reused = await a.req("/keywords", { method: "POST", form: { q: "x", location: "ALL", ticket: t }, ip: "192.0.2.51" }); assert.equal(reused.status, 400); assert.match(reused.text, /That form has expired/);
    const bot = await a.search("x", "ALL", { ip: "192.0.2.52", extra: { homepage: "http://spam.example" } }); assert.equal(bot.status, 400); assert.match(bot.text, /Please use the form on this page/);
    const url = await a.search("https://example.com", "ALL", { ip: "192.0.2.53" }); assert.equal(url.status, 400); assert.match(url.text, /not a web address/);
    const badLoc = await a.search("x", "ZZ", { ip: "192.0.2.54" }); assert.equal(badLoc.status, 503); assert.match(badLoc.text, /Choose a country/);
    assert.ok([...a.K.m.keys()].some((k) => k.startsWith("av:kwvisitor:")) && [...a.K.m.keys()].some((k) => k.startsWith("av:kwtotal:")), "its own counters, apart from the score's");
  } finally { await a.close(); }
  const full = await site({ env: { ...FULL_ENV } });
  try { await full.K.kv.run([["SET", "av:kwtotal:2026-10-26", String(FINDER.siteSearchesPerDay), "EX", 99999]]); const r = await full.search("x", "ALL", { ip: "192.0.2.60" }); assert.equal(r.status, 429); assert.match(r.text, /Today's free keyword searches are all used/); } finally { await full.close(); }
  for (const env of [{ ...KV_ENV }, { ...FULL_ENV, GOOGLE_ADS_REFRESH_TOKEN: "" }]) {
    const off = await site({ env });
    try { const h = (await off.req("/")).text; assert.match(h, /Free keyword finder<span class="soon">Coming soon/); assert.doesNotMatch(h, /action="\/keywords/); const p = await off.req("/keywords", { method: "POST", form: { q: "x" } }); assert.equal(p.status, 503); assert.equal(off.G.ideas().length, 0); } finally { await off.close(); }
  }
  /* Google's own daily cap for the finder: refused before sending */
  const capped = await site(); try { await capped.K.kv.run([["SET", "av:ads:ops:2026-10-26:finder", String(QUOTA.finder), "EX", 99999]]); const r = await capped.search("fresh word", "ALL", { ip: "192.0.2.70" }); assert.equal(r.status, 429); assert.equal(capped.G.ideas().length, 0); } finally { await capped.close(); }
});

test("C · Google's AUTHORIZATION_ERROR is a plain message, not a crash", async () => {
  const clock = clockAt("2026-10-26T10:00:00Z");
  const a = await site({ clock, google: fakeGoogle(clock, { fail: { error: { code: 403, status: "PERMISSION_DENIED", details: [{ errors: [{ errorCode: { authorizationError: "DEVELOPER_TOKEN_NOT_APPROVED" } }] }] } } }) });
  try { const r = await a.search("oet"); assert.equal(r.status, 503); assert.match(r.text, /Google refused the access \(AUTHORIZATION_ERROR\)\. Google names a known fault for projects upgraded after 9 Sep 2026/); assert.match(r.text, /<form class="testform kwform"/, "the form is still there"); } finally { await a.close(); }
});

test("D · the owner: no limits on HIS browser — a key only he sets, typed once (never in an address), a cookie that proves it; wrong keys counted; the key never in a page", async () => {
  const a = await site();
  try {
    assert.match((await a.req("/owner")).text, /type="password"/);
    const wrong = await a.req("/owner/sign-in", { method: "POST", form: { key: "nope" } }); assert.equal(wrong.status, 403); assert.match(wrong.text, /That is not the key/);
    for (let i = 0; i < OWNER_RULES.triesPerAddressPerHour - 1; i++) await a.req("/owner/sign-in", { method: "POST", form: { key: "nope" } });
    const blocked = await a.req("/owner/sign-in", { method: "POST", form: { key: OWNER_KEY } }); assert.equal(blocked.status, 429, "even the right key, after 5 wrong ones from that address this hour");
    const ok = await a.req("/owner/sign-in", { method: "POST", form: { key: OWNER_KEY }, ip: "192.0.2.80" });
    assert.equal(ok.status, 303); const set = ok.headers.get("set-cookie"); assert.match(set, /^av_owner=\d+\.[\w-]+; Path=\/; Max-Age=15552000; HttpOnly; Secure; SameSite=Strict$/);
    assert.ok(!set.includes(OWNER_KEY)); const cookie = set.split(";")[0];
    for (let i = 1; i <= FINDER.perVisitorPerDay + 3; i++) assert.equal((await a.search(`owner${i}`, "ALL", { cookie, ip: "192.0.2.80" })).status, 200, `the owner's search ${i}`);
    assert.match((await a.search("owner-more", "ALL", { cookie, ip: "192.0.2.80" })).text, /Owner: no daily limit on this browser/);
    for (let i = 1; i <= 5; i++) { const t = (await a.tickets(cookie)).score; assert.equal((await a.req("/score", { method: "POST", form: { url: "good.example", ticket: t }, cookie, ip: "192.0.2.80" })).status, 200, `the owner's score ${i}`); }
    assert.equal(Number(a.K.m.get("av:ads:ops:2026-10-26:owner").v), 9, "the owner's searches are counted apart — inside the total");
    const page = await a.req("/owner", { cookie }); assert.equal(page.status, 200); assert.match(page.headers.get("x-robots-tag"), /noindex/);
    assert.match(page.text, new RegExp(ACCESS_LINE)); assert.match(page.text, /You \(no limit — inside the total\)<\/td><td>9<\/td>/);
    const tampered = cookie.replace(/.$/, (c) => (c === "A" ? "B" : "A")); assert.equal((await a.req("/owner", { cookie: tampered })).text.includes("The seed list"), false); // RR-329: the owner's page is "Owner" now (its keyword parts open on a tap)
    for (const p of [page.text, (await a.req("/", { cookie })).text]) for (const v of secretValues) assert.ok(!p.includes(v), "a key's value in a page");
  } finally { await a.close(); }
  /* RR-326 fix: an owner's page that is off SAYS WHY (the owner saw a bare "not found") — never a sign-in form, never the key */
  const none = await site({ env: { ...FULL_ENV, OWNER_ACCESS_KEY: "" } });
  try { const r = await none.req("/owner"); assert.equal(r.status, 503); assert.match(r.text, /OWNER_ACCESS_KEY is not set for Production in Vercel/); assert.doesNotMatch(r.text, /type="password"/); assert.equal((await none.req("/owner/sign-in", { method: "POST", form: { key: "x" } })).status, 404); } finally { await none.close(); }
  const short = await site({ env: { ...FULL_ENV, OWNER_ACCESS_KEY: "too-short-key-for-tests" } });
  try { const r = await short.req("/owner"); assert.equal(r.status, 503, "a guessable key is no key"); assert.match(r.text, /shorter than 32 characters, so it is not accepted/); assert.ok(!r.text.includes("too-short-key-for-tests")); assert.doesNotMatch(r.text, /type="password"/); assert.equal((await short.req("/owner/sign-in", { method: "POST", form: { key: "too-short-key-for-tests" } })).status, 404); } finally { await short.close(); }
  /* spaces or a line end around the key in Vercel, or in the form, are not part of it */
  const spaced = await site({ env: { ...FULL_ENV, OWNER_ACCESS_KEY: `  ${OWNER_KEY}\n` } });
  try { assert.match((await spaced.req("/owner")).text, /type="password"/); assert.equal((await spaced.req("/owner/sign-in", { method: "POST", form: { key: ` ${OWNER_KEY} ` }, ip: "192.0.2.90" })).status, 303); } finally { await spaced.close(); }
  const t0 = Date.parse("2026-10-26T00:00:00Z"), c = ownerCookie({ OWNER_ACCESS_KEY: OWNER_KEY }, t0).split(";")[0];
  assert.equal(isOwner({ headers: { cookie: c } }, { OWNER_ACCESS_KEY: OWNER_KEY }, t0 + 1000), true);
  assert.equal(isOwner({ headers: { cookie: c } }, { OWNER_ACCESS_KEY: `${OWNER_KEY}-changed` }, t0 + 1000), false, "a new key signs every browser out");
  assert.equal(isOwner({ headers: { cookie: c } }, { OWNER_ACCESS_KEY: OWNER_KEY }, t0 + 181 * 86400000), false, "expired");
});

test("B + G · the owner's page: per product, category and YouTube niche (keywords, countries, last refresh), per country, Google's operations against the limit; the seed list saved only when it reads", async () => {
  const clock = clockAt("2026-10-26T01:00:00Z"), K = fakeKv(clock), G = fakeGoogle(clock), store = memoryStore();
  const a = await site({ clock, kv: K, google: G, store });
  try {
    const cookie = (await a.req("/owner/sign-in", { method: "POST", form: { key: OWNER_KEY } })).headers.get("set-cookie").split(";")[0];
    const ran = await a.req("/owner/collect", { method: "POST", form: {}, cookie }); assert.match(ran.text, /This run: \d+ requests saved/);
    /* RR-343 (owner, 29 Oct: /owner/collect said "Page not found") · the SALES build: Collect now runs; its address opened again (a refresh, a
     * typed address) goes back to the countries page — never 404; signed out it is the sign-in, as every owner page */
    const sb = await site({ clock, kv: K, google: G, store, mode: "sales" });
    try {
      const sc = (await sb.req("/owner/sign-in", { method: "POST", form: { key: OWNER_KEY } })).headers.get("set-cookie").split(";")[0];
      const run2 = await sb.req("/owner/collect", { method: "POST", form: {}, cookie: sc }); assert.equal(run2.status, 200); assert.match(run2.text, /This run: \d+ requests saved/);
      const again = await sb.req("/owner/collect", { cookie: sc }); assert.deepEqual([again.status, again.headers.get("location")], [303, "/owner/countries"]);
      assert.deepEqual([(await sb.req("/owner/seeds", { cookie: sc })).headers.get("location"), (await sb.req("/owner/countries/run", { cookie: sc })).headers.get("location")], ["/owner", "/owner/countries"]);
      assert.equal((await sb.req("/owner/collect")).status, 403, "signed out: the sign-in");
    } finally { await sb.close(); }
    const page = (await a.req("/owner", { cookie })).text;
    /* one short run (50 s) reaches the first product of the owner's queue — AlmiOET (RR-329, rule R4; it was AlmiJob, the list's first) */
    assert.match(page, /<td>AlmiOET<\/td><td>AlmiWorld product · every 30 days<\/td><td>\d+<\/td><td>\d+<\/td><td>\d+<\/td><td>2026-10-26<\/td>/);
    assert.match(page, /<td>Pakistan<\/td><td>\d+<\/td><td>\d+<\/td>/); assert.match(page, /Google's Basic limit: 15,000 a day/); assert.match(page, /Daily collector<\/td><td>\d+<\/td><td>5,000 \(one third of Google's\)/);
    const bad = await a.req("/owner/seeds", { method: "POST", form: { seeds: "product:x | X" }, cookie }); assert.equal(bad.status, 400); assert.match(bad.text, /Not saved — line 1: write it as/);
    assert.equal(await store.seedList(), null);
    const good = await a.req("/owner/seeds", { method: "POST", form: { seeds: "product:oet | AlmiOET | oet, oet exam\nyoutube:niches | YouTube niches | daily vlog" }, cookie }); assert.match(good.text, /Saved: 2 groups\./);
    clock.t += 86400000; await runCollector({ store, ads: siteAds({ env: FULL_ENV, kv: K.kv, fetchImpl: G.fetchImpl, now: clock.now, sleep: clock.sleep }), kv: K.kv, now: clock.now, budgetMs: 1e9 });
    const day2 = G.ideas().filter((x) => x.at >= clock.t - 1000 * 3600);
    assert.ok(day2.every((x) => ["oet,oet exam", "daily vlog"].includes(x.body.keywordSeed.keywords.join())), "the owner's list is the one collected");
    const yt = (await a.req("/owner", { cookie })).text; assert.match(yt, /YouTube niche · every 60 days · Google Search volumes, not YouTube's numbers/);
    assert.equal((await a.req("/owner/seeds", { method: "POST", form: { seeds: "x" } })).status, 403, "only the owner");
  } finally { await a.close(); }
  assert.match(parseSeeds(`product:a | A | ${Array.from({ length: 21 }, (_, i) => `s${i}`).join(", ")}`).why, /at most 20 seed words for a product/);
  assert.equal(parseSeeds(DEFAULT_SEEDS).groups.length, 24 + 11 + 1);
});

test("B · the cron: only with Vercel's own Authorization header carrying CRON_SECRET — else 401 and nothing runs", async () => {
  const a = await site();
  try {
    for (const h of [{}, { authorization: "Bearer wrong" }, { authorization: `Bearer ${FULL_ENV.CRON_SECRET}x` }, { authorization: FULL_ENV.CRON_SECRET }]) assert.equal((await a.req("/cron/keywords", { headers: h })).status, 401);
    assert.equal(a.G.ideas().length, 0);
    const r = await a.req("/cron/keywords", { headers: { authorization: `Bearer ${FULL_ENV.CRON_SECRET}` } }); assert.equal(r.status, 200);
    const j = JSON.parse(r.text); assert.equal(j.ok, true); assert.ok(j.saved > 0); assert.ok(!r.text.includes(FULL_ENV.GOOGLE_ADS_REFRESH_TOKEN));
  } finally { await a.close(); }
  const noSecret = await site({ env: { ...FULL_ENV, CRON_SECRET: "" } }); try { assert.equal((await noSecret.req("/cron/keywords", { headers: { authorization: "Bearer " } })).status, 401); } finally { await noSecret.close(); }
  for (const c of CRONS) assert.match(c.schedule, /^\d+ \d+ \* \* \*$/, "a Hobby project may run a cron once a day only");
  assert.equal(CRONS.length, 8); assert.equal(VERCEL_JSON_LITE.functions["api/index.mjs"].maxDuration, 300); assert.equal(LITE_DEPENDENCIES.pg, "8.23.1");
  assert.equal(dbUrlOf({ DATABASE_URL: "postgresql://u@h/db" }), "postgresql://u@h/db"); assert.equal(dbUrlOf({ POSTGRES_URL: "postgres://u@h/db" }), "postgres://u@h/db"); assert.equal(dbUrlOf({ DATABASE_URL: "mysql://x" }), null);
});

test("A · the owner's sign-in script: the client ID and secret are read from Google's client FILE (a path, dragged in or given) — never typed, printed or copied; Google's own page through a local address; the sign-in goes into Vercel on standard input, sensitive; refused outside the deploy folder", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr326-signin-"));
  try {
    const out = []; const log = (s) => out.push(String(s));
    assert.equal(await signIn({ log, cwd: dir, argv: [], askFn: async () => "x", open: () => { throw new Error("a browser was opened"); }, waitMs: 50 }), 2); assert.match(out.join("\n"), /Run this from your deploy folder/);
    mkdirSync(join(dir, ".vercel"));
    /* a FAKE client file, in Google's shape — never the owner's real one */
    const fake = join(dir, "client_secret_fake-for-tests.apps.googleusercontent.com.json");
    writeFileSync(fake, JSON.stringify({ installed: { client_id: SECRETS.GOOGLE_ADS_CLIENT_ID, project_id: "fake-project", auth_uri: "https://accounts.google.com/o/oauth2/auth", token_uri: "https://oauth2.googleapis.com/token", client_secret: SECRETS.GOOGLE_ADS_CLIENT_SECRET, redirect_uris: ["http://localhost"] } }));
    const fetchImpl = async (url, init) => {
      if (String(url) === "https://oauth2.googleapis.com/token") { const b = new URLSearchParams(init.body); assert.equal(b.get("client_id"), SECRETS.GOOGLE_ADS_CLIENT_ID); assert.equal(b.get("client_secret"), SECRETS.GOOGLE_ADS_CLIENT_SECRET); assert.ok(b.get("code_verifier")); return new Response(JSON.stringify({ access_token: "a", refresh_token: SECRETS.GOOGLE_ADS_REFRESH_TOKEN, expires_in: 3599 }), { status: 200 }); }
      if (/listAccessibleCustomers/.test(String(url))) return new Response(JSON.stringify({ resourceNames: ["customers/1234567890"] }), { status: 200 });
      throw new Error(`unexpected ${url}`);
    };
    /* the browser: the local address → Google's page (a 302) → Google answers on the loopback address */
    let opened = null, google = null;
    /* the stand-in browser visits this computer only — an address elsewhere is never fetched (the run then ends at its short wait, RED) */
    const browser = (forge = false) => (u) => { opened = u; if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(u)) return; setTimeout(async () => { try { const r = await fetch(u, { redirect: "manual" }); google = new URL(r.headers.get("location")); await fetch(`${google.searchParams.get("redirect_uri")}?code=the-code&state=${forge ? "forged" : google.searchParams.get("state")}`); } catch { /* a broken script: the run ends at its short wait — never an error outside the test */ } }, 10); };
    const run = async (o) => { const saved = []; const code = await signIn({ log, cwd: dir, open: browser(o.forge), waitMs: 8000, fetchImpl, addEnv: async (name, value) => { saved.push([name, value]); return true; }, ...o }); return { code, saved }; };
    /* dragged in: PowerShell types the path in quotes */
    const asked = [];
    const r1 = await run({ argv: [], askFn: async (q) => { asked.push(q); return `"${fake}"`; } });
    assert.equal(r1.code, 0); assert.deepEqual(asked, ["Drag your Google client JSON file into this window, then press Enter: "], "only the file is asked — never an ID or a secret");
    assert.match(opened, /^http:\/\/127\.0\.0\.1:\d+\/start$/, "the browser opens a LOCAL address — Google's address (with the client ID) never reaches a command line");
    assert.equal(google.origin + google.pathname, "https://accounts.google.com/o/oauth2/v2/auth"); assert.equal(google.searchParams.get("client_id"), SECRETS.GOOGLE_ADS_CLIENT_ID); assert.equal(google.searchParams.get("scope"), "https://www.googleapis.com/auth/adwords https://www.googleapis.com/auth/webmasters.readonly", "RR-331: Google Ads and Search Console (read only) in one sign-in"); assert.equal(google.searchParams.get("access_type"), "offline"); assert.equal(google.searchParams.get("code_challenge_method"), "S256"); assert.match(google.searchParams.get("redirect_uri"), /^http:\/\/127\.0\.0\.1:\d+\/oauth\/google-ads$/);
    assert.deepEqual(r1.saved.map(([n]) => n), ["GOOGLE_ADS_CLIENT_ID", "GOOGLE_ADS_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "CRON_SECRET"]);
    assert.deepEqual(r1.saved.slice(0, 3).map(([, v]) => v), [SECRETS.GOOGLE_ADS_CLIENT_ID, SECRETS.GOOGLE_ADS_CLIENT_SECRET, SECRETS.GOOGLE_ADS_REFRESH_TOKEN], "the file's values, as they are"); assert.ok(r1.saved[3][1].length >= 40);
    /* given as an argument: nothing asked */
    const r2 = await run({ argv: [fake], askFn: async () => { throw new Error("asked although the file was given"); } }); assert.equal(r2.code, 0);
    const printed = out.join("\n");
    for (const v of [SECRETS.GOOGLE_ADS_CLIENT_ID, SECRETS.GOOGLE_ADS_CLIENT_SECRET, SECRETS.GOOGLE_ADS_REFRESH_TOKEN, r1.saved[3][1], r2.saved[3][1]]) assert.ok(!printed.includes(v), "a value was printed");
    assert.ok(!printed.includes("accounts.google.com"), "Google's address (it carries the client ID) was printed");
    assert.match(printed, /accounts this sign-in reaches: 1234567890/); assert.match(printed, /Saved in Vercel \(Production, sensitive\): GOOGLE_ADS_REFRESH_TOKEN/);
    assert.deepEqual(readdirSync(dir).sort(), [".vercel", "client_secret_fake-for-tests.apps.googleusercontent.com.json"], "the file was copied, or something was written");
    /* an answer that is not this sign-in's saves nothing */
    const forged = await run({ argv: [fake], forge: true }); assert.equal(forged.code, 1); assert.deepEqual(forged.saved, []);
    /* a wrong file: refused in plain words that never carry a value; nothing asked of Google */
    const bad = (name, body) => { const f = join(dir, name); writeFileSync(f, body); return f; };
    for (const [f, why] of [[bad("a.json", "not json"), /is not Google's client file \(its text is not JSON\)/], [bad("b.json", JSON.stringify({ other: {} })), /no client in it/], [bad("c.json", JSON.stringify({ installed: { client_id: "nope", client_secret: "secret-value-123" } })), /not a Google OAuth client ID/], [bad("d.json", JSON.stringify({ installed: { client_id: SECRETS.GOOGLE_ADS_CLIENT_ID } })), /no client secret/], [join(dir, "missing.json"), /not there/], [bad("e.txt", "x"), /not a \.json file/]]) {
      const o = []; const c = await signIn({ log: (s) => o.push(s), cwd: dir, argv: [f], open: () => o.push("BROWSER OPENED"), waitMs: 50, fetchImpl: async () => { throw new Error("Google was asked"); }, addEnv: async () => { throw new Error("saved"); } }); // never a real browser, even if the refusal broke
      assert.equal(c, 2); assert.match(o.join("\n"), why); assert.ok(!o.join("\n").includes("secret-value-123") && !o.join("\n").includes(SECRETS.GOOGLE_ADS_CLIENT_ID));
    }
    assert.equal(cleanPath(`& 'C:\\Users\\x\\My Files\\client.json'`), "C:\\Users\\x\\My Files\\client.json"); assert.equal(cleanPath(`  "C:\\a b\\c.json" `), "C:\\a b\\c.json");
    const web = bad("w.json", JSON.stringify({ web: { client_id: SECRETS.GOOGLE_ADS_CLIENT_ID, client_secret: SECRETS.GOOGLE_ADS_CLIENT_SECRET } })); assert.equal(clientFromFile(web).kind, "Web application");
    /* RR-331 B (owner, 27 Oct: "could not be read" for the file that worked on 26 Oct): the same client file saved again — with a UTF-8
     * byte-order mark, as UTF-16 (with or without its mark, either byte order), dragged in with quotes and spaces — is read; a file that
     * will not open (OneDrive not yet on the device) and an empty one each say so; nothing of its value is ever shown */
    const json = JSON.stringify({ installed: { client_id: SECRETS.GOOGLE_ADS_CLIENT_ID, client_secret: SECRETS.GOOGLE_ADS_CLIENT_SECRET } }, null, 2);
    const be = Buffer.from(json, "utf16le"); be.swap16();
    for (const [name, bytes] of [["bom8.json", Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(json)])], ["le.json", Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(json, "utf16le")])], ["le-nobom.json", Buffer.from(json, "utf16le")], ["be.json", Buffer.concat([Buffer.from([0xfe, 0xff]), be])], ["crlf.json", Buffer.from(`\r\n  ${json.replace(/\n/g, "\r\n")}\r\n`)]]) {
      const c = clientFromFile(bad(name, bytes)); assert.equal(c.ok, true, `${name}: ${c.why}`); assert.equal(c.clientId, SECRETS.GOOGLE_ADS_CLIENT_ID); assert.equal(c.kind, "Desktop app");
    }
    const spaced = bad("client secret (1).json", json); assert.equal(clientFromFile(`& '${spaced}'  `).ok, true, "dragged in: & and quotes and spaces");
    const locked = clientFromFile(spaced, { read: () => { throw Object.assign(new Error("x"), { code: "EBUSY" }); } });
    assert.match(locked.why, /is there but could not be opened \(EBUSY\) — if it is in OneDrive, right-click it → "Always keep on this device"/);
    assert.match(clientFromFile(bad("empty.json", "")).why, /That file is empty/);
    for (const r of [locked, clientFromFile(bad("x.json", "{ broken"))]) assert.ok(!JSON.stringify(r).includes(SECRETS.GOOGLE_ADS_CLIENT_SECRET));
    /* the CLI gets the value on standard input — never in its arguments; no hidden prompt (paste failed in it), no copy of the file */
    const src = readFileSync(join(REPO, "site", "owner-google-sign-in.mjs"), "utf8");
    assert.match(src, /p\.stdin\.end\(value\)/); assert.match(src, /"env", "add", name, "--environment", "production", "--sensitive", "--force"\]/); assert.doesNotMatch(src, /--value|_writeToOutput|copyFile|writeFile/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* RR-326 H · Google's documented shapes for the access check: customers:listAccessibleCustomers, googleAds:search (customer and
   customer_client rows, camelCase, int64 as strings) and generateKeywordIdeas refused with an AuthorizationError reason */
const authFail = (reason, message = "The caller does not have permission") => ({ error: { code: 403, status: "PERMISSION_DENIED", message: "The caller does not have permission", details: [{ "@type": "type.googleapis.com/google.ads.googleads.v26.errors.GoogleAdsFailure", errors: [{ errorCode: { authorizationError: reason }, message }], requestId: "req-for-tests-1" }] } });
function fakeAccounts({ accessible = [], accounts = {}, clients = {}, ideas = null, token = null } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const u = String(url), h = init.headers ?? {}; calls.push({ url: u, login: h["login-customer-id"] ?? null, body: init.body ?? null });
    if (u === "https://oauth2.googleapis.com/token") return token ? new Response(JSON.stringify(token), { status: 400 }) : new Response(JSON.stringify({ access_token: "access-for-tests", expires_in: 3599 }), { status: 200 });
    if (u === "https://googleads.googleapis.com/v26/customers:listAccessibleCustomers") return new Response(JSON.stringify({ resourceNames: accessible.map((x) => `customers/${x}`) }), { status: 200 });
    let m = /\/v26\/customers\/(\d{10})\/googleAds:search$/.exec(u);
    if (m) {
      const q = JSON.parse(init.body).query;
      if (/FROM customer_client/.test(q)) return new Response(JSON.stringify({ results: (clients[m[1]] ?? []).map((c) => ({ customerClient: { id: c.id, manager: c.manager ?? false, testAccount: false, status: c.status ?? "ENABLED", level: "1" } })) }), { status: 200 });
      const a = accounts[m[1]]; if (!a) return new Response(JSON.stringify(authFail("USER_PERMISSION_DENIED")), { status: 403 });
      return new Response(JSON.stringify({ results: [{ customer: { resourceName: `customers/${m[1]}`, id: m[1], manager: a.manager ?? false, testAccount: a.test ?? false, status: a.status ?? "ENABLED" } }] }), { status: 200 });
    }
    m = /\/v26\/customers\/(\d{10}):generateKeywordIdeas$/.exec(u);
    if (m) return ideas ? new Response(JSON.stringify(ideas), { status: 403 }) : new Response(JSON.stringify({ results: [{ text: "oet", keywordIdeaMetrics: {} }, { text: "oet exam", keywordIdeaMetrics: {} }] }), { status: 200 });
    return new Response("{}", { status: 404 });
  };
  return { calls, fetchImpl };
}
const checkWith = async (g, env = FULL_ENV) => { const clock = clockAt(), K = fakeKv(clock); const ads = siteAds({ env, kv: K.kv, fetchImpl: g.fetchImpl, now: clock.now, sleep: clock.sleep }); return { r: await ads.check(), K, ads }; };

test("H · the owner's Google access check: Google's own reason kept; the accounts this sign-in reaches (ids only); manager or normal; the id not reachable; reached only through a manager; Google's side; never a key", async () => {
  /* the configured id is not one this sign-in reaches */
  const a = await checkWith(fakeAccounts({ accessible: ["9998887776"], accounts: { "9998887776": {} }, ideas: authFail("USER_PERMISSION_DENIED", "User doesn't have permission to access customer. Note: If you're accessing a client customer, the manager's customer id must be set in the 'login-customer-id' header.") }));
  assert.equal(a.r.ok, false); assert.deepEqual(a.r.steps.accessible.ids, ["9998887776"]); assert.equal(a.r.steps.configured.reachable, "no");
  assert.match(a.r.verdict[0], /GOOGLE_ADS_CUSTOMER_ID \(1234567890\) is NOT an account this sign-in reaches\. Reachable: 9998887776\./);
  assert.match(a.r.verdict.at(-1), /The keyword request is refused: USER_PERMISSION_DENIED — .*Google's message: "User doesn't have permission to access customer\./);
  const last = JSON.parse(a.K.m.get("av:ads:last").v); assert.equal(last.reason, "USER_PERMISSION_DENIED"); assert.equal(last.requestId, "req-for-tests-1");
  /* the configured id IS a manager account, reached directly — its clients listed */
  const b = await checkWith(fakeAccounts({ accessible: ["1234567890"], accounts: { "1234567890": { manager: true } }, clients: { "1234567890": [{ id: "1112223334" }] }, ideas: authFail("ACTION_NOT_PERMITTED") }));
  assert.equal(b.r.steps.configured.reachable, "directly"); assert.equal(b.r.steps.configured.info.manager, true);
  assert.deepEqual(b.r.steps.managers[0].clients.map((x) => x.id), ["1112223334"]);
  assert.ok(b.r.verdict.some((v) => /1234567890 is a MANAGER account\. Keyword ideas are asked in a normal \(client\) account/.test(v)));
  assert.ok(!b.r.verdict.some((v) => /Google's side/.test(v)), "a manager id is not blamed on Google");
  /* reached only through a manager, no login customer id set */
  const c = await checkWith(fakeAccounts({ accessible: ["5556667778"], accounts: { "5556667778": { manager: true } }, clients: { "5556667778": [{ id: "1234567890" }] }, ideas: authFail("USER_PERMISSION_DENIED") }));
  assert.equal(c.r.steps.configured.reachable, "through manager 5556667778");
  assert.match(c.r.verdict[0], /1234567890 is reached only through manager account 5556667778: add GOOGLE_ADS_LOGIN_CUSTOMER_ID = 5556667778/);
  const c2 = fakeAccounts({ accessible: ["5556667778"], accounts: { "5556667778": { manager: true } }, clients: { "5556667778": [{ id: "1234567890" }] } });
  const c2r = (await checkWith(c2, { ...FULL_ENV, GOOGLE_ADS_LOGIN_CUSTOMER_ID: "555-666-7778" })).r;
  assert.equal(c2r.ok, true); assert.match(c2r.verdict.at(-1), /The keyword request WORKS now \(2 ideas for "oet"\)/);
  assert.equal(c2.calls.find((x) => /generateKeywordIdeas/.test(x.url)).login, "5556667778", "the login customer id is sent");
  /* not active / test account */
  const d = await checkWith(fakeAccounts({ accessible: ["1234567890"], accounts: { "1234567890": { status: "CANCELED" } }, ideas: authFail("CUSTOMER_NOT_ENABLED") }));
  assert.ok(d.r.verdict.some((v) => /has status CANCELED — Google serves only an ENABLED account/.test(v)));
  /* everything right on our side: Google's known fault named */
  const e = await checkWith(fakeAccounts({ accessible: ["1234567890"], accounts: { "1234567890": {} }, ideas: authFail("ACTION_NOT_PERMITTED") }));
  assert.equal(e.r.verdict.length, 2); assert.match(e.r.verdict[1], /what is left is Google's side: the known fault for projects upgraded after 9 Sep 2026/);
  const e2 = await checkWith(fakeAccounts({ accessible: ["1234567890"], accounts: { "1234567890": {} }, ideas: authFail("USER_PERMISSION_DENIED") }));
  assert.equal(e2.r.verdict.length, 1, "a permission refusal on a reachable account is not blamed on Google's known fault"); assert.match(e2.r.verdict[0], /^The keyword request is refused: USER_PERMISSION_DENIED/);
  /* the sign-in refused: Google's error NAME only */
  const f = await checkWith(fakeAccounts({ token: { error: "invalid_grant", error_description: "Token has been expired or revoked." } }));
  assert.equal(f.r.ok, false); assert.equal(f.r.steps.signIn.reason, "invalid_grant"); assert.match(f.r.verdict[0], /The Google sign-in is refused \(invalid_grant\) — run owner-google-sign-in\.mjs again/);
  /* bounded: at most 1 + CHECK.accounts + 1 + CHECK.managers + 1 Google operations, all counted as the owner's */
  const many = fakeAccounts({ accessible: Array.from({ length: 9 }, (_, i) => `100000000${i}`), accounts: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`100000000${i}`, { manager: true }])) });
  const m = await checkWith(many); const googleCalls = many.calls.filter((x) => x.url.startsWith("https://googleads.")).length;
  assert.ok(googleCalls <= 1 + CHECK.accounts + 1 + CHECK.managers + 1, `${googleCalls} calls`); assert.equal(Number(m.K.m.get("av:ads:ops:2026-10-26:owner").v), googleCalls);
  /* Google's message is scrubbed of anything key-like */
  assert.equal(failureOf(authFail("X", `bad ${"a".repeat(50)} here`)).message, "bad [cut] here");
  /* the owner's page: the button, the check, Google's reason for the last refusal — and no secret anywhere */
  const clock = clockAt("2026-10-26T10:00:00Z"), G = fakeAccounts({ accessible: ["9998887776"], accounts: { "9998887776": {} }, ideas: authFail("USER_PERMISSION_DENIED", "User doesn't have permission to access customer.") });
  const s = await site({ clock, google: G });
  try {
    assert.equal((await s.req("/owner/check-google", { method: "POST", form: {} })).status, 403, "only the owner");
    const cookie = (await s.req("/owner/sign-in", { method: "POST", form: { key: OWNER_KEY } })).headers.get("set-cookie").split(";")[0];
    assert.match((await s.req("/owner", { cookie })).text, /action="\/owner\/check-google"/);
    const page = (await s.req("/owner/check-google", { method: "POST", form: {}, cookie })).text;
    assert.match(page, /Google access check/); assert.match(page, /Accounts this sign-in reaches: 9998887776 — normal account, ENABLED/);
    assert.match(page, /GOOGLE_ADS_CUSTOMER_ID 1234567890: reached no/);
    assert.match(page, /Google&#39;s last answer today \(10:00 UTC\)|Google's last answer today \(10:00 UTC\)/); assert.match(page, /Google's reason: <b>USER_PERMISSION_DENIED<\/b> — “User doesn(&#39;|')t have permission to access customer\.”/);
    for (const v of secretValues) assert.ok(!page.includes(v), "no secret in the page");
  } finally { await s.close(); }
});

test("H · RR-327: an account not active yet (AUTH_ERROR_CUSTOMER_NOT_ACTIVE / CUSTOMER_NOT_ENABLED) is never \"Google's known fault\"; a successful call clears the old red line", async () => {
  const notActive = authFail("ACTION_NOT_PERMITTED", "Authorization error: AUTH_ERROR_CUSTOMER_NOT_ACTIVE");
  const a = await checkWith(fakeAccounts({ accessible: ["1234567890"], accounts: { "1234567890": {} }, ideas: notActive }));
  assert.ok(a.r.verdict.some((v) => /The Google Ads account is not active yet: add billing/.test(v))); assert.ok(!a.r.verdict.some((v) => /Google's side/.test(v)), "never the known fault");
  const b = await checkWith(fakeAccounts({ accessible: ["1234567890"], accounts: { "1234567890": {} }, ideas: authFail("CUSTOMER_NOT_ENABLED") }));
  assert.ok(b.r.verdict.some((v) => /not active yet/.test(v)) && !b.r.verdict.some((v) => /Google's side/.test(v)));
  /* the collector, refused that way, says it in the owner's words */
  const clock = clockAt(), K = fakeKv(clock), G = fakeGoogle(clock, { fail: notActive });
  const r = await runCollector({ store: memoryStore(), ads: siteAds({ env: FULL_ENV, kv: K.kv, fetchImpl: G.fetchImpl, now: clock.now, sleep: clock.sleep }), kv: K.kv, now: clock.now, budgetMs: 1e9 });
  assert.equal(r.stoppedBy, "AUTHORIZATION_ERROR"); assert.match(r.why, /not active yet/); assert.doesNotMatch(r.why, /known fault for/);
  assert.ok(K.m.get("av:ads:last"), "the refusal is remembered for the owner's page");
  /* a later call that works clears it */
  const ok = siteAds({ env: FULL_ENV, kv: K.kv, fetchImpl: fakeGoogle(clock).fetchImpl, now: clock.now, sleep: clock.sleep });
  clock.t += 5000; assert.equal((await ok.ideas({ seeds: ["oet"], language: "languageConstants/1000", purpose: "owner" })).ok, true);
  assert.equal(K.m.get("av:ads:last"), undefined, "the old red line is gone after a success");
  const c = await checkWith(fakeAccounts({ accessible: ["1234567890"], accounts: { "1234567890": {} } })); assert.equal(c.K.m.get("av:ads:last"), undefined);
});

test("E · the app: switched on with Basic access, its line says \"Google Ads: Basic access — keyword data on\"", () => {
  assert.equal(adsStatus({ on: true, access: "basic", clientId: "c", customerId: "1234567890" }, { signedIn: true }).line, "Google Ads: Basic access — keyword data on");
  assert.equal(adsStatus({ on: true, access: "basic" }).line, "Google Ads: Basic access — keyword data on");
  assert.equal(adsStatus({ access: "basic" }).line, "Google Ads API: Basic access — keyword data allowed.", "switched off: unchanged");
  assert.match(adsStatus({ on: true, access: "explorer" }).line, /Basic access needed for keyword data/);
});

test("F · the privacy page is the owner's 26 Oct Word file exactly — his keyword-search words from his file, nothing added by the site", () => {
  const L = loadLegal(), words = (b) => (b.runs ?? []).map((r) => r.text).join(""), file = JSON.parse(readFileSync(join(REPO, "site/legal.generated.json"), "utf8"));
  assert.deepEqual(L, file, "the page is the generated file, with nothing added");
  assert.ok(L.privacy.some((b) => words(b) === "Last updated: 26 October 2026"));
  const kw = L.privacy.filter((b) => words(b).startsWith("Keyword searches: "));
  assert.equal(kw.length, 1); assert.equal(kw[0].kind, "li");
  assert.match(words(kw[0]), /Search volumes come from Google Ads Keyword Planner, through AlmiWorld’s own Google Ads account\.$/);
  assert.equal(L.privacy.filter((b) => words(b).startsWith("Free keyword finder: ")).length, 0, "the old added paragraph is gone");
  assert.doesNotMatch(P.privacy({ lite: true }) ?? "", /Free keyword finder: the words you search/);
});

/* RR-326 I · Keyword Planner exports as Google writes them: two title lines, a tab (or comma) header, UTF-16 with its byte-order mark
   (or UTF-8). Made-up words and figures — never the owner's files */
const KP_HEAD = ["Keyword", "Currency", "Avg. monthly searches", "Three month change", "YoY change", "Competition"];
function kpFile(rows, { at = "2026-10-24 at 06_03_20", utf16 = true, sep = "\t" } = {}) {
  const q = (s) => (sep === "," && /[",]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const text = [`Keyword Stats ${at}`, `"October 1, 2025 - September 30, 2026"`, KP_HEAD.join(sep), ...rows.map(([k, v]) => [k, "USD", v ?? "", "0%", "0%", "Low"].map(q).join(sep))].join("\r\n") + "\r\n";
  return utf16 ? Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]) : Buffer.from(text, "utf8");
}
const FILE_A = kpFile([["oet", "50000"], ["oet nursing", "500"], ["oet writing tips", "500"], ["sample nurse letter", "50"], ["oet dietetics", null]]);
const FILE_B = kpFile([["oet nursing", "5000"], ["oet fees", "500"], ["ielts or oet", "500"]], { at: "2026-10-24 at 22_00_17", utf16: false, sep: "," });

for (const [name, make] of STORES) {
  test(`I · the owner's Keyword Planner files (${name}): read on the server, merged — no duplicates, history kept, source "Keyword Planner file", OET keywords under AlmiOET; the same file twice adds nothing`, async () => {
    const store = await make(), clock = clockAt("2026-10-26T09:00:00Z"), groups = parseSeeds(DEFAULT_SEEDS).groups;
    try {
      const a = await importFiles({ uploads: [{ filename: "keyword-planner-1.csv.csv", bytes: FILE_A }], store, groups, now: clock.now });
      assert.deepEqual([a.read, a.new, a.merged, a.duplicates], [5, 5, 0, 0]);
      assert.deepEqual({ day: a.files[0].day, location: a.files[0].location, period: a.files[0].period }, { day: "2026-10-24", location: "All locations", period: "2025-10-01..2026-09-30" }, "the export day from the file's own title line; no country = all locations");
      assert.equal(a.files[0].products.AlmiOET, 4, "the four keywords holding \"oet\" — not \"sample nurse letter\"");
      /* the SAME bytes again, renamed, with a country and a date: nothing */
      const again = await importFiles({ uploads: [{ filename: "copy.csv", bytes: FILE_A, country: "PK", date: "2026-10-25" }], store, groups, now: clock.now });
      assert.deepEqual([again.read, again.new, again.duplicates, again.files[0].duplicate], [0, 0, 1, true]);
      const c1 = await store.counts("2026-10-24"); assert.equal(c1.keywords, 5); assert.equal(c1.observations, 5);
      /* a second file of the same day (UTF-8, comma): a known keyword is MERGED (its figure updated), the others new */
      const b = await importFiles({ uploads: [{ filename: "keyword-planner-2.csv", bytes: FILE_B }], store, groups, now: clock.now });
      assert.deepEqual([b.read, b.new, b.merged], [3, 2, 1]);
      const c2 = await store.counts("2026-10-24"); assert.equal(c2.keywords, 7); assert.equal(c2.observations, 7, "the same keyword, location and day: one row");
      assert.ok(c2.groups.some((g) => g.grp === "product:oet" && g.keywords === 6));
      /* a later export (history): a new row, the old one stays */
      const later = kpFile([["oet nursing", "50000"]], { at: "2026-11-24 at 08_00_00" });
      const l = await importFiles({ uploads: [{ filename: "keyword-planner-7.csv", bytes: later }], store, groups, now: () => Date.parse("2026-11-25T00:00:00Z") });
      assert.deepEqual([l.read, l.new, l.merged], [1, 0, 1]);
      assert.equal((await store.counts("2026-11-24")).observations, 8, "history kept");
      /* what the finder reads: the newest file figure of each keyword holding the words, highest first */
      const f = await store.fileKeywords({ phrases: ["oet"], location: "ALL", language: "en" });
      assert.deepEqual(f.rows.map((r) => [r.keyword, r.volume]), [["oet", 50000], ["oet nursing", 50000], ["ielts or oet", 500], ["oet fees", 500], ["oet writing tips", 500], ["oet dietetics", null]]);
      assert.equal(await store.fileKeywords({ phrases: ["oet"], location: "PK", language: "en" }), null, "another country: none");
      assert.equal((await store.fileKeywords({ phrases: ["nurse letter"], location: "ALL", language: "en" })).rows.length, 1);
      /* refusals, nothing stored */
      const bad = await importFiles({ uploads: [{ filename: "notes.csv", bytes: Buffer.from("a,b\n1,2\n") }, { filename: "x.csv", bytes: kpFile([["oet mock", "50"]]), date: "2026-12-31" }, { filename: "y.csv", bytes: kpFile([["oet mock", "50"]], { at: "2026-10-20 at 01_00_00" }), country: "XX" }], store, groups, now: clock.now });
      assert.deepEqual(bad.files.map((x) => x.ok), [false, false, false]); assert.match(bad.files[0].why, /not a Keyword Planner file/); assert.match(bad.files[1].why, /not in the future/); assert.match(bad.files[2].why, /Choose a country/);
      assert.equal((await store.counts("2026-10-24")).keywords, 7);
    } finally { await store.close(); }
  });
}

test("I · the upload on /owner: owner only, the files' result (read · new · merged); the public finder then answers \"oet\" from the files' Google RANGES while Google refuses — and asks Google again next time", async () => {
  const clock = clockAt("2026-10-26T10:00:00Z"), G = fakeGoogle(clock, { fail: authFail("ACTION_NOT_PERMITTED") });
  const s = await site({ clock, google: G });
  const upload = (parts, cookie) => { const fd = new FormData(); for (const [k, v, n] of parts) { if (typeof v === "string") fd.append(k, v); else fd.append(k, new Blob([v]), n); } return fetch(`${s.base}/owner/import`, { method: "POST", body: fd, headers: { "x-real-ip": "203.0.113.9", ...(cookie ? { cookie } : {}) } }).then(async (r) => ({ status: r.status, text: await r.text() })); };
  try {
    assert.equal((await upload([["file1", FILE_A, "a.csv"]])).status, 403, "only the owner");
    const cookie = (await s.req("/owner/sign-in", { method: "POST", form: { key: OWNER_KEY } })).headers.get("set-cookie").split(";")[0];
    const page = (await s.req("/owner", { cookie })).text;
    assert.match(page, /<form method="post" action="\/owner\/import" enctype="multipart\/form-data">/); assert.match(page, /name="file6"/); assert.match(page, /<select name="country1"><option value="ALL">All locations<\/option>/);
    const r = await upload([["file1", FILE_A, "keyword-planner-1.csv.csv"], ["country1", "ALL"], ["date1", ""], ["file2", FILE_B, "keyword-planner-2.csv"], ["country2", "ALL"], ["date2", ""], ["file3", FILE_A, "keyword-planner-1-copy.csv"]], cookie);
    assert.equal(r.status, 200);
    assert.match(r.text, /Upload: 8 keywords read · 7 new · 1 merged · 1 file already uploaded \(nothing added\)/);
    assert.match(r.text, /<td>keyword-planner-1\.csv\.csv<\/td><td>5 read · 5 new · 0 merged · All locations · 2026-10-24 · AlmiOET 4/);
    assert.match(r.text, /<td>keyword-planner-1-copy\.csv<\/td><td>Already uploaded — nothing added/);
    assert.match(r.text, /<td>All locations<\/td><td>7<\/td>/, "the totals per country");
    assert.equal((await upload([["country1", "ALL"]], cookie)).status, 400);
    /* the public finder, Google refusing: the files answer, as Google's ranges */
    const f = await s.search("oet", "ALL", { ip: "192.0.2.150" });
    assert.equal(f.status, 200); assert.equal(G.ideas().length, 1, "Google was asked first");
    assert.match(f.text, /Google's ranges, from a Keyword Planner export of 2026-10-24/);
    assert.match(f.text, /<td>oet<\/td><td>10K–100K<\/td>/); assert.match(f.text, /<td>oet nursing<\/td><td>1K–10K<\/td>/, "the newer figure of the same day (the second file)");
    assert.match(f.text, /<td>oet dietetics<\/td><td>no figure<\/td>/); assert.doesNotMatch(f.text, /sample nurse letter/);
    const csv = await s.req("/keywords.csv?q=oet&location=ALL", { ip: "192.0.2.150" });
    assert.match(csv.text, /^oet,10K–100K,Other ideas,All locations,English,2025-10-01\.\.2026-09-30,Google Ads Keyword Planner \(export file\)\r$/m);
    await s.search("oet", "ALL", { ip: "192.0.2.151" }); assert.equal(G.ideas().length, 2, "a file answer is not kept as Google's: the next search asks Google again");
    /* a word no file holds: Google's refusal, as before */
    const none = await s.search("dentistry", "ALL", { ip: "192.0.2.152" }); assert.equal(none.status, 503); assert.match(none.text, /AUTHORIZATION_ERROR/);
    /* a big body is refused for anyone but the owner */
    assert.equal((await upload([["file1", Buffer.alloc(100000, 65), "big.csv"]])).status, 413);
  } finally { await s.close(); }
});

test("I · the website bundle reads the files with the app's own reader (desktop/kp-file.mjs) — not the app's keyword database", () => {
  const files = siteFiles(); assert.ok(files.includes("desktop/kp-file.mjs")); assert.ok(files.includes("site/kw-import.mjs"));
  for (const f of ["desktop/keyword-db.mjs", "desktop/demand.mjs", "desktop/research5.mjs"]) assert.ok(!files.includes(f), `${f} stays out of the site`);
  assert.equal(phraseTest("oet")("ieltsoet prep"), false, "whole words only"); assert.equal(phraseTest("oet exam")("exam for oet"), true, "any order");
});

test("D · the bundle: the database driver pinned, eight daily crons, 300 s, the owner's script, .vercelignore", () => {
  const out = mkdtempSync(join(tmpdir(), "rr326-bundle-")); rmSync(out, { recursive: true, force: true });
  try {
    const r = spawnSync(process.execPath, [join(REPO, "tools", "bundle-site.mjs"), "--public-lite", out], { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr);
    const vj = JSON.parse(readFileSync(join(out, "vercel.json"), "utf8")), pj = JSON.parse(readFileSync(join(out, "package.json"), "utf8"));
    assert.equal(vj.crons.filter((c) => c.path === "/cron/keywords").length, 8); assert.equal(vj.crons.length, 15, "RR-328 B: + four country-facts runs; RR-331: + two test-dates runs and one Search Console check"); assert.ok(vj.crons.every((c) => ["/cron/keywords", "/cron/country-facts", "/cron/test-dates", "/cron/search-console"].includes(c.path) && /^\d+ \d+ \* \* \*$/.test(c.schedule))); assert.equal(vj.functions["api/index.mjs"].maxDuration, 300);
    assert.deepEqual(pj.dependencies, { pg: "8.23.1" }); assert.ok(existsSync(join(out, "owner-google-sign-in.mjs"))); assert.ok(existsSync(join(out, "desktop", "ads-wire.mjs")));
    assert.ok(!existsSync(join(out, "desktop", "keyword-db.mjs")), "the app's keyword database is not the site's");
    const engine = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8")); assert.equal(engine.dependencies, undefined, "the engine itself installs nothing");
  } finally { rmSync(out, { recursive: true, force: true }); }
});
