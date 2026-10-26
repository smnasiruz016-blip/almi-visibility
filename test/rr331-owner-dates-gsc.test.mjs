/**
 * RR-331 · the owner's two pages (one menu, one countries table), the test-dates collector, and our own Search Console.
 *   A a date stands on its official page (the test owner's, an official partner's, a government's), in the quoted words, upcoming
 *   B one run: OET and IELTS for Pakistan and India — kept / dropped / "no public dates"; the Duolingo English Test once; nothing twice
 *   C Search Console (read only): our sites only; a question → the Questions collector, the rest → the keyword database "our Search Console"
 *   D /owner and /owner/countries: the menu and the other collectors' line; the table with each cell's value and day; test dates
 * Every page, date and figure here is invented — no network, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { dateInQuote, checkDate, officialFor, upcoming, DATE_TESTS, NO_DATES } from "../desktop/test-dates.mjs";
import { runTestDates, datesKey } from "../site/cf-dates.mjs";
import { runSearchConsole, productOfHost, GSC } from "../site/gsc.mjs";
import { cfMemoryStore } from "../site/cf-store.mjs";
import { memoryStore } from "../site/kw-store.mjs";
import { kvStore } from "../site/limits.mjs";
import { createApp } from "../site/app.mjs";
import { ownerCookie } from "../site/owner.mjs";
import { VERCEL_JSON_LITE } from "../tools/bundle-site.mjs";

const ON = "2026-10-27", T0 = Date.parse(`${ON}T13:40:00Z`);
const ENV_AI = { ANTHROPIC_API_KEY: "sk-ant-test-not-a-real-key-0000000000", COUNTRY_FACTS_AI_USD_PER_DAY: "10" };
function fakeKv() {
  const m = new Map();
  const fetchImpl = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => { const C = cmd.toUpperCase(); if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; } if (C === "GET") return { result: m.get(k) ?? null }; if (C === "DEL") return { result: m.delete(k) ? 1 : 0 }; if (C === "INCR") { const v = Number(m.get(k) ?? 0) + 1; m.set(k, String(v)); return { result: v }; } if (C === "EXPIRE") return { result: 1 }; return { error: "ERR" }; }) });
  return { m, fetchImpl, kv: kvStore({ url: "https://kv.example", token: "t" }, { fetchImpl }) };
}

/* ── A ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
test("A · RR-331: a date stands in its quoted words (written out, 14/11, 2026-11-14); only an official page counts (the test owner's, an official partner's, a government's); past dates drop off", () => {
  assert.ok(dateInQuote("2026-11-14", "The next paper-based test in Lahore is on 14 November 2026 at the Invented Centre"));
  assert.ok(dateInQuote("2026-11-14", "Test day: Sat 14th Nov 2026, computer-delivered, Karachi"));
  assert.ok(dateInQuote("2026-11-14", "Dates: 14/11/2026 (Lahore) and 28/11/2026 (Karachi)"));
  assert.ok(dateInQuote("2026-11-14", "next test 2026-11-14 Karachi"));
  assert.equal(dateInQuote("2026-11-14", "The next test is on 15 November 2026 in Lahore city centre"), false, "another day");
  assert.equal(dateInQuote("2026-11-14", "The next test is on 14 December 2026 in Lahore city centre"), false, "another month");
  assert.equal(dateInQuote("2026-11-14", "The next test is on 14 November 2027 in Lahore city centre"), false, "another year");
  for (const [p, h] of [["oet", "oet.com"], ["oet", "www.oet.com"], ["prep", "britishcouncil.pk"], ["prep", "ielts.idp.com"], ["prep", "ieltsidpindia.com"], ["toefl", "ets.org"], ["korean", "topik.go.kr"], ["pte", "pearsonpte.com"]]) assert.ok(officialFor(p, h), `${p} ${h}`);
  for (const [p, h] of [["oet", "oetprep-blog.example"], ["prep", "ielts-dates.example"], ["oet", "ets.org"]]) assert.equal(officialFor(p, h), false, `${p} ${h}`);
  assert.ok(officialFor("prep", "moe.gov.pk"), "a government's own page counts");
  const page = { ok: true, url: "https://oet.com/x", text: "Test dates in Pakistan: 14 November 2026 in Lahore, paper-based, at the Invented Centre." };
  assert.equal(checkDate({ date: "2026-11-14", sourceUrl: page.url, quote: "Test dates in Pakistan: 14 November 2026 in Lahore, paper-based" }, { product: "oet", today: ON, page }), null);
  assert.match(checkDate({ date: "2026-10-01", quote: "x" }, { product: "oet", today: ON, page }), /not an upcoming date/);
  assert.match(checkDate({ date: "2026-11-14", quote: "Test dates in Pakistan: 14 November 2026 in Islamabad, paper-based" }, { product: "oet", today: ON, page }), /quoted words are not on its page/);
  assert.match(checkDate({ date: "2026-11-21", quote: "Test dates in Pakistan: 14 November 2026 in Lahore, paper-based" }, { product: "oet", today: ON, page }), /the date is not in the quoted words/, "a true quote that holds another date");
  assert.deepEqual(upcoming([{ date: "2026-12-01" }, { date: "2026-10-01" }, { date: "2026-11-01" }], ON).map((d) => d.date), ["2026-11-01", "2026-12-01"]);
  assert.deepEqual(Object.keys(DATE_TESTS).slice(0, 5), ["oet", "prep", "pte", "toefl", "celpip"]); assert.ok(NO_DATES.det && !DATE_TESTS.det, "DET: no dates");
});

/* ── B ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const PAGES = {
  "https://oet.com/test-dates/pakistan": { title: "OET dates — Pakistan", text: "Upcoming OET test dates in Pakistan: 14 November 2026 in Lahore (paper-based) and 28 November 2026 in Karachi (computer)." },
  "https://www.britishcouncil.in/exam/ielts/dates": { title: "IELTS test dates — India", text: "IELTS on paper in Chennai: 21 November 2026. IELTS on computer in Delhi every week; book online." },
  "https://ielts.idp.com/pakistan/test-dates": { title: "IELTS Pakistan", text: "Test dates are shown after you choose a test centre and sign in to book." },
  "https://englishtest.duolingo.com/applicants": { title: "Duolingo English Test", text: "Take the test online, anytime, from home, in about an hour." },
  "https://oet-dates-blog.example/in": { title: "A blog", text: "No OET dates for India have been published yet." },
};
const reader = () => { let n = 0; return { read: async (u) => { n++; const p = PAGES[u]; return p ? { ok: true, url: u, title: p.title, h1: null, text: p.text, checkedOn: ON } : { ok: false, url: u, why: "the page answered 404", checkedOn: ON }; }, requests: () => n }; };
function datesAi() {
  const calls = [];
  const ai = async ({ prompt }) => {
    const testName = /^Test: ([^.]+)\./.exec(prompt)[1]; calls.push(testName);
    const D = testName === "OET" ? [
      { country: "Pakistan", date: "2026-11-14", city: "Lahore", centre: "", format: "paper", bookingUrl: "https://oet.com/book", sourceUrl: "https://oet.com/test-dates/pakistan", quote: "Upcoming OET test dates in Pakistan: 14 November 2026 in Lahore (paper-based)", noPublicDates: false },
      { country: "Pakistan", date: "2026-11-28", city: "Karachi", centre: "", format: "computer", bookingUrl: "https://some-agent.example/book", sourceUrl: "https://oet.com/test-dates/pakistan", quote: "and 28 November 2026 in Karachi (computer)", noPublicDates: false },
      { country: "Pakistan", date: "2026-12-05", city: "Islamabad", centre: "", format: "paper", bookingUrl: "", sourceUrl: "https://oet-dates-blog.example/pk", quote: "OET Islamabad 5 December 2026 paper test date for nurses and doctors", noPublicDates: false },
      { country: "India", date: "", city: "", centre: "", format: "", bookingUrl: "", sourceUrl: "https://oet-dates-blog.example/in", quote: "", noPublicDates: true },
    ] : testName === "IELTS" ? [
      { country: "India", date: "2026-11-21", city: "Chennai", centre: "", format: "paper", bookingUrl: "https://www.britishcouncil.in/exam/ielts/book", sourceUrl: "https://www.britishcouncil.in/exam/ielts/dates", quote: "IELTS on paper in Chennai: 21 November 2026. IELTS on computer in Delhi", noPublicDates: false },
      { country: "India", date: "2026-09-12", city: "Delhi", centre: "", format: "computer", bookingUrl: "", sourceUrl: "https://www.britishcouncil.in/exam/ielts/dates", quote: "IELTS on paper in Chennai: 21 November 2026. IELTS on computer in Delhi", noPublicDates: false },
      { country: "Pakistan", date: "", city: "", centre: "", format: "", bookingUrl: "", sourceUrl: "https://ielts.idp.com/pakistan/test-dates", quote: "", noPublicDates: true },
    ] : [];
    return { ok: true, usd: 0.08, searches: 5, data: { dates: D } };
  };
  return { ai, calls };
}
test("B · RR-331: one run — OET and IELTS for Pakistan and India: dates kept only when their official page shows them; a blog's and a past date dropped; an official page with no dates → \"no public dates\", dated; DET once; nothing twice in a week", async () => {
  const store = cfMemoryStore(), A = datesAi(), rd = reader(), run = (o = {}) => runTestDates({ store, reader: rd, ai: A.ai, env: ENV_AI, now: () => T0, budgetMs: 1e9, countries: ["Pakistan", "India"], tests: ["oet", "prep", "det"], ...o });
  const r = await run();
  assert.equal(r.ok, true, r.why); assert.deepEqual(A.calls, ["OET", "IELTS"], "one AI question a test for the countries together");
  const oetPk = await store.fact(datesKey("oet", "Pakistan"));
  assert.deepEqual(oetPk.value.dates.map((d) => [d.date, d.city, d.format, d.bookingUrl]), [["2026-11-14", "Lahore", "paper", "https://oet.com/book"], ["2026-11-28", "Karachi", "computer", null]], "a blog's date dropped; an agent's booking link not kept");
  assert.equal(oetPk.status, "confirmed"); assert.equal(oetPk.sourceUrl, "https://oet.com/test-dates/pakistan"); assert.match(oetPk.why, /not the test owner's, an official partner's or a government's/);
  const ieltsIn = await store.fact(datesKey("prep", "India")); assert.deepEqual(ieltsIn.value.dates.map((d) => d.date), ["2026-11-21"], "the past date dropped"); assert.match(ieltsIn.why, /not an upcoming date/);
  const ieltsPk = await store.fact(datesKey("prep", "Pakistan")); assert.equal(ieltsPk.value.none, true); assert.match(ieltsPk.value.text, /^No public dates on IELTS's official page for Pakistan \(checked 2026-10-27\)\.$/);
  assert.equal(await store.fact(datesKey("oet", "India")), null, "nothing confirmed → no fact, never a guess");
  assert.match((await store.tasks()).get("India|oet:dates").note, /nothing confirmed on an official page/);
  const det = await store.fact(datesKey("det", "*")); assert.equal(det.status, "confirmed"); assert.match(det.value.text, /online, taken at any time — it has no test dates/);
  assert.equal(r.dates, 3); assert.equal(r.none, 1); assert.ok(r.aiUsd > 0); assert.deepEqual(await store.spend(ON), { aiUsd: r.aiUsd, reads: r.reads, searches: r.searches }, "inside the same daily caps as the country facts");
  const again = await run(); assert.deepEqual(A.calls, ["OET", "IELTS"], "nothing asked again within the week"); assert.deepEqual(again.done, []);
  /* the day's AI budget already spent by the country facts → the dates wait (said plainly) */
  const s2 = cfMemoryStore(); await s2.addSpend(ON, { aiUsd: 9.95, reads: 0, searches: 0 });
  const poor = await runTestDates({ store: s2, reader: reader(), ai: datesAi().ai, env: ENV_AI, now: () => T0, budgetMs: 1e9, countries: ["Pakistan"], tests: ["oet"] });
  assert.equal(poor.stoppedBy, "AI_BUDGET"); assert.match(poor.why, /Today's AI budget \(\$10\.00\) is used/);
});

/* ── C ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
function fakeGoogle({ scope = `https://www.googleapis.com/auth/adwords ${GSC.scope}`, status = 200 } = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    const u = String(url); calls.push(u);
    if (u === "https://oauth2.googleapis.com/token") return new Response(JSON.stringify({ access_token: "ya29.test", expires_in: 3600, scope }), { status: 200 });
    if (status !== 200) return new Response(JSON.stringify({ error: { code: status } }), { status });
    if (u.endsWith("/webmasters/v3/sites")) return new Response(JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:almiworld.com", permissionLevel: "siteOwner" }, { siteUrl: "https://someone-else.example/", permissionLevel: "siteOwner" }] }), { status: 200 });
    if (u.includes("/searchAnalytics/query")) { const b = JSON.parse(init.body); assert.deepEqual(b.dimensions, ["query", "country", "page"]); assert.equal(b.dataState, "final");
      return new Response(JSON.stringify({ rows: [{ keys: ["how to get good standing certificate pmdc", "pak", "https://almioet.almiworld.com/guides/x"], clicks: 3, impressions: 120 }, { keys: ["oet listening practice", "pak", "https://almioet.almiworld.com/"], clicks: 9, impressions: 400 },
        { keys: ["cv format for nurses", "ind", "https://almicv.almiworld.com/a"], clicks: 1, impressions: 50 }, { keys: ["what is oet", "zzz", "https://almioet.almiworld.com/"], clicks: 0, impressions: 10 }] }), { status: 200 }); }
    return new Response("{}", { status: 404 });
  };
  return { fetchImpl, calls };
}
const GENV = { GOOGLE_ADS_CLIENT_ID: "test-client.apps.googleusercontent.com", GOOGLE_ADS_CLIENT_SECRET: "test-secret-0000000000", GOOGLE_ADS_REFRESH_TOKEN: "test-refresh-0000000000" };
test("C · RR-331: Search Console, read only — our almiworld.com sites only; a search that asks → the Questions collector (its clicks and impressions); the rest → the keyword database labelled \"our Search Console\"; weekly; a sign-in without the scope said plainly", async () => {
  assert.deepEqual([productOfHost("almioet.almiworld.com"), productOfHost("almijob.almiworld.com"), productOfHost("www.almicv.almiworld.com"), productOfHost("almiworld.com")], ["oet", "jobs", "cv", null]);
  const G = fakeGoogle(), K = fakeKv(), cf = cfMemoryStore(), kw = memoryStore();
  const r = await runSearchConsole({ env: GENV, kv: K.kv, kwStore: kw, cfStore: cf, fetchImpl: G.fetchImpl, now: () => T0 });
  assert.equal(r.ok, true, r.why); assert.equal(r.sites, 1, "someone else's site is not read"); assert.equal(r.questions, 1);
  assert.ok(!G.calls.some((u) => u.includes("someone-else")));
  const q = await cf.questions({ product: "oet", country: "Pakistan", source: "gsc" }); assert.deepEqual(q.map((x) => [x.text, x.clicks, x.impressions]), [["how to get good standing certificate pmdc", 3, 120]]);
  const pk = await kw.keywordsAt({ location: "PK", language: "gsc" }); assert.deepEqual(pk.map((x) => [x.keyword, x.volume]), [["oet listening practice", 400]]);
  assert.equal((await kw.keywordsAt({ location: "PK", language: "en" })).length, 0, "never mixed with Google Ads' figures");
  assert.equal((await kw.keywordsAt({ location: "ALL", language: "gsc" })).length, 1, "a search with no country → all locations");
  assert.match(JSON.parse(K.m.get("av:gsc:last")).period, /^Search Console impressions, 2026-09-27\.\.2026-10-24$/);
  const before = G.calls.length, skip = await runSearchConsole({ env: GENV, kv: K.kv, kwStore: kw, cfStore: cf, fetchImpl: G.fetchImpl, now: () => T0 + 864e5 });
  assert.equal(skip.skipped, true); assert.equal(G.calls.length, before, "once a week");
  const noScope = await runSearchConsole({ env: GENV, kwStore: kw, cfStore: cf, fetchImpl: fakeGoogle({ scope: "https://www.googleapis.com/auth/adwords" }).fetchImpl, now: () => T0 });
  assert.match(noScope.why, /no Search Console access yet — run the sign-in script again/);
  assert.match((await runSearchConsole({ env: GENV, fetchImpl: fakeGoogle({ status: 403 }).fetchImpl, now: () => T0 })).why, /refused \(403\)/);
  assert.match((await runSearchConsole({ env: {}, now: () => T0 })).why, /Not connected/);
  assert.ok(VERCEL_JSON_LITE.crons.some((c) => c.path === "/cron/search-console") && VERCEL_JSON_LITE.crons.filter((c) => c.path === "/cron/test-dates").length === 2);
});

/* ── D ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const OWNER_KEY = "owner-key-for-tests-0123456789-abcdefghij";
test("D · RR-331: /owner and /owner/countries — one menu (Keywords · Countries) and the other collectors in one line; ONE open table of every country, each cell its value and day, test dates; the crons only with the cron secret", async () => {
  const store = cfMemoryStore(), K = fakeKv(), env = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "kv-token-for-tests", OWNER_ACCESS_KEY: OWNER_KEY, CRON_SECRET: "cron-secret-for-tests-1234", ...ENV_AI };
  await runTestDates({ store, reader: reader(), ai: datesAi().ai, env: ENV_AI, now: () => T0, budgetMs: 1e9, countries: ["Pakistan", "India"], tests: ["oet", "prep"] });
  await store.putFact({ key: "council|Pakistan|nursing", country: "Pakistan", profession: "nursing", part: "councils", kind: "council", value: { name: "Invented Council", website: "https://ic.example", address: "1 Invented Road, Islamabad 44000" }, sourceUrl: "https://ic.example/contact", readOn: "2026-10-26", status: "confirmed", proposedBy: "ai" }, { at: `${ON}T10:00:00Z` });
  await store.setTask("Pakistan", "councils", { day: ON, state: "searching", note: "x" });
  const app = createApp({ mode: "public-lite", env, kvFetch: K.fetchImpl, kwStore: memoryStore(), cfStore: store, cfReader: reader(), cfAi: datesAi().ai, now: () => T0 });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`, cookie = ownerCookie({ OWNER_ACCESS_KEY: OWNER_KEY }, T0).split(";")[0];
  const get = async (p, h = { cookie }) => { const r = await fetch(base + p, { headers: h, redirect: "manual" }); return { status: r.status, text: await r.text() }; };
  try {
    const own = (await get("/owner")).text;
    assert.match(own, /<nav class="row" aria-label="Owner pages"><b>Keywords<\/b> · <a href="\/owner\/countries">Countries<\/a><\/nav><p class="fine">Keywords today 0 · first 15 countries 0% done · question groups 0 · test dates found for 2 test × country · Search Console: not read yet<\/p>/);
    const c = (await get("/owner/countries")).text;
    assert.match(c, /<nav class="row" aria-label="Owner pages"><a href="\/owner">Keywords<\/a> · <b>Countries<\/b><\/nav>/);
    assert.match(c, /<details open><summary>All 197 countries, in the queue's order \(tap a country\)<\/summary>/);
    assert.match(c, /<tr><th>Country<\/th><th>Fee<\/th><th>Questions \(groups \/ answered\)<\/th><th>Centres<\/th><th>Councils \(of 12\)<\/th><th>Rules<\/th><th>Test dates<\/th><th>Last updated<\/th><\/tr>/);
    assert.match(c, /<tr><td><a href="\/owner\/countries\?c=Pakistan">Pakistan<\/a><\/td><td>—<\/td><td>—<\/td><td>—<\/td><td>1\/12 <span class="fine">2026-10-26<\/span> · searching<\/td><td>—<\/td><td>2 dates <span class="fine">2026-10-27<\/span><\/td><td>2026-10-27<\/td><\/tr>/);
    assert.match(c, /<tr><td><a href="\/owner\/countries\?c=India">India<\/a><\/td><td>—<\/td><td>—<\/td><td>—<\/td><td>—<\/td><td>—<\/td><td>none found <span class="fine">2026-10-27<\/span><\/td><td>—<\/td><\/tr>/);
    assert.ok(c.indexOf(">India<") < c.indexOf(">Pakistan<") && c.indexOf(">Pakistan<") < c.indexOf(">Afghanistan<"), "the queue's order");
    assert.doesNotMatch(c, /The first 30 countries of the queue|the grid\)/, "the list and the grid are gone");
    const ielts = (await get("/owner/countries?p=prep")).text;
    assert.match(ielts, /<td><a href="\/owner\/countries\?c=Pakistan&amp;p=prep">Pakistan<\/a><\/td>.*?<td>no public dates <span class="fine">2026-10-27<\/span><\/td>/s);
    for (const p of ["/cron/test-dates", "/cron/search-console"]) { assert.equal((await get(p, {})).status, 401); assert.equal((await get(p, { authorization: "Bearer cron-secret-for-tests-1234" })).status, 200); }
  } finally { await new Promise((r) => srv.close(r)); }
});
