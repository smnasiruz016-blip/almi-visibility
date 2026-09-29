/**
 * F82 · REAL INDEXATION LEARNING — each page's index state from OBSERVED owned search evidence (acceptance _handoffs 25c7f49, RR-92).
 *
 * Spec row: "Observe discovery, crawl, indexation and search evidence; never equate indexable with indexed." V3 §17.1: "Discovered and
 * crawled status must be known." Owner direction RR-89: a client's own Search Console data and public research are DISTINCT SOURCES.
 *
 *   OBSERVED_INDEXED      at least one recorded impression in an owned Search Console window — it surfaced, so it was discovered,
 *                         crawled and indexed WITHIN THAT WINDOW (dated; never carried beyond it; no future indexing is promised)
 *   OBSERVED_NOT_INDEXED  only a recorded owned inspection or coverage observation saying so
 *   UNKNOWN               otherwise — absence from the rows, or zero impressions, is never "not indexed"; the missing fact is named
 *
 * INDEXABLE ≠ INDEXED: F21's indexability travels BESIDE the index state and never becomes it. Every observation is OWNED_SEARCH_CONSOLE
 * evidence of the client's own pages — never public research, never demand, never an independent category. Pure; names no product.
 */
export const INDEX_STATE = Object.freeze({ OBSERVED_INDEXED: "OBSERVED_INDEXED", OBSERVED_NOT_INDEXED: "OBSERVED_NOT_INDEXED", UNKNOWN: "UNKNOWN" });
export const NOTICE = "INDEXABLE ≠ INDEXED";
export const SOURCE_CLASS = "OWNED_SEARCH_CONSOLE";
export const MISSING = Object.freeze({
  OBSERVATION: "a recorded owned observation of this page in search — an impression in a Search Console window, or an inspection/coverage record: it would decide OBSERVED_INDEXED or OBSERVED_NOT_INDEXED",
});

const iso = (d) => typeof d === "string" && !Number.isNaN(Date.parse(d));

/**
 * One page.
 * @param {object} p
 *   observation   { windowStart, windowEnd, impressions, ref } — the page's recorded owned window, or null
 *   inspection    { state: "NOT_INDEXED" | "INDEXED", on, ref } — a recorded owned inspection/coverage record, or null
 *   indexability  F21's state for the page (reported beside, never as, the index state)
 *   queries       the count of distinct queries observed for the page in the owned query-page rows, or null
 */
export function indexState({ pageId, observation = null, inspection = null, indexability = "NOT_MEASURED", queries = null }) {
  const seen = observation && Number(observation.impressions) >= 1 && iso(observation.windowStart) && iso(observation.windowEnd) ? observation : null;
  const notIndexed = inspection && inspection.state === "NOT_INDEXED" && iso(inspection.on) && typeof inspection.ref === "string" && inspection.ref !== "" ? inspection : null;
  /* the most recent dated observation decides; a not-indexed record after the window supersedes it, one before it does not */
  let state = INDEX_STATE.UNKNOWN;
  let dated = null;
  if (notIndexed && (!seen || Date.parse(notIndexed.on) > Date.parse(seen.windowEnd))) { state = INDEX_STATE.OBSERVED_NOT_INDEXED; dated = { on: notIndexed.on, ref: notIndexed.ref }; }
  else if (seen) { state = INDEX_STATE.OBSERVED_INDEXED; dated = { windowStart: seen.windowStart, windowEnd: seen.windowEnd, impressions: seen.impressions, ref: seen.ref }; }
  return Object.freeze({
    pageId,
    state,
    observed: dated ? Object.freeze(dated) : null,
    indexability,
    notice: NOTICE,
    sourceClass: SOURCE_CLASS,
    queriesObserved: state === INDEX_STATE.OBSERVED_INDEXED ? queries : null,
    missing: Object.freeze(state === INDEX_STATE.UNKNOWN ? [MISSING.OBSERVATION] : []),
  });
}

/** The fact F43 lacks: a recorded indexing check per page — CLEAR for an observed-indexed page (for its window), BLOCKED for a recorded
 *  not-indexed page, nothing for UNKNOWN. */
export function indexingChecks(states) {
  return states.flatMap((s) => s.state === INDEX_STATE.OBSERVED_INDEXED ? [Object.freeze({ pageId: s.pageId, state: "CLEAR", ref: `F82:${s.observed.ref}:${s.observed.windowStart}..${s.observed.windowEnd}` })]
    : s.state === INDEX_STATE.OBSERVED_NOT_INDEXED ? [Object.freeze({ pageId: s.pageId, state: "BLOCKED", ref: `F82:${s.observed.ref}:${s.observed.on}` })]
    : []);
}

export function summariseIndexation(states) {
  const by = (f) => states.reduce((m, s) => ((m[f(s)] = (m[f(s)] ?? 0) + 1), m), {});
  return Object.freeze({ population: states.length, state: by((s) => s.state), indexability: by((s) => s.indexability), queriesObserved: by((s) => (s.queriesObserved === null ? "NOT_OBSERVED" : "OBSERVED")), notice: NOTICE, sourceClass: SOURCE_CLASS });
}
