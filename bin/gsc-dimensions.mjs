#!/usr/bin/env node
/**
 * ITEM 9 — WHICH OF THE SEVEN DIMENSIONS THE EVIDENCE STORE ACTUALLY HOLDS.
 *
 * 🔴 READ-ONLY AND OFFLINE. It reads the local evidence store and prints. No
 * network, no key, no write.
 *
 * A dimension counts as INGESTED only where a stored pull proves its own
 * completeness — exhausted, dataState COMPLETE, row and request counts and both
 * bounds recorded. See `src/search/dimensions.mjs`.
 *
 * 🔴 The country distribution is printed as MEASUREMENT ONLY: counts per
 * country in code order, never sorted by size, never ranked, never labelled.
 *
 * Usage:
 *   node bin/gsc-dimensions.mjs [--store=<evidence.jsonl>] [--countries]
 */

import { existsSync } from "node:fs";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { dimensionCensus, item9Verdict, PASS_DIMENSIONS } from "../src/search/dimensions.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => process.argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? d;
const storePath = arg("store", `${REPO}runs/evidence/evidence.jsonl`);

if (!existsSync(storePath)) {
  console.error(`🔴 no evidence store at ${storePath} — refusing to report seven MISSING dimensions for a file that is not there`);
  process.exit(2);
}

const records = createJsonlStore(storePath).readAll();
const c = dimensionCensus(records);

console.log("ITEM 9 — THE SEVEN DIMENSIONS\n");
console.log(`[bound: ${records.length} records in ${storePath}]\n`);
console.log("PULLS (latest observation of each):");
for (const p of c.pulls) {
  console.log(
    `  ${p.proven ? "proven " : "🔴 NOT PROVEN"}  ${p.pull.padEnd(14)} ${p.startDate}..${p.endDate}  rows=${p.rowCount} requests=${p.requestCount ?? "—"} ` +
      `exhausted=${p.exhausted ?? "—"} dataState=${p.dataState} [bounds: rowLimitPerRequest=${p.rowLimitPerRequest}, maxRequests=${p.maxRequests}]`,
  );
}
console.log("\nDIMENSIONS:");
for (const d of c.dimensions) {
  console.log(`  ${d.state.padEnd(14)} ${d.dimension}`);
  for (const e of d.evidence) console.log(`                 · ${e}`);
}
console.log(`\n${c.ingested} of ${PASS_DIMENSIONS.length} INGESTED · ${c.builtNotRun} BUILT_NOT_RUN · ${c.blocked} BLOCKED · ${c.missing} MISSING`);
console.log(`verdict: ${item9Verdict(c)} — ${c.ingested === PASS_DIMENSIONS.length ? "all seven" : "does NOT tick"}`);

if (process.argv.includes("--countries")) {
  const latest = records
    .filter((r) => r.record_type === "observation" && r.method === "gsc.searchAnalytics.query:country")
    .sort((a, b) => (a.observed_at < b.observed_at ? -1 : 1))
    .at(-1);
  if (!latest) {
    console.log("\ncountries: no country pull is stored.");
  } else {
    console.log(`\nCOUNTRY ROWS — MEASUREMENT ONLY, in code order, not ranked [${latest.value.startDate}..${latest.value.endDate}]`);
    for (const row of [...latest.value.rows].sort((a, b) => String(a.country).localeCompare(String(b.country)))) {
      console.log(`  ${String(row.country).padEnd(4)} impressions=${row.impressions} clicks=${row.clicks} ctr=${row.ctr}`);
    }
  }
}
