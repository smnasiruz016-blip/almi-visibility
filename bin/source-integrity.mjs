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
import { productFromArgvOrExit } from "../src/product-cli.mjs";
import { checkSources, assertExternal, MAX_REQUESTS, INTERVAL_MS, HEAD_REFUSED, USER_AGENT } from "../src/audit/source-integrity.mjs";
import { createCostLedger, entryFromLinkCheck, formatLedgerLine } from "../src/cost/ledger.mjs";
import { ESTATE_HOSTNAME_LIST } from "../config/estate-hostnames.mjs";
import { scopedEntryPoint, RESOURCES } from "../src/tenancy/scoped-run.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const argv = process.argv.slice(2);
const live = argv.includes("--live");
const permission = announceWritePermission(writePermission({ target: LOCAL, argv, env: process.env }));
const STORE = confineToRepo(`${REPO}runs/audit/source-integrity.jsonl`, { label: "the source-integrity store" });
const EVIDENCE = confineToRepo(`${REPO}runs/audit/source-integrity-2026-09-13.json`, { label: "the source-integrity evidence" });

/* The estate the check must never touch: every registered hostname AND the apex under which they live. */
const ESTATE = [...new Set([...ESTATE_HOSTNAME_LIST, "almiworld.com"])];

/* ---- the plan: every distinct source URL cited by the fact registry ------ */
// 🔴 The product is an ARGUMENT, never a folder written here (owner ruling, 14 September 2026): no default.
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/source-integrity.mjs --product=<id> [--live [--confirm]]" });
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/source-integrity.mjs", governed: true, repoUrl: import.meta.url, resources: [RESOURCES.factRegistryAt(PRODUCT.factsDir), RESOURCES.costLedger(), RESOURCES.runArtefacts("source-integrity stores")] });
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

/* ---- the control: what beta-g fetched and read on 12 September 2026 ----- */
const READ_BY_BETA_G = new Set([
  "https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/",
  "https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/accepted-english-language-tests/oet/",
  "https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/qualified-in-english/",
  "https://www.hcpc-uk.org/registration/getting-on-the-register/international-applications/documents/certificate-of-english-language-proficiency/",
  "https://www.gov.uk/government/publications/code-of-practice-for-the-international-recruitment-of-health-and-social-care-personnel/code-of-practice-for-the-international-recruitment-of-health-and-social-care-personnel-in-england",
  "https://www.nmbi.ie/Registration/Qualified-outside-the-EU/Application-Process/English-Language-Requirements",
  "https://www.gov.uk/guidance/immigration-rules/immigration-rules-appendix-english-language",
  "https://nmcn.gov.ng/verify.html",
  "https://pnmc.gov.pk/verification-registration-2/",
  "https://www.immigration.govt.nz/about-us/news-centre/update-on-english-language-testing-for-immigration-applications/",
]);
const baselineFor = (url) => {
  if (new URL(url).hostname === "oet.com") return { expected: "HTTP 403" };
  return READ_BY_BETA_G.has(url) ? { expected: "CONTENT" } : null;
};

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
  fetchImpl: fetch,
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
const ledger = createCostLedger(confineToRepo(`${REPO}runs/cost/ledger.jsonl`, { label: "the cost ledger" }));
const siOutcomes = [
  executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
    repo: REPO, permission, store, records: observations, targetClass: "RUN_EVIDENCE",
    action: "APPEND_SOURCE_INTEGRITY_OBSERVATIONS", occurredAt: SI_INSTANT, correlationId: SI_CORRELATION,
    discipline: "APPEND_IF_NEW", seenAt: finishedAt,
  })),
  executeGovernedWrite(governedStoreAppend({ ...SCOPE.writeScope,
    repo: REPO, permission, store: ledger, records: [entry], targetClass: "RUN_EVIDENCE",
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
console.log(`recorded: ${STORE}, ${EVIDENCE}, and the cost entry`);
