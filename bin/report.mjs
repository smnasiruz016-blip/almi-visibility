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
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedFileWrite } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { renderPage, summarise, reconcile } from "../src/report/view.mjs";
import { loadRegistry, verifiedSourceBearingFacts } from "../src/facts/registry.mjs";
import { productFromArgvOrExit } from "../src/product-cli.mjs";
import { lifecycleOf, walkChain } from "../src/evidence/lifecycle.mjs";
import { makeSource } from "../src/evidence/records.mjs";
import { sourceRecordFromFact, rankSources, tierCensus } from "../src/evidence/source-tiers.mjs";
import { createCostLedger, formatLedgerLine, coverageFailures } from "../src/cost/ledger.mjs";
import { computeRecommendationFields } from "../src/report/recommendation-fields.mjs";
import { CONSEQUENCE_REGISTER } from "../config/consequence-register.mjs";
import { SEVERITY_SCALE } from "../config/consequence-scale.mjs";
import { CLASS_SPLITS } from "../config/class-splits.mjs";
import { COVERAGE_REGISTER } from "../config/coverage-register.mjs";
import { DECISION_REGISTER } from "../config/decision-register.mjs";
import { AUDIT_TRAIL } from "../config/audit-trail.mjs";
import { splitView } from "../src/audit/class-split.mjs";
import { fourWay, impressionsForClass } from "../src/audit/populations.mjs";
import { statSync } from "node:fs";
import { batchJsonlFiles } from "../src/crawl/observation-batch.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

// 🔴 Confined BEFORE anything is read or rendered: a destination outside this
// repository is refused while nothing has happened yet.
const out = confineToRepo(arg("out", `${REPO}runs/report/index.html`), { label: "--out" });
// 🔴 The product is an ARGUMENT, never a folder written here (owner ruling, 14 September 2026): no default.
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/report.mjs --product=<id> --tenant=<declared tenant> [--evidence=<path>] [--crawl=<path>] [--out=<file>] [--confirm]" });
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. The
 * destination is confined first (that reads nothing); every path an operator hands the run is decided as an INPUT_PATH. */
const SCOPE = scopedEntryPoint({ entry: "bin/report.mjs", governed: true, resources: [RESOURCES.evidenceStore(), RESOURCES.costLedger(), RESOURCES.crawlBatch(BATCH_ID), RESOURCES.runArtefacts("run stores"), RESOURCES.factRegistryAt(PRODUCT.factsDir), RESOURCES.inputPath(arg("evidence", null), "--evidence"), RESOURCES.inputPath(arg("robots", null), "--robots"), RESOURCES.inputPath(arg("audit", null), "--audit"), RESOURCES.inputPath(arg("crawl-dir", null), "--crawl-dir")] });

const evidencePath = arg("evidence", `${REPO}runs/evidence/evidence.jsonl`);
const robotsPath = arg("robots", `${REPO}runs/evidence/robots.jsonl`);
const auditPath = arg("audit", `${REPO}runs/audit/findings.jsonl`);
/* 🔴 No in-repository default since 20 September 2026: the observation batch lives in the external
 * data repository. --crawl-dir still overrides, for a local corpus; with no override the batch is
 * resolved, and an unreadable batch REFUSES rather than reporting over an empty population. */
const crawlDir = arg("crawl-dir", null);
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const RUN_INSTANT = isoSeconds(Date.now());
const RUN_CORRELATION = `run:report:${RUN_INSTANT}`;

const read = (p) => (existsSync(p) ? createJsonlStore(p).readAll() : []);

/* 🔴 The audit findings and the robots.txt observations are part of the same
 * evidence store as far as a reader is concerned. An issue whose evidence id
 * lives in a file the page did not load would render as a BROKEN chain — which
 * would be a true statement about the page and a false one about the data. */
const evidenceRecords = [...read(evidencePath), ...read(robotsPath), ...read(auditPath)];

/* Every crawl file in the directory, so a second run's records would appear
 * rather than being silently ignored because the filename changed. */
const crawlRecords = crawlDir === null
  ? batchJsonlFiles().flatMap((p) => read(p))
  : existsSync(crawlDir)
    ? readdirSync(crawlDir)
        .filter((f) => f.endsWith(".jsonl"))
        .flatMap((f) => read(join(crawlDir, f)))
    : [];

let facts = [];
try {
  ({ records: facts } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId));
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
/** The DOMAIN-type property in the latest gsc.sites.list observation, or a named absence. */
const recordedDomainProperty = (records) => {
  const latest = records.filter((r) => r.method === "gsc.sites.list").sort((a, b) => String(a.observed_at).localeCompare(String(b.observed_at))).at(-1);
  return latest?.value?.properties?.find((p) => p.propertyType === "DOMAIN")?.propertyId ?? "UNRECORDED_DOMAIN_PROPERTY";
};
const sourcesIn = [
  ...(evidenceRecords.some((r) => r.method === "gsc.sites.list")
    ? [makeSource({
        /* F02: the DOMAIN property the latest recorded sites.list observation names — read from evidence, never hard-coded. */
        source_id: `gsc-property:${recordedDomainProperty(evidenceRecords)}`,
        source_url: recordedDomainProperty(evidenceRecords),
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
  /* 🔴 SOURCE-BEARING ONLY. The derived records are reported by the census, apart, where a record
   * that cites no source belongs — folding them in here crashed this binary on 21 Sep 2026. */
  ...verifiedSourceBearingFacts(facts).map(sourceRecordFromFact),
];
const sourceTiers = { ranked: rankSources(sourcesIn), census: tierCensus(sourcesIn) };

const ledgerEntries = createCostLedger(`${REPO}runs/cost/ledger.jsonl`).readAll();
const ledgerView = { lines: ledgerEntries.map(formatLedgerLine), failures: coverageFailures(ledgerEntries) };

/* 🔴 ITEM 51 — every drafted recommendation with all six fields; priority,
 * confidence and cost computed from the stores (src/report/recommendation-fields.mjs). */
/* 🔴 ROW 60, Option A — every issue in the store, in exactly one of four populations; the decisions on record shown first. */
const walkRuns = (dir) => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walkRuns(join(dir, n)) : n.endsWith(".jsonl") ? [join(dir, n)] : []));
const storeRecords = walkRuns(`${REPO}runs`).sort().flatMap((p) => read(p));
const { view: storeView } = splitView(storeRecords, CLASS_SPLITS);
const registers = { register: CONSEQUENCE_REGISTER, coverage: COVERAGE_REGISTER, decisions: DECISION_REGISTER, auditTrail: AUDIT_TRAIL };
const classPopulations = Object.fromEntries([
  ...Object.keys(COVERAGE_REGISTER).map((k) => [k, "COVERAGE GAP"]),
  ...Object.keys(DECISION_REGISTER).map((k) => [k, "DECISION ON RECORD"]),
  ...Object.keys(AUDIT_TRAIL).map((k) => [k, "AUDIT TRAIL"]),
]);
const decisions = {
  entries: Object.entries(DECISION_REGISTER).map(([k, e]) => ({
    issue_class: k,
    count: e.count,
    open: [...storeView.values()].filter((v) => v.class === k && v.state === "OPEN").length,
    impressions: impressionsForClass(k, { view: storeView, records: storeRecords }),
    decided: e.decided,
    notEstablished: e.notEstablished,
    awaits: e.awaits,
  })),
  fourWay: fourWay(storeView, registers),
  auditTrail: Object.entries(AUDIT_TRAIL).map(([k, e]) => ({ issue_class: k, count: e.count, why: e.why })),
};

const recommendationFields = computeRecommendationFields({
  recommendations: allAudit.filter((r) => r.record_type === "draft_recommendation"),
  links: allAudit.filter((r) => r.record_type === "recommendation_evidence"),
  records: [...allAudit, ...evidenceRecords, ...crawlRecords],
  ledger: ledgerEntries,
  // 🔴 ROW 60: the owner-controlled consequence register. Every level in it is UNCLASSIFIED until he rules.
  consequenceRegister: CONSEQUENCE_REGISTER, consequenceScale: SEVERITY_SCALE, classSplits: CLASS_SPLITS, classPopulations,
});

const generatedAt = new Date().toISOString();
const html = renderPage({ crawlRecords, evidenceRecords, facts, generatedAt, chainWalk, sourceTiers, ledger: ledgerView, recommendations: recommendationFields, decisions });

{
  const size = `(${(Buffer.byteLength(html, "utf8") / 1024).toFixed(1)} KiB)`;
  const governed = executeGovernedWrite(governedFileWrite({ ...SCOPE.writeScope,
    repo: REPO, permission, target: out, targetClass: "GENERATED_CONFIG", bytes: html,
    action: "WRITE_ESTATE_REPORT", occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
  }));
  if (governed.outcome === "REFUSED") console.log(`[dry-run] would have written ${out}  ${size} — add --confirm`);
  else if (governed.outcome === "COMMITTED" || governed.outcome === "ALREADY_COMMITTED") console.log(`written: ${out}  ${size} [${governed.outcome}]`);
  else { console.error(`🔴 ${governed.outcome} — ${out} was not written; the governed attempt is on the audit trail`); process.exitCode = 1; }
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
