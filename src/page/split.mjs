/**
 * EXTRACTING THE SHARED BLOCK — §5A, FINISHED.
 *
 * ══ THE GAP THE OWNER NAMED ═══════════════════════════════════════════════
 *
 *   "Page generation must not create independent untraceable copies of the same
 *    factual claim."
 *
 * We built the facts BY REFERENCE and then rendered the same seven of them onto
 * twelve pages. **The by-reference rule stopped at the page boundary.** Every
 * copy was traceable — `data-claim-id` sees to that — but there were still
 * twelve of them, and twelve renderings of one claim is what makes a shared half
 * that becomes shell.
 *
 * 🔴 SO THE SHARED CLAIMS GET THEIR OWN PAGE, AND THE TWELVE LINK TO IT.
 *
 * ── WHAT IS DERIVED, AND WHY IT IS DERIVED ──────────────────────────────────
 *
 * `splitSpec()` computes the profession page from the ORIGINAL spec by removing
 * shared claims. It is not a second spec written by hand, because a hand-written
 * variant would drift from the original the first time either changed — and then
 * the comparison between them would be measuring the drift.
 */
import { NURSING_PAGE } from "./spec.mjs";

/**
 * The claims that render IDENTICAL text on all twelve profession pages.
 *
 * 🔴 Two of these are shared for very different reasons, and the distinction
 * matters in §10.4 of the report:
 *
 *   TEST-SHARED     — true of OET itself, so true for a dentist and a nurse
 *                     alike. `oet.subtests…`, `oet.grade-bands…`
 *   ORIGIN-SHARED   — nothing to do with the profession at all. The UKVI list
 *                     and the recruitment rules turn on WHERE THE READER IS
 *                     FROM, which a profession page never knows.
 */
export const SHARED_CLAIM_IDS = Object.freeze([
  "oet.subtests-and-which-are-profession-specific",
  "oet.grade-bands-0-500",
  "uk-ukvi.majority-english-speaking-countries",
  "uk-code-of-practice.red-list-rule",
  "uk-code-of-practice.amber-list-rule",
  "uk-code-of-practice.direct-application-exception",
  "nz-immigration-nz.oet-must-be-taken-in-person",
]);

export const TEST_SHARED = Object.freeze(["oet.subtests-and-which-are-profession-specific", "oet.grade-bands-0-500"]);
export const ORIGIN_SHARED = Object.freeze([
  "uk-ukvi.majority-english-speaking-countries",
  "uk-code-of-practice.red-list-rule",
  "uk-code-of-practice.amber-list-rule",
  "uk-code-of-practice.direct-application-exception",
]);

/** The shared page the twelve link to. */
export const SHARED_PAGE = Object.freeze({
  slug: "oet-scoring-and-uk-rules",
  profession: "shared",
  title: "How OET is scored, and the UK rules that apply before you book",
  intro:
    "These are the parts that do not change with your profession. They are stated once here rather than repeated on every profession page, and each profession page links to this one.",
  sections: [
    {
      heading: "How OET is scored",
      framing: "Two things about the test itself are the same whichever profession you register under.",
      claims: [...TEST_SHARED],
    },
    {
      heading: "Before you book: the United Kingdom's rules",
      framing:
        "These turn on where you are from and where you intend to work, not on your profession. A nursing page and a dentistry page would give the same answer.",
      claims: [...ORIGIN_SHARED],
    },
    {
      heading: "New Zealand — how the test must be taken",
      framing: "An immigration condition on the test itself, which applies to every profession equally.",
      claims: ["nz-immigration-nz.oet-must-be-taken-in-person"],
    },
  ],
});

/**
 * The profession page with the shared claims removed and a link put in their
 * place. A section that loses all of its claims is DROPPED — its heading and
 * framing sentence go with it, because a heading over nothing is padding, and
 * padding is what we are trying to stop counting as content.
 */
export function splitSpec(page = NURSING_PAGE, sharedIds = SHARED_CLAIM_IDS) {
  const shared = new Set(sharedIds);
  const sections = page.sections
    .map((s) => ({ ...s, claims: s.claims.filter((c) => !shared.has(c)) }))
    .filter((s) => s.claims.length > 0);

  const removed = page.sections.flatMap((s) => s.claims).filter((c) => shared.has(c));

  return {
    ...page,
    sections,
    // The link that replaces them. Counted honestly: it is words on the page,
    // and it is the same words on all twelve, so it joins the shared half.
    trailer:
      "How OET is scored, and the United Kingdom's recruitment rules, are the same whichever profession you register under. They are set out once, on the OET scoring and UK rules page, and are not repeated here.",
    removedClaims: removed,
  };
}
