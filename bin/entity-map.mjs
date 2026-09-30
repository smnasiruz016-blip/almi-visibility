#!/usr/bin/env node
/**
 * F47 · ENTITY RELATIONSHIP MAP — one product's entities, attributes, sources, pages and questions, and whether they are represented
 * consistently; count-only.
 *
 *   node bin/entity-map.mjs --product=<id> --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched; writes nothing
 *
 * Built only from recorded structures; question text is never printed. Map: src/facts/entity-map.mjs.
 */
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readExistingPagePopulation } from "../src/page/existing-page-population.mjs";
import { buildEntityMap } from "../src/facts/entity-map.mjs";

const USAGE = "node bin/entity-map.mjs --product=<id>";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/entity-map.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const { population } = readExistingPagePopulation({ scope: { tenantId: SCOPE.tenantId }, resolve: createTenantResolver() });
const pages = (population?.pages ?? []).map((p) => ({ pageId: p.pageId, html: p.html ?? null }));

const m = buildEntityMap({ records, placement: PRODUCT.placement, pageSpecs: PRODUCT.pageSpecs, pages });
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F47 · ENTITY RELATIONSHIP MAP — recorded structures only, count-only");
console.log(`  bound            recorded registry, placement, page specs and stored page bodies only · ${m.nodes.facts} fact(s) · ${m.nodes.pages} page(s) · questions from machine-readable data, text never printed · nothing fetched`);
console.log(`  nodes            ${fmt(m.nodes)}`);
console.log(`  relationships    ${fmt(m.edges)}`);
console.log(`  references       ${m.references.total}: ${fmt(m.references.byState)}`);
console.log(`  inconsistent     ${m.inconsistent.length} · needs a person ${m.needsAPerson.length} · pages not measured ${m.pages.notMeasured}`);
console.log(`  verdict          ${m.verdict}`);
