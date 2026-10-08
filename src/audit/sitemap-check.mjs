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
 * RR-227 (F19 Acceptance Amendment 1): the collector moved to F19 (src/crawl/sitemap-collect.mjs) and this name now delegates to it.
 * RR-226 found the old body here counting a FAILED child as fetched (COMPLETE, its URLs missing), adding 0 URLs for a nested index and
 * still saying COMPLETE, and reading every sitemap with no byte bound and no timeout. The one collector now bounds every request
 * (bytes, timeout, interval), follows nested indexes, and is COMPLETE only when nothing failed, was cut, unparsed or skipped.
 */

import { registerCheck, fail, unknown } from "./check.mjs";
import { parseSitemap } from "../crawl/seeds.mjs";
import { parseGroups, selectGroup, decide } from "./robots-scope.mjs";
import { collectSitemap, SITEMAP_BOUNDS } from "../crawl/sitemap-collect.mjs";

export const MAX_CHILD_SITEMAPS = SITEMAP_BOUNDS.maxChildren;
export const REQUEST_INTERVAL_MS = SITEMAP_BOUNDS.intervalMs;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Collect sitemap URLs for one host, under a hard bound — through F19's one collector (src/crawl/sitemap-collect.mjs).
 *
 * Kept for its existing callers' shape. It reads no robots.txt (honourRobots false): its only production caller, bin/audit-technical.mjs
 * --sitemaps, is retired (F19 A1), and a tenant's sitemap is re-collected by bin/crawl.mjs --research-batch --sitemaps, which honours
 * robots. The pacer here runs on a clock advanced by `sleepImpl`, so a caller that hands a no-op sleep is not held in a busy wait.
 */
export async function collectSitemapUrls({
  origin,
  fetchImpl,
  maxChildren = MAX_CHILD_SITEMAPS,
  intervalMs = REQUEST_INTERVAL_MS,
  sleepImpl = sleep,
  userAgent = "AlmiVisibilityBot/0.1 (+internal audit)",
}) {
  let clock = 0;
  const advance = async (ms) => { clock += ms; await sleepImpl(ms); };
  return collectSitemap({ origin, fetchImpl, honourRobots: false, bounds: { maxChildren, intervalMs }, sleepImpl: advance, monotonic: () => clock, userAgent });
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
