/**
 * RR-379 (owner, 6 Nov 2026: "AlmiVisibility must hold EVERY kind of SEO", wave 1): ASO, local SEO, technical SEO, rank tracking, click-rate
 * fixes and the AI search visibility tracker. Every answer here is the services' DOCUMENTED shape (docs.dataforseo.com, Apple's iTunes
 * Search API, Google's PageSpeed Insights and Search Console APIs, Anthropic / OpenAI / Perplexity / Gemini API references); nothing is paid.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { generateKeyPairSync } from "node:crypto";
import { parseStoreLink, appleListingOf, playListingOf, pastedListing, listingScore, keywordTable, searchRows, reviewRows, groupReviews, writeFaults, writeListing, draftReplies, STORES } from "../desktop/aso.mjs";
import { cleanProfile, siteNap, mapsMatch, napConsistency, localBusinessJsonLd, parseHours, gbpSheet, placesOf, directoryPage, digits } from "../desktop/local-seo.mjs";
import { psiResult, speedLines, schemaCheck, schemaLines, redirectChain, redirectLines, indexLine } from "../desktop/tech-seo.mjs";
import { chosenKeywords, scPositions, serpPosition, keepPoint, rankChart, rankTable, lowCtrPages, ctrFault, writeCtr, beforeAfter, due } from "../desktop/rank-track.mjs";
import { readAnswer, visibilityScore, byEngine, suggestions, aiOverviewOf, askChatGpt, askPerplexity, askGemini, askClaude, questionSet } from "../desktop/ai-visibility.mjs";
import { dfsBuyer, mayBuyTask, taskOf, jobSpent } from "../desktop/dfs-call.mjs";
import { FEATURES, menuFor } from "../desktop/features.mjs";
import { SEO_KINDS } from "../desktop/next-step.mjs";
import { guideList } from "../desktop/guides.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const res = (o, status = 200) => ({ ok: status < 400, status, json: async () => o, text: async () => (typeof o === "string" ? o : JSON.stringify(o)), headers: { get: () => null } });

/* ── ASO ── */
test("ASO: a store link is read for each store; anything else is refused in plain words", () => {
  assert.deepEqual(parseStoreLink("https://play.google.com/store/apps/details?id=com.example.app&hl=en&gl=GB"), { store: "play", id: "com.example.app", country: "gb", language: "en" });
  assert.equal(parseStoreLink("https://apps.apple.com/gb/app/example/id1234567890").id, "1234567890");
  assert.equal(parseStoreLink("https://apps.apple.com/gb/app/example/id1234567890").country, "gb");
  assert.equal(parseStoreLink("https://apps.microsoft.com/detail/9NBLGGH4NNS1").store, "ms");
  assert.match(parseStoreLink("https://example.com/app").why, /Google Play, the Apple App Store and the Microsoft Store/);
  assert.match(parseStoreLink("not a link").why, /not a store link/);
});
test("ASO: the listing score checks each store's OWN limits (with the store's page), and never uses a limit we could not confirm", () => {
  const L = { ...appleListingOf({ results: [{ trackId: 1, trackName: "Example Exam Prep: Speaking Practice App", description: "x".repeat(300), userRatingCount: 3, averageUserRating: 3.2, screenshotUrls: ["a"], artworkUrl512: "i", currentVersionReleaseDate: "2026-01-01T00:00:00Z", languageCodesISO2A: ["EN"], primaryGenreName: "Education" }] }), keywordsField: "" };
  const s = listingScore(L, { keywords: [{ text: "exam prep" }], today: "2026-11-06" });
  const title = s.lines.find((l) => l.area === "Title");
  assert.equal(title.ok, false); assert.match(title.problem, /Apple App Store allows 30/); assert.match(title.solution, /developer\.apple\.com|Apple Developer/);
  assert.ok(s.lines.some((l) => l.area === "Keyword field" && l.ok === false), "an empty Apple keyword field is a problem");
  assert.ok(s.lines.some((l) => l.area === "Ratings" && l.ok === false)); assert.ok(s.lines.some((l) => l.area === "Updates" && l.ok === false));
  assert.ok(s.score > 0 && s.score < 60, `score ${s.score}`);
  const ms = listingScore(pastedListing({ store: "ms", title: "A".repeat(80), long: "y".repeat(700), keywords: "one, two" }), { today: "2026-11-06" });
  assert.ok(!ms.lines.some((l) => l.area === "Title" && l.ok === false), "Microsoft's title limit is not confirmed: never a rule");
  assert.equal(STORES.ms.limits.title, null); assert.equal(STORES.play.limits.short, 80); assert.equal(STORES.apple.limits.keywords, 100);
});
test("ASO: Google Play's app_info and app_searches (DataForSEO's documented items) → the listing, the ranks, the competitors and the gaps", () => {
  const L = playListingOf({ app_id: "com.me", title: "Me", description: "d", rating: { value: 4.4, votes_count: 120 }, images: ["1", "2"], icon: "i", videos: [], last_update_date: "2026-10-01 00:00:00 +00:00", main_category: "Education", url: "https://play.google.com/store/apps/details?id=com.me" });
  assert.equal(L.rating, 4.4); assert.equal(L.video, false); assert.equal(L.short, null, "Google's short description is not in this data: said, never guessed");
  const rows = (ids) => searchRows([{ items: ids.map((id, i) => ({ type: "google_play_search_organic", rank_absolute: i + 1, app_id: id, title: id.toUpperCase(), rating: { value: 4, votes_count: id === "big" ? 50000 : 10 }, is_free: true })) }]);
  const t = keywordTable("com.me", [{ keyword: "exam practice", rows: rows(["big", "com.me", "c"]), source: "s" }, { keyword: "speaking test", rows: rows(["big", "c", "d"]), source: "s" }]);
  assert.equal(t.rows[0].rank, 2); assert.equal(t.rows[1].rank, null); assert.deepEqual(t.gaps, ["speaking test"]);
  assert.equal(t.competitors[0].id, "big"); assert.deepEqual(t.competitors[0].keywords, ["exam practice", "speaking test"]);
});
test("ASO: what the AI writes is refused when it breaks a limit, adds a number the listing lacks, or promises", () => {
  const L = pastedListing({ store: "play", title: "Exam Coach", short: "Practise speaking", long: "Practise for the exam with 20 role plays." });
  assert.deepEqual(writeFaults({ title: "Exam Coach: Speaking", short: "Practise speaking for the exam", long: "20 role plays.", keywordField: "", captions: ["Practise anywhere"], whatsNew: "Fixes" }, L), []);
  const bad = writeFaults({ title: "x".repeat(31), short: "Pass guaranteed", long: "50 role plays", keywordField: "a,b", captions: [], whatsNew: "" }, L);
  assert.ok(bad.some((f) => /title has 31/.test(f))); assert.ok(bad.some((f) => /states 50/.test(f))); assert.ok(bad.some((f) => /guarantee/.test(f))); assert.ok(bad.some((f) => /store that has none/.test(f)));
});
test("ASO: writing and replies ask Sonnet, inside the Monthly AI limit; replies never promise refunds or dates", async () => {
  const L = pastedListing({ store: "apple", title: "Exam Coach", short: "Speak", long: "Practise." }); let asked = null;
  const ask = async (o) => { asked = o; return { data: o.schema.required.includes("replies") ? { replies: [{ id: "r1", reply: "Thank you, we will look at it." }, { id: "r2", reply: "We will refund you by Monday." }] } : { title: "Exam Coach", short: "Speak", long: "Practise.", keywordField: "exam,coach", captions: [], whatsNew: "" }, usage: { input: 10, output: 10, model: "claude-sonnet-5-5" } }; };
  const w = await writeListing(L, { ask, key: "k" }); assert.equal(asked.model, "claude-sonnet-5-5"); assert.equal(w.ok, true);
  assert.equal((await writeListing(L, { ask, key: "k", allowed: () => false })).ok, false);
  const rep = await draftReplies([{ id: "r1", stars: 1, text: "crashes", answered: false }, { id: "r2", stars: 2, text: "too pricey", answered: false }], { ask, key: "k", appName: "Exam Coach" });
  assert.deepEqual(rep.replies.map((r) => r.id), ["r1"], "a reply that promises a refund or a day is dropped");
  const g = groupReviews(reviewRows([{ items: [{ review_text: "It crashes on login", rating: { value: 1 } }, { review_text: "Love it, very helpful", rating: { value: 5 } }, { review_text: "Too expensive subscription", rating: { value: 2 } }] }]));
  assert.equal(g.groups.bugs.length, 1); assert.equal(g.groups.praise.length, 1); assert.equal(g.groups.prices.length, 1);
});

/* ── LOCAL ── */
test("LOCAL: name, address and phone are compared across the site, Google's listing and pasted listings, each difference with its fix", () => {
  const { profile, missing } = cleanProfile({ name: "Crescent Grill", street: "12 High Street", city: "Leeds", country: "GB", phone: "+44 113 496 0000" }); assert.deepEqual(missing, []);
  const site = siteNap([{ url: "https://c.example/contact", text: "Crescent Grill, 12 High St, Leeds. Call 0113 496 0000", html: '<script type="application/ld+json">{"@type":"Restaurant","name":"Crescent Grill","telephone":"0113 496 0001","address":{"streetAddress":"12 High Street","addressLocality":"Leeds"}}</script>' }], profile);
  assert.ok(site.phones.includes(digits(profile.phone))); assert.equal(site.addresses.length, 1); assert.equal(site.markup[0].phone, "0113 496 0001");
  const g = mapsMatch([{ items: [{ type: "maps_search", rank_group: 2, title: "Crescent Grill", address: "12 High St, Leeds LS1", phone: "+44 113 496 0000", rating: { value: 4.5, votes_count: 88 }, cid: "123", is_claimed: false }] }], profile);
  assert.equal(g.found.rank, 2); assert.equal(g.found.cid, "123");
  const nap = napConsistency(profile, [{ source: "your website", name: "Crescent Grill", address: "12 High Street", phone: profile.phone }, { source: "markup", name: "Crescent Grill", address: "12 High Street, Leeds", phone: "0113 496 0001" }, { source: "Google", name: g.found.title, address: g.found.address, phone: g.found.phone }]);
  assert.equal(nap.rows.filter((r) => !r.ok).length, 1); assert.match(nap.lines.find((l) => l.ok === false).solution, /\+44 113 496 0000/);
});
test("LOCAL: LocalBusiness markup, hours and the Google Business Profile sheet are built from the profile only", () => {
  assert.deepEqual(parseHours("Mon-Fri 09:00-17:00; Sat 10:00-14:00").map((h) => h.dayOfWeek.length), [5, 1]);
  const j = JSON.parse(localBusinessJsonLd({ name: "N", street: "S", city: "C", country: "GB", phone: "1", hours: "Sun 1000-1400" }));
  assert.equal(j["@type"], "LocalBusiness"); assert.equal(j.address.addressLocality, "C"); assert.equal(j.openingHoursSpecification[0].opens, "10:00");
  assert.match(gbpSheet({ name: 'A "B"', street: "S", city: "C", country: "GB", phone: "1" }), /"A ""B"""/);
});
test("LOCAL directory mode: places from OpenStreetMap with source and date, links only, out of Google below 6 places", () => {
  const places = placesOf({ elements: [{ type: "node", id: 1, lat: 1, lon: 2, tags: { name: "Masjid A", "addr:street": "Road" } }, { type: "way", id: 2, center: { lat: 1, lon: 2 }, tags: {} }] });
  assert.equal(places.length, 1, "a place with no name is not listed"); assert.equal(places[0].osm, "https://www.openstreetmap.org/node/1");
  const pg = directoryPage({ kind: "mosque", city: "Leeds", places, on: "2026-11-06" });
  assert.equal(pg.indexable, false); assert.match(pg.html, /noindex/); assert.match(pg.html, /OpenStreetMap contributors \(ODbL\)/); assert.match(pg.html, /checked 2026-11-06/); assert.match(pg.html, /rel="nofollow noopener"/);
});

/* ── TECHNICAL ── */
test("TECHNICAL: PageSpeed Insights' documented answer → Core Web Vitals with Google's own categories and the biggest fixes", () => {
  const r = psiResult({ loadingExperience: { metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 4100, category: "SLOW" }, CUMULATIVE_LAYOUT_SHIFT_SCORE: { percentile: 5, category: "FAST" } } }, lighthouseResult: { categories: { performance: { score: 0.41 } }, audits: { "render-blocking-resources": { id: "render-blocking-resources", title: "Eliminate render-blocking resources", score: 0.2, details: { overallSavingsMs: 900 } }, "unused-css-rules": { id: "unused-css-rules", title: "x", score: 1, details: {} } } } }, "https://s.example/");
  assert.equal(r.score, 41); assert.equal(r.vitals.find((v) => v.name === "Cumulative Layout Shift").value, 0.05); assert.deepEqual(r.fixes.map((f) => f.id), ["render-blocking-resources"]);
  const lines = speedLines(r); assert.ok(lines.some((l) => l.ok === false && /Largest Contentful Paint/.test(l.problem))); assert.ok(lines.some((l) => /web\.dev/.test(l.solution ?? "") || /Web Vitals/.test(l.solution ?? "")));
  assert.equal(psiResult({ error: { message: "Quota" } }, "u").ok, false);
});
test("TECHNICAL: structured data is checked against Google's required fields; broken JSON is said", () => {
  const b = schemaCheck('<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Q?"}]}</script><script type="application/ld+json">{bad</script><script type="application/ld+json">{"@type":"Organization","name":"O","url":"https://o"}</script>');
  assert.equal(b.length, 3); assert.match(b[0].problems[0], /acceptedAnswer\.text/); assert.equal(b[1].ok, false); assert.equal(b[2].ok, true); assert.deepEqual(b[2].wants, ["logo"]);
  assert.ok(schemaLines("p", []).some((l) => l.ok === false));
  assert.deepEqual(schemaCheck('<script type="application/ld+json">{"@type":"Organization","name":"O"}</script>')[0].problems, ["Organization needs \"url\""], "a top-level field Google requires is said (sabotage: it stayed green before this line)");
});
test("TECHNICAL: redirect chains, temporary redirects and dead ends are followed hop by hop (never more than 5) and explained", async () => {
  const hops = { "http://s/a": [301, "https://s/a"], "https://s/a": [302, "https://s/b"], "https://s/b": [200] };
  const f = async (u) => ({ status: hops[u][0], headers: { get: (k) => (k === "location" ? hops[u][1] ?? null : null) } });
  const c = await redirectChain("http://s/a", { fetchImpl: f }); assert.equal(c.hops.length, 2); assert.equal(c.final, "https://s/b");
  const lines = redirectLines("http://s/a", c); assert.ok(lines.some((l) => /2 redirects/.test(l.line))); assert.ok(lines.some((l) => /temporary/.test(l.line)));
  const loop = await redirectChain("x://1", { fetchImpl: async (u) => ({ status: 301, headers: { get: () => (u === "x://1" ? "x://2" : "x://1") } }) }); assert.equal(loop.loop, true);
  assert.equal(indexLine("p", { inspectionResult: { indexStatusResult: { verdict: "PASS", coverageState: "Submitted and indexed", googleCanonical: "https://a/", userCanonical: "https://b/" } } }).ok, false, "Google chose another address: said");
});

/* ── RANK + CTR ── */
test("RANK: chosen words per country; Search Console's own average (impressions-weighted); live positions; the chart and the change", () => {
  const chosen = chosenKeywords(["OET for nurses", { keyword: "oet for nurses", country: "us" }, { keyword: "oet fee", country: "gb" }, { keyword: "x", country: "zz" }]);
  assert.deepEqual(chosen.map((c) => `${c.keyword}|${c.country}`), ["oet for nurses|us", "oet fee|gb"]);
  const sc = scPositions([{ keys: ["oet fee", "gbr"], position: 4, impressions: 30, clicks: 1 }, { keys: ["oet fee", "gbr"], position: 8, impressions: 10, clicks: 0 }], chosen);
  assert.equal(sc[0].position, 5);
  const s = serpPosition([{ items: [{ type: "organic", rank_group: 1, url: "https://other.com/a" }, { type: "organic", rank_group: 2, url: "https://www.me.com/oet" }] }], "me.com"); assert.equal(s.rank, 2); assert.deepEqual(s.above, ["other.com"]);
  let h = keepPoint(null, { key: "oet fee|gb", keyword: "oet fee", country: "gb", engine: "Google", on: "2026-10-30", rank: 9 }); h = keepPoint(h, { key: "oet fee|gb", keyword: "oet fee", country: "gb", engine: "Google", on: "2026-11-06", rank: 5 });
  assert.equal(rankTable(h)[0].change, 4); assert.equal(rankChart(h)[0].points.length, 2);
  assert.equal(due("2026-11-01", "2026-11-06"), false); assert.equal(due("2026-10-30", "2026-11-06"), true); assert.equal(due("2026-11-05", "2026-11-06", "day"), true);
});
test("CTR: a page is flagged against the SITE'S OWN click rate at the same position; written lines are refused on numbers and promises; before/after", async () => {
  const rows = [{ keys: ["/a"], position: 3, impressions: 1000, clicks: 10 }, { keys: ["/b"], position: 3, impressions: 500, clicks: 50 }, { keys: ["/c"], position: 3.2, impressions: 400, clicks: 40 }, { keys: ["/d"], position: 2.8, impressions: 300, clicks: 27 }];
  const low = lowCtrPages(rows); assert.deepEqual(low.map((p) => p.page), ["/a"]);
  const page = { url: "/a", title: "OET fee", description: "", h1: "OET fee 2026", text: "The fee is AUD 587." };
  assert.equal(ctrFault("OET fee 2026: AUD 587 explained", page, 60), null); assert.match(ctrFault("OET fee: AUD 600", page, 60), /600/); assert.match(ctrFault("The best OET guide", page, 60), /guarantee|ranking/);
  const w = await writeCtr(page, { ask: async () => ({ data: { titles: ["OET fee 2026: AUD 587", "OET fee: 100% pass"], descriptions: ["What the OET fee is in 2026 and what it covers, from the page itself, with the amount and where to pay it in Australia."] }, usage: null }), key: "k" });
  assert.deepEqual(w.titles, ["OET fee 2026: AUD 587"]); assert.equal(w.refused.length, 1);
  const days = Array.from({ length: 60 }, (_, i) => ({ keys: [new Date(Date.parse("2026-09-01") + i * 864e5).toISOString().slice(0, 10)], clicks: i < 30 ? 1 : 3, impressions: 100 }));
  const ba = beforeAfter(days, "2026-10-01"); assert.equal(ba.before.ctr, 1); assert.equal(ba.after.ctr, 3); assert.equal(ba.complete, true);
});

/* ── AI VISIBILITY ── */
test("AI VISIBILITY: each engine's documented answer → the text and the cited pages", async () => {
  const one = (o) => async () => res(o);
  const c = await askChatGpt({ key: "k", question: "q", fetchImpl: one({ output: [{ type: "web_search_call" }, { type: "message", content: [{ type: "output_text", text: "Try Example Prep.", annotations: [{ type: "url_citation", url: "https://example.com/oet", title: "Example" }] }] }], usage: { input_tokens: 1000, output_tokens: 200 } }) });
  assert.equal(c.cites[0].url, "https://example.com/oet"); assert.ok(c.usage.usd > 0.01 && c.usage.usd < 0.02);
  const p = await askPerplexity({ key: "k", question: "q", fetchImpl: one({ choices: [{ message: { content: "A" } }], search_results: [{ url: "https://a.com", title: "A" }], usage: { prompt_tokens: 10, completion_tokens: 10 } }) }); assert.equal(p.cites[0].url, "https://a.com");
  const g = await askGemini({ key: "k", question: "q", fetchImpl: one({ candidates: [{ content: { parts: [{ text: "G" }] }, groundingMetadata: { groundingChunks: [{ web: { uri: "https://vertexaisearch.cloud.google.com/x", title: "example.com" } }] } }] }) }); assert.equal(g.cites.length, 1);
  const cl = await askClaude({ key: "k", question: "q", fetchImpl: one({ model: "claude-sonnet-5-5", content: [{ type: "text", text: "B", citations: [{ type: "web_search_result_location", url: "https://b.com", title: "B" }] }], usage: { input_tokens: 5, output_tokens: 5, server_tool_use: { web_search_requests: 1 } } }) }); assert.equal(cl.usage.searches, 1); assert.equal(cl.usage.model, "claude-sonnet-5-5");
  assert.equal((await askChatGpt({ key: "k", question: "q", fetchImpl: async () => res({}, 401) })).stop, true);
  const ov = aiOverviewOf([{ items: [{ type: "ai_overview", items: [{ type: "ai_overview_element", text: "Overview", references: [{ url: "https://me.com/p", source: "Me" }] }] }] }]); assert.equal(ov.cites[0].url, "https://me.com/p");
  assert.equal(aiOverviewOf([{ items: [{ type: "organic" }] }]).none, true);
});
test("AI VISIBILITY: named / cited / competitors; the score; what to do for each answer you are missing", () => {
  const o = { brand: "AlmiOET", domain: "almioet.com", competitors: ["E2 Language"] };
  const a = readAnswer({ text: "AlmiOET and E2 Language both help.", cites: [{ url: "https://www.almioet.com/oet", title: "x" }] }, o); assert.deepEqual([a.mentioned, a.cited, a.competitorsNamed], [true, true, ["E2 Language"]]);
  const b = readAnswer({ text: "Use the official site.", cites: [{ url: "https://oet.com/x", title: "OET" }] }, o); assert.deepEqual([b.mentioned, b.cited, b.otherSites], [false, false, ["oet.com"]]);
  assert.equal(readAnswer({ text: "almioetic", cites: [] }, o).mentioned, false, "a name inside another word does not count");
  const rows = [{ question: "q1", engine: "claude", ...a }, { question: "q2", engine: "claude", ...b }, { question: "q2", engine: "aio", none: true }, { question: "q3", engine: "chatgpt", fail: "no key" }];
  assert.equal(visibilityScore(rows), 50); assert.equal(byEngine(rows).find((e) => e.engine === "claude").score, 50);
  const s = suggestions(rows, { site: "https://almioet.com" }); assert.equal(s.length, 1); assert.deepEqual(s[0].citedInstead, ["oet.com"]);
  assert.deepEqual(questionSet({ own: ["Is OET hard?"], phrases: [{ text: "oet speaking practice" }], brand: "AlmiOET", max: 3 }).map((q) => q.question), ["Is OET hard?", "oet speaking practice", "What is AlmiOET?"]);
});

/* ── MONEY ── */
test("MONEY: a DataForSEO purchase is refused BEFORE it is sent past the day, month or run budget; booked with its job; kept and reused free", async () => {
  const ledger = { spent: [{ on: "2026-11-06T01:00:00Z", cost: 0.995, job: "x" }] };
  assert.match(mayBuyTask(ledger, { worst: 0.01, capDay: 1, capMonth: 30, now: "2026-11-06T02:00:00Z" }).why, /Today's search-data cap/);
  assert.equal(mayBuyTask({ spent: [] }, { worst: 0.01, capDay: 0, capMonth: 30 }).ok, false);
  let sent = 0; const l = { spent: [] }, f = async (u) => { sent++; return res({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.002, id: "t", result: [{ items: [] }] }] }); };
  const b = dfsBuyer({ job: "rank", ledger: l, creds: { login: () => "l", password: () => "p" }, settings: { on: true, capDay: 1, capMonth: 30 }, runBudget: 0.005, fetchImpl: f, now: () => "2026-11-06T02:00:00Z" });
  assert.equal((await b.live("/p", { k: 1 }, { worst: 0.003, what: "a" })).ok, true); assert.equal((await b.live("/p", { k: 1 }, { worst: 0.003, what: "a" })).fromKept, true);
  const third = await b.live("/p", { k: 2 }, { worst: 0.004, what: "b" }); assert.equal(third.ok, false); assert.match(third.why, /run's budget/); assert.equal(sent, 1);
  assert.equal(jobSpent(l, "rank", "2026-11-06T03:00:00Z").today, 0.002);
  const off = dfsBuyer({ job: "aso", ledger: { spent: [] }, creds: { login: () => "", password: () => "" }, settings: { on: true, capDay: 1, capMonth: 30 }, fetchImpl: f }); assert.match((await off.live("/p", {}, { worst: 0.001 })).why, /No DataForSEO login/);
  assert.equal(taskOf({ status_code: 20000, tasks: [{ status_code: 40501, status_message: "Invalid Field" }] }).ok, false);
});
test("MONEY: a queued App Data task is posted once, collected free, and a task still in the queue is not paid again next time", async () => {
  const l = { spent: [] }; let posts = 0, gets = 0, ready = false;
  const f = async (u) => { if (u.includes("task_post")) { posts++; return res({ status_code: 20000, tasks: [{ status_code: 20100, id: "abc", cost: 0.0015 }] }); } gets++; return res({ status_code: 20000, tasks: [ready ? { status_code: 20000, result: [{ items: [{ app_id: "x" }] }] } : { status_code: 40602, status_message: "Task In Queue" }] }); };
  const mk = () => dfsBuyer({ job: "aso", ledger: l, creds: { login: () => "l", password: () => "p" }, settings: { on: true, capDay: 1, capMonth: 30 }, fetchImpl: f, waitMs: 0, everyMs: 0, sleep: async () => {} });
  const first = await mk().queued("/app_data/google/app_searches", { keyword: "a" }, { worst: 0.01, what: "s" }); assert.equal(first.later, true);
  ready = true; const second = await mk().queued("/app_data/google/app_searches", { keyword: "a" }, { worst: 0.01, what: "s" });
  assert.equal(second.ok, true); assert.equal(posts, 1, "posted once"); assert.equal(l.spent.length, 1); assert.equal(l.spent[0].job, "aso");
});

/* ── THE APP ── */
test("HOME + GUIDE: the six jobs are on the first screen under \"Every kind of SEO\", each with a guide; a job that needs a site says so", () => {
  for (const id of ["aso", "local", "tech", "rank", "ctr", "aiv"]) { assert.ok(FEATURES.some((f) => f.id === id)); assert.ok(SEO_KINDS.includes(id)); assert.ok(guideList().some((g) => g.id === `seo-${id}`), `guide seo-${id}`); }
  const m = menuFor({ hasSite: false, noWebsite: true }); assert.ok(m.cards.some((c) => c.id === "aso"), "ASO works without a website"); assert.ok(m.websiteOnly.cards.some((c) => c.id === "tech"));
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8"); assert.match(ui, /Every kind of SEO/); assert.match(ui, /function jobScreen/); assert.match(ui, /r\.open === "job"/);
});

function standIn() {
  const seen = []; let base;
  const srv = createServer((q, r) => { let body = ""; q.on("data", (c) => (body += c)); q.on("end", () => {
    const u = new URL(q.url, "http://x"), [host, ...rest] = u.pathname.slice(1).split("/"), path = `/${rest.join("/")}`; seen.push({ host, path, method: q.method, body });
    const j = (o, s = 200) => { r.writeHead(s, { "content-type": "application/json" }); r.end(JSON.stringify(o)); }, h = (t, s = 200) => { r.writeHead(s, { "content-type": "text/html" }); r.end(t); };
    if (host === "itunes.apple.com" && path === "/lookup") return j({ results: [{ trackId: 1111111111, trackName: "Fixture Coach", description: "Practise speaking for the fixture exam with role plays.", userRatingCount: 40, averageUserRating: 4.6, screenshotUrls: ["a", "b", "c", "d"], artworkUrl512: "i", currentVersionReleaseDate: new Date().toISOString(), languageCodesISO2A: ["EN", "FR"], primaryGenreName: "Education", trackViewUrl: "https://apps.apple.com/us/app/fixture/id1111111111" }] });
    if (host === "api.dataforseo.com") {
      if (path.endsWith("/task_post")) return j({ status_code: 20000, tasks: [{ status_code: 20100, id: `t${seen.length}`, cost: 0.0015 }] });
      if (path.includes("/app_searches/task_get/")) return j({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ items: [{ type: "app_store_search_organic", rank_absolute: 1, app_id: "999", title: "Rival", rating: { value: 4.8, votes_count: 20000 } }, { type: "app_store_search_organic", rank_absolute: 2, app_id: "1111111111", title: "Fixture Coach" }] }] }] });
      if (path.includes("/serp/") && path.includes("task_get")) return j({ status_code: 20000, tasks: [{ status_code: 20000, result: [{ items: [{ type: "organic", rank_group: 1, url: "https://rival.example/" }, { type: "organic", rank_group: 3, url: `${base}/x` }] }] }] });
      if (path.includes("/maps/live")) return j({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.002, result: [{ items: [{ type: "maps_search", rank_group: 1, title: "Fixture Grill", address: "1 Test Road, Leeds", phone: "0113 000 0000", cid: "77", is_claimed: true, rating: { value: 4.2, votes_count: 9 } }] }] }] });
      if (path.includes("/organic/live")) return j({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.004, result: [{ items: [{ type: "ai_overview", items: [{ text: "Fixture Coach helps.", references: [{ url: "https://fixture.example/p", source: "Fixture" }] }] }] }] }] });
    }
    if (host === "api.anthropic.com") { const b = JSON.parse(body || "{}"); if (b.tools) return j({ model: "claude-sonnet-5-5", content: [{ type: "text", text: "Fixture Coach is one option.", citations: [{ type: "web_search_result_location", url: "https://fixture.example/a", title: "Fixture" }] }], usage: { input_tokens: 2000, output_tokens: 200, server_tool_use: { web_search_requests: 1 } } }); return j({ model: "claude-sonnet-5-5", stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ title: "Fixture Coach: Speaking", short: "Practise speaking", long: "Practise speaking for the fixture exam with role plays.", keywordField: "speaking,roleplay", captions: ["Practise role plays"], whatsNew: "Fixes" }) }], usage: { input_tokens: 500, output_tokens: 200 } }); }
    if (host === "www.googleapis.com" && path.startsWith("/pagespeedonline")) return j({ loadingExperience: { metrics: { LARGEST_CONTENTFUL_PAINT_MS: { percentile: 1800, category: "FAST" } } }, lighthouseResult: { categories: { performance: { score: 0.93 } }, audits: {} } });
    if (host === "127.0.0.1" || host.startsWith("127.0.0.1:")) return h(`<html><head><title>Fixture</title><script type="application/ld+json">{"@type":"Organization","name":"F","url":"${base}"}</script></head><body><h1>Fixture</h1></body></html>`);
    if (["api.openai.com", "api.perplexity.ai", "generativelanguage.googleapis.com", "nominatim.openstreetmap.org", "overpass-api.de"].includes(host)) return j({ error: "unknown" }, 404);
    return h(`<html><head><title>Fixture</title><meta name="description" content="Fixture"></head><body><h1>Fixture Grill</h1><p>1 Test Road, Leeds. Call 0113 000 0000</p></body></html>`);
  }); });
  return { seen, listen: () => new Promise((ok) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; ok(base); })), close: () => srv.close() };
}
async function app(extra) {
  const dir = mkdtempSync(join(tmpdir(), "rr379-app-")), kp = generateKeyPairSync("ed25519");
  writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testAllowLocalSites: true, testOffline: true, keysDir: dir, weeklyFirstMs: 2147483647, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", keywordServiceUrl: "http://127.0.0.1:9/", ...extra }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/_API_KEY$|_TOKEN$|APP_PASSWORD|DATAFORSEO/.test(k)));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  for (let i = 0; i < 150 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then(async (r) => ({ ...(await r.json()), http: r.status }));
  const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
  return { dir, post, get, close: () => { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}
test("IN THE APP: each job opens its screen; ASO reads Apple's listing free, buys the store search inside the caps, writes with Sonnet; money is booked per job; AI tracker scores", async () => {
  const s = standIn(), base = await s.listen(), a = await app({ testJobBases: { origin: base }, dataForSeo: { on: true, capDay: 1, capMonth: 30 } });
  try {
    for (const [k, v] of [["DATAFORSEO_LOGIN", "fixture-login"], ["DATAFORSEO_PASSWORD", "fixture-pass"], ["ANTHROPIC_API_KEY", "sk-ant-fixture-000000000000"]]) assert.equal((await a.post(`/api/keys/${k}`, { key: v })).http, 200);
    const made = await a.post("/api/products", { name: "Fixture Coach", site: base, goal: { grow: "website", hasWebsite: true } }); assert.ok(made.product, JSON.stringify(made)); const id = made.product.id;
    assert.deepEqual(await a.post(`/api/products/${id}/feature/aso`, {}).then((r) => ({ open: r.open, job: r.job })), { open: "job", job: "aso" });
    const V = await a.get(`/api/products/${id}/job/aso`); assert.equal(V.title, "App stores (ASO)"); assert.ok(V.buttons.every((b) => b.cost)); assert.match(V.money, /Search data for this job/);
    const r1 = await a.post(`/api/products/${id}/job/aso/read`, { link: "https://apps.apple.com/us/app/fixture/id1111111111", keywords: "speaking practice" }); assert.equal(r1.http, 200, JSON.stringify(r1)); assert.match(r1.line, /score \d+ of 100/);
    const r2 = await a.post(`/api/products/${id}/job/aso/keywords`, {}); assert.equal(r2.http, 200, JSON.stringify(r2)); assert.ok(r2.view.sections.some((x) => x.title === "Competitors"));
    const r3 = await a.post(`/api/products/${id}/job/aso/write`, { language: "English" }); assert.equal(r3.http, 200, JSON.stringify(r3)); assert.ok(r3.view.sections.some((x) => /A better listing/.test(x.title)));
    const led = JSON.parse(readFileSync(join(a.dir, "dataforseo-ledger.json"), "utf8")); assert.ok(led.spent.length >= 1 && led.spent.every((x) => x.job === "aso"));
    const ai = JSON.parse(readFileSync(join(a.dir, "ai-usage.json"), "utf8")); assert.ok(Object.values(ai.days).some((d) => d.routes?.aso?.requests >= 1), "the AI writing is on its own route, inside the Monthly AI limit");
    const money = await a.get(`/api/products/${id}/data-lines`); assert.ok(money.money.some((m) => m.what === "App stores (ASO) (search data)" && m.month !== "$0.0000"));
    const t = await a.post(`/api/products/${id}/job/tech/run`, { max: "1" }); assert.equal(t.http, 200, JSON.stringify(t)); assert.ok(t.view.sections.some((x) => x.title === "Speed"));
    const v = await a.post(`/api/products/${id}/job/aiv/run`, { brand: "Fixture Coach", domain: "fixture.example", questions: "Which app helps with fixture speaking?", engines: "claude, chatgpt, aio" });
    assert.equal(v.http, 200, JSON.stringify(v)); assert.match(v.line, /Score \d+ of 100/); assert.match(v.line, /Not asked: ChatGPT/, "no OpenAI key: skipped and said, never paid");
    assert.ok(!s.seen.some((x) => x.host === "api.openai.com"));
    const loc = await a.post(`/api/products/${id}/job/local/check`, { name: "Fixture Grill", street: "1 Test Road", city: "Leeds", country: "GB", phone: "0113 000 0000", website: base });
    assert.equal(loc.http, 200, JSON.stringify(loc)); assert.match(loc.line, /% the same/);
    assert.equal((await a.post(`/api/products/${id}/job/aso/nothing`, {})).http, 400);
    for (const f of ["config.json", "dataforseo-ledger.json", "ai-usage.json"]) assert.ok(!readFileSync(join(a.dir, f), "utf8").includes("fixture-pass"), `no key in ${f}`);
  } finally { a.close(); s.close(); }
});
