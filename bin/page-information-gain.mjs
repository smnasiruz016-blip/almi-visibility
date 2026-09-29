#!/usr/bin/env node
/**
 * F39 · ORIGINAL INFORMATION GAIN — one client's pages, each judged against shared templates, its other pages and competitors.
 *
 *   node bin/page-information-gain.mjs --tenant=<id> --actor=<id>      READ-ONLY; prints counts only; writes nothing
 *
 * 🔴 F02 — the tenant is decided HERE, before anything is read; every read is that tenant's own partition. Nothing is collected: no
 * information-gain record, competitor comparison or semantic review is recorded (no store exists), so they are passed EXPLICITLY
 * empty. THE CHECKER IS NOT THE VERDICT — a page whose baselines cannot be measured is CANNOT_DECIDE, never passed.
 * Decision: src/page/information-gain.mjs; evidence: src/page/information-gain-evidence.mjs.
 */
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { SITEMAP_BATCH_ID } from "../src/adapter/sitemap-subject.mjs";
import { readClientInformationGain } from "../src/page/information-gain-evidence.mjs";
import { NO_RECORDED_GAIN_EVIDENCE } from "../src/page/information-gain.mjs";

const SCOPE = scopedEntryPoint({ entry: "bin/page-information-gain.mjs", governed: false, resources: [RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID)] });

const r = readClientInformationGain({ tenantId: SCOPE.tenantId, resolve: createTenantResolver(), evidence: NO_RECORDED_GAIN_EVIDENCE });
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F39 · ORIGINAL INFORMATION GAIN — decisions only, count-only");
console.log(`  bound            ${r.bound}`);
if (r.fault) process.exit(2);
const s = r.summary;
console.log(`  outcome          ${fmt(s.outcome)}`);
console.log(`  shared templates ${fmt(s.templates)}`);
console.log(`  current pages    ${fmt(s.currentPages)}`);
console.log(`  competitors      ${fmt(s.competitors)}`);
console.log("  CANNOT_DECIDE is not passed: every such page names the recorded facts it lacks; competitor content is never collected here.");
