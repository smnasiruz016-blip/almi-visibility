#!/usr/bin/env node
/**
 * F43 · CONTENT DECAY, REFRESH AND PRUNING — each page's evaluation window, weak-result step and contraction evidence, count-only.
 *
 *   node bin/page-decay.mjs --tenant=<id> --actor=<id>      READ-ONLY; prints counts only; writes nothing
 *
 * 🔴 F02 — the tenant is decided HERE; the recorded Search Console rows are read only where a declared host attributes them to this
 * tenant AND they map to its own pages. No publication date, improvement, re-measurement or indexing check is recorded, so they are
 * passed EXPLICITLY empty. AGE IS NOT MEASURED WHERE IT IS NOT RECORDED. Nothing is removed, redirected, noindexed or written.
 * Assessment: src/page/content-decay.mjs; evidence: src/page/content-decay-evidence.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { readClientDecay, NO_RECORDED_DECAY_EVIDENCE } from "../src/page/content-decay-evidence.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/page-decay.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), RESOURCES.evidenceStore()] });

const r = readClientDecay({ tenantId: SCOPE.tenantId, resolve: createTenantResolver(), decayEvidence: NO_RECORDED_DECAY_EVIDENCE });
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F43 · CONTENT DECAY, REFRESH AND PRUNING — evidence for F35 only, count-only");
console.log(`  bound            ${r.bound}`);
if (r.fault) process.exit(2);
console.log(`  evaluation       ${fmt(r.summary.evaluation)}`);
console.log(`  result           ${fmt(r.summary.result)}`);
console.log(`  world            ${fmt(r.summary.world)}`);
console.log("  NOT_MEASURED is not a result: every such page names the recorded facts it lacks; age is never inferred.");
