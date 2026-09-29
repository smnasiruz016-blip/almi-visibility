/**
 * 🔴 F34 C5 · EVERY PAGE-PRODUCING PATH, CLASSIFIED (acceptance _handoffs 53f74b4).
 *
 * The census (tools/existing-page-first-census.mjs) DISCOVERS its population from the source — every git-tracked module outside
 * test/ that statically imports the candidate-page renderer (src/page/render.mjs) or constructor (src/page/construct.mjs) — and
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
  "src/page/construct.mjs": Object.freeze({ class: "CHECKS", marks: Object.freeze(["existingPageFirst(", "state: existing.mayProduce ? PASS", "rightToExist({", "informationGainForCandidate(", "state: gain.outcome === GAIN_OUTCOME.ESTABLISHED ? PASS"]), why: "part 5 of every candidate: ACCEPTED needs the existing-page check to pass" }),
  "bin/build-page.mjs": Object.freeze({ class: "ROUTED", marks: Object.freeze(["existingPages: ep", "if (ev) SCOPE.recordDecision(ev)", "gainEvidence: NO_RECORDED_GAIN_EVIDENCE"]), why: "hands the same tenant's population to constructCandidates and records each stopped candidate" }),
  "bin/crawl.mjs": Object.freeze({ class: "NOT_PAGE_PRODUCTION", why: "stores the bodies of pages a crawl FETCHED, as served — evidence of an existing page, never a new one" }),
  "bin/report.mjs": Object.freeze({ class: "NOT_PAGE_PRODUCTION", why: "the owner's report view about the evidence store — not a page of any subject" }),
};

const { loadAllSubjectPackages } = await import("../src/subject-package.mjs");
const SUBJECT = Object.assign({}, ...(await loadAllSubjectPackages()).map((p) => p.pageProduction ?? {}));

export const PAGE_PRODUCTION = Object.freeze({ ...SHARED, ...SUBJECT });

export const PAGE_PRODUCTION_CLASSES = Object.freeze(["CHECKS", "ROUTED", "NOT_PAGE_PRODUCTION"]);
