/* RR-307 · MAKE THE APP USER-FRIENDLY AND ACT AT ONCE (owner decision, 21 Oct 2026). LOCAL only: the client's website, Google and YouTube are
 * stand-ins on 127.0.0.1 (config testAllowLocalSites / googleTestEndpoints / youtubeApiBase — tests only); keys are kept in a memory store,
 * never this computer's Credential Manager; no request leaves the machine; nothing is published. */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readSite, addressOpens } from "../desktop/site-read.mjs";
import { scoreCard, fixForMe, foundInfo } from "../desktop/product-check.mjs";
import { importExport, googleConnect, unzip, SCOPE } from "../desktop/google-connect.mjs";
import { seoPages } from "../desktop/seo-pages.mjs";
import { FEATURES, menuFor } from "../desktop/features.mjs";
import { TARGETS } from "../desktop/publish.mjs";
import { webAddress, STEPS, CHOICES, stepsFor } from "../desktop/setup.mjs";
import { keyStore, memoryBackend } from "../desktop/secrets.mjs";
import { evidenceByUrl, runMode } from "../src/report/visibility-score.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ON = "2026-10-21T10:00:00.000Z";

/* ── the client's website, on this computer ── */
function fixtureSite() {
  const hits = [];
  let base = "";
  const page = (title, body, head = "") => `<!doctype html><html lang="en"><head><title>${title}</title><meta name="description" content="Online practice for the Fixture exam, with honest feedback on every answer you give."><link rel="canonical" href="${base}${"/"}">${head}</head><body><nav><a href="/">Home</a> <a href="/pricing">Pricing</a> <a href="/faq">FAQ</a></nav>${body}<footer>Fixture Prep · contact</footer></body></html>`;
  const srv = createServer((q, r) => {
    hits.push(q.url);
    const html = (s) => { r.writeHead(200, { "content-type": "text/html" }); r.end(s); };
    if (q.url === "/robots.txt") { r.writeHead(200, { "content-type": "text/plain" }); return r.end(`User-agent: *\nDisallow: /private\n\nUser-agent: PerplexityBot\nDisallow: /\n\nSitemap: ${base}/sitemap.xml\n`); }
    if (q.url === "/sitemap.xml") { r.writeHead(200, { "content-type": "application/xml" }); return r.end(`<urlset>${["/", "/pricing", "/faq", "/private/secret"].map((p) => `<url><loc>${base}${p}</loc></url>`).join("")}</urlset>`); }
    if (q.url === "/") return html(page("Fixture Exam Prep | FixturePrep", `<h1>Practise the Fixture exam</h1><p>Original practice on the real 0–500 scale for nurses.</p><img src="/logo.png" alt="FixturePrep logo"><img src="/x.png"><a href="/missing">old page</a>`, `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization","name":"FixturePrep"}</script>`));
    if (q.url === "/pricing") return html(page("Pricing | FixturePrep", `<h1>Pricing</h1><p>FixturePrep costs $12/month after a 7-day free trial for nurses.</p>`));
    if (q.url === "/faq") return html(page("Questions | FixturePrep", `<h1>Questions</h1><h2>Can I take the Fixture exam online?</h2><p>Yes, the Fixture exam can be taken online from home since 2026.</p><details><summary>How long is the Fixture exam?</summary>The Fixture exam takes 3 hours in total for nurses.</details>`, `<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"Is the Fixture exam hard?","acceptedAnswer":{"@type":"Answer","text":"The Fixture exam is passed by 60 percent of nurses."}}]}</script>`));
    r.writeHead(404, { "content-type": "text/html" }); r.end("not found");
  });
  return { hits, listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}

test("B1 · THE SITE, READ IN FULL: pages from the sitemap and links; robots obeyed (the private page is never asked for); prices, facts, questions with answers, structured data, design; broken links found; no page HTML kept", async () => {
  const s = fixtureSite(); const base = await s.listen();
  try {
    const r = await readSite({ url: base, allowLocal: true, paceMs: 0, on: ON });
    assert.equal(r.ok, true);
    assert.deepEqual(r.pages.map((p) => new URL(p.url).pathname).sort(), ["/", "/faq", "/pricing"]);
    assert.ok(!s.hits.includes("/private/secret"), "a page robots.txt forbids was read");
    assert.deepEqual(r.robots.aiBots, { "OAI-SearchBot": true, "Claude-SearchBot": true, PerplexityBot: false });
    const pricing = r.pages.find((p) => p.url.endsWith("/pricing")), faq = r.pages.find((p) => p.url.endsWith("/faq"));
    assert.deepEqual(pricing.prices, ["$12/month"]);
    assert.deepEqual(faq.qa.map((x) => x.q).sort(), ["Can I take the Fixture exam online?", "How long is the Fixture exam?", "Is the Fixture exam hard?"]);
    assert.ok(faq.qa.every((x) => x.a && x.from));
    assert.deepEqual(r.pages[0].structuredTypes, ["Organization"]);
    assert.deepEqual(r.design.menu, ["Home", "Pricing", "FAQ"]);
    assert.match(r.design.logo, /\/logo\.png$/);
    assert.deepEqual(r.brokenLinks.map((b) => new URL(b.to).pathname), ["/missing"]);
    assert.equal(r.sitemap.found, true);
    assert.ok(!JSON.stringify(r.pages).includes("<html"), "a page's HTML was kept in what is saved");
  } finally { s.close(); }
});

test("A2 + A3 · THE SCORE CARD: the number is the engine's own score (never a second scorer); not measured is never zero; AI-answer readiness and YouTube are ticks; a YouTube-only product's gauge says Not measured; fixes in plain words; Fix it for me writes only from the page's own words", async () => {
  const s = fixtureSite(); const base = await s.listen();
  try {
    const site = await readSite({ url: base, allowLocal: true, paceMs: 0, on: ON });
    const card = scoreCard({ site, on: ON });
    const engine = runMode({ mode: "full", evidenceByUrl: evidenceByUrl({ pageReads: site.pageReads, securityReads: site.securityReads, linkObs: site.linkObs }) });
    assert.equal(card.score, engine.score);
    assert.match(card.gauge, /^\d+\/100$/);
    assert.ok(["Good", "Needs work", "Poor"].includes(card.word));
    const area = (n) => card.areas.find((a) => a.area === n);
    assert.equal(area("Security").state, "NOT_MEASURED", "http only here: no https read — said, never zero");
    assert.equal(area("Links").state, "WARN");
    assert.equal(area("YouTube").state, "NOT_MEASURED");
    assert.ok(area("AI-answer readiness").ticks.some((t) => t.tick === false && /PerplexityBot/.test(t.line)));
    assert.ok(card.fixFirst.some((f) => f.id === "links-resolve" && /lead to pages that do not open/.test(f.line)));
    assert.ok(card.fixFirst.some((f) => f.id === "ai:robots" && f.fixForMe));
    const robots = fixForMe("ai:robots", site);
    assert.match(robots[0].paste, /User-agent: PerplexityBot\nAllow: \//);
    const ld = fixForMe("structured-data", site).find((x) => /FAQPage/.test(x.paste));
    assert.match(ld.paste, /Can I take the Fixture exam online\?/);
    const yOnly = scoreCard({ site: null, youtube: { confirmed: true, videos: [{}], check: [{ findings: [] }] }, on: ON });
    assert.deepEqual([yOnly.score, yOnly.gauge, yOnly.word], [null, "Not measured", "Not measured"]);
    assert.ok(yOnly.areas.filter((a) => a.area !== "YouTube").every((a) => a.state === "NOT_MEASURED"));
    const f = foundInfo({ site, on: ON });
    /* RR-308 C3: questions already answered on the site are not "questions people ask" */
    assert.match(f.line, /^We found 3 pages, 3 questions answered on your pages, 0 questions people ask \(from search data and research\) and 0 search phrases\.$/);
    assert.ok(f.questions.every((q) => q.source && q.on === "2026-10-21"));
    assert.ok(f.missing.some((m) => m.what === "Google Search Console" && m.adds));
  } finally { s.close(); }
});

test("E3 · THE ADDRESS: a \"www.\" is never added by Visibility; an address that does not open is refused with the address without \"www.\" offered", async () => {
  assert.equal(webAddress("almioet.almiworld.com"), "https://almioet.almiworld.com");
  assert.equal(webAddress("https://almioet.almiworld.com"), "https://almioet.almiworld.com");
  const r = await addressOpens("https://www.no-such-site-rr307.invalid");
  assert.equal(r.ok, false);
  assert.equal(r.suggestion, "https://no-such-site-rr307.invalid/");
  const s = fixtureSite(); const base = await s.listen();
  try { assert.equal((await addressOpens(base, { allowLocal: true })).ok, true); } finally { s.close(); }
});

/* a stored ZIP (Search Console's download), made here */
function zipOf(files) {
  const parts = [], central = []; let off = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text), n = Buffer.from(name);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(0, 8); h.writeUInt32LE(data.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(0, 10); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(off, 42);
    parts.push(h, n, data); central.push(c, n); off += 30 + n.length + data.length;
  }
  const cd = Buffer.concat(central), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(Object.keys(files).length, 8); e.writeUInt16LE(Object.keys(files).length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cd, e]);
}
const GSC = { "Queries.csv": "Top queries,Clicks,Impressions,CTR,Position\nfixture exam online,3,40,7.5%,4.1\ncan i take the fixture exam online,1,12,8%,3\nfixture exam fee in pakistan,0,9,0%,12\n", "Pages.csv": "Top pages,Clicks,Impressions,CTR,Position\nhttps://x.example/faq,4,61,6%,5\n", "Chart.csv": "Date,Clicks,Impressions,CTR,Position\n2026-10-01,2,30,6%,5\n2026-10-02,2,31,6%,5\n" };

test("E1 · SEARCH CONSOLE'S DOWNLOAD: the ZIP (or its CSV files) read by the engine's own reader; a download without its Pages file is refused in plain words", () => {
  const zip = zipOf(GSC);
  assert.deepEqual(Object.keys(unzip(zip)).sort(), ["Chart.csv", "Pages.csv", "Queries.csv"]);
  const r = importExport([{ name: "export.zip", base64: zip.toString("base64") }], { exportedOn: "2026-10-21", source: "Fixture Search Console" });
  assert.equal(r.ok, true);
  assert.equal(r.line, "Search Console export added: 3 searches and 1 pages, 2026-10-01 to 2026-10-02.");
  assert.deepEqual(r.data.queries[0], { query: "fixture exam online", clicks: 3, impressions: 40 });
  const csvs = importExport(Object.entries(GSC).map(([name, t]) => ({ name, base64: Buffer.from(t).toString("base64") })), { exportedOn: "2026-10-21", source: "x" });
  assert.equal(csvs.ok, true);
  const noPages = importExport([{ name: "Queries.csv", base64: Buffer.from(GSC["Queries.csv"]).toString("base64") }, { name: "Chart.csv", base64: Buffer.from(GSC["Chart.csv"]).toString("base64") }], { exportedOn: "2026-10-21", source: "x" });
  assert.match(noPages.why, /^The Pages file is missing/);
});

test("E1 · GOOGLE SIGN-IN, READ-ONLY, DONE BY THE CLIENT: not switched on → said plainly; then Google's own page with a PKCE proof and the read-only scope; a sign-in not started here is refused; the lasting access goes to the secure store; sites and searches are read", async () => {
  const seen = [];
  const g = createServer(async (q, r) => {
    let body = ""; for await (const c of q) body += c;
    seen.push({ path: q.url, body, auth: q.headers.authorization ?? null });
    const send = (o) => { r.writeHead(200, { "content-type": "application/json" }); r.end(JSON.stringify(o)); };
    if (q.url === "/token") return send({ access_token: "fake-access", expires_in: 3600, refresh_token: "fake-refresh-rr307" });
    if (q.url === "/api/sites") return send({ siteEntry: [{ siteUrl: "sc-domain:x.example", permissionLevel: "siteOwner" }, { siteUrl: "https://y.example/", permissionLevel: "siteUnverifiedUser" }] });
    if (q.url.startsWith("/api/sites/") && q.method === "POST") return send({ rows: [{ keys: ["fixture exam online"], clicks: 3, impressions: 40 }] });
    r.writeHead(404); r.end("{}");
  });
  await new Promise((res) => g.listen(0, "127.0.0.1", res));
  const base = `http://127.0.0.1:${g.address().port}`;
  try {
    const keys = keyStore({ backend: memoryBackend(), env: {} });
    const config = { googleTestEndpoints: { auth: `${base}/auth`, token: `${base}/token`, api: `${base}/api/` } };
    const G = googleConnect({ keys, config, fetchImpl: fetch });
    assert.match(G.start("http://127.0.0.1:5000/oauth/google").why, /^Google sign-in is not set up in this copy of AlmiVisibility yet/);
    config.googleClientId = "fixture.apps.googleusercontent.com"; keys.set("GOOGLE_CLIENT_SECRET", "fake-client-secret-rr307");
    const s = G.start("http://127.0.0.1:5000/oauth/google");
    const u = new URL(s.url);
    assert.deepEqual([u.searchParams.get("scope"), u.searchParams.get("code_challenge_method"), u.searchParams.get("redirect_uri"), u.searchParams.get("access_type")], [SCOPE, "S256", "http://127.0.0.1:5000/oauth/google", "offline"]);
    assert.equal(SCOPE, "https://www.googleapis.com/auth/webmasters.readonly");
    assert.equal((await G.finish({ code: "c", state: "not-from-here" })).ok, false);
    assert.equal((await G.finish({ code: "c", state: u.searchParams.get("state") })).ok, true);
    const tok = new URLSearchParams(seen.find((x) => x.path === "/token").body);
    assert.equal(createHash("sha256").update(tok.get("code_verifier")).digest("base64url"), u.searchParams.get("code_challenge"), "the PKCE proof does not match");
    assert.equal(keys.get("GOOGLE_REFRESH_TOKEN"), "fake-refresh-rr307");
    assert.deepEqual(await G.sites(), ["sc-domain:x.example"]);
    const q = await G.queries("sc-domain:x.example");
    assert.deepEqual(q.queries, [{ query: "fixture exam online", clicks: 3, impressions: 40 }]);
    assert.equal(seen.find((x) => x.path.startsWith("/api/sites/sc-domain")).auth, "Bearer fake-access");
  } finally { g.close(); }
});

test("C · CREATE SEO PAGES: from real demand, answered ONLY from the client's own pages (source and date); an answer already on one page → improve that page; no answer → refused, said; one need asked two ways → one page; drafts by the one renderer, judged by all five gates", async () => {
  const s = fixtureSite(); const base = await s.listen();
  try {
    const site = await readSite({ url: base, allowLocal: true, paceMs: 0, on: ON });
    const sc = { kind: "EXPORT", window: "2026-10-01 to 2026-10-02", queries: [{ query: "fixture exam online nurses", impressions: 40 }, { query: "can i take the fixture exam online nurses", impressions: 12 }, { query: "fixture exam fee in pakistan", impressions: 9 }, { query: "fixture exam price for nurses month", impressions: 5 }] };
    const r = seoPages({ site, searchConsole: sc, on: ON });
    const row = (q) => r.plan.find((x) => x.question.toLowerCase() === q);
    assert.equal(row("fixture exam fee in pakistan").kind, "REFUSED");
    assert.match(row("fixture exam fee in pakistan").why, /^No answer to it was found on your pages yet/);
    assert.ok(!r.plan.some((x) => /^can i take/i.test(x.question)), "one need asked two ways became two rows");
    assert.ok(r.plan.flatMap((x) => x.alsoAsked ?? []).some((q) => /can i take/i.test(q)));
    for (const x of r.plan.filter((p) => p.kind !== "REFUSED")) for (const a of x.answers) assert.ok(a.link.startsWith(base) && a.readOn === "2026-10-21", "an answer not from the client's own page with its date");
    assert.ok(r.plan.some((x) => x.kind === "SECTION" && /Improve your existing page/.test(x.why)) || r.drafts.length > 0);
    for (const d of r.drafts) { assert.deepEqual(d.gates.map((g) => g.gate), ["A", "B", "C", "D", "E"]); assert.match(d.html, /data-claim-id=/); assert.match(d.html, /not published/); }
  } finally { s.close(); }
});

test("G · WHAT WOULD YOU LIKE TO DO NOW: every card comes from the registry, says what it does, what you get, the time or cost and what it needs; a card that needs something says \"Needs: …\" (never hidden); at most 3 recommended", () => {
  for (const f of FEATURES) assert.ok(f.title && f.does && f.youGet && f.time && typeof f.needs === "function", f.id);
  const bare = menuFor({ hasSite: false, siteRead: null, youtubeConfirmed: false, youtubeKey: false, searchConsole: false, files: false, drafts: false, check: null, aiKey: false });
  assert.equal(bare.question, "What would you like to do now?");
  assert.equal(bare.cards.length, FEATURES.length, "a card was hidden");
  assert.ok(bare.cards.find((c) => c.id === "youtube").needs.some((n) => n.what === "your YouTube key"));
  assert.ok(bare.recommended.length <= 3);
});

test("D · PLAIN WORDS: the two first questions decide the steps; every choice says choose this if / you get / cost / you need; no technical words on the screens (Google's own button names stay in the how-to only)", () => {
  assert.deepEqual(stepsFor({ goal: { grow: "youtube", hasWebsite: false } }).map((s) => s.id), ["goal", "product", "youtube", "aiConnection", "start"]);
  assert.deepEqual(stepsFor({ goal: { grow: "website", hasWebsite: true } }).map((s) => s.id), ["goal", "product", "searchData", "languages", "articlesPerDay", "publishMode", "aiConnection", "start"]);
  for (const list of Object.values(CHOICES)) for (const c of list) assert.ok(c.chooseIf && c.gives && c.cost && c.needs, c.label);
  /* the words on the screens: the page and the texts it shows (the script's own JSON.stringify / JSON.parse calls are code, not words) */
  const screen = readFileSync(join(REPO, "desktop", "ui.html"), "utf8").replace(/JSON.(stringify|parse)/g, "") + STEPS.map((s) => `${s.title} ${s.ask}`).join(" ") + JSON.stringify(CHOICES) + FEATURES.map((f) => `${f.title} ${f.does} ${f.youGet} ${f.time}`).join(" ") + /* RR-308: the publish choices too */ TARGETS.map((t) => `${t.label} ${t.chooseIf} ${t.needs}`).join(" ");
  for (const bad of [/environment variable/i, /NAME of the variable/i, /\bAPI\b/, /\bJSON\b/, /\bOAuth\b/i, /\bendpoint\b/i, /localhost/i, /Credential Manager/]) assert.doesNotMatch(screen, bad, String(bad));
});

/* ── the whole app, on this computer ── */
async function app(extra = {}) {
  const site = fixtureSite(); const siteBase = await site.listen();
  const dir = mkdtempSync(join(tmpdir(), "rr307-app-"));
  const kp = generateKeyPairSync("ed25519");
  writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testAllowLocalSites: true, keysDir: dir, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", ...extra }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  for (let i = 0; i < 80 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then(async (r) => ({ ...(await r.json()), http: r.status }));
  const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
  return { siteBase, dir, post, get, close: () => { p.kill(); site.close(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}

test("A1 + C + E · IN THE APP: a product is checked the moment it is added; the Overview shows the score card, what was found and the cards; every card's job runs (none is a card without a working feature); delete asks first and moves the data aside", async () => {
  const a = await app();
  try {
    await a.post("/api/company", { name: "Fixture Co", site: a.siteBase });
    const made = await a.post("/api/products", { name: "FixturePrep", site: a.siteBase, goal: { grow: "website", hasWebsite: true } });
    assert.deepEqual([made.http, made.checking], [200, true]);
    let o; for (let i = 0; i < 100; i++) { o = await a.get(`/api/products/${made.product.id}/overview`); if (!o.checking && o.card) break; await new Promise((r) => setTimeout(r, 200)); }
    assert.match(o.card.gauge, /^\d+\/100$/);
    assert.match(o.found.line, /^We found 3 pages/);
    assert.equal(o.menu.question, "What would you like to do now?");
    const id = made.product.id;
    await a.post(`/api/products/${id}/google/export`, { files: [{ name: "export.zip", base64: zipOf(GSC).toString("base64") }] });
    for (const f of FEATURES.map((x) => x.id)) {
      const r = await a.post(`/api/products/${id}/feature/${f}`, {});
      assert.equal(r.http, 200, f);
      assert.notEqual(r.refused, "not a feature of this version", `a card without a working feature: ${f}`);
    }
    assert.ok(!readdirSync(join(a.dir, "products", id)).some((n) => /\.html$/.test(n)), "a page was written as a file (published?)");
    assert.equal((await a.post(`/api/products/${id}/delete`, {})).http, 400, "deleted without \"Are you sure?\"");
    const del = await a.post(`/api/products/${id}/delete`, { confirm: true });
    assert.equal(del.http, 200);
    assert.ok(!existsSync(join(a.dir, "products", id)) && readdirSync(join(a.dir, "deleted-products")).some((n) => n.startsWith(`${id}-`)), "the data was erased instead of moved aside");
    assert.deepEqual((await a.get("/api/home")).products, []);
    assert.equal((await a.get("/api/tour")).show, true); await a.post("/api/tour", {}); assert.equal((await a.get("/api/tour")).show, false);
  } finally { a.close(); }
});

test("E4 · ONE CHANNEL, SEVERAL PRODUCTS: each video goes to the product whose own words it uses (a CV video → the CV product, an IELTS video → the IELTS product); the brand both share decides nothing; a video about neither is not linked", async () => {
  const { productStore } = await import("../desktop/products.mjs");
  const { youtubeApp } = await import("../desktop/youtube-app.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr307-shared-"));
  try {
    const store = productStore(dir);
    const confirmed = { channelId: "UCshared0000000000001", title: "Almi Shared", handle: "@almi-shared", on: "2026-10-21" };
    const mk = (name, what) => { const p = store.create({ name, site: "https://www.youtube.com/@almi-shared" }); const s = store.read(p.id); s.setup.product.what = what; s.setup.youtube = { handle: "@almi-shared", confirmed }; s.started = true; store.write(p.id, s); return p.id; };
    const cv = mk("AlmiCV", "AlmiWorld's CV builder: write a CV and a cover letter that get interviews.");
    const prep = mk("AlmiPrep", "AlmiWorld's IELTS preparation: writing, speaking, reading and listening practice.");
    const vid = (id, title) => ({ id, snippet: { title, description: "", tags: [], publishedAt: "2025-06-01T00:00:00Z", channelTitle: "Almi Shared" }, contentDetails: { duration: "PT5M" }, statistics: { viewCount: "5" }, player: { embedWidth: "640", embedHeight: "360" } });
    const videos = [vid("v1", "How to write a CV in 10 minutes"), vid("v2", "IELTS speaking part 2 tips"), vid("v3", "AlmiWorld office tour")];
    const fetchImpl = async (u) => { const url = new URL(u); const p = url.pathname.split("/").pop(); const body = p === "channels" ? { items: [{ id: confirmed.channelId, snippet: { title: "Almi Shared", customUrl: "@almi-shared" }, statistics: {}, contentDetails: { relatedPlaylists: { uploads: "UUshared" } } }] } : p === "playlistItems" ? { items: videos.map((v) => ({ contentDetails: { videoId: v.id } })) } : p === "videos" ? { items: videos } : {}; return new Response(JSON.stringify(body)); };
    const keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set("YOUTUBE_API_KEY", "fake-youtube-key-rr307-0000");
    const YT = youtubeApp({ store, dataDir: dir, keys, config: { youtubeApiBase: "http://127.0.0.1:1/youtube/v3/" }, fetchImpl });
    const a = await YT.advice(cv), b = await YT.advice(prep);
    assert.deepEqual(a.top.map((v) => v.title), ["How to write a CV in 10 minutes"]);
    assert.deepEqual(b.top.map((v) => v.title), ["IELTS speaking part 2 tips"]);
    assert.match(a.shared.line, /^This channel serves 2 products \(AlmiCV, AlmiPrep\)\. 1 of its 3 videos is about AlmiCV; 1 is not linked to any product\.$/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("RR-307 FIX B2 (22 Oct) · THE TABS NEVER WAIT FOR YOUTUBE: the product's tab list says where its YouTube stands without one call to YouTube (a channel of 1,437 videos was read again on every tab switch)", async () => {
  const { productStore } = await import("../desktop/products.mjs");
  const { youtubeApp } = await import("../desktop/youtube-app.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr307-quick-"));
  try {
    const store = productStore(dir);
    const p = store.create({ name: "Dhanak Ki Duniya", site: null }); const s = store.read(p.id);
    s.setup.youtube = { handle: "@dhanakkiduniya", confirmed: { channelId: "UCdhanak0000000000001", title: "Dhanak Ki Duniya", handle: "@dhanakkiduniya", on: "2026-10-22" } }; store.write(p.id, s);
    let calls = 0;
    const keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set("YOUTUBE_API_KEY", "fake-youtube-key-rr307-0000");
    const YT = youtubeApp({ store, dataDir: dir, keys, config: {}, fetchImpl: async () => { calls++; throw new Error("no network in this test"); } });
    assert.deepEqual(YT.quickLines(p.id), ["Dhanak Ki Duniya: @dhanakkiduniya", "Open the YouTube tab for the advice."]);
    assert.equal(calls, 0, "the tab list called YouTube");
    assert.match(readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), /youtube: YT\.quickLines\(id\)/, "the product's views read the whole channel");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* the SCREENS themselves: test/support/ui-screen.mjs (shared with RR-308) */
import { screen } from "./support/ui-screen.mjs";

test("RR-307 FIX B (22 Oct) · THE YOUTUBE SETTINGS SCREEN OPENS for a YouTube-only product (the Dhanak screen went blank: the screen joined the topics as a list, the app now gives them as an object) — the found topics shown, the client's own extra topics kept apart and saved; a screen that fails says so in plain words, never blank", async () => {
  const a = await app();
  try {
    const made = await a.post("/api/products", { name: "Dhanak Ki Duniya", site: "", goal: { grow: "youtube", hasWebsite: false } });
    const id = made.product.id;
    await a.post(`/api/products/${id}/setup`, { id: "product", value: { name: "Dhanak Ki Duniya", site: "", what: "Daily life vlog of a Pakistani family in Denmark: cooking, cleaning and routines with the kids." } });
    await a.post(`/api/products/${id}/setup`, { id: "youtube", value: { handle: "@dhanakkiduniya", key: "" } });
    const y = await a.get(`/api/products/${id}/youtube`);
    assert.ok(Array.isArray(y.topics.all) && y.topics.all.length > 0 && Array.isArray(y.extraTopics), "the settings' shape");
    const base = a.siteBase.replace(/:\d+$/, `:${JSON.parse(readFileSync(join(a.dir, "run.json"), "utf8")).port}`);
    const ui = await screen(base);
    ui.api.set(id, await ui.api.get(`/api/products/${id}/state`));
    await ui.api.youtubeSettings();
    const shown = ui.app();
    assert.match(shown, /Find my channel/, "the YouTube settings screen did not open");
    assert.match(shown, /Research topics Visibility found by itself/);
    for (const t of y.topics.all) assert.ok(shown.includes(t), `a found topic is not shown: ${t}`);
    assert.doesNotMatch(shown, /\[object Object\]|undefined/);
    const saved = await a.post(`/api/products/${id}/youtube`, { handle: "@dhanakkiduniya", extraTopics: ["mom vlog denmark"] });
    assert.equal(saved.http, 200);
    const y2 = await a.get(`/api/products/${id}/youtube`);
    assert.deepEqual(y2.extraTopics, ["mom vlog denmark"]);
    assert.ok(y2.topics.all.includes("mom vlog denmark"), "the client's extra topic is not researched");
    /* never blank: the page's own error guard puts a plain message on the screen */
    const ui2 = await screen(base);
    assert.match(readFileSync(join(REPO, "desktop", "ui.html"), "utf8"), /window\.addEventListener\("unhandledrejection"/);
    ui2.api.set("no-such-product", { product: { name: "x" } });
    await ui2.api.youtubeSettings().catch(() => {});
    assert.doesNotMatch(ui2.app(), /Find my channel/);
  } finally { a.close(); }
});

test("RR-307 FIX C (22 Oct) · A LONG CHECK SHOWS HOW FAR IT IS and is never offered twice: while it runs the Overview gives the stage, N of M and the time left; the screen shows a progress bar and NO \"Check my product now\"; a second Check now joins the running check; the end of setup says it is already running", async () => {
  const a = await app();
  try {
    const made = await a.post("/api/products", { name: "FixturePrep", site: a.siteBase, goal: { grow: "website", hasWebsite: true } });
    const id = made.product.id;
    const o = await a.get(`/api/products/${id}/overview`);
    assert.equal(o.checking, true, "the check did not start at once");
    assert.ok(o.progress && typeof o.progress.stage === "string" && Number.isInteger(o.progress.done) && Number.isInteger(o.progress.of), "no progress while checking");
    const again = await a.post(`/api/products/${id}/check`, {});
    assert.deepEqual([again.http, again.started, again.running], [200, false, true], "a second check was started while one runs");
    assert.equal((await a.get(`/api/products/${id}/state`)).checking, true);
    const base = a.siteBase.replace(/:\d+$/, `:${JSON.parse(readFileSync(join(a.dir, "run.json"), "utf8")).port}`);
    const ui = await screen(base);
    ui.api.set(id, await ui.api.get(`/api/products/${id}/state`));
    ui.el("#ov");
    await ui.api.overview();
    const shown = ui.el("#ov").innerHTML;
    assert.match(shown, /Checking your product now…/);
    assert.match(shown, /class="progress"/);
    assert.doesNotMatch(shown, /id="chk"|Check my product now/, "\"Check my product now\" offered while a check runs");
    assert.match(shown, /Running now/, "the check card did not say it is running");
    const st = await ui.api.get(`/api/products/${id}/state`);
    ui.api.set(id, st); ui.api.stepTo(st.steps.length - 1);
    await ui.api.setup();
    assert.match(ui.app(), /See the check in progress/); assert.doesNotMatch(ui.app(), /Check my product now/, "the end of setup offered a second check");
    let done; for (let i = 0; i < 150; i++) { done = await a.get(`/api/products/${id}/overview`); if (!done.checking) break; await new Promise((r) => setTimeout(r, 200)); }
    assert.equal(done.checking, false); assert.equal(done.progress, null); assert.match(done.card.gauge, /^\d+\/100$/);
  } finally { a.close(); }
});
