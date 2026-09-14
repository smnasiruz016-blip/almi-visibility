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
/**
 * 🔴 THREE STATES, BECAUSE TWO COULD NOT EXPRESS THE 12 SEPTEMBER RESULTS.
 *
 *   UNVERIFIED — nobody has looked. No check has happened.
 *   VERIFIED   — somebody looked at an official source and CONFIRMED the claim.
 *   UNKNOWN    — somebody looked and COULD NOT CONFIRM it.
 *
 * The third one is the important addition. Before today, a fact that had been
 * carefully checked and found contradicted was indistinguishable from a fact
 * nobody had opened — both were UNVERIFIED. That collapses the most expensive
 * work in the system into the same cell as no work at all.
 *
 * An UNKNOWN therefore REQUIRES a check date: it is a record of a check that
 * happened and did not settle the question, not an absence of one.
 */
export const VERIFICATION_STATES = Object.freeze(["UNVERIFIED", "VERIFIED", "UNKNOWN"]);

/** Why a check that ran did not confirm. Frozen; a new reason is deliberate. */
export const UNKNOWN_REASONS = Object.freeze({
  CONFLICT: "two current official sources of the same authority disagree; both values retained",
  INCOMPLETE: "true as far as it goes, but the source supports more than the fact states",
  SOURCE_UNREACHABLE: "the source could not be read. LAW-ABSENT-1: that is not a source saying otherwise",
  // Added 13 September 2026 for a verdict of that name: part of the value confirmed on the source,
  // part not found on any reachable page. A fact is one record with one value; partial confirmation is not verification.
  PARTIAL_EVIDENCE: "part of the claim's value is confirmed on the source and part is not found on any reachable page — partial confirmation is not verification",
});

export function fact(record) {
  /**
   * 🔴 THE VERIFICATION BLOCK — ONE PLACE, SO A RECORD CANNOT HALF-DECLARE.
   *
   * A record may carry `verification: { state, checkedOn, checkedBy, reason,
   * sourceUrl, sourceTier, note, recheckAfter }`. It is expanded here into
   * `verificationState` and `checks.factCheckedOn/By`, so the two can never
   * drift apart — which they would if each record set them separately.
   */
  if (record.verification) {
    const v = record.verification;
    record = {
      ...record,
      verificationState: v.state,
      verification: Object.freeze({ ...v }),
      checks: {
        ...(record.checks ?? {}),
        factCheckedOn: v.checkedOn ?? null,
        factCheckedBy: v.checkedOn ? (v.checkedBy ?? null) : null,
        /**
         * 🔴 THE RECHECK DATE MUST LAND WHERE freshnessOf ACTUALLY LOOKS.
         *
         * Ingesting the 12 September verdicts set `verification.recheckAfter`
         * on 32 records — and `freshnessOf` reads `checks.recheckAfter`, so all
         * 32 were INERT. Every one of them still aged out on the old
         * `extractedOn + freshness.days` rule, and the registry looked fully
         * governed while the dates governed nothing.
         *
         * It survived the first probe because that probe asked on a day past
         * BOTH rules' due dates, saw STALE and stopped. Only a day where the
         * two rules DISAGREE can tell them apart: 32 of 32 came back inert.
         */
        ...(v.recheckAfter ? { recheckAfter: v.recheckAfter } : {}),
      },
    };
  }

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
  /* 🔴 ROW 17 — A DERIVED FACT'S STANDING IS INHERITED, NEVER CHECKED. It is its weakest input's
   * (makeDerivedFact), and validateRegistry's F29 holds it there against the records it cites. So it carries no
   * check date: a date beside a derived fact would claim a check of arithmetic that nobody read on a source. */
  const derivedKind = record.kind === "derived";
  if (derivedKind && checkedOn !== null) {
    throw new TypeError(
      `fact(${record.id ?? "(no id)"}): a derived fact carries checks.factCheckedOn ${JSON.stringify(checkedOn)}. ` +
        "Its standing is inherited from its weakest input — it is not a check that happened on a day.",
    );
  }
  if (!derivedKind && record.verificationState === "VERIFIED" && checkedOn === null) {
    throw new TypeError(
      `fact(${record.id ?? "(no id)"}): verificationState is VERIFIED but checks.factCheckedOn is null. ` +
        "A verification without a date is a claim about a check nobody can locate.",
    );
  }
  /* 🔴 AN UNKNOWN IS A RECORD OF A CHECK THAT RAN. Without a date it is
   * indistinguishable from UNVERIFIED, which is the collapse this state was
   * added to prevent. */
  if (!derivedKind && record.verificationState === "UNKNOWN") {
    if (checkedOn === null) {
      throw new TypeError(
        `fact(${record.id ?? "(no id)"}): UNKNOWN requires checks.factCheckedOn. An UNKNOWN records a check ` +
          "that RAN and did not confirm — without a date it cannot be told from a fact nobody opened.",
      );
    }
    const reason = record.verification?.reason;
    if (!(reason in UNKNOWN_REASONS)) {
      throw new TypeError(
        `fact(${record.id ?? "(no id)"}): UNKNOWN needs a declared reason, one of ` +
          `${Object.keys(UNKNOWN_REASONS).join(" | ")} — got ${JSON.stringify(reason)}`,
      );
    }
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
