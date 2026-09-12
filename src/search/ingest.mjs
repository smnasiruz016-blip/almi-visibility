/**
 * THE SEARCH CONSOLE INGEST, AS A FUNCTION.
 *
 * ── 🔴 WHY THIS IS NOT IN bin/ ──────────────────────────────────────────────
 *
 * It used to be. The whole pipeline lived in the CLI, which meant the only way
 * to exercise it was to call the real API — so "re-running the ingest is
 * idempotent" was a claim nobody could test, and it turned out to be false.
 *
 * A pipeline that can only be run against production is a pipeline whose
 * behaviour is asserted rather than measured. This takes its provider and its
 * store as arguments, so the same code path runs against a fake provider in the
 * suite and against Google from `bin/`.
 */

import { estateTable, classify } from "./query-state.mjs";
import { propertyCovers } from "./google-search-console.mjs";
import { makeObservation } from "../evidence/records.mjs";
import { sha256Hex } from "../evidence/ids.mjs";

const COLLECTOR = "src/search/ingest.mjs";
const COLLECTOR_VERSION = "2";

export function windowFor(days, now = () => Date.now()) {
  const iso = (d) => new Date(now() - d * 86400000).toISOString().slice(0, 10);
  return { startDate: iso(days), endDate: iso(0) };
}

/**
 * Run one ingest.
 *
 * 🔴 Every write goes through `store.appendIfNew`, never `store.append`. A
 * second run over unchanged data appends re-sightings and NO new measurements.
 */
export async function runIngest({
  provider,
  store,
  propertyId,
  estateHostnames,
  days = 28,
  controlProperty = "https://example.com/",
  now = () => new Date(),
}) {
  const { startDate, endDate } = windowFor(days, () => now().getTime());
  const results = { appended: 0, resighted: 0, records: [] };

  const record = (target, method, value) => {
    const obs = makeObservation({
      observed_at: now().toISOString(),
      method,
      target,
      content_sha256: sha256Hex(JSON.stringify(value)),
      value,
      collector: COLLECTOR,
      collector_version: COLLECTOR_VERSION,
    });
    const outcome = store.appendIfNew(obs, { seenAt: now().toISOString() });
    if (outcome.appended) results.appended += 1;
    else results.resighted += 1;
    results.records.push({ method, ...outcome });
    return obs;
  };

  /* ---- properties ------------------------------------------------------ */
  const properties = await provider.listProperties();
  /**
   * 🔴 THE CLOCK IS STRIPPED OUT OF THE MEASURED VALUE.
   *
   * `PropertyRecord` carries its own `observedAt`, and storing that inside the
   * observation's `value` made the content hash change on every run — so
   * `gsc.sites.list` could NEVER deduplicate. Two identical property lists
   * looked like two different measurements.
   *
   * That is the A1 defect one layer down: a timestamp inside the thing being
   * measured. The observation already records WHEN we looked, once, in
   * `observed_at`. A second copy inside the payload adds nothing and breaks
   * every comparison.
   *
   * ⚠️ It was invisible to the first version of the A1 test because the fake
   * provider returned a CONSTANT timestamp — the fixture was more idempotent
   * than reality. Only the real API showed it.
   */
  const propertiesForStorage = properties.map(({ observedAt, ...rest }) => rest);
  record({ kind: "property", ref: "*" }, "gsc.sites.list", { properties: propertiesForStorage });

  const queried = properties.filter((p) => p.propertyId === propertyId);
  if (queried.length === 0) {
    throw new Error(`${propertyId} is not among the properties this account can see`);
  }

  /* ---- aggregate ------------------------------------------------------- */
  const agg = await provider.queryRows({ propertyId, startDate, endDate, dimensions: [] });
  record({ kind: "property", ref: propertyId }, "gsc.searchAnalytics.query:aggregate", {
    startDate, endDate, dimensions: [],
    rowCount: agg.rowCount, requestCount: agg.requestCount, exhausted: agg.exhausted,
    dataState: agg.dataState, truncationReason: agg.truncationReason,
    rowLimitPerRequest: agg.rowLimitPerRequest, maxRequests: agg.maxRequests,
    cost: agg.cost, totals: agg.rows[0] ?? null,
  });

  /* ---- by page --------------------------------------------------------- */
  const pages = await provider.queryRows({
    propertyId, startDate, endDate, dimensions: ["page"], rowLimitPerRequest: 25000, maxRequests: 20,
  });

  const observed = new Map();
  let unparsed = 0;
  for (const row of pages.rows) {
    let host;
    try {
      host = new URL(row.keys?.[0] ?? "").hostname.toLowerCase();
    } catch {
      unparsed += 1;
      continue;
    }
    const h = observed.get(host) ?? { urls: 0, clicks: 0, impressions: 0 };
    if ((row.impressions || 0) > 0) h.urls += 1;
    h.clicks += row.clicks || 0;
    h.impressions += row.impressions || 0;
    observed.set(host, h);
  }

  /* ---- control --------------------------------------------------------- */
  const control = await provider.queryRows({ propertyId: controlProperty, startDate, endDate, dimensions: [] });
  const controlState = classify({ attempted: true, httpStatus: control.httpStatus });
  record({ kind: "property", ref: controlProperty }, "gsc.searchAnalytics.query:control", {
    httpStatus: control.httpStatus, state: controlState.state, authState: controlState.authState,
    rowCount: controlState.rowCount, rawDrainedRowCount: control.rowCount,
    requestCount: control.requestCount, exhausted: control.exhausted,
    truncationReason: control.truncationReason, dataState: control.dataState,
    cost: control.cost, expected: 403,
  });

  /* ---- estate table ---------------------------------------------------- */
  const table = estateTable({
    estateHostnames: [...estateHostnames],
    observed,
    coveredBy: (h) => queried.some((p) => propertyCovers(p.propertyId, h)),
  });
  record({ kind: "property", ref: propertyId }, "gsc.searchAnalytics.query:by-page", {
    startDate, endDate, dimensions: ["page"],
    rowCount: pages.rowCount, requestCount: pages.requestCount, exhausted: pages.exhausted,
    dataState: pages.dataState, truncationReason: pages.truncationReason,
    rowLimitPerRequest: pages.rowLimitPerRequest, maxRequests: pages.maxRequests,
    cost: pages.cost, hostnameCounts: table.counts, unlistedHostnames: table.unlisted,
    unparsedRows: unparsed, estateTable: table.rows,
  });

  return { ...results, properties, agg, pages, control, controlState, table, startDate, endDate };
}
