/**
 * ITEM 25, PART 4 — THE LINK-CHECK LAW, PROVED WITHOUT A NETWORK.
 *
 * Every bound the owner set is tested against an injected fetch that can be
 * made to answer anything: GONE only on 404/410, the estate refused before the
 * first request AND at a redirect hop, a hard cap counted at the boundary,
 * GET only where HEAD is refused, and no body ever read.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { checkSources, verdictOf, agreementWith, EstateTargetRefused, RequestCapReached, MAX_REQUESTS } from "../src/audit/source-integrity.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ESTATE = ["almiworld.com", "sub.almiworld.com"];

function fakeWeb(routes) {
  const log = [];
  let bodiesRead = 0;
  const fetchImpl = async (url, init) => {
    log.push(`${init.method} ${url}`);
    const r = routes[`${init.method} ${url}`] ?? routes[url];
    if (r instanceof Error) throw r;
    const { status, location = null } = r ?? { status: 599 };
    return {
      status,
      headers: { get: (h) => (h === "location" ? location : null) },
      body: { cancel: async () => {} },
      text: async () => { bodiesRead += 1; return "content"; },
    };
  };
  return { fetchImpl, log, bodiesRead: () => bodiesRead };
}
const run = (urls, web, extra = {}) => checkSources({ urls, estateHostnames: ESTATE, baselineFor: () => null, fetchImpl: web.fetchImpl, sleep: async () => {}, now: () => 0, ...extra });

test("🔴 LAW-ABSENT-1: ONLY 404 and 410 are GONE — a 403, 429, 500, timeout or TLS error is UNKNOWN with its reason", () => {
  assert.equal(verdictOf({ status: 200 }).verdict, "LIVE");
  assert.equal(verdictOf({ status: 404 }).verdict, "GONE");
  assert.equal(verdictOf({ status: 410 }).verdict, "GONE");
  for (const status of [400, 401, 403, 429, 451, 500, 503]) {
    const v = verdictOf({ status });
    assert.equal(v.verdict, "UNKNOWN", `HTTP ${status} was not UNKNOWN`);
    assert.match(v.reason, new RegExp(`HTTP ${status}`));
  }
  for (const error of ["timeout after 20000 ms", "CERT_HAS_EXPIRED", "ENOTFOUND"]) assert.equal(verdictOf({ error }).verdict, "UNKNOWN");
});

test("🔴 THE ESTATE IS REFUSED BEFORE THE FIRST REQUEST — and a redirect into it aborts the run", async () => {
  const web = fakeWeb({});
  await assert.rejects(run(["https://example.org/a", "https://sub.almiworld.com/x"], web), EstateTargetRefused);
  assert.equal(web.log.length, 0, "a request was issued before the estate target was refused");
  const hop = fakeWeb({ "HEAD https://example.org/a": { status: 301, location: "https://almiworld.com/landing" } });
  await assert.rejects(run(["https://example.org/a"], hop), EstateTargetRefused);
  assert.deepEqual(hop.log, ["HEAD https://example.org/a"], "the estate hop was requested");
});

test("🔴 HEAD first; GET only where HEAD is REFUSED (405/501) — and the method used is recorded", async () => {
  const web = fakeWeb({ "HEAD https://a.org/x": { status: 405 }, "GET https://a.org/x": { status: 200 }, "HEAD https://b.org/y": { status: 403 } });
  const r = await run(["https://a.org/x", "https://b.org/y"], web);
  assert.deepEqual(web.log, ["HEAD https://a.org/x", "GET https://a.org/x", "HEAD https://b.org/y"], "a GET was issued where HEAD was not refused");
  assert.equal(r.results[0].methodsUsed, "HEAD+GET");
  assert.equal(r.results[0].verdict, "LIVE");
  assert.equal(r.results[1].methodsUsed, "HEAD");
  assert.equal(r.results[1].verdict, "UNKNOWN");
  assert.equal(web.bodiesRead(), 0, "a body was read — status only is the bound");
});

test("🔴 THE HARD CAP is counted at the boundary and stops the run", async () => {
  const routes = {};
  const urls = Array.from({ length: MAX_REQUESTS + 5 }, (_, i) => `https://c${i}.org/`);
  for (const u of urls) routes[u] = { status: 200 };
  const web = fakeWeb(routes);
  await assert.rejects(run(urls, web), RequestCapReached);
  assert.equal(web.log.length, MAX_REQUESTS, "more requests reached the boundary than the cap allows");
});

test("redirects are followed by hand and every hop is recorded; a network error is UNKNOWN, not GONE", async () => {
  const err = Object.assign(new Error("fetch failed"), { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } });
  const web = fakeWeb({ "HEAD https://d.org/old": { status: 301, location: "/new" }, "HEAD https://d.org/new": { status: 200 }, "HEAD https://e.org/": err });
  const r = await run(["https://d.org/old", "https://e.org/"], web);
  assert.deepEqual(r.results[0].hops.map((h) => h.status), [301, 200]);
  assert.equal(r.results[0].verdict, "LIVE");
  assert.equal(r.results[1].verdict, "UNKNOWN");
  assert.match(r.results[1].reason, /UND_ERR_CONNECT_TIMEOUT/);
});

test("pacing: one request per second, one at a time", async () => {
  let clock = 0;
  const waits = [];
  const web = fakeWeb({ "https://p.org/1": { status: 200 }, "https://p.org/2": { status: 200 } });
  await checkSources({ urls: ["https://p.org/1", "https://p.org/2"], estateHostnames: ESTATE, baselineFor: () => null, fetchImpl: web.fetchImpl, sleep: async (ms) => { waits.push(ms); clock += ms; }, now: () => clock });
  assert.deepEqual(waits, [1000]);
});

test("🔴 THE CONTROL: a GONE where beta-g read content is a DISAGREEMENT pointing at the checker; a 403 on oet.com agrees", () => {
  assert.equal(agreementWith({ expected: "CONTENT" }, "GONE", 404).agrees, false);
  assert.equal(agreementWith({ expected: "CONTENT" }, "LIVE", 200).agrees, true);
  assert.equal(agreementWith({ expected: "CONTENT" }, "UNKNOWN", 403).agrees, null);
  assert.equal(agreementWith({ expected: "HTTP 403" }, "UNKNOWN", 403).agrees, true);
});

/* ---- the recorded run ---------------------------------------------------- */

const RECORDED = `${REPO}runs/audit/source-integrity-2026-09-13.json`;
test("🔴 RECORDED: the authorised run stayed inside its bounds, stored status only, and no estate host was requested", { skip: !existsSync(RECORDED) }, () => {
  const e = JSON.parse(readFileSync(RECORDED, "utf8"));
  assert.ok(e.requests <= e.maxRequests && e.maxRequests === 40);
  assert.equal(e.intervalMs, 1000);
  assert.equal(e.results.length, 15);
  for (const r of e.results) {
    for (const h of r.hops) assert.ok(!/(^|\.)almiworld\.com$/.test(new URL(h.url).hostname), `an estate host was requested: ${h.url}`);
    assert.ok(["LIVE", "GONE", "UNKNOWN"].includes(r.verdict));
    if (r.verdict === "GONE") assert.ok([404, 410].includes(r.finalStatus), `${r.url} is GONE on ${r.finalStatus}`);
    assert.equal(Object.keys(r).some((k) => /body|content|text|html/i.test(k)), false, "page content was stored");
    assert.notEqual(r.agrees, false, `${r.url} disagrees with the 12 September baseline — the checker must be investigated before this is reported`);
  }
});
