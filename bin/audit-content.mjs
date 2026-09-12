#!/usr/bin/env node
/**
 * HISSA 2b — items 12, 13 and 26 over the 394 crawled pages.
 *
 * 🔴 NO CRAWL, NO FETCH. Bodies come from the CI artifact
 * `crawl-corpus-34662527129`, which is downloaded to a local directory and
 * NEVER committed. Hashes in the committed records let anyone verify a body
 * against the run that produced it.
 *
 * Usage: node bin/audit-content.mjs --corpus=<dir>
 */

import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { measure, shingles, SHELL_DEFINITION, THIN_UNIQUE_WORD_FLOOR } from "../src/audit/shell.mjs";
import { EXACT_DUPLICATE, THIN_CONTENT, NEAR_DUPLICATE, TEMPLATE_DOMINANCE, ORPHAN_LINK, detectCannibalization } from "../src/audit/content-checks.mjs";
import { registeredChecks } from "../src/audit/check.mjs";
import { extractLinks } from "../src/crawl/seeds.mjs";
import { canonicalUrl, targetPageId } from "../src/evidence/ids.mjs";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const arg = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};

const corpusDir = arg("corpus", null);
const out = arg("out", `${REPO}runs/audit/content-findings.jsonl`);
const openedAt = new Date().toISOString();

const crawl = createJsonlStore(`${REPO}runs/crawl/first-real-crawl-2026-09-12.jsonl`).readAll();
const observations = crawl.filter((r) => r.record_type === "observation" && !r.value?.skipped);

const haveCorpus = corpusDir && existsSync(corpusDir);
console.log(`corpus: ${haveCorpus ? corpusDir : "🔴 NOT AVAILABLE — body-dependent checks will return UNKNOWN"}`);
console.log(`pages with a fetched body: ${observations.length}`);
console.log(`\n${SHELL_DEFINITION}\n`);

/* ---- build the per-page context ---------------------------------------- */
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
  const file = haveCorpus ? join(corpusDir, `${o.observation_id}.html`) : null;
  const html = file && existsSync(file) ? readFileSync(file, "utf8") : null;
  pages.push({ canonical, observation: o, html });
  if (!byHash.has(o.content_sha256)) byHash.set(o.content_sha256, []);
  byHash.get(o.content_sha256).push(canonical);
}

/* ---- the edge graph, re-derived from the bodies (Part 5C) --------------- */
const known = new Set(pages.map((p) => p.canonical));
const inbound = new Map(pages.map((p) => [p.canonical, 0]));
let edgesTotal = 0;
let edgesInside = 0;
for (const p of pages) {
  if (!p.html) continue;
  for (const to of extractLinks(p.html, p.canonical)) {
    edgesTotal += 1;
    let c;
    try {
      c = canonicalUrl(to);
    } catch {
      continue;
    }
    if (c === p.canonical) continue;
    if (!known.has(c)) continue;
    edgesInside += 1;
    inbound.set(c, (inbound.get(c) ?? 0) + 1);
  }
}
console.log(`EDGES: ${edgesTotal} links found, ${edgesInside} pointing inside the crawled set.`);
console.log(
  haveCorpus
    ? "  (re-derived from the artifact bodies — the committed PageRecords carry empty edge lists)"
    : "  🔴 no corpus: the edge graph is EMPTY and item 26 runs on nothing.",
);

/* ---- shingles for near-duplicate ---------------------------------------- */
const peers = [];
for (const p of pages) {
  if (!p.html) continue;
  const m = measure(p.html);
  if (!m.confident) continue;
  peers.push({ url: p.canonical, shingles: shingles(m.bodyText) });
}

/* ---- run every check ---------------------------------------------------- */
if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
const store = createJsonlStore(out);

const tally = {};
const bump = (id, verdict) => {
  tally[id] = tally[id] ?? { FAIL: 0, UNKNOWN: 0, silent: 0 };
  if (verdict) tally[id][verdict] += 1;
  else tally[id].silent += 1;
};

for (const p of pages) {
  const ctx = {
    openedAt,
    bodyHtml: p.html,
    byHash,
    twinObservationIds: [],
    peers,
    inboundCount: p.html ? (inbound.get(p.canonical) ?? 0) : null,
    anchorObservationId: p.observation.observation_id,
  };
  const page = { canonical_url: p.canonical, page_id: targetPageId(p.canonical) };

  for (const check of [EXACT_DUPLICATE, THIN_CONTENT, NEAR_DUPLICATE, TEMPLATE_DOMINANCE, ORPHAN_LINK]) {
    const finding = await check.run({ page, observations: [p.observation], siteContext: ctx });
    if (finding === null) {
      bump(check.id, null);
      continue;
    }
    store.append(finding);
    bump(check.id, finding.verdict);
  }
}

/* ---- item 13, detection mode ------------------------------------------- */
const evidence = createJsonlStore(`${REPO}runs/evidence/evidence.jsonl`).readAll();
const queryRows = evidence
  .filter((r) => r.method === "gsc.searchAnalytics.query:query-page")
  .flatMap((r) => r.value.rows ?? []);
const cannibal = detectCannibalization(queryRows);

console.log("\n=== FINDINGS ===");
for (const [id, t] of Object.entries(tally)) {
  console.log(`  ${id.padEnd(26)} FAIL=${String(t.FAIL).padStart(4)}  UNKNOWN=${String(t.UNKNOWN).padStart(4)}  silent=${String(t.silent).padStart(4)}`);
}
console.log(`\nITEM 13 (cannibalization, DETECTION MODE ONLY): ${cannibal.length} queries on >1 URL`);
if (queryRows.length === 0) {
  console.log("  🔴 UNKNOWN — no query×page rows are stored. Query text is deliberately never stored,");
  console.log("     so this check has no input and CANNOT RUN. Detection mode is built; it has no data.");
}

console.log("\n=== EVERY CHECK, AND ITS CONTROL ===");
for (const c of registeredChecks()) {
  console.log(`  ${c.id}`);
  console.log(`     fires  : ${c.firingFixture}`);
  console.log(`     control: ${c.cleanControl}`);
}
console.log(`\nwritten: ${out}  (${store.count()} records)`);
console.log(`bound: thin floor = ${THIN_UNIQUE_WORD_FLOOR} unique body words`);
console.log("🔴 Nothing was fixed. No product repository was touched. No recommendation was emitted by any check.");
