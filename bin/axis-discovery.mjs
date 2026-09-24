#!/usr/bin/env node
/**
 * ROW 6 — AXIS DISCOVERY, OVER THE SUBJECT'S REAL EVIDENCE IN THE STORE.
 *
 *   node bin/axis-discovery.mjs            report only — it reads, prints and exits; it writes nothing
 *   node bin/axis-discovery.mjs --check    the same, and exit 1 naming every limb that fails
 *
 * For every axis the frozen contract names, and every slot type the evidence carries that none of them claims:
 * the values found, demand, the answer-level and question-level distinguishing power, evidence availability,
 * sibling collapse of our own archived pages, human-value delta, whether the estate already hard-codes it, and the
 * verdict with its basis.
 *
 * 🔴 The limit is printed with the result.
 */
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { readBodyArchive } from "../src/evidence/body-archive.mjs";
import { row6, readDeclaredAxes, readDeclaredAnswerEvidence } from "../src/discovery/row6.mjs";
import { loadSubjectPackage } from "../src/subject-package.mjs";
import { INTENT_REFERENCE, AMBIGUOUS, REFERENCE_STATUS } from "../config/discovery/intent-reference.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { everySubjectRegistry } from "../src/tenancy/scoped-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/axis-discovery.mjs", governed: false, resources: [RESOURCES.evidenceStore(), RESOURCES.crawlBatch(BATCH_ID), ...(await everySubjectRegistry())] });
/* F02 relocation: the discovery configuration belongs to a declared SUBJECT PACKAGE, named by --subject (no default).
 * The package is located, never trusted for scope: the gate above already decided every resource this run reads. */
const SUBJECT = await loadSubjectPackage(process.argv.find((a) => a.startsWith("--subject="))?.slice("--subject=".length));
const { LEXICON } = SUBJECT.module.INTENT_LEXICON;
const { AXIS_SPECS, SIBLING_FAMILIES, HARD_CODED_PATTERNS } = SUBJECT.module.AXIS_CANDIDATES;
const records = createJsonlStore(join(REPO, "runs", "evidence", "evidence.jsonl")).readAll();
const crawlRecords = createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl")).readAll();
const bodies = readBodyArchive(batchFile("bodies-2026-09-12.jsonl.br"));

// Each declared product's axis — the axis a human chose by hand, read from its own descriptor.
const declaredAxes = await readDeclaredAxes();

/* 🔴 THE ANSWER EVIDENCE, AND THE SCOPES THAT GOVERN IT. Supplied whatever they resolve to: the gate
 * decides, and a refusal is printed rather than hidden. The axis population's reference is the batch
 * this run actually reads — not a name chosen to make the join succeed. */
const CRAWL_BATCH_REF = "first-real-crawl-2026-09-12.jsonl";
/* 🔴 THE AXIS POPULATION IS HANDED OVER AS ROWS, NOT AS ONE IDENTIFIER. It is a mixed capture over
 * many declared tenants, so its scope is derived from the host each row already stores. */
const axisRows = records.filter((r) => r.record_type === "observation" && Array.isArray(r.value?.rows)).flatMap((o) => o.value.rows);
const answers = await readDeclaredAnswerEvidence({ axisResourceKind: "CRAWL_BATCH", axisResourceRef: CRAWL_BATCH_REF, axisRows });

const r = row6({ records, crawlRecords, bodies, lexicon: LEXICON, reference: INTENT_REFERENCE, ambiguous: AMBIGUOUS, referenceStatus: REFERENCE_STATUS, specs: AXIS_SPECS, families: SIBLING_FAMILIES, patterns: HARD_CODED_PATTERNS, declaredAxes,
  answerClaims: answers.claims, axisScope: answers.axisScope, evidenceScope: answers.evidenceScope });

const i = r.input;
console.log("ROW 6 — AXIS DISCOVERY\n");
console.log(`[input: queries ${i.queries.observationId} · ${i.queries.rows} rows = ${i.queries.human} human + ${i.queries.operators} operator]`);
console.log(`[input: country×query ${i.countryQuery.observationId} · observed ${i.countryQuery.observedAt} · ${i.countryQuery.rows} rows = ${i.countryQuery.human} human + ${i.countryQuery.operators} operator · ${i.countryQuery.countries} searcher countries]`);
console.log(`[input: page rows ${i.pageRows.observationId} · observed ${i.pageRows.observedAt} · ${i.pageRows.rows} pages]`);
console.log(`[input: ${i.archivedBodies} archived page bodies, crawl of 12 September 2026]`);
console.log(`[declared product axes: ${Object.entries(declaredAxes).map(([p, k]) => `${p} → ${k}`).join(" · ") || "none"}]`);
console.log(`[answer evidence: ${answers.claims.length} claim(s) from ${answers.sources.filter((s) => s.state === "RESOLVED").length} declared source(s) of ${answers.sources.length}]`);
for (const s of answers.sources) console.log(`   source ${s.subject} → ${s.ref ?? "no declarable reference"} [${s.state}] ${s.records} record(s)`);
console.log(`[axis population ${CRAWL_BATCH_REF} → ${r.answerEvidence.gate ? r.answerEvidence.gate.axisTenantId ?? "UNDECLARED" : "declared"}]`);
const ps = r.pageRowScopes.arithmetic;
console.log(`[page-row input is a MIXED capture: ${ps.total} row(s) = ${ps.attributed} attributed across ${ps.tenants} declared tenant(s) + ${ps.rejected} rejected + ${ps.unreadable} unreadable · remainder ${ps.remainder}]`);
for (const h of r.pageRowScopes.hosts.filter((x) => x.state === "REJECTED")) console.log(`   🔴 REJECTED ${h.rows} row(s) from ${h.host} — ${h.why}`);
if (r.answerEvidence.gate) {
  console.log(`🔴 ANSWER EVIDENCE REFUSED — ${r.answerEvidence.gate.state} (${r.answerEvidence.gate.reason}): ${r.answerEvidence.gate.basis}`);
  console.log("   Every answer leg therefore stays UNKNOWN, and no axis can reach BUILD or REJECT. This is a REFUSAL, not an absence of evidence.");
} else {
  const decided = Object.entries(r.answerEvidence.byAxis).filter(([, l]) => l.state === "MEASURED");
  console.log(`[answer legs measured: ${decided.length} of ${Object.keys(r.answerEvidence.byAxis).length} axes carrying evidence]`);
  for (const [axis, l] of Object.entries(r.answerEvidence.byAxis)) console.log(`   ${axis} → ${l.state} (${l.reason}): ${l.basis}`);
}
console.log(`\nTHE CONTRACT NAMES: ${r.contractAxes.join(" · ")}`);
if (r.row5Errors.length) console.log(`🔴 row 5's record carries ${r.row5Errors.length} error(s) — row 6 reads it anyway and says so`);

const tally = {};
for (const x of r.results) tally[x.verdict] = (tally[x.verdict] || 0) + 1;
console.log(`\nVERDICTS: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(" · ")} over ${r.results.length} candidates (${r.results.filter((x) => x.named).length} named, ${r.results.filter((x) => !x.named).length} discovered)`);

for (const x of r.results) {
  console.log(`\n══ ${x.axis}${x.named ? ` (named by the contract as '${x.contractName}')` : " (DISCOVERED in the evidence)"} — VERDICT ${x.verdict}`);
  console.log(`   reads: ${x.reads}`);
  console.log(`   discovery [${x.discovery.state}]: ${x.discovery.basis}`);
  const top = x.discovery.values.slice(0, 12).map((v) => `${v.value} ${v.queries}q/${v.impressions}i`).join(" · ");
  if (top) console.log(`     values (${x.discovery.values.length}): ${top}${x.discovery.values.length > 12 ? " · …" : ""}`);
  console.log(`   distinguishing — ANSWER [${x.distinguishing.answer.state}]: ${x.distinguishing.answer.basis}`);
  const q = x.distinguishing.question;
  console.log(`   distinguishing — QUESTION [${q.state}]: ${q.basis}${q.intentsHoldingTwoOrMoreValues !== undefined ? ` (${q.intentsHoldingTwoOrMoreValues} intent(s), ${q.valuesSharingAnIntent} value(s))` : ""}`);
  if (q.perCountry) {
    for (const c of q.perCountry.filter((c) => c.state === "MEASURED")) console.log(`     ${c.value.padEnd(4)} ${String(c.rows).padStart(3)} rows · ${c.basis}`);
    const unknown = q.perCountry.filter((c) => c.state === "UNKNOWN");
    console.log(`     UNKNOWN (LAW-ABSENT-1, fewer than 5 rows): ${unknown.length} countries — ${unknown.map((c) => `${c.value} ${c.rows}`).join(" · ")}`);
  }
  console.log(`   demand [${x.demand.state} · ${x.demand.shape}${x.demand.thin ? " · THIN" : ""}]: ${x.demand.basis}`);
  console.log(`   evidence availability [${x.evidenceAvailability.state}]: ${x.evidenceAvailability.basis}`);
  console.log(`   sibling collapse [${x.siblingCollapse.state}]: ${x.siblingCollapse.basis}`);
  console.log(`   human-value delta [${x.humanValue.state}]: ${x.humanValue.basis}`);
  console.log(`   hard-coded in the estate: ${x.hardCoded.pages} page(s) in the page rows, ${x.hardCoded.impressions} impressions${x.hardCoded.examples.length ? ` — e.g. ${x.hardCoded.examples[0]}` : ""}${x.hardCoded.declaredBy.length ? ` · declared as a product's axis by: ${x.hardCoded.declaredBy.join(", ")}` : ""}`);
  console.log(`   VERDICT ${x.verdict}: ${x.verdictBasis}`);
}

console.log("\n🔴 LIMIT: no axis can reach BUILD or REJECT on owned evidence — the answer at each value is not in the store. A MONITOR is an axis that is present and untested at the level that decides; our own pages differing or collapsing measures our construction, never the answer.");
console.log(`\nERRORS: ${r.errors.length}`);
for (const e of r.errors) console.log(`  🔴 [${e.limb}] ${e.why}`);
if (process.argv.includes("--check") && r.errors.length) {
  console.log(`\nFAILED LIMBS: ${[...new Set(r.errors.map((e) => e.limb))].join(", ")}`);
  process.exit(1);
}
