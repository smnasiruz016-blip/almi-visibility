/**
 * THE §623 SOURCE-TIER LAYER, APPLIED TO REAL RECORDS.
 *
 * `SOURCE_TIERS` and `tierRank` have existed since the evidence store was
 * built, and until 12 September 2026 nothing had ever ranked a real record with
 * them: the only Source ever constructed was a test fixture. The 32 verified
 * facts carry a named OFFICIAL tier from a human verification pass, so the
 * layer can now be exercised on data rather than on examples.
 *
 * 🔴 ONE READER OF A FACT'S TIER. `src/facts/lifecycle.mjs` used to carry its own
 * private copy of the numeric-tier mapping. A rule with two copies is a rule
 * that can disagree with itself, so both now read it from here.
 */

import { makeSource, tierRank, SOURCE_TIERS, FIRST_PARTY_TIERS, isIndependentSourceTier } from "./records.mjs";
import { isDerivedFact } from "../facts/registry.mjs";
import { isCapabilityClaim, INDEPENDENT } from "../facts/capability-claims.mjs";

/** The registry's numeric tier, mapped onto the §623 order (1 = the authority itself).
 * 🔴 RR-80 §3: tier 2 ("official secondary — another official body restating it") used to map onto VERIFIED_ALMIWORLD, the
 * operator's own first-party tier — an independent official source filed under our own name. It maps onto the independent
 * secondary tier now. Measured before the change: 0 real source-bearing facts carried numeric tier 2 (46 tier 1, 7 tier 3). */
const BY_NUMBER = Object.freeze(["OFFICIAL", "OFFICIAL", "REPUTABLE_SECONDARY", "REPUTABLE_SECONDARY", "COMPETITOR_COMMUNITY"]);

/**
 * A fact's tier. The human verification pass names it in words; that wins over
 * the registry's number. An unrecognised tier throws rather than defaulting,
 * because a tier silently read as OFFICIAL would outrank everything.
 */
export function sourceTierOfFact(f) {
  /* 🔴 F44 CAPABILITY PRECONDITION P2 — a first-party claim about its own product holds NO tier: not OFFICIAL, not any other.
   * Checked before the named or numeric tier is read, so the demotion never depends on the tier the record declares. */
  if (isCapabilityClaim(f) && f?.source?.class !== INDEPENDENT) {
    throw new TypeError(`${f?.capabilityId ?? f?.id}: a ${f?.source?.class ?? "unclassified"} capability claim holds no evidence tier (F44 capability precondition P2)`);
  }
  const named = f?.verification?.sourceTier;
  if (typeof named === "string") {
    tierRank(named);
    return named;
  }
  const t = f?.source?.tier;
  if (typeof t === "number") return BY_NUMBER[Math.min(t, BY_NUMBER.length - 1)] ?? "AGENT_INFERENCE";
  if (typeof t === "string") {
    tierRank(t);
    return t;
  }
  return "AGENT_INFERENCE";
}

/**
 * A real Source record for one fact's citation.
 *
 * 🔴 A DERIVED RECORD CITES NO SOURCE — F28. Its standing is inherited from the records it computes
 * over, so it carries no `source.url` and never will. Asking it for one is a caller that picked the
 * wrong population, and it is told so by name here rather than dying inside `makeSource` as a
 * missing string with nothing in the message to say which record or why.
 */
export function sourceRecordFromFact(f) {
  if (isDerivedFact(f)) {
    throw new TypeError(`${f?.id}: a derived record cites no source — rank the records it computes over, not the record itself (F28)`);
  }
  return makeSource({
    source_id: `fact-source:${f.id}`,
    source_url: f.verification?.sourceUrl ?? f.source?.url,
    source_tier: sourceTierOfFact(f),
    publisher: f.source?.publisher ?? null,
    retrieved_at: f.verification?.checkedOn ?? f.checks?.linkCheckedOn,
    recheck_after: f.verification?.recheckAfter ?? null,
    reviewer: f.verification?.checkedBy ?? null,
    excerpt_ref: f.id,
  });
}

/**
 * Order sources most-authoritative first. STABLE: records of equal tier keep
 * their input order, so the ranking never invents a preference the tier rule
 * does not state.
 */
export function rankSources(sources) {
  return sources
    .map((s, i) => ({ s, i, r: tierRank(s.source_tier) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.s);
}

export function tierCensus(sources) {
  const out = Object.fromEntries(SOURCE_TIERS.map((t) => [t, 0]));
  for (const s of sources) out[s.source_tier] += 1;
  return out;
}

/** LAW-BOUND-1: the bound on the population an independence census walks, printed beside its result. */
export const INDEPENDENCE_CENSUS_BOUND = 100000;

/**
 * 🔴 RR-80 §3 · first-party evidence is counted APART from independent evidence, never folded into it. Every source lands in
 * exactly one of the three columns; the population and the bound travel with the result.
 */
export function tierIndependenceCensus(sources) {
  if (!Array.isArray(sources)) throw new TypeError("a source population must be an array");
  if (sources.length > INDEPENDENCE_CENSUS_BOUND) throw new RangeError(`POPULATION_OVER_BOUND: ${sources.length} sources exceed ${INDEPENDENCE_CENSUS_BOUND}`);
  const out = { independent: 0, firstParty: 0, other: 0, population: sources.length, bound: INDEPENDENCE_CENSUS_BOUND };
  for (const s of sources) {
    if (FIRST_PARTY_TIERS.includes(s.source_tier)) out.firstParty += 1;
    else if (isIndependentSourceTier(s.source_tier)) out.independent += 1;
    else out.other += 1;
  }
  return out;
}
