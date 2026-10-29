/**
 * RR-348 (c) ADD-2 · THE CREATOR COLLECTORS — the existing keyword collector and its cron extended: creator seed groups (niche + platform)
 * asked only in the creator countries; the AI research inside its own daily slice; YouTube's official API only with YOUTUBE_API_KEY; the
 * owner's Creators tab; the checker and the app read the data. Local only: memory stores, a Map for the shared store, AI stand-ins.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { generateKeyPairSync } from "node:crypto";
import { memoryStore } from "../site/kw-store.mjs";
import { unitsOf } from "../site/kw-seeds.mjs";
import { currentGroups } from "../site/kw-collector.mjs";
import { CREATORS, DEFAULT_NICHES, DEFAULT_COUNTRIES, settingsOf, changeSettings, creatorGroups, dueResearch, dueBatches, runCreatorResearch, creatorFor, nicheOfTopic } from "../site/creators.mjs";
import { createApp } from "../site/app.mjs";
import { ownerCookie } from "../site/owner.mjs";
import { makeOwnerLicence } from "../services/licence/service.mjs";
import { ownerLicenceText } from "../desktop/licence.mjs";

function kvMap() {
  const m = new Map();
  const fetchImpl = async (_u, init) => ({ ok: true, status: 200, json: async () => JSON.parse(init.body).map(([cmd, k, ...a]) => {
    const C = cmd.toUpperCase();
    if (C === "SET") { if (a.includes("NX") && m.has(k)) return { result: null }; m.set(k, String(a[0])); return { result: "OK" }; }
    if (C === "GET") return { result: m.get(k) ?? null };
    if (C === "GETDEL") { const v = m.get(k) ?? null; m.delete(k); return { result: v }; }
    if (C === "DEL") { m.delete(k); return { result: 1 }; }
    if (C === "INCR" || C === "DECR" || C === "INCRBY") { const v = Number(m.get(k) ?? 0) + (C === "INCRBY" ? Number(a[0]) : C === "INCR" ? 1 : -1); m.set(k, String(v)); return { result: v }; }
    return { result: 1 };
  }) });
  return { m, fetchImpl, kv: { run: async (cmds) => (await (await fetchImpl("", { body: JSON.stringify(cmds) })).json()).map((x) => x.result) } };
}
const T0 = Date.parse("2026-10-29T10:00:00Z"), DAY = "2026-10-29";
/* RR-349: one call answers a BATCH — every country code named in the prompt ("Countries (code = name): PK = Pakistan; US = …") */
const research = (n = { calls: 0 }, usd = 0.01) => async (o) => { n.calls++; n.prompts = [...(n.prompts ?? []), o.prompt]; const codes = [...String(o.prompt).matchAll(/\b([A-Z]{2}) = /g)].map((m) => m[1]);
  return { ok: true, usd, searches: 1, data: { countries: codes.map((code) => ({ code, questions: ["How do I start?", "What do I need?"], ideas: ["A beginner's first week"], hashtags: ["#homecooking", "fyp", "#EasyRecipes", "#viral"], hooks: ["Nobody tells you this…"], titlePatterns: ["[Number] tips for [niche]"] })) } }; };

test("RR-348 c · the settings: the owner's niches and the 10 countries first; add or remove a niche or a country; a platform on or off", () => {
  const s = settingsOf(null);
  assert.deepEqual(s.countries, ["US", "GB", "IN", "PK", "PH", "NG", "AE", "CA", "AU", "DE"]);
  for (const n of ["daily life vlogs", "cooking", "travel", "fitness", "beauty", "tech reviews", "gaming", "exam prep", "parenting", "business and money", "comedy", "diy", "pets", "faith and religion", "language learning"]) assert.ok(s.niches.includes(n), n);
  assert.deepEqual(s.on, { youtube: true, tiktok: true, instagram: true });
  const a = changeSettings(s, { addNiche: "Home Cooking!" }); assert.ok(a.settings.niches.includes("home cooking"));
  assert.deepEqual(changeSettings(s, { addCountry: "fr" }).settings.countries.at(-1), "FR");
  assert.equal(changeSettings(s, { addCountry: "XX" }).ok, false);
  assert.equal(changeSettings(s, { platform: "tiktok", state: "off" }).settings.on.tiktok, false);
  assert.ok(!changeSettings(s, { removeNiche: "cooking" }).settings.niches.includes("cooking"));
});

test("RR-348 c · KEYWORDS: each niche × platform is a keyword group with the platform added, asked ONLY in the creator countries; it joins the collector's groups", async () => {
  const s = settingsOf({ niches: ["cooking", "fitness"], countries: ["PK", "US"] });
  const g = creatorGroups(s);
  assert.deepEqual(g.map((x) => x.seeds[0]).sort(), ["cooking instagram reels", "cooking tiktok", "cooking youtube", "fitness instagram reels", "fitness tiktok", "fitness youtube"]);
  const units = unitsOf(g);
  assert.equal(units.length, 6 * 2, "6 seeds × 2 countries — never all 193 locations");
  assert.ok(units.every((u) => ["PK", "US"].includes(u.location) && u.refreshDays === 60 && u.group.startsWith("creator:")));
  const store = memoryStore(); await store.setCreatorSettings({ niches: ["cooking"], countries: ["IN"], on: { youtube: false } });
  const { groups } = await currentGroups(store);
  assert.deepEqual(groups.filter((x) => x.kind === "creator").map((x) => x.id), ["creator:tiktok-cooking", "creator:instagram-cooking"], "YouTube off: not asked");
  assert.ok(groups.some((x) => x.kind === "product"), "the products stay first");
  assert.equal((await currentGroups(memoryStore())).groups.filter((x) => x.kind === "creator").length, 0, "no saved creator list: Google is not asked for them");
  assert.equal(creatorGroups(settingsOf(null)).length, DEFAULT_NICHES.length * 3);
});

test("RR-348 c · AI RESEARCH: never-asked first, inside the daily slice; generic tags dropped; marked \"AI research, <date>\"; YouTube's API only with its key", async () => {
  const store = memoryStore(), { kv, m } = kvMap(), n = { calls: 0 }, s = settingsOf({ niches: ["cooking", "travel"], countries: ["PK", "US"] });
  assert.equal(dueResearch(s, new Map(), DAY).length, 12);
  assert.deepEqual(dueBatches(s, new Map(), DAY).map((b) => b.locations), Array(6).fill(["PK", "US"]), "RR-349: one batch per niche × platform, its countries together");
  /* $0.05 a call against a $0.20 slice with an $0.08 reserve: three calls, then the slice stops it */
  const r = await runCreatorResearch({ store, kv, env: { CREATORS_AI_USD_PER_DAY: "0.2" }, now: () => T0, ai: research(n, 0.05), settings: s, budgetMs: 1e9 });
  assert.deepEqual([n.calls, r.calls, r.saved, r.stoppedBy, r.left], [3, 3, 6, "AI_BUDGET", 6], "each call saved BOTH countries; the slice stopped it");
  assert.match(n.prompts[0], /Countries \(code = name\): PK = Pakistan; US = United States/);
  assert.equal(Number(m.get(CREATORS.usdKey(DAY))), 3 * 50000, "each call counted from its own usage");
  /* a run at a time: a held lock refuses a second run */
  m.set(CREATORS.lockKey, "someone-else");
  assert.equal((await runCreatorResearch({ store, kv, env: {}, now: () => T0, ai: research(), settings: s })).stoppedBy, "BUSY");
  m.delete(CREATORS.lockKey);
  const d = await creatorFor({ store, platform: "youtube", niche: "cooking", location: "PK" }) ?? await creatorFor({ store, platform: "tiktok", niche: "cooking" });
  assert.equal(d.source, `AI research, ${DAY}`);
  assert.deepEqual(d.hashtags, ["#homecooking", "#easyrecipes"], "#fyp and #viral are never kept");
  /* YouTube: no key → no call to Google; with the key → titles and tags from the official API, inside the unit budget */
  const calls = []; const ytFetch = async (url) => { calls.push(String(url)); return new Response(JSON.stringify(/search\?/.test(url) ? { items: [{ id: { videoId: "abcdefghijk" } }] } : { items: [{ snippet: { title: "Easy Karahi", tags: ["karahi", "easy recipe"] } }] }), { status: 200 }); };
  const store2 = memoryStore(), k2 = kvMap();
  await runCreatorResearch({ store: store2, kv: k2.kv, env: {}, now: () => T0, ai: research(), fetchImpl: ytFetch, settings: settingsOf({ niches: ["cooking"], countries: ["PK"], on: { tiktok: false, instagram: false } }), budgetMs: 1e9 });
  assert.equal(calls.length, 0, "no YOUTUBE_API_KEY: YouTube is never called");
  const store3 = memoryStore(), k3 = kvMap();
  const r3 = await runCreatorResearch({ store: store3, kv: k3.kv, env: { YOUTUBE_API_KEY: "test-youtube-key-not-real-000000" }, now: () => T0, ai: research(), fetchImpl: ytFetch, settings: settingsOf({ niches: ["cooking"], countries: ["PK"], on: { tiktok: false, instagram: false } }), budgetMs: 1e9 });
  assert.equal(r3.youtube, 1); assert.ok(calls.every((u) => u.startsWith("https://www.googleapis.com/youtube/v3/")));
  const y = await creatorFor({ store: store3, platform: "youtube", niche: "cooking" });
  assert.deepEqual([y.youtube.source, y.youtube.titles, y.youtube.tags], [`YouTube Data API, ${DAY}`, ["Easy Karahi"], ["karahi", "easy recipe"]]);
  assert.equal(Number(k3.m.get(CREATORS.ytKey(DAY))), CREATORS.ytSearchUnits);
  assert.ok(!JSON.stringify(r3).includes("test-youtube-key"), "the key is never in a result");
  assert.equal((await runCreatorResearch({ store, kv, env: {}, now: () => T0, settings: s })).stoppedBy, "NO_AI_KEY");
});

const OWNER_KEY = "owner-key-for-tests-0123456789-abcdefghij", CRON = "cron-secret-for-tests-1234";
test("RR-348 c · ON THE SITE: the Creators tab (counts, on/off, add a niche, Collect now); the keyword cron runs the research after the keywords; the checker shows the data; /v1/creators needs a licence", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const K = kvMap(), store = memoryStore(), n = { calls: 0 };
  const env = { KV_REST_API_URL: "https://kv.example", KV_REST_API_TOKEN: "t", OWNER_ACCESS_KEY: OWNER_KEY, CRON_SECRET: CRON, ANTHROPIC_API_KEY: "test-anthropic-key-not-real-000000", LICENCE_PUBLIC_KEY: publicKey.export({ type: "spki", format: "pem" }) };
  let clock = T0;
  const app = createApp({ mode: "sales", env, kvFetch: K.fetchImpl, kwStore: store, creatorAi: research(n), titleAi: async () => ({ ok: true, usd: 0.0004, data: { titles: [{ title: "x", why: "y" }], meaning: { match: true } } }), now: () => clock, fetchImpl: async () => new Response("", { status: 404 }), dataDir: undefined });
  const srv = createServer(app); await new Promise((r) => srv.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${srv.address().port}`, cookie = ownerCookie({ OWNER_ACCESS_KEY: OWNER_KEY }, T0).split(";")[0];
  const post = async (p, f, h = {}) => { const r = await fetch(base + p, { method: "POST", headers: { cookie, "content-type": "application/x-www-form-urlencoded", ...h }, body: new URLSearchParams(f).toString() }); return { status: r.status, text: await r.text() }; };
  try {
    assert.equal(await store.creatorSettings(), null);
    let page = await (await fetch(base + "/owner/creators", { headers: { cookie } })).text();
    assert.match(page, /The first creator list is saved/); assert.deepEqual((await store.creatorSettings()).countries, DEFAULT_COUNTRIES);
    assert.match(page, /<b>Creators<\/b><\/nav>/); assert.match(page, /data-creator-totals/);
    assert.match(page, /YOUTUBE_API_KEY not set/); assert.match(page, /ANTHROPIC_API_KEY set/);
    for (const c of DEFAULT_COUNTRIES) assert.ok(page.includes(`<span class="chip">${c} `), c);
    assert.match((await post("/owner/creators", { addNiche: "cricket" })).text, /Saved — both creator collectors follow it/);
    await post("/owner/creators", { platform: "instagram", state: "off" });
    page = (await post("/owner/creators/collect", {})).text;
    assert.match(page, /This run: \d+ niche × platform × country researched \(0 with YouTube data\), \$0\.\d{3}/);
    assert.ok(n.calls > 0);
    assert.match(page, /<td><b>Instagram<\/b><\/td><td>off<\/td>/);
    assert.ok(page.includes("<td>cricket</td>"));
    /* the cron: unauthorised refused; authorised runs the research in the time left (Google is not connected here) */
    assert.equal((await fetch(base + "/cron/keywords")).status, 401);
    await post("/owner/creators", { addNiche: "chess" }); // RR-349: Collect now finished every batch — a new niche is due again
    const before = n.calls, cron = await (await fetch(base + "/cron/keywords", { headers: { authorization: `Bearer ${CRON}` } })).json();
    /* RR-349 · the research's own hourly cron: refused without the secret; with it, it runs (nothing is due now: it says so) */
    assert.equal((await fetch(base + "/cron/creators")).status, 401);
    const own = await (await fetch(base + "/cron/creators", { headers: { authorization: `Bearer ${CRON}` } })).json();
    assert.deepEqual([own.ok, own.calls, own.left], [true, 0, 0]);
    assert.ok(cron.creators && n.calls > before, JSON.stringify(cron).slice(0, 200));
    /* the checker: a topic in a niche shows its data, with its source and date */
    const home = await (await fetch(base + "/")).text(), ticket = /name="ticket" value="([^"]+)"/.exec(home.slice(home.indexOf("data-title-check")))[1];
    clock += 3000;
    const r = await fetch(base + "/title-check", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ ticket, platform: "tiktok", title: "my cooking video #food", topic: "easy cooking at home" }).toString() });
    const html = await r.text();
    assert.match(html, /data-creator-box/); assert.match(html, /For “cooking” on TikTok/); assert.ok(html.includes(`AI research, ${DAY}`));
    /* the app's read: no licence → refused; the owner's licence → the data */
    assert.equal((await fetch(base + "/v1/creators?platform=tiktok&niche=cooking")).status, 401);
    const lic = ownerLicenceText(makeOwnerLicence({ privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }), now: T0 }));
    const j = await (await fetch(base + "/v1/creators?platform=tiktok&niche=easy%20home%20cooking&country=PK", { headers: { "x-almivisibility-licence": lic } })).json();
    assert.equal(j.ok, true); assert.equal(j.niche, "cooking"); assert.equal(j.data.source, `AI research, ${DAY}`);
  } finally { srv.close(); }
});

test("RR-348 c · a topic finds its niche by its words; the app's plan uses the data first, with its date", async () => {
  assert.equal(nicheOfTopic("my brothers wedding vlog", DEFAULT_NICHES), null);
  assert.equal(nicheOfTopic("Easy home cooking for students", DEFAULT_NICHES), "cooking");
  assert.equal(nicheOfTopic("tech review of a phone", DEFAULT_NICHES), "tech reviews");
  const { socialPlan } = await import("../desktop/social-app.mjs");
  const p = socialPlan({ platform: "tiktok", niche: "cooking", data: { on: DAY, questions: ["How do I start?"], ideas: ["A beginner's first week"], hashtags: ["#homecooking", "#easyrecipes"], hooks: ["Nobody tells you this…"] } });
  assert.equal(p.ideas[0].idea, "A beginner's first week"); assert.match(p.ideas[0].basedOn, new RegExp(`creator data for "cooking" on TikTok \\(${DAY}\\)`));
  assert.ok(p.hashtagSets[0].tags.includes("#homecooking") && p.hooks[0].hook === "Nobody tells you this…");
});
