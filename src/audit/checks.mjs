/**
 * THE REGISTERED CHECKS.
 *
 * 🔴 EVERY ENTRY NAMES BOTH FIXTURES — one that makes it fire, and one clean
 * control that must NOT. `registerCheck` throws without them, so a check cannot
 * reach this file without a false-positive control.
 *
 * ── 🔴 THE SEALED EXAM ──────────────────────────────────────────────────────
 *
 * Nothing in this directory has read the case study corpus, and the sealed
 * corpus census fails the build if it ever does. Both checks below were derived
 * from the checklist's PASS meanings for item 10 ("robots", "crawl/indexability
 * conflicts"), from current official guidance re-read on 12 September 2026, and
 * from the evidence store's own data model. Neither was derived from the six
 * known RED classes.
 */

import { registerCheck, fail, unknown } from "./check.mjs";
import { assessUrl } from "./robots-scope.mjs";
import { familiesFor, assessFamilies } from "./dns-family.mjs";

export const ROBOTS_SCOPE = registerCheck({
  id: "robots-scope",
  description:
    "A URL with search impressions that robots.txt disallows for the SEARCH crawler's own group. " +
    "A block that applies only to our crawler is not this finding.",
  firingFixture: "fixtures/robots/blocks-googlebot.txt — a Googlebot group that repeats the Disallow",
  cleanControl:
    "fixtures/robots/blocks-us-only.txt — the same Disallow in the * group, with a Googlebot group that " +
    "permits the path. Must NOT fire.",
  run({ page, observations, siteContext }) {
    const robotsObs = siteContext?.robotsObservation;
    if (!robotsObs?.value?.body) {
      return unknown({
        issueClass: "robots-blocks-search-crawler",
        canonicalUrl: page.canonical_url,
        reasonCode: "MISSING_INPUT",
        evidence: observations.map((o) => o.observation_id),
        detector: "robots-scope",
        detectorVersion: "1",
        openedAt: siteContext.openedAt,
        summary: "no stored robots.txt observation for this host",
      });
    }
    const a = assessUrl({ body: robotsObs.value.body, url: page.canonical_url });
    if (a.verdict !== "BLOCKED_FOR_GOOGLEBOT") return null;
    const imp = siteContext?.impressions ?? null;
    return fail({
      issueClass: "robots-blocks-search-crawler",
      canonicalUrl: page.canonical_url,
      severity: imp && imp > 0 ? "critical" : "high",
      evidence: [...observations.map((o) => o.observation_id), robotsObs.observation_id],
      detector: "robots-scope",
      detectorVersion: "1",
      openedAt: siteContext.openedAt,
      summary: `Disallowed for Googlebot by ${a.googlebot.because}; ${imp ?? "?"} impressions.`,
    });
  },
});

export const DNS_FAMILY = registerCheck({
  id: "dns-family",
  description:
    "A host publishing AAAA and no A record. States what DNS publishes; says NOTHING about whether " +
    "Googlebot reaches the host — that is a separate measurement.",
  firingFixture: "an AAAA_ONLY family result — must fire",
  cleanControl: "an A_AND_AAAA family result and an A_ONLY family result — neither may fire",
  async run({ page, observations, siteContext }) {
    const host = new URL(page.canonical_url).hostname;
    const f = siteContext?.families ?? (await familiesFor(host));
    const verdict = assessFamilies(f);
    if (!verdict.raise) return null;
    const evidence = observations.map((o) => o.observation_id);
    if (verdict.verdict === "UNKNOWN") {
      return unknown({
        issueClass: "host-publishes-no-a-record",
        canonicalUrl: page.canonical_url,
        reasonCode: verdict.reasonCode,
        evidence,
        detector: "dns-family",
        detectorVersion: "1",
        openedAt: siteContext.openedAt,
        summary: verdict.summary,
      });
    }
    return fail({
      issueClass: "host-publishes-no-a-record",
      canonicalUrl: page.canonical_url,
      severity: verdict.severity,
      evidence,
      detector: "dns-family",
      detectorVersion: "1",
      openedAt: siteContext.openedAt,
      summary: verdict.summary,
    });
  },
});
