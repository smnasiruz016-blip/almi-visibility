/**
 * 🔴 RR-353 (owner + beta-g, 31 Oct 2026 night — fixes from AlmiOET's first real run, release 1.15.7):
 *   1 updates: asked on start and every 4 hours; "Update to X — Install"; "Check for updates" always says what happened (and why not)
 *   2 navigation: a breadcrumb + Back on every screen; product cards with Open and Settings
 *   3 "What I will do for you": tick the jobs, one "Start the ticked jobs", each job its own state
 *   4 "What to fix first": "Fix it for me" and "Give me the content, I'll do it myself" — plain words
 *   5 "Create SEO pages" is the big button on top; what is missing comes with a one-click way to add it
 *   6 the same website twice: said, with "Open it"
 *   7 OUR OWN data first: Create SEO pages needs no Search Console
 *   8 Bing Webmaster Tools next to Google in Setup step 4
 *   9 social media pages in Setup; posts with Copy and "Open <network>"; posting by itself said plainly as not in this version
 *  10 IndexNow on publish; a "Search engines" panel; the one-time Bing step
 *  11 two help guides (promotion code; "Windows protected your PC") in the app's Help and on the site
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkForUpdate, signedBytes } from "../desktop/updater.mjs";
import { bingRows, bingPhrases, bingQueries, bingKeyName, BING_HOWTO } from "../desktop/bing-webmaster.mjs";
import { socialFrom, socialShare, SOCIAL_NETWORKS, AUTO_POST_LINE } from "../desktop/social-links.mjs";
import { CHOICES, checkStep, HOWTO } from "../desktop/setup.mjs";
import { demandOf, seoPages } from "../desktop/seo-pages.mjs";
import { FEATURES } from "../desktop/features.mjs";
import { GUIDES, HELP_GUIDES, guideList, guidePage } from "../desktop/guides.mjs";
import * as SITE from "../site/pages.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
const MAIN = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8");

test("RR-353 · 1 · the update check says what happened: the channel's status, no answer, the version found; only a NEWER signed one can be installed", async () => {
  const kp = generateKeyPairSync("ed25519"), pub = kp.publicKey.export({ type: "spki", format: "pem" });
  const signed = (version) => { const m = { version, package: "p.zip", sha256: "ab".repeat(32) }; return { ...m, signature: sign(null, signedBytes(m), kp.privateKey).toString("base64") }; };
  const answer = (status, body) => async () => ({ ok: status === 200, status, json: async () => body });
  const r404 = await checkForUpdate({ channelUrl: "https://x.example/updates/", current: "1.15.6", publicKeyPem: pub, fetchImpl: answer(404, {}) });
  assert.deepEqual([r404.state, r404.line], ["UNREACHABLE", "Could not check for updates — the update channel answered 404. Visibility keeps working on 1.15.6; try again later."]);
  const off = await checkForUpdate({ channelUrl: "https://x.example/updates/", current: "1.15.6", publicKeyPem: pub, fetchImpl: async () => { throw new TypeError("fetch failed"); } });
  assert.match(off.line, /^Could not check for updates — no internet connection, or the channel could not be reached\./);
  const up = await checkForUpdate({ channelUrl: "https://x.example/updates/", current: "1.15.7", publicKeyPem: pub, fetchImpl: answer(200, signed("1.15.7")) });
  assert.deepEqual([up.state, up.version, "manifest" in up], ["UP_TO_DATE", "1.15.7", false], "an up-to-date answer never leaves a package to install");
  const nw = await checkForUpdate({ channelUrl: "https://x.example/updates/", current: "1.15.6", publicKeyPem: pub, fetchImpl: answer(200, signed("1.15.7")) });
  assert.deepEqual([nw.state, nw.version, nw.manifest.version], ["AVAILABLE", "1.15.7", "1.15.7"]);
  const bad = await checkForUpdate({ channelUrl: "https://x.example/updates/", current: "1.15.6", publicKeyPem: pub, fetchImpl: answer(200, { ...signed("1.15.7"), version: "9.9.9" }) });
  assert.equal(bad.state, "REFUSED");
  /* the app: only an AVAILABLE answer keeps a package to install; the screen asks on start and every 4 hours, and always says what happened */
  assert.ok(MAIN.includes('updateFound = r.state === "AVAILABLE" ? r.manifest : null;'));
  for (const s of ['<button class="ghost small" id="updchk" type="button">Check for updates</button>', '<div id="updbar" class="updbar"></div>', 'note(msg, "Checking for updates…");', '<button id="updgo" type="button">Update to ${esc(r.version)} — Install</button>',
    "const UPDATE_EVERY = 4 * 3600e3;", "setTimeout(() => { checkUpdates(false).catch(() => {}); updateLoop(); }, 1500);", '$("#updchk").onclick = () => checkUpdates(true);'])
    assert.ok(UI.includes(s), s);
  assert.ok(!UI.includes('id="upd">Check for updates'), "the old button deep in the product's tabs (with its answer at the bottom of the card) is gone");
});

test("RR-353 · 2–6 · the screens: breadcrumb on every screen, Open/Settings on each product, ticked jobs, two plain choices per problem, the big Create SEO pages, the same website twice", () => {
  /* 2 */
  assert.ok(UI.includes("bar.innerHTML += crumbsHtml(name, args);"));
  assert.ok(UI.includes('const parts = [`<button type="button" id="crumbhome">All products</button>`];'));
  assert.ok(UI.includes('<button type="button" data-open="${esc(p.id)}">Open</button><button class="ghost" type="button" data-settings="${esc(p.id)}">Settings</button>'));
  assert.ok(UI.includes('<span class="open">Open →</span>'), "the card looks clickable");
  /* 3 */
  assert.ok(UI.includes('<input type="checkbox" class="willtick nodirty" value="${esc(l.action)}">'));
  assert.ok(UI.includes('<button id="willgo">Start the ticked jobs</button>'));
  assert.ok(UI.includes('{ what: job, ...(job === "weekly" ? { on: true } : {}) }'), "a ticked weekly check is turned ON, never toggled off");
  assert.ok(MAIN.includes('const on = typeof json().on === "boolean" ? json().on : w.on === false;'));
  /* 4 */
  assert.ok(UI.includes(`<button class="ghost" type="button" data-self>Give me the content, I'll do it myself</button>`));
  assert.ok(UI.includes('<div class="selfbox" hidden><b>Ready to use</b>'));
  assert.ok(UI.includes('const NOFIX = "Visibility cannot change a page that is already on your site — only your site\'s own editor can.'));
  /* 5 */
  assert.ok(UI.includes('<button class="big" id="bigmk" type="button">Create SEO pages</button>'));
  assert.ok(UI.indexOf("${bigSeo}<div id=\"scorebox\">") > 0, "the big button is on top of the product page");
  assert.ok(UI.includes('<button data-act="${esc(a.action)}">Add it now</button>'));
  /* 6 */
  assert.ok(UI.includes('<button id="dupopen">Open ${esc(r.duplicate.name)}</button>'));
});

test("RR-353 · 7 · our own data first: Create SEO pages needs only the website; the keyword database and Bing feed the plan, each with its source", () => {
  assert.deepEqual(FEATURES.find((f) => f.id === "seo-pages").needs({ hasSite: true, searchConsole: false, files: false, youtubeConfirmed: false }), []);
  assert.deepEqual(FEATURES.find((f) => f.id === "seo-pages").needs({ hasSite: false }).map((n) => n.action), ["settings"]);
  const own = [{ text: "oet listening practice", source: "AlmiWorld keyword service — Google Ads Keyword Planner", weight: 8 }, { text: "oet", source: "x", weight: 9 }];
  const d = demandOf({ own });
  assert.deepEqual(d.map((x) => [x.text, x.source]), [["oet listening practice", "AlmiWorld keyword service — Google Ads Keyword Planner"]], "a one-word search is never a page");
  const sc = { window: "28 days", queries: [{ query: "oet listening practice", impressions: 3 }] };
  assert.match(demandOf({ own, searchConsole: sc })[0].source, /^your Search Console/, "the same search seen in Search Console keeps its strongest source");
  const none = seoPages({ site: { ok: true }, on: "2026-10-31T00:00:00Z" });
  assert.deepEqual([none.noDemand, none.drafts.length], [true, 0]);
  assert.match(none.notEnough[0], /AlmiWorld's own search data had none for it\. Add one more source below/);
  for (const s of ["const ownItemsOf = (id) => [", "async function gatherOwnDemand(id) {", "const own = madePlanOf(id).pagePlan ? { lines: [] } : await gatherOwnDemand(id);", 'if (f === "seo-pages") { const x = await createPages(id);'])
    assert.ok(MAIN.includes(s), s);
  assert.equal((MAIN.match(/seoPages\(\{[^\n]*planned: plannedOf\(id\), own: ownItemsOf\(id\)/g) ?? []).length, 4, "every call that makes or re-judges the drafts reads the SAME searches (publishing finds the same draft)");
});

test("RR-353 · 8 · Bing Webmaster Tools: in Setup step 4; Bing's rows read once per search, each with its own source; a refused key is said", async () => {
  assert.deepEqual(CHOICES.searchData.map((c) => c.value), [2, 4, 1, 3], "Bing sits next to Google");
  assert.equal(checkStep("searchData", { option: 4 }), null);
  assert.match(HOWTO.bing, /API access → API Key/);
  const body = { d: [{ Query: "oet nursing", Impressions: 5, Clicks: 1, Date: "/Date(1761868800000)/" }, { Query: "OET  nursing", Impressions: 7, Clicks: 0, Date: "/Date(1761264000000)/" }, { Query: "oet fee", Impressions: 0, Clicks: 0 }] };
  const rows = bingRows(body);
  assert.deepEqual(rows.map((r) => [r.query, r.impressions, r.clicks, r.from, r.to]), [["oet nursing", 12, 1, "2025-10-24", "2025-10-31"], ["oet fee", 0, 0, null, null]]);
  assert.deepEqual(bingPhrases(rows, "2026-10-31"), [{ text: "oet nursing", kind: "bing", place: null, date: "2026-10-31", volume: 12, source: "your Bing Webmaster Tools: seen 12 times in Bing (2025-10-24 – 2025-10-31)" }], "a search Bing never showed is not a demand");
  let asked = null;
  const r = await bingQueries({ site: "https://almioet.example/x", key: " k1 ", fetchImpl: async (u) => { asked = u; return { ok: true, status: 200, json: async () => body }; } });
  assert.equal(asked, "https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=https%3A%2F%2Falmioet.example%2F&apikey=k1");
  assert.deepEqual([r.ok, r.line], [true, "2 searches read from your Bing Webmaster Tools."]);
  assert.match((await bingQueries({ site: "https://a.example", key: "k", fetchImpl: async () => ({ ok: false, status: 401, json: async () => ({}) }) })).why, /^Bing refused the key/);
  assert.match((await bingQueries({ site: "https://a.example", key: "" })).why, /^Paste your Bing Webmaster API key first/);
  assert.equal(bingKeyName("almioet-2"), "BING_WEBMASTER_KEY_ALMIOET_2");
  assert.ok(BING_HOWTO.some((l) => /Import from Google Search Console/.test(l)));
});

test("RR-353 · 9 · social media pages: each on its own network; the posts are the article's CHECKED posts with Copy and Open; posting by itself is said as not in this version", () => {
  assert.deepEqual(SOCIAL_NETWORKS.map((n) => n.id), ["facebook", "linkedin", "instagram", "tiktok", "x", "youtube"]);
  assert.deepEqual(socialFrom({ facebook: "facebook.com/almioet", x: "https://twitter.com/almioet", tiktok: "" }), { links: { facebook: "https://facebook.com/almioet", x: "https://twitter.com/almioet" } });
  assert.match(socialFrom({ instagram: "https://evil.example/instagram.com" }).refused, /^Instagram: give your page's full address on instagram\.com/);
  assert.match(checkStep("product", { name: "P", site: "https://x.example", what: "W", social: { linkedin: "https://facebook.com/x" } }), /^LinkedIn:/);
  const post = { posts: [{ network: "Facebook", text: "How long is the OET?\n\nIt takes about 3 hours. (Source: oet.com, checked 2026-10-31)\n\nRead the full answer: https://x.example/how-long" }, { network: "LinkedIn", text: "A question we hear often: How long is the OET?\n\nIt takes about 3 hours.\n\nThe full answer, with every source: https://x.example/how-long" }] };
  const draft = socialShare({ post, links: { facebook: "https://facebook.com/almioet" } });
  assert.deepEqual(draft.map((p) => [p.network, p.open]), [["facebook", "https://facebook.com/almioet"], ["linkedin", "https://www.linkedin.com/feed/"], ["instagram", "https://www.instagram.com/"], ["tiktok", "https://www.tiktok.com/upload"], ["x", "https://x.com/compose/post"], ["youtube", "https://studio.youtube.com/"]], "a draft is not live: no share page points at it");
  const live = socialShare({ post, links: {}, url: "https://x.example/how-long/" });
  assert.equal(live[0].open, "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fx.example%2Fhow-long%2F");
  assert.ok(live.every((p) => post.posts.some((c) => c.text === p.text) || p.network === "x"), "never a new claim — the checked text");
  assert.ok(live.find((p) => p.network === "x").text.length <= 280);
  assert.match(AUTO_POST_LINE, /^Posting by itself is not in this version/);
  assert.ok(UI.includes("social: socialValue() })"), "Setup → Your product asks for them");
});

test("RR-353 · 10 + 11 · IndexNow on publish; the Search engines panel; two help guides in the app and on the site", () => {
  assert.ok(MAIN.includes('if (out.live && inx?.verified === true) {') && MAIN.includes('note: "IndexNow, on publish"'));
  for (const s of ['r[2] === "search-engines" && req.method === "GET"', 'r[2] === "bing" && req.method === "POST"', 'r[2] === "social-links" && req.method === "POST"']) assert.ok(MAIN.includes(s), s);
  assert.ok(UI.includes("async function enginesScreen() {\n  if (!(await here(\"enginesScreen\"))) return;"));
  assert.ok(UI.includes("Object.assign(SCREENS, { enginesScreen, bingScreen, socialLinksScreen, helpScreen });"));
  assert.deepEqual(Object.keys(HELP_GUIDES), ["promotion-code", "windows-protected"]);
  assert.deepEqual(guideList().map((g) => g.id), [...Object.keys(GUIDES), "promotion-code", "windows-protected"]);
  const w = guidePage("windows-protected"), p = guidePage("promotion-code");
  assert.ok(/More info/.test(w) && /Run anyway/.test(w) && !/Never send a key/.test(w) && /<title>Help — /.test(w));
  assert.ok(/Add promotion code/.test(p) && /Apply/.test(p));
  assert.match(guidePage("youtube-key"), /Never send a key in chat or email/, "the key guides keep their warning");
  assert.deepEqual(Object.keys(SITE.HELP), ["/help/promotion-code", "/help/windows-protected-your-pc"]);
  const sw = SITE.helpPage("/help/windows-protected-your-pc"), sp = SITE.helpPage("/help/promotion-code");
  assert.ok(/More info/.test(sw) && /Run anyway/.test(sw) && /href="\/help\/promotion-code"/.test(sw));
  assert.ok(/Add promotion code/.test(sp));
  assert.match(SITE.pricing({ sales: true }), /href=.\/help\/promotion-code./);
  for (const f of ["bing-webmaster.mjs", "social-links.mjs"]) assert.ok(readFileSync(join(REPO, "desktop", "build.mjs"), "utf8").includes(`"${f}"`), f);
});

test("RR-353 · THE APP: Create SEO pages without Search Console; the same website twice; the update check's reason; Bing, social pages, Search engines and Help answer", async () => {
  const { productStore } = await import("../desktop/products.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr353-app-"));
  const st = productStore(dir); st.setCompany({ name: "Fixture Co", site: "https://fixture.invalid", logoFile: null });
  st.create({ name: "Fixture", site: "https://fixture.invalid" }); const id = st.list()[0].id;
  const kp = generateKeyPairSync("ed25519");
  writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, keysDir: dir, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/" }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  try {
    for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const root = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`, base = `${root}/api/products/${id}`;
    const call = async (u, o, method = "POST") => { const r = await fetch(u.startsWith("/api/") || u.startsWith("/guide") ? root + u : base + u, method === "GET" ? {} : { method, headers: { "content-type": "application/json" }, body: JSON.stringify(o) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; } return { status: r.status, j }; };
    /* the offer button set (RR-351) — then Create SEO pages asks for NO Search Console: AlmiWorld's own data is asked first, said */
    assert.equal((await call("/setup", { id: "product", value: { name: "Fixture", site: "https://fixture.invalid", saveAnyway: true, what: "Online practice for the OET.", ctaLabel: "Try free for 48 hours", ctaHref: "https://fixture.invalid/signup", social: { facebook: "facebook.com/fixture" } } })).status, 200);
    assert.deepEqual((await call("/state", null, "GET")).j.setup.social, { facebook: "https://facebook.com/fixture" });
    const made = await call("/feature/seo-pages", {});
    assert.equal(made.status, 200, JSON.stringify(made.j)); assert.equal(made.j.needs, undefined, "Create SEO pages asked for Search Console");
    assert.ok(made.j.pages.sources.some((l) => /AlmiWorld keyword service/.test(l)), JSON.stringify(made.j.pages.sources));
    /* the same website again → said, with the product to open; "add anyway" adds it */
    const dup = await call("/api/products", { name: "Fixture again", site: "www.fixture.invalid/pricing", goal: { grow: "website", hasWebsite: true }, saveAnyway: true });
    assert.deepEqual([dup.status, dup.j.duplicate], [409, { id, name: "Fixture" }]);
    assert.match(dup.j.refused, /^You already have a product with this website: Fixture \(fixture\.invalid\)/);
    assert.equal((await call("/api/products", { name: "Fixture again", site: "https://fixture.invalid", goal: { grow: "website", hasWebsite: true }, saveAnyway: true, addAnyway: true })).status, 200);
    /* the update check: the reason, the version it runs */
    const u = await call("/api/update", null, "GET");
    assert.equal(u.j.state, "UNREACHABLE"); assert.match(u.j.line, /^Could not check for updates — /); assert.match(String(u.j.current), /^\d+\.\d+\.\d+/);
    assert.match((await call("/api/update/install", { agree: true })).j.refused, /^Check for updates first/);
    /* Bing, social pages, Search engines, the weekly job, Help */
    assert.match((await call("/bing", {})).j.refused, /^Paste your Bing Webmaster API key first/);
    assert.equal((await call("/social-links", { links: { x: "https://facebook.com/x" } })).status, 400);
    assert.deepEqual((await call("/social-links", { links: { linkedin: "linkedin.com/company/fixture" } })).j.links, { linkedin: "https://linkedin.com/company/fixture" });
    const eng = await call("/search-engines", null, "GET");
    assert.deepEqual([eng.status, eng.j.google.connected, eng.j.indexNow.verified, eng.j.sitemap], [200, false, false, "https://fixture.invalid/sitemap.xml"]);
    for (let i = 0; i < 2; i++) assert.match((await call("/do", { what: "weekly", on: true })).j.line, /^Weekly check: on/);
    assert.deepEqual((await call("/api/guides", null, "GET")).j.guides.map((g) => g.id), guideList().map((g) => g.id));
    const g = await call("/guide/windows-protected", null, "GET"); assert.equal(g.status, 200); assert.match(g.j, /Run anyway/);
  } finally { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
});
