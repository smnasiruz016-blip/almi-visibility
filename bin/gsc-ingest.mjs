#!/usr/bin/env node
/**
 * ITEM 4 — the connector test (V5.1 §252) and the estate table.
 *
 * ── 🔴 WHAT THIS TOUCHES ────────────────────────────────────────────────────
 *
 * The ONLY network call is an authenticated READ of Google's Search Console API
 * against a property the owner granted on 11 September 2026. It fetches NO
 * AlmiWorld page, contacts NO AlmiWorld server, and writes NOTHING anywhere but
 * a local JSONL file.
 *
 * ── 🔴 AND WHAT IT PRINTS ───────────────────────────────────────────────────
 *
 * Counts, hostnames, property ids and the project id. NOTHING derived from the
 * key file — not a prefix, not a length. `--show-queries` does not exist.
 *
 * ── WHY THE PIPELINE IS NOT IN THIS FILE ────────────────────────────────────
 *
 * It used to be, and that made "re-running the ingest is idempotent" a claim
 * that could only be tested against production — so nobody tested it, and it
 * was false. The pipeline is `src/search/ingest.mjs`, which takes its provider
 * and its store as arguments and runs in the suite against a fake provider.
 * This file is argument parsing and printing.
 *
 * Usage:
 *   GSC_SERVICE_ACCOUNT_KEY_FILE=<path> node bin/gsc-ingest.mjs --property=sc-domain:example.com
 *   node bin/gsc-ingest.mjs --property=sc-domain:<id containing the marker> --source=<synthetic source file>
 *                                        the gap 2 test seam: no request, no key read (see --source below)
 */

import { createGoogleSearchConsoleProvider } from "../src/search/google-search-console.mjs";
import { runIngest } from "../src/search/ingest.mjs";
import { createJsonlStore, createDryRunStore } from "../src/evidence/store.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend, governedFileWrite } from "../src/governance/governed-run.mjs";
import { openOperation, parseJournal, journaledProvider, markCommitted, operationClock, OperationRefused } from "../src/search/ingest-operation.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { formatBoundedResult } from "../src/report/bounded.mjs";
import { createCostGovernor } from "../src/cost/governor.mjs";
import { createCostLedger, entryFromLiveIngest, formatLedgerLine } from "../src/cost/ledger.mjs";
import { readFileSync, existsSync } from "node:fs";
import { isAbsolute, join, relative } from "node:path";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { openConnector } from "../src/tenancy/connectors.mjs";
import { RESOURCES, declaredSiteHosts } from "../src/tenancy/scoped-run.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (name, fallback = null) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const propertyId = arg("property");
const days = Number(arg("days", "28"));
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
/* 🔴 F03 — a live ingest reaches Search Console through the SEARCH_CONSOLE_API connector of the subject it runs for
 * (--subject=<declared id>); its key file's path is read from the ONE variable that declaration names. The synthetic seam
 * (--source) makes no request and constructs no connector. */
const SUBJECT = arg("subject");
const SCOPE = scopedEntryPoint({ entry: "bin/gsc-ingest.mjs", governed: true, resources: [...(arg("source") === null ? [RESOURCES.connector(SUBJECT, "SEARCH_CONSOLE_API"), RESOURCES.costLedger(ownLedgerRef())] : [RESOURCES.costLedger()]), RESOURCES.evidenceStore(), RESOURCES.inputPath(arg("store"), "--store"), RESOURCES.inputPath(arg("source"), "--source"), RESOURCES.inputPath(arg("journal-dir"), "--journal-dir")] });
/* RR-244 (F78 Amendment 2): the cost recorder is constructed immediately after the scope gate */
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
/* F78 Amendment 1 C8/C9 (RR-243): a LIVE run (the only kind that opens a connector) writes its cost into its tenant's own declared
 * ledger — its own entry, or, when it ends before that, one run entry, whatever ended it; without --confirm it makes no request at all */
const RUN_COST = arg("source") === null ? runCost({ entryPoint: "bin/gsc-ingest.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO }) : null;
/* F02: this run's hosts are the site origins DECLARED to its tenant — no estate list in shared code (relocated, 24 Sep 2026). */
const DECLARED_HOSTS = declaredSiteHosts({ tenantId: SCOPE.tenantId });
/* 🔴 GAP 2 (16 September 2026) — the evidence store and the cost ledger are both confined before the
 * first request, and the run is DRY BY DEFAULT: without --confirm it queries, reports every number,
 * and stores nothing. The observations are written inside `runIngest`, so the gate is WHICH STORE it
 * is handed — the dry-run implementation of the same interface when the write is not permitted. */
const storePath = confineToRepo(arg("store", `${REPO}runs/evidence/evidence.jsonl`), { label: "--store" });
/* F77 R2: one journal per ingest operation, BESIDE the store it collects for — so a disposable store takes its journals with it.
 * Never committed (.gitignore): a journal holds the metered responses. */
const JOURNAL_DIR = confineToRepo(arg("journal-dir", `${storePath}.operations`), { label: "--journal-dir" });
const controlProperty = arg("control", "https://example.com/");
/* 🔴 GAP 2 (17 September 2026) — --source=<path>: the testability seam. A SYNTHETIC source file, CONFINED to this
 * repository by the same confineToRepo as --store, stands in for Search Console, so the suite can drive the real
 * pipeline and the real store gate with no network and no credentials. It chooses WHAT DATA, never WHETHER to
 * write: the store is still chosen by permission alone. Absent by default; without it, nothing below changes.
 * Everything it produces is MARKED — every property id must contain SYNTHETIC_MARKER, and every property record
 * and every cost object carries it — and it can never reach committed state: with --confirm, a store under runs/
 * is REFUSED, and the cost ledger is never written. */
const SYNTHETIC_MARKER = "synthetic-gsc-source";
const sourceArg = arg("source");
const SOURCE = sourceArg === null ? null : confineToRepo(sourceArg, { label: "--source" });

if (!propertyId) {
  console.error("usage: node bin/gsc-ingest.mjs --property=sc-domain:<domain> [--days=28]");
  process.exit(2);
}

function refuseSource(why) {
  console.error(`REFUSED — --source: ${why}. Nothing was read from Search Console and nothing was written.`);
  process.exit(2);
}
if (SOURCE !== null && permission.mayWrite) {
  const inRuns = relative(join(REPO, "runs"), storePath);
  if (!inRuns.startsWith("..") && !isAbsolute(inRuns)) {
    refuseSource(`a synthetic run may not write into committed state, and the store ${storePath} is under runs/ — give --store=<a disposable store>`);
  }
}

/** The live provider, through the run's SEARCH_CONSOLE_API connector: its fetch, and the key-file path read from the one
 * variable the declaration names — read here, at construction, and handed straight in; never printed or kept. */
function liveProvider(governor) {
  const connector = RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: SUBJECT, kind: "SEARCH_CONSOLE_API" }));
  if (!connector.credentialName) {
    console.error("REFUSED — the SEARCH_CONSOLE_API connector declares no credential. Nothing was requested.");
    process.exit(2);
  }
  return createGoogleSearchConsoleProvider({ governor, fetchImpl: connector.fetch, keyFilePath: process.env[connector.credentialName] });
}

/** The synthetic stand-in: the provider interface the pipeline takes, answered from the source file. No request. */
function syntheticProvider(file, governor) {
  let spec = null;
  try {
    spec = JSON.parse(readFileSync(file, "utf8"));
  } catch {
    refuseSource(`${file} is not a readable JSON source`);
  }
  if (spec?.marker !== SYNTHETIC_MARKER) refuseSource(`${file} does not declare marker "${SYNTHETIC_MARKER}"`);
  const properties = Array.isArray(spec.properties) ? spec.properties : [];
  if (properties.length === 0 || properties.some((p) => !String(p?.propertyId).includes(SYNTHETIC_MARKER))) {
    refuseSource(`every property id in ${file} must contain "${SYNTHETIC_MARKER}"`);
  }
  const cost = () => ({ provider: SYNTHETIC_MARKER, synthetic: true, apiCalls: 1, billableUnits: 0, currency: "USD", amount: 0, amountState: "ZERO_BY_TARIFF", basis: "synthetic source — no request issued" });
  return {
    providerId: SYNTHETIC_MARKER,
    async listProperties() {
      const observedAt = new Date().toISOString();
      return properties.map((p) => ({ ...p, authState: "GRANTED", synthetic: SYNTHETIC_MARKER, observedAt }));
    },
    async queryRows({ propertyId: id, dimensions = [], rowLimitPerRequest = 25000, maxRequests = 20 }) {
      governor.charge();
      const known = properties.some((p) => p.propertyId === id);
      const rows = known ? (spec.rows?.[dimensions.join(",")] ?? []) : [];
      return {
        rows, rowCount: rows.length, requestCount: 1, exhausted: known, truncationReason: known ? null : "API_ERROR",
        dataState: known ? "COMPLETE" : "UNKNOWN", propertyId: id, httpStatus: known ? 200 : 403,
        rowLimitPerRequest, maxRequests, latestDateWithData: null, cost: cost(), observedAt: new Date().toISOString(),
      };
    },
  };
}

/* 🔴 ITEM 45 — the run is governed and costed AS IT HAPPENS. The eight ingest
 * runs before 12 September 2026 recorded no start and no finish, so their
 * wall-clock is UNKNOWN for ever; this one is not. */
const startedAt = new Date().toISOString();
const governor = createCostGovernor({ label: "google-search-console ingest run" });
/* 🔴 F77 R2 (owner ruling RR-82 §2.1; F77 Amendment 1) — THE OPERATION AND ITS IDENTITY.
 *   --operation=<id>   a journal for <id> exists → a RETRY of that operation: every answered metered call is replayed from the
 *                      journal, only never-issued calls are issued, nothing already saved is saved again, and a call issued but
 *                      never answered is REFUSED (it may already have counted against the quota);
 *                      no journal → a FRESH collection under <id>.
 *   (absent)           a FRESH collection under a new id: every call is issued and charged, and it records a new sighting.
 * The journal is written through the governed boundary only when the run may write; a dry run keeps it in memory. */
const operationId = arg("operation") ?? `gsc-${Date.now()}`;
const journalPath = join(JOURNAL_DIR, `${operationId}.json`);
let operation;
try {
  operation = openOperation({ operationId, existing: existsSync(journalPath) ? parseJournal(readFileSync(journalPath, "utf8")) : null });
} catch (e) {
  console.error(`REFUSED — ${e.message}. Nothing was requested and nothing was written.`);
  process.exit(2);
}
if (operation.committed) {
  console.log(`operation ${operationId}: ALREADY COMMITTED — a retry issues no metered query and saves nothing.`);
  process.exit(0);
}
const GSC_INSTANT = governedInstant(Date.parse(operation.startedAt));
const GSC_CORRELATION = `run:gsc-ingest:${operationId}`;
const persistJournal = (bytes) => {
  if (!permission.mayWrite) return;
  const g = executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
    repo: REPO, permission, target: journalPath, targetClass: "RUN_EVIDENCE", bytes,
    action: "WRITE_INGEST_OPERATION_JOURNAL", occurredAt: GSC_INSTANT, correlationId: GSC_CORRELATION,
  }));
  if (g.outcome !== "COMMITTED" && g.outcome !== "ALREADY_COMMITTED") throw new OperationRefused("JOURNAL_NOT_WRITTEN", `the operation journal was not written (${g.outcome}); nothing further is issued`);
};
const baseProvider = SOURCE === null ? liveProvider(governor) : syntheticProvider(SOURCE, governor);
const { provider, counters: meteredCalls } = journaledProvider({ provider: baseProvider, operation, persist: persistJournal });
/* 🔴 THE DRY-RUN STORE IS NOW ALWAYS THE COLLECTOR. It already keeps every record and returns the same
 * appended-versus-resighted answer the real store would — which is why runIngest could count against it — so the
 * ingest runs and reports identically either way, and the run then makes ONE governed decision about committing
 * what it collected. F77: in a RETRY it also recognises what this operation already saved, and saves it nothing twice. */
const store = createDryRunStore(storePath, { mode: operation.mode });
/* Returns the boundary's outcome AND the args, so the LEDGER'S OWN answer — appended, or already present — is
 * still what the run reports. Routing may not cost a caller information it was already giving the operator. */
const governedLedgerAppend = (entry, action) => {
  const args = governedStoreAppend({ ...SCOPE.writeScope,
    repo: RUN_COST?.ledgerRoot ?? REPO, permission, store: ledger, records: [RUN_COST ? { ...entry, scope: { tenantId: SCOPE.tenantId } } : entry], targetClass: "RUN_EVIDENCE",
    action, occurredAt: GSC_INSTANT, correlationId: GSC_CORRELATION,
    discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null,
  });
  const governed = executeGovernedWrite(args);
  if (governed.outcome === "COMMITTED" || governed.outcome === "ALREADY_COMMITTED") RUN_COST?.covered(entry.entry_id);
  return { governed, args };
};
const ledger = createCostLedger(RUN_COST ? RUN_COST.ledgerPath : confineToRepo(`${REPO}runs/cost/ledger.jsonl`, { label: "the cost ledger" }));

let r;
try {
  r = await runIngest({
    provider,
    store,
    propertyId,
    estateHostnames: DECLARED_HOSTS,
    days,
    controlProperty,
    /* the operation's own start instant: a retry rebuilds byte-identical records */
    now: operationClock(operation),
  });
} catch (err) {
  if (err instanceof OperationRefused) {
    console.error(`\n🔴 ${err.message}`);
    console.error(`metered calls this run: issued ${meteredCalls.issued} · replayed from the journal ${meteredCalls.replayed}`);
    process.exit(2);
  }
  if (err?.hardStop) {
    console.error(`\n${err.message}`);
    const stoppedEntry = entryFromLiveIngest({ startedAt, finishedAt: new Date().toISOString(), governor, pulls: [], basis: "Search Console API is free; no billing account attached to almiworld-hq-502102" });
    /* A SYNTHETIC source NEVER writes the ledger — that rule is preserved exactly, and where it applies there is
     * no governed write to audit, so the boundary is not called at all. */
    if (SOURCE === null) governedLedgerAppend(stoppedEntry, "APPEND_INGEST_STOPPED_COST_ENTRY");
    console.error(`ledger${permission.mayWrite ? "" : " [dry-run, not written]"}: ${formatLedgerLine(stoppedEntry)}`);
    process.exit(4);
  }
  throw err;
}
const finishedAt = new Date().toISOString();

console.log(`window          : ${r.startDate} .. ${r.endDate} (${days} days)`);
console.log(`evidence store  : ${storePath}`);
console.log("");

console.log(`=== PROPERTIES VISIBLE TO THE SERVICE ACCOUNT: ${r.properties.length} ===`);
for (const p of r.properties) console.log(`  ${p.propertyId}  [${p.permissionLevel}]  ${p.propertyType}`);
console.log("");

const t = r.agg.rows[0];
console.log("=== SITE TOTAL (dimensions:[], one aggregate row) ===");
console.log(`  clicks=${t?.clicks ?? 0}  impressions=${t?.impressions ?? 0}  ` +
  `ctr=${((t?.ctr ?? 0) * 100).toFixed(2)}%  position=${(t?.position ?? 0).toFixed(2)}`);
console.log("  " + formatBoundedResult({
  label: "searchAnalytics:aggregate",
  bounds: { rowLimitPerRequest: r.agg.rowLimitPerRequest, maxRequests: r.agg.maxRequests },
  fields: { rowCount: r.agg.rowCount, requestCount: r.agg.requestCount, exhausted: r.agg.exhausted, dataState: r.agg.dataState },
}));
console.log("");

console.log(`=== BY PAGE — paginated to exhaustion ===`);
console.log("  " + formatBoundedResult({
  label: "searchAnalytics:by-page",
  bounds: { rowLimitPerRequest: r.pages.rowLimitPerRequest, maxRequests: r.pages.maxRequests },
  fields: {
    rowCount: r.pages.rowCount, requestCount: r.pages.requestCount,
    exhausted: r.pages.exhausted, dataState: r.pages.dataState, truncationReason: r.pages.truncationReason,
  },
}));
console.log(`  cost: ${r.pages.cost.amount} ${r.pages.cost.currency} [${r.pages.cost.amountState}] apiCalls=${r.pages.cost.apiCalls}`);
console.log("");

/* 🔴 ITEM 9 — COUNTRIES. MEASUREMENT ONLY: row counts, request counts, bounds,
 * dataState and cost. No ranking, no top-N, no interpretation — a country row
 * is where impressions happened, never a market or a demand claim (item 8). */
console.log("=== COUNTRY DIMENSIONS — paginated to exhaustion ===");
for (const [key, pull] of Object.entries(r.countryPulls)) {
  console.log("  " + formatBoundedResult({
    label: `searchAnalytics:${key}`,
    bounds: { rowLimitPerRequest: pull.res.rowLimitPerRequest, maxRequests: pull.res.maxRequests },
    fields: {
      rowCount: pull.res.rowCount, requestCount: pull.res.requestCount,
      exhausted: pull.res.exhausted, dataState: pull.res.dataState, truncationReason: pull.res.truncationReason,
    },
  }));
  console.log(`  cost: ${pull.res.cost.amount} ${pull.res.cost.currency} [${pull.res.cost.amountState}] apiCalls=${pull.res.cost.apiCalls}`);
  console.log(`  distinct countries: ${new Set(pull.rows.map((x) => x.country)).size}`);
}
console.log("");

const w = Math.max(...r.table.rows.map((x) => x.hostname.length));
console.log("=== ESTATE TABLE — every known hostname in exactly one state ===\n");
console.log(`${"hostname".padEnd(w)}  STATE        URLs  clicks  impressions`);
console.log("-".repeat(w + 36));
const order = { ROWS: 0, ZERO: 1, FORBIDDEN: 2, NOT_QUERIED: 3 };
for (const row of [...r.table.rows].sort((a, b) => order[a.state] - order[b.state] || (b.impressions ?? 0) - (a.impressions ?? 0))) {
  const n = (v) => (v === null || v === undefined ? "   —" : String(v).padStart(4));
  console.log(`${row.hostname.padEnd(w)}  ${row.state.padEnd(11)} ${n(row.rowCount)}  ${n(row.clicks)}  ${n(row.impressions).padStart(11)}`);
}
console.log("-".repeat(w + 36));
console.log(`\nSTATE COUNTS: ${Object.entries(r.table.counts).map(([k, v]) => `${k}=${v}`).join("  ")}`);
console.log(`total hostnames in the census: ${r.table.rows.length}`);
if (r.table.unlisted.length) console.log(`🔴 in the rows but NOT in the census: ${r.table.unlisted.join(", ")}`);

console.log("");
console.log("=== PROPERTY STATES — visible is not the same as queried ===");
for (const p of r.properties) {
  console.log(`  ${p.propertyId.padEnd(26)} ${p.propertyId === propertyId ? "QUERIED" : "NOT_QUERIED"}`);
}
console.log(`  ${controlProperty.padEnd(26)} FORBIDDEN  (control — not an estate property)`);
console.log("");

console.log("=== CONTROL — a property the account is NOT a user on ===");
console.log(`  ${controlProperty}  HTTP ${r.control.httpStatus}  state=${r.controlState.state}  rowCount=${r.controlState.rowCount}`);
if (r.control.httpStatus === 403) {
  console.log("  ✅ CONTROL PASS: 403. A zero above is a measured zero, not a silent failure.");
} else {
  console.log(`  🔴 CONTROL FAILED: expected 403, got ${r.control.httpStatus}.`);
}

/* 🔴 IDEMPOTENCY, REPORTED RATHER THAN ASSUMED. A second run over unchanged
 * data appends re-sightings and no new measurements — and says which happened. */
console.log("");
/* F77 R2: the commit hands the store the new records AND the re-sighted ones (a fresh collection records its new sighting),
 * keyed by the OPERATION, so a retry's commit is the same occurrence; a retry leaves out what this operation already saved, and
 * when that is everything there is nothing to save. */
const toCommit = store.commitInput();
const evidenceGoverned = toCommit.length === 0
  ? { outcome: "NOTHING_TO_SAVE" }
  : executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
    repo: REPO, permission, store: createJsonlStore(storePath), records: toCommit,
    targetClass: "GENERATED_CONFIG", action: "APPEND_SEARCH_CONSOLE_OBSERVATIONS",
    occurredAt: GSC_INSTANT, correlationId: GSC_CORRELATION, discipline: "APPEND_IF_NEW", seenAt: operation.startedAt,
  }));
if (!["REFUSED", "COMMITTED", "ALREADY_COMMITTED", "NOTHING_TO_SAVE"].includes(evidenceGoverned.outcome)) {
  console.error(`🔴 ${evidenceGoverned.outcome} — the observations were not written; the governed attempt is on the audit trail`);
  process.exit(1);
}
if (evidenceGoverned.outcome !== "REFUSED") markCommitted(operation, persistJournal);
console.log(`operation ${operationId} (${operation.mode}): metered calls issued ${meteredCalls.issued} · replayed from the journal ${meteredCalls.replayed} · already saved by this operation ${r.alreadySaved} · evidence ${evidenceGoverned.outcome}`);
/* The same number as before: what the store HOLDS after this run's decision — the file's contents when the write
 * was committed, and its untouched contents when it was refused. */
const totalRecords = evidenceGoverned.outcome === "REFUSED" ? store.count() : createJsonlStore(storePath).readAll().length;
console.log(`evidence: ${r.appended} NEW measurement(s), ${r.resighted} re-sighting(s)   total records in store: ${totalRecords}`);
if (r.appended === 0 && r.resighted > 0) {
  console.log("  ↳ nothing changed since the last run. Re-sightings recorded; no duplicate payload written.");
}

const pullsForLedger = [r.agg, r.pages, ...Object.values(r.queryPulls).map((p) => p.res), ...Object.values(r.countryPulls).map((p) => p.res), r.control];
const costEntry = entryFromLiveIngest({ startedAt, finishedAt, governor, pulls: pullsForLedger, basis: r.agg.cost.basis });
/* Routed, with the synthetic rule intact: a synthetic source is NEVER written to the ledger, so no governed
 * write exists for it and the boundary is not called. */
let ledgerWrite;
if (SOURCE !== null) {
  ledgerWrite = { appended: false, synthetic: true };
} else {
  const { governed: costGoverned, args: costArgs } = governedLedgerAppend(costEntry, "APPEND_INGEST_COST_ENTRY");
  if (costGoverned.outcome === "REFUSED") {
    ledgerWrite = { appended: false, dryRun: true };
  } else if (costGoverned.outcome === "COMMITTED" || costGoverned.outcome === "ALREADY_COMMITTED") {
    ledgerWrite = { appended: Boolean((costArgs.adapter.result ?? [])[0]?.appended) };
  } else {
    console.error(`🔴 ${costGoverned.outcome} — the cost entry was not written; the governed attempt is on the audit trail`);
    process.exit(1);
  }
}
console.log(`\ncost ledger (${ledgerWrite.synthetic ? "synthetic source, NEVER written" : ledgerWrite.dryRun ? "dry-run, NOT written" : ledgerWrite.appended ? "appended" : "already present"}): ${formatLedgerLine(costEntry)}`);
/* 🔴 THE REACH LINES. Both are printed only here: after runIngest has returned — so every observation has already
 * been handed to store.appendIfNew, the one write call — and after the ledger decision. A run that dies before its
 * write decision (no credentials, a refused source, a failed request) cannot print either. */
if (!permission.mayWrite) {
  console.log(`[dry-run] would have written ${store.wouldWrite().length} evidence record(s) → ${storePath}${SOURCE === null ? " and 1 ledger entry" : " (synthetic source: never the cost ledger)"} — nothing written, --confirm to write`);
} else if (SOURCE !== null) {
  console.log(`[synthetic source] wrote ${r.appended} evidence record(s) → ${storePath} — the cost ledger was not written`);
}

/* The estate-specific KNOWN UNKNOWNS moved with the estate's host inventory to its subject package (F02 relocation). */
console.log("\n⚠️ KNOWN UNKNOWNS — the census denominator is the declared site origins of this tenant, not proven total: an undeclared host is outside it.");

process.exit(r.control.httpStatus === 403 ? 0 : 1);
