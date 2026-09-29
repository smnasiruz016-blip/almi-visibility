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

import { USER_AGENT } from "./robots.mjs";

/** 🔴 One page cannot blow memory or bandwidth. Recorded as `truncated` when hit. */
export const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

/** `D-CRW-3`. Concurrency is 1 by construction: the crawl loop is sequential. */
export const REQUEST_INTERVAL_MS = 1000;

export const REQUEST_TIMEOUT_MS = 15000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Headers worth keeping. A whole header bag is somebody else's data we have no
 * reason to store, and `set-cookie` in particular must never land in evidence.
 */
/* Exported (F21, RR-86): an audit reading recorded headers must know which headers were COLLECTED, so an absent
 * x-robots-tag reads as absent while an uncollected header (`link`) reads as not recorded. */
export const HEADER_SUBSET = Object.freeze(["content-type", "x-robots-tag", "cache-control", "last-modified", "etag"]);

export function createFetcher({
  fetchImpl,
  userAgent = USER_AGENT,
  maxResponseBytes = MAX_RESPONSE_BYTES,
  timeoutMs = REQUEST_TIMEOUT_MS,
  intervalMs = REQUEST_INTERVAL_MS,
  now = () => Date.now(),
  sleepImpl = sleep,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("createFetcher: fetchImpl is required — the crawler never reaches for global fetch");
  }

  let lastRequestAt = 0;
  let requestsIssued = 0;

  /** 🔴 The pacer. Concurrency 1 is structural: nothing here runs in parallel. */
  async function pace() {
    const wait = lastRequestAt === 0 ? 0 : intervalMs - (now() - lastRequestAt);
    if (wait > 0) await sleepImpl(wait);
    lastRequestAt = now();
  }

  async function once(url) {
    await pace();
    requestsIssued += 1;
    const startedAt = now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, {
        headers: { "User-Agent": userAgent },
        redirect: "follow",
        signal: controller.signal,
      });

      // Read with a hard byte ceiling. `res.text()` would buffer the whole body
      // first, which is exactly what the ceiling exists to prevent.
      const { text, bytes, truncated } = await readCapped(res, maxResponseBytes);

      const headers = {};
      for (const h of HEADER_SUBSET) {
        const v = res.headers?.get?.(h);
        if (v != null) headers[h] = v;
      }

      return {
        ok: true,
        status: res.status,
        finalUrl: res.url || url,
        redirected: Boolean(res.redirected),
        headers,
        body: text,
        bytes,
        truncated,
        timing_ms: now() - startedAt,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Fetch a URL. At most ONE retry, and only on a network-level error.
   */
  async function fetchUrl(url) {
    try {
      return await once(url);
    } catch (err) {
      // 🔴 A thrown error is a NETWORK error — a non-2xx never throws, it
      // returns a status. So there is no 4xx to accidentally retry here, and
      // the `once()` path above is the only place a status is produced.
      try {
        return await once(url);
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
  return { fetchUrl, pace, requestsIssued: () => requestsIssued, maxResponseBytes, intervalMs, timeoutMs };
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
