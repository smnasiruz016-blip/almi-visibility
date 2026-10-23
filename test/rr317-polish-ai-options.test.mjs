/**
 * RR-317 (owner's live test on Setup-17 with his own key, "Cv builder": the AI options work — "How to Create Your CV Online? | AlmiCV CV
 * Builder"; creat → create, futer → future; nothing invented). Polish what he saw:
 * A · truth first: an invention is never shown, not even with a note — if every option still has one after the retry, the TEMPLATE
 *     options stay, with one plain line.
 * B · no sentence twice in a description; the page the video names (almicv.almiworld.com) linked FIRST; short, no filler.
 * C · with AI options shown: the "too little" line goes, the templates fold into one line, "Use this one" copies the whole option.
 * D · today's real "Cv builder" case in the stand-in set (the stand-in only — the owner's key is not used this round).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { writeWithAI } from "../desktop/ai-write.mjs";
import { optionsFor, noRepeats, pagesNamedIn, orderLinks, linksFor, brandsOf } from "../desktop/youtube-plan.mjs";
/* RR-319 C6: each link line names whose page it is — the brands as the product's own words write them */
const BR = brandsOf({ what: "AlmiWorld — AlmiCV builds your CV." }); // the app passes the product's own words, not the channel title "Almiworld"
import { productStore } from "../desktop/products.mjs";
import { keyStore, memoryBackend } from "../desktop/secrets.mjs";
import { youtubeApp } from "../desktop/youtube-app.mjs";
import { modelFetch } from "./support/model-standin.mjs";

const REPO = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const UI = readFileSync(join(REPO, "desktop", "ui.html"), "utf8");
/* the owner's AlmiWorld videos as YouTube has them (22 Oct) */
const CV = { videoId: "R8hFtJISP-4", title: "Cv builder", description: "almicv.almiworld.com helps you creat your cv for your better futer", views: 6, publishedAt: "2026-06-06T00:00:00Z", durationSec: 600, width: 1280, height: 720, tags: [] };
const OWN = [CV,
  { videoId: "ayFHPpLjjiA", title: "almicv builder", description: "need hel to creat your cv almicv.almiworld.com is the plateform", views: 0, publishedAt: "2026-06-06T00:00:00Z", durationSec: 600, width: 1280, height: 720, tags: [] },
  { videoId: "cLQbQdqnHrQ", title: "creat your cv here", description: "looking to creat stunning cv with ai help come to almicv.almiworld.com", views: 0, publishedAt: "2026-06-06T00:00:00Z", durationSec: 600, width: 1280, height: 720, tags: [] },
  { videoId: "9fiuKrpw3JM", title: "Almiworld new tutorial", description: "tutorial almiworld , about products , and how to use them", views: 3, publishedAt: "2026-06-02T00:00:00Z", durationSec: 600, width: 1280, height: 720, tags: [] }];
const AW = { channel: { title: "Almiworld", handle: "@almiworld-world", description: "" }, ownNames: ["https://almiworld.com/", "AlmiCV", "AlmiPrep"], persona: {}, niche: { queries: [{ q: "CV builder" }] }, kind: "LONG", style: "English", language: "English" };
const sentences = (d) => String(d).split("\n").flatMap((l) => l.split(/(?<=[.!?])\s+/)).map((s) => s.toLowerCase().replace(/https?:\/\/\S+|\b[\w-]+(\.[\w-]+)+\b/g, " ").split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2)).filter((w) => w.length >= 4);
const repeats = (d) => { const s = sentences(d), out = []; s.forEach((a, i) => s.slice(0, i).forEach((b) => { const A = new Set(a), B = new Set(b); let n = 0; for (const w of A) if (B.has(w)) n++; if (n / Math.max(A.size, B.size) >= 0.8) out.push(a.join(" ")); })); return out; };
const linkLines = (d) => String(d).split("\n").filter((l) => /^[\p{L}\p{N}]+: https:\/\//u.test(l));

test("B1 · NO SENTENCE TWICE: the real answer's repeat is dropped; a different sentence stays", () => {
  const real = "How to create your CV online with AlmiCV.\nCV Builder · AlmiCV\n\nAlmiCV helps you create your CV for your better future.\nalmicv.almiworld.com helps you create your CV for your better future.\n\nMore: https://almiworld.com/";
  const fixed = noRepeats(real);
  assert.deepEqual(repeats(fixed), []); assert.equal((fixed.match(/for your better future/g) ?? []).length, 1);
  assert.match(fixed, /^How to create your CV online with AlmiCV\./); assert.match(fixed, /More: https:\/\/almiworld\.com\//);
  assert.equal(noRepeats("Hum Iceland gaye. Bohot maza aaya.\nPhir hum ghar aaye."), "Hum Iceland gaye. Bohot maza aaya.\nPhir hum ghar aaye.");
});

test("B2 · THE PAGE THE VIDEO NAMES, FIRST: almicv.almiworld.com → https://almicv.almiworld.com, before the product's site and the channel; never a Facebook link", () => {
  assert.deepEqual(pagesNamedIn(CV), ["https://almicv.almiworld.com"]);
  const L = linksFor(CV, { url: "https://almiworld.com/" }, "@almiworld-world", BR).map((l) => `${l.label}: ${l.url}`);
  assert.deepEqual(L, ["AlmiCV: https://almicv.almiworld.com", "AlmiWorld: https://almiworld.com/", "Subscribe: https://www.youtube.com/@almiworld-world?sub_confirmation=1"]);
  assert.deepEqual(linksFor({ title: "Day out", description: "Follow us https://www.facebook.com/x" }, { url: "https://almiworld.com/" }, null).map((l) => l.url), ["https://almiworld.com/"]);
  /* an AI description's own link lines are put in that order; a sentence that names the address keeps it */
  const o = orderLinks("Create your CV online.\nalmicv.almiworld.com helps you.\nhttps://almiworld.com/\nSubscribe: @almiworld-world", linksFor(CV, { url: "https://almiworld.com/" }, "@almiworld-world", BR));
  assert.deepEqual(linkLines(o), L); assert.match(o, /^Create your CV online\.\nalmicv\.almiworld\.com helps you\.\n\nAlmiCV:/);
});

test("B1 + B2 · EVERY TEMPLATE OPTION of the owner's videos: no sentence twice, and the AlmiCV page first where the video names it", () => {
  const ctx = { channel: { title: "Almiworld", handle: "@almiworld-world" }, persona: {}, niche: { queries: [{ q: "cv builder" }] }, summary: null, readOn: "2026-10-22", productUrl: "https://almiworld.com/", productIsChannel: false, relatedPages: [], linkBrands: BR };
  for (const v of OWN) for (const o of optionsFor(v, ctx).options) {
    assert.deepEqual(repeats(o.description), [], `${v.title}: ${o.description}`);
    const first = linkLines(o.description)[0];
    assert.equal(first, /almicv\.almiworld\.com/.test(v.description) ? "AlmiCV: https://almicv.almiworld.com" : "AlmiWorld: https://almiworld.com/", `${v.title}: ${o.description}`);
  }
});

test("A + D · THE STAND-IN SET with today's real case (the repeat, no AlmiCV link): every AI option has no sentence twice and the named page first; an invention is never shown — the templates instead", async () => {
  const n = {};
  for (const v of OWN) {
    const r = await writeWithAI({ provider: "anthropic", key: "k", video: v, ctx: { ...AW, linkOrder: linksFor(v, { url: "https://almiworld.com/" }, "@almiworld-world", BR), links: linksFor(v, { url: "https://almiworld.com/" }, "@almiworld-world").map((l) => l.url) }, fetchImpl: modelFetch([]), base: "http://127.0.0.1:9" });
    n[r.outcome] = (n[r.outcome] ?? 0) + 1;
    assert.equal(r.ok, true, `${v.title}: ${r.why}`);
    for (const o of r.options) {
      assert.deepEqual(repeats(o.description), [], `${v.title}: ${o.description}`);
      assert.equal(linkLines(o.description)[0], /almicv\.almiworld\.com/.test(v.description) ? "AlmiCV: https://almicv.almiworld.com" : "AlmiWorld: https://almiworld.com/", o.description);
    }
  }
  /* the stand-in really repeats (the set proves something) */
  const raw = JSON.parse(JSON.parse(JSON.stringify(await (await modelFetch([])("u", { body: JSON.stringify({ messages: [{ content: `MATERIAL:\nVIDEO TITLE: Cv builder\nVIDEO DESCRIPTION (its own): ${CV.description}` }] }) })).json())).content[0].text).options;
  assert.ok(raw.some((o) => repeats(o.description).length), "the stand-in never repeated a sentence — the set proves nothing");
  /* an invented place in every option, even after the retry: the templates, said in one plain line */
  const inv = await writeWithAI({ provider: "anthropic", key: "k", video: CV, ctx: AW, base: "http://127.0.0.1:9", fetchImpl: async () => new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ options: [{ title: "CV Builder in Paris", description: "Create your CV in Paris with AlmiCV — ready to send today.", hashtags: ["#CV"], thumbnail: "CV PARIS", names: [], facts: [] }] }) }], usage: { input_tokens: 1, output_tokens: 1 } }), { status: 200 }) });
  assert.deepEqual([inv.ok, inv.fallback, inv.outcome], [false, true, "templates instead"]);
  assert.equal(inv.why, "Your AI's options named something that is not in this video (e.g. Paris) — the ready options here are from your own words.");
});

test("A · IN THE APP: the write route says the fallback, and the screen shows it as plain information with the templates kept", () => {
  assert.match(readFileSync(join(REPO, "desktop", "main.mjs"), "utf8"), /\{ refused: r\.why, fallback: r\.fallback === true, aiCost: r\.aiCost \?\? null \}/);
  assert.match(UI, /return note\(msg, r\.refused \?\? r\.why, r\.fallback \? "info" : "err"\);/);
});

test("C · THE SCREEN: with AI options, the \"too little\" line goes and the templates fold into \"Show the template options (N)\"; each AI option has \"Use this one\" (title, description and hashtags together)", () => {
  assert.match(UI, /\$\{v\.weak \? `<p class="meta weak">/);
  assert.match(UI, /vb\.querySelector\("\.weak"\)\?\.remove\(\);/);
  assert.match(UI, /<details class="tplopts" style="grid-column:1\/-1"><summary>Show the template options \(\$\{tpl\}\)<\/summary>/);
  assert.match(UI, /\$\{o\.byAI \? ` <span class="tag">Written with your AI<\/span> <button class="copy useone" type="button" data-copy="\$\{esc\(useText\(o\)\)\}">Use this one<\/button>` : ""\}/);
  assert.match(UI, /const useText = \(o\) => `\$\{o\.title\}\\n\\n\$\{o\.description\}\\n\\n\$\{o\.hashtags\.join\(" "\)\}`;/);
  assert.match(UI, /const label = b\.textContent;[^\n]*setTimeout\(\(\) => \(b\.textContent = label\), 1600\)/, "the button comes back as \"Copy\" whatever its label");
});

test("A + B · IN THE APP: the write sends the links in order and the shown options have the AlmiCV page first, with no sentence twice", async () => {
  const dir = mkdtempSync(join(tmpdir(), "rr317-write-")), store = productStore(dir), made = store.create({ name: "almiworld youtube", site: "https://almiworld.com/" });
  try {
    const keys = keyStore({ backend: memoryBackend(), env: {} }); keys.set("YOUTUBE_API_KEY", "standin-youtube-key-000000000000"); keys.set("ANTHROPIC_API_KEY", "standin-ai-key-000000000000");
    const seen = [];
    const YT = youtubeApp({ store, dataDir: dir, keys, fetchImpl: async () => { throw new Error("no network in this test"); }, aiFetchImpl: modelFetch(seen) });
    const today = new Date().toISOString().slice(0, 10), CH = "UC4Yg3-nLW-2MLxSxdAh_LmQ";
    store.write(made.id, { ...made, setup: { ...made.setup, aiConnection: { provider: "anthropic" }, product: { ...made.setup.product, what: "AlmiWorld — AlmiCV builds your CV." }, youtube: { handle: "@almiworld-world", confirmed: { channelId: CH, title: "Almiworld", handle: "@almiworld-world", description: "", on: today } } } });
    mkdirSync(join(store.dirOf(made.id), "youtube-raw"), { recursive: true });
    writeFileSync(join(store.dirOf(made.id), "youtube-raw", `videos-${today}.json`), JSON.stringify({ recorded_at: new Date().toISOString(), channelId: CH, complete: true, videos: [{ ...CV, channelId: CH }] }));
    const r = await YT.write(made.id, { videoId: CV.videoId });
    assert.equal(r.ok, true, r.why);
    assert.match(seen[0].messages[0].content, /^LINKS TO USE: https:\/\/almicv\.almiworld\.com https:\/\/almiworld\.com\/ https:\/\/www\.youtube\.com\/@almiworld-world\?sub_confirmation=1$/m);
    for (const o of r.options) { assert.deepEqual(repeats(o.description), [], o.description); assert.equal(linkLines(o.description)[0], "AlmiCV: https://almicv.almiworld.com"); assert.match(o.description, /^AlmiWorld: https:\/\/almiworld\.com\/$/m); assert.doesNotMatch(o.description, /^More:/m); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
