/**
 * 🔴 RR-106 — PROVE YOU CAN KEEP IT BEFORE YOU GO AND GET IT.
 *
 * RR-105 spent its one GREEN: 28 live requests were made, THEN the governed append refused every record (three record types had no
 * evidence-state rule), and all 27 pages were lost. The order was wrong: the network was spent before anyone asked whether the result
 * could be kept.
 *
 * This preflight runs BEFORE the connector is opened and before any network activity. It drives the crawler's OWN code on a synthetic
 * site that exists only in this process (an in-process fetch — nothing leaves the machine) so that every kind of record a live run can
 * emit is produced — a fetched page with its headers, links and date claims, a robots-refused page, a network-failed page, the run
 * record and the cost entry — and hands each set to the caller's REAL governed-append builders. Those builders construct the exact
 * descriptors the live run will execute; constructing one runs the F06 evidence-state placement, which is where RR-105 failed. Nothing
 * is executed: no write, no audit append, no access grant is consumed. Any refusal stops the run with ZERO requests made.
 *
 * Pure of the network by construction: the only fetch it ever calls is its own in-process one, and it counts every call.
 */
import { crawl } from "./crawler.mjs";

export const PREFLIGHT_ORIGIN = "https://preflight.invalid";
const PAGE = '<html><head><meta property="article:published_time" content="2026-01-02"><script type="application/ld+json">{"datePublished":"2026-01-02"}</script></head>' +
  '<body><nav><a href="/a">nav</a></nav><main><a href="/x" aria-label="named">x</a><a href="/y"><img src="i" alt="alt"></a><a href="https://other.invalid/z">ext</a></main></body></html>';

/** An in-process site: robots allows /page and /error, refuses /blocked; /page answers with headers and a body; /error drops the connection. */
export function syntheticFetch() {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(String(url));
    const path = new URL(String(url)).pathname;
    if (path === "/robots.txt") return new Response("User-agent: *\nDisallow: /blocked\n", { status: 200, headers: { "content-type": "text/plain" } });
    if (path === "/error") throw new TypeError("preflight: synthetic network failure");
    return new Response(PAGE, { status: 200, headers: { "content-type": "text/html", "strict-transport-security": "max-age=1", "link": "<https://preflight.invalid/page>; rel=\"canonical\"", "last-modified": "Wed, 01 Jan 2025 00:00:00 GMT" } });
  };
  return { fetchImpl, calls };
}

/** Every record kind a live run can produce, made by the crawler's own code against the in-process site. */
export async function syntheticRecordSet() {
  const { fetchImpl, calls } = syntheticFetch();
  const result = await crawl({ seeds: ["/page", "/blocked", "/error"].map((p) => `${PREFLIGHT_ORIGIN}${p}`), seedSource: "RR-106-PREFLIGHT", fetchImpl, live: true, fetcherOptions: { intervalMs: 0, timeoutMs: 1000 } });
  const kinds = [...new Set([...result.observations.map((o) => `observation:${o.method}${o.value?.error ? ":error" : ""}`), ...result.evidence.map((e) => e.record_type)])].sort();
  return { result, calls, kinds };
}

/**
 * 🔴 A FAILED WRITE IS NEVER A SUCCESSFUL COLLECTION. RR-105 printed "CRAWL RUN … coverageState=COMPLETE" for pages it then failed to
 * keep. A run's collection verdict is KEPT only when EVERY governed write it depends on committed (or had already committed); anything
 * else — a refusal, a throw, an outcome not given — is NOT KEPT, with the writes that failed named. Fetching is not collecting.
 */
export const COLLECTED = Object.freeze({ KEPT: "KEPT", NOT_KEPT: "NOT KEPT" });
const KEPT_OUTCOMES = new Set(["COMMITTED", "ALREADY_COMMITTED"]);
/* RR-108: a live run also passes its measured PACING. A breach of the interval, or pacing not measured, is never a successful collection
 * — the records may be written and kept as evidence, but the verdict is NOT KEPT, with the breach named. */
export function collectionVerdict(outcomes, { pacing } = {}) {
  const failed = Object.entries(outcomes).filter(([, o]) => !KEPT_OUTCOMES.has(o)).map(([k, o]) => `${k}: ${o ?? "NOT_REACHED"}`);
  if (pacing !== undefined && pacing?.ok !== true) failed.push(pacing ? `pacing: ${pacing.breaches} of ${pacing.gaps} gap(s) under ${pacing.intervalMs} ms` : "pacing: NOT MEASURED");
  return failed.length === 0 && Object.keys(outcomes).length > 0 ? { verdict: COLLECTED.KEPT, failed } : { verdict: COLLECTED.NOT_KEPT, failed };
}

/**
 * The preflight itself. `build` holds the caller's REAL builders — { observations(records), run(run), cost(run) } — each returning the
 * descriptor the live run would execute (and throwing where the governed append would refuse). Returns one verdict per append.
 */
export async function preflightCrawlWrites({ build }) {
  const { result, calls, kinds } = await syntheticRecordSet();
  const external = calls.filter((u) => !u.startsWith(PREFLIGHT_ORIGIN));
  const checks = [];
  const attempt = (append, records, fn) => {
    try { fn(); checks.push({ append, records, ok: true }); } catch (e) { checks.push({ append, records, ok: false, why: `${e.code ?? e.name}: ${e.message}` }); }
  };
  attempt("observations and evidence", result.observations.length + result.evidence.length, () => build.observations([...result.observations, ...result.evidence]));
  attempt("run record", 1, () => build.run(result.run));
  attempt("cost entry", 1, () => build.cost(result.run));
  const ok = external.length === 0 && checks.every((c) => c.ok);
  return { ok, checks, kinds, syntheticCalls: calls.length, externalCalls: external.length, networkRequests: 0 };
}
