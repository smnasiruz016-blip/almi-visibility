/**
 * F91 · ONE PRODUCT'S PLANNING INPUTS (acceptance _handoffs 2048dd3; Amendment 1 _handoffs 4ef1b9c, RR-130).
 *
 *   dimensions        the descriptor's declared page dimension (axis) and its declared values — APPLIES by the product's own declaration —
 *                     plus any further dimension the descriptor declares under `planning.dimensions`, each with its source, applicability
 *                     (APPLIES · CANDIDATE UNIVERSE · NOT APPLICABLE), limits and exclusions; relevant combinations only as declared
 *   verified data     the claim-qualifier keys its fact registry records; a key not declared as a page dimension is EXCLUDED, counted
 *   planning records  the store the descriptor itself names (`planning.records`) — none named → none read, and every candidate is UNKNOWN:
 *                       planning_demand    { combination, state, questionId?, wording? }   a demand item (DEMAND_RULES decides its state)
 *                       planning_limbs     { combination, credibleSource, productFit, distinctNeed }
 *                       planning_sameness  { questions: [idA, idB] }                        a RECORDED sameness judgement
 *                       planning_group     { members: [combination…], coverage, rightToExist, uniqueValue, verifiedFacts, verifiedAnswer }
 *                       planning_need, planning_coverage, coverage_judgement — the connection writer's need, F91's coverage record (C14)
 *                                          and F33 C8's per-question judgements: read by the connection readback, never a limb
 *                     a record of any other shape is counted MALFORMED and never read as a limb. Demand rows of the RESEARCH-DERIVED tier
 *                     are their own state (DEMAND_RULES: never qualifying); the readback's needs carry each need's tier into number 3.
 * Read only, through the product's own scope; nothing fetched, rendered or written; wording stays in memory and is never returned.
 */
import { existsSync } from "node:fs";
import { loadRegistry } from "../facts/registry.mjs";
import { createJsonlStore } from "../evidence/store.mjs";
import { planPages, candidateKey, APPLICABILITY } from "./page-opportunities.mjs";
import { readConnections, COVERAGE } from "./demand-connection.mjs";
import { COVERAGE_JUDGEMENT } from "./grouped-need-coverage.mjs";
import { join, dirname } from "node:path";
import { overturnedIds, asAt } from "../research/meaning-judgement.mjs";

/** The claim-qualifier keys a registry records (`key=value` pairs in each claim's qualifier), with how many records carry each. */
export function qualifierKeys(records) {
  const keys = new Map();
  for (const r of records) {
    const q = r?.claim?.qualifier;
    const text = typeof q === "string" ? q : q && typeof q === "object" ? Object.entries(q).map(([k, v]) => `${k}=${v}`).join(",") : "";
    for (const m of text.matchAll(/([A-Za-z][A-Za-z0-9_-]*)=/g)) keys.set(m[1], (keys.get(m[1]) ?? 0) + 1);
  }
  return keys;
}

const isCombination = (c) => c !== null && typeof c === "object" && !Array.isArray(c) && Object.keys(c).length > 0 && Object.values(c).every((v) => typeof v === "string");

/** The recorded planning inputs, from records already read — exported so a test drives the same shaping the entry point uses. */
export function planningInputs(rows = []) {
  const records = new Map(), questions = new Map(), groupRecords = new Map(), sameness = [];
  let malformed = 0, needs = 0, overturnedDemand = 0, coverageRecords = 0, coverageJudgements = 0;
  const leftOutByDemand = {};
  /* RR-158 §5: a demand item whose question was OVERTURNED leaves every count — the batch's judgements travel with its planning rows */
  const overturned = overturnedIds(rows);
  const slot = (c) => { const k = candidateKey(c); if (!records.has(k)) records.set(k, { demand: [] }); return records.get(k); };
  for (const r of rows) {
    if (r?.record_type === "meaning_judgement") continue;
    if (r?.record_type === "planning_demand" && typeof r.questionId === "string" && overturned.has(r.questionId)) { overturnedDemand += 1; leftOutByDemand[r.state] = (leftOutByDemand[r.state] ?? 0) + 1; continue; }
    /* Amendment 3 C14 (RR-172): F91's coverage record and F33 C8's recorded per-question judgements — read by the readback, never a limb */
    if (r?.record_type === COVERAGE && typeof r.needId === "string") { coverageRecords += 1; continue; }
    if (r?.record_type === COVERAGE_JUDGEMENT && r.value && typeof r.value === "object") { coverageJudgements += 1; continue; }
    if (r?.record_type === "planning_demand" && isCombination(r.combination) && typeof r.state === "string") {
      slot(r.combination).demand.push({ state: r.state });
      if (typeof r.questionId === "string") questions.set(candidateKey(r.combination), [...(questions.get(candidateKey(r.combination)) ?? []), { id: r.questionId, wording: r.wording }]);
    } else if (r?.record_type === "planning_limbs" && isCombination(r.combination)) {
      Object.assign(slot(r.combination), { credibleSource: r.credibleSource, productFit: r.productFit, distinctNeed: r.distinctNeed });
    } else if (r?.record_type === "planning_sameness" && Array.isArray(r.questions) && r.questions.length === 2) {
      sameness.push([String(r.questions[0]), String(r.questions[1])]);
    } else if (r?.record_type === "planning_group" && Array.isArray(r.members) && r.members.every(isCombination)) {
      groupRecords.set(JSON.stringify(r.members.map(candidateKey).sort()), { coverage: r.coverage, rightToExist: r.rightToExist, uniqueValue: r.uniqueValue, verifiedFacts: r.verifiedFacts, verifiedAnswer: r.verifiedAnswer });
    } else if (r?.record_type === "planning_need" && typeof r.needId === "string" && isCombination(r.combination)) {
      /* Amendment 2 C10/C11 (RR-153): the connection writer's need record — its one answer and its country sections. Read by the
       * connection readback (src/page/demand-connection.mjs); the three numbers take nothing from it, so it is neither a limb nor malformed. */
      needs += 1;
    } else malformed += 1;
  }
  return { records, questions, sameness, groupRecords, malformed, needs, overturnedDemand, leftOutByDemand, coverageRecords, coverageJudgements, connected: readConnections(rows, { overturned }) };
}

export async function readProductPlan(product) {
  const { records: facts } = await loadRegistry(product.factsDir, product.productId);
  const axis = product.axis?.key
    ? [{ key: product.axis.key, values: [...(product.variants ?? [])], source: "the product's own descriptor (its declared page axis)", applicability: APPLICABILITY.APPLIES, limits: "its declared variants only", exclusions: "none declared" }]
    : [];
  const dimensions = [...axis, ...(Array.isArray(product.planning?.dimensions) ? product.planning.dimensions : [])];
  const declaredKeys = new Set(dimensions.map((d) => d.key));
  const dataKeys = qualifierKeys(facts);
  const storePath = typeof product.planning?.records === "string" ? product.planning.records : null;
  /* RR-158 §5: the judgements recorded in the SAME batch as the planning store travel with it, so an overturn reaches the three numbers */
  const judgementsPath = storePath ? join(dirname(storePath), "meaning-judgements.jsonl") : null;
  const rows = [...(storePath && existsSync(storePath) ? createJsonlStore(storePath).readAll() : []), ...(judgementsPath && existsSync(judgementsPath) ? createJsonlStore(judgementsPath).readAll() : [])];
  const inputs = planningInputs(rows);
  const plan = planPages({ dimensions, declaredCombinations: product.planning?.relevantCombinations ?? null, ...inputs, needs: inputs.connected.needs, asAt: asAt(rows) });
  return {
    plan,
    inputs: {
      declaredDimensions: dimensions.length,
      factRecords: facts.length,
      verifiedFacts: facts.filter((r) => r.verificationState === "VERIFIED").length,
      /* RR-158 §5: the moment this count is taken, and the latest judgement it took into account; and the demand an overturn took out */
      asAt: asAt(rows),
      overturnedDemand: inputs.overturnedDemand,
      qualifierKeysInFacts: dataKeys.size,
      excludedDataKeys: [...dataKeys.keys()].filter((k) => !declaredKeys.has(k)).length,
      planningStore: storePath ? (existsSync(storePath) ? "declared, read" : "declared, ABSENT — nothing read, never treated as empty evidence") : "none declared by the product",
      planningRecords: rows.length,
      malformedRecords: inputs.malformed, coverageRecords: inputs.coverageRecords, coverageJudgements: inputs.coverageJudgements,
    },
  };
}
