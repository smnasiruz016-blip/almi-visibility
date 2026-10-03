#!/usr/bin/env node
/**
 * F16 · PRODUCT-LED RESEARCH ROUTES — one declared product's BOUNDED research routes, from F13's dimensions; count-only (RR-146 §2).
 *
 *   node bin/research-routes.mjs --product=<id> --tenant=<id> --actor=<id> [--on=YYYY-MM-DD]      READ-ONLY; nothing fetched, harvested or written
 *   (--on is F62's stated judging date for applicability; without it applicability is NOT MEASURED)
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
import { requestPlanFor, RESEARCH_KINDS, NOT_MEASURED } from "../src/research/research-routes.mjs";
import { readResearchPlan } from "../src/research/research-plan-reader.mjs";

const USAGE = "node bin/research-routes.mjs --product=<id>";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/research-routes.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });

/* F62 judges freshness on a STATED date (F45): --on=YYYY-MM-DD; without one, applicability is NOT MEASURED, never judged on the clock */
const ON = process.argv.find((x) => x.startsWith("--on="))?.slice(5) ?? null;
const { plan: r, applicability: a } = await readResearchPlan({ product: PRODUCT, subject: PRODUCT_ID, tenantId: SCOPE.tenantId, resolve: createTenantResolver(), on: ON });
console.log("F16 · PRODUCT-LED RESEARCH ROUTES — this product only, from F13's dimensions, count-only; nothing fetched, harvested or written");
console.log(`  five kinds, never one: ${Object.keys(RESEARCH_KINDS).join(" · ")} — a route is not a lead, a lead is not a question`);
console.log(`  dimensions used  ${r.dimensionsUsed.map((d) => `${d.key} (${d.values} declared value(s))`).join(" · ") || "none"}`);
for (const x of r.excluded) console.log(`  excluded         ${x.key} — ${x.why}`);
console.log(`  candidate universe ${r.universe === NOT_MEASURED ? NOT_MEASURED : `${r.universe} — a COUNT of every discovered dimension's values multiplied, never a work plan`}`);
/* F62 (acceptance _handoffs a5ec9f1): where the product applies, before routes — four outcomes, each counted over its named population and date */
if (!PRODUCT.research?.applicability) console.log("  applicability    NOT DECLARED by the product — routes are not narrowed by it");
else if (!a?.measured) console.log(`  applicability    ${NOT_MEASURED} — missing ${a?.missing ?? "the measurement"}`);
else {
  console.log(`  applicability    of ${a.population} combination(s) the routes need, judged on ${a.on}: ${Object.entries(a.counts).map(([k, n]) => `${k} ${n}`).join(" · ")} — UNKNOWN is never zero; ACCEPTED is never REQUIRED`);
  console.log(`  bound            ${a.bound} · ${a.statingRecords} of ${a.activeRecords} active record(s) state an outcome`);
  console.log(`  narrower scope   ${a.narrower.length} record(s) naming a narrower scope, each evidence about that scope only — never generalised`);
  if (r.narrowing) console.log(`  narrowing        routes before ${r.narrowing.before} → after ${r.narrowing.after} (REQUIRED/ACCEPTED combinations only; a route is not demand)`);
}
if (a) for (const [d, x] of Object.entries(a.otherDifferences)) console.log(`  ${d.padEnd(16)} ${x.state} — missing ${x.missing}`);
console.log("  pages            0 created and 0 counted from routes or applicability — a page exists only because a real question exists");
if (r.routes === NOT_MEASURED) {
  console.log(`  routes           ${NOT_MEASURED} — missing ${r.refusals.join("; ")}`);
} else {
  const plans = (PRODUCT.research.sources ?? []).flatMap((s) => r.routes.map((route) => requestPlanFor(route, s, PRODUCT))).filter(Boolean);
  console.log(`  routes           ${r.routes.length} PROPOSED (1 topic route + one per declared value of each EVIDENCED dimension) · bound ${PRODUCT.research.maxRoutes} · never combined`);
  console.log(`  request plans    ${plans.length} over ${PRODUCT.research.sources.length} declared source(s) — plans only; no transport exists here, and a live call needs the owner's GREEN`);
}
console.log("  leads, questions: none produced here — see bin/source-intake.mjs --route and bin/public-questions.mjs; a SAMPLE, never every question");
