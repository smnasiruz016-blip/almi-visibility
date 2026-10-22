/**
 * RR-312 (owner, 22 Oct 2026: "guard mein aisi settings karein ke baar baar ruke nahien"). On the owner's own video the guard hid ALL AI
 * options over "2018" — the AI's right fix of his typo "1018" beside 2016 and 2017.
 *   1 · a problem → the AI is asked once more, told what was not in the material; the client sees nothing of it;
 *   2 · options that pass are always shown; a doubt is shown with a yellow note; only an option naming a truly invented place, person, price
 *       or claim is hidden — only that one;
 *   3 · a typo fix of the video's own words or numbers passes, marked "corrected from your description";
 *   4 · measured on 20 videos with a stand-in that slips like a real model: all options hidden on at most 1 in 20; an invented place hidden
 *       every time.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeWithAI, reviewOption, checkOptions, materialOf } from "../desktop/ai-write.mjs";
import { modelFetch, modelReply } from "./support/model-standin.mjs";

const ICELAND = { title: "my old iceland travel videos compilation | Dhanak Ki Duniya", description: "these videos are my old Iceland travel videos compilation from year 2016, 2017, 1018, before covid pandemic started" };
const CTX = { channel: { title: "Dhanak Ki Duniya", handle: "@dhanakkiduniya", description: "Pakistani mom in Denmark" }, persona: { who: "Pakistani Mom" }, niche: { queries: [] }, kind: "LONG", style: "Roman Urdu/Hindi", links: [] };
const opt = (title, more = {}) => ({ title, description: "Meri purani Iceland yaadein — 2016, 2017 aur 2018 ki travel videos ek saath.", hashtags: ["#Iceland", "#TravelVlog", "#Memories"], thumbnail: "ICELAND YAADEIN", names: [], facts: [], ...more });

test("3 · THE OWNER'S CASE: 2018 beside 2016 and 2017, where his description says 1018, is a correction — shown, marked; Togather → Together too", () => {
  const m = materialOf(ICELAND, CTX);
  assert.deepEqual(reviewOption(opt("Meri Purani Iceland Memories 2016–2018"), m), { hidden: [], check: [], corrected: ["1018 → 2018"] });
  const t = reviewOption(opt("Hum Sab Together in Iceland"), materialOf({ ...ICELAND, description: `${ICELAND.description}. Hum sab togather.` }, CTX));
  assert.ok(t.corrected.includes("togather → together"), JSON.stringify(t));
});

test("2 · A DOUBT IS SHOWN WITH A NOTE; only a truly invented place, person, price or claim hides an option — only that one", () => {
  const m = materialOf(ICELAND, CTX);
  assert.deepEqual(reviewOption(opt("Iceland Memories 2009"), m).check, ["Check: 2009 — not in your video's own words"]);
  /* 2015 is not a typo of 2016 (another year, one apart) — a doubt, not a correction */
  assert.deepEqual(reviewOption(opt("Iceland Memories 2015"), m), { hidden: [], check: ["Check: 2015 — not in your video's own words"], corrected: ["1018 → 2018"] });
  /* a one-digit slip far in value, with no neighbouring years: a doubt that names what the description says */
  assert.deepEqual(reviewOption(opt("Iceland in 1990", { description: "Meri purani Iceland yaadein, ek saath, hum sab ke saath." }), materialOf({ ...ICELAND, description: "my trip in 1890 to the north" }, CTX)).check, ["Check: 1990 — your description says 1890"]);
  const r = checkOptions([opt("Meri Purani Iceland Memories"), opt("Iceland Memories 2009"), opt("Iceland and Paris Memories"), opt("Iceland on $50 a Day"), opt("Iceland With Sara", { names: ["Sara"] })], m);
  assert.deepEqual(r.kept.map((k) => k.title), ["Meri Purani Iceland Memories", "Iceland Memories 2009"]);
  assert.deepEqual(r.kept[1].check, ["Check: 2009 — not in your video's own words"]);
  assert.deepEqual(r.dropped.map((d) => d.hidden), [["Paris"], ["$50"], ["Sara"]]);
  /* "parts" (a word of the material's own labels) is not a misspelt "Paris" */
  assert.deepEqual(reviewOption(opt("Iceland and Paris Memories"), `${m}\nat least 3 parts`).hidden.map((h) => h.what), ["Paris"]);
  /* form slips are put right without a word: a 4th hashtag, a 5-word thumbnail */
  const f = checkOptions([opt("Meri Purani Iceland Memories", { hashtags: ["#A1", "#B1", "#C1", "#D1"], thumbnail: "MERI PURANI ICELAND KI YAADEIN" })], m).kept[0];
  assert.deepEqual([f.hashtags.length, f.thumbnail.split(" ").length], [3, 4]);
});

test("1 · RETRY FIRST: a hidden or doubtful option makes Visibility ask once more, naming it; the passing second answer is shown; the client is told nothing of the retry; both requests counted", async () => {
  const seen = [];
  let call = 0;
  const fetchImpl = async (url, init) => { seen.push(JSON.parse(init.body)); call++; const o = call === 1 ? [opt("Iceland and Paris Memories"), opt("Iceland Memories 2009"), opt("Meri Purani Iceland Memories")] : [opt("Meri Purani Iceland Yaadein"), opt("Iceland Ke Pehle Din"), opt("Hamari Iceland Travel Yaadein")]; return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ options: o }) }], usage: { input_tokens: 100, output_tokens: 50 } }), { status: 200 }); };
  const r = await writeWithAI({ provider: "anthropic", key: "k", video: ICELAND, ctx: CTX, fetchImpl, base: "http://127.0.0.1:9" });
  assert.equal(call, 2); assert.equal(r.retried, true);
  assert.match(seen[1].system, /your previous answer used "Paris", "2009", which are not in the material\. Do not use them; use only the video's own words and the research\./);
  assert.deepEqual(r.options.map((o) => o.title), ["Meri Purani Iceland Yaadein", "Iceland Ke Pehle Din", "Hamari Iceland Travel Yaadein"]);
  assert.deepEqual(r.dropped, [], "the first answer's hidden option was reported after a clean retry");
  assert.deepEqual(r.usages.length, 2); assert.deepEqual(r.usage, { input: 200, output: 100 });
  /* nothing to retry: one request only */
  let one = 0; await writeWithAI({ provider: "anthropic", key: "k", video: ICELAND, ctx: CTX, fetchImpl: async () => { one++; return new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ options: [opt("A Iceland Yaadein"), opt("B Iceland Ke Din"), opt("C Iceland Travel")] }) }] }), { status: 200 }); }, base: "http://127.0.0.1:9" });
  assert.equal(one, 1);
});

test("4 · MEASURED: 20 videos, a stand-in that slips like a real model — all options hidden on at most 1 in 20; an invented place hidden every time", async () => {
  const videos = Array.from({ length: 20 }, (_, i) => ({ title: ["Ghar ka kaam aur bachon ki masti", "Iceland ki sardi aur hum", "Eid ki tayari | family vlog", "Sunday cleaning reset", "Baby Ki Choti Phupo Iceland Pohanch Gayi!"][i % 5] + ` ${i + 1}`, description: i % 4 === 0 ? "these videos are my old travel videos from year 2016, 2017, 1018" : "Hum sab ne bohot maza kiya, ghar mein masti." }));
  let allHidden = 0, retried = 0, noted = 0, placeShown = 0, placeMade = 0;
  for (const v of videos) {
    const seen = [];
    const r = await writeWithAI({ provider: "anthropic", key: "k", video: v, ctx: CTX, fetchImpl: modelFetch(seen), base: "http://127.0.0.1:9" });
    if (!r.ok) allHidden++; if (r.retried) retried++; if (r.options?.some((o) => o.check.length)) noted++;
    placeMade += seen.filter((s) => /Paris/.test(JSON.stringify(modelReply(s.messages[0].content.replace(/^MATERIAL:\n/, ""), { attempt: /previous answer used/.test(s.system) ? 1 : 0, avoid: [] })))).length;
    if (r.options?.some((o) => /Paris/.test(`${o.title} ${o.description}`))) placeShown++;
  }
  assert.ok(allHidden <= 1, `all options hidden on ${allHidden} of 20`);
  assert.equal(placeShown, 0, "an invented place was shown");
  assert.ok(placeMade >= 1, "the stand-in never invented a place — the measure proves nothing");
  assert.ok(retried >= 1, "no retry happened — the measure proves nothing");
});
