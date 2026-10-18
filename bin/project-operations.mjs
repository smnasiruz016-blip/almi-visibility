#!/usr/bin/env node
/**
 * F87 · OPERATIONAL MONITORING ALERTS AND RECOVERY — one client project's own operations (acceptance _handoffs
 * AlmiVisibility_F87_ACCEPTANCE_2026-10-17.md; scope by beta-g decision B, RR-284).
 *
 *   node bin/project-operations.mjs --subject=<id> --research-batch=<id> --on=<YYYY-MM-DD> --tenant=<id> --actor=<id>
 *                                                     prints the report; writes nothing but the governed attempt on the trail
 *   ... --confirm                                     also writes it to runs/ops/operations-report-<on>.txt, a local file the owner reads
 *
 * Failed or refused runs of THIS project's tenant on the audit trail, facts past their own recheck interval on the stated date, sources
 * BLOCKED in their latest read, stores left half-written and writes begun and never finished (src/ops/project-operations.mjs). Nothing
 * is fetched, run, retried or sent. Recovery is never run here: it runs on a scratch copy only (test/f87-project-operations.test.mjs).
 * 🔴 runs/ops/ is ignored by git — the report names the project's own sources and stays on this machine.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { writePermission, announceWritePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { batchFacts } from "../src/facts/batch-facts.mjs";
import { failedRuns, staleFacts, blockedSources, partialOutputs, operationsReport } from "../src/ops/project-operations.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on");
if (!SUBJECT || !BATCH || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) { console.error("usage: node bin/project-operations.mjs --subject=<id> --research-batch=<id> --on=<YYYY-MM-DD> [--confirm] — the date is stated, never the clock's; nothing read"); process.exit(2); }
const SCOPE = scopedEntryPoint({ entry: "bin/project-operations.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH)] });
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const index = rootIndexFor(process.env);
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory; nothing read"); process.exit(3); }
const json = (f) => { try { return JSON.parse(readFileSync(join(batchDir, f), "utf8")); } catch { return null; } };
const rows = (f) => { try { return readFileSync(join(batchDir, f), "utf8").split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } };
const registries = readdirSync(batchDir).filter((f) => /^facts-registry-\d{4}-\d{2}-\d{2}\.json$/.test(f));
if (registries.length !== 1) { console.error(`🔴 REFUSED — FACT_REGISTRY_NOT_ONE: the batch files ${registries.length} fact registries; nothing written`); process.exit(3); }
const intervals = json("recheck-intervals.json");
const facts = batchFacts({ drafts: json("page-drafts.json"), findings: json("findings.json") ?? [], registry: json(registries[0]), intervals: Array.isArray(intervals) ? intervals : [] });
/* the engine's own audit trail, line by line; a line that does not parse is skipped here and counted by bin/watchman.mjs */
const events = readFileSync(join(REPO, "audit-trail", "events.jsonl"), "utf8").split(/\r?\n/).filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });

const runs = failedRuns(events, { tenantId: SCOPE.tenantId });
const stale = staleFacts(facts, { on: ON, rechecks: rows("fact-rechecks.jsonl") });
const sources = blockedSources(rows("source-reads.jsonl"));
const partial = partialOutputs({ dir: batchDir, events, tenantId: SCOPE.tenantId });
const report = operationsReport({ subject: SUBJECT, on: ON, runs, facts: stale, sources, partial });
console.log("F87 · THIS PROJECT'S OPERATIONS — nothing fetched, run, retried or sent");
console.log(`  C1 failed runs   ${runs.inTrail} of this project on the trail (the engine's own, no project: ${runs.engineOwn}, not listed)`);
console.log(`  C2 stale facts   ${stale.stale.length} of ${stale.of} · current ${stale.current} · not measured ${stale.notMeasured.length} (on ${ON})`);
console.log(`  C3 blocked       ${sources.blocked.length} of ${sources.sources} sources in their latest read`);
console.log(`  C4 partial       stores half-written ${partial.halfWritten.length} of ${partial.files} · writes never finished ${partial.neverFinished.length}`);
const INSTANT = isoSeconds(Date.now());
const where = join(REPO, "runs", "ops", `operations-report-${ON}.txt`);
const g = executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope, repo: REPO, permission, target: where, targetClass: "RUN_EVIDENCE", bytes: report,
  action: "WRITE_OPERATIONS_REPORT", occurredAt: INSTANT, correlationId: `run:project-operations:${INSTANT}` }));
if (g.authorisation) console.log(`  C6 report        [refused] not written: authorisation ${g.authorisation}`);
else if (g.outcome === "REFUSED") { console.log(`  C6 report        [dry-run] would have written ${where} — --confirm to write\n`); console.log(report); }
else if (g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED") console.log(`  C6 report        written: ${where} (${Buffer.byteLength(report, "utf8")} bytes) [${g.outcome}] — a local file; nothing sent`);
else { console.error(`🔴 ${g.outcome} — the report was not written; the governed attempt is on the audit trail`); process.exitCode = 1; }
