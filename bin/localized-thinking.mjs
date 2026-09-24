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
import { countryUrlCensus, reachesRowFive, reachesDecisionPaths, CENSUS_LIMITS } from "../tools/country-url-census.mjs";
import { loadSubjectPackage } from "../src/subject-package.mjs";
import { readReasoningBatch, goalTenancy, judgeReasoning, withEvidenceClasses, row4Verdict, tallyReasoning, OUTCOMES } from "../src/discovery/local-reasoning.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

// the repository root from this file's own path — no URL is constructed in a consumer of the localized-thinking module
const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/localized-thinking.mjs", governed: false, resources: [RESOURCES.evidenceStore(), RESOURCES.runArtefacts("stored discovery results")] });
/* F02 relocation: the discovery configuration belongs to a declared SUBJECT PACKAGE, named by --subject (no default).
 * The package is located, never trusted for scope: the gate above already decided every resource this run reads. */
const SUBJECT = await loadSubjectPackage(process.argv.find((a) => a.startsWith("--subject="))?.slice("--subject=".length));
const { HARD_CODED_PATTERNS } = SUBJECT.module.AXIS_CANDIDATES;
const storeRecords = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const row3 = JSON.parse(readFileSync(join(REPO, ...ROW3_STORED.split("/")), "utf8"));
const result = localizedThinking({ storeRecords, row3, estatePatterns: HARD_CODED_PATTERNS });

/* ── LOCAL REASONING — public-source readings, judged against the phrasing goals above and kept apart from them ──
 * The goal's tenant comes from the query×page pull through the owner's declared SITE_ORIGIN attachments; the batch is
 * read from the declared external root and refused on a hash mismatch. Nothing here is written. */
const QUERY_PAGE = "c97334fdd102df8e";
const queryPage = storeRecords.find((r) => r.record_type === "observation" && r.observation_id === QUERY_PAGE);
if (!queryPage || !queryPage.method.endsWith(":query-page")) throw new Error(`observation ${QUERY_PAGE} (query×page) is not in the store — goal tenancy cannot be resolved, which is not "no tenant"`);
const tenancy = goalTenancy({ goals: result.goals, queryPageRows: queryPage.value.rows, resolve: createTenantResolver() });
const batch = readReasoningBatch();
const judged = withEvidenceClasses(judgeReasoning({ goals: result.goals, records: batch.records, tenancy }), batch.records);
const tally = tallyReasoning(judged);

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify({ ...result, localReasoning: { batch: { locator: batch.locator, sha256: batch.sha256, records: batch.records.length }, tally, groups: judged.groups, refused: judged.refused, orphans: judged.orphans } }, null, 2)}\n`);
  process.exit(0);
}

const walk = (dir, rel) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n), `${rel}${n}/`) : n.endsWith(".mjs") ? [`${rel}${n}`] : []));
const read = (files) => files.map((f) => [f, readFileSync(join(REPO, f), "utf8")]);
const code = new Map(read([...walk(join(REPO, "src"), "src/"), ...walk(join(REPO, "bin"), "bin/"), ...walk(join(REPO, "subjects"), "subjects/")]));
const graph = new Map([...code, ...read(walk(join(REPO, "config"), "config/")), ...read(walk(join(REPO, "tools"), "tools/"))]);
const census = countryUrlCensus(code);
const rowFive = reachesRowFive(graph, "src/discovery/localized-thinking.mjs");
const decisions = reachesDecisionPaths(graph, ["src/discovery/localized-thinking.mjs", "src/discovery/local-reasoning.mjs", "bin/localized-thinking.mjs"]);
const verdict = row4Verdict({ judged, limbA: { construction: census.breaches.length, acceptance: decisions.hits.length, recommendation: decisions.hits.length } });
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

console.log(`\nLOCAL REASONING — public-source readings · ${batch.locator} · sha256 ${batch.sha256} · ${batch.records.length} record(s)`);
console.log(`  FAILURE is read as the conjunction written (owner ruling eb05a3c): limb (a) on this engine's own behaviour — construction ${census.breaches.length} · acceptance and recommendation reachable from row 4's path ${decisions.hits.length} (closure ${decisions.closure.length} files)`);
console.log(`  GROUPS ${tally.groups}: ${Object.entries(tally.letters).filter(([, n]) => n).map(([l, n]) => `${l} ${n}`).join(" · ")} · remainder ${tally.groupRemainder}`);
console.log(`  MEMBERS ${tally.memberTotal}: EVALUATED ${tally.members.EVALUATED} · UNKNOWN ${tally.members.UNKNOWN} · NOT_APPLICABLE ${tally.members.NOT_APPLICABLE} · INVALID ${tally.members.INVALID} · remainder ${tally.memberRemainder}`);
console.log(`  URL axis: E ${tally.urlAxis.E} · F ${tally.urlAxis.F} — a supported difference justifies CONTENT; every group carries separateUrl NOT_RECOMMENDED`);
for (const g of judged.groups.filter((x) => !["K", "L"].includes(x.outcome))) {
  console.log(`  ${g.goal} ${g.kind} → ${g.outcome} (${OUTCOMES[g.outcome]}) · ${g.reasonCode} · tenancy ${g.tenancy.state}${g.urlAxis ? ` · URL axis ${g.urlAxis}` : ""}`);
  for (const m of g.members) console.log(`      ${m.locality} · ${m.rows} row(s) · ${m.impressions} impression(s) · ${m.state}${m.reasoning ? ` · ${m.reasoning.map((r) => `${r.holds ? "HOLDS" : "DOES NOT HOLD"}: ${r.claim}`).join("; ")}` : ""}`);
}
console.log(`  K and L groups: ${judged.groups.filter((x) => ["K", "L"].includes(x.outcome)).map((x) => `${x.goal} ${x.outcome}`).join(" · ")}`);
console.log(`  refused records: ${judged.refused.length} · orphan records: ${judged.orphans.length}`);
console.log(`\nROW 4 VERDICT: ${verdict.verdict}${verdict.completeGroups.length ? ` — complete real group(s): ${verdict.completeGroups.join(", ")}` : ""}`);
for (const r of verdict.reasons) console.log(`  🔴 ${r.code}: ${r.why}`);

const failures = [
  ...errors,
  ...census.breaches.map((b) => ({ limb: "country-to-url", why: `${b.file}:${b.line} ${b.shape}` })),
  ...rowFive.hits.map((h) => ({ limb: "stands-on-failed-row", why: `${h.file} names ${h.names.join(", ")}` })),
  ...decisions.hits.map((h) => ({ limb: "country-accept-or-recommend", why: `${h.file} names ${h.names.join(", ")}` })),
  ...decisions.unread.map((f) => ({ limb: "country-accept-or-recommend", why: `${f} is in row 4's import closure and could not be read — an unread file is not a clean one` })),
  ...judged.refused.map((x) => ({ limb: "reasoning-refused", why: `${x.observation_id}: ${x.errors.map((e) => e.code).join(", ")}` })),
  ...judged.groups.filter((g) => g.outcome === "H").map((g) => ({ limb: "reasoning-tenancy", why: `${g.goal} ${g.reasonCode}` })),
  ...(tally.groupRemainder || tally.memberRemainder ? [{ limb: "reasoning-arithmetic", why: `remainder groups ${tally.groupRemainder} · members ${tally.memberRemainder}` }] : []),
];
console.log(`\nERRORS: ${failures.length}`);
for (const f of failures) console.log(`  🔴 [${f.limb}] ${f.why}`);
if (process.argv.includes("--check") && failures.length) {
  console.log(`\nFAILED LIMBS: ${[...new Set(failures.map((f) => f.limb))].join(", ")}`);
  process.exit(1);
}
