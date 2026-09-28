/**
 * F19 · WEBSITE CRAWLER — each of the five declared controls, driven through the PRODUCTION crawl() against a local
 * fixture server, held at its limit, and DECLARED in the run's own plan and record (frozen acceptance, contract 079554ce…).
 *
 * The measurement against that acceptance (28 Sep 2026) found depth, the request interval and the request timeout enforced
 * but declared nowhere, and one enforcement defect: robots.txt was fetched outside the pacer, so the robots request and the
 * first page request reached one host back to back. Every test below names a limb; test/helpers/f19-sabotage.mjs removes
 * each limb's enforcement alone and requires the named test to go RED for the reason printed here.
 *
 * Zero egress: the global fetch is poisoned and every URL handed to the crawler is recorded and asserted to be 127.0.0.1.
 */
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";

import { crawl, renderPlan, MAX_DEPTH } from "../src/crawl/crawler.mjs";
import { REQUEST_INTERVAL_MS, REQUEST_TIMEOUT_MS, MAX_RESPONSE_BYTES } from "../src/crawl/fetcher.mjs";

const EGRESS = [];
const CALLS = []; // { path, at } — client-side call instants, on the pacer's own clock (Date.now)
const realFetch = globalThis.fetch.bind(globalThis);
globalThis.fetch = () => { throw new Error("🔴 NETWORK EGRESS ATTEMPTED IN TESTS — the crawler must use the injected fetchImpl"); };
const fixtureFetch = (url, init) => {
  EGRESS.push(String(url));
  CALLS.push({ path: new URL(String(url)).pathname, at: Date.now() });
  return realFetch(url, init);
};

let server;
let origin;
/* A SECOND host (127.0.0.2, loopback), so the page cap can be seen apart from the per-host cap: the frontier clamps
 * per-host to capacity, so on ONE host the per-host cap alone would stop the run and hide a missing page cap. */
let server2;
let origin2;
let hits = new Map();
let robotsDelayMs = 0;
const SLOW_MS = 1500;
const held = new Set();

before(async () => {
  server = createServer((req, res) => {
    hits.set(req.url, (hits.get(req.url) ?? 0) + 1);
    const send = (status, body, type = "text/html") => { res.writeHead(status, { "content-type": type }); res.end(body); };
    if (req.url === "/robots.txt") {
      if (robotsDelayMs) { const t = setTimeout(() => send(200, "User-agent: *\nDisallow: /private\n", "text/plain"), robotsDelayMs); held.add(t); return; }
      return send(200, "User-agent: *\nDisallow: /private\n", "text/plain");
    }
    if (req.url === "/slow") { const t = setTimeout(() => send(200, "<html>late</html>"), SLOW_MS); held.add(t); return; }
    if (req.url === "/linker") return send(200, '<html><a href="/child-1">1</a><a href="/child-2">2</a></html>');
    if (req.url === "/over") return send(200, "y".repeat(1001));
    if (req.url === "/under") return send(200, "z".repeat(999));
    return send(200, "<html>ok</html>");
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  server2 = createServer(server.listeners("request")[0]);
  await new Promise((r) => server2.listen(0, "127.0.0.2", r));
  origin2 = `http://127.0.0.2:${server2.address().port}`;
});
after(() => { for (const t of held) clearTimeout(t); for (const s of [server, server2]) { s?.closeAllConnections?.(); s?.close(); } });

const reset = () => { hits = new Map(); CALLS.length = 0; robotsDelayMs = 0; };
const pages = (n, prefix = "/p") => Array.from({ length: n }, (_, i) => `${origin}${prefix}${i + 1}`);
const fetchedPages = () => [...hits.entries()].filter(([p]) => p !== "/robots.txt").reduce((a, [, n]) => a + n, 0);
const live = (seeds, extra = {}) => crawl({ seeds, seedSource: "f19-fixture", fetchImpl: fixtureFetch, live: true, ...extra });

test("F19 · B1 · PAGES: capacity 3 over 5 seeds on TWO hosts fetches exactly 3 pages, and the record declares capacity 3", async () => {
  reset();
  const seeds = [...pages(2, "/a"), ...pages(3, "/b").map((u) => u.replace(origin, origin2))];
  const { run } = await live(seeds, { capacity: 3, maxPerHost: 3, fetcherOptions: { intervalMs: 0 } });
  assert.equal(Object.keys(run.perHostRequests).length, 2, "the population spans two hosts, so no single host cap can stop the run");
  assert.equal(fetchedPages(), 3, "F19-PAGES-EXCEEDED: more pages were fetched than the declared capacity");
  assert.equal(run.urlsFetched, 3);
  assert.equal(run.capacity, 3, "F19-PAGES-UNDECLARED");
  assert.equal(run.capReached, true);
});

test("F19 · B2 · PER HOST: maxPerHost 2 over 5 seeds on one host fetches exactly 2, and the record declares 2", async () => {
  reset();
  const { run } = await live(pages(5, "/h"), { capacity: 10, maxPerHost: 2, fetcherOptions: { intervalMs: 0 } });
  assert.equal(fetchedPages(), 2, "F19-PER-HOST-EXCEEDED: more requests reached one host than the declared per-host cap");
  assert.deepEqual(Object.values(run.perHostRequests), [2]);
  assert.equal(run.maxRequestsPerHost, 2, "F19-PER-HOST-UNDECLARED");
});

test("F19 · B3 · DEPTH: at the declared depth 0, a seed's links are recorded as edges and never fetched", async () => {
  reset();
  const { run, edges } = await live([`${origin}/linker`], { fetcherOptions: { intervalMs: 0 } });
  assert.equal(edges.length, 2, "the population: the seed carries two links");
  assert.equal((hits.get("/child-1") ?? 0) + (hits.get("/child-2") ?? 0), 0, "F19-DEPTH-EXCEEDED: a link beyond the declared depth was fetched");
  assert.equal(MAX_DEPTH, 0);
  assert.equal(run.maxDepth, 0, "F19-DEPTH-UNDECLARED");
});

test("F19 · B4 · RESPONSE SIZE: at a declared 1000-byte cap, 1001 bytes are truncated to 1000 and marked; 999 are whole", async () => {
  reset();
  const { run, observations, bodies } = await live([`${origin}/over`, `${origin}/under`], { fetcherOptions: { intervalMs: 0, maxResponseBytes: 1000 } });
  const byPath = Object.fromEntries(observations.map((o) => [new URL(o.value.requested_url).pathname, o]));
  assert.equal(byPath["/over"].value.truncated, true, "F19-SIZE-NOT-MARKED: a body beyond the cap was not marked truncated");
  assert.equal(byPath["/over"].value.bytes, 1000, "F19-SIZE-STORED-WHOLE: a body beyond the cap was kept whole");
  assert.equal(Buffer.byteLength(bodies.get(byPath["/over"].observation_id), "utf8"), 1000, "F19-SIZE-STORED-WHOLE");
  assert.equal(byPath["/under"].value.truncated, false);
  assert.equal(byPath["/under"].value.bytes, 999);
  assert.equal(run.maxResponseBytes, 1000, "F19-SIZE-UNDECLARED: the record does not declare the cap the fetcher enforced");
});

test("F19 · B5 · RATE: every request to the host, robots.txt included, is at least the declared interval after the last", async () => {
  reset();
  const INTERVAL = 200;
  /* Timer and millisecond-clock granularity can make a lawful gap read up to ~2 ms short; 5 ms is allowed for it.
   * The defect this catches (an unpaced request) arrives within a few ms, far below INTERVAL - 5. */
  const TOLERANCE = 5;
  const { run } = await live(pages(3, "/r"), { fetcherOptions: { intervalMs: INTERVAL } });
  assert.equal(CALLS.length, 4, "the population: robots.txt + 3 pages");
  assert.equal(CALLS[0].path, "/robots.txt");
  const gaps = CALLS.slice(1).map((c, i) => c.at - CALLS[i].at);
  for (const [i, g] of gaps.entries()) {
    assert.ok(g >= INTERVAL - TOLERANCE, `F19-RATE-VIOLATED: request ${i + 2} (${CALLS[i + 1].path}) came ${g} ms after the previous, under the declared ${INTERVAL} ms`);
  }
  assert.equal(run.requestIntervalMs, INTERVAL, "F19-RATE-UNDECLARED");
  assert.equal(run.requestIntervalScope, "RUN_WIDE");
  assert.equal(run.robotsRequestsIssued, 1);
});

test("F19 · B6 · TIMEOUT: a page slower than the declared timeout is aborted (one retry), recorded as timeout", async () => {
  reset();
  const t0 = Date.now();
  const { run, observations } = await live([`${origin}/slow`], { fetcherOptions: { intervalMs: 0, timeoutMs: 200 } });
  const elapsed = Date.now() - t0;
  const obs = observations.find((o) => o.value.requested_url.endsWith("/slow"));
  assert.equal(obs.value.error, "timeout", "F19-TIMEOUT-NOT-ENFORCED: a request ran past its declared timeout");
  assert.ok(elapsed < SLOW_MS, `F19-TIMEOUT-NOT-ENFORCED: the run took ${elapsed} ms against a ${SLOW_MS} ms response`);
  assert.equal(hits.get("/slow"), 2, "one request and exactly one retry");
  assert.equal(run.requestTimeoutMs, 200, "F19-TIMEOUT-UNDECLARED");
});

test("F19 · B7 · TIMEOUT: robots.txt obeys the SAME declared timeout; a slow robots host is UNKNOWN and not crawled", async () => {
  reset();
  robotsDelayMs = SLOW_MS;
  const t0 = Date.now();
  const { run, observations } = await live([`${origin}/q1`], { fetcherOptions: { intervalMs: 0, timeoutMs: 200 } });
  const elapsed = Date.now() - t0;
  assert.ok(elapsed < SLOW_MS, `F19-ROBOTS-TIMEOUT-NOT-DECLARED-VALUE: robots.txt ran ${elapsed} ms, past the declared 200 ms`);
  assert.equal(hits.get("/q1") ?? 0, 0, "a host whose robots state is unknown is not crawled");
  assert.equal(observations[0].value.robotsState, "UNKNOWN");
  assert.equal(run.coverageState, "UNKNOWN");
});

test("F19 · D · DECLARED: plan, printed plan and record all carry the five controls with the values enforced", async () => {
  reset();
  const opts = { capacity: 4, maxPerHost: 4, fetcherOptions: { intervalMs: 0, timeoutMs: 700, maxResponseBytes: 4096 } };
  let plan;
  const { run } = await live(pages(2, "/d"), { ...opts, onPlan: (p) => { plan = p; } });
  const expected = { capacity: 4, maxRequestsPerHost: 4, maxResponseBytes: 4096, maxDepth: 0, requestIntervalMs: 0, requestTimeoutMs: 700 };
  for (const [k, v] of Object.entries(expected)) {
    assert.equal(run[k], v, `F19-RECORD-UNDECLARED: the run record lacks ${k}=${v}`);
    assert.equal(plan[k === "capacity" ? "capacity" : k], v, `F19-PLAN-UNDECLARED: the plan lacks ${k}=${v}`);
  }
  const printed = renderPlan(plan, { live: true });
  for (const s of ["maxDepth=0", "requestIntervalMs=0", "requestTimeoutMs=700", "maxResponseBytes=4096", "maxRequestsPerHost=4", "capacity=4"]) {
    assert.ok(printed.includes(s), `F19-PRINTED-PLAN-UNDECLARED: the printed plan lacks ${s}`);
  }
  /* the record is count-only: no page content, no body */
  assert.ok(!JSON.stringify(run).includes("<html>"), "the run record carries page content");
});

test("F19 · D2 · DECLARED on the DRY RUN too, with the production defaults, and nothing issued", async () => {
  reset();
  let called = 0;
  const { run, plan } = await crawl({ seeds: pages(2, "/x"), seedSource: "f19-fixture", fetchImpl: () => { called += 1; }, live: false });
  assert.equal(called, 0, "a dry run issued a request");
  assert.equal(run.requestsIssued, 0);
  for (const [k, v] of Object.entries({ maxDepth: 0, requestIntervalMs: REQUEST_INTERVAL_MS, requestTimeoutMs: REQUEST_TIMEOUT_MS, maxResponseBytes: MAX_RESPONSE_BYTES })) {
    assert.equal(run[k], v, `F19-DRY-RECORD-UNDECLARED: ${k}`);
    assert.equal(plan[k], v, `F19-DRY-PLAN-UNDECLARED: ${k}`);
  }
});

test("F19 · EGRESS: every URL this file handed the crawler was loopback (127.0.0.1 or 127.0.0.2)", () => {
  assert.ok(EGRESS.length > 0, "the population is not empty");
  for (const u of EGRESS) assert.ok(["127.0.0.1", "127.0.0.2"].includes(new URL(u).hostname), `egress to ${new URL(u).hostname}`);
});
