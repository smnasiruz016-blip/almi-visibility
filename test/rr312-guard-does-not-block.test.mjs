/**
 * RR-312 (owner, 22 Oct 2026: "guard baar baar ruke nahien, aur result bhi best de"; "dates aur naam har video ke saath fixed nahien diye ja
 * sakte; content se match kar ke likhna hoga"). On the owner's own video the guard hid ALL AI options over "2018" — the AI's right fix of his
 * typo "1018" beside 2016 and 2017.
 *   1 · a FACT SHEET per video, made automatically, grounds the prompt (places, names, numbers, years, prices, what happens, typo suspects);
 *   3 · TIER 1 — a cheap code check: citations (inflection allowed), places, people, prices, numbers; a typo fix passes, marked;
 *   4 · TIER 2 — only the doubtful options go back to the AI once, naming the doubt; still doubtful → shown with a yellow note;
 *   5 · only a clear invention is hidden, in that option alone;
 *   7 · a fixed set of 30 videos with a stand-in that slips like a real model: all hidden 0; every invented place caught; clean + retried-and-
 *       passed ≥ 27. (The same check runs on 30 of Dhanak's real videos from the data copy: _handoffs/AlmiVisibility_RR-312_TESTSET.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeWithAI, reviewOption, checkOptions, materialOf, factSheet } from "../desktop/ai-write.mjs";
import { modelFetch } from "./support/model-standin.mjs";

const ICELAND = { title: "my old iceland travel videos compilation | Dhanak Ki Duniya", description: "these videos are my old Iceland travel videos compilation from year 2016, 2017, 1018, before covid pandemic started" };
const CTX = { channel: { title: "Dhanak Ki Duniya", handle: "@dhanakkiduniya", description: "Pakistani mom in Denmark" }, persona: { who: "Pakistani Mom" }, niche: { queries: [] }, kind: "LONG", style: "Roman Urdu/Hindi", links: [] };
const opt = (title, more = {}) => ({ title, description: "Meri purani Iceland yaadein — 2016, 2017 aur 2018 ki travel videos ek saath.", hashtags: ["#Iceland", "#TravelVlog", "#Memories"], thumbnail: "ICELAND YAADEIN", names: [], facts: [], ...more });
const reply = (options, usage = { input_tokens: 100, output_tokens: 50 }) => new Response(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify({ options }) }], usage }), { status: 200 });

test("1 · THE FACT SHEET of THIS video, made from its own words: its places, years, numbers, what happens, and the typo suspects with their fix — and the prompt is grounded in it", () => {
  const f = factSheet({ ...ICELAND, description: `${ICELAND.description}. Hum sab togather, Sara ke saath.` }, {});
  assert.deepEqual([f.places, f.years, f.numbers], [["Iceland"], ["2016", "2017"], ["1018"]]);
  assert.deepEqual(f.typos.map((t) => t.why), ["1018 — probably 2018, next to 2016, 2017", "togather → together"]);
  assert.deepEqual(f.names, ["Sara"]);
  const m = materialOf(ICELAND, CTX);
  assert.match(m, /FACT SHEET FOR THIS VIDEO \(made from its own words — use only these facts\):\n  places: Iceland\n  people's names: none named\n  years: 2016, 2017/);
  assert.match(m, /typo suspects \(you may write the fix\): 1018 — probably 2018, next to 2016, 2017/);
});

test("3 · TIER 1: the owner's 2018 is a correction (shown, marked); another year one apart is a doubt; a quote passes in another inflection; 'parts' is not a misspelt 'Paris'; form slips put right", () => {
  const m = materialOf(ICELAND, CTX);
  assert.deepEqual(reviewOption(opt("Meri Purani Iceland Memories 2016–2018"), m), { hidden: [], check: [], corrected: ["1018 → 2018"] });
  assert.deepEqual(reviewOption(opt("Iceland Memories 2015"), m).check, ["Check: 2015 — not in your video's own words"]);
  assert.deepEqual(reviewOption(opt("Part 2 — Iceland Yaadein"), m).check, [], "a single digit was taken for a fact");
  assert.deepEqual(reviewOption(opt("Iceland in 1990", { description: "Meri purani Iceland yaadein, ek saath, hum sab ke saath." }), materialOf({ ...ICELAND, description: "my trip in 1890 to the north" }, CTX)).check, ["Check: 1990 — your description says 1890"]);
  assert.deepEqual(reviewOption(opt("Iceland Ki Yaadein", { facts: [{ fact: "travel videos compiled", quote: "travel video compilations" }] }), m).hidden, [], "an inflected quote was taken for an invented claim");
  assert.deepEqual(reviewOption(opt("Iceland and Paris Memories"), `${m}\nat least 3 parts`).hidden.map((h) => h.what), ["Paris"]);
  const r = checkOptions([opt("Meri Purani Iceland Memories", { hashtags: ["#A1", "#B1", "#C1", "#D1"], thumbnail: "MERI PURANI ICELAND KI YAADEIN" }), opt("Iceland on $50 a Day"), opt("Iceland With Sara", { names: ["Sara"] })], m);
  assert.deepEqual([r.kept[0].hashtags.length, r.kept[0].thumbnail.split(" ").length], [3, 4]);
  assert.deepEqual(r.dropped.map((d) => d.hidden), [["$50"], ["Sara"]]);
});

test("4 · TIER 2: ONLY the doubtful options go back once, each with its doubt; the clean one is untouched; rewrites that pass are shown; a doubt that stays is shown with its note; both requests counted; never a third", async () => {
  const seen = []; let call = 0;
  const fetchImpl = async (url, init) => { seen.push(JSON.parse(init.body)); call++; return call === 1 ? reply([opt("Meri Purani Iceland Memories"), opt("Iceland and Paris Memories"), opt("Iceland Memories 2009")]) : reply([opt("Iceland Ki Purani Memories"), opt("Iceland Memories 2009 Ki")]); };
  const r = await writeWithAI({ provider: "anthropic", key: "k", video: ICELAND, ctx: CTX, fetchImpl, base: "http://127.0.0.1:9" });
  assert.equal(call, 2, "more than one retry, or none");
  const asked = JSON.parse(seen[1].messages[0].content.split("OPTIONS TO RE-CHECK:\n")[1]);
  assert.deepEqual(asked.map((x) => [x.option.title, x.not_in_the_material]), [["Iceland and Paris Memories", ["Paris"]], ["Iceland Memories 2009", ["2009"]]]);
  assert.match(seen[1].system, /RE-CHECK \(RR-312 Tier 2\): you are given 2 options you wrote/);
  assert.match(seen[0].system, /use only the FACT SHEET FOR THIS VIDEO, the video's own words and the research; if you are unsure of a detail \(a year, a name, a place, a number\), leave it out/);
  assert.deepEqual(r.options.map((o) => [o.title, o.check]), [["Meri Purani Iceland Memories", []], ["Iceland Ki Purani Memories", []], ["Iceland Memories 2009 Ki", ["Check: 2009 — not in your video's own words"]]]);
  assert.equal(r.outcome, "shown with a note"); assert.deepEqual(r.dropped, []);
  assert.deepEqual(r.usages.length, 2); assert.deepEqual(r.usage, { input: 200, output: 100 });
  /* nothing doubtful: one request only, "shown clean" */
  let one = 0; const c = await writeWithAI({ provider: "anthropic", key: "k", video: ICELAND, ctx: CTX, fetchImpl: async () => { one++; return reply([opt("A Iceland Yaadein"), opt("B Iceland Ke Din"), opt("C Iceland Travel")]); }, base: "http://127.0.0.1:9" });
  assert.deepEqual([one, c.outcome], [1, "shown clean"]);
});

test("5 · HIDE ONLY A CLEAR INVENTION: a Paris that stays after the re-check is hidden in that one option; a rewrite WORSE than its first version (a note → an invention) is not taken; the others always show", async () => {
  let call = 0;
  const r = await writeWithAI({ provider: "anthropic", key: "k", video: ICELAND, ctx: CTX, fetchImpl: async () => (++call === 1 ? reply([opt("Meri Purani Iceland Memories"), opt("Iceland and Paris Memories"), opt("Iceland Memories 2009")]) : reply([opt("Iceland Paris Trip Yaadein"), opt("Iceland and Rome 2009")])), base: "http://127.0.0.1:9" });
  assert.deepEqual(r.options.map((o) => [o.title, o.check]), [["Meri Purani Iceland Memories", []], ["Iceland Memories 2009", ["Check: 2009 — not in your video's own words"]]]);
  assert.deepEqual(r.dropped.map((d) => d.hidden), [["Paris"]]); assert.equal(r.outcome, "one option hidden");
});

test("7 · THE FIXED TEST SET (30 videos shaped like Dhanak's, a stand-in that slips like a real model): all hidden 0; every invented place caught; clean + retried-and-passed ≥ 27", async () => {
  const T = ["Ghar ka kaam aur bachon ki masti", "Iceland ki sardi aur hum", "Eid ki tayari | family vlog", "Sunday cleaning reset", "Baby Ki Choti Phupo Iceland Pohanch Gayi!", "Ammi ka birthday | daily vlog"];
  const videos = Array.from({ length: 30 }, (_, i) => ({ title: `${T[i % T.length]} ${i + 1}`, description: i % 5 === 0 ? "these videos are my old travel videos from year 2016, 2017, 1018" : i % 7 === 0 ? "Hum sab togather, bohot maza aaya." : "Hum sab ne bohot maza kiya, ghar mein masti." }));
  const n = { "shown clean": 0, "retried and passed": 0, "shown with a note": 0, "one option hidden": 0, "all hidden": 0 };
  let placeShown = 0, placeMade = 0;
  for (const v of videos) {
    const seen = [];
    const r = await writeWithAI({ provider: "anthropic", key: "k", video: v, ctx: CTX, fetchImpl: modelFetch(seen), base: "http://127.0.0.1:9" });
    n[r.outcome]++;
    placeMade +=seen.length > 1 && /Paris/.test(seen[1].messages[0].content) ? 1 : 0;
    if ((r.options ?? []).some((o) => /Paris/.test(`${o.title} ${o.description}`))) placeShown++;
  }
  assert.equal(n["all hidden"], 0, JSON.stringify(n));
  assert.equal(placeShown, 0, "an invented place was shown");
  assert.ok(placeMade >= 1, "the stand-in invented no place — the set proves nothing");
  assert.ok(n["shown clean"] + n["retried and passed"] >= 27, JSON.stringify(n));
});

test("2 + 3 ON THE SCREEN: each AI option shows its yellow \"Check\" note and its \"Corrected from your description\" note", async () => {
  const { readFileSync } = await import("node:fs");
  const ui = readFileSync(new URL("../desktop/ui.html", import.meta.url), "utf8");
  assert.match(ui, /\$\{\(o\.check \?\? \[\]\)\.map\(\(c\) => `<p class="warn check">\$\{esc\(c\)\}<\/p>`\)\.join\(""\)\}/, "the yellow note is not drawn");
  assert.match(ui, /✓ Corrected from your description: \$\{esc\(o\.corrected\.join\(", "\)\)\}/, "the correction is not drawn");
});
