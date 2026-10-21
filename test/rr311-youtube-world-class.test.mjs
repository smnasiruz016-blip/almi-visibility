/**
 * RR-311 (owner, 21 Oct 2026) — MAKE YOUTUBE WORLD CLASS: the channel's own data (sign-in), advice that starts from it, the niche and the
 * competitors in the channel's language, the AI guard that blocks only real invented facts, Apply → Undo, before → after, the coach and the
 * AI cost. Google (sign-in, YouTube Data, Analytics, Reporting) and the AI are ONE stand-in on 127.0.0.1 (config youtubeApiBase /
 * youtubeTestEndpoints / aiApiBase — tests only); keys live in a memory store. Nothing leaves this computer.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateKeyPairSync } from "node:crypto";
import { inventedIn, checkOptions } from "../desktop/ai-write.mjs";
import { langOf, channelLanguage, questionTitle, ownDataFindings, chaptersFrom, parseVtt, scorecard, newUploads, keywordIdeas, beforeAfter } from "../desktop/youtube-insights.mjs";
import { aiLedger, costOf } from "../desktop/ai-coach.mjs";
import { optionsFor, doFirst } from "../desktop/youtube-plan.mjs";
import { screen } from "./support/ui-screen.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const FAKE_YT = "fake-youtube-key-rr311-1234", FAKE_AI = "fake-ai-key-rr311-5678";
const OWN = "UCdhanakfixture00000001", RIVAL = "UCrivalfixture000000001", OTHER = "UCsomeoneelse0000000001";
const day = (n) => new Date(Date.now() - n * 864e5).toISOString();
const v = (id, title, o = {}) => ({ id, snippet: { title, description: o.description ?? "", tags: [], publishedAt: o.at ?? day(60), channelTitle: o.ch ?? "Dhanak Fixture", channelId: o.cid ?? OWN, defaultAudioLanguage: o.lang ?? "en", categoryId: "22" }, contentDetails: { duration: `PT${o.sec ?? 900}S` }, statistics: { viewCount: String(o.views ?? 1000), commentCount: "2" }, player: { embedWidth: "640", embedHeight: "360" } });
const OWN_VIDEOS = [
  v("ice00000001", "Baby Ki Choti Phupo Iceland Pohanch Gayi!", { views: 12000, description: "Hum sab Iceland gaye, bohot maza aaya." }),
  v("ice00000002", "Iceland mein pehla din | family vlog", { views: 9000 }),
  v("ice00000003", "Iceland ki sardi aur hum", { views: 11000 }),
  ...Array.from({ length: 12 }, (_, i) => v(`hom${String(i).padStart(8, "0")}`, `Ghar ka kaam aur bachon ki masti ${i + 1}`, { views: 2500 + i * 10 })),
  v("eng00000001", "My morning routine as a working mom", { views: 3000 }),
];
const NICHE = [
  v("nic00000001", "Pakistani family Denmark mein — Amma baba ke saath ghar wapis aa gaye", { cid: "UCrajab000000000000001", ch: "Rajab's Family", views: 3500000, lang: "ur" }),
  v("nic00000002", "Our Pakistani family trip to Denmark: how to stay productive", { cid: "UCamerican0000000000001", ch: "Michaela Bento", views: 1000000, lang: "en" }),
  v("nic00000003", "Pakistani family vlog Denmark — bachon ke saath shopping", { cid: "UCrajab000000000000001", ch: "Rajab's Family", views: 2000000, lang: "ur" }),
  v("nic00000004", "A Pakistani family we met in Denmark and Sweden", { cid: "UCkalogeras00000000001", ch: "Kalogeras Sisters", views: 3300000, lang: "en" }),
];
const RIVAL_VIDEOS = [v("riv00000001", "Hamari nayi gaari aa gayi 😍 | Family Vlog", { cid: RIVAL, ch: "Rival Vlogs", views: 50000, at: day(1) }), v("riv00000002", "Eid ki tayari | Family Vlog", { cid: RIVAL, ch: "Rival Vlogs", views: 80000, at: day(8) })];
const VTT = "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nassalam o alaikum aaj hum iceland mein hain\n\n00:03:10.000 --> 00:03:15.000\nyeh dekhiye glacier kitna bara hai\n\n00:06:20.000 --> 00:06:25.000\nab hum hotel wapis ja rahe hain\n\n00:09:30.000 --> 00:09:35.000\nkhana khane ke baad bachon ne khela\n\n00:12:40.000 --> 00:12:45.000\nshukriya dekhne ka, phir milenge\n";

function google() {
  const st = { mine: OWN, snippets: Object.fromEntries(OWN_VIDEOS.map((x) => [x.id, { ...x.snippet }])), puts: [], calls: [], ai: [], searches: [] };
  let base = "";
  const srv = createServer((q, r) => { let body = ""; q.on("data", (c) => (body += c)); q.on("end", () => {
    const u = new URL(q.url, "http://x"), p = u.pathname; st.calls.push(`${q.method} ${p}`);
    const send = (o, code = 200, type = "application/json") => { r.writeHead(code, { "content-type": type }); r.end(typeof o === "string" ? o : JSON.stringify(o)); };
    const bearer = q.headers.authorization === "Bearer fake-access-rr311";
    if (p === "/token") return send({ access_token: "fake-access-rr311", expires_in: 3600, refresh_token: "fake-refresh-rr311", scope: u.search || body.includes("code=") ? "https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.force-ssl" : "" });
    if (p.startsWith("/youtube/v3/")) {
      const what = p.slice(12);
      if (what === "channels" && u.searchParams.get("mine")) return bearer ? send({ items: [{ id: st.mine, snippet: { title: st.mine === OWN ? "Dhanak Fixture" : "Someone Else" } }] }) : send({}, 401);
      if (!bearer && u.searchParams.get("key") !== FAKE_YT) return send({}, 400);
      if (what === "channels") { const h = u.searchParams.get("forHandle"), id = u.searchParams.get("id"); const isRival = h === "@rivalvlogs" || id === RIVAL; return send({ items: [{ id: isRival ? RIVAL : OWN, snippet: { title: isRival ? "Rival Vlogs" : "Dhanak Fixture", customUrl: isRival ? "@rivalvlogs" : "@dhanakfixture", description: "Pakistani family vlogs from Denmark" }, statistics: { subscriberCount: "10", videoCount: "3" }, contentDetails: { relatedPlaylists: { uploads: isRival ? "UUrival" : "UUown" } } }] }); }
      if (what === "playlistItems") return send({ items: (u.searchParams.get("playlistId") === "UUrival" ? RIVAL_VIDEOS : OWN_VIDEOS).map((x) => ({ contentDetails: { videoId: x.id } })) });
      if (what === "videos" && q.method === "PUT") { const j = JSON.parse(body); st.puts.push(j); st.snippets[j.id] = { ...st.snippets[j.id], ...j.snippet }; return send(j); }
      if (what === "videos") { const ids = u.searchParams.get("id").split(","); if (bearer && u.searchParams.get("part") === "snippet") return send({ items: ids.map((id) => ({ id, snippet: st.snippets[id] })) }); return send({ items: ids.map((id) => [...OWN_VIDEOS, ...NICHE, ...RIVAL_VIDEOS].find((x) => x.id === id)).filter(Boolean) }); }
      if (what === "search") { st.searches.push(Object.fromEntries(u.searchParams)); return send({ items: NICHE.map((x) => ({ id: { videoId: x.id } })) }); }
      if (what === "commentThreads") return send({ items: [{ snippet: { topLevelComment: { snippet: { textDisplay: "Sir aap ka family vlog kaise shuru karein?", likeCount: 5, publishedAt: day(3) } } } }, { snippet: { topLevelComment: { snippet: { textDisplay: "Apnar family vlog bhalo naki khub bhalo?", likeCount: 9, publishedAt: day(3) } } } }] });
      if (what === "captions") return bearer ? send({ items: [{ id: "cap1", snippet: { trackKind: "standard", language: "ur" } }] }) : send({}, 401);
      if (what === "captions/cap1") return send(VTT, 200, "text/vtt");
      return send({}, 404);
    }
    if (p === "/analytics/reports") {
      if (!bearer) return send({}, 401);
      const d = u.searchParams.get("dimensions"), rows = (h, rs) => send({ columnHeaders: h.map((name) => ({ name })), rows: rs });
      if (d === "video") return rows(["video", "views", "estimatedMinutesWatched", "averageViewDuration", "averageViewPercentage"], OWN_VIDEOS.map((x) => [x.id, Number(x.statistics.viewCount), 100, 200, 40]));
      if (d === "insightTrafficSourceType") return rows(["insightTrafficSourceType", "views"], [["YT_SEARCH", 600], ["BROWSE", 300], ["SUBSCRIBER", 100]]);
      if (d === "insightTrafficSourceDetail") return rows(["insightTrafficSourceDetail", "views"], [["iceland vlog urdu", 220], ["pakistani family in denmark", 140]]);
      if (d === "country") return rows(["country", "views"], [["PK", 700], ["DK", 200]]);
      if (d === "ageGroup") return rows(["ageGroup", "viewerPercentage"], [["age25-34", 60], ["age35-44", 40]]);
      if (d === "elapsedVideoTimeRatio") return rows(["elapsedVideoTimeRatio", "audienceWatchRatio"], [[0.01, 1], [0.05, 0.45], [0.5, 0.2]]);
      if (d === "day") return rows(["day", "views"], Array.from({ length: 16 }, (_, i) => [day(15 - i).slice(0, 10), i < 15 ? 100 : 160]));
      return send({}, 400);
    }
    if (p === "/reporting/jobs") return bearer ? send({ jobs: [{ id: "j1", reportTypeId: "channel_reach_basic_a1" }] }) : send({}, 401);
    if (p === "/reporting/jobs/j1/reports") return send({ reports: [{ id: "r1", downloadUrl: `${base}/reporting/media/r1` }] });
    if (p === "/reporting/media/r1") return send(`date,channel_id,video_id,video_thumbnail_impressions,video_thumbnail_impressions_ctr\n${day(5).slice(0, 10).replace(/-/g, "")},${OWN},hom00000000,20000,0.01\n${day(5).slice(0, 10).replace(/-/g, "")},${OWN},ice00000001,8000,0.08\n${day(5).slice(0, 10).replace(/-/g, "")},${OWN},ice00000002,6000,0.07\n`, 200, "text/csv");
    if (p === "/v1/messages") {
      const j = JSON.parse(body); st.ai.push(j);
      if (/YouTube coach/.test(j.system)) return send({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ answer: "Aap ki Iceland videos baqi videos se 4 guna zyada dekhi jati hain [3]. Ziada aisi videos banayein.", facts: [3] }) }], usage: { input_tokens: 2000, output_tokens: 300 } });
      const ok = { title: "Meri Purani Iceland Memories — Hum Sab Ke Saath", description: "Pehle din ki Iceland yaadein, hum sab ke saath.\nHum sab Iceland gaye, bohot maza aaya.", hashtags: ["#Iceland", "#FamilyVlog", "#PakistaniFamily"], thumbnail: "ICELAND YAADEIN", names: [], facts: [{ fact: "the family went to Iceland", quote: "Hum sab Iceland gaye" }] };
      const ok2 = { ...ok, title: "Baby Ki Choti Phupo Iceland Pohanch Gayi — Pehla Din", thumbnail: "PHUPO ICELAND" };
      const paris = { ...ok, title: "Baby Ki Phupo Paris Pohanch Gayi", thumbnail: "PARIS TRIP" };
      return send({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ options: [ok, ok2, paris] }) }], usage: { input_tokens: 3000, output_tokens: 600 } });
    }
    if (p === "/auth") return send("<p>Google sign-in stand-in</p>", 200, "text/html");
    send({}, 404); }); });
  return { st, setMine: (id) => (st.mine = id), listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}
async function app(extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rr311-app-"));
  const kp = generateKeyPairSync("ed25519");
  writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testAllowLocalSites: true, keysDir: dir, downloadsDir: join(dir, "downloads"), weeklyFirstMs: 2147483647, youtubeSearchesPerDay: 6, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", ...extra }));
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/_API_KEY$|_TOKEN$|APP_PASSWORD/.test(k)));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  for (let i = 0; i < 100 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then(async (r) => ({ ...(await r.json()), http: r.status }));
  const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
  const raw = (path) => fetch(`${url}${path}`).then((r) => r.text());
  return { url, dir, post, get, raw, close: () => { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}

test("B4 · THE AI GUARD blocks only real facts not in the material — places, people, numbers, claims — and lets ordinary words and Roman-Urdu translation through", () => {
  const material = "VIDEO TITLE: Baby Ki Choti Phupo Iceland Pohanch Gayi!\nVIDEO DESCRIPTION (its own): Hum sab Iceland gaye, bohot maza aaya.";
  assert.deepEqual(inventedIn("Meri Purani Iceland Memories — Pehle Din Ki Yaadein", material), [], "ordinary words were blocked (the owner's finding)");
  assert.deepEqual(inventedIn("Baby Ki Phupo Paris Pohanch Gayi", material), ["Paris"]);
  assert.deepEqual(inventedIn("Iceland Trip 2019 | 3 Days", material), ["2019", "3"]);
  assert.deepEqual(inventedIn("With Aunt Sara", material, { names: ["Sara"] }), ["Sara"]);
  assert.match(inventedIn("x", material, { facts: [{ fact: "they stayed 5 nights", quote: "we stayed five nights" }] })[0], /its source words are not in the material/);
  assert.deepEqual(inventedIn("x", material, { facts: [{ fact: "the family went to Iceland", quote: "Hum sab Iceland gaye" }] }), []);
  const c = checkOptions([{ title: "Iceland Yaadein", description: "(Add one or two sentences saying what happens in this video.) Hum sab Iceland gaye.", hashtags: ["#A1", "#B1", "#C1"], thumbnail: "ICE LAND" }], material);
  assert.match(c.dropped[0].why.join(" "), /a placeholder left in/);
});

test("C1 + C4 · THE CHANNEL'S LANGUAGE: Roman Urdu/Hindi from its own titles (YouTube's 'en' default decides nothing); a Banglish question is left out; a viewer's question becomes a proper title with the original as the source", () => {
  const ch = channelLanguage(OWN_VIDEOS.map((x) => ({ title: x.snippet.title, description: x.snippet.description, language: x.snippet.defaultAudioLanguage })));
  assert.equal(ch.code, "ur-hi"); assert.equal(ch.relevance, "ur");
  assert.equal(langOf("Apnar mote ki mentors bhalo naki barc naki banglay IELTS naki saifurs?"), "bn");
  assert.equal(questionTitle({ text: "Apnar family vlog bhalo naki?", source: "a comment" }, ch), null);
  const t = questionTitle({ text: "sir aap ka family vlog kaise shuru karein", source: "a comment under \"X\"" }, ch);
  assert.equal(t.title, "Aap ka family vlog kaise shuru karein?"); assert.match(t.from, /^a viewer's own question: "sir aap ka family vlog kaise shuru karein" \(a comment under "X"\)$/);
});

test("B1 + B2 · FROM YOUR CHANNEL'S DATA: the topic that beats the channel's own others, with its numbers; with sign-in: the searches that brought viewers, the early drop, and the videos shown a lot but clicked little — ranked by effect", () => {
  const vids = OWN_VIDEOS.map((x) => ({ videoId: x.id, title: x.snippet.title, description: x.snippet.description, views: Number(x.statistics.viewCount), publishedAt: x.snippet.publishedAt, durationSec: 900, width: 640, height: 360 }));
  const f = ownDataFindings(vids, { analytics: { window: "w", searchTerms: [{ term: "iceland vlog urdu", views: 220 }], sources: [{ source: "YT_SEARCH", views: 600 }, { source: "BROWSE", views: 400 }] }, reach: { rows: [{ videoId: "hom00000000", impressions: 20000, ctr: 0.01 }, { videoId: "ice00000001", impressions: 8000, ctr: 0.08 }, { videoId: "ice00000002", impressions: 6000, ctr: 0.07 }] }, retention: { ice00000001: [{ at: 0.01, watching: 1 }, { at: 0.05, watching: 0.45 }] } });
  const lines = f.findings.map((x) => x.line).join("\n");
  assert.match(lines, /Your Iceland videos get \d+(\.\d)?× the views of your other videos \(median 11,000 against 2,5\d\d, 3 videos\)/);
  assert.match(lines, /Search terms that brought viewers: "iceland vlog urdu" \(220\)/);
  assert.match(lines, /Shown a lot, clicked little: "Ghar ka kaam aur bachon ki masti 1" — 20,000 impressions, 1\.0% clicked/);
  assert.match(lines, /Videos where viewers leave in the first 30 seconds: "Baby Ki Choti Phupo Iceland Pohanch Gayi!" \(45% still watching\)/);
  /* ranked by the channel's own numbers, one unit: about how many more views/clicks — impressions × the click-through gap; one more video of a topic; … */
  assert.ok(f.findings.every((x, i, a) => !i || a[i - 1].effect >= x.effect), "not ranked by effect");
  assert.equal(f.findings.find((x) => x.id === "ctr").effect, 1200, "the click-through gap is not impressions × (median − its own)");
  assert.equal(f.findings.find((x) => x.id === "place:Iceland").effect, 11000 - 2560);
  assert.ok(f.findings.every((x) => x.from), "a finding without its source");
});

test("A1 + C2 + C3 + D4 · chapters from captions with the real times; a competitor's scorecard and new uploads; keyword ideas marked 'estimate'; before → after", () => {
  const ch = chaptersFrom(parseVtt(VTT), 780);
  assert.equal(ch.text.split("\n")[0], "0:00 Intro — Assalam o alaikum aaj hum iceland");
  assert.ok(ch.text.split("\n").length >= 3 && ch.text.split("\n").every((l) => /^\d+:\d{2} /.test(l)) && !/\?:\?\?/.test(ch.text));
  const rv = RIVAL_VIDEOS.map((x) => ({ videoId: x.id, title: x.snippet.title, views: Number(x.statistics.viewCount), publishedAt: x.snippet.publishedAt }));
  const sc = scorecard({ title: "Rival Vlogs", channelId: RIVAL }, rv);
  assert.equal(sc.medianViews, 65000); assert.equal(sc.patterns.pipe, 100);
  assert.deepEqual(newUploads(["riv00000002"], rv).map((x) => x.videoId), ["riv00000001"]);
  const k = keywordIdeas({ niche: [{ videos: [{ videoId: "a", title: "Family vlog in Denmark", tags: [], views: 5000, publishedAt: day(3) }, { videoId: "b", title: "Pakistani family vlog", tags: [], views: 1000, publishedAt: day(90) }] }] }, [{ phrase: "family vlog", sources: ["YouTube search"] }]);
  assert.match(k[0].estimate, /^estimate: 2 matching videos in your niche research, median 3,000 views, 1 of them from the last 30 days$/);
  const ba = beforeAfter([{ videoId: "x", on: day(3) }], { daily: { x: Array.from({ length: 18 }, (_, i) => ({ day: day(17 - i).slice(0, 10), views: i < 14 ? 100 : 160 })) } });
  assert.match(ba[0].line, /^Views per day: 1\d\d in the 14 days before → 160 in the 3 days after$/);
  /* a research whose videos were ALL in other languages leaves an empty summary — the YouTube tab must still open (it crashed on the copy) */
  assert.doesNotThrow(() => doFirst({ videos: [], top: [], score: { checks: [] }, summary: { title: "x", empty: "No video in your language was found.", lines: [] }, ideas: [] }));
  /* B5 · the templates keep the video's own words — "Baby Ki Choti Phupo Iceland Pohanch Gayi!", never "Baby in Iceland" */
  const o = optionsFor({ videoId: "ice00000001", title: "Baby Ki Choti Phupo Iceland Pohanch Gayi!", description: "Hum sab Iceland gaye, bohot maza aaya.", views: 1, publishedAt: day(60), durationSec: 900, width: 640, height: 360, tags: [] }, { channel: { title: "Dhanak Fixture", handle: "@dhanakfixture" }, persona: { who: "Pakistani Family" }, niche: { queries: [] }, summary: null });
  assert.ok(o.options.every((p) => /Baby Ki Choti Phupo Iceland Pohanch Gayi/.test(p.title)), JSON.stringify(o.options.map((p) => p.title)));
  assert.ok(o.options.every((p) => !/\(Add |\?:\?\?|#IcelandHum|#BabyKi/.test(`${p.description} ${p.hashtags.join(" ")}`)), JSON.stringify(o.options.map((p) => [p.description, p.hashtags])));
});

test("B6 · THE AI COST: counted from the AI's own token counts at Anthropic's price; the month's cap stops the next request", () => {
  const dir = mkdtempSync(join(tmpdir(), "rr311-ledger-"));
  try {
    let cap = 0.05; const L = aiLedger(join(dir, "ai-usage.json"), { cap: () => cap });
    assert.equal(costOf({ input: 1e6, output: 0 }), 4); assert.equal(costOf({ input: 0, output: 1e6 }), 20);
    L.add({ input: 3000, output: 600 });
    assert.match(L.line(), /^AI used today: 1 request \(about \$0\.02\)\. This month: about \$0\.02 of your \$0\.05 limit\./);
    L.add({ input: 3000, output: 600 }); L.add({ input: 3000, output: 600 });
    assert.equal(L.allowed().ok, false); assert.match(L.allowed().why, /Your AI limit for this month is reached/);
    cap = 10; assert.equal(L.allowed().ok, true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("IN THE APP: research in the channel's language (Urdu) keeps Rajab's Family and leaves the American creators out; sign-in with another channel's account is refused and forgotten; with the right one the channel's own data leads the advice; real chapters from captions; AI options shown with an invented place still blocked; Apply → Undo; AlmiWorld's own channel refused; the coach answers with its source; the screen draws it all", async () => {
  const g = google(); const base = await g.listen();
  const a = await app({ youtubeApiBase: `${base}/youtube/v3/`, aiApiBase: base, googleClientId: "rr311.apps.googleusercontent.com", youtubeTestEndpoints: { auth: `${base}/auth`, token: `${base}/token`, data: `${base}/youtube/v3/`, analytics: `${base}/analytics/`, reporting: `${base}/reporting/` } });
  try {
    await a.post("/api/keys/YOUTUBE_API_KEY", { key: FAKE_YT });
    assert.equal((await a.post("/api/google/client", { clientId: "rr311.apps.googleusercontent.com", secret: "fake-client-secret" })).http, 200);
    const id = (await a.post("/api/products", { name: "Dhanak Fixture", site: "", goal: { grow: "youtube", hasWebsite: false } })).product.id;
    await a.post(`/api/products/${id}/setup`, { id: "product", value: { name: "Dhanak Fixture", site: "", what: "Pakistani family vlog from Denmark" } });
    await a.post(`/api/products/${id}/youtube`, { handle: "@dhanakfixture" });
    const c = await a.post(`/api/products/${id}/youtube/lookup`, { handle: "@dhanakfixture" });
    assert.equal((await a.post(`/api/products/${id}/youtube/confirm`, { handle: "@dhanakfixture", channelId: c.channelId })).http, 200);
    await a.get(`/api/products/${id}/youtube/advice`);
    const r = await a.post(`/api/products/${id}/youtube/research`, {}); assert.equal(r.http, 200, r.refused);
    assert.match(r.line, /^Research done in your channel's language \(Urdu \/ Hindi \(Roman or its own script\)\): \d+ searches .* \(\d+ in other languages left out\)/);
    assert.ok(g.st.searches.every((s) => s.relevanceLanguage === "ur"), JSON.stringify(g.st.searches));
    const research = JSON.parse(readFileSync(join(a.dir, "products", id, "youtube-raw", readdirSync(join(a.dir, "products", id, "youtube-raw")).find((f) => f.startsWith("research-"))), "utf8"));
    const kept = research.niche.flatMap((n) => n.videos.map((x) => x.channelTitle));
    assert.ok(kept.includes("Rajab's Family") && !kept.includes("Michaela Bento") && !kept.includes("Kalogeras Sisters"), JSON.stringify(kept));
    /* the competitors: a suggestion in the language, and one picked by @handle with its new uploads */
    let adv = await a.get(`/api/products/${id}/youtube/advice`);
    assert.ok(adv.competitors.suggestions.some((s) => s.title === "Rival Vlogs" || s.title === "Rajab's Family"), JSON.stringify(adv.competitors.suggestions));
    assert.ok(adv.ideas.every((i) => !/bhalo|apnar/i.test(i.title)), "a Banglish question became an idea");
    assert.equal((await a.post(`/api/products/${id}/youtube/competitor`, { handle: "@rivalvlogs" })).http, 200);
    /* sign-in: another channel's account is refused and forgotten */
    g.setMine(OTHER);
    let s = await a.post(`/api/products/${id}/youtube/signin`, { write: true }); assert.equal(s.http, 200, s.refused);
    let page = await a.raw(`/oauth/youtube?code=one-time&state=${new URL(s.url).searchParams.get("state")}`);
    assert.match(page, /You signed in with the Google account of another channel \(Someone Else\)/);
    assert.equal((await a.get(`/api/products/${id}/youtube/advice`)).signin.signedIn, false);
    /* the right account */
    g.setMine(OWN);
    s = await a.post(`/api/products/${id}/youtube/signin`, { write: true });
    assert.deepEqual(new URL(s.url).searchParams.get("scope").split(" "), ["https://www.googleapis.com/auth/youtube.readonly", "https://www.googleapis.com/auth/yt-analytics.readonly", "https://www.googleapis.com/auth/youtube.force-ssl"]);
    page = await a.raw(`/oauth/youtube?code=one-time&state=${new URL(s.url).searchParams.get("state")}`);
    assert.match(page, /Signed in to YouTube ✓/);
    assert.equal((await a.post(`/api/products/${id}/youtube/signed`, { force: true })).http, 200);
    adv = await a.get(`/api/products/${id}/youtube/advice`);
    assert.deepEqual([adv.signin.signedIn, adv.signin.write], [true, true]);
    const own = adv.ownData.findings.map((f) => f.line).join("\n");
    assert.match(own, /Search terms that brought viewers: "iceland vlog urdu" \(220\)/); assert.match(own, /Shown a lot, clicked little/); assert.match(own, /Your Iceland videos get/);
    /* real chapters from the captions, then in the options */
    const ch = await a.post(`/api/products/${id}/youtube/chapters`, { videoId: "ice00000001" });
    assert.equal(ch.http, 200, ch.refused); assert.match(ch.chapters, /^0:00 Intro — /);
    adv = await a.get(`/api/products/${id}/youtube/advice`);
    const top = adv.top.find((x) => x.videoId === "ice00000001");
    assert.ok(top.options.every((o) => o.description.includes("0:00 Intro — ")), "the real chapters are not in the options");
    /* AI: the owner's own words pass, an invented place is still blocked; counted */
    await a.post(`/api/products/${id}/setup`, { id: "aiConnection", value: { provider: "anthropic", key: FAKE_AI } });
    const w = await a.post(`/api/products/${id}/youtube/write`, { videoId: "ice00000001" });
    assert.equal(w.ok, true, w.why); assert.equal(w.options.length, 2, "the invented place was shown or a good option hidden");
    assert.match(w.options[0].basedOn[0], /^Written with your AI \(Claude, claude-opus-5-5\) from this video's own title, description, captions, your channel's data/);
    assert.match(w.dropped[0].why.join(" "), /Paris/);
    assert.match(g.st.ai[0].messages[0].content, /VIDEO CAPTIONS/); assert.match(g.st.ai[0].messages[0].content, /FROM THE CHANNEL'S OWN DATA/);
    assert.match(w.aiCost, /^AI used today: 1 request/);
    /* Apply: preview first (nothing changed), then applied with the old text kept, then Undo */
    const pre = await a.post(`/api/products/${id}/youtube/apply`, { items: [{ videoId: "ice00000001", title: w.options[0].title, description: w.options[0].description }] });
    assert.equal(pre.preview, true); assert.equal(g.st.puts.length, 0, "a preview changed YouTube");
    assert.equal(pre.rows[0].before.title, "Baby Ki Choti Phupo Iceland Pohanch Gayi!");
    const ap = await a.post(`/api/products/${id}/youtube/apply`, { items: [{ videoId: "ice00000001", title: w.options[0].title, description: w.options[0].description }], confirm: true });
    assert.equal(ap.rows[0].ok, true); assert.equal(g.st.puts.at(-1).snippet.title, w.options[0].title); assert.equal(g.st.puts.at(-1).snippet.categoryId, "22");
    adv = await a.get(`/api/products/${id}/youtube/advice`);
    assert.equal(adv.applied[0].before.title, "Baby Ki Choti Phupo Iceland Pohanch Gayi!");
    const un = await a.post(`/api/products/${id}/youtube/undo`, { videoId: "ice00000001" });
    assert.match(un.line, /^Undone — the old title and description are back on YouTube/); assert.equal(g.st.snippets.ice00000001.title, "Baby Ki Choti Phupo Iceland Pohanch Gayi!");
    /* the coach: an answer from the channel's own facts, with its source */
    const co = await a.post(`/api/products/${id}/youtube/coach`, { question: "mera channel kyun nahien barh raha?" });
    assert.equal(co.ok, true, co.refused); assert.equal(co.sources[0].n, 3); assert.ok(co.sources[0].text && co.sources[0].source);
    assert.match(g.st.ai.at(-1).messages[0].content, /FACTS ABOUT MY CHANNEL:\n\[1\] /);
    assert.match(co.aiCost, /^AI used today: 2 requests/);
    /* the screen */
    const ui = await screen(a.url); ui.api.set(id, await ui.api.get(`/api/products/${id}/state`)); ui.el("#ytbox"); await ui.api.youtubeTab();
    const shown = ui.el("#ytbox").innerHTML;
    for (const x of ["Signed in to YouTube ✓", "From YOUR channel's data", "Keyword ideas — with a demand estimate", "Your competitors", "Rival Vlogs", "Ask the coach about your channel", "Apply to YouTube", "Real chapters from my captions", "Test &amp; Compare", "AI used today"]) assert.ok(shown.includes(x), x);
    /* AlmiWorld's own channel: never changed on YouTube from here */
    const aw = (await a.post("/api/products", { name: "almiworld youtube", goal: { grow: "youtube", hasWebsite: false } })).product.id;
    await a.post(`/api/products/${aw}/youtube`, { handle: "@Almiworld-world" });
    assert.match((await a.post(`/api/products/${aw}/youtube/apply`, { items: [{ videoId: "ice00000001", title: "x" }], confirm: true })).refused, /^AlmiWorld's own channel: nothing is changed on YouTube from here/);
  } finally { a.close(); g.close(); }
});
