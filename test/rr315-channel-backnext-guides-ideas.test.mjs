/**
 * RR-315 (owner's live test on Setup-15, 22 Oct 2026).
 * A · Google's sign-in worked, but Google gave the account's DEFAULT channel, not the brand channel the product needs. Now Google is asked to
 *     show its account / brand-account chooser every time; the app says beforehand which channel to choose; another channel coming back
 *     is said with which came and which is needed, and "Try again — choose …" starts a new sign-in.
 * B · "← Back" on every screen (the window's own history: the same product, tab and step) and "Next →" in step-by-step flows; typed data is
 *     never lost without asking.
 * C · "How to get it" guides in their own window — part of the app, offline, with their own Back / Next.
 * D · ideas and keywords on an exam channel: viewer questions as proper titles, no question about another channel's own content, no place
 *     from the product description, a concrete Q&A idea, no channel or creator name as a keyword, the current year, no life formats.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { productStore } from "../desktop/products.mjs";
import { youtubeSignin } from "../desktop/youtube-signin.mjs";
import { googleConnect } from "../desktop/google-connect.mjs";
import { keyStore, memoryBackend } from "../desktop/secrets.mjs";
import { GUIDES, guidePage } from "../desktop/guides.mjs";
import { questionIdea, usableKeywords, currentYearTerms } from "../desktop/youtube-insights.mjs";
import { ideasFor } from "../desktop/youtube-plan.mjs";
import { newVideoIdeas } from "../desktop/youtube-advice.mjs";
import { nicheSummary } from "../desktop/youtube-niche.mjs";
import { screen } from "./support/ui-screen.mjs";

const REPO = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
const BRAND = "UC4Yg3-nLW-2MLxSxdAh_LmQ", DEFAULT = "UCdefaultKitchenChannel00";
const NAMES = { [BRAND]: "Almiworld", [DEFAULT]: "Kitchen Channel" };

/* ── A ── */
test("A1 · GOOGLE'S CHOOSER EVERY TIME: YouTube and Search Console sign-ins ask Google to show its account / brand-account chooser", () => {
  const keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set("GOOGLE_CLIENT_SECRET", "standin-client-secret");
  const y = youtubeSignin({ keys, config: { googleClientId: "standin.apps.googleusercontent.com" } }).start("p", "http://127.0.0.1:5/oauth/youtube");
  assert.equal(new URL(y.url).searchParams.get("prompt"), "select_account consent", "Google may give the account's default channel without asking");
  const g = googleConnect({ keys, config: { googleClientId: "standin.apps.googleusercontent.com" } }).start("http://127.0.0.1:5/oauth/google");
  assert.equal(new URL(g.url).searchParams.get("prompt"), "select_account consent");
});

test("A2 · SAID BEFOREHAND: the YouTube card names the channel to choose (a brand account under your email) before Chrome opens", () => {
  assert.match(UI, /Google will ask which account or channel\. Choose <b>\$\{esc\(a\.confirmed\.title\)\}<\/b> \(it may be listed as a brand account under your email\)/);
  assert.match(UI, /signinOpened\(\$\("#ytsmsg"\), r, `\$\{r\.choose \?\? ""\}/, "the line shown while Chrome is open does not say which channel to choose");
});

test("A4 · SEVERAL CHANNELS from one sign-in: the product's confirmed channel is kept when Google gives it among them", async () => {
  const keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set("GOOGLE_CLIENT_SECRET", "standin-client-secret");
  const fetchImpl = async (u) => ({ ok: true, json: async () => (/token/.test(u) ? { access_token: "a", refresh_token: "r", scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly" } : { items: [{ id: DEFAULT, snippet: { title: NAMES[DEFAULT] } }, { id: BRAND, snippet: { title: NAMES[BRAND] } }] }) });
  const s = youtubeSignin({ keys, config: { googleClientId: "standin.apps.googleusercontent.com" }, wantOf: () => BRAND, fetchImpl });
  const st = s.start("p", "http://127.0.0.1:5/oauth/youtube");
  const r = await s.finish({ code: "c", state: st.state });
  assert.equal(r.channelId, BRAND, "the default channel was taken although the brand channel was given too");
  assert.deepEqual(r.channels.map((c) => c.title), ["Kitchen Channel", "Almiworld"]);
});

/* a stand-in Google with ONE account and TWO channels: its chooser returns the channel the test "picks" (as the owner would click) */
function twoChannelGoogle() {
  const seen = [], state = { pick: DEFAULT };
  const srv = createServer((q, r) => { const u = new URL(q.url, "http://x");
    if (u.pathname === "/auth") { seen.push({ prompt: u.searchParams.get("prompt"), pick: state.pick }); r.writeHead(302, { location: `${u.searchParams.get("redirect_uri")}?code=${state.pick}&state=${encodeURIComponent(u.searchParams.get("state"))}` }); return r.end(); }
    let body = ""; q.on("data", (c) => (body += c)); q.on("end", () => {
      const send = (o) => { r.writeHead(200, { "content-type": "application/json" }); r.end(JSON.stringify(o)); };
      if (u.pathname === "/token") { const code = new URLSearchParams(body).get("code"); return send({ access_token: `standin-${code}`, expires_in: 3600, refresh_token: "standin-refresh", scope: "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly" }); }
      if (u.pathname === "/youtube/v3/channels" && u.searchParams.get("mine")) { const id = String(q.headers.authorization ?? "").replace("Bearer standin-", ""); return send({ items: [{ id, snippet: { title: NAMES[id] } }] }); }
      r.writeHead(404); r.end("{}");
    }); });
  return { seen, state, listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => res(`http://127.0.0.1:${srv.address().port}`))), close: () => srv.close() };
}
async function app(extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rr315-app-"));
  const ps = productStore(dir), made = ps.create({ name: "almiworld youtube", site: "https://almiworld.com/" });
  ps.write(made.id, { ...made, setup: { ...made.setup, youtube: { handle: "@almiworld-world", confirmed: { channelId: BRAND, title: "Almiworld", handle: "@almiworld-world", description: "", on: "2026-10-22" } } } });
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, googleClientId: "standin.apps.googleusercontent.com", ...extra }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/_API_KEY$|_TOKEN$|CLIENT_SECRET|APP_PASSWORD/.test(k)));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then((r) => r.json());
  const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
  return { id: made.id, url, dir, post, get, close: () => { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}

test("A3 + A5 · END TO END, TWO CHANNELS UNDER ONE ACCOUNT (stand-in): the default channel comes back → refused, saying which came and which is needed, with Try again; Try again → Google's chooser → the brand channel → signed in", async () => {
  const g = twoChannelGoogle(), base = await g.listen();
  const a = await app({ testOpener: "fetch", youtubeTestEndpoints: { auth: `${base}/auth`, token: `${base}/token`, data: `${base}/youtube/v3/`, analytics: `${base}/analytics/`, reporting: `${base}/reporting/` } });
  try {
    await a.post("/api/google/client", { clientId: "standin.apps.googleusercontent.com", secret: "standin-client-secret" });
    const r = await a.post(`/api/products/${a.id}/youtube/signin`, {});
    assert.equal(r.ok, true, r.refused);
    assert.match(r.choose, /^Google will ask which account or channel\. Choose Almiworld \(it may be listed as a brand account under your email\)\.$/);
    let st; for (let i = 0; i < 50; i++) { st = await a.get(`/api/products/${a.id}/youtube/signin`); if (st.signedIn || st.last) break; await new Promise((x) => setTimeout(x, 100)); }
    assert.equal(st.signedIn, false, "another channel was kept");
    assert.match(st.last, /Google gave the channel Kitchen Channel, but this product needs Almiworld\. Nothing was kept\./);
    assert.match(st.last, /Press Try again and, when Google asks which account or channel, choose Almiworld/);
    assert.equal(g.seen[0].prompt, "select_account consent");
    /* the page in the browser: which came, which is needed, and "Try again — choose Almiworld" */
    const again = await fetch(`${a.url}/oauth/youtube/again?product=${a.id}`, { redirect: "manual" });
    assert.equal(again.status, 302); assert.ok(again.headers.get("location").startsWith(`${base}/auth?`), "Try again does not go to Google's chooser");
    g.state.pick = BRAND; // the owner picks the brand channel in Google's chooser
    const page = await fetch(again.headers.get("location")).then((x) => x.text());
    assert.match(page, /Signed in to YouTube ✓/);
    st = await a.get(`/api/products/${a.id}/youtube/signin`);
    assert.equal(st.signedIn, true); assert.equal(st.last, null);
    assert.equal(g.seen.length, 2); assert.equal(g.seen[1].prompt, "select_account consent");
    /* a page that names a wrong channel offers the link back (checked on the stand-in's first answer) */
    g.state.pick = DEFAULT; await a.post(`/api/products/${a.id}/youtube/signout`, {});
    const again2 = await fetch(`${a.url}/oauth/youtube/again?product=${a.id}`, { redirect: "manual" });
    const wrong = await fetch(again2.headers.get("location")).then((x) => x.text());
    assert.match(wrong, /Not connected — another channel came back/); assert.match(wrong, /href="\/oauth\/youtube\/again\?product=[^"]+"[^>]*>Try again — choose Almiworld<\/a>/);
    /* any other failure is not called "another channel" */
    const stale = await fetch(`${a.url}/oauth/youtube?code=x&state=never-started`).then((x) => x.text());
    assert.match(stale, /<h2>Not connected<\/h2>/); assert.doesNotMatch(stale, /another channel|Try again — choose/);
    /* Try again for a product that does not exist is refused */
    assert.equal((await fetch(`${a.url}/oauth/youtube/again?product=nope`, { redirect: "manual" })).status, 400);
  } finally { a.close(); g.close(); }
});

test("A3 · THE APP TAB stops waiting at a refusal and shows it with \"Try again — choose …\"", () => {
  assert.match(UI, /const ytSignedIn = async \(\) => \{ const x = await get\(`\$\{U\}\/signin`\); return x\.signedIn === true \|\| Boolean\(x\.last\); \};/);
  assert.match(UI, /<button id="ytagain">Try again — choose \$\{esc\(a\.confirmed\.title\)\}<\/button>/);
  /* the proof found it: "Try again" pressed on the BROWSER's page — the tab must keep waiting and redraw once signed in */
  assert.match(UI, /if \(\(await get\(`\$\{U\}\/signin`\)\)\.signedIn === true\) \{ clearInterval\(t\); youtubeTab\(\); \}/, "after a refusal the tab stops waiting for good");
});

/* ── B ── */
const SCREEN_FNS = ["home", "planScreen", "youtubeSettings", "company", "addProduct", "setup", "work", "publishScreen", "editScreen", "googleSignInScreen", "googleScreen"];
test("B1 · EVERY SCREEN is a step in the window's history: each screen function records itself first; the Back bar is drawn on every screen after the first", () => {
  for (const f of SCREEN_FNS) assert.match(UI, new RegExp(`async function ${f}\\([^)]*\\) \\{\\n(?:  if \\(typeof thenPublish[^\\n]*\\n)?  if \\(!\\(await here\\("${f}"`), `${f} is not recorded in the history`);
  assert.match(UI, /Object\.assign\(SCREENS, \{ home, planScreen, youtubeSettings, company, addProduct, setup, work, publishScreen, editScreen, googleSignInScreen, googleScreen \}\);/);
  assert.match(UI, /bar\.innerHTML = CUR\?\.depth > 0 \? `<button class="ghost" id="navback" type="button">← Back<\/button>` : "";/);
  assert.match(UI, /\$\("#navback"\)\.onclick = \(\) => history\.back\(\);/);
  assert.match(UI, /<div id="backbar" class="backbar"><\/div>\n<main id="app"><\/main>/);
  /* the step-by-step flows have Next → */
  assert.match(UI, /"Next →"\}<\/button>/); assert.match(UI, /<button class=ghost id=back>← Back<\/button>/);
  assert.match(UI, /Save and publish — Next →" : "Save — Next →"/); assert.match(UI, /Next → Sign in for YouTube/);
});

test("B2 + B3 · BACK RETURNS TO WHERE THE CLIENT WAS (product + tab), and typed data is never lost without asking (on the app's own screens)", async () => {
  const a = await app();
  try {
    const ui = await screen(a.url);
    const S = await a.get(`/api/products/${a.id}/state`);
    ui.api.set(a.id, S);
    await ui.api.work("Overview"); await ui.api.work("YouTube");
    const hs = ui.history.entries;
    assert.deepEqual(hs.slice(-2).map((x) => [x.name, x.args[0], x.P]), [["work", "Overview", a.id], ["work", "YouTube", a.id]]);
    assert.equal(hs.at(-1).depth, hs.at(-2).depth + 1);
    assert.match(ui.el("#backbar").innerHTML, /← Back/);
    /* the same screen drawn again is not a new step */
    await ui.api.work("YouTube"); assert.equal(ui.history.entries.length, hs.length);
    /* Back (the browser's own, or "← Back") → the Overview of the same product */
    ui.api.set(null, null);
    const until = async (ok) => { for (let i = 0; i < 300 && !ok(); i++) await new Promise((r) => setTimeout(r, 50)); }; // up to 15 s on a busy machine
    await ui.popstate(hs.at(-2)); await until(() => /<h2>Overview<\/h2>/.test(ui.app()));
    assert.equal(ui.api.nav().P, a.id); assert.equal(ui.api.nav().CUR.args[0], "Overview");
    assert.match(ui.app(), /<h2>Overview<\/h2>/);
    /* typed and not saved: leaving asks; "Stay" keeps the screen */
    ui.api.typed();
    const before = ui.history.entries.length;
    const leaving = ui.api.work("Monthly report"); await until(() => typeof ui.el("#leaveno").onclick === "function");
    assert.equal(typeof ui.el("#leaveno").onclick, "function", "leaving did not ask");
    assert.match(UI, /<h2>Leave without saving\?<\/h2><p>You typed something on this screen that is not saved yet\./);
    ui.el("#leaveno").onclick(); assert.equal(await leaving, undefined);
    assert.equal(ui.history.entries.length, before, "the screen changed although the client chose Stay");
    assert.equal(ui.api.nav().DIRTY, true, "what was typed is forgotten");
    ui.el("#leaveyes").onclick = null;
    const leaving2 = ui.api.work("Monthly report"); await until(() => typeof ui.el("#leaveyes").onclick === "function");
    ui.el("#leaveyes").onclick(); await leaving2;
    assert.equal(ui.history.entries.at(-1).args[0], "Monthly report"); assert.equal(ui.api.nav().DIRTY, false);
    /* what was typed and then SAVED is not "unsaved" any more: leaving does not ask */
    ui.api.typed(); await ui.api.post("/api/tour", {}); assert.equal(ui.api.nav().DIRTY, false, "a saved screen still asks before leaving");
    await new Promise((r) => setTimeout(r, 1500)); // the screens' own reads finish before the app is closed
  } finally { a.close(); }
});

/* ── C ── */
test("C1 · THREE GUIDES, part of the app (offline): numbered steps with a drawing, their own Back / Next, and \"Never send a key in chat or email\"", () => {
  assert.deepEqual(Object.keys(GUIDES).sort(), ["anthropic-key", "google-client", "youtube-key"]);
  for (const name of Object.keys(GUIDES)) {
    const h = guidePage(name);
    assert.match(h, /Never send a key in chat or email/);
    assert.match(h, /<button class="ghost" id="prev" type="button">← Back<\/button>/); assert.match(h, /<button id="next" type="button">Next →<\/button>/);
    assert.equal((h.match(/<section class="step"/g) ?? []).length, GUIDES[name].steps.length);
    assert.equal((h.match(/<svg class="draw"/g) ?? []).length, GUIDES[name].steps.length, "a step has no drawing");
    assert.doesNotMatch(h, /(?:src|href)="https?:/i, "a guide loads something from the internet");
  }
  const t = (n) => GUIDES[n].steps.map((s) => s.do).join(" ");
  for (const w of ["AlmiVisibility", "Limits", "Change limit", "Create key", "shows it only once", "Your AI connection"]) assert.ok(t("anthropic-key").includes(w), `Anthropic guide: ${w}`);
  for (const w of ["New project", "YouTube Data API v3", "Enable", "Create credentials → API key", "Restrict key", "YouTube settings"]) assert.ok(t("youtube-key").includes(w), `YouTube guide: ${w}`);
  for (const w of ["YouTube Analytics API", "YouTube Reporting API", "Google Search Console API", "External", "Testing", "Test users", "youtube.readonly", "yt-analytics.readonly", "webmasters.readonly", "Desktop app", "Download JSON", "brand channel", "Try again — choose"]) assert.ok(t("google-client").includes(w), `Google client guide: ${w}`);
  assert.ok(t("google-client").includes("choose THIS product's channel, not your personal or default channel"), "the brand-channel note (A) is not in the guide");
  assert.equal(guidePage("nope"), null);
});

test("C2 · \"How to get it\" opens the guide in a NEW window, next to each key and connection", () => {
  assert.match(UI, /window\.open\(`\/guide\/\$\{a\.dataset\.guide\}`, `avguide-\$\{a\.dataset\.guide\}`, "popup,width=820,height=900"\)/);
  assert.match(UI, /<span class="kst">\$\{keyStatus\(st\)\}<\/span> \$\{guideLink\(GUIDE_FOR\[name\]\)\}/, "no guide next to the key boxes");
  assert.match(UI, /\$\("#aiguide"\)\.innerHTML = guideLink\(GUIDE_FOR\[p\.id\]\)/, "no guide next to the AI key");
  assert.match(UI, /\$\{esc\(S\.howTo\.youtube\)\} \$\{guideLink\("youtube-key"\)\}/);
  assert.match(UI, /How to get your client \(once, in Google Cloud\) \$\{guideLink\("google-client"\)\}/);
  assert.match(readFileSync(join(REPO, "desktop", "build.mjs"), "utf8"), /"guides\.mjs"/, "the guides are not in the app package");
});

test("C3 · the app serves each guide (and nothing else under /guide/)", async () => {
  const a = await app();
  try {
    for (const n of Object.keys(GUIDES)) { const r = await fetch(`${a.url}/guide/${n}`); assert.equal(r.status, 200); assert.match(await r.text(), /Never send a key in chat or email/); }
    assert.equal((await fetch(`${a.url}/guide/..%2Fmain`)).status, 404);
    assert.equal((await fetch(`${a.url}/guide/nope`)).status, 404);
  } finally { a.close(); }
});

/* ── D ── (the owner's channel: questions written under other channels' exam videos; reworded here, same shape) */
const CH = { code: "en" }, TOPICS = ["IELTS coaching", "CV builder", "OET", "PTE", "TOEFL"];
const Q = (text, more = {}) => ({ text, source: "a comment", ...more });
test("D1 · VIEWER QUESTIONS → PROPER TITLES; another channel's own content left out; never cut mid-word", () => {
  const t = (q) => questionIdea(q, CH, { topics: TOPICS, year: 2026 })?.title ?? null;
  assert.equal(t(Q("hey, i wanted to ask that we will be able to go back to the reading extracts while answering or do we have to read first and never go back?", { under: "OET 2026 Mock Test", channel: "Other OET" })), "OET: Can You Go Back to the Reading Extracts While Answering? (2026)");
  assert.equal(t(Q("In OET on computer, in Reading section, would they change the texts in reading according to question?")), "OET on Computer: Would They Change the Texts in Reading According to Question? (2026)");
  assert.equal(t(Q("Great video! Can you make please a video about new speaking strategies?", { under: "TOEFL Reading 2026: Tips" })), "TOEFL: New Speaking Strategies (2026)");
  assert.equal(t(Q("Could you please create a full course for PTE Core students?")), "PTE Core Students: Full Course (2026)");
  /* another channel's own content */
  assert.equal(t(Q("what will be the answer of question 18 from reading part A?")), null);
  assert.equal(t(Q("How we analysis oet scores in e2?", { channel: "E2 OET" })), null);
  assert.equal(t(Q("Could you tell me how to prepare the resume in the shown format?")), null);
  assert.equal(t(Q("I am looking for OET test for pharmacist?")), null, "a statement became a title");
  /* the list of ideas never cuts a word */
  const long = "Hey i wanted to ask that we will be able to go back to the reading extracts while answering or do we have to read and then only answer and no going back?";
  /* the same question shifted letter by letter: the 100th character falls inside a word in most of them */
  for (const lead of ["", "A ", "Ab ", "Abc ", "Abcd ", "Abcde "]) {
    const q = `${lead}${long}`, made = newVideoIdeas({ questions: [Q(q)], videos: [] });
    assert.equal(made.length, 1);
    for (const i of made) { const body = i.title.replace(/…$/, ""); assert.equal(i.question, q); assert.ok(body.length <= 100 && q.startsWith(body) && /[\s,.?]/.test(q.charAt(body.length)), `cut mid-word: "${i.title}"`); }
  }
});

test("D2 · NO PLACE FROM THE PRODUCT DESCRIPTION; the Q&A idea says what is answered", () => {
  const summary = { formats: [{ id: "qa", label: "Q&A", title: "Q&A", count: 3, own: 0, medianViews: 900, examples: [{ title: "OET Q&A live", channel: "x", views: 900, publishedAt: "2026-10-01" }] }], medianAll: 500, source: "YouTube search" };
  const fromProduct = { places: ["Pakistan"], placesFromProduct: ["Pakistan"] };
  const tips = { id: "tips", label: "Tips", title: "Study Tips", count: 3, own: 0, medianViews: 800, examples: [{ title: "OET study tips", channel: "x", views: 800, publishedAt: "2026-10-01" }] };
  const ideas = ideasFor({ summary: { ...summary, formats: [...summary.formats, tips] }, videos: [], persona: fromProduct, topics: TOPICS, year: 2026, questions: [Q("Is PTE harder than IELTS?"), Q("Is PTE easier?"), Q("Is OET on paper?")] });
  assert.equal(ideas[0].title, "PTE, IELTS & OET: Your Questions Answered (2026)");
  assert.equal(ideas[1].title, "Study Tips");
  assert.ok(!ideas.some((i) => /Pakistan/.test(i.title)), "a place from the product description was added");
  /* a place the niche's own videos of that format DO name stays — and so does the channel's OWN home (a vlog of life in Denmark) */
  const s2 = { ...summary, formats: [{ ...tips, id: "travel", title: "Travel", examples: [{ title: "Travel in Pakistan vlog", channel: "x", views: 900, publishedAt: "2026-10-01" }] }] };
  assert.match(ideasFor({ summary: s2, videos: [], persona: fromProduct, topics: [], year: 2026 })[0].title, /^Travel in Pakistan/);
  assert.match(ideasFor({ summary: { ...summary, formats: [tips] }, videos: [], persona: { places: ["Denmark"], placesFromProduct: [] }, topics: [], year: 2026 })[0].title, /^Study Tips in Denmark/);
});

test("D3 · KEYWORDS: never a channel or creator name, the current year, near-duplicates merged", () => {
  const research = { niche: [{ q: "PTE", videos: [{ title: "Crack PTE in 1 hour | nakul", channelTitle: "SKILLS PTE ACADEMIC" }, { title: "TOEFL Speaking tips", channelTitle: "linguamarina" }, { title: "PTE Speaking skills that work", channelTitle: "Another Academy" }] }], comments: [] };
  const k = (phrase) => ({ phrase, estimate: "e", source: "s" });
  const out = usableKeywords(["linguamarina", "Skills PTE Academic nakul", "Skills PTE Academic course", "Skills PTE nakul", "PTE Skills Academic", "Skills PTE Academic", "Skills PTE", "skillspte", "PTE Academic", "PTE Speaking", "PTE Speaking Skills", "TOEFL prep 2026", "TOEFL preparation 2026"].map(k), research, TOPICS).map((x) => x.phrase);
  assert.deepEqual(out, ["PTE Academic", "PTE Speaking", "PTE Speaking Skills", "TOEFL prep 2026"]);
  const y = currentYearTerms([{ phrase: "PTE 2025", sources: ["the niche's titles"] }, { phrase: "PTE 2025", sources: ["your file searches.csv"] }], 2026);
  assert.deepEqual(y.map((x) => x.phrase), ["PTE 2026", "PTE 2025"], "a year was changed in a phrase people really searched, or kept in one they did not");
});

test("D5 · IN THE APP'S OWN ADVICE (an exam channel's research): the ideas and keyword ideas the YouTube tab shows follow D1–D3", async () => {
  const { youtubeApp } = await import("../desktop/youtube-app.mjs");
  const { mkdirSync } = await import("node:fs");
  const dir = mkdtempSync(join(tmpdir(), "rr315-ideas-")), store = productStore(dir), made = store.create({ name: "almiworld youtube", site: "https://almiworld.com/" });
  try {
    const keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set("YOUTUBE_API_KEY", "standin-youtube-key-000000000000");
    const YT = youtubeApp({ store, dataDir: dir, keys, fetchImpl: async () => { throw new Error("no network in this test"); } });
    const now = new Date(), today = now.toISOString().slice(0, 10), year = now.getUTCFullYear(), last = year - 1;
    store.write(made.id, { ...made, setup: { ...made.setup, product: { ...made.setup.product, what: "Online preparation for OET, IELTS, PTE and TOEFL, and a CV builder, for people in Pakistan." }, youtube: { handle: "@almiworld-world", confirmed: { channelId: BRAND, title: "Almiworld", handle: "@almiworld-world", description: "", on: today } } } });
    const raw = join(store.dirOf(made.id), "youtube-raw"); mkdirSync(raw, { recursive: true });
    const own = [["o1", "Cv builder"], ["o2", "Almiworld new tutorial"], ["o3", "creat your cv here"]].map(([videoId, title]) => ({ videoId, title, description: "", views: 10, publishedAt: `${today}T00:00:00Z`, durationSec: 120, width: 1280, height: 720, tags: [], channelId: BRAND, channelTitle: "Almiworld" }));
    writeFileSync(join(raw, `videos-${today}.json`), JSON.stringify({ recorded_at: now.toISOString(), channelId: BRAND, videos: own, complete: true }));
    /* every channel's common tags, and each channel's OWN: its name, its presenter's name (only in its tags), last year */
    const TAGS = [`PTE ${last}`, "OET reading", "PTE speaking", "TOEFL speaking"], OWN_TAGS = { "SKILLS PTE ACADEMIC": ["Skills PTE Academic", "Skills PTE nakul"], linguamarina: ["linguamarina"] };
    const nv = (n, title, channelTitle, views) => ({ videoId: `n${n}`, title, description: "", tags: [...TAGS, ...(OWN_TAGS[channelTitle] ?? [])], publishedAt: `${today}T00:00:00Z`, durationSec: 600, views, comments: 5, width: 1280, height: 720, language: "en", channelTitle, channelId: `C${channelTitle.replace(/\W/g, "")}` });
    const vids = [nv(1, `OET ${year} Reading Mock Test`, "E2 OET", 90000), nv(2, `PTE ${last} Speaking tips`, "SKILLS PTE ACADEMIC", 80000), nv(3, "TOEFL Speaking with linguamarina", "linguamarina", 70000), nv(4, `OET Reading tips ${year}`, "OET Helper", 60000), nv(5, "TOEFL Speaking practice", "TOEFL Tutor", 50000), nv(6, `PTE ${last} Speaking full guide`, "PTE Coach", 40000), nv(7, "OET Q&A live", "OET Helper", 30000), nv(8, "PTE questions answered", "PTE Coach", 30000),
      /* a format the channel has not made, that does well — its idea would carry the product's home if the rule were gone */
      nv(9, "My first time taking OET", "OET Helper", 120000), nv(10, "First time PTE attempt", "PTE Coach", 110000),
      /* a research phrase needs 2+ videos: each named channel has two, so its own tags reach the keyword list */
      nv(11, "PTE Writing tips", "SKILLS PTE ACADEMIC", 70000), nv(12, "TOEFL Reading with linguamarina", "linguamarina", 65000)];
    const cm = (text, videoTitle, channelTitle) => ({ text, likes: 3, publishedAt: `${today}T00:00:00Z`, videoId: "n1", own: false, videoTitle, channelTitle });
    writeFileSync(join(raw, `research-${today}.json`), JSON.stringify({ readOn: now.toISOString(), nicheLabel: "OET, PTE, TOEFL", language: "English", languageCode: "en", niche: [{ q: "OET", kind: "top", videos: vids.slice(0, 4), found: 4 }, { q: "PTE", kind: "top", videos: vids.slice(4), found: 4 }, { q: "TOEFL", kind: "top", videos: vids.slice(2, 5), found: 3 }], topics: [{ q: "OET", videos: vids }], comments: [
      cm("hi! what will be the answer of question 18 from reading part A? just one word or two", `OET ${year} Mock Test`, "E2 OET"),
      cm("hey, i wanted to ask that we will be able to go back to the reading extracts while answering or do we have to read first and never go back to the extract?", `OET ${year} Mock Test`, "E2 OET"),
      cm("How we analysis oet scores in e2?", `OET ${year} Mock Test`, "E2 OET"),
    ] }));
    const a = await YT.advice(made.id);
    assert.equal(a.state, "READY", JSON.stringify(a.lines ?? a.refused));
    const titles = a.ideas.map((i) => i.title), kws = a.keywords.map((k) => k.phrase);
    assert.ok(titles.includes(`OET: Can You Go Back to the Reading Extracts While Answering? (${year})`), titles.join(" | "));
    assert.ok(!titles.some((t) => /question 18|e2\b|Pakistan|\b\w\?$/i.test(t)), titles.join(" | "));
    assert.ok(a.ideas.some((i) => i.kind === "FORMAT"), `no format idea to carry a place: ${titles.join(" | ")}`); // the fixture reaches the place rule
    assert.ok(!kws.some((k) => /linguamarina|skills pte/i.test(k) || new RegExp(`\\b${last}\\b`).test(k)), kws.join(" | "));
    assert.ok(kws.includes(`PTE ${year}`) && kws.includes("PTE Speaking"), kws.join(" | ")); // the year made current, the rest kept
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("D4 · NO LIFE FORMATS (Cleaning, Life abroad) for an exam / career channel — kept for a vlog channel", () => {
  const v = (title, n) => ({ videoId: `v${n}`, title, description: "", views: 1000 + n, publishedAt: "2026-10-01T00:00:00Z", channelId: `c${n}`, channelTitle: `C${n}` });
  const vids = [v("Study abroad after IELTS", 1), v("Moving to Canada with OET", 2), v("Organize your CV the right way", 3), v("Cleaning up your resume", 4), v("OET Q&A", 5), v("PTE questions answered", 6)];
  const exam = nicheSummary({ niche: { label: "exams" }, research: { readOn: "2026-10-22T00:00:00Z", niche: [{ q: "OET", kind: "top", videos: vids }], comments: [] }, own: [{ title: "Cv builder", description: "" }] });
  const ids = exam.formats.map((f) => f.id);
  assert.ok(!ids.includes("cleaning") && !ids.includes("life-abroad"), `life formats offered: ${ids.join(", ")}`);
  assert.ok(ids.includes("qa"));
  const vlog = nicheSummary({ niche: { label: "family vlog" }, research: { readOn: "2026-10-22T00:00:00Z", niche: [{ q: "pakistani family vlog", kind: "top", videos: vids }], comments: [] }, own: [] });
  assert.ok(vlog.formats.some((f) => f.id === "cleaning"), "a vlog channel lost its life formats");
});
