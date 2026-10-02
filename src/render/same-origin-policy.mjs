/**
 * 🔴 F22 · C4 · THE BOUNDED SAME-ORIGIN LIVE-RENDER POLICY (RR-137 §3, acceptance _handoffs 2d20a63).
 *
 * A live render lets a page run its OWN scripts: every subresource the page asks for may be supplied — but only from the page's own
 * DECLARED site origin, and only through the same controls a crawl obeys. The browser itself stays OFFLINE (it resolves no name: see
 * OFFLINE_CHROMIUM_ARGS); each subresource request it makes is intercepted, and this policy decides it on the Node side:
 *
 *   UNDECLARED_HOST     the URL's origin is not one the opened connector admits — refused, no request made
 *   REQUEST_CAP         the page's requests already started (hops and retries included) reached its cap — refused, no request made
 *   ROBOTS              the origin's robots rules disallow it, or could not be read (fail closed) — refused, no page request made
 *   NETWORK             the request failed (timeout or network error, after the fetcher's one retry)
 *   SIZE_CAP            the response passed the size cap — refused rather than handed over truncated
 *   REDIRECT_OFF_ORIGIN a redirect pointed off the declared origin (or past the hop bound) — not followed, refused
 *   otherwise           SERVED_SAME_ORIGIN, with the bytes, status and content type the origin returned
 *
 * Pacing, timeout, the size cap and the redirect rule are the crawl fetcher's own (src/crawl/fetcher.mjs) — ONE pacer for the whole
 * run, robots.txt included. Nothing persists between pages: each page gets its own request count and its own response cache, and the
 * cache is used for nothing but that page's JavaScript-disabled SOURCE pass (forPage().cacheOnly), which makes no request at all.
 *
 * Generic: the admitted origins come from the subject's declaration through the opened connector; this file names no host.
 */
import { createFetcher, REQUEST_INTERVAL_MS, REQUEST_TIMEOUT_MS, MAX_RESPONSE_BYTES } from "../crawl/fetcher.mjs";
import { createRobotsCache } from "../crawl/robots.mjs";

/* perPageTimeoutMs: a paced page cannot settle inside the offline renderer's 15 s when every one of its requests waits ≥ the interval —
 * 15 subresources at 1 s each is already 15 s — so a LIVE render declares its own per-page bound; past it the render is PARTIAL. */
export const LIVE_RENDER_BOUNDS = Object.freeze({
  perPageTimeoutMs: 120_000,
  maxRequestsPerPage: 60,
  intervalMs: REQUEST_INTERVAL_MS,
  timeoutMs: REQUEST_TIMEOUT_MS,
  maxResponseBytes: MAX_RESPONSE_BYTES,
});

export const REFUSALS = Object.freeze(["UNDECLARED_HOST", "REQUEST_CAP", "ROBOTS", "NETWORK", "SIZE_CAP", "REDIRECT_OFF_ORIGIN", "NOT_FETCHED_IN_RENDER"]);

const originOf = (u) => { try { return new URL(u).origin; } catch { return null; } };

/**
 * @param {{ fetchImpl: Function, admits: (url: string) => boolean, bounds?: object, sleepImpl?: Function, monotonic?: Function }} o
 */
export function createSameOriginPolicy({ fetchImpl, admits, bounds = LIVE_RENDER_BOUNDS, sleepImpl, monotonic }) {
  if (typeof fetchImpl !== "function" || typeof admits !== "function") throw new TypeError("createSameOriginPolicy: an opened connector's fetch and admits are required");
  const fetcher = createFetcher({ fetchImpl, admits, intervalMs: bounds.intervalMs, timeoutMs: bounds.timeoutMs, maxResponseBytes: bounds.maxResponseBytes, ...(sleepImpl ? { sleepImpl } : {}), ...(monotonic ? { monotonic } : {}) });
  const robots = createRobotsCache({ fetchImpl, timeoutMs: bounds.timeoutMs, beforeRequest: () => fetcher.pace("robots") });

  /** A fresh per-page state: its own request count and response cache — nothing crosses from one page to the next. */
  function forPage() {
    const cache = new Map();
    let made = 0;
    const refused = (refusal) => ({ served: false, refusal });
    async function resolve(url) {
      if (originOf(url) === null || !admits(url)) return refused("UNDECLARED_HOST");
      if (made >= bounds.maxRequestsPerPage) return refused("REQUEST_CAP");
      const verdict = await robots.check(url);
      if (!verdict.allowed) return refused("ROBOTS");
      /* the cap counts HTTP requests actually started — a redirect hop and a retry are requests too — checked before each resource */
      const before = fetcher.requestsIssued();
      const res = await fetcher.fetchUrl(url);
      made += fetcher.requestsIssued() - before;
      if (res.status === null || res.error) return refused("NETWORK");
      if (res.redirectNotFollowed) return refused("REDIRECT_OFF_ORIGIN");
      if (res.truncated) return refused("SIZE_CAP");
      const got = { served: true, status: res.status, contentType: res.headers?.["content-type"] ?? null, body: res.bodyBytes ?? Buffer.from(res.body ?? "", "utf8") };
      cache.set(url, got);
      return got;
    }
    /** The JavaScript-disabled SOURCE pass: only what this page's render already fetched; never a request. */
    async function cacheOnly(url) {
      return cache.get(url) ?? refused("NOT_FETCHED_IN_RENDER");
    }
    return { resolve, cacheOnly, requestsMade: () => made };
  }

  return {
    forPage,
    bounds,
    requestsIssued: () => fetcher.requestsIssued() + robots.requestsIssued(),
    pacing: () => fetcher.pacing(),
    redirects: () => fetcher.redirects(),
  };
}
