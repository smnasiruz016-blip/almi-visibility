/**
 * 🔴 ITEM 51 — PRIORITY, CONFIDENCE AND COST, EACH COMPUTED FROM STORED EVIDENCE.
 *
 * The boundary: the owner can inspect a recommendation's priority, evidence,
 * confidence, cost, status and reason — all six. Three did not exist. The
 * standing rule for all three: NONE OF THEM IS A NUMBER SOMEBODY CHOSE. Each is
 * derived from records already in the stores, states its derivation, and says
 * UNKNOWN — with the reason — when its inputs are missing. There is no score, no
 * weight and no threshold in this file.
 *
 *   PRIORITY   the measured search impressions on the distinct pages a
 *              recommendation's issues name, read from the newest COMPLETE
 *              page-rows pull, and the recommendation's RANK by that measure
 *              among those that have one. No impressions to join → UNKNOWN.
 *
 *   CONFIDENCE the WEAKEST source tier among the evidence it stands on (§623's
 *              frozen order), and how complete that evidence is: how many linked
 *              ids resolve, how many linked issues are UNKNOWN rather than FAIL,
 *              how many linked pulls are not COMPLETE. Never higher than its
 *              weakest input. Evidence that cannot be found → UNKNOWN.
 *
 *   COST       what the ledger recorded for the runs that PRODUCED that evidence
 *              (matched by the observation ids each ledger entry lists), with
 *              every part the ledger could not supply named as UNKNOWN; and the
 *              cost of CARRYING OUT the recommendation, which nothing measures,
 *              stated as UNKNOWN.
 *
 * TIER OF A RECORD, declared rather than guessed: a `source` carries its own
 * `source_tier`; an observation read from Search Console (`gsc.*`) is
 * OWNED_GSC_ANALYTICS; any other observation or issue this engine measured on the
 * estate is VERIFIED_ALMIWORLD; an observation that records a reading of a named
 * source takes that source's tier.
 *
 * This module names no product.
 */

import { targetPageId, canonicalUrl } from "../evidence/ids.mjs";
import { tierRank, SOURCE_TIERS } from "../evidence/records.mjs";

const unknown = (reason) => ({ state: "UNKNOWN", reason });

function tierOf(record, sourcesById) {
  if (record.record_type === "source") return record.source_tier;
  if (record.record_type === "observation") {
    const cited = record.value?.source_id;
    if (cited && sourcesById.has(cited)) return sourcesById.get(cited).source_tier;
    if (String(record.method).startsWith("gsc.")) return "OWNED_GSC_ANALYTICS";
    return "VERIFIED_ALMIWORLD";
  }
  if (record.record_type === "issue") return "VERIFIED_ALMIWORLD";
  return null;
}

/**
 * @param {object} a
 * @param {object[]} a.recommendations   draft_recommendation records
 * @param {object[]} a.links             recommendation_evidence records
 * @param {object[]} a.records           every record the links may point at
 * @param {object[]} a.ledger            cost_entry records
 */
export function computeRecommendationFields({ recommendations, links, records, ledger }) {
  const byObs = new Map(records.filter((r) => r.observation_id && r.record_type === "observation").map((r) => [r.observation_id, r]));
  const byIssue = new Map(records.filter((r) => r.record_type === "issue").map((r) => [r.issue_id, r]));
  const bySource = new Map(records.filter((r) => r.record_type === "source").map((r) => [r.source_id, r]));
  const pageRows = records
    .filter((r) => r.method === "gsc.searchAnalytics.query:page-rows" && r.value?.dataState === "COMPLETE")
    .sort((a, b) => a.observed_at.localeCompare(b.observed_at))
    .at(-1);
  const impressionsByPage = new Map();
  for (const row of pageRows?.value?.rows ?? []) {
    let id;
    try {
      id = targetPageId(canonicalUrl(row.url));
    } catch {
      continue;
    }
    impressionsByPage.set(id, (impressionsByPage.get(id) ?? 0) + (row.impressions ?? 0));
  }

  const drafts = recommendations.map((rec) => {
    const link = links.filter((l) => l.recommendation_id === rec.recommendation_id).at(-1) ?? null;
    const ids = { issues: link?.issues ?? [], observations: link?.observations ?? [], sources: link?.sources ?? [] };
    const resolved = {
      issues: ids.issues.map((id) => byIssue.get(id)).filter(Boolean),
      observations: ids.observations.map((id) => byObs.get(id)).filter(Boolean),
      sources: ids.sources.map((id) => bySource.get(id)).filter(Boolean),
    };
    const linkedCount = ids.issues.length + ids.observations.length + ids.sources.length;
    const resolvedCount = resolved.issues.length + resolved.observations.length + resolved.sources.length;

    /* ---- PRIORITY input: measured impressions on the pages its issues name ---- */
    const pages = [...new Set(resolved.issues.map((i) => i.target_page_id))];
    const joined = pages.filter((p) => impressionsByPage.has(p));
    const impact = !link
      ? unknown("no stored record links this recommendation to its evidence")
      : pages.length === 0
        ? unknown("its evidence names no page, so there is no measured search impact to read — nothing ranks it")
        : !pageRows
          ? unknown("no COMPLETE page-rows pull is stored")
          : joined.length === 0
            ? unknown(`none of the ${pages.length} pages it names appears in page-rows pull ${pageRows.observation_id}`)
            : {
                state: "MEASURED",
                impressions: joined.reduce((n, p) => n + impressionsByPage.get(p), 0),
                pagesJoined: joined.length,
                pagesNamed: pages.length,
                pull: pageRows.observation_id,
                window: `${pageRows.value.startDate}..${pageRows.value.endDate}`,
              };

    /* ---- CONFIDENCE ---- */
    let confidence;
    if (!link || linkedCount === 0) confidence = unknown("no evidence is linked, and a confidence over nothing is not a confidence");
    else if (resolvedCount < linkedCount) confidence = unknown(`${linkedCount - resolvedCount} of ${linkedCount} linked evidence ids cannot be found in the stores`);
    else {
      const all = [...resolved.issues, ...resolved.observations, ...resolved.sources];
      const tiers = all.map((r) => tierOf(r, bySource)).filter(Boolean);
      const weakest = tiers.reduce((w, t) => (tierRank(t) > tierRank(w) ? t : w), SOURCE_TIERS[0]);
      const pulls = resolved.observations.filter((o) => o.value?.dataState);
      confidence = {
        state: "DERIVED",
        weakestTier: weakest,
        tierCensus: Object.fromEntries(SOURCE_TIERS.map((t) => [t, tiers.filter((x) => x === t).length]).filter(([, n]) => n > 0)),
        evidenceResolved: `${resolvedCount} of ${linkedCount}`,
        issuesUnknown: `${resolved.issues.filter((i) => i.verdict === "UNKNOWN").length} of ${resolved.issues.length}`,
        pullsIncomplete: `${pulls.filter((o) => o.value.dataState !== "COMPLETE").length} of ${pulls.length}`,
      };
    }

    /* ---- COST: the ledger entries that produced the evidence ---- */
    const producing = new Set([...resolved.observations.map((o) => o.observation_id), ...resolved.issues.flatMap((i) => i.evidence ?? []), ...(pageRows && impact.state === "MEASURED" ? [pageRows.observation_id] : [])]);
    const entries = ledger.filter((e) => (e.sources ?? []).some((s) => producing.has(s)));
    const coveredIds = new Set(entries.flatMap((e) => e.sources ?? []));
    const uncovered = [...producing].filter((id) => !coveredIds.has(id));
    const collectors = [...new Set(uncovered.map((id) => byObs.get(id)?.collector ?? "a record outside the loaded stores"))];
    const part = (name, read) => {
      const unknownEntries = entries.filter((e) => read(e) === null);
      const measured = entries.filter((e) => read(e) !== null).reduce((n, e) => n + read(e), 0);
      if (!link) return unknown("no evidence is linked");
      if (entries.length === 0) return unknown(`no ledger entry lists any of the ${producing.size} records this evidence came from${collectors.length ? ` (produced by ${collectors.join(", ")})` : ""}`);
      if (unknownEntries.length || uncovered.length) {
        return {
          state: "UNKNOWN",
          lowerBound: measured,
          reason: [
            unknownEntries.length ? `${unknownEntries.length} producing run(s) recorded ${name} as UNKNOWN` : null,
            uncovered.length ? `${uncovered.length} of ${producing.size} evidence records came from runs with no ledger entry (${collectors.join(", ")})` : null,
          ].filter(Boolean).join("; "),
        };
      }
      return { state: "MEASURED", value: measured };
    };
    const cost = {
      ofEvidence: {
        ledgerEntries: entries.map((e) => e.entry_id),
        money: part("money", (e) => (e.money.amountState === "UNKNOWN" ? null : e.money.amount)),
        providerCalls: part("provider calls", (e) => (e.providerCalls.state === "MEASURED" ? e.providerCalls.total : null)),
        founderSeconds: part("founder time", (e) => (e.founderTime.state === "MEASURED" ? e.founderTime.seconds : null)),
      },
      toApply: unknown("nothing in the ledger measures the cost of carrying out a recommendation — no such run has happened"),
    };

    return { rec, link, impact, confidence, cost, evidence: { linked: linkedCount, resolved: resolvedCount, issues: ids.issues.length, observations: ids.observations.length, sources: ids.sources.length } };
  });

  /* ---- PRIORITY: the rank by measured impact, among those that have one ---- */
  const ranked = drafts.filter((d) => d.impact.state === "MEASURED").sort((a, b) => b.impact.impressions - a.impact.impressions);
  return drafts.map((d) => ({
    recommendation_id: d.rec.recommendation_id,
    title: d.rec.title,
    status: d.rec.status ?? null,
    reason: d.rec.finding ?? null,
    evidence: d.evidence,
    priority:
      d.impact.state === "MEASURED"
        ? {
            state: "DERIVED",
            rank: 1 + ranked.filter((x) => x.impact.impressions > d.impact.impressions).length,
            of: ranked.length,
            basis: `${d.impact.impressions} search impressions on ${d.impact.pagesJoined} of the ${d.impact.pagesNamed} pages its issues name (page-rows pull ${d.impact.pull}, ${d.impact.window}) — ranked against the ${ranked.length} recommendation(s) with a measured impact`,
          }
        : d.impact,
    confidence: d.confidence,
    cost: d.cost,
  }));
}
