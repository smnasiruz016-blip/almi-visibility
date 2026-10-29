/**
 * RR-347 FIX v2 (owner, 29 Oct 2026) · 1 the keyword checks match by MEANING across languages (never ✗ only for language); 2 the small
 * texts on the dark bands larger and brighter (WCAG AA); 3 the YouTube line; 5 the no-promise line a footnote at the end; 6 the YouTube
 * cards as mini screens, no ▶.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../site/pages.mjs";
import { YT, HOME_CSS } from "../site/home-sales.mjs";
import { checkTitle, checkCaption, withMeaning, betterCaptions, MEANING_LINE } from "../site/title-check.mjs";
import { sameWord, plain } from "../site/meaning.mjs";

const kw = (c) => c.checks.find((x) => x.id === "keyword" || x.id === "keywords");

test("FIX v2 point 1 · the owner's exact case: topic \"my brothers wedding\", title \"meray bhaie ki shadee\" → ✓ (offline, no AI)", () => {
  const c = checkTitle("meray bhaie ki shadee", "my brothers wedding");
  assert.equal(kw(c).ok, true, JSON.stringify(kw(c)));
  assert.match(kw(c).line, /"bhaie" means "brothers"/);
  /* the same in Hindi, Urdu and Arabic script, and the topic in Roman Urdu with an English title */
  for (const t of ["मेरे भाई की शादी", "میرے بھائی کی شادی", "زفاف أخي"]) assert.equal(kw(checkTitle(t, "my brothers wedding")).ok, true, t);
  assert.equal(kw(checkTitle("My Brother's Wedding Day", "bhai ki shadi")).ok, true);
  assert.ok(sameWord("shaadi", "shadee") && sameWord("bhaee", "brother") && plain("brothers") === "brother");
  /* TikTok and Instagram: the same */
  assert.equal(kw(checkCaption("tiktok", "Bhai ki shadi ki tayyari 🎉 follow for part 2 #shadi #wedding #desiwedding", "brother's wedding")).ok, true);
  assert.equal(kw(checkCaption("instagram", "Meri behen ki mehndi 💛\nSave this! #mehndi #wedding #desi", "my sister's wedding")).ok, true);
});

test("FIX v2 point 1 · words not in common are never a ✗ by themselves: the AI's meaning decides; with no AI answer it is \"not checked\"", () => {
  const c = checkTitle("Ek din meri zindagi mein", "a day in my life as a nurse");
  /* "din" = day: found offline */
  assert.equal(kw(c).ok, true);
  const unknown = checkTitle("Kal ka scene sab ko batao", "weekend ideas for students");
  assert.equal(kw(unknown).ok, null, "pending, not ✗");
  assert.equal(kw(withMeaning(unknown, { state: "busy" })).ok, null, "no AI answer: not checked");
  assert.equal(kw(withMeaning(unknown, { state: "busy" })).line, MEANING_LINE.none);
  assert.equal(kw(withMeaning(unknown, { meaning: true })).ok, true, "the AI says same meaning: ✓");
  assert.equal(kw(withMeaning(unknown, { meaning: false })).ok, false, "the AI says no: ✗");
  const s1 = withMeaning(unknown, {}), s2 = withMeaning(unknown, { meaning: true });
  assert.ok(s2.score > s1.score || s2.measured > s1.measured, "the score is made again");
  for (const p of ["tiktok", "instagram"]) assert.equal(kw(checkCaption(p, "Kal ka plan #weekend #students #plans", "weekend plans for students")).ok, true, `${p}: hashtags are words too`);
});

test("FIX v2 point 1 · the AI is asked the meaning question and its answer reaches the result", async () => {
  let system = ""; const ai = async (o) => { system = o.system; return { ok: true, usd: 0.0003, data: { titles: [{ title: "x", why: "y" }], meaning: { match: true } } }; };
  const m = new Map(), kv = { run: async (cmds) => cmds.map(([c, k, v]) => (c === "GET" ? m.get(k) ?? null : (m.set(k, String(Number(m.get(k) ?? 0) + Number(v))), 1))) };
  for (const p of ["youtube", "tiktok"]) {
    const r = await betterCaptions({ platform: p, title: "Kal ka plan", topic: "weekend plans", kv, env: {}, ai });
    assert.equal(r.meaning, true, p);
    assert.match(system, /meaning\.match/);
    assert.match(system, /Roman Urdu "bhai ki shadi" = "brother's wedding"/);
  }
});

/* WCAG 2 contrast of two #RRGGBB colours */
const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test("FIX v2 point 2 · the small texts on the dark bands: at least 15px, and at least 4.5:1 (WCAG AA) on the darkest and lightest band background", () => {
  for (const sel of [".tt-fine", ".yt-fine", ".tt-checks p", ".tt-better p", ".yt-cards p", ".tt-for"]) {
    const rule = new RegExp(`${sel.replace(/[.]/g, "\\.")}\\{[^}]*\\}`).exec(HOME_CSS)?.[0];
    assert.ok(rule, sel);
    const size = Number(/font-size:(\d+)px/.exec(rule)?.[1] ?? 16), colour = /color:(#[0-9A-F]{6})/i.exec(rule)[1];
    assert.ok(size >= 15, `${sel} ${size}px`);
    for (const bg of ["#0B0B0F", "#15151C"]) assert.ok(contrast(colour, bg) >= 4.5, `${sel} ${colour} on ${bg}: ${contrast(colour, bg).toFixed(1)}`);
  }
  assert.ok(!/@media \(max-width:480px\)\{[^\n]*\.(tt-fine|yt-fine|tt-checks p)\{[^}]*font-size:1[0-3]px/.test(HOME_CSS), "never smaller on a phone");
});

const home = P.liteHome({ sales: true, scoreOn: true, ticket: "t", title: { on: true, ticket: "tt" } });

test("FIX v2 points 3, 5, 6 · the YouTube line; the no-promise line only as a footnote at the end; the YouTube cards as mini screens, no ▶", () => {
  const band = home.slice(home.indexOf("data-youtube"), home.indexOf("data-social"));
  assert.ok(band.includes('<p class="yt-fine">Works with YouTube&#39;s official API. You approve every change.</p>') || band.includes("<p class=\"yt-fine\">Works with YouTube's official API. You approve every change.</p>"));
  assert.ok(!home.includes("Uses your own free YouTube key") && YT.fine === "Works with YouTube's official API. You approve every change.");
  const hero = home.slice(home.indexOf('<section class="hero shero"'), home.indexOf("data-new-band"));
  assert.ok(!hero.includes("It promises no ranking"), "out of the hero");
  const foot = home.indexOf("data-footnote");
  assert.ok(foot > home.indexOf("Ten languages") && home.slice(foot).includes("It promises no ranking"), "a footnote at the bottom");
  assert.equal((band.match(/<div class="so-screen yt-screen"/g) ?? []).length, 3);
  assert.ok(!band.includes("yt-thumb") && !/<span>▶<\/span>/.test(band), "no empty ▶ boxes");
  assert.deepEqual(YT.cards.map((c) => c.screen.length), [2, 3, 3], "a title + hashtags; three ideas; three steps");
  assert.match(YT.cards[0].screen[1][1], /^(#\w+ ){2}#\w+$/, "three hashtags");
  assert.ok(HOME_CSS.split("\n").some((l) => l.startsWith("@media (max-width:820px){.shero") && l.includes(".so-screen{min-height:0;max-height:140px}")), "≤140px on a phone (the YouTube screens share .so-screen)");
});
