/**
 * ITEM 25, ITS FOURTH PART — SOURCE INTEGRITY: DO THE SOURCES OUR FACTS CITE STILL ANSWER?
 *
 * ── 🔴 AUTHORISED, AND BOUNDED — owner grant of 13 September 2026 ──────────
 *
 *   EXTERNAL sources only. Every target, and every redirect hop, is checked
 *   against the estate BEFORE it is requested; one estate host aborts the run.
 *   READ-ONLY: HEAD first; GET only where HEAD is refused (405 or 501), and the
 *   method used is recorded per URL. A GET's body is cancelled unread.
 *   ONE request per second, ONE at a time, and a HARD CAP counted at the
 *   boundary. The plan — every URL, the count, the cap — is printed first.
 *   STATUS ONLY is recorded. No page content is stored or quoted.
 *
 * ── 🔴 LAW-ABSENT-1, FIFTH APPLICATION: A FETCH THAT FAILS IS NOT A DEAD LINK ─
 *
 * A timeout, a 403, a 429, a TLS error, a blocked user-agent, a redirect we
 * could not follow — none of these mean the source is gone. They mean WE COULD
 * NOT READ IT. Only a definitive 404 or 410 is GONE; everything else that is not
 * a 2xx is UNKNOWN with the exact status or error as its reason. A regulator
 * blocking our checker is a fact about our checker.
 *
 * ── THE CONTROL ─────────────────────────────────────────────────────────────
 *
 * beta-g fetched and read these sources while verifying the facts on
 * 12 September 2026. Where that baseline says a source returned content and the
 * checker says GONE, THE CHECKER IS WRONG until proved otherwise.
 *
 * This module names no product: the caller supplies the URLs, the estate and
 * the baseline.
 */

export const MAX_REQUESTS = 40;
export const INTERVAL_MS = 1000;
export const MAX_HOPS = 5;
export const TIMEOUT_MS = 20000;
export const USER_AGENT = "AlmiVisibility-SourceIntegrity/0.1 (read-only link check; status only; 1 request/second)";
export const HEAD_REFUSED = Object.freeze([405, 501]);

export class EstateTargetRefused extends Error {}
export class RequestCapReached extends Error {}

/** True when a hostname belongs to the estate the check must never touch. */
export function isEstateHost(hostname, estateHostnames) {
  const h = String(hostname).toLowerCase();
  return estateHostnames.some((e) => {
    const x = e.toLowerCase();
    return h === x || h.endsWith(`.${x}`);
  });
}

/** Refuse the whole plan if any target is an estate host. Called BEFORE the first request. */
export function assertExternal(urls, estateHostnames) {
  const bad = urls.filter((u) => isEstateHost(new URL(u).hostname, estateHostnames));
  if (bad.length) throw new EstateTargetRefused(`🔴 ABORTED before any request — estate target(s) in the plan: ${bad.join(", ")}`);
}

/** The status → verdict law. Nothing else decides GONE. */
export function verdictOf({ status = null, error = null }) {
  if (error) return { verdict: "UNKNOWN", reason: `could not read: ${error}` };
  if (status >= 200 && status < 300) return { verdict: "LIVE", reason: `HTTP ${status}` };
  if (status === 404 || status === 410) return { verdict: "GONE", reason: `HTTP ${status} — definitive` };
  return { verdict: "UNKNOWN", reason: `could not read: HTTP ${status}` };
}

/** How the result compares with what beta-g read on 12 September 2026. */
export function agreementWith(baseline, verdict, status) {
  if (!baseline) return { baseline: null, agrees: null, note: "no baseline for this URL" };
  if (baseline.expected === "CONTENT") {
    if (verdict === "LIVE") return { baseline: baseline.expected, agrees: true, note: "agrees: it answered, as it did for beta-g" };
    if (verdict === "GONE") return { baseline: baseline.expected, agrees: false, note: "🔴 DISAGREES: beta-g read it on 12 September — suspect the checker before the source" };
    return { baseline: baseline.expected, agrees: null, note: "does not contradict: beta-g read it; our checker could not" };
  }
  if (baseline.expected === "HTTP 403") {
    if (verdict === "UNKNOWN" && status === 403) return { baseline: baseline.expected, agrees: true, note: "agrees: 403 again — the EXPECTED result, and UNKNOWN, not GONE" };
    if (verdict === "GONE") return { baseline: baseline.expected, agrees: false, note: "🔴 DISAGREES: it refused beta-g's fetcher with 403, it did not vanish — suspect the checker" };
    return { baseline: baseline.expected, agrees: null, note: `differs from the 12 September 403: now ${verdict}` };
  }
  return { baseline: baseline.expected, agrees: null, note: "unrecognised baseline" };
}

/**
 * Check every URL in the plan, serially, paced, capped.
 *
 * @param {object} a
 * @param {string[]} a.urls
 * @param {string[]} a.estateHostnames
 * @param {(url: string) => ({expected: string}|null)} a.baselineFor
 * @param {Function} a.fetchImpl   injected, so the law can be tested without a network
 * @param {Function} a.sleep       injected pacing
 * @param {() => number} a.now
 */
export async function checkSources({ urls, estateHostnames, baselineFor, fetchImpl, sleep, now = () => Date.now(), maxRequests = MAX_REQUESTS }) {
  assertExternal(urls, estateHostnames);
  let requests = 0;
  let last = null;

  async function request(url, method) {
    if (isEstateHost(new URL(url).hostname, estateHostnames)) throw new EstateTargetRefused(`🔴 ABORTED — a redirect led to an estate host: ${url}`);
    if (requests >= maxRequests) throw new RequestCapReached(`🔴 STOPPED at the hard cap [bound: maxRequests=${maxRequests}]`);
    if (last !== null) {
      const wait = INTERVAL_MS - (now() - last);
      if (wait > 0) await sleep(wait);
    }
    last = now();
    requests += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetchImpl(url, { method, redirect: "manual", headers: { "User-Agent": USER_AGENT }, signal: controller.signal });
      // 🔴 STATUS ONLY. The body is never read.
      try {
        await res.body?.cancel?.();
      } catch {}
      return { status: res.status, location: res.headers?.get?.("location") ?? null };
    } finally {
      clearTimeout(timer);
    }
  }

  const results = [];
  for (const url of urls) {
    const hops = [];
    let current = url;
    let outcome = null;
    for (let hop = 0; hop <= MAX_HOPS; hop += 1) {
      let method = "HEAD";
      let r;
      try {
        r = await request(current, method);
        if (HEAD_REFUSED.includes(r.status)) {
          hops.push({ url: current, method, status: r.status, note: "HEAD refused — retried with GET" });
          method = "GET";
          r = await request(current, method);
        }
      } catch (err) {
        if (err instanceof EstateTargetRefused || err instanceof RequestCapReached) throw err;
        const code = err?.cause?.code ?? err?.code ?? (err?.name === "AbortError" ? `timeout after ${TIMEOUT_MS} ms` : err?.name ?? "error");
        hops.push({ url: current, method, status: null, error: String(code) });
        outcome = { status: null, error: String(code) };
        break;
      }
      hops.push({ url: current, method, status: r.status });
      if (r.status >= 300 && r.status < 400 && r.location) {
        if (hop === MAX_HOPS) {
          outcome = { status: r.status, error: `more than ${MAX_HOPS} redirects — not followed further` };
          break;
        }
        current = new URL(r.location, current).href;
        continue;
      }
      outcome = { status: r.status, error: null };
      break;
    }
    const v = verdictOf(outcome);
    const methodsUsed = [...new Set(hops.map((h) => h.method))].join("+");
    results.push({ url, methodsUsed, hops, finalStatus: outcome.status, error: outcome.error, ...v, ...agreementWith(baselineFor(url), v.verdict, outcome.status) });
  }
  return { results, requests, maxRequests };
}
