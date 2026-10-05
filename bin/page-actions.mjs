#!/usr/bin/env node
/**
 * F35 · ACTION DECISIONS — one client's proposed needs and existing pages, each with a justified recommendation or CANNOT DECIDE.
 *
 *   node bin/page-actions.mjs --product=<id> --tenant=<id> --actor=<id> [--research-batch=<id>]      READ-ONLY; counts only; writes nothing
 *
 * 🔴 F35 Amendment 1 (RR-174): --research-batch names the batch whose planning store F91 writes; F35 READS its grouped needs and their
 * coverage records and decides each grouped need in its own field. Without it, grouped needs are NOT MEASURED, named. HOLD is shown by its
 * own name; demand strength is reported on its own line, DEMAND MONITORING, never an outcome and never a gate.
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
import { NO_RECORDED_DECAY_EVIDENCE } from "../src/page/content-decay-evidence.mjs";
import { readClientIndexation } from "../src/page/indexation-evidence.mjs";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { rootIndexFor } from "../src/tenancy/resolver.mjs";
import { lookupStore } from "../src/tenancy/root-registry.mjs";
import { createJsonlStore } from "../src/evidence/store.mjs";
import { overturnedIds } from "../src/research/meaning-judgement.mjs";

const USAGE = "node bin/page-actions.mjs --product=<id> --tenant=<id> --actor=<id> [--research-batch=<id>]";
const BATCH = process.argv.find((a) => a.startsWith("--research-batch="))?.slice("--research-batch=".length) ?? null;
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/page-actions.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID), RESOURCES.collectionPartition("SITEMAP_COLLECTION", SITEMAP_BATCH_ID), ...(BATCH ? [RESOURCES.researchBatch(BATCH)] : []), RESOURCES.evidenceStore()] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
/* F35 C9: F91's planning store of the named batch — its rows read as stored; an overturned question leaves every count (RR-158 §5) */
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

/* no semantic review is recorded and no store exists (F32): [] is that recorded fact, so MERGE and REDIRECT name the missing review */
const r = readClientActionEvidence({ tenantId: SCOPE.tenantId, product: PRODUCT, records, resolve: createTenantResolver(), reviews: [], planningRows, overturned, decayEvidence: { ...NO_RECORDED_DECAY_EVIDENCE, indexing: readClientIndexation({ tenantId: SCOPE.tenantId, resolve: createTenantResolver(), inspections: [] }).indexingChecks ?? [] } /* F43: no publication date, improvement or re-measurement is recorded; F82 supplies the indexing checks */ });
const line = (label, s) => console.log(`  ${label.padEnd(15)} ${s.population} · CHOSEN ${s.chosen} · HOLD ${s.hold} · CANNOT_DECIDE ${s.cannotDecide} · ${Object.entries(s.byAction).filter(([, n]) => n > 0).map(([a, n]) => `${a} ${n}`).join(" · ") || "no action chosen"}`);
console.log("F35 · ACTION DECISIONS — recommendations only, count-only");
console.log(`  bound           ${r.bound}`);
if (r.fault) process.exit(2);
line("proposed needs", r.summary.needs);
line("existing pages", r.summary.pages);
if (r.summary.groupedNeeds) {
  line("grouped needs", r.summary.groupedNeeds);
  console.log(`  outcomes        ${Object.entries(r.summary.groupedNeeds.byOutcome).map(([o, n]) => `${o} ${n}`).join(" · ")}`);
} else console.log(`  grouped needs   NOT MEASURED — ${r.groupedNeedsMissing}`);
console.log(`  DEMAND MONITORING  ${r.demandMonitoring.recorded ? `recorded (${r.demandMonitoring.outcome ?? "no outcome"}, categories ${r.demandMonitoring.independentCategories ?? "NOT MEASURED"})` : r.demandMonitoring.note} — never an outcome, never a gate`);
console.log("  every action is a RECOMMENDATION; MERGE, NOINDEX, REMOVE and REDIRECT need the owner's approval; HOLD and CANNOT_DECIDE name their missing facts.");
console.log("  similarity or a shared need is a review trigger, never proof that two pages should be merged: MERGE needs a recorded semantic review.");
