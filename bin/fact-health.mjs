#!/usr/bin/env node
/**
 * F45 · FACT CONFLICT, FRESHNESS AND RECOMPUTATION — one product's fact registry, judged on a STATED date; count-only.
 *
 *   node bin/fact-health.mjs --product=<id> --on=<YYYY-MM-DD> --tenant=<id> --actor=<id>      READ-ONLY; writes nothing
 *
 * 🔴 NO DEFAULT DATE. The date a fact is judged on is a measurement the caller states, and it is printed in the bound — never the
 * clock's guess. Nothing is fetched or re-checked: freshness comes from recorded check dates only. Assessment: src/facts/fact-health.mjs.
 */
import { loadRegistry } from "../src/facts/registry.mjs";
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { assessFactHealth } from "../src/facts/fact-health.mjs";

const USAGE = "node bin/fact-health.mjs --product=<id> --on=<YYYY-MM-DD>";
const ON = process.argv.find((a) => a.startsWith("--on="))?.slice(5) ?? null;
if (!/^\d{4}-\d{2}-\d{2}$/.test(ON ?? "")) {
  console.error(`\n🔴 --on=<YYYY-MM-DD> is required. There is no default: the date a fact is judged on is a measurement you state.\n   ${USAGE}\n`);
  process.exit(1);
}
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/fact-health.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);

const r = assessFactHealth(records, { on: ON });
const s = r.summary;
const fmt = (o) => Object.entries(o ?? {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "none";
console.log("F45 · FACT CONFLICT, FRESHNESS AND RECOMPUTATION — recorded registry only, count-only");
console.log(`  bound            recorded registry only · ${s.facts} active fact(s) (retired, not judged: ${s.retiredNotJudged}) · judged on ${r.on} (stated) · nothing fetched or re-checked`);
console.log(`  contradictions   ${s.contradicted} fact(s) in ${s.contradictionGroups} group(s) — never auto-resolved · recorded settlements ${s.recordedSettlements}`);
console.log(`  freshness        ${fmt(s.freshness)} · missing: ${fmt(s.freshnessMissing)} · recorded recheck window disagrees with the rule on ${s.windowsDisagree} (the earlier governs)`);
console.log(`  recomputation    ${s.derived} derived fact(s): ${fmt(s.recompute)}`);
console.log(`  presentation     ${fmt(s.presentation)} — a fact that is not CURRENT is never presented as current; nothing is deleted or noindexed`);
