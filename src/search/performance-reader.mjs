/**
 * F81 · ONE CLIENT'S SEARCH PERFORMANCE OBSERVATIONS (acceptance _handoffs ae4834b). Read only; nothing fetched or written.
 *
 * The Search Console store is ONE shared collection: one property covers many declared sites. This reader never hands a client the store:
 *   1. F02's one decision for the requested tenant's partition of this store (src/discovery/search-console-partition.mjs decidePartition,
 *      REUSED) must be genuine and allowed, or nothing is read for the client;
 *   2. each Search Console observation's rows that carry a landing page are partitioned by F02's one mechanism (partitionMembers over
 *      rowMembers, REUSED) — a row reaches this client only when the origin it stores is declared to this client; undeclared or
 *      contested rows are quarantined and counted;
 *   3. an observation whose rows carry no page is site-wide: its rows are counted UNATTRIBUTED and never shaped into this client's rows.
 * Row text (a query, a URL) stays in memory and is never returned in the result's printed fields.
 */
import { join } from "node:path";
import { createJsonlStore } from "../evidence/store.mjs";
import { decidePartition, rowMembers } from "../discovery/search-console-partition.mjs";
import { partitionMembers } from "../tenancy/partition.mjs";
import { isGenuineDecision } from "../tenancy/scope.mjs";
import { trackPerformance, NOT_MEASURED } from "./performance-tracker.mjs";

export const STORE = "runs/evidence/evidence.jsonl";
const PREFIX = "gsc.searchAnalytics.query:";

/** The observations' shape for the tracker, for ONE tenant whose partition decision is genuine and allowed. */
export function clientObservations({ records, tenantId, resolve, decision }) {
  if (!isGenuineDecision(decision) || !decision.allowed) throw Object.assign(new Error(`SCOPE_REFUSED: ${decision?.outcome ?? "no decision"}`), { code: "SCOPE_REFUSED" });
  const out = [];
  for (const o of records) {
    if (o?.record_type !== "observation" || typeof o.method !== "string" || !o.method.startsWith(PREFIX)) continue;
    const pull = o.method.slice(PREFIX.length);
    if (pull === "control") continue;
    const v = o.value ?? {};
    const dims = Array.isArray(v.dimensions) ? v.dimensions : pull === "page-rows" ? ["page"] : [];
    const rows = Array.isArray(v.rows) ? v.rows : null;
    const base = { pull, dims, startDate: v.startDate, endDate: v.endDate, observedAt: o.observed_at, complete: v.dataState === "COMPLETE", state: v.dataState ?? "UNKNOWN", rowLimit: Number.isInteger(v.rowLimitPerRequest) ? v.rowLimitPerRequest : NOT_MEASURED, requests: Number.isInteger(v.requestCount) ? v.requestCount : NOT_MEASURED, recordsPosition: Boolean(rows?.some((r) => r && "position" in r)) };
    if (!dims.includes("page") || rows === null) { out.push({ ...base, clientRows: null, siteWideRows: rows ? rows.length : 0, quarantined: 0 }); continue; }
    const p = partitionMembers({ members: rowMembers(rows, o.observation_id), resolve });
    const mine = new Set(p.partitions.get(tenantId) ?? []);
    const clientRows = rows.filter((_, i) => mine.has(`${o.observation_id}:${i}`));
    out.push({ ...base, clientRows, siteWideRows: 0, quarantined: p.arithmetic.undeclared + p.arithmetic.ambiguous });
  }
  return out;
}

export function readClientPerformance({ tenantId, resolve, repo, records = null }) {
  const all = records ?? createJsonlStore(join(repo, STORE)).readAll();
  const decision = decidePartition(resolve, tenantId);
  return trackPerformance({ observations: clientObservations({ records: all, tenantId, resolve, decision }) });
}
