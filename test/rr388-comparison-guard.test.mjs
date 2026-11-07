/**
 * RR-388 PART A3 · comparison pages the owner (or autopilot) makes are safe: a competitor's price or feature only from its own page; none
 * read → no comparison. Sabotage: the same plan with the rule switched off would keep the review-site line and the unread page.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { guardComparisons, rivalsOf, isComparison } from "../desktop/comparison-guard.mjs";

const claim = (text, link) => ({ text, link, readOn: "2026-11-07" });
const plan = () => ({ pages: [
  { title: "AlmiVisibility vs Semrush: price, free plan and features", items: [
    { question: "How much do Semrush and AlmiVisibility cost per month?", claims: [claim("Semrush's own pricing page: SEO is $139 a month.", "https://www.semrush.com/prices/"), claim("AlmiVisibility's own pricing page: $30 a month.", "https://almivisibility.almiworld.com/pricing")] },
    { question: "Is Semrush good?", claims: [claim("A review site says Semrush is the best tool.", "https://some-reviews.example/semrush")] },
  ] },
  { title: "AlmiVisibility vs Ahrefs", items: [{ question: "How much does Ahrefs cost?", claims: [claim("A blog says Ahrefs costs $99.", "https://blog.example/ahrefs-price")] }] },
  { title: "Alternatives to Otterly.AI", items: [{ question: "What does Otterly.AI cost?", claims: [claim("Otterly.AI's own pricing page: Lite is $29 a month.", "https://otterly.ai/pricing")] }] },
  { title: "What is technical SEO?", items: [{ question: "What is crawling?", claims: [claim("Google's own guide: crawling is finding pages.", "https://developers.google.com/search/x")] }] },
] });

test("A3 · a competitor's line stays only from its own site; a review-site line goes, said; a competitor never read → no comparison; other pages untouched", () => {
  const p = plan(), g = guardComparisons(p, { ownName: "AlmiVisibility", ownHost: "https://almivisibility.almiworld.com/" });
  assert.deepEqual(p.pages.map((x) => x.title), ["AlmiVisibility vs Semrush: price, free plan and features", "Alternatives to Otterly.AI", "What is technical SEO?"]);
  const sem = p.pages[0]; assert.equal(sem.items.length, 1, "the review-site question is left with nothing and goes"); assert.equal(sem.items[0].claims.length, 2);
  assert.equal(g.removed.length, 2); assert.match(g.removed[0].why, /about Semrush from a page that is not its own \(some-reviews\.example\)/);
  assert.deepEqual(g.dropped, [{ title: "AlmiVisibility vs Ahrefs", why: "no comparison: Ahrefs's own page was not read" }]);
});

test("A3 · titles: what counts as a comparison, and which tools it names (the product's own name left out)", () => {
  assert.equal(isComparison("AlmiVisibility vs Semrush"), true); assert.equal(isComparison("Semrush versus Ahrefs"), true); assert.equal(isComparison("Alternatives to BrightLocal"), true); assert.equal(isComparison("What is local SEO?"), false);
  assert.deepEqual(rivalsOf("AlmiVisibility vs Semrush: price", "AlmiVisibility"), ["Semrush"]); assert.deepEqual(rivalsOf("Semrush vs Ahrefs", "AlmiVisibility"), ["Semrush", "Ahrefs"]);
});

test("A3 · wired: every plan passes the guard before its pages are written; the Windows package carries it", () => {
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8");
  const i = main.indexOf("if (exam) { const g = guardComparisons(exam"), j = main.indexOf("await factsStep(exam, quick, step);"); assert.ok(i > 0 && i < j, "before the facts step and the writing");
  assert.match(readFileSync(new URL("../desktop/build.mjs", import.meta.url), "utf8"), /"comparison-guard\.mjs"/);
});
