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
import { createJsonlStore } from "../src/evidence/store.mjs";
import { readBodyArchive } from "../src/evidence/body-archive.mjs";
import { pagesFromRun, deriveEdges, inboundOf, packGraph, ZERO_INBOUND_DEFINITION } from "../src/crawl/inbound.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv.slice(2), env: process.env }));
/* 🔴 NO DEFAULT DESTINATION, SINCE 20 SEPTEMBER 2026. The canonical edge graph lives in the external
 * observation batch, where it is immutable evidence. Re-deriving it into THIS repository would put
 * back exactly the artifact the migration removed, so a destination must now be named explicitly.
 * The write stays confined to this repository either way: the engine never writes to the data one. */
const outArg = process.argv.find((a) => a.startsWith("--out="))?.slice("--out=".length) ?? null;
const OUT = outArg === null ? null : confineToRepo(outArg, { label: "--out" });

const crawlRecords = createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl")).readAll();
const pages = pagesFromRun({ crawlRecords, bodies: readBodyArchive(batchFile("bodies-2026-09-12.jsonl.br")) });
const edges = deriveEdges(pages);
const { zero } = inboundOf({ pages, edges });
const packed = packGraph(edges);

console.log(ZERO_INBOUND_DEFINITION);
console.log(`[bound: ${pages.length} distinct pages, ${pages.filter((p) => p.html !== null).length} with a served body]`);
console.log(`edges: ${edges.length} links read from served HTML`);
console.log(`pages with no inbound links inside the crawled set: ${zero.length} — UNKNOWN, not orphans`);
console.log(`packed: ${packed.length} bytes`);

if (!permission.mayWrite) {
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
const tmp = `${OUT}.tmp-${process.pid}`;
writeFileSync(tmp, packed);
renameSync(tmp, OUT);
console.log(`written: ${OUT}`);
