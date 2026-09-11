/**
 * 🔴 LAW-BOUND-1 — EVERY BOUNDED OPERATION PRINTS ITS OWN BOUND NEXT TO ITS RESULT.
 *
 * ── THE DEFECT THIS ENCODES, WHICH ALSO ALREADY HAPPENED ────────────────────
 *
 * PR #35 reported `requestCount=1` and `exhausted=true`. Both numbers were
 * correct. The report still could not verify itself, because "one request
 * drained 1,527 rows" is only true if the per-request limit was above 1,527 —
 * and the limit was not on the page. A reader had to go and read the source to
 * find out whether the result meant anything.
 *
 * That is the 11 September cap defect wearing a different costume. The first
 * one was a cap that did not announce itself; this is a bound that does not
 * announce itself. In both cases the output looks complete while the evidence
 * FOR completeness is missing.
 *
 * ── WHY THE FORMATTER REFUSES RATHER THAN OMITS ─────────────────────────────
 *
 * A formatter that quietly skipped a missing bound would let the law be broken
 * by forgetting a field, which is exactly how the first one was broken. So a
 * bounded report with no bound THROWS, and the throw names the law.
 *
 * 🔴 AND THE TEST READS THE EMITTED TEXT, NOT THE OBJECT. A test that checked
 * `result.maxUrlsPerRun !== undefined` would pass while the printed report —
 * the thing a human actually reads — still omitted it.
 */

/**
 * Render one bounded result as a single line.
 *
 * `bounds` is an object of bound-name -> value. It may not be empty: a "bounded
 * result" with no bounds is either mislabelled or has lost its limit.
 */
export function formatBoundedResult({ label, bounds, fields }) {
  if (typeof label !== "string" || label === "") throw new TypeError("formatBoundedResult: label is required");
  const boundEntries = Object.entries(bounds ?? {});
  if (boundEntries.length === 0) {
    throw new Error(
      `LAW-BOUND-1: "${label}" was reported as a bounded result with no bound. ` +
        "Every bounded operation must print its own bound next to its result.",
    );
  }
  for (const [name, value] of boundEntries) {
    if (value === undefined || value === null) {
      throw new Error(`LAW-BOUND-1: bound "${name}" on "${label}" is ${value} — a bound must be a value.`);
    }
  }
  const fieldText = Object.entries(fields ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join(" ");
  const boundText = boundEntries.map(([k, v]) => `${k}=${v}`).join(" ");
  return `${label}: ${fieldText}  [bound: ${boundText}]`;
}

/** The names every bounded report must carry, per producer. Used by the tests. */
export const REQUIRED_BOUNDS = Object.freeze({
  searchQueryResult: ["rowLimitPerRequest", "maxRequests"],
  crawlRun: ["maxUrlsPerRun", "maxRequestsPerHost", "maxResponseBytes"],
});
