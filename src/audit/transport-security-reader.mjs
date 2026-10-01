/**
 * F27 · ONE CLIENT'S RECORDED PAGES (acceptance _handoffs 8a6312b, amended 93fa696; RR-111).
 *
 *   fetched pages   the client's own partition, one per distinct final URL, each with ONE stored body (src/crawl/inbound.mjs pagesFromRun)
 *   never fetched   every other distinct URL the partition records (robots-skipped), counted NOT MEASURED
 *   header names    the response-header NAMES each fetched observation recorded — values are never read
 * Read only; nothing fetched, rendered or written. The RR-107 research records are not read.
 */
import { readTenantPartition, readPartitionBodies } from "../crawl/batch-partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";
import { pagesFromRun } from "../crawl/inbound.mjs";
import { canonicalUrl } from "../evidence/ids.mjs";
import { auditTransport } from "./transport-security.mjs";

const canon = (u) => { try { return canonicalUrl(u); } catch { return null; } };
const httpsForm = (u) => (u && u.startsWith("http:") ? canon(`https:${u.slice(5)}`) : null);

/** The recorded pages of one partition, in the shape auditTransport reads. */
export function transportPages(records, bodies) {
  const obs = records.filter((r) => r.record_type === "observation");
  const truncated = new Set(obs.filter((o) => o.value?.truncated === true).map((o) => o.observation_id));
  const httpRequested = new Set(obs.filter((o) => !o.value?.skipped).map((o) => httpsForm(o.value?.requested_url)).filter(Boolean));
  const fetched = pagesFromRun({ crawlRecords: records, bodies }).map((p) => ({
    url: p.canonical, fetched: true, html: p.html, truncated: truncated.has(p.body_observation_id), httpFormRequested: httpRequested.has(p.canonical),
  }));
  const seen = new Set(fetched.map((p) => p.url));
  const skipped = new Set();
  for (const o of obs) {
    for (const u of [o.value?.requested_url, o.value?.final_url]) { const c = u ? canon(u) : null; if (c && !seen.has(c)) skipped.add(c); }
  }
  for (const o of obs.filter((x) => !x.value?.skipped)) for (const u of [o.value?.requested_url, o.value?.final_url]) { const c = u ? canon(u) : null; if (c) skipped.delete(c); }
  return [...fetched, ...[...skipped].map(() => ({ url: null, fetched: false, html: null, truncated: false, httpFormRequested: false }))];
}

export function readClientTransport({ tenantId, resolve, env = process.env, batchId = BATCH_ID }) {
  const part = readTenantPartition({ batchId, tenantId, resolve, env });
  const bodies = readPartitionBodies({ batchId, observationIds: part.observationIds, env });
  const fetchedObs = part.records.filter((r) => r.record_type === "observation" && !r.value?.skipped);
  const headerNames = {};
  for (const o of fetchedObs) for (const k of Object.keys(o.value?.response_headers_subset ?? {})) headerNames[k.toLowerCase()] = (headerNames[k.toLowerCase()] ?? 0) + 1;
  const audit = auditTransport({ pages: transportPages(part.records, bodies), headerNames, fetchedObservations: fetchedObs.length });
  return { audit, bound: `recorded data only · ${audit.pages} page(s) in this client's partition, ${audit.fetched} fetched · ${fetchedObs.length} fetched observation(s) · nothing fetched, rendered or written` };
}
