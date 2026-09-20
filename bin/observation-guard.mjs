#!/usr/bin/env node
/**
 * 🔴 REFUSE A REAL OBSERVATION ARTIFACT COMMITTED INSIDE THE ENGINE.
 *
 *   node bin/observation-guard.mjs
 *
 * A real crawl of eighteen estate hosts sat in this product-neutral repository from 12 September
 * until it was moved out on 20 September 2026. Nothing had stopped it going in. This exits non-zero
 * if one is here again, and prints the population it scanned so a zero is never a zero over nothing.
 *
 * It reads CONTENT, not filenames: a renamed, recompressed batch is still a batch. It reads nothing
 * outside this repository and writes nothing anywhere.
 */
import { scanEngineTree } from "../src/crawl/observation-guard.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const { scanned, artifacts, forbidden } = scanEngineTree({ repo: REPO });

console.log(`scanned ${scanned} tracked file(s); ${artifacts} carried observation-artifact structure`);

if (forbidden.length === 0) {
  console.log("real observation artifacts committed inside the engine: 0");
  process.exit(0);
}

console.error(`\n🔴 REFUSED — ${forbidden.length} real observation artifact(s) are committed inside the engine repository.`);
console.error("   Real product observations belong in the external data repository, as an observation batch.\n");
for (const f of forbidden) {
  const shape = f.kind === "raw-crawl-batch" ? `${f.crawlRuns} crawl_run record(s)`
    : f.kind === "body-archive" ? `${f.bodyRecords} served body record(s)`
    : `${f.edgeRecords} link record(s)`;
  console.error(`   ${f.path} — ${f.kind}, ${shape}, ${f.realHosts} real host(s)${f.compressed ? ", compressed" : ""}`);
}
process.exit(1);
