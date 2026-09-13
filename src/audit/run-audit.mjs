/**
 * THE ROBOTS-SCOPE AND DNS-FAMILY AUDIT, AS A FUNCTION.
 *
 * It used to live in `bin/audit.mjs`, resolving DNS inline — so it could only
 * ever be run against the live internet, and "run twice, no duplicates" could
 * not be tested without the network.
 *
 * 🔴 THE RESOLVER IS INJECTED, AND WHICH ONE RAN IS NEVER HIDDEN. `bin/audit.mjs`
 * passes the LIVE resolver. `bin/replay-crawl.mjs` passes RECORDED answers — the
 * stored `dns.families` observations of 12 September 2026 — and says so in its
 * evidence. A double run over recorded answers proves this job does not
 * duplicate records; it does not re-prove what DNS says today.
 */

import { makeObservation } from "../evidence/records.mjs";
import { sha256Hex } from "../evidence/ids.mjs";
import { assessUrl } from "./robots-scope.mjs";
import { ROBOTS_SCOPE, DNS_FAMILY } from "./checks.mjs";

export const DETECTOR_VERSION = "1";

/**
 * @param {object}   args
 * @param {object}   args.store          an evidence store
 * @param {Array}    args.robotsRecords  stored robots.txt observations
 * @param {Array}    args.evidence       the Search Console evidence store
 * @param {Array}    args.crawl          the crawl run's records
 * @param {string[]} args.hosts          the estate hostnames
 * @param {Function} args.familiesFor    host → families — LIVE or RECORDED, the caller decides
 * @param {string}   args.openedAt
 */
export async function runRobotsAndDnsAudit({ store, robotsRecords, evidence, crawl, hosts, familiesFor, openedAt }) {
  const writes = { appended: 0, resighted: 0 };
  const put = (record) => {
    const w = store.appendIfNew(record, { seenAt: openedAt });
    writes[w.appended ? "appended" : "resighted"] += 1;
  };

  const robotsByHost = new Map();
  for (const r of robotsRecords) if (r.record_type === "observation") robotsByHost.set(r.value.host, r);

  const impressions = new Map();
  for (const r of evidence) {
    if (r.method !== "gsc.searchAnalytics.query:page-rows") continue;
    for (const row of r.value.rows) impressions.set(row.url, row);
  }

  const blockedObs = crawl.filter((r) => r.record_type === "observation" && r.value?.skipped);
  let robotsFail = 0;
  let robotsUnknown = 0;
  let impressionsAtRisk = 0;
  const perHost = new Map();

  for (const obs of blockedObs) {
    const url = obs.value.requested_url;
    const host = new URL(url).hostname;
    const robotsObs = robotsByHost.get(host);
    const imp = impressions.get(url)?.impressions ?? null;

    /* 🔴 Through the REGISTERED check, not a copy of it. */
    const finding = await ROBOTS_SCOPE.run({
      page: { canonical_url: url },
      observations: [obs],
      siteContext: { openedAt, robotsObservation: robotsObs, impressions: imp },
    });

    if (robotsObs?.value?.body) {
      const a = assessUrl({ body: robotsObs.value.body, url });
      if (!perHost.has(host)) perHost.set(host, { blockedForGoogle: 0, impressions: 0, sample: a, sha: robotsObs.content_sha256 });
    }

    if (finding === null) continue;
    // 🔴 appendIfNew: the same finding from the same job run twice is one record.
    put(finding);
    if (finding.verdict === "UNKNOWN") {
      robotsUnknown += 1;
      continue;
    }
    const h = perHost.get(host);
    h.blockedForGoogle += 1;
    h.impressions += imp ?? 0;
    robotsFail += 1;
    impressionsAtRisk += imp ?? 0;
  }

  const familyRows = [];
  let dnsFail = 0;
  let dnsUnknown = 0;
  for (const host of hosts) {
    const f = await familiesFor(host);
    familyRows.push(f);
    const fObs = makeObservation({
      observed_at: f.measuredAt,
      method: "dns.families",
      target: { kind: "url", ref: `https://${host}/` },
      content_sha256: sha256Hex(JSON.stringify({ hasA: f.hasA, hasAAAA: f.hasAAAA, state: f.state })),
      value: f,
      collector: "bin/audit.mjs",
      collector_version: DETECTOR_VERSION,
    });
    put(fObs);
    const finding = await DNS_FAMILY.run({
      page: { canonical_url: `https://${host}/` },
      observations: [fObs],
      siteContext: { openedAt, families: f },
    });
    if (finding === null) continue;
    put(finding);
    if (finding.verdict === "UNKNOWN") dnsUnknown += 1;
    else dnsFail += 1;
  }

  return { blockedCount: blockedObs.length, robotsFail, robotsUnknown, impressionsAtRisk, perHost, familyRows, dnsFail, dnsUnknown, writes };
}
