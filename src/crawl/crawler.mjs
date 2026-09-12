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
import { createFetcher, MAX_RESPONSE_BYTES } from "./fetcher.mjs";
import { extractLinks } from "./seeds.mjs";
import { summariseRun } from "./inventory.mjs";
import { makeObservation } from "../evidence/records.mjs";
import { sha256Hex } from "../evidence/ids.mjs";
import { costRecord } from "../search/provider.mjs";

const COLLECTOR = "src/crawl/crawler.mjs";
const COLLECTOR_VERSION = "0.1";

/**
 * Build the plan a run WOULD execute. Pure: issues no requests.
 *
 * 🔴 THE PLAN IS PRINTED BEFORE THE FIRST REQUEST, LIVE OR NOT. A run whose
 * shape is only visible afterwards is a run nobody could have stopped.
 */
export function planRun({ seeds, capacity = MAX_URLS_PER_RUN, maxPerHost = MAX_REQUESTS_PER_HOST }) {
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
    maxRequestsPerHost: maxPerHost,
    maxResponseBytes: MAX_RESPONSE_BYTES,
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
    `per-request bounds : maxRequestsPerHost=${plan.maxRequestsPerHost} maxResponseBytes=${plan.maxResponseBytes}`,
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
  live = false,
  capacity = MAX_URLS_PER_RUN,
  maxPerHost = MAX_REQUESTS_PER_HOST,
  now = () => new Date(),
  onPlan = () => {},
  fetcherOptions = {},
}) {
  const started_at = now().toISOString();
  const run_id = sha256Hex(`${started_at}|${seedSource}|${seeds.length}`).slice(0, 16);

  const plan = planRun({ seeds, capacity, maxPerHost });
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
        urlsRequested: plan.urlsQueued, urlsFetched: 0, requestsIssued: 0, perHostRequests: {},
        capReached: plan.capReached,
        maxUrlsPerRun: MAX_URLS_PER_RUN, maxRequestsPerHost: maxPerHost, maxResponseBytes: MAX_RESPONSE_BYTES,
        robotsUnknownHosts: [],
        cost: crawlCost(0),
        dryRun: true,
      }),
      observations, edges, bodies, pages: [],
      dryRun: true,
    };
  }

  const fetcher = createFetcher({ fetchImpl, ...fetcherOptions });
  const robots = createRobotsCache({ fetchImpl, ...(fetcherOptions.timeoutMs ? { timeoutMs: fetcherOptions.timeoutMs } : {}) });

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
      perHostRequests,
      capReached: plan.capReached,
      maxUrlsPerRun: MAX_URLS_PER_RUN, maxRequestsPerHost: maxPerHost, maxResponseBytes: MAX_RESPONSE_BYTES,
      robotsUnknownHosts: [...robotsUnknownHosts],
      cost: crawlCost(fetcher.requestsIssued()),
    }),
    observations, edges, bodies,
    dryRun: false,
  };
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
  return makeObservation({
    observed_at,
    method: skipped ? "crawl.skipped" : "crawl.fetch",
    target: { kind: "url", ref: requested_url },
    content_sha256,
    collector: COLLECTOR,
    collector_version: COLLECTOR_VERSION,
    value: {
      requested_url, final_url, status,
      redirect_chain: [],
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

export { USER_AGENT, MAX_URLS_PER_RUN, MAX_REQUESTS_PER_HOST, MAX_RESPONSE_BYTES };
