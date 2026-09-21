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

import { makeSource, tierRank, SOURCE_TIERS } from "./records.mjs";
import { isDerivedFact } from "../facts/registry.mjs";

/** The registry's numeric tier, mapped onto the frozen §623 order (1 = the authority itself). */
const BY_NUMBER = Object.freeze(["OFFICIAL", "OFFICIAL", "VERIFIED_ALMIWORLD", "REPUTABLE_SECONDARY", "COMPETITOR_COMMUNITY"]);

/**
 * A fact's tier. The human verification pass names it in words; that wins over
 * the registry's number. An unrecognised tier throws rather than defaulting,
 * because a tier silently read as OFFICIAL would outrank everything.
 */
export function sourceTierOfFact(f) {
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
