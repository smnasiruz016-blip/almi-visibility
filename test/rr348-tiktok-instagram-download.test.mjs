/**
 * RR-348 (owner GREEN, 29 Oct 2026) · THE SALES HOME, NEXT BUILD: the title & caption checker with tabs YouTube · TikTok · Instagram (the
 * owner's five checks per platform, the same AI cap and per-visitor counters), TikTok and Instagram in the icon strip and the section line,
 * and the Download button high on the home pointing to the LATEST Setup — with the "please update" line for 1.14 and older.
 * Local only: the store answered by a Map, the AI by a stand-in; no key is real.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../site/app.mjs";
import * as P from "../site/pages.mjs";
import { YT, DOWNLOAD, ENGINES } from "../site/home-sales.mjs";
import { checkCaption, captionInput, betterCaptions, CAPTION_TOOL, TITLE_TOOL, withMeaning } from "../site/title-check.mjs";

const ids = (r) => r.checks.filter((c) => c.ok === false).map((c) => c.id).sort();

test("RR-348 · TikTok: hook in the first line, short and clear, a call to action, 3–5 relevant hashtags, searchable words", () => {
  const good = checkCaption("tiktok", "Why I wake up at 5 AM before work\nMy calm morning routine in 3 steps. Follow for part 2!\n#morningroutine #5amclub #productivity", "morning routine before work");
  assert.equal(good.score, 100, JSON.stringify(good.checks));
  assert.deepEqual(good.checks.map((c) => c.id), ["hook", "short", "cta", "hashtags", "keywords"]);
  const bad = withMeaning(checkCaption("tiktok", "vlog #fyp #foryou #viral", "morning routine"), { meaning: false }); // RR-347 FIX v2 point 1
  assert.deepEqual(ids(bad), ["cta", "hashtags", "hook", "keywords", "short"].sort(), "generic tags are not relevant ones");
  assert.equal(checkCaption("tiktok", "a #a #b #c #d #e #f #g", "").checks.find((c) => c.id === "hashtags").ok, false, "more than 5");
  assert.equal(checkCaption("tiktok", "Why this works #a").checks.find((c) => c.id === "keywords").ok, null, "not checked without a topic — never a fail");
});

test("RR-348 · Instagram: first line before “more”, clear value, keywords, 3–10 hashtags, a call to action", () => {
  const good = checkCaption("instagram", "3 easy tips for a calm morning routine ☀️\nSave this for tomorrow and tell me which one you try.\n#morningroutine #selfcare #wellness #habits", "morning routine");
  assert.equal(good.score, 100, JSON.stringify(good.checks));
  assert.deepEqual(good.checks.map((c) => c.id), ["firstline", "value", "keywords", "hashtags", "cta"]);
  const long = checkCaption("instagram", `${"word ".repeat(40)}\n#a #b #c`, "");
  assert.equal(long.checks[0].ok, false, "a first line over 125 characters is cut before “more”");
  assert.equal(checkCaption("instagram", "Tips #a #b #c #d #e #f #g #h #i #j #k").checks.find((c) => c.id === "hashtags").ok, false, "more than 10");
  assert.equal(checkCaption("youtube", "my morning routine vlog").checks.length, 6, "YouTube keeps its six title checks");
  assert.equal(captionInput({ platform: "tiktok", title: "x".repeat(CAPTION_TOOL.maxCaption + 1) }).ok, false);
  assert.equal(captionInput({ platform: "youtube", title: "x".repeat(151) }).ok, false, "YouTube keeps the title limit");
  assert.equal(captionInput({ platform: "evil", title: "a" }).platform, "youtube", "an unknown tab is YouTube");
});

test("RR-348 · the home: the owner's line, TikTok and Instagram in the strip, three tabs with YouTube checked, the app picture with Download under it", () => {
  const home = P.liteHome({ sales: true, scoreOn: true, ticket: "t", title: { on: true, ticket: "tt" }, download: "/download/AlmiVisibility-Setup.exe" });
  assert.ok(home.includes("<h2>Stop Making Videos Nobody Finds.</h2>") && YT.heading === "Stop Making Videos Nobody Finds.", "RR-350 COPY v2");
  assert.ok(ENGINES.some((e) => e.name === "TikTok") && ENGINES.some((e) => e.name === "Instagram"));
  assert.ok(home.includes("Names and logos are trademarks of their owners; AlmiVisibility is not affiliated with them."));
  assert.match(home, /<input type="radio" name="platform" id="tt-p-youtube" value="youtube" checked><label for="tt-p-youtube"[^>]*>YouTube<\/label><input type="radio" name="platform" id="tt-p-tiktok" value="tiktok"><label[^>]*>TikTok<\/label><input type="radio" name="platform" id="tt-p-instagram" value="instagram"><label[^>]*>Instagram<\/label>/);
  assert.ok(home.includes("Free title &amp; caption checker"));
  assert.doesNotMatch(home, /guarantee/i);
  /* the button sits in the hero, right after its two buttons and before the strip — above the score card's end, so at the top */
  const shot = home.indexOf("data-app-shot"), img = home.indexOf("src=\"/img/app-home.jpg\""), dl = home.indexOf("data-download-hero"), nb = home.indexOf("data-new-band");
  assert.ok(home.indexOf("<section class=\"hero shero\"") < shot && shot < img && img < dl && dl < home.indexOf("class=\"sh-act\"") && dl < nb, "the app picture in the hero, the Download button directly under it");
  assert.match(home, /<a class="pill big dl" href="\/download\/AlmiVisibility-Setup\.exe" download><span aria-hidden="true">⬇<\/span> Download the app here<\/a>/);
  assert.ok(home.includes(DOWNLOAD.update.replace("(", "(")) && /1\.14 or earlier/.test(DOWNLOAD.update));
  assert.ok(home.includes('<a href="/download">Download</a>'), "Download stays in the menu");
});

/* the store's REST pipeline on a Map (as test/rr347-home-youtube.test.mjs) */
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

test("RR-348 · the captions share the YouTube checker's ONE daily AI cap: at the cap the AI is not asked", async () => {
  const { kv, m } = kvMap(), now = () => Date.parse("2026-10-29T10:00:00Z"), key = TITLE_TOOL.usdKey("2026-10-29");
  let asked = 0, system = ""; const ai = async (o) => { asked++; system = o.system; return { ok: true, usd: 0.0005, data: { titles: [{ title: "Why I wake at 5 AM\n#morningroutine #habits #work", why: "Hook first." }] } }; };
  const env = { TITLE_AI_DAILY_USD: "0.01" };
  const r1 = await betterCaptions({ platform: "tiktok", title: "vlog", topic: "", kv, env, now, ai });
  assert.deepEqual([r1.state, asked, m.get(key)], ["ok", 1, "500"]);
  assert.match(system, /TikTok captions/);
  assert.ok(r1.titles[0].title.includes("\n"), "a caption keeps its line breaks");
  m.set(key, String(0.0095 * 1e6));
  assert.deepEqual([(await betterCaptions({ platform: "instagram", title: "vlog", topic: "", kv, env, now, ai })).state, asked], ["busy", 1]);
});

test("RR-348 · ON THE SALES SITE: a TikTok POST gives the caption result with Copy; the 5-a-day count is shared across the tabs; Download → the latest Setup", async () => {
  const { kvFetch } = kvMap(), dir = mkdtempSync(join(tmpdir(), "rr348-"));
  let clock = Date.parse("2026-10-29T10:00:00Z");
  const titleAi = async () => ({ ok: true, usd: 0.0004, data: { titles: [0, 1, 2].map((i) => ({ title: `Why I wake at 5 AM (${i})\nFollow for more.\n#morningroutine #habits #work`, why: "Hook first." })) } });
  const SETUP = "https://github.com/o/almivisibility-releases/releases/latest/download/AlmiVisibility-Setup.exe";
  const app = createApp({ mode: "sales", env: { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t", VISIBILITY_SETUP_URL: SETUP }, dataDir: dir, kvFetch, titleAi, now: () => clock, fetchImpl: async () => new Response("", { status: 404 }) });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const base = `http://127.0.0.1:${srv.address().port}`;
  const post = async (platform, title) => {
    const page = await (await fetch(base + "/")).text(), ticket = /name="ticket" value="([^"]+)"/.exec(page.slice(page.indexOf("data-title-check")))[1];
    clock += 3000;
    const r = await fetch(base + "/title-check", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ticket, platform, title, topic: "morning routine" }).toString() });
    return { status: r.status, html: await r.text() };
  };
  try {
    const home = await (await fetch(base + "/")).text();
    assert.match(home, /class="pill big dl" href="\/download\/AlmiVisibility-Setup\.exe" download/);
    const dl = await fetch(base + "/download/AlmiVisibility-Setup.exe", { redirect: "manual" });
    assert.deepEqual([dl.status, dl.headers.get("location")], [302, SETUP], "the button serves VISIBILITY_SETUP_URL — GitHub's releases/latest");
    const t = await post("tiktok", "vlog #fyp");
    assert.equal(t.status, 200);
    assert.match(t.html, /data-title-result data-platform="tiktok"/);
    assert.match(t.html, /id="tt-p-tiktok" value="tiktok" checked/, "the TikTok tab stays chosen");
    assert.ok(t.html.includes("Hook in the first line") && t.html.includes(CAPTION_TOOL.guidance("tiktok")) && t.html.includes("<h3>3 better captions</h3>"));
    assert.equal((t.html.match(/<textarea id="tt-s\d" class="tt-copyin"/g) ?? []).length, 3);
    assert.equal((t.html.match(/data-copy="tt-s\d"/g) ?? []).length, 3);
    assert.ok(!/sk-ant|x-api-key|ANTHROPIC_API_KEY/.test(t.html));
    assert.equal((await post("instagram", "Tips")).status, 200);
    for (let i = 3; i <= 5; i++) assert.equal((await post("youtube", `title ${i}`)).status, 200);
    assert.equal((await post("tiktok", "sixth")).status, 429, "five a day in all, across the three tabs");
    const page = await (await fetch(base + "/download")).text();
    assert.ok(page.includes("data-update-line") && page.includes("1.14 or earlier"), "the Download page says to update an older copy");
  } finally { srv.close(); rmSync(dir, { recursive: true, force: true }); }
});
