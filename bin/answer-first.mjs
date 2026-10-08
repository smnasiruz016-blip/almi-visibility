#!/usr/bin/env node
/**
 * F38 · ANSWER-FIRST CONTENT SPECIFICATION — one client's draft heads (a title and a meta description BESIDE each draft's body) and the
 * title/description findings of its existing pages.
 *
 *   node bin/answer-first.mjs --product=<id> --tenant=<id> --actor=<id> [--research-batch=<id>]      READ-ONLY; counts only; writes nothing
 *
 * 🔴 F02 — the tenant is decided HERE, before anything is read. F35's decisions are read as bin/page-actions.mjs reads them; each chosen
 * CREATE need's draft is F37's own render (read, never changed); F38 builds its head beside it
 * (src/page/answer-first-evidence.mjs; the rules: src/page/answer-first.mjs). Existing pages: findings only — nothing is generated or
 * rewritten. On an INCOMPLETE or UNKNOWN inventory "unique" is UNIQUE AMONG RECORDED PAGES. Count-only: no page content, host or URL.
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
import { readClientHeads } from "../src/page/answer-first-evidence.mjs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { overturnedIds } from "../src/research/meaning-judgement.mjs";

const USAGE = "node bin/answer-first.mjs --product=<id> --tenant=<id> --actor=<id> [--research-batch=<id>]";
const BATCH = process.argv.find((a) => a.startsWith("--research-batch="))?.slice("--research-batch=".length) ?? null;
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/answer-first.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), ...(BATCH ? [RESOURCES.researchBatch(BATCH)] : []), RESOURCES.evidenceStore()] });
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
const r = readClientHeads({ tenantId: SCOPE.tenantId, chosen: ae.compiled?.forConstruction ?? [], resolve });
if (r.fault) { console.error(`🔴 REFUSED — F31's population is unavailable (${r.fault})`); process.exit(2); }
const a = r.audit;
const fmt = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ");
console.log("F38 · ANSWER-FIRST — titles and meta descriptions, count-only");
console.log(`  drafts         ${r.heads.length} head(s) · PASS ${r.heads.filter((h) => h.verdict === "PASS").length} · with findings ${r.heads.filter((h) => h.verdict !== "PASS").length} · answer first ${r.heads.filter((h) => h.answerFirst.verdict === "PASS").length}`);
console.log(`  existing pages ${a.pages} · measured ${a.measured} · NOT MEASURED (no stored body) ${a.notMeasured} · inventory ${a.inventory}`);
console.log(`  title          ${fmt(a.title)}`);
console.log(`  description    ${fmt(a.description)}`);
console.log(`  unique         ${a.inventory === "COMPLETE" ? "among the client's pages" : "UNIQUE AMONG RECORDED PAGES only — the inventory is not COMPLETE"}`);
console.log("  overstating    NOT MEASURED on every existing page — no record holds an existing page's verified claims");
console.log("  findings only: no title or description is written, generated or rewritten; nothing is published.");
