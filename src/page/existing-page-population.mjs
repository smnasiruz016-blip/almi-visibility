/**
 * F34 · THE SAME TENANT'S EXISTING-PAGE POPULATION, FOR THE EXISTING-PAGE CHECK (src/page/existing-page-first.mjs).
 *
 * Read ONLY through the tenant partition of the stored observation batch (src/crawl/batch-partition.mjs): the run's DECIDED
 * tenant, its own page records and only its own bodies. Another tenant's page is never parsed into a record here, so it can
 * never decide — or be named by — this tenant's outcome.
 *
 * 🔴 A POPULATION THAT CANNOT BE READ IS NOT AN EMPTY ONE. An unavailable, ambiguous or invalid batch returns `population: null`
 * with its fault, which the check turns into REFUSED; any other error is a defect and is thrown, never swallowed into "no pages".
 *
 * COVERAGE is the batch's own recorded statement about how much of the site it holds — the crawl run's `coverageState`, with any
 * recorded `crawl_run_correction` of that field applied (a correction is how a recorded COMPLETE became PARTIAL, and the old
 * value must not win). A run this partition cannot see leaves coverage UNKNOWN; more than one run keeps the weakest.
 *
 * A CRAWLED INVENTORY IS NOT THE SITE (src/crawl/inventory.mjs). That is why PARTIAL and UNKNOWN matter here: an empty partial
 * population says nothing about pages the crawl never reached, and the check will not produce a page on its silence.
 */
import { readTenantPartition, readPartitionBodies } from "../crawl/batch-partition.mjs";
import { BATCH_ID, ObservationBatchFault } from "../crawl/observation-batch.mjs";
import { createTenantResolver } from "../tenancy/resolver.mjs";
import { existingPageFirst, existingPageDecisionEvent } from "./existing-page-first.mjs";

const WEAKEST = ["UNKNOWN", "PARTIAL", "COMPLETE"];

/** Pure: the population from a partition's records and bodies. Exported so the tests drive it with crafted records. */
export function populationFromPartition({ tenantId, records, bodies }) {
  const observations = new Map(records.filter((r) => r.record_type === "observation").map((o) => [o.observation_id, o]));
  const corrections = records.filter((r) => r.record_type === "crawl_run_correction" && r.field === "coverageState");
  const runs = records.filter((r) => r.record_type === "crawl_run").map((run) => {
    const c = corrections.filter((k) => k.corrects_run_id === run.run_id).sort((a, b) => String(a.corrected_at).localeCompare(String(b.corrected_at))).at(-1);
    return c ? c.corrected_value : run.coverageState;
  });
  const coverageState = runs.length === 0 ? "UNKNOWN" : runs.reduce((w, s) => (WEAKEST.indexOf(s) < WEAKEST.indexOf(w) ? s : w), "COMPLETE");

  const pages = records.filter((r) => r.record_type === "page").map((p) => {
    const served = (p.observations ?? []).map((id) => observations.get(id)).filter((o) => o && bodies.has(o.observation_id))
      .sort((a, b) => String(a.observed_at).localeCompare(String(b.observed_at)));
    const latest = served.at(-1);
    return { pageId: p.page_id, tenantId, html: latest ? bodies.get(latest.observation_id) : "" };
  });
  return Object.freeze({ tenantId, coverageState: WEAKEST.includes(coverageState) ? coverageState : "UNKNOWN", pages });
}

/**
 * The decided tenant's existing pages from the stored batch. `scope` is the run's scoped entry (its `tenantId` and
 * `recordPartition`); the partition's quarantine is recorded through it, exactly as bin/detect.mjs records it.
 */
export function readExistingPagePopulation({ scope, batchId = BATCH_ID, env = process.env, resolve }) {
  try {
    const part = readTenantPartition({ batchId, tenantId: scope.tenantId, resolve, env });
    scope.recordPartition?.(part.partition, { collectionKind: "CRAWL_BATCH", collectionRef: batchId });
    const bodies = readPartitionBodies({ batchId, observationIds: part.observationIds, env });
    return { population: populationFromPartition({ tenantId: scope.tenantId, records: part.records, bodies }), fault: null, population_of: part.partition.arithmetic.population };
  } catch (e) {
    if (e instanceof ObservationBatchFault) return { population: null, fault: e.fault, population_of: null };
    throw e;
  }
}

/**
 * 🔴 THE ONE CALL A PAGE-PRODUCING ENTRY POINT MAKES BEFORE IT WRITES A CANDIDATE PAGE (F34 C1, C5, C6).
 *
 * Reads this run's tenant population once, decides for the candidate, records the decision through the run's own guard sink when
 * it stops production, prints one count-only line, and returns the decision. The caller writes the page ONLY when
 * `decision.mayProduce` is true — the entry points that render a candidate outside constructCandidates route through here.
 */
const loaded = new WeakMap();
export function existingPageGate({ scope, entry, candidate, env = process.env }) {
  if (!loaded.has(scope)) loaded.set(scope, readExistingPagePopulation({ scope, env, resolve: createTenantResolver({ env }) }));
  const { population, fault } = loaded.get(scope);
  const decision = existingPageFirst({ candidate, tenantId: scope.tenantId, population });
  const ev = existingPageDecisionEvent(decision, { entry });
  if (ev) scope.recordDecision(ev);
  console.log(`existing-page first  ${decision.outcome} — ${population ? `${decision.considered} existing page(s) of this tenant, ${decision.matched} naming this intent, coverage ${decision.coverageState}` : `population UNAVAILABLE (${fault})`}${decision.mayProduce ? "" : " — the candidate page is NOT produced"}`);
  return decision;
}
