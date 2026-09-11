/**
 * 🔴 ZERO IS NOT ABSENT.
 *
 * Four outcomes, and the whole point of this module is that they never collapse
 * into one another:
 *
 *   200 + rows>0   -> GRANTED,      rowCount = n     reachable, has data
 *   200 + rows=0   -> GRANTED,      rowCount = 0     reachable, genuinely no data
 *   403            -> FORBIDDEN,    rowCount = null  we learned NOTHING about it
 *   not attempted  -> NOT_QUERIED,  rowCount = null  we did not look
 *
 * ── WHY THIS IS A MODULE AND NOT AN `if` ────────────────────────────────────
 *
 * On 11 September 2026 a hostname table printed four hostnames. Fifteen more
 * existed. In that table an OMITTED hostname and a ZERO hostname rendered
 * identically — as nothing at all — so the reader could not tell "this product
 * has no search impressions" from "this product was never in the query".
 *
 * Those are different facts with different owners. The first is a finding about
 * the product. The second is a defect in the measurement.
 *
 * 🔴 AND `rowCount` IS `null`, NOT `0`, FOR THE TWO STATES WE DID NOT MEASURE.
 * A zero there would be a number nobody counted, and numbers nobody counted get
 * summed into totals and quoted.
 */

export const QUERY_STATES = Object.freeze(["ROWS", "ZERO", "FORBIDDEN", "NOT_QUERIED"]);

/**
 * Classify one target from what the API actually did.
 *
 * `attempted: false` wins over everything: if we never asked, no HTTP status
 * can be reported, and a caller passing a status with `attempted: false` has a
 * bug we would rather throw on than paper over.
 */
export function classify({ attempted, httpStatus, rowCount }) {
  if (attempted === false) {
    if (httpStatus !== undefined && httpStatus !== null) {
      throw new TypeError("classify: an unattempted target cannot carry an HTTP status");
    }
    return Object.freeze({ state: "NOT_QUERIED", authState: "UNKNOWN", rowCount: null });
  }

  if (httpStatus === 403) {
    // 🔴 The absence of rows here says NOTHING about the site. It says something
    // about our grant. Reporting 0 would be a claim we have no evidence for.
    return Object.freeze({ state: "FORBIDDEN", authState: "FORBIDDEN", rowCount: null });
  }

  if (httpStatus !== 200) {
    throw new TypeError(
      `classify: HTTP ${httpStatus} is not a state this module can express — ` +
        "add it deliberately rather than letting it fall into ZERO",
    );
  }

  if (!Number.isInteger(rowCount) || rowCount < 0) {
    throw new TypeError("classify: a 200 must carry an integer rowCount");
  }

  return Object.freeze({
    state: rowCount > 0 ? "ROWS" : "ZERO",
    authState: "GRANTED",
    rowCount,
  });
}

/**
 * Build the estate table: every known hostname in exactly one state.
 *
 * `estateHostnames` is the census of hostnames believed to exist. `observed` is
 * a Map of hostname -> aggregate for those that appeared in the returned rows.
 * `coveredBy(hostname)` answers whether some QUERIED property covers it.
 *
 * 🔴 THE SET DIFFERENCE IS THE POINT. A hostname that is covered by a queried
 * property and did NOT appear in the rows is a measured zero. A hostname no
 * queried property covers is NOT_QUERIED. Without the estate census both look
 * like an empty line, which is how fifteen hostnames went missing.
 */
export function estateTable({ estateHostnames, observed, coveredBy, forbidden = new Set() }) {
  if (!Array.isArray(estateHostnames) || estateHostnames.length === 0) {
    throw new TypeError("estateTable: the estate census is empty — the table would be vacuous");
  }
  const rows = [];
  for (const hostname of estateHostnames) {
    if (forbidden.has(hostname)) {
      rows.push({ hostname, ...classify({ attempted: true, httpStatus: 403 }) });
      continue;
    }
    if (!coveredBy(hostname)) {
      rows.push({ hostname, ...classify({ attempted: false }) });
      continue;
    }
    const agg = observed.get(hostname);
    const rowCount = agg ? agg.urls : 0;
    rows.push({
      hostname,
      ...classify({ attempted: true, httpStatus: 200, rowCount }),
      clicks: agg ? agg.clicks : 0,
      impressions: agg ? agg.impressions : 0,
    });
  }

  // 🔴 A hostname the rows contained but the estate census did not list is a
  // GAP IN THE CENSUS, not a row to quietly append. Surfacing it keeps the
  // census honest: it is how we would learn of a hostname nobody told us about.
  const unlisted = [...observed.keys()].filter((h) => !estateHostnames.includes(h));

  const counts = Object.fromEntries(QUERY_STATES.map((s) => [s, rows.filter((r) => r.state === s).length]));
  return { rows, counts, unlisted };
}
