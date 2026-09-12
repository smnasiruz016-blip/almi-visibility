/**
 * Build the three exports from the evidence store.
 *
 * 🔴 STABLE IDS TRAVEL WITH EVERY ROW. `observation_id`, `measurement_key`,
 * `page_id` — so a later conversation can name a row without re-sending the
 * data it came from. An export whose rows cannot be referenced forces the whole
 * payload to be pasted back in every time, which is the cost this is meant to
 * remove.
 */

import { toMarkdown, toJson, toCsv, provenanceBlock } from "./exporters.mjs";

const latest = (records, method) =>
  records.filter((r) => r.record_type === "observation" && r.method === method).at(-1) ?? null;

/**
 * Read the store and assemble everything the three formats need.
 *
 * Nothing here computes a new fact. It reshapes what was already measured, and
 * carries each input's state forward untouched.
 */
export function collect(records, { generatedAt }) {
  const byPage = latest(records, "gsc.searchAnalytics.query:by-page");
  const agg = latest(records, "gsc.searchAnalytics.query:aggregate");
  const control = latest(records, "gsc.searchAnalytics.query:control");
  const crawlRuns = records.filter((r) => r.record_type === "crawl_run");
  const resightings = records.filter((r) => r.record_type === "resighting");

  const estate = (byPage?.value?.estateTable ?? []).map((row) => ({
    hostname: row.hostname,
    state: row.state,
    authState: row.authState,
    // 🔴 Carried through as-is. A `?? 0` here is the whole defect.
    rowCount: row.rowCount,
    clicks: row.clicks ?? null,
    impressions: row.impressions ?? null,
  }));

  const bounds = {
    "searchAnalytics.rowLimitPerRequest": byPage?.value?.rowLimitPerRequest ?? "UNKNOWN",
    "searchAnalytics.maxRequests": byPage?.value?.maxRequests ?? "UNKNOWN",
    "window.startDate": byPage?.value?.startDate ?? "UNKNOWN",
    "window.endDate": byPage?.value?.endDate ?? "UNKNOWN",
    "estate.hostnamesInCensus": estate.length,
  };
  for (const run of crawlRuns) {
    bounds["crawl.maxUrlsPerRun"] = run.maxUrlsPerRun;
    bounds["crawl.maxRequestsPerHost"] = run.maxRequestsPerHost;
    bounds["crawl.maxResponseBytes"] = run.maxResponseBytes;
  }

  const states = {
    "searchAnalytics:by-page": byPage?.value?.dataState ?? "UNKNOWN",
    "searchAnalytics:aggregate": agg?.value?.dataState ?? "UNKNOWN",
    "control (403 expected)": control?.value?.state ?? "UNKNOWN",
    "crawl inventory": crawlRuns.at(-1)?.coverageState ?? "NOT_QUERIED",
  };

  const provenance = provenanceBlock({
    title: "AlmiVisibility — evidence export",
    generatedAt,
    covers: [
      "Search Console measurements already in the evidence store",
      "the estate hostname table, with every hostname in exactly one state",
      crawlRuns.length ? "crawl runs recorded in the store" : "no crawl run is present in this store",
    ],
    doesNotCover: [
      "🔴 anything not in the evidence store — this is an export, not a measurement",
      "🔴 query text: it is deliberately never stored, so it cannot be exported",
      "🔴 issues: no detector exists (C5), so there are no issues to export",
      "🔴 any page not fetched: a crawled inventory is not the site, and a fetched URL is not an indexed URL",
    ],
    states,
    bounds,
  });

  return { provenance, byPage, agg, control, crawlRuns, resightings, estate, records };
}

export function buildMarkdown(c) {
  return toMarkdown({
    provenance: c.provenance,
    sections: [
      {
        title: "Estate hostnames",
        note:
          "🔴 `—` means **null**, not zero. A FORBIDDEN or NOT_QUERIED row has no count because " +
          "nothing was measured for it.",
        columns: ["hostname", "state", "rowCount", "clicks", "impressions"],
        rows: c.estate,
      },
      {
        title: "Measurements in the store",
        columns: ["observation_id", "measurement_key", "method", "observed_at"],
        rows: c.records
          .filter((r) => r.record_type === "observation")
          .map((r) => ({
            observation_id: r.observation_id,
            measurement_key: r.measurement_key ?? null,
            method: r.method,
            observed_at: r.observed_at,
          })),
      },
      {
        title: "Re-sightings",
        note: "A re-sighting is not a measurement. It records that we looked again and nothing had changed.",
        columns: ["observation_id", "seen_at"],
        rows: c.resightings.map((r) => ({ observation_id: r.observation_id, seen_at: r.seen_at })),
      },
    ],
  });
}

export function buildJson(c) {
  return toJson({
    provenance: c.provenance,
    data: {
      estate: c.estate,
      observations: c.records
        .filter((r) => r.record_type === "observation")
        .map((r) => ({
          observation_id: r.observation_id,
          measurement_key: r.measurement_key ?? null,
          method: r.method,
          observed_at: r.observed_at,
          target: r.target,
          content_sha256: r.content_sha256,
          collector: r.collector,
          collector_version: r.collector_version,
        })),
      resightings: c.resightings,
      crawlRuns: c.crawlRuns,
      // 🔴 Present and empty, with a reason. An absent key reads as "not
      // supported"; an empty one with a note reads as "none exist yet".
      issues: [],
      issuesNote: "no detector exists in v0.1 (C5), so no issue has ever been raised",
      sources: [],
      sourcesNote: "no Source record has been written yet",
    },
  });
}

export function buildCsv(c) {
  return toCsv({
    provenance: c.provenance,
    columns: ["hostname", "state", "rowCount", "clicks", "impressions"],
    rows: c.estate,
  });
}
