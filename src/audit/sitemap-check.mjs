/**
 * 🔴 THE CONTRADICTION THE PRODUCT ALREADY NAMED ABOUT ITSELF.
 *
 * `almi-portuguese` commit `489ca26`, 2026-07-28, in its own message:
 *
 *   "⚠️ KNOWN INCONSISTENCY, deliberately left for a decision: src/app/sitemap.ts
 *    still emits those leaves, so the sitemap now advertises URLs robots.txt
 *    forbids Google to fetch."
 *
 * Nobody acted on it. This makes it a check.
 *
 * ── WHY IT MATTERS MORE THAN EITHER HALF ALONE ──────────────────────────────
 *
 * A sitemap is an ADMISSION GATE, not a dump: it is the site telling Google
 * "these are the URLs I want indexed". A robots.txt Disallow is the site
 * telling Google "you may not fetch this". A URL in both is the site
 * contradicting itself, in public, in two machine-readable files.
 *
 * And it is worse than a plain block, because it is the shape that produces
 * indexed-but-uncrawlable URLs: advertised for indexing, forbidden to fetch, so
 * Google can list it and never see its content — or its noindex.
 *
 * ── 🔴 THE FETCH IS BOUNDED, AND THE BOUND IS PART OF THE RESULT ────────────
 *
 * At most one sitemap index plus `MAX_CHILD_SITEMAPS` children per host, at one
 * request per second. Everything not fetched is COUNTED and reported, and
 * coverage is PARTIAL. This is the standing of the four robots.txt reads: a
 * handful of discovery files, named, counted and recorded. **It is not a crawl
 * and must not become one.**
 */

import { registerCheck, fail, unknown } from "./check.mjs";
import { parseSitemap } from "../crawl/seeds.mjs";
import { parseGroups, selectGroup, decide } from "./robots-scope.mjs";

export const MAX_CHILD_SITEMAPS = 10;
export const REQUEST_INTERVAL_MS = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Collect sitemap URLs for one host, under a hard bound.
 *
 * Returns the URLs found AND everything the bound left out, so a reader can see
 * the denominator rather than infer it.
 */
export async function collectSitemapUrls({
  origin,
  fetchImpl,
  maxChildren = MAX_CHILD_SITEMAPS,
  intervalMs = REQUEST_INTERVAL_MS,
  sleepImpl = sleep,
  userAgent = "AlmiVisibilityBot/0.1 (+internal audit)",
}) {
  const requests = [];
  const get = async (url) => {
    if (requests.length > 0) await sleepImpl(intervalMs);
    requests.push(url);
    try {
      const res = await fetchImpl(url, { headers: { "User-Agent": userAgent } });
      return { ok: res.ok, status: res.status, body: res.ok ? await res.text() : null };
    } catch (err) {
      /* 🔴 LAW-ABSENT-1. A fetch failure is our tool, not their sitemap. */
      return { ok: false, status: null, error: String(err?.message ?? err), body: null };
    }
  };

  const indexUrl = `${origin}/sitemap-index.xml`;
  let root = await get(indexUrl);
  let rootUrl = indexUrl;
  if (!root.ok) {
    rootUrl = `${origin}/sitemap.xml`;
    root = await get(rootUrl);
  }
  if (!root.ok) {
    return {
      origin, urls: [], childrenFetched: 0, childrenTotal: null, childrenSkipped: null,
      requests: requests.length, coverageState: "UNKNOWN",
      why: `no sitemap could be read (last status ${root.status ?? root.error})`,
      bound: { maxChildren, intervalMs },
    };
  }

  const parsed = parseSitemap(root.body);
  const urls = [...parsed.urls];
  const children = parsed.sitemaps;
  let fetched = 0;
  for (const child of children.slice(0, maxChildren)) {
    const r = await get(child);
    fetched += 1;
    if (r.ok) urls.push(...parseSitemap(r.body).urls);
  }

  const skipped = Math.max(0, children.length - fetched);
  return {
    origin,
    rootUrl,
    urls: [...new Set(urls)],
    childrenFetched: fetched,
    childrenTotal: children.length,
    childrenSkipped: skipped,
    requests: requests.length,
    /* 🔴 PARTIAL whenever the bound left anything out — and this bound is the
     * point, so it usually will. */
    coverageState: skipped > 0 ? "PARTIAL" : "COMPLETE",
    why: skipped > 0 ? `${skipped} child sitemaps NOT fetched — bound maxChildren=${maxChildren}` : "all children fetched",
    bound: { maxChildren, intervalMs },
  };
}

/** For every sitemap URL, is it disallowed for the search crawler? */
export function contradictions({ sitemapUrls, robotsBody, searchAgent = "Googlebot" }) {
  const group = selectGroup(parseGroups(robotsBody), searchAgent);
  const blocked = [];
  for (const url of sitemapUrls) {
    let d;
    try {
      d = decide(group, url);
    } catch {
      continue;
    }
    if (!d.allowed) blocked.push({ url, rule: d.because });
  }
  return { group: group.matchedBy, agents: group.agents, blocked, checked: sitemapUrls.length };
}

export const SITEMAP_VS_ROBOTS = registerCheck({
  id: "sitemap-advertises-blocked-url",
  description:
    "A URL listed in the sitemap that the same host's robots.txt disallows for the search crawler. " +
    "The site advertising a URL for indexing and forbidding it to be fetched, at the same time.",
  firingFixture:
    "a sitemap listing /exam/x/from/y with a robots.txt whose Googlebot group disallows /exam/*/from/ — must fire",
  cleanControl:
    "the SAME sitemap with a robots.txt whose Googlebot group permits the path (the Disallow sitting only " +
    "in the * group) — must NOT fire",
  run({ page, observations, siteContext }) {
    const robotsBody = siteContext.robotsObservation?.value?.body;
    if (!robotsBody || !siteContext.sitemapUrls) {
      return unknown({
        issueClass: "sitemap-advertises-blocked-url", canonicalUrl: page.canonical_url,
        reasonCode: "MISSING_INPUT",
        evidence: observations.map((o) => o.observation_id),
        detector: "sitemap-vs-robots", detectorVersion: "1", openedAt: siteContext.openedAt,
        summary: "no stored robots.txt or no sitemap URLs for this host",
      });
    }
    const c = contradictions({ sitemapUrls: [page.canonical_url], robotsBody });
    if (c.blocked.length === 0) return null;
    const imp = siteContext.impressions ?? null;
    return fail({
      issueClass: "sitemap-advertises-blocked-url", canonicalUrl: page.canonical_url,
      severity: imp && imp > 0 ? "critical" : "high",
      evidence: [
        ...observations.map((o) => o.observation_id),
        siteContext.robotsObservation.observation_id,
        ...(siteContext.sitemapObservationId ? [siteContext.sitemapObservationId] : []),
      ],
      detector: "sitemap-vs-robots", detectorVersion: "1", openedAt: siteContext.openedAt,
      summary:
        `the sitemap advertises this URL for indexing while robots.txt forbids Googlebot to fetch it ` +
        `(${c.blocked[0].rule}, ${c.group} group). Impressions: ${imp ?? "unknown"}.`,
    });
  },
});
