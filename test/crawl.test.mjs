import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

import { BoundedFrontier, MAX_URLS_PER_RUN, MAX_REQUESTS_PER_HOST, FrontierCapExceeded } from "../src/crawl/frontier.mjs";
import { createRobotsCache, parseRobots, isAllowedByRules, USER_AGENT } from "../src/crawl/robots.mjs";
import { createFetcher, MAX_RESPONSE_BYTES } from "../src/crawl/fetcher.mjs";
import { crawl, planRun, renderPlan } from "../src/crawl/crawler.mjs";
import { buildInventory, unlinkedWithinCrawledSet, summariseRun } from "../src/crawl/inventory.mjs";
import { parseSitemap, extractLinks } from "../src/crawl/seeds.mjs";
import { formatBoundedResult, REQUIRED_BOUNDS } from "../src/report/bounded.mjs";

/* ================================================================== *
 * 🔴 ZERO NETWORK EGRESS — PROVED, NOT ASSUMED.
 *
 * Two independent guards, because one of them could be the thing that breaks:
 *
 *   1. `globalThis.fetch` is replaced with a function that THROWS. Any code
 *      that reaches for the global instead of the injected implementation
 *      fails the test rather than quietly leaving the machine.
 *   2. Every URL the injected fetch is asked for is recorded, and a test
 *      asserts every one of them was 127.0.0.1.
 *
 * Node runs each test FILE in its own process, so this replacement cannot
 * affect any other suite.
 * ================================================================== */

const EGRESS = [];

/** Captured BEFORE the global is poisoned, so the fixture server stays reachable. */
const realFetch = globalThis.fetch.bind(globalThis);

globalThis.fetch = () => {
  throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS — the crawler must use the injected fetchImpl");
};

/**
 * The ONLY fetch any test hands to production code. Records every URL so the
 * egress assertion at the foot of this file has something real to check.
 */
const fixtureFetch = (url, init) => {
  EGRESS.push(String(url));
  return realFetch(url, init);
};

let server;
let origin;
let requestLog = [];
let robotsStatus = 200;
let robotsBody = "User-agent: *\nDisallow: /private\n";

before(async () => {
  server = createServer((req, res) => {
    requestLog.push(req.url);
    if (req.url === "/robots.txt") {
      if (robotsStatus >= 400) {
        res.writeHead(robotsStatus, { "content-type": "text/plain" });
        return res.end("error");
      }
      res.writeHead(200, { "content-type": "text/plain" });
      return res.end(robotsBody);
    }
    if (req.url === "/big") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end("x".repeat(3 * 1024 * 1024));
    }
    if (req.url === "/private") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end("<html>private</html>");
    }
    if (req.url === "/a") {
      res.writeHead(200, { "content-type": "text/html", "x-robots-tag": "noindex" });
      return res.end('<html><a href="/b">b</a><a href="/c">c</a></html>');
    }
    if (req.url === "/b") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end('<html><a href="/a">a</a></html>');
    }
    if (req.url === "/c") {
      res.writeHead(200, { "content-type": "text/html" });
      return res.end("<html>orphan-ish</html>");
    }
    if (req.url === "/404") {
      res.writeHead(404, { "content-type": "text/html" });
      return res.end("nope");
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html>ok</html>");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

/* ================================================================== *
 * PART ONE — 🔴 THE HARD CAP. THE ONE THAT CARRIES REAL MONEY.
 * ================================================================== */

test("🔴 CAP: 10,000 seeds yield EXACTLY 500 queued and capReached=true", () => {
  const seeds = Array.from({ length: 10000 }, (_, i) => `https://h${i % 40}.example.com/p${i}`);
  const plan = planRun({ seeds });
  assert.equal(plan.urlsQueued, MAX_URLS_PER_RUN, "the frontier must stop at exactly the cap");
  assert.equal(plan.urlsQueued, 500);
  assert.equal(plan.capReached, true);
  assert.ok(plan.urlsRejected > 0);
});

test("🔴 CAP: a run that hit the cap is PARTIAL, never COMPLETE", () => {
  const run = summariseRun({
    run_id: "r", started_at: "t", finished_at: "t", seedSource: "EXPLICIT_LIST",
    urlsRequested: 500, urlsFetched: 500, requestsIssued: 500, perHostRequests: {},
    capReached: true, maxUrlsPerRun: MAX_URLS_PER_RUN, maxRequestsPerHost: 200, maxResponseBytes: 1,
    cost: null,
  });
  assert.equal(run.coverageState, "PARTIAL");
});

test("🔴 CAP: capacity cannot be raised above the module constant", () => {
  assert.throws(() => new BoundedFrontier({ capacity: MAX_URLS_PER_RUN + 1 }), FrontierCapExceeded);
});

test("CAP: push() THROWS past capacity where a silent drop would be a defect", () => {
  const f = new BoundedFrontier({ capacity: 2 });
  f.push("https://e.example.com/1");
  f.push("https://e.example.com/2");
  assert.throws(() => f.push("https://e.example.com/3"), FrontierCapExceeded);
});

test("CAP: the per-host budget stops one host eating the whole run", () => {
  const seeds = Array.from({ length: 400 }, (_, i) => `https://one.example.com/p${i}`);
  const plan = planRun({ seeds, maxPerHost: 50 });
  assert.equal(plan.urlsQueued, 50);
  assert.equal(plan.capReached, true);
});

test("CAP: duplicates are not counted as cap rejections", () => {
  const f = new BoundedFrontier({ capacity: 10 });
  f.offer("https://e.example.com/x");
  f.offer("https://e.example.com/x");
  assert.equal(f.size, 1);
  assert.equal(f.rejected, 0, "a duplicate is not a refusal for want of capacity");
});

/* ================================================================== *
 * PART TWO — 🔴 robots.txt FAILS CLOSED.
 * ================================================================== */

test("🔴 ROBOTS 5xx: the host is DISALLOWED and the state is UNKNOWN — never 'allowed'", async () => {
  const cache = createRobotsCache({ fetchImpl: async () => ({ status: 503, ok: false, text: async () => "" }) });
  const v = await cache.check("https://x.example.com/a");
  assert.equal(v.allowed, false, "a server error is not permission");
  assert.equal(v.state, "UNKNOWN", "'UNKNOWN' and 'DISALLOWED' are different facts and must not collapse");
});

test("🔴 ROBOTS timeout: also DISALLOWED + UNKNOWN", async () => {
  const cache = createRobotsCache({
    fetchImpl: async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; },
  });
  const v = await cache.check("https://x.example.com/a");
  assert.equal(v.allowed, false);
  assert.equal(v.state, "UNKNOWN");
});

test("ROBOTS 404 is an ANSWER — absence of rules is not absence of a reply", async () => {
  const cache = createRobotsCache({ fetchImpl: async () => ({ status: 404, ok: false, text: async () => "" }) });
  const v = await cache.check("https://x.example.com/a");
  assert.equal(v.allowed, true);
  assert.equal(v.state, "ALLOWED");
});

test("ROBOTS: a Disallow is obeyed, and a sibling path is not", async () => {
  const cache = createRobotsCache({
    fetchImpl: async () => ({ status: 200, ok: true, text: async () => "User-agent: *\nDisallow: /private\n" }),
  });
  assert.equal((await cache.check("https://x.example.com/private/a")).allowed, false);
  assert.equal((await cache.check("https://x.example.com/public/a")).allowed, true);
});

test("ROBOTS: fetched ONCE per host per run", async () => {
  let calls = 0;
  const cache = createRobotsCache({
    fetchImpl: async () => { calls += 1; return { status: 200, ok: true, text: async () => "User-agent: *\n" }; },
  });
  await cache.check("https://x.example.com/a");
  await cache.check("https://x.example.com/b");
  await cache.check("https://x.example.com/c");
  assert.equal(calls, 1);
});

test("ROBOTS: the user agent is honest and does not name another crawler", () => {
  assert.match(USER_AGENT, /^AlmiVisibilityBot\/0\.1/);
  assert.ok(!/googlebot|bingbot|slurp/i.test(USER_AGENT), "§832: never spoof another crawler");
});

test("ROBOTS parser: a longer Allow beats a shorter Disallow", () => {
  const rules = parseRobots("User-agent: *\nDisallow: /a\nAllow: /a/b\n");
  assert.equal(isAllowedByRules(rules, "https://e.example.com/a/x"), false);
  assert.equal(isAllowedByRules(rules, "https://e.example.com/a/b"), true);
});

/* ================================================================== *
 * PART THREE — 🔴 DRY RUN ISSUES NOTHING.
 * ================================================================== */

test("🔴 DRY RUN: without live, ZERO requests are issued — asserted on the injected fetch", async () => {
  let calls = 0;
  const spy = async () => { calls += 1; throw new Error("should never be called"); };
  const result = await crawl({
    seeds: ["https://x.example.com/a", "https://x.example.com/b"],
    seedSource: "EXPLICIT_LIST",
    fetchImpl: spy,
  });
  assert.equal(calls, 0, "a dry run must not touch the network");
  assert.equal(result.dryRun, true);
  assert.equal(result.run.requestsIssued, 0);
  assert.equal(result.run.urlsFetched, 0);
});

test("🔴 DRY RUN: the plan is produced BEFORE any request, and names the billable host", async () => {
  let planSeen = null;
  await crawl({
    seeds: ["https://x.example.com/a"],
    seedSource: "EXPLICIT_LIST",
    fetchImpl: async () => { throw new Error("no"); },
    onPlan: (p) => { planSeen = p; },
  });
  assert.ok(planSeen, "onPlan must fire before any fetch");
  const text = renderPlan(planSeen, { live: false });
  assert.match(text, /DRY RUN/);
  assert.match(text, /billable traffic on our own Vercel account/);
  assert.match(text, /x\.example\.com/);
});

test("🔴 DRY RUN: the plan says WOULD, not 'issued' — a dry run issues nothing", () => {
  const plan = planRun({ seeds: ["https://x.example.com/a"] });
  const dry = renderPlan(plan, { live: false });
  assert.match(dry, /WOULD be issued/, "a dry run must not claim requests were issued");
  assert.ok(!/requests issued to host/.test(dry), "the dry-run plan states a falsehood");
  assert.match(dry, /None issued: this is a dry run/);

  const wet = renderPlan(plan, { live: true });
  assert.match(wet, /WILL be issued/);
});

test("🔴 DRY RUN: coverageState is UNKNOWN — 'COMPLETE' over an empty measurement is vacuous", async () => {
  const result = await crawl({
    seeds: ["https://x.example.com/a", "https://x.example.com/b"],
    seedSource: "EXPLICIT_LIST",
    fetchImpl: async () => { throw new Error("no"); },
  });
  assert.equal(result.run.urlsFetched, 0);
  assert.equal(result.run.coverageState, "UNKNOWN", "a run that measured nothing cannot be COMPLETE");
});

/* ================================================================== *
 * PART FOUR — 🔴 LAW-BOUND-1. EVERY BOUNDED RESULT PRINTS ITS BOUND.
 * ================================================================== */

test("🔴 LAW-BOUND-1: a bounded report with NO bound throws and names the law", () => {
  assert.throws(() => formatBoundedResult({ label: "x", bounds: {}, fields: { a: 1 } }), /LAW-BOUND-1/);
  assert.throws(() => formatBoundedResult({ label: "x", bounds: { cap: undefined }, fields: {} }), /LAW-BOUND-1/);
});

test("🔴 LAW-BOUND-1: the CRAWL RUN report prints maxUrlsPerRun beside urlsFetched", () => {
  const run = summariseRun({
    run_id: "r", started_at: "t", finished_at: "t", seedSource: "EXPLICIT_LIST",
    urlsRequested: 3, urlsFetched: 3, requestsIssued: 4, perHostRequests: { "h.example.com": 3 },
    capReached: false, maxUrlsPerRun: MAX_URLS_PER_RUN, maxRequestsPerHost: MAX_REQUESTS_PER_HOST,
    maxResponseBytes: MAX_RESPONSE_BYTES, cost: null,
  });
  const line = formatBoundedResult({
    label: "crawl run",
    bounds: { maxUrlsPerRun: run.maxUrlsPerRun, maxRequestsPerHost: run.maxRequestsPerHost, maxResponseBytes: run.maxResponseBytes },
    fields: { urlsFetched: run.urlsFetched, requestsIssued: run.requestsIssued, coverageState: run.coverageState },
  });
  // 🔴 The assertion reads the EMITTED TEXT, not the object. PR #35's object
  // had the numbers; the printed report did not.
  for (const bound of REQUIRED_BOUNDS.crawlRun) {
    assert.match(line, new RegExp(bound + "="), `the printed report omits the bound ${bound}`);
  }
  assert.match(line, /urlsFetched=3/);
});

test("🔴 LAW-BOUND-1: the SEARCH result report prints rowLimitPerRequest — the PR #35 gap", () => {
  // The shape item 4 now returns. The bound travels WITH the result.
  const result = { rowCount: 1527, requestCount: 1, exhausted: true, dataState: "COMPLETE", rowLimitPerRequest: 25000, maxRequests: 20 };
  const line = formatBoundedResult({
    label: "searchAnalytics",
    bounds: { rowLimitPerRequest: result.rowLimitPerRequest, maxRequests: result.maxRequests },
    fields: { rowCount: result.rowCount, requestCount: result.requestCount, exhausted: result.exhausted },
  });
  for (const bound of REQUIRED_BOUNDS.searchQueryResult) {
    assert.match(line, new RegExp(bound + "="), `the printed report omits the bound ${bound}`);
  }
  assert.match(line, /rowLimitPerRequest=25000/);
});

/* ================================================================== *
 * PART FIVE — 🔴 LINKS ARE RECORDED, NEVER FOLLOWED.
 * ================================================================== */

test("🔴 FRONTIER: links found in a page do NOT become new work", async () => {
  const fetched = [];
  const fetchImpl = async (url) => {
    fetched.push(String(url));
    if (String(url).endsWith("/robots.txt")) return resp(200, "User-agent: *\n");
    return resp(200, '<html><a href="/discovered-1">x</a><a href="/discovered-2">y</a></html>');
  };
  const result = await crawl({
    seeds: ["https://x.example.com/seed"],
    seedSource: "EXPLICIT_LIST",
    fetchImpl, live: true,
    fetcherOptions: { intervalMs: 0 },
  });
  assert.equal(result.run.urlsFetched, 1, "only the seed may be fetched");
  assert.ok(!fetched.some((u) => u.includes("discovered")), "a discovered link was FETCHED — the frontier was fed");
  assert.equal(result.edges.length, 2, "links must still be RECORDED as edges");
});

test("orphan detection works from the edge graph alone — no extra fetching", () => {
  const obs = [
    { observation_id: "o1", requested_url: "https://e.example.com/a", final_url: "https://e.example.com/a", observed_at: "t" },
    { observation_id: "o2", requested_url: "https://e.example.com/b", final_url: "https://e.example.com/b", observed_at: "t" },
    { observation_id: "o3", requested_url: "https://e.example.com/c", final_url: "https://e.example.com/c", observed_at: "t" },
  ];
  const edges = [{ from: "https://e.example.com/a", to: "https://e.example.com/b" }];
  const { pages } = buildInventory({ observations: obs, edges });
  assert.deepEqual(unlinkedWithinCrawledSet(pages).sort(), ["https://e.example.com/a", "https://e.example.com/c"]);
});

test("🔴 an edge to a page we never fetched does not invent a PageRecord", () => {
  const obs = [{ observation_id: "o1", requested_url: "https://e.example.com/a", final_url: "https://e.example.com/a", observed_at: "t" }];
  const { pages, edgesOutsideInventory } = buildInventory({
    observations: obs,
    edges: [{ from: "https://e.example.com/a", to: "https://e.example.com/never-fetched" }],
  });
  assert.equal(pages.length, 1, "a page nobody measured was invented in the inventory");
  assert.equal(edgesOutsideInventory, 1);
});

/* ================================================================== *
 * PART SIX — CAPTURE, AGAINST THE LOCAL FIXTURE SERVER.
 * ================================================================== */

test("🔴 renderMode is RAW_HTML on EVERY observation — the absent capability is IN THE DATA", async () => {
  const result = await crawl({
    seeds: [`${origin}/a`, `${origin}/404`, `${origin}/private`],
    seedSource: "EXPLICIT_LIST",
    fetchImpl: fixtureFetch, live: true,
    fetcherOptions: { intervalMs: 0 },
  });
  assert.ok(result.observations.length >= 3);
  for (const o of result.observations) {
    assert.equal(o.value.renderMode, "RAW_HTML", "an observation without renderMode could be mistaken for rendered");
  }
});

test("a 2 MB ceiling truncates and SAYS SO", async () => {
  const fetcher = createFetcher({ fetchImpl: fixtureFetch, intervalMs: 0 });
  const res = await fetcher.fetchUrl(`${origin}/big`);
  assert.equal(res.truncated, true);
  assert.ok(res.bytes <= MAX_RESPONSE_BYTES);
});

test("the header subset is kept and the rest is not stored", async () => {
  const fetcher = createFetcher({ fetchImpl: fixtureFetch, intervalMs: 0 });
  const res = await fetcher.fetchUrl(`${origin}/a`);
  assert.equal(res.headers["x-robots-tag"], "noindex");
  assert.ok(!("set-cookie" in res.headers));
});

test("a disallowed URL is recorded as skipped, not silently dropped", async () => {
  robotsStatus = 200;
  const result = await crawl({
    seeds: [`${origin}/private`],
    seedSource: "EXPLICIT_LIST",
    fetchImpl: fixtureFetch, live: true,
    fetcherOptions: { intervalMs: 0 },
  });
  assert.equal(result.run.urlsFetched, 0);
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].value.skipped, true);
});

test("🔴 a run whose robots could not be read is UNKNOWN coverage, not COMPLETE", async () => {
  robotsStatus = 503;
  const result = await crawl({
    seeds: [`${origin}/a`],
    seedSource: "EXPLICIT_LIST",
    fetchImpl: fixtureFetch, live: true,
    fetcherOptions: { intervalMs: 0 },
  });
  robotsStatus = 200;
  assert.equal(result.run.coverageState, "UNKNOWN");
  assert.equal(result.run.urlsFetched, 0, "fail-closed means we did not fetch it");
});

test("the crawl cost is UNKNOWN, not 0 — nobody has applied Gate C to a crawler we operate", async () => {
  const result = await crawl({
    seeds: [`${origin}/a`], seedSource: "EXPLICIT_LIST",
    fetchImpl: fixtureFetch, live: true, fetcherOptions: { intervalMs: 0 },
  });
  assert.equal(result.run.cost.amountState, "UNKNOWN");
  assert.equal(result.run.cost.amount, null);
});

/* ================================================================== *
 * PART SEVEN — SEEDS.
 * ================================================================== */

test("sitemap parsing separates a sitemap index from a URL set", () => {
  assert.deepEqual(parseSitemap("<urlset><url><loc>https://e.example.com/a</loc></url></urlset>").urls, ["https://e.example.com/a"]);
  const idx = parseSitemap("<sitemapindex><sitemap><loc>https://e.example.com/s1.xml</loc></sitemap></sitemapindex>");
  assert.deepEqual(idx.sitemaps, ["https://e.example.com/s1.xml"]);
  assert.deepEqual(idx.urls, []);
});

test("link extraction resolves relative hrefs and drops non-http schemes", () => {
  const links = extractLinks('<a href="/x">1</a><a href="mailto:a@b.c">2</a><a href="#f">3</a>', "https://e.example.com/dir/page");
  assert.deepEqual(links, ["https://e.example.com/x"]);
});

/* ================================================================== *
 * PART EIGHT — 🔴 THE EGRESS PROOF.
 * ================================================================== */

test("🔴 EGRESS: every URL this suite fetched was 127.0.0.1 — zero network egress", () => {
  assert.ok(EGRESS.length > 0, "the egress log is empty — this control would pass vacuously");
  const offsite = EGRESS.filter((u) => {
    try { return !["127.0.0.1", "localhost"].includes(new URL(u).hostname); } catch { return true; }
  });
  assert.deepEqual(offsite, [], `the suite contacted a non-loopback host: ${offsite.join(", ")}`);
});

test("🔴 EGRESS: the global fetch is poisoned, so reaching for it fails loudly", () => {
  assert.throws(() => globalThis.fetch("https://example.com"), /NETWORK EGRESS ATTEMPTED/);
});

/* ================================================================== *
 * PART NINE — 🔴 THE WORKFLOW CANNOT FIRE BY ITSELF.
 * ================================================================== */

test("🔴 the crawl workflow has NO schedule trigger — somebody must press the button", () => {
  const yml = readFileSync(new URL("../.github/workflows/crawl.yml", import.meta.url), "utf8");
  // Match a top-level `schedule:` key, not the word in a comment.
  const scheduleKey = /^\s{0,4}schedule:\s*$/m.test(yml.replace(/^\s*#.*$/gm, ""));
  assert.equal(scheduleKey, false, "a cron on a crawler is a standing instruction to spend money");
  assert.ok(!/\bcron:/.test(yml.replace(/^\s*#.*$/gm, "")), "no cron expression may appear");
  assert.match(yml, /workflow_dispatch:/, "the workflow must be manually dispatchable");
});

test("🔴 the workflow refuses a live run without the owner's green (D-CRW-4)", () => {
  const yml = readFileSync(new URL("../.github/workflows/crawl.yml", import.meta.url), "utf8");
  assert.match(yml, /inputs\.live && !inputs\.owner_green/, "no guard on the live path");
  assert.match(yml, /--i-have-the-owners-green/, "the live step must pass the explicit green flag");
});

/* ---- helpers ------------------------------------------------------ */

function resp(status, body, headers = {}) {
  return {
    status, ok: status >= 200 && status < 300, url: "https://x.example.com/seed", redirected: false,
    headers: { get: (k) => headers[k.toLowerCase()] ?? null },
    text: async () => body,
    body: null,
  };
}
