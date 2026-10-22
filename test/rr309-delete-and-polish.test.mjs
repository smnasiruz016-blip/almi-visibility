/* RR-309 · DELETE ON THE PRODUCT BOX + POLISH FROM RR-308 (owner decision, 21 Oct 2026). LOCAL only: keys in a memory store (never this
 * computer's Credential Manager); no request leaves the machine; nothing is published. */
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { nicheOf, nicheSummary, channelScripts, inOwnScripts, properNames, FEW_VIDEOS } from "../desktop/youtube-niche.mjs";
import { optionsFor } from "../desktop/youtube-plan.mjs";
import { screen } from "./support/ui-screen.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");

async function app() {
  const dir = mkdtempSync(join(tmpdir(), "rr309-app-"));
  const kp = generateKeyPairSync("ed25519");
  writeFileSync(join(dir, "licence-public.pem"), kp.publicKey.export({ type: "spki", format: "pem" }));
  const { makeOwnerLicence } = await import("../services/licence/service.mjs");
  writeFileSync(join(dir, "config.json"), JSON.stringify({ testSecretsInMemory: true, testAllowLocalSites: true, keysDir: dir, owner: makeOwnerLicence({ privateKeyPem: kp.privateKey.export({ type: "pkcs8", format: "pem" }), now: Date.now() }), licenceUrl: "http://127.0.0.1:9/", updateChannelUrl: "http://127.0.0.1:9/" }));
  /* no key from this computer's settings: a key found there by its NAME would hide whether the app's own store kept or removed it */
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/_API_KEY$|^SEARCH_API_KEY$|_TOKEN$|APP_PASSWORD/.test(k)));
  const p = spawn(process.execPath, [join(REPO, "desktop", "main.mjs"), `--data=${dir}`], { stdio: "ignore", env });
  for (let i = 0; i < 80 && !existsSync(join(dir, "run.json")); i++) await new Promise((r) => setTimeout(r, 100));
  const url = `http://127.0.0.1:${JSON.parse(readFileSync(join(dir, "run.json"), "utf8")).port}`;
  const post = (path, o) => fetch(`${url}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(o) }).then(async (r) => ({ ...(await r.json()), http: r.status }));
  const get = (path) => fetch(`${url}${path}`).then((r) => r.json());
  return { url, dir, post, get, close: () => { p.kill(); rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } };
}

test("A · DELETE ON THE PRODUCT BOX: every box on All products has a visible Delete; it asks in the owner's words with Cancel / Delete; deleting removes ONLY that product's folder and its own publishing key — the other products, their keys, the shared keys, the company and the licence stay", async () => {
  assert.ok(UI.includes("<b>Are you sure?</b> This removes the product and its saved data from this computer."), "not the owner's words");
  assert.match(UI, /<button class="ghost" id="delno">Cancel<\/button> <button id="delyes">Delete<\/button>/);
  const a = await app();
  try {
    await a.post("/api/company", { name: "Owner Co", site: "https://example.invalid", saveAnyway: true });
    const mk = async (name) => (await a.post("/api/products", { name, site: "", goal: { grow: "youtube", hasWebsite: false } })).product.id;
    const wrongYt = await mk("almiworld youtube"), rightYt = await mk("almiworld youtube"), dhanak = await mk("Dhanak ki dunya");
    await a.post("/api/keys/YOUTUBE_API_KEY", { key: "fake-youtube-key-rr309-0000" });
    for (const id of [wrongYt, rightYt]) assert.equal((await a.post(`/api/products/${id}/publish/connect`, { kind: "shopify", shop: "my-shop.myshopify.com", key: `shpat_${id.replace(/-/g, "_")}_key` })).http, 200);
    const before = await a.get("/api/home");
    assert.equal(before.products.length, 3);
    /* the boxes, drawn by the app's own screen: one Delete per product */
    const ui = await screen(a.url);
    const home = ui.app();
    for (const p of before.products) assert.ok(home.includes(`data-del="${p.id}"`), `no Delete on the box of ${p.name}`);
    assert.equal(home.split("🗑 Delete").length - 1, 3);
    assert.equal((await a.post(`/api/products/${wrongYt}/delete`, {})).http, 400, "deleted without Are you sure?");
    assert.equal((await a.post(`/api/products/${wrongYt}/delete`, { confirm: true })).http, 200);
    const after = await a.get("/api/home");
    assert.deepEqual(after.products.map((p) => p.id).sort(), [rightYt, dhanak].sort());
    assert.ok(!existsSync(join(a.dir, "products", wrongYt)), "the product's data is still on this computer");
    assert.ok(existsSync(join(a.dir, "products", rightYt, "state.json")) && existsSync(join(a.dir, "products", dhanak, "state.json")), "another product was touched");
    const keys = (await a.get("/api/keys")).keys;
    assert.equal(keys.YOUTUBE_API_KEY.saved, true, "the shared YouTube key was removed");
    assert.equal((await a.get(`/api/products/${rightYt}/publish`)).keySaved, true, "the other product's own key was removed");
    assert.deepEqual([after.licence, after.company?.name], [before.licence, "Owner Co"], "the licence or the company changed");
    /* the deleted product's own key is gone: a new product reusing its id does not inherit it */
    const reborn = await mk("almiworld youtube");
    assert.equal(reborn, wrongYt);
    assert.equal((await a.get(`/api/products/${reborn}/publish`)).keySaved, false, "the deleted product's own key was kept");
    /* connecting the new product without pasting a key is refused — its key name holds no key left over from the deleted product */
    assert.match((await a.post(`/api/products/${reborn}/publish/connect`, { kind: "shopify", shop: "my-shop.myshopify.com" })).refused ?? "", /^Paste the key/, "the deleted product's own key was kept");
  } finally { a.close(); }
});

const vid = (id, title, o = {}) => ({ videoId: id, title, description: o.description ?? "", tags: o.tags ?? [], publishedAt: o.at ?? "2026-09-01T00:00:00Z", durationSec: o.sec ?? 600, width: 640, height: 360, views: o.views ?? 1000, channelId: o.ch ?? "UCother", channelTitle: "Other" });

test("B1 · ONLY THE CHANNEL'S OWN LANGUAGES: its scripts are read from its own titles (Roman Urdu and English → Latin); niche videos and viewers' questions in another script (Bengali, Devanagari) are left off the screen and counted", () => {
  const own = [vid("o1", "Ammi Ka Birthday | Daily Vlog", { ch: "UCme" }), vid("o2", "Grocery haul in Denmark", { ch: "UCme" }), vid("o3", "Eid ki tayari 🌙", { ch: "UCme" })];
  const scripts = channelScripts({ videos: own, languages: ["en", "ur"] });
  assert.deepEqual([...scripts], ["Latin"], "Urdu script was allowed for a channel that writes in Roman Urdu");
  assert.equal(inOwnScripts("Kya hua? 😊", scripts), true);
  assert.equal(inOwnScripts("ভাই basic ielts", scripts), false);
  const niche = { label: "mom vlog", queries: [{ q: "mom vlog" }] };
  const research = { readOn: "2026-10-21T10:00:00Z", niche: [{ q: "mom vlog", kind: "top", videos: [vid("n1", "Mom vlog morning routine in Oslo", { views: 9000 }), vid("n2", "নানির বাড়ি mom vlog", { views: 900000 }), vid("n3", "नानी के घर mom vlog", { views: 800000 }), vid("n4", "Mom vlog cleaning day", { views: 5000 })] }],
    comments: [{ text: "Which mom vlog camera do you use for cooking videos?", own: false, videoTitle: "x", publishedAt: "2026-10-01", likes: 3 }, { text: "ওটা করলে কি mom vlog এর জন্য ভালো হবে?", own: false, videoTitle: "x", publishedAt: "2026-10-01", likes: 50 }] };
  const s = nicheSummary({ niche, research, own, ownChannelId: "UCme", scripts });
  const shown = JSON.stringify(s.lines);
  assert.doesNotMatch(shown, /[ঀ-৿ऀ-ॿ]/u, "a Bengali or Devanagari line was shown");
  assert.match(shown, /Which mom vlog camera/);
  assert.deepEqual(s.hidden, { videos: 2, questions: 1 });
  assert.match(s.notShown, /^Not shown: 3 in other languages \(2 videos and 1 viewer question written in another script than your channel's — Latin\)/);
  assert.match(UI, /N\.notShown \? `<p class="meta">\$\{esc\(N\.notShown\)\}<\/p>`/, "the screen does not say what was not shown");
});

test("B2 · NAMES KEEP THEIR CAPITALS everywhere options are made: places (one and two words), people, languages, exam names — and nothing else is changed", () => {
  assert.equal(properNames("is oet accepted in canada and new  zealand? pakistani mom in denmark, cv builder"), "is OET accepted in Canada and New Zealand? Pakistani mom in Denmark, CV builder");
  assert.equal(properNames("ukulele americano canadian bacon ai"), "ukulele americano Canadian bacon ai", "a word that is not a name was changed");
  const o = optionsFor(vid("t1", "our trip to iceland and copenhagen", { description: "We drove around the south coast of iceland with the kids." }), { channel: { title: "Mom Diaries", handle: "@momdiaries" }, persona: { who: "Pakistani Mom", places: ["Denmark"], whoFrom: "your channel's description" }, niche: { queries: [{ q: "mom vlog" }] }, summary: null, questions: [] });
  for (const p of o.options) { assert.doesNotMatch(p.title, /\biceland\b|\bcopenhagen\b|\bpakistani\b/, p.title); assert.doesNotMatch(p.description.split("\n")[0], /\biceland\b/, p.description); }
});

test("B3 · A SUCCESS NEVER SHOWS IN RED: every message goes through note() by what it says; no success or 'working…' text is written into a red element", () => {
  assert.match(UI, /function note\(el, text, kind = "info"\)/);
  assert.match(UI, /\.msg-ok\{color:#1F6F43/);
  for (const bad of [/\$\("#rerr"\)\.textContent\s*=/, /msg\([^)]*\)\.textContent\s*=/, /msg\.textContent\s*=/, /\$\("#err"\)\.textContent\s*=\s*(r|x)\.line/, /\$\("#err"\)\.textContent\s*=\s*x\.refused\s*\?\?\s*"Saved/, /\$\("#err"\)\.innerHTML\s*\+?=\s*`<(span|p)/, /\$\("#err"\)\.textContent = "Finish signing in/]) assert.doesNotMatch(UI, bad, String(bad));
});

test("B4 · THREE DIFFERENT OPTIONS without AI: 1 · place + activity + who; 2 · a question people ask (a viewer's own question when one fits this video, else a question shaped from its own words — said so); 3 · a short hook; built only from the research and the video's own words; one 'Better with AI' note at the top", () => {
  const ctx = { channel: { title: "Mom Diaries", handle: "@momdiaries" }, persona: { who: "Pakistani Mom", places: ["Denmark"], whoFrom: "your channel's description" }, niche: { queries: [{ q: "pakistani mom in denmark" }, { q: "mom vlog" }] }, summary: null,
    questions: [{ text: "Which supermarket is cheapest for a grocery haul?", source: "a comment under \"Grocery haul in Sweden\", 2026-10-01", likes: 12 }] };
  const g = optionsFor(vid("g1", "Grocery haul | weekly shopping", { description: "Our weekly grocery shopping at the supermarket." }), ctx);
  assert.deepEqual(g.options.map((p) => p.type), ["Place + activity + who", "A question people ask", "A short hook"]);
  assert.equal(new Set(g.options.map((p) => p.title.toLowerCase())).size, 3, "two options are the same");
  /* RR-311 (owner): the video names no place — the channel's home (Denmark, from the channel's description) is NOT put in its title */
  assert.equal(g.options[0].title, "Grocery Haul | Pakistani Mom Vlog");
  assert.equal(g.options[1].title, "Which supermarket is cheapest for a grocery haul?");
  assert.match(g.options[1].basedOn[0], /^a question a viewer asked: "Which supermarket/);
  assert.match(g.options[1].description, /^This video answers: Which supermarket/);
  assert.ok(g.options[2].title.length <= 60 && /^Come With Us: /.test(g.options[2].title), g.options[2].title);
  /* no viewer question fits: a question shaped from the video's own words, said plainly */
  const b = optionsFor(vid("b1", "BIRTHDAY Weekend | Daily Vlog #778"), { ...ctx, questions: [] });
  /* RR-311 (owner): no "X: What Is It Really Like?" from a title that is not a topic — the third option is the niche's words instead */
  assert.deepEqual(b.options.map((p) => p.type), ["Place + activity + who", "A short hook", "Your niche's words"]);
  assert.ok(b.options.every((p) => !/What Is It Really Like|Denmark/.test(p.title)), JSON.stringify(b.options.map((p) => p.title)));
  /* a travel video that names its place still gets the question shaped for it, said so */
  const t = optionsFor(vid("t2", "Our trip to Iceland", { description: "We drove around Iceland with the kids." }), { ...ctx, questions: [] });
  assert.equal(t.options.find((p) => p.type === "A question people ask").title, "Is Iceland Worth Visiting?");
  assert.match(t.options.find((p) => p.type === "A question people ask").basedOn[0], /no viewer has asked it yet/);
  for (const p of [...g.options, ...b.options]) assert.ok(p.hashtags.length === 3 && p.basedOn.length >= 2);
  assert.match(UI, /\$\{AI_READY \? "" : `<p class="howto" id="ainote">\$\{esc\(a\.aiLine\)\}<\/p>`\}/, "the AI note is not once at the top");
  assert.match(UI, /\$\{AI_READY \? `<button class="ghost aiw"/, "the AI button is shown under every video without an AI");
});

test("B5 · A CHANNEL WITH FEW VIDEOS: the niche research is based on the product's own topics (CV builder, IELTS, OET, language exams) — and the screen says so plainly", () => {
  assert.equal(FEW_VIDEOS, 20);
  const videos = [vid("a1", "Cv builder", { ch: "UCalmi" }), vid("a2", "almicv builder", { ch: "UCalmi" }), vid("a3", "creat your cv here", { ch: "UCalmi" }), vid("a4", "Stop Overpaying for IELTS Coaching — Try This", { ch: "UCalmi" }), vid("a5", "Almiworld new tutorial", { ch: "UCalmi" })];
  const n = nicheOf({ channel: { title: "Almiworld", handle: "@almiworld-world", description: "" }, videos, product: { name: "AlmiWorld YouTube", what: "YouTube channel of AlmiWorld: videos about AlmiWorld's language exam preparation and career products (OET, IELTS, PTE, CV and more)." } });
  const qs = n.queries.map((q) => q.q);
  for (const want of ["CV builder", "IELTS coaching", "OET", "language exam preparation"]) assert.ok(qs.includes(want), `${want} not researched: ${qs}`);
  assert.ok(!qs.includes("career products"), "a vague clause became a search");
  assert.equal(n.basis, `Your channel has only 5 videos, so the niche research is based on your product's own topics: ${qs.join(", ")}.`);
  assert.match(UI, /a\.niche\.basis \? `<p class="warn">\$\{esc\(a\.niche\.basis\)\}<\/p>`/);
});
