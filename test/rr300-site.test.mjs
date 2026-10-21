/* RR-300 · almivisibility.almiworld.com, LOCAL only: the free test's limits and robots rule, the lead's consent and storage, the private
 * admin, and the pages' own promises. Every read goes to a fixture server on 127.0.0.1; nothing outside is touched; nothing is deployed. */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runFreeTest, testableUrl, dailyLimiter, privateAddress, LIMITS, NO_PROMISE } from "../site/free-test.mjs";
import * as P from "../site/pages.mjs";
/* RR-302: the lead, the admin and the pages moved with the owner's new decisions — test/rr302-site.test.mjs */

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const page = (n, links = 0) => `<!doctype html><html lang="en"><head><title>Page ${n} of the fixture site</title><meta name="description" content="A fixture page for the free test, page ${n}, long enough to count."><meta name="viewport" content="width=device-width"></head><body><h1>Page ${n}</h1><form method="post" action="/subscribe"><input name="e"></form><a href="/private/x">private</a>${Array.from({ length: links }, (_, i) => `<a href="/p${i + 1}">p${i + 1}</a>`).join("")}</body></html>`;
function fixture({ robots = "User-agent: *\nDisallow: /private\n", robotsStatus = 200 } = {}) {
  const hits = [];
  const srv = createServer((q, s) => {
    hits.push({ method: q.method, url: q.url, cookie: q.headers.cookie ?? null, at: Date.now() });
    if (q.url === "/robots.txt") { s.writeHead(robotsStatus, { "content-type": "text/plain" }); return s.end(robots); }
    s.writeHead(200, { "content-type": "text/html" }); s.end(page(q.url, q.url === "/" ? 30 : 0));
  });
  return new Promise((r) => srv.listen(0, "127.0.0.1", () => r({ base: `http://127.0.0.1:${srv.address().port}/`, hits, close: () => new Promise((c) => srv.close(c)) })));
}

test("FREE TEST · LIMITS: at most 10 pages a test, one request at a time and paced; at most 3 tests a person a day, a new day starts again", async () => {
  const f = await fixture();
  try {
    const r = await runFreeTest({ url: f.base, paceMs: 40 });
    assert.equal(r.pagesRead, LIMITS.pagesPerTest);
    assert.equal(f.hits.filter((h) => h.url !== "/robots.txt").length, LIMITS.pagesPerTest, "more pages were read than the limit");
    const times = f.hits.map((h) => h.at);
    for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= 30, "two requests were not paced");
  } finally { await f.close(); }
  let day = Date.parse("2026-10-20T10:00:00Z");
  const lim = dailyLimiter({ now: () => day });
  /* RR-305 B3: the limit is counted in the store, so take() is awaited */
  const takes = []; for (let i = 0; i < 4; i++) takes.push((await lim.take("visitor-a")).ok);
  assert.deepEqual(takes, [true, true, true, false]);
  assert.match((await lim.take("visitor-a")).why, /3 times a day/);
  assert.equal((await lim.take("visitor-b")).ok, true, "one person's limit stopped another");
  day += 86400000;
  assert.equal((await lim.take("visitor-a")).ok, true, "the next day did not start again");
});

test("FREE TEST · ROBOTS AND MANNERS: a page robots.txt disallows is never read; an unreadable robots.txt reads NOTHING; GET only, no cookie, no form submitted", async () => {
  const f = await fixture();
  try {
    const r = await runFreeTest({ url: f.base, paceMs: 1 });
    assert.ok(!f.hits.some((h) => h.url.startsWith("/private")), "a disallowed page was read");
    assert.ok(r.skipped.some((s) => s.url.endsWith("/private/x") && /robots\.txt asks us not to read it/.test(s.why)));
    assert.ok(f.hits.every((h) => h.method === "GET" && h.cookie === null), "a request was not a plain GET");
    assert.ok(!f.hits.some((h) => h.url === "/subscribe"), "a form was submitted");
  } finally { await f.close(); }
  const g = await fixture({ robotsStatus: 500 });
  try {
    const r = await runFreeTest({ url: g.base, paceMs: 1 });
    assert.equal(r.pagesRead, 0);
    assert.deepEqual(g.hits.map((h) => h.url), ["/robots.txt"], "a page was read when robots.txt could not be");
    assert.equal(r.score, null, "no page read must never become a score of zero");
  } finally { await g.close(); }
});

test("FREE TEST · THE RESULT: what was measured and what was NOT MEASURED (never zero); the next actions; no promise of ranking or citation", async () => {
  const f = await fixture();
  try {
    const r = await runFreeTest({ url: f.base, paceMs: 1, pages: 3 });
    assert.ok(r.measured.includes("title") && r.notMeasured.some((n) => /^https-only — needs/.test(n)));
    assert.equal(r.byCategory.SECURITY ?? null, null, "a category not measured shows a number");
    assert.ok(Array.isArray(r.nextActions));
    assert.equal(r.noPromise, NO_PROMISE);
    const html = P.freeTest({ result: r, left: 2 });
    /* RR-302: the result fills the hero card (the same gauge); an area not measured says so — never zero */
    assert.match(html, /Not measured in this free test/);
    assert.match(html, /Security: <span class="nmtext">Not measured<\/span>/);
    assert.match(html, /<span class="n">Security<\/span><span class="v nm">Not measured<\/span>/);
  } finally { await f.close(); }
});

test("FREE TEST · ONLY PUBLIC SITES: a private, local or link-local address, a login in the address, or an odd port is refused", async () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.5", "172.20.0.1", "169.254.169.254", "::1", "fd00::1"]) assert.equal(privateAddress(ip), true, ip);
  assert.equal(privateAddress("93.184.216.34"), false);
  const pub = async () => [{ address: "93.184.216.34" }];
  assert.equal((await testableUrl("example.com", { resolve: pub })).url, "https://example.com/");
  assert.match((await testableUrl("http://localhost/", { resolve: async () => [{ address: "127.0.0.1" }] })).why, /Only public websites/);
  assert.match((await testableUrl("http://169.254.169.254/latest", { resolve: pub })).why, /Only public websites/);
  assert.match((await testableUrl("https://user:pw@example.com/", { resolve: pub })).why, /login/);
  assert.match((await testableUrl("https://example.com:8080/", { resolve: pub })).why, /standard web ports/);
  assert.match((await testableUrl("ftp://example.com/", { resolve: pub })).why, /http and https/);
});

