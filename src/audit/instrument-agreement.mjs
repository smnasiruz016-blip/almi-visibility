/**
 * 🔴 TWO INSTRUMENTS DISAGREEING ABOUT ONE POPULATION IS A DEFECT — RAISED AS ONE.
 *
 * On 13 September 2026 two runners counted pages with no inbound links over the
 * same bodies and printed 340 and 341. That is exactly the class of defect this
 * engine exists to catch, and it caught one in its own house — so it is raised
 * the way any other finding is: an Issue per page the instruments disagree
 * about, in the evidence store, with the observations that page came from.
 *
 * The two definitions that disagreed are kept here, NAMED, so the disagreement
 * can be reproduced from the stored graph by anyone — not because either is
 * still used. The one definition is src/crawl/inbound.mjs.
 *
 * This module names no product.
 */

import { fail } from "./check.mjs";
import { inboundOf } from "../crawl/inbound.mjs";

export const DETECTOR = "instrument-agreement";
export const DETECTOR_VERSION = "1";
export const ISSUE_CLASS = "instrument-disagreement";

/** The two definitions that printed 340 and 341, as they were at 47715db — reproduced, not used. */
export const LEGACY_ZERO_INBOUND = Object.freeze({
  "bin/audit-content.mjs": {
    unit: "OBSERVATION — a page reached by two requested URLs was counted twice",
    scope: "a link from any crawled host counts",
    zero: ({ pages, edges }) => {
      const { zero } = inboundOf({ pages, edges });
      const z = new Set(zero);
      return pages.flatMap((p) => (z.has(p.canonical) ? p.observation_ids.map(() => p.canonical) : []));
    },
  },
  "bin/audit-technical.mjs": {
    unit: "PAGE — each distinct page once",
    scope: "ONLY a link from the same host counts",
    zero: ({ pages, edges }) => inboundOf({ pages, edges: edges.filter((e) => e.to_parsed && new URL(e.to).hostname === new URL(e.from).hostname) }).zero,
  },
});

/**
 * Compare two instruments over one population and return one Issue per page
 * they treat differently — by membership (one calls it zero-inbound, the other
 * does not) or by weight (one counts it more than once).
 */
export function disagreementIssues({ pages, edges, openedAt }) {
  const [aName, bName] = Object.keys(LEGACY_ZERO_INBOUND);
  const a = LEGACY_ZERO_INBOUND[aName].zero({ pages, edges });
  const b = LEGACY_ZERO_INBOUND[bName].zero({ pages, edges });
  const countIn = (list) => list.reduce((m, p) => m.set(p, (m.get(p) ?? 0) + 1), new Map());
  const ca = countIn(a);
  const cb = countIn(b);
  const byPage = new Map(pages.map((p) => [p.canonical, p]));
  const issues = [];
  for (const page of [...new Set([...ca.keys(), ...cb.keys()])].sort()) {
    const na = ca.get(page) ?? 0;
    const nb = cb.get(page) ?? 0;
    if (na === nb) continue;
    const cause =
      na === 0 || nb === 0
        ? `${na === 0 ? aName : bName} finds inbound links to this page and ${na === 0 ? bName : aName} finds none: ` +
          `${bName} counts ${LEGACY_ZERO_INBOUND[bName].scope}, ${aName} counts ${LEGACY_ZERO_INBOUND[aName].scope}`
        : `both call this page zero-inbound, but ${na > nb ? aName : bName} counts it ${Math.max(na, nb)} times: ${LEGACY_ZERO_INBOUND[na > nb ? aName : bName].unit}`;
    issues.push(
      fail({
        issueClass: ISSUE_CLASS,
        canonicalUrl: page,
        severity: "medium",
        evidence: [...byPage.get(page).observation_ids],
        detector: DETECTOR,
        detectorVersion: DETECTOR_VERSION,
        openedAt,
        summary: `two instruments disagree about this page's inbound links over the same bodies (${aName} ${a.length}, ${bName} ${b.length}). ${cause}.`,
      }),
    );
  }
  return { issues, counts: { [aName]: a.length, [bName]: b.length } };
}
