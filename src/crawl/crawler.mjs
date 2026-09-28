/**
 * THE CRAWLER. IT READS.
 *
 * ── 🔴 WHAT IT NEVER DOES ───────────────────────────────────────────────────
 *
 * It never writes to any product repository. It never deploys, never publishes,
 * never generates a page, and it makes NO JUDGEMENT about any page it reads —
 * no "thin", no "duplicate", no "non-indexable", no issue of any kind (C5).
 * It produces observations and nothing else.
 *
 * ── 🔴 DRY RUN IS THE DEFAULT ───────────────────────────────────────────────
 *
 * `live` must be passed explicitly. A crawler whose default is to crawl is one
 * accidental invocation away from spending money on 240,328 dynamically-served
 * pages. The default costs nothing and prints exactly what a live run would do.
 */

import { BoundedFrontier, MAX_URLS_PER_RUN, MAX_REQUESTS_PER_HOST } from "./frontier.mjs";
import { createRobotsCache, USER_AGENT } from "./robots.mjs";
import { createFetcher, MAX_RESPONSE_BYTES, REQUEST_INTERVAL_MS, REQUEST_TIMEOUT_MS } from "./fetcher.mjs";
import { extractLinks } from "./seeds.mjs";
import { summariseRun } from "./inventory.mjs";
import { makeObservation } from "../evidence/records.mjs";
import { sha256Hex } from "../evidence/ids.mjs";
import { costRecord } from "../search/provider.mjs";

const COLLECTOR = "src/crawl/crawler.mjs";
const COLLECTOR_VERSION = "0.1";

/**
 * 🔴 THE DEPTH BOUND: 0 — the seeds only. Links are recorded as edges and never offered to the frontier (see the loop
 * below). It was always enforced and, until F19's measurement (28 Sep 2026), declared nowhere: a bound nobody wrote down
 * is a bound nobody can check a run against, so it now travels in the plan and the run record beside the other four.
 */
export const MAX_DEPTH = 0;

/** How the request interval is applied: ONE pacer for the whole run, so it is stricter than a per-host minimum. */
const INTERVAL_SCOPE = "RUN_WIDE";

/**
 * Build the plan a run WOULD execute. Pure: issues no requests.
 *
 * 🔴 THE PLAN IS PRINTED BEFORE THE FIRST REQUEST, LIVE OR NOT. A run whose
 * shape is only visible afterwards is a run nobody could have stopped.
 */
export function planRun({ seeds, capacity = MAX_URLS_PER_RUN, maxPerHost = MAX_REQUESTS_PER_HOST, intervalMs = REQUEST_INTERVAL_MS, timeoutMs = REQUEST_TIMEOUT_MS, maxResponseBytes = MAX_RESPONSE_BYTES }) {
  const frontier = new BoundedFrontier({ capacity, maxPerHost });
  for (const url of seeds) frontier.offer(url);
  const perHost = frontier.perHostCounts();
  return {
    urlsOffered: seeds.length,
    urlsQueued: frontier.size,
    urlsRejected: frontier.rejected,
    capReached: frontier.capReached,
    hosts: Object.keys(perHost),
    perHost,
    maxUrlsPerRun: MAX_URLS_PER_RUN,
    capacity,
    maxRequestsPerHost: frontier.maxPerHost, // the ENFORCED value: the frontier clamps it to capacity
    maxResponseBytes,
    maxDepth: MAX_DEPTH,
    requestIntervalMs: intervalMs,
    requestIntervalScope: INTERVAL_SCOPE,
    requestTimeoutMs: timeoutMs,
    // robots.txt costs one request per host, on top of the page fetches.
    estimatedRequests: frontier.size + Object.keys(perHost).length,
    frontier,
  };
}

/**
 * Render the plan for a human, and the billing sentence that must always appear.
 *
 * 🔴 EVERY RUN SAYS THIS, IN WORDS, NO EXCEPTIONS. A number in a table is easy
 * to skim past. A sentence naming the host and the word "billable" is not.
 */
export function renderPlan(plan, { live }) {
  const lines = [
    `MODE: ${live ? "🔴 LIVE — real requests will be issued" : "DRY RUN — no request will be issued"}`,
    `seeds offered      : ${plan.urlsOffered}`,
    `queued to fetch    : ${plan.urlsQueued}   [bound: maxUrlsPerRun=${plan.maxUrlsPerRun} capacity=${plan.capacity}]`,
    `rejected by bounds : ${plan.urlsRejected}   capReached=${plan.capReached}`,
    `hosts              : ${plan.hosts.length}`,
    `estimated requests : ${plan.estimatedRequests}  (${plan.urlsQueued} pages + ${plan.hosts.length} robots.txt)`,
    `per-request bounds : maxRequestsPerHost=${plan.maxRequestsPerHost} maxResponseBytes=${plan.maxResponseBytes} requestTimeoutMs=${plan.requestTimeoutMs}`,
    `depth and rate     : maxDepth=${plan.maxDepth} (seeds only) requestIntervalMs=${plan.requestIntervalMs} (${plan.requestIntervalScope}, robots.txt included)`,
    "",
  ];
  /**
   * 🔴 THE TENSE IS NOT DECORATION.
   *
   * A dry run issues nothing, so "N requests issued" would be FALSE on the
   * default path — and a false sentence in the one place we promised always to
   * print the truth is worse than no sentence. The plan says WOULD; the run
   * summary says WERE, and only after they were.
   */
  for (const [host, n] of Object.entries(plan.perHost)) {
    lines.push(
      live
        ? `🔴 ${n} requests WILL be issued to host ${host} — this is billable traffic on our own Vercel account.`
        : `🔴 ${n} requests WOULD be issued to host ${host} — that would be billable traffic on our own Vercel account. None issued: this is a dry run.`,
    );
  }
  return lines.join("\n");
}

/**
 * Execute a crawl.
 *
 * `live` false (the default) returns the plan and a run summary with zero
 * requests issued. Nothing in this function reaches for a global `fetch`: the
 * fetcher is constructed from an injected implementation, which is what lets
 * the whole suite run against a local fixture server.
 */
export async function crawl({
  seeds,
  seedSource,
  fetchImpl,
  seedPoolSize = null,
  live = false,
  capacity = MAX_URLS_PER_RUN,
  maxPerHost = MAX_REQUESTS_PER_HOST,
  now = () => new Date(),
  onPlan = () => {},
  fetcherOptions = {},
}) {
  const started_at = now().toISOString();
  const run_id = sha256Hex(`${started_at}|${seedSource}|${seeds.length}`).slice(0, 16);

  /* The bounds the fetcher will ENFORCE are resolved once, here, and the same values are declared in the plan and record. */
  const intervalMs = fetcherOptions.intervalMs ?? REQUEST_INTERVAL_MS;
  const timeoutMs = fetcherOptions.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const maxResponseBytes = fetcherOptions.maxResponseBytes ?? MAX_RESPONSE_BYTES;
  const plan = planRun({ seeds, capacity, maxPerHost, intervalMs, timeoutMs, maxResponseBytes });
  const declaredBounds = {
    maxUrlsPerRun: MAX_URLS_PER_RUN, capacity, maxRequestsPerHost: plan.frontier.maxPerHost, maxResponseBytes,
    maxDepth: MAX_DEPTH, requestIntervalMs: intervalMs, requestIntervalScope: INTERVAL_SCOPE, requestTimeoutMs: timeoutMs,
  };
  onPlan(plan);

  const observations = [];
  const edges = [];
  const robotsUnknownHosts = new Set();
  const perHostRequests = {};
  let urlsFetched = 0;
  /**
   * 🔴 Bodies are handed BACK to the caller, never written from in here.
   *
   * The crawler's job is to observe. Deciding where bytes land — a corpus
   * directory, an artifact, nowhere at all — is the caller's, and keeping that
   * out of this function is what lets the whole suite run without writing a
   * single file.
   */
  const bodies = new Map();

  if (!live) {
    /* 🔴 THE DRY-RUN PATH ISSUES NOTHING. It does not construct a fetcher, does
     * not touch robots, and returns before any awaitable I/O exists. A test
     * asserts zero calls on the injected fetch. */
    return {
      plan,
      run: summariseRun({
        run_id, started_at, finished_at: now().toISOString(), seedSource,
        urlsRequested: plan.urlsQueued, urlsFetched: 0, requestsIssued: 0, robotsRequestsIssued: 0, perHostRequests: {},
        capReached: plan.capReached,
        ...declaredBounds,
        robotsUnknownHosts: [], seedPoolSize,
        cost: crawlCost(0),
        dryRun: true,
      }),
      observations, edges, bodies, pages: [],
      dryRun: true,
    };
  }

  const fetcher = createFetcher({ fetchImpl, ...fetcherOptions, intervalMs, timeoutMs, maxResponseBytes });
  /* robots.txt shares the fetcher's pacer and its declared timeout: one interval, one timeout, for every request. */
  const robots = createRobotsCache({ fetchImpl, timeoutMs, beforeRequest: fetcher.pace });

  for (;;) {
    const url = plan.frontier.shift();
    if (url === undefined) break;

    const host = new URL(url).hostname.toLowerCase();
    const verdict = await robots.check(url);
    if (verdict.state === "UNKNOWN") robotsUnknownHosts.add(host);
    if (!verdict.allowed) {
      observations.push(
        pageObservation({
          now, requested_url: url, final_url: null, status: null,
          robotsState: verdict.state, robotsReason: verdict.reason, skipped: true,
        }),
      );
      continue;
    }

    const res = await fetcher.fetchUrl(url);
    perHostRequests[host] = (perHostRequests[host] ?? 0) + 1;
    urlsFetched += 1;

    const obs = pageObservation({
      now, requested_url: url,
      final_url: res.finalUrl ?? null,
      status: res.status,
      headers: res.headers,
      body: res.ok ? res.body : null,
      bytes: res.bytes ?? 0,
      truncated: Boolean(res.truncated),
      timing_ms: res.timing_ms,
      error: res.error ?? null,
      robotsState: verdict.state,
      robotsReason: verdict.reason,
      skipped: false,
    });
    observations.push(obs);
    if (res.ok && res.body) bodies.set(obs.observation_id, res.body);

    /* 🔴 LINKS ARE RECORDED AS EDGES AND NEVER OFFERED TO THE FRONTIER.
     * There is deliberately no `frontier.offer(link)` anywhere in this file. */
    if (res.ok && res.body) {
      for (const to of extractLinks(res.body, res.finalUrl ?? url)) {
        edges.push({ from: res.finalUrl ?? url, to });
      }
    }
  }

  return {
    plan,
    run: summariseRun({
      run_id, started_at, finished_at: now().toISOString(), seedSource,
      urlsRequested: plan.urlsQueued, urlsFetched, requestsIssued: fetcher.requestsIssued(),
      robotsRequestsIssued: robots.requestsIssued(),
      perHostRequests,
      capReached: plan.capReached,
      ...declaredBounds,
      robotsUnknownHosts: [...robotsUnknownHosts], seedPoolSize,
      cost: crawlCost(fetcher.requestsIssued()),
    }),
    observations, edges, bodies,
    dryRun: false,
  };
}

/**
 * 🔴 WHERE A REQUEST ENDED, WHEN THAT IS NOT WHERE IT STARTED — or null.
 *
 * Feeds the measurement key (see measurementKey() in ids.mjs). null for a
 * request that ended where it started with no captured hop, so every
 * unredirected page keeps the exact key it has always had; a string for
 * anything else, so a changed destination is a changed measurement.
 */
export function journeyOf({ requested_url, final_url, redirect_chain = [] }) {
  const redirected = Boolean(final_url && final_url !== requested_url) || redirect_chain.length > 0;
  return redirected ? JSON.stringify({ final_url, redirect_chain }) : null;
}

function crawlCost(requests) {
  return costRecord({
    provider: "self-operated-crawler",
    apiCalls: requests,
    billableUnits: requests,
    currency: "USD",
    amount: null,
    // 🔴 UNKNOWN, not 0. Each request may trigger a function invocation and an
    // ISR regeneration on our own account. Nobody has applied Gate C to a
    // crawler we operate (`U-COST-5`), so the amount is not known — and a 0
    // here would be a number nobody measured.
    amountState: "UNKNOWN",
    basis:
      "each request may invoke a function and trigger an ISR regeneration on our own account; " +
      "Gate C has never been applied to a crawler we operate (U-COST-5)",
  });
}

function pageObservation({
  now, requested_url, final_url, status, headers = {}, body = null,
  bytes = 0, truncated = false, timing_ms = null, error = null,
  robotsState, robotsReason, skipped,
}) {
  const observed_at = now().toISOString();
  const content_sha256 = sha256Hex(body ?? `<no-body:${status ?? error ?? "skipped"}>`);
  /* ⚠️ The fetcher follows redirects with `redirect: "follow"`, which reports
   * where a request ENDED but not the hops in between — so the chain is empty on
   * every record, and a change of intermediate hop that keeps the same final URL
   * and the same bytes is still invisible. Recorded as a declared limit, not
   * papered over: the chain participates in the key the moment it is captured. */
  const redirect_chain = [];
  return makeObservation({
    observed_at,
    method: skipped ? "crawl.skipped" : "crawl.fetch",
    target: { kind: "url", ref: requested_url },
    content_sha256,
    journey: journeyOf({ requested_url, final_url, redirect_chain }),
    collector: COLLECTOR,
    collector_version: COLLECTOR_VERSION,
    value: {
      requested_url, final_url, status,
      redirect_chain,
      timing_ms,
      response_headers_subset: headers,
      bytes, truncated, error,
      robotsState, robotsReason, skipped,
      /* 🔴 ON EVERY RECORD, WITHOUT EXCEPTION.
       *
       * There is no JavaScript rendering in v0.1, and this field is how that
       * absence stays visible IN THE DATA rather than in somebody's memory.
       * "declared render != served" is one of the six known RED classes, so a
       * renderer added now would be building toward the test — and a later
       * report that mistook an UNRENDERED body for a RENDERED one would be
       * wrong in a way nothing could catch. */
      renderMode: "RAW_HTML",
    },
  });
}

export { USER_AGENT, MAX_URLS_PER_RUN, MAX_REQUESTS_PER_HOST, MAX_RESPONSE_BYTES, REQUEST_INTERVAL_MS, REQUEST_TIMEOUT_MS };
