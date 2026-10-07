#!/usr/bin/env node
/**
 * F94 · SITE ARCHITECTURE AND INTERNAL-LINKING PLAN — where each page F35 chose to create or improve sits in one client's site.
 *
 *   node bin/site-plan.mjs --product=<id> --tenant=<id> --actor=<id> [--research-batch=<id>]      READ-ONLY; counts only; writes nothing
 *
 * 🔴 F02 — the tenant is decided HERE, before anything is read; every read is that tenant's partition. F35's decisions are read exactly as
 * bin/page-actions.mjs reads them (with the named research batch's grouped needs, or none — NOT MEASURED, named); F94 plans each page it
 * chose to CREATE or to improve (src/page/site-plan-evidence.mjs; the plan itself: src/page/site-plan.mjs).
 * 🔴 A plan only: nothing is fetched, rendered, followed, written or published. Every plan carries F31's completeness bound; on an
 * INCOMPLETE or UNKNOWN inventory it is a PARTIAL plan and claims nothing about pages the inventory does not hold. Count-only: no page
 * content, host or URL is printed.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { readClientActionEvidence } from "../src/page/action-evidence.mjs";
import { NO_RECORDED_DECAY_EVIDENCE } from "../src/page/content-decay-evidence.mjs";
import { readClientSitePlans } from "../src/page/site-plan-evidence.mjs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { overturnedIds } from "../src/research/meaning-judgement.mjs";

const USAGE = "node bin/site-plan.mjs --product=<id> --tenant=<id> --actor=<id> [--research-batch=<id>]";
const BATCH = process.argv.find((a) => a.startsWith("--research-batch="))?.slice("--research-batch=".length) ?? null;
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/site-plan.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), ...(BATCH ? [RESOURCES.researchBatch(BATCH)] : []), RESOURCES.evidenceStore()] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
let planningRows = null, overturned = new Set();
if (BATCH) {
  const store = lookupStore(rootIndexFor(process.env), "RESEARCH");
  if (store.state !== "DECLARED") { console.error(`🔴 REFUSED — the RESEARCH store is ${store.state}`); process.exit(3); }
  /* the batch directory is bound on the line that names the RESEARCH store, so every read through it is that store's (tenant-scope census) */
  const dir = join(lookupStore(rootIndexFor(process.env), "RESEARCH").dir, BATCH);
  if (!existsSync(dir)) { console.error("🔴 REFUSED — RESEARCH_BATCH_ABSENT: the declared research batch has no directory in the RESEARCH store"); process.exit(3); }
  const rowsOf = (f) => (existsSync(join(dir, f)) ? createJsonlStore(join(dir, f)).readAll() : []);
  planningRows = rowsOf("planning.jsonl");
  overturned = overturnedIds(rowsOf("meaning-judgements.jsonl"));
}

const resolve = createTenantResolver();
const ae = readClientActionEvidence({ tenantId: SCOPE.tenantId, product: PRODUCT, records, resolve, reviews: [], planningRows, overturned, decayEvidence: NO_RECORDED_DECAY_EVIDENCE });
if (ae.fault) { console.error(`🔴 REFUSED — F35's evidence is unavailable (${ae.fault})`); process.exit(2); }
const r = readClientSitePlans({ tenantId: SCOPE.tenantId, actionEvidence: ae, values: PRODUCT.variants ?? [], resolve });
if (r.fault) { console.error(`🔴 REFUSED — F31's population is unavailable (${r.fault})`); process.exit(2); }
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
const s = r.summary;
console.log("F94 · SITE ARCHITECTURE AND INTERNAL-LINKING PLAN — a plan only, count-only");
console.log(`  inventory      ${r.records.pages} recorded page(s) · ${r.records.edges} recorded link(s) · ${r.records.recordedUrls} recorded URL(s) · completeness ${r.records.completeness}`);
console.log(`  plans          ${s.plans} · refused ${s.refused} · complete ${s.complete} of ${s.plans}${s.plans > s.complete ? " — the rest are PARTIAL: nothing is claimed about pages the inventory does not hold" : ""}`);
console.log(`  url            ${fmt(s.url)}`);
console.log(`  cluster        ${fmt(s.cluster)}`);
console.log(`  links          in ${s.linksIn} · out ${s.linksOut} · not planned (broken, redirected or not served) ${s.notPlanned} · no count or maximum decides`);
console.log(`  breadcrumb     ${s.missingSteps} missing step(s), named, never filled`);
console.log(`  grouped needs  ${ae.summary.groupedNeeds ? "read" : `NOT MEASURED — ${ae.groupedNeedsMissing}`}`);
console.log("  a plan only: nothing is written to any site, fetched or published; whether a draft or a brief reads it is their own acceptances' decision.");
