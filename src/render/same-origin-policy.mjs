/**
 * 🔴 F22 · C4 · THE BOUNDED SAME-ORIGIN LIVE-RENDER POLICY (RR-137 §3, acceptance _handoffs 2d20a63; RR-138 §2 guards).
 *
 * A live render lets a page run its OWN scripts: every subresource the page asks for may be supplied — but only from the page's own
 * DECLARED site origin, and only through the same controls a crawl obeys. The browser itself stays OFFLINE (it resolves no name: see
 * OFFLINE_CHROMIUM_ARGS); each request it makes is intercepted, and this policy decides it on the Node side. Refused BEFORE any request:
 *
 *   UNDECLARED_HOST     the URL's origin is not one the opened connector admits (a third-party subresource is this)
 *   METHOD_NOT_ALLOWED  anything but GET or HEAD: the render never submits — no login, no payment, no form, no write can leave
 *   RUN_CAP             the run's TOTAL request ceiling is reached (robots, documents, subresources, redirect hops and retries all count;
 *                       it is enforced on the one function every request passes through, so it can never be exceeded)
 *   REQUEST_CAP         the page's requests already started (hops and retries included) reached its per-page cap
 *   ROBOTS              the origin's robots rules disallow it, or could not be read (fail closed)
 * Refused AFTER the response, never handed to the page:
 *   AUTH_OR_PAYMENT     the origin answered 401, 402 or 407: a route that demands credentials or payment is not rendered into
 *   NETWORK             the request failed (timeout or network error, after the fetcher's one retry)
 *   SIZE_CAP            the response passed the size cap — refused rather than handed over truncated
 *   REDIRECT_OFF_ORIGIN a redirect pointed off the declared origin (or past the hop bound) — not followed
 *   otherwise           SERVED_SAME_ORIGIN, with the bytes, status and content type the origin returned
 *
 * No credential is ever sent: the fetch carries no cookie and no authorisation header, and each render's browser context is fresh.
 * Pacing, timeout, the size cap and the redirect rule are the crawl fetcher's own (src/crawl/fetcher.mjs) — ONE pacer for the whole run.
 * Nothing persists between pages except the run's request count: each page gets its own count and cache, and the cache serves that
 * page's other renders, so one resource is fetched once per page however many renders read it.
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
  maxTotalRequests: 300,
  intervalMs: REQUEST_INTERVAL_MS,
  timeoutMs: REQUEST_TIMEOUT_MS,
  maxResponseBytes: MAX_RESPONSE_BYTES,
});

export const REFUSALS = Object.freeze(["UNDECLARED_HOST", "METHOD_NOT_ALLOWED", "RUN_CAP", "REQUEST_CAP", "ROBOTS", "AUTH_OR_PAYMENT", "NETWORK", "SIZE_CAP", "REDIRECT_OFF_ORIGIN", "NOT_FETCHED_IN_RENDER"]);
const AUTH_OR_PAYMENT_STATUSES = new Set([401, 402, 407]);

const originOf = (u) => { try { return new URL(u).origin; } catch { return null; } };

class RunCapReached extends Error { constructor() { super("RUN_CAP: the run's total request ceiling is reached — no request was made"); this.code = "RUN_CAP"; } }

/**
 * @param {{ fetchImpl: Function, admits: (url: string) => boolean, bounds?: object, sleepImpl?: Function, monotonic?: Function }} o
 */
export function createSameOriginPolicy({ fetchImpl, admits, bounds = LIVE_RENDER_BOUNDS, sleepImpl, monotonic }) {
  if (typeof fetchImpl !== "function" || typeof admits !== "function") throw new TypeError("createSameOriginPolicy: an opened connector's fetch and admits are required");
  const maxTotal = bounds.maxTotalRequests ?? LIVE_RENDER_BOUNDS.maxTotalRequests;
  /* 🔴 THE TOTAL CEILING, on the one function every request of the run passes through: robots, documents, subresources, hops, retries */
  let sent = 0;
  const ceiled = (url, init) => {
    if (sent >= maxTotal) return Promise.reject(new RunCapReached());
    sent += 1;
    return fetchImpl(url, init);
  };
  const fetcher = createFetcher({ fetchImpl: ceiled, admits, intervalMs: bounds.intervalMs, timeoutMs: bounds.timeoutMs, maxResponseBytes: bounds.maxResponseBytes, ...(sleepImpl ? { sleepImpl } : {}), ...(monotonic ? { monotonic } : {}) });
  const robots = createRobotsCache({ fetchImpl: ceiled, timeoutMs: bounds.timeoutMs, beforeRequest: () => fetcher.pace("robots") });

  /** A fresh per-page state: its own request count and response cache — nothing crosses from one page to the next. */
  function forPage() {
    const cache = new Map();
    let made = 0;
    const refused = (refusal) => ({ served: false, refusal });
    async function resolve(url, { method = "GET" } = {}) {
      if (originOf(url) === null || !admits(url)) return refused("UNDECLARED_HOST");
      if (method !== "GET" && method !== "HEAD") return refused("METHOD_NOT_ALLOWED");
      if (sent >= maxTotal) return refused("RUN_CAP");
      if (made >= bounds.maxRequestsPerPage) return refused("REQUEST_CAP");
      const verdict = await robots.check(url);
      if (!verdict.allowed) return refused(sent >= maxTotal ? "RUN_CAP" : "ROBOTS");
      /* the cap counts HTTP requests actually started — a redirect hop and a retry are requests too — checked before each resource */
      const before = fetcher.requestsIssued();
      const sentBefore = sent;
      const res = await fetcher.fetchUrl(url);
      made += fetcher.requestsIssued() - before;
      if (res.status === null || res.error) return refused(sent >= maxTotal && sent === sentBefore ? "RUN_CAP" : "NETWORK");
      if (AUTH_OR_PAYMENT_STATUSES.has(res.status)) return refused("AUTH_OR_PAYMENT");
      if (res.redirectNotFollowed) return refused("REDIRECT_OFF_ORIGIN");
      if (res.truncated) return refused("SIZE_CAP");
      const got = { served: true, status: res.status, contentType: res.headers?.["content-type"] ?? null, body: res.bodyBytes ?? Buffer.from(res.body ?? "", "utf8") };
      cache.set(url, got);
      return got;
    }
    /** The JavaScript-disabled SOURCE pass: only what this page's renders already fetched; never a request. */
    async function cacheOnly(url) {
      return cache.get(url) ?? refused("NOT_FETCHED_IN_RENDER");
    }
    /** Another render of the SAME page: what this page already fetched, else fetched under the same rules (once). */
    async function cacheOrResolve(url, opts) {
      return cache.get(url) ?? resolve(url, opts);
    }
    return { resolve, cacheOnly, cacheOrResolve, requestsMade: () => made };
  }

  return {
    forPage,
    bounds: Object.freeze({ ...bounds, maxTotalRequests: maxTotal }),
    /* every HTTP request the run actually sent — the one counter the ceiling is enforced on */
    requestsIssued: () => sent,
    pacing: () => fetcher.pacing(),
    redirects: () => fetcher.redirects(),
  };
}
