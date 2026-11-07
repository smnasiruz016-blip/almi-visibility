/**
 * RR-386 (owner, 7 Nov 02:43: "the client wants to enter his product and go to sleep"): the autopilot cycle, its cost before start, the
 * go-live (only the pages folder, preview scanned, merged, live scanned, rolled back on a serious failure), the server's keeping (sealed,
 * chunked, the runner's lease), the two-place join, and the scan — each of its eleven checks seen RED, then GREEN. Nothing leaves this machine.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runCycle, costPlan, weeklyReport, isDue, apState, STEPS, MODES } from "../desktop/autopilot.mjs";
import { goLive, githubApi, outsideFolder, rollBack } from "../desktop/go-live.mjs";
import { scanSite, SCAN_CHECKS, readRobots, robotsAllows, datesOf } from "../desktop/site-scan.mjs";
import { apHandle, apMemoryStore, productKey, sealKey } from "../site/autopilot-server.mjs";
import { joinBundles, addLedgers, baseOf, encode, decode, chunksOf } from "../desktop/autopilot-sync.mjs";
import { oldestLastChecked } from "../desktop/publish.mjs";
import { standinGithub } from "./helpers/standin-github.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const page = (slug, extra = "") => `<!doctype html><html><head><title>Page ${slug}</title><link rel="canonical" href="https://ex.com/${slug}"></head><body><main><h1>${slug}</h1><p class="checked" data-last-checked="2026-11-01">Last checked 2026-11-01</p><details data-need-id="q1"><summary>Question one?</summary><p>Answer one. <a class="src" href="https://src.example/1">S</a><span class="src"> · checked 2026-11-01</span></p></details>${extra}<a href="https://ex.com/">Home</a></main></body></html>`;

test("1 · COST BEFORE START: the whole job's cost once; the part that fits runs, the rest waits for next month; a job never stops halfway", () => {
  const parts = [{ name: "answers", usd: 2, divisible: true, unitUsd: 0.02, units: 100 }, { name: "lines", usd: 1.5, divisible: true, unitUsd: 0.01, units: 150 }];
  const all = costPlan(parts, 10); assert.equal(all.fits, true); assert.equal(all.line, "This job: about $3.50. Your limit leaves $10.00.");
  const some = costPlan(parts, 2.5); assert.equal(some.fits, false); assert.equal(some.runUsd, 2.5); assert.match(some.line, /^This job: about \$3\.50\. Your limit leaves \$2\.50\. It runs the part that fits now \(about \$2\.50\); the rest \(the rest of lines, about \$1\.00\) waits for next month\.$/);
  assert.equal(costPlan([{ name: "x", usd: 5 }], 1).run.length, 0, "a part that cannot be split is not started");
});

test("2 · ONE CYCLE: Show me first waits for the one yes; Autopilot runs every step in order, saves each, and stops where a step says so", async () => {
  const order = [], steps = Object.fromEntries(STEPS.map((s) => [s.key, async () => { order.push(s.key); return { ok: true, line: s.key, usd: s.key === "truth" ? 0.5 : 0 }; }]));
  const w = await runCycle({ mode: MODES.REVIEW, steps, estimate: async () => [{ name: "lines", usd: 1 }], budget: { left: 3 } }); assert.equal(w.waiting, true); assert.equal(order.length, 0); assert.match(w.line, /about \$1\.00\. Your limit leaves \$3\.00\. Press Start/);
  const saved = []; const c = await runCycle({ mode: MODES.AUTO, steps, estimate: async () => [], budget: { left: 3 }, save: (x) => saved.push(x.steps.length) });
  assert.deepEqual(order, STEPS.map((s) => s.key)); assert.equal(c.ok, true); assert.equal(c.usd, 0.5); assert.ok(saved.length >= STEPS.length);
  order.length = 0; const s2 = { ...steps, gate: async () => { order.push("gate"); return { ok: false, line: "no connection", stopCycle: true }; } };
  const c2 = await runCycle({ mode: MODES.AUTO, steps: s2, estimate: async () => [], budget: { left: 1 } }); assert.equal(order.at(-1), "gate"); assert.equal(c2.ok, false);
  assert.equal(isDue(apState({ mode: "autopilot" })), true); assert.equal(isDue(apState({ mode: "review" })), false); assert.equal(isDue(apState({ mode: "autopilot", last: { on: new Date().toISOString() } })), false);
  const wk = weeklyReport([{ on: new Date().toISOString(), usd: 0.5, steps: [{ key: "newPages", data: { made: 3 } }, { key: "gate", held: [{ url: "/a", why: "a check failed" }] }] }], { since: Date.now() - 864e5, budget: { cap: 10, left: 9.5 } });
  assert.match(wk.text, /Pages added: 3\./); assert.match(wk.text, /Pages held \(1\): \/a — a check failed/); assert.doesNotMatch(wk.text, /DataForSEO|Anthropic|Google's results|AlmiSEO/i, "names no data source");
});

const pagesMap = (n, folder = "visibility-pages") => new Map(Array.from({ length: n }, (_, i) => [`${folder}/p${i}/index.html`, page(`p${i}`)]));
const goodScan = async () => ({ ok: true, crawled: 3, rows: [], serious: [] });
test("3 · GO LIVE: the branch takes the live code, ONLY the pages folder, its own PR, preview Ready + checks green + scan → merge; production Ready → live scan; the way back written first", async () => {
  const live = pagesMap(2); live.set("src/app.tsx", "code"); const prev = new Map(live); prev.set("visibility-pages/new/index.html", page("new"));
  const gh0 = await standinGithub({ repo: "o/r", live: "main", preview: "visibility-pages", files: prev, liveFiles: live });
  try {
    const gh = githubApi({ key: "t", testBase: gh0.base }), scans = [];
    const r = await goLive({ gh, conn: { repo: "o/r", branch: "visibility-pages", folder: "visibility-pages", site: "https://ex.com" }, scan: async (u, o) => { scans.push(o.preview); return goodScan(); }, everyMs: 5, maxWaitMs: 2000 });
    assert.equal(r.ok, true, JSON.stringify(r.steps)); assert.deepEqual(scans, [true, false]); assert.equal(gh0.st.merged.length, 1); assert.ok(r.way?.before && /git checkout/.test(r.way.how));
    assert.equal(gh0.filesOf("main").get("visibility-pages/new/index.html"), page("new")); assert.equal(gh0.filesOf("main").get("src/app.tsx"), "code");
    const again = await goLive({ gh, conn: { repo: "o/r", branch: "visibility-pages", folder: "visibility-pages", site: "https://ex.com" }, scan: goodScan, everyMs: 5, maxWaitMs: 2000 }); assert.equal(again.nothing, true, "a second go-live with nothing new does nothing");
  } finally { await gh0.close(); }
});
test("4 · GO LIVE REFUSES: a file outside the pages folder, a failed check, a preview that fails the scan — held with the reason, never merged", async () => {
  const live = pagesMap(1), prev = new Map(live); prev.set("visibility-pages/new/index.html", page("new"));
  for (const [opts, scan, re] of [[{ outsideFile: "src/secret.ts" }, goodScan, /outside visibility-pages\/ \(src\/secret\.ts\)/], [{ checks: "failure" }, goodScan, /A check failed on the preview: verify/], [{}, async () => ({ ok: false, rows: [{ check: "Internal links", ok: false, count: 2 }] }), /preview failed the scan/]]) {
    const gh0 = await standinGithub({ files: prev, liveFiles: live, ...opts });
    try { const r = await goLive({ gh: githubApi({ key: "t", testBase: gh0.base }), conn: { repo: "o/r", branch: "visibility-pages", folder: "visibility-pages", site: "https://ex.com" }, scan, everyMs: 5, maxWaitMs: 2000 }); assert.equal(r.ok, false); assert.match(r.held, re); assert.equal(gh0.st.merged.length, 0, "never merged"); } finally { await gh0.close(); }
  }
  assert.deepEqual(outsideFolder([{ filename: "visibility-pages/a/index.html" }, { filename: "package.json" }], "visibility-pages"), ["package.json"]);
});
test("5 · A SERIOUS LIVE FAILURE IS ROLLED BACK BY ITSELF: the pages folder exactly as before the merge, the site's code untouched", async () => {
  const live = pagesMap(2); live.set("src/app.tsx", "code"); const prev = new Map(live); prev.set("visibility-pages/p0/index.html", page("p0", "<p>changed</p>"));
  const gh0 = await standinGithub({ files: prev, liveFiles: live });
  try {
    const r = await goLive({ gh: githubApi({ key: "t", testBase: gh0.base }), conn: { repo: "o/r", branch: "visibility-pages", folder: "visibility-pages", site: "https://ex.com" }, scan: async (u, o) => (o.preview ? goodScan() : { ok: false, rows: [], serious: ["https://ex.com/p1 answers 404"] }), everyMs: 5, maxWaitMs: 2000 });
    assert.equal(r.ok, false); assert.match(r.held, /rolled back by itself/); assert.equal(r.rolledBack.ok, true);
    assert.equal(gh0.filesOf("main").get("visibility-pages/p0/index.html"), page("p0"), "the page as before"); assert.equal(gh0.filesOf("main").get("src/app.tsx"), "code");
  } finally { await gh0.close(); }
});

const env = { CRON_SECRET: "c".repeat(32), AUTOPILOT_RUNNER_KEY: "r".repeat(32) }, lic = { ok: true, account: "acct-1" };
const call = (store, o) => apHandle({ env, store, headers: {}, query: new URLSearchParams(), raw: Buffer.alloc(0), ...o });
test("6 · OUR SERVER KEEPS IT SEALED: the licence's own product, the bundle in chunks, the keys never sent back to the app and never kept in clear; the runner only with its key", async () => {
  const store = apMemoryStore(), j = (o) => Buffer.from(JSON.stringify(o));
  assert.equal((await call(store, { method: "GET", path: "/v1/autopilot/almioet", lic: { ok: false, status: 401, why: "no licence" } })).status, 401);
  const on = await call(store, { method: "POST", path: "/v1/autopilot/almioet", lic, raw: j({ mode: "autopilot", keys: { ANTHROPIC_API_KEY: "sk-ant-secret-1234567890", NOT_A_NAME: "x" }, email: "a@b.c" }) });
  assert.equal(on.status, 200); assert.deepEqual(on.json.keys, ["ANTHROPIC_API_KEY"]); assert.ok(!JSON.stringify(on.json).includes("sk-ant"), "the key is never sent back");
  const row = await store.get(productKey("acct-1", "almioet")); assert.ok(!row.secrets.toString("latin1").includes("sk-ant"), "sealed at rest");
  const buf = encode({ "products/almioet/a.json": "{\"x\":1}" }), parts = chunksOf(buf);
  for (let n = 0; n < parts.length; n++) assert.equal((await call(store, { method: "POST", path: "/v1/autopilot/almioet/state", lic, query: new URLSearchParams({ version: "1", n: String(n), of: String(parts.length) }), raw: parts[n] })).status, 200);
  assert.equal((await call(store, { method: "POST", path: "/v1/autopilot/almioet/state", lic, query: new URLSearchParams({ version: "1", n: "0", of: "1" }), raw: parts[0] })).status, 400, "an old version is refused");
  const back = await call(store, { method: "GET", path: "/v1/autopilot/almioet/state", lic, query: new URLSearchParams({ n: "0" }) }); assert.deepEqual(decode(back.bytes).files, { "products/almioet/a.json": "{\"x\":1}" });
  assert.equal((await call(store, { method: "GET", path: "/runner/autopilot/due" })).status, 401, "the runner needs its key");
  const due = await call(store, { method: "GET", path: "/runner/autopilot/due", headers: { "x-autopilot-runner": env.AUTOPILOT_RUNNER_KEY } }); assert.equal(due.json.due.length, 1);
  assert.equal((await call(store, { method: "GET", path: "/runner/autopilot/due", headers: { "x-autopilot-runner": env.AUTOPILOT_RUNNER_KEY } })).json.due.length, 0, "leased: not handed out twice");
  assert.equal((await call(store, { method: "POST", path: "/v1/autopilot/almioet/state", lic, query: new URLSearchParams({ version: "2", n: "0", of: "1" }), raw: parts[0] })).status, 423, "the app waits while the runner holds it");
  const keys = await call(store, { method: "GET", path: `/runner/autopilot/${due.json.due[0].key}/secrets`, headers: { "x-autopilot-runner": env.AUTOPILOT_RUNNER_KEY } }); assert.equal(keys.json.keys.ANTHROPIC_API_KEY, "sk-ant-secret-1234567890");
  const sent = []; await call(store, { method: "POST", path: `/runner/autopilot/${due.json.due[0].key}/done`, headers: { "x-autopilot-runner": env.AUTOPILOT_RUNNER_KEY }, raw: j({ cycle: { on: "2026-11-08T01:40:00Z", ok: true, usd: 0.4, steps: [] }, weekly: { on: "2026-11-08", text: "Your week" } }), sendWeekly: async (m) => { sent.push(m); return { ok: true }; } });
  assert.equal(sent.length, 1); assert.equal(sent[0].to, "a@b.c"); assert.match(sent[0].text, /^Your week\n\nFrom your phone \(see the last cycle, turn autopilot OFF\): https:\/\/\S+\/autopilot#k=[0-9a-f]{32}&t=/, "RR-387 B3: the week's mail carries a fresh phone link"); assert.equal((await store.get(productKey("acct-1", "almioet"))).lease_until, null);
  assert.equal((await call(store, { method: "GET", path: "/v1/autopilot/x", lic, env: {} })).status, 503, "no key → not connected, said");
  assert.ok(sealKey(env).length === 32);
});

test("7 · ONE PRODUCT, TWO PLACES: a file changed on one side is taken; both changed → joined key by key (paid verdicts kept); the money ledgers ADDED", () => {
  const base = { "products/p/a.json": '{"k1":1}', "products/p/b.json": '{"x":1}', "products/p/c.json": "{}", "ai-usage.json": '{"days":{"2026-11-07":{"usd":1,"requests":10}}}' };
  const app = { ...base, "products/p/a.json": '{"k1":1,"app":2}', "products/p/c.json": '{"verdict-app":true}', "ai-usage.json": '{"days":{"2026-11-07":{"usd":1.5,"requests":12}}}' };
  const server = { ...base, "products/p/b.json": '{"x":2}', "products/p/c.json": '{"verdict-server":true}', "ai-usage.json": '{"days":{"2026-11-07":{"usd":2,"requests":20},"2026-11-08":{"usd":0.3,"requests":3}}}' };
  const j = joinBundles({ base: baseOf(base), app, server });
  assert.equal(j.files["products/p/a.json"], app["products/p/a.json"]); assert.equal(j.files["products/p/b.json"], server["products/p/b.json"]);
  assert.deepEqual(JSON.parse(j.files["products/p/c.json"]), { "verdict-server": true, "verdict-app": true });
  assert.deepEqual(JSON.parse(j.files["ai-usage.json"]).days["2026-11-07"], { usd: 2.5, requests: 22 }, "1 + 0.5 (app) + 1 (server)"); assert.deepEqual(JSON.parse(j.files["ai-usage.json"]).days["2026-11-08"], { usd: 0.3, requests: 3 });
  assert.equal(addLedgers(1, 1.5, 2), 2.5);
});

/* the scan: a small site with every check green; then each check broken in turn → RED, restored → GREEN */
function siteFor(o = {}) {
  const pages = { "/": `<html><head><title>Home</title><link rel="canonical" href="https://ex.com/">${o.homeNoindex ? '<meta name="robots" content="noindex">' : ""}</head><body><main><a href="/a">A</a><a href="/b">B</a>${o.brokenLink ? '<a href="https://ex.com/gone">x</a>' : ""}</main></body></html>`,
    "/a": page("a", o.forbidden ? "<p>This page does not say this.</p>" : "").replace("Page a", o.dupTitle ? "Page b" : "Page a").replace(/<link rel="canonical"[^>]*>/, o.noCanonical ? "" : '<link rel="canonical" href="https://ex.com/a">').replace("data-last-checked=\"2026-11-01\">Last checked 2026-11-01", o.lateDate ? 'data-last-checked="2026-11-06">Last checked 2026-11-06' : 'data-last-checked="2026-11-01">Last checked 2026-11-01') + (o.faqWrong ? '<script type="application/ld+json">{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Another question?","acceptedAnswer":{"@type":"Answer","text":"x"}}]}</script>' : ""),
    "/b": page("b").replace(/<\/head>/, o.noindexListed ? '<meta name="robots" content="noindex,follow"></head>' : "</head>"), "/c": o.notListed ? page("c") : null };
  if (o.notListed) pages["/a"] = pages["/a"].replace("</main>", '<a href="/c">c</a></main>');
  const robots = `User-agent: *\n${o.robotsBlock ? "Disallow: /a\n" : "Allow: /\n"}${o.noSitemap ? "" : "Sitemap: https://ex.com/sitemap.xml\n"}`;
  const sitemap = `<urlset><url><loc>https://ex.com/</loc></url><url><loc>https://ex.com/a</loc></url>${o.noindexListed ? "<url><loc>https://ex.com/b</loc></url>" : "<url><loc>https://ex.com/b</loc></url>"}</urlset>`;
  return async (u) => { const p = new URL(u).pathname.replace(/\/+$/, "") || "/"; if (p === "/robots.txt") return new Response(robots, { status: 200, headers: { "content-type": "text/plain" } }); if (p === "/sitemap.xml") return new Response(o.sitemap404 ? "no" : sitemap, { status: o.sitemap404 ? 404 : 200, headers: { "content-type": "application/xml" } }); if (o.status500 && p === "/b") return new Response("err", { status: 500, headers: { "content-type": "text/html" } }); const h = pages[p]; return h ? new Response(h, { status: 200, headers: { "content-type": "text/html" } }) : new Response("nf", { status: 404, headers: { "content-type": "text/html" } }); };
}
test("8 · THE SCAN, EACH CHECK SEEN RED THEN GREEN (sabotage): status, links, noindex in sitemap, forbidden words, FAQ data, canonical, titles, robots, sitemap, Last checked; 'in no sitemap' listed", async () => {
  const run = (o) => scanSite({ origin: "https://ex.com", pages: ["https://ex.com/a", "https://ex.com/b"], fetchImpl: siteFor(o), concurrency: 2 });
  const green = await run({}); assert.equal(green.ok, true, JSON.stringify(green.rows.filter((r) => !r.ok))); assert.equal(green.rows.length, SCAN_CHECKS.length);
  for (const [key, o] of [["status", { status500: true }], ["links", { brokenLink: true }], ["noindexInSitemap", { noindexListed: true }], ["forbidden", { forbidden: true }], ["faq", { faqWrong: true }], ["canonical", { noCanonical: true }], ["titles", { dupTitle: true }], ["robots", { robotsBlock: true }], ["sitemap", { sitemap404: true }], ["lastChecked", { lateDate: true }]]) {
    const red = await run(o); assert.equal(red.rows.find((r) => r.key === key).ok, false, `${key} must turn RED`);
    const back = await run({}); assert.equal(back.rows.find((r) => r.key === key).ok, true, `${key} GREEN again`);
  }
  const listed = await run({ notListed: true }); assert.ok(listed.listed.some((x) => x.url === "https://ex.com/c" && /no sitemap|does not list/.test(x.why)));
  assert.deepEqual((await run({ homeNoindex: true })).serious, ["the home page is marked noindex"]);
  assert.equal(robotsAllows(readRobots("User-agent: *\nDisallow: /x\nAllow: /x/y").rules, "/x/y/z"), true); assert.equal(robotsAllows(readRobots("User-agent: *\nDisallow: /x").rules, "/x/a"), false);
  assert.deepEqual(datesOf(page("a").replace("checked 2026-11-01</span>", "checked 2026-10-31</span>")), { last: "2026-11-01", oldest: "2026-10-31" });
});

test("9 · \"LAST CHECKED\" IS THE OLDEST FACT DATE (Q&A LAW 5A.6), set as the page goes out — for drafts made before too", () => {
  const h = page("a").replace("checked 2026-11-01</span>", "checked 2026-10-31</span>").replace(/2026-11-01">Last checked 2026-11-01/, '2026-11-06">Last checked 2026-11-06');
  assert.match(oldestLastChecked(h), /data-last-checked="2026-10-31">Last checked 2026-10-31/); assert.equal(oldestLastChecked(page("a")), page("a"));
  /* the site's own guides: a plain "Last checked: date"; an exchange rate's date is not a check */
  const guide = '<main><p>Last checked: <b>2026-10-16</b></p><p>Fee. <a class="src" href="https://x">s</a> checked 2026-10-14</p><p>1 AUD = 0.7 USD, 2026-10-12</p></main>';
  assert.match(oldestLastChecked(guide), /Last checked: <b>2026-10-14<\/b>/);
  assert.match(readFileSync(join(REPO, "desktop", "publish.mjs"), "utf8"), /const next = oldestLastChecked\(hideUnfit\(withSection\(/, "an improved page goes out with the right date (RR-387: after the unfit answers left)");
});

test("11 · THE SERVER'S OWN APP HANDS ITS STORE ON (found by the real proof: createApp dropped it, so /v1/autopilot said \"not connected\"): an owner licence reaches the product", async () => {
  const { createApp } = await import("../site/app.mjs"), { makeOwnerLicence } = await import("../services/licence/service.mjs"), { licenceHeaderOf } = await import("../desktop/keyword-service.mjs"), { generateKeyPairSync } = await import("node:crypto");
  const kp = generateKeyPairSync("ed25519"), store = apMemoryStore(), handle = createApp({ mode: "public-lite", env: { LICENCE_PUBLIC_KEY: kp.publicKey.export({ type: "spki", format: "pem" }), CRON_SECRET: "c".repeat(32) }, apStore: store, kvFetch: async () => { throw new Error("no kv"); } });
  const srv = createServer((q, s) => handle(q, s)); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  try {
    const signed = makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), url = `http://127.0.0.1:${srv.address().port}/v1/autopilot/almioet`;
    const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-almivisibility-licence": licenceHeaderOf(signed) }, body: JSON.stringify({ mode: "autopilot" }) }), j = await r.json();
    assert.equal(r.status, 200, JSON.stringify(j)); assert.equal(j.mode, "autopilot"); assert.equal((await fetch(url)).status, 401, "no licence → refused");
  } finally { srv.close(); }
});

test("12 · SEARCH CONSOLE, ONE CLEAR STATE (owner's 1.15.41: \"Signed in ✓\" and \"Not signed in\" together, no Connect): a refresh Google refuses = NOT signed in, with Google's own words; signed in = the owner's properties", async () => {
  const { googleConnect } = await import("../desktop/google-connect.mjs");
  const keys = (refresh) => ({ get: (n) => (n === "GOOGLE_CLIENT_SECRET" ? "client-secret-x" : n === "GOOGLE_REFRESH_TOKEN" ? refresh : null), set: () => ({ ok: true }) });
  const fx = (tokenOk) => async (u) => (/oauth2/.test(u) ? (tokenOk ? new Response(JSON.stringify({ access_token: "a", expires_in: 3600 }), { status: 200 }) : new Response(JSON.stringify({ error: "invalid_grant", error_description: "Token has been expired or revoked." }), { status: 400 })) : new Response(JSON.stringify({ siteEntry: [{ siteUrl: "sc-domain:almiworld.com", permissionLevel: "siteOwner" }, { siteUrl: "https://x.example/", permissionLevel: "siteUnverifiedUser" }] }), { status: 200 }));
  const bad = googleConnect({ keys: keys("old-refresh"), config: { googleClientId: "id" }, fetchImpl: fx(false) });
  assert.equal(bad.status().signedIn, true, "before Google is asked, a saved sign-in is assumed"); assert.equal(await bad.sites(), null);
  assert.equal(bad.status().signedIn, false, "after Google refuses it: NOT signed in — one state"); assert.match(bad.lastError(), /Google said: Token has been expired or revoked\. \(400\)/);
  const good = googleConnect({ keys: keys("good-refresh"), config: { googleClientId: "id" }, fetchImpl: fx(true) }); assert.deepEqual(await good.sites(), ["sc-domain:almiworld.com"], "the owner's own properties"); assert.equal(good.status().signedIn, true);
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8"); assert.match(ui, /<p class="err" id="gscwhy">\$\{esc\(r\.refused\)\}<\/p><p><button class="big" id="connect">Connect Google Search Console<\/button><\/p>/, "the reason AND Connect, shown together");
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"); assert.match(main, /refused: GOOGLE\.lastError\(\) \? `\$\{GOOGLE\.lastError\(\)\} Press Connect to sign in again\.`/);
});

test("13 · THE OWNER'S SMALL FINDINGS (notes items 2–6): one address per page and \"1 problem\"; Google's own PageSpeed reason, tried once more; the plan says its step; ONE count; the false sitemap warning", () => {
  const jobs = readFileSync(join(REPO, "desktop", "seo-jobs.mjs"), "utf8"), main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8");
  assert.match(jobs, /const norm = \(u\) => \{ try \{ const x = new URL\(String\(u\)\.trim\(\)\); x\.hash = ""; return `\$\{x\.origin\}\$\{x\.pathname\.replace\(\/\\\/\+\$\/, ""\)/); assert.match(jobs, /problem\$\{n === 1 \? "" : "s"\}/); assert.match(jobs, /answered \$\{r\.status\}: \$\{String\(e\.error\.message\)/); assert.match(jobs, /tried once more/);
  const norm = (u) => { const x = new URL(String(u).trim()); x.hash = ""; return `${x.origin}${x.pathname.replace(/\/+$/, "") || ""}${x.search}`; }; assert.equal(norm("https://almioet.almiworld.com/"), norm("https://almioet.almiworld.com"));
  assert.match(main, /Making your action plan: step 2 of 3, writing your/); assert.match(main, /waiting for the plan another run started/);
  assert.match(main, /In your live sitemap \(what Google is told\)/);
  /* the third real proof: a draft never written to the site is not a "404" (it would have rolled back a good go-live) */
  assert.match(main, /const pages = drafts\.filter\(\(d\) => written\.has\(d\.url\)\)/); assert.match(main, /for \(const b of \(plan\.blocked \?\? \[\]\)\.slice\(0, 100\)\)/);
  assert.equal(STEPS[0].key, "newPages", "new pages are approved before the pages are made, in the same cycle"); assert.match(main, /if \(!r \|\| d\.improve\) continue; \/\* an existing page the app only improved keeps its own robots line/);
});

test("10 · THE APP WIRES IT: ready pages never rewritten noindex; publish-ready first inside the mirror; the switch, the run, the scan; the runner's app never opens a secure store", () => {
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.match(main, /readyUrls = new Set\(\(pages\?\.drafts \?\? \[\]\)\.filter\(\(d\) => d\.readyAsDraft\)\.map\(\(d\) => d\.url\)\)/);
  assert.match(main, /const done = await publishAll\(id\)\.catch/); assert.ok(main.includes("(autopilot|autopilot\\/run|autopilot\\/secret|autopilot\\/server|scan|issues)$/"), "the routes (RR-387: + issues)");
  assert.match(main, /backend: CONFIG\.secretsFromEnvOnly === true \? null :/); assert.match(readFileSync(join(REPO, "desktop", "autopilot-runner.mjs"), "utf8"), /secretsFromEnvOnly: true/);
  assert.ok(ui.includes('id="apwrap"><summary><b>Autopilot</b>'),"on the Pages tab (four tabs stay four)"); assert.match(ui, /Check my site now/); assert.match(ui, /RR-386 item 1/); assert.match(ui, /RR-386 item 4: one count/);
  const wf = readFileSync(join(REPO, ".github", "workflows", "autopilot.yml"), "utf8"); assert.match(wf, /secrets\.AUTOPILOT_RUNNER_KEY/); assert.match(wf, /node desktop\/autopilot-runner\.mjs/); assert.doesNotMatch(wf, /pull_request/);
});
