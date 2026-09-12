/**
 * The record normaliser.
 *
 * ── 🔴 WHAT THIS DELIBERATELY DOES NOT DO ───────────────────────────────────
 *
 * IT DERIVES NOTHING. Not the id, not the queue, not the freshness rule — even
 * though all three are mechanically derivable and deriving them would save
 * writing them out thirty-two times.
 *
 * Because if this helper filled them in, the laws that check them (F1, F11)
 * COULD NEVER FAIL FOR ANY RECORD BUILT THROUGH IT. A gate that cannot go red
 * is the pattern this project hunts, and building one into the constructor is
 * the quietest possible way to do it: every record would agree with its derived
 * queue by construction, the test would pass, and the check would be measuring
 * the helper rather than the data.
 *
 * So every fact file states its id, its queue and its freshness rule OUT LOUD,
 * and the validator recomputes all three and rejects any disagreement. The cost
 * is repetition. The purchase is that F1 and F11 are live on all thirty-two
 * records instead of vacuous on all thirty-two.
 *
 * All this does is turn ABSENT optional fields into explicit `null`, so that
 * "nobody has done this check" and "somebody forgot the field" stop looking
 * identical to a reviewer.
 */
/**
 * 🔴 THE TWO STANDINGS A FACT MAY HAVE, AND IT MUST DECLARE ONE.
 *
 * The checklist audit of 11 September 2026 found `factCheckedOn` null on all 46
 * records while the engine was being described as a "verified fact supply".
 * Item 15's PASS meaning requires a verification date, and there wasn't one.
 *
 * 🔴 THE FIX IS NOT TO BACKFILL A DATE WE DO NOT HAVE. That would be precisely
 * the failure item 50 forbids — turning missing evidence into an observed fact.
 * The records keep their values and their sources. They are simply **not
 * verified facts** until somebody verifies them and says when.
 *
 * So the standing must be DECLARED, never defaulted. `verificationState: null`
 * arriving by omission is how "nobody has checked this" came to look identical
 * to "this is a verified fact" for 46 records.
 */
export const VERIFICATION_STATES = Object.freeze(["UNVERIFIED", "VERIFIED"]);

export function fact(record) {
  const checks = record.checks ?? {};

  /* ---- A3 · THE DECLARATION IS REQUIRED AT CONSTRUCTION ------------------ *
   * Not validated later, somewhere else, by something that can be skipped.
   * A record that will not say whether it has been verified cannot be built. */
  if (!VERIFICATION_STATES.includes(record.verificationState)) {
    throw new TypeError(
      `fact(${record.id ?? "(no id)"}): verificationState must be declared as one of ` +
        `${VERIFICATION_STATES.join(" | ")}. A fact that will not say whether it has been ` +
        "verified is not a verified fact — and must not be able to pass for one by omission.",
    );
  }
  const checkedOn = checks.factCheckedOn ?? null;
  if (record.verificationState === "VERIFIED" && checkedOn === null) {
    throw new TypeError(
      `fact(${record.id ?? "(no id)"}): verificationState is VERIFIED but checks.factCheckedOn is null. ` +
        "A verification without a date is a claim about a check nobody can locate.",
    );
  }
  if (record.verificationState === "UNVERIFIED" && checkedOn !== null) {
    throw new TypeError(
      `fact(${record.id ?? "(no id)"}): verificationState is UNVERIFIED but checks.factCheckedOn is ` +
        `${JSON.stringify(checkedOn)}. The two must agree — a date beside UNVERIFIED is a contradiction ` +
        "a reader would resolve in whichever direction flattered us.",
    );
  }

  return {
    ...record,
    locale: record.locale ?? null,
    // Added 11 September 2026 with the licence findings. `attributionStatement`
    // defaults to null rather than to the licence's boilerplate ON PURPOSE: a
    // credit auto-filled by a constructor is a credit nobody chose, and F20
    // must be able to catch a quotable record that carries no attribution.
    attributionStatement: record.attributionStatement ?? null,
    pageFingerprint: record.pageFingerprint ?? null,
    thirdPartyRightsCheck: record.thirdPartyRightsCheck ?? null,
    evidence: {
      quotedSpan: null,
      quoteLocation: null,
      ownWords: null,
      ...(record.evidence ?? {}),
    },
    checks: {
      linkCheckedOn: null,
      linkCheckOutcome: "could-not-check",
      quoteMatchedOn: null,
      quoteMatchOutcome: "could-not-check",
      // The fingerprint check's own date and outcome, kept apart from the quote
      // match's. They are different checks proving different things and a
      // shared field would let the weaker one answer for the stronger.
      fingerprintCheckedOn: null,
      fingerprintOutcome: "could-not-check",
      // 🔴 Both null on every record in this registry, and that is not an
      // oversight. See REGISTRY_FACT_CHECK_COUNT in registry.mjs.
      factCheckedOn: null,
      factCheckedBy: null,
      ...checks,
    },
    life: {
      supersedes: null,
      supersededBy: null,
      retiredOn: null,
      retiredReason: null,
      ...(record.life ?? {}),
    },
    conflict: record.conflict ?? null,
  };
}
