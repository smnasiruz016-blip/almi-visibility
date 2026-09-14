/**
 * 🔴 ROW 5, ASSEMBLED — ONE PATH FROM THE STORE TO THE VERDICT, SHARED BY THE RUNNER AND THE TEST.
 *
 * The input is ONE named observation, not "the latest query pull": a later ingest must not silently change what
 * this row was proved on. The observation id, its timestamp and its row count are printed with every result.
 */
import { splitPopulation, populationErrors } from "./query-population.mjs";
import { heldOutCheck, buildRecord, clusteringErrors, THRESHOLD, LIMIT, HOLD_OUT_RULE } from "./intent-clusters.mjs";

/** The Search Console `query` pull of 2026-09-12T23:25:03.868Z — the input Amendment 4 measured. */
export const QUERY_OBSERVATION = "45ce21253a3fc58c";

export function queryObservation(records, observationId = QUERY_OBSERVATION) {
  const o = records.find((r) => r.record_type === "observation" && r.observation_id === observationId);
  if (!o) throw new Error(`query observation ${observationId} is not in the store — the row's input is missing, not empty`);
  if (!/:query$/.test(o.method)) throw new Error(`observation ${observationId} is ${o.method}, not a query pull`);
  return o;
}

export function row5({ records, lexicon, reference, ambiguous, observationId = QUERY_OBSERVATION, threshold = THRESHOLD }) {
  const observation = queryObservation(records, observationId);
  const rows = observation.value.rows;
  const population = splitPopulation(rows);
  const heldOut = heldOutCheck(population.human, lexicon, reference, ambiguous, { threshold });
  const record = buildRecord(population.human, heldOut, lexicon);
  const errors = [
    ...populationErrors({ rows, human: population.human, operators: population.operators }),
    ...clusteringErrors({ humanRows: population.human, record, heldOut, reference, ambiguous, lexicon }),
  ];
  return {
    input: { observationId, observedAt: observation.observed_at, method: observation.method, rowCount: rows.length, window: `${observation.value.startDate}..${observation.value.endDate}` },
    population,
    heldOut,
    record,
    errors,
    threshold,
    limit: LIMIT,
    holdOutRule: HOLD_OUT_RULE,
  };
}
