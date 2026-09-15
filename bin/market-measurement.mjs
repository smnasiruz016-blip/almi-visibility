#!/usr/bin/env node
/**
 * ROW 7 — MARKET MEASUREMENT, THE OWNED HALF, OVER THE STORE.
 *
 *   node bin/market-measurement.mjs           report only — it reads, prints and exits; it writes nothing
 *   node bin/market-measurement.mjs --json    print the measurement as JSON (redirect to store it)
 *   node bin/market-measurement.mjs --check   the report, and exit 1 naming every limb that fails
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { measureMarket, marketErrors, DEFERRED } from "../src/discovery/market-measurement.mjs";

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const storeRecords = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const result = measureMarket(storeRecords);

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

const errors = marketErrors({ result, storeRecords });
const T = result.totals;
const line = (name, x) => console.log(`  ${name.padEnd(14)} ${String(x.rows).padStart(5)} rows · ${String(x.impressions).padStart(5)} impressions · ${String(x.clicks).padStart(3)} clicks · ${x.observation_id} · counting (inferred): ${x.countingInferred}`);

console.log("ROW 7 — MARKET MEASUREMENT · THE OWNED HALF · DEMAND AND VISIBILITY/REACH, SEPARATELY\n");
console.log(`segment: ${result.segment.property} — ${result.segment.why}`);
for (const [k, o] of Object.entries(result.input)) console.log(`[input: ${k.padEnd(12)} ${o.observation_id} · ${o.method} · observed ${o.observed_at} · ${o.startDate} → ${o.endDate} · dataState ${o.dataState} · exhausted ${o.exhausted} · truncationReason ${JSON.stringify(o.truncationReason)}]`);

console.log("\nOBSERVED — TOTALS PER CUT, FROM THE ROWS THEMSELVES");
line("property", T.property);
line("by country", T.country);
line("by page", T.page);
line("by query", T.query);
line("country×query", T.countryQuery);
line("query×page", T.queryPage);

const C = result.coverage;
console.log(`\nOBSERVED — QUERY COVERAGE: by property ${C.byProperty.impressions} impressions (${C.byProperty.share}), clicks ${C.byProperty.clicks} · by page ${C.byPage.impressions} (${C.byPage.share}), clicks ${C.byPage.clicks}`);
console.log(`  mixed basis, not the coverage: ${C.mixedBasis.ratio} — ${C.mixedBasis.why}`);
console.log(`  clicked pages ${C.clickedPages}, of which carry any query row: ${C.clickedPagesWithAnyQueryRow} · truncationReason on every query pull: ${C.truncationReasonOnEveryQueryPull.map((x) => JSON.stringify(x)).join(", ")}`);
console.log(`  ${C.explanation.label} — "${C.explanation.claim}": ${C.explanation.why}`);

const D = result.discrepancy;
console.log(`\nTHE ${D.observed.queryPageImpressions}-vs-${D.observed.queryImpressions} DISCREPANCY — ${D.status}`);
const o = D.observed;
console.log(`  ${o.label}: excess ${o.excess} · queries in both ${o.queriesInBoth}, in only one ${o.queriesOnlyInOne} · sums agree on ${o.queriesWhereTheSumsAgree} · excess on ${o.queriesWithExcess}, every one shown with more than one page: ${o.excessQueriesShownWithMoreThanOnePage} · finer cut has fewer: ${o.queriesWhereTheFinerCutHasFewer}`);
console.log(`  country×query agrees with query on ${o.countryQueryAgreesWithQuery} · pages where query×page exceeds the page row: ${o.pagesWhereQueryPageExceedsThePageRow} · the same gap at the top: ${o.theSameGapAtTheTop}`);
for (const e of o.examples) console.log(`    ${JSON.stringify(e.query)} — query row ${e.queryRow}, query×page sum ${e.queryPageSum} over ${e.pages} pages`);
console.log(`  ${D.explanation.label} — "${D.explanation.claim}": ${D.explanation.why}`);

const L = result.dataLag;
console.log(`\nDATA LAG — ${L.label}: the range ends on the pull day: ${L.rangeEndsOnThePullDay}`);
for (const r of L.restatements) console.log(`    ${r.observed_at} ${r.observation_id} · ${r.impressions} impressions · ${r.clicks} clicks`);
console.log(`  grew ${L.grew.impressions} impressions and ${L.grew.clicks} clicks over ${L.grew.hours} hours · final: ${L.final.label} — ${L.final.why}`);

for (const key of ["DEMAND", "VISIBILITY_REACH"]) {
  const m = result.dimensions[key];
  console.log(`\n══ ${m.dimension} — ${m.state}`);
  console.log(`   method: ${m.method.name} · fields ${m.method.fields.join(", ")}`);
  console.log(`   rule: ${m.method.rule}`);
  for (const s of m.source ? [m.source] : m.sources) console.log(`   quoted: ${s.observation_id} · ${s.startDate} → ${s.endDate} · dataState ${s.dataState}`);
  console.log(`   value: ${JSON.stringify(m.value, (k, v) => (k === "top" ? `${v.length} rows (in the JSON)` : v))}`);
  for (const [k, v] of Object.entries(m.limits)) console.log(`   limit · ${k}: ${v}`);
}
for (const key of DEFERRED) {
  const m = result.dimensions[key];
  console.log(`\n══ ${m.dimension} — ${m.state} · measured ${m.measured} · value ${JSON.stringify(m.value)} · method ${JSON.stringify(m.method)}`);
  console.log(`   ${m.why}`);
}

const B = result.backwardsFinding;
console.log(`\n🔴 A FINDING THAT REACHES BACKWARDS — rows ${B.rows.join(", ")}: ${B.observed}. ${B.onTheirFaces}. ${B.action}`);

console.log(`\nERRORS: ${errors.length}`);
for (const e of errors) console.log(`  🔴 [${e.limb}] ${e.why}`);
if (process.argv.includes("--check") && errors.length) {
  console.log(`\nFAILED LIMBS: ${[...new Set(errors.map((e) => e.limb))].join(", ")}`);
  process.exit(1);
}
