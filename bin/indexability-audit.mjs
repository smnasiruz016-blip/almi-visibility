#!/usr/bin/env node
/**
 * F21 · ROBOTS, SITEMAP, CANONICAL AND NOINDEX — one client's declared signals compared, contradictions exposed (RR-86).
 *
 *   node bin/indexability-audit.mjs --tenant=<id> --actor=<id>      READ-ONLY; prints counts only; writes nothing
 *
 * 🔴 F02 — the tenant is decided HERE, before anything is read; every read is that tenant's partition (the crawl batch, the sitemap
 * collection) or the shared robots store attributed through the tenant's DECLARED site origins. A run whose resources the
 * declarations do not allow is refused before any read, exactly as its sibling read-only diagnostics are.
 *
 * Count-only by construction: the three URL states, the per-class counts and the unjudged counts, beside their bound. No page
 * content, host or URL is ever printed. Analysis: src/audit/indexability-signals.mjs; reader: src/audit/indexability-reader.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { readClientIndexabilitySignals } from "../src/audit/indexability-reader.mjs";
import { CLASS_MEANING } from "../src/audit/indexability-signals.mjs";

const SCOPE = scopedEntryPoint({
  entry: "bin/indexability-audit.mjs",
  governed: false,
  resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), RESOURCES.evidenceStore()],
});

const r = readClientIndexabilitySignals({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
console.log("F21 · ROBOTS, SITEMAP, CANONICAL AND NOINDEX — declared signals compared, count-only");
console.log(`  bound        ${r.bound}`);
console.log(`  URLs         CONTRADICTED ${r.counts.CONTRADICTED} · CONSISTENT ${r.counts.CONSISTENT} · NOT_MEASURED ${r.counts.NOT_MEASURED}`);
for (const [k, meaning] of Object.entries(CLASS_MEANING)) console.log(`  ${k}           ${String(r.byClass[k]).padStart(6)} contradicted · ${String(r.unjudgedByClass[k]).padStart(6)} not judgeable — ${meaning}`);
console.log("  NOT_MEASURED is not CONSISTENT: a class that needs an unknown signal is not judged, and is counted as such.");
