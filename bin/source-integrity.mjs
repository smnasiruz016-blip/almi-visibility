#!/usr/bin/env node
/**
 * ITEM 25, PART 4 — SOURCE INTEGRITY: A BOUNDED, READ-ONLY LINK CHECK OF THE
 * EXTERNAL SOURCES OUR FACTS CITE.
 *
 *   node bin/source-integrity.mjs                    print the plan and stop — no request
 *   node bin/source-integrity.mjs --live             run it, print the result, record nothing
 *   node bin/source-integrity.mjs --live --confirm   run it and record status-only observations + a cost entry
 *
 * 🔴 AUTHORISED by the owner on 13 September 2026, with these bounds, which the
 * code enforces rather than trusts: external sources only (the estate is refused
 * before the first request and at every redirect hop); HEAD first, GET only
 * where HEAD is refused (405/501); 1 request per second, concurrency 1; a hard
 * cap on requests; STATUS ONLY recorded. See src/audit/source-integrity.mjs.
 */

import { existsSync, writeFileSync } from "node:fs";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite, governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds as governedInstant } from "../src/audit-trail/store.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { makeObservation } from "../src/evidence/records.mjs";
import { sha256Hex } from "../src/evidence/ids.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { loadSubjectPackage } from "../src/subject-package.mjs";
import { checkSources, assertExternal, MAX_REQUESTS, INTERVAL_MS, HEAD_REFUSED, USER_AGENT } from "../src/audit/source-integrity.mjs";
import { createCostLedger, entryFromLinkCheck, formatLedgerLine } from "../src/cost/ledger.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { openConnector } from "../src/tenancy/connectors.mjs";
import { RESOURCES, declaredSiteHosts } from "../src/tenancy/scoped-run.mjs";
import { runCost, ownLedgerRef } from "../src/cost/run-cost.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const live = argv.includes("--live");
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
const STORE = confineToRepo(`${REPO}runs/audit/source-integrity.jsonl`, { label: "the source-integrity store" });
const EVIDENCE = confineToRepo(`${REPO}runs/audit/source-integrity-2026-09-13.json`, { label: "the source-integrity evidence" });

/* The estate the check must never touch: every registered hostname AND the apex under which they live. */

/* ---- the plan: every distinct source URL cited by the fact registry ------ */
// 🔴 The product is an ARGUMENT, never a folder written here (owner ruling, 14 September 2026): no default.
/* 🔴 F03 — the subject's data root is decided (RESOURCES.subject) BEFORE its descriptor or any of its files is read. */
const PRODUCT_ID = productIdOrExit(process.argv, { usage: "node bin/source-integrity.mjs --product=<id> [--live [--confirm]]" });
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/source-integrity.mjs", governed: true, resources: [RESOURCES.subject(PRODUCT_ID), ...(live ? [RESOURCES.costLedger(ownLedgerRef())] : [RESOURCES.costLedger()]), RESOURCES.runArtefacts("source-integrity stores"), ...(live ? [RESOURCES.connector(PRODUCT_ID, "CITED_SOURCES")] : [])] });
/* F78 Amendment 1 C8/C9 (RR-243): a LIVE run (the only kind that opens a connector) writes its cost into its tenant's own declared
 * ledger — its own entry, or, when it ends before that, one run entry, whatever ended it; without --confirm it makes no request at all */
const RUN_COST = live ? runCost({ entryPoint: "bin/source-integrity.mjs", scope: SCOPE, permission, write: (w) => executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope, repo: w.root, auditRepo: w.auditRepo, permission: w.permission, store: createCostLedger(w.path), records: [w.entry], targetClass: "RUN_EVIDENCE", action: "APPEND_RUN_COST_ENTRY", occurredAt: w.occurredAt, correlationId: w.correlationId, discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null })), auditRepo: REPO }) : null;
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/source-integrity.mjs --product=<id> [--live [--confirm]]", scope: SCOPE });
/* F02: this run's hosts are the site origins DECLARED to its tenant — no estate list in shared code (relocated, 24 Sep 2026). */
const DECLARED_HOSTS = declaredSiteHosts({ tenantId: SCOPE.tenantId });
const ESTATE = DECLARED_HOSTS;
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const byUrl = new Map();
for (const r of records) {
  const u = r.source?.url;
  if (!u) continue;
  const e = byUrl.get(u) ?? { url: u, records: 0, verifiedRecords: 0 };
  e.records += 1;
  if (r.verificationState === "VERIFIED") e.verifiedRecords += 1;
  byUrl.set(u, e);
}
const plan = [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));

/* ---- the control: the subject's own human-read baseline ------------------ */
/* F02 relocation: which sources a person read, and which host answers 403 by design, are THIS SUBJECT's expected results
 * — declared by its package (`sourceBaselineFor`), located by the declared product id. None declared: no baseline. */
const SUBJECT_BASELINE = (await loadSubjectPackage(PRODUCT.productId)).module.sourceBaselineFor ?? null;
const baselineFor = (url) => (typeof SUBJECT_BASELINE === "function" ? SUBJECT_BASELINE(url) : null);

/* ---- 🔴 THE PLAN IS PRINTED BEFORE ANY REQUEST --------------------------- */
assertExternal(plan.map((p) => p.url), ESTATE);
console.log("=== PLAN — printed before the first request ===");
console.log(`targets: ${plan.length} distinct external source URLs on ${new Set(plan.map((p) => new URL(p.url).hostname)).size} hosts · 0 estate hosts (checked)`);
console.log(`[bound: maxRequests=${MAX_REQUESTS} (hard, counted at the boundary) · 1 request per ${INTERVAL_MS} ms · concurrency 1 · HEAD first, GET only on ${HEAD_REFUSED.join("/")} · redirects followed by hand, every hop checked]`);
console.log(`user-agent: ${USER_AGENT}`);
for (const p of plan) console.log(`  ${p.url}  (cited by ${p.records} record(s), ${p.verifiedRecords} verified; baseline: ${baselineFor(p.url)?.expected ?? "none"})`);

if (!live) {
  console.log("\n[plan only] no request made — add --live to run it");
  process.exit(0);
}

const startedAt = new Date().toISOString();
const run = await checkSources({
  urls: plan.map((p) => p.url),
  estateHostnames: ESTATE,
  baselineFor,
  /* 🔴 F03 — a live check fetches only through the CITED_SOURCES connector the run's decision allowed. */
  fetchImpl: RUN_COST.metered(openConnector({ scope: SCOPE, subjectId: PRODUCT_ID, kind: "CITED_SOURCES" })).fetch,
  sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
});
const finishedAt = new Date().toISOString();

console.log(`\n=== RESULT — [bound: ${run.requests} request(s) of a hard cap of ${run.maxRequests}] ===`);
for (const r of run.results) {
  console.log(`  ${r.verdict.padEnd(7)} ${String(r.finalStatus ?? "—").padStart(3)} ${r.methodsUsed.padEnd(8)} ${r.url}`);
  console.log(`          ${r.reason} · hops ${r.hops.length} · ${r.note}`);
}
const counts = Object.fromEntries(["LIVE", "GONE", "UNKNOWN"].map((v) => [v, run.results.filter((r) => r.verdict === v).length]));
console.log(`\nLIVE ${counts.LIVE} · GONE ${counts.GONE} · UNKNOWN ${counts.UNKNOWN} · disagreements with the 12 September baseline: ${run.results.filter((r) => r.agrees === false).length}`);
console.log("🔴 A fetch that failed is UNKNOWN, never GONE. No page content was read, stored or quoted.");

const entry = entryFromLinkCheck({ startedAt, finishedAt, requests: run.requests, maxRequests: run.maxRequests, urls: plan.length, capReached: run.requests >= run.maxRequests });
console.log(`ledger: ${formatLedgerLine(entry)}`);

if (!permission.mayWrite) {
  console.log("[not recorded] add --confirm to record the observations and the cost entry");
  process.exit(0);
}
if (existsSync(EVIDENCE)) {
  console.error(`🔴 REFUSED — ${EVIDENCE} already exists. Recorded evidence is not re-recorded over itself.`);
  process.exit(2);
}
/* Routed. THREE genuinely different targets, so three governed occurrences: the observations (re-sighting
 * preserved), the cost entry (the ledger SKIPS a duplicate entry_id and writes nothing), and the evidence file
 * (TEXT, measured). Each is one decision per run, not one per record. */
const store = createJsonlStore(STORE);
const observations = run.results.map((r) => makeObservation({
  observed_at: finishedAt,
  method: "source.link-check",
  target: { kind: "url", ref: r.url },
  content_sha256: sha256Hex(JSON.stringify({ finalStatus: r.finalStatus, error: r.error, verdict: r.verdict, hops: r.hops })),
  value: { url: r.url, methodsUsed: r.methodsUsed, hops: r.hops, finalStatus: r.finalStatus, error: r.error, verdict: r.verdict, reason: r.reason, baseline: r.baseline, agreesWithBaseline: r.agrees, note: r.note },
  collector: "bin/source-integrity.mjs",
  collector_version: "1",
}));
const SI_INSTANT = governedInstant(Date.now());
const SI_CORRELATION = `run:source-integrity:${SI_INSTANT}`;
const ledger = createCostLedger(RUN_COST.ledgerPath);
const siOutcomes = [
  executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
    repo: REPO, permission, store, records: observations, targetClass: "RUN_EVIDENCE",
    action: "APPEND_SOURCE_INTEGRITY_OBSERVATIONS", occurredAt: SI_INSTANT, correlationId: SI_CORRELATION,
    discipline: "APPEND_IF_NEW", seenAt: finishedAt,
  })),
  executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
    repo: RUN_COST.ledgerRoot, permission, store: ledger, records: [{ ...entry, scope: { tenantId: SCOPE.tenantId } }], targetClass: "RUN_EVIDENCE",
    action: "APPEND_SOURCE_INTEGRITY_COST_ENTRY", occurredAt: SI_INSTANT, correlationId: SI_CORRELATION,
    discipline: "LEDGER_APPEND", keyOf: (e) => e.entry_id ?? null,
  })),
  executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
    repo: REPO, permission, target: EVIDENCE, targetClass: "GENERATED_CONFIG",
    bytes: JSON.stringify({ startedAt, finishedAt, requests: run.requests, maxRequests: run.maxRequests, intervalMs: INTERVAL_MS, plan, counts, results: run.results, ledgerEntry: entry.entry_id }, null, 2) + "\n",
    action: "WRITE_SOURCE_INTEGRITY_EVIDENCE", occurredAt: SI_INSTANT, correlationId: SI_CORRELATION,
  })),
];
const siBad = siOutcomes.find((o) => o.outcome !== "REFUSED" && o.outcome !== "COMMITTED" && o.outcome !== "ALREADY_COMMITTED");
if (siBad) {
  console.error(`🔴 ${siBad.outcome} — the run was not recorded; the governed attempt is on the audit trail`);
  process.exit(1);
}
if (siOutcomes[1].outcome === "COMMITTED" || siOutcomes[1].outcome === "ALREADY_COMMITTED") RUN_COST.covered(entry.entry_id);
console.log(`recorded: ${STORE}, ${EVIDENCE}, and the cost entry`);
