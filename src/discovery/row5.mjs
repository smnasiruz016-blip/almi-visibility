/**
 * 🔴 ROW 5, ASSEMBLED — ONE PATH FROM THE STORE TO THE VERDICT, SHARED BY THE RUNNER AND THE TEST.
 *
 * The input is ONE named observation, not "the latest query pull": a later ingest must not silently change what
 * this row was proved on. The observation id, its timestamp and its row count are printed with every result.
 *
 * 🔴 22 September 2026: the reference placement Row 5 scored against was retired (owner ruling, RETIRED_CONTAMINATED).
 * Without a lawful reference the clustering still runs and the record is still built — the clusters never read the
 * reference — but SCORING IS REFUSED BY NAME (`scoring.state === "REFUSED"`), and the refusal is an error.
 */
import { splitPopulation, populationErrors } from "./query-population.mjs";
import { heldOutCheck, buildRecord, clusteringErrors, splitCauses, referenceRefusal, REFERENCE_REFUSALS, THRESHOLD, LIMIT, HOLD_OUT_RULE } from "./intent-clusters.mjs";

/** The Search Console `query` pull of 2026-09-12T23:25:03.868Z — the input Amendment 4 measured. */
export const QUERY_OBSERVATION = "45ce21253a3fc58c";

export function queryObservation(records, observationId = QUERY_OBSERVATION) {
  const o = records.find((r) => r.record_type === "observation" && r.observation_id === observationId);
  if (!o) throw new Error(`query observation ${observationId} is not in the store — the row's input is missing, not empty`);
  if (!/:query$/.test(o.method)) throw new Error(`observation ${observationId} is ${o.method}, not a query pull`);
  return o;
}

export function row5({ records, lexicon, reference, ambiguous, referenceStatus, observationId = QUERY_OBSERVATION, threshold = THRESHOLD }) {
  const observation = queryObservation(records, observationId);
  const rows = observation.value.rows;
  const population = splitPopulation(rows);
  const heldOut = heldOutCheck(population.human, lexicon, reference, ambiguous, { threshold, referenceStatus });
  const record = buildRecord(population.human, heldOut, lexicon);
  const errors = [
    ...populationErrors({ rows, human: population.human, operators: population.operators }),
    ...clusteringErrors({ humanRows: population.human, record, heldOut, reference, ambiguous, lexicon, referenceStatus }),
  ];
  const refusal = referenceRefusal(reference, referenceStatus);
  return {
    input: { observationId, observedAt: observation.observed_at, method: observation.method, rowCount: rows.length, window: `${observation.value.startDate}..${observation.value.endDate}` },
    population,
    heldOut,
    record,
    /* 🔴 SCORED, OR REFUSED BY NAME — never "zero defects" because nothing could be compared. */
    scoring: refusal ? { state: "REFUSED", code: refusal, why: REFERENCE_REFUSALS[refusal] } : { state: "SCORED" },
    /* 🔴 UNEVALUATED BY RULE — NEITHER PASSED NOR FAILED. The reference's own R6 keeps an ambiguous wording
     * "scored in NEITHER direction", and `compareToReference` skips those members. They are carried here BY NAME so
     * no report can quietly count them as evaluated. This turn does not adjudicate them. */
    ruleExcluded: { rule: "R6", state: "UNEVALUATED-BY-RULE", why: "the reference cannot say which intent the wording has; scored in neither direction", members: Object.keys(ambiguous ?? {}) },
    errors,
    /* 🔴 WHY EACH REMAINING SPLIT IS ONE — named reason codes, computed after clustering from the record the errors
     * judged. `null` when scoring is refused: no split can be named without a lawful reference. */
    splitCauses: splitCauses({ humanRows: population.human, record, heldOut, reference, ambiguous, lexicon }),
    threshold,
    limit: LIMIT,
    holdOutRule: HOLD_OUT_RULE,
  };
}
