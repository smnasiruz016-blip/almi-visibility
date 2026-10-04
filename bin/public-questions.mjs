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
import { samenessFromDeclaration } from "../src/research/sameness.mjs";
import { readFileSync } from "node:fs";
import { overturnedIds, asAt } from "../src/research/meaning-judgement.mjs";

const BATCHES = process.argv.filter((a) => a.startsWith("--research-batch=")).map((a) => a.slice("--research-batch=".length)).filter(Boolean);
/* nothing is read until a batch is named: an empty list would decide nothing, and an undeclared one is refused by the gate */
if (BATCHES.length === 0) {
  console.error("F16 · name at least one --research-batch=<id>; nothing is read, and the sample is EMPTY — never a pass");
  process.exit(2);
}
const SAMENESS_PATH = process.argv.find((a) => a.startsWith("--sameness="))?.slice("--sameness=".length) ?? null;
const SCOPE = scopedEntryPoint({ entry: "bin/public-questions.mjs", governed: false, resources: [...BATCHES.map((b) => RESOURCES.researchBatch(b)), ...(SAMENESS_PATH ? [RESOURCES.inputPath(SAMENESS_PATH, "--sameness")] : [])] });

/* RR-146: the sameness rule is the OWNER's declared input (src/research/sameness.mjs); without one nothing is grouped and the decision is named */
const rule = samenessFromDeclaration(SAMENESS_PATH ? JSON.parse(readFileSync(SAMENESS_PATH, "utf8")) : null);
if (rule.refusal) { console.error(`🔴 REFUSED — ${rule.refusal}: the sameness declaration is not a lawful owner rule; nothing grouped, nothing read`); process.exit(3); }
const read = readClientQuestionRecords({ tenantId: SCOPE.tenantId, resolve: createTenantResolver(), batches: BATCHES });
/* RR-158 §5: an admitted question whose current judgement is no longer CANDIDATE has been OVERTURNED — it leaves every count */
const gone = overturnedIds(read.judgements ?? []);
const r = intakeQuestions(read.records.filter((q) => !gone.has(q.question_id)), { sameAs: rule.sameAs });
console.log("F16 · PUBLIC-QUESTION RESEARCH — this tenant only, recorded research batches only, count-only");
console.log(`  bound  ${BATCHES.length} research batch(es) named · ${read.files} file(s) · ${read.read} record(s) read · ${read.records.length} public-question record(s) in this tenant's partition · ${read.outsidePartition} outside it, never read as this tenant's · nothing fetched, rendered or harvested`);
console.log(`  ${asAt(read.judgements ?? [])}`);
console.log(`  overturned  ${read.records.filter((q) => gone.has(q.question_id)).length} admitted question(s) whose current judgement is no longer CANDIDATE — left out of every count below`);
console.log(`  leads  ${read.leads ?? 0} search lead(s) recorded — leads, never observed questions, and never in any question count below · sameness rule ${rule.ruleId ?? "NONE DECLARED (the owner's open decision)"}`);
for (const line of reportLines(r, { limits: `the ${BATCHES.length} named research batch(es) of this tenant, as recorded; no live collection` })) console.log(`  ${line}`);
