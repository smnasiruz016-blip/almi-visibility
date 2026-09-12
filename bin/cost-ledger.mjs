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
import { createJsonlStore } from "../src/evidence/store.mjs";
import { makeObservation } from "../src/evidence/records.mjs";
import { sha256Hex } from "../src/evidence/ids.mjs";
import {
  createCostLedger, entryFromCrawlRun, ingestRunsOf, entryFromIngestRun, formatLedgerLine, coverageFailures,
} from "../src/cost/ledger.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const LEDGER = confineToRepo(`${REPO}runs/cost/ledger.jsonl`, { label: "the cost ledger" });
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
  if (!permission.mayWrite) console.log("[dry-run] not stored — add --confirm");
  else console.log(JSON.stringify(createJsonlStore(ACTIONS).appendIfNew(obs)));
  process.exit(0);
}

if (cmd === "backfill") {
  announceWritePermission(permission);
  const crawlDir = `${REPO}runs/crawl`;
  const crawl = readdirSync(crawlDir).filter((f) => f.endsWith(".jsonl")).flatMap((f) => readJsonl(join(crawlDir, f)));
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
  if (!permission.mayWrite) {
    console.log(`\n[dry-run] ${entries.length} entries not written — add --confirm`);
  } else {
    const ledger = createCostLedger(LEDGER);
    const results = entries.map((e) => ledger.append(e));
    console.log(`\nappended ${results.filter((r) => r.appended).length}, already present ${results.filter((r) => !r.appended).length}`);
  }
  process.exit(0);
}

const entries = createCostLedger(LEDGER).readAll();
console.log(`COST LEDGER [bound: ${entries.length} entries in ${LEDGER}]`);
for (const e of entries) console.log(`  ${formatLedgerLine(e)}`);
const failures = coverageFailures(entries);
console.log(`\nUNKNOWN although MEASURABLE (item 45's failure condition): ${failures.length}`);
for (const f of failures) console.log(`  🔴 ${f.entry_id} · ${f.part} — ${f.reason}`);
