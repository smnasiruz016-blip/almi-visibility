/**
 * F21 · ONE CLIENT'S RECORDED SIGNALS, READ ONLY THROUGH THAT CLIENT'S PARTITIONS (acceptance _handoffs 804ebd1, RR-86).
 *
 *   crawl observations + stored bodies   the client's partition of the recorded crawl batch (src/crawl/batch-partition.mjs)
 *   sitemap records                      the client's partition of the recorded sitemap collection
 *   robots.txt records                   the shared robots store, attributed ONLY through the client's declared site origins
 *                                        (src/tenancy/row-partition.mjs) — a row whose host no declaration assigns is rejected
 *   scope                                the site origins declared to the client's tenant (declarations only)
 *
 * Another client's record is never parsed into this client's result. Pure analysis lives in ./indexability-signals.mjs.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { readTenantPartition, readPartitionBodies } from "../crawl/batch-partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../adapter/sitemap-subject.mjs";
import { declaredScope } from "../page/existing-page-population.mjs";
import { partitionRowsByDeclaredHost } from "../tenancy/row-partition.mjs";
import { createJsonlStore } from "../evidence/store.mjs";
import { indexabilitySignals } from "./indexability-signals.mjs";

export const ROBOTS_STORE = fileURLToPath(new URL("../../runs/evidence/robots.jsonl", import.meta.url));

/** The client's robots.txt observations, and the arithmetic of what the declared-host partition rejected. */
export function clientRobots({ tenantId, resolve, path = ROBOTS_STORE }) {
  if (!existsSync(path)) return { records: [], rejected: 0, readable: false };
  const rows = createJsonlStore(path).readAll().filter((r) => r.record_type === "observation").map((r) => ({ url: r.value?.url, record: r }));
  const p = partitionRowsByDeclaredHost({ rows, resolve });
  return { records: (p.byTenant[tenantId] ?? []).map((x) => x.record), rejected: p.rejected.length, readable: true };
}

export function readClientIndexabilitySignals({ tenantId, resolve, env = process.env, robotsPath = ROBOTS_STORE }) {
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId, resolve, env });
  const bodies = readPartitionBodies({ batchId: BATCH_ID, observationIds: part.observationIds, env });
  const sitemap = readTenantPartition({ batchId: SITEMAP_BATCH_ID, tenantId, resolve, env });
  const robots = clientRobots({ tenantId, resolve, path: robotsPath });
  return indexabilitySignals({
    origins: declaredScope({ tenantId, env }).origins,
    observations: part.records.filter((r) => r.record_type === "observation"),
    bodies,
    sitemaps: sitemap.records.filter((r) => r.record_type === "observation"),
    robots: robots.records,
  });
}
