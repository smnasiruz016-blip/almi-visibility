#!/usr/bin/env node
/**
 * F16 · PUBLIC-QUESTION RESEARCH INTAKE — one client's recorded public-question SAMPLE, count-only.
 *
 *   node bin/public-questions.mjs --tenant=<id> --actor=<id> [--research-batch=<id> …]      READ-ONLY; nothing fetched or harvested
 *
 * 🔴 A SAMPLE, NEVER THE WORLD; IT FINDS AND RECORDS, IT NEVER ANSWERS (RR-114). A research batch is read only when named here — the
 * scope gate decides each for THIS tenant and refuses another tenant's. Question wording stays in the store. Intake:
 * src/research/public-questions.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { readClientQuestionRecords } from "../src/research/public-questions-reader.mjs";
import { intakeQuestions, reportLines } from "../src/research/public-questions.mjs";

const BATCHES = process.argv.filter((a) => a.startsWith("--research-batch=")).map((a) => a.slice("--research-batch=".length)).filter(Boolean);
/* nothing is read until a batch is named: an empty list would decide nothing, and an undeclared one is refused by the gate */
if (BATCHES.length === 0) {
  console.error("F16 · name at least one --research-batch=<id>; nothing is read, and the sample is EMPTY — never a pass");
  process.exit(2);
}
const SCOPE = scopedEntryPoint({ entry: "bin/public-questions.mjs", governed: false, resources: BATCHES.map((b) => RESOURCES.researchBatch(b)) });

const read = readClientQuestionRecords({ tenantId: SCOPE.tenantId, resolve: createTenantResolver(), batches: BATCHES });
const r = intakeQuestions(read.records);
console.log("F16 · PUBLIC-QUESTION RESEARCH — this tenant only, recorded research batches only, count-only");
console.log(`  bound  ${BATCHES.length} research batch(es) named · ${read.files} file(s) · ${read.read} record(s) read · ${read.records.length} public-question record(s) in this tenant's partition · ${read.outsidePartition} outside it, never read as this tenant's · nothing fetched, rendered or harvested`);
for (const line of reportLines(r, { limits: `the ${BATCHES.length} named research batch(es) of this tenant, as recorded; no live collection` })) console.log(`  ${line}`);
