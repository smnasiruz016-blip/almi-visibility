#!/usr/bin/env node
/**
 * F91 · PAGE OPPORTUNITY PLANNING — one product's separate lines, never summed, never ordered; count-only (Amendment 3 C13–C15).
 *
 *   node bin/page-opportunities.mjs --product=<id> --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched, rendered or written
 *
 * 🔴 A COMBINATION NEVER AUTHORISES A PAGE (RR-113); POSSIBLE DOES NOT IMPLY VERIFIED, VERIFIED DOES NOT AUTHORISE A PAGE (RR-130). Number 1 is
 * arithmetic over declared, applying dimensions — never a plan, a target, a potential, a page estimate or an upper bound on any other line.
 * Number 3 counts the needs F35 chooses CREATE for, by tier — NOT MEASURED until F35 decides grouped needs (R3), never 0. Nothing is
 * drafted, answered or written here. Planner: src/page/page-opportunities.mjs.
 */
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { readProductPlan } from "../src/page/page-opportunities-reader.mjs";
import { formatNumber, formatLine, DEMAND_RULES } from "../src/page/page-opportunities.mjs";

const USAGE = "node bin/page-opportunities.mjs --product=<id>";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/page-opportunities.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });

const { plan: p, inputs: i } = await readProductPlan(PRODUCT);
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F91 · PAGE OPPORTUNITY PLANNING — this product only, recorded declarations and records only, count-only; separate lines, never summed, never ordered");
console.log(`  bound: ${p.notice}`);
console.log(`  ${i.asAt} · demand left out because its question was overturned: ${i.overturnedDemand}`);
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
/* C13: every other line on its own, AS AT its time, with its left-out count — never summed with another, and no order between them (C15) */
console.log("  lines — each its own, never summed, no order between them:");
for (const k of ["possible", "verified", "researchDerived", "clientReceived", "ownedSearch"]) console.log(`    ${formatLine(p.lines[k], i.asAt)}`);
for (const n of Object.values(p.needed)) console.log(`    3 ${formatLine(n, i.asAt)}`);
for (const n of Object.values(p.actions)) console.log(`    ${formatLine(n, i.asAt)}`);
console.log(`  coverage records ${i.coverageRecords} · recorded coverage judgements ${i.coverageJudgements} — F91's coverage record (C14) is read by F35 in R3`);
console.log("  no page total or quota exists; no line is a ceiling for another");
