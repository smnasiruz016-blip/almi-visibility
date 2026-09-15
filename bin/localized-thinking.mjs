#!/usr/bin/env node
/**
 * ROW 4 — LOCALIZED HUMAN THINKING, OVER THE STORE. OWNED EVIDENCE ONLY.
 *
 *   node bin/localized-thinking.mjs           report only — it reads, prints and exits; it writes nothing
 *   node bin/localized-thinking.mjs --json    print the local-wording records as JSON (redirect to store them)
 *   node bin/localized-thinking.mjs --check   the report, and exit 1 naming every limb that fails
 *
 * Grouped on row 3's stored records. Half (b) of the FAILURE clause is BLOCKED — NOT TESTED, and this runner never
 * reports it otherwise.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { localizedThinking, localizedThinkingErrors, ROW3_STORED } from "../src/discovery/localized-thinking.mjs";
import { countryUrlCensus, reachesRowFive, CENSUS_LIMITS } from "../tools/country-url-census.mjs";
import { HARD_CODED_PATTERNS } from "../config/discovery/axis-candidates.mjs";

// the repository root from this file's own path — no URL is constructed in a consumer of the localized-thinking module
const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const storeRecords = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const row3 = JSON.parse(readFileSync(join(REPO, ...ROW3_STORED.split("/")), "utf8"));
const result = localizedThinking({ storeRecords, row3, estatePatterns: HARD_CODED_PATTERNS });

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

const walk = (dir, rel) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n), `${rel}${n}/`) : n.endsWith(".mjs") ? [`${rel}${n}`] : []));
const read = (files) => files.map((f) => [f, readFileSync(join(REPO, f), "utf8")]);
const code = new Map(read([...walk(join(REPO, "src"), "src/"), ...walk(join(REPO, "bin"), "bin/")]));
const graph = new Map([...code, ...read(walk(join(REPO, "config"), "config/"))]);
const census = countryUrlCensus(code);
const rowFive = reachesRowFive(graph, "src/discovery/localized-thinking.mjs");
const errors = localizedThinkingErrors({ result, storeRecords, row3 });

const i = result.input;
const p = result.population;
const c = result.counts;
console.log("ROW 4 — LOCALIZED HUMAN THINKING · OWNED EVIDENCE ONLY\n");
console.log(`[input: country×query ${i.countryQuery.observation_id} · ${i.countryQuery.method} · ingested ${i.countryQuery.observed_at} · ${i.countryQuery.rows} rows]`);
console.log(`[input: page rows     ${i.pageRows.observation_id} · ${i.pageRows.method} · ingested ${i.pageRows.observed_at} · ${i.pageRows.rows} pages]`);
console.log(`[input: row 3's stored records · ${i.row3.stored} · ${i.row3.records} records]`);
console.log(`\nDEPENDENCY — built on ${result.dependency.builtOn}`);
console.log(`  NOT built on ${result.dependency.notBuiltOn}`);
console.log(`  import closure of the module: ${rowFive.closure.join(", ")} · row-5 references: ${rowFive.hits.length} · unread: ${rowFive.unread.length}`);

console.log(`\nPOPULATION: ${p.rows} rows = ${p.humanRows} human + ${p.operatorRows} operator · ${p.distinctQueries} distinct query strings`);
console.log(`  seen from two or more countries: ${p.multiCountryQueries} — ${p.multiCountryHuman} human, and ${p.multiCountryOperator.length} operator string(s), kept out and counted:`);
for (const o of p.multiCountryOperator) console.log(`    ${JSON.stringify(o.original)} — ${o.countries.join(", ")}`);
console.log(`  widest spread: ${p.widestSpread.countries} countries — ${p.widestSpread.queries.map((q) => `${JSON.stringify(q.original)} (${q.countries.join(",")})`).join(" and ")}`);
console.log(`  countries over ALL rows: ${p.countriesAllRows.countries} · with ≥ ${result.rules.COUNTRY_FLOOR} rows ${p.countriesAllRows.atOrAboveFloor} · with exactly one ${p.countriesAllRows.exactlyOne}`);
console.log(`  countries over HUMAN rows: ${p.countriesHumanRows.countries} · with ≥ ${result.rules.COUNTRY_FLOOR} rows ${p.countriesHumanRows.atOrAboveFloor} · with exactly one ${p.countriesHumanRows.exactlyOne} · seen only in operator rows: ${p.operatorOnlyCountries.join(", ") || "none"}`);
console.log(`  human country×query wordings that are not row 3 records: ${p.outsideRow3.queries} (seen from two or more countries: ${p.outsideRow3.multiCountry.length})`);

console.log(`\nTHE THIN-EVIDENCE LAW — ${result.rules.floor}`);
console.log(`  above the floor (${c.countriesAboveFloor}): ${result.countries.filter((x) => x.status === "ABOVE_FLOOR").map((x) => `${x.country} ${x.humanRows}`).join(" · ")}`);
console.log(`  🔴 UNKNOWN (${c.countriesUnknown}): ${result.countries.filter((x) => x.status === "UNKNOWN").map((x) => `${x.country} ${x.humanRows}`).join(" · ")}`);

console.log(`\nGROUPING — ${result.rules.grouping}`);
console.log(`  row 3 relations used as links: SYNONYM ${result.relationsUsed.SYNONYM} · ABBREVIATION ${result.relationsUsed.ABBREVIATION} · VARIANT ${result.relationsUsed.VARIANT}`);
console.log(`  row 3 ABBREVIATION pairs REFUSED as links, not the same frame: ${result.abbreviationPairsRefused.length}`);
for (const r of result.abbreviationPairsRefused) console.log(`    ${JSON.stringify(r.a)} · ${JSON.stringify(r.b)} [${r.short}=${r.long}]`);
console.log(`\nGOALS EXPRESSED FROM TWO OR MORE COUNTRIES: ${c.goals} — worded differently ${c.DIFFERENT_WORDING} · the same wording in several countries ${c.SAME_WORDING}`);
for (const g of result.goals) {
  console.log(`  ${g.goal} ${g.kind} · ${g.countries.length} countries · above the floor: ${g.countriesAboveFloor.join(",") || "none"} · UNKNOWN: ${g.countriesUnknown.join(",") || "none"}`);
  for (const w of g.wordings) console.log(`      ${JSON.stringify(w.original)} — ${w.countries.map((x) => x.country).join(",") || "(no country row — joins the goal through row 3's relations)"}`);
  for (const l of g.links) console.log(`      linked: ${JSON.stringify(l.a)} ↔ ${JSON.stringify(l.b)} [${l.relation}${l.words ? ` ${l.words.join("↔")}` : ""}${l.short ? ` ${l.short}=${l.long}` : ""}${l.form ? ` · ${l.form}` : ""}]`);
}
console.log(`  ${result.rules.absence}`);

console.log(`\nREASONING — ${result.reasoning.state}: ${result.reasoning.why}`);
console.log(`\nFAILURE (a) "${result.halfA.clause}" — ${result.halfA.state}`);
console.log(`  COUNTRY→URL CENSUS: consumers ${census.consumers.join(", ") || "(none)"} · URL-shaped constructions in them: ${census.breaches.length}`);
for (const b of census.breaches) console.log(`  🔴 ${b.file}:${b.line} ${b.shape} — ${b.text}`);
console.log(`FAILURE (b) "${result.halfB.clause}" — 🔴 ${result.halfB.state}`);
console.log(`  why: ${result.halfB.why}`);
console.log(`  unblocked by: ${result.halfB.unblockedBy}`);

const e = result.estate;
console.log("\n🔴 WHAT THE CENSUS CANNOT SEE:");
for (const l of CENSUS_LIMITS) console.log(`  · ${l}`);
console.log(`  · THE ESTATE, measured from the page rows ${e.observation_id}: ${e.originHardCoded} of ${e.pages} pages hard-code an origin (${e.impressions} impressions) — e.g. ${e.example}`);
console.log(`    on ${e.row6.supportingQueries} supporting queries, with our pages differing only by origin overlapping at median ${e.row6.siblingOverlapMedian} (${e.row6.siblingPairs} pairs) — cited from ${e.row6.source}`);
console.log(`    ${e.why}`);
console.log("\nLIMITS:");
for (const l of result.limits) console.log(`  · ${l}`);

const failures = [
  ...errors,
  ...census.breaches.map((b) => ({ limb: "country-to-url", why: `${b.file}:${b.line} ${b.shape}` })),
  ...rowFive.hits.map((h) => ({ limb: "stands-on-failed-row", why: `${h.file} names ${h.names.join(", ")}` })),
];
console.log(`\nERRORS: ${failures.length}`);
for (const f of failures) console.log(`  🔴 [${f.limb}] ${f.why}`);
if (process.argv.includes("--check") && failures.length) {
  console.log(`\nFAILED LIMBS: ${[...new Set(failures.map((f) => f.limb))].join(", ")}`);
  process.exit(1);
}
