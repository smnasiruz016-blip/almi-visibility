/**
 * F23 · ONE CLIENT'S RECORDED LINKS (acceptance _handoffs d3c8e79, RR-111).
 *
 *   pages and bodies   the client's own partition of the crawl batch and its archived raw-HTML bodies (src/crawl/batch-partition.mjs)
 *   target states      every observation in that partition, listed under its requested AND its final canonical URL
 *   zero inbound       item 26's one definition (src/crawl/inbound.mjs inboundOf over deriveEdges)
 * Read only; nothing fetched, rendered or written. The RR-107 research records are not read.
 */
import { readTenantPartition, readPartitionBodies } from "../crawl/batch-partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";
import { pagesFromRun, deriveEdges, inboundOf } from "../crawl/inbound.mjs";
import { canonicalUrl } from "../evidence/ids.mjs";
import { auditLinks } from "./link-audit.mjs";

export const canon = (u) => { try { return canonicalUrl(u); } catch { return null; } };

/** Every recorded observation of each URL, under both the URL requested and the URL it ended on. */
export function recordedTargets(records) {
  const map = new Map();
  for (const o of records.filter((r) => r.record_type === "observation")) {
    const rec = { status: o.value?.status ?? null, error: o.value?.error ?? null, skipped: Boolean(o.value?.skipped) };
    for (const c of new Set([o.value?.requested_url, o.value?.final_url].filter(Boolean).map(canon).filter(Boolean))) {
      (map.get(c) ?? map.set(c, []).get(c)).push(rec);
    }
  }
  return map;
}

export function readClientLinkAudit({ tenantId, resolve, env = process.env, batchId = BATCH_ID }) {
  const part = readTenantPartition({ batchId, tenantId, resolve, env });
  const truncated = new Set(part.records.filter((r) => r.record_type === "observation" && r.value?.truncated === true).map((r) => r.observation_id));
  const pages = pagesFromRun({ crawlRecords: part.records, bodies: readPartitionBodies({ batchId, observationIds: part.observationIds, env }) })
    .map((p) => ({ ...p, truncated: truncated.has(p.body_observation_id) }));
  const { zero } = inboundOf({ pages, edges: deriveEdges(pages) });
  const targets = recordedTargets(part.records);
  const audit = auditLinks({ pages, recordsOf: (u) => targets.get(u) ?? [], zeroInbound: zero, canon });
  return { audit, bound: `recorded data only · ${pages.length} page(s) in this client's partition, ${audit.pagesWithBody} with a stored body · ${audit.links} link occurrence(s) · ${targets.size} recorded URL(s) · nothing fetched, rendered or written` };
}
