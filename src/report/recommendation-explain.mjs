/**
 * F73 · RECOMMENDATION EXPLAINABILITY (acceptance _handoffs 366476c, RR-97).
 *
 * Spec row: "Show priority, evidence, confidence, dependencies, expected cost, reversibility and reason." Owner RR-97: "UNKNOWN COST AND
 * UNKNOWN REVERSIBILITY STAY NOT MEASURED. Never estimate, default, infer or fill a field to make a report look complete."
 *
 *   POPULATION  persisted recommendations only (record type draft_recommendation) — never an issue, a lifecycle record, an evidence link,
 *               a ranking, an assessment or a fixture
 *   FIELDS      each RECORDED — on the recommendation, or on a record linked to it by its id — or NOT_MEASURED with the missing fact named.
 *               EVIDENCE comes from the recommendation's recorded evidence links, each reference resolved against the recorded stores;
 *               REASON may be the recorded finding it rests on, labelled as such. Nothing is derived from other stores: the historical
 *               row-51 derivations (src/report/recommendation-fields.mjs) compute priority, confidence and cost, which F73's law forbids.
 *   STATUS      exactly as recorded — an explanation never implies approval or application
 *   VERDICT     PROVED (all seven recorded, every reference resolving) · DISPROVED (a reference resolving to nothing) · COULD-NOT-PROVE
 * Pure; names no product.
 */

export const FIELDS = Object.freeze(["priority", "evidence", "confidence", "dependencies", "expectedCost", "reversibility", "reason"]);
export const EXPLAIN = Object.freeze({ PROVED: "PROVED", DISPROVED: "DISPROVED", COULD_NOT_PROVE: "COULD-NOT-PROVE" });
const has = (v) => v !== undefined && v !== null && !(typeof v === "string" && v.trim() === "") && !(Array.isArray(v) && v.length === 0);
const MISSING = Object.freeze({
  priority: "a recorded priority", confidence: "a recorded confidence", dependencies: "recorded dependencies",
  expectedCost: "a recorded expected cost", reversibility: "a recorded reversibility", reason: "a recorded reason or finding", evidence: "a recorded evidence link",
});

/** A field as recorded on the recommendation, or NOT_MEASURED — never a value that was not recorded. */
const recorded = (rec, key, ...alts) => {
  for (const k of [key, ...alts]) if (has(rec[k])) return { state: "RECORDED", from: k };
  return { state: "NOT_MEASURED", missing: MISSING[key] };
};

/**
 * @param recommendations  draft_recommendation records
 * @param links            recommendation_evidence records
 * @param recordIds        Set of every recorded record id in the stores a link may point at
 */
export function explainRecommendations({ recommendations, links, recordIds }) {
  const rows = recommendations.map((d) => {
    const mine = links.filter((l) => l.recommendation_id === d.recommendation_id);
    const refs = mine.flatMap((l) => ["issues", "observations", "sources"].flatMap((k) => (Array.isArray(l[k]) ? l[k] : []).map((id) => ({ kind: k, id }))));
    const broken = refs.filter((r) => !recordIds.has(r.id));
    const fields = {
      priority: recorded(d, "priority"),
      evidence: has(d.evidence) ? { state: "RECORDED", from: "evidence" } : refs.length ? { state: "RECORDED", from: "recorded evidence link", references: refs.length, broken: broken.length } : { state: "NOT_MEASURED", missing: MISSING.evidence },
      confidence: recorded(d, "confidence"),
      dependencies: recorded(d, "dependencies", "dependsOn"),
      expectedCost: recorded(d, "expectedCost", "cost"),
      reversibility: recorded(d, "reversibility", "reversible"),
      reason: has(d.reason) ? { state: "RECORDED", from: "reason" } : has(d.finding) ? { state: "RECORDED", from: "the recorded finding it rests on" } : { state: "NOT_MEASURED", missing: MISSING.reason },
    };
    const notMeasured = FIELDS.filter((k) => fields[k].state === "NOT_MEASURED");
    const verdict = broken.length ? EXPLAIN.DISPROVED : notMeasured.length ? EXPLAIN.COULD_NOT_PROVE : EXPLAIN.PROVED;
    return Object.freeze({ id: d.recommendation_id, status: d.status ?? null, approvedBy: has(d.approved_by) ? "RECORDED" : "NONE RECORDED", applied: d.applied ?? null, fields, notMeasured, brokenReferences: broken.length, brokenIds: broken.map((b) => b.id), verdict });
  });
  const perField = Object.fromEntries(FIELDS.map((k) => [k, { recorded: rows.filter((r) => r.fields[k].state === "RECORDED").length, notMeasured: rows.filter((r) => r.fields[k].state === "NOT_MEASURED").length }]));
  return Object.freeze({ recommendations: rows.length, rows, perField, references: rows.reduce((n, r) => n + (r.fields.evidence.references ?? 0), 0), broken: rows.reduce((n, r) => n + r.brokenReferences, 0), verdicts: rows.reduce((m, r) => ((m[r.verdict] = (m[r.verdict] ?? 0) + 1), m), {}) });
}
