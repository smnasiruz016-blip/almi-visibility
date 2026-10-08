/**
 * F31 · IS A CLIENT'S EXISTING-PAGE LIST COMPLETE? — one verdict, with its basis (acceptance _handoffs 3a8f7ba, RR-85).
 *
 * The spec's F31 row asks for "stable identity, fingerprints, served state, ownership and evidence for known URLs"; the owner's RR-85
 * adds the question every page decision depends on: is the list of known URLs the WHOLE list for this client's scope? V3 §17.1:
 * "Discovered and crawled status must be known."
 *
 * ── THE FOUR STATES (plus STALE), NEVER COLLAPSED ────────────────────────────────────────────────────
 *
 *   OUT_OF_SCOPE  the client's tenant has no declared site origin — there is no scope to be complete about.
 *   INCOMPLETE    a recorded source NAMES an in-scope URL no observation covers with a served state, or an in-scope enumeration was
 *                 cut short (a sitemap not fully read or not fully stored, a truncated body, a robots or fetch gap). Counted.
 *   UNKNOWN       nothing known to be missing, but a discovery record is missing for an origin, or no freshness rule is declared.
 *   COMPLETE      every in-scope URL the scope's recorded sitemaps list and its observed pages link to has an observation with a
 *                 served state, nothing was cut short, and a freshness rule is declared.
 *   STALE         a COMPLETE whose freshness rule has run out.
 *
 * INCOMPLETE takes precedence over UNKNOWN: a known gap is a stronger fact than a missing record.
 *
 * ── WHAT COMPLETE MEANS, AND DOES NOT ──────────────────────────────────────────────────────────────
 *
 * METHOD "RECORDED_SITEMAPS_AND_LINKS": complete as DISCOVERABLE by the named recorded sources, as of the EARLIEST evidence used (the
 * picture is only as old as its oldest part). A page no recorded sitemap lists and no observed page links to cannot be discovered
 * from recorded data; COMPLETE never claims it. The freshness window counts from that as-of time.
 *
 * Pure. It reads nothing and decides from what it is handed; the loader (src/page/existing-page-population.mjs) supplies the client's
 * own partitions. No product, host or URL is printed by anything here.
 */
import { canonicalUrl } from "../evidence/ids.mjs";

export const COMPLETENESS = Object.freeze({ COMPLETE: "COMPLETE", INCOMPLETE: "INCOMPLETE", UNKNOWN: "UNKNOWN", OUT_OF_SCOPE: "OUT_OF_SCOPE", STALE: "STALE" });
export const COMPLETENESS_METHOD = "RECORDED_SITEMAPS_AND_LINKS";
export const COMPLETENESS_REASONS = Object.freeze({
  NO_ORIGIN: "NO_DECLARED_ORIGIN_IN_SCOPE",
  LISTED_UNOBSERVED: "A_SITEMAP_LISTS_UNOBSERVED_IN_SCOPE_URLS",
  LINKED_UNOBSERVED: "OBSERVED_PAGES_LINK_TO_UNOBSERVED_IN_SCOPE_URLS",
  SITEMAP_CUT_SHORT: "A_SITEMAP_WAS_NOT_FULLY_READ_OR_STORED",
  BODY_TRUNCATED: "AN_IN_SCOPE_BODY_WAS_TRUNCATED",
  NO_SERVED_STATE: "AN_IN_SCOPE_URL_WAS_REQUESTED_WITHOUT_A_SERVED_STATE",
  /* F31 C9 (Amendment 1, RR-223): a newer declared crawl run whose own record says it was not COMPLETE */
  CRAWL_CUT_SHORT: "A_NEWER_CRAWL_RUN_WAS_CUT_SHORT",
  NO_SITEMAP: "AN_ORIGIN_HAS_NO_RECORDED_SITEMAP",
  NO_OBSERVATION: "THE_SCOPE_HAS_NO_OBSERVATION",
  NO_FRESHNESS_RULE: "NO_FRESHNESS_RULE_IS_DECLARED",
  EXPIRED: "THE_FRESHNESS_RULE_HAS_RUN_OUT",
  ALL_OBSERVED: "EVERY_DISCOVERABLE_IN_SCOPE_URL_HAS_A_SERVED_STATE",
});

const DAY_MS = 86400000;
const canon = (u) => { try { return canonicalUrl(String(u)); } catch { return null; } };
/* The same origin form the tenancy declarations use (src/adapter/observed-page-subject.mjs pageOriginRef). */
const originOf = (u) => { const c = canon(u); return c ? new URL(c).origin : null; };
const listedUrls = (v) => (Array.isArray(v?.urls) ? v.urls : []).map((u) => canon(typeof u === "string" ? u : u?.loc ?? u?.url)).filter(Boolean);
/** An observation's served state is known when a response came back: a status, no error, not skipped. */
export const hasServedState = (o) => Number.isInteger(o?.value?.status) && !o?.value?.error && !o?.value?.skipped;

/**
 * @param {object} input
 * @param {string[]} input.origins        the site origins declared to the client's tenant (the scope)
 * @param {object[]} input.observations   the client's crawl observations (its own partition only)
 * @param {object[]} input.sitemaps       the client's recorded sitemap observations (its own partition only)
 * @param {{from_observation_id: string, to: string}[]} input.edges  links recorded from the client's observations
 * @param {{ freshnessDays: number }|null} input.freshnessRule  declared, or null
 * @param {Date} input.now
 */
export function scopeCompleteness({ origins = [], observations = [], sitemaps = [], edges = [], freshnessRule = null, now = new Date(), crawlRunsCutShort = 0 }) {
  const S = COMPLETENESS;
  const R = COMPLETENESS_REASONS;
  const scope = [...new Set(origins.map((o) => originOf(o) ?? String(o)))].sort();
  const inScope = (u) => scope.includes(originOf(u));

  const scoped = observations.filter((o) => inScope(o.value?.final_url ?? o.value?.requested_url ?? o.target));
  const outOfScope = observations.length - scoped.length;
  const served = new Set();
  for (const o of scoped.filter(hasServedState)) for (const u of [o.value?.final_url, o.value?.requested_url]) { const c = canon(u); if (c) served.add(c); }
  const requestedWithoutState = scoped.filter((o) => !hasServedState(o)).length;
  const truncated = scoped.filter((o) => o.value?.truncated === true).length;

  const scopeSitemaps = sitemaps.filter((s) => scope.includes(originOf(s.value?.origin ?? s.value?.rootUrl ?? s.target)));
  const originsWithoutSitemap = scope.filter((o) => !scopeSitemaps.some((s) => originOf(s.value?.origin ?? s.value?.rootUrl ?? s.target) === o)).length;
  const sitemapCutShort = scopeSitemaps.filter((s) => {
    const v = s.value ?? {};
    return v.coverageState !== "COMPLETE" || (v.childrenSkipped ?? 0) > 0 || (Number.isInteger(v.urlsTotal) && Number.isInteger(v.urlsStored) && v.urlsStored < v.urlsTotal);
  }).length;
  const listed = new Set(scopeSitemaps.flatMap((s) => listedUrls(s.value)).filter(inScope));
  const listedTotal = scopeSitemaps.reduce((n, s) => n + (Number.isInteger(s.value?.urlsTotal) ? s.value.urlsTotal : listedUrls(s.value).length), 0);
  const listedUnobserved = [...listed].filter((u) => !served.has(u)).length;

  const scopedIds = new Set(scoped.map((o) => o.observation_id));
  const linked = new Set(edges.filter((e) => scopedIds.has(e.from_observation_id)).map((e) => canon(e.to)).filter((u) => u && inScope(u)));
  const linkedUnobserved = [...linked].filter((u) => !served.has(u)).length;

  const times = [...scoped, ...scopeSitemaps].map((o) => Date.parse(o.observed_at)).filter(Number.isFinite);
  const asOf = times.length ? new Date(Math.min(...times)).toISOString() : null;
  const days = Number(freshnessRule?.freshnessDays);
  const rule = Number.isFinite(days) && days > 0 ? { freshnessDays: days } : null;
  const expiresAt = rule && asOf ? new Date(Date.parse(asOf) + rule.freshnessDays * DAY_MS).toISOString() : null;

  const counts = Object.freeze({
    origins: scope.length, observations: scoped.length, servedUrls: served.size, outOfScopeObservations: outOfScope,
    sitemaps: scopeSitemaps.length, listedTotal, listedStored: listed.size, listedUnobserved, linked: linked.size, linkedUnobserved,
    sitemapCutShort, truncated, requestedWithoutState, originsWithoutSitemap, crawlRunsCutShort,
  });
  const basis = (reasons) => Object.freeze({ method: COMPLETENESS_METHOD, scope: Object.freeze({ origins: scope.length }), asOf, freshnessRule: rule, expiresAt, counts, reasons: Object.freeze(reasons) });
  const verdict = (state, reasons) => Object.freeze({ state, basis: basis(reasons), bound: `recorded data only · ${counts.observations} in-scope observation(s) · ${counts.sitemaps} sitemap record(s) · ${counts.linked} linked in-scope URL(s)` });

  if (scope.length === 0) return verdict(S.OUT_OF_SCOPE, [R.NO_ORIGIN]);
  const gaps = [
    [listedUnobserved > 0, R.LISTED_UNOBSERVED], [linkedUnobserved > 0, R.LINKED_UNOBSERVED], [sitemapCutShort > 0, R.SITEMAP_CUT_SHORT],
    [truncated > 0, R.BODY_TRUNCATED], [requestedWithoutState > 0, R.NO_SERVED_STATE], [crawlRunsCutShort > 0, R.CRAWL_CUT_SHORT],
  ].filter(([hit]) => hit).map(([, r]) => r);
  if (gaps.length) return verdict(S.INCOMPLETE, gaps);
  const unknown = [[scoped.length === 0, R.NO_OBSERVATION], [originsWithoutSitemap > 0, R.NO_SITEMAP], [!rule, R.NO_FRESHNESS_RULE]].filter(([hit]) => hit).map(([, r]) => r);
  if (unknown.length) return verdict(S.UNKNOWN, unknown);
  if (now.getTime() > Date.parse(expiresAt)) return verdict(S.STALE, [R.EXPIRED]);
  return verdict(S.COMPLETE, [R.ALL_OBSERVED]);
}

/** What F33 and F34 read: only a COMPLETE, unexpired verdict is COMPLETE; INCOMPLETE and STALE are PARTIAL; anything else UNKNOWN. */
export function coverageForConsumers(v) {
  if (v?.state === COMPLETENESS.COMPLETE) return "COMPLETE";
  if (v?.state === COMPLETENESS.INCOMPLETE || v?.state === COMPLETENESS.STALE) return "PARTIAL";
  return "UNKNOWN";
}
