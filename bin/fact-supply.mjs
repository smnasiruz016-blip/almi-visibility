#!/usr/bin/env node
/**
 * F44 · VERIFIED FACT SUPPLY — what one product's fact records carry, and what they lack; count-only.
 *
 *   node bin/fact-supply.mjs --product=<id> --tenant=<id> --actor=<id>      READ-ONLY; nothing fetched, re-checked or written
 *
 * 🔴 A FIELD IS PRESENT OR ABSENT AT ITS RECORDED PATH — NEVER FILLED (RR-113). Audit: src/facts/fact-supply.mjs.
 */
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { readFactSupply } from "../src/facts/fact-supply-reader.mjs";

const USAGE = "node bin/fact-supply.mjs --product=<id>";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/fact-supply.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });

const a = await readFactSupply(PRODUCT);
console.log("F44 · VERIFIED FACT SUPPLY — this product only, recorded registry only, count-only");
console.log(`  bound        ${a.records} record(s): ${a.primary} non-derived, ${a.derived.records} derived · nothing fetched, re-checked or written`);
for (const [name, f] of Object.entries(a.fields)) console.log(`  ${name.padEnd(11)} present ${f.present} of ${f.denominator} · absent ${f.absent} — ${f.verdict}`);
const units = Object.entries(a.unit.byValueType).map(([t, c]) => `${t}: recorded ${c.recorded}, recorded-empty ${c["recorded-empty"]}`).join(" · ");
console.log(`  unit        never judged — missing ${a.unit.missing} · ${units} — ${a.unit.verdict}`);
console.log(`  derived     ${a.derived.records} record(s), ${a.derived.withDerivation} with a derivation, ${a.derived.inputs} input(s) · waived only for them: ${a.derived.waived.join(", ")} — ${a.derived.verdict}`);
const c = a.capability;
console.log(c.claims === 0
  ? `  capability  0 capability claim(s) recorded — the population is EMPTY, never a pass — ${c.verdict}`
  : `  capability  ${c.claims} claim(s): admitted ${c.admitted} of ${c.claims} · refused ${c.refused} · SELF-SOURCED ${c.selfSourced} (with a tier ${c.selfSourcedWithATier}, VERIFIED ${c.selfSourcedVerified}) — ${c.verdict}`);
console.log(`  verdict     ${a.verdict}`);
