/**
 * THE POLITE FETCHER — one request at a time, slowly, with a size ceiling.
 *
 * ── 🔴 WHY EVERY LIMIT HERE IS A CEILING AND NOT A TARGET ───────────────────
 *
 * A crawler's failure modes are not "it went wrong" — they are "it went right,
 * very fast, for a long time, against something we pay for". So each limit is
 * enforced at the point of spending, and each one is reported next to the
 * result it bounded (LAW-BOUND-1).
 *
 * ── RETRIES: ONE, AND NEVER ON A 4xx ────────────────────────────────────────
 *
 * A network error may be transient. A 4xx is the server telling us the request
 * was wrong — retrying it is asking the same question louder, and against a
 * rate-limited host a retried 429 is how a slow crawler becomes a blocked one.
 * `R4` in item 4 already records that a block is permanent in a way a slow
 * crawl is not.
 */

import { performance } from "node:perf_hooks";
import { USER_AGENT } from "./robots.mjs";

/* 🔴 RR-108 — THE PACING CLOCK. RR-107's fastest page-request gap measured 999 ms against a 1,000 ms bound: the old pacer slept the
 * computed wait ONCE on the wall clock and never rechecked, so an early timer wake-up started a request short of the interval, and no
 * start time was recorded, so the gap could only be inferred. The repair:
 *   CLOCK   performance.now() — monotonic within the process (it never moves backwards; a wall-clock change cannot shorten an interval)
 *           and sub-millisecond, so a gap is a measured quantity, not an inference from response timings.
 *   RULE    a request may START only when (now - last start) >= the interval, rechecked after EVERY wait; an early wake-up loops.
 *   RECORD  every start — robots.txt, page, retry — is logged on that clock; the run record carries every gap, its fastest and slowest,
 *           the robots-to-first-page gap by name, and the count of gaps under the bound.
 * ASSUMPTIONS (named): one process, concurrency 1 (the crawl loop is sequential); "start" is the instant the pacer releases, immediately
 * before fetchImpl is called — the bytes leave no earlier, so a later send only lengthens the true gap; the clock is the same for every
 * request of a run; a retry is a request and is paced like any other. */
export const PACING_CLOCK = "performance.now() (monotonic, sub-millisecond)";
/** The one rule, at its exact boundary: a start is allowed only when at least the full interval has elapsed since the last start. */
export const mayStart = (lastStart, nowMs, intervalMs) => lastStart === null || nowMs - lastStart >= intervalMs;

/** The pacing summary of a run's request starts, in declared order. A gap under the interval is a BREACH; none measured is NOT MEASURED. */
export function pacingSummary(starts, intervalMs) {
  const t0 = starts[0]?.at ?? null;
  const gaps = starts.slice(1).map((s, i) => ({ from: starts[i].kind, to: s.kind, ms: s.at - starts[i].at }));
  const firstPage = starts.findIndex((s) => s.kind === "page");
  const robotsToFirstPage = firstPage > 0 && starts[firstPage - 1].kind === "robots" ? starts[firstPage].at - starts[firstPage - 1].at : null;
  const ms = gaps.map((g) => g.ms);
  const breaches = gaps.filter((g) => g.ms < intervalMs).length;
  return {
    clock: PACING_CLOCK,
    intervalMs,
    starts: starts.map((s) => ({ kind: s.kind, sinceFirstMs: s.at - t0 })),
    gaps: gaps.length,
    fastestGapMs: ms.length ? Math.min(...ms) : null,
    slowestGapMs: ms.length ? Math.max(...ms) : null,
    robotsToFirstPageMs: robotsToFirstPage,
    breaches,
    ok: gaps.length > 0 && breaches === 0,
  };
}

/** 🔴 One page cannot blow memory or bandwidth. Recorded as `truncated` when hit. */
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

/** `D-CRW-3`. Concurrency is 1 by construction: the crawl loop is sequential. */
export const REQUEST_INTERVAL_MS = 1000;

export const REQUEST_TIMEOUT_MS = 15000;

/* 🔴 RR-135 — REDIRECTS ARE FOLLOWED HERE, HOP BY HOP, PACED — NEVER BY THE PLATFORM. `redirect: "follow"` let the network layer issue
 * each hop itself: an UNPACED request (F19 FAILURE: "two requests to one host arrive closer than the declared interval"), to wherever the
 * Location pointed, declared or not ("the crawl reads a resource not declared for the requested tenant"), and the hops went unrecorded
 * (the redirect chain was empty on every record). Now each hop is its own request: it waits for the pacer, has its own timeout, is
 * counted, is recorded in the chain, and is taken only when `admits` (the opened connector's declared origins) allows its target.
 * A redirect not followed — to an origin not admitted, or past the hop bound — is returned as served and says why. */
export const MAX_REDIRECT_HOPS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Headers worth keeping. A whole header bag is somebody else's data we have no
 * reason to store, and `set-cookie` in particular must never land in evidence.
 */
/* Exported (F21, RR-86): an audit reading recorded headers must know which headers were COLLECTED, so an absent
 * x-robots-tag reads as absent while an uncollected header (`link`) reads as not recorded. */
export const HEADER_SUBSET = Object.freeze(["content-type", "x-robots-tag", "cache-control", "last-modified", "etag"]);

/* 🔴 RR-104 — COLLECTOR v0.2: AN EXPLICIT ALLOWLIST, NEVER "RECORD EVERYTHING". HEADER_SUBSET above stays exactly what collector v0.1
 * recorded (src/audit/indexability-signals.mjs reads it by version), so an old record's missing header stays NOT MEASURED. v0.2 adds the
 * indexing and security headers the rows need, by name. */
export const HEADER_ALLOWLIST = Object.freeze([
  ...HEADER_SUBSET,
  /* indexing */ "link", "content-language",
  /* security and transport */ "strict-transport-security", "content-security-policy", "x-content-type-options", "x-frame-options",
  "referrer-policy", "permissions-policy", "cross-origin-opener-policy",
]);
/** 🔴 Never admitted, whatever the allowlist says: anything that can carry a credential or a session. Checked at load, and per header. */
export const SENSITIVE_HEADER = /^(set-cookie2?|cookie|authorization|proxy-authorization|www-authenticate|proxy-authenticate|x-api-key|x-auth-token|x-csrf-token|x-xsrf-token|.*session.*|.*token.*|.*secret.*)$/i;
for (const h of HEADER_ALLOWLIST) if (SENSITIVE_HEADER.test(h)) throw new Error(`fetcher: the header allowlist admits a sensitive header (${h})`);
/** One header value cannot blow a record: longer values are cut at this many bytes and the header is named in `headersTruncated`. */
export const MAX_HEADER_VALUE_BYTES = 4096;

/** The allowlisted headers of a response, each value capped; sensitive names never admitted. Pure over a Headers-like `get`. */
export function allowlistedHeaders(get, { allowlist = HEADER_ALLOWLIST, maxValueBytes = MAX_HEADER_VALUE_BYTES } = {}) {
  const headers = {};
  const headersTruncated = [];
  for (const h of allowlist) {
    if (SENSITIVE_HEADER.test(h)) continue;
    const v = get(h);
    if (v == null) continue;
    const s = String(v);
    if (Buffer.byteLength(s, "utf8") > maxValueBytes) {
      headers[h] = Buffer.from(s, "utf8").subarray(0, maxValueBytes).toString("utf8");
      headersTruncated.push(h);
    } else headers[h] = s;
  }
  return { headers, headersTruncated };
}

export function createFetcher({
  fetchImpl,
  userAgent = USER_AGENT,
  maxResponseBytes = MAX_RESPONSE_BYTES,
  timeoutMs = REQUEST_TIMEOUT_MS,
  intervalMs = REQUEST_INTERVAL_MS,
  now = () => Date.now(),
  sleepImpl = sleep,
  monotonic = () => performance.now(),
  admits = () => true,
  maxRedirectHops = MAX_REDIRECT_HOPS,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("createFetcher: fetchImpl is required — the crawler never reaches for global fetch");
  }

  let lastStart = null;
  const starts = [];
  let requestsIssued = 0;
  let redirectHops = 0;
  const redirectsNotFollowed = { ORIGIN_NOT_ADMITTED: 0, MAX_HOPS: 0 };

  /** 🔴 The pacer. Concurrency 1 is structural. It releases a request only when the FULL interval has elapsed on the monotonic clock,
   * rechecking after every wait — an early wake-up loops instead of starting short — and records the start. */
  async function pace(kind = "page") {
    for (;;) {
      const t = monotonic();
      if (mayStart(lastStart, t, intervalMs)) {
        lastStart = t;
        starts.push({ kind, at: t });
        return t;
      }
      await sleepImpl(Math.max(1, Math.ceil(intervalMs - (t - lastStart))));
    }
  }

  async function once(url, kind = "page") {
    const startedAt = now();
    const chain = [];
    let current = url;
    let k = kind;
    for (;;) {
      await pace(k);
      requestsIssued += 1;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchImpl(current, {
          headers: { "User-Agent": userAgent },
          redirect: "manual",
          signal: controller.signal,
        });

        const location = REDIRECT_STATUSES.has(res.status) ? res.headers?.get?.("location") ?? null : null;
        let next = null;
        try { next = location ? new URL(location, current).toString() : null; } catch { next = null; }
        if (next !== null && chain.length < maxRedirectHops && admits(next)) {
          chain.push({ from: current, status: res.status, to: next });
          redirectHops += 1;
          await Promise.resolve().then(() => res.body?.cancel?.()).catch(() => {});
          current = next;
          k = "redirect";
          continue;
        }
        const notFollowed = next === null ? null : chain.length >= maxRedirectHops ? "MAX_HOPS" : "ORIGIN_NOT_ADMITTED";
        if (notFollowed) redirectsNotFollowed[notFollowed] += 1;

        // Read with a hard byte ceiling. `res.text()` would buffer the whole body
        // first, which is exactly what the ceiling exists to prevent.
        const { text, bytes, truncated } = await readCapped(res, maxResponseBytes);

        const { headers, headersTruncated } = allowlistedHeaders((h) => res.headers?.get?.(h));

        return {
          ok: true,
          status: res.status,
          finalUrl: chain.length ? current : res.url || current,
          redirected: chain.length > 0 || Boolean(res.redirected),
          redirectChain: chain,
          redirectNotFollowed: notFollowed,
          headers,
          headersTruncated,
          body: text,
          bytes,
          truncated,
          timing_ms: now() - startedAt,
        };
      } finally {
        clearTimeout(timer);
      }
    }
  }

  /**
   * Fetch a URL. At most ONE retry, and only on a network-level error.
   */
  async function fetchUrl(url) {
    try {
      return await once(url, "page");
    } catch (err) {
      // 🔴 A thrown error is a NETWORK error — a non-2xx never throws, it
      // returns a status. So there is no 4xx to accidentally retry here, and
      // the `once()` path above is the only place a status is produced.
      try {
        return await once(url, "retry");
      } catch (err2) {
        return {
          ok: false,
          status: null,
          finalUrl: url,
          error: String(err2?.name === "AbortError" ? "timeout" : err2?.message ?? err2),
          retried: true,
          timing_ms: null,
        };
      }
    }
  }

  /* `pace` is exposed so robots.txt requests share this ONE pacer: an unpaced robots fetch followed at once by the first
   * page fetch was two requests to one host closer than the declared interval (F19 measurement, 28 Sep 2026). */
  return { fetchUrl, pace, pacing: () => pacingSummary(starts, intervalMs), requestsIssued: () => requestsIssued,
    redirects: () => ({ hopsFollowed: redirectHops, notFollowed: { ...redirectsNotFollowed }, maxHops: maxRedirectHops }),
    maxResponseBytes, intervalMs, timeoutMs };
}

/** Read a response body, stopping at `limit` bytes. */
async function readCapped(res, limit) {
  if (!res.body || typeof res.body.getReader !== "function") {
    const text = await res.text();
    const bytes = Buffer.byteLength(text, "utf8");
    if (bytes > limit) {
      return { text: Buffer.from(text, "utf8").subarray(0, limit).toString("utf8"), bytes: limit, truncated: true };
    }
    return { text, bytes, truncated: false };
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total >= limit) {
      chunks.push(value.subarray(0, value.length - (total - limit)));
      truncated = true;
      await reader.cancel().catch(() => {});
      total = limit;
      break;
    }
    chunks.push(value);
  }
  return { text: Buffer.concat(chunks.map(Buffer.from)).toString("utf8"), bytes: total, truncated };
}
