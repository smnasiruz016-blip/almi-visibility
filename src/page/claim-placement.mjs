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
 * 🔴 THE DERIVATION, WHICH IS THE PART THAT IS GENERAL.
 *
 * A product hands over two things: the claims that are UNIVERSAL to every one
 * of its pages, and the claims that are scoped to something a variant page
 * cannot know — each with the layer that ought to hold them and what they
 * would become there.
 *
 * Everything else is arithmetic on those, and the arithmetic is identical for
 * every product:
 *
 *   removed      every pending claim, whatever its layer
 *   allRepeated  universal + removed — ⚠️ AND NOT THE SAME SET AS UNIVERSAL
 *   awaiting     one row per pending claim, WITH THE LAYER NAMED — so the
 *                census can COUNT the debt instead of leaving it in prose.
 *                A debt nobody counts is a debt nobody pays
 *
 * ⚠️ `allRepeated` INCLUDES THE PENDING CLAIMS ON PURPOSE, and the reason is
 * written above: the shared half is a property of the page AS RENDERED, not of
 * where we have since ruled a claim ought to live. Pointing it at the universal
 * set alone moved an AS-BUILT baseline from 0.3921 to 0.1927 — a measurement
 * that changed because a ruling changed.
 */
export function buildPlacement({ universal = [], pendingLayers = [] } = {}) {
  for (const layer of pendingLayers) {
    if (!Array.isArray(layer?.claims) || typeof layer?.layer !== "string") {
      throw new Error("buildPlacement: every pending layer needs claims and the name of the layer that should hold them");
    }
    if (layer.exists !== false) {
      // 🔴 A pending layer that claimed to EXIST would let a claim be called
      // "handled" while nothing renders it. Owed is not the same as hidden,
      // and it is certainly not the same as done.
      throw new Error(`buildPlacement: layer "${layer.layer}" must state exists: false — it is owed, not built`);
    }
  }

  const removed = Object.freeze(pendingLayers.flatMap((l) => l.claims));
  const allRepeated = Object.freeze([...universal, ...removed]);
  const awaiting = Object.freeze(
    pendingLayers.flatMap((l) => l.claims.map((claim) => ({ claim, layer: l.layer, exists: false, becomes: l.becomes }))),
  );

  if (new Set(allRepeated).size !== allRepeated.length) {
    throw new Error("buildPlacement: a claim is both universal and pending — it cannot stay and leave");
  }

  return Object.freeze({ universal: Object.freeze([...universal]), removed, allRepeated, awaiting });
}

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
 *   A CLAIM DISTINGUISHES A PAGE ONLY IF ITS VALUE VARIES WITH THAT PAGE’S AXIS.
 *
 * So it is DERIVED from the claim itself rather than remembered: a claim carries
 * a qualifier on the axis or it does not, and that is a property of the record,
 * not of anyone's memory. A hardcoded list is a check that silently stops being
 * complete the moment the registry grows — which is exactly what happened.
 */
/**
 * 🔴 AND ADDRESSABLE IS NOT DISTINGUISHING — MEASURED 2026-09-10.
 *
 * A qualifier on the axis makes a claim ADDRESSABLE. Whether it DISTINGUISHES
 * depends on its VALUE differing from another variant, which this predicate
 * cannot see and must not pretend to.
 *
 *   HCPC publishes an OET minimum for six professions. FIVE ARE THE SAME
 *   NUMBER (1400/300). Only speech and language therapy differs (1800/400).
 *
 * A product’s own census does the comparison, and reports a THIRD answer —
 * UNCOMPARABLE — where only one variant holds a predicate. For AlmiOET today
 * that is 14 of 14, because its registry covers 2 of 12 professions.
 *
 * ✅ AND THE SUPPLY THAT DOES DISTINGUISH HAS BEEN FOUND, in almi-oet’s
 * clinical item bank: 12/12 professions, 30 items each, cross-variant overlap
 * 0.0125 against a market benchmark of 0.0828–0.1305. `recipient` measures
 * 0.0011 and `setting` 0.0000; `letterType` measures 0.9242 and distinguishes
 * nothing. See DISTINGUISHING_SUPPLY.md.
 */
export function isPerVariant(record, axisKey) {
  if (typeof axisKey !== "string" || axisKey.length === 0) {
    throw new Error("isPerVariant(record, axisKey): the engine does not know what the page varies BY \u2014 a product must say");
  }
  return typeof record?.claim?.qualifier === "string" && record.claim.qualifier.includes(axisKey + "=");
}

/**
 * Would this claim render IDENTICAL text on every sibling page?
 *
 * True for anything without a qualifier on the axis, plus the claims the
 * product has named as repeated on every page. This is the half of the overlap
 * measure that decides what counts as SHARED text, so getting it wrong flatters
 * the page — which it did, until the hardcoded list was replaced by the
 * derivation below it.
 *
 * ⚠️ `allRepeated` DEFAULTS TO EMPTY, AND THAT IS THE SAFE DIRECTION. A caller
 * that forgets it gets the derived answer alone, which UNDER-counts shared text
 * and makes the page look worse than it is. The opposite default — assuming
 * everything named is repeated — would flatter it, and a measure that errs
 * towards flattering is the one nobody catches.
 */
export function isSharedAcrossVariants(record, axisKey, allRepeated = []) {
  if (allRepeated.includes(record?.id)) return true;
  return !isPerVariant(record, axisKey);
}

/**
 * The variant page with out-of-scope claims removed. A section that loses all
 * of its claims is DROPPED — a heading over nothing is padding.
 *
 * 🔴 THERE IS NO `trailer`. Nothing links anywhere, because there is nowhere to
 * link to. A link to a page that does not exist is worse than silence, and a
 * trailer that hints at one is how "awaiting its layer" quietly becomes "behind
 * a link" in somebody's summary six weeks from now.
 */
export function placeClaims(page, removeIds) {
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
  };
}
