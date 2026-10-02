#!/usr/bin/env node
/**
 * F13 · CONTEXT AND AXIS DISCOVERY — one product's evidence-backed dimensions, declared against discovered; count-only.
 *
 *   node bin/context-axes.mjs --product=<id> --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched, rendered or written
 *
 * 🔴 DISCOVERY NEVER DECLARES. A dimension found in the records but not declared by the product is a CANDIDATE only — never added, never
 * combined, never a page dimension. Values are counted, never printed. Discovery: src/discovery/context-axes.mjs.
 */
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readProductAxes } from "../src/discovery/context-axes-reader.mjs";
import { NOT_MEASURED } from "../src/discovery/context-axes.mjs";

const USAGE = "node bin/context-axes.mjs --product=<id>";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/context-axes.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });

const { axes: a, bound } = await readProductAxes({ product: PRODUCT, tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const fmt = (o) => (o === NOT_MEASURED ? NOT_MEASURED : Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · "));
console.log("F13 · CONTEXT AND AXIS DISCOVERY — this product only, recorded evidence only, count-only; discovery never declares");
console.log(`  bound        the product's fact registry (records ${a.facts.records}, with a key=value qualifier ${a.facts.withQualifier}) · ${bound} · nothing fetched, rendered or written`);
console.log(`  pages        ${fmt(a.pages)}`);
console.log(`  discovered   ${a.discovered.length} dimension(s), each from its records (one record suffices; no threshold):`);
for (const d of a.discovered) console.log(`    ${d.key} — ${d.kind}: ${d.records} record(s), VERIFIED ${d.verifiedRecords}, other ${d.unverifiedRecords} · ${d.distinctValues} distinct value(s) (values not printed)${d.verified ? "" : " · carried by no VERIFIED record"}`);
console.log(`  declared     ${a.declared.map((d) => `${d.key} ${d.status} (${d.records} record(s))`).join(" · ") || "none declared"}`);
console.log(`  candidates   ${a.candidates.map((c) => c.key).join(" · ") || "none"} — discovered, NOT declared: never added, combined or made a page dimension`);
for (const n of a.notMeasured) console.log(`  ${NOT_MEASURED}  ${n.kind}: missing ${n.missing}`);
console.log(`  population   ${a.incomplete ? "INCOMPLETE — an evidence kind or page above is NOT MEASURED" : "COMPLETE for the evidence kinds read"}`);
