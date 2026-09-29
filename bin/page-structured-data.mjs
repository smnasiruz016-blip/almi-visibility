#!/usr/bin/env node
/**
 * F48 · STRUCTURED DATA AND RICH-RESULT VALIDATION — one client's JSON-LD, discovered from stored bodies and checked against their
 * visible text, count-only.
 *
 *   node bin/page-structured-data.mjs --tenant=<id> --actor=<id>      READ-ONLY; prints counts only; writes nothing
 *
 * 🔴 F02 — the tenant is decided HERE; only its own stored verified bodies are read. Nothing is rendered, fetched or tested live.
 * Structured data guarantees no rich-result display, ranking, indexing or AI citation. A text found only inside a script is
 * RENDER-ONLY: its visibility is NOT MEASURED. Assessment: src/page/structured-data.mjs; evidence: src/page/structured-data-evidence.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { readClientStructuredData } from "../src/page/structured-data-evidence.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/page-structured-data.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID)] });

const r = readClientStructuredData({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F48 · STRUCTURED DATA — discovered from stored bodies, count-only");
console.log(`  bound            ${r.bound}`);
if (r.fault) process.exit(2);
console.log(`  state            ${fmt(r.summary.state)}`);
console.log(`  types            ${fmt(r.summary.types)}`);
console.log(`  marked-up texts  ${fmt(r.summary.items)}`);
console.log(`  recommendations  ${fmt(r.summary.recommendations)}`);
console.log("  RENDER-ONLY texts are NOT MEASURED, not hidden: no rendered text is recorded. A type's full requirement set is NOT MEASURED.");
