/* RR-302 · almivisibility.almiworld.com redesigned like the family's model product, the optional email, the admin like AlmiWorld products — LOCAL only. Every
 * read goes to a fixture server on 127.0.0.1 or to the site server itself on 127.0.0.1; nothing outside is touched; nothing is deployed. */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkLead, fileSiteStore, hashPassword, adminSessions, isAdmin, dailyCounts, leadsCsv, testRecord, FOUNDER_EMAIL } from "../site/leads.mjs";
import { familyStrip, footerColumns, FAMILY_PRODUCTS, NETWORK_LINKS } from "../site/family.mjs";
import * as P from "../site/pages.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const RESULT = { url: "https://x.example/", testedOn: "2026-10-20T10:00:00Z", pagesRead: 4, pagesLimit: 10, skipped: [], score: 81, byCategory: { TECHNICAL: 90, CONTENT: 70, ACCESSIBILITY: 100, LINKS: null, SECURITY: null }, measured: ["title"], notMeasured: ["https-only — needs x"], nextActions: [], noPromise: "no promise" };

test("DECISION 2 · THE EMAIL IS OPTIONAL: no email → no lead (and the result still shows); a bad email is refused; marketing is YES only when its own box was ticked", () => {
  assert.deepEqual(checkLead({ email: "", marketing: true }), { ok: true, lead: null });
  assert.deepEqual(checkLead({ email: undefined }), { ok: true, lead: null });
  assert.equal(checkLead({ email: "not-an-email" }).ok, false);
  for (const marketing of [false, undefined, "yes", "on", 1]) assert.equal(checkLead({ email: "a@example.com", marketing }).lead.marketing, false, String(marketing));
  assert.equal(checkLead({ email: " A@Example.com ", marketing: true, testedUrl: "https://x.example/", score: 81 }).lead.email, "a@example.com");
  assert.equal(checkLead({ email: "a@example.com", marketing: true }).lead.marketing, true);
  /* both boxes start empty; the marketing box starts UNTICKED */
  /* RR-303 B: the email box shows only while sending works (emailOn) */
  for (const html of [P.home({ emailOn: true }), P.freeTest({ emailOn: true }), P.freeTest({ result: RESULT, emailOn: true })]) {
    assert.match(html, /<input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com" value="">/);
    assert.match(html, /<input type="checkbox" name="marketing" value="yes"> /);
    assert.doesNotMatch(html, /name="marketing"[^>]*checked/);
  }
});

test("THE HERO CARD · SAMPLE before a test (marked), the real result after it in the same gauge; an area not measured is \"Not measured\", never zero", () => {
  const before = P.home();
  assert.match(before, /<p class="label">Sample estimate<\/p><span class="badge">Sample<\/span>/);
  assert.match(before, /SAMPLE — an illustrative example, not a real score\./);
  assert.match(before, /aria-label="Score 72 out of 100, Needs work"/);
  const after = P.freeTest({ result: RESULT });
  assert.match(after, /<span class="badge real">Your result<\/span>/);
  assert.match(after, /aria-label="Score 81 out of 100, Good"/);
  assert.match(after, /stroke-dasharray="81 100"/);
  assert.match(after, /<span class="n">Links<\/span><span class="v nm">Not measured<\/span>/);
  assert.doesNotMatch(after, /SAMPLE — an illustrative/);
  const none = P.gauge(null);
  assert.ok(none.includes("Score not measured") && none.includes("<b>—</b>") && !none.includes("stroke-dasharray"), "a missing score drew a value");
  assert.deepEqual([P.scoreWord(95), P.scoreWord(75), P.scoreWord(50), P.scoreWord(10), P.scoreWord(null)], ["Very good", "Good", "Needs work", "Poor", "Not measured"]);
});

test("LIKE THE FAMILY · the family strip (all 23 products, the package's order) and Visibility's own links; the three-column footer; the AlmiWorld logo; no \"coming soon\" anywhere; \"Download here\"", () => {
  const strip = familyStrip().map((l) => l.label);
  assert.deepEqual([strip[0], strip[1], strip.at(-2), strip.at(-1), FAMILY_PRODUCTS.length], ["Home", "eBooks", "Contact Us", Object.values(NETWORK_LINKS).at(-1).label, 23]); /* the last network link by position: a generic test never names a subject (F09) */
  assert.deepEqual(footerColumns().map((c) => c.title), ["AlmiWorld", "Products", "Legal & Contact"]);
  const all = { home: P.home(), freeTest: P.freeTest(), features: P.features(), pricing: P.pricing(), download: P.download({ setupAvailable: true }), privacy: P.privacy(), terms: P.terms() };
  for (const [k, html] of Object.entries(all)) {
    assert.match(html, /<nav class="family" aria-label="Family navigation"><a href="https:\/\/almiworld\.com\/">Home<\/a><a href="https:\/\/almiworld\.com\/ebooks-2\/">eBooks<\/a><a href="https:\/\/almijob\.almiworld\.com\/">AlmiJob<\/a>/, `${k}: family strip`);
    assert.match(html, /<nav class="product" aria-label="AlmiVisibility"><a href="\/"[^>]*>Home<\/a><a href="\/free-test"[^>]*>Free test<\/a><a href="\/features"[^>]*>Features<\/a><a href="\/pricing"[^>]*>Pricing<\/a><a href="\/download"[^>]*>Download<\/a>/, `${k}: own links`);
    assert.match(html, /<img src="\/brand\/almiworld-logo\.png" alt="AlmiWorld — live beautifully"/);
    assert.match(html, /<footer class="site-footer">.*<p>AlmiWorld<\/p>.*<p>Products<\/p>.*<p>Legal &amp; Contact<\/p>/s);
    assert.doesNotMatch(html, /coming soon/i, `${k} says coming soon`);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${k}: one h1`);
    assert.match(html, /<meta name="description" content="[^"]{30,}">/);
    assert.doesNotMatch(html.replace(/No one controls search engines or AI answers\. AlmiVisibility does not promise any ranking[^<]*/, ""), /\s#1\b|number one|first page of google|guarantee[ds]? (a |your )?(rank|traffic|citation)|will rank|top of google/i, `${k} promises a result`);
  }
  assert.match(all.download, /<a class="pill big" href="\/download\/AlmiVisibility-Setup\.exe" download>Download here<\/a>/);
  assert.match(all.download, /unknown publisher/);
  for (const [n, t] of [[30, "1 product"], [40, "up to 5 products"], [60, "up to 10 products"], [80, "unlimited products"]]) assert.match(all.pricing, new RegExp(`\\$${n}<small> / month</small></div><p><b>${t}</b>`));
  assert.match(all.pricing, /There is no free trial/); assert.match(all.pricing, /Prices set by AlmiWorld on 20 October 2026/);
  for (const code of ["EN", "ES", "DE", "IT", "FR", "PT", "AR", "UR", "HI", "ZH"]) { assert.match(all.features, new RegExp(`\\(${code}\\)`)); assert.match(all.home, new RegExp(`\\(${code}\\)`)); }
  for (const page of [all.home, all.features]) assert.match(page, /<h2>YouTube, too<\/h2>/);
  assert.match(all.home, /<h2>How it works<\/h2><ul class="cards steps"><li class="card"><h3>Install the app<\/h3>.*<h3>Add your product<\/h3>.*<h3>Get results<\/h3>/s);
  for (const k of ["privacy", "terms"]) assert.match(all[k], /DRAFT for AlmiWorld's review — not legal advice/);
});

test("ADMIN · LIKE ALMIWORLD PRODUCTS: an allowed email AND its password; one answer for either being wrong; failed logins limited; daily counts; a CSV a spreadsheet cannot run", async () => {
  const env = { ADMIN_EMAILS: "Second@Example.com, third@example.com" };
  assert.deepEqual([isAdmin(FOUNDER_EMAIL, {}), isAdmin("second@example.com", env), isAdmin("someone@example.com", env), isAdmin("", env)], [true, true, false, false]);
  const h = hashPassword("a-test-password-only");
  /* RR-305 B3: the sessions are kept in the store, so every call is awaited */
  const s = adminSessions({ env });
  assert.match((await s.login(FOUNDER_EMAIL, "x", null, "w")).why, /admin page is off/);
  assert.equal((await s.login("someone@example.com", "a-test-password-only", h, "w")).why, "Wrong email or password.", "a password alone opened the admin");
  assert.equal((await s.login(FOUNDER_EMAIL, "wrong", h, "w2")).why, "Wrong email or password.");
  const ok = await s.login("second@example.com", "a-test-password-only", h, "w3");
  assert.equal(await s.who(ok.token), "second@example.com");
  await s.logout(ok.token); assert.equal(await s.who(ok.token), null);
  for (let i = 0; i < 5; i++) await s.login(FOUNDER_EMAIL, "wrong", h, "attacker");
  assert.match((await s.login(FOUNDER_EMAIL, "a-test-password-only", h, "attacker")).why, /Too many tries/);
  const leads = [{ email: "a@x.co", testedUrl: "https://x.example/", at: "2026-10-20T01:00:00Z", marketing: true }, { email: "=cmd|' /C calc'!A0", testedUrl: "https://y.example/", at: "2026-10-19T01:00:00Z", marketing: false }];
  const tests = [{ at: "2026-10-20T01:00:00Z" }, { at: "2026-10-20T02:00:00Z" }, { at: "2026-10-19T03:00:00Z" }];
  assert.deepEqual(dailyCounts(tests, leads), [{ day: "2026-10-20", tests: 2, leads: 1, marketingYes: 1 }, { day: "2026-10-19", tests: 1, leads: 1, marketingYes: 0 }]);
  const csv = leadsCsv(leads);
  assert.equal(csv.split("\r\n")[0], "email,site,date,marketing");
  assert.equal(csv.split("\r\n")[1], "a@x.co,https://x.example/,2026-10-20,yes");
  assert.ok(csv.split("\r\n")[2].startsWith("'=cmd"), "a formula cell was left runnable");
  assert.match(P.adminSales({ who: FOUNDER_EMAIL }), /Not connected yet/);
  assert.deepEqual(Object.keys(testRecord(RESULT)).sort(), ["at", "pages", "score", "site"], "a test record holds more than the site, score, pages and date");
});

/* the whole path through the real server on 127.0.0.1, against a fixture site on 127.0.0.1 (the free test refuses private addresses, so
 * the server is pointed at the fixture through the test's own copy of the free-test module? No — it is exercised here only where it needs no
 * outside site: the refusals, the admin, the CSV, the Buy and Download routes, and the pages' privacy headers) */
test("SERVER · the admin is private (login, HttpOnly SameSite=Strict cookie on /admin, noindex, robots-disallowed); the CSV needs the login; a bad email runs no test; Buy charges nothing without a link; Download serves the Setup", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr302-site-"));
  const setup = join(dir, "AlmiVisibility-Setup-test.exe");
  writeFileSync(setup, "MZ fixture setup bytes");
  const h = hashPassword("a-test-password-only");
  const app = spawn(process.execPath, [join(REPO, "site", "server.mjs"), `--data=${dir}`, `--setup=${setup}`], { stdio: "ignore", env: { ...process.env, SITE_ADMIN_PASSWORD_HASH: h, ADMIN_EMAILS: "", VISIBILITY_SITE_DATABASE_URL: "", RESEND_API_KEY: "re_fakeForThisTestOnly" } }); /* RR-303: sending on (a fake key) so the email is checked — and refused before any test runs */
  try {
    for (let i = 0; i < 50 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const base = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const form = (o) => ({ method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(o).toString(), redirect: "manual" });
    for (const p of ["/admin/leads", "/admin/tests", "/admin/sales", "/admin/leads.csv"]) { const r = await fetch(`${base}${p}`, { redirect: "manual" }); assert.deepEqual([r.status, r.headers.get("location")], [303, "/admin"], p); }
    assert.equal((await fetch(`${base}/admin/login`, form({ email: FOUNDER_EMAIL, password: "nope" }))).status, 401);
    assert.equal((await fetch(`${base}/admin/login`, form({ email: "someone@example.com", password: "a-test-password-only" }))).status, 401, "a password without an allowed email opened the admin");
    const ok = await fetch(`${base}/admin/login`, form({ email: FOUNDER_EMAIL, password: "a-test-password-only" }));
    const ck = ok.headers.get("set-cookie");
    assert.ok(/HttpOnly/.test(ck) && /SameSite=Strict/.test(ck) && /Path=\/admin/.test(ck), ck);
    const c = { headers: { cookie: ck.split(";")[0] } };
    for (const p of ["/admin", "/admin/leads", "/admin/tests", "/admin/sales"]) { const r = await fetch(`${base}${p}`, c); assert.deepEqual([r.status, r.headers.get("x-robots-tag")], [200, "noindex, nofollow"], p); }
    const csv = await fetch(`${base}/admin/leads.csv`, c);
    assert.deepEqual([csv.status, csv.headers.get("content-type"), (await csv.text()).split("\r\n")[0]], [200, "text/csv; charset=utf-8", "email,site,date,marketing"]);
    assert.match(await (await fetch(`${base}/robots.txt`)).text(), /Disallow: \/admin\nDisallow: \/api\/\nDisallow: \/buy\//);
    assert.doesNotMatch(await (await fetch(`${base}/sitemap.xml`)).text(), /admin/);
    /* a bad email: refused before any test runs, and nothing is stored */
    const bad = await fetch(`${base}/free-test`, form({ url: "example.com", email: "nope" }));
    assert.equal(bad.status, 400);
    assert.ok(!existsSync(join(dir, "tests.json")) && !existsSync(join(dir, "leads.json")), "a refused form stored something");
    /* another site's form is refused */
    assert.equal((await fetch(`${base}/free-test`, { ...form({ url: "example.com" }), headers: { origin: "https://evil.example", "content-type": "application/x-www-form-urlencoded" } })).status, 403);
    /* Buy with no checkout link: 503, nothing charged; an unknown plan: 404 */
    /* RR-303 A: Buy is a form to the checkout — with no Stripe key it charges nothing (503); an unknown plan is refused (400) */
    assert.equal((await fetch(`${base}/api/billing/checkout`, form({ plan: "visibility_5" }))).status, 503);
    assert.equal((await fetch(`${base}/api/billing/checkout`, form({ plan: "free" }))).status, 400);
    const dl = await fetch(`${base}/download/AlmiVisibility-Setup.exe`);
    assert.deepEqual([dl.status, await dl.text()], [200, "MZ fixture setup bytes"]);
    assert.equal((await fetch(`${base}/favicon.ico`)).headers.get("content-type"), "image/x-icon");
  } finally { app.kill(); rmSync(dir, { recursive: true, force: true }); }
});

test("THE STORE · a test is logged without the visitor; a lead only with an email; one lead per email and site", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr302-store-"));
  try {
    const st = fileSiteStore(dir);
    await st.addTest(testRecord(RESULT));
    const l = checkLead({ email: "a@example.com", marketing: true, testedUrl: RESULT.url, score: 81 }).lead;
    await st.addLead(l); await st.addLead(l);
    assert.deepEqual([(await st.listTests()).length, (await st.listLeads()).length, (await st.listLeads())[0].marketing], [1, 1, true]);
    assert.doesNotMatch(readFileSync(join(dir, "tests.json"), "utf8"), /127\.0\.0\.1|remoteAddress|ip/i);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
