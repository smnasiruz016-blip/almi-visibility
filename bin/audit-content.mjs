#!/usr/bin/env node
/**
 * HISSA 2b — items 12, 13 and 26 over the 394 crawled pages.
 *
 * 🔴 NO CRAWL, NO FETCH. With no --corpus the COMMITTED body archive is read;
 * `--corpus=<dir>` reads an unpacked copy of the same bodies. Hashes in the
 * committed records let anyone verify a body against the run that produced it.
 *
 * Usage: node bin/audit-content.mjs [--corpus=<dir>] [--out=<store>]
 */

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { executeGovernedWrite } from "../src/governance/governed-write.mjs";
import { governedStoreAppend } from "../src/governance/governed-run.mjs";
import { isoSeconds } from "../src/audit-trail/store.mjs";
import { measure, shingles, SHELL_DEFINITION, THIN_UNIQUE_WORD_FLOOR } from "../src/audit/shell.mjs";
import { EXACT_DUPLICATE, THIN_CONTENT, NEAR_DUPLICATE, TEMPLATE_DOMINANCE, ORPHAN_LINK, detectCannibalization, reportCannibalization } from "../src/audit/content-checks.mjs";
import { registeredChecks } from "../src/audit/check.mjs";
import { canonicalUrl, targetPageId } from "../src/evidence/ids.mjs";
import { pagesFromRun, deriveEdges, inboundOf, unpackGraph, ZERO_INBOUND_DEFINITION } from "../src/crawl/inbound.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
/* 🔴 GAP 2 (16 September 2026) — DRY-RUN BY DEFAULT. Until now this appended its findings on every
 * run with no flag and no gate: the shape that rewrote committed evidence on 14 September when a
 * writer was run only to read a number. The destination is confined before anything is read. */
const permission = announceWritePermission(writePermission({ target: LOCAL, argv: process.argv, env: process.env }));
const RUN_INSTANT = isoSeconds(Date.now());
const RUN_CORRELATION = `run:audit-content:${RUN_INSTANT}`;
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

const corpusDir = arg("corpus", null);
const out = confineToRepo(arg("out", `${REPO}runs/audit/content-findings.jsonl`), { label: "--out" });
const openedAt = new Date().toISOString();
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/audit-content.mjs", governed: true, resources: [RESOURCES.crawlBatch(BATCH_ID), RESOURCES.evidenceStore(), RESOURCES.inputPath(corpusDir, "--corpus")] });

const crawl = createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl")).readAll();
const observations = crawl.filter((r) => r.record_type === "observation" && !r.value?.skipped);

/* 🔴 With no --corpus, the COMMITTED body archive is read — the evidence that
 * outlives the artifact (ruling, 13 September 2026). Same bytes, hash-checked
 * against every observation by test/evidence-archive.test.mjs. */
const ARCHIVE = batchFile("bodies-2026-09-12.jsonl.br");
const archiveBodies = !corpusDir && existsSync(ARCHIVE) ? (await import("../src/evidence/body-archive.mjs")).readBodyArchive(ARCHIVE) : null;
const haveCorpus = Boolean((corpusDir && existsSync(corpusDir)) || archiveBodies);
console.log(`corpus: ${archiveBodies ? `${ARCHIVE} (committed archive)` : haveCorpus ? corpusDir : "🔴 NOT AVAILABLE — body-dependent checks will return UNKNOWN"}`);
console.log(`pages with a fetched body: ${observations.length}`);
console.log(`\n${SHELL_DEFINITION}\n`);

/* ---- build the per-observation context ---------------------------------- */
const pages = [];
const byHash = new Map();
for (const o of observations) {
  const url = o.value.final_url ?? o.value.requested_url;
  let canonical;
  try {
    canonical = canonicalUrl(url);
  } catch {
    continue;
  }
  const file = haveCorpus && !archiveBodies ? join(corpusDir, `${o.observation_id}.html`) : null;
  const html = archiveBodies ? archiveBodies.get(o.observation_id) ?? null : file && existsSync(file) ? readFileSync(file, "utf8") : null;
  pages.push({ canonical, observation: o, html });
  if (!byHash.has(o.content_sha256)) byHash.set(o.content_sha256, []);
  byHash.get(o.content_sha256).push(canonical);
}

/* ---- 🔴 ITEM 26 — THE STORED GRAPH, THROUGH THE ONE DEFINITION -----------
 * Until 13 September 2026 this runner derived its own graph and counted once
 * per OBSERVATION (340); bin/audit-technical.mjs derived another and ignored
 * links from other hosts (341). Both now read runs/crawl/edges-2026-09-12.jsonl.br
 * through src/crawl/inbound.mjs, and the orphan check runs ONCE PER DISTINCT PAGE. */
const GRAPH = batchFile("edges-2026-09-12.jsonl.br");
const distinctPages = pagesFromRun({ crawlRecords: crawl, bodies: new Map(pages.filter((p) => p.html).map((p) => [p.observation.observation_id, p.html])) });
const edges = existsSync(GRAPH) ? unpackGraph(readFileSync(GRAPH)) : deriveEdges(distinctPages);
const { inbound, zero } = inboundOf({ pages: distinctPages, edges });
console.log(ZERO_INBOUND_DEFINITION);
console.log(`EDGES: ${edges.length} links in served HTML (${existsSync(GRAPH) ? "the stored graph" : "🔴 derived here — no stored graph"}) over ${distinctPages.length} distinct pages.`);
console.log(`pages with no inbound links inside the crawled set: ${zero.length}\n`);

/* ---- shingles for near-duplicate ---------------------------------------- */
const peers = [];
for (const p of pages) {
  if (!p.html) continue;
  const m = measure(p.html);
  if (!m.confident) continue;
  peers.push({ url: p.canonical, shingles: shingles(m.bodyText) });
}

/* ---- run every check ---------------------------------------------------- */
/* 🔴 GAP 2 — DRY-RUN BY DEFAULT. The directory and every append sit behind permission.mayWrite. */
const store = createJsonlStore(out);
const wouldWrite = { findings: 0 };
/* Routed: the findings are COLLECTED here and committed as ONE governed decision below. The bare mkdir is gone
 * rather than gated — the boundary's own prepare step creates the directory it writes into. */
const pending = [];
const put = (finding) => { pending.push(finding); };

const tally = {};
const bump = (id, verdict) => {
  tally[id] = tally[id] ?? { FAIL: 0, UNKNOWN: 0, silent: 0 };
  if (verdict) tally[id][verdict] += 1;
  else tally[id].silent += 1;
};

for (const p of pages) {
  const ctx = { openedAt, bodyHtml: p.html, byHash, twinObservationIds: [], peers, anchorObservationId: p.observation.observation_id };
  const page = { canonical_url: p.canonical, page_id: targetPageId(p.canonical) };
  for (const check of [EXACT_DUPLICATE, THIN_CONTENT, NEAR_DUPLICATE, TEMPLATE_DOMINANCE]) {
    const finding = await check.run({ page, observations: [p.observation], siteContext: ctx });
    if (finding === null) {
      bump(check.id, null);
      continue;
    }
    // 🔴 appendIfNew: the same finding from the same job run twice is ONE record
    // plus a re-sighting — the discipline the technical audit writer lacked.
    put(finding);
    bump(check.id, finding.verdict);
  }
}

// The orphan check, once per DISTINCT page, citing every observation that reached it.
const byId = new Map(observations.map((o) => [o.observation_id, o]));
for (const dp of distinctPages) {
  const page = { canonical_url: dp.canonical, page_id: targetPageId(dp.canonical) };
  const ctx = { openedAt, inboundCount: dp.html !== null ? inbound.get(dp.canonical) ?? 0 : null };
  const finding = await ORPHAN_LINK.run({ page, observations: dp.observation_ids.map((id) => byId.get(id)), siteContext: ctx });
  if (finding === null) {
    bump(ORPHAN_LINK.id, null);
    continue;
  }
  put(finding);
  bump(ORPHAN_LINK.id, finding.verdict);
}
if (pending.length) {
  const args = governedStoreAppend({ ...SCOPE.writeScope,
    repo: REPO, permission, store, records: pending, targetClass: "RUN_EVIDENCE",
    action: "APPEND_CONTENT_AUDIT_FINDINGS", occurredAt: RUN_INSTANT, correlationId: RUN_CORRELATION,
    discipline: "APPEND_IF_NEW", seenAt: openedAt,
  });
  const governed = executeGovernedWrite(args);
  if (governed.outcome === "REFUSED") wouldWrite.findings = pending.length;
  else if (governed.outcome !== "COMMITTED" && governed.outcome !== "ALREADY_COMMITTED") {
    console.error(`🔴 ${governed.outcome} — the findings were not written; the governed attempt is on the audit trail`);
    process.exitCode = 1;
  }
}
if (!permission.mayWrite) console.log(`[dry-run] would have written ${wouldWrite.findings} finding(s) → ${out} — nothing written, --confirm to write`);

/* ---- 🔴 ITEM 13 — the LATEST complete query×page pull, reported in full ----
 * The store holds three pulls of the same window. Merging them mixes positions
 * from different pulls for the same query and URL (12 pairs differ), so the
 * report reads one pull — the newest COMPLETE one — and names it. */
const evidence = createJsonlStore(`${REPO}runs/evidence/evidence.jsonl`).readAll();
const pulls = evidence
  .filter((r) => r.method === "gsc.searchAnalytics.query:query-page" && r.value?.dataState === "COMPLETE")
  .sort((a, b) => a.observed_at.localeCompare(b.observed_at));
const pull = pulls.at(-1) ?? null;
const queryRows = pull?.value.rows ?? [];
const cannibal = detectCannibalization(queryRows);

console.log("\n=== FINDINGS ===");
for (const [id, t] of Object.entries(tally)) {
  console.log(`  ${id.padEnd(26)} FAIL=${String(t.FAIL).padStart(4)}  UNKNOWN=${String(t.UNKNOWN).padStart(4)}  silent=${String(t.silent).padStart(4)}`);
}
console.log(`  (orphan-within-crawled-set is counted once per DISTINCT page: ${distinctPages.length}; the other four once per observation: ${pages.length})`);

console.log("");
if (!pull) {
  console.log("ITEM 13 — 🔴 UNKNOWN: no COMPLETE query×page pull is stored, so this check has no input and cannot run.");
} else {
  const source = `pull ${pull.observation_id} observed ${pull.observed_at}, window ${pull.value.startDate}..${pull.value.endDate}, dataState ${pull.value.dataState}, newest of ${pulls.length} complete pull(s)`;
  const queriesSearched = new Set(queryRows.filter((r) => r.query).map((r) => r.query)).size;
  for (const line of reportCannibalization({ findings: cannibal, queriesSearched, rowsSearched: queryRows.length, source })) console.log(line);
}

console.log("\n=== EVERY CHECK, AND ITS CONTROL ===");
for (const c of registeredChecks()) {
  console.log(`  ${c.id}`);
  console.log(`     fires  : ${c.firingFixture}`);
  console.log(`     control: ${c.cleanControl}`);
}
console.log(`\nwritten: ${out}  (${store.count()} records)`);
console.log(`bound: review signal = ${THIN_UNIQUE_WORD_FLOOR} unique body words — it decides nothing (RR-194 T-2)`);
console.log("🔴 Nothing was fixed. No product repository was touched. No recommendation was emitted by any check.");
