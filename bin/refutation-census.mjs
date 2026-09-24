#!/usr/bin/env node
/**
 * ROW 59 — THE REFUTATION CENSUS, OVER THE REAL POPULATION IN THE STORE.
 *
 *   node bin/refutation-census.mjs          report only — it reads, prints and exits; it writes nothing
 *
 * Prints the population it checked (every issue_class present, every drafted recommendation), the methods this
 * product holds, and every refutation that is missing, unrefutable, has an empty part, names an unobtainable
 * method, or is stale. Exit 0 only when every presented finding carries all three parts and a held method.
 *
 * 🔴 The limit is printed with the result: presence and a held method are proved; a well-chosen refutation is not.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { refutationCensus } from "../src/audit/falsifiability.mjs";
import { REFUTATION_REGISTER } from "../config/refutation-register.mjs";
import { scopedEntryPoint, RESOURCES } from "../src/tenancy/scoped-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/refutation-census.mjs", governed: false, repoUrl: import.meta.url, resources: [RESOURCES.runArtefacts("audit finding stores")] });
const AUDIT = join(REPO, "runs", "audit");
const records = readdirSync(AUDIT).filter((f) => f.endsWith(".jsonl")).flatMap((f) => createJsonlStore(join(AUDIT, f)).readAll());
const runners = readdirSync(join(REPO, "bin")).filter((f) => f.endsWith(".mjs")).map((f) => `bin/${f}`);

const c = refutationCensus({ records, register: REFUTATION_REGISTER, runners });

console.log("ROW 59 — REFUTATION CENSUS\n");
console.log(`[bound: ${records.length} records read from runs/audit/*.jsonl]`);
console.log(`POPULATION CHECKED: ${c.checked} — ${c.population.classes.length} finding classes present in the store · ${c.population.recommendations.length} drafted recommendations`);
console.log(`  classes         : ${c.population.classes.join(", ") || "(none)"}`);
console.log(`  recommendations : ${c.population.recommendations.join(", ") || "(none)"}`);
console.log(`methods held      : ${c.methodsHeld.length} (detectors recorded in the store + runners in bin/)\n`);
console.log(`carrying all three parts and a held method : ${c.carrying.length} of ${c.checked}`);
for (const x of c.carrying) console.log(`  ✅ ${x.kind.padEnd(14)} ${x.key}  ← ${x.method}`);
const list = (label, xs, fmt) => {
  console.log(`${xs.length ? "🔴" : "✅"} ${label}: ${xs.length}`);
  for (const x of xs) console.log(`     ${fmt(x)}`);
};
list("MISSING — no refutation", c.missing, (x) => `${x.kind} ${x.key}`);
list("NOT WRITTEN — declared unrefutable", c.unrefutable, (x) => `${x.kind} ${x.key}: ${x.reason}`);
list("EMPTY PART", c.emptyParts, (x) => `${x.kind} ${x.key}: ${x.part}`);
list("UNOBTAINABLE — the source names no method we hold", c.unobtainable, (x) => `${x.kind} ${x.key}: ${x.method}`);
list("STALE — in the register, not in the store", c.stale, (x) => `${x.kind} ${x.key}`);
if (c.vacuous) console.log("🔴 VACUOUS — the population is empty; an empty census is a FAILURE, not a pass");
console.log(`\n🔴 LIMIT: ${c.limit}`);
console.log(c.ok ? "\n✅ every presented finding carries a structured refutation" : "\n🔴 CENSUS FAILED");
process.exit(c.ok ? 0 : 1);
