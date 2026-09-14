#!/usr/bin/env node
/**
 * v0.1 ITEM 7 — generate the one report page.
 *
 * 🔴 LOCAL, AND DRY-RUN BY DEFAULT. It reads the evidence store and — only with
 * `--confirm` — writes one HTML file inside this repository. No network, no
 * server, no deploy. The page it produces has no action, no form and no write
 * path — see src/report/view.mjs.
 *
 * 🔴 UNTIL 12 SEPTEMBER 2026 THIS FILE HAD NO GATE AT ALL. Its header said
 * "read-only" while it wrote on every run, and it never imported the write law.
 * Item 14 was FAILED on exactly that; the fix is here, not in the census.
 *
 * Usage:
 *   node bin/report.mjs [--evidence=<path>] [--crawl=<path>] [--out=<file>] [--confirm]
 */

import { writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { renderPage, summarise, reconcile } from "../src/report/view.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { lifecycleOf, walkChain } from "../src/evidence/lifecycle.mjs";
import { makeSource } from "../src/evidence/records.mjs";
import { sourceRecordFromFact, rankSources, tierCensus } from "../src/evidence/source-tiers.mjs";
import { createCostLedger, formatLedgerLine, coverageFailures } from "../src/cost/ledger.mjs";
import { computeRecommendationFields } from "../src/report/recommendation-fields.mjs";
import { CONSEQUENCE_REGISTER } from "../config/consequence-register.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

const evidencePath = arg("evidence", `${REPO}runs/evidence/evidence.jsonl`);
const robotsPath = arg("robots", `${REPO}runs/evidence/robots.jsonl`);
const auditPath = arg("audit", `${REPO}runs/audit/findings.jsonl`);
const crawlDir = arg("crawl-dir", `${REPO}runs/crawl`);
// 🔴 Confined BEFORE anything is read or rendered: a destination outside this
// repository is refused while nothing has happened yet.
const out = confineToRepo(arg("out", `${REPO}runs/report/index.html`), { label: "--out" });
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));

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

/* 🔴 ITEM 49 — one real chain, walked end to end. The technical findings and
 * the origin observations are read for the WALK only, so the issues table above
 * keeps its scope. The chain shown is the first issue that has left OPEN. */
const auditDirPath = `${REPO}runs/audit`;
const allAudit = existsSync(auditDirPath)
  ? readdirSync(auditDirPath).filter((f) => f.endsWith(".jsonl")).flatMap((f) => read(join(auditDirPath, f)))
  : [];
const chainRecords = [...allAudit, ...crawlRecords];
const moved = [...lifecycleOf(chainRecords).issues.values()].find((e) => e.state !== "OPEN");
const chainWalk = moved ? walkChain(moved.issue.issue_id, chainRecords) : null;

/* §623 — the tier layer ordering real sources: the verified facts' citations,
 * the Search Console property this engine reads, and a drafted recommendation. */
const sourcesIn = [
  ...(evidenceRecords.some((r) => r.method === "gsc.sites.list")
    ? [makeSource({
        source_id: "gsc-property:sc-domain:almiworld.com",
        source_url: "sc-domain:almiworld.com",
        source_tier: "OWNED_GSC_ANALYTICS",
        publisher: "Google Search Console (our own property)",
        retrieved_at: evidenceRecords.filter((r) => r.method === "gsc.sites.list").map((r) => r.observed_at).sort().at(-1),
      })]
    : []),
  ...allAudit.filter((r) => r.record_type === "draft_recommendation").map((r) => makeSource({
    source_id: `draft:${r.recommendation_id}`,
    source_url: `runs/audit/recommendations.jsonl#${r.recommendation_id}`,
    source_tier: "AGENT_INFERENCE",
    publisher: "AlmiVisibility (drafted, not approved)",
    retrieved_at: r.drafted_at,
  })),
  ...facts.filter((f) => f.verificationState === "VERIFIED").map(sourceRecordFromFact),
];
const sourceTiers = { ranked: rankSources(sourcesIn), census: tierCensus(sourcesIn) };

const ledgerEntries = createCostLedger(`${REPO}runs/cost/ledger.jsonl`).readAll();
const ledgerView = { lines: ledgerEntries.map(formatLedgerLine), failures: coverageFailures(ledgerEntries) };

/* 🔴 ITEM 51 — every drafted recommendation with all six fields; priority,
 * confidence and cost computed from the stores (src/report/recommendation-fields.mjs). */
const recommendationFields = computeRecommendationFields({
  recommendations: allAudit.filter((r) => r.record_type === "draft_recommendation"),
  links: allAudit.filter((r) => r.record_type === "recommendation_evidence"),
  records: [...allAudit, ...evidenceRecords, ...crawlRecords],
  ledger: ledgerEntries,
  // 🔴 ROW 60: the owner-controlled consequence register. Every level in it is UNCLASSIFIED until he rules.
  consequenceRegister: CONSEQUENCE_REGISTER, consequenceScale: SEVERITY_SCALE,
});

const generatedAt = new Date().toISOString();
const html = renderPage({ crawlRecords, evidenceRecords, facts, generatedAt, chainWalk, sourceTiers, ledger: ledgerView, recommendations: recommendationFields });

if (!permission.mayWrite) {
  console.log(`[dry-run] would have written ${out}  (${(Buffer.byteLength(html, "utf8") / 1024).toFixed(1)} KiB) — add --confirm`);
} else {
  if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, "utf8");
  console.log(`written: ${out}  (${(Buffer.byteLength(html, "utf8") / 1024).toFixed(1)} KiB)`);
}

const s = summarise({ crawlRecords, evidenceRecords, facts });
const rec = reconcile(crawlRecords);
console.log("");
console.log(`COVERAGE            : ${s.coverageState}${s.recordedCoverageState && s.recordedCoverageState !== s.coverageState ? `  (the run recorded ${s.recordedCoverageState}; corrected)` : ""}`);
console.log(`fetched / requested : ${s.fetched} / ${s.observations}   seed pool ${s.seedPoolSize}`);
console.log(`disallowed by robots: ${s.disallowed}`);
console.log(`RECONCILIATION      : ${rec.observations} observations − ${rec.surplus} folded = ${rec.pages} pages  ${rec.balances ? "✅ balances" : "🔴 DOES NOT BALANCE"}`);
console.log(`facts               : ${facts.length}, of which UNVERIFIED ${facts.filter((f) => f.verificationState === "UNVERIFIED").length}`);
console.log(`label census        : ${Object.entries(s.labelCensus).map(([k, v]) => `${k}=${v}`).join(" · ")}`);
console.log("");
console.log("🔴 The page has no action, no form and no write path. This runner writes it only with --confirm.");
