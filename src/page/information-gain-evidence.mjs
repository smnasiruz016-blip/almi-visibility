/**
 * F39 · ONE CLIENT'S PAGES, ASSEMBLED FOR THE INFORMATION-GAIN DECISION (acceptance _handoffs 90e798d, RR-90).
 *
 * The population, bodies and body verification are F31's; the duplication, shared-shell and semantic-review measures are F32's.
 *   information-gain records          NONE recorded — no store exists; the caller passes them EXPLICITLY (NO_RECORDED_GAIN_EVIDENCE)
 *   competitor-supply comparisons     NONE recorded — no store exists; F39 collects none (V3: supply diagnosis only)
 *   semantic reviews                  NONE recorded — as F32
 * Count-only output; no page content, host or URL.
 */
import { readExistingPagePopulation } from "./existing-page-population.mjs";
import { verifiedPages } from "./duplication-evidence.mjs";
import { judgeInformationGain } from "./information-gain.mjs";

export function readClientInformationGain({ tenantId, resolve, evidence, env = process.env, now = new Date() }) {
  const { population, fault } = readExistingPagePopulation({ scope: { tenantId }, resolve, env, now });
  if (!population) return { fault, bound: `recorded data only · population UNAVAILABLE (${fault})` };
  const r = judgeInformationGain({ pages: verifiedPages(population), evidence });
  return {
    fault: null,
    ...r,
    bound: `recorded data only · ${r.summary.population} page(s) · information-gain records ${evidence.gainRecords.length} · competitor comparisons ${evidence.competitorComparisons.length} · semantic reviews ${evidence.reviews.length} · no live, paid or metered call · nothing collected`,
  };
}
