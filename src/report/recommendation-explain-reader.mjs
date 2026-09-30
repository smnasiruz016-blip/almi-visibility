/**
 * F73 · THE RECORDED RECOMMENDATIONS, EXPLAINED (acceptance _handoffs 366476c, RR-97).
 *
 *   recommendations and their evidence links   runs/audit/recommendations.jsonl (record types draft_recommendation, recommendation_evidence)
 *   what a link may point at                     every record id in the recorded audit and evidence stores listed in STORES
 * Read only; nothing fetched or written. Count-only output.
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { explainRecommendations } from "./recommendation-explain.mjs";

const RUNS = fileURLToPath(new URL("../../runs/", import.meta.url));
export const RECOMMENDATIONS = "audit/recommendations.jsonl";
export const STORES = Object.freeze(["audit/recommendations.jsonl", "audit/technical-findings.jsonl", "audit/instrument-findings.jsonl", "audit/findings.jsonl", "audit/crawler-classification.jsonl", "evidence/evidence.jsonl"]);

const readJsonl = (p) => (existsSync(p) ? readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : []);

export function readRecommendationExplanations({ root = RUNS, stores = STORES } = {}) {
  const recs = readJsonl(root + RECOMMENDATIONS);
  const recordIds = new Set();
  for (const s of stores) for (const r of readJsonl(root + s)) for (const k of ["issue_id", "observation_id", "source_id", "id"]) if (typeof r[k] === "string") recordIds.add(r[k]);
  const e = explainRecommendations({ recommendations: recs.filter((r) => r.record_type === "draft_recommendation"), links: recs.filter((r) => r.record_type === "recommendation_evidence"), recordIds });
  return { explanation: e, bound: `recorded data only · ${e.recommendations} recommendation(s) (record type draft_recommendation) · ${e.references} linked evidence reference(s) resolved against ${stores.length} recorded store(s) · nothing derived, estimated, fetched or written` };
}
