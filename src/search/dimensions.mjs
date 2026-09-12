/**
 * ITEM 9 — THE SEVEN DIMENSIONS, AND WHICH OF THEM THE EVIDENCE STORE HOLDS.
 *
 * The boundary: *"an authorized property and the seven dimensions the PASS
 * meaning names: queries, pages, countries, impressions, clicks, CTR, downstream
 * outcomes"* — EXPECTED *"all seven ingested, paginated to exhaustion, with
 * every bound printed"*. Its NOTE: *"where authorized and available" — a
 * dimension no tool can supply is ⚠, not a failure.*
 *
 * ── 🔴 A DIMENSION IS INGESTED ONLY IF THE STORE PROVES IT ──────────────────
 *
 * Not because the code for it exists, and not because a pull ran once and came
 * back short of complete. INGESTED requires a stored observation for one of the
 * dimension's pulls that is `exhausted`, `dataState: COMPLETE`, and carries its
 * row count, request count and both bounds. Code that exists and has not run is
 * BUILT_NOT_RUN — the difference item 9 turns on today.
 *
 * ── 🔴 DOWNSTREAM OUTCOMES IS DECLARED BLOCKED, WITH ITS EVIDENCE ───────────
 *
 * It is not invented, and clicks are not stretched into it. A click is a search
 * result being chosen; an outcome is what the visitor did afterwards, and no
 * data this engine can read connects the two.
 */

import { RECOMMENDATION_FIELDS, DEMAND_WORDS } from "../audit/content-checks.mjs";

/**
 * 🔴 ITEM 8's GUARD, APPLIED TO A COUNTRY MEASUREMENT. A stored country row may
 * carry where impressions happened and nothing that reads as what to do about
 * it. Returns every violation; an empty array is the only lawful answer. Shares
 * item 8's own lists rather than a copy.
 */
export function measurementOnlyViolations(value) {
  const out = [];
  const walk = (v, path) => {
    if (Array.isArray(v)) return v.forEach((x, i) => walk(x, `${path}[${i}]`));
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) {
        if (RECOMMENDATION_FIELDS.includes(k)) out.push(`${path}.${k}: a recommendation field`);
        walk(x, `${path}.${k}`);
      }
    }
  };
  walk(value, "value");
  const text = JSON.stringify(value).toLowerCase();
  for (const w of DEMAND_WORDS) if (text.includes(w)) out.push(`demand word "${w}"`);
  return out;
}

/** Why outcomes cannot be supplied today. Every clause is a measurement taken on 12 September 2026. */
export const OUTCOMES_BLOCKED_BECAUSE = Object.freeze([
  "the Search Console API has no outcome dimension — it reports searches, impressions, clicks, CTR and position, nothing after the click",
  "this engine's only credential is scoped webmasters.readonly; it holds no analytics scope and no analytics property",
  "0 of 36 product repositories in the estate declare a third-party analytics package, and no product layout loads an analytics tag",
  "one product repository holds a first-party funnel-event table, but its allow-listed payload keys carry a path and a user id and NO search source, so an outcome in it cannot be attributed to a query or a landing from search",
  "this engine holds no authorization to read any product database, and acquiring one would be a production read the owner has not granted",
]);

/**
 * The seven, in the boundary's order. `pulls` name stored observation methods
 * (`gsc.searchAnalytics.query:<pull>`); `field` names a metric that must be
 * present on the rows of a COMPLETE pull.
 */
export const PASS_DIMENSIONS = Object.freeze([
  Object.freeze({ dimension: "queries", pulls: ["query", "query-page", "country-query"] }),
  Object.freeze({ dimension: "pages", pulls: ["page-rows", "query-page"] }),
  Object.freeze({ dimension: "countries", pulls: ["country", "country-query"] }),
  Object.freeze({ dimension: "impressions", field: "impressions" }),
  Object.freeze({ dimension: "clicks", field: "clicks" }),
  Object.freeze({ dimension: "CTR", field: "ctr" }),
  Object.freeze({ dimension: "downstream outcomes", pulls: [], blocked: OUTCOMES_BLOCKED_BECAUSE }),
]);

/** The pulls `src/search/ingest.mjs` issues. A dimension naming a pull absent from here is not built. */
export const BUILT_PULLS = Object.freeze(["page-rows", "by-page", "query", "query-page", "country", "country-query"]);

export const DIMENSION_STATES = Object.freeze(["INGESTED", "BUILT_NOT_RUN", "BLOCKED", "MISSING"]);

const PREFIX = "gsc.searchAnalytics.query:";

/** A stored pull that proves its own completeness — or null. */
function provenPull(obs) {
  const v = obs.value ?? {};
  const bounded = Number.isInteger(v.rowLimitPerRequest) && Number.isInteger(v.maxRequests);
  const counted = Number.isInteger(v.rowCount) && (Number.isInteger(v.requestCount) || obs.method.endsWith(":page-rows"));
  return v.dataState === "COMPLETE" && (v.exhausted === true || obs.method.endsWith(":page-rows")) && bounded && counted;
}

/**
 * @param {Array} records every record in the evidence store
 * @returns {{ dimensions: Array, pulls: Array, ingested: number, blocked: number, builtNotRun: number, missing: number }}
 */
export function dimensionCensus(records) {
  const latest = new Map();
  for (const r of records) {
    if (r.record_type !== "observation" || typeof r.method !== "string" || !r.method.startsWith(PREFIX)) continue;
    const pull = r.method.slice(PREFIX.length);
    if (!latest.has(pull) || latest.get(pull).observed_at < r.observed_at) latest.set(pull, r);
  }

  const pulls = [...latest.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([pull, r]) => ({
    pull,
    observedAt: r.observed_at,
    startDate: r.value?.startDate ?? null,
    endDate: r.value?.endDate ?? null,
    rowCount: r.value?.rowCount ?? null,
    requestCount: r.value?.requestCount ?? null,
    rowLimitPerRequest: r.value?.rowLimitPerRequest ?? null,
    maxRequests: r.value?.maxRequests ?? null,
    exhausted: r.value?.exhausted ?? null,
    dataState: r.value?.dataState ?? null,
    proven: provenPull(r),
  }));
  const proven = new Map(pulls.filter((p) => p.proven).map((p) => [p.pull, latest.get(p.pull)]));

  const dimensions = PASS_DIMENSIONS.map((d) => {
    if (d.blocked) return { dimension: d.dimension, state: "BLOCKED", evidence: d.blocked };
    if (d.field) {
      const carriers = [...proven.entries()].filter(([, r]) =>
        Array.isArray(r.value?.rows) && r.value.rows.length > 0 && r.value.rows.every((row) => typeof row[d.field] === "number"));
      return carriers.length
        ? { dimension: d.dimension, state: "INGESTED", evidence: carriers.map(([p]) => p) }
        : { dimension: d.dimension, state: "MISSING", evidence: [] };
    }
    const hit = d.pulls.filter((p) => proven.has(p));
    if (hit.length) return { dimension: d.dimension, state: "INGESTED", evidence: hit };
    return d.pulls.some((p) => BUILT_PULLS.includes(p))
      ? { dimension: d.dimension, state: "BUILT_NOT_RUN", evidence: d.pulls.filter((p) => BUILT_PULLS.includes(p)) }
      : { dimension: d.dimension, state: "MISSING", evidence: [] };
  });

  const count = (s) => dimensions.filter((d) => d.state === s).length;
  return {
    dimensions,
    pulls,
    ingested: count("INGESTED"),
    builtNotRun: count("BUILT_NOT_RUN"),
    blocked: count("BLOCKED"),
    missing: count("MISSING"),
  };
}

/**
 * 🔴 DOES ITEM 9 TICK? Only when every dimension is INGESTED. Six of seven is not
 * a tick. Where the only shortfall is BLOCKED dimensions, the NOTE makes that ⚠
 * rather than a failure — which is still NOT a pass, and is reported as its own
 * answer rather than rounded up.
 */
export function item9Verdict(c) {
  if (c.ingested === PASS_DIMENSIONS.length) return "ALL_SEVEN_INGESTED";
  if (c.missing === 0 && c.builtNotRun === 0) return "ONLY_BLOCKED_DIMENSIONS_SHORT";
  return "NOT_ALL_INGESTED";
}
