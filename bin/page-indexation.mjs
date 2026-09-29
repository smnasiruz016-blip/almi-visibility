#!/usr/bin/env node
/**
 * F82 · REAL INDEXATION LEARNING — each page's index state from OBSERVED owned search evidence, count-only.
 *
 *   node bin/page-indexation.mjs --tenant=<id> --actor=<id>      READ-ONLY; prints counts only; writes nothing
 *
 * 🔴 F02 — the tenant is decided HERE; the recorded owned Search Console rows are read only where a declared host attributes them to this
 * tenant AND they map to its own pages. No inspection or coverage record exists, so none is passed. INDEXABLE ≠ INDEXED; nothing
 * predicts future indexing; owned evidence is never public research. No inspection request, no live call.
 * State: src/page/indexation.mjs; evidence: src/page/indexation-evidence.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { readClientIndexation } from "../src/page/indexation-evidence.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/page-indexation.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), RESOURCES.evidenceStore()] });

/* no owned inspection or coverage record is held: [] is that recorded fact */
const r = readClientIndexation({ tenantId: SCOPE.tenantId, resolve: createTenantResolver(), inspections: [] });
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F82 · REAL INDEXATION LEARNING — owned search evidence only, count-only");
console.log(`  bound            ${r.bound}`);
if (r.fault) process.exit(2);
console.log(`  index state      ${fmt(r.summary.state)}`);
console.log(`  indexability     ${fmt(r.summary.indexability)}   (F21 — reported beside, never as, the index state)`);
console.log(`  queries          ${fmt(r.summary.queriesObserved)}`);
console.log(`  ${r.summary.notice} · each state holds only for its dated window · UNKNOWN is not "not indexed".`);
