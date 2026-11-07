/**
 * RR-385 (owner, 7 Nov 2026: "fix what the mirror broke before AlmiOET goes live"; beta-g's scan of the mirrored preview: the 18 pages the RR-384
 * mirror removed were linked from every page's menu and "Choose your country" list, so the whole site carried 404 links; /oet-exam-price, with
 * 26 checked country fee rows, went out noindex because fee rows were not counted; the Australia pages failed the truth pass because their board
 * lines cited an Ahpra PDF that names no board). Nothing here leaves this machine.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mirrorPlan, asPublishedGuarded, checkedFeeRows, indexCount, wrongIndexState, linkedSlugs, cleanSuperseded, REAL_QA_MIN } from "../desktop/publish.mjs";
import { noteOnPage } from "../desktop/empty-answers.mjs";
import { THIN_MARK } from "../src/page/one-builder.mjs";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const qa = (n) => Array.from({ length: n }, (_, i) => `<details data-need-id="q${i}"><summary>Question ${i}?</summary><p>Answer ${i}. <a class="src" href="https://s.example/${i}">S</a> checked 2026-11-06</p></details>`).join("");
const nav = (slugs) => `<nav>${slugs.map((s) => `<a href="https://ex.com/${s}">${s}</a>`).join("")}<a href="https://other.example/x">out</a></nav>`;
const page = (n, links = [], extra = "") => `<!doctype html><html><head><title>t</title><meta name="robots" content="noindex, nofollow"></head><body>${nav(links)}<main><h2>Questions and answers</h2>${qa(n)}${extra}<a data-cta>Go</a><p>Last checked 2026-11-06</p></main></body></html>`;
const fee = (country) => `<details data-foldout><summary>${country}</summary><ul><li>The full test costs AUD 587 (the official fee). <span class="citation">— <a href="https://oet.com/fees" rel="nofollow noopener">source</a>, read 2026-11-06</span></li></ul></details>`;
const thinGates = [{ words: "answers its core questions", pass: false, failing: ["x"] }];

test("1 · NEVER REMOVE A LINKED PAGE: a duplicate linked from a staying page stays as noindex; a page that cannot stand but is linked is HELD (reported), never removed; an unlinked duplicate goes", () => {
  const drafts = [
    { url: "https://ex.com/ready", html: page(8, ["dup-linked", "law-linked", "topic"]), readyAsDraft: true, gates: [] },
    { url: "https://ex.com/dup-linked", html: page(8), readyAsDraft: false, gates: [{ words: "not a duplicate", pass: false, failing: ["same as /ready"] }] },
    { url: "https://ex.com/dup-alone", html: page(8), readyAsDraft: false, gates: [{ words: "not a duplicate", pass: false, failing: ["same as /ready"] }] },
    { url: "https://ex.com/law-linked", html: page(3), readyAsDraft: false, gates: thinGates },
    { url: "https://ex.com/topic", html: page(2), readyAsDraft: false, gates: thinGates },
  ];
  const held = new Map(["ready", "dup-linked", "dup-alone", "law-linked", "topic"].map((s) => [s, `vp/${s}/index.html`]));
  const p = mirrorPlan({ held, drafts, readyUrls: new Set(["https://ex.com/ready"]), noteOf: noteOnPage, faultsOf: (h, url) => (url.endsWith("/law-linked") ? ["a fault"] : []) });
  assert.deepEqual(p.remove.map((x) => x.slug), ["dup-alone"], "only the duplicate nothing links to goes");
  assert.deepEqual(p.rewrite.map((x) => x.path).sort(), ["vp/dup-linked/index.html", "vp/topic/index.html"]);
  assert.ok(p.rewrite.every((x) => x.html.includes(THIN_MARK)));
  assert.deepEqual(p.blocked.map((b) => [b.slug, b.linkedBy]), [["law-linked", ["https://ex.com/ready"]]], "linked but cannot stand: held and reported");
  assert.deepEqual(p.broken, []);
});

test("2 · A LINKED PAGE NOT ON THE SITE YET IS ADDED (noindex unless ready); a link to an app page that is nowhere is BROKEN and listed", () => {
  const drafts = [
    { url: "https://ex.com/home", html: page(8, ["reading", "price", "missing", "faulty"]), readyAsDraft: true, gates: [] },
    { url: "https://ex.com/reading", html: page(2), readyAsDraft: false, gates: thinGates },
    { url: "https://ex.com/price", html: page(8), readyAsDraft: true, gates: [] },
    { url: "https://ex.com/faulty", html: page(2), readyAsDraft: false, gates: thinGates },
  ];
  const held = new Map([["home", "vp/home/index.html"], ["missing", "vp/missing/index.html"]]);
  const p = mirrorPlan({ held, drafts, readyUrls: new Set(["https://ex.com/home"]), faultsOf: (h, url) => (url.endsWith("/faulty") ? ["a fault"] : []) });
  const added = Object.fromEntries(p.rewrite.filter((x) => x.added).map((x) => [x.path, x.ready]));
  assert.deepEqual(added, { "vp/reading/index.html": false, "vp/price/index.html": true }, "both added at the site's own path");
  assert.ok(p.rewrite.find((x) => x.path === "vp/reading/index.html").html.includes(THIN_MARK), "a not-ready page is added noindex");
  assert.ok(!p.rewrite.find((x) => x.path === "vp/price/index.html").html.includes(THIN_MARK), "a ready page is added as it publishes");
  assert.deepEqual(p.remove, [], "a linked page with no draft is not removed");
  assert.deepEqual(p.blocked.map((b) => b.slug), ["missing"], "it is held and reported");
  assert.deepEqual(p.broken, [{ from: "https://ex.com/home", to: "faulty" }], "the link guard names the link to a page that cannot be on the site");
});

test("3 · THE LINK GUARD IN THE APP: nothing is written while a link would break; the publish gate refuses a page that links to a page not on the site", () => {
  const main = readFileSync(join(REPO, "desktop", "main.mjs"), "utf8");
  assert.match(main, /if \(plan\.broken\.length\) \{ out = \{ ok: false, why: `Nothing was changed:/);
  assert.match(main, /const dead = \[\.\.\.linkedSlugs\(d\.html, links\.managed, links\.origin\)\]\.filter\(\(s\) => !links\.exists\.has\(s\)\); if \(dead\.length\) return \{ ok: false, links: dead/);
  assert.match(main, /no = gateStops\(id, x\.url, d, links\);/);
  assert.deepEqual([...linkedSlugs(page(1, ["a", "b"]) + '<a href="/c/">c</a>', new Set(["a", "c", "z"]), "https://ex.com")].sort(), ["a", "c"], "own pages only, another site's links ignored");
});

test("4 · FEE ROWS COUNT: a fee row that shows its source link and the day it was read is checked content; /oet-exam-price is indexed, its thin mark taken off", () => {
  const rows = Array.from({ length: 24 }, (_, i) => fee(`Country ${i}`)).join("");
  const price = page(2, [], rows).replace('<meta name="robots" content="noindex, nofollow">', `<meta name="robots" content="noindex, nofollow">${THIN_MARK}`);
  assert.equal(checkedFeeRows(price), 24); assert.equal(indexCount(price), 26);
  const out = asPublishedGuarded(price, "https://ex.com/oet-exam-price");
  assert.ok(!/noindex/.test(out), "indexed"); assert.ok(!out.includes(THIN_MARK));
  assert.match(asPublishedGuarded(page(2, [], rows.slice(0, rows.indexOf("Country 3") - 40)), "https://ex.com/y"), /content="noindex,follow"/, "2 Q&A + fewer than 4 fee rows stays noindex");
  const unsourced = page(2, [], Array.from({ length: 6 }, () => '<details data-foldout><summary>X</summary><p>The fee is AUD 587.</p></details>').join(""));
  assert.equal(checkedFeeRows(unsourced), 0, "a fee row without its source and date does not count");
  assert.match(asPublishedGuarded(unsourced, "https://ex.com/x"), /content="noindex,follow"/);
  assert.equal(REAL_QA_MIN, 6);
});

test("5 · A FILE IN THE WRONG INDEX STATE IS WRITTEN AGAIN; superseded sentences are cleaned from a rewrite", () => {
  const rows = Array.from({ length: 6 }, (_, i) => fee(`C${i}`)).join(""), item = { url: "https://ex.com/p", html: page(1, [], rows) };
  assert.equal(wrongIndexState('<meta name="robots" content="noindex,follow">', item), true, "on the site noindex, now indexed");
  assert.equal(wrongIndexState("<html>indexed</html>", item), false);
  assert.equal(cleanSuperseded("<p>Fee AUD 587. Confirm with your regulator before booking. Next (Source: OET.) line.</p>"), "<p>Fee AUD 587. Next line.</p>");
});

test("6 · AUSTRALIA AS AHPRA'S PAGE SAYS IT: the nine board lines are rewritten to Ahpra's own page, with the one exception it names (real truth pass 15 of 16 on the hard cases, 7 Nov)", () => {
  const fc = JSON.parse(readFileSync(join(REPO, "desktop", "lists", "fact-corrections.json"), "utf8"));
  const au = fc.text.filter((r) => /^In Australia: .+ Board of Australia \(via Ahpra\)\. Accepts OET\.$/.test(r.has));
  assert.equal(au.length, 9);
  for (const r of au) {
    assert.equal(r.link, "https://www.ahpra.gov.au/Registration/Registration-Standards/English-language-skills/Accepted-English-language-tests");
    assert.match(r.to, /except the Aboriginal and Torres Strait Islander Health Practice Board/); assert.match(r.to, /Listening 350, Reading 360, Writing 350 and Speaking 360/); assert.match(r.on, /^\d{4}-\d{2}-\d{2}$/);
  }
});
