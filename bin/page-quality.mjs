#!/usr/bin/env node
/**
 * ITEM 25 — GATE A'S FOUR IN-SCOPE CHECKS, MEASURED ON EVERY EXISTING PAGE.
 *
 *   node bin/page-quality.mjs
 *
 * Reads only what is committed and writes nothing; its output is the evidence.
 *
 *   · the 394 bodies of 12 September (archive), grouped into template groups;
 *   · the captured live AlmiOET /nursing page (runs/nursing-chain/nursing.html)
 *     — measured separately and named, because it is the one real existing page
 *     we hold that CARRIES verified facts, and a fact-presence check that has
 *     only ever returned zero has never shown it can see one;
 *   · the recorded source-integrity link check, folded in per page.
 */

import { existsSync, readFileSync } from "node:fs";

import { createJsonlStore } from "../src/evidence/store.mjs";
import { readBodyArchive } from "../src/evidence/body-archive.mjs";
import { pagesFromRun } from "../src/crawl/inbound.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgvOrExit } from "../src/product-cli.mjs";
import { measureExistingPages } from "../src/gate-a/existing-pages.mjs";
import { batchFile } from "../src/crawl/observation-batch.mjs";
import { evaluatePageQuality, tallyPageQuality, row25Verdict, liveControls, readPageCapture } from "../src/gate-a/page-quality.mjs";
import { sourceKey, labelValueList } from "../src/gate-a/claim-binding.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { factRegistryRef, externalRootContaining } from "../src/adapter/external-subject.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { everySubjectRegistry } from "../src/tenancy/scoped-run.mjs";

/** The manifest-pinned capture of real pages this row reads (data repository, captures/). */
const CAPTURE_ID = "row25-2026-09-21";

const REPO = new URL("../", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const NOW = new Date("2026-09-13T00:00:00Z");
/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/page-quality.mjs", governed: false, resources: [RESOURCES.crawlBatch(BATCH_ID), RESOURCES.captures(CAPTURE_ID), RESOURCES.runArtefacts("stored source-integrity result"), ...(await everySubjectRegistry())] });

const crawlRecords = createJsonlStore(batchFile("first-real-crawl-2026-09-12.jsonl")).readAll();
const pages = pagesFromRun({ crawlRecords, bodies: readBodyArchive(batchFile("bodies-2026-09-12.jsonl.br")) }).filter((p) => p.html !== null);
// 🔴 The product is an ARGUMENT, never a folder written here (owner ruling, 14 September 2026): no default.
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/page-quality.mjs --product=<id>" });
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const m = measureExistingPages(pages.map((p) => ({ id: p.canonical, html: p.html })), records, { now: NOW });

const siPath = `${REPO}runs/audit/source-integrity-2026-09-13.json`;
const si = existsSync(siPath) ? JSON.parse(readFileSync(siPath, "utf8")) : null;
const siByUrl = new Map((si?.results ?? []).map((r) => [r.url, r]));

const n = m.results.length;
const count = (f) => m.results.filter(f).length;
console.log(`corpus: ${batchFile("bodies-2026-09-12.jsonl.br")} (committed archive)`);
console.log(`[bound: ${n} distinct pages with a served body · ${m.groups} template groups · thresholds uniqueWords>=${m.thresholds.MIN_UNIQUE_WORDS}, siblingOverlap<=${m.thresholds.MAX_SIBLING_OVERLAP}, facts>=${m.thresholds.MIN_FACTS}, fact value >=${m.thresholds.MIN_VALUE_CHARS} chars]`);
console.log("TEMPLATE GROUP = one host, the same first path segment, the same path depth.\n");

console.log("SHELL = learned from the template group when it has 3 or more pages; otherwise borrowed from the OTHER pages of the same site (3 or more); otherwise UNMEASURABLE (D-GATEA-1).");
console.log(`  shells: GROUP ${count((r) => r.shellSource === "GROUP")} · REFERENCE ${count((r) => r.shellSource === "REFERENCE")} · NONE ${count((r) => r.shellSource === "NONE")}\n`);
console.log("=== 1 · UNIQUE VALUE (unique words after the page's shell) ===");
console.log(`  measured ${count((r) => Number.isInteger(r.uniqueWords))} of ${n} · at or above ${m.thresholds.MIN_UNIQUE_WORDS}: ${count((r) => r.uniquePass === true)} · below: ${count((r) => r.uniquePass === false)} · UNMEASURABLE ${count((r) => r.uniquePass === null)} (the only crawled page on its site — no shell to learn)`);
console.log("=== 2 · SIBLING OVERLAP (max body-shingle Jaccard against every sibling in the group) ===");
console.log(`  MEASURED ${count((r) => r.overlapState === "MEASURED")} of ${n} · within ${m.thresholds.MAX_SIBLING_OVERLAP}: ${count((r) => r.overlapPass === true)} · above: ${count((r) => r.overlapPass === false)}`);
console.log(`  VACUOUS ${count((r) => r.overlapState === "VACUOUS")} (a group of one — no sibling) · UNMEASURABLE ${count((r) => r.overlapState === "UNMEASURABLE_PAIR")} (a group of two — on a site with too few other pages to lend a shell). Neither is a pass.`);
console.log("=== 3 · VERIFIED-FACT PRESENCE (registry VERIFIED values found in the page text) ===");
console.log(`  measured ${n} of ${n} · carrying at least one verified fact: ${count((r) => r.factsPresent.length > 0)} · reaching ${m.thresholds.MIN_FACTS}: ${count((r) => r.factsPass)}`);
console.log("=== 4 · SOURCE INTEGRITY (the recorded link check of every source a page's facts cite) ===");
if (si) {
  console.log(`  sources checked: ${si.results.length} [bound: ${si.requests} of ${si.maxRequests} requests, 1/s] · LIVE ${si.counts.LIVE} · GONE ${si.counts.GONE} · UNKNOWN ${si.counts.UNKNOWN}`);
  console.log(`  pages citing a verified source: ${count((r) => r.factSources.length > 0)}`);
} else {
  console.log("  🔴 NOT MEASURED — no recorded link check");
}

/* ---- 🔴 A CONTROL, NOT AN EXISTING PAGE ---------------------------------
 * runs/nursing-chain/nursing.html was GENERATED by this engine's own chain on
 * 10 September 2026, from the registry (chain-report.json, step 2). It carries
 * verified facts because we placed them there, so it shows the value-match rule
 * fires on real registry values — and it says NOTHING about whether existing
 * pages written by someone else carry them. It is never counted as one. */
/* F02 relocation: the control page is NAMED (--generated=<file>) — it was one subject tool's output path. Absent: said so. */
const GENERATED = process.argv.find((a) => a.startsWith("--generated="))?.slice("--generated=".length) ?? null;
if (GENERATED === null) console.log("\n=== CONTROL — no generated page named (--generated=<file>); the value-match control was not run ===");
if (GENERATED !== null && existsSync(GENERATED)) {
  const [r] = measureExistingPages([{ id: "https://generated.invalid/control", html: readFileSync(GENERATED, "utf8") }], records, { now: NOW }).results;
  console.log(`\n=== CONTROL — a page this engine GENERATED from the registry (${GENERATED}). NOT an existing page ===`);
  console.log(`  verified facts present ${r.factsPresent.length}, qualifying ${r.factsQualifying} — the rule can see a fact; it has seen none on the 389 existing pages`);
  for (const u of r.factSources) {
    const c = siByUrl.get(u);
    console.log(`    source ${c ? `${c.verdict} (HTTP ${c.finalStatus}, ${c.methodsUsed})` : "NOT CHECKED"}  ${u}`);
  }
}

/* ---- 🔴 ROW 25 — THE FOUR CHECKS PER PAGE, TENANCY FIRST (21 September 2026) ---------------------------------
 * The measurement above hands EVERY page the registry's facts, whatever subject the page belongs to. This one does
 * not: a page is handed the facts only when its site and the registry are declared to the same subject
 * (owner ruling, 21 Sep 2026, tenant/resource attachments). Real pages are the committed archive plus the
 * manifest-pinned capture of pages chosen by a selection rule published before any request. */
const resolve = createTenantResolver();
const root = externalRootContaining(PRODUCT.factsDir, process.env);
const registryRef = root ? factRegistryRef({ factsDir: PRODUCT.factsDir, rootPath: root.path }) : null;
if (!registryRef) {
  console.log("\n🔴 ROW 25 — the registry has no declared resource reference; no page can be bound to it. NOT MEASURED.");
} else {
  const captured = readPageCapture({ captureId: CAPTURE_ID });
  const population = [
    ...pages.map((p) => ({ id: p.canonical, html: p.html, origin: new URL(p.canonical).origin, evidenceClass: "REAL" })),
    ...captured,
  ];
  const linkVerdicts = new Map((si?.results ?? []).map((r) => [sourceKey(r.url), r.verdict]));
  const results = evaluatePageQuality({ pages: population, facts: records, registry: { ...registryRef, evidenceClass: "REAL" }, resolve, linkVerdicts, now: NOW });
  const t = tallyPageQuality(results);
  const listFact = records.find((r) => r.verificationState === "VERIFIED" && r.source?.url && r.locale && labelValueList(r.value?.value));
  const controls = listFact ? liveControls({ fact: listFact }) : null;
  const verdict = row25Verdict({ results, controls });
  console.log(`\n=== ROW 25 — FOUR CHECKS PER PAGE · registry ${registryRef.resourceKind} ${registryRef.resourceRef} · capture ${CAPTURE_ID} (${captured.length} page(s)) ===`);
  console.log(`  population ${t.total} = ${t.real} real + ${t.fixture} fixture · INVALID (cross-tenant) ${t.crossTenantOrInvalid} · UNBOUND ${t.unbound} · bound, no claim bound to a fact ${t.boundNoClaim} · SELECTED ${t.selected}`);
  console.log(`  outcomes: PASS ${t.PASS} · FAIL ${t.FAIL} · UNKNOWN ${t.UNKNOWN} · INVALID ${t.INVALID} · remainder ${t.remainder}`);
  for (const r of results.filter((x) => x.tenancy === "BOUND" && x.C.state !== "NO_BOUND_CLAIM")) {
    console.log(`  ${r.id}`);
    console.log(`    A unique value ${r.A.state}${r.A.uniqueWords !== null && r.A.uniqueWords !== undefined ? ` (${r.A.uniqueWords} words)` : ""} · B sibling overlap ${r.B.state}${r.B.maxOverlap !== undefined ? ` (${r.B.maxOverlap.toFixed(3)} vs ${r.B.against})` : ""}`);
    console.log(`    C verified-fact presence ${r.C.state} · D source integrity ${r.D.state} — ${r.D.why}`);
    for (const b of r.C.bindings) console.log(`      ${b.factId} [${b.verificationState}] ${b.outcome}${b.differing?.length ? ` — stated ${JSON.stringify(b.stated)} · VERIFIED ${JSON.stringify(b.expected)}` : ""}`);
  }
  console.log(`  controls (fixture, never counted): ${controls ? Object.entries(controls).map(([k, v]) => `${k} fires ${v.fires} · silent ${v.silent}`).join(" | ") : "NONE — no list-shaped VERIFIED fact to build them from"}`);
  console.log(`  deferred, never counted: ${verdict.deferred.map((d) => `${d.limb} (${d.state}, ${d.authority})`).join(" · ")}`);
  console.log(`  ROW 25 VERDICT: ${verdict.verdict}`);
  for (const r of verdict.reasons) console.log(`    🔴 ${r.code}: ${r.why}`);
  if (process.argv.includes("--check") && (verdict.verdict !== "PASS" || t.remainder !== 0)) process.exitCode = 1;
}

console.log("\n🔴 MEASUREMENT ONLY. Nothing here decides that a page should be kept, changed or removed.");
