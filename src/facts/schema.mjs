/**
 * THE VERIFIED FACT REGISTRY — the record shape, and the vocabularies it may use.
 *
 * This is `FACT_CACHE_DESIGN.md` §1 and §3 made executable. Nothing here is new
 * design; what is new is that a record which breaks the design can now be
 * REJECTED rather than merely disapproved of in prose.
 *
 * ── WHERE THESE RECORDS LIVE ────────────────────────────────────────────────
 *
 * 🔴 IN THE REPOSITORY, AS FILES. There is no table and none is proposed.
 * (`FACT_CACHE_DESIGN.md` §5, and it is a test rather than a compromise: if a
 * few hundred facts cannot be held as reviewed files, a table will not save
 * them — it will only make the disorder invisible.)
 *
 * ── THE FIELD LIST DOD-03A §5A ASKED FOR, AND WHERE EACH ONE LIVES ──────────
 *
 *   fact ID            -> factId(claim), DERIVED — never typed by hand
 *   subject / entity   -> claim.subject
 *   claim / value      -> claim.predicate + value.value
 *   unit               -> value.unit
 *   locale / scope     -> scope + locale
 *   source URL / doc   -> source.url / source.documentRef
 *   source tier        -> source.tier
 *   extraction date    -> life.extractedOn
 *   verified date      -> 🔴 SPLIT INTO THREE. See `checks`, and §3 of the design.
 *   freshness rule     -> freshness.rule + freshness.days
 *   status             -> life.status
 *   provenance         -> provenance.route + provenance.acquiredBy
 */

/**
 * 🔴 THE IDENTITY OF A FACT IS A CLAIM, NOT A PAGE.
 *
 * (subject · predicate · qualifier). The reasons are in `FACT_CACHE_DESIGN.md`
 * §1 and all three have already bitten this network: 237,413 pages are being
 * deleted and every fact bound to one would die with it; one NMC fact serves
 * 193 nursing pages and must be researched ONCE, not 193 times; and freshness
 * is a property of the claim — the same fact cannot honestly carry 193
 * different verified dates.
 *
 * The id is DERIVED from the triple, so a record cannot disagree with itself
 * about which claim it is making.
 */
export function factId(claim) {
  if (!claim || typeof claim !== "object") return null;
  const { subject, predicate, qualifier } = claim;
  if (typeof subject !== "string" || subject.trim() === "") return null;
  if (typeof predicate !== "string" || predicate.trim() === "") return null;
  const tail = qualifier === null || qualifier === undefined || qualifier === "" ? "" : `.${qualifier}`;
  return `${subject}.${predicate}${tail}`;
}

/** D4 · the tier vocabulary. Kept identical to `src/gate-a/facts.mjs` on purpose. */
export const TIERS = Object.freeze({
  1: "primary — the body that decides the fact, on its own site",
  2: "official secondary — another official body restating it",
  3: "reputable third party — a well-known publication",
  4: "aggregator, law firm, prep blog — 🔴 A LEAD, NEVER A CITATION",
});

/**
 * 🔴 TIER 4 IS NOT A WEAK CITATION. IT IS NOT A CITATION.
 *
 * AlmiOET wrote this rule by hand before this registry existed and the design
 * adopts it rather than inventing a new one:
 *
 *   "Cite an OFFICIAL source — the authority's or organisation's own site. A law
 *    firm's summary or a prep-industry blog is a lead to verify, never the
 *    citation itself."   — src/lib/oet-seo/org-notes.ts
 *
 * So a tier-4 record is admissible ONLY as `status: "lead"`. It can never be
 * active, and therefore can never reach a page. The NZ record exists BECAUSE
 * this was obeyed: a law-firm blog surfaced the change, and a person then read
 * Immigration New Zealand's own news centre.
 */
export const TIER_LEAD_ONLY = 4;

export const SCOPES = Object.freeze(["destination", "origin", "corridor", "test", "shared"]);

export const STATUSES = Object.freeze({
  active: "acquired, checked as far as its source permits, and usable by a page",
  candidate: "believed true, NOT acquired from a tier-1 source — may not reach a page",
  lead: "tier 4, or a third-party pointer. A thing to go and verify. Never a citation",
  conflict: "🔴 two readings of the same claim disagree. Frozen until a person rules",
  retired: "superseded or withdrawn. Kept, never deleted — see `life.supersededBy`",
});

/** Statuses a page may render. Everything else is working state. */
export const RENDERABLE_STATUSES = Object.freeze(["active"]);

/**
 * 🔴 THE THREE OUTCOMES OF A CHECK — AND "COULD NOT CHECK" IS ONE OF THEM.
 *
 * `FACT_CACHE_DESIGN.md` §4a: a 403 must never be recorded as "the quote no
 * longer matches", and must never be recorded as a successful check. Four of
 * eight regulator sources refuse a machine outright. If their refusal collapses
 * into either of the other two outcomes, a blocked source drifts into looking
 * broken or looking verified, AND BOTH ARE LIES.
 *
 * `not-applicable` is the FOURTH, and it is not a softer "could not check": it
 * means the check is not lawful or not meaningful for this record — an OET
 * record has no stored span to re-match, and a permanent "could not check"
 * there would misreport a lawful state as a broken source.
 */
export const CHECK_OUTCOMES = Object.freeze({
  pass: "the check ran and succeeded",
  fail: "the check ran and FAILED — this record needs a person",
  "could-not-check": "🔴 THE CHECK COULD NOT RUN. Not a pass. Not a failure. Its own state",
  "not-applicable": "this check is not lawful or not meaningful for this record",
});

/** A check outcome that must never be counted as evidence either way. */
export const INCONCLUSIVE_OUTCOMES = Object.freeze(["could-not-check", "not-applicable"]);

/**
 * ── 🔴 TWO FIELDS THAT ARE INDEPENDENT, AND OET IS THE PROOF ────────────────
 *
 * `sourceMachineReadable` answers: CAN a machine fetch this?
 * `sourceQuotable`        answers: does the LICENCE let us store its wording?
 *
 * These were one idea until 10 September 2026, when OET broke them apart. OET
 * serves 200 to an automated fetch — there is no 403 — and its Intellectual
 * Property policy still forbids storing the Content in an "other form of
 * electronic retrieval system". A fact cache holding `quotedSpan` IS such a
 * system.
 *
 *   A SOURCE A MACHINE CAN READ PERFECTLY AND MAY NOT QUOTE.
 *
 * And the consequence is not cosmetic: the nightly quote-match that the whole
 * freshness model rests on CANNOT RUN against the single most important source
 * in the product.
 */
export const MACHINE_READABLE_VALUES = Object.freeze([true, false, "unknown"]);

/**
 * 🔴 `sourceQuotable` HAS THREE VALUES, AND THE THIRD IS NOT A HIDING PLACE.
 *
 *   true      the licence EXPRESSLY permits reproduction  (gov.uk — OGL v3.0)
 *   false     the licence EXPRESSLY prohibits it          (oet.com — IP policy)
 *   unknown   no express term either way was located      (default copyright)
 *
 * "unknown" exists because the alternative is worse. Forced to choose true or
 * false, every page carrying a bare "© All rights reserved" would have to be
 * guessed at — and a guess written into a field is indistinguishable, a month
 * later, from a licence somebody actually read.
 *
 * ⚠️ AND IT IS DELIBERATELY THE EXPENSIVE ANSWER. "unknown" routes a record to
 * the MANUAL queue, exactly as a 403 does. Nobody can use it to make work
 * cheaper, so nobody has a reason to reach for it to avoid reading a licence.
 * `sourceQuotableBasis` is mandatory in every case, so the reason is always
 * legible and always attributable.
 */
export const QUOTABLE_VALUES = Object.freeze([true, false, "unknown"]);

/**
 * ── THE THREE DATES THAT REPLACED ONE ───────────────────────────────────────
 *
 * `verifiedOn` was one field doing three jobs. `FACT_CACHE_DESIGN.md` §3 split
 * it, and the split is the reason the word "verified" can be used honestly:
 *
 *   linkCheckedOn   machine · did the URL return 200?
 *                   🔴 SAYS NOTHING WHATSOEVER ABOUT THE CLAIM.
 *   quoteMatchedOn  machine · is `quotedSpan` still verbatim at that URL?
 *                   Says nothing about whether the quote SUPPORTS the value.
 *   factCheckedOn   a person or model read the source and JUDGED that the quote
 *   + factCheckedBy supports this value. ONLY THIS ONE DESERVES THE WORD.
 *
 * 🔴 THEY ARE NEVER AVERAGED INTO ONE NUMBER, and `factCheckedBy` is mandatory
 * whenever `factCheckedOn` is set, because `human:NU` and `model:claude-opus-5`
 * are not the same evidence and must never be summed.
 */
export const FACT_CHECKED_BY_PATTERN = /^(human:[A-Za-z. -]{2,40}|model:[A-Za-z0-9._-]{2,60})$/;

/**
 * 🔴 FRESHNESS IS DERIVED FROM WHAT THE SOURCE PERMITS — NEVER CHOSEN.
 *
 * A machine-readable, quotable source is re-verified by a cron job for the
 * price of one HTTP GET. Everything else is re-verified by a person opening the
 * page and looking. Those are not the same cost and the record must say which
 * one it is buying, or the freshness queue silently mixes free work with
 * expensive work and nobody can plan either.
 */
export const FRESHNESS_RULES = Object.freeze({
  "machine-quote-match": "nightly fetch + verbatim match on `quotedSpan`. Effectively free. STRONGEST evidence: this exact sentence is still there",
  // Added 11 September 2026. See fingerprint.mjs — it rescues automated
  // detection for a source we may fetch and may not quote, which is most of the
  // fetchable ones.
  "machine-fingerprint": "nightly fetch + hash comparison, storing no words. WEAKER: says the PAGE moved, never what moved or whether the fact changed",
  "human-re-read": "🔴 A PERSON OPENS THE PAGE AND LOOKS. Human minutes, every 180 days, per fact",
});

/**
 * 🔴 THE TWO MACHINE RULES ARE NOT EQUAL EVIDENCE, AND NOTHING MAY SUM THEM.
 *
 * A passing quote match says THIS SENTENCE IS STILL ON THIS PAGE. A passing
 * fingerprint says NOTHING ON THE PAGE CHANGED — which is a different and much
 * weaker claim, and it is weaker in the dangerous direction too: it goes red for
 * a corrected typo and it cannot go red for a fact that moved to another page.
 *
 * Counting them in one column would let the registry's evidence quietly weaken
 * while the number went up.
 */
export const EVIDENCE_STRENGTH = Object.freeze({
  "machine-quote-match": "strong — the exact wording carrying the value is still present",
  "machine-fingerprint": "weak — only that the page is byte-identical after normalisation",
  "human-re-read": "none until a person looks, and then it is the strongest of all",
});

/**
 * ⚠️ PROVISIONAL, and it carries its sample: NOBODY HAS MEASURED how fast any of
 * these sources actually change. Deliberately one window for every tier —
 * "a blog goes stale faster than a regulator" is plausible and unmeasured, and
 * Rule Eight applies to a plausible argument exactly as to an implausible one.
 *
 * Imported from the gate rather than re-declared, so the two can never drift.
 */
export { FACT_FRESHNESS_DAYS } from "../gate-a/facts.mjs";

/** R1–R4. `FACT_CACHE_DESIGN.md` §2 — they are not interchangeable. */
export const ROUTES = Object.freeze({
  R1: "official structured source — an index, API or dataset the authority publishes",
  R2: "official page, read by a HUMAN — the only route that can honestly set factCheckedOn at tier-1 confidence",
  R3: "official page, read by a MODEL, quote extracted — 🔴 A LEAD until the span is machine-matched",
  R4: "third party — 🔴 NOT A CITATION. A LEAD ONLY",
});

/** The two queues of §4b. Written on every record, and DERIVED — see queues.mjs. */
export const QUEUES = Object.freeze({
  AUTOMATED: "the source permits both a fetch and a stored quote. Re-verified by cron",
  MANUAL: "🔴 the source refuses one of them. Re-verified by a person, twice a year, forever",
});
