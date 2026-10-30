/**
 * RR-347 (owner GREEN, 29 Oct 2026) · THE SALES HOME: YouTube at the top, the AI icon strip, the YouTube band, the day plan, the FAQ —
 * and ADD-2, the free YouTube title checker: its six checks, the per-visitor limit and the tool's daily AI dollar cap (local: the store
 * answered by a Map, the AI by a stand-in; no key is real).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../site/app.mjs";
import * as P from "../site/pages.mjs";
import { ENGINES, TRADEMARKS, YT, DAYS, FAQ, BRAND_ICONS } from "../site/home-sales.mjs";
import { checkTitle, titleInput, betterTitles, TITLE_TOOL, withMeaning } from "../site/title-check.mjs";

const home = P.liteHome({ sales: true, scoreOn: true, ticket: "t" });

test("RR-347 · the hero: the owner's headline and line, Buy now and the free score stay, six engines on one hub, the trademark line", () => {
  assert.match(home, /<h1>Stop Guessing\. Start Getting Found\.<\/h1>/); // RR-350 COPY v2
  assert.ok(home.includes("AI grows your website, YouTube, TikTok and Instagram — every single day, while you sleep. Pages, articles, keywords, hooks and captions. All for $30 a month."));
  assert.match(home, /<div class="cta"><a class="pill big" href="#score">Get My Free Site Score<\/a><a class="pill big alt" href="\/pricing" data-buy>/); // RR-350 COPY v2
  const map = home.slice(home.indexOf("data-ai-map"), home.indexOf(TRADEMARKS) + TRADEMARKS.length);
  assert.deepEqual([...map.matchAll(/<li class="ai-node">.*?<b[^>]*>([^<]+)<\/b>/g)].map((m) => m[1]), ["ChatGPT", "Google", "Gemini", "Claude", "Perplexity", "YouTube", "TikTok", "Instagram"]); // RR-348: TikTok and Instagram joined
  assert.equal((map.match(/<line /g) ?? []).length, 8, "one line from each engine to the hub");
  assert.ok(map.includes('class="ai-hub"') && home.indexOf("data-ai-map") < home.indexOf('id="score"'), "inside the hero, beside the score card");
  /* RR-348 owner change: the OFFICIAL icons, each from the company's brand page — every picture in the strip is one of BRAND_ICONS, served by the site */
  for (const m of map.matchAll(/<img[^>]+src="([^"]+)"/g)) assert.ok(Object.values(BRAND_ICONS).some((b) => m[1] === `/img/brands/${b.file}`), m[1]);
  assert.equal(ENGINES.length, 8);
});

test("RR-347 · the YouTube band right under the hero; its Example is marked; three cards; the button goes to the plans; honest lines", () => {
  const hero = home.indexOf('<section class="hero"'), band = home.indexOf("data-youtube"), days = home.indexOf("data-day-plan");
  assert.ok(hero < band && band < days && home.indexOf("</section>", hero) < band, "the band follows the hero, then the day plan");
  const b = home.slice(band, home.indexOf("data-social")); // RR-348 ADD: the TikTok + Instagram band follows the YouTube one
  assert.ok(b.includes(YT.heading.replace("&", "&amp;")) && b.includes('<span class="yt-tag">Example</span>') && b.includes(YT.example.before) && b.includes(YT.example.after));
  assert.deepEqual([...b.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]), ["Better titles &amp; hashtags", "Video ideas from real searches", "Advice to grow your channel"]);
  assert.match(b, /<a class="pill big yt" href="#title-check">Check My Title Free →<\/a>/, "RR-350: the free checker above");
  assert.match(home, /@media \(prefers-reduced-motion:reduce\)\{\.yt-play\{animation:none\}/, "the pulse stops for reduced motion");
  for (const s of [home, ...DAYS.plan.flat()]) assert.ok(!/guarantee/i.test(s), "never guaranteed");
  assert.ok(DAYS.plan.some(([d, t]) => d === "Day 30" && /^Up to thirty/.test(t)) && DAYS.plan.some(([d, t]) => d === "Day 7" && /^Up to seven/.test(t)), "a day with no sourced answer has no article — 'up to'");
});

test("RR-347 · title, description and the FAQ JSON-LD mention YouTube; the FAQ on the page says the same words; the title checker is in it", () => {
  assert.match(home, /<title>AlmiVisibility — get found on Google, ChatGPT and YouTube<\/title>/);
  assert.match(home, /<meta name="description" content="One app grows your website and your YouTube channel/);
  const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(home)[1]);
  assert.equal(ld["@type"], "FAQPage");
  assert.deepEqual(ld.mainEntity.map((q) => q.name), FAQ.map(([q]) => q));
  assert.ok(ld.mainEntity.some((q) => /YouTube channel/.test(q.name)) && ld.mainEntity.some((q) => q.name === "Is the YouTube title checker free?"));
  assert.doesNotMatch(home, /<script>(?!<\/script>)/, "no inline script that runs (the policy would block it)");
  assert.ok(!P.liteHome({ sales: false }).includes("data-youtube"), "the pre-sales site is unchanged");
});

test("RR-347 ADD-2 · the six checks: length, keyword at the start, promise, detail, curiosity without clickbait, readable", () => {
  const good = checkTitle("Morning Routine at 5 AM: What I Never Skip Before Work", "morning routine before work");
  assert.equal(good.score, 100); assert.equal(good.checks.length, 6);
  /* RR-347 FIX v2 point 1: words not in common wait for the AI's meaning answer — "no" makes it a ✗ */
  const bad = withMeaning(checkTitle("MY VLOG VLOG VLOG YOU WON'T BELIEVE THIS!!!", "morning routine"), { meaning: false });
  assert.ok(bad.score < 40, String(bad.score));
  assert.deepEqual(bad.checks.filter((c) => c.ok === false).map((c) => c.id).sort(), ["curiosity", "detail", "keyword", "promise", "readable"].sort());
  const before = checkTitle(YT.example.before, "morning routine"), after = checkTitle(YT.example.after, "morning routine");
  assert.ok(before.score <= 50 && after.score === 100, `the page's own Example must read right: before ${before.score}, after ${after.score}`);
  const noTopic = checkTitle("my morning routine vlog");
  assert.equal(noTopic.checks.find((c) => c.id === "keyword").ok, null, "not checked without a topic — never a fail");
  assert.equal(noTopic.measured, 5);
  assert.equal(checkTitle("x".repeat(101)).checks[0].ok, false);
  assert.equal(titleInput({ title: " " }).ok, false); assert.equal(titleInput({ title: "a", topic: "b".repeat(121) }).ok, false);
});

/* the store's REST pipeline on a Map (as test/rr325-meter-links-security.test.mjs) */
function kvMap() {
  const m = new Map();
  const kvFetch = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => {
    const C = cmd.toUpperCase();
    if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; }
    if (C === "GET") return { result: m.get(k) ?? null };
    if (C === "GETDEL") { const v = m.get(k) ?? null; m.delete(k); return { result: v }; }
    if (C === "INCR" || C === "DECR" || C === "INCRBY") { const v = Number(m.get(k) ?? 0) + (C === "INCRBY" ? Number(a[0]) : C === "INCR" ? 1 : -1); m.set(k, String(v)); return { result: v }; }
    if (C === "EXPIRE") return { result: 1 };
    return { error: `ERR unknown command ${cmd}` };
  }) });
  return { m, kvFetch, kv: { run: async (cmds) => (await (await kvFetch("", { body: JSON.stringify(cmds) })).json()).map((x) => x.result) } };
}

test("RR-347 ADD-2 · the daily AI cap: at the cap the AI is not asked and the line says busy; under it the spend is counted from the call's own usage", async () => {
  const { kv, m } = kvMap(), now = () => Date.parse("2026-10-29T10:00:00Z"), key = TITLE_TOOL.usdKey("2026-10-29");
  let asked = 0; const ai = async () => { asked++; return { ok: true, usd: 0.0004, data: { titles: [{ title: "Morning Routine: [your city] at 5 AM", why: "Keyword first." }] } }; };
  const env = { TITLE_AI_DAILY_USD: "0.01" };
  const r1 = await betterTitles({ title: "my vlog", topic: "", kv, env, now, ai });
  assert.deepEqual([r1.state, asked, m.get(key)], ["ok", 1, "400"]);
  m.set(key, String(0.0095 * 1e6));
  const r2 = await betterTitles({ title: "my vlog", topic: "", kv, env, now, ai });
  assert.deepEqual([r2.state, r2.line, asked], ["busy", "AI suggestions are busy — try again tomorrow.", 1], "over the cap: not asked");
  assert.equal((await betterTitles({ title: "t", topic: "", kv, env: {}, now })).state, "off", "no AI key: off, said so");
});

test("RR-347 ADD-2 · THE TOOL ON THE SALES SITE: a real POST; 5 checks a visitor a day, the 6th refused; at the cap the checks still show", async () => {
  const { kvFetch, m } = kvMap(), dir = mkdtempSync(join(tmpdir(), "rr347-"));
  let clock = Date.parse("2026-10-29T10:00:00Z"), asked = 0;
  const titleAi = async () => { asked++; return { ok: true, usd: 0.0004, data: { titles: [{ title: "Morning Routine Before Work: What I Never Skip", why: "Main words first." }, { title: "My 5 AM Routine in [your city]", why: "A detail." }, { title: "A Calm Morning Routine Before Work", why: "Clear." }] } }; };
  const app = createApp({ mode: "sales", env: { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t", TITLE_AI_DAILY_USD: "0.002" }, dataDir: dir, kvFetch, titleAi, now: () => clock, fetchImpl: async () => new Response("", { status: 404 }) });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const base = `http://127.0.0.1:${srv.address().port}`;
  const post = async (title) => {
    const page = await (await fetch(base + "/")).text(), ticket = /name="ticket" value="([^"]+)"/.exec(page.slice(page.indexOf("data-title-check")))[1];
    clock += 3000;
    const r = await fetch(base + "/title-check", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ticket, title, topic: "morning routine before work" }).toString() });
    return { status: r.status, html: await r.text() };
  };
  try {
    const first = await post("my morning routine vlog");
    assert.equal(first.status, 200);
    assert.ok(first.html.includes("data-title-result") && first.html.includes(TITLE_TOOL.guidance), "the result and the honest line");
    assert.match(first.html, /<div class="gauge" role="img" aria-label="Score \d+ out of 100/);
    assert.equal((first.html.match(/data-copy="tt-s\d"/g) ?? []).length, 3, "three titles, each with Copy");
    assert.match(first.html, /<script src="\/copy\.js" defer><\/script>/);
    assert.match(first.html, /Get AlmiVisibility for \$30\/month →<\/a>/);
    assert.ok(!/sk-ant|x-api-key|ANTHROPIC_API_KEY/.test(first.html), "no key and no key name reaches the browser");
    const second = await post("Morning Routine at 5 AM: What I Never Skip");
    assert.equal(second.status, 200);
    assert.ok(second.html.includes(TITLE_TOOL.busy) && second.html.includes("data-title-result") && asked === 1, "the cap ($0.002) is reached: the checks still show, the AI is not asked");
    for (let i = 3; i <= 5; i++) assert.equal((await post(`title number ${i}`)).status, 200, `check ${i}`);
    const sixth = await post("title number 6");
    assert.equal(sixth.status, 429); assert.match(sixth.html, /The free title checker can be used 5 times a day/);
    assert.ok([...m.keys()].some((k) => k.startsWith("av:ttvisitor:2026-10-29:")) && ![...m.keys()].some((k) => k.includes("127.0.0.1")), "the visitor is a salted hash, never the address");
  } finally { srv.close(); rmSync(dir, { recursive: true, force: true }); }
});
