/**
 * RR-316 (owner's first REAL signed-in test on Setup-16, 22 Oct 2026: the real Google sign-in worked — Almiworld, signed in ✓).
 * A · the AI guard hid EVERY option of "almicv builder" over "@almiworld-world" — the channel's OWN handle. The channel's own names are
 *     always in the material; "all hidden" never happens; the stand-in set gets the real model's habits.
 * B · "Google did not give the impressions report (409)" — 409 means the job exists; and what Google gave is always said.
 * C · "no captions … within a day" in red for a June video — automatic tracks used, a neutral line.
 * D · "What viewers ask / praise" still had another channel's questions and life formats for an exam niche.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeWithAI, reviewOption, materialOf } from "../desktop/ai-write.mjs";
import { youtubeSignin, REACH_WAIT } from "../desktop/youtube-signin.mjs";
import { ownDataFindings } from "../desktop/youtube-insights.mjs";
import { nicheSummary } from "../desktop/youtube-niche.mjs";
import { productStore } from "../desktop/products.mjs";
import { keyStore, memoryBackend } from "../desktop/secrets.mjs";
import { youtubeApp } from "../desktop/youtube-app.mjs";
import { modelFetch } from "./support/model-standin.mjs";

/* the owner's own AlmiWorld channel, as the app holds it */
const AW = { channel: { title: "Almiworld", handle: "@almiworld-world", description: "AlmiWorld — online preparation for OET, IELTS, PTE and TOEFL, and AlmiCV." }, ownNames: ["https://almiworld.com/", "AlmiWorld", "AlmiCV", "AlmiPrep"], persona: {}, niche: { queries: [{ q: "CV builder" }] }, kind: "SHORT", style: "English", language: "English" };
const CV = { title: "almicv builder", description: "Build your CV with AlmiCV in minutes — a clean CV ready to send." };
const opt = (title, description, more = {}) => ({ title, description: `${description}\nA clean CV, ready to send.`, hashtags: ["#CVBuilder", "#AlmiCV", "#Resume"], thumbnail: "YOUR CV NOW", names: [], facts: [], ...more });
const reply = (options) => new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ options }) }], usage: { input_tokens: 100, output_tokens: 50 } }), { status: 200 });

test("A1 · THE CHANNEL'S OWN NAMES are in every video's material, and its own @handle is never \"a channel your video never names\"", () => {
  const m = materialOf(CV, AW);
  assert.match(m, /^THE CHANNEL'S OWN NAMES \(always allowed — its name, handle, websites and products\): Almiworld, @almiworld-world, https:\/\/almiworld\.com\/, AlmiWorld, AlmiCV, AlmiPrep$/m);
  assert.match(m, /typo suspects[^\n]*\n  the channel's own names|FACT SHEET/); // the fact sheet is there too
  const r = reviewOption(opt("AlmiCV Builder — Your CV in Minutes", "Build your CV with AlmiCV.\nSubscribe: @almiworld-world\nMore: https://almiworld.com/"), m);
  assert.deepEqual(r.hidden, [], JSON.stringify(r.hidden));
  /* the real model's other habits: ordinary words declared as names; a fact quoted in translation — never hidden */
  const r2 = reviewOption(opt("AlmiCV Builder", "Build your CV with AlmiCV in minutes.", { names: ["Meri", "Purani", "Pehle"], facts: [{ fact: "fast", quote: "it takes only a few minutes to make" }] }), m);
  assert.deepEqual(r2.hidden, []); assert.equal(r2.check.length, 1, "a claim in other words is a doubt shown with a note");
  /* a handle of ANOTHER channel is still caught */
  assert.deepEqual(reviewOption(opt("AlmiCV Builder", "Build your CV with AlmiCV.\nThanks @someoneelse"), m).hidden.map((h) => h.what), ["@someoneelse"]);
});

test("A2 · NEVER AN EMPTY VIDEO, NEVER AN INVENTION (RR-317 A, truth first): retried once; if every option still invents, the TEMPLATE options stay with one plain line; a clear invention is hidden in its own option", async () => {
  let call = 0;
  const all = await writeWithAI({ provider: "anthropic", key: "k", video: CV, ctx: AW, base: "http://127.0.0.1:9", fetchImpl: async () => (++call, reply([opt("AlmiCV Builder in Paris", "Build your CV with AlmiCV — in Paris."), opt("AlmiCV by Sara", "Build your CV with AlmiCV.", { names: ["Sara"] })])) });
  assert.equal(call, 2, "no retry");
  assert.deepEqual([all.ok, all.fallback, all.outcome, all.options], [false, true, "templates instead", undefined], "an invented place or person was shown");
  assert.equal(all.why, "Your AI's options named something that is not in this video (e.g. Paris) — the ready options here are from your own words.");
  call = 0;
  const one = await writeWithAI({ provider: "anthropic", key: "k", video: CV, ctx: AW, base: "http://127.0.0.1:9", fetchImpl: async () => (++call === 1 ? reply([opt("AlmiCV Builder", "Build your CV with AlmiCV in minutes."), opt("AlmiCV Builder in Paris", "Build your CV with AlmiCV — in Paris.")]) : reply([opt("AlmiCV Builder in Paris", "Build your CV with AlmiCV — in Paris.")])) });
  assert.deepEqual(one.options.map((o) => o.title), ["AlmiCV Builder"]); assert.deepEqual(one.dropped.map((d) => d.hidden), [["Paris"]]);
});

test("A3 · THE TEST SET WITH THE REAL CASES (a stand-in with the real model's habits: the channel's handle, its products, \"Meri/Purani/Pehle\" as names, translation, the 2018 fix): all hidden 0; an invented place is never shown without its note", async () => {
  const DK = { channel: { title: "Dhanak Ki Duniya", handle: "@dhanakkiduniya", description: "Pakistani mom in Denmark" }, persona: { who: "Pakistani Mom" }, niche: { queries: [] }, kind: "LONG", style: "Roman Urdu/Hindi", language: "Urdu / Hindi (Roman or its own script)" };
  const T = ["Ghar ka kaam aur bachon ki masti", "Iceland ki sardi aur hum", "Eid ki tayari | family vlog", "Sunday cleaning reset", "Baby Ki Choti Phupo Iceland Pohanch Gayi!", "Ammi ka birthday | daily vlog"];
  const set = [
    ...Array.from({ length: 30 }, (_, i) => ({ v: { title: `${T[i % T.length]} ${i + 1}`, description: i % 5 === 0 ? "these videos are my old travel videos from year 2016, 2017, 1018" : i % 7 === 0 ? "Hum sab togather, bohot maza aaya." : "Hum sab ne bohot maza kiya, ghar mein masti." }, ctx: DK })),
    /* the owner's real cases */
    { v: CV, ctx: AW }, { v: { title: "Cv builder", description: "AlmiCV builder — make your CV." }, ctx: AW }, { v: { title: "Almiworld new tutorial", description: "tutorial almiworld , about products , and how to use them" }, ctx: AW },
    { v: { title: "creat your cv here", description: "Create your CV here with AlmiCV." }, ctx: AW },
    { v: { title: "my old iceland travel videos compilation | Dhanak Ki Duniya", description: "these videos are my old Iceland travel videos compilation from year 2016, 2017, 1018, before covid pandemic started" }, ctx: DK },
  ];
  const n = {}; let placeBare = 0, handleSeen = 0;
  for (const { v, ctx } of set) {
    const seen = [];
    /* what the stand-in WROTE (its answers), not what was shown: did it write the channel's own handle, as the real model did? */
    let wroteHandle = false; const mf = modelFetch(seen);
    const r = await writeWithAI({ provider: "anthropic", key: "k", video: v, ctx, fetchImpl: async (u, i) => { const res = await mf(u, i); if (/Subscribe: @/.test(await res.clone().text())) wroteHandle = true; return res; }, base: "http://127.0.0.1:9" });
    n[r.outcome] = (n[r.outcome] ?? 0) + 1;
    if (wroteHandle) handleSeen++;
    for (const o of r.options ?? []) if (/Paris/.test(`${o.title} ${o.description}`)) placeBare++; // RR-317 A: never shown, not even with a note
  }
  assert.equal(n["templates instead"] ?? 0, 0, JSON.stringify(n)); // every video gets AI options (RR-317: "all hidden" is now "templates instead")
  assert.equal(n["all hidden"], undefined, "an outcome that no longer exists came back");
  assert.equal(placeBare, 0, "an invented place was shown");
  assert.ok(handleSeen >= 30, `the stand-in did not write the channel's own handle (${handleSeen}) — the set proves nothing`);
  assert.ok((n["shown clean"] ?? 0) + (n["retried and passed"] ?? 0) >= 30, JSON.stringify(n));
});

test("A1 · IN THE APP: the write sends the channel's own names (its site, the product's names from its description and menu) to the AI", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr316-write-")), store = productStore(dir), made = store.create({ name: "almiworld youtube", site: "https://almiworld.com/" });
  try {
    const keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set("YOUTUBE_API_KEY", "standin-youtube-key-000000000000"); keys.set("ANTHROPIC_API_KEY", "standin-ai-key-000000000000");
    const seen = [];
    const YT = youtubeApp({ store, dataDir: dir, keys, fetchImpl: async () => { throw new Error("no network in this test"); }, aiFetchImpl: modelFetch(seen) });
    const today = new Date().toISOString().slice(0, 10), CH = "UC4Yg3-nLW-2MLxSxdAh_LmQ";
    store.write(made.id, { ...made, setup: { ...made.setup, aiConnection: { provider: "anthropic" }, product: { ...made.setup.product, what: "AlmiWorld — AlmiCV builds your CV; AlmiPrep prepares you for IELTS." }, youtube: { handle: "@almiworld-world", confirmed: { channelId: CH, title: "Almiworld", handle: "@almiworld-world", description: "", on: today } } } });
    mkdirSync(join(store.dirOf(made.id), "youtube-raw"), { recursive: true });
    writeFileSync(join(store.dirOf(made.id), "youtube-raw", `videos-${today}.json`), JSON.stringify({ recorded_at: new Date().toISOString(), channelId: CH, complete: true, videos: [{ videoId: "v1", title: "almicv builder", description: "Build your CV with AlmiCV.", views: 10, publishedAt: `${today}T00:00:00Z`, durationSec: 40, width: 720, height: 1280, tags: [], channelId: CH }] }));
    const r = await YT.write(made.id, { videoId: "v1" });
    assert.equal(r.ok, true, r.why); assert.notEqual(r.outcome, "templates instead");
    assert.match(seen[0].messages[0].content, /^THE CHANNEL'S OWN NAMES[^:]*: Almiworld, @almiworld-world, https:\/\/almiworld\.com\/, almiworld youtube, AlmiCV, AlmiPrep$/m); // "AlmiWorld" is the channel's own "Almiworld" — one name
    assert.ok(!r.dropped.some((d) => (d.hidden ?? []).includes("@almiworld-world")), "the channel's own handle was hidden");
    /* … nor shown with a note against it (since "never all hidden", a doubted handle would be shown — with a note) */
    assert.ok(r.options.every((o) => !o.check.some((c) => /@almiworld-world/.test(c))), JSON.stringify(r.options.map((o) => o.check)));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ── B ── */
function reachGoogle({ existing = true, reports = [] } = {}) {
  const calls = [];
  const fetchImpl = async (u, i = {}) => {
    calls.push(`${i.method ?? "GET"} ${new URL(u).pathname}`);
    const send = (o, status = 200) => ({ ok: status < 400, status, json: async () => o, text: async () => JSON.stringify(o) });
    if (/token/.test(u)) return send({ access_token: "a", expires_in: 3600 });
    if (/\/jobs$/.test(new URL(u).pathname) && i.method === "POST") return send({ error: { code: 409 } }, 409);
    if (/\/jobs$/.test(new URL(u).pathname)) return send({ jobs: existing && calls.includes("POST /v1/jobs") ?[{ id: "j1", reportTypeId: "channel_reach_basic_a1" }] : [] });
    if (/jobs\/j1\/reports/.test(u)) return send({ reports });
    return send({}, 404);
  };
  const keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set("GOOGLE_CLIENT_SECRET", "s"); keys.set("YT_SIGNIN_P", JSON.stringify({ refresh: "r" }));
  return { calls, s: youtubeSignin({ keys, config: { googleClientId: "c.apps.googleusercontent.com" }, fetchImpl }) };
}
test("B1 · 409 = THE JOB ALREADY EXISTS: it is found and used, never shown as an error; while Google makes the report, it is said plainly", async () => {
  const a = reachGoogle({ existing: true });
  const r = await a.s.reach("p");
  assert.deepEqual(r, { state: "WAITING", line: REACH_WAIT }); assert.deepEqual(a.calls.filter((c) => /jobs/.test(c)), ["GET /v1/jobs", "POST /v1/jobs", "GET /v1/jobs", "GET /v1/jobs/j1/reports"]);
  assert.equal(REACH_WAIT, "Impressions and click-through rate arrive about 48 hours after the first sign-in (Google makes them, with the 30 days before).");
  const b = reachGoogle({ existing: false });
  assert.deepEqual(await b.s.reach("p"), { state: "WAITING", line: REACH_WAIT }, "409 with no job found is not an error either");
});

const five = Array.from({ length: 5 }, (_, i) => ({ videoId: `v${i}`, title: ["Cv builder", "almicv builder", "Almiworld new tutorial", "creat your cv here", "IELTS coaching"][i], views: [12, 30, 8, 5, 40][i], publishedAt: "2026-06-01T00:00:00Z", durationSec: 40, width: 720, height: 1280 }));
test("B2 · WHAT GOOGLE GAVE IS ALWAYS SAID: a channel of 5 videos shows its views, minutes, countries and sources from Google; nothing from Google is said plainly", () => {
  const r = ownDataFindings(five, { analytics: { window: "2026-07-22 to 2026-10-20", byVideo: [{ videoId: "v4", views: 31, minutes: 12, avgSec: 30, avgPct: 64 }, { videoId: "v1", views: 9, minutes: 3, avgSec: 20, avgPct: 40 }], countries: [{ country: "PK", views: 25 }, { country: "AE", views: 6 }], sources: [{ source: "SHORTS", views: 28 }, { source: "YT_SEARCH", views: 4 }], searchTerms: [], ages: [] } });
  assert.match(r.line, /^Your channel has 5 videos — too few to compare them with each other yet\.$/);
  assert.equal(r.findings.length, 1);
  assert.equal(r.findings[0].line, "What Google gave for your channel (2026-07-22 to 2026-10-20): 40 views · 15 minutes watched · countries: PK 25, AE 6 · from: the Shorts feed 28, YouTube search 4. Few views so far — the numbers are small, but they are your own.");
  assert.match(r.findings[0].advice, /Most watched in that time: "IELTS coaching" \(31 views, 64% watched on average\)/);
  const none = ownDataFindings(five, { analytics: { window: "2026-07-22 to 2026-10-20", byVideo: [], countries: [], sources: [], searchTerms: [], ages: [] } });
  assert.match(none.line, /Google returned no viewer data yet \(2026-07-22 to 2026-10-20\) — your channel has very few views\.$/);
  assert.match(ownDataFindings(five, { analytics: { byVideo: null, countries: null, sources: null } }).line, /Google did not answer for your channel's numbers this time/);
  /* the owner's real channel on 22 Oct: 6 views, under a minute watched — never "0 minutes watched" */
  assert.match(ownDataFindings(five, { analytics: { window: "w", byVideo: [{ videoId: "v0", views: 6, minutes: 0, avgPct: 74 }], countries: [], sources: [{ source: "YT_CHANNEL", views: 4 }, { source: "SHORTS", views: 2 }] } }).findings[0].line, /^What Google gave for your channel \(w\): 6 views · less than a minute watched in all · from: your channel page 4, the Shorts feed 2\./);
  assert.equal(ownDataFindings(five, {}).findings.length, 0, "without sign-in nothing from Google is claimed");
});

/* ── C ── */
test("C · CAPTIONS: YouTube's automatic track is used when the client's own will not download; none at all is said neutrally (\"within a day\" only for a video under 2 days old); a refusal is said as one", async () => {
  /* the track order */
  const got = [];
  const keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set("GOOGLE_CLIENT_SECRET", "s"); keys.set("YT_SIGNIN_P", JSON.stringify({ refresh: "r", write: true }));
  const s = youtubeSignin({ keys, config: { googleClientId: "c.apps.googleusercontent.com" }, fetchImpl: async (u) => { got.push(new URL(u).pathname); const send = (o, status = 200) => ({ ok: status < 400, status, json: async () => o, text: async () => o }); if (/token/.test(u)) return send({ access_token: "a" }); if (/captions$/.test(new URL(u).pathname)) return send({ items: [{ id: "asr1", snippet: { trackKind: "asr" } }, { id: "own1", snippet: { trackKind: "standard" } }] }); if (/own1/.test(u)) return send({}, 403); if (/asr1/.test(u)) return send("WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nhello"); return send({}, 404); } });
  assert.match(await s.captions("p", "v1"), /hello/); assert.deepEqual(got.filter((p) => /captions\//.test(p)), ["/youtube/v3/captions/own1", "/youtube/v3/captions/asr1"]);
  /* the app's words */
  const dir = mkdtempSync(join(tmpdir(), "rr316-cap-")), store = productStore(dir), made = store.create({ name: "x", site: "" });
  try {
    const today = new Date().toISOString().slice(0, 10);
    store.write(made.id, { ...made, setup: { ...made.setup, youtube: { handle: "@x", confirmed: { channelId: "UCx", title: "X", handle: "@x", on: today } } } });
    mkdirSync(join(store.dirOf(made.id), "youtube-raw"), { recursive: true });
    writeFileSync(join(store.dirOf(made.id), "youtube-raw", `videos-${today}.json`), JSON.stringify({ recorded_at: new Date().toISOString(), channelId: "UCx", complete: true, videos: [{ videoId: "old", title: "June video", publishedAt: "2026-06-10T00:00:00Z", durationSec: 600 }, { videoId: "new", title: "Today", publishedAt: new Date(Date.now() - 3600e3).toISOString(), durationSec: 600 }] }));
    let mode = "none";
    const signin = { status: () => ({ signedIn: true, write: true }), captions: async () => { if (mode === "refused") throw Object.assign(new Error("x"), { status: 403 }); return null; } };
    const YT = youtubeApp({ store, dataDir: dir, keys: keyStore({ backend: memoryBackend(), env: {} }), signin, fetchImpl: async () => { throw new Error("no network"); } });
    const old = await YT.chapters(made.id, "old");
    assert.deepEqual(old, { ok: false, neutral: true, why: "No captions on this video — YouTube makes automatic ones only when the video has speech. You can add your own in YouTube Studio → Subtitles." });
    assert.match((await YT.chapters(made.id, "new")).why, /^No captions on this video yet — YouTube makes automatic ones for most videos with speech within a day\./);
    /* the server passes "neutral" on, and the screen shows it in plain colour (red was the owner's complaint) */
    const { readFileSync } = await import("node:fs"); const REPO = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
    assert.match(readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), /\{ refused: r\.why, neutral: r\.neutral === true \}/);
    assert.match(readFileSync(join(REPO, "desktop", "ui.html"), "utf8"), /return note\(msg, r\.refused, r\.neutral \? "info" : "err"\)/);
    mode = "refused"; const ref = await YT.chapters(made.id, "old");
    assert.equal(ref.neutral, undefined); assert.match(ref.why, /^YouTube did not give this video's captions \(it answered 403\)/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/* ── D ── */
test("D · WHAT VIEWERS ASK / PRAISE: another channel's own content left out (question 18, \"in e2\"); no life formats praised for an exam niche — kept for a vlog niche", () => {
  const v = (n, title, ch) => ({ videoId: `n${n}`, title, description: "", views: 1000 * n, publishedAt: "2026-10-01T00:00:00Z", channelId: `c${n}`, channelTitle: ch });
  const vids = [v(1, "OET Reading mock test", "E2 OET"), v(2, "OET listening tips", "OET Helper"), v(3, "PTE speaking tips", "PTE Coach")];
  const c = (text, ch = "E2 OET") => ({ text, likes: 2, publishedAt: "2026-10-01T00:00:00Z", videoTitle: "OET Reading mock test", channelTitle: ch });
  const comments = [c("what will be the answer of question 18 from reading part A?"), c("How we analysis oet scores in e2?"), c("Can we go back to the reading texts in the OET reading test?", "OET Helper"),
    c("I love how you organize the cleaning of your notes, great OET tips!", "OET Helper"), c("Amazing, my kids loved this OET video, great!", "OET Helper")];
  const exam = nicheSummary({ niche: { label: "OET", queries: [{ q: "OET" }, { q: "PTE" }] }, research: { readOn: "2026-10-22T00:00:00Z", niche: [{ q: "OET", kind: "top", videos: vids }], comments }, own: [{ title: "Cv builder", description: "" }] });
  const line = (w) => exam.lines.find((l) => l.what === w)?.line ?? "";
  assert.doesNotMatch(line("What viewers ask"), /question 18|e2\?/); assert.match(line("What viewers ask"), /Can we go back to the reading texts/);
  assert.doesNotMatch(line("What viewers praise"), /Cleaning|Kids/);
  const vlog = nicheSummary({ niche: { label: "family vlog", queries: [{ q: "pakistani family vlog" }] }, research: { readOn: "2026-10-22T00:00:00Z", niche: [{ q: "pakistani family vlog", kind: "top", videos: vids }], comments }, own: [] });
  assert.match(vlog.lines.find((l) => l.what === "What viewers praise")?.line ?? "", /Cleaning|Kids/, "a vlog niche lost its life praise");
});
