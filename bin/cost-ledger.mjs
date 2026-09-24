#!/usr/bin/env node
/**
 * ITEM 45 — THE COST LEDGER.
 *
 *   node bin/cost-ledger.mjs                                 print the ledger, every line with its bound
 *   node bin/cost-ledger.mjs capture-actions --run=<id> [--confirm]
 *        read one GitHub Actions run's timing through `gh api` (repository
 *        metadata, read-only) and store it as an observation
 *   node bin/cost-ledger.mjs backfill [--confirm]
 *        derive one entry per stored LIVE crawl run and per stored ingest run
 *
 * 🔴 NOTHING IS ESTIMATED. Where a figure was not measured, the entry says
 * UNKNOWN and whether it COULD have been measured. The GitHub plan's price and
 * allowance are unmeasured (U-COST-1); no minute is converted into money.
 *
 * Writes only with --confirm, only inside this repository.
 */

import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { makeObservation } from "../src/evidence/records.mjs";
import { sha256Hex } from "../src/evidence/ids.mjs";
import { batchJsonlFiles } from "../src/crawl/observation-batch.mjs";
import {
  createCostLedger, entryFromCrawlRun, ingestRunsOf, entryFromIngestRun, formatLedgerLine, coverageFailures,
} from "../src/cost/ledger.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* 🔴 GAP 2 · TESTABILITY SEAM (17 September 2026): `--store=` names a different COST LEDGER — only the ledger;
 * the Actions timing store is not affected — CONFINED to this repository by the same confineToRepo as the default,
 * refusing before anything is read or written. It chooses WHERE, never WHETHER: the write still needs --confirm.
 * Without it, the default ledger, exactly as before. */
const storeArg = process.argv.slice(2).find((a) => a.startsWith("--store="))?.slice("--store=".length);
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/cost-ledger.mjs", governed: true, resources: [RESOURCES.costLedger(), RESOURCES.evidenceStore(), RESOURCES.crawlBatch(BATCH_ID), RESOURCES.runArtefacts("Actions run timings")] });
const LEDGER = confineToRepo(storeArg ?? `${REPO}runs/cost/ledger.jsonl`, { label: storeArg === undefined ? "the cost ledger" : "--store" });
const ACTIONS = confineToRepo(`${REPO}runs/cost/actions-runs.jsonl`, { label: "the Actions timing store" });
const argv = process.argv.slice(2);
const cmd = argv.find((a) => !a.startsWith("--")) ?? "show";
const arg = (n) => argv.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
const permission = writePermission({ target: LOCAL, argv, env: process.env });

const readJsonl = (p) => (existsSync(p) ? createJsonlStore(p).readAll() : []);

if (cmd === "capture-actions") {
  announceWritePermission(permission);
  const runId = arg("run");
  if (!/^\d+$/.test(runId ?? "")) {
    console.error("usage: node bin/cost-ledger.mjs capture-actions --run=<numeric GitHub Actions run id> [--confirm]");
    process.exit(2);
  }
  const gh = (path) => JSON.parse(execFileSync("gh", ["api", path], { cwd: REPO, encoding: "utf8" }));
  const slug = execFileSync("gh", ["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"], { cwd: REPO, encoding: "utf8" }).trim();
  const run = gh(`repos/${slug}/actions/runs/${runId}`);
  const timing = gh(`repos/${slug}/actions/runs/${runId}/timing`);
  const jobs = gh(`repos/${slug}/actions/runs/${runId}/jobs`);
  const job = jobs.jobs?.[0] ?? {};
  const value = {
    runId,
    workflow: run.name,
    event: run.event,
    conclusion: run.conclusion,
    headSha: run.head_sha,
    run_duration_ms: timing.run_duration_ms,
    billable: timing.billable,
    job: { name: job.name ?? null, started_at: job.started_at ?? null, completed_at: job.completed_at ?? null, labels: job.labels ?? [] },
    note: "read through `gh api` — repository metadata. The billable figure is recorded AS REPORTED and is NOT treated as money: the plan, price and allowance are unmeasured (U-COST-1)",
  };
  const obs = makeObservation({
    observed_at: new Date().toISOString(),
    method: "github.actions.run.timing",
    target: { kind: "artifact", ref: `github-actions-run:${runId}` },
    content_sha256: sha256Hex(JSON.stringify(value)),
    value,
    collector: "bin/cost-ledger.mjs",
    collector_version: "1",
  });
  console.log(`[bound: one Actions run, ${runId}] run_duration_ms=${value.run_duration_ms} billable=${JSON.stringify(value.billable)} job ${value.job.started_at} → ${value.job.completed_at}`);
  /* Routed. One observation, one governed decision; the store still decides appended-versus-re-sighting and the
   * run still prints its answer. */
  const TIMING_INSTANT = governedInstant(Date.now());
  const timingArgs = governedStoreAppend({ ...SCOPE.writeScope,
    repo: REPO, permission, store: createJsonlStore(ACTIONS), records: [obs], targetClass: "RUN_EVIDENCE",
    action: "APPEND_ACTIONS_TIMING_OBSERVATION", occurredAt: TIMING_INSTANT,
    correlationId: `run:cost-ledger:timing:${TIMING_INSTANT}`, discipline: "APPEND_IF_NEW",
  });
  const timingGoverned = executeGovernedWrite(timingArgs);
  if (timingGoverned.outcome === "REFUSED") console.log("[dry-run] not stored — add --confirm");
  else if (timingGoverned.outcome === "COMMITTED" || timingGoverned.outcome === "ALREADY_COMMITTED") {
    console.log(JSON.stringify((timingArgs.adapter.result ?? [])[0]));
  } else {
    console.error(`🔴 ${timingGoverned.outcome} — the observation was not stored; the governed attempt is on the audit trail`);
    process.exit(1);
  }
  process.exit(0);
}

if (cmd === "backfill") {
  announceWritePermission(permission);
  const crawl = batchJsonlFiles().flatMap((p) => createJsonlStore(p).readAll());
  const timings = readJsonl(ACTIONS).filter((r) => r.method === "github.actions.run.timing");
  const recordedAt = new Date().toISOString();
  const entries = [];

  for (const run of crawl.filter((r) => r.record_type === "crawl_run" && r.requestsIssued > 0)) {
    const correction = crawl.find((r) => r.record_type === "crawl_run_correction" && r.corrects_run_id === run.run_id) ?? null;
    const ghRun = run.corpus?.githubRunId ?? null;
    const actionsTiming = ghRun ? timings.find((t) => t.value.runId === String(ghRun)) ?? null : null;
    entries.push(entryFromCrawlRun(run, { correction, actionsTiming, recordedAt }));
  }
  const evidence = readJsonl(`${REPO}runs/evidence/evidence.jsonl`);
  for (const run of ingestRunsOf(evidence)) entries.push(entryFromIngestRun(run, { recordedAt }));

  console.log(`[bound: ${crawl.filter((r) => r.record_type === "crawl_run").length} stored crawl runs (live only are costed), ${evidence.length} evidence records, ${timings.length} Actions timing observation(s)]`);
  for (const e of entries) console.log(`  ${formatLedgerLine(e)}`);
  /* Routed. ONE governed decision for the whole backfill — the write law decides once per run. The cost ledger
   * SKIPS a duplicate entry_id and writes nothing, so the expected line count is asked of that discipline, and
   * the run still reports the ledger's own appended-versus-already-present answer. */
  const BACKFILL_INSTANT = governedInstant(Date.now());
  const backfillArgs = governedStoreAppend({ ...SCOPE.writeScope,
    repo: REPO, permission, store: createCostLedger(LEDGER), records: entries, targetClass: "RUN_EVIDENCE",
    action: "APPEND_COST_LEDGER_BACKFILL", occurredAt: BACKFILL_INSTANT,
    correlationId: `run:cost-ledger:backfill:${BACKFILL_INSTANT}`,
    discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null,
  });
  const backfillGoverned = executeGovernedWrite(backfillArgs);
  if (backfillGoverned.outcome === "REFUSED") {
    console.log(`\n[dry-run] ${entries.length} entries not written — add --confirm`);
  } else if (backfillGoverned.outcome === "COMMITTED" || backfillGoverned.outcome === "ALREADY_COMMITTED") {
    const results = backfillArgs.adapter.result ?? [];
    console.log(`\nappended ${results.filter((r) => r?.appended).length}, already present ${results.filter((r) => !r?.appended).length}`);
  } else {
    console.error(`🔴 ${backfillGoverned.outcome} — the backfill was not written; the governed attempt is on the audit trail`);
    process.exit(1);
  }
  process.exit(0);
}

const entries = createCostLedger(LEDGER).readAll();
console.log(`COST LEDGER [bound: ${entries.length} entries in ${LEDGER}]`);
for (const e of entries) console.log(`  ${formatLedgerLine(e)}`);
const failures = coverageFailures(entries);
console.log(`\nUNKNOWN although MEASURABLE (item 45's failure condition): ${failures.length}`);
for (const f of failures) console.log(`  🔴 ${f.entry_id} · ${f.part} — ${f.reason}`);
