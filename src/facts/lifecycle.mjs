/**
 * ITEMS 16, 17 AND 46 — conflict, freshness, derived provenance, and the cache.
 *
 * ── 🔴 THE ONE RULE UNDERNEATH ALL OF THEM ──────────────────────────────────
 *
 *   A STALE OR CONFLICTED FACT IS NEVER SILENTLY USED.
 *
 * It becomes UNKNOWN, and **everything that depends on it is MARKED FOR
 * REVIEW** rather than quietly continuing. The dependency walk is the point:
 * without it, a fact going stale is a local event that changes one row, when in
 * truth it invalidates every conclusion built on top of it.
 *
 * ── AND WHAT IS DELIBERATELY NOT AUTOMATED ──────────────────────────────────
 *
 * 🔴 A CONFLICT IS NEVER AUTO-RESOLVED. The frozen rule is that owner-approved
 * product truth plus current official authority outranks stale secondary
 * sources, **subject to explicit review**. Where that does not settle it, the
 * fact becomes UNKNOWN and **both values are retained** — because discarding
 * the loser destroys the evidence that there was ever a disagreement.
 */

import { tierRank } from "../evidence/records.mjs";
import { sourceTierOfFact } from "../evidence/source-tiers.mjs";

export const FACT_STATES = Object.freeze(["USABLE", "STALE", "EXPIRED", "CONFLICTED", "UNKNOWN"]);
export const REVIEW_REASONS = Object.freeze(["INPUT_CONFLICTED", "INPUT_STALE", "INPUT_EXPIRED", "INPUT_UNKNOWN", "INPUT_CHANGED"]);

const claimKey = (f) => `${f.claim?.subject}|${f.claim?.predicate}|${f.claim?.qualifier ?? ""}|${f.scope ?? ""}`;

/* ------------------------------------------------------------------ *
 * 2A — CONFLICT. DETECTED, NEVER AUTO-RESOLVED.
 * ------------------------------------------------------------------ */

export function detectConflicts(records) {
  const byClaim = new Map();
  for (const f of records) {
    if (f?.life?.status === "retired") continue;
    const k = claimKey(f);
    if (!byClaim.has(k)) byClaim.set(k, []);
    byClaim.get(k).push(f);
  }

  const conflicts = [];
  for (const [key, group] of byClaim) {
    if (group.length < 2) continue;
    const values = new Set(group.map((f) => JSON.stringify(f.value?.value ?? null)));
    if (values.size < 2) continue;

    /* 🔴 THE RULE IS APPLIED AS A RECOMMENDATION FOR REVIEW, NOT A DECISION.
     * A tier-1 official source outranks a tier-4 secondary — but only a person
     * may act on that, and only explicitly. */
    const ranked = [...group].sort((a, b) => tierRank(sourceTier(a)) - tierRank(sourceTier(b)));
    const bestTier = tierRank(sourceTier(ranked[0]));
    const tie = ranked.filter((f) => tierRank(sourceTier(f)) === bestTier).length > 1;

    conflicts.push({
      claimKey: key,
      /* 🔴 BOTH VALUES ARE RETAINED. Discarding the loser would destroy the
       * evidence that there was ever a disagreement. */
      records: group.map((f) => ({ id: f.id, value: f.value?.value ?? null, tier: sourceTier(f) })),
      state: "CONFLICTED",
      resolvedState: "UNKNOWN",
      suggestedAuthority: tie ? null : ranked[0].id,
      needsExplicitReview: true,
      why: tie
        ? "two records of equal authority disagree — the tier rule does not settle it, so the fact is UNKNOWN"
        : `${ranked[0].id} carries the higher-authority source, but a conflict is never auto-resolved: it needs explicit review`,
    });
  }
  return conflicts;
}

/* 🔴 One reader of a fact's tier, shared with the §623 layer — this module used
 * to carry its own private copy of the mapping. */
const sourceTier = sourceTierOfFact;

/* ------------------------------------------------------------------ *
 * 2B — FRESHNESS.
 * ------------------------------------------------------------------ */

/**
 * `STALE` — past its recheck date. `EXPIRED` — its source is gone.
 *
 * 🔴 LAW-ABSENT-1 APPLIED TO A MISSING SOURCE: a fact whose source URL could
 * not be FETCHED is UNKNOWN, never "expired" and never "unsourced by choice".
 * "The source is gone" and "we could not reach the source" are different facts,
 * and only the first is a statement about the fact.
 */
export function freshnessOf(fact, { now = new Date(), sourceReachable } = {}) {
  if (sourceReachable === false) {
    return { state: "EXPIRED", why: "the source returned 404/410 — the document it cited is gone" };
  }
  if (sourceReachable === "UNREACHABLE") {
    return {
      state: "UNKNOWN",
      why: "the source could not be fetched. That is a fact about our tool, not about the source (LAW-ABSENT-1)",
    };
  }
  const recheck = fact?.checks?.recheckAfter ?? fact?.freshness?.recheckAfter ?? null;
  if (!recheck) {
    const rule = fact?.freshness;
    if (rule?.days && fact?.life?.extractedOn) {
      const due = new Date(fact.life.extractedOn);
      due.setDate(due.getDate() + rule.days);
      if (now > due) {
        return { state: "STALE", why: `extracted ${fact.life.extractedOn}, freshness window ${rule.days} days, due ${due.toISOString().slice(0, 10)}` };
      }
      return { state: "USABLE", why: `within its ${rule.days}-day freshness window`, dueOn: due.toISOString().slice(0, 10) };
    }
    return { state: "UNKNOWN", why: "no recheck date and no freshness rule — staleness cannot be decided" };
  }
  return now > new Date(recheck)
    ? { state: "STALE", why: `past its recheck date of ${recheck}` }
    : { state: "USABLE", why: `recheck due ${recheck}`, dueOn: recheck };
}

/* ------------------------------------------------------------------ *
 * 2C / 3D — 🔴 THE DEPENDENCY WALK. THE POINT OF THE WHOLE ITEM.
 * ------------------------------------------------------------------ */

/**
 * Given facts whose state has gone bad, find EVERYTHING that depends on them —
 * derived facts, transitively, and any findings that cited them.
 *
 * A fact going stale is not a local event. It invalidates every conclusion
 * built on top of it, and if nothing walks the graph those conclusions carry on
 * looking healthy.
 */
export function markForReview({ facts, findings = [], badFactIds, reason }) {
  if (!REVIEW_REASONS.includes(reason)) throw new TypeError(`unknown review reason ${reason}`);
  const bad = new Set(badFactIds);

  // Transitive closure over derived-fact inputs.
  const derivedFacts = facts.filter((f) => Array.isArray(f?.derivation?.inputs));
  let grew = true;
  const marked = new Map();
  while (grew) {
    grew = false;
    for (const f of derivedFacts) {
      if (bad.has(f.id)) continue;
      const hit = f.derivation.inputs.find((i) => bad.has(i));
      if (!hit) continue;
      bad.add(f.id);
      marked.set(f.id, { id: f.id, kind: "derived-fact", becauseOf: hit, reason });
      grew = true;
    }
  }

  const markedFindings = findings
    .filter((x) => (x.sources ?? []).some((s) => bad.has(s)) || (x.factIds ?? []).some((s) => bad.has(s)))
    .map((x) => ({
      id: x.issue_id ?? x.id,
      kind: "finding",
      becauseOf: (x.sources ?? x.factIds ?? []).find((s) => bad.has(s)),
      reason,
    }));

  return {
    reason,
    seeds: [...badFactIds],
    markedFacts: [...marked.values()],
    markedFindings,
    total: marked.size + markedFindings.length,
  };
}

/* ------------------------------------------------------------------ *
 * ITEM 17 — DERIVED FACT PROVENANCE.
 * ------------------------------------------------------------------ */

/** The formulas a derived fact may use. Frozen, so a formula is re-executable. */
export const FORMULAS = Object.freeze({
  sum: (vals) => vals.reduce((a, b) => a + b, 0),
  difference: (vals) => vals.reduce((a, b) => a - b),
  product: (vals) => vals.reduce((a, b) => a * b, 1),
  ratio: (vals) => (vals[1] === 0 ? null : vals[0] / vals[1]),
  max: (vals) => Math.max(...vals),
  min: (vals) => Math.min(...vals),
});

const WEAKEST = ["VERIFIED", "UNVERIFIED", "UNKNOWN"];

/**
 * Build a derived fact.
 *
 * 🔴 IT CAN NEVER BE MORE VERIFIED THAN ITS LEAST-VERIFIED INPUT.
 *
 * Enforced in the constructor, not checked later somewhere else. A derivation
 * from an unverified number is an unverified number however clean the
 * arithmetic — and the arithmetic being clean is exactly what makes the
 * mistake persuasive.
 */
export function makeDerivedFact({ id, claim, formula, inputs, inputFacts, verificationState, unit = null, computedOn = null }) {
  /* 🔴 ROW 17 GAP 3 (14 September 2026): the derivation once stamped `computedAt: new Date()`, so the same
   * derivation over the same inputs was never the same bytes twice. It reads no clock now. A date, where one is
   * wanted, is DECLARED by the caller — a date is a measurement, never the clock's guess — and null says none was. */
  if (computedOn !== null && !/^\d{4}-\d{2}-\d{2}$/.test(computedOn)) {
    throw new TypeError(`computedOn must be an ISO date or null, got ${JSON.stringify(computedOn)}`);
  }
  if (!(formula in FORMULAS)) {
    throw new TypeError(`unknown formula ${JSON.stringify(formula)} — a formula must be re-executable, not described`);
  }
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new TypeError("a derived fact must cite the fact_ids of its inputs");
  }
  if (!Array.isArray(inputFacts) || inputFacts.length !== inputs.length) {
    throw new TypeError("every input fact_id must resolve to a fact");
  }

  const weakest = inputFacts
    .map((f) => f?.verificationState ?? "UNKNOWN")
    .reduce((worst, s) => (WEAKEST.indexOf(s) > WEAKEST.indexOf(worst) ? s : worst), "VERIFIED");

  if (verificationState && WEAKEST.indexOf(verificationState) < WEAKEST.indexOf(weakest)) {
    throw new TypeError(
      `${id}: declared ${verificationState} but its least-verified input is ${weakest}. ` +
        "A derived fact can never be more verified than its weakest input — the arithmetic being clean is " +
        "exactly what makes that mistake persuasive.",
    );
  }

  const values = inputFacts.map((f) => f?.value?.value);
  const computed = FORMULAS[formula](values);

  return Object.freeze({
    id,
    claim,
    derived: true,
    // 🔴 ROW 17 GAP 1: the KIND the registry validates (src/facts/schema.mjs FACT_KINDS, laws F28 and F29).
    kind: "derived",
    verificationState: weakest,
    value: { value: computed, valueType: "derived", unit },
    derivation: Object.freeze({
      formula,
      inputs: Object.freeze([...inputs]),
      inputValues: Object.freeze([...values]),
      computedOn,
    }),
  });
}

/** 3B — recompute and compare. A mismatch is a FINDING, never a repair. */
export function recomputeDerived(fact, inputFacts) {
  const fn = FORMULAS[fact?.derivation?.formula];
  if (!fn) return { ok: false, reason: "unknown formula", stored: fact?.value?.value, recomputed: null };
  const values = inputFacts.map((f) => f?.value?.value);
  const recomputed = fn(values);
  return {
    ok: JSON.stringify(recomputed) === JSON.stringify(fact.value.value),
    stored: fact.value.value,
    recomputed,
    /* 🔴 NOT REPAIRED. A stored value that disagrees with its own formula means
     * either the inputs moved or somebody edited the output — and silently
     * rewriting it would destroy the only evidence of which. */
    note: "a mismatch is a finding, not a repair",
  };
}

/**
 * 🔴 ROW 17 GAP 2 — AN INPUT THAT CHANGED IS DETECTED, NOT ANNOUNCED.
 *
 * `markForReview` walks dependents from the facts a CALLER says went bad; nothing noticed an input whose value had
 * moved. Every derived fact stores the value of each input it was computed from (`derivation.inputValues`), so the
 * comparison needs no caller: each stored value against the input record as it stands now.
 *
 *   INPUT_CHANGED  the input record holds a different value from the one the derivation used
 *   INPUT_UNKNOWN  the input record is no longer there to compare — LAW-ABSENT-1: that is not "unchanged"
 */
export function detectInputChanges(facts = []) {
  const byId = new Map(facts.map((f) => [f?.id, f]));
  const changes = [];
  for (const f of facts) {
    const d = f?.derivation;
    if (!Array.isArray(d?.inputs) || !Array.isArray(d?.inputValues)) continue;
    d.inputs.forEach((input, i) => {
      const current = byId.get(input);
      if (!current) {
        changes.push({ derivedId: f.id, input, stored: d.inputValues[i], current: null, reason: "INPUT_UNKNOWN" });
      } else if (JSON.stringify(current.value?.value) !== JSON.stringify(d.inputValues[i])) {
        changes.push({ derivedId: f.id, input, stored: d.inputValues[i], current: current.value?.value, reason: "INPUT_CHANGED" });
      }
    });
  }
  return changes;
}

/** Every changed input found by `detectInputChanges`, fed to the dependency walk as INPUT_CHANGED. */
export function reviewChangedInputs({ facts = [], findings = [] }) {
  const changes = detectInputChanges(facts);
  const changed = changes.filter((c) => c.reason === "INPUT_CHANGED");
  const walk = markForReview({ facts, findings, badFactIds: [...new Set(changed.map((c) => c.input))], reason: "INPUT_CHANGED" });
  return { derivedFacts: facts.filter((f) => Array.isArray(f?.derivation?.inputs)).length, changes, ...walk };
}

/* ------------------------------------------------------------------ *
 * ITEM 46 — CACHE BEFORE RE-RESEARCH.
 * ------------------------------------------------------------------ */

/**
 * A verified fact is stored once and reused — **but only inside its
 * applicability scope and its freshness window.**
 *
 * 🔴 OUTSIDE EITHER, IT IS A MISS, NOT A STRETCH. Serving a UK fact for an
 * Irish question because it is "close enough" is how a cache turns into a
 * source of quiet errors, and the hit rate would look better for it.
 */
export function createFactCache({ facts, now = () => new Date(), onLookup = () => {}, research = null }) {
  const byClaim = new Map();
  for (const f of facts) {
    const k = claimKey(f);
    if (!byClaim.has(k)) byClaim.set(k, []);
    byClaim.get(k).push(f);
  }

  let hits = 0;
  let misses = 0;
  let lookups = 0;
  const missReasons = {};
  const bump = (r) => {
    missReasons[r] = (missReasons[r] ?? 0) + 1;
  };

  function get({ subject, predicate, qualifier = null, scope = null }) {
    const k = `${subject}|${predicate}|${qualifier ?? ""}|${scope ?? ""}`;
    const candidates = byClaim.get(k) ?? [];
    if (candidates.length === 0) {
      misses += 1;
      bump("NOT_IN_CACHE");
      lookups += 1;
      onLookup({ subject, predicate, reason: "NOT_IN_CACHE" });
      /**
       * 🔴 THE MISS IS MEMOISED. THIS IS THE WHOLE ITEM.
       *
       * The spec's own words: do not run 400 identical agent searches for one
       * unchanged official fact. A cache that looks up, answers, and forgets
       * would do exactly that — and its hit rate would look fine, because
       * every request would be a fresh miss rather than a repeat.
       */
      if (research) {
        const found = research({ subject, predicate, qualifier, scope });
        if (found) {
          byClaim.set(k, [found]);
          return { hit: false, reason: "NOT_IN_CACHE", fact: found, researched: true };
        }
      }
      return { hit: false, reason: "NOT_IN_CACHE", fact: null };
    }
    const fact = candidates[0];

    /**
     * 🔴 AN UNRESOLVED FACT IS A MISS. THIS MODULE'S OWN HEADER SAYS SO:
     * "A STALE OR CONFLICTED FACT IS NEVER SILENTLY USED."
     *
     * It did not, until 12 September 2026. The cache checked FRESHNESS and
     * nothing else, so all 14 records a human had just marked UNKNOWN came back
     * as clean hits — including a contested NMCN fee whose value one official
     * page gives as ₦66,875 and another contradicts. The caller got a number
     * with no indication anyone had disputed it, and the hit rate read 100%.
     *
     * 🔴 THE HIT RATE GETS WORSE FOR THIS, AND THAT IS THE POINT. A cache that
     * serves contested values has a better hit rate than one that admits it
     * does not know — which is exactly why hit rate must never be the measure.
     */
    if (fact.verificationState === "UNKNOWN") {
      misses += 1;
      const why = fact.verification?.reason ?? "UNKNOWN";
      bump(`UNKNOWN_${why}`);
      lookups += 1;
      onLookup({ subject, predicate, reason: `UNKNOWN_${why}` });
      return { hit: false, reason: `UNKNOWN_${why}`, fact, unresolved: true };
    }

    const fresh = freshnessOf(fact, { now: now() });
    if (fresh.state !== "USABLE") {
      misses += 1;
      bump(fresh.state);
      lookups += 1;
      onLookup({ subject, predicate, reason: fresh.state });
      return { hit: false, reason: fresh.state, fact, freshness: fresh };
    }
    hits += 1;
    return { hit: true, fact, freshness: fresh };
  }

  return {
    get,
    /** 🔴 LAW-BOUND-1: the freshness window prints beside the hit rate. */
    stats: () => ({
      hits,
      misses,
      lookupsReachingSource: lookups,
      hitRate: hits + misses === 0 ? null : hits / (hits + misses),
      missReasons: { ...missReasons },
      bound: {
        freshnessWindowDays: [...new Set(facts.map((f) => f?.freshness?.days).filter(Boolean))].sort((a, b) => a - b),
        scopeRule: "a fact is reused ONLY inside its applicability scope and freshness window; outside either it is a MISS, not a stretch",
      },
    }),
  };
}
