/**
 * 🔴 RR-358 (owner's real run on 1.15.10, his own PC and data) — 1.15.11:
 *   1 Google's results (G1/G5/G6) for EVERY page on a real run — his run made ONE search for 29 pages: DataForSEO refused his login
 *     (40100, the only DataForSEO message with "login" in it) and the old loop stopped on "login" — the reason thrown away, each refused
 *     search booked at $0.002. Now: every page searched inside the cap; a stop said once and on every page; DataForSEO's charge booked.
 *   2 the client's look read from the LIVE site when the saved read has none (his was made by a version before RR-355); else the reason
 *   3 an IMPROVE topic is the client's existing page — its address, every link pointing there, never published as a second page
 *   4 "Keywords to use (0)" beside 529 phrases: a plan older than its sources is made again
 *   5 "Test the connection": the open product's subject, Google's titles shown, works with the switch off, a refusal in plain words
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { searchPages, searchGoogle, plainSerpWhy, readSerp } from "../desktop/serp.mjs";
import { readShell } from "../desktop/site-read.mjs";
import { examPlan } from "../desktop/exam-plan.mjs";
import { seoPages } from "../desktop/seo-pages.mjs";
import { jobReport } from "../desktop/plain-words.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8"), MAIN = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), SEO = readFileSync(join(REPO, "desktop", "seo-pages.mjs"), "utf8");
const DENIED = { status_code: 40100, status_message: "You are not authorized to access this resource. See your login details here: https://app.dataforseo.com/api-dashboard .", tasks: null }; // DataForSEO's own 40100

/** a stand-in for DataForSEO + the top results' pages: Google's answer by keyword, as the live service shapes it */
async function standIn({ refuse = false } = {}) {
  const asked = [];
  const srv = createServer((q, r) => {
    if (q.method === "GET") { r.writeHead(200, { "content-type": "text/html" }); r.end(`<html><body><h2>OET fees ${q.url}</h2><h2>The score nurses need</h2><h3>Booking a date</h3></body></html>`); return; }
    let t = ""; q.on("data", (c) => (t += c)); q.on("end", () => {
      const k = JSON.parse(t)[0].keyword; asked.push(k); const base = `http://127.0.0.1:${srv.address().port}`;
      const items = / reddit$/.test(k) ? [{ type: "organic", url: "https://www.reddit.com/r/nursing/comments/1", title: "How hard is the OET for nurses really? : r/nursing" }]
        : / quora$/.test(k) ? [ /* RR-359: Quora as Google shows it for "<topic> quora" — no operator (DataForSEO charges 5× for one) */{ type: "organic", url: "https://www.quora.com/What-is-the-OET-pass-score", title: "What is the OET pass score for nurses? - Quora" }]
        : [{ type: "organic", url: `${base}/top1`, title: `${k} — a guide` }, { type: "organic", url: `${base}/top2`, title: `${k} — fees` }, { type: "people_also_ask", items: [{ title: `Is ${k} hard?` }] }, { type: "related_searches", items: [`${k} score`] }];
      r.writeHead(refuse ? 401 : 200, { "content-type": "application/json" });
      r.end(JSON.stringify(refuse ? DENIED : { status_code: 20000, tasks: [{ status_code: 20000, cost: 0.002, result: [{ items }] }] }));
    });
  });
  await new Promise((res) => srv.listen(0, "127.0.0.1", res));
  const url = `http://127.0.0.1:${srv.address().port}/`;
  return { asked, fetchImpl: (u, init) => fetch(url, init), readHtml: async (u) => (await fetch(u)).text(), close: () => srv.close() };
}
const KEYS = { login: "client@example.test", password: "fixture-api-pass" };

test("RR-358 · 1 · Google's results for EVERY page on a real run — inside the cap; a stop said once and on each page; the run's line says how many searches and their cost", async () => {
  const S = await standIn();
  try {
    const pages = [{ title: "OET for Nurses" }, { title: "OET in Ireland" }, { title: "OET Writing" }], ledger = { spent: [] };
    const out = await searchPages({ pages, ledger, settings: { on: true, capDay: 1, capMonth: 30 }, ...KEYS, now: "2026-11-01T10:00:00Z", fetchImpl: S.fetchImpl, readHtml: S.readHtml });
    assert.deepEqual([out.searches, out.read, out.of, out.stopped], [9, 3, 3, null], "three searches a page: the intent, Reddit and Quora as Google shows them");
    assert.equal(out.cost.toFixed(4), "0.0180");
    assert.equal(out.line, "Google's results (your DataForSEO account): 9 searches, $0.0180 — 3 of 3 pages read what ranks, \"People also ask\", related searches, Reddit and Quora as Google shows them.");
    for (const p of pages) {
      assert.equal(p.topRead.length, 2, `${p.title}: the top results read (G5)`); assert.ok(p.coverage.length > 0, `${p.title}: what the top results cover`);
      assert.ok(p.second, `${p.title}: the second-search test (G6)`); assert.equal(p.serpWhy, undefined);
      const from = new Set(p.questions.map((q) => q.source.replace(/ \(.*$/, "")));
      assert.deepEqual([...from].sort(), ["Google \"People also ask\"", "Google related searches", "a Quora result as Google shows it", "a Reddit result as Google shows it"]);
    }
    /* cached: the same run again buys nothing */
    const again = await searchPages({ pages: pages.map((p) => ({ title: p.title })), ledger, settings: { on: true }, ...KEYS, now: "2026-11-01T11:00:00Z", fetchImpl: S.fetchImpl, readHtml: S.readHtml });
    assert.deepEqual([again.searches, again.cost, again.read], [0, 0, 3]);
    /* the cap stops it, said on every page not searched */
    const capped = [{ title: "A one" }, { title: "B two" }, { title: "C three" }];
    const c = await searchPages({ pages: capped, ledger: { spent: [] }, settings: { on: true, capDay: 0.004 }, ...KEYS, now: "2026-11-01T10:00:00Z", fetchImpl: S.fetchImpl, readHtml: S.readHtml });
    assert.equal(c.searches, 2); assert.match(c.stopped, /^the cap is reached \(\$0\.0040 today of \$0\.004/);
    assert.deepEqual(capped.slice(1).map((p) => p.serpWhy), [c.stopped, c.stopped]); assert.match(c.line, / — 1 of 3 pages read .* Stopped: the cap is reached/);
  } finally { S.close(); }
  /* THE OWNER'S RUN, replayed: DataForSEO refuses the login → ONE search for 29 pages (as his ledger), now said, and booked at what DataForSEO charged */
  const R = await standIn({ refuse: true });
  try {
    const pages = Array.from({ length: 29 }, (_, i) => ({ title: `Page ${i + 1}` })), ledger = { spent: [] };
    const out = await searchPages({ pages, ledger, settings: { on: true, capDay: 1 }, ...KEYS, now: "2026-11-01T02:55:57Z", fetchImpl: R.fetchImpl, readHtml: R.readHtml });
    assert.deepEqual([out.searches, out.read, R.asked.length], [1, 0, 1], "one search — the refusal stops every search, as in his ledger");
    assert.deepEqual(ledger.spent.map((x) => [x.cost, x.ok, x.code]), [[0, false, 40100]], "a refused search costs nothing — never booked at $0.002 again");
    assert.ok(pages.every((p) => /^DataForSEO did not accept your login and API password/.test(p.serpWhy)), "every page says why");
    assert.match(out.line, /^Google's results \(your DataForSEO account\): 1 search, \$0\.0000 — 0 of 29 pages read .* Stopped: DataForSEO did not accept your login and API password \(DataForSEO answered: "You are not authorized/);
    assert.ok(!JSON.stringify([ledger, out, pages]).includes(KEYS.password) && !JSON.stringify([ledger, out]).includes(KEYS.login), "the login is never kept or shown");
  } finally { R.close(); }
  assert.match(plainSerpWhy(40100, "x"), /Open app\.dataforseo\.com\/api-access: copy the "API login" shown there \(not your sign-in e-mail\) and the API password \(not your sign-in password — shown there for 24 hours after you register, later sent by e-mail or reset on that page\), and save both again in Search results data → step 2\.$/); // RR-359
  assert.match(plainSerpWhy(40210, "insufficient funds."), /^your DataForSEO balance is too low/);
  assert.deepEqual([readSerp(DENIED).code, readSerp(DENIED).stop], [40100, true]);
  /* wired: the run uses it for every page; the page's ⚠️ and its ledger line say what stopped it; the report carries the line */
  assert.ok(MAIN.includes("const out = await searchPages({ pages: plan.pages,") && !MAIN.includes("plan.pages.slice(0, 30)"));
  assert.ok(SEO.includes("d.checkLater = m.route === \"none\" || Boolean(m.serpWhy);")); /* RR-362 item 13: never a failure: checked on a later day */
  assert.ok(MAIN.includes("p.serpWhy ? `Google's results were not read for this page: ${p.serpWhy}` : routeLine(p)")); // RR-360: and the route that answered
  assert.ok(MAIN.includes("if (x.pages.serp?.line) lines.push(x.pages.serp.line);"));
});

test("RR-358 · 2 · the client's look read from the LIVE site when the saved read has none — or the exact reason, on every page", async () => {
  const LOOK = '<html><head><link rel="stylesheet" href="/s.css"></head><body><header><nav><a href="/">Home</a></nav></header><main><p>x</p></main><footer>© Client</footer></body></html>';
  const srv = createServer((q, r) => { if (q.url === "/gone") { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": "text/html" }); r.end(q.url === "/bare" ? "<html><body><div id=root></div></body></html>" : LOOK); });
  await new Promise((res) => srv.listen(0, "127.0.0.1", res));
  const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    const ok = await readShell({ url: `${base}/`, allowLocal: true });
    assert.equal(ok.ok, true); assert.match(ok.shell.header, /<header>/); assert.match(ok.shell.footer, /© Client/); assert.match(ok.shell.head, /s\.css/);
    assert.match((await readShell({ url: `${base}/bare`, allowLocal: true })).why, /was read, but it has no a header or menu, a footer, a stylesheet in its HTML that Visibility can take .* connect WordPress or Shopify under Publish/);
    assert.match((await readShell({ url: `${base}/gone`, allowLocal: true })).why, /^your home page http:\/\/127\.0\.0\.1:\d+\/gone answered 404 instead of the page — check that it opens in a browser/);
  } finally { srv.close(); }
  /* the reason reaches every page's check */
  const pg = (path, fact) => ({ url: `https://client.example${path}`, title: "Client", h1: "Client", h2: [], qa: [], facts: [fact], lead: [], prices: [] });
  const site = { ok: true, origin: "https://client.example", readOn: "2026-11-01", robotsTxt: null, sitemapUrls: null, lookWhy: "your home page https://client.example/ answered 503 instead of the page — check that it opens in a browser, then press Create SEO pages again.", pages: [pg("/", "Client teeth whitening takes 60 minutes at the clinic for most people."), pg("/whitening", "Teeth whitening at the clinic takes 60 to 90 minutes, and it does not take long to heal.")] };
  const d = seoPages({ site, searchConsole: { queries: [{ query: "how long does teeth whitening take", impressions: 30 }], window: "28 days" }, on: "2026-11-01T10:00:00Z" }).drafts[0];
  assert.deepEqual(d.gates.find((g) => g.gate === "G").failing, ["This page does not look like your site yet. Why: your home page https://client.example/ answered 503 instead of the page — check that it opens in a browser, then press Create SEO pages again."]);
  /* wired: pages are made only after the look is read again when the saved read has none */
  assert.ok(/async function makePages\(id, key\) \{(?:\n[^\n]*){1,3}\n  await ensureLook\(id\);/.test(MAIN) && MAIN.includes("if (!site?.ok || site.shell || !hasWebsite(s)) return site;"));
});

test("RR-358 · 3 · an IMPROVE topic is the client's EXISTING page: its address, every link pointing there, counted apart, never published as a second page", async () => {
  const ON = "2026-11-01", fact = (country, profession, text, link) => ({ id: `${country}-${profession}`, country, part: "councils", profession, verified: true, text, link, on: "2026-10-31" });
  const FACTS = [fact("United Kingdom", "nursing", "NMC accepts OET: Listening B (350+), Reading B (350+), Writing C+ (300+), Speaking B (350+).", "https://www.nmc.org.uk/x"), fact("Australia", "medicine", "Medical Board of Australia (via Ahpra). Accepts OET. Tests on/after 23 Apr 2026: Listening 350, Reading 360, Writing 350, Speaking 360, no overall score.", "https://www.ahpra.gov.au/a")];
  const sp = (url, title) => ({ url, title, h1: title, h2: [], qa: [], facts: [], lead: [], prices: [] });
  const site = { ok: true, origin: "https://prep.example", readOn: ON, robotsTxt: null, sitemapUrls: null, pages: [sp("https://prep.example/", "Prep"), sp("https://prep.example/guides/oet-for-doctors", "OET for Doctors 2026: Score, Fees & Writing Samples")] };
  const x = examPlan({ subject: "OET", professions: ["medicine", "nursing"], countries: ["United Kingdom"], facts: FACTS, site });
  const out = seoPages({ site, on: `${ON}T10:00:00Z`, pagePlan: x.pages, max: x.pages.length });
  const doc = out.drafts.find((d) => d.title === "OET for Doctors");
  assert.ok(doc, out.drafts.map((d) => d.title).join(" | "));
  assert.deepEqual([doc.url, Boolean(doc.improve), doc.madeAt], ["https://prep.example/guides/oet-for-doctors", true, "https://prep.example/oet-for-doctors"], "the existing page's address");
  assert.ok(out.drafts.every((d) => !d.html.includes('href="https://prep.example/oet-for-doctors"') && !d.html.includes('href="/oet-for-doctors"')), "no link to a second address");
  assert.ok(out.drafts.some((d) => d !== doc && d.html.includes('href="https://prep.example/guides/oet-for-doctors"')), "links go to the client's own page");
  assert.equal(out.drafts.filter((d) => d.title === "OET for Doctors").length, 1);
  /* the report: new pages and existing pages apart; an existing page never "needs work" as a new page */
  const rep = jobReport({ drafts: [{ title: "OET for Nurses", url: "n", readyAsDraft: false, gates: [] }, { title: "OET for Doctors", url: "d", readyAsDraft: false, improve: { url: "d" }, gates: [] }], notMade: [{ title: "X", why: "Not made yet — y" }] });
  assert.equal(rep.headline, "1 new page made, 1 of your existing pages to improve, 0 published, 1 needs work, 1 not made yet — here is why.");
  assert.deepEqual(rep.needWork.map((w) => w.title), ["OET for Nurses", "X"]);
  /* the app: never published as a page; the card counts it apart */
  const { productStore } = await import("../desktop/products.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr358-app-")), st = productStore(dir);
  st.setCompany({ name: "Fixture Co", site: "https://fixture.invalid", logoFile: null });
  const a = st.create({ name: "Fixture", site: "https://fixture.invalid" }); const s1 = st.read(a.id); s1.started = true; st.write(a.id, s1);
  writeFileSync(join(dir, "products", a.id, "pages.json"), JSON.stringify({ drafts: [{ url: "https://fixture.invalid/new", title: "New", readyAsDraft: true }, { url: "https://fixture.invalid/guides/old", title: "Old", readyAsDraft: true, improve: { url: "https://fixture.invalid/guides/old" } }] }));
  const kp = generateKeyPairSync("ed25519"); writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, keysDir: dir, licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", tourSeen: true }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const root = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const pub = await (await fetch(`${root}/api/products/${a.id}/publish/draft`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: "https://fixture.invalid/guides/old" }) })).json();
    assert.deepEqual([pub.ok, pub.improve], [false, true]); assert.match(pub.why, /^This is your existing page — Visibility never publishes it as a second page\./);
    const home = await (await fetch(`${root}/api/home`)).json(), card = home.products.find((x) => x.id === a.id);
    assert.deepEqual([card.pages, card.improve], [1, 1], "the card: 1 new page, 1 of yours to improve");
  } finally { p.kill(); await new Promise((r) => setTimeout(r, 300)); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
  /* the Pages screen: new pages, then the client's existing pages apart — with no Approve & Publish */
  assert.ok(UI.includes('<h3 id="newsec">New pages (${fresh.length})</h3>') && UI.includes('<h3 id="impsec">Your existing pages to improve (${mine.length})</h3>'));
  assert.ok(!/data-mine>[^`]*data-pub=/.test(UI), "an existing page has no publish button");
});

test("RR-358 · 4 + 5 · a plan older than its sources is made again (no \"Keywords to use (0)\" beside the phrases found); the test search shows what Google returned", async () => {
  const { productStore } = await import("../desktop/products.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr358-plan-")), st = productStore(dir);
  st.setCompany({ name: "Fixture Co", site: "https://fixture.invalid", logoFile: null });
  const a = st.create({ name: "Fixture", site: "https://fixture.invalid" }); const s1 = st.read(a.id); s1.started = true; st.write(a.id, s1);
  const pd = join(dir, "products", a.id), old = "2026-10-31T18:40:52.779Z";
  writeFileSync(join(pd, "check.json"), JSON.stringify({ on: old, score: 50, areas: [], pagesRead: 1 }));
  writeFileSync(join(pd, "plan.json"), JSON.stringify({ on: old, thisWeek: [], rest: [], keywords: [], titles: { existing: [], new: [] }, make: [], social: [] }));
  writeFileSync(join(pd, "keyword-db.json"), JSON.stringify({ rows: [] })); // the keyword database came AFTER the plan (the owner's 20:23)
  utimesSync(join(pd, "plan.json"), new Date(old), new Date(old));
  const serp = createServer((q, r) => { let t = ""; q.on("data", (c) => (t += c)); q.on("end", () => { const k = JSON.parse(t)[0].keyword; if (k === "refuse-me") { r.writeHead(401, { "content-type": "application/json" }); r.end(JSON.stringify(DENIED)); return; } r.writeHead(200, { "content-type": "application/json" }); r.end(JSON.stringify({ status_code: 20000, tasks: [{ status_code: 20000, cost: 0.002, result: [{ items: [{ type: "organic", url: "https://a.example/1", title: `${k}: the first result` }, { type: "organic", url: "https://b.example/2", title: "The second result" }, { type: "people_also_ask", items: [{ title: "A question?" }] }] }] }] })); }); });
  await new Promise((res) => serp.listen(0, "127.0.0.1", res));
  const kp = generateKeyPairSync("ed25519"); writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, keysDir: dir, licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", serpTestUrl: `http://127.0.0.1:${serp.address().port}/`, tourSeen: true }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const root = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const call = async (u, o) => (await fetch(root + u, o ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) } : {})).json();
    const ov = await call(`/api/products/${a.id}/overview`);
    assert.equal(ov.remaking, true, "the plan is older than the keyword database — made again now");
    let fresh = null; for (let i = 0; i < 100; i++) { await new Promise((r) => setTimeout(r, 150)); fresh = JSON.parse(readFileSync(join(pd, "plan.json"), "utf8")); if (fresh.on !== old) break; }
    assert.notEqual(fresh.on, old, "plan.json was made again");
    assert.equal((await call(`/api/products/${a.id}/overview`)).remaking, false, "made once — not again while nothing changed");
    /* 5 · the test: the OPEN product's subject, the switch OFF, Google's titles shown */
    for (const [k, v] of [["DATAFORSEO_LOGIN", "client@example.test"], ["DATAFORSEO_PASSWORD", "fixture-pass"]]) await call(`/api/keys/${k}`, { key: v });
    assert.equal((await call("/api/search-data")).on, false);
    const t = await call("/api/search-data/test", { product: a.id });
    assert.equal(t.ok, true, JSON.stringify(t)); assert.match(t.line, /^Connected ✓ — Google's results for "Fixture" were read: 2 results/);
    assert.deepEqual(t.top.map((x) => x.title), ["Fixture: the first result", "The second result"]);
    /* found in the built app: a refused test showed the screen's own "Off — your login is saved" line in red — the refusal is the message, never that line */
    const no = await call("/api/search-data/test", { keyword: "refuse-me" });
    assert.deepEqual([no.ok, no.line], [false, undefined]); assert.match(no.refused, /^Not connected — DataForSEO did not accept your login and API password .* Nothing was charged for it.$/);
  } finally { p.kill(); serp.close(); await new Promise((r) => setTimeout(r, 300)); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
  assert.ok(UI.includes('Keywords to use (${O.remaking ? "being made again with your newest search phrases…"'));
  assert.ok(UI.includes('const r = await post("/api/search-data/test", { product: P });') && UI.includes("<b>What Google showed (top ${r.top.length}):</b>"));
  assert.ok(UI.includes("The test works while the switch is off — it is only a check, one search."));
  assert.ok(UI.includes('note($("#sdtestmsg"), r.ok ? r.line : r.refused ?? "Not connected.", r.ok ? "ok" : "err")') && /\.msg-ok\{color:#1F6F43/.test(UI), "success in green");
});

test("RR-358 · 5 · a refused test is DataForSEO's own reason in plain words, and costs what DataForSEO charged", async () => {
  const ledger = { spent: [] };
  const r = await searchGoogle({ keyword: "OET", settings: { on: false }, ledger, ...KEYS, test: true, fetchImpl: async () => ({ json: async () => DENIED }) });
  assert.deepEqual([r.ok, r.code], [false, 40100]); assert.match(r.why, /^DataForSEO did not accept your login and API password/);
  assert.deepEqual(ledger.spent.map((x) => [x.cost, x.what]), [[0, "search results (connection test)"]]);
  assert.ok(MAIN.includes("refused: `Not connected — ${r.why} Nothing was charged for it"));
});
