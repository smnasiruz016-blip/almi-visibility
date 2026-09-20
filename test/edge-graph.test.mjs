/**
 * 🔴 ITEM 26 — ONE DEFINITION, ONE STORED GRAPH, AND THE DISAGREEMENT THAT PROVED IT WAS NEEDED.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { readBodyArchive } from "../src/evidence/body-archive.mjs";
import { pagesFromRun, deriveEdges, inboundOf, packGraph, unpackGraph } from "../src/crawl/inbound.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const GRAPH = batchFile("edges-2026-09-12.jsonl.br");
const crawlRecords = createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl")).readAll();
const pages = pagesFromRun({ crawlRecords, bodies: readBodyArchive(batchFile("bodies-2026-09-12.jsonl.br")) });

test("🔴 the STORED graph is exactly what the committed bodies yield — it has not drifted from its source", () => {
  const stored = readFileSync(GRAPH);
  assert.ok(stored.equals(packGraph(deriveEdges(pages))), "the stored edge graph no longer matches the archive it was derived from");
});

test("🔴 over the stored graph, ONE count: 389 distinct pages, 335 with no inbound link inside the crawled set", () => {
  const { zero, pages: n } = inboundOf({ pages, edges: unpackGraph(readFileSync(GRAPH)) });
  assert.equal(n, 389);
  assert.equal(zero.length, 335);
});

test("🔴 WHY 340 AND 341 WERE BOTH WRONG — the counting unit and the host scope, each named", () => {
  const edges = unpackGraph(readFileSync(GRAPH));
  // The five pages two requested URLs reached: per observation they were counted twice.
  const doubled = pages.filter((p) => p.observation_ids.length > 1).map((p) => p.canonical);
  assert.equal(doubled.length, 5);
  const { zero, inbound } = inboundOf({ pages, edges });
  assert.equal(zero.length + doubled.filter((p) => zero.includes(p)).length, 340, "the per-observation count does not reproduce 340");
  // The six sub-site homes linked ONLY from other hosts.
  const sameHostOnly = inboundOf({ pages, edges: edges.filter((e) => e.to_parsed && new URL(e.to).hostname === new URL(e.from).hostname) });
  const onlyWhenCrossHostIgnored = sameHostOnly.zero.filter((p) => !zero.includes(p));
  assert.equal(sameHostOnly.zero.length, 341, "the same-host count does not reproduce 341");
  assert.equal(onlyWhenCrossHostIgnored.length, 6);
  for (const p of onlyWhenCrossHostIgnored) assert.ok(inbound.get(p) >= 300, `${p} is not linked from hundreds of crawled pages`);
});

test("CONTROL: a page linked only from another host is NOT zero-inbound; a page linked by nobody is; a self-link does not count; two URLs to one page are one page", () => {
  const recs = [
    { record_type: "observation", observation_id: "o1", value: { requested_url: "https://a.example.com/", final_url: "https://a.example.com/" } },
    { record_type: "observation", observation_id: "o2", value: { requested_url: "https://b.example.com/x", final_url: "https://b.example.com/x" } },
    { record_type: "observation", observation_id: "o3", value: { requested_url: "https://b.example.com/lonely", final_url: "https://b.example.com/lonely" } },
    { record_type: "observation", observation_id: "o4", value: { requested_url: "https://b.example.com/old", final_url: "https://b.example.com/lonely" } },
  ];
  const bodies = new Map([
    ["o1", '<a href="/">self</a>'],
    ["o2", '<a href="https://a.example.com/">cross-host</a>'],
    ["o3", '<a href="/lonely">self</a>'],
    ["o4", "<p>none</p>"],
  ]);
  const ps = pagesFromRun({ crawlRecords: recs, bodies });
  assert.equal(ps.length, 3, "two requested URLs reaching one page became two pages");
  const { zero } = inboundOf({ pages: ps, edges: deriveEdges(ps) });
  assert.deepEqual(zero, ["https://b.example.com/lonely", "https://b.example.com/x"]);
});
