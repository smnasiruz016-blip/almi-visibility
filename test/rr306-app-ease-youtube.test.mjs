/* RR-306 · APP EASE + YOUTUBE THAT ADVISES (owner decision, 21 Oct 2026). LOCAL only: YouTube's API is answered by a stand-in on 127.0.0.1
 * that records every call (no request leaves the machine); every key here is a fake made for the test; the app's keys are kept in a memory
 * store (config testSecretsInMemory) — the test never touches this computer's Credential Manager. */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { keyStore, memoryBackend, windowsBackend } from "../desktop/secrets.mjs";
import { STEPS, checkStep } from "../desktop/setup.mjs";
import { youtubeApi, videoKind, channelCheck } from "../src/video/youtube.mjs";
import { youtubeAdvice, topicsFromDeclaration, questionsIn, GENERIC_HASHTAGS } from "../desktop/youtube-advice.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FAKE_KEY = "fake-youtube-key-rr306-not-a-secret-9876";

/* ── the stand-in YouTube Data API: two channels with similar handles (the owner's case), paged uploads, search, comments ── */
const vid = (id, title, { sec = 600, w = 640, h = 360, views = 100, description = "", tags = [], at = "2025-06-01T00:00:00Z", channel = "Right World" } = {}) => ({ id, snippet: { title, description, tags, publishedAt: at, channelTitle: channel, channelId: "x" }, contentDetails: { duration: `PT${Math.floor(sec / 60)}M${sec % 60}S` }, statistics: { viewCount: String(views), commentCount: "3" }, player: { embedWidth: String(w), embedHeight: String(h) } });
function fakeYouTube({ ownVideos = 107 } = {}) {
  const calls = [];
  const channels = {
    "@right-world": { id: "UCrightworld000000001", snippet: { title: "Right World", customUrl: "@right-world", thumbnails: { default: { url: "https://example.invalid/p.jpg" } } }, statistics: { subscriberCount: "120", videoCount: String(ownVideos) }, contentDetails: { relatedPlaylists: { uploads: "UUright" } } },
    "@rightworld": { id: "UCotherpeoplechannel01", snippet: { title: "Someone Else's Crafts", customUrl: "@rightworld" }, statistics: { subscriberCount: "999" }, contentDetails: { relatedPlaylists: { uploads: "UUother" } } },
  };
  const own = [vid("own0000001", "CV builder — how to write a CV that gets interviews", { sec: 420, views: 900, description: "Write your CV step by step." }),
    vid("own0000002", "Easy IELTS writing task 2 #viral #fyp", { sec: 45, w: 360, h: 640, views: 300, description: "#viral #fyp" }),
    ...Array.from({ length: ownVideos - 2 }, (_, i) => vid(`own${String(i + 3).padStart(7, "0")}`, `Clip ${i + 3}`, { sec: 30, w: 360, h: 640, views: 1 }))];
  const top = [vid("top0000001", "IELTS writing task 2 band 9 answer", { views: 50000, tags: ["ielts writing task 2", "ielts writing"], channel: "Coach A" }), vid("top0000002", "IELTS writing task 2 tips", { views: 40000, tags: ["ielts writing task 2", "band 9"], channel: "Coach B" }), vid("top0000003", "How to write a CV", { views: 30000, tags: ["cv writing"], channel: "Coach C" })];
  const all = Object.fromEntries([...own, ...top].map((v) => [v.id, v]));
  const srv = createServer((q, r) => {
    const u = new URL(q.url, "http://127.0.0.1");
    const p = u.pathname.replace("/youtube/v3/", "");
    const key = u.searchParams.get("key");
    calls.push({ path: p, params: Object.fromEntries([...u.searchParams].filter(([k]) => k !== "key")), keyOk: key === FAKE_KEY });
    const send = (o) => { r.writeHead(200, { "content-type": "application/json" }); r.end(JSON.stringify(o)); };
    if (key !== FAKE_KEY) { r.writeHead(400); return r.end("{}"); }
    if (p === "channels") { const h = u.searchParams.get("forHandle"); const id = u.searchParams.get("id"); const c = h ? channels[h.toLowerCase()] : Object.values(channels).find((x) => x.id === id); return send({ items: c ? [c] : [] }); }
    if (p === "playlistItems") { const list = u.searchParams.get("playlistId") === "UUright" ? own : []; const start = Number(u.searchParams.get("pageToken") ?? 0); const page = list.slice(start, start + 50); return send({ items: page.map((v) => ({ contentDetails: { videoId: v.id } })), ...(start + 50 < list.length ? { nextPageToken: String(start + 50) } : {}) }); }
    if (p === "videos") return send({ items: u.searchParams.get("id").split(",").map((id) => all[id]).filter(Boolean) });
    if (p === "search") return send({ items: top.map((v) => ({ id: { videoId: v.id } })) });
    if (p === "commentThreads") { const c = (t, likes = 3) => ({ snippet: { topLevelComment: { snippet: { textDisplay: t, likeCount: likes, publishedAt: "2026-10-01T00:00:00Z" } } } }); return send({ items: u.searchParams.get("videoId") === "top0000001" ? [c("How long should a task 2 essay be? Thanks!", 9), c("Great video")] : u.searchParams.get("videoId") === "own0000001" ? [c("Kya CV mein photo lagani chahiye?", 4)] : [] }); }
    r.writeHead(404); r.end("{}");
  });
  return { calls, listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => res(`http://127.0.0.1:${srv.address().port}/youtube/v3/`))), close: () => srv.close() };
}
const fetchVia = (base) => (url, init) => fetch(String(url).replace("https://www.googleapis.com/youtube/v3/", base), init);

test("A3 · KEYS: a pasted key is kept in the secure store and shown only as \"saved ✓ (ends …1234)\"; replace and remove work; the environment is a fallback by NAME; the Windows call carries the key on stdin only, never on its command line", () => {
  const ks = keyStore({ backend: memoryBackend(), env: {} });
  assert.deepEqual(ks.status("YOUTUBE_API_KEY"), { saved: false, where: "not saved", ends: null });
  assert.equal(ks.set("YOUTUBE_API_KEY", "short").ok, false);
  assert.equal(ks.set("YOUTUBE_API_KEY", "has a space inside it").ok, false);
  assert.equal(ks.set("YOUTUBE_API_KEY", `  ${FAKE_KEY}  `).ok, true);
  const st = ks.status("YOUTUBE_API_KEY");
  assert.deepEqual([st.saved, st.ends], [true, "9876"]);
  assert.ok(!JSON.stringify(st).includes(FAKE_KEY.slice(0, -4)), "the status carried the key");
  assert.equal(ks.get("YOUTUBE_API_KEY"), FAKE_KEY);
  ks.remove("YOUTUBE_API_KEY");
  assert.equal(ks.status("YOUTUBE_API_KEY").saved, false);
  assert.match(keyStore({ backend: null, env: { YOUTUBE_API_KEY: FAKE_KEY } }).status("YOUTUBE_API_KEY").where, /found in this computer's settings/);
  assert.equal(keyStore({ backend: null, env: {} }).set("YOUTUBE_API_KEY", FAKE_KEY).ok, false, "a key was 'saved' with no secure store");
  /* the Windows backend: what it sends is the operation + base64 on STDIN; the program and its arguments are fixed (no key in them) */
  const seen = [];
  const wb = windowsBackend({ run: (input) => { seen.push(input); return { status: 0, stdout: "ok" }; } });
  wb.set("YOUTUBE_API_KEY", FAKE_KEY);
  assert.equal(seen.length, 1);
  assert.ok(!seen[0].includes(FAKE_KEY) && seen[0].includes(Buffer.from(FAKE_KEY).toString("base64")), "the key went in clear, or not at all");
  assert.doesNotMatch(readFileSync(join(REPO, "desktop", "secrets.mjs"), "utf8"), /writeFileSync|appendFileSync|console\.log/, "the key store writes a file or a log");
});

test("A2 · SKIP: Search data, Your AI connection and YouTube are optional — \"Skip / not now\" is accepted for them only; the AI step takes a provider (its key pasted), never a variable NAME typed by the client", () => {
  assert.deepEqual(STEPS.filter((s) => s.optional).map((s) => s.id), ["searchData", "aiConnection", "youtube"]);
  for (const id of ["searchData", "aiConnection", "youtube"]) assert.equal(checkStep(id, { skipped: true }), null, id);
  assert.equal(checkStep("aiConnection", { provider: "anthropic" }), null);
  assert.match(checkStep("aiConnection", { provider: "made-up" }), /Choose your AI provider/);
  assert.doesNotMatch(STEPS.find((s) => s.id === "aiConnection").ask, /environment|variable|NAME/);
  assert.doesNotMatch(STEPS.find((s) => s.id === "youtube").ask, /environment|variable|NAME/);
});

test("B1 + B4 · THE EXACT HANDLE ONLY, and EVERY PAGE: a handle is looked up with forHandle (never search); an answer for another handle is refused; not found says so; all 107 videos are read over 3 pages", async () => {
  const yt = fakeYouTube(); const base = await yt.listen();
  try {
    const api = youtubeApi({ key: FAKE_KEY, fetchImpl: fetch, apiBase: base });
    assert.equal((await api.lookupHandle("@nobody-here")).line, "Channel not found — check the @handle (@nobody-here).");
    const right = await api.lookupHandle("@right-world");
    assert.deepEqual([right.found, right.channelId, right.title, right.subscribers], [true, "UCrightworld000000001", "Right World", 120]);
    assert.equal((await api.lookupHandle("not-a-handle")).found, false);
    /* a stand-in that answers ANOTHER channel for a handle → refused, never used */
    const liar = youtubeApi({ key: FAKE_KEY, apiBase: base, fetchImpl: async () => new Response(JSON.stringify({ items: [{ id: "UCx0000000001", snippet: { title: "Someone", customUrl: "@someone" } }] })) });
    assert.match((await liar.lookupHandle("@right-world")).line, /YouTube answered with another channel \(@someone\) — not used/);
    const all = await api.allVideos(right.channelId, right);
    assert.deepEqual([all.videos.length, all.pages, all.complete], [107, 3, true]);
    assert.equal(yt.calls.filter((c) => c.path === "search").length, 0, "a channel was found or read through search");
    assert.ok(yt.calls.every((c) => c.keyOk));
  } finally { yt.close(); }
});

test("B5 + B6 · SHORTS APART, THE RIGHT LINK: a vertical video up to 3 minutes (after 15 Oct 2024; 60 s before) is a Short — never told to add chapters; the link check skips a product that IS the channel, and checks a related product page when the video is about it", () => {
  const v = (o) => ({ videoId: "v", title: "t", description: "d", publishedAt: "2025-05-01T00:00:00Z", ...o });
  assert.deepEqual([videoKind(v({ durationSec: 45, width: 360, height: 640 })), videoKind(v({ durationSec: 150, width: 360, height: 640 })), videoKind(v({ durationSec: 150, width: 360, height: 640, publishedAt: "2024-05-01" })), videoKind(v({ durationSec: 120, width: 640, height: 360 })), videoKind(v({ durationSec: 240, width: 360, height: 640 })), videoKind(v({ durationSec: 45 }))], ["SHORT", "SHORT", "LONG", "LONG", "LONG", "UNKNOWN"]);
  const short = v({ durationSec: 40, width: 360, height: 640, description: "a short" }), long = v({ videoId: "L", durationSec: 600, width: 640, height: 360, title: "How to write a CV", description: "all about cv writing" });
  const [s, l] = channelCheck([short, long], { productUrl: "https://www.youtube.com/@right-world", productIsChannel: true });
  assert.ok(!s.findings.some((f) => /chapters/.test(f)), "a Short was told to add chapters");
  assert.ok(l.findings.some((f) => /no chapters/.test(f)));
  assert.ok(![...s.findings, ...l.findings].some((f) => /link/.test(f)), "a product that IS the channel was told to link to itself");
  const [, l2] = channelCheck([short, long], { productUrl: "https://www.youtube.com/@right-world", productIsChannel: true, relatedPages: [{ words: ["cv"], url: "https://cv.example.test" }] });
  assert.ok(l2.findings.includes("no link to your related page for \"cv\" (https://cv.example.test)"));
});

test("C · ADVICE THAT NAMES ITS SOURCE: main words first, a description with the key words and the right link, chapters for long videos only, relevant hashtags for generic ones, a thumbnail idea — each with where it came from; new video ideas from unanswered questions; not enough data is said plainly", () => {
  assert.deepEqual(questionsIn("Great video! How long should a task 2 essay be? Thanks"), ["How long should a task 2 essay be?"]);
  assert.ok(topicsFromDeclaration("YouTube channel of AlmiWorld: videos about language exam preparation and career products (OET, IELTS, PTE, CV and more).").includes("IELTS"));
  const own = [{ videoId: "a", title: "Easy IELTS writing task 2 #viral #fyp", description: "#viral #fyp", durationSec: 45, width: 360, height: 640, publishedAt: "2025-06-01", views: 300, tags: [] },
    { videoId: "d", title: "Our trip", description: "", durationSec: 400, width: 640, height: 360, publishedAt: "2025-06-01", views: 40, tags: ["ielts writing task 2"] },
    { videoId: "c", title: "Band 9 tips", description: "IELTS writing task 2 in five steps", durationSec: 400, width: 640, height: 360, publishedAt: "2025-06-01", views: 50, tags: [] },
    { videoId: "b", title: "My week", description: "", durationSec: 600, width: 640, height: 360, publishedAt: "2025-06-01", views: 10, tags: [] }];
  const research = { readOn: "2026-10-21T10:00:00Z", topics: [{ q: "IELTS writing", videos: [{ title: "IELTS writing task 2 band 9 answer", tags: ["ielts writing task 2"], views: 5 }, { title: "IELTS writing task 2 tips", tags: ["ielts writing task 2"], views: 4 }] }],
    comments: [{ text: "How long should a task 2 essay be?", own: false, videoTitle: "IELTS writing task 2 tips", channelTitle: "Coach", publishedAt: "2026-10-01", likes: 9 }, { text: "Kya band 9 ke liye vocabulary zaroori hai?", own: false, videoTitle: "x", channelTitle: "y", publishedAt: "2026-10-02", likes: 2 }, { text: "Kya IELTS writing mein band 9 mushkil hai", own: false, videoTitle: "x", channelTitle: "y", publishedAt: "2026-10-02", likes: 1 }, { text: "Има ли слушатели?", own: false, videoTitle: "z", channelTitle: "z", publishedAt: "2026-10-02", likes: 50 }] };
  const a = youtubeAdvice({ product: { name: "P", what: "IELTS writing help", languages: ["en"] }, channel: { title: "Right World" }, videos: own, research, productUrl: "https://ielts.example.test", readOn: "2026-10-21" });
  const first = a.perVideo.find((v) => v.videoId === "a");
  const by = (w) => first.items.find((i) => i.what === w);
  /* the phrase in the top videos' own spelling, main words first */
  /* the main words already in the title: move them to the start (nothing invented); in the description only: put them first */
  assert.match(by("Title").advice, /^Move the main words "IELTS writing task 2" to the start of the title/);
  assert.equal(a.perVideo.find((v) => v.videoId === "c").items.find((i) => i.what === "Title").advice, "IELTS writing task 2 — Band 9 tips");
  /* RR-307 (owner, RR-306 defect 1): in the video's own tags only → "not enough research", and NO title, description, hashtag or thumbnail advice from them */
  const d = a.perVideo.find((v) => v.videoId === "d");
  assert.match(d.notEnough, /^Not enough research for this video yet — its own tags mention "IELTS writing task 2", but its title and description do not/);
  assert.deepEqual(d.items.filter((i) => ["Title", "Description", "Hashtags", "Thumbnail text"].includes(i.what)), []);
  assert.match(by("Title").from, /YouTube search "IELTS writing" — used by 2 of its top 2 videos \(read 2026-10-21\)/);
  assert.match(by("Description").advice, /More: https:\/\/ielts\.example\.test/);
  assert.match(by("Hashtags").advice, /^Replace #viral #fyp — they say nothing about this video — with #IELTSWritingTask2 /);
  assert.equal(by("Chapters").advice, "None — Shorts have no chapters.");
  assert.ok(by("Thumbnail text").advice.length > 0);
  for (const i of first.items) assert.ok(i.from && i.from.length > 5, `advice with no source: ${i.what}`);
  const week = a.perVideo.find((v) => v.videoId === "b");
  assert.match(week.notEnough, /^Not enough research for this video yet — none of the researched phrases or questions share its words. Here is how to get it:/);
  assert.match(week.items.find((i) => i.what === "Chapters").advice, /first line "00:00 Introduction".*at least 3.*10 seconds/);
  /* kept: a relevant Roman-Urdu question (no "?" needed); left out: one about nothing the product covers, and one in a script its languages do not use */
  assert.deepEqual(a.questions.map((q) => q.text), ["How long should a task 2 essay be?", "Kya IELTS writing mein band 9 mushkil hai?"]);
  /* a new idea only where no video of the channel answers it: "Easy IELTS writing task 2" already covers IELTS writing */
  assert.deepEqual(a.ideas.map((i) => i.title), ["How long should a task 2 essay be?"]);
  assert.match(a.ideas[0].from, /a comment under the video "IELTS writing task 2 tips" \(Coach\), 2026-10-01/);
  assert.equal(a.invented, 0);
  assert.ok(GENERIC_HASHTAGS.has("viral") && GENERIC_HASHTAGS.has("fyp"));
  const none = youtubeAdvice({ product: { what: "" }, channel: { title: "C" }, videos: own, research: null, readOn: "2026-10-21" });
  assert.match(none.notEnough[0], /Research has not run yet/);
});

/* ── the whole app, on this computer ── */
async function app(dataExtra = {}) {
  const yt = fakeYouTube(); const base = await yt.listen();
  const dir = mkdtempSync(join(tmpdir(), "rr306-app-"));
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", youtubeApiBase: base, ...dataExtra }));
  const env = { ...process.env }; delete env.YOUTUBE_API_KEY;
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  for (let i = 0; i < 80 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const post = (path, o, headers = {}) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(o) }).then(async (r) => ({ ...(await r.json()), http: r.status }));
  const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
  const files = () => { const out = []; const walk = (d) => { for (const n of readdirSync(d, { withFileTypes: true })) n.isDirectory() ? walk(join(d, n.name)) : out.push(readFileSync(join(d, n.name), "utf8")); }; walk(dir); return out.join("\n"); };
  return { url, post, get, dir, yt, files, close: () => { p.kill(); yt.close(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}
async function owner(a) {
  /* the app is owned by its company with a licence the test makes valid: an owner licence is not needed — setup routes need a plan, so the test uses a product made through the store directly */
  const { productStore } = await import("../desktop/products.mjs");
  const s = productStore(a.dir);
  s.setCompany({ name: "Fixture Co", site: "https://fixture.example.test" });
  const p = s.create({ name: "Right World", site: "https://www.youtube.com/@right-world" });
  const st = s.read(p.id); st.setup.product.what = "Videos about IELTS writing and CV writing (IELTS, CV)."; st.started = true; s.write(p.id, st);
  return p.id;
}

test("B2 + B3 · THE OWNER'S CASE: a similar handle of ANOTHER channel (@rightworld for @right-world) is shown with its name and a warning before anything is read; nothing is read until \"Yes\"; after Yes the channel is read by its ID only — and all its videos", async () => {
  const a = await app();
  try {
    const id = await owner(a);
    assert.equal((await a.post("/api/keys/YOUTUBE_API_KEY", { key: FAKE_KEY })).http, 200);
    assert.equal((await a.post(`/api/products/${id}/youtube`, { handle: "@rightworld" })).http, 200);
    const wrong = await a.post(`/api/products/${id}/youtube/lookup`, { handle: "@rightworld" });
    assert.deepEqual([wrong.found, wrong.title, wrong.subscribers], [true, "Someone Else's Crafts", 999]);
    assert.match(wrong.mismatch, /your product's address is https:\/\/www\.youtube\.com\/@right-world, but you typed @rightworld\. They are different channels\./);
    const before = await a.get(`/api/products/${id}/youtube/advice`);
    assert.equal(before.state, "CONFIRM");
    assert.equal(a.yt.calls.filter((c) => c.path === "playlistItems" || c.path === "videos").length, 0, "videos were read before the client confirmed the channel");
    /* the client says No and types the right handle; Yes */
    await a.post(`/api/products/${id}/youtube`, { handle: "@right-world" });
    const right = await a.post(`/api/products/${id}/youtube/lookup`, { handle: "@right-world" });
    assert.equal(right.mismatch, null);
    assert.equal((await a.post(`/api/products/${id}/youtube/confirm`, { handle: "@right-world", channelId: "UCotherpeoplechannel01" })).http, 400, "a channel ID that is not the handle's was confirmed");
    assert.equal((await a.post(`/api/products/${id}/youtube/confirm`, { handle: "@right-world", channelId: right.channelId })).http, 200);
    const n = a.yt.calls.length;
    const adv = await a.get(`/api/products/${id}/youtube/advice`);
    assert.equal(adv.state, "READY");
    assert.equal(adv.channel.videos, 107);
    const reads = a.yt.calls.slice(n);
    assert.ok(reads.some((c) => c.path === "channels" && c.params.id === "UCrightworld000000001"), "the read did not use the channel ID");
    assert.ok(!reads.some((c) => c.params.forHandle), "a read looked the channel up by handle again");
    assert.match(adv.report.join(" "), /read with your API key/);
    assert.doesNotMatch(adv.report.join(" "), /export/);
    /* a changed @handle drops the confirmation */
    await a.post(`/api/products/${id}/youtube`, { handle: "@rightworld" });
    assert.equal((await a.get(`/api/products/${id}/youtube/advice`)).state, "CONFIRM");
  } finally { a.close(); }
});

test("A3 + C1 · IN THE APP: the key is never in a file, a reply or another site's reach (a POST from another origin is refused); research spends YouTube searches only inside the daily cap, shown; the advice names its sources", async () => {
  const a = await app({ youtubeSearchesPerDay: 3 });
  try {
    const id = await owner(a);
    assert.equal((await a.post("/api/keys/YOUTUBE_API_KEY", { key: FAKE_KEY }, { origin: "https://evil.example" })).http, 403);
    const saved = await a.post("/api/keys/YOUTUBE_API_KEY", { key: FAKE_KEY });
    assert.deepEqual([saved.http, saved.ok, (await a.get("/api/keys")).keys.YOUTUBE_API_KEY.ends], [200, true, "9876"]);
    await a.post(`/api/products/${id}/youtube`, { handle: "@right-world" });
    const c = await a.post(`/api/products/${id}/youtube/lookup`, { handle: "@right-world" });
    await a.post(`/api/products/${id}/youtube/confirm`, { handle: "@right-world", channelId: c.channelId });
    const r1 = await a.post(`/api/products/${id}/youtube/research`, {});
    assert.equal(r1.http, 200, r1.refused);
    assert.match(r1.line, /YouTube research today: 3 of 3 searches used \(Visibility's own cap; your key's limit is 100 searches a day\)/);
    const r2 = await a.post(`/api/products/${id}/youtube/research`, {});
    /* RR-307: the topics are found automatically (here: ielts writing, cv writing, CV builder) and the refusal says what was searched today */
    assert.equal(r2.http, 400);
    assert.match(r2.refused, /^Today's research limit is reached \(3 of 3 searches used; this product's share today: 3\)\. It starts again tomorrow\. Topics searched today: ielts writing, cv writing, CV builder\./);
    assert.equal(a.yt.calls.filter((x) => x.path === "search").length, 3);
    const adv = await a.get(`/api/products/${id}/youtube/advice`);
    assert.ok(adv.ideas.some((i) => /How long should a task 2 essay be\?/.test(i.title)), JSON.stringify(adv.ideas));
    const cv = adv.perVideo.find((v) => v.videoId === "own0000001");
    assert.ok(cv.items.length && cv.items.every((i) => i.from), "a piece of advice has no source");
    assert.ok(!a.files().includes(FAKE_KEY), "the key was written to a file");
    assert.ok(!JSON.stringify([adv, await a.get("/api/keys"), await a.get(`/api/products/${id}/youtube`)]).includes(FAKE_KEY), "the key was in a reply");
  } finally { a.close(); }
});

test("A1 + A2 · THE SCREENS: \"Licence saved ✓\" with one big next step; \"Skip / not now\" on optional steps, and a skipped step is kept as skipped; a required step cannot be skipped; every product has Settings", async () => {
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  for (const s of ["Licence saved ✓", "Continue — add your first product", "Continue — go to your products", "Skip / not now", "Is this your channel?", "Yes, this is my channel", "No — change the @handle", "id=\"set\">Settings", "saved ✓ (ends …"]) assert.ok(ui.includes(s), s);
  /* a plan, so setup answers are taken: an owner licence made with a test key the app is told to trust (keysDir — tests only) */
  const { generateKeyPairSync } = await import("node:crypto");
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  const kp = generateKeyPairSync("ed25519");
  const keysDir = mkdtempSync(join(tmpdir(), "rr306-keys-"));
  writeFileSync(join(keysDir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const a = await app({ keysDir, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }) });
  try {
    const id = await owner(a);
    const req = await a.post(`/api/products/${id}/setup`, { id: "product", value: { skipped: true } });
    assert.deepEqual([req.http, req.refused], [400, "This step cannot be skipped."]);
    assert.equal((await a.post(`/api/products/${id}/setup`, { id: "searchData", value: { skipped: true } })).http, 200);
    const AI_KEY = "fake-ai-key-rr306-not-a-secret-4321";
    assert.equal((await a.post(`/api/products/${id}/setup`, { id: "aiConnection", value: { provider: "anthropic", key: AI_KEY } })).http, 200);
    const st = await a.get(`/api/products/${id}/state`);
    assert.deepEqual([st.setup.searchData, st.setup.aiConnection], [{ skipped: true }, { provider: "anthropic", keyName: "ANTHROPIC_API_KEY" }]);
    assert.equal((await a.get("/api/keys")).keys.ANTHROPIC_API_KEY.ends, "4321");
    assert.ok(!a.files().includes(AI_KEY), "the AI key was written to a file");
  } finally { a.close(); rmSync(keysDir, { recursive: true, force: true }); }
});
