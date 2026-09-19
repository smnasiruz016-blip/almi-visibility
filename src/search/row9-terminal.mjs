/**
 * 🔴 ROW 9 — THE JUSTIFIED UNAVAILABLE DIMENSION, MACHINE-READABLE.
 *
 * ── WHY THIS MODULE EXISTS BESIDE `dimensions.mjs`, NOT INSIDE IT ───────────
 *
 * `dimensions.mjs` answers ONE question: which of the seven dimensions does the
 * evidence store prove INGESTED. Its `item9Verdict` returns
 * `ONLY_BLOCKED_DIMENSIONS_SHORT` for six-of-seven and that is CORRECT — six is
 * not seven, and nothing here changes it. Widening that verdict to say "tick"
 * would give an existing name a quieter meaning, which is the defect this
 * project keeps finding. So the terminal question is asked HERE, by its own
 * name, over its own conditions, and `dimensions.mjs` is untouched.
 *
 * ── THE AUTHORITY, AND WHY IT IS FOUR CONDITIONS AND NOT ONE ────────────────
 *
 * `OWNER_RULING_2026-09-18_STATUS_SEMANTICS.md` ruled, for row 9 ONLY, that a
 * dimension row 9's own boundary classifies `⚠` because no authorised tool can
 * supply it is a JUSTIFIED UNAVAILABLE DIMENSION and not a failure — *provided
 * all four hold*: (1) row 9's boundary authorises `⚠` for that dimension;
 * (2) every OTHER applicable row 9 requirement is genuinely satisfied; (3) the
 * dimension stays visibly `⚠`/UNKNOWN and is never represented as measured;
 * (4) no required tool or source has since become available.
 *
 * 🔴 THAT RULING ANSWERED CONDITION 2 "UNKNOWN" AND RECORDED **NO MOVEMENT**:
 * *"No such whole-boundary verification has been run, and this ruling turn did
 * not run one."* It then stood the rule ready *"for the day condition 2 is
 * actually proved."* `boundaryVerification` below is that verification. It is
 * the work the ruling was waiting on — not a re-reading of it.
 *
 * ── 🔴 AND WHY AN UNLOCK CONDITION IS A PREDICATE, NOT A PARAGRAPH ──────────
 *
 * Row 9 already carried its unlock condition as prose. Prose cannot go RED. If
 * an analytics package appears in a product repository next month, a paragraph
 * will not notice and the row will read complete on a premise that expired.
 * Every clause below is therefore a function over inputs a later turn MEASURES,
 * and `unlockState` returns which of them have become true. A row whose unlock
 * condition has come true and which has not been re-sat is NOT terminal.
 *
 * ANTI-CIRCLE: nothing in this module is row 9's evidence. Row 9's evidence is
 * the six ingested dimensions in the store. This module is row 9's GUARD.
 */

import { PASS_DIMENSIONS, dimensionCensus } from "./dimensions.mjs";

/** The dimension row 9's own NOTE classifies `⚠`. Named once, read everywhere. */
export const UNAVAILABLE_DIMENSION = "downstream outcomes";

/**
 * 🔴 THE UNLOCK CONDITION, AS FOUR MEASURABLE CLAUSES — ANY ONE OF WHICH UNLOCKS.
 *
 * Disjunctive, deliberately. The row's prose unlock condition is conjunctive
 * ("ALL THREE are true") because it describes the full path to INGESTING the
 * dimension. This is the weaker, earlier trigger: the moment ANY of these turns
 * true, the premise that "no available tool can supply it" is no longer proved,
 * and row 9 must be sat again before it may still read terminal.
 *
 * Each clause reads a field a later turn measures. None reads a secret: the
 * credential is named by its SCOPE string, which `google-search-console.mjs`
 * declares as a frozen constant. Nothing here touches a key.
 */
export const UNLOCK_CLAUSES = Object.freeze([
  Object.freeze({
    id: "analytics-scope",
    becomesTrueWhen: "the engine's credential scope includes any analytics scope",
    read: (i) => (i.credentialScopes ?? []).some((s) => /analytics/i.test(s)),
  }),
  Object.freeze({
    id: "analytics-package",
    becomesTrueWhen: "any product repository declares an analytics package or loads an analytics tag",
    read: (i) => (i.productReposWithAnalytics ?? 0) > 0 || (i.productReposLoadingAnalyticsTag ?? 0) > 0,
  }),
  Object.freeze({
    id: "search-source-key",
    becomesTrueWhen: "the first-party funnel-event allow-list gains a key that can carry a search source",
    read: (i) => (i.funnelKeysCarryingSearchSource ?? 0) > 0,
  }),
  Object.freeze({
    id: "product-db-read",
    becomesTrueWhen: "the owner authorises this engine to read a product database",
    read: (i) => i.productDatabaseReadAuthorised === true,
  }),
]);

/**
 * 🔴 THE MEASUREMENT, WITH ITS DATE — TAKEN 19 SEPTEMBER 2026, NOT CARRIED FORWARD.
 *
 * The previous record of this claim was taken on 12 September and stated as
 * prose. Every field below was re-measured on 19 September before this module
 * was written, because a measurement may be true when taken and stale when
 * filed. The denominator moved nowhere (36 repositories with a `package.json`,
 * counted again); the counts did not move either. Both facts are recorded,
 * because "it did not move" is itself a measurement and not an assumption.
 */
export const UNSUPPLIABLE_MEASUREMENT = Object.freeze({
  measuredOn: "2026-09-19",
  /** The frozen SCOPE constant in `google-search-console.mjs`. No credential was accessed. */
  credentialScopes: Object.freeze(["https://www.googleapis.com/auth/webmasters.readonly"]),
  productRepositories: 36,
  productReposWithAnalytics: 0,
  productReposLoadingAnalyticsTag: 0,
  productSourceFilesScanned: 6765,
  funnelEventAllowListKeys: Object.freeze(["days", "limit", "path", "planLabel", "subTest", "taskType", "userId"]),
  funnelKeysCarryingSearchSource: 0,
  productDatabaseReadAuthorised: false,
});

/**
 * 🔴 THE `⚠` RECORD ITSELF — what E4 requires a later reader's CODE to be able to read.
 *
 * Which dimension, its unlock condition, and the date it was measured
 * unsuppliable. A `⚠` without all three is refused by `justifiedUnavailableErrors`.
 */
export const JUSTIFIED_UNAVAILABLE = Object.freeze({
  dimension: UNAVAILABLE_DIMENSION,
  state: "UNAVAILABLE-JUSTIFIED",
  mark: "⚠",
  measuredUnsuppliableOn: UNSUPPLIABLE_MEASUREMENT.measuredOn,
  unlockClauses: UNLOCK_CLAUSES.map((c) => Object.freeze({ id: c.id, becomesTrueWhen: c.becomesTrueWhen })),
  authority: "OWNER_RULING_2026-09-18_STATUS_SEMANTICS.md — FROZEN TERMINAL SEMANTICS, ROW 9 ONLY",
  /** 🔴 The words a report may never print about this dimension. It is not measured. */
  neverRepresentedAsMeasured: true,
});

/** Which unlock clauses have become true under `inputs`. Empty is the locked state. */
export function unlockState(inputs = UNSUPPLIABLE_MEASUREMENT) {
  return UNLOCK_CLAUSES.filter((c) => c.read(inputs)).map((c) => ({ id: c.id, becomesTrueWhen: c.becomesTrueWhen }));
}

/**
 * The `⚠` record is only lawful when it carries all three of E4's parts. Returns
 * every violation; an empty array is the only lawful answer.
 *
 * 🔴 NO DEFAULT ARGUMENT, DELIBERATELY. It had one — `= JUSTIFIED_UNAVAILABLE` —
 * and the RED proof for "an absent ⚠ is refused" went GREEN against it: a caller
 * that passed nothing got a clean bill of health for a record it never supplied.
 * A default is a dependency nobody has to declare, and here it turned the guard
 * into one that could not fail. The caller names the record it is checking.
 */
export function justifiedUnavailableErrors(record) {
  const out = [];
  if (!record || typeof record !== "object") return ["the ⚠ record is absent"];
  if (typeof record.dimension !== "string" || record.dimension.length === 0) out.push("no dimension named");
  if (!Array.isArray(record.unlockClauses) || record.unlockClauses.length === 0) out.push("no unlock condition on the record");
  else {
    record.unlockClauses.forEach((c, i) => {
      if (!c || typeof c.id !== "string" || typeof c.becomesTrueWhen !== "string" || c.becomesTrueWhen.length === 0) {
        out.push(`unlock clause ${i} states no condition that could become true`);
      }
    });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.measuredUnsuppliableOn ?? "")) out.push("no date on which it was measured unsuppliable");
  if (!PASS_DIMENSIONS.some((d) => d.dimension === record.dimension)) out.push(`${record.dimension} is not one of row 9's seven dimensions`);
  return out;
}

/**
 * 🔴 CONDITION 2 — THE WHOLE-BOUNDARY VERIFICATION THE 18 SEPTEMBER RULING WAITED FOR.
 *
 * Row 9's frozen clauses, each checked against the store rather than asserted:
 *
 *   EVIDENCE  "row counts, request counts, bounds, and `dataState` per pull."
 *   FAILURE   "any dimension missing, or any result claiming completeness it
 *              cannot show."
 *
 * 🔴 The FAILURE clause's second limb is the sharp one and it is checked in the
 * direction that can FAIL: a pull that says `dataState: COMPLETE` must ALSO
 * carry `exhausted`, both bounds and its counts. A pull that says UNKNOWN claims
 * nothing and breaks nothing — it is reported, never counted against the row,
 * and never quietly dropped from the report either.
 */
export function boundaryVerification(records) {
  const census = dimensionCensus(records);
  const failures = [];

  // FAILURE limb 1 — "any dimension missing".
  for (const d of census.dimensions) {
    if (d.state === "MISSING") failures.push(`dimension "${d.dimension}" is MISSING`);
    if (d.state === "BUILT_NOT_RUN") failures.push(`dimension "${d.dimension}" is BUILT_NOT_RUN — code that has not run is not ingested`);
  }

  // FAILURE limb 2 — "any result claiming completeness it cannot show".
  const overclaiming = [];
  for (const p of census.pulls) {
    if (p.dataState !== "COMPLETE") continue;
    const missing = [];
    if (p.rowCount === null) missing.push("rowCount");
    if (p.requestCount === null && p.pull !== "page-rows") missing.push("requestCount");
    if (p.rowLimitPerRequest === null) missing.push("rowLimitPerRequest");
    if (p.maxRequests === null) missing.push("maxRequests");
    if (p.exhausted !== true && p.pull !== "page-rows") missing.push("exhausted");
    if (missing.length) overclaiming.push(`${p.pull} claims dataState COMPLETE without ${missing.join(", ")}`);
  }
  failures.push(...overclaiming);

  // EVIDENCE clause — every INGESTED dimension's evidence pull carries all four parts.
  const proven = new Map(census.pulls.map((p) => [p.pull, p]));
  const evidenceGaps = [];
  for (const d of census.dimensions) {
    if (d.state !== "INGESTED") continue;
    for (const e of d.evidence) {
      const p = proven.get(e);
      if (!p) { evidenceGaps.push(`dimension "${d.dimension}" cites pull ${e}, which is not in the store`); continue; }
      if (!p.proven) evidenceGaps.push(`dimension "${d.dimension}" cites pull ${e}, which does not prove its own completeness`);
    }
  }
  failures.push(...evidenceGaps);

  /* 🔴 REPORTED, NEVER COUNTED. A pull that claims nothing cannot break the FAILURE
   * clause — but dropping it from the report is how a reader comes to believe the
   * store holds only proven pulls. It is named here with what it says. */
  const claimsNothing = census.pulls
    .filter((p) => p.dataState !== "COMPLETE")
    .map((p) => ({ pull: p.pull, dataState: p.dataState, why: "claims no completeness, so it cannot overclaim one" }));

  return {
    satisfied: failures.length === 0,
    failures,
    claimsNothing,
    ingested: census.ingested,
    blocked: census.blocked,
    missing: census.missing,
    builtNotRun: census.builtNotRun,
    dimensions: census.dimensions,
    pulls: census.pulls,
  };
}

/** The four conditions, each answered separately so a reader can see which one fell. */
export function row9Conditions({ records, unlockInputs = UNSUPPLIABLE_MEASUREMENT, reSatOn = null }) {
  const verification = boundaryVerification(records);
  const unlocked = unlockState(unlockInputs);
  const markErrors = justifiedUnavailableErrors(JUSTIFIED_UNAVAILABLE);

  const boundaryAuthorises = PASS_DIMENSIONS.some((d) => d.dimension === UNAVAILABLE_DIMENSION && Array.isArray(d.blocked) && d.blocked.length > 0);

  /* 🔴 CONDITION 4, AND THE THIRD STATE THAT MUST FAIL. An unlock clause that has
   * become true does not by itself sink the row — it REQUIRES A RE-SIT. The row is
   * terminal again only once it was sat on or after the day the clause turned true.
   * Without a date, an unlocked row can never be terminal, which is the safe way round. */
  const reSatAfterUnlock = unlocked.length === 0 || (typeof reSatOn === "string" && reSatOn >= (unlockInputs.measuredOn ?? ""));

  return {
    c1_boundaryAuthorisesTheMark: { held: boundaryAuthorises, why: `row 9's NOTE classifies "${UNAVAILABLE_DIMENSION}" ⚠ and the census carries its blocked evidence` },
    c2_everyOtherRequirementSatisfied: { held: verification.satisfied, failures: verification.failures },
    c3_stillVisiblyUnavailable: { held: markErrors.length === 0, failures: markErrors },
    c4_noRequiredToolHasBecomeAvailable: { held: unlocked.length === 0, unlocked, measuredOn: unlockInputs.measuredOn ?? null, reSatOn, reSatAfterUnlock },
    verification,
  };
}

/**
 * 🔴 DOES ROW 9 STAND TERMINAL? One of four answers, never a boolean, so that a
 * caller cannot round "not yet" up to "yes".
 *
 *   TERMINAL_WITH_JUSTIFIED_UNAVAILABLE  all four conditions hold
 *   NOT_TERMINAL_BOUNDARY_UNPROVED       condition 2 fell — the real work is undone
 *   NOT_TERMINAL_MARK_INCOMPLETE         the ⚠ lost its dimension, unlock or date
 *   NOT_TERMINAL_UNLOCKED_AND_NOT_RE_SAT a tool became available; sit the row again
 */
export function row9Terminal(args) {
  const c = row9Conditions(args);
  if (!c.c3_stillVisiblyUnavailable.held) return "NOT_TERMINAL_MARK_INCOMPLETE";
  if (!c.c4_noRequiredToolHasBecomeAvailable.held && !c.c4_noRequiredToolHasBecomeAvailable.reSatAfterUnlock) return "NOT_TERMINAL_UNLOCKED_AND_NOT_RE_SAT";
  if (!c.c2_everyOtherRequirementSatisfied.held) return "NOT_TERMINAL_BOUNDARY_UNPROVED";
  if (!c.c1_boundaryAuthorisesTheMark.held) return "NOT_TERMINAL_MARK_INCOMPLETE";
  return "TERMINAL_WITH_JUSTIFIED_UNAVAILABLE";
}

/**
 * 🔴 THE ONE SENTENCE A REPORT MAY NOT WRITE. Row 9 has SIX ingested dimensions
 * of seven, for ever, and a report that counts seven is the failure condition 3
 * exists to prevent. Returns every violation found in a rendered count.
 */
export function overcountErrors({ dimensionsSatisfied, total = PASS_DIMENSIONS.length }) {
  const out = [];
  if (dimensionsSatisfied >= total) {
    out.push(`a report counts ${dimensionsSatisfied} of ${total} dimensions satisfied — "${UNAVAILABLE_DIMENSION}" is ⚠ and was never measured`);
  }
  return out;
}
