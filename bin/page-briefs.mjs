#!/usr/bin/env node
/**
 * F41 · CONTENT BRIEFS — one client's approved actions, each turned into a reviewable brief from its recorded evidence, count-only.
 *
 *   node bin/page-briefs.mjs --product=<id> --tenant=<id> --actor=<id>      READ-ONLY; prints counts only; writes nothing
 *
 * 🔴 F02 — the tenant is decided HERE, before anything is read. No owner approval and no semantic review is recorded (no store exists),
 * so both are passed EXPLICITLY empty: every subject is NOT_ISSUED, and says why. A brief is not a draft — nothing is written.
 * Brief: src/page/content-brief.mjs; evidence: src/page/content-brief-evidence.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { readClientBriefs } from "../src/page/content-brief-evidence.mjs";
import { NO_RECORDED_DECAY_EVIDENCE } from "../src/page/content-decay-evidence.mjs";
import { readClientIndexation } from "../src/page/indexation-evidence.mjs";

const USAGE = "node bin/page-briefs.mjs --product=<id> --tenant=<id> --actor=<id>";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/page-briefs.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), RESOURCES.evidenceStore()] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);

/* no owner approval and no semantic review is recorded (no store exists): [] is that recorded fact */
const r = readClientBriefs({ tenantId: SCOPE.tenantId, product: PRODUCT, records, resolve: createTenantResolver(), approvals: [], reviews: [], decayEvidence: { ...NO_RECORDED_DECAY_EVIDENCE, indexing: readClientIndexation({ tenantId: SCOPE.tenantId, resolve: createTenantResolver(), inspections: [] }).indexingChecks ?? [] } });
console.log("F41 · CONTENT BRIEFS — briefs only, count-only");
console.log(`  bound            ${r.bound}`);
if (r.fault) process.exit(2);
console.log(`  briefs           ${Object.entries(r.summary.state).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
console.log("  a brief is issued only for an owner-approved action; NOT_ISSUED and INCOMPLETE name what is missing; nothing is written.");
