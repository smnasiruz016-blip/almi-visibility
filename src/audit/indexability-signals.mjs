/**
 * F21 · ROBOTS, SITEMAP, CANONICAL AND NOINDEX — COMPARE THE DECLARED SIGNALS AND EXPOSE THEIR CONTRADICTIONS
 * (acceptance _handoffs 804ebd1, RR-86; spec row: "Compare declared discovery and indexability signals and expose contradictions").
 *
 * ── THE FOUR SIGNALS, PER IN-SCOPE URL (recorded or UNKNOWN, never inferred) ───────────────────────────
 *
 *   ROBOTS    ALLOWED / DISALLOWED for the search crawler's group of the origin's recorded robots.txt (a recorded 4xx means no
 *             rules: ALLOWED); UNKNOWN when no robots record exists, it errored, or it answered 5xx.
 *   SITEMAP   LISTED when the client's stored sitemap lists it; NOT_LISTED only when that sitemap was read COMPLETE and stored in
 *             full; otherwise UNKNOWN.
 *   CANONICAL from the served HTML (EVERY rel=canonical tag): SELF / OTHER / CONFLICTING / NONE, or UNKNOWN (no stored, untruncated
 *             body). The response-header half is read only where the collector RECORDED the Link header; where it did not, the
 *             header half is NOT_RECORDED — which can never make a URL CONSISTENT, only fail to rule a contradiction out.
 *   NOINDEX   NOINDEX / INDEXABLE from the robots meta tag and X-Robots-Tag, the header counted only where the collector RECORDED it
 *             (then its absence is a measured absence); UNKNOWN without a stored body, or with an unrecorded header and no meta noindex.
 *
 * ── THE CONTRADICTIONS (two known signals that cannot both hold) ────────────────────────────────────
 *
 *   K1 LISTED + DISALLOWED · K2 LISTED + NOINDEX · K3 LISTED + CANONICAL OTHER · K4 CANONICAL OTHER → a target DISALLOWED, NOINDEX
 *   or not served 200 · K5 CONFLICTING canonical declarations · K6 NOINDEX + CANONICAL OTHER
 *
 * ── THREE URL STATES, NEVER TWO ─────────────────────────────────────────────────────────────────────
 *
 *   CONTRADICTED  at least one class holds (both its signals known and in conflict)
 *   CONSISTENT    every class was judged and none holds
 *   NOT_MEASURED  no class holds, but at least one could not be judged — its reason is kept
 *
 * Pure: it is handed one client's recorded data and prints nothing. URLs are compared in canonical form, so two spellings of one
 * URL are one URL. No product is named here.
 */
import { canonicalUrl, targetPageId } from "../evidence/ids.mjs";
import { parseHead, noindexState } from "./technical-checks.mjs";
import { parseGroups, selectGroup, decide } from "./robots-scope.mjs";
import { HEADER_SUBSET } from "../crawl/fetcher.mjs";

export const URL_STATES = Object.freeze({ CONTRADICTED: "CONTRADICTED", CONSISTENT: "CONSISTENT", NOT_MEASURED: "NOT_MEASURED" });
export const CLASSES = Object.freeze(["K1", "K2", "K3", "K4", "K5", "K6"]);
export const CLASS_MEANING = Object.freeze({
  K1: "listed in the sitemap and disallowed by robots",
  K2: "listed in the sitemap and noindex",
  K3: "listed in the sitemap and canonical to another URL",
  K4: "canonical to a target that is disallowed, noindex or not served 200",
  K5: "conflicting canonical declarations",
  K6: "noindex and canonical to another URL",
});
export const SEARCH_AGENT = "Googlebot";

/** Which response headers each collector version RECORDED. An observation from any other collector: its headers are UNKNOWN. */
/* RR-104: a v0.2 crawl observation still carries exactly the v0.1 subset; its wider allowlist lives in its own response_headers record. */
export const RECORDED_HEADERS = Object.freeze({ "src/crawl/crawler.mjs@0.1": HEADER_SUBSET, "src/crawl/crawler.mjs@0.2": HEADER_SUBSET });

const canon = (u, base) => { try { return canonicalUrl(base ? new URL(u, base).href : u); } catch { return null; } };
const originOf = (u) => { const c = canon(u); return c ? new URL(c).origin : null; };
const servedOk = (o) => Number.isInteger(o?.value?.status) && !o?.value?.error && !o?.value?.skipped;

/** Every rel=canonical href in served HTML, resolved against the page. */
export function htmlCanonicals(html, pageUrl) {
  const s = String(html ?? "");
  return [...s.matchAll(/<link\b[^>]*rel\s*=\s*["']canonical["'][^>]*>/gi)].map((m) => {
    const href = /href\s*=\s*["']([^"']*)["']/i.exec(m[0])?.[1] ?? null;
    return href === null ? null : canon(href, pageUrl);
  });
}

/** The robots decider for one origin, from its recorded robots.txt observation (or null). */
export function robotsFor(record) {
  const v = record?.value;
  if (!v) return { known: false, reason: "NO_ROBOTS_RECORD", ref: null };
  if (v.fetchError) return { known: false, reason: "ROBOTS_FETCH_ERROR", ref: record.observation_id };
  const status = Number(v.httpStatus);
  if (status >= 400 && status < 500) return { known: true, allows: () => true, ref: record.observation_id, basis: "ROBOTS_4XX_NO_RULES" };
  if (!(status >= 200 && status < 300) || typeof v.body !== "string") return { known: false, reason: "ROBOTS_NOT_READABLE", ref: record.observation_id };
  const group = selectGroup(parseGroups(v.body), SEARCH_AGENT);
  return { known: true, allows: (url) => decide(group, url).allowed, ref: record.observation_id, basis: `GROUP_${group.matchedBy}` };
}

/**
 * @param {object} input
 * @param {string[]} input.origins         the client's declared site origins
 * @param {object[]} input.observations    the client's crawl observations (its partition)
 * @param {Map<string,string>} input.bodies stored bodies by observation id (its partition)
 * @param {object[]} input.sitemaps        the client's sitemap observations (its partition)
 * @param {object[]} input.robots          the client's robots.txt observations (its row partition)
 */
export function indexabilitySignals({ origins = [], observations = [], bodies = new Map(), sitemaps = [], robots = [], recordedHeaders = RECORDED_HEADERS }) {
  const scope = [...new Set(origins.map((o) => originOf(o) ?? String(o)))];
  const inScope = (u) => scope.includes(originOf(u));
  const robotsByOrigin = new Map(scope.map((o) => [o, robotsFor(robots.find((r) => originOf(r.value?.url ?? r.value?.finalUrl) === o))]));

  /* SITEMAP: what is listed, and whether "not listed" can be said */
  const listed = new Map();
  const complete = new Map();
  for (const s of sitemaps.filter((x) => scope.includes(originOf(x.value?.origin ?? x.value?.rootUrl)))) {
    const o = originOf(s.value.origin ?? s.value.rootUrl);
    const v = s.value;
    complete.set(o, v.coverageState === "COMPLETE" && (v.childrenSkipped ?? 0) === 0 && Number.isInteger(v.urlsTotal) && v.urlsStored === v.urlsTotal);
    for (const u of v.urls ?? []) { const c = canon(typeof u === "string" ? u : u?.loc ?? u?.url); if (c && inScope(c)) listed.set(c, s.observation_id); }
  }

  /* the latest served observation per canonical URL */
  const observed = new Map();
  for (const o of observations.filter((x) => inScope(x.value?.final_url ?? x.value?.requested_url))) {
    for (const u of [o.value?.requested_url, o.value?.final_url]) {
      const c = canon(u);
      if (!c) continue;
      const prev = observed.get(c);
      if (!prev || String(o.observed_at) > String(prev.observed_at)) observed.set(c, o);
    }
  }

  const signalsOf = (url) => {
    const o = observed.get(url);
    const r = robotsByOrigin.get(originOf(url)) ?? { known: false, reason: "OUT_OF_SCOPE" };
    const robotsSig = r.known ? { state: r.allows(url) ? "ALLOWED" : "DISALLOWED", source: r.ref } : { state: "UNKNOWN", reason: r.reason, source: r.ref ?? null };
    const sitemapSig = listed.has(url) ? { state: "LISTED", source: listed.get(url) }
      : complete.get(originOf(url)) ? { state: "NOT_LISTED", source: null } : { state: "UNKNOWN", reason: "SITEMAP_NOT_FULLY_STORED" };
    const recorded = o ? recordedHeaders[`${o.collector}@${o.collector_version}`] ?? null : null;
    const body = o && servedOk(o) && bodies.has(o.observation_id) && o.value?.truncated !== true ? bodies.get(o.observation_id) : null;
    let canonicalSig;
    if (body === null) canonicalSig = { state: "UNKNOWN", reason: o ? "NO_USABLE_BODY" : "NOT_OBSERVED" };
    else {
      const tags = htmlCanonicals(body, url);
      const targets = [...new Set(tags.filter(Boolean))];
      const html = tags.length === 0 ? "NONE" : tags.some((t) => t === null) || targets.length > 1 ? "CONFLICTING" : targets[0] === url ? "SELF" : "OTHER";
      canonicalSig = { state: html, target: html === "OTHER" ? targets[0] : null, header: recorded?.includes("link") ? "RECORDED" : "NOT_RECORDED", source: o.observation_id };
    }
    let noindexSig;
    if (!o || !servedOk(o)) noindexSig = { state: "UNKNOWN", reason: o ? "NOT_SERVED" : "NOT_OBSERVED" };
    else {
      const headerRecorded = Array.isArray(recorded) && recorded.includes("x-robots-tag");
      const xr = o.value?.response_headers_subset?.["x-robots-tag"] ?? null;
      const meta = body === null ? null : parseHead(body).metaRobots;
      const s = noindexState({ metaRobots: meta ?? [], xRobotsTag: headerRecorded ? xr : null });
      noindexSig = s.noindexed ? { state: "NOINDEX", source: o.observation_id }
        : meta !== null && headerRecorded ? { state: "INDEXABLE", source: o.observation_id }
          : { state: "UNKNOWN", reason: meta === null ? "NO_USABLE_BODY" : "HEADER_NOT_RECORDED", source: o.observation_id };
    }
    return { robots: robotsSig, sitemap: sitemapSig, canonical: canonicalSig, noindex: noindexSig, observation: o ?? null };
  };

  const cache = new Map();
  const signals = (url) => { if (!cache.has(url)) cache.set(url, signalsOf(url)); return cache.get(url); };

  /* each class: true (holds) / false (judged, does not hold) / null (cannot be judged) */
  const judge = (url) => {
    const s = signals(url);
    const listedKnown = s.sitemap.state !== "UNKNOWN";
    const isListed = s.sitemap.state === "LISTED";
    const canonKnown = s.canonical.state !== "UNKNOWN";
    const canonOther = s.canonical.state === "OTHER";
    const headerOpen = canonKnown && s.canonical.header !== "RECORDED";
    const k = {};
    k.K1 = !listedKnown ? null : !isListed ? false : s.robots.state === "UNKNOWN" ? null : s.robots.state === "DISALLOWED";
    k.K2 = !listedKnown ? null : !isListed ? false : s.noindex.state === "UNKNOWN" ? null : s.noindex.state === "NOINDEX";
    k.K3 = !listedKnown ? null : !isListed ? false : canonOther ? true : !canonKnown || headerOpen ? null : false;
    if (canonOther) {
      const t = s.canonical.target;
      const ts = inScope(t) ? signals(t) : null;
      const bad = ts && (ts.robots.state === "DISALLOWED" || ts.noindex.state === "NOINDEX" || (ts.observation && (!servedOk(ts.observation) || ts.observation.value.status !== 200)));
      const allKnown = ts && ts.robots.state !== "UNKNOWN" && ts.noindex.state !== "UNKNOWN" && ts.observation !== null;
      k.K4 = bad ? true : allKnown ? false : null;
    } else k.K4 = !canonKnown || headerOpen ? null : false;
    k.K5 = s.canonical.state === "CONFLICTING" ? true : !canonKnown || headerOpen ? null : false;
    k.K6 = s.noindex.state === "NOINDEX" && canonOther ? true
      : s.noindex.state === "INDEXABLE" ? false
        : s.noindex.state === "NOINDEX" ? (!canonKnown || headerOpen ? null : false)
          : canonKnown && !canonOther && !headerOpen ? false : null;
    const holds = CLASSES.filter((c) => k[c] === true);
    const unjudged = CLASSES.filter((c) => k[c] === null);
    const state = holds.length ? URL_STATES.CONTRADICTED : unjudged.length ? URL_STATES.NOT_MEASURED : URL_STATES.CONSISTENT;
    const sources = [s.robots.source, s.sitemap.source, s.canonical.source, s.noindex.source].filter(Boolean);
    return Object.freeze({ pageId: targetPageId(url), state, classes: Object.freeze(holds), unjudged: Object.freeze(unjudged), signals: Object.freeze({ robots: s.robots.state, sitemap: s.sitemap.state, canonical: s.canonical.state, canonicalHeader: s.canonical.header ?? null, noindex: s.noindex.state }), sources: Object.freeze([...new Set(sources)]) });
  };

  const population = [...new Set([...observed.keys(), ...listed.keys()])].sort();
  const urls = population.map(judge);
  const count = (st) => urls.filter((u) => u.state === st).length;
  const byClass = Object.fromEntries(CLASSES.map((c) => [c, urls.filter((u) => u.classes.includes(c)).length]));
  const unjudgedByClass = Object.fromEntries(CLASSES.map((c) => [c, urls.filter((u) => u.unjudged.includes(c)).length]));
  return Object.freeze({
    urls: Object.freeze(urls),
    counts: Object.freeze({ CONTRADICTED: count(URL_STATES.CONTRADICTED), CONSISTENT: count(URL_STATES.CONSISTENT), NOT_MEASURED: count(URL_STATES.NOT_MEASURED) }),
    byClass: Object.freeze(byClass),
    unjudgedByClass: Object.freeze(unjudgedByClass),
    bound: `recorded data only · ${urls.length} in-scope URL(s) (${observed.size} observed, ${listed.size} listed in the stored sitemap) · ${[...observed.values()].filter((o) => bodies.has(o.observation_id)).length} stored bodies · robots known for ${[...robotsByOrigin.values()].filter((r) => r.known).length} of ${scope.length} origin(s)`,
  });
}
