/**
 * RR-389 PART 1 (owner's run, 7 Nov: AlmiVisibility planned 24 pages and made 1; 23 "not made, no answer on your pages yet"). Every product,
 * exam or not, gets a plan of its own questions in the shape the ladder fills (pages → items → claims): each question no own page answers
 * starts as a work note that wantedAnswers picks up, so it goes down the WHOLE ladder; its own site's words about itself are own product
 * text (LAW 5A.5); research headings are pages; nothing is invented. And the owner's research file is read whole (Google's own guides are
 * pages, an answer ABOUT AI Overviews is not an AI summary).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demandPlanPages } from "../desktop/demand-plan.mjs";
import { wantedAnswers } from "../desktop/answer-finder.mjs";
import { researchRows, addOwnerResearch } from "../desktop/owner-research.mjs";

const RESEARCH = `Intro line.
# What is technical SEO, and how do you do it?
How does Google find and index web pages?
Google's own guide: Google Search works in three stages: crawling, indexing and serving. https://developers.google.com/search/docs/fundamentals/how-search-works?hl=en
Do I need a sitemap?
Google's own guide: a sitemap tells search engines about the pages on your site. https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview?hl=en
# How do you show up in Google's AI Overviews and AI Mode?
What are AI Overviews and AI Mode in Google Search?
Google's own guide: AI Overviews and AI Mode show a snapshot with links to the web. https://developers.google.com/search/docs/appearance/ai-features
How can I see whether Microsoft Copilot cites my pages?
Microsoft Bing's own webmaster blog: AI Performance shows how often your content is cited in AI-generated answers across Microsoft Copilot. https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/
Where is the council office?
Google AI Overview: Plot 1, Kampala. https://example.org/x
What does page X say?
https://www.google.com/search?q=x the answer here`;

test("research file: Google's own guides are pages, a topic ABOUT AI Overviews is no AI summary; an AI summary and a search page stay refused; # headings name the pages", () => {
  const r = researchRows(RESEARCH);
  assert.equal(r.rows.length, 4, "the four real answers are kept (RR-388 refused Google's guides as search pages)");
  assert.deepEqual(r.refused.map((x) => x.why), ["an AI summary (for example a Google AI Overview) is never a source", "a search-results page is never a source"]);
  assert.deepEqual([...new Set(r.rows.map((x) => x.page))], ["What is technical SEO, and how do you do it?", "How do you show up in Google's AI Overviews and AI Mode?"]);
});

test("a product that is not an exam: its pages from its research headings and the questions people ask; every unanswered question goes down the ladder", () => {
  const research = researchRows(RESEARCH).rows;
  const asked = [{ text: "how to check my website seo score", source: "your AI's research" }, { text: "what is keyword difficulty?", source: "Search Console" }, { text: "seo agency near me", source: "x" }];
  const keywords = [{ text: "keyword research", volume: 301000 }, { text: "semrush.com", volume: 9 }, { text: "seo services near me", volume: 33100 }, { text: "keyword difficulty", volume: 5000 }];
  const site = (q) => (/price|cost/i.test(q) ? [{ text: "AlmiVisibility: plans from $30 a month.", link: "https://almivisibility.almiworld.com/pricing", readOn: "2026-11-07" }] : /difficulty/i.test(q) ? [{ text: "Keyword difficulty shows how hard a keyword is to rank for.", link: "https://almivisibility.almiworld.com/", readOn: "2026-11-07" }] : []);
  const x = demandPlanPages({ subject: "SEO", productName: "AlmiVisibility", home: "https://almivisibility.almiworld.com", research, asked: [...asked, { text: "How much does AlmiVisibility cost?", source: "your research" }], keywords, ownAnswer: site, on: "2026-11-07" });
  assert.equal(x.fromDemand, true); assert.equal(x.subject, "SEO");
  const titles = x.pages.map((p) => p.title);
  assert.ok(titles.includes("What is technical SEO, and how do you do it"), titles.join(" | "));
  assert.ok(!titles.some((t) => /near me|semrush\.com/i.test(t)), "no place, login or other company's address as a page");
  const kd = x.pages.find((p) => /Keyword Difficulty/.test(p.title)); assert.ok(kd, "a searched topic with a question asked about it is a page"); assert.ok(kd.items.some((it) => /keyword difficulty/i.test(it.question)));
  const wanted = wantedAnswers(x); assert.ok(wanted.length >= 4, `every question without an own answer is wanted by the ladder (${wanted.length})`);
  const own = x.pages.flatMap((p) => p.items).find((it) => /cost/i.test(it.question)); assert.equal(own?.claims[0].ownProduct, true, "the product's own price on its own site is own product text (LAW 5A.5)");
  const kdItem = x.pages.flatMap((p) => p.items).find((it) => /keyword difficulty/i.test(it.question)); assert.equal(kdItem.claims[0].link, "https://almivisibility.almiworld.com/"); assert.notEqual(kdItem.claims[0].ownProduct, true, "its own site's words about anything else are judged like any line (not own text)");
  /* the research answers join their own questions (unchecked: the truth pass decides) */
  const j = addOwnerResearch(x, research); assert.equal(j.joined, research.length);
});

test("nothing known → no plan (never invented); no subject → no plan", () => {
  assert.equal(demandPlanPages({ subject: "SEO", research: [], asked: [], keywords: [{ text: "seo tools", volume: 10 }] }), null, "a searched word with no question anyone asked makes no page");
  assert.equal(demandPlanPages({ subject: null, research: researchRows(RESEARCH).rows }), null);
});

test("wired: a product that is not an exam falls back to its own questions after AlmiSEO Data's plan and the own list; the plan is kept as its own; a non-exam product with no question asked gets its AI's research at once", () => {
  const main = readFileSync(new URL("../desktop/main.mjs", import.meta.url), "utf8");
  assert.match(main, /buildGeneric\(\) \?\? buildOwn\(\) \?\? buildDemand\(\)/);
  assert.equal((main.match(/buildGeneric\(\) \?\? buildOwn\(\) \?\? buildDemand\(\)/g) ?? []).length, 2, "the first pass and the improving pass alike");
  assert.match(main, /a\.fromDemand === true \/\* RR-389 Part 1 \*\//);
  assert.match(main, /const noQuestions = \(\) => !examProduct\(s, id\) && subject/);
  assert.match(main, /exam: examProduct\(s, id\)/);
  assert.match(main, /if \(step === "product" && productSubject\(store\.read\(id\)\) && CONFIG\.testOffline !== true\) gatherOwnDemand\(id\)/, "gathered as soon as it has a subject");
  const ai = readFileSync(new URL("../desktop/web-ai.mjs", import.meta.url), "utf8"); assert.match(ai, /system: !exam \? `List up to 40 real questions people ask about \$\{subject\} when they look for help with it/);
  assert.match(readFileSync(new URL("../desktop/build.mjs", import.meta.url), "utf8"), /"demand-plan\.mjs", "setup-guide\.mjs"/, "in the package");
});

test("the gate: a number the product's own live pages say is own text, not an orphan ('$30' on AlmiVisibility's page)", () => {
  const sp = readFileSync(new URL("../desktop/seo-pages.mjs", import.meta.url), "utf8");
  assert.match(sp, /const ownSiteLines = \(site\.pages \?\? \[\]\)\.flatMap\(\(p\) => \[\.\.\.\(p\.facts \?\? \[\]\), \.\.\.\(p\.qa \?\? \[\]\)\.map\(\(x\) => x\.a\)\]/);
  assert.match(sp, /numbersWithoutFact\(d\.html, \[\.\.\.ownSiteLines, /);
});
