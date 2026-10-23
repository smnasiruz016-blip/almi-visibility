/**
 * RR-314 (owner's live test on Setup-14, 22 Oct 2026).
 * A · "Sign in to YouTube" showed "not a product id: https://accounts.google.com/o/oauth2/v2/" and "This screen could not open": the page's
 *     own function open(id) hid the browser's window.open, so Google's address was opened AS A PRODUCT. Now Google's page opens in the
 *     client's own browser (the app asks the system for it), the app takes Google's answer on 127.0.0.1 and the screen redraws itself.
 * B · the template options on the owner's own channel: no unrelated niche phrase, no empty hook, no brand twice, the family's own names,
 *     one hashtag per meaning, no line cut mid-word, each video linked to its product's page (confirmed once), no hard-coded AI price.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { browserOpener } from "../desktop/open-browser.mjs";
import { productStore } from "../desktop/products.mjs";
import { optionsFor, brandsOf, brandCase, linkSuggestions } from "../desktop/youtube-plan.mjs";
import { channelAdvice, balanced } from "../desktop/youtube-advice.mjs";
import { linkTargetFor } from "../src/video/youtube.mjs";
import { aiLedger } from "../desktop/ai-coach.mjs";

const REPO = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");

test("A1 · ONLY GOOGLE'S SIGN-IN ADDRESS opens in the client's own browser — never another address; the page never hides the browser's own window.open again", () => {
  const ran = [];
  /* the owner: "please use Chrome — Chrome is set to the account": Chrome when it is installed, as one argument (no shell reads the address) */
  const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const open = browserOpener({ spawnImpl: (cmd, args) => { ran.push([cmd, ...args]); return { unref() {} }; }, exists: (p) => p === CHROME });
  assert.equal(open("https://accounts.google.com/o/oauth2/v2/auth?client_id=x&state=y"), "Chrome", "the screen would not say it opened in Chrome");
  assert.deepEqual(ran, [[CHROME, "https://accounts.google.com/o/oauth2/v2/auth?client_id=x&state=y"]], "Google's page did not open in Chrome");
  /* no Chrome on this computer: the system's default browser */
  const ran2 = [];
  browserOpener({ spawnImpl: (cmd, args) => { ran2.push([cmd, ...args]); return { unref() {} }; }, exists: () => false, platform: "win32" })("https://accounts.google.com/o/oauth2/v2/auth?x=1");
  assert.deepEqual(ran2, [["rundll32.exe", "url.dll,FileProtocolHandler", "https://accounts.google.com/o/oauth2/v2/auth?x=1"]]);
  /* a browser that cannot start says so by an 'error' EVENT — it is listened to, so it never ends the app (CI: ECONNRESET in two tests) */
  const heard = [];
  assert.equal(browserOpener({ spawnImpl: () => ({ on: (e, f) => heard.push(e), unref() {} }), exists: (p) => p === CHROME })("https://accounts.google.com/x"), "Chrome");
  assert.deepEqual(heard, ["error"], "a failed browser start would end the app");
  /* not Windows and no Chrome: nothing to start; a test app ("none") never opens a real browser tab */
  const ran3 = [];
  assert.equal(browserOpener({ spawnImpl: (c) => { ran3.push(c); return { unref() {} }; }, exists: () => false, platform: "linux" })("https://accounts.google.com/x"), false);
  assert.equal(browserOpener({ mode: "none", spawnImpl: (c) => { ran3.push(c); return { unref() {} }; }, exists: () => true })("https://accounts.google.com/x"), false);
  assert.deepEqual(ran3, [], "a browser was started");
  for (const bad of ["https://evil.example/auth", "http://accounts.google.com/x", "file:///C:/Windows/notepad.exe", "not a url", "https://accounts.google.com.evil.example/"]) assert.equal(open(bad), false, bad);
  assert.equal(ran.length, 1, "another address was opened");
  /* the cause: a top-level function named open() IS window.open on a page */
  assert.doesNotMatch(UI, /\bfunction open\s*\(/, "a page function named open() hides window.open — Google's address became a product id");
  assert.doesNotMatch(UI, /window\.open\(r\.url/, "the sign-in page is opened inside the app's own window");
  assert.match(UI, /async function openProduct\(id\)/);
  assert.match(UI, /opened in \$\{r\.opened === "Chrome" \? "Chrome" : "your browser"\}/, "the screen does not say the page opened in Chrome");
});

test("A3 · THE BIG ERROR CARD only when the screen is empty — a slip on a screen that opened is one small line, and the screen stays", () => {
  assert.match(UI, /if \(\$\("#app"\)\.children\.length\) \{ const s = document\.createElement\("p"\); s\.id = "slip";/);
  assert.match(UI, /Something on this screen did not work just now — nothing was changed/);
});

test("A4 · WAY 2: no autofill in the Client ID and secret, and a Client ID is checked before it is saved", () => {
  assert.match(UI, /<form autocomplete="off" onsubmit="return false"><label>Client ID \(ends with \.apps\.googleusercontent\.com\)<input id="gid" name="av-client-\$\{Date\.now\(\)\}" autocomplete="off"/);
  assert.match(UI, /<input id="gsec" name="av-secret-\$\{Date\.now\(\)\}" type="password" autocomplete="new-password"/);
  assert.match(UI, /if \(!\/\^\[\\w\.-\]\+\\\.apps\\\.googleusercontent\\\.com\$\/\.test\(id\)\) return note\(\$\("#err"\), "That is not a Client ID/);
});

/* a stand-in for Google: its consent page "allows" at once (as the client would), its token and channel answers are stand-ins */
function standinGoogle(channelId) {
  const seen = [];
  const srv = createServer((q, r) => { const u = new URL(q.url, "http://x"); seen.push(u.pathname);
    if (u.pathname === "/auth") { r.writeHead(302, { location: `${u.searchParams.get("redirect_uri")}?code=standin&state=${encodeURIComponent(u.searchParams.get("state"))}` }); return r.end(); }
    let body = ""; q.on("data", (c) => (body += c)); q.on("end", () => {
      const send = (o) => { r.writeHead(200, { "content-type": "application/json" }); r.end(JSON.stringify(o)); };
      if (u.pathname === "/token") return send({ access_token: "standin-access", expires_in: 3600, refresh_token: "standin-refresh", scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/webmasters.readonly" });
      if (u.pathname === "/youtube/v3/channels") return send({ items: [{ id: channelId, snippet: { title: "Almiworld" } }] });
      r.writeHead(404); r.end("{}");
    }); });
  return { seen, listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => res(`http://127.0.0.1:${srv.address().port}`))), close: () => srv.close() };
}

test("A1 + A2 · END TO END with a stand-in: Sign in to YouTube opens Google's page in the browser, the app takes Google's answer and is signed in — and the same for Search Console", async () => {
  const CH = "UC4Yg3-nLW-2MLxSxdAh_LmQ", g = standinGoogle(CH), base = await g.listen();
  const dir = mkdtempSync(join(tmpdir(), "rr314-app-"));
  const ps = productStore(dir), made = ps.create({ name: "almiworld youtube", site: "https://almiworld.com/" });
  ps.write(made.id, { ...made, setup: { ...made.setup, youtube: { handle: "@almiworld-world", confirmed: { channelId: CH, title: "Almiworld", handle: "@almiworld-world", description: "", on: "2026-10-22" } } } });
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testOpener: "fetch", googleClientId: "standin.apps.googleusercontent.com",
    youtubeTestEndpoints: { auth: `${base}/auth`, token: `${base}/token`, data: `${base}/youtube/v3/`, analytics: `${base}/analytics/`, reporting: `${base}/reporting/` },
    googleTestEndpoints: { auth: `${base}/auth`, token: `${base}/token`, api: `${base}/webmasters/v3/` } }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/_API_KEY$|_TOKEN$|CLIENT_SECRET|APP_PASSWORD/.test(k)));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  try {
    for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
    const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
    const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then((r) => r.json());
    const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
    await post("/api/google/client", { clientId: "standin.apps.googleusercontent.com", secret: "standin-client-secret" });
    assert.equal((await get(`/api/products/${made.id}/youtube/signin`)).signedIn, false);
    const r = await post(`/api/products/${made.id}/youtube/signin`, {});
    assert.equal(r.ok, true, r.refused); assert.equal(r.opened, true, "Google's page was not opened in the browser");
    assert.match(r.url, new RegExp(`^${base}/auth\\?client_id=standin\\.apps\\.googleusercontent\\.com&redirect_uri=http%3A%2F%2F127\\.0\\.0\\.1%3A\\d+%2Foauth%2Fyoutube`));
    let st; for (let i = 0; i < 50; i++) { st = await get(`/api/products/${made.id}/youtube/signin`); if (st.signedIn) break; await new Promise((x) => setTimeout(x, 100)); }
    assert.equal(st.signedIn, true, "the app did not finish the sign-in by itself");
    /* Search Console: the same way */
    const s = await post(`/api/products/${made.id}/google/start`, {});
    assert.equal(s.ok, true, s.refused); assert.equal(s.opened, true);
    let gs; for (let i = 0; i < 50; i++) { gs = await get("/api/google/client"); if (gs.signedIn) break; await new Promise((x) => setTimeout(x, 100)); }
    assert.equal(gs.signedIn, true, "Search Console's sign-in did not finish by itself");
    assert.deepEqual(g.seen.filter((x) => x === "/auth").length, 2);
  } finally { p.kill(); g.close(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
});

/* the owner's own channel, as the app read it on 22 Oct */
const WHAT = "AlmiWorld (almiworld.com) — a family of online products for people preparing for language exams and careers abroad: OET, IELTS, PTE, TOEFL, plus AlmiCV (CV builder) and AlmiStudy. The YouTube channel shows them.";
const MENU = [{ text: "Home", href: "https://almiworld.com/" }, { text: "AlmiCV", href: "https://almicv.almiworld.com/" }, { text: "AlmiPrep", href: "https://almiprep.almiworld.com/" }, { text: "AlmiStudy", href: "https://almistudy.almiworld.com/" }, { text: "Contact Us", href: "https://almiworld.com/contact-us/" }];
const vid = (videoId, title, description = "", more = {}) => ({ videoId, title, description, views: 10, publishedAt: "2026-10-01T00:00:00Z", durationSec: 120, width: 1280, height: 720, tags: [], ...more });
const OWN = [vid("v1", "Cv builder"), vid("v2", "Stop Overpaying for IELTS Coaching — Try This 😱 #shorts", "IELTS coaching can cost hundreds of dollars. AlmiPrep gives you the same preparation from home for about $12/month.\n\nMore tools: AlmiCV builds your CV.", { durationSec: 40, width: 720, height: 1280 }),
  vid("v3", "Almiworld new tutorial", "tutorial almiworld , about products , and how to use them"), vid("v4", "almicv builder"), vid("v5", "creat your cv here")];
const BRANDS = brandsOf({ what: WHAT, menu: MENU.map((m) => m.text), channelTitle: "Almiworld" });
const CTX = { channel: { title: "Almiworld", handle: "@almiworld-world" }, persona: {}, niche: { queries: [{ q: "ielts coaching" }, { q: "cv builder" }, { q: "oet" }, { q: "pte" }] }, summary: null, readOn: "2026-10-22", brands: BRANDS, productUrl: "https://almiworld.com/", productIsChannel: false, relatedPages: [] };
const all = (ctx = CTX) => OWN.map((v) => optionsFor(v, ctx));

test("B1-B5 · THE OWNER'S CHANNEL: no IELTS on a CV video, no empty hook, no brand twice, AlmiCV and Create spelt right, one hashtag per meaning, no #Try", () => {
  const out = all();
  for (const r of out) {
    const text = r.options.map((o) => `${o.title}\n${o.description}\n${o.hashtags.join(" ")}`).join("\n");
    if (/cv/i.test(r.title)) assert.doesNotMatch(text, /IELTS|OET|PTE/i, `${r.title}: another subject mixed in\n${text}`);
    assert.doesNotMatch(text, /Come With Us|Watch This/, `${r.title}: an empty hook on a channel with no vlog`);
    for (const o of r.options) {
      assert.ok((o.title.match(/almiworld/gi) ?? []).length <= 1, `brand twice: ${o.title}`);
      assert.doesNotMatch(o.title, /Almicv|Creat\b/, o.title);
      assert.equal(new Set(o.hashtags.map((h) => h.toLowerCase())).size, o.hashtags.length, `same hashtag twice: ${o.hashtags}`);
      assert.ok(!o.hashtags.some((h) => /^#(Try|Watch|New|This)$/i.test(h)), `an empty hashtag: ${o.hashtags}`);
      assert.doesNotMatch(o.description, /\n{3,}/, "a stack of empty lines");
      assert.match(o.description, /https:\/\/www\.youtube\.com\/@almiworld-world\?sub_confirmation=1/, "a link's own spelling was changed");
    }
  }
  assert.deepEqual(out.map((r) => r.options.length > 0), [true, true, true, true, true], "a video with no option");
  assert.equal(out[3].options[0].title, "AlmiCV Builder | Almiworld");
  assert.equal(out[4].options[0].title, "Create Your CV Here | Almiworld");
  assert.ok(out[3].options[0].hashtags.includes("#AlmiCVBuilder"), out[3].options[0].hashtags);
  assert.equal(brandCase("almicv at https://almicv.almiworld.com/ and @almicv", BRANDS), "AlmiCV at https://almicv.almiworld.com/ and @almicv");
  assert.ok(out[0].options[0].hashtags.includes("#CVBuilder"), `a short name lost its capitals: ${out[0].options[0].hashtags}`);
  /* two tags that differ ONLY in case (no short-name rule makes them one): one tag */
  const sat = optionsFor(vid("s1", "Sat prep | SAT PREP"), { ...CTX, niche: { queries: [] }, brands: new Map() });
  assert.ok(sat.options.length > 0, "no option — the rule was never reached");
  for (const o of sat.options) assert.equal(new Set(o.hashtags.map((h) => h.toLowerCase())).size, o.hashtags.length, `same hashtag twice: ${o.hashtags}`);
  /* B3 is about WORDS: a channel named "D" is not already in "Iceland" (the substring check left that video with no option at all) */
  const d = optionsFor(vid("d1", "Baby Ki Choti Phupo Iceland Pohanch Gayi!"), { channel: { title: "D" }, persona: {}, niche: { queries: [] }, summary: null });
  assert.equal(d.options[0]?.title, "Baby Ki Choti Phupo Iceland Pohanch Gayi! | D", JSON.stringify(d.options.map((o) => o.title)));
});

/* a line is cut when its last word, in the text it came from, goes on — "(almiworld" of "(almiworld.com)" */
function cutLines(lines, sources) {
  const src = sources.join("\n").toLowerCase();
  return lines.filter((l) => { const t = String(l).trim(); if (!t) return false; if (!balanced(t)) return true; const tail = t.toLowerCase().replace(/[.…]+$/, "").slice(-14); const i = src.indexOf(tail); return i >= 0 && /^(\.?[\p{L}\p{N}])/u.test(src.slice(i + tail.length, i + tail.length + 2)); });
}
test("B6 · NO LINE CUT MID-WORD — over EVERY generated line: titles, description lines, hashtags, thumbnails and the channel's own advice (\"AlmiWorld (almiworld\" came back once)", () => {
  const lines = [];
  for (const r of all()) for (const o of r.options) lines.push(o.title, ...o.description.split("\n"), ...o.hashtags, o.thumbnail);
  const adv = channelAdvice({ channel: { title: "Almiworld" }, product: { what: WHAT }, videos: OWN, terms: [], readOn: "2026-10-22" });
  for (const a of Array.isArray(adv) ? adv : adv.items ?? []) lines.push(a.advice);
  const identity = (Array.isArray(adv) ? adv : []).find((a) => a.what === "One-line identity");
  assert.equal(identity?.advice, "AlmiWorld (almiworld.com) — a family of online products for people preparing for language exams and careers abroad", "the identity line is cut, or says the name twice");
  assert.deepEqual(cutLines(lines, [WHAT, ...OWN.flatMap((v) => [v.title, v.description])]), []);
  /* a first sentence whose bracket never closes is no identity line at all */
  const open = channelAdvice({ channel: { title: "Almiworld" }, product: { what: "AlmiWorld (almiworld.com — a family of products for exams" }, videos: OWN, terms: [], readOn: "2026-10-22" });
  assert.equal((Array.isArray(open) ? open : []).find((a) => a.what === "One-line identity"), undefined, "a line with an open bracket was given");
  /* the checker itself catches the owner's line */
  assert.deepEqual(cutLines(["Almiworld: AlmiWorld (almiworld"], [WHAT]), ["Almiworld: AlmiWorld (almiworld"]);
});

test("B7 · EACH VIDEO TO ITS PRODUCT'S PAGE: offered from the site's own menu (AlmiCV for the CV videos, AlmiPrep for IELTS, the home for the rest); after the client's yes, the links follow — an empty word never matches", () => {
  const offer = linkSuggestions({ menuLinks: MENU, videos: OWN, home: "https://almiworld.com/" });
  assert.deepEqual(offer.map((p) => [p.product, p.url, p.videos.length]), [["AlmiCV", "https://almicv.almiworld.com/", 3], ["AlmiPrep", "https://almiprep.almiworld.com/", 1], [null, "https://almiworld.com/", 1]]);
  const rel = offer.filter((p) => p.words.length).map((p) => ({ words: p.words, url: p.url }));
  const to = OWN.map((v) => linkTargetFor(v, { productUrl: "https://almiworld.com/", relatedPages: rel })?.url);
  assert.deepEqual(to, ["https://almicv.almiworld.com/", "https://almiprep.almiworld.com/", "https://almiworld.com/", "https://almicv.almiworld.com/", "https://almicv.almiworld.com/"], "a video linked to the wrong product (the IELTS video's last line mentions AlmiCV)");
  assert.equal(linkTargetFor(OWN[2], { productUrl: null, relatedPages: [{ words: ["x"], url: "https://almicv.almiworld.com/" }] }), null, "a one-letter word matched every video");
  const withLinks = optionsFor(OWN[0], { ...CTX, relatedPages: rel });
  assert.match(withLinks.options[0].description, /AlmiCV: https:\/\/almicv\.almiworld\.com\//);
});

test("B7 · ASKED ONCE: the answer (yes or no) is kept, the offer is not shown again", async () => {
  const { youtubeApp } = await import("../desktop/youtube-app.mjs");
  const { keyStore, memoryBackend } = await import("../desktop/secrets.mjs");
  const dir = mkdtempSync(join(tmpdir(), "rr314-links-")), store = productStore(dir), made = store.create({ name: "almiworld youtube", site: "https://almiworld.com/" });
  try {
    const keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set("YOUTUBE_API_KEY", "standin-youtube-key-000000000000");
    const YT = youtubeApp({ store, dataDir: dir, keys, fetchImpl: async () => { throw new Error("no network in this test"); } });
    /* the owner's channel and site as read: the offer is made from the site's menu … */
    const CH = "UC4Yg3-nLW-2MLxSxdAh_LmQ", today = new Date().toISOString().slice(0, 10);
    store.write(made.id, { ...made, setup: { ...made.setup, product: { ...made.setup.product, what: WHAT }, youtube: { handle: "@almiworld-world", confirmed: { channelId: CH, title: "Almiworld", handle: "@almiworld-world", description: "", on: today } } } });
    const { mkdirSync } = await import("node:fs");
    mkdirSync(join(store.dirOf(made.id), "youtube-raw"), { recursive: true });
    writeFileSync(join(store.dirOf(made.id), "youtube-raw", `videos-${today}.json`), JSON.stringify({ recorded_at: new Date().toISOString(), channelId: CH, videos: OWN.map((v) => ({ ...v, channelId: CH, channelTitle: "Almiworld" })), complete: true }));
    writeFileSync(join(store.dirOf(made.id), "site-read.json"), JSON.stringify({ ok: true, origin: "https://almiworld.com", pages: [], design: { siteName: "almiworld.com", menu: MENU.map((m) => m.text), menuLinks: MENU } }));
    const before = await YT.advice(made.id);
    assert.deepEqual((before.linkOffer ?? []).map((p) => p.product), ["AlmiCV", "AlmiPrep", null], before.refused ?? before.state);
    assert.match(YT.confirmLinks(made.id, { pages: [{ words: ["cv", "almicv"], url: "https://almicv.almiworld.com/" }, { words: ["x"], url: "http://not-https.example/" }] }).line, /^Saved: 1 page/);
    const y = store.read(made.id).setup.youtube;
    assert.deepEqual([y.linksAsked, y.relatedPages], [true, [{ words: ["cv", "almicv"], url: "https://almicv.almiworld.com/" }]]);
    YT.saveSettings(made.id, { handle: "@almiworld-world" });
    assert.equal(store.read(made.id).setup.youtube.linksAsked, true, "saving the settings forgot the answer — the offer would come back");
    assert.equal((await YT.advice(made.id)).linkOffer, null, "… and once answered it is not offered again");
    assert.match(UI, /\$\{signinCard\(a\)\}\$\{linkOfferCard\(a\)\}/); assert.match(UI, /post\(`\$\{U\}\/links`, \{ decline: true \}\)/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("B8 · THE AI PRICE: shown only for a model whose price was read from Anthropic's own page (with the page and the day); the model is the one that ANSWERED; another model → the requests only", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr314-ledger-"));
  try {
    const L = aiLedger(join(dir, "ai.json"));
    L.add({ input: 1000, output: 500, model: "claude-opus-5-5" });
    assert.equal(L.line(), "AI used today: 1 request (model: claude-opus-5-5), about $0.01. This month: about $0.01 of your $10.00 limit. Price: claude-opus-5-5 $4 per million tokens in, $20 out — from Anthropic's pricing page (platform.claude.com/docs/en/about-claude/pricing), read 2026-10-22.");
    const M = aiLedger(join(dir, "ai2.json"));
    M.add({ input: 1000, output: 500, model: "claude-sonnet-5-5" });
    assert.equal(M.line(), "AI used today: 1 request (model: claude-sonnet-5-5). The price is not shown — Visibility has no published price for this model.");
    assert.doesNotMatch(readFileSync(join(REPO, "desktop", "ai-coach.mjs"), "utf8"), /source: "Anthropic's price for Claude Opus 5\.5 — \$4/);
    for (const f of ["ai-write.mjs", "ai-coach.mjs"]) assert.match(readFileSync(join(REPO, "desktop", f), "utf8"), /model: body\.model \?\? AI\.model/, `${f} does not record the model that answered`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
