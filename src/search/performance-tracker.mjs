/**
 * F81 · SEARCH PERFORMANCE AND RANK TRACKING, FOR ONE CLIENT (acceptance _handoffs ae4834b, RR-132 §3).
 *
 * "Track query, page, country, device, impressions, clicks, CTR, positions and supported rank measures." Over the client's OWN rows only
 * — each row that carries a landing page reached this client through F02's partition by the origin it stores (the reader does that);
 * a site-wide row with no page, from a property that covers several declared tenants, is counted UNATTRIBUTED and never becomes this
 * client's performance.
 *
 *   C2  each named dimension is TRACKED (its rows, and the pulls that carried it together with the page) or NOT MEASURED, naming the pull
 *       that would carry it; a site-wide row never stands in for a client dimension
 *   C3  per pull, never summed across pulls (two pulls of one window describe the same impressions differently): impressions and clicks
 *       summed over the client's rows; CTR = clicks / impressions of those same rows, printed with both; position only as Search Console
 *       recorded it per row, summarised as the impression-weighted mean of recorded positions and labelled so; a measure the pull did not
 *       record is NOT MEASURED — no other rank measure is invented
 *   C4  a trend only from at least two recorded points — distinct date windows of one pull, or distinct dates of a dated pull — each
 *       point with its window or date; fewer → NOT MEASURED, never an empty series, a flat line or 0
 *   C5  OWNED evidence of the property, never global demand; a pull not recorded COMPLETE contributes nothing and is named
 * Of several readings of ONE pull over ONE window, the most recently observed is used and the others are counted as superseded readings.
 * Pure: observations in, counts out. Names no product, host or query. Never fetches or writes.
 */
export const NOT_MEASURED = "NOT MEASURED";
export const OWNED = "OWNED — this property's own Search Console evidence, never global demand";
/* the specification's named Search Console dimensions (S1) and, for each, the pull that would carry it together with the page */
export const NAMED = Object.freeze({ query: "query-page", page: "page-rows", country: "country-page", device: "device-page" });

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** The measures of ONE pull over the client's rows. */
export function measuresOf(rows, { recordsPosition }) {
  let impressions = 0, clicks = 0, posWeight = 0, posSum = 0, posRows = 0;
  for (const r of rows) {
    impressions += num(r.impressions) ?? 0;
    clicks += num(r.clicks) ?? 0;
    const p = num(r.position);
    if (p !== null) { posRows += 1; posSum += p * (num(r.impressions) ?? 0); posWeight += num(r.impressions) ?? 0; }
  }
  return {
    rows: rows.length, impressions, clicks,
    ctr: impressions > 0 ? { clicks, impressions, value: clicks / impressions } : { clicks, impressions, value: NOT_MEASURED, why: "no impressions in the client's rows" },
    position: !recordsPosition ? { value: NOT_MEASURED, why: "this pull records no position" }
      : posWeight > 0 ? { value: posSum / posWeight, method: "impression-weighted mean of the positions Search Console recorded per row", rowsWithPosition: posRows }
        : { value: NOT_MEASURED, why: "no row with both a recorded position and an impression" },
  };
}

/**
 * @param {{ observations: { pull, dims, startDate, endDate, observedAt, complete, state, rowLimit, requests, recordsPosition,
 *           clientRows: object[]|null, siteWideRows: number, quarantined: number }[] }} input
 *   `clientRows` null means the pull carries no page — its rows are site-wide and counted in `siteWideRows`.
 */
export function trackPerformance({ observations = [] }) {
  /* the most recent reading of one pull over one window */
  const latest = new Map();
  let superseded = 0;
  for (const o of observations) {
    const k = `${o.pull}|${o.startDate}|${o.endDate}`;
    const prev = latest.get(k);
    if (!prev) latest.set(k, o);
    else { superseded += 1; if (String(o.observedAt) > String(prev.observedAt)) latest.set(k, o); }
  }
  const used = [...latest.values()];
  const notComplete = used.filter((o) => !o.complete).map((o) => ({ pull: o.pull, state: o.state ?? "UNKNOWN" }));
  const clientPulls = used.filter((o) => o.complete && Array.isArray(o.clientRows));
  const siteWide = used.filter((o) => o.complete).reduce((n, o) => n + (o.siteWideRows ?? 0), 0);
  const quarantined = used.filter((o) => o.complete).reduce((n, o) => n + (o.quarantined ?? 0), 0);

  const dimensions = Object.fromEntries(Object.entries(NAMED).map(([d, pull]) => {
    const carrying = clientPulls.filter((o) => o.dims.includes(d));
    const rows = carrying.reduce((n, o) => n + o.clientRows.length, 0);
    return [d, carrying.length > 0
      ? { state: "TRACKED", rows, pulls: [...new Set(carrying.map((o) => o.pull))] }
      : { state: NOT_MEASURED, missing: `a recorded ${pull} pull carrying ${d} together with the page` }];
  }));

  const perPull = clientPulls.map((o) => ({
    pull: o.pull, window: `${o.startDate}..${o.endDate}`, rowLimit: o.rowLimit, requests: o.requests, state: o.state,
    ...measuresOf(o.clientRows, { recordsPosition: o.recordsPosition }),
  }));

  /* C4 — points: distinct windows of one pull; or distinct dates of a dated pull's client rows */
  const byPull = new Map();
  for (const o of clientPulls) byPull.set(o.pull, [...(byPull.get(o.pull) ?? []), o]);
  const series = [];
  for (const [pull, os] of byPull) {
    if (os.length >= 2) series.push({ pull, by: "window", points: os.map((o) => ({ at: `${o.startDate}..${o.endDate}`, ...measuresOf(o.clientRows, { recordsPosition: o.recordsPosition }) })).sort((a, b) => a.at.localeCompare(b.at)) });
    for (const o of os.filter((x) => x.dims.includes("date"))) {
      const byDate = new Map();
      for (const r of o.clientRows) if (typeof r.date === "string" && r.date !== "") byDate.set(r.date, [...(byDate.get(r.date) ?? []), r]);
      if (byDate.size >= 2) series.push({ pull, by: "date", points: [...byDate].sort(([a], [b]) => a.localeCompare(b)).map(([at, rows]) => ({ at, ...measuresOf(rows, { recordsPosition: o.recordsPosition }) })) });
    }
  }
  const trend = series.length ? { state: "TRACKED", series } : { state: NOT_MEASURED, missing: "at least two recorded points — two distinct date windows of one pull, or a dated pull with two dates — for the client's rows" };

  return { label: OWNED, dimensions, perPull, trend, unattributedSiteWideRows: siteWide, quarantinedRows: quarantined, notComplete, supersededReadings: superseded };
}
