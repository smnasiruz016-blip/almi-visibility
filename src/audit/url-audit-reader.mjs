/**
 * F20 · ONE CLIENT'S RECORDED URLS, AUDITED (acceptance _handoffs f566059, RR-96). Its own crawl partition (declared host), stored bodies
 * and recorded link edges; nothing fetched. Count-only output.
 */
import { readTenantPartition, readPartitionBodies, readPartitionEdges } from "../crawl/batch-partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";
import { auditUrls } from "./url-audit.mjs";

export function readClientUrlAudit({ tenantId, resolve, env = process.env }) {
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId, resolve, env });
  const bodies = readPartitionBodies({ batchId: BATCH_ID, observationIds: part.observationIds, env });
  const edges = readPartitionEdges({ batchId: BATCH_ID, observationIds: part.observationIds, env });
  const observations = part.records.filter((r) => r.record_type === "observation");
  const a = auditUrls({ observations, bodies, edges });
  return { audit: a, bound: `recorded data only · ${a.observed.urls} observed URL(s) · ${a.linkedOnly.urls} linked-only URL(s), never fetched · ${a.linkTargets.bodiesRead} stored bodies read for link targets as written · ${edges.length} recorded link edge(s) · nothing fetched` };
}
