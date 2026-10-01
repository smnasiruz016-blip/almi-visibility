#!/usr/bin/env node
/**
 * F91 · PAGE OPPORTUNITY PLANNING — one product's three numbers, never one; count-only.
 *
 *   node bin/page-opportunities.mjs --product=<id> --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched, rendered or written
 *
 * 🔴 A COMBINATION NEVER AUTHORISES A PAGE (RR-113). Number 1 is arithmetic over declared dimensions — never a plan, a target, a potential
 * or a page estimate. Planner: src/page/page-opportunities.mjs.
 */
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { readProductPlan } from "../src/page/page-opportunities-reader.mjs";
import { formatNumber } from "../src/page/page-opportunities.mjs";

const USAGE = "node bin/page-opportunities.mjs --product=<id>";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/page-opportunities.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });

const { plan: p, inputs: i } = await readProductPlan(PRODUCT);
console.log("F91 · PAGE OPPORTUNITY PLANNING — this product only, recorded declarations only, count-only; three numbers, never one");
console.log(`  1 ${formatNumber(p.possible)}`);
console.log(`      inputs: ${i.declaredDimensions} declared page dimension(s) with ${i.declaredValues} declared value(s) — source: the product's own descriptor (a declaration, not verified data)`);
console.log(`      method: ${p.possible.method} · bound: declared values only; dimensions omitted for having no value ${p.possible.omittedDimensions}`);
console.log(`      excluded: ${i.excludedDataKeys} of ${i.qualifierKeysInFacts} qualifier key(s) present only in the verified facts — not declared as page dimensions, never combined`);
console.log("      unknown: whether each candidate relates to the product — that is number 2's product-fit limb");
console.log(`  2 ${formatNumber(p.verified)}`);
console.log(`      inputs: qualifying demand states (owner declaration) · per-candidate demand, reliable source, product fit, distinct need · source: none recorded`);
console.log(`      unknown: demand outcomes ${i.demandOutcomes}; ${i.verifiedFacts} of ${i.factRecords} fact record(s) are VERIFIED, none verifies a candidate's fit`);
console.log(`  3 ${formatNumber(p.needed)}`);
console.log("      inputs: number 2's opportunities · an owner-declared grouping rule · recorded coverage and unique-value assessments per group · source: none recorded");
console.log(`  order 1 ≥ 2 ≥ 3: ${p.order.state} — never reordered; the three numbers are never summed and no page total or quota exists`);
console.log(`  verdict ${p.verdict}`);
