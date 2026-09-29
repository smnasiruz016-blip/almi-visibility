#!/usr/bin/env node
/**
 * F32 · DUPLICATE, THIN AND TEMPLATE DETECTION — one client's pages measured against each other, count-only.
 *
 *   node bin/page-duplication.mjs --tenant=<id> --actor=<id>      READ-ONLY; prints counts only; writes nothing
 *
 * 🔴 F02 — the tenant is decided HERE, before anything is read; every read is that tenant's own partition. Detection only: nothing
 * is rejected, removed, merged, noindexed, published or written. No page content, host or URL is printed.
 * Detection: src/page/duplication.mjs; evidence: src/page/duplication-evidence.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { readClientDuplication } from "../src/page/duplication-evidence.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/page-duplication.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID)] });

const r = readClientDuplication({ tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F32 · DUPLICATE, THIN AND TEMPLATE DETECTION — findings only, count-only");
console.log(`  bound            ${r.bound}`);
if (r.fault) process.exit(2);
const s = r.summary;
console.log(`  not measured     ${fmt(s.notMeasured)}`);
console.log(`  exact            ${fmt(s.exact)} · groups ${s.exactGroups}`);
console.log(`  textual overlap  ${fmt(s.textual)}   (${r.methods.overlap})`);
console.log(`  semantic         ${fmt(s.semantic)}`);
console.log(`  shared shell     ${fmt(s.shell)}   (${r.methods.shell})`);
console.log(`  unique value     ${fmt(s.uniqueValue)}`);
console.log("  overlap above 40 percent is a REVIEW TRIGGER, never a verdict; NOT_JUDGED is not CLEAR; unique value is never a word count.");
