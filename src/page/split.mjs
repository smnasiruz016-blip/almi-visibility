/**
 * WHERE EACH SHARED CLAIM BELONGS — §5A, PAST THE PAGE BOUNDARY.
 *
 * ══ THE DEFECT THIS CLOSED ════════════════════════════════════════════════
 *
 *   "Page generation must not create independent untraceable copies of the same
 *    factual claim."
 *
 * We built the facts BY REFERENCE and then rendered seven of them onto twelve
 * pages. **The by-reference rule stopped at the page boundary, and a traceable
 * copy is still a copy.** Measured: 45.3% of each page identical by
 * construction, and best-case overlap 0.3921/0.4003 against a 0.40 bar.
 *
 * ══ 🔴 AND THE ANSWER IS NOT "PUT THEM ALL BEHIND ONE LINK" ═══════════════
 *
 * The owner's ruling, 2026-09-10, after the extraction was measured. The seven
 * shared claims are not one kind of thing and must not get one kind of fix:
 *
 *   PREMISE      stays on the profession page. One claim earns its repetition.
 *   SHARED       moves to a page the twelve link to.
 *   ORIGIN-LAYER leaves the profession page and IS NOT LINKED FROM IT, because
 *                a link is not where it belongs either. It is WAITING FOR A
 *                LAYER THAT KNOWS THE READER'S ORIGIN.
 */
import { NURSING_PAGE } from "./spec.mjs";

/**
 * 🔴 THE CLAIM THAT STAYS, AND WHY IT IS WORTH THE OVERLAP IT COSTS.
 *
 * `oet.subtests-and-which-are-profession-specific` is the page's OWN PREMISE: it
 * is the claim that explains why there is a NURSING page at all, rather than one
 * page about OET. Behind a link, `/nursing` starts mid-argument.
 *
 * MEASURED COST OF KEEPING IT: best-case overlap 0.1292 → 0.1945, which is still
 * half the bar. **One claim earns its repetition and the payment is affordable.**
 * That is a measurement, not a preference — and it is the only claim that has
 * been shown to earn it.
 */
export const PREMISE_CLAIM = "oet.subtests-and-which-are-profession-specific";

/**
 * Genuinely shared, genuinely page-able: true of the test itself, and the same
 * for a dentist as for a nurse. These move to one page and the twelve link to it.
 *
 * ⚠️ AND IT IS A THIN PAGE — TWO CLAIMS. Recorded rather than padded: it may not
 * deserve to be a page at all, and the honest alternatives are to fold the grade
 * bands back onto each profession page (paying more overlap) or to widen this
 * page with claims the registry does not yet hold. Neither is decided here.
 */
export const SHARED_PAGE_CLAIMS = Object.freeze([
  "oet.grade-bands-0-500",
  "nz-immigration-nz.oet-must-be-taken-in-person",
]);

/**
 * 🔴 THE FOUR THAT ARE NOT DUPLICATED — THEY ARE MISPLACED.
 *
 * A profession page NEVER KNOWS THE READER'S ORIGIN. `/nursing` was showing the
 * red-list rules to every reader alike, whether they were from Nigeria, India or
 * Ireland, because there was nowhere better to put them.
 *
 *   THESE ARE NOT "MOVED BEHIND A LINK". THEY ARE AWAITING THEIR CORRECT LAYER.
 *
 * That layer is one that knows the origin, where the claim stops being
 * *"here are the rules"* and becomes **"Nigeria is red-listed, and here is what
 * that means for you."** Until that layer exists they are held in the registry,
 * rendered nowhere, and counted as owed — which is the honest state, and is not
 * the same as being published in a worse place.
 *
 * ══ ⚠️ AND THIS DOES NOT BRING BACK 191 CORRIDOR PAGES ════════════════════
 *
 * Read carefully, because the opposite reading is available and it is wrong:
 *
 *   - The red list is ONE CLAIM WITH 191 VALUES. That is a TABLE, not 191 pages.
 *   - The per-origin distinct-claim measurement STANDS: outside a handful of
 *     regulators, an origin still contributes about ONE BIT (`ORIGIN_CLAIM_SHAPE.md`
 *     §5, and the 31/47 median/max words measured over 573 pages).
 *
 * So this CONFIRMS the narrow ruling that already survived rather than reopening
 * it: **a corridor page is defensible only where the origin GENUINELY CHANGES
 * THE ANSWER** — and a red-listed country is precisely where it does.
 */
export const PENDING_ORIGIN_LAYER = Object.freeze([
  "uk-ukvi.majority-english-speaking-countries",
  "uk-code-of-practice.red-list-rule",
  "uk-code-of-practice.amber-list-rule",
  "uk-code-of-practice.direct-application-exception",
]);

/** Everything that renders identical text on all twelve profession pages. */
export const SHARED_CLAIM_IDS = Object.freeze([PREMISE_CLAIM, ...SHARED_PAGE_CLAIMS, ...PENDING_ORIGIN_LAYER]);

/** What actually leaves the profession page: the shared page's claims, plus the pending ones. */
export const REMOVED_FROM_PROFESSION_PAGE = Object.freeze([...SHARED_PAGE_CLAIMS, ...PENDING_ORIGIN_LAYER]);

/** Kept for the record: the two kinds the first extraction distinguished. */
export const TEST_SHARED = Object.freeze([PREMISE_CLAIM, "oet.grade-bands-0-500"]);
export const ORIGIN_SHARED = PENDING_ORIGIN_LAYER;

/** The shared page the twelve profession pages link to. */
export const SHARED_PAGE = Object.freeze({
  slug: "how-oet-is-scored",
  profession: "shared",
  title: "How OET is scored, and how it must be taken",
  intro:
    "These do not change with your profession. They are stated once here rather than repeated on every profession page, and each profession page links to this one.",
  sections: [
    {
      heading: "How OET is scored",
      framing: "The scale and the grades are the same whichever profession you register under.",
      claims: ["oet.grade-bands-0-500"],
    },
    {
      heading: "New Zealand — how the test must be taken",
      framing: "An immigration condition on the test itself, which applies to every profession equally.",
      claims: ["nz-immigration-nz.oet-must-be-taken-in-person"],
    },
  ],
});

/**
 * The profession page with the shared claims removed. A section that loses all
 * of its claims is DROPPED — a heading over nothing is padding, and padding is
 * what we are trying to stop counting as content.
 *
 * 🔴 THE DEFAULT REMOVAL SET NO LONGER INCLUDES THE PREMISE. That is the ruling,
 * encoded rather than left in prose: a caller who wants the old behaviour has to
 * ask for it by name.
 */
export function splitSpec(page = NURSING_PAGE, removeIds = REMOVED_FROM_PROFESSION_PAGE) {
  const remove = new Set(removeIds);
  const sections = page.sections
    .map((s) => ({ ...s, claims: s.claims.filter((c) => !remove.has(c)) }))
    .filter((s) => s.claims.length > 0);

  const removed = page.sections.flatMap((s) => s.claims).filter((c) => remove.has(c));
  const toSharedPage = removed.filter((c) => SHARED_PAGE_CLAIMS.includes(c));
  const toOriginLayer = removed.filter((c) => PENDING_ORIGIN_LAYER.includes(c));

  return {
    ...page,
    sections,
    // ⚠️ THE TRAILER PROMISES ONLY WHAT EXISTS. It links to the shared page and
    // says NOTHING about the origin-scoped claims, because there is nowhere to
    // send the reader yet and a link to nowhere is worse than silence.
    trailer:
      toSharedPage.length > 0
        ? "How OET is scored, and the way New Zealand requires the test to be taken, are the same whichever profession you register under. They are set out once, on the page about how OET is scored, and are not repeated here."
        : null,
    removedClaims: removed,
    toSharedPage,
    toOriginLayer,
  };
}
