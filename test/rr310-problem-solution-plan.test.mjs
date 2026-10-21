/**
 * RR-310 (owner, 21 Oct 2026) — EVERY PROBLEM COMES WITH ITS SOLUTION, THE ACTION PLAN, THE YOUTUBE-ONLY OVERVIEW, AND "WHAT I WILL DO FOR
 * YOU" (create, structure, publish, submit to Google and Bing, weekly check). The client's site, its WordPress, IndexNow and Google are ONE
 * stand-in on 127.0.0.1 (config testAllowLocalSites / indexNowEndpoint / googleTestEndpoints — tests only); keys live in a memory store.
 * Nothing leaves this computer.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateKeyPairSync } from "node:crypto";
import { youtubeItems, websiteItems, actionPlan, willDo, planDocument, keywordGroups, socialFromVideo, isAlmiWorld, HONEST } from "../desktop/action-plan.mjs";
import { gapFixes, youtubeScore, CHAPTERS_FROM } from "../desktop/youtube-plan.mjs";
import { scoreCard } from "../desktop/product-check.mjs";
import { menuFor, seoCheck, aeoCheck, geoCheck, linksCheck, languagesCheck } from "../desktop/features.mjs";
import { indexNow, keyFileUrl } from "../desktop/submit.mjs";
import { screen } from "./support/ui-screen.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ON = "2026-10-21T10:00:00.000Z";
const vid = (id, title, o = {}) => ({ videoId: id, title, description: o.description ?? "", tags: [], publishedAt: o.at ?? "2026-09-01T00:00:00Z", durationSec: o.sec ?? 900, width: o.short ? 720 : 1280, height: o.short ? 1280 : 720, views: o.views ?? 100, comments: 0 });
const VIDEOS = [
  vid("a1", "Our trip to Iceland | family vlog", { views: 9000, description: "We drove around Iceland for a week with the kids.\nSubscribe" }),
  vid("a2", "Morning routine with kids #viral #fyp", { views: 5000, sec: 40, short: true, description: "" }),
  vid("a3", "Grocery haul in Denmark", { views: 3000, description: "What a week of food costs us in Denmark.\n0:00 Intro\n1:00 Shop\n3:00 Prices" }),
  vid("a4", "Cleaning day", { views: 800, description: "" }),
];
const CTX = { channel: { title: "Mom Diaries", handle: "@momdiaries", boilerplate: new Set() }, persona: { who: "Pakistani Mom", whoFrom: "your channel's description", places: ["Denmark"] }, niche: { queries: [{ q: "mom vlog" }] }, summary: null, readOn: "2026-10-21" };

test("A1 · YOUTUBE: every failing check is Problem (with its count) → Solution → Ready to use (the most-viewed videos' own text, with where it came from); chapters are a template, said why", () => {
  const gaps = gapFixes(VIDEOS, CTX, {});
  assert.deepEqual([gaps.description.count, gaps.description.of, gaps.chapters.count, gaps.chapters.of, gaps.generic.count], [2, 4, 2, 3, 1]);
  const items = youtubeItems({ state: "READY", gaps, ideas: [{ kind: "FORMAT", title: "House Tour in Denmark | Pakistani Mom", why: "\"House tour\" is 2 of the niche's top videos (median 1,802,720 views) — you have no such video yet. Source: YouTube search" }] });
  const d = items.find((i) => i.id === "yt:description");
  assert.equal(d.problem, "2 of 4 videos have no description");
  assert.match(d.solution, /^Add a description to each/);
  assert.equal(d.ready[0].kind, "description"); assert.match(d.ready[0].for, /^"Morning routine with kids #viral #fyp" \(5,000 views\)$/);
  assert.ok(d.ready.every((r) => r.source && r.text), "a ready text without its source");
  const c = items.find((i) => i.id === "yt:chapters");
  assert.equal(c.problem, "2 of 3 long videos have no chapters"); assert.equal(c.ready[0].text, "0:00 Intro\n?:?? …\n?:?? …"); assert.equal(c.ready[0].source, CHAPTERS_FROM);
  assert.match(CHAPTERS_FROM, /cannot read your video's transcript/);
  assert.equal(items.find((i) => i.id === "yt:generic").ready[0].kind, "hashtags");
  assert.equal(items.find((i) => i.id === "yt:ideas").ready[0].text, "House Tour in Denmark | Pakistani Mom");
  /* nothing invented: every ready title's words come from the video, the channel's description or the research */
  const allowed = new Set("our trip to iceland family vlog morning routine with kids grocery haul in denmark cleaning day pakistani mom come us watch this what is it really like is worth visiting house tour".split(" "));
  for (const r of items.flatMap((i) => i.ready).filter((r) => r.kind === "title")) for (const w of r.text.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean)) assert.ok(allowed.has(w), `"${w}" in "${r.text}" came from nowhere`);
  /* B5 · each YouTube line with its count */
  assert.deepEqual(youtubeScore(VIDEOS).checks.map((x) => x.text).slice(0, 1), ["Every video has a description: 2 of 4"]);
});

const PAGE = (url, o = {}) => ({ url, title: o.title ?? "Fixture Prep — Practise", description: o.description ?? "", h1: "H", h2: [], qa: o.qa ?? [], lang: o.lang ?? "en", canonical: "canonical" in o ? o.canonical : url, noindex: o.noindex ?? false, hreflang: [], structuredTypes: o.st ?? [], facts: o.facts ?? [], lead: o.lead ?? [] });
const SITE = { ok: true, origin: "http://127.0.0.1:1", readOn: ON, robots: { found: false, aiBots: { "OAI-SearchBot": true, "Claude-SearchBot": true, PerplexityBot: true } }, sitemap: { found: false, urls: 0 }, brokenLinks: [{ from: "http://127.0.0.1:1/", to: "http://127.0.0.1:1/old", status: 404 }], linkObs: [{ to: "http://127.0.0.1:1/old" }], design: { siteName: "Fixture Prep" },
  pages: [PAGE("http://127.0.0.1:1/", { canonical: null, lead: ["Fixture exam practice online covers all 4 parts of the test for nurses, with 120 tasks."] }), PAGE("http://127.0.0.1:1/pricing", { noindex: true, qa: [{ q: "How much does it cost?", a: "Fixture exam practice costs $12 a month for nurses after a free week. You can stop at any time. The price is the same in every country.", from: "a heading on the page" }] })] };

test("A1 · THE WEBSITE TABS (SEO, AEO, GEO, Links, Languages): every line that is not good is Problem → Solution → Ready to use, or says plainly why there is nothing to paste", () => {
  const card = { fixFirst: [] };
  const results = [seoCheck(SITE, card), aeoCheck(SITE, null), geoCheck(SITE), linksCheck(SITE), languagesCheck(SITE, ["en", "da"])];
  const bad = results.flatMap((r) => r.lines).filter((l) => l.ok === false);
  assert.ok(bad.length >= 6, String(bad.length));
  for (const l of bad) { assert.ok(l.problem && l.solution, `no problem/solution: ${l.line}`); assert.ok(l.ready.length || l.note, `no ready text and no reason: ${l.line}`); for (const r of l.ready) assert.ok(r.text && r.source, `ready without source: ${l.line}`); }
  const sitemap = bad.find((l) => /No sitemap/.test(l.line)).ready[0];
  assert.match(sitemap.text, /<loc>http:\/\/127\.0\.0\.1:1\/<\/loc>/); assert.doesNotMatch(sitemap.text, /pricing/, "a noindex page went into the sitemap");
  assert.match(bad.find((l) => /do not say which address/.test(l.line)).ready[0].text, /^<link rel="canonical" href="http:\/\/127\.0\.0\.1:1\/">$/);
  assert.match(bad.find((l) => /does not open/.test(l.line)).solution, /change this link to an address that opens, or remove it/);
  assert.match(bad.find((l) => /No page found yet in:/.test(l.line)).note, /does not translate/);
  const geoFacts = results[2].lines.find((l) => /few facts with numbers/.test(l.line));
  assert.ok(!geoFacts || /only you know them/.test(geoFacts.note), "a fact would be invented");
});

test("A2 + A3 · THE ACTION PLAN: THIS WEEK = the 5 with the most effect (the order said, never a forecast); keywords grouped by their shared main word, each with its source and how often it is searched or shown when known; titles; articles and videos to make; the rest — and the downloadable document holds every part", () => {
  const found = { phrases: [{ text: "oet for nurses", source: "your Search Console (2026-07-01 to 2026-10-15)", on: "2026-10-18", searched: "shown 40 times in Google search" }, { text: "oet nurses new zealand", source: "your Search Console", on: "2026-10-18", searched: null }, { text: "ahpra speech pathology", source: "your file bing.csv", on: "2026-10-18", searched: "120 (the figure in your file)" }], questions: [{ text: "is oet accepted in canada?", source: "a comment", on: "2026-10-18" }] };
  const g = keywordGroups(found);
  assert.equal(g[0].topic, "OET"); assert.equal(g[0].items.length, 3);
  assert.equal(g[0].items[0].searched, "shown 40 times in Google search");
  assert.ok(g.flatMap((x) => x.items).every((k) => k.source), "a keyword without its source");
  const yt = { state: "READY", gaps: gapFixes(VIDEOS, CTX, {}), ideas: [], top: [{ videoId: "a1", title: "Our trip to Iceland | family vlog", publishedAt: "2026-09-01", firstLine: "We drove around Iceland for a week with the kids.", options: [{ title: "Our Trip to Iceland | Pakistani Mom Vlog", hashtags: ["#OurTrip", "#Iceland", "#PakistaniMom"], basedOn: ["x", "y"] }] }], confirmed: { title: "Mom Diaries" } };
  const card = scoreCard({ site: null, youtube: null, on: ON });
  const plan = actionPlan({ product: { name: "Fixture Prep" }, on: ON, card: { ...card, fixFirst: [{ id: "meta-description", line: "2 pages: x", how: "Write a description", fixForMe: true, pages: SITE.pages.map((p) => p.url) }] }, site: SITE, pages: null, found, youtube: yt });
  assert.equal(plan.thisWeek.length, 5); assert.ok(plan.thisWeek.every((x, i, a) => !i || a[i - 1].effect >= x.effect), "THIS WEEK is not in order of effect");
  assert.equal(plan.thisWeek[0].id, "meta-description");
  assert.match(plan.order, /not a forecast/); assert.equal(plan.honest, HONEST);
  assert.equal(plan.titles.existing.find((t) => t.area === "Your videos").text, "Our Trip to Iceland | Pakistani Mom Vlog");
  const doc = planDocument(plan, willDo(plan, { product: "Fixture Prep" }));
  for (const h of ["What I will do for you", "This week — the 5 things with the most effect", "Keywords to use", "Titles", "Articles and new videos to make", "Then the rest, in order of effect", "<b>Problem:</b>", "<b>Solution:</b>", "<b>Ready to use:</b>", "From: ", "shown 40 times in Google search", HONEST]) assert.ok(doc.includes(h), h);
  /* B6 · a social post from a video: its own words, its link */
  const s = socialFromVideo(yt.top[0], yt.confirmed);
  assert.equal(s.posts[0].text, "Our trip to Iceland | family vlog\n\nWe drove around Iceland for a week with the kids.\n\nWatch it here: https://www.youtube.com/watch?v=a1\n\n#OurTrip #Iceland #PakistaniMom");
});

test("D1 + D2 + D5 · WHAT I WILL DO FOR YOU: five lines with their state and a Do it for me; honest words only — never 'top', a ranking, traffic or citation promise; AlmiWorld's own products: the plan only; a YouTube-only product gets its own four", () => {
  const plan = { titles: { existing: [], new: [{ area: "New pages", text: "OET for Nurses in New Zealand" }] }, thisWeek: [], rest: [], make: [], social: [] };
  const w = willDo(plan, { product: "Fixture Prep", connected: true, live: [{ url: "u" }], submitted: { u: { google: { state: "SUBMITTED" } } } });
  assert.deepEqual(w.lines.map((l) => l.action), ["create-pages", "structure", "publish", "submit", "weekly"]);
  assert.equal(w.lines[0].text, "Create these 1 page, answering the questions people ask about Fixture Prep.".replace("these 1 page", "these 1 page"));
  assert.deepEqual(w.lines[0].titles, ["OET for Nurses in New Zealand"]);
  assert.match(w.lines[3].text, /Google \(through your Search Console\) and to Bing \(IndexNow\), which AI search assistants like ChatGPT search and Copilot also use/);
  assert.match(w.lines[3].status, /^Google: 1 of 1 · Bing: 0 of 1/);
  assert.equal(w.honest, "This gives your product a better chance to appear in Google and AI answers. It promises no ranking, traffic or citation.");
  const words = JSON.stringify(w) + readFileSync(join(REPO, "desktop", "action-plan.mjs"), "utf8").split("export function willDo")[1].split("export function planDocument")[0];
  assert.doesNotMatch(words.replace(/promises no ranking, traffic or citation/g, ""), /\b(top|#1|first page|rank(ing)?|guarantee|more traffic)\b/i, "a promise crept in");
  const aw = willDo(plan, { almiworld: true });
  assert.match(aw.plain, /AlmiWorld's own product: this is the plan only — nothing is published or submitted/);
  assert.equal(aw.lines[2].status, "Not for AlmiWorld's own products"); assert.equal(aw.lines[3].status, "Not for AlmiWorld's own products");
  const y = willDo({ ...plan, youtubeOnly: true }, {});
  assert.deepEqual(y.lines.map((l) => l.action), ["youtube", "youtube", "social", "weekly"]); assert.match(y.more, /^Have a website too\?/);
  assert.equal(isAlmiWorld({ product: { site: "https://almioet.almiworld.com" } }), true);
  assert.equal(isAlmiWorld({ product: { site: "https://www.youtube.com/@x" }, setup: { youtube: { handle: "@Almiworld-world" } } }), true);
  assert.equal(isAlmiWorld({ product: { site: "https://www.youtube.com/@dhanakkiduniya" }, setup: { youtube: { handle: "@dhanakkiduniya" } } }), false);
});

test("B1–B4 · A PRODUCT WITH NO WEBSITE: the gauge is the YouTube /100 and only the YouTube line shows; the website cards sit in ONE closed section; 'Check my channel now'", () => {
  const card = scoreCard({ site: null, youtube: { confirmed: true, videos: VIDEOS, opts: {} }, on: ON, noWebsite: true });
  assert.deepEqual([card.youtubeOnly, card.score, card.gauge, card.areas.map((a) => a.area)], [true, youtubeScore(VIDEOS).score, youtubeScore(VIDEOS).gauge, ["YouTube"]]);
  assert.ok(card.areas[0].ticks.some((t) => t.line === "Every video has a description: 2 of 4"));
  const m = menuFor({ noWebsite: true, hasSite: false, youtubeConfirmed: true, youtubeKey: true, check: card });
  assert.equal(m.websiteOnly.title, "Have a website too? These open up");
  assert.deepEqual(m.websiteOnly.cards.map((c) => c.id).sort(), ["aeo", "articles", "geo", "google", "languages", "links", "publish", "seo-check", "seo-pages"]);
  assert.ok(!m.cards.some((c) => c.needs.some((n) => /website/.test(n.what))), "a 'Needs: your website' card outside the closed section");
  assert.equal(m.cards.find((c) => c.id === "check").title, "Check my channel now");
  assert.deepEqual(m.cards.find((c) => c.id === "social").needs, [], "social posts from videos need a page draft");
  /* the home screen's general menu is not grouped */
  assert.equal(menuFor({ hasSite: false }).websiteOnly, undefined);
});

/* ── in the app: one stand-in for the client's site, its WordPress, IndexNow and Google ── */
function clientSite() {
  const st = { key: null, published: new Set(), indexnow: [], google: [] }; let base = "";
  const page = (t, b) => `<!doctype html><html lang="en"><head><title>${t}</title></head><body><nav><a href="/">Home</a> <a href="/pricing">Pricing</a> <a href="/course">Course</a></nav><main>${b}</main><footer>F</footer></body></html>`;
  const srv = createServer((q, r) => { let body = ""; q.on("data", (c) => (body += c)); q.on("end", () => {
    const h = (s, type = "text/html", code = 200) => { r.writeHead(code, { "content-type": type }); r.end(s); };
    const u = new URL(q.url, "http://x");
    if (u.pathname === "/robots.txt") return h("User-agent: *\nAllow: /\n", "text/plain");
    if (u.pathname === "/sitemap.xml") return h(`<?xml version="1.0"?><urlset>${["/", "/pricing", "/course", ...[...st.published].map((s) => `/${s}/`)].map((p) => `<url><loc>${base}${p}</loc></url>`).join("")}</urlset>`, "application/xml");
    if (u.pathname === "/") return h(page("Fixture Prep", "<h1>Practise the Fixture exam</h1><p>Fixture exam practice online covers all 4 parts of the test for nurses, with 120 tasks in total.</p><p>The speaking test role plays last 20 minutes, with 2 role plays for nurses.</p>"));
    if (u.pathname === "/pricing") return h(page("Pricing", "<h1>Pricing</h1><p>Fixture exam practice online costs $12/month for nurses after a free week.</p>"));
    if (u.pathname === "/course") return h(page("Course", "<h1>Course</h1><p>Fixture exam practice online takes about 4 weeks for most nurses before the test.</p><p>Speaking test role plays are practised 2 times a day by nurses in the course.</p>"));
    if (st.key && u.pathname === `/${st.key}.txt`) return h(st.key, "text/plain");
    if (u.pathname === "/wp-json/wp/v2/pages" && q.method === "POST") { const j = JSON.parse(body); st.published.add(j.slug); return h(JSON.stringify({ id: 7, link: `${base}/${j.slug}/` }), "application/json", 201); }
    if (u.pathname.startsWith("/wp-json/")) return h(JSON.stringify({ id: 7, link: base }), "application/json");
    if (u.pathname === "/indexnow" && q.method === "POST") { st.indexnow.push(JSON.parse(body)); return h("", "text/plain", 200); }
    if (u.pathname === "/token") return h(JSON.stringify({ access_token: "fake-access", expires_in: 3600, refresh_token: "fake-refresh-rr310", scope: "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/webmasters" }), "application/json");
    if (u.pathname.startsWith("/gapi/")) { st.google.push({ method: q.method, path: decodeURIComponent(u.pathname) }); if (/searchAnalytics/.test(u.pathname)) return h(JSON.stringify({ rows: [{ keys: ["fixture exam practice online for nurses"], clicks: 3, impressions: 40 }, { keys: ["speaking test role plays nurses"], clicks: 1, impressions: 20 }] }), "application/json"); return h("{}", "application/json"); }
    const slug = u.pathname.replace(/^\/|\/$/g, ""); if (st.published.has(slug)) return h(page(slug, "<h1>Published</h1>"));
    h("", "text/plain", 404); }); });
  return { st, listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}
async function app(extra = {}, dir = mkdtempSync(join(tmpdir(), "rr310-app-"))) {
  if (!existsSync(join(dir, "config.json"))) {
    const kp = generateKeyPairSync("ed25519");
    writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
    const { makeOwnerLicence } = await import("../services/licence/service.mjs");
    writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testAllowLocalSites: true, keysDir: dir, downloadsDir: join(dir, "downloads"), weeklyFirstMs: 2147483647, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", ...extra }));
  } else { const c = JSON.parse(readFileSync(join(dir, "config.json"), "utf8")); writeFileSync(join(dir, "config.json"), JSON.stringify({ ...c, ...extra })); rmSync(join(dir, "run.json"), { force: true }); }
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/_API_KEY$|_TOKEN$|APP_PASSWORD/.test(k)));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then(async (r) => ({ ...(await r.json()), http: r.status }));
  const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
  const raw = (path) => fetch(`${url}${path}`);
  return { url, dir, post, get, raw, stop: () => p.kill(), close: () => { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}
const settle = async (a, id) => { let o; for (let i = 0; i < 300; i++) { o = await a.get(`/api/products/${id}/overview`); if (!o.checking && o.card && o.plan) return o; await new Promise((r) => setTimeout(r, 200)); } return o; };

test("D IN THE APP: the plan after the check; Do it for me creates the pages, publishes them (the client's choice: automatically), and submits them — Bing only once the key file is on the site, Google only through the client's own Search Console with the extra permission; each page's state; the plan saved as a document; AlmiWorld's own product refused", async () => {
  const s = clientSite(); const base = await s.listen();
  const a = await app({ indexNowEndpoint: `${base}/indexnow`, googleTestEndpoints: { auth: `${base}/auth`, token: `${base}/token`, api: `${base}/gapi/` } });
  try {
    const id = (await a.post("/api/products", { name: "Fixture Prep", site: base, goal: { grow: "website", hasWebsite: true } })).product.id;
    let O = await settle(a, id);
    assert.ok(O.plan && O.willDo, "no plan after the check");
    assert.deepEqual(O.willDo.lines.map((l) => l.action), ["create-pages", "structure", "publish", "submit", "weekly"]);
    assert.ok(O.plan.thisWeek.length >= 1 && O.plan.thisWeek.every((i) => i.problem && i.solution), JSON.stringify(O.plan.thisWeek).slice(0, 300));
    /* the client's own Search Console (signed in with "also tell Google about my new pages") */
    assert.equal((await a.post("/api/google/client", { clientId: "rr310.apps.googleusercontent.com", secret: "fake-client-secret" })).http, 200);
    const st = await a.post(`/api/products/${id}/google/start`, { submit: true }); assert.equal(st.http, 200, st.refused);
    await a.raw(`/oauth/google?code=one-time&state=${new URL(st.url).searchParams.get("state")}`);
    assert.equal((await a.post(`/api/products/${id}/google/site`, { site: `${base}/` })).http, 200);
    O = (await a.post(`/api/products/${id}/plan`, {})).willDo;
    assert.match(O.lines[0].text, /^Create these \d+ pages?, answering the questions people ask about Fixture Prep\.$/);
    const made = await a.post(`/api/products/${id}/do`, { what: "create-pages" });
    assert.match(made.line, /^\d+ drafts? made — read them under "Pages and articles"\.$/);
    assert.equal((await a.post(`/api/products/${id}/do`, { what: "publish" })).open, "publish-settings");
    assert.equal((await a.post(`/api/products/${id}/publish/connect`, { kind: "wordpress", site: base, user: "owner", key: "test app password" })).http, 200);
    const pub = await a.post(`/api/products/${id}/do`, { what: "publish" });
    assert.match(pub.line, /Published ✓ — live at http:\/\/127\.0\.0\.1:\d+\//);
    /* no key file on the site yet: Bing is NOT sent, said; Google is sent through the sitemap */
    const sub1 = await a.post(`/api/products/${id}/do`, { what: "submit" });
    assert.equal(sub1.ok, true); assert.equal(s.st.indexnow.length, 0, "IndexNow without the key file on the site");
    assert.match(sub1.lines.find((l) => l.startsWith("Bing")), /^Bing: not sent — first put your key file on your site: Make a plain text file named [0-9a-f]{32}\.txt/);
    assert.ok(s.st.google.some((g) => g.method === "PUT" && g.path.endsWith(`/sitemaps/${base}/sitemap.xml`)), JSON.stringify(s.st.google));
    assert.match(sub1.pages[0].google, /^Submitted ✓ \(\d{4}-\d{2}-\d{2}\) — through your sitemap$/);
    assert.match(sub1.pages[0].bing, /^Failed — your IndexNow key file is not on your site yet/);
    /* the client puts the key file up (the setup says where); the check sees it; Bing gets the page */
    const inx = await a.get(`/api/products/${id}/indexnow`);
    assert.equal(inx.url, keyFileUrl(base, inx.key)); assert.match(inx.howTo[0], new RegExp(`^Make a plain text file named ${inx.key}\\.txt that holds only this text: ${inx.key}$`));
    assert.match((await a.post(`/api/products/${id}/indexnow/check`, {})).refused, /does not open/);
    s.st.key = inx.key;
    assert.match((await a.post(`/api/products/${id}/indexnow/check`, {})).line, /^Your key file is on your site ✓/);
    const sub2 = await a.post(`/api/products/${id}/do`, { what: "submit" });
    assert.equal(s.st.indexnow.length, 1);
    const sent = s.st.indexnow[0];
    assert.deepEqual([sent.host, sent.key, sent.keyLocation], [new URL(base).host, inx.key, `${base}/${inx.key}.txt`]);
    assert.ok(sent.urlList.length >= 1 && sent.urlList.every((u) => u.startsWith(`${base}/`)), JSON.stringify(sent.urlList));
    assert.match(sub2.pages[0].bing, /^Submitted ✓ \(\d{4}-\d{2}-\d{2}\) — IndexNow$/);
    const W = (await a.get(`/api/products/${id}/overview`)).willDo;
    assert.match(W.lines[3].status, /^Google: \d+ of \d+ · Bing: \d+ of \d+$/);
    assert.ok((await a.get(`/api/products/${id}/overview`)).since.some((d) => /^Submitted /.test(d.what)), "what was done is not listed");
    /* the plan as a document the client keeps */
    const saved = await a.post(`/api/products/${id}/plan/save`, {});
    assert.match(saved.line, /^Saved ✓ — .*Action plan - Fixture Prep - \d{4}-\d{2}-\d{2}\.html\. Open it in your browser or in Word\.$/);
    const doc = readFileSync(saved.file, "utf8"); for (const h of ["What I will do for you", "This week — the 5 things with the most effect", "Keywords to use", "shown 40 times in Google search"]) assert.ok(doc.includes(h), h);
    /* the screen: What I will do for you, What to fix first = the plan, Problem / Solution / Ready to use */
    const ui = await screen(a.url); ui.api.set(id, await ui.api.get(`/api/products/${id}/state`)); ui.el("#ov"); await ui.api.overview();
    const shown = ui.el("#ov").innerHTML;
    for (const x of ["What I will do for you", "Do it for me", "What to fix first — this week", "<b>Problem:</b>", "<b>Solution:</b>", "Ready to use", "Save the action plan as a document", "Keywords to use", HONEST]) assert.ok(shown.includes(x), x);
    /* AlmiWorld's own product: shown, never published or submitted */
    const aw = (await a.post("/api/products", { name: "almiworld youtube", goal: { grow: "youtube", hasWebsite: false } })).product.id;
    await a.post(`/api/products/${aw}/youtube`, { handle: "@Almiworld-world" });
    for (const what of ["publish", "submit"]) assert.match((await a.post(`/api/products/${aw}/do`, { what })).refused, /^AlmiWorld's own product: nothing is published or submitted/);
    assert.match((await a.post(`/api/products/${aw}/publish/draft`, { url: "x" })).why, /^AlmiWorld's own product/);
  } finally { a.close(); s.close(); }
});

test("D4 + B7 · THE WEEKLY CHECK: a product whose last check is a week old is checked again by itself while the app is open, its plan made again, and it is listed under what was done; the Overview says how old the check is", async () => {
  const s = clientSite(); const base = await s.listen();
  let a = await app();
  const dir = a.dir;
  try {
    const id = (await a.post("/api/products", { name: "Fixture Prep", site: base, goal: { grow: "website", hasWebsite: true } })).product.id;
    await settle(a, id);
    a.stop(); await new Promise((r) => setTimeout(r, 400));
    const f = join(dir, "products", id, "check.json"), old = new Date(Date.now() - 8 * 864e5).toISOString();
    writeFileSync(f, JSON.stringify({ ...JSON.parse(readFileSync(f, "utf8")), on: old }));
    a = await app({ weeklyFirstMs: 300 }, dir);
    let O; for (let i = 0; i < 300; i++) { O = await a.get(`/api/products/${id}/overview`); if (!O.checking && O.card?.on > old && O.since?.length) break; await new Promise((r) => setTimeout(r, 200)); }
    assert.ok(O.card.on > old, "not checked again");
    assert.ok(O.since.some((d) => d.what === "Weekly check: checked again and made the action plan again."), JSON.stringify(O.since));
    assert.match(O.willDo.weeklyLine, /^Last done: \d{4}-\d{2}-\d{2} · next check: \d{4}-\d{2}-\d{2}\.$/);
    assert.equal((await a.post(`/api/products/${id}/do`, { what: "weekly" })).line, "Weekly check: off.");
    const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
    assert.match(ui, /Your last check is \$\{ageDays === 1 \? "a day" : `\$\{ageDays\} days`\} old — what you changed since is not in it\. <button id="chk2">Check now<\/button>/);
  } finally { a.close(); s.close(); }
});

test("D3 · INDEXNOW speaks Bing's own way: one request with host, key, keyLocation and the site's own addresses only; Bing's refusals said in plain words", async () => {
  const seen = []; const fx = async (u, i) => { seen.push(JSON.parse(i.body)); return { status: 403 }; };
  const r = await indexNow({ urls: ["https://shop.example/a", "https://other.example/b"], key: "k".repeat(32), origin: "https://shop.example", fetchImpl: fx });
  assert.deepEqual(seen[0], { host: "shop.example", key: "k".repeat(32), keyLocation: `https://shop.example/${"k".repeat(32)}.txt`, urlList: ["https://shop.example/a"] });
  assert.equal(r.why, "Bing could not find your key file, or it does not hold the key");
});
