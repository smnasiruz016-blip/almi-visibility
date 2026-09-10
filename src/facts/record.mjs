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
export function fact(record) {
  const checks = record.checks ?? {};
  return {
    ...record,
    locale: record.locale ?? null,
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
