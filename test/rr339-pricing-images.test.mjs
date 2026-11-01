/**
 * RR-339 (owner GREEN, 28 Oct 2026) · the pricing page's own words; the removed lines gone everywhere; a DIFFERENT image on every public
 * page (none on privacy and terms); "Every plan includes" lists only what the app's own feature list has today.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as P from "../site/pages.mjs";
import { IMG, flowImage } from "../site/page-images.mjs";
import { FEATURES as APP_FEATURES } from "../desktop/features.mjs";
import { LANGUAGES } from "../src/page/languages.mjs";

const images = (html) => [...html.matchAll(/data-image="([^"]+)"/g)].map((m) => m[1]);
const sales = { home: P.liteHome({ sales: true }), pricing: P.pricing({ sales: true }), download: P.download({ sales: true }) };

test("RR-339 · pricing: the owner's heading and line; each plan says who it is for; the removed lines are gone everywhere", () => {
  const p = sales.pricing;
  assert.match(p, /<h1>Rank higher on Google\. Get found in ChatGPT\. One app, from \$30\.<\/h1>/);
  assert.ok(p.includes("Real research. No risky backlinks. Every plan has every feature — just pick how many products. Try the free site score first, no card needed."));
  for (const [price, who] of [[30, "One website, shop or YouTube channel"], [40, "A small business with several products"], [60, "A growing business"], [80, "Agencies and big businesses"]]) assert.match(p, new RegExp(`\\$${price}<small> / month</small>[\\s\\S]*?<p class="note" data-for>${who}</p>`), who);
  for (const html of [...Object.values(sales), P.pricing(), P.home(), P.liteHome(), P.features(), P.download({ setupAvailable: true })]) {
    assert.doesNotMatch(html, /no free trial|Prices set by AlmiWorld|\$500/i);
  }
  assert.equal(P.MARKETING.tools, undefined, "the unverified $500 line");
});

test("RR-339 · Every plan includes: each line stands on a card the app has today (a feature that does not work has no card)", () => {
  const ids = new Set(APP_FEATURES.map((f) => f.id)), card = (id) => APP_FEATURES.find((f) => f.id === id);
  const proof = {
    "Site check": ids.has("check") && ids.has("links"), "The questions people ask": ids.has("keywords") && ids.has("aeo"),
    "Page and article plans": ids.has("seo-pages") && ids.has("articles"), "Your Google Search Console": ids.has("google") && ids.has("search-power"),
    "YouTube advice": ids.has("youtube"), "Send your finished pages to WordPress": /WordPress/.test(card("publish")?.does ?? ""), "Pages in 10 languages": LANGUAGES.length === 10 && ids.has("languages"),
    "Your data stays on your computer": true,
  };
  assert.equal(P.INCLUDES.length, Object.keys(proof).length);
  for (const line of P.INCLUDES) { const k = Object.keys(proof).find((x) => line.startsWith(x)); assert.ok(k && proof[k], line); }
  const box = sales.pricing.match(/<div class="card" data-includes[\s\S]*?<\/div>/)[0];
  for (const line of P.INCLUDES) assert.ok(box.includes(line.replace(/&/g, "&amp;")), line);
});

test("RR-339 · images: a different one on every public page, each labelled, a wide and a phone drawing; none on privacy and terms", () => {
  assert.deepEqual(images(sales.pricing), ["img-pricing"]);
  assert.deepEqual(images(sales.home), ["img-home", "img-score"]); // owner's ruling 4: the finder's picture is gone
  assert.deepEqual(images(sales.download), ["img-download"]);
  for (const page of [P.privacy({ lite: true }), P.terms({ lite: true })]) if (page) assert.deepEqual(images(page), []);
  const all = Object.values(IMG);
  assert.equal(new Set(all).size, all.length, "two pages share an image");
  for (const svg of all) {
    assert.match(svg, /<svg class="wide"[^>]* role="img" aria-labelledby="[^"]+"><title id="[^"]+">[^<]{20,}<\/title>/);
    assert.match(svg, /<svg class="narrow"/);
    assert.doesNotMatch(svg, /<script|<image|href=|c2pa/i, "an outside file, a script or the source file's metadata");
  }
  /* the pricing image is the owner's, word for word */
  for (const w of ["How AlmiVisibility gets you found", "1. Check your site", "Score, links, security", "and what to fix first", "2. Real demand", "What people want to know", "and the questions they ask", "3. Pages that answer", "Plans and drafts,", "every fact with a source", "4. Get found", "Rank higher on Google,", "get cited in AI answers", "Real research · No risky backlinks · Your data stays on your computer"]) assert.ok(IMG.pricing.includes(w), w);
  assert.match(P.pricing({ sales: true }), /@media \(max-width:640px\)\{\.flowimg \.wide\{display:none\}\.flowimg \.narrow\{display:block\}\}/);
  assert.match(flowImage({ id: "x", title: "T", label: "a label long enough here", foot: "a · b", steps: [{ icon: "key", title: "<b>", lines: ["&", "\""] }] }), /&lt;b&gt;[\s\S]*&amp;[\s\S]*&quot;/, "text is escaped");
});
