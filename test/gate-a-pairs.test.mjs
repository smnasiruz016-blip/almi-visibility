/**
 * 🔴 D-GATEA-1 — GATE A WAS BLIND IN THE CASE IT EXISTS FOR, AND IS NOT ANY MORE.
 *
 * A two-page group learned its shell from those same two pages, so a duplicated
 * body was subtracted as "template" and an IDENTICAL PAIR SCORED 0. A one-page
 * group's shell was the whole page, so its unique words were 0. Both directions
 * are proved here: an identical pair must fire, a distinct pair must stay
 * silent — for existing pages (with the site's other pages to lend a shell) and
 * for Gate A's own publish run.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { measureExistingPages } from "../src/gate-a/existing-pages.mjs";
import { runGateA } from "../src/gate-a/run.mjs";
import { shellFor, MIN_PAGES_FOR_OWN_SHELL } from "../src/gate-a/shell.mjs";
import { tokensOf } from "../src/gate-a/tokens.mjs";

const chrome = "<nav>home about contact login register pricing blog help careers press</nav><footer>terms privacy cookies sitemap</footer>";
const words = (seed, n) => Array.from({ length: n }, (_, i) => `w${seed}x${i}`).join(" ");
const page = (id, body) => ({ id, html: `<html><body>${chrome}<main><p>${body}</p></main></body></html>` });
// Three other pages on the same site, each with its own body: the reference a small group borrows its shell from.
const siteOthers = [page("https://s.example.com/about/a", words(91, 200)), page("https://s.example.com/blog/b", words(92, 200)), page("https://s.example.com/help/c", words(93, 200))];

test("🔴 RED (the defect, kept as a test): a shell learned from the pair itself makes an identical pair invisible", () => {
  const same = words(1, 400);
  const pair = [tokensOf(page("x", same).html), tokensOf(page("y", same).html)];
  assert.equal(shellFor({ groupTokens: pair }).source, "NONE", "a pair was allowed to learn its own shell");
  assert.equal(MIN_PAGES_FOR_OWN_SHELL, 3);
});

/* RR-192 · T-1 (RTP-1 S9; PG-A1): 350 / five facts / 0.40 are review SIGNALS, never a pass or a REJECT — this test reads the signal fields (belowUniqueWordsSignal, overlapAboveReviewSignal, factsReachSignal); an identical pair is REVIEW_REQUIRED */
test("🔴 EXISTING PAGES — an IDENTICAL PAIR FIRES: maximum overlap, measured on a shell borrowed from the rest of the site", () => {
  const same = words(2, 400);
  const m = measureExistingPages([page("https://s.example.com/guide/x", same), page("https://s.example.com/guide/y", same), ...siteOthers], []);
  for (const r of m.results.filter((x) => x.id.includes("/guide/"))) {
    assert.equal(r.shellSource, "REFERENCE");
    assert.equal(r.overlapState, "MEASURED");
    assert.ok(r.maxOverlap > 0.99, `an identical pair scored ${r.maxOverlap}`);
    assert.equal(r.overlapAboveReviewSignal, true, "an identical pair was not flagged");
  }
});

/* RR-192 · T-1 (RTP-1 S9; PG-A1): 350 / five facts / 0.40 are review SIGNALS, never a pass or a REJECT — this test reads the signal fields (belowUniqueWordsSignal, overlapAboveReviewSignal, factsReachSignal); an identical pair is REVIEW_REQUIRED */
test("🔴 EXISTING PAGES — a DISTINCT PAIR STAYS SILENT on the same borrowed shell", () => {
  const m = measureExistingPages([page("https://s.example.com/guide/x", words(3, 400)), page("https://s.example.com/guide/y", words(4, 400)), ...siteOthers], []);
  for (const r of m.results.filter((x) => x.id.includes("/guide/"))) {
    assert.equal(r.overlapState, "MEASURED");
    assert.ok(r.maxOverlap < 0.4, `a distinct pair scored ${r.maxOverlap}`);
    assert.equal(r.overlapAboveReviewSignal, false);
  }
});

test("🔴 EXISTING PAGES — a single page's unique words are measured against the site, not against itself", () => {
  const m = measureExistingPages([page("https://s.example.com/solo/x", words(5, 400)), ...siteOthers], []);
  const r = m.results.find((x) => x.id.endsWith("/solo/x"));
  assert.equal(r.shellSource, "REFERENCE");
  assert.ok(r.uniqueWords >= 400, `a 400-word page alone in its group reported ${r.uniqueWords} unique words`);
  assert.equal(r.overlapState, "VACUOUS", "a page with no sibling still has no overlap to measure");
});

/* RR-192 · T-1 (RTP-1 S9; PG-A1): 350 / five facts / 0.40 are review SIGNALS, never a pass or a REJECT — this test reads the signal fields (belowUniqueWordsSignal, overlapAboveReviewSignal, factsReachSignal); an identical pair is REVIEW_REQUIRED */
test("EXISTING PAGES — with too few other pages on the site to lend a shell, a pair is UNMEASURABLE, never a pass", () => {
  const same = words(6, 400);
  const m = measureExistingPages([page("https://t.example.com/guide/x", same), page("https://t.example.com/guide/y", same)], []);
  for (const r of m.results) {
    assert.equal(r.overlapState, "UNMEASURABLE_PAIR");
    assert.equal(r.overlapAboveReviewSignal, null);
    assert.equal(r.uniqueWords, null);
  }
});

/* ---- Gate A's own publish run ------------------------------------------- */

const NOW = new Date("2026-09-13T00:00:00Z");
const facts = () => Array.from({ length: 5 }, (_, i) => ({ value: `value ${i}`, sourceUrl: `https://regulator.example.org/rule/${i}`, tier: 1, verifiedDate: "2026-09-01" }));
const candidate = (id, body) => ({ ...page(`https://s.example.com/guide/${id}`, body), id, facts: facts(), whyThisUrl: `the page for ${id}` });

/* RR-192 · T-1 (RTP-1 S9; PG-A1): 350 / five facts / 0.40 are review SIGNALS, never a pass or a REJECT — this test reads the signal fields (belowUniqueWordsSignal, overlapAboveReviewSignal, factsReachSignal); an identical pair is REVIEW_REQUIRED */
test("🔴 GATE A RUN — an identical pair, given the site as reference, is REVIEW_REQUIRED at overlap — never REJECTED on the percentage", () => {
  const same = words(7, 400);
  const out = runGateA([candidate("x", same), candidate("y", same)], { now: NOW, reference: siteOthers });
  for (const r of out.results) {
    assert.ok(r.maxOverlap > 0.99, `identical pair scored ${r.maxOverlap}`);
    assert.equal(r.verdict, "REVIEW_REQUIRED");
    assert.equal(r.reviewAt, "overlap");
    assert.equal(r.rejectedAt, null);
  }
});

test("🔴 GATE A RUN — a distinct pair, given the site as reference, is KEPT", () => {
  const out = runGateA([candidate("x", words(8, 400)), candidate("y", words(9, 400))], { now: NOW, reference: siteOthers });
  for (const r of out.results) {
    assert.ok(r.maxOverlap < 0.4, `distinct pair scored ${r.maxOverlap}`);
    assert.equal(r.verdict, "KEEP");
  }
});

/* RR-192 · T-1 (RTP-1 S9; PG-A1): 350 / five facts / 0.40 are review SIGNALS, never a pass or a REJECT — this test reads the signal fields (belowUniqueWordsSignal, overlapAboveReviewSignal, factsReachSignal); an identical pair is REVIEW_REQUIRED */
test("🔴 GATE A RUN — a pair with NO reference cannot be kept on an overlap it could not measure", () => {
  const out = runGateA([candidate("x", `${words(10, 400)} ${words(11, 400)}`), candidate("y", `${words(10, 400)} ${words(12, 400)}`)], { now: NOW });
  for (const r of out.results) {
    assert.equal(r.overlapAboveReviewSignal, null);
    assert.equal(r.overlapUnmeasurable, true);
    assert.equal(r.verdict, "REJECT");
    assert.equal(r.rejectedAt, "overlap-unmeasurable");
  }
});
