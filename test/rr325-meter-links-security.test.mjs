/**
 * RR-325 (owner, 25 Oct 2026) · the public-lite free score, after the site went live:
 *   1  a moving meter while a score is checked (/score.js, the site's own script — the page's Content-Security-Policy allows nothing else);
 *      the result fills the gauge to the real score; the button cannot be pressed twice
 *   2  LINKS and SECURITY measured inside the same limits — robots.txt obeyed (the http:// address's own too), public addresses only (every
 *      request through the same guarded fetch), at most LIMITS.linkChecks links asked besides the pages read, the same time limit; a link not
 *      asked is never counted as broken; the security headers are SHOWN, not scored
 * Fixtures: invented sites behind a stand-in fetch and name lookup. No network, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createApp } from "../site/app.mjs";
import * as P from "../site/pages.mjs";
import { runFreeTest, publicOnly, LIMITS } from "../site/free-test.mjs";

const HTML = { "content-type": "text/html" };
const SAFE = { ...HTML, "strict-transport-security": "max-age=31536000", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "referrer-policy": "no-referrer" };
const page = (t, links = []) => `<!doctype html><html lang="en"><head><title>${t} of the invented site</title></head><body><h1>${t}</h1>${links.map((l) => `<a href="${l}">${l}</a>`).join("")}</body></html>`;
/* an invented site: [status, headers, body]; anything else answers 404 */
function site(table) {
  const sent = [];
  const fetchImpl = async (u) => { sent.push(String(u)); const s = table[String(u)]; return s ? new Response(s[2] ?? "", { status: s[0], headers: s[1] }) : new Response("no", { status: 404, headers: { "content-type": "text/plain" } }); };
  return { sent, fetchImpl };
}
const GOOD = {
  "https://good.example/robots.txt": [200, { "content-type": "text/plain" }, "User-agent: *\nDisallow: /secret\n"],
  "https://good.example/": [200, SAFE, page("Home", ["/a", "/b", "/gone", "/moved", "/file.pdf", "/secret/x", "https://other.example/"])],
  "https://good.example/a": [200, HTML, page("A", ["/", "/b"])],
  "https://good.example/b": [200, HTML, page("B", ["/a"])],
  "https://good.example/moved": [301, { location: "https://good.example/a" }],
  "https://good.example/file.pdf": [200, { "content-type": "application/pdf" }, "%PDF"],
  "http://good.example/robots.txt": [301, { location: "https://good.example/robots.txt" }],
  "http://good.example/": [301, { location: "https://good.example/" }],
};
const run = (fetchImpl, o = {}) => runFreeTest({ url: "https://good.example/", fetchImpl, paceMs: 0, linksAndSecurity: true, ...o });

test("2 · LINKS and SECURITY measured: the http:// address moves to https://; the pages read open; a dead link is named; the headers are shown, not scored", async () => {
  const s = site(GOOD), r = await run(s.fetchImpl);
  assert.equal(r.pagesRead, 3);
  assert.equal(r.byCategory.SECURITY, 100, "Security is measured");
  assert.ok(Number.isFinite(r.byCategory.LINKS) && r.byCategory.LINKS < 100, "Links is measured and the dead link counts");
  assert.ok(r.measured.includes("https-only") && r.measured.includes("links-resolve"));
  assert.ok(!r.notMeasured.some((n) => /^(https-only|links-resolve)/.test(n)), "nothing of the two is left unmeasured");
  assert.deepEqual(r.brokenLinks, [{ from: "https://good.example/", to: "https://good.example/gone", status: 404 }]);
  assert.ok(r.nextActions.some((a) => a.check === "links-resolve"));
  assert.ok(s.sent.includes("http://good.example/") && s.sent.includes("http://good.example/robots.txt"), "the http:// address and its own robots.txt were asked");
  assert.ok(!s.sent.some((u) => u.includes("/secret")), "robots.txt said no — never asked");
  assert.ok(!s.sent.some((u) => u.includes("other.example")), "another site's link is never asked");
  assert.equal(r.links.asked, 1, "only the one target not already read (the pdf) was asked"); assert.equal(s.sent.filter((u) => u === "https://good.example/file.pdf").length, 1);
  assert.deepEqual(r.securityHeaders.rules.map((h) => h.state), ["PASS", "PASS", "PASS", "PASS"]); assert.equal(r.securityHeaders.csp.enforced, false);
  /* the headers are not in the score: the same site with none of them scores the same */
  const bare = { ...GOOD, "https://good.example/": [200, HTML, GOOD["https://good.example/"][2]] }, r2 = await run(site(bare).fetchImpl);
  assert.equal(r2.score, r.score); assert.ok(r2.securityHeaders.rules.every((h) => h.state === "FAIL" || h.name === "referrer-policy"));
  /* what the visitor sees */
  const html = P.liteHome({ result: r, left: 2 });
  assert.match(html, /<h3>Links<\/h3><p>\d+ of \d+ internal link\(s\) checked/); assert.match(html, /https:\/\/good\.example\/gone — answers 404/);
  assert.match(html, /Security headers of the start page <span class="note">\(shown here, not in the score\)<\/span>/); assert.match(html, /✓ Browsers are told to use https only/);
  assert.match(html, /<span class="n">Security<\/span><span class="v good">✓ 100<\/span>/);
});

test("2 · SECURITY fails when the http:// address does not move to https://; it stays NOT MEASURED when that address's robots.txt says no or cannot be read", async () => {
  const stays = site({ ...GOOD, "http://good.example/": [200, HTML, page("Plain")] }), r = await run(stays.fetchImpl);
  /* the start page fails (its http:// address is the one asked); the other pages pass on being read over https — the engine's rule */
  assert.ok(r.byCategory.SECURITY < 100); assert.ok(r.nextActions.some((a) => a.check === "https-only"));
  for (const robots of [[200, { "content-type": "text/plain" }, "User-agent: *\nDisallow: /\n"], [503, { "content-type": "text/plain" }, "busy"], [301, { location: "https://elsewhere.example/robots.txt" }]]) {
    const s = site({ ...GOOD, "http://good.example/robots.txt": robots }), x = await run(s.fetchImpl);
    assert.equal(x.byCategory.SECURITY ?? null, null, `robots ${robots[0]}: a number without the measurement`);
    assert.ok(x.notMeasured.some((n) => /^https-only/.test(n))); assert.ok(!s.sent.includes("http://good.example/"), "the http:// address was asked against its robots.txt");
    assert.ok(!s.sent.some((u) => u.includes("elsewhere.example")), "robots.txt followed to another host");
    assert.ok(x.skipped.some((k) => /whether it moves to https:\/\/ is not measured/.test(k.why)));
  }
  /* a site read over http only: nothing is claimed about https */
  const plain = { "http://plain.example/robots.txt": [404, { "content-type": "text/plain" }, ""], "http://plain.example/": [200, HTML, page("Home")] };
  const p = await runFreeTest({ url: "http://plain.example/", fetchImpl: site(plain).fetchImpl, paceMs: 0, linksAndSecurity: true });
  assert.equal(p.byCategory.SECURITY ?? null, null); assert.equal(p.securityHeaders, null);
});

test("2 · the LIMITS: at most LIMITS.linkChecks links asked besides the pages read; a link not asked is never broken; the time limit stops them; off unless asked", async () => {
  /* 40 dead files (not pages, so never read as pages): only LIMITS.linkChecks of them are asked, and only those are judged */
  const many = Array.from({ length: 40 }, (_, i) => `/dead${i}.pdf`), t = { ...GOOD, "https://good.example/": [200, SAFE, page("Home", many)] };
  const s = site(t), r = await run(s.fetchImpl);
  const asked = s.sent.filter((u) => /\/dead\d+\.pdf$/.test(u)).length;
  assert.equal(r.pagesRead, 1); assert.equal(LIMITS.linkChecks, 10); assert.equal(LIMITS.pagesPerTest, 10);
  assert.equal(asked, LIMITS.linkChecks, `${asked} links asked`); assert.equal(r.links.asked, LIMITS.linkChecks);
  assert.equal(r.brokenLinks.length, 10); assert.equal(r.links.judged, LIMITS.linkChecks, "only links with an answer are judged"); assert.equal(r.links.of, 40);
  assert.match(P.liteHome({ result: r }), /10 of 40 internal link\(s\) checked — the free score asks at most 10 links besides the pages it reads; the rest are not judged/);
  /* the time limit: no link is asked after it */
  let clock = 0; const slow = async (u) => { clock += 6000; return s.fetchImpl(u); };
  const late = await run(slow, { deadlineMs: 30000, now: () => clock });
  assert.ok(clock <= 30000 + 6000, "a request was started after the time limit");
  assert.ok(late.links.asked < LIMITS.linkChecks);
  /* OFF unless asked (the full site's free test is unchanged): no http:// request, no link asked */
  const off = site(GOOD), o = await runFreeTest({ url: "https://good.example/", fetchImpl: off.fetchImpl, paceMs: 0 });
  assert.ok(!off.sent.some((u) => u.startsWith("http://") || u.endsWith(".pdf"))); assert.equal(o.links, undefined); assert.equal(o.byCategory.SECURITY ?? null, null);
});

test("2 · every request of the new measurements goes through the guarded fetch: a name that turns private after the pages are read is asked nothing more", async () => {
  const s = site(GOOD); let turned = false;
  const f = async (u, i) => { const res = await s.fetchImpl(u, i); if (String(u) === "https://good.example/b") turned = true; return res; };
  const guarded = publicOnly(f, { resolve: async () => [{ address: turned ? "10.0.0.9" : "93.184.216.34" }] });
  const r = await run(guarded);
  assert.equal(r.pagesRead, 3); assert.equal(s.sent.at(-1), "https://good.example/b", "a request was sent after the name turned private");
  assert.equal(r.byCategory.SECURITY ?? null, null);
});

test("1 · the moving meter: /score.js from the site itself; the meter in the form; the result fills the gauge to the real score; the full site is unchanged", async () => {
  assert.doesNotThrow(() => new Function(P.SCORE_JS), "the script parses");
  assert.match(P.SCORE_JS, /b\.disabled = true/, "the button is turned off on the first click"); assert.match(P.SCORE_JS, /classList\.add\("busy"\)/);
  /* the store's documented REST pipeline on a Map (as test/rr325-public-lite.test.mjs) */
  const m = new Map(), kvFetch = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => {
    const C = cmd.toUpperCase();
    if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; }
    if (C === "GET") return { result: m.get(k) ?? null };
    if (C === "GETDEL") { const v = m.get(k) ?? null; m.delete(k); return { result: v }; }
    if (C === "INCR" || C === "DECR") { const v = Number(m.get(k) ?? 0) + (C === "INCR" ? 1 : -1); m.set(k, String(v)); return { result: v }; }
    if (C === "EXPIRE") return { result: 1 };
    return { error: `ERR unknown command ${cmd}` };
  }) });
  let clock = Date.parse("2026-10-25T12:00:00Z"); const s = site(GOOD);
  const app = createApp({ mode: "public-lite", env: { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t" }, kvFetch, fetchImpl: s.fetchImpl, resolve: async () => [{ address: "93.184.216.34" }], now: () => clock, freeTest: (o) => runFreeTest({ ...o, paceMs: 0 }) });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const js = await fetch(base + "/score.js"); assert.equal(js.status, 200); assert.match(js.headers.get("content-type"), /text\/javascript/); assert.equal(await js.text(), P.SCORE_JS);
    assert.match(js.headers.get("content-security-policy"), /default-src 'self'/);
    const home = await (await fetch(base + "/")).text();
    assert.match(home, /<script src="\/score\.js" defer><\/script>/); assert.doesNotMatch(home, /<script>(?!<\/script>)/, "no inline script (the policy would block it)");
    assert.match(home, /<div id="meter" class="meter" role="status" aria-live="polite" hidden>/);
    assert.ok(home.indexOf('id="meter"') > home.indexOf('type="submit"') && home.indexOf('id="meter"') < home.indexOf("</form>"), "the meter is in the form, under the button");
    const ticket = /name="ticket" value="([^"]+)"/.exec(home)[1]; clock += 3000;
    const res = await (await fetch(base + "/score", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ url: "good.example", ticket }) })).text();
    assert.match(res, /<div class="scorecard live real" id="score">/); assert.match(res, /<b data-score="(\d+)">\1<\/b>/);
    assert.match(res, /<h3>Links<\/h3>/, "the app asked for links and security"); assert.ok(s.sent.includes("http://good.example/"));
    const sm = await (await fetch(base + "/sitemap.xml")).text(); assert.doesNotMatch(sm, /score\.js/);
  } finally { srv.close(); }
  /* the full site has no meter and no script; a visitor who asks for less motion gets none */
  assert.doesNotMatch(P.home(), /score\.js|id="meter"/);
  assert.match(P.liteHome(), /@media \(prefers-reduced-motion:reduce\)\{\.live \.gauge path\.val,\.meter \.bar span\{animation:none\}/);
});
