/**
 * F87 · THE OPERATOR OVERVIEW'S READER (RR-130 §2). Read-only; nothing fetched, run, rendered or written; no record returned.
 *
 *   the watch           src/ops/watchman-reader.mjs readOperations — the same stores the watchman reads, judged by the same code
 *   cost attribution    F78's readCostByTenant (src/cost/cost-by-tenant.mjs) — its attributeCostEntry decisions, REUSED, never re-made
 *   batch attribution   F02's own partition arithmetic over the batch's member IDENTITIES (src/crawl/batch-partition.mjs collectionMembers,
 *                       src/tenancy/partition.mjs partitionMembers) — the gate's rule, so a member is attributed exactly as a tenant's
 *                       partition would hold it, and no record leaves this function
 *   trail scopes        each ALLOWED governed write's recorded scopeType, counted
 * Facts are not read here: a fact registry is read only inside its own product's scope.
 */
import { readOperations } from "./watchman-reader.mjs";
import { watch } from "./watchman.mjs";
import { operatorOverview } from "./operator-overview.mjs";
import { readCostByTenant } from "../cost/cost-by-tenant.mjs";
import { collectionMembers } from "../crawl/batch-partition.mjs";
import { partitionMembers } from "../tenancy/partition.mjs";
import { BATCH_ID } from "../crawl/observation-batch.mjs";

export function readOperatorOverview({ on, resolve, env = process.env, batchId = BATCH_ID, ops = readOperations({ batchId, env }) }) {
  const w = watch({ ...ops, facts: null, on });
  const cost = readCostByTenant({ resolve, env }).attributions;
  const members = collectionMembers({ batchId, env }).map(({ memberId, identities }) => ({ memberId, identities }));
  const batch = partitionMembers({ members, resolve }).arithmetic;
  const trailScopes = {};
  for (const e of ops.trailEvents) {
    if (e?.eventType !== "GOVERNED_WRITE" || e.metadata?.governedWritePhase !== "ATTEMPTED") continue;
    const k = typeof e.scopeType === "string" && e.scopeType !== "" ? e.scopeType : "NO RECORDED SCOPE";
    trailScopes[k] = (trailScopes[k] ?? 0) + 1;
  }
  const b = ops.bound;
  return operatorOverview({
    watch: w, bound: b, cost, batch, trailScopes,
    unscopedRecords: b.evidenceRecords + b.externalObservations + b.renders,
  });
}
