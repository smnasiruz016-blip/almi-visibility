/**
 * WHERE A CLAIM LIVES — AND ITS SCOPE DECIDES, NOTHING ELSE.
 *
 * (Was `split.mjs`. Renamed 2026-09-10 because "split" named a thing we decided
 * NOT to do: there is no shared page. The file is about placement.)
 *
 * ══ 🔴 THE RULE, IN THE PLACE IT WILL BE READ ══════════════════════════════
 *
 *   A PAGE THAT EXISTS ONLY TO HOLD WHAT OTHER PAGES SHOULD NOT REPEAT DOES NOT
 *   THEREBY BECOME A PAGE. IT IS A SIGN THAT THE THING BEING REPEATED WAS IN
 *   THE WRONG PLACE — NOT THAT IT NEEDED A HOME OF ITS OWN.
 *
 * And the whole of it:
 *
 *   A CLAIM'S SCOPE DECIDES WHERE IT LIVES.
 *     origin-scoped        -> a layer that knows the ORIGIN
 *     destination-scoped   -> a layer that knows the DESTINATION
 *     universal            -> KEEP IT ON THE PAGE. Repetition is cheap, measured,
 *                             and better for the reader.
 *     and nobody needs a page called "shared".
 *
 * ══ THIS IS THE THIRD TIME THE SAME RULE HAS SURFACED ══════════════════════
 *
 *   1. an ORIGIN contributes 31 median / 47 max words over 573 pages
 *      -> it is a TABLE ROW, not a page
 *   2. the shared block was 45.3% of every profession page
 *      -> it did not need a page; it needed SORTING BY SCOPE
 *   3. the registry itself binds facts to CLAIMS, not to pages, and resolves by
 *      reference
 *
 * One principle, three shapes. It is worth naming because each time it arrived
 * disguised as a different problem.
 *
 * ══ WHY THERE IS NO SHARED PAGE — the owner's ruling, 2026-09-10 ═══════════
 *
 * Sending the ORIGIN-scoped claims to an origin layer while keeping the
 * DESTINATION-scoped one under the label "shared" would be applying the rule
 * SELECTIVELY — the same principle honoured in one direction and dodged in the
 * other. New Zealand's requirement is Immigration New Zealand's rule about how
 * the test must be taken. That is destination-scoped, exactly as the red list is
 * origin-scoped, and it goes to a destination layer for the same reason.
 *
 * What is left is the genuinely universal: the grade bands and the premise. They
 * STAY ON EVERY PROFESSION PAGE. Measured cost of that repetition: best-case
 * overlap 0.2409 / 0.2585 against a 0.40 bar — under two thirds of it on both
 * bookkeeping readings. **Repeating a
 * universal claim across twelve pages is measured-cheap and better for the
 * reader than sending them somewhere else to find it.**
 */

/**
 * 🔴 UNIVERSAL — true wherever the reader is from and wherever they are going.
 * These STAY on every profession page, and the repetition is paid for in
 * overlap at a price that has been measured rather than assumed.
 */
export const UNIVERSAL_CLAIMS = Object.freeze([
  // The page's own premise: why there is a NURSING page rather than one page
  // about OET. Without it /nursing starts mid-argument.
  "oet.subtests-and-which-are-profession-specific",
  // The scale and the grades. True for a dentist and a nurse alike, and the
  // thing every other claim on the page is denominated in.
  "oet.grade-bands-0-500",
]);

/**
 * 🔴 ORIGIN-SCOPED — they turn on WHERE THE READER IS FROM, which a profession
 * page never knows. `/nursing` was showing these to every reader alike.
 *
 * ⚠️ THE LAYER THAT SHOULD HOLD THEM DOES NOT EXIST YET. They are held in the
 * registry, rendered nowhere, and counted as owed. That is the honest state and
 * it is NOT the same as being published somewhere worse. They are NOT "behind a
 * link" — there is no link, because there is nowhere to send anyone.
 */
export const PENDING_ORIGIN_LAYER = Object.freeze([
  "uk-ukvi.majority-english-speaking-countries",
  "uk-code-of-practice.red-list-rule",
  "uk-code-of-practice.amber-list-rule",
  "uk-code-of-practice.direct-application-exception",
]);

/**
 * 🔴 DESTINATION-SCOPED — Immigration New Zealand's rule about how the test must
 * be taken. It is not a property of OET and not a property of nursing.
 *
 * ⚠️ That layer does not exist either. Same status, same honesty: owed, not
 * hidden.
 */
export const PENDING_DESTINATION_LAYER = Object.freeze(["nz-immigration-nz.oet-must-be-taken-in-person"]);

/** Everything that leaves the profession page. Nothing else does. */
export const REMOVED_FROM_PROFESSION_PAGE = Object.freeze([...PENDING_ORIGIN_LAYER, ...PENDING_DESTINATION_LAYER]);

/**
 * 🔴 EVERY CLAIM THAT WOULD RENDER IDENTICAL TEXT ON ALL TWELVE PAGES — used to
 * compute the shared half when measuring overlap, and NOT the same set as
 * `UNIVERSAL_CLAIMS`.
 *
 * ⚠️ THE DISTINCTION IS LOAD-BEARING AND IT ALREADY BIT ONCE. When this was
 * pointed at `UNIVERSAL_CLAIMS` alone, the AS-BUILT baseline silently moved from
 * 0.3921 to 0.1927 — because on the as-built page the origin and destination
 * claims ARE present and ARE identical across the twelve, whatever we have since
 * decided about where they belong.
 *
 *   THE SHARED HALF IS A PROPERTY OF THE PAGE AS RENDERED,
 *   NOT OF WHERE WE HAVE RULED THE CLAIM OUGHT TO LIVE.
 *
 * A measurement that changes because a RULING changed is measuring the ruling.
 * The measure intersects this set with what is actually on the page, so each
 * variant gets the right shared half and the baseline stays comparable.
 */
export const ALL_REPEATED_CLAIMS = Object.freeze([
  ...UNIVERSAL_CLAIMS,
  ...PENDING_ORIGIN_LAYER,
  ...PENDING_DESTINATION_LAYER,
]);

/**
 * 🔴 AND THE LIST ABOVE IS NOT ENOUGH — IT IS A LIST, AND A LIST ONLY KNOWS
 * THE CLAIMS SOMEBODY REMEMBERED TO PUT IN IT.
 *
 * Found while running the chain on a SECOND profession. `ALL_REPEATED_CLAIMS`
 * was assembled from the /nursing page, so on a speech-pathology page it did not
 * recognise HCPC's profession-independent claims (accepted tests, certificate
 * age, test venue) — and counted them as UNIQUE. That flatters the page: text
 * that would be identical on all twelve was being credited as distinguishing.
 *
 * The same bug was already present on /nursing itself:
 * `ie-nmbi.recognised-english-speaking-countries` has no profession qualifier and
 * is the same list for a dentist as for a nurse, yet it was counted as unique.
 *
 *   A CLAIM DISTINGUISHES A PROFESSION PAGE ONLY IF IT IS ABOUT THE PROFESSION.
 *
 * So it is DERIVED from the claim itself rather than remembered: a claim carries
 * a `profession=` qualifier or it does not, and that is a property of the record,
 * not of anyone's memory. A hardcoded list is a check that silently stops being
 * complete the moment the registry grows — which is exactly what happened.
 */
export function isPerProfession(record) {
  return typeof record?.claim?.qualifier === "string" && record.claim.qualifier.includes("profession=");
}

/**
 * Would this claim render IDENTICAL text on all twelve profession pages?
 * True for anything without a profession qualifier, plus the named sets above.
 */
export function rendersIdenticallyOnEveryProfessionPage(record) {
  if (ALL_REPEATED_CLAIMS.includes(record?.id)) return true;
  return !isPerProfession(record);
}

/** @deprecated use ALL_REPEATED_CLAIMS for overlap, UNIVERSAL_CLAIMS for placement. */
export const SHARED_CLAIM_IDS = ALL_REPEATED_CLAIMS;

/**
 * The profession page with out-of-scope claims removed. A section that loses all
 * of its claims is DROPPED — a heading over nothing is padding.
 *
 * 🔴 THERE IS NO `trailer`. Nothing links anywhere, because there is nowhere to
 * link to. A link to a page that does not exist is worse than silence, and a
 * trailer that hints at one is how "awaiting its layer" quietly becomes "behind
 * a link" in somebody's summary six weeks from now.
 */
export function placeClaims(page, removeIds = REMOVED_FROM_PROFESSION_PAGE) {
  if (!Array.isArray(page?.sections)) {
    throw new Error("placeClaims(page): the engine has no page of its own \u2014 a product must hand one over");
  }
  const remove = new Set(removeIds);
  const sections = page.sections
    .map((s) => ({ ...s, claims: s.claims.filter((c) => !remove.has(c)) }))
    .filter((s) => s.claims.length > 0);

  const removed = page.sections.flatMap((s) => s.claims).filter((c) => remove.has(c));

  return {
    ...page,
    sections,
    trailer: null,
    removedClaims: removed,
    toOriginLayer: removed.filter((c) => PENDING_ORIGIN_LAYER.includes(c)),
    toDestinationLayer: removed.filter((c) => PENDING_DESTINATION_LAYER.includes(c)),
  };
}

/**
 * Every claim owed a layer that does not exist, with the layer named.
 *
 * Exported so the census can COUNT the debt rather than leaving it in prose —
 * the same reason `DECLARED_GAPS` exists. A debt nobody counts is a debt nobody
 * pays.
 */
export const AWAITING_A_LAYER = Object.freeze([
  ...PENDING_ORIGIN_LAYER.map((claim) => ({
    claim,
    layer: "a layer that knows the reader's ORIGIN",
    exists: false,
    becomes: 'not "here are the rules" but "Nigeria is red-listed, and here is what that means for you"',
  })),
  ...PENDING_DESTINATION_LAYER.map((claim) => ({
    claim,
    layer: "a layer that knows the DESTINATION",
    exists: false,
    becomes: 'not "New Zealand requires this" on a page about nursing, but on a page about going to New Zealand',
  })),
]);
