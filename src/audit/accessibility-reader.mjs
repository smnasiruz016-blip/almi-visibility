/**
 * F26 · ONE CLIENT'S STORED PAGES, ASSESSED (acceptance _handoffs b1a94e7, RR-95).
 *
 *   pages   the client's crawl partition (declared host), each with its stored body and whether the collector truncated it
 * Nothing is fetched or rendered. Count-only output.
 */
import { readTenantPartition, readPartitionBodies } from "../crawl/batch-partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";
import { canonicalUrl, targetPageId } from "../evidence/ids.mjs";
import { assessAccessibility } from "./accessibility.mjs";

export function readClientAccessibility({ tenantId, resolve, env = process.env }) {
  const part = readTenantPartition({ batchId: BATCH_ID, tenantId, resolve, env });
  const bodies = readPartitionBodies({ batchId: BATCH_ID, observationIds: part.observationIds, env });
  const pages = part.records.filter((r) => r.record_type === "observation").map((o) => {
    let pageId = null;
    try { pageId = targetPageId(canonicalUrl(o.value?.final_url ?? o.value?.requested_url)); } catch { /* no page id */ }
    return { pageId, html: bodies.get(o.observation_id) ?? null, truncated: o.value?.truncated === true };
  }).filter((p) => p.pageId);
  const a = assessAccessibility(pages);
  return { assessment: a, bound: `recorded data only · ${pages.length} page(s) in the client's partition · ${a.machineChecked.pagesChecked} with a stored, untruncated body · ${a.machineChecked.checks} machine checks · stored bodies, NOT rendered pages — excludes ${a.notMeasured.excludes} · nothing fetched or rendered` };
}
