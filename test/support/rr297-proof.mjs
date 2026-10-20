/**
 * RR-297 · the proof run, in memory, on the RR-296 test project: an auto-refresh after one stored fact changes, the social posts of the
 * test articles, and the monthly report (plus one built from the stored Search Console export, read-only). Nothing is written or posted.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gateInput, itemOfNeed } from "../../src/page/one-builder.mjs";
import { refreshRun } from "../../src/page/refresh.mjs";
import { postsForArticle } from "../../src/page/social-posts.mjs";
import { monthlyReport, searchFromExport } from "../../src/report/monthly-report.mjs";
import { GUIDANCE } from "../../config/guidance/guidance-read.mjs";
import { newPageRun, articleRun, ROBOTS, COST, DIR, P } from "./rr296-proof.mjs";

export function rr297Run({ settings = {} } = {}) {
  const np = newPageRun();
  const days = articleRun({ newPages: np, settings });
  const articles = days.flatMap((d) => d.articles);
  const topicOf = (a) => P.TOPICS.find((t) => t.topicId === a.topicId);
  /* the client's own pages and articles as they stand: each with its items, so a refresh can find the facts it shows */
  const pages = [
    ...np.pages.map((p) => ({ url: p.url, title: p.title, items: p.items, questions: p.questions, html: p.html, related: np.pages.filter((x) => x.url !== p.url).map((x) => ({ href: x.url, label: x.title })), gate: gateInput(p) })),
    ...articles.map((a) => { const t = topicOf(a); return { url: a.url, title: a.question, items: [itemOfNeed({ needId: t.topicId, question: t.question, claims: t.claims, generalView: t.generalView })], questions: a.questions, html: a.html, related: np.pages.map((x) => ({ href: x.url, label: x.title })), gate: a.gate }; }),
  ];
  const refresh = refreshRun({ rechecks: P.RECHECKS, pages, keyFacts: P.KEY_FACTS, quotationOf: P.quotationOf, design: P.DESIGN, on: "2026-10-25", settings, guidance: GUIDANCE, robotsTxt: ROBOTS, cost: COST,
    extraPages: [{ url: `${P.SITE}/articles/`, html: `<a href="${articles.map((a) => a.url).join('"></a><a href="')}"></a>` }] });
  const posts = articles.map((a) => ({ url: a.url, ...postsForArticle({ url: a.url, question: a.question, items: pages.find((p) => p.url === a.url).items, generalView: topicOf(a).generalView }) }));
  const report = monthlyReport({ product: "Widgetry Prep (test project)", month: "October 2026",
    made: { pages: np.pages.map((p) => ({ url: p.url, title: p.title })), articles: articles.map((a) => ({ url: a.url, question: a.question, day: a.day })) },
    refresh: { notes: refresh.notes, reported: refresh.reported }, refused: days.filter((d) => d.none).map((d) => `${d.day}: ${d.none}`), search: null, nextTopics: P.NEXT_TOPICS.map((t) => t.question) });
  return { np, days, articles, pages, refresh, posts, report };
}

/** The example with real numbers: the stored Search Console export of the stored research batch (read-only; no product attached). */
export function realNumbersReport() {
  const rows = readFileSync(join(DIR, "search-console-exports.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  const search = searchFromExport(rows.find((r) => r.record_type === "search_console_export"), rows.filter((r) => r.record_type === "search_phrase"));
  return monthlyReport({ product: "Example — the stored Search Console export (read-only)", month: "26 Jun – 15 Oct 2026", search });
}
