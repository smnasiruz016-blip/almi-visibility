/**
 * DETECTOR C — THE DECLARED RENDER/CACHE MODE AGAINST THE STATE ACTUALLY SERVED.
 *
 * A route declares how it is meant to be delivered — prerendered, revalidated, cached, dynamic. The
 * stored response says how it actually WAS delivered. This compares the two.
 *
 * 🔴 IT REUSES THE EXISTING MEASUREMENTS AND RE-MEASURES NOTHING. `parseHead` and `noindexState`
 * (src/audit/technical-checks.mjs) already read a served document's head and decide indexability;
 * this module imports them rather than writing a second parser, because two parsers disagreeing
 * about one page is a defect class of its own and this project has already shipped it once.
 *
 * 🔴 ONE OBSERVATION IS NOT A CACHE MEASUREMENT. A single MISS proves nothing — a cold cache
 * misses once and is still a cache. A declared-cached route is only contradicted by a RUN of
 * consecutive misses, and the run length is a required parameter with NO DEFAULT, so nobody can
 * quietly weaken it to make a page pass or fail.
 */
import { finding, clean, unknown, notApplicable } from "./outcome.mjs";
import { parseHead, noindexState } from "../audit/technical-checks.mjs";

const DETECTOR = "declared-vs-served";

/** Delivery modes a route may DECLARE. A mode outside this set is not guessed at — it is UNKNOWN. */
export const DECLARED_MODES = Object.freeze(["CACHED", "UNCACHED"]);

const header = (headers, name) => {
  if (!headers) return null;
  const hit = Object.entries(headers).find(([k]) => k.toLowerCase() === name.toLowerCase());
  return hit ? String(hit[1]) : null;
};

/** A response is a cache MISS when the cache status says so, or when the directives forbid storing. */
function missSignals(h) {
  const cacheStatus = header(h, "x-vercel-cache") ?? header(h, "cf-cache-status") ?? header(h, "x-cache");
  const cacheControl = header(h, "cache-control");
  const noStore = cacheControl !== null && /no-store|private/i.test(cacheControl);
  return { cacheStatus, cacheControl, noStore };
}

/**
 * @param {{id:string, locator:string, declaredMode:string, responses:{headers:object, html?:string}[]}[]} routes
 * @param {number} missRunRequired  consecutive misses required before a declared-CACHED route is contradicted
 */
export function detectDeclaredVsServed({ routes, missRunRequired } = {}) {
  if (!Array.isArray(routes)) {
    return [unknown({ detector: DETECTOR, subject: "(input)", reasonCode: "INPUT_ABSENT", detail: "no route list was supplied" })];
  }
  if (!Number.isInteger(missRunRequired) || missRunRequired < 1) {
    /* 🔴 NO DEFAULT. A threshold this detector's verdict turns on may not be supplied by the
     * detector itself, or it becomes a dial someone can quietly move after seeing a result. */
    return routes.map((r) => unknown({
      detector: DETECTOR, subject: r?.id ?? "(unnamed route)", reasonCode: "INPUT_ABSENT",
      detail: `missRunRequired must be an integer >= 1, got ${JSON.stringify(missRunRequired)} — this detector supplies no default for its own threshold`,
    }));
  }

  const out = [];
  for (const r of routes) {
    const id = r?.id ?? "(unnamed route)";
    if (r?.declaredMode === null || r?.declaredMode === undefined) {
      /* 🔴 NO DECLARATION IS NOT AN UNRESOLVED CANDIDATE — IT IS NO CANDIDATE.
       *
       * This comparator judges a DECLARED mode against a served one. A route that declares no mode
       * makes no claim of this kind, so there is nothing here to contradict. Answering UNKNOWN would
       * say "a claim exists and I could not judge it", which is false, and on a clean page that
       * false UNKNOWN is fatal: under Amendment 2 an UNKNOWN on a control fails the control. */
      out.push(notApplicable({
        detector: DETECTOR, subject: id, reasonCode: "NO_CANDIDATE_OF_THIS_KIND",
        examined: [`${r?.locator ?? id}`, "the serving source declares no delivery mode (no dynamic, revalidate or fetchCache export)"],
        summary: "the route declares no delivery mode, so there is no declaration for the served state to contradict",
      }));
      continue;
    }
    if (!DECLARED_MODES.includes(r.declaredMode)) {
      out.push(unknown({ detector: DETECTOR, subject: id, reasonCode: "EVIDENCE_INCOMPLETE", detail: `declaredMode is ${JSON.stringify(r.declaredMode)}, not one of ${DECLARED_MODES.join(", ")} — a mode was declared and this comparator cannot read it` }));
      continue;
    }
    const responses = Array.isArray(r.responses) ? r.responses : [];
    if (responses.length === 0) {
      out.push(unknown({ detector: DETECTOR, subject: id, reasonCode: "INPUT_ABSENT", detail: "no stored response was supplied for this route" }));
      continue;
    }
    const signals = responses.map((res) => missSignals(res.headers));
    if (signals.every((s) => s.cacheStatus === null && s.cacheControl === null)) {
      out.push(unknown({ detector: DETECTOR, subject: id, reasonCode: "EVIDENCE_INCOMPLETE", detail: `none of the ${responses.length} stored response(s) carries a cache status or cache-control header` }));
      continue;
    }

    const misses = signals.filter((s) => (s.cacheStatus !== null && /miss/i.test(s.cacheStatus)) || s.noStore).length;
    const where = `${r.locator ?? id} · declared ${r.declaredMode} · ${responses.length} stored response(s)`;
    const detail = signals.map((s, n) => `#${n + 1} cache-status=${s.cacheStatus ?? "(none)"} cache-control=${s.cacheControl ?? "(none)"}`);

    /* Indexability is read through the EXISTING head parser, not a second one. */
    const head = responses[0]?.html ? parseHead(responses[0].html) : null;
    const indexState = head ? noindexState({ metaRobots: head.metaRobots, xRobotsTag: header(responses[0].headers, "x-robots-tag") }) : null;
    if (indexState) detail.push(`indexability (via the shared head parser): ${JSON.stringify(indexState)}`);

    if (r.declaredMode === "CACHED" && misses >= missRunRequired) {
      out.push(finding({
        detector: DETECTOR, subject: id,
        defectClass: "declared-mode-contradicted-by-served-state",
        evidence: [where, `${misses} of ${responses.length} response(s) were misses or non-storable; the run required is ${missRunRequired}`, ...detail],
        summary: `the route declares ${r.declaredMode} and the stored responses show it is not being served that way`,
      }));
      continue;
    }
    if (r.declaredMode === "UNCACHED" && misses === 0 && signals.some((s) => s.cacheStatus !== null && /hit/i.test(s.cacheStatus))) {
      out.push(finding({
        detector: DETECTOR, subject: id,
        defectClass: "declared-mode-contradicted-by-served-state",
        evidence: [where, "the route declares UNCACHED and every stored response was served from cache", ...detail],
        summary: "the route declares UNCACHED and the stored responses show it is being cached",
      }));
      continue;
    }
    out.push(clean({
      detector: DETECTOR, subject: id,
      checked: [where, `misses observed: ${misses} of ${responses.length} (run required to contradict: ${missRunRequired})`, ...detail],
      summary: "the served state is consistent with the declared mode",
    }));
  }
  return out;
}
