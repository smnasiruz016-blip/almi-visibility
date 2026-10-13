/**
 * F11 · SOURCE (b) · the client's own Search Console queries, read from the RECORDED pulls only as ONE tenant's partition (F02): the
 * scope decision and the partition are F10's and F81's own (decidePartition, clientObservations) — nothing here decides scope, and
 * nothing is pulled. Returns the tenant's query rows per complete pull, in memory, to its caller; it prints and records nothing.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../evidence/store.mjs";
import { clientObservations, STORE } from "../search/performance-reader.mjs";
import { decidePartition } from "./search-console-partition.mjs";

/** @returns {{ date: string, rows: { query: string, country?: string }[] }[]} one entry per complete recorded pull that carries queries */
export function clientQueryPulls({ tenantId, resolve, repo, records = null }) {
  const path = join(repo, STORE);
  const all = records ?? (existsSync(path) ? createJsonlStore(path).readAll() : []);
  const observations = clientObservations({ records: all, tenantId, resolve, decision: decidePartition(resolve, tenantId) });
  return observations.filter((o) => o.complete && Array.isArray(o.clientRows) && o.dims.includes("query")).map((o) => ({
    date: String(o.observedAt ?? "").slice(0, 10),
    rows: o.clientRows.map((r) => ({ query: r.query ?? (Array.isArray(r.keys) ? r.keys[o.dims.indexOf("query")] : undefined), country: r.country })),
  }));
}
