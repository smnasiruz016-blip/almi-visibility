/**
 * RR-325 · almivisibility.almiworld.com, PUBLIC-LITE (the owner's GREEN for this site only):
 *   A  the home page: "Get the score of your site" FIRST; the keyword finder and the app "coming soon"; no download, price, buy, email box or
 *      admin; every footer links the Privacy Policy and the Terms of Service; light and dark
 *   B  the free score on a public server: limits in ONE shared store (per visitor per day + a daily total for the site), a one-use form ticket
 *      and a hidden field, a time limit, public http(s) addresses only (every request checked), robots.txt obeyed, at most 10 pages; with no
 *      store it is OFF and the page still works; no database, Stripe, Resend, licence or admin route
 *   C  the owner's Terms of Service and Privacy Policy, his words exactly; a page with a [FILL] is not published; the Limited Use sentence
 *   D  the Vercel bundle in public-lite mode, the mode fixed in its function
 * Fixtures: invented sites (a stand-in fetch and name lookup) and a stand-in for the store's documented REST shape. No network, no key.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createApp, modeOf } from "../site/app.mjs";
import * as P from "../site/pages.mjs";
import { docxBlocks, legalPages, fillsIn, renderLegal, loadLegal } from "../site/legal.mjs";
import { liteLimits, storeOf, kvStore, LITE_LIMITS, STORE_NAMES } from "../site/limits.mjs";
import { privateAddress, testableUrl, publicOnly, runFreeTest, LIMITS } from "../site/free-test.mjs";
import { siteFiles, FUNCTION_LITE } from "../tools/bundle-site.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const LEGAL = loadLegal();

/* the store's documented REST pipeline ([[cmd, ...args]] → [{ result }]) on a Map, with expiry — shared by every "instance" handed it */
function fakeKv() {
  const m = new Map(), calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), auth: init.headers.authorization });
    const out = JSON.parse(init.body).map(([cmd, k, ...a]) => {
      const C = cmd.toUpperCase();
      if (C === "SET") { const nx = a.includes("NX"); if (nx && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; }
      if (C === "GET") return { result: m.get(k) ?? null };
      if (C === "GETDEL") { const v = m.get(k) ?? null; m.delete(k); return { result: v }; }
      if (C === "INCR") { const v = Number(m.get(k) ?? 0) + 1; m.set(k, String(v)); return { result: v }; }
      if (C === "DECR") { const v = Number(m.get(k) ?? 0) - 1; m.set(k, String(v)); return { result: v }; }
      if (C === "EXPIRE") return { result: 1 };
      return { error: `ERR unknown command ${cmd}` };
    });
    return { ok: true, status: 200, json: async () => out };
  };
  return { m, calls, fetchImpl };
}
const KV_ENV = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "token-for-tests" };

/* invented public sites: names resolve to a public address; robots and pages from a table */
const SITES = {
  "https://shop.example/robots.txt": [200, "text/plain", "User-agent: *\nAllow: /\n"],
  "https://shop.example/": [200, "text/html", '<!doctype html><html lang="en"><head><title>Shop</title><meta name="description" content="An invented shop for the tests."></head><body><main><h1>Shop</h1><p>Words.</p><a href="/about">About</a></main></body></html>'],
  "https://shop.example/about": [200, "text/html", '<!doctype html><html lang="en"><head><title>About</title></head><body><main><h1>About</h1></main></body></html>'],
  "https://closed.example/robots.txt": [200, "text/plain", "User-agent: *\nDisallow: /\n"],
};
const siteFetch = async (u) => { const s = SITES[String(u)]; return s ? new Response(s[2], { status: s[0], headers: { "content-type": s[1] } }) : new Response("no", { status: 404, headers: { "content-type": "text/plain" } }); };
const DNS = { "shop.example": "93.184.216.34", "closed.example": "93.184.216.35", "inside.example": "10.0.0.7", "meta.example": "169.254.169.254" };
const resolve = async (h) => { if (h === "localhost") return [{ address: "127.0.0.1" }]; if (!DNS[h]) throw new Error("ENOTFOUND"); return [{ address: DNS[h] }]; };

async function lite({ env = KV_ENV, kv = fakeKv(), clock = { t: Date.parse("2026-10-25T10:00:00Z") } } = {}) {
  const app = createApp({ mode: "public-lite", env, kvFetch: kv.fetchImpl, resolve, fetchImpl: siteFetch, now: () => clock.t, freeTest: (o) => runFreeTest({ ...o, paceMs: 0 }) });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const get = (p) => fetch(base + p, { redirect: "manual" }).then(async (r) => ({ status: r.status, text: await r.text(), headers: r.headers }));
  const post = (p, form, headers = {}) => fetch(base + p, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", "x-real-ip": headers.ip ?? "203.0.113.9", ...headers }, body: new URLSearchParams(form) }).then(async (r) => ({ status: r.status, text: await r.text() }));
  const ticket = async () => { const h = (await get("/")).text; clock.t += 3000; return /name="ticket" value="([^"]+)"/.exec(h)?.[1]; };
  return { base, get, post, ticket, kv, clock, close: () => new Promise((r) => srv.close(r)) };
}

test("A · the home page: the free score FIRST, then the keyword finder and the app 'coming soon'; no download, price, buy, email box or admin; the legal links in every footer", async () => {
  const a = await lite();
  try {
    const h = (await a.get("/")).text;
    const at = (s) => h.indexOf(s);
    assert.ok(at("<h1>Get the score of your site</h1>") > 0 && at("<h1>Get the score of your site</h1>") < at('name="url"') && at('name="url"') < at("Free keyword finder") && at("Free keyword finder") < at("AlmiVisibility app<span class=\"soon\">Coming soon"), "the order: the score, the finder, the app");
    assert.equal((h.match(/<h1\b/g) ?? []).length, 1);
    assert.match(h, /Free keyword finder<span class="soon">Coming soon<\/span><\/h2><p class="sub">It will find what people search for about your product, with search volumes from Google Keyword Planner data\.<\/p>/);
    assert.doesNotMatch(h.slice(at("Free keyword finder"), at('id="app"')), /<input|<button|<form/, "the finder has no input or button yet");
    for (const code of ["EN", "ES", "DE", "IT", "FR", "PT", "AR", "UR", "HI", "ZH"]) assert.match(h, new RegExp(`\\(${code}\\)`));
    assert.match(h, /Made by <a href="https:\/\/almiworld\.com\/">AlmiWorld<\/a>/);
    for (const f of P.FEATURES) assert.ok(h.includes(f[0].replace(/&/g, "&amp;")), f[0]);
    assert.doesNotMatch(h, /href="\/(download|pricing|features|free-test|admin|buy)|action="\/(api|free-test|admin)|type="email"|\$30|\/ month|Buy\b|Download/, "nothing hidden is offered");
    assert.match(h, /<nav class="family" aria-label="Family navigation">/); assert.match(h, /<footer class="site-footer">/);
    assert.match(h, /<li><a href="\/privacy">AlmiVisibility Privacy Policy<\/a><\/li><li><a href="\/terms">AlmiVisibility Terms of Service<\/a><\/li>/, "the footer links both");
    assert.match(h, /<meta name="color-scheme" content="light dark">/); assert.match(h, /@media \(prefers-color-scheme:dark\)\{:root\{--cream:#14110D/);
    for (const name of ["RESEND_API_KEY", "STRIPE_SECRET_KEY", "LICENCE_SIGNING_KEY", "VISIBILITY_SITE_DATABASE_URL", "SITE_ADMIN_PASSWORD_HASH", ...STORE_NAMES.flat()]) assert.ok(!h.includes(name), `the page names ${name}`);
    /* every page of the full site still has its own links and no "coming soon" (rr302) — the lite header is lite only */
    assert.match(P.home(), /href="\/pricing"/);
  } finally { await a.close(); }
});

test("A · with NO limit store the free score is OFF and says so — the page still goes live; nothing is sent anywhere", async () => {
  const kv = fakeKv(), a = await lite({ env: {}, kv });
  try {
    const r = await a.get("/"); assert.equal(r.status, 200); assert.match(r.text, /data-score-off/); assert.match(r.text, /The free score is being switched on\. Please come back soon\./); assert.doesNotMatch(r.text, /name="ticket"/);
    const p = await a.post("/score", { url: "shop.example" }); assert.equal(p.status, 503); assert.match(p.text, /being switched on/);
    assert.equal(kv.calls.length, 0);
    assert.equal(storeOf({ KV_REST_API_URL: "http://kv.example", KV_REST_API_TOKEN: "x" }), null, "an http store address is refused");
    assert.deepEqual(storeOf({ UPSTASH_REDIS_REST_URL: "https://u.example", UPSTASH_REDIS_REST_TOKEN: "x" }), { url: "https://u.example", token: "x" });
  } finally { await a.close(); }
});

test("A + B · every hidden part is NOT FOUND in public-lite: download, pricing, buy and checkout, the licence check, updates, unsubscribe, admin, every /api route", async () => {
  const a = await lite();
  try {
    for (const p of ["/download", "/download/AlmiVisibility-Setup.exe", "/pricing", "/features", "/free-test", "/buy/success?session_id=x", "/admin", "/admin/leads", "/admin/leads.csv", "/admin/sales", "/v1/licence?account=x", "/updates/manifest.json", "/unsubscribe?t=x", "/api/anything"]) {
      const r = await a.get(p); assert.equal(r.status, 404, p); assert.match(r.text, /Page not found/);
    }
    for (const p of ["/api/billing/checkout", "/api/webhooks/stripe", "/admin/login", "/admin/licences/owner", "/free-test", "/unsubscribe?t=x"]) assert.equal((await a.post(p, { plan: "v1", email: "a@b.c", password: "x" })).status, 404, `POST ${p}`);
    assert.equal(modeOf({ VERCEL: "1" }), "public-lite", "on Vercel the site is public-lite unless set otherwise"); assert.equal(modeOf({}), "full");
    const robots = (await a.get("/robots.txt")).text; assert.match(robots, /Disallow: \/score/);
    const sm = (await a.get("/sitemap.xml")).text; assert.match(sm, /<loc>https:\/\/almivisibility\.almiworld\.com\/<\/loc>/); assert.doesNotMatch(sm, /download|pricing|free-test/);
    assert.equal((await a.get("/brand/almiworld-logo.png")).status, 200);
  } finally { await a.close(); }
});

test("B · the free score: a normal site scored on screen; a site whose robots.txt says no is not read; private addresses refused before anything is sent; nothing about the visitor is stored", async () => {
  const a = await lite();
  try {
    const ok = await a.post("/score", { url: "shop.example", ticket: await a.ticket() });
    assert.equal(ok.status, 200); assert.match(ok.text, /Your result for https:\/\/shop\.example\//); assert.match(ok.text, /2 of up to 10 pages read/); assert.match(ok.text, /2 free test\(s\) left today/);
    const closed = await a.post("/score", { url: "closed.example", ticket: await a.ticket() });
    assert.equal(closed.status, 200); assert.match(closed.text, /0 of up to 10 pages read/); assert.match(closed.text, /robots\.txt asks us not to read it — not tested/);
    for (const u of ["localhost", "127.0.0.1", "http://10.0.0.5/", "169.254.169.254", "inside.example", "meta.example", "http://[::ffff:127.0.0.1]/", "ftp://shop.example/", "http://user:pw@shop.example/", "https://shop.example:8443/"]) {
      const r = await a.post("/score", { url: u, ticket: await a.ticket() }); assert.equal(r.status, 400, u); assert.match(r.text, /Only public websites can be tested|Only http and https|login in it|standard web ports/, u);
    }
    assert.deepEqual([...new Set([...a.kv.m.keys()].map((k) => k.split(":").slice(0, 2).join(":")))].sort(), ["av:salt", "av:ticket", "av:total", "av:visitor"], "only counters, the day's salt and the form tickets — no address, no url, no result");
    assert.ok([...a.kv.m.entries()].filter(([k]) => k.startsWith("av:ticket:")).every(([, v]) => /^\d+$/.test(v)), "a ticket holds only the time it was given");
    assert.ok([...a.kv.m.keys()].every((k) => !k.includes("203.0.113.9") && !k.includes("shop.example")));
    assert.ok(a.kv.calls.every((c) => c.url === "https://kv.example/pipeline" && c.auth === "Bearer token-for-tests"));
  } finally { await a.close(); }
  /* IN THE APP (sabotage: unpinned): a name public when the form is sent and private when the pages are read — nothing is read */
  let asked = 0; const flipping = async (h) => (h === "flip.example" ? (++asked === 1 ? [{ address: "93.184.216.36" }] : [{ address: "10.9.8.7" }]) : resolve(h));
  const reads = []; const app = createApp({ mode: "public-lite", env: KV_ENV, kvFetch: fakeKv().fetchImpl, resolve: flipping, fetchImpl: async (u) => { reads.push(String(u)); return new Response("User-agent: *\nAllow: /\n", { status: 200, headers: { "content-type": "text/plain" } }); }, freeTest: (o) => runFreeTest({ ...o, paceMs: 0 }) });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const t = /name="ticket" value="([^"]+)"/.exec(await (await fetch(base + "/")).text())[1]; await new Promise((r) => setTimeout(r, 2100));
    const h = await (await fetch(base + "/score", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ url: "flip.example", ticket: t }) })).text();
    assert.match(h, /0 of up to 10 pages read/); assert.deepEqual(reads, [], "not even robots.txt was asked of the private address");
  } finally { srv.close(); }
});

test("B · every REQUEST of a check is checked for a public address (robots.txt and each page) — a name that turns private between the form and the read is refused", async () => {
  const sent = [], f = async (u) => { sent.push(String(u)); return siteFetch(u); };
  let flip = false; const res = async (h) => (flip ? [{ address: "10.1.2.3" }] : resolve(h));
  const guarded = publicOnly(f, { resolve: res });
  assert.equal((await guarded("https://shop.example/robots.txt")).status, 200);
  flip = true; await assert.rejects(guarded("https://shop.example/"), /Only public websites/); assert.deepEqual(sent, ["https://shop.example/robots.txt"]);
  for (const [ip, priv] of [["10.0.0.1", true], ["172.16.0.1", true], ["172.31.255.255", true], ["172.32.0.1", false], ["192.168.1.1", true], ["169.254.169.254", true], ["100.64.0.1", true], ["0.0.0.0", true], ["127.0.0.1", true], ["::1", true], ["fd00:ec2::254", true], ["fe80::1", true], ["::ffff:172.16.0.1", true], ["::ffff:169.254.169.254", true], ["::ffff:a9fe:a9fe", true], ["93.184.216.34", false], ["2606:4700::1111", false], ["::ffff:93.184.216.34", false] /* judged as the IPv4 address it is (sabotage: unpinned) */])
    assert.equal(privateAddress(ip), priv, ip);
  /* the time limit: no new page after it — the rest said so */
  let t = 0; const slow = async (u) => { t += 20000; return siteFetch(u); };
  const r = await runFreeTest({ url: "https://shop.example/", fetchImpl: slow, paceMs: 0, deadlineMs: 30000, now: () => t });
  assert.equal(r.pagesRead, 1); assert.match(JSON.stringify(r.skipped), /the check's time limit was reached/);
  assert.equal(LITE_LIMITS.checkDeadlineMs, 30000); assert.equal(LIMITS.pagesPerTest, 10);
});

test("B · the limits work ACROSS instances: per visitor per day, a daily total for the site (politely: try tomorrow), a one-use ticket, a hidden field", async () => {
  const kv = fakeKv(), clock = { t: Date.parse("2026-10-25T10:00:00Z") };
  const one = await lite({ kv, clock }), two = await lite({ kv, clock }); // two Vercel instances, one store
  try {
    for (const [i, app] of [one, two, one].entries()) { const r = await app.post("/score", { url: "shop.example", ticket: await app.ticket() }); assert.equal(r.status, 200, `score ${i + 1}`); }
    const fourth = await two.post("/score", { url: "shop.example", ticket: await two.ticket() });
    assert.equal(fourth.status, 429); assert.match(fourth.text, /The free score can be run 3 times a day\. Please come back tomorrow\./);
    assert.equal(kv.m.get("av:total:2026-10-25"), "3", "the refused 4th was given back to the site's total (sabotage found it unpinned)");
    assert.equal((await one.post("/score", { url: "shop.example", ticket: await one.ticket() }, { ip: "198.51.100.7" })).status, 200, "another visitor still can");
    /* the ticket: used once; too fast; missing; a filled hidden field */
    const tk = await one.ticket();
    assert.equal((await one.post("/score", { url: "shop.example", ticket: tk }, { ip: "198.51.100.8" })).status, 200);
    const reused = await one.post("/score", { url: "shop.example", ticket: tk }, { ip: "198.51.100.8" }); assert.equal(reused.status, 400); assert.match(reused.text, /That form has expired/);
    const h = (await one.get("/")).text, fast = /name="ticket" value="([^"]+)"/.exec(h)[1];
    assert.equal((await one.post("/score", { url: "shop.example", ticket: fast }, { ip: "198.51.100.9" })).status, 400, "sent faster than a person can");
    assert.equal((await one.post("/score", { url: "shop.example" }, { ip: "198.51.100.9" })).status, 400, "no ticket");
    const bot = await one.post("/score", { url: "shop.example", ticket: await one.ticket(), homepage: "http://spam.example" }, { ip: "198.51.100.9" }); assert.equal(bot.status, 400); assert.match(bot.text, /Please use the form on this page/);
    clock.t += LITE_LIMITS.ticketMaxMs + 60000; const old = await one.ticket(); clock.t += LITE_LIMITS.ticketMaxMs; assert.match((await one.post("/score", { url: "shop.example", ticket: old }, { ip: "198.51.100.9" })).text, /expired/);
  } finally { await one.close(); await two.close(); }
  /* the site's daily total: the next visitor is told to try tomorrow; a refused visitor never uses the total */
  const kv2 = fakeKv(), c2 = { t: Date.parse("2026-10-25T10:00:00Z") }, a = await lite({ env: { ...KV_ENV, FREE_SCORE_DAILY_TOTAL: "2" }, kv: kv2, clock: c2 });
  try {
    for (const ip of ["192.0.2.1", "192.0.2.2"]) assert.equal((await a.post("/score", { url: "shop.example", ticket: await a.ticket() }, { ip })).status, 200);
    const full = await a.post("/score", { url: "shop.example", ticket: await a.ticket() }, { ip: "192.0.2.3" }); assert.equal(full.status, 429); assert.match(full.text, /Today's free scores are all used\. Please try again tomorrow\./);
    assert.equal(kv2.m.get("av:total:2026-10-25"), "2", "the refused one was given back");
    c2.t += 86400000; assert.equal((await a.post("/score", { url: "shop.example", ticket: await a.ticket() }, { ip: "192.0.2.3" })).status, 200, "a new day");
  } finally { await a.close(); }
  const L = liteLimits({ kv: kvStore({ url: "https://kv.example", token: "t" }, { fetchImpl: fakeKv().fetchImpl }), perVisitor: 1, siteTotal: 5 });
  assert.equal((await L.take("a")).ok, true); assert.equal((await L.take("a")).ok, false);
});

test("C · the owner's Word text → his pages exactly: headings, lists, the table, links; the two pages split from the file's preamble; a [FILL] keeps a page unpublished", () => {
  const P1 = (style, t, extra = "") => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
  const xml = `<w:document><w:body>${P1("Heading1", "My draft (not a page)")}${P1("BodyText", "Owner: fill [FILL 1].")}${P1("Heading1", "Terms of Service")}${P1("FirstParagraph", "Last updated: 1 May")}${P1("Compact", "One &amp; two", "<w:numPr><w:ilvl w:val=\"0\"/><w:numId w:val=\"5\"/></w:numPr>")}${P1("Heading2", "Law")}${P1("FirstParagraph", "The law of [FILL 3].")}${P1("Heading1", "Privacy Policy — X")}<w:p><w:r><w:t xml:space="preserve">Adhere to the </w:t></w:r><w:hyperlink r:id="rId9"><w:r><w:t>Policy</w:t></w:r></w:hyperlink><w:r><w:rPr><w:b/></w:rPr><w:t>, bold.</w:t></w:r></w:p><w:tbl><w:tr><w:tc>${P1("Compact", "Service")}</w:tc><w:tc>${P1("Compact", "Why")}</w:tc></w:tr><w:tr><w:tc>${P1("Compact", "Search")}</w:tc><w:tc>${P1("Compact", "To help")}</w:tc></w:tr></w:tbl>${P1("FirstParagraph", "End.")}</w:body></w:document>`;
  const rels = '<Relationships><Relationship Id="rId9" Type="hyperlink" Target="https://example.com/policy?a=1&amp;b=2" TargetMode="External"/></Relationships>';
  const pages = legalPages(docxBlocks(xml, rels));
  assert.deepEqual(pages.terms.map((b) => b.kind), ["heading", "p", "li", "heading", "p"]); assert.equal(pages.terms[2].runs[0].text, "One & two");
  assert.deepEqual(pages.privacy.map((b) => b.kind), ["heading", "p", "table", "p"]);
  assert.deepEqual(fillsIn(pages.terms), ["[FILL 3]"]); assert.deepEqual(fillsIn(pages.privacy), [], "the preamble's [FILL 1] is no page's");
  const html = renderLegal(pages.privacy);
  assert.equal(html, '<h1>Privacy Policy — X</h1><p>Adhere to the <a href="https://example.com/policy?a=1&amp;b=2">Policy</a><b>, bold.</b></p><div class="tablewrap"><table class="legal"><tr><th>Service</th><th>Why</th></tr><tr><td>Search</td><td>To help</td></tr></table></div><p>End.</p>');
  assert.equal(renderLegal(pages.terms), "<h1>Terms of Service</h1><p>Last updated: 1 May</p><ul><li>One &amp; two</li></ul><h2>Law</h2><p>The law of [FILL 3].</p>");
  assert.match(renderLegal(pages.terms, { preview: true }), /<mark class="fill">\[FILL 3\]<\/mark>/);
  /* the generated file from the owner's Word file (tools/legal-from-docx.mjs) */
  assert.match(LEGAL.source.file, /^AlmiVisibility_Terms_and_Privacy_2026-10-25\.docx$/); assert.match(LEGAL.source.sha256, /^[0-9a-f]{64}$/);
  const words = (pg) => pg.map((b) => (b.kind === "table" ? b.rows.flat(2).map((r) => r.text).join(" ") : b.runs.map((r) => r.text).join(""))).join("\n");
  assert.match(words(LEGAL.privacy), /AlmiVisibility’s use and transfer to any other app of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements\./);
  assert.ok(LEGAL.privacy.some((b) => b.runs?.some((r) => r.text === "Google API Services User Data Policy" && r.href === "https://developers.google.com/terms/api-services-user-data-policy")), "the Limited Use link");
  assert.equal(LEGAL.privacy[0].runs[0].text, "Privacy Policy — AlmiVisibility"); assert.equal(LEGAL.terms[0].runs[0].text, "Terms of Service");
  /* while the owner's file holds a [FILL], neither page is published — and when filled, it is */
  if (LEGAL.fills.terms.length) assert.equal(P.terms(), null); if (LEGAL.fills.privacy.length) assert.equal(P.privacy(), null);
  const filled = JSON.parse(JSON.stringify(LEGAL).replace(/\[FILL 1\]/g, "help@example.com").replace(/\[FILL 2\]/g, "An Owner").replace(/\[FILL 3\]/g, "Somewhere"));
  const pp = P.privacy({ legal: filled, lite: true }); assert.match(pp, /<h1>Privacy Policy — AlmiVisibility<\/h1>/); assert.doesNotMatch(pp, /\[FILL|PREVIEW|DRAFT/); assert.match(pp, /help@example\.com/);
  assert.match(P.terms({ legal: filled }), /governed by the law of Somewhere/);
});

test("C · in the app: /privacy and /terms answer 'not found' while a [FILL] is in them; the local preview marks each one (never on Vercel)", async () => {
  if (!LEGAL.fills.privacy.length && !LEGAL.fills.terms.length) return; // filled: the published path is proved above
  const a = await lite();
  try { for (const p of ["/privacy", "/terms"]) { const r = await a.get(p); assert.equal(r.status, 404, p); assert.doesNotMatch(r.text, /\[FILL/); } } finally { await a.close(); }
  const pv = createServer(createApp({ mode: "public-lite", env: { VISIBILITY_LEGAL_PREVIEW: "1" }, kvFetch: fakeKv().fetchImpl })); await new Promise((r) => pv.listen(0, "127.0.0.1", r));
  try { const t = await (await fetch(`http://127.0.0.1:${pv.address().port}/privacy`)).text(); assert.match(t, /PREVIEW on this computer — NOT PUBLISHED/); assert.match(t, /<mark class="fill">\[FILL 1\]<\/mark>/); } finally { pv.close(); }
  const vercel = createServer(createApp({ mode: "public-lite", env: { VISIBILITY_LEGAL_PREVIEW: "1", VERCEL: "1" }, kvFetch: fakeKv().fetchImpl })); await new Promise((r) => vercel.listen(0, "127.0.0.1", r));
  try { assert.equal((await fetch(`http://127.0.0.1:${vercel.address().port}/privacy`)).status, 404, "no preview on Vercel"); } finally { vercel.close(); }
});

test("D · the Vercel bundle in PUBLIC-LITE: the mode fixed in its function; the legal text, the limits and the free test inside; it warns while a page is unpublished", () => {
  const files = siteFiles(); for (const f of ["site/legal.generated.json", "site/legal.mjs", "site/limits.mjs", "site/free-test.mjs"]) assert.ok(files.includes(f), f);
  assert.match(FUNCTION_LITE, /createApp\(\{ mode: "public-lite" \}\)/);
  const out = mkdtempSync(join(tmpdir(), "rr325-bundle-")); rmSync(out, { recursive: true, force: true });
  try {
    const r = spawnSync(process.execPath, [join(REPO, "tools", "bundle-site.mjs"), "--public-lite", out], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /bundle \(PUBLIC-LITE\)/);
    assert.match(readFileSync(join(out, "api", "index.mjs"), "utf8"), /mode: "public-lite"/); assert.ok(existsSync(join(out, "site", "legal.generated.json")));
    if (LEGAL.fills.privacy.length) assert.match(r.stdout, /WARNING — \/privacy is NOT published/);
  } finally { rmSync(out, { recursive: true, force: true }); }
});
