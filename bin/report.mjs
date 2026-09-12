#!/usr/bin/env node
/**
 * v0.1 ITEM 7 — generate the one report page.
 *
 * 🔴 READ-ONLY, AND LOCAL. It reads the evidence store and writes one HTML file.
 * No network, no server, no deploy. The page it produces has no action, no form
 * and no write path — see src/report/view.mjs.
 *
 * Usage:
 *   node bin/report.mjs [--evidence=<path>] [--crawl=<path>] [--out=<file>]
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { renderPage, summarise, reconcile } from "../src/report/view.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

const evidencePath = arg("evidence", `${REPO}runs/evidence/evidence.jsonl`);
const robotsPath = arg("robots", `${REPO}runs/evidence/robots.jsonl`);
const auditPath = arg("audit", `${REPO}runs/audit/findings.jsonl`);
const crawlDir = arg("crawl-dir", `${REPO}runs/crawl`);
const out = arg("out", `${REPO}runs/report/index.html`);

const read = (p) => (existsSync(p) ? createJsonlStore(p).readAll() : []);

/* 🔴 The audit findings and the robots.txt observations are part of the same
 * evidence store as far as a reader is concerned. An issue whose evidence id
 * lives in a file the page did not load would render as a BROKEN chain — which
 * would be a true statement about the page and a false one about the data. */
const evidenceRecords = [...read(evidencePath), ...read(robotsPath), ...read(auditPath)];

/* Every crawl file in the directory, so a second run's records would appear
 * rather than being silently ignored because the filename changed. */
const crawlRecords = existsSync(crawlDir)
  ? readdirSync(crawlDir)
      .filter((f) => f.endsWith(".jsonl"))
      .flatMap((f) => read(join(crawlDir, f)))
  : [];

let facts = [];
try {
  ({ records: facts } = await loadRegistry(`${REPO}products/almi-oet/facts`, "almi-oet"));
} catch (err) {
  console.error(`⚠️  fact registry could not be read: ${err.message}`);
  console.error("   The page will say so rather than showing an empty registry as if it were empty.");
}

if (evidenceRecords.length === 0 && crawlRecords.length === 0) {
  console.error("no evidence and no crawl records — nothing to report on. Run bin/gsc-ingest.mjs first.");
  process.exit(2);
}

const generatedAt = new Date().toISOString();
const html = renderPage({ crawlRecords, evidenceRecords, facts, generatedAt });

if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, html, "utf8");

const s = summarise({ crawlRecords, evidenceRecords, facts });
const rec = reconcile(crawlRecords);

console.log(`written: ${out}  (${(Buffer.byteLength(html, "utf8") / 1024).toFixed(1)} KiB)`);
console.log("");
console.log(`COVERAGE            : ${s.coverageState}${s.recordedCoverageState && s.recordedCoverageState !== s.coverageState ? `  (the run recorded ${s.recordedCoverageState}; corrected)` : ""}`);
console.log(`fetched / requested : ${s.fetched} / ${s.observations}   seed pool ${s.seedPoolSize}`);
console.log(`disallowed by robots: ${s.disallowed}`);
console.log(`RECONCILIATION      : ${rec.observations} observations − ${rec.surplus} folded = ${rec.pages} pages  ${rec.balances ? "✅ balances" : "🔴 DOES NOT BALANCE"}`);
console.log(`facts               : ${facts.length}, of which UNVERIFIED ${facts.filter((f) => f.verificationState === "UNVERIFIED").length}`);
console.log(`label census        : ${Object.entries(s.labelCensus).map(([k, v]) => `${k}=${v}`).join(" · ")}`);
console.log("");
console.log("🔴 READ-ONLY. The page has no action, no form and no write path.");
