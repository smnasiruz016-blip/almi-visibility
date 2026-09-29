#!/usr/bin/env node
/**
 * F35 · ACTION DECISIONS — one client's proposed needs and existing pages, each with a justified recommendation or CANNOT DECIDE.
 *
 *   node bin/page-actions.mjs --product=<id> --tenant=<id> --actor=<id>      READ-ONLY; prints counts only; writes nothing
 *
 * 🔴 F02 — the tenant is decided HERE, before anything is read; every read is that tenant's partition, or the shared robots store
 * attributed through its declared origins (F21). A run whose resources the declarations do not allow is refused before any read.
 * 🔴 Every action is a RECOMMENDATION; nothing is created, published, removed or written. Count-only: no page content, host or URL.
 * Evidence: src/page/action-evidence.mjs; decision: src/page/action-decision.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { readClientActionEvidence } from "../src/page/action-evidence.mjs";

const USAGE = "node bin/page-actions.mjs --product=<id> --tenant=<id> --actor=<id>";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/page-actions.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), RESOURCES.evidenceStore()] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);

const r = readClientActionEvidence({ tenantId: SCOPE.tenantId, product: PRODUCT, records, resolve: createTenantResolver() });
const line = (label, s) => console.log(`  ${label.padEnd(15)} ${s.population} · CHOSEN ${s.chosen} · CANNOT_DECIDE ${s.cannotDecide} · ${Object.entries(s.byAction).filter(([, n]) => n > 0).map(([a, n]) => `${a} ${n}`).join(" · ") || "no action chosen"}`);
console.log("F35 · ACTION DECISIONS — recommendations only, count-only");
console.log(`  bound           ${r.bound}`);
if (r.fault) process.exit(2);
line("proposed needs", r.summary.needs);
line("existing pages", r.summary.pages);
console.log("  every action is a RECOMMENDATION; MERGE, NOINDEX, REMOVE and REDIRECT need the owner's approval; CANNOT_DECIDE names its missing facts.");
