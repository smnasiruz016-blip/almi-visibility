#!/usr/bin/env node
/**
 * F91 · PAGE OPPORTUNITY PLANNING — one product's three numbers, never one; count-only.
 *
 *   node bin/page-opportunities.mjs --product=<id> --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched, rendered or written
 *
 * 🔴 A COMBINATION NEVER AUTHORISES A PAGE (RR-113); POSSIBLE DOES NOT IMPLY VERIFIED, VERIFIED DOES NOT AUTHORISE A PAGE (RR-130). Number 1 is
 * arithmetic over declared, applying dimensions — never a plan, a target, a potential or a page estimate. A NEW group is an opportunity
 * handed on in the page law's order; nothing is drafted, answered or written here. Planner: src/page/page-opportunities.mjs.
 */
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { readProductPlan } from "../src/page/page-opportunities-reader.mjs";
import { formatNumber, DEMAND_RULES } from "../src/page/page-opportunities.mjs";

const USAGE = "node bin/page-opportunities.mjs --product=<id>";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/page-opportunities.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });

const { plan: p, inputs: i } = await readProductPlan(PRODUCT);
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F91 · PAGE OPPORTUNITY PLANNING — this product only, recorded declarations and records only, count-only; three numbers, never one");
console.log(`  bound: ${p.notice}`);
console.log(`  1 ${formatNumber(p.possible)}`);
console.log(`      inputs: ${p.possible.dimensions.length} applying dimension(s) of ${i.declaredDimensions} declared — ${p.possible.dimensions.map((d) => `${d.values} value(s), source: ${d.source}, limits: ${d.limits}, exclusions: ${d.exclusions}`).join(" | ") || "none"}`);
console.log(`      method: ${p.possible.method}`);
console.log(`      excluded: ${p.possible.excluded.length} dimension(s) or declaration(s) (${p.possible.excluded.map((x) => x.why).join("; ") || "none"}) · ${i.excludedDataKeys} of ${i.qualifierKeysInFacts} qualifier key(s) present only in the verified facts — never combined`);
console.log("      unknown: whether each candidate is wanted — that is number 2's demand limb");
console.log(`  2 ${formatNumber(p.verified)}`);
console.log(`      inputs: planning store ${i.planningStore} · ${i.planningRecords} record(s), ${i.malformedRecords} malformed and not read · demand kinds counted apart: ${i.planningRecords > 0 ? fmt(p.verified.kinds) : "NOT MEASURED — no planning record was read, so no kind is counted (an empty store is never zero demand)"}`);
console.log(`      method: four limbs, each recorded; demand by the amendment's mapping (${Object.entries(DEMAND_RULES).map(([s, r]) => `${s} ${r.qualifies ? "qualifies" : "never qualifies"}`).join(", ")}; any other state UNKNOWN)`);
console.log(`      counts: verified so far ${p.verified.verifiedSoFar ?? "NOT MEASURED"} · excluded ${fmt(p.verified.excluded)} · UNKNOWN ${p.verified.unknown ?? "NOT MEASURED"} of ${p.verified.of ?? "NOT MEASURED"} candidate(s)`);
console.log(`      unknown: ${i.verifiedFacts} of ${i.factRecords} fact record(s) are VERIFIED; a fact is not a demand record`);
console.log(`  3 ${formatNumber(p.needed)}`);
if (Number.isInteger(p.needed.value)) {
  console.log(`      groups ${p.needed.groups} of ${p.needed.of} opportunit(ies) · merged: ${fmt(p.needed.merged)} · COVERED ${p.needed.covered} · REFUSED ${p.needed.refused} · HELD ${p.needed.held} (${fmt(p.needed.heldBy)}) · NEW ${p.needed.value}`);
  console.log(`      method: ${p.needed.method}`);
} else console.log("      inputs: number 2's opportunities · recorded sameness judgements · F33, F36, F32, F44 and verified-answer records per group");
console.log(`  order 1 ≥ 2 ≥ 3: ${p.order.state} — never reordered; the three numbers are never summed and no page total or quota exists`);
console.log(`  verdict ${p.verdict}`);
