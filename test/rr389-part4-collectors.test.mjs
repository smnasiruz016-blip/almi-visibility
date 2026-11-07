/**
 * RR-389 PART 4 · the free collectors that were still MISSING: official news (rules that change), jobs and wages (BLS OEWS, O*NET), keywords
 * in other languages (the owner's Keyword Planner, Google's own language codes), and OpenStreetMap's own specialty tag. Each: twice a day,
 * inside the one $2 a day, robots.txt obeyed, its source and date on every row. Stand-ins only: no outside call in this test.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { robotsAllows, feedItems, pageItems, runNews, runJobs, wageRows, onetRows, oewsSeries, languageUnits, MORE_LANGUAGES, NEWS_SOURCES } from "../site/rr389-collectors.mjs";
import { placesOf } from "../desktop/local-seo.mjs";
import { MC_CRONS } from "../tools/bundle-site.mjs";

const memSeo = () => { const settings = new Map(), rows = []; return { settings, rows, setting: async (k) => settings.get(k) ?? null, setSetting: async (k, v) => { settings.set(k, v); }, putSearches: async (r) => { rows.push(...r); }, spendSince: async () => [] }; };
const cfZero = { spend: async () => ({ aiUsd: 0 }) };

test("robots.txt: the longest rule wins, Allow wins a tie, wildcards and $ end; our own group before *", () => {
  const r = "User-agent: *\nDisallow: /*/print$\nDisallow: /search\nAllow: /search/docs\n\nUser-agent: AlmiVisibility\nDisallow: /private\n";
  assert.equal(robotsAllows(r, "https://x.org/news/page"), true); assert.equal(robotsAllows(r, "https://x.org/a/print"), true, "our own group applies, not *");
  assert.equal(robotsAllows("User-agent: *\nDisallow: /*/print$\nDisallow: /search\nAllow: /search/docs", "https://x.org/a/print"), false);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /*/print$", "https://x.org/a/print/more"), true, "$ ends the rule");
  assert.equal(robotsAllows("User-agent: *\nDisallow: /search\nAllow: /search/docs", "https://x.org/search/docs/x"), true);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /search\nAllow: /search/docs", "https://x.org/search?q=1"), false);
  assert.equal(robotsAllows("User-agent: *\nDisallow: /", "https://x.org/anything"), false);
});

test("news: feeds and pages read into items; the first read only learns, a new rule-like item marks its site's facts due; robots refusing → not read; every row has its source and date", async () => {
  const rss = '<rss><channel><item><title>New fee for the test from 1 January</title><link>https://ex.org/news/fee</link><pubDate>Fri, 07 Nov 2026 10:00:00 GMT</pubDate></item></channel></rss>';
  assert.deepEqual(feedItems(rss), [{ title: "New fee for the test from 1 January", link: "https://ex.org/news/fee", date: "2026-11-07" }]);
  assert.equal(feedItems('<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>T is here</title><link rel="alternate" href="https://ex.org/a"/><updated>2026-11-01T00:00:00Z</updated></entry></feed>')[0].link, "https://ex.org/a");
  assert.deepEqual(pageItems('<a href="/news/2026/new-english-language-requirements">New English language requirements for nurses</a><a href="/about">About us and more words here ok</a><a href="https://other.org/news/x">Elsewhere news item headline here</a>', "https://nmc.example/news/"), [{ title: "New English language requirements for nurses", link: "https://nmc.example/news/2026/new-english-language-requirements", date: null }]);
  let feed = rss; const fetchImpl = async (u) => { if (u.endsWith("/robots.txt")) return new Response(u.includes("blocked") ? "User-agent: *\nDisallow: /" : "User-agent: *\nAllow: /", { status: 200 }); return new Response(feed, { status: 200 }); };
  const sources = [{ id: "a", name: "A news", url: "https://ex.org/feed.xml", products: ["oet"] }, { id: "b", name: "B", url: "https://blocked.org/feed.xml", products: ["oet"] }];
  const seo = memSeo(); const one = await runNews({ seo, cf: cfZero, env: {}, fetchImpl, sources });
  assert.equal(one.items, 0, "the first read only learns what is there"); assert.deepEqual(one.skipped.map((s) => s.source), ["b"], "robots.txt refused: not read");
  feed = rss.replace("</channel>", "<item><title>Score changes for nurses from March</title><link>https://ex.org/news/score</link></item></channel>");
  const two = await runNews({ seo, cf: cfZero, env: {}, fetchImpl, sources, robots: new Map() });
  assert.equal(two.items, 1); assert.equal(two.ruleItems, 1); assert.equal(seo.settings.get("rules-due-hosts")["ex.org"], two.day, "its site's facts are due at once");
  assert.ok(seo.rows.every((r) => r.day && r.data.source.name && r.data.source.url && r.data.source.readOn), "source and date on every row");
  assert.equal((await runNews({ seo, cf: cfZero, env: { ALMISEO_NEWS_OFF: "1" }, fetchImpl, sources })).ok, false, "its off switch");
  assert.equal((await runNews({ seo, cf: { spend: async () => ({ aiUsd: 5 }) }, env: {}, fetchImpl, sources })).ok, false, "the one $2 a day of every collector, read first");
  assert.ok(NEWS_SOURCES.every((s) => /^https:\/\//.test(s.url) && s.name && s.products.length), "every source named, https");
});

test("the rules collector reads at once every fact from a site the news named (it was due only by its calendar)", () => {
  const mc = readFileSync(new URL("../site/more-collectors.mjs", import.meta.url), "utf8");
  assert.match(mc, /const newsHosts = \(await seo\.setting\("rules-due-hosts"\)/); assert.match(mc, /if \(d && String\(checked\[r\.key\] \?\? r\.readOn \?\? ""\)\.slice\(0, 10\) < d\) \{ r\.due = true; r\.byNews = d; \}/);
});

test("jobs: BLS OEWS wages per occupation (mean and median, the year, US public domain) and O*NET occupations (CC BY 4.0), credited on every row", async () => {
  assert.equal(oewsSeries("291141", "04"), "OEUN000000000000029114104");
  const bls = { status: "REQUEST_SUCCEEDED", Results: { series: [{ seriesID: "OEUN000000000000029114104", data: [{ year: "2025", latest: "true", value: "101420" }] }, { seriesID: "OEUN000000000000029114113", data: [{ year: "2025", latest: "true", value: "97550" }] }, { seriesID: "OEUN000000000000015125204", data: [{ year: "2025", latest: "true", value: "-" }] }] } };
  const w = wageRows(bls, [["291141", "Registered nurses"], ["151252", "Software developers"]], { on: "2026-11-07" });
  assert.equal(w.length, 1, "a role with no figure makes no row"); assert.deepEqual([w[0].data.meanAnnualUsd, w[0].data.medianAnnualUsd, w[0].data.year], [101420, 97550, "2025"]); assert.match(w[0].data.source.licence, /public domain/);
  const o = onetRows({ column: [{ column_id: "onetsoc_code" }, { column_id: "title" }, { column_id: "description" }], row: [["29-1141.00", "Registered Nurses", "Assess patient health problems."]] }, { on: "2026-11-07" });
  assert.equal(o[0].data.title, "Registered Nurses"); assert.equal(o[0].data.source.licence, "CC BY 4.0");
  const seo = memSeo(); const fetchImpl = async (u) => (u.endsWith("/robots.txt") ? new Response("User-agent: *\nAllow: /") : u.includes("bls.gov") ? new Response(JSON.stringify(bls)) : new Response(JSON.stringify({ column: [{ column_id: "onetsoc_code" }, { column_id: "title" }], row: [["29-1141.00", "Registered Nurses"]] })));
  const r = await runJobs({ seo, cf: cfZero, env: {}, fetchImpl }); assert.equal(r.ok, true); assert.ok(r.wages >= 1 && r.occupations === 1, JSON.stringify(r));
  assert.match((await runJobs({ seo, cf: cfZero, env: {}, fetchImpl })).why, /read again after 30 days/, "once a month is enough: the next run does nothing");
});

test("languages: each product's own languages, asked with Google's own language codes in the plan's countries that speak them; the keyword collector runs them", () => {
  assert.equal(MORE_LANGUAGES.ur.constant, "languageConstants/1041"); assert.equal(MORE_LANGUAGES.ar.constant, "languageConstants/1019"); assert.equal(MORE_LANGUAGES.hi.constant, "languageConstants/1023");
  const u = languageUnits([{ id: "product:oet", key: "oet", kind: "product", seeds: ["oet exam"] }, { id: "category:x", key: "x", kind: "category", seeds: ["y"] }], { locations: [{ code: "PK", name: "Pakistan", geo: "geoTargetConstants/2586" }, { code: "IN", name: "India", geo: "g" }, { code: "AE", name: "UAE", geo: "g2" }] });
  assert.deepEqual(u.map((x) => x.id), ["product:oet|PK|ur", "product:oet|IN|hi", "product:oet|AE|ar"]);
  const kc = readFileSync(new URL("../site/kw-collector.mjs", import.meta.url), "utf8"); assert.match(kc, /langUnits = languageUnits\(groups, \{ locations: LOCATIONS, seedKeyOf \}\)/); assert.match(kc, /\.\.\.pl\.due, \.\.\.p\.due\.slice\(at\)/, "after every product, before the categories"); assert.match(kc, /\(LANGUAGES\[u\.language\] \?\? MORE_LANGUAGES\[u\.language\]\)\.constant/);
});

test("places: OpenStreetMap's own healthcare:speciality tag is kept with each place", () => {
  const p = placesOf({ elements: [{ type: "node", id: 1, lat: 1, lon: 2, tags: { name: "Clinic A", "healthcare:speciality": "dermatology;paediatrics" } }, { type: "node", id: 2, lat: 1, lon: 2, tags: { name: "B" } }] });
  assert.equal(p.find((x) => x.name === "Clinic A")?.speciality, "dermatology;paediatrics"); assert.equal(p.find((x) => x.name === "B")?.speciality, null);
});

test("twice a day with the PC off: /cron/news and /cron/jobs on the server, 12 hours apart", () => {
  for (const path of ["/cron/news", "/cron/jobs"]) assert.equal(MC_CRONS.filter((c) => c.path === path).length, 2, path);
  const app = readFileSync(new URL("../site/app.mjs", import.meta.url), "utf8"); assert.match(app, /u\.pathname === "\/cron\/news" \? await runNews\(\{ seo, cf, kv, env,/); assert.match(app, /u\.pathname === "\/cron\/jobs" \? await runJobs\(/);
});
