/**
 * RR-348 OWNER CHANGE + ADD (29 Oct 2026) · the sales home: the app's real main screen in the hero with Download under it, the NEW band,
 * the TikTok + Instagram band (Example, three mini screens, two buttons, the honest line), the checker opened on its TikTok tab by a link,
 * and the pictures served from a fixed list only.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp, SITE_MEDIA } from "../site/app.mjs";
import * as P from "../site/pages.mjs";
import { SOCIAL, NEW_BAND, APP_SHOT, BRAND_ICONS } from "../site/home-sales.mjs";

const home = P.liteHome({ sales: true, scoreOn: true, ticket: "t", title: { on: true, ticket: "tt" }, download: "/download/AlmiVisibility-Setup.exe" });

test("RR-348 owner change · the NEW band: the owner's words, the two icons (or their names), a link to the checker's TikTok tab — right after the hero", () => {
  const nb = home.indexOf("data-new-band"), hero = home.indexOf('<section class="hero shero"');
  assert.ok(hero < nb && nb < home.indexOf("data-ai-map") && nb < home.indexOf("data-youtube"));
  const band = home.slice(nb, home.indexOf("</section>", nb));
  assert.ok(band.includes("Now you can do SEO for TikTok and Instagram too.") && band.includes("Captions, hooks and hashtags checked and rewritten — free checker below.") && /<b class="nb-tag">NEW<\/b>/.test(band));
  assert.match(band, /href="\/\?tab=tiktok#title-check"/);
  for (const n of ["TikTok", "Instagram"]) assert.ok(BRAND_ICONS[n] ? band.includes(`/img/brands/${BRAND_ICONS[n].file}`) : band.includes(`<span class="bi-text">${n}</span>`), n);
  assert.equal(NEW_BAND.href, SOCIAL.checkHref);
});

test("RR-348 ADD · the TikTok + Instagram band right after the YouTube band: heading, sub-line, the owner's Example, three mini screens, two buttons, the honest line", () => {
  const yt = home.indexOf("data-youtube"), so = home.indexOf("data-social"), days = home.indexOf("data-day-plan");
  assert.ok(yt < so && so < days, "after the YouTube band, before the day plan");
  const b = home.slice(so, days);
  assert.ok(b.includes("<h2>Now you can do SEO for TikTok and Instagram too.</h2>") && b.includes("Hooks that stop the scroll. Captions that get found. Hashtags that fit your video."));
  assert.ok(b.includes('<span class="yt-tag">Example</span>') && b.includes("cooking today #fyp #viral #foryou") && b.includes("3-ingredient chicken karahi in 15 minutes 🔥 Save this for dinner tonight! #karahi #easyrecipes #pakistanifood"));
  assert.deepEqual([...b.matchAll(/<h3>([^<]+)<\/h3>/g)].map((m) => m[1]), ["Hook + caption", "Hashtag set", "Content ideas"]);
  assert.equal((b.match(/<i class="so-tag">Example<\/i>/g) ?? []).length, 3, "every mini screen says Example");
  assert.match(b, /<a class="pill big so-check" href="\/\?tab=tiktok#title-check">Check my caption free →<\/a><a class="pill big so-grow" href="\/pricing" data-buy>Grow my TikTok &amp; Instagram →<\/a>/);
  assert.ok(b.includes("The free checker works now. In the app, TikTok and Instagram come with the next update."));
  assert.ok(home.split("\n").some((l) => l.startsWith("@media (max-width:820px){.shero") && l.includes(".so-screen{min-height:0;max-height:140px}")), "a mini screen is at most 140px high on a phone");
  assert.doesNotMatch(b, /guarantee/i);
});

test("RR-348 owner change · on the site: /?tab=tiktok opens the TikTok tab; the app picture is served; a path outside the fixed list is not", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr348oc-"));
  const app = createApp({ mode: "sales", env: {}, dataDir: dir, fetchImpl: async () => new Response("", { status: 404 }) });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const base = `http://127.0.0.1:${srv.address().port}`;
  try {
    assert.ok(Object.keys(SITE_MEDIA).includes(APP_SHOT.src));
    const pic = await fetch(base + APP_SHOT.src);
    assert.deepEqual([pic.status, pic.headers.get("content-type")], [200, "image/jpeg"]);
    assert.ok((await pic.arrayBuffer()).byteLength > 20000, "the real screenshot");
    for (const p of ["/img/../app.mjs", "/img/app.mjs", "/img/brands/../../app.mjs"]) assert.notEqual((await fetch(base + p)).headers.get("content-type"), "image/jpeg", p);
    const t = await (await fetch(base + "/?tab=tiktok")).text();
    assert.ok(t.includes(APP_SHOT.src) && t.includes("data-download-hero"));
  } finally { srv.close(); rmSync(dir, { recursive: true, force: true }); }
});
