/**
 * 🔴 WHAT A RENDER WAS ABLE TO SEE — COMPLETE, PARTIAL OR FAILED. NOTHING ELSE.
 *
 * Pure: it reads a record of what happened during one render and names the
 * state. It judges no page. It knows nothing about the served HTML and never
 * compares a render against it — that comparison is a DETECTOR, and a detector
 * is written under the sealed exam rule (Owner Ruling 7), not here.
 *
 *   COMPLETE  the document was served from 127.0.0.1 and the page asked for
 *             nothing else — so nothing it wanted was withheld.
 *   PARTIAL   the document rendered, but at least one request was REFUSED by the
 *             offline renderer (or the page did not settle inside its bound).
 *   FAILED    there is no render to speak of: the document was never served,
 *             navigation failed, the renderer crashed, or a request escaped the
 *             interception and so the render cannot say what it saw.
 *
 * ── 🔴 LAW-ABSENT-1 — A REFUSED SCRIPT IS A FACT ABOUT OUR ENVIRONMENT ───────
 *
 * The renderer is offline by construction: every request to anything other than
 * the one local document is refused. A script that did not load did not load
 * HERE. So ONE refusal makes the render PARTIAL, and the reason says whose fact
 * it is. A render that could only be COMPLETE by ignoring what it refused would
 * let a downstream reader take "the page has no X" from "we did not fetch X".
 *
 * This module names no product.
 */

export const RENDER_STATES = Object.freeze(["COMPLETE", "PARTIAL", "FAILED"]);
export const REQUEST_OUTCOMES = Object.freeze(["SERVED_LOCAL", "REFUSED"]);

const state = (renderState, reason) => Object.freeze({ renderState, reason });

/**
 * @param {object}   r
 * @param {boolean}  r.documentServed   the one document was fulfilled from 127.0.0.1
 * @param {string?}  r.navigationError  first line of a navigation error, if any
 * @param {boolean}  r.crashed          the renderer process crashed
 * @param {object[]} r.requests         every request the interception handled: { host, resourceType, outcome }
 * @param {number}   r.unaccounted      requests the browser issued that the interception never handled
 * @param {boolean}  r.timedOut         the page did not settle inside the per-page bound
 */
export function renderStateOf({ documentServed = false, navigationError = null, crashed = false, requests = [], unaccounted = 0, timedOut = false } = {}) {
  for (const q of requests) {
    if (!REQUEST_OUTCOMES.includes(q.outcome)) throw new TypeError(`renderStateOf: request outcome ${JSON.stringify(q.outcome)} is not one of ${REQUEST_OUTCOMES.join("|")}`);
  }
  if (crashed) return state("FAILED", "the renderer process crashed before the DOM could be read");
  if (!documentServed) return state("FAILED", "the document was never served from 127.0.0.1 — nothing was rendered");
  if (navigationError) return state("FAILED", `navigation failed: ${navigationError}`);
  if (unaccounted > 0) {
    return state("FAILED", `${unaccounted} request(s) were issued that the interception neither served nor refused — this render cannot say what it saw`);
  }
  const refused = requests.filter((q) => q.outcome === "REFUSED");
  if (refused.length > 0) {
    const hosts = new Set(refused.map((q) => q.host)).size;
    return state(
      "PARTIAL",
      `${refused.length} request(s) to ${hosts} host(s) were REFUSED by the offline renderer — what did not load did not load IN THIS ENVIRONMENT, which is a fact about the renderer, not about the page (LAW-ABSENT-1)` +
        (timedOut ? "; and the page did not settle inside the per-page bound" : ""),
    );
  }
  if (timedOut) return state("PARTIAL", "the page did not settle inside the per-page bound, so the DOM was read before it finished");
  return state("COMPLETE", "the document was served from 127.0.0.1 and the page requested nothing else");
}

/** The per-page resource record: what was attempted and refused, by host and by kind. */
export function summariseRequests(requests) {
  const byHost = {};
  const refusedByType = {};
  for (const q of requests) {
    const h = (byHost[q.host] ??= { attempted: 0, refused: 0 });
    h.attempted += 1;
    if (q.outcome === "REFUSED") {
      h.refused += 1;
      refusedByType[q.resourceType] = (refusedByType[q.resourceType] ?? 0) + 1;
    }
  }
  const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
  return {
    attempted: requests.length,
    servedLocal: requests.filter((q) => q.outcome === "SERVED_LOCAL").length,
    refused: requests.filter((q) => q.outcome === "REFUSED").length,
    byHost: sorted(byHost),
    refusedByType: sorted(refusedByType),
  };
}
