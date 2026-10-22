/* RR-308 · CLEAR ADVICE WITH OPTIONS, NICHE RESEARCH, PUBLISH, AND CHECK FIXES (owner decision, 22 Oct 2026). LOCAL only: YouTube, the
 * client's site, the client's AI and the publishing targets are stand-ins on 127.0.0.1 (config youtubeApiBase / testAllowLocalSites /
 * aiApiBase / testPublishBase — tests only); keys live in a memory store, never this computer's Credential Manager; nothing leaves the
 * machine; nothing is published anywhere real. */
import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nicheOf, nicheSummary, personaOf, onTopic, JUNK_WORDS } from "../desktop/youtube-niche.mjs";
import { youtubeScore, priorityOrder, optionsFor, doFirst, ideasFor, boilerplateOf, TOP_N } from "../desktop/youtube-plan.mjs";
import { writeWithAI, checkOptions, inventedIn, materialOf, AI } from "../desktop/ai-write.mjs";
import { boilerplate, descriptionOptions, LEN } from "../desktop/describe.mjs";
import { readSite, readPage, notForSearch } from "../desktop/site-read.mjs";
import { scoreCard, foundInfo, fixForMe } from "../desktop/product-check.mjs";
import { publishDraft, unpublish, keyMayGo, checkTarget, editDraft, TARGETS } from "../desktop/publish.mjs";
import { FEATURES } from "../desktop/features.mjs";
import { screen } from "./support/ui-screen.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ON = "2026-10-22T10:00:00.000Z";
const FAKE_YT = "fake-youtube-key-rr308-1234";
const FAKE_AI = "fake-ai-key-rr308-5678";

/* ── a channel like the owner's: a Pakistani mom in Denmark, many Shorts, junk hashtags, a greeting on every description ── */
const v = (id, title, o = {}) => ({ videoId: id, title, description: o.description ?? "Welcome to Mom Diaries and to my new video\nSubscribe for more", tags: o.tags ?? ["day in my life", "mom vlog", "mom diaries", "momdiariesvlogs", "full episode", "saba ibrahim", "new vlog", "vlog today"], publishedAt: o.at ?? "2025-06-01T00:00:00Z", durationSec: o.sec ?? 600, width: o.w ?? 640, height: o.h ?? 360, views: o.views ?? 10, comments: 1, channelId: "UCmomdiaries000000001", channelTitle: "Mom Diaries" });
function channelVideos(n = 45) {
  const out = [v("m01", "Grocery haul in Copenhagen | weekly shopping", { views: 9000, description: "Our weekly grocery shopping at the supermarket with the kids.\n#viral" }),
    v("m02", "BIRTHDAY Weekend | Daily Vlog #778 @momdiaries", { views: 7000, description: "Welcome to Mom Diaries and to my new video \"BIRTHDAY Weekend\"\nFacebook : https://www.facebook.com/x" }),
    v("m03", "Our trip to Iceland", { views: 6000, description: "We drove around the south coast and saw three waterfalls." }),
    v("m04", "#viral #fyp #shorts", { views: 5000, sec: 30, w: 360, h: 640, description: "" }),
    v("m05", "Jumping Sara @momdiaries #fyp #viral", { views: 4000, sec: 20, w: 360, h: 640, description: "" }),
    v("m06", "EID MUBARAK | Eid ul fitr", { views: 3000, at: "2026-04-01T00:00:00Z" })];
  for (let i = out.length; i < n; i++) out.push(v(`m${String(i + 1).padStart(2, "0")}`, `Clip ${i + 1} #shorts #viral`, { views: 1 + (i % 7), sec: 25, w: 360, h: 640, at: `2026-10-${String((i % 20) + 1).padStart(2, "0")}T00:00:00Z`, description: "" }));
  return out;
}
const CHANNEL = { channelId: "UCmomdiaries000000001", title: "Mom Diaries", handle: "@momdiaries", description: "I'm a Pakistani mom living in Denmark sharing family vlogs, daily routines, cleaning motivation, cooking" };

test("A1 + A3 · THE NICHE comes from the channel's OWN tags and description — short phrases people search; junk (full episode, a name tagged on every video, the channel's own name glued into a tag, #viral) is never a research topic; who and where are read, never guessed", () => {
  const vids = channelVideos();
  const n = nicheOf({ channel: CHANNEL, videos: vids, product: { name: "Mom Diaries" } });
  const qs = n.queries.map((q) => q.q);
  assert.ok(qs.length >= 2 && qs.length <= 4, JSON.stringify(qs));
  assert.ok(qs.includes("day in my life") && qs.includes("mom vlog"), JSON.stringify(qs));
  for (const q of [...qs, ...n.more]) {
    assert.ok(q.split(" ").length <= 4, `a long phrase: ${q}`);
    assert.ok(!q.split(/\s+/).some((w) => JUNK_WORDS.has(w)), `junk: ${q}`);
    assert.doesNotMatch(q, /saba ibrahim|momdiaries|diaries vlogs|episode|viral|new vlog|vlog today/, `not a niche phrase: ${q}`);
  }
  assert.ok(n.queries.every((q) => /of your 45 videos|description/.test(q.from)), "a topic without where it came from");
  assert.deepEqual([n.persona.who, n.persona.places[0]], ["Pakistani Mom", "Denmark"]);
  assert.equal(personaOf({ channel: { description: "Tech reviews" }, videos: [] }).who, null, "a 'who' was guessed");
  /* a channel with no handle: its own name glued into a tag ("momdiaries vlog") is the channel, not its niche */
  const glued = nicheOf({ channel: { title: "Mom Diaries", description: "" }, videos: channelVideos().map((x) => ({ ...x, tags: ["momdiaries vlog", "mom vlog"] })), product: {} });
  assert.ok(!glued.queries.some((q) => /momdiaries/.test(q.q)), JSON.stringify(glued.queries));
});

/* the niche research: top and rising videos of the niche, and comments under them */
const nv = (id, title, views, o = {}) => ({ videoId: id, title, description: o.description ?? "", tags: [], publishedAt: o.at ?? "2026-09-01T00:00:00Z", durationSec: o.sec ?? 900, width: o.w ?? 640, height: o.h ?? 360, views, channelId: o.ch ?? "UCother", channelTitle: o.chn ?? "Other Mom" });
const RESEARCH = { readOn: ON, niche: [
  { q: "day in my life", kind: "top", videos: [nv("n1", "Day in my life as a mom in Norway", 900000), nv("n2", "Morning routine with 3 kids | Oslo", 700000), nv("n3", "Grocery haul in Sweden | budget week", 500000), nv("n4", "Morning routine 5am", 400000, { sec: 40, w: 360, h: 640 }), nv("n5", "Cost of living in Denmark 2026", 300000)] },
  { q: "mom vlog", kind: "rising", videos: [nv("n6", "House tour in Copenhagen", 80000), nv("n7", "Cost of living in Norway for a family", 60000), nv("own", "Our own video", 5, { ch: "UCmomdiaries000000001" })] }],
  topics: [], comments: [{ text: "Which supermarket is cheapest in Denmark?", own: false, videoTitle: "Grocery haul in Sweden | budget week", publishedAt: "2026-09-02", likes: 30 }, { text: "Love your morning routine, so calm!", own: false, videoTitle: "Morning routine with 3 kids | Oslo", publishedAt: "2026-09-03", likes: 5 }, { text: "Who is watching in 2026?", own: false, videoTitle: "x", publishedAt: "2026-09-03", likes: 99 }, { text: "Anyone else watching this late at night again?", own: false, videoTitle: "x", publishedAt: "2026-09-03", likes: 98 }, { text: "Can I just say this mom vlog morning routine is so calm?", own: false, videoTitle: "x", publishedAt: "2026-09-03", likes: 97 }] };

test("A1 · WHAT VIEWERS OF THE NICHE WATCH MOST: formats with their median views and examples, title patterns, length, Shorts vs long, what viewers ask and praise — every line with its source; the channel's own videos are not counted as the niche", () => {
  const vids = channelVideos();
  const niche = nicheOf({ channel: CHANNEL, videos: vids, product: {} });
  const s = nicheSummary({ niche, research: RESEARCH, own: vids, ownChannelId: CHANNEL.channelId });
  assert.match(s.title, /^What viewers of .+ watch most$/);
  assert.equal(s.videos, 7, "the channel's own video was counted as the niche");
  const f = (id) => s.formats.find((x) => x.id === id);
  assert.equal(f("morning-routine").count, 2); assert.equal(f("cost-of-living").count, 3, "a budget week and two cost-of-living videos");
  assert.ok(!f("routine"), "a morning routine counted twice, as a daily routine too");
  assert.ok(f("morning-routine").examples[0].title && f("morning-routine").examples[0].views === 700000);
  for (const l of s.lines) assert.match(l.from, /read 2026-10-22/, `a line with no source: ${l.what}`);
  assert.ok(s.lines.find((l) => l.what === "What viewers ask").line.includes("Which supermarket is cheapest in Denmark?"));
  assert.doesNotMatch(JSON.stringify(s.lines), /Who is watching in 2026|Anyone else watching|Can I just say/, "a remark that is not a question, or not about the niche");
  assert.match(s.lines.find((l) => l.what === "Length").line, /1 Shorts and 6 long videos among the 7 read/);
});

test("A1 · ON TOPIC ONLY: a search result counts for the niche only when it names the search's own words — the giant off-topic clip YouTube also returns is left out; the first search is who and where, in the channel's own words", () => {
  assert.equal(onTopic(nv("a", "Roz lunch bacha aati hai #shorts", 350000000), "denmark vlog"), false);
  assert.equal(onTopic(nv("b", "A day in my life in Denmark | Copenhagen", 9000), "denmark vlog"), true);
  assert.equal(onTopic(nv("c", "Pakistani mom morning routine in Denmark", 9000), "pakistani mom in denmark"), true);
  assert.equal(onTopic(nv("d", "Cost of living in Denmark 2026", 9000), "pakistani mom in denmark"), false, "one word of three is not the niche");
  assert.equal(onTopic(nv("e", "Our family vlog", 9000), "family vlog"), true);
  assert.equal(nicheOf({ channel: CHANNEL, videos: channelVideos(), product: {} }).queries[0].q, "pakistani mom in denmark");
});

test("B · THE PLAN: the YouTube /100 is ONLY the share of plain countable checks, each with its count; the most-viewed and newest 20 come first; every video gets 2–3 READY options (title ≤ 100, a description, exactly 3 hashtags, 2–4 thumbnail words) built from its own words — never a tag alone, never the channel's greeting, never a place it does not name for a trip; 'Not enough research' is gone", () => {
  const vids = channelVideos();
  const s = youtubeScore(vids, { productIsChannel: true });
  const passed = s.checks.reduce((n, c) => n + c.passed, 0), of = s.checks.reduce((n, c) => n + c.of, 0);
  assert.equal(s.score, Math.round((passed / of) * 100));
  assert.ok(s.checks.every((c) => /: \d[\d,]* of \d[\d,]*$/.test(c.text)), "a check without its count");
  assert.match(s.how, /says nothing about views, reach or earnings/);
  const { order, why } = priorityOrder(vids);
  assert.deepEqual(order.slice(0, 5).map((x) => x.videoId), ["m01", "m02", "m03", "m04", "m05"]);
  assert.ok(order.slice(0, TOP_N).some((x) => why.get(x.videoId).includes("one of your newest")));
  assert.equal(order.length, vids.length);
  const niche = nicheOf({ channel: CHANNEL, videos: vids, product: {} });
  const summary = nicheSummary({ niche, research: RESEARCH, own: vids, ownChannelId: CHANNEL.channelId });
  const ctx = { channel: { ...CHANNEL, boilerplate: boilerplateOf(vids) }, persona: niche.persona, niche, summary, productIsChannel: true, readOn: ON };
  for (const x of order.slice(0, TOP_N)) {
    const o = optionsFor(x, ctx);
    /* RR-311 (owner): never an empty title — a video whose own words say almost nothing ("Clip 7") gets fewer options, and says why */
    assert.ok((o.options.length >= 2 || o.weak) && o.options.length >= 1 && o.options.length <= 3, `${x.title}: ${o.options.length} options`);
    assert.ok(!("notEnough" in o), "'Not enough research' came back");
    for (const p of o.options) {
      assert.ok(p.title.length >= 8 && p.title.length <= 100, p.title);
      assert.equal(p.hashtags.length, 3, `${p.title}: ${p.hashtags}`);
      assert.ok(p.hashtags.every((h) => /^#[\p{L}\p{N}]{3,}$/u.test(h)), p.hashtags.join(" "));
      const w = p.thumbnail.split(" ").length; assert.ok(w >= 2 && w <= 4, `thumbnail: ${p.thumbnail}`);
      assert.ok(p.basedOn.length >= 2, "an option without what it is based on");
      assert.doesNotMatch(p.description, /Welcome to Mom Diaries|facebook\.com|…$/, "the channel's greeting or a link line used as the summary");
    }
  }
  const trip = optionsFor(vids.find((x) => x.videoId === "m03"), ctx);
  assert.ok(trip.options.every((p) => !/Denmark/.test(p.title)), "a trip to Iceland was put in the channel's home country");
  assert.ok(trip.options.some((p) => /Iceland/.test(p.title)));
  const bday = optionsFor(vids.find((x) => x.videoId === "m02"), ctx);
  assert.ok(bday.options.some((p) => p.title.startsWith("Birthday Weekend")), JSON.stringify(bday.options.map((p) => p.title)));
  assert.doesNotMatch(JSON.stringify(bday.options), /Family events|Day in my life in/, "a category name, or a format read from tags alone");
  const ideas = ideasFor({ summary, videos: vids, persona: niche.persona, questions: [{ text: "Which supermarket is cheapest in Denmark?", source: "a comment", likes: 3 }] });
  assert.ok(ideas.some((i) => i.kind === "FORMAT" && /^Morning Routine in Denmark/.test(i.title) && /median 550,000 views/.test(i.why)), JSON.stringify(ideas));
  assert.ok(ideas.some((i) => i.kind === "QUESTION"));
  const plan = doFirst({ videos: vids, top: order.slice(0, TOP_N).map((x) => optionsFor(x, ctx)), score: s, summary, ideas, persona: niche.persona });
  assert.ok(plan.length >= 3 && plan.length <= 5, JSON.stringify(plan));
  assert.ok(plan.every((p) => p.step && p.from));
});

test("B6 · AI WRITING with the client's own key: only Anthropic's address, the default fallback, effort low; every option is CHECKED — one naming a place or number the material does not hold is dropped; fewer than 2 clean → the templates stay, said; another provider is said plainly", async () => {
  const vids = channelVideos(); const video = vids[0];
  const niche = nicheOf({ channel: CHANNEL, videos: vids, product: {} });
  const ctx = { channel: CHANNEL, persona: niche.persona, niche, summary: null, kind: "LONG", style: "English", links: ["https://www.youtube.com/@momdiaries"] };
  const seen = [];
  const reply = (options) => async (url, init) => { seen.push({ url, init }); return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "thinking", thinking: "" }, { type: "text", text: JSON.stringify({ options }) }], usage: { input_tokens: 10, output_tokens: 20 } }), { status: 200 }); };
  const good = { title: "Grocery Haul in Copenhagen | Pakistani Mom", description: "Weekly grocery shopping in Copenhagen with the kids — a Pakistani mom in Denmark.\nOur weekly grocery shopping at the supermarket with the kids.", hashtags: ["#GroceryHaul", "#Copenhagen", "#PakistaniMom"], thumbnail: "Weekly Grocery Haul" };
  const invented = { ...good, title: "Grocery Haul in Paris | 50 Euro Budget", thumbnail: "PARIS HAUL" };
  const r = await writeWithAI({ provider: "anthropic", key: FAKE_AI, video, ctx, fetchImpl: reply([good, { ...good, title: "Weekly Shopping in Copenhagen" }, invented]), base: "http://127.0.0.1:9" });
  assert.equal(r.ok, true, r.why);
  assert.equal(r.options.length, 2, "the invented option was shown");
  assert.equal(r.dropped.length, 1); assert.match(r.dropped[0].why.join(" "), /^Paris — a place your video never names/); // RR-312: the hidden option says what it invented
  const body = JSON.parse(seen[0].init.body);
  assert.deepEqual([body.model, body.fallbacks, body.output_config.effort, body.output_config.format.type], [AI.model, "default", "low", "json_schema"]);
  assert.equal(seen[0].init.headers["x-api-key"], FAKE_AI); assert.equal(seen[0].init.headers["anthropic-beta"], AI.fallbackBeta);
  assert.equal(seen[0].url, `http://127.0.0.1:9${AI.path}`);
  assert.equal(AI.origin, "https://api.anthropic.com");
  const bad = await writeWithAI({ provider: "anthropic", key: FAKE_AI, video, ctx, fetchImpl: reply([invented, { ...invented, title: "Tokyo Grocery Haul" }]), base: "http://127.0.0.1:9" });
  assert.equal(bad.ok, false); assert.match(bad.why, /were not shown\. The template options stay\./);
  assert.match((await writeWithAI({ provider: "openai", key: "x", video, ctx })).why, /works with an Anthropic \(Claude\) key in this version/);
  assert.deepEqual(inventedIn("Grocery Haul in Copenhagen | Pakistani Mom", materialOf(video, ctx)), []);
  /* RR-311 B4 (owner): an ordinary word ("Morning") is not an invented fact — only the place is */
  assert.deepEqual(inventedIn("Morning Routine in Paris", materialOf(video, ctx)), ["Paris"], "a place outside the material was not caught, or an ordinary word was");
});

test("C1 · FIX IT FOR ME descriptions: from each page's own sentences, unique per page, complete, 120–160 characters, never '…', never a line the site repeats, never a card fragment; two options each", () => {
  const page = (url, h1, lead) => ({ url, h1, title: h1, description: null, lead, h2: [] });
  /* both of a length a description could take (120–160) — only the boilerplate and fragment rules keep them out */
  const shared = "Each of these seventeen questions is answered below on this page, and each answer comes with its own source and the day it was checked.";
  const fragment = "Fee AU$587 Source: OET results and scoring · checked 2026-10-15 What is the fee for nurses in Pakistan today, and how is it paid please.";
  /* longer than 160: it may never be a description, however it is cut */
  const long = "The OET for nurses tests the English that nurses use every single day on a busy hospital ward, in all four skills, with tasks taken from real care settings and real patients.";
  const pages = [
    page("https://x.test/a", "OET for nurses", [long, "The OET for nurses tests the English used every day on a hospital ward, in all four skills, with tasks taken from real care settings.", "Most nurses need a B in each sub-test, and this page shows what each band means for registration in Ireland and the UK.", shared]),
    page("https://x.test/b", "OET for doctors", ["Doctors take the same Listening and Reading tests as nurses, but their Writing task is a referral letter to another doctor about a patient.", shared, "1800 Source: HCPC — English language proficiency · checked 2026-10-15 What OET score do speech therapists need?", fragment]),
    page("https://x.test/c", "Short", ["Too short."]),
    page("https://x.test/d", "Questions", [shared, fragment]),
  ];
  const items = fixForMe("meta-description", { ok: true, pages, design: {} });
  const all = items.flatMap((x) => x.options ?? []).map((o) => o.text);
  assert.ok(items.find((x) => x.page.endsWith("/a")).options.length === 2);
  for (const t of all) {
    assert.ok(t.length >= 90 && t.length <= 160, `${t.length}: ${t}`);
    assert.doesNotMatch(t, /…|answered below|Source:|checked 2026/, t);
    assert.match(t, /[.!]$/);
  }
  assert.equal(new Set(all).size, all.length, "the same description for two pages");
  assert.match(items.find((x) => x.page.endsWith("/c")).none, /too little text of its own/);
  assert.equal(boilerplate(pages).size, 2, "the two repeated lines (the shared one and the card fragment) were not found as boilerplate");
});

/* ── the client's site, on this computer ── */
function site({ down = false } = {}) {
  let base = "";
  const page = (title, body, head = "") => `<!doctype html><html lang="en"><head><title>${title}</title>${head}</head><body><nav><a href="/">Home</a> <a href="/pricing">Pricing</a> <a href="/signup?next=%2Fpricing">Sign up</a> <a href="/login">Log in</a> <a href="/old?ref=nav">Old</a> <a href="/draft-page">Draft</a></nav><main>${body}</main><footer>Fixture</footer></body></html>`;
  const srv = createServer((q, r) => {
    if (down) { r.writeHead(503); return r.end("down"); }
    const html = (s) => { r.writeHead(200, { "content-type": "text/html" }); r.end(s); };
    if (q.url === "/robots.txt") { r.writeHead(200, { "content-type": "text/plain" }); return r.end("User-agent: *\nAllow: /\n"); }
    if (q.url === "/sitemap.xml") { r.writeHead(404); return r.end(); }
    if (q.url === "/") return html(page("Fixture Prep — online practice for the Fixture exam", "<h1>Practise the Fixture exam</h1><p>Fixture Prep gives you original practice for every part of the Fixture exam, marked on the real 0–500 scale with feedback on each answer.</p><p>Students who practise four weeks before the exam usually know exactly which part still needs work, and which part is already safe.</p><h2>Can I practise online?</h2><p>Yes, every task works in your browser on a phone or a computer.</p>"));
    if (q.url === "/pricing") return html(page("Pricing", "<h1>Pricing</h1><p>The full course costs $12/month after a 7-day free trial, and you can cancel at any time from your account page.</p>"));
    if (q.url === "/draft-page") return html(page("Draft", "<h1>Draft</h1><p>Not ready yet for anybody to read here.</p>", "<meta name=\"robots\" content=\"noindex\">"));
    r.writeHead(404, { "content-type": "text/html" }); r.end("missing");
  });
  return { listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}

test("C2 + C3 + C4 · THE CHECK: sign-up, log-in, ?parameter and noindex pages are not checked and are counted apart; questions answered on the site are NOT 'questions people ask'; each price comes with its page and what it is for; HTML number entities are read", async () => {
  assert.deepEqual(["https://x.test/signup?next=%2Fp", "https://x.test/login", "https://x.test/a?ref=1", "https://x.test/guides"].map(notForSearch), ["signup", "signup", "parameters", null]);
  assert.equal(readPage("<title>It&#x27;s &#39;fine&#39;</title>", "https://x.test/").title, "It's 'fine'");
  const s = site(); const base = await s.listen();
  try {
    const r = await readSite({ url: base, allowLocal: true, paceMs: 0, on: ON });
    assert.deepEqual(r.pages.map((p) => new URL(p.url).pathname).sort(), ["/", "/pricing"]);
    assert.equal(r.notChecked.signup.length, 2); assert.equal(r.notChecked.parameters.length, 1); assert.equal(r.notChecked.noindex.length, 1);
    assert.match(r.notChecked.line, /^Not checked: 2 sign-up, log-in or account pages, 1 address with \?parameters, 1 page marked "do not list in search" \(noindex\)/);
    const f = foundInfo({ site: r, on: ON });
    assert.equal(f.answered.length, 1); assert.equal(f.questions.length, 0);
    assert.match(f.line, /1 question answered on your pages, 0 questions people ask \(from search data and research\)/);
    assert.deepEqual(f.prices.map((p) => [p.price, new URL(p.page).pathname]), [["$12/month", "/pricing"]]);
    assert.match(f.prices[0].for, /after a 7-day free trial/);
    const card = scoreCard({ site: r, on: ON });
    assert.match(card.notChecked, /^Not checked:/);
  } finally { s.close(); }
});

test("C5 · A SITE THAT CANNOT BE OPENED is a FAILED check — 'Check failed — your website could not be opened. Fix the address in Settings.' — never a score, never 'Nothing to fix'", () => {
  const card = scoreCard({ site: { ok: false, why: "https://www.x.test: That address does not open — check it in your browser.", suggestion: "https://x.test" }, on: ON });
  assert.deepEqual([card.failed, card.score, card.gauge, card.word], [true, null, "Check failed", "Check failed"]);
  assert.equal(card.fixFirst[0].line, "Check failed — your website could not be opened. Fix the address in Settings.");
  assert.equal(card.fixFirst[0].action, "settings");
  assert.ok(card.areas.every((a) => a.state === "NOT_MEASURED"));
  const ui = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
  assert.match(ui, /c\?\.failed \? "" : PL \?/, "a failed check could still say Nothing to fix"); // RR-310: "What to fix first" = the action plan's THIS WEEK
});

test("D · PUBLISH: four choices, each with 'Choose this if'; a key goes ONLY to its own place; Download writes the files and Undo moves them aside; WordPress / GitHub / Shopify are called the documented way and undone; Edit keeps only plain text; the page that goes out has no draft stamp", async () => {
  assert.deepEqual(TARGETS.map((t) => t.id), ["wordpress", "github", "shopify", "download"]);
  assert.ok(TARGETS.every((t) => t.chooseIf && t.needs));
  assert.equal(keyMayGo({ kind: "wordpress", site: "https://shop.example.com" }, "https://evil.example.com/wp-json/wp/v2/pages"), false);
  assert.equal(keyMayGo({ kind: "wordpress", site: "https://shop.example.com" }, "http://shop.example.com/wp-json/wp/v2/pages"), false, "a key over plain http");
  assert.equal(keyMayGo({ kind: "github" }, "https://api.github.com/repos/a/b/contents/x"), true);
  assert.equal(keyMayGo({ kind: "shopify", shop: "my-shop.myshopify.com" }, "https://other.myshopify.com/admin/api/x"), false);
  assert.match(checkTarget({ kind: "github", repo: "not a repo" }), /owner\/name/);
  const draft = { readyAsDraft: true, url: "https://x.test/fixture-exam-online", title: "Can I take the Fixture exam online?", html: "<!doctype html><html><head><title>Can I take the Fixture exam online?</title><meta name=\"robots\" content=\"noindex, nofollow\"></head><body><main><h1>Can I take the Fixture exam online?</h1><p class=\"stamp\">Draft made by AlmiVisibility on 2026-10-22 — not published</p><p>Yes.</p></main></body></html>" };
  const dir = mkdtempSync(join(tmpdir(), "rr308-dl-"));
  try {
    assert.match((await publishDraft({ draft: { ...draft, readyAsDraft: false }, target: { kind: "download" }, downloadsDir: dir })).why, /has not passed the five checks/, "a draft that failed a gate was published");
    const d = await publishDraft({ draft, target: { kind: "download" }, downloadsDir: dir });
    assert.equal(d.ok, true);
    const html = readFileSync(join(d.saved, "index.html"), "utf8");
    assert.doesNotMatch(html, /Draft made by AlmiVisibility|noindex/, "the draft stamp went out");
    assert.match(html, /<link rel="canonical" href="https:\/\/x\.test\/fixture-exam-online">/);
    assert.match(readFileSync(join(d.saved, "WHERE-TO-PUT-IT.txt"), "utf8"), /https:\/\/x\.test\/fixture-exam-online/);
    assert.equal((await unpublish({ record: { remote: d.remote }, target: { kind: "download" } })).ok, true);
    assert.ok(!existsSync(d.saved) && readdirSync(dir).some((n) => n.startsWith("fixture-exam-online.removed-")), "undo erased instead of moving aside");
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const calls = [];
  const fake = async (url, init) => { calls.push({ url: String(url), method: init.method, headers: init.headers, body: init.body ? JSON.parse(init.body) : null }); const u = String(url);
    if (u.includes("/wp-json/")) return new Response(JSON.stringify({ id: 42, link: "https://shop.example.com/fixture-exam-online/" }), { status: 201 });
    if (u.includes("/repos/")) return new Response(JSON.stringify({ content: { sha: "abc" }, sha: "abc" }), { status: 200 });
    return new Response(JSON.stringify({ page: { id: 7, handle: "fixture-exam-online" } }), { status: 201 }); };
  const wp = { kind: "wordpress", site: "https://shop.example.com", user: "owner" };
  const w = await publishDraft({ draft, target: wp, key: "app pass word", fetchImpl: fake });
  assert.deepEqual([w.ok, w.live, w.remote.id], [true, "https://shop.example.com/fixture-exam-online/", 42]);
  assert.equal(calls[0].url, "https://shop.example.com/wp-json/wp/v2/pages"); assert.equal(calls[0].body.status, "publish");
  assert.equal(calls[0].headers.authorization, `Basic ${Buffer.from("owner:app pass word").toString("base64")}`);
  assert.doesNotMatch(calls[0].body.content, /stamp|<html/);
  await unpublish({ record: { remote: w.remote }, target: wp, key: "app pass word", fetchImpl: fake });
  assert.deepEqual([calls[1].url, calls[1].body.status], ["https://shop.example.com/wp-json/wp/v2/pages/42", "draft"]);
  const gh = { kind: "github", repo: "almi/site", branch: "main", folder: "public/guides", site: "https://shop.example.com" };
  const g = await publishDraft({ draft, target: gh, key: "ghp_test", fetchImpl: fake });
  assert.deepEqual([g.live, calls[2].method, calls[2].url], ["https://shop.example.com/fixture-exam-online/", "PUT", "https://api.github.com/repos/almi/site/contents/public/guides/fixture-exam-online/index.html"]);
  await unpublish({ record: { remote: g.remote }, target: gh, key: "ghp_test", fetchImpl: fake });
  assert.equal(calls.at(-1).method, "DELETE");
  const sh = { kind: "shopify", shop: "my-shop.myshopify.com" };
  const p = await publishDraft({ draft, target: sh, key: "shpat_test", fetchImpl: fake });
  assert.equal(p.live, "https://my-shop.myshopify.com/pages/fixture-exam-online");
  assert.equal(calls.at(-1).headers["x-shopify-access-token"], "shpat_test");
  const e = editDraft(draft, { title: "Online Fixture exam: yes", main: "<p>Yes — from home.</p><script>alert(1)</script><img src=x onerror=alert(1)>" });
  assert.match(e.html, /<title>Online Fixture exam: yes<\/title>/); assert.doesNotMatch(e.html, /<script|onerror/);
  assert.ok(FEATURES.some((f) => f.id === "publish"), "no Publish card");
});

/* ── the whole app, on this computer ── */
function fakeYouTube() {
  const vids = channelVideos();
  const toApi = (x) => ({ id: x.videoId, snippet: { title: x.title, description: x.description, tags: x.tags, publishedAt: x.publishedAt, channelTitle: x.channelTitle, channelId: x.channelId }, contentDetails: { duration: `PT${x.durationSec}S` }, statistics: { viewCount: String(x.views), commentCount: "1" }, player: { embedWidth: String(x.width), embedHeight: String(x.height) } });
  const niche = RESEARCH.niche.flatMap((r) => r.videos).map((x) => toApi({ ...x, tags: [], channelTitle: x.channelTitle }));
  const all = Object.fromEntries([...vids.map(toApi), ...niche].map((x) => [x.id, x]));
  const calls = [];
  const srv = createServer((q, r) => {
    const u = new URL(q.url, "http://127.0.0.1"); const p = u.pathname.replace("/youtube/v3/", ""); calls.push({ path: p, params: Object.fromEntries([...u.searchParams].filter(([k]) => k !== "key")) });
    const send = (o) => { r.writeHead(200, { "content-type": "application/json" }); r.end(JSON.stringify(o)); };
    if (u.searchParams.get("key") !== FAKE_YT) { r.writeHead(400); return r.end("{}"); }
    if (p === "channels") return send({ items: [{ id: CHANNEL.channelId, snippet: { title: CHANNEL.title, customUrl: CHANNEL.handle, description: CHANNEL.description }, statistics: { subscriberCount: "3420", videoCount: String(vids.length) }, contentDetails: { relatedPlaylists: { uploads: "UUmom" } } }] });
    if (p === "playlistItems") { const start = Number(u.searchParams.get("pageToken") ?? 0); const page = vids.slice(start, start + 50); return send({ items: page.map((x) => ({ contentDetails: { videoId: x.videoId } })), ...(start + 50 < vids.length ? { nextPageToken: String(start + 50) } : {}) }); }
    if (p === "videos") return send({ items: u.searchParams.get("id").split(",").map((id) => all[id]).filter(Boolean) });
    /* relevant results name the searched words — and one giant off-topic clip comes back too, as YouTube's do */
    if (p === "search") { const q = u.searchParams.get("q"); for (const x of niche) all[`${x.id}`] = { ...x, snippet: { ...x.snippet, title: `${q} — ${x.snippet.title.replace(/^.* — /, "")}` } }; all.offtopic1 = toApi({ ...nv("offtopic1", "Roz lunch bacha aati hai #shorts", 350000000, { sec: 30, w: 360, h: 640 }) }); return send({ items: [...niche.map((x) => ({ id: { videoId: x.id } })), { id: { videoId: "offtopic1" } }] }); }
    if (p === "commentThreads") return send({ items: [{ snippet: { topLevelComment: { snippet: { textDisplay: "Which supermarket is cheapest in Denmark?", likeCount: 4, publishedAt: "2026-10-01T00:00:00Z" } } } }] });
    r.writeHead(404); r.end("{}");
  });
  return { calls, listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => res(`http://127.0.0.1:${srv.address().port}/youtube/v3/`))), close: () => srv.close() };
}
async function app(extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rr308-app-"));
  const kp = generateKeyPairSync("ed25519");
  writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testAllowLocalSites: true, keysDir: dir, downloadsDir: join(dir, "downloads"), owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/", ...extra }));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore" });
  for (let i = 0; i < 80 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then(async (r) => ({ ...(await r.json()), http: r.status }));
  const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
  return { url, dir, post, get, close: () => { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}

test("A + B IN THE APP: research searches the NICHE (top = most viewed in a year, rising = in 30 days) inside the cap; the YouTube tab gives the score with its counts, Do these first, the niche summary, ideas, 20 videos with options and 'Show more' for the rest; the Overview never reads the channel; the screen draws it", async () => {
  const yt = fakeYouTube(); const ytBase = await yt.listen();
  const a = await app({ youtubeApiBase: ytBase, youtubeSearchesPerDay: 6 });
  try {
    await a.post("/api/keys/YOUTUBE_API_KEY", { key: FAKE_YT });
    const made = await a.post("/api/products", { name: "Mom Diaries", site: "", goal: { grow: "youtube", hasWebsite: false } }); const id = made.product.id;
    await a.post(`/api/products/${id}/setup`, { id: "languages", value: { codes: ["en", "ur"] } });
    await a.post(`/api/products/${id}/youtube`, { handle: CHANNEL.handle });
    const c = await a.post(`/api/products/${id}/youtube/lookup`, { handle: CHANNEL.handle });
    assert.equal((await a.post(`/api/products/${id}/youtube/confirm`, { handle: CHANNEL.handle, channelId: c.channelId })).http, 200);
    await a.get(`/api/products/${id}/youtube/advice`); // the channel read once (today)
    const r = await a.post(`/api/products/${id}/youtube/research`, {});
    assert.equal(r.http, 200, r.refused);
    const searches = yt.calls.filter((x) => x.path === "search");
    assert.ok(searches.length >= 2 && searches.length <= 6, `${searches.length} searches`);
    assert.ok(searches.every((x) => x.params.order === "relevance" && x.params.relevanceLanguage === "ur"));
    const ages = new Set(searches.map((x) => Math.round((Date.now() - Date.parse(x.params.publishedAfter)) / 86400000)));
    assert.deepEqual([...ages].sort((p, q) => p - q), [30, 365], "not top (a year) and rising (30 days)");
    assert.ok(searches.every((x) => !/episode|saba ibrahim|viral/.test(x.params.q)), "a junk topic was searched");
    /* the channel's saved read made a day old: anything that reads the whole channel now calls YouTube — the Overview must not */
    const raw = join(a.dir, "products", id, "youtube-raw"); const vf = readdirSync(raw).find((f) => /^videos-/.test(f));
    const vj = JSON.parse(readFileSync(join(raw, vf), "utf8")); vj.recorded_at = new Date(Date.now() - 2 * 86400000).toISOString(); writeFileSync(join(raw, vf), JSON.stringify(vj));
    const before = yt.calls.length;
    const o = await a.get(`/api/products/${id}/overview`);
    assert.equal(yt.calls.length, before, "the Overview read the channel");
    assert.ok(o.found.phrases.length + o.found.questions.length > 0);
    const adv = await a.get(`/api/products/${id}/youtube/advice`);
    assert.equal(adv.state, "READY");
    assert.equal(adv.top.length, 20); assert.equal(adv.more, 25);
    assert.match(adv.score.gauge, /^\d+\/100$/);
    assert.ok(adv.summary && adv.summary.lines.length >= 3);
    assert.ok(adv.doFirst.length >= 3);
    assert.ok(adv.ideas.length >= 1);
    assert.match(adv.aiLine, /^Better with AI — connect your AI/); assert.equal(adv.aiReady, false);
    const more = await a.get(`/api/products/${id}/youtube/advice?offset=20`);
    assert.equal(more.top.length, 20); assert.equal(more.more, 5);
    assert.ok(!more.top.some((x) => adv.top.some((y) => y.videoId === x.videoId)), "Show more repeated a video");
    const ui = await screen(a.url);
    ui.api.set(id, await ui.api.get(`/api/products/${id}/state`));
    ui.el("#ytbox"); await ui.api.youtubeTab();
    const shown = ui.el("#ytbox").innerHTML;
    for (const s of ["Your YouTube score", "Do these first this week", "What viewers of", "New video ideas", "Option 1 — Place + activity + who", "Option 2 — A question people ask", "Option 3 — A short hook", "Copy", "Show more (25 more videos)", "Better with AI — connect your AI"]) assert.ok(shown.includes(s), s);
    /* RR-309 B4: the AI note once at the top — no AI button under each video while no AI is connected */
    assert.equal(shown.split("Better with AI").length - 1, 1); assert.ok(!shown.includes("Write better options with AI"), "an AI button under a video with no AI connected");
    assert.doesNotMatch(shown, /Not enough research|\[object Object\]|undefined/);
  } finally { a.close(); yt.close(); }
});

/* a small site with two questions answered across its pages (so two NEW drafts that link to each other), and a stand-in WordPress */
function prepSite() {
  let base = "";
  const page = (t, b) => `<!doctype html><html lang="en"><head><title>${t}</title></head><body><nav><a href="/">Home</a> <a href="/pricing">Pricing</a> <a href="/course">Course</a></nav><main>${b}</main><footer>F</footer></body></html>`;
  const srv = createServer((q, r) => { const h = (s) => { r.writeHead(200, { "content-type": "text/html" }); r.end(s); };
    if (q.url === "/robots.txt") { r.writeHead(200, { "content-type": "text/plain" }); return r.end("User-agent: *\nAllow: /\n"); }
    if (q.url === "/") return h(page("Fixture Prep", "<h1>Practise the Fixture exam</h1><p>Fixture exam practice online covers all 4 parts of the test for nurses, with 120 tasks in total.</p><p>The speaking test role plays last 20 minutes, with 2 role plays for nurses.</p>"));
    if (q.url === "/pricing") return h(page("Pricing", "<h1>Pricing</h1><p>Fixture exam practice online costs $12/month for nurses after a free week.</p>"));
    if (q.url === "/course") return h(page("Course", "<h1>Course</h1><p>Fixture exam practice online takes about 4 weeks for most nurses before the test.</p><p>Speaking test role plays are practised 2 times a day by nurses in the course.</p>"));
    r.writeHead(404); r.end(); });
  return { listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => { base = `http://127.0.0.1:${srv.address().port}`; res(base); })), close: () => srv.close() };
}
function fakeWordPress() {
  const calls = []; let id = 100;
  const srv = createServer((q, r) => { let b = ""; q.on("data", (c) => (b += c)); q.on("end", () => {
    calls.push({ method: q.method, url: q.url, auth: q.headers.authorization, body: b ? JSON.parse(b) : null });
    if (q.headers.authorization !== `Basic ${Buffer.from("owner:testapppassword").toString("base64")}`) { r.writeHead(401); return r.end("{}"); }
    r.writeHead(q.method === "POST" && q.url === "/wp-json/wp/v2/pages" ? 201 : 200, { "content-type": "application/json" });
    const n = ++id; r.end(JSON.stringify({ id: n, link: `http://127.0.0.1:${srv.address().port}/${calls.at(-1).body?.slug ?? "page"}/` })); }); });
  return { calls, listen: () => new Promise((res) => srv.listen(0, "127.0.0.1", () => res(`http://127.0.0.1:${srv.address().port}`))), close: () => srv.close() };
}

test("D IN THE APP: Approve & Publish asks where the site is built the first time; the five gates run again RIGHT BEFORE publishing (an edit that breaks a gate is refused, said); the page goes to the client's own WordPress with the client's own key; the live link is shown; Undo puts it back to draft; 'publish automatically after the gates' publishes only once a site is connected; the screen draws the buttons", async () => {
  const s = prepSite(); const base = await s.listen();
  const wp = fakeWordPress(); const wpBase = await wp.listen();
  const a = await app();
  try {
    const made = await a.post("/api/products", { name: "Fixture Prep", site: base, goal: { grow: "website", hasWebsite: true } }); const id = made.product.id;
    for (let i = 0; i < 100; i++) { const o = await a.get(`/api/products/${id}/overview`); if (!o.checking && o.card) break; await new Promise((r) => setTimeout(r, 200)); }
    const GSC = { "Queries.csv": "Top queries,Clicks,Impressions,CTR,Position\nfixture exam practice online for nurses,3,40,7.5%,4.1\nspeaking test role plays nurses,1,20,5%,6\n", "Pages.csv": `Top pages,Clicks,Impressions,CTR,Position\n${base}/,4,61,6%,5\n`, "Chart.csv": "Date,Clicks,Impressions,CTR,Position\n2026-10-01,2,30,6%,5\n2026-10-02,2,31,6%,5\n" };
    const ex = await a.post(`/api/products/${id}/google/export`, { files: Object.entries(GSC).map(([name, t]) => ({ name, base64: Buffer.from(t).toString("base64") })) }); assert.equal(ex.http, 200, ex.refused);
    /* publishing automatic after the gates (the default) — but no site connected yet: nothing is published */
    const plan = await a.post(`/api/products/${id}/feature/seo-pages`, {});
    assert.equal(plan.autoPublished, null, "published without a connection");
    const ready = plan.pages.drafts.filter((d) => d.readyAsDraft); assert.equal(ready.length, 2, JSON.stringify(plan.pages.drafts.map((d) => d.gates)));
    const first = await a.post(`/api/products/${id}/publish/draft`, { url: ready[0].url });
    assert.equal(first.needsConnection, true);
    /* "Download the files" has no key — the list must still open (it broke in the proof walk) */
    assert.equal((await a.post(`/api/products/${id}/publish/connect`, { kind: "download" })).http, 200);
    const listed = await a.get(`/api/products/${id}/publish`);
    assert.ok(Array.isArray(listed.drafts) && listed.target.kind === "download", JSON.stringify(listed).slice(0, 200));
    const saved = await a.post(`/api/products/${id}/publish/draft`, { url: ready[1].url });
    assert.match(saved.line, /^Saved ✓ — the page's files are in /);
    assert.ok(existsSync(join(saved.saved, "index.html")));
    assert.equal((await a.post(`/api/products/${id}/publish/undo`, { url: ready[1].url })).ok, true);
    assert.match((await a.post(`/api/products/${id}/publish/connect`, { kind: "wordpress", site: wpBase, user: "owner", key: "" })).refused, /Paste the key/);
    const cn = await a.post(`/api/products/${id}/publish/connect`, { kind: "wordpress", site: wpBase, user: "owner", key: "test app password" }); assert.equal(cn.http, 200, cn.refused);
    assert.ok(!JSON.stringify(await a.get(`/api/products/${id}/publish`)).includes("test app password"), "the key was in a reply");
    assert.ok(!readdirSync(join(a.dir, "products", id)).some((f) => readFileSync(join(a.dir, "products", id, f), "utf8").includes("testapppassword")), "the key was written to a file");
    /* an edit that empties the page's answers: the gates judge the EDITED page right before publishing, and refuse */
    await a.post(`/api/products/${id}/draft/edit`, { url: ready[1].url, title: "Broken", main: "<p>Nothing here.</p>" });
    const refused = await a.post(`/api/products/${id}/publish/draft`, { url: ready[1].url });
    assert.equal(refused.ok, false); assert.match(refused.why, /^Not published — a check failed right before publishing:/);
    assert.equal(wp.calls.length, 0, "a refused page reached the site");
    const pub = await a.post(`/api/products/${id}/publish/draft`, { url: ready[0].url });
    assert.equal(pub.ok, true, pub.why); assert.match(pub.line, /^Published ✓ — live at http:\/\/127\.0\.0\.1:\d+\/fixture-exam-practice-online-for-nurses\/$/);
    assert.deepEqual([wp.calls[0].method, wp.calls[0].url, wp.calls[0].body.status], ["POST", "/wp-json/wp/v2/pages", "publish"]);
    assert.doesNotMatch(wp.calls[0].body.content, /not published|noindex/, "the draft stamp went out");
    assert.match(pub.sitemap, /Tell Google about the new page/);
    assert.match((await a.post(`/api/products/${id}/publish/draft`, { url: ready[0].url })).why, /already published/);
    const undo = await a.post(`/api/products/${id}/publish/undo`, { url: ready[0].url });
    assert.equal(undo.ok, true); assert.deepEqual([wp.calls.at(-1).method, wp.calls.at(-1).body.status], ["POST", "draft"]);
    /* now connected + automatic: Create SEO pages publishes each draft that passes, by itself */
    const auto = await a.post(`/api/products/${id}/feature/seo-pages`, {});
    assert.ok(auto.autoPublished.some((x) => x.ok), JSON.stringify(auto.autoPublished));
    /* review first: nothing is published by itself */
    await a.post(`/api/products/${id}/setup`, { id: "publishMode", value: { mode: "REVIEW_FIRST" } });
    const n = wp.calls.length; const rev = await a.post(`/api/products/${id}/feature/seo-pages`, {});
    assert.equal(rev.autoPublished, null); assert.equal(wp.calls.length, n);
    const ui = await screen(a.url);
    ui.api.set(id, await ui.api.get(`/api/products/${id}/state`)); ui.el("#pubbox"); await ui.api.pagesBox(false);
    const shown = ui.el("#pubbox").innerHTML;
    for (const x of ["Publishing to: <b>WordPress</b>", "Published ✓", "Undo — unpublish", "Edit", "Approve &amp; Publish", "You chose to approve each page first."]) assert.ok(shown.includes(x), x);
  } finally { a.close(); s.close(); wp.close(); }
});

test("C5 + C6 IN THE APP: before every check the saved address is tested; an address that does not open (an old 'www.') gives 'Check failed' with the way to Settings, never a score and never 'Nothing to fix'", async () => {
  const s = site({ down: true }); const base = await s.listen();
  const a = await app();
  try {
    const made = await a.post("/api/products", { name: "Old Address", site: base, goal: { grow: "website", hasWebsite: true }, saveAnyway: true });
    let o; for (let i = 0; i < 100; i++) { o = await a.get(`/api/products/${made.product.id}/overview`); if (!o.checking && o.card) break; await new Promise((r) => setTimeout(r, 200)); }
    assert.equal(o.card.failed, true); assert.equal(o.card.gauge, "Check failed");
    assert.match(o.card.why, /That address answers with an error \(503\)/, "the saved address was not tested before the check");
    assert.equal(o.card.fixFirst[0].line, "Check failed — your website could not be opened. Fix the address in Settings.");
    const ui = await screen(a.url);
    ui.api.set(made.product.id, await ui.api.get(`/api/products/${made.product.id}/state`)); ui.el("#ov"); await ui.api.overview();
    const shown = ui.el("#ov").innerHTML;
    assert.match(shown, /Check failed — your website could not be opened\./); assert.match(shown, /Fix the address in Settings/);
    assert.doesNotMatch(shown, /Nothing to fix was found/);
  } finally { a.close(); s.close(); }
});
