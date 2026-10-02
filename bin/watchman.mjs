#!/usr/bin/env node
/**
 * F87 · THE WATCHMAN — failed and refused jobs, unavailable connectors, partial outputs, stale evidence, silent loss and recovery,
 * from records that already exist; count-only.
 *
 *   node bin/watchman.mjs --on=<YYYY-MM-DD> --tenant=<id> --actor=<id> [--product=<id>]      READ-ONLY; writes nothing
 *
 * 🔴 NO DEFAULT DATE: the judging date is stated. 🔴 NOTHING IS MANUFACTURED: no job is run, no failure injected, nothing retried.
 * 🔴 "No recorded mid-write failure" means recovery is UNPROVED — it never reads as passed. 🔴 Alerts are printed, never sent: no
 * channel is declared. The tenant scope of every store read is decided HERE, before any of it is read.
 * Assessment: src/ops/watchman.mjs; reading: src/ops/watchman-reader.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgvOrExit, productIdFromArgv } from "../src/product-cli.mjs";
import { readOperations } from "../src/ops/watchman-reader.mjs";
import { watch, NOT_MEASURED } from "../src/ops/watchman.mjs";

const USAGE = "node bin/watchman.mjs --on=<YYYY-MM-DD> [--product=<id>]";
const ON = process.argv.find((a) => a.startsWith("--on="))?.slice(5) ?? null;
if (!/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) {
  console.error(`\n🔴 --on=<YYYY-MM-DD> is required. There is no default: the date evidence is judged on is a measurement you state.\n   ${USAGE}\n`);
  process.exit(1);
}
const PRODUCT_ID = productIdFromArgv(process.argv);
const SCOPE = scopedEntryPoint({ entry: "bin/watchman.mjs", governed: false, resources: [RESOURCES.costLedger(), RESOURCES.evidenceStore(), RESOURCES.runArtefacts("run stores"), RESOURCES.crawlBatch(BATCH_ID), ...(PRODUCT_ID ? [RESOURCES.subject(PRODUCT_ID)] : [])] });
const facts = PRODUCT_ID ? (await loadRegistry((await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE })).factsDir, PRODUCT_ID)).records : null;

const ops = readOperations();
const w = watch({ ...ops, facts, on: ON });
const { jobs, connectors, outputs, staleness, recovery } = w.parts;
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
const b = ops.bound;
console.log("F87 · THE WATCHMAN — recorded operations only, count-only, read-only");
console.log(`  bound            ${b.costEntries} cost entr(ies) · ${b.evidenceRecords} evidence-store record(s) · ${b.externalObservations} external observation(s) · ${b.renders} render(s) · ${b.crawlRuns} crawl run(s) with ${b.corrections} correction(s) · ${b.batchObservations} batch observation(s) · ${b.trailEvents} trail event(s) · judged on ${ON} (stated) · nothing fetched, run, rendered or written · RR-107 research records not read`);
console.log(`  C1 jobs          cost entries: REFUSED ${jobs.cost.REFUSED} (${fmt(jobs.cost.refusedByCode)}) · ${NOT_MEASURED} ${jobs.cost[NOT_MEASURED]} (spend recorded, no outcome) of ${jobs.cost.of} — ${jobs.verdict}`);
console.log(`                   crawl runs (after ${jobs.runs.corrected} recorded correction(s)): COMPLETE ${jobs.runs.COMPLETE} · PARTIAL ${jobs.runs.PARTIAL} · ${NOT_MEASURED} ${jobs.runs[NOT_MEASURED]} of ${jobs.runs.of}`);
console.log(`                   ${jobs.note}`);
console.log(`  C2 connectors    ${Object.entries(connectors.perKind).map(([k, r]) => `${k}: AVAILABLE ${r.AVAILABLE} · UNAVAILABLE ${r.UNAVAILABLE} · ${NOT_MEASURED} ${r[NOT_MEASURED]} of ${r.of}`).join(" | ") || "none recorded"} · not retrievals, not classed: ${connectors.outsideNotRetrievals} — ${connectors.verdict}`);
console.log(`  C3 outputs       COMPLETE ${outputs.COMPLETE} · PARTIAL ${outputs.PARTIAL} (with a recorded reason ${outputs.partialWithReason}, without ${outputs.partialWithoutReason}) · ${NOT_MEASURED} ${outputs[NOT_MEASURED]} of ${outputs.of} — ${outputs.verdict}`);
console.log(`  C4 staleness     ${staleness.facts ? `facts: ${fmt(staleness.facts.freshness)} of ${staleness.facts.judged} (F45's verified rule)` : `facts: ${NOT_MEASURED} — ${staleness.factsAbsent}`} · other evidence: ${NOT_MEASURED} ${staleness.otherEvidence[NOT_MEASURED]} — ${staleness.otherEvidence.missing} — ${staleness.verdict}`);
console.log(`  C5 silent loss   ALLOWED governed writes ${recovery.allowed}: APPLIED ${recovery.applied} · REFUSED ${recovery.refused} · RECORDED FAILURE ${recovery.recordedFailures} · SILENT LOSS ${recovery.silentLoss} of ${recovery.allowed} — ${recovery.lossVerdict}`);
console.log(`     recovery      ${recovery.recoveryWhy} — ${recovery.recoveryVerdict}`);
console.log(`  C6 alerts        ${w.alerts.length} condition(s) detected · sending: ${w.alertSending}`);
for (const a of w.alerts) console.log(`    ALERT          ${a.condition}: ${a.count} of ${a.denominator}`);
console.log(`  C7 population    ${w.incomplete ? "INCOMPLETE" : "complete"} — absent:`);
for (const s of w.absent) console.log(`    · ${s}`);
console.log(`  verdict          ${w.verdict}`);
