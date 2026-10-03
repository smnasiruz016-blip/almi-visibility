#!/usr/bin/env node
/**
 * F16 · PRODUCT-LED RESEARCH ROUTES — one declared product's BOUNDED research routes, from F13's dimensions; count-only (RR-146 §2).
 *
 *   node bin/research-routes.mjs --product=<id> --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched, harvested or written
 *
 * 🔴 A ROUTE IS A PLACE TO LOOK — never a lead, never a question. Dimensions come from F13 (src/discovery/context-axes.mjs): only a
 * dimension the product declares and F13 marks EVIDENCED yields routes; a candidate never does. The candidate universe is printed as
 * a count, never a work plan. A request plan is what a collector WOULD send; nothing here holds a transport. Values, topics and
 * queries are not printed. Routes: src/research/research-routes.mjs.
 */
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { readProductAxes } from "../src/discovery/context-axes-reader.mjs";
import { researchRoutes, requestPlanFor, RESEARCH_KINDS, NOT_MEASURED } from "../src/research/research-routes.mjs";

const USAGE = "node bin/research-routes.mjs --product=<id>";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/research-routes.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });

const { axes } = await readProductAxes({ product: PRODUCT, tenantId: SCOPE.tenantId, resolve: createTenantResolver() });
const r = researchRoutes({ subject: PRODUCT_ID, product: PRODUCT, axes });
console.log("F16 · PRODUCT-LED RESEARCH ROUTES — this product only, from F13's dimensions, count-only; nothing fetched, harvested or written");
console.log(`  five kinds, never one: ${Object.keys(RESEARCH_KINDS).join(" · ")} — a route is not a lead, a lead is not a question`);
console.log(`  dimensions used  ${r.dimensionsUsed.map((d) => `${d.key} (${d.values} declared value(s))`).join(" · ") || "none"}`);
for (const x of r.excluded) console.log(`  excluded         ${x.key} — ${x.why}`);
console.log(`  candidate universe ${r.universe === NOT_MEASURED ? NOT_MEASURED : `${r.universe} — a COUNT of every discovered dimension's values multiplied, never a work plan`}`);
if (r.routes === NOT_MEASURED) {
  console.log(`  routes           ${NOT_MEASURED} — missing ${r.refusals.join("; ")}`);
} else {
  const plans = (PRODUCT.research.sources ?? []).flatMap((s) => r.routes.map((route) => requestPlanFor(route, s, PRODUCT))).filter(Boolean);
  console.log(`  routes           ${r.routes.length} PROPOSED (1 topic route + one per declared value of each EVIDENCED dimension) · bound ${PRODUCT.research.maxRoutes} · never combined`);
  console.log(`  request plans    ${plans.length} over ${PRODUCT.research.sources.length} declared source(s) — plans only; no transport exists here, and a live call needs the owner's GREEN`);
}
console.log("  leads, questions: none produced here — see bin/source-intake.mjs --route and bin/public-questions.mjs; a SAMPLE, never every question");
