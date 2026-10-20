/**
 * 🔴 DAILY ARTICLES (RR-296, owner decision 3: "1 artical per product per day" by default — the client can change the number; publishing
 * "clint can chose": by default published AUTOMATICALLY after every gate passes, or "show me first").
 *
 * An article is a page of the ONE builder (src/page/one-builder.mjs): the client's own design, logo, header and links → key-fact cards →
 * questions and answers, every answer sourced and dated (same-meaning words allowed, numbers, units and conditions exact — the key-fact
 * check of src/page/joined-page.mjs); an opinion appears only under "General view — not an official fact". No word-count target.
 *   · TOPIC — one of the product's REAL questions (DEMAND or OPPORTUNITY), each with the record it was seen in, that no existing page and no
 *     earlier article already answers. A topic with no recorded question, or no sourced answer, is never used: nothing is made up.
 *   · GATES — all five page gates (src/page/page-gates.mjs), plus NOT A DUPLICATE of any page or earlier article (Google's scaled-content
 *     rule, guidance G-quotes already read).
 *   · THE DAILY RULE — if no topic passes that day, NO article is made, never a filler; the day's report says why, in one line.
 *   · PUBLISHING — through the existing publishing control (src/page/publishing-control.mjs: a named cohort, rollback, sitemap). AUTO: the
 *     gates' pass is the approval record; REVIEW FIRST: no approval until the client gives one. Nothing goes live from here: this module
 *     decides, it never publishes (no product is attached — owner decision of RR-293).
 * No promise is made that any engine will rank or cite an article. Pure: nothing is written, fetched or sent. Generic: no client is named.
 */
import { planNewPages, buildNewPages, gateInput, servedBy, indexPage } from "./one-builder.mjs";
import { allGates } from "./page-gates.mjs";
import { planCohort, sitemapXml, PUBLISH_COHORT_CAP } from "./publishing-control.mjs";

export const PUBLISH_MODE = Object.freeze({ AUTO_AFTER_GATES: "AUTO_AFTER_GATES", REVIEW_FIRST: "REVIEW_FIRST" });
export const ARTICLE_SETTINGS_DEFAULT = Object.freeze({ articlesPerDay: 1, publishMode: PUBLISH_MODE.AUTO_AFTER_GATES });

/** The client's article settings for one product: its own values over the defaults; a value out of range is refused, named. */
export function articleSettings(own = {}) {
  const s = { ...ARTICLE_SETTINGS_DEFAULT, ...(own ?? {}) };
  const faults = [];
  if (!Number.isInteger(s.articlesPerDay) || s.articlesPerDay < 0 || s.articlesPerDay > PUBLISH_COHORT_CAP) faults.push(`articles per day must be a whole number from 0 to ${PUBLISH_COHORT_CAP}`);
  if (!Object.values(PUBLISH_MODE).includes(s.publishMode)) faults.push(`publishing must be one of: ${Object.values(PUBLISH_MODE).join(", ")}`);
  return Object.freeze({ ...s, valid: faults.length === 0, faults: Object.freeze(faults) });
}

/** The settings exactly as the client sees them. */
export function settingsView(s) {
  const mark = (m) => (s.publishMode === m ? "(•)" : "( )");
  return [
    "ARTICLES — settings for this product",
    `  Articles per day ............ ${s.articlesPerDay}${s.articlesPerDay === ARTICLE_SETTINGS_DEFAULT.articlesPerDay ? "  (default)" : ""}   — change to any whole number from 0 to ${PUBLISH_COHORT_CAP}; 0 pauses articles`,
    "  Publishing",
    `    ${mark(PUBLISH_MODE.AUTO_AFTER_GATES)} Publish automatically after every gate passes   (default)`,
    `    ${mark(PUBLISH_MODE.REVIEW_FIRST)} Show me first — nothing is published until I approve it`,
    "  An article is made only when a real question of this product, with a sourced answer, is not answered yet by a page or an earlier",
    "  article — otherwise no article is made that day, and the report says why. No page is promised a rank or a citation.",
  ];
}

const normQ = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const slug = (s) => normQ(s).replace(/ /g, "-").slice(0, 60).replace(/-+$/, "");

/**
 * One day's articles. `topics` are the product's real questions: { topicId, label: DEMAND|OPPORTUNITY, question, seenIn (the record it was
 * seen in), claims (sourced), generalView? }. `existing` are the pages that stand ({ id, url, claimIds, questions, gate }), `earlier` the
 * articles already made ({ url, claimIds, questions, gate }). Returns { day, articles, none?, considered }.
 */
export function articlesForDay({ day, settings, topics = [], existing = [], earlier = [], design, keyFacts = [], rates = [], quotationOf = null, site, guidance, robotsTxt, cost }) {
  const s = articleSettings(settings);
  if (!s.valid) return Object.freeze({ day, articles: Object.freeze([]), none: `no article — the settings are not valid: ${s.faults.join("; ")}`, considered: 0 });
  if (s.articlesPerDay === 0) return Object.freeze({ day, articles: Object.freeze([]), none: "no article — articles are paused (0 per day)", considered: 0 });
  const stood = [...existing, ...earlier];
  const why = new Map();
  /* a real question only: its own recorded question, and a sourced answer — nothing made up */
  const real = topics.filter((t) => { const ok = typeof t?.seenIn === "string" && t.seenIn !== "" && typeof t.question === "string" && t.question.trim() !== ""; if (!ok) why.set(t?.topicId, "no recorded question — never a made-up topic"); return ok; });
  const made = [];
  for (const t of real) {
    if (made.length >= s.articlesPerDay) break;
    const path = `/articles/${day}-${slug(t.question)}`;
    const plan = planNewPages({ needs: [{ needId: t.topicId, label: t.label, path, question: t.question, alsoAsked: t.alsoAsked, claims: t.claims ?? [], generalView: t.generalView }], existing: [...stood, ...made] });
    const p = plan[0];
    if (p.kind === "REFUSED") { why.set(t.topicId, p.reason); continue; }
    if (p.kind === "SECTION") { why.set(t.topicId, `already answered — ${p.reason.replace(/ — a section of that page, never a duplicate page$/, "")}`); continue; }
    /* internal links: an article links the product's own pages on its site; the site's articles index links every article */
    const origin = new URL(site).origin;
    const own = stood.filter((x) => x.url && new URL(x.url).origin === origin && !/\/articles\//.test(new URL(x.url).pathname)).map((x) => ({ href: x.url, label: x.questions?.[0] ?? x.url }));
    const [page] = buildNewPages({ plan, keyFacts, rates, quotationOf, design, stamp: null, on: day, site, relatedFor: () => own });
    const index = indexPage({ url: `${origin}/articles/`, title: "Articles", pages: [...earlier, ...made, { url: page.url, title: t.question }].map((a) => ({ url: a.url, title: a.question ?? a.url })) });
    const all = [...stood.map((x) => x.gate), ...made.map((x) => x.gate), gateInput(page)].filter(Boolean);
    const urls = all.map((g) => g.url);
    const verdict = allGates(all, { guidance, on: day, cost, site: { robotsTxt, sitemapUrls: urls, serve: servedBy(all.map((g) => ({ url: g.url }))), extraPages: [index] } }).find((r) => r.id === page.url);
    /* PLUS: not a duplicate of any page or earlier article — no question of it already asked, and an answer of its own */
    const dup = stood.concat(made).find((x) => (x.questions ?? []).some((q) => normQ(q) === normQ(t.question)) || (page.answer.length > 0 && page.answer.every((id) => (x.claimIds ?? []).includes(id))));
    /* a gate that could not judge (e.g. no guidance or no cost entry handed in) is a failure, never a pass */
    const failed = verdict ? Object.entries(verdict.gates).flatMap(([k, g]) => (!g ? [`${k}: not judged`] : (g.checks ?? [{ name: g.gate, result: g.pass ? "PASS" : "FAIL" }]).filter((c) => c.result !== "PASS").map((c) => `${g.gate}: ${c.reason ?? c.name}`))) : ["the gates did not judge it"];
    if (verdict && !verdict.pass && !failed.length) failed.push("the gates refused it");
    if (dup) failed.push(`a duplicate of ${dup.url}`);
    if (failed.length) { why.set(t.topicId, `failed the gates — ${failed[0]}`); continue; }
    const auto = s.publishMode === PUBLISH_MODE.AUTO_AFTER_GATES;
    const cohort = planCohort({ pages: [page.url], approvals: auto ? [{ pageId: page.url, approvedBy: "gates:all-five-and-not-a-duplicate", on: day, decision: PUBLISH_MODE.AUTO_AFTER_GATES }] : [] });
    made.push(Object.freeze({ day, topicId: t.topicId, question: t.question, url: page.url, html: page.html, claimIds: page.answer, questions: page.questions, gate: gateInput(page), cards: page.cards.length,
      gates: "PASS — all five, and not a duplicate", publishMode: s.publishMode,
      publish: Object.freeze({ cohort: cohort.state, state: auto ? (cohort.state === "MAY_PUBLISH" ? "QUEUED TO PUBLISH (held — no product is attached; nothing goes live)" : "REFUSED") : "WAITING FOR THE CLIENT'S APPROVAL", sitemap: auto ? sitemapXml([page.url]) : null }) }));
  }
  if (made.length) return Object.freeze({ day, articles: Object.freeze(made), considered: topics.length });
  const reasons = [...why.values()];
  const count = (re) => reasons.filter((r) => re.test(r)).length;
  const parts = [[count(/^already answered/), "already answered by a page or an earlier article"], [count(/^no recorded question/), "no recorded question (never made up)"],
    [count(/^failed the gates/), `failed a gate (${reasons.find((r) => /^failed the gates/.test(r))?.replace(/^failed the gates — /, "") ?? ""})`], [count(/not sourced|not a planned/), "no sourced answer"]].filter(([n]) => n > 0);
  const none = topics.length === 0 ? "no article — no real question of this product is recorded"
    : `no article — none of ${topics.length} topic(s) is worthy today: ${parts.map(([n, w]) => `${n} ${w}`).join("; ")}`;
  return Object.freeze({ day, articles: Object.freeze([]), none, considered: topics.length });
}

/** Several days in order: each day's articles join the earlier ones, so no later day repeats an answered topic. */
export function articleDays({ days, ...rest }) {
  const earlier = [...(rest.earlier ?? [])];
  return days.map((day) => { const r = articlesForDay({ ...rest, day, earlier: [...earlier] }); earlier.push(...r.articles); return r; });
}
