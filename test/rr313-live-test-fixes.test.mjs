/**
 * RR-313 (owner, 22 Oct 2026 — his live test). A: "YouTube could not be reached (YouTube answered HTTP 400)" — Google HAD answered: the key
 * saved in Visibility was "not valid"; the key in his computer's settings worked. B: one place to switch Google sign-in on. C: five Overview
 * fixes on "almiworld youtube".
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { youtubeApi, googleReason, plainYouTubeWhy } from "../src/video/youtube.mjs";
import { keyStore, memoryBackend } from "../desktop/secrets.mjs";
import { youtubeApp } from "../desktop/youtube-app.mjs";
import { productStore } from "../desktop/products.mjs";
import { titleOptions } from "../desktop/describe.mjs";
import { directAnswer, problemLine, problemOf, withAreaItems, aiReadiness, fixFirstFrom } from "../desktop/product-check.mjs";
import { subjectOf, willDo, websiteItems } from "../desktop/action-plan.mjs";
import { aeoCheck } from "../desktop/features.mjs";

const REPO = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const BAD = "standin-saved-key-refused-0001", GOOD = "standin-settings-key-works-0002";
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
const KEY_NOT_VALID = { error: { code: 400, message: "API key not valid. Please pass a valid API key.", errors: [{ message: "API key not valid. Please pass a valid API key.", domain: "global", reason: "badRequest" }], status: "INVALID_ARGUMENT", details: [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason: "API_KEY_INVALID" }] } };
const CHANNEL = (h, id) => ({ items: [{ id, snippet: { title: h.slice(1), customUrl: h.toLowerCase(), description: "", thumbnails: {} }, statistics: { subscriberCount: "10", videoCount: "5" }, contentDetails: { relatedPlaylists: { uploads: "UU1" } } }] });
/* Google as the owner met it: the saved key is refused as not valid, the other one answers */
const google = (seen = []) => async (u) => { const url = new URL(u); seen.push({ key: url.searchParams.get("key"), handle: url.searchParams.get("forHandle") }); return url.searchParams.get("key") === GOOD ? json(CHANNEL(url.searchParams.get("forHandle"), "UC4Yg3-nLW-2MLxSxdAh_LmQ")) : json(KEY_NOT_VALID, 400); };

test("A1 · GOOGLE'S OWN REASON is read from the 400 body: keyInvalid (from the message or API_KEY_INVALID), quotaExceeded, accessNotConfigured, a restricted key", () => {
  assert.equal(googleReason(400, KEY_NOT_VALID).kind, "keyInvalid");
  assert.equal(googleReason(400, { error: { message: "API key not valid. Please pass a valid API key.", errors: [{ reason: "badRequest" }] } }).kind, "keyInvalid", "the owner's exact body (reason badRequest) was not read as keyInvalid");
  assert.equal(googleReason(403, { error: { errors: [{ reason: "quotaExceeded" }] } }).kind, "quotaExceeded");
  assert.equal(googleReason(403, { error: { errors: [{ reason: "accessNotConfigured" }] } }).kind, "accessNotConfigured");
  assert.equal(googleReason(403, { error: { details: [{ reason: "API_KEY_SERVICE_BLOCKED" }] } }).kind, "keyRestricted");
  assert.equal(googleReason(500, null).kind, "HTTP 500");
});

test("A3 · PLAIN WORDS: what Google said — never \"could not be reached\" when it answered; \"could not be reached\" only when no answer came", () => {
  assert.match(plainYouTubeWhy({ status: 400, reason: "keyInvalid" }), /^Google did not accept your YouTube key \(reason: keyInvalid — "API key not valid"\) — check the key in Google Cloud/);
  assert.match(plainYouTubeWhy({ status: 403, reason: "quotaExceeded" }), /used up today's free allowance \(reason: quotaExceeded\)/);
  assert.match(plainYouTubeWhy({ status: 403, reason: "accessNotConfigured" }), /YouTube Data API is not switched on/);
  for (const s of [400, 403, 404, 500]) assert.doesNotMatch(plainYouTubeWhy({ status: s, reason: "x" }), /could not be reached/, `HTTP ${s} was called "could not be reached"`);
  assert.match(plainYouTubeWhy(new Error("fetch failed")), /^YouTube could not be reached — no answer came/);
});

test("A2 · THE OWNER'S CASE: the key saved in Visibility is refused as not valid, the key in his computer's settings works — Find my channel finds BOTH channels, and says which key it used", async () => {
  /* the sources, in order: the saved key first, then the settings key; the same key twice is one source; spaces around a settings key are cut */
  const keys = keyStore({ backend: memoryBackend(), env: { YOUTUBE_API_KEY: ` ${GOOD} ` } }); keys.set("YOUTUBE_API_KEY", BAD);
  assert.deepEqual(keys.sources("YOUTUBE_API_KEY").map((x) => [x.where, x.ends]), [["the key saved in Visibility", "0001"], ["the key in this computer's settings (YOUTUBE_API_KEY)", "0002"]]);
  assert.equal(keyStore({ backend: memoryBackend(), env: { YOUTUBE_API_KEY: GOOD } }).sources("YOUTUBE_API_KEY").length, 1);
  const dir = mkdtempSync(join(tmpdir(), "rr313-")), store = productStore(dir);
  try {
    store.create({ name: "almiworld youtube", site: "https://almiworld.com/" }); store.create({ name: "Dhanak Ki Duniya", site: "https://www.youtube.com/@dhanakkiduniya" });
    const ids = store.list().map((p) => p.id), seen = [];
    const YT = youtubeApp({ store, dataDir: dir, keys, fetchImpl: google(seen), config: { youtubeApiBase: "http://127.0.0.1:9/youtube/v3/" } });
    const a = await YT.lookup(ids[0], "@Almiworld-world");
    assert.equal(a.found, true, a.line); assert.equal(a.channelId, "UC4Yg3-nLW-2MLxSxdAh_LmQ");
    assert.equal(a.keySource, "Using the key in this computer's settings (YOUTUBE_API_KEY), ending …0002. The key saved in Visibility, ending …0001, was not accepted by Google (keyInvalid) — paste the working key in YouTube settings to replace it.");
    const d = await YT.lookup(ids[1], "@dhanakkiduniya");
    assert.equal(d.found, true, d.line);
    assert.deepEqual(seen.map((s) => [s.key === GOOD ? "settings" : "saved", s.handle]), [["saved", "@Almiworld-world"], ["settings", "@Almiworld-world"], ["settings", "@dhanakkiduniya"]], "the key that answered was not tried first the next time");
    /* only the saved key, refused: the plain reason, not a crash and not "could not be reached" */
    const only = keyStore({ backend: memoryBackend(), env: {} }); only.set("YOUTUBE_API_KEY", BAD);
    const r = await youtubeApp({ store, dataDir: dir, keys: only, fetchImpl: google(), config: { youtubeApiBase: "http://127.0.0.1:9/youtube/v3/" } }).lookup(ids[0], "@Almiworld-world");
    assert.equal(r.found, false); assert.match(r.line, /^Google did not accept your YouTube key \(reason: keyInvalid/);
    assert.equal(r.keySource, "Using the key saved in Visibility, ending …0001.");
    /* no channel with that handle */
    const none = await youtubeApp({ store, dataDir: dir, keys, fetchImpl: async () => json({ items: [] }), config: { youtubeApiBase: "http://127.0.0.1:9/youtube/v3/" } }).lookup(ids[0], "@nobody-here");
    assert.equal(none.line, "No channel with that @handle (@nobody-here) — check the spelling.");
    /* the settings screen says which key is in use — and the screen draws it, and redraws it after Find my channel */
    assert.match(YT.settings(ids[0]).keySource, /^Using the key in this computer's settings/);
    const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
    assert.match(ui, /<p class="meta" id="ksrc">\$\{esc\(y\.keySource \?\? ""\)\}<\/p>/); assert.match(ui, /if \(c\.keySource\) \$\("#ksrc"\)\.textContent = c\.keySource;/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("A · NEVER THE KEY: Google's message is passed on with every key masked out", async () => {
  const api = youtubeApi({ key: [BAD], apiBase: "http://127.0.0.1:9/youtube/v3/", fetchImpl: async () => json({ error: { message: `The key ${BAD} is blocked`, errors: [{ reason: "forbidden" }] } }, 403) });
  await assert.rejects(api.lookupHandle("@Almiworld-world"), (e) => e.status === 403 && e.googleMessage === "The key <key> is blocked" && !String(e.message).includes(BAD));
});

/* a small app on a fresh data folder (memory keys only) */
async function app() {
  const dir = mkdtempSync(join(tmpdir(), "rr313-app-"));
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true }));
  /* the owner's product as he named it — a raw, lower-case label — with his own words for what it is */
  const ps = productStore(dir), made = ps.create({ name: "almiworld youtube", site: "https://almiworld.com/" });
  ps.write(made.id, { ...made, setup: { ...made.setup, product: { ...made.setup.product, what: "AlmiWorld (almiworld.com) — a family of online products for people preparing for language exams." } } });
  writeFileSync(join(ps.dirOf(made.id), "plan.json"), JSON.stringify({ on: "2026-10-22T00:00:00Z", titles: { new: [], existing: [] }, thisWeek: [], rest: [], make: [], social: [], keywords: [] })); // a plan, so "What I will do" is shown
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/_API_KEY$|_TOKEN$|CLIENT_SECRET|APP_PASSWORD/.test(k)));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  return { url, id: made.id, post:(path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then((r) => r.json()), get: (path) => fetch(`${url}${path}`).then((r) => r.text()), close: () => { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}

test("B1 · ONE PLACE to switch Google sign-in on: off at first; the client is saved (id shown, secret never); the home screen, the YouTube card and Search Console all open the same screen; the JSON file way and the paste way", async () => {
  const a = await app();
  try {
    assert.deepEqual(JSON.parse(await a.get("/api/google/client")), { on: false, clientId: null, secretSaved: false });
    const SECRET = "standin-client-secret-not-shown";
    await a.post("/api/google/client", { clientId: "1234-standin.apps.googleusercontent.com", secret: SECRET });
    const st = await a.get("/api/google/client"), home = await a.get("/api/home");
    assert.deepEqual(JSON.parse(st), { on: true, clientId: "1234-standin.apps.googleusercontent.com", secretSaved: true });
    assert.ok(!st.includes(SECRET) && !home.includes(SECRET), "the secret came back from the app");
    assert.equal(JSON.parse(home).google.on, true);
    /* C3 in the app: the Overview's "What I will do" names the subject, never the raw label */
    const o = JSON.parse(await a.get(`/api/products/${a.id}/overview`));
    assert.equal(o.willDo.lines[0].text, "Create new pages, answering the questions people ask about AlmiWorld's products.");
  } finally { a.close(); }
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.match(ui, /async function googleSignInScreen\(back = null\)/);
  assert.match(ui, /Way 1 — choose the file Google Cloud downloaded/); assert.match(ui, /const c = j\.installed \?\? j\.web \?\? \{\};/); assert.match(ui, /Visibility needs a \\"Desktop app\\" client/);
  assert.match(ui, /Way 2 — paste them/);
  assert.match(ui, /Sign in with Google — YouTube<\/button> <button id="gsc">Sign in with Google — Search Console/);
  assert.match(ui, /Google hasn't verified this app/);
  assert.equal((ui.match(/googleSignInScreen\(/g) ?? []).length, 5, "the screen is not opened from home, YouTube and Search Console (plus its own re-open)");
  assert.doesNotMatch(ui, /For AlmiWorld: switch on Google sign-in/, "the old hidden box is still there");
});

const PAGE = (url, more = {}) => ({ url, title: "T", description: null, h1: "", h2: [], qa: [], structuredTypes: [], ...more });
test("C1 · TITLE: a 71-character main heading gives 2 NEW titles of 10–70 characters from the page's own words — never the present title", () => {
  const o = titleOptions({ h1: "Why Your CV Gets Rejected Before a Human Ever Reads It — the 2026 Truth", h2: ["What an ATS actually does"] }, { siteName: "almiworld.com" });
  assert.deepEqual(o.map((x) => x.text), ["Why Your CV Gets Rejected Before a Human Ever Reads It", "Why Your CV Gets Rejected Before a Human Ever Reads It (2026)"]);
  assert.ok(o.every((x) => x.text.length >= 10 && x.text.length <= 70));
});

test("C2 · DIRECT ANSWER, no word count: right under the question, opening with the answer — a long answer passes; none, a question or a lead-in does not", () => {
  const long = `Yes. ${"word ".repeat(200)}`;
  assert.equal(directAnswer({ a: long }), true, "a long answer was failed — the 120-word rule is back");
  assert.equal(directAnswer({ a: "OET is accepted for Australian visas." }), true);
  for (const a of [null, "", "Great question! Let us see.", "In this article we look at it.", "Why does it matter? Because…", "Let's look at the dates."]) assert.equal(directAnswer({ a }), false, String(a));
  const site = { ok: true, robots: { aiBots: { a: true } }, pages: [PAGE("https://x.test/", { structuredTypes: ["Organization"], qa: [{ q: "Is it accepted?", a: long, from: "a heading on the page" }, { q: "When?", a: null, from: "a heading on the page" }, { q: "Why?", a: "In this article we look at why.", from: "a heading on the page" }] })], readOn: "2026-10-22" };
  assert.equal(aiReadiness(site)[3].line, "1 of 3 question headings have their answer right under them, opening with the answer");
  assert.match(aeoCheck(site).lines.map((l) => l.line).join("\n"), /2 of 3 question headings have no answer right under them that opens with the answer: "When\?", "Why\?"/);
});

test("C3 · THE SUBJECT, never the product's raw name: \"almiworld youtube\" → \"AlmiWorld's products\"", () => {
  const what = "AlmiWorld (almiworld.com) — a family of online products for people preparing for language exams and careers abroad.";
  assert.equal(subjectOf({ what }), "AlmiWorld's products");
  assert.equal(subjectOf({ what: "Dhanak Ki Duniya is a family vlog channel." }), "Dhanak Ki Duniya");
  assert.equal(subjectOf({ what: "" }), "your product");
  assert.equal(subjectOf({ what: "AlmiWorld (almiworld.com) — a family of online products.", name: "almiworld youtube" }), "AlmiWorld's products");
  assert.equal(subjectOf({ what: "", name: "almiworld youtube" }), "your product", "the raw, lower-case label was put in the sentence");
  assert.equal(subjectOf({ what: "Online practice for the Fixture exam.", name: "Fixture Prep" }), "Fixture Prep", "an ordinary first word was taken for a name");
  const w = willDo({ titles: { new: [] }, thisWeek: [], rest: [] }, { product: subjectOf({ what }) });
  assert.equal(w.lines[0].text, "Create new pages, answering the questions people ask about AlmiWorld's products.");
});

test("C4 + C5 · COUNTS AGREE (\"1 page has\", \"1 thing\") and every item shows — the full 38, not the 20 listed; each area carries its items in order", () => {
  assert.equal(problemLine("title", 1), "1 page has a missing, too short or too long title");
  assert.equal(problemLine("one-h1", 38), "38 pages do not have exactly one main heading");
  assert.equal(problemOf("title", 1, 50), "1 of 50 pages has a missing, too short or too long title");
  assert.equal(problemOf("one-h1", 1, 50), "1 of 50 pages does not have exactly one main heading");
  assert.equal(problemLine("image-alt", 1), "1 page: images have no text for people who cannot see them", "one page can hold many images — the line stays plural");
  const plan = { titles: { new: [] }, thisWeek: [{ fixForMe: "structure" }], rest: [] };
  assert.equal(willDo(plan, {}).lines[1].status, "1 thing ready to paste");
  const pages = Array.from({ length: 50 }, (_, i) => PAGE(`https://x.test/p${i}`, { title: "A good title of the right length" }));
  const urls = pages.slice(0, 38).map((p) => p.url);
  /* the card: every page, counted once (a page with two findings is one page), with its area */
  const findings = [...urls.map((url) => ({ check: "one-h1", weight: 5, url })), { check: "one-h1", weight: 5, url: urls[0] }, { check: "title", weight: 5, url: urls[1] }];
  const results = [{ check: "one-h1", category: "CONTENT" }, { check: "title", category: "CONTENT" }];
  const ff = fixFirstFrom(findings, results);
  assert.deepEqual(ff.map((f) => [f.id, f.area, f.count, f.pages.length, f.line]), [["one-h1", "Content", 38, 38, "38 pages do not have exactly one main heading"], ["title", "Content", 1, 1, "1 page has a missing, too short or too long title"]]);
  const items = websiteItems({ card: { fixFirst: [{ ...ff[0], pages: urls.slice(0, 20) }] }, site: { ok: true, pages, readOn: "2026-10-22", sitemap: { found: true } } });
  assert.equal(items[0].problem, "38 of 50 pages do not have exactly one main heading", "the count came from the pages listed, not the full count");
  const items2 = websiteItems({ card: { fixFirst: ff.slice(0, 1) }, site: { ok: true, pages, readOn: "2026-10-22", sitemap: { found: true } } });
  const h1 = items2.find((i) => i.id === "one-h1");
  assert.equal(h1.problem, "38 of 50 pages do not have exactly one main heading");
  assert.equal(h1.ready[0].label, "Pages to fix (all 38)"); assert.equal(h1.ready[0].text.split("\n").length, 38);
  const areas = withAreaItems([{ area: "Content", line: "38 pages to fix" }, { area: "Links", line: "All good" }], [{ id: "one-h1", area: "Content", line: "38 pages do not have exactly one main heading", how: "h" }, { id: "links-resolve", area: "Links", line: "2 pages: links", how: "l" }, { id: "title", area: "Content", line: "1 page has a missing, too short or too long title", how: "t" }]);
  assert.deepEqual(areas[0].items.map((i) => i.id), ["one-h1", "title"]);
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.match(ui, /\$\{a\.items \? `<ol class="items">\$\{a\.items\.map\(\(i\) => `<li class="meta">\$\{esc\(i\.line\)\}/, "the area's items are not drawn");
});
