#!/usr/bin/env node
/**
 * ITEM 26 — THE EDGE GRAPH, STORED ONCE, READ BY EVERY RUNNER.
 *
 *   node bin/edge-graph.mjs             dry run: derive and print the counts
 *   node bin/edge-graph.mjs --confirm   write runs/crawl/edges-2026-09-12.jsonl.br
 *
 * Derived from the committed body archive with the ONE definition in
 * src/crawl/inbound.mjs. It is stored — although it can be re-derived — because
 * item 26's own EVIDENCE clause names "the graph in durable storage", and
 * because two runners that each derived it for themselves is how 340 and 341
 * happened. test/edge-graph.test.mjs re-derives it from the archive on every
 * commit and fails if the stored graph has drifted from its source.
 */

import { existsSync, renameSync, writeFileSync } from "node:fs";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { pagesFromRun, deriveEdges, inboundOf, packGraph, ZERO_INBOUND_DEFINITION } from "../src/crawl/inbound.mjs";
import { readTenantPartition, readPartitionBodies } from "../src/crawl/batch-partition.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
/* F02 (partition): the observation batch is SHARED, so this run reads only the requested tenant's partition of it —
 * the pages whose own identities resolve to that tenant — and derives their links. Another tenant's page is never read. */
const SCOPE = scopedEntryPoint({ entry: "bin/edge-graph.mjs", governed: true, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv.slice(2), env: process.env }));
const RUN_INSTANT = isoSeconds(Date.now());
const RUN_CORRELATION = `run:edge-graph:${RUN_INSTANT}`;
const governedEdgeGraph = (target) => governedFileWrite({ ...SCOPE.writeScope,
  repo: REPO, permission, target, targetClass: "RUN_EVIDENCE", bytes: packed,
  action: "WRITE_EDGE_GRAPH", occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
});
/* 🔴 NO DEFAULT DESTINATION, SINCE 20 SEPTEMBER 2026. The canonical edge graph lives in the external
 * observation batch, where it is immutable evidence. Re-deriving it into THIS repository would put
 * back exactly the artifact the migration removed, so a destination must now be named explicitly.
 * The write stays confined to this repository either way: the engine never writes to the data one. */
const outArg = process.argv.find((a) => a.startsWith("--out="))?.slice("--out=".length) ?? null;
const OUT = outArg === null ? null : confineToRepo(outArg, { label: "--out" });

const PART = readTenantPartition({ batchId: BATCH_ID, tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
SCOPE.recordPartition(PART.partition, { collectionKind: "CRAWL_BATCH", collectionRef: BATCH_ID });
const a = PART.partition.arithmetic;
console.log(`[partition: ${PART.records.length} of ${a.population} batch records are this tenant's · batch = ${a.inPartitions} in ${a.partitions} tenant partitions + ${a.undeclared} UNDECLARED + ${a.ambiguous} AMBIGUOUS · remainder ${a.remainder}]`);
const crawlRecords = PART.records;
const pages = pagesFromRun({ crawlRecords, bodies: readPartitionBodies({ batchId: BATCH_ID, observationIds: PART.observationIds }) });
const edges = deriveEdges(pages);
const { zero } = inboundOf({ pages, edges });
const packed = packGraph(edges);

console.log(ZERO_INBOUND_DEFINITION);
console.log(`[bound: ${pages.length} distinct pages, ${pages.filter((p) => p.html !== null).length} with a served body]`);
console.log(`edges: ${edges.length} links read from served HTML`);
console.log(`pages with no inbound links inside the crawled set: ${zero.length} — UNKNOWN, not orphans`);
console.log(`packed: ${packed.length} bytes`);

if (!permission.mayWrite) {
  /* The refusal is AUDITED when there is a target to key it on. A dry run with no destination is not a governed
   * write attempt at all, so it keeps its original message and its exit code unchanged. */
  if (OUT !== null) executeGovernedWrite(governedEdgeGraph(OUT));
  console.log("[dry-run] nothing written — add --confirm");
  process.exit(0);
}
if (OUT === null) {
  console.error("🔴 REFUSED — no destination. The canonical edge graph is in the external observation batch; writing one into this repository would recreate a real observation artifact here. Pass --out=<path> to write a copy for inspection.");
  process.exit(2);
}
if (existsSync(OUT)) {
  console.error(`🔴 REFUSED — ${OUT} already exists. Recorded evidence is not re-recorded over itself.`);
  process.exit(2);
}
/* The temporary-then-rename this file already performed is exactly STAGED_REPLACE, so the boundary now owns it
 * — including discarding its own abandoned temporary and verifying the target after the rename. `packed` is a
 * brotli Buffer and is hashed as raw bytes, never decoded. */
const governed = executeGovernedWrite(governedEdgeGraph(OUT));
if (governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") {
  console.error(`🔴 ${governed.outcome} — ${OUT} was not written; the governed attempt is on the audit trail`);
  process.exit(1);
}
console.log(`written: ${OUT} [${governed.outcome}]`);
