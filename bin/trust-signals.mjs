#!/usr/bin/env node
/**
 * F93 · TRUST AND IDENTITY SIGNALS — one client's existing pages (who is responsible, about and contact reachable, a dated update matching the
 * recorded changes, sources) and the trust plan for each draft F37 renders for a need F35 chose.
 *
 *   node bin/trust-signals.mjs --product=<id> --tenant=<id> --actor=<id> [--research-batch=<id>]      READ-ONLY; counts only; writes nothing
 *
 * 🔴 F02 — the tenant is decided HERE, before anything is read. F35's decisions are read as bin/page-actions.mjs reads them; each chosen
 * CREATE need's draft is F37's own render (read, never changed). The rules: src/page/trust-signals.mjs; the records:
 * src/page/trust-signals-evidence.mjs. A missing signal is a finding; anything not recorded is NOT MEASURED, named; nothing is invented,
 * written or published. Count-only: no page content, host or URL.
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
import { readClientTrust } from "../src/page/trust-signals-evidence.mjs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { overturnedIds } from "../src/research/meaning-judgement.mjs";

const USAGE = "node bin/trust-signals.mjs --product=<id> --tenant=<id> --actor=<id> [--research-batch=<id>]";
const BATCH = process.argv.find((a) => a.startsWith("--research-batch="))?.slice("--research-batch=".length) ?? null;
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/trust-signals.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), ...(BATCH ? [RESOURCES.researchBatch(BATCH)] : []), RESOURCES.evidenceStore()] });
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
const r = readClientTrust({ tenantId: SCOPE.tenantId, chosen: ae.compiled?.forConstruction ?? [], resolve });
if (r.fault) { console.error(`🔴 REFUSED — F31's population is unavailable (${r.fault})`); process.exit(2); }
const a = r.audit;
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F93 · TRUST AND IDENTITY SIGNALS — count-only");
console.log(`  bound          ${a.bound.state} · ${a.bound.text}`);
console.log(`  existing pages ${a.pages} · measured ${a.measured}`);
console.log(`  identity       ${fmt(a.counts.identity)} · credentials, expertise and experience NOT MEASURED on every page`);
console.log(`  about          ${fmt(a.counts.about)} · site has no about page: ${a.site.siteHasNoAboutPage}`);
console.log(`  contact        ${fmt(a.counts.contact)} · site has no contact page: ${a.site.siteHasNoContactPage}`);
console.log(`  date           ${fmt(a.counts.date)}`);
console.log(`  sources        ${fmt(a.counts.sources)}`);
console.log(`  drafts         ${r.plans.length} plan(s) · organisation identity recorded: ${r.organisationRecorded ? "yes" : "no — ABSENT, never invented"}`);
console.log("  findings and a plan only: nothing is written, generated or published.");
