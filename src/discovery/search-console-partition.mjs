/**
 * 🔴 F10 · C1 · THE PER-TENANT SEARCH CONSOLE PARTITION READER (D-F10-PARTITION).
 *
 * The Search Console store is ONE shared collection: one property's pulls cover many declared sites. It is never read as one
 * tenant's data and never read whole for a question about one tenant. A caller obtains ONE tenant's partition, and only by:
 *
 *   1. F02's one scope decision — `decideForTenant` for a COLLECTION_PARTITION of this store — made for the REQUESTED tenant;
 *      the decision object must be genuine (made by src/tenancy/scope.mjs), allowed, about THIS store and THIS tenant;
 *   2. F02's one partition mechanism — `partitionMembers` — over the rows of the pinned observation, where each row is a
 *      member identified by its observation and row position, and its only identity is the landing-page ORIGIN the row
 *      itself stores, answered as a SITE_ORIGIN by the production resolver. A row nobody declared, or declared twice, is
 *      quarantined and counted; it reaches no tenant.
 *
 * There is no whole-store reader here, and a request for no tenant refuses. The pinned observation must match its id AND
 * content hash: a changed pull is a changed population (C1 REOPEN TRIGGER), refused until re-measured.
 *
 * Product-neutral: no host, tenant, subject or query literal. It returns row text to its CALLER in memory only (the
 * mechanism needs it); nothing here prints, logs or records a query, a URL or a tenant id.
 */
import { join } from "node:path";

import { createJsonlStore } from "../evidence/store.mjs";
import { decideForTenant, isGenuineDecision, refDigest } from "../tenancy/scope.mjs";
import { partitionMembers, PartitionRefused } from "../tenancy/partition.mjs";
import { POPULATION_SOURCE } from "../../config/human-questions.mjs";

/** The F02 resource a tenant's partition of this store is decided as. */
export const PARTITION_RESOURCE = Object.freeze({ resourceKind: "COLLECTION_PARTITION", resourceRef: POPULATION_SOURCE.storeId, scopeClass: "TENANT" });

export class SearchConsolePartitionRefused extends Error {
  constructor(code, why) { super(`${code}: ${why}`); this.name = "SearchConsolePartitionRefused"; this.code = code; }
}

const originOf = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.origin : null; } catch { return null; } };

/** An item's identity: its observation and row position. Never its wording. */
export const itemIdOf = (observationId, rowIndex) => `${observationId}:${rowIndex}`;

/**
 * The pinned query-page observation's rows, read from the store at `repo`. Refuses when the observation is absent, is not the
 * pinned method, or its content hash differs from the pin — the C1 changed-source control.
 */
export function pinnedObservationRows({ repo, source = POPULATION_SOURCE, records = null }) {
  const all = records ?? createJsonlStore(join(repo, source.storePath)).readAll();
  const o = all.find((r) => r?.record_type === "observation" && r.observation_id === source.observationId);
  if (!o) throw new SearchConsolePartitionRefused("OBSERVATION_ABSENT", "the pinned observation is not in the store — the population is missing, not empty");
  if (o.method !== source.method) throw new SearchConsolePartitionRefused("OBSERVATION_METHOD_CHANGED", "the pinned observation is not the pinned pull");
  if (o.content_sha256 !== source.contentSha256) throw new SearchConsolePartitionRefused("OBSERVATION_CHANGED", "the pinned observation's content hash differs from the pin — C1 must be re-measured before any use");
  const rows = o.value?.rows;
  if (!Array.isArray(rows)) throw new SearchConsolePartitionRefused("OBSERVATION_UNREADABLE", "the pinned observation holds no row list");
  return rows;
}

/** F02's decision for one requested tenant's partition of this store. */
export const decidePartition = (resolve, tenantId) => decideForTenant(resolve, tenantId, PARTITION_RESOURCE);

/** The rows as F02 partition members: id = observation and row position; identity = the stored landing-page origin. */
export const rowMembers = (rows, observationId) => rows.map((r, i) => {
  const o = typeof r?.url === "string" ? originOf(r.url) : null;
  return { memberId: itemIdOf(observationId, i), identities: o ? [{ resourceKind: "SITE_ORIGIN", resourceRef: o }] : [] };
});

/**
 * ONE tenant's partition. `decision` must be the genuine, allowed F02 decision for THIS tenant and THIS store's partition.
 * Returns the tenant's rows as items { itemId, rowIndex, query } (in row order) and the WHOLE partition's count-only
 * arithmetic — never another tenant's row.
 */
export function readTenantPartition({ decision, tenantId, resolve, rows, observationId = POPULATION_SOURCE.observationId }) {
  if (typeof tenantId !== "string" || tenantId === "") throw new SearchConsolePartitionRefused("NO_TENANT_REQUESTED", "a partition is read for one requested tenant — there is no whole-store read and no default tenant");
  if (!isGenuineDecision(decision)) throw new SearchConsolePartitionRefused("SCOPE_NOT_DECIDED", "no genuine F02 decision was presented for this partition");
  if (!decision.allowed) throw new SearchConsolePartitionRefused("SCOPE_REFUSED", `F02 refused the partition: ${decision.outcome}`);
  if (decision.target.resourceKind !== "COLLECTION_PARTITION" || decision.target.resourceRefDigest !== refDigest("COLLECTION_PARTITION", PARTITION_RESOURCE.resourceRef)) {
    throw new SearchConsolePartitionRefused("DECISION_FOR_ANOTHER_RESOURCE", "the F02 decision is not about this store's partition");
  }
  if (decision.source.resourceRefDigest !== refDigest("REQUESTED_TENANT", tenantId)) {
    throw new SearchConsolePartitionRefused("DECISION_FOR_ANOTHER_TENANT", "the F02 decision was made for a different requested tenant");
  }
  if (!Array.isArray(rows)) throw new SearchConsolePartitionRefused("ROWS_ABSENT", "the partition needs the pinned observation's rows");
  const p = partitionMembers({ members: rowMembers(rows, observationId), resolve });
  const mine = new Set(p.partitions.get(tenantId) ?? []);
  const items = [];
  rows.forEach((r, i) => { const id = itemIdOf(observationId, i); if (mine.has(id)) items.push({ itemId: id, rowIndex: i, query: String(r.query ?? "") }); });
  return Object.freeze({ tenantId, items: Object.freeze(items), arithmetic: p.arithmetic });
}

export { PartitionRefused };
