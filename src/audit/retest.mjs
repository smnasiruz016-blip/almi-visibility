/**
 * ITEM 42 — RE-TEST A CHANGED TARGET, AND RECORD THE VERDICT AGAINST THE CHANGE.
 *
 * Boundary: a target that changed since it was last observed is re-tested, and
 * an evidence-backed PASS or FAIL is recorded against the change. FAILURE: a
 * stale observation served as current, or a re-test that is not evidence-backed.
 *
 * ── 🔴 THE RE-TEST READS THE LATEST OBSERVATION, CHOSEN FROM THE STORE ──────
 *
 * Not the one the caller happens to be holding. `latestObservationFor` picks the
 * newest observation of the page from every stored observation, so an older
 * reading cannot be handed to the check as if it were current — and the verdict
 * names the observation it read, so anyone can check which one it was.
 *
 * A check returning `null` found nothing wrong: that is a PASS, and it is still
 * evidence-backed, because the record names the observation that was read.
 */

import { NOINDEX, CANONICAL, HEAD_ELEMENTS, parseHead, noindexState } from "./technical-checks.mjs";
import { targetPageId, canonicalUrl } from "../evidence/ids.mjs";

/** The head facts a replay change is validated against — read by the same parser the checks use. */
export function headFacts(html, xRobotsTag = null) {
  const h = parseHead(html);
  return { noindexed: noindexState({ metaRobots: h.metaRobots, xRobotsTag }).noindexed, canonical: h.canonical, title: h.title };
}

/** Title → how many bodies carry it, for the duplicate-title part of head-elements. */
export function titleCountsOf(bodies) {
  const counts = new Map();
  for (const b of bodies) {
    const t = parseHead(b).title;
    if (t) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return counts;
}

export const RETEST_CHECKS = Object.freeze({ noindex: NOINDEX, canonical: CANONICAL, "head-elements": HEAD_ELEMENTS });

/** The newest stored observation of a page, by `observed_at`. */
export function latestObservationFor(pageId, observations) {
  const mine = observations.filter((o) => {
    if (o.record_type !== "observation" || o.value?.skipped) return false;
    try {
      return targetPageId(canonicalUrl(o.value.final_url ?? o.value.requested_url)) === pageId;
    } catch {
      return false;
    }
  });
  if (mine.length === 0) return null;
  return mine.reduce((a, b) => (b.observed_at > a.observed_at ? b : a));
}

async function verdictOf(check, { url, pageId, observation, body, statusByUrl, titleCounts, openedAt }) {
  const finding = await check.run({
    page: { canonical_url: url, page_id: pageId },
    observations: [observation],
    siteContext: { openedAt, bodyHtml: body, statusByUrl, titleCounts },
  });
  return {
    verdict: finding === null ? "PASS" : finding.verdict,
    summary: finding?.summary ?? null,
    evidence: [observation.observation_id],
    observed_at: observation.observed_at,
  };
}

/**
 * Re-test one changed target with one registered check, before and after.
 * `after` must be the latest stored observation of the page — the caller
 * passes the store's observations and this chooses it.
 */
export async function retestChange({ checkId, url, before, storedObservations, bodyOf, statusByUrlBefore, statusByUrlAfter, titleCountsBefore, titleCountsAfter, openedAt }) {
  const check = RETEST_CHECKS[checkId];
  if (!check) throw new TypeError(`retest: unknown check ${checkId}`);
  const pageId = targetPageId(canonicalUrl(before.observation.value.final_url ?? url));
  const latest = latestObservationFor(pageId, storedObservations);
  if (!latest) throw new Error(`retest: no stored observation for ${url}`);

  const b = await verdictOf(check, { url, pageId, observation: before.observation, body: before.body, statusByUrl: statusByUrlBefore, titleCounts: titleCountsBefore, openedAt });
  const a = await verdictOf(check, { url, pageId, observation: latest, body: bodyOf(latest), statusByUrl: statusByUrlAfter, titleCounts: titleCountsAfter, openedAt });

  return {
    check: checkId,
    url,
    page_id: pageId,
    before: b,
    after: a,
    verdictChanged: b.verdict !== a.verdict,
    // 🔴 The two readings are different observations, and the later one is the one re-tested.
    servedCurrent: latest.observation_id !== before.observation.observation_id && latest.observed_at > before.observation.observed_at,
    evidenceBacked: a.evidence.length === 1 && a.evidence[0] === latest.observation_id,
  };
}
