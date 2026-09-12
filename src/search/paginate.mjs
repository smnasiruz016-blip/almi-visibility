/**
 * 🔴 THE PAGINATION LAW.
 *
 * ── THE DEFECT THIS ENCODES, WHICH ALREADY HAPPENED ─────────────────────────
 *
 * 11 September 2026. A Search Analytics query for `dimensions:["page"]` was run
 * with `rowLimit: 500`. It returned EXACTLY 500 rows and HTTP 200, and the
 * hostname table built from it named FOUR hostnames.
 *
 * Paginated, the same query over the same window returned 1,527 rows and
 * NINETEEN hostnames. The missing fifteen included the product with 240,328
 * pages.
 *
 * Nothing errored. Nothing warned. The API answered 200 and the answer was
 * confidently, quietly wrong — and a hostname that had been TRUNCATED AWAY was
 * indistinguishable from one with genuinely no impressions.
 *
 * ── THE RULE ────────────────────────────────────────────────────────────────
 *
 *   A CAP THAT DOES NOT ANNOUNCE ITSELF PRODUCES A CONFIDENT WRONG ANSWER.
 *
 * So `exhausted` is TRUE only when a SHORT PAGE WAS ACTUALLY OBSERVED — a
 * request that came back with fewer rows than it asked for. That is the only
 * evidence that the far end had nothing more to give.
 *
 * 🔴 IT IS NEVER INFERRED. Not from `rows.length < expectedTotal`, not from a
 * page returning zero rows on the first request, not from the caller's belief
 * about how much data exists. An inference here is precisely how the 500-row
 * answer looked complete.
 *
 * ── WHY `dataState` IS SEPARATE FROM `exhausted` ────────────────────────────
 *
 * `exhausted` is about the LOOP. `dataState` is about the ANSWER. They are
 * different claims and a single flag would let the weaker one answer for the
 * stronger: a caller checking only `exhausted === false` would still print the
 * rows it did get as though they were the total. `dataState: 'UNKNOWN'` is the
 * field that stops a truncated result being quoted as a census (DoD §170).
 */

import { DATA_STATES, TRUNCATION_REASONS } from "./provider.mjs";

/**
 * Drain a paginated row source.
 *
 * `fetchPage({ startRow, rowLimit })` must resolve to `{ rows }` — an array —
 * or throw. It is the ONLY thing that talks to a network; this function is pure
 * control flow, which is why it can be tested against a mock that lies.
 *
 * Returns `{ rows, rowCount, requestCount, exhausted, truncationReason,
 * dataState }`.
 */
export async function drainPages(fetchPage, { rowLimitPerRequest, maxRequests }) {
  if (!Number.isInteger(rowLimitPerRequest) || rowLimitPerRequest < 1) {
    throw new TypeError("rowLimitPerRequest must be a positive integer");
  }
  if (!Number.isInteger(maxRequests) || maxRequests < 1) {
    throw new TypeError("maxRequests must be a positive integer");
  }

  const rows = [];
  let requestCount = 0;
  let sawShortPage = false;
  let truncationReason = null;

  while (requestCount < maxRequests) {
    let page;
    try {
      page = await fetchPage({ startRow: rows.length, rowLimit: rowLimitPerRequest });
    } catch (err) {
      // 🔴 A COST GOVERNOR'S HARD STOP IS NOT AN API ERROR. Recording it as
      // API_ERROR would turn "the run was stopped" into one quiet UNKNOWN pull,
      // and the next pull would try again. It propagates and ends the run.
      if (err?.hardStop === true) throw err;
      // 🔴 The rows already collected are KEPT and the result is marked. Throwing
      // away a partial read would turn a truncation into an absence, which is the
      // same collapse this module exists to prevent.
      truncationReason = "API_ERROR";
      requestCount += 1;
      return seal({ rows, requestCount, exhausted: false, truncationReason, error: err });
    }
    requestCount += 1;

    const batch = Array.isArray(page?.rows) ? page.rows : [];
    rows.push(...batch);

    // 🔴 THE ONLY PLACE `exhausted` CAN BECOME TRUE: a page came back SHORT.
    if (batch.length < rowLimitPerRequest) {
      sawShortPage = true;
      break;
    }
  }

  if (sawShortPage) {
    return seal({ rows, requestCount, exhausted: true, truncationReason: null });
  }

  // Fell out of the loop on maxRequests with every page full. We do NOT know
  // whether more rows exist, and saying COMPLETE here is the 11 September bug.
  return seal({ rows, requestCount, exhausted: false, truncationReason: "MAX_REQUESTS" });
}

function seal({ rows, requestCount, exhausted, truncationReason, error }) {
  if (!TRUNCATION_REASONS.includes(truncationReason)) {
    throw new TypeError(`unknown truncationReason ${truncationReason}`);
  }
  // 🔴 dataState is DERIVED FROM `exhausted` AND NOWHERE ELSE, in one place, so
  // that no caller can construct a COMPLETE result without a short page.
  const dataState = exhausted ? "COMPLETE" : "UNKNOWN";
  if (!DATA_STATES.includes(dataState)) throw new TypeError(`unknown dataState ${dataState}`);
  const result = {
    rows,
    rowCount: rows.length,
    requestCount,
    exhausted,
    truncationReason,
    dataState,
  };
  if (error) result.error = String(error?.message ?? error);
  return result;
}
