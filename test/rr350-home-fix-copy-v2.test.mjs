/**
 * RR-350 (owner, 30 Oct 2026) · HOME FIX + COPY v2: a page left open for two hours still checks a title (never "That form has expired");
 * a 2-second post is still refused and the per-visitor limit still holds with old tickets; the owner's copy; Download centred; the bands
 * a third smaller; the last band; the footnote about the app running while the computer is on.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../site/app.mjs";
import * as P from "../site/pages.mjs";
import { HERO, YT, PLANS_BAND, FINAL_CTA, HOME_CSS, DAYS } from "../site/home-sales.mjs";

function kvMap() {
  const m = new Map();
  const kvFetch = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => {
    const C = cmd.toUpperCase();
    if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; }
    if (C === "GET") return { result: m.get(k) ?? null };
    if (C === "GETDEL") { const v = m.get(k) ?? null; m.delete(k); return { result: v }; }
    if (C === "INCR" || C === "DECR" || C === "INCRBY") { const v = Number(m.get(k) ?? 0) + (C === "INCRBY" ? Number(a[0]) : C === "INCR" ? 1 : -1); m.set(k, String(v)); return { result: v }; }
    return { result: 1 };
  }) });
  return { m, kvFetch };
}

test("RR-350 · a page left open for TWO HOURS still checks the title — the visitor never sees \"That form has expired\"; a bot's 2-second post is still refused; the 5-a-day limit still holds", async () => {
  const { m, kvFetch } = kvMap(), dir = mkdtempSync(join(tmpdir(), "rr350-"));
  let clock = Date.parse("2026-10-30T09:00:00Z");
  const titleAi = async () => ({ ok: true, usd: 0.0004, data: { titles: [{ title: "Morning Routine Before Work", why: "Main words first." }], meaning: { match: true } } });
  const app = createApp({ mode: "sales", env: { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t" }, dataDir: dir, kvFetch, titleAi, now: () => clock, fetchImpl: async () => new Response("", { status: 404 }) });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r)); const base = `http://127.0.0.1:${srv.address().port}`;
  const ticketOf = async () => { const page = await (await fetch(base + "/")).text(); return /name="ticket" value="([^"]+)"/.exec(page.slice(page.indexOf("data-title-check")))[1]; };
  const post = async (ticket, title) => { const r = await fetch(base + "/title-check", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ticket, title, topic: "morning routine" }).toString() }); return { status: r.status, html: await r.text() }; };
  try {
    /* the page is opened, then sits for two hours: its ticket has expired in the store (the Map keeps it; the age decides) */
    const t1 = await ticketOf(); clock += 2 * 60 * 60 * 1000;
    const old = await post(t1, "my morning routine vlog");
    assert.equal(old.status, 200); assert.ok(old.html.includes("data-title-result")); assert.ok(!old.html.includes("That form has expired"));
    /* a ticket the store no longer holds at all (expired and removed) — also accepted */
    const t2 = await ticketOf(); m.delete(`av:ticket:${t2}`);
    const gone = await post(t2, "second title");
    assert.equal(gone.status, 200); assert.ok(!gone.html.includes("That form has expired"));
    /* a bot: posting within 2 seconds of the page is still refused */
    const t3 = await ticketOf();
    const fast = await post(t3, "bot title");
    assert.equal(fast.status, 400); assert.ok(fast.html.includes("Please try again."));
    /* the limit still holds with old tickets: 5 a day in all */
    for (let i = 3; i <= 5; i++) { const t = await ticketOf(); clock += 3 * 60 * 60 * 1000; assert.equal((await post(t, `t${i}`)).status, 200, `check ${i}`); }
    const t6 = await ticketOf(); clock += 3 * 60 * 60 * 1000;
    assert.equal((await post(t6, "sixth")).status, 429);
    assert.ok([...m.keys()].some((k) => k.startsWith("av:ttvisitor:")));
  } finally { srv.close(); rmSync(dir, { recursive: true, force: true }); }
});

const home = P.liteHome({ sales: true, scoreOn: true, ticket: "t", title: { on: true, ticket: "tt" }, download: "/download/AlmiVisibility-Setup.exe" });

test("RR-350 · COPY v2: the hero, its buttons and ticks; the video band; above the plans; the day plan; the last band; the footnote", () => {
  assert.ok(home.includes("<h1>Stop Guessing. Start Getting Found.</h1>") && home.includes(`<p class="lead">${HERO.sub}</p>`));
  assert.ok(home.includes(">Get My Free Site Score</a>") && home.includes(">Buy Now — $30/month</a>"));
  assert.match(home, /<p class="sh-ticks" data-ticks><span>✓ Real Google data<\/span><span>✓ No card, no email<\/span><span>✓ You choose what goes live<\/span><\/p>/);
  assert.ok(!home.includes("You approve every change</span>"), "a client may choose automatic publishing — the hero never says they approve every change");
  assert.ok(home.includes(`<h2>${YT.heading}</h2>`) && YT.sub.startsWith("Hooks that stop the scroll.") && home.includes('href="#title-check">Check My Title Free →</a>'));
  assert.ok(home.includes(`<h2 id="plans">${PLANS_BAND.heading}</h2><p class="sub">${PLANS_BAND.sub}</p>`));
  assert.equal(DAYS.heading, "Give AI Your Website. Wake Up to New Pages Every Day.");
  const fin = home.indexOf("data-final-cta"), foot = home.indexOf("data-footnote");
  assert.ok(fin > home.indexOf("Ten languages") && fin < foot, "the last band, then the footnote");
  assert.ok(home.slice(fin, foot).includes(`<h2>${FINAL_CTA.line}</h2>`) && home.slice(fin, foot).includes('href="/pricing" data-buy>Start Now — $30/month</a>'));
  assert.ok(home.slice(foot).includes("The app runs on your Windows computer and works while it is on."));
  assert.doesNotMatch(home, /guarantee/i);
});

test("RR-350 · Download centred under the app picture; the two bands about a third smaller (headings 40px / 28px on a phone, less padding)", () => {
  const block = HOME_CSS.slice(HOME_CSS.indexOf("/* RR-350 ·"));
  assert.ok(block.includes(".sh-media .dl-hero{flex-direction:column;align-items:center;text-align:center}") && block.includes(".sh-media .dl-update{text-align:center"));
  assert.ok(block.includes(".ytband,.soband{padding:44px 0}") && block.includes(".ytband h2,.soband h2{font-size:clamp(26px,3.2vw,40px)}"), "was 72px padding and 44px headings");
  assert.ok(block.includes("@media (max-width:820px){.ytband,.soband{padding:32px 0} .ytband h2,.soband h2{font-size:28px}"));
  assert.ok(HOME_CSS.indexOf("/* RR-350 ·") > HOME_CSS.lastIndexOf(".ytband{"), "the overrides come last, so they win");
});
