/**
 * F13 · ONE PRODUCT'S AXIS EVIDENCE (acceptance _handoffs 0ca24d3). Read only, through the product's own scope; nothing fetched or written.
 *
 *   declared      the descriptor's page axis key, and the keys of any further dimensions it declares (`planning.dimensions`, F91)
 *   facts         the product's fact registry (src/facts/registry.mjs) — unreadable → null, so the kind is NOT MEASURED, never empty
 *   pages         the stored bodies of the tenant the product's scope resolved to: that tenant's crawl partition only (F02's partition,
 *                 src/crawl/batch-partition.mjs), shaped by F27's own page reader (src/audit/transport-security-reader.mjs transportPages)
 */
import { loadRegistry } from "../facts/registry.mjs";
import { readTenantPartition, readPartitionBodies } from "../crawl/batch-partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";
import { transportPages } from "../audit/transport-security-reader.mjs";
import { discoverAxes } from "./context-axes.mjs";

export const declaredKeys = (product) => [
  ...(product?.axis?.key ? [product.axis.key] : []),
  ...(Array.isArray(product?.planning?.dimensions) ? product.planning.dimensions.map((d) => d?.key).filter(Boolean) : []),
];

export async function readProductAxes({ product, tenantId, resolve, env = process.env, batchId = BATCH_ID }) {
  let facts = null;
  try { facts = (await loadRegistry(product.factsDir, product.productId)).records; } catch { facts = null; }
  let pages = null, bound = "no crawl partition was read";
  if (typeof tenantId === "string" && tenantId !== "") {
    const part = readTenantPartition({ batchId, tenantId, resolve, env });
    const bodies = readPartitionBodies({ batchId, observationIds: part.observationIds, env });
    pages = transportPages(part.records, bodies);
    bound = `the tenant's own crawl partition (${pages.length} page record(s))`;
  }
  return { axes: discoverAxes({ declared: declaredKeys(product), facts, pages }), bound };
}
