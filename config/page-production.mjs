/**
 * 🔴 F34 C5 · EVERY PAGE-PRODUCING PATH, CLASSIFIED (acceptance _handoffs 53f74b4).
 *
 * The census (tools/existing-page-first-census.mjs) DISCOVERS its population from the source — every git-tracked module outside
 * test/ that statically imports the one page builder (src/page/one-builder.mjs; RR-295 — the old renderer and constructor are removed) — and
 * adds every entry of the permitted page-writer register. Each file it finds must be named here, or the census fails:
 *
 *   CHECKS                the library that applies the existing-page check itself
 *   ROUTED                an entry point that produces a candidate page only through the check
 *   NOT_PAGE_PRODUCTION   a registered writer that writes HTML but renders no candidate page — a copy of fetched pages, or the
 *                         owner's report. It must NOT import the candidate-page renderer or constructor, and says why.
 *
 * `marks` are the source fragments a CHECKS or ROUTED file must contain — the CALL and the CONDITION its production depends on.
 * 🔴 The call alone is not enough: a file can call the check and then write the page anyway. So each mark set names the exact
 * expression that makes the page's production depend on the answer, and a file missing any one of them is a census fault.
 * This is a source check, stated as one: it proves the dependency is written where declared, not that no other write exists.
 *
 * Subject-owned paths are classified in their own package (subjects/<id>/package.mjs, `pageProduction`) and merged in here, so this
 * shared file carries no subject's words — as config/permitted-page-writers.mjs does for their register entries.
 *
 * This list is a classification, not the population: a path missing from it is found by the census, never excused by it.
 */
const SHARED = {
  /* RR-295: the old constructor (src/page/construct.mjs) and renderer (src/page/render.mjs) are removed; the ONE page builder
   * (src/page/one-builder.mjs buildGuides) rebuilds only a page that exists, and refuses a NEW one (NO_EXISTING_PAGE) — the existing-page law */
  "bin/build-page.mjs": Object.freeze({ class: "ROUTED", marks: Object.freeze(["const notBuilt = built.filter((g) => g.refused);", "const candidates = built.filter((g) => !g.refused)", "acceptByPageGates(candidates"]), why: "builds only through the one builder, which refuses a page with no existing address; the rest are judged by the five page gates before any write" }),
  "src/report/visibility-parts.mjs": Object.freeze({ class: "ROUTED", marks: Object.freeze(["gb.filter((g) => !g.refused)", "allGates(gated"]), why: "builds the stored guides in memory through the one builder (a page with no existing address refused) and gates them; it writes nothing" }),
  /* RR-296: the daily articles build NEW pages through the one builder — the existing page first (an answered topic is never a page), then the five gates and the duplicate check */
  "src/page/articles.mjs": Object.freeze({ class: "ROUTED", marks: Object.freeze(["const plan = planNewPages({", "if (p.kind === \"SECTION\") {", "if (failed.length) {"]), why: "builds a day's article only through planNewPages (a topic already answered is refused as a SECTION) and only when all five gates pass and it duplicates no page or earlier article; it writes and publishes nothing" }),
  /* RR-297: the auto-refresh rebuilds only a page that stands and shows a CHANGED fact — never a new page — and puts it forward only after every gate */
  "src/page/refresh.mjs": Object.freeze({ class: "ROUTED", marks: Object.freeze(["if (!p.items.some((it) => it.claims.some((c) => changed.has(c.claimId)))) { untouched.push(p); continue; }", "gatesPassed: passed })"]), why: "rebuilds only the standing pages that show a changed fact (the rest stay byte-identical) and puts a rebuilt page forward only when every gate passed; it writes and publishes nothing" }),
  /* RR-298: the language versions of a page that stands — the same facts in another language; a translation that changes a fact is never built */
  "src/page/languages.mjs": Object.freeze({ class: "ROUTED", marks: Object.freeze(["if (!same(numbersOf(c.text), numbersOf(x.text))) return", "(r.ok ? ok : refused).push("]), why: "builds only the language versions of a page that stands, from translations that keep every fact, number and currency (a changed one is refused, named); each version is gated within its language; it writes and publishes nothing" }),
  /* RR-307 (owner, C "Create SEO pages"): the downloadable app's drafts — the existing page first (planNewPages: an answer already on one of the
   * client's pages is a SECTION of that page, never a new one), only the NEW rows built, every draft judged by all five gates; nothing is
   * published or submitted (drafts stay in the product's own folder) */
  "desktop/seo-pages.mjs": Object.freeze({ class: "ROUTED", marks: Object.freeze(["const plan = planNewPages({ needs, existing });", "const news = plan.filter((p) => p.kind === \"NEW\")", "allGates(built.map((b) => gateInput(b))"]), why: "the app's page drafts are built only for NEW rows of the existing-page-first plan and every draft is judged by all five gates; nothing is published" }),
  /* RR-308 D (owner: "the Publish button is missing"): the app publishes ONLY a draft the five gates passed — judged again right before by its
   * caller (desktop/main.mjs publishOne, on the client's edited text) and refused here too; the page that leaves is the gated text (asPublished) */
  "desktop/publish.mjs": Object.freeze({ class: "ROUTED", marks: Object.freeze(["if (draft.readyAsDraft !== true) return { ok: false", "const html = asPublished(draft.html, draft.url);"]), why: "publishes only a draft the five gates passed (judged again right before publishing), and only its gated text; it builds no page" }),
  "bin/crawl.mjs": Object.freeze({ class: "NOT_PAGE_PRODUCTION", why: "stores the bodies of pages a crawl FETCHED, as served — evidence of an existing page, never a new one" }),
  "bin/report.mjs": Object.freeze({ class: "NOT_PAGE_PRODUCTION", why: "the owner's report view about the evidence store — not a page of any subject" }),
};

const { loadAllSubjectPackages } = await import("../src/subject-package.mjs");
const SUBJECT = Object.assign({}, ...(await loadAllSubjectPackages()).map((p) => p.pageProduction ?? {}));

export const PAGE_PRODUCTION = Object.freeze({ ...SHARED, ...SUBJECT });

export const PAGE_PRODUCTION_CLASSES = Object.freeze(["CHECKS", "ROUTED", "NOT_PAGE_PRODUCTION"]);
