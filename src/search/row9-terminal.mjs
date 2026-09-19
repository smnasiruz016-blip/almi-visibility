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
 * Row 9 already carried its unlock condition as prose, and prose cannot go RED.
 * Every clause below is a function over inputs a later turn MEASURES, so that a
 * turn which DOES re-measure gets an answer instead of a paragraph.
 *
 * 🔴 THAT IS ALL IT IS. AN EARLIER VERSION OF THIS COMMENT CLAIMED MORE, AND THE
 * CLAIM IS WITHDRAWN HERE RATHER THAN QUIETLY DELETED. It said that if an
 * analytics package appeared in a product repository next month the guard would
 * notice. IT WOULD NOT. See `UNSUPPLIABLE_MEASUREMENT` below: the inputs are a
 * frozen dated snapshot, nothing in this repository refreshes them, and no
 * measurement producer exists. The predicates fire only on inputs a human or a
 * future producer hands them.
 *
 * ── 🔴 AND WHY A RE-SIT DATE IS NOT EVIDENCE (CORRECTED AFTER PR #120) ──────
 *
 * The first version of `row9Terminal` restored terminal status when `reSatOn`
 * was on or after the unlock measurement's date. That was wrong, and it was
 * wrong in the direction that ticks a row: a DATE is not evidence that the newly
 * available dimension was ingested, nor that it became unavailable again. A row
 * could carry `downstream outcomes` as ⚠ — asserting no tool can supply it —
 * while a tool demonstrably could, and still read TERMINAL.
 *
 * `reSatOn` is therefore GONE, not repaired. Terminal status returns by exactly
 * two routes, and both are evidence:
 *   A. a NEWLY DATED measurement in which every predicate is FALSE again; or
 *   B. `downstream outcomes` genuinely INGESTED through the lawful seven-
 *      dimension path, with the ⚠ removed — which is not a justified-unavailable
 *      outcome at all, and must never be reported as one.
 *
 * ANTI-CIRCLE: nothing in this module is row 9's evidence. Row 9's evidence is
 * the six ingested dimensions in the store. This module is row 9's GUARD.
 */

import { PASS_DIMENSIONS, dimensionCensus, item9Verdict } from "./dimensions.mjs";

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
 * 🔴 THERE IS NO MEASUREMENT PRODUCER, AND THAT IS RECORDED RATHER THAN IMPLIED.
 *
 * `UNSUPPLIABLE_MEASUREMENT` below is a DATED SNAPSHOT, not a live detector.
 * Nothing in this repository re-reads the estate on its own: if a product
 * repository gains an analytics package tomorrow, those numbers DO NOT CHANGE,
 * `unlockState` keeps returning `[]`, and row 9 keeps reading terminal — because
 * it is reading a frozen object, not the estate.
 *
 * Until a producer exists, the unlock clauses are only as fresh as the last turn
 * that hand-measured them. `justifiedUnavailableErrors` refuses a ⚠ with no date
 * for exactly this reason: the date is the reader's only warning of staleness.
 *
 * 🔴 NOTHING IN THIS REPOSITORY MAY PROMISE THAT SUCH A CHANGE IS NOTICED ON ITS
 * OWN. `test/row9-terminal.test.mjs` hunts the source for that promise and fails
 * on it — which is why this paragraph states the prohibition without spelling out
 * the claim it bans. A rule written in the words it forbids matches itself.
 */
export const MEASUREMENT_PRODUCER = null;

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
export function boundaryVerification(records, table = PASS_DIMENSIONS) {
  const census = dimensionCensus(records, table);
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

/**
 * The four conditions, each answered separately so a reader can see which one fell.
 *
 * `mark` is the ⚠ record the ROW claims — `rows[9].justifiedUnavailable` — or `undefined` when the
 * row claims none. It has no default: the previous defect in this file was a default argument that
 * answered for a record the caller never supplied.
 */
export function row9Conditions({ records, unlockInputs = UNSUPPLIABLE_MEASUREMENT, mark, table = PASS_DIMENSIONS }) {
  const verification = boundaryVerification(records, table);
  const unlocked = unlockState(unlockInputs);
  const claimsMark = mark !== undefined && mark !== null;
  const markErrors = claimsMark ? justifiedUnavailableErrors(mark) : ["the row claims no ⚠ record"];

  const boundaryAuthorises = table.some((d) => d.dimension === UNAVAILABLE_DIMENSION && Array.isArray(d.blocked) && d.blocked.length > 0);
  const outcomes = verification.dimensions.find((d) => d.dimension === UNAVAILABLE_DIMENSION);

  return {
    c1_boundaryAuthorisesTheMark: { held: boundaryAuthorises, why: `row 9's NOTE classifies "${UNAVAILABLE_DIMENSION}" ⚠ and the census carries its blocked evidence` },
    c2_everyOtherRequirementSatisfied: { held: verification.satisfied, failures: verification.failures },
    c3_stillVisiblyUnavailable: { held: claimsMark && markErrors.length === 0, claimsMark, failures: markErrors },
    /* 🔴 CONDITION 4, CORRECTED. There is no `reSatAfterUnlock` any more. A predicate that is TRUE
     * ends terminal status outright, and only a NEWLY DATED measurement in which every predicate is
     * FALSE again restores it — which shows up here as `unlocked` being empty under a later
     * `measuredOn`. A re-sit DATE proves nothing and is no longer accepted as anything. */
    c4_noRequiredToolHasBecomeAvailable: { held: unlocked.length === 0, unlocked, measuredOn: unlockInputs.measuredOn ?? null },
    outcomesState: outcomes?.state ?? "MISSING",
    verification,
  };
}

/**
 * 🔴 DOES ROW 9 STAND TERMINAL? One of six answers, never a boolean, so that a caller cannot round
 * "not yet" up to "yes".
 *
 *   TERMINAL_WITH_JUSTIFIED_UNAVAILABLE   six ingested, the ⚠ lawful, every predicate FALSE
 *   TERMINAL_ALL_SEVEN_INGESTED           route B: outcomes really arrived; no ⚠ is involved
 *   NOT_TERMINAL_BOUNDARY_UNPROVED        condition 2 fell — the real work is undone
 *   NOT_TERMINAL_MARK_INCOMPLETE          the ⚠ is absent, or lost its dimension, unlock or date
 *   NOT_TERMINAL_UNLOCKED                 a tool IS available while the dimension is still ⚠
 *   NOT_TERMINAL_MARK_CLAIMED_ON_AN_INGESTED_DIMENSION
 *                                         the ⚠ says "no tool can supply this" about a dimension
 *                                         the store proves was supplied. That is a false statement,
 *                                         not a justification.
 */
export function row9Terminal(args) {
  const c = row9Conditions(args);

  /* 🔴 ROUTE B, FIRST — because it decides whether a ⚠ is even admissible. Once the store proves
   * `downstream outcomes` INGESTED, the dimension is measured: the justified-unavailable path does
   * not apply, and this function must never return it. The row is evaluated as the ordinary seven. */
  if (c.outcomesState === "INGESTED") {
    if (c.c3_stillVisiblyUnavailable.claimsMark) return "NOT_TERMINAL_MARK_CLAIMED_ON_AN_INGESTED_DIMENSION";
    if (!c.c2_everyOtherRequirementSatisfied.held) return "NOT_TERMINAL_BOUNDARY_UNPROVED";
    return item9Verdict(c.verification) === "ALL_SEVEN_INGESTED" ? "TERMINAL_ALL_SEVEN_INGESTED" : "NOT_TERMINAL_BOUNDARY_UNPROVED";
  }

  // From here the dimension is still ⚠, so the row needs a lawful ⚠ to stand terminal at all.
  if (!c.c3_stillVisiblyUnavailable.held) return "NOT_TERMINAL_MARK_INCOMPLETE";

  /* 🔴 ROUTE A, AND THE CORRECTION. No date rescues this. While ANY predicate is TRUE the row
   * carries a ⚠ asserting that no available tool can supply the dimension, and that assertion is
   * contradicted by the measurement in hand. It stays non-terminal until a newly dated measurement
   * makes every predicate FALSE again, or until the dimension is genuinely ingested above. */
  if (!c.c4_noRequiredToolHasBecomeAvailable.held) return "NOT_TERMINAL_UNLOCKED";

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
