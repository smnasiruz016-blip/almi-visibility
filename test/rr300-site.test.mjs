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
import { checkLead, fileLeadStore, hashPassword, passwordMatches, adminSessions } from "../site/leads.mjs";
import * as P from "../site/pages.mjs";

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
  assert.deepEqual([1, 2, 3, 4].map(() => lim.take("visitor-a").ok), [true, true, true, false]);
  assert.match(lim.take("visitor-a").why, /3 times a day/);
  assert.equal(lim.take("visitor-b").ok, true, "one person's limit stopped another");
  day += 86400000;
  assert.equal(lim.take("visitor-a").ok, true, "the next day did not start again");
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
    assert.match(html, /NOT MEASURED in this free test/);
    assert.match(html, /security: <span class="nm">NOT MEASURED<\/span>/);
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

test("LEAD · CONSENT: nothing is stored unless the box is ticked (exactly); a bad email is refused; the privacy line is the one shown", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr300-leads-"));
  try {
    const store = fileLeadStore(dir);
    for (const consent of [false, undefined, "yes", "on", 1]) assert.equal(checkLead({ email: "a@example.com", consent, testedUrl: "https://x.example/" }).ok, false, String(consent));
    assert.equal(checkLead({ email: "not-an-email", consent: true }).ok, false);
    const c = checkLead({ email: " A@Example.com ", consent: true, testedUrl: "https://x.example/" });
    await store.add(c.lead); await store.add(c.lead);
    assert.deepEqual((await store.list()).map((l) => [l.email, l.consent]), [["a@example.com", true]]);
    assert.match(P.freeTest({ result: { url: "https://x.example/", testedOn: "2026-10-20T00:00:00Z", pagesRead: 1, pagesLimit: 10, skipped: [], score: 50, byCategory: {}, measured: [], notMeasured: [], nextActions: [], noPromise: NO_PROMISE } }), /<input type="checkbox" name="consent" value="yes">/, "the consent box starts ticked");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("ADMIN · PRIVATE: no password configured → off; leads need a login; wrong passwords are limited; the session cookie is HttpOnly, SameSite=Strict, /admin only; never indexed", async () => {
  const h = hashPassword("a-test-password-only");
  assert.equal(passwordMatches("a-test-password-only", h), true);
  assert.equal(passwordMatches("wrong", h), false);
  const s = adminSessions();
  assert.match(s.login("x", null, "who").why, /admin page is off/);
  for (let i = 0; i < 5; i++) s.login("wrong", h, "attacker");
  assert.match(s.login("a-test-password-only", h, "attacker").why, /Too many tries/);
  assert.equal(s.valid("forged-token"), false);
  const dir = mkdtempSync(join(tmpdir(), "rr300-site-"));
  const app = spawn(process.execPath, [join(REPO, "site", "server.mjs"), `--data=${dir}`], { stdio: "ignore", env: { ...process.env, SITE_ADMIN_PASSWORD_HASH: h } });
  try {
    for (let i = 0; i < 50 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const base = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const leads = await fetch(`${base}/admin/leads`, { redirect: "manual" });
    assert.deepEqual([leads.status, leads.headers.get("location")], [303, "/admin"]);
    const bad = await fetch(`${base}/admin/login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "password=nope", redirect: "manual" });
    assert.equal(bad.status, 401);
    const ok = await fetch(`${base}/admin/login`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "password=a-test-password-only", redirect: "manual" });
    const ck = ok.headers.get("set-cookie");
    assert.ok(/HttpOnly/.test(ck) && /SameSite=Strict/.test(ck) && /Path=\/admin/.test(ck));
    /* the server takes a lead only with the box ticked: one without is refused and never reaches the list */
    const noTick = await fetch(`${base}/api/lead`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "email=no-tick%40example.com&testedUrl=https%3A%2F%2Fx.example%2F" });
    assert.equal(noTick.status, 400);
    const tick = await fetch(`${base}/api/lead`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "email=ticked%40example.com&consent=yes&testedUrl=https%3A%2F%2Fx.example%2F" });
    assert.equal(tick.status, 200);
    const list = await fetch(`${base}/admin/leads`, { headers: { cookie: ck.split(";")[0] } });
    assert.equal(list.status, 200);
    const listed = await list.clone().text();
    assert.ok(listed.includes("ticked@example.com") && !listed.includes("no-tick@example.com"), "a lead without consent was stored");
    assert.equal(list.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.match(await (await fetch(`${base}/robots.txt`)).text(), /Disallow: \/admin\nDisallow: \/api\//);
    assert.doesNotMatch(await (await fetch(`${base}/sitemap.xml`)).text(), /admin/);
    const cross = await fetch(`${base}/api/lead`, { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/x-www-form-urlencoded" }, body: "email=a%40b.co&consent=yes" });
    assert.equal(cross.status, 403, "another site's form was accepted");
  } finally { app.kill(); rmSync(dir, { recursive: true, force: true }); }
});

test("PAGES · bold but true: the exact prices, no free trial, the ten languages, Download and Buy coming soon, drafts marked, no guarantee; one h1, a description, a canonical", () => {
  const all = { home: P.home(), features: P.features(), pricing: P.pricing(), download: P.download(), privacy: P.privacy(), terms: P.terms(), freeTest: P.freeTest() };
  const pr = all.pricing;
  for (const [n, t] of [[30, "1 product"], [40, "up to 5 products"], [60, "up to 10 products"], [80, "unlimited products"]]) assert.match(pr, new RegExp(`\\$${n}<small> / month</small></div><p><b>${t}</b>`));
  assert.match(pr, /There is no free trial/); assert.match(pr, /Prices set by AlmiWorld on 20 October 2026/);
  for (const code of ["EN", "ES", "DE", "IT", "FR", "PT", "AR", "UR", "HI", "ZH"]) assert.match(all.features, new RegExp(`\\(${code}\\)`));
  assert.match(all.download, /Coming soon/); assert.match(pr, /Buy — coming soon/);
  for (const k of ["privacy", "terms"]) assert.match(all[k], /DRAFT for AlmiWorld's review — not legal advice/);
  for (const [k, html] of Object.entries(all)) {
    assert.doesNotMatch(html.replace(/No one can promise a first place on Google[^<]*/, "").replace(/does not promise any ranking[^<]*/, ""), /\s#1\b|number one|first page of google|guarantee[ds]? (a |your )?(rank|traffic|citation)|will rank|top of google/i, `${k} promises a result`);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${k}: one h1`);
    assert.match(html, /<meta name="description" content="[^"]{30,}">/);
    assert.match(html, /<img src="\/brand\/almiworld-logo\.png" alt="AlmiWorld — live beautifully"/);
    assert.match(html, /<a class="maker" href="https:\/\/almiworld\.com\/"/);
    if (!["privacy", "terms"].includes(k)) assert.match(html, /<link rel="canonical" href="https:\/\/almivisibility\.almiworld\.com\//);
  }
});
