/**
 * F87 · THE WATCHMAN'S READER — every recorded store F87's INPUT names, read as it is; nothing fetched, run, rendered or written.
 *
 *   cost ledger          runs/cost/ledger.jsonl (cost entries only, as the ledger's own readers filter them)
 *   evidence store       runs/evidence/evidence.jsonl — its observations are the connector observations
 *   external retrievals  runs/evidence/external-observations-*.jsonl
 *   renders              runs/render/*.jsonl
 *   crawl runs           the declared observation batch: crawl_run records, their crawl_run_correction records, and every observation
 *   governed writes      the production audit trail, line by line by the same rule as its store's readAll (CRLF read as LF; a line that
 *                        does not parse is COUNTED, never read as an event). The store itself is not imported: its module chain reaches
 *                        the witness, which spawns a process, and a read-only watchman may load no such module.
 *   facts                one product's registry, only when the caller names one (src/facts/registry.mjs)
 * The RR-107 research records are not read. Generic: no product, tenant or host is named here.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { createJsonlStore } from "../evidence/store.mjs";
import { COST_ENTRY_TYPE } from "../cost/ledger.mjs";
import { batchJsonlFiles, BATCH_ID } from "../crawl/observation-batch.mjs";

export const ENGINE = fileURLToPath(new URL("../../", import.meta.url));
const jsonl = (p) => (existsSync(p) ? createJsonlStore(p).readAll() : []);
/* the audit store's readAll rule (src/audit-trail/store.mjs), without its writer: every stored line in order; a malformed one is counted */
function readTrailLines(eventsPath) {
  if (!existsSync(eventsPath)) return { events: [], malformedLines: [] };
  const lines = readFileSync(eventsPath, "utf8").replace(/\r\n/g, "\n").split("\n").filter((l, i, a) => !(i === a.length - 1 && l === ""));
  const events = [], malformedLines = [];
  lines.forEach((l, i) => { try { events.push(JSON.parse(l)); } catch { malformedLines.push(i + 1); } });
  return { events, malformedLines };
}
const dirJsonl = (dir, keep = () => true) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".jsonl") && keep(f)).sort().flatMap((f) => jsonl(join(dir, f))) : []);

export function readOperations({ engine = ENGINE, batchId = BATCH_ID, env = process.env } = {}) {
  const costEntries = jsonl(join(engine, "runs", "cost", "ledger.jsonl")).filter((r) => r.record_type === COST_ENTRY_TYPE);
  const evidence = jsonl(join(engine, "runs", "evidence", "evidence.jsonl"));
  const externalObservations = dirJsonl(join(engine, "runs", "evidence"), (f) => f.startsWith("external-observations"));
  const renders = dirJsonl(join(engine, "runs", "render")).filter((r) => r.record_type === "observation");
  const batch = batchJsonlFiles({ batchId, env }).flatMap((p) => createJsonlStore(p).readAll());
  const trail = readTrailLines(join(engine, "audit-trail", "events.jsonl"));
  const crawlRuns = batch.filter((r) => r.record_type === "crawl_run");
  const corrections = batch.filter((r) => r.record_type === "crawl_run_correction");
  const batchObservations = batch.filter((r) => r.record_type === "observation");
  const connectorObservations = evidence.filter((r) => r.record_type === "observation");
  return {
    costEntries, crawlRuns, corrections, connectorObservations, externalObservations, renders,
    coverageObservations: batchObservations.filter((o) => o?.value && "coverageState" in o.value),
    /* C4: every evidence record that is not a fact — none declares a freshness window */
    otherEvidence: evidence.length + externalObservations.length + renders.length + batchObservations.length,
    trailEvents: trail.events,
    trailMalformedLines: trail.malformedLines.length,
    bound: { costEntries: costEntries.length, evidenceRecords: evidence.length, externalObservations: externalObservations.length, renders: renders.length, crawlRuns: crawlRuns.length, corrections: corrections.length, batchObservations: batchObservations.length, trailEvents: trail.events.length },
  };
}
