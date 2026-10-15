#!/usr/bin/env node
/**
 * F44 · THE SOURCE READER'S RECHECK of the facts one research batch's pages use (F44 Acceptance Amendment 2, C7–C11; the owner's GREEN of
 * 15 October 2026, RR-268 §B3, for this recheck and nothing wider).
 *
 *   node bin/source-facts.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD --tenant=<id> --actor=<id> [--live --confirm]
 *
 * WITHOUT --live: the plan is printed (counts only) and NO request is made. --live without --confirm opens nothing that can request
 * (F78: the metered connector refuses before any request when the run cannot record its cost). WITH both: each distinct source the facts
 * cite is read ONCE through the engine's one paced path (src/tenancy/connectors.mjs — at least 2 s per host; robots first, through the same
 * path), and NO request at all when the sources and their hosts' robots files outnumber the bound. A source the engine is refused, challenged
 * or handed an empty page by goes to the client's own browser route only when the client has connected and started one — none is declared
 * here, so it is BLOCKED with its URL and reason. Each fact is then CURRENT, CHANGED, BLOCKED or REJECTED (src/facts/source-reader.mjs);
 * a CHANGED fact flags every page that uses it for rebuild; no stored fact is rewritten. Written, through the governed boundary, into the
 * batch's own stores: every read (source-reads.jsonl — the page text kept privately with its sha256, URL and read date) and every recheck
 * (fact-rechecks.jsonl). The connector is the client's declared CITED_SOURCES connector, and it must reach this batch. Counts only are printed.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore, lookupConnector } from "../src/tenancy/root-registry.mjs";
import { openConnector, pacingRecord } from "../src/tenancy/connectors.mjs";
import { writePermission, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { createCostLedger } from "../src/cost/ledger.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";
import { batchFacts } from "../src/facts/batch-facts.mjs";
import { readSource, robotsOn, recheckFacts, recheckCounts, readRecord, recheckRecord, hostOf, SOURCE_READ, READ_STATE } from "../src/facts/source-reader.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const KIND = "CITED_SOURCES";
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? null;
const SUBJECT = arg("subject"), BATCH = arg("research-batch"), ON = arg("on");
if (!SUBJECT || !BATCH || !/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) { console.error("usage: node bin/source-facts.mjs --subject=<id> --research-batch=<id> --on=YYYY-MM-DD [--live --confirm] — nothing read, no request, nothing written"); process.exit(2); }
const permission = writePermission({ target: LOCAL, argv: process.argv, env: process.env });
const live = process.argv.includes("--live");
const SCOPE = scopedEntryPoint({ entry: "bin/source-facts.mjs", governed: true, resources: [RESOURCES.subject(SUBJECT), RESOURCES.researchBatch(BATCH), ...(live ? [RESOURCES.connector(SUBJECT, KIND), RESOURCES.costLedger(ownLedgerRef())] : [])] });
/* F78: a run that opens a connector records its cost — constructed right after the scope gate */
const RUN_COST = live ? runCost({ entryPoint: "bin/source-facts.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO }) : null;

const index = rootIndexFor(process.env);
const store = lookupStore(index, "RESEARCH");
if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}; no request was made`); process.exit(3); }
/* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
const batchDir = join(lookupStore(index, "RESEARCH").dir, BATCH);
if (!existsSync(batchDir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store; no request was made"); process.exit(3); }
const json = (f) => { try { return JSON.parse(readFileSync(join(batchDir, f), "utf8")); } catch { return null; } };
/* the batch's fact registry: the one file it files as facts-registry-<day>.json — none, or more than one, refuses */
const registries = readdirSync(batchDir).filter((f) => /^facts-registry-\d{4}-\d{2}-\d{2}\.json$/.test(f));
if (registries.length !== 1) { console.error(`🔴 REFUSED — FACT_REGISTRY_NOT_ONE: the batch files ${registries.length} fact registries; no request was made`); process.exit(3); }
const drafts = json("page-drafts.json"), findings = json("findings.json"), registry = json(registries[0]), intervals = json("recheck-intervals.json");
if (!Array.isArray(drafts?.pages) || !Array.isArray(findings) || !Array.isArray(registry?.facts)) { console.error("🔴 REFUSED — INTAKE_FILE_UNREADABLE: page-drafts.json, findings.json or the fact registry is not readable in the batch; no request was made"); process.exit(3); }
const facts = batchFacts({ drafts, findings, registry, intervals: Array.isArray(intervals) ? intervals : [] });
const checkable = facts.filter((f) => f.quotations.length > 0 && f.link);
/* every distinct source a fact cites is read — a fact with no quotation still has its source's text kept for a later extraction */
const urls = [...new Set(facts.map((f) => f.link).filter(Boolean))].sort();
const hosts = [...new Set(urls.map(hostOf))].sort();
const t0 = performance.now();

console.log("F44 · SOURCE READER — the recheck of the facts this batch's pages use · counts only");
console.log(`  facts            ${facts.length} (registry ${facts.filter((f) => !f.factId.startsWith("claim:")).length} · claims naming no registry record ${facts.filter((f) => f.factId.startsWith("claim:")).length}) · with a recorded word-for-word quotation ${checkable.length} of ${facts.length} · used on ${new Set(facts.flatMap((f) => f.pages)).size} page(s)`);
console.log(`  plan             ${urls.length} distinct source(s) on ${hosts.length} host(s) · requests needed at most ${urls.length + hosts.length} (each source once, each host's robots file once)`);
console.log(`  bound            at most ${SOURCE_READ.maxRequests} request(s) in this run · the one paced path (at least 2 s between two requests to one host) · robots respected · a plain public request; nothing typed, no login`);
/* no request at all when the plan outnumbers the bound — decided before the connector is opened */
if (urls.length + hosts.length > SOURCE_READ.maxRequests) { console.error(`🔴 REFUSED — OVER_THE_BOUND: ${urls.length + hosts.length} request(s) against a bound of ${SOURCE_READ.maxRequests}. NO REQUEST WAS MADE.`); process.exit(3); }
if (!live) { console.log("  NOT RUN — no --live: the plan only; no request was made and nothing was written"); process.exit(0); }
/* the declared connector must reach THIS batch: a connector declared for another store is not this run's */
const declared = lookupConnector(index, SUBJECT, KIND);
if (declared.state !== "DECLARED" || !(declared.connector.reaches ?? []).some((x) => x.resourceKind === "RESEARCH_BATCH" && x.resourceRef === BATCH)) { console.error("🔴 REFUSED — CITED_SOURCES_CONNECTOR_DOES_NOT_REACH_THIS_BATCH: the client declares no such connector for this batch. NO REQUEST WAS MADE."); process.exit(3); }

const CONNECTOR = RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: KIND }));
const before = pacingRecord();
const robots = robotsOn(CONNECTOR.fetch);
/* the client's own browser route: none is declared for this client — a blocked read is BLOCKED with its URL, never retried by the engine */
const state = { engineReads: 0, reads: 0, stopped: null };
const reads = new Map();
for (const url of urls) reads.set(url, await readSource(url, { fetchImpl: CONNECTOR.fetch, robots, route: null, state, on: ON, maxReads: SOURCE_READ.maxRequests, requestsMade: () => pacingRecord().released - before.released }));
const results = await recheckFacts({ facts, readOf: async (u) => reads.get(u), on: ON });
const counts = recheckCounts(results);
const paced = pacingRecord();
const instant = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const runId = `source-facts:${instant}`;
const tally = (xs, key) => Object.entries(xs.reduce((m, x) => ((m[x[key] ?? "-"] = (m[x[key] ?? "-"] ?? 0) + 1), m), {})).sort().map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log(`  requests         ${paced.released - before.released} released through the paced path (robots ${robots.requestsIssued()} · sources ${state.engineReads}) of a bound of ${SOURCE_READ.maxRequests} · waited ${paced.waited - before.waited} time(s), ${Math.round((paced.waitedMs - before.waitedMs) / 1000)} s in all`);
console.log(`  sources          ${urls.length}: ${tally([...reads.values()], "state")} · blocked by reason: ${tally([...reads.values()].filter((r) => r.state === READ_STATE.BLOCKED), "reason")} · browser route used ${state.reads}`);
console.log(`  recheck          ${counts.facts} fact(s): ${Object.entries(counts.byState).map(([k, n]) => `${k} ${n}`).join(" · ")} · due by their own interval ${results.filter((r) => r.due === true).length}`);
for (const [h, s] of Object.entries(counts.byHost).sort()) console.log(`    ${h.padEnd(28)} ${Object.entries(s).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
console.log(`  pages flagged    ${counts.pagesFlagged.length} for rebuild (a CHANGED fact flags every page that uses it)${counts.pagesFlagged.length ? `: ${counts.pagesFlagged.join(", ")}` : ""}`);

const append = (records, file) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: store.rootPath, auditRepo: REPO, permission, store: createJsonlStore(join(batchDir, file)), records,
  targetClass: "GENERATED_CONFIG", action: "APPEND_SOURCE_FACTS", occurredAt: instant, correlationId: `run:source-facts:${file}:${instant}`, discipline: "APPEND_IF_NEW" }));
const kept = (g) => g.outcome === "COMMITTED" || g.outcome === "ALREADY_COMMITTED";
const g = append([...reads.values()].map((r) => readRecord({ read: r, tenantId: SCOPE.tenantId, on: ON, run: runId })), "source-reads.jsonl");
if (!kept(g)) { console.error(`  🔴 ${g.outcome} — the reads did NOT persist`); process.exit(1); }
const h = append(results.map((r) => recheckRecord({ result: r, tenantId: SCOPE.tenantId, on: ON, run: runId })), "fact-rechecks.jsonl");
if (!kept(h)) { console.error(`  🔴 ${h.outcome} — the rechecks did NOT persist`); process.exit(1); }
console.log(`  kept             ${reads.size} read(s) in the batch's source-reads store · ${results.length} recheck(s) in its fact-rechecks store · ${Math.round((performance.now() - t0) / 1000)} s`);
