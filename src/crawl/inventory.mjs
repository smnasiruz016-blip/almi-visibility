/**
 * THE INVENTORY — PageRecord, the edge graph, and the run summary.
 *
 * ── 🔴 A CRAWLED INVENTORY IS NOT THE SITE ──────────────────────────────────
 *
 * This is an invariant, not a caveat, and it sits alongside the SEV-0 list:
 *
 *     A FETCHED URL IS NOT AN INDEXED URL.
 *     A CRAWLED INVENTORY IS NOT THE SITE.
 *
 * We fetched what we were given as seeds, up to a cap, obeying robots. Google
 * indexes on its own terms and its set is different. Every consumer of this
 * inventory that forgets that will report "N pages" as though it were the site,
 * and the first person to act on that number will act on a subset.
 *
 * `coverageState` exists so that the data itself says which it is, and
 * `MAX_URLS_PER_RUN` is printed beside it so a reader can see the bound that
 * produced it (LAW-BOUND-1).
 */

import { targetPageId, canonicalUrl } from "../evidence/ids.mjs";

export const COVERAGE_STATES = Object.freeze(["COMPLETE", "PARTIAL", "UNKNOWN"]);

/**
 * Build the page inventory and the edge graph from a run's observations.
 *
 * `observations` are PageObservation objects. Edges come from links recorded
 * during the run — recorded, never followed.
 */
export function buildInventory({ observations, edges }) {
  const pages = new Map();

  const upsert = (rawUrl, observedAt) => {
    let canonical;
    try {
      canonical = canonicalUrl(rawUrl);
    } catch {
      return null;
    }
    const page_id = targetPageId(canonical);
    let rec = pages.get(page_id);
    if (!rec) {
      rec = {
        page_id,
        canonical_url: canonical,
        first_seen: observedAt,
        last_seen: observedAt,
        observations: [],
        outbound_edges: [],
        inbound_edges: [],
      };
      pages.set(page_id, rec);
    }
    if (observedAt < rec.first_seen) rec.first_seen = observedAt;
    if (observedAt > rec.last_seen) rec.last_seen = observedAt;
    return rec;
  };

  for (const obs of observations) {
    const rec = upsert(obs.final_url ?? obs.requested_url, obs.observed_at);
    if (rec) rec.observations.push(obs.observation_id);
  }

  /**
   * 🔴 EDGES ARE ONLY RECORDED BETWEEN PAGES WE ACTUALLY FETCHED.
   *
   * A link to a page we never fetched is a link to something outside the
   * inventory. Creating a PageRecord for it would invent a page nobody
   * measured — it would appear in the inventory with zero observations and be
   * indistinguishable from a page that was fetched and returned nothing.
   */
  const known = new Set([...pages.values()].map((p) => p.canonical_url));
  let edgesOutsideInventory = 0;

  for (const { from, to } of edges) {
    let fromC, toC;
    try {
      fromC = canonicalUrl(from);
      toC = canonicalUrl(to);
    } catch {
      continue;
    }
    if (!known.has(fromC)) continue;
    if (!known.has(toC)) {
      edgesOutsideInventory += 1;
      continue;
    }
    const fromRec = pages.get(targetPageId(fromC));
    const toRec = pages.get(targetPageId(toC));
    if (!fromRec.outbound_edges.includes(toRec.page_id)) fromRec.outbound_edges.push(toRec.page_id);
    if (!toRec.inbound_edges.includes(fromRec.page_id)) toRec.inbound_edges.push(fromRec.page_id);
  }

  return { pages: [...pages.values()], edgesOutsideInventory };
}

/**
 * Pages in the inventory that nothing in the inventory links to.
 *
 * ⚠️ AND WHAT THIS CANNOT SAY. A page with no inbound edge INSIDE THE CRAWLED
 * SET may be linked from a page we never fetched. With a capped, seed-driven
 * crawl that is not a remote possibility — it is the normal case. So this is
 * "unlinked within the crawled set", and the field name says so rather than
 * claiming a site-wide orphan.
 */
export function unlinkedWithinCrawledSet(pages) {
  return pages.filter((p) => p.inbound_edges.length === 0).map((p) => p.canonical_url);
}

/**
 * Assemble the CrawlRun summary.
 *
 * 🔴 `coverageState` is derived HERE, in one place, from `capReached` — the
 * same discipline as `dataState` in the search paginator. A caller cannot
 * construct a COMPLETE run that hit its cap.
 */
export function summariseRun({
  run_id, started_at, finished_at, seedSource,
  urlsRequested, urlsFetched, requestsIssued, perHostRequests,
  capReached, maxUrlsPerRun, maxRequestsPerHost, maxResponseBytes,
  robotsUnknownHosts = [], cost, dryRun = false,
}) {
  /**
   * 🔴 A DRY RUN MEASURED NOTHING, SO ITS COVERAGE IS UNKNOWN — NEVER COMPLETE.
   *
   * The first version of this reported COMPLETE for a dry run that fetched 0 of
   * 3 URLs, because no cap was hit and no robots failed. Every input to the
   * old expression was true and the conclusion was nonsense: "complete" over an
   * empty measurement is the vacuous-pass pattern this project hunts.
   *
   * A run that could not read robots for some host also did not cover it.
   */
  const coverageState = dryRun
    ? "UNKNOWN"
    : capReached
      ? "PARTIAL"
      : robotsUnknownHosts.length > 0
        ? "UNKNOWN"
        : "COMPLETE";
  if (!COVERAGE_STATES.includes(coverageState)) throw new Error(`unknown coverageState ${coverageState}`);
  return Object.freeze({
    record_type: "crawl_run",
    run_id, started_at, finished_at, seedSource,
    urlsRequested, urlsFetched, requestsIssued,
    perHostRequests: Object.freeze({ ...perHostRequests }),
    capReached,
    // 🔴 LAW-BOUND-1 — the bounds travel with the result.
    maxUrlsPerRun, maxRequestsPerHost, maxResponseBytes,
    coverageState,
    robotsUnknownHosts: Object.freeze([...robotsUnknownHosts]),
    cost,
  });
}
