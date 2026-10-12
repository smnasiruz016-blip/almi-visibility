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
console.log(`  bound        ${a.records} record(s): ${a.primary} non-derived, ${a.derived.records} derived, ${a.capability.claims} capability · nothing fetched, re-checked or written`);
for (const [name, f] of Object.entries(a.fields)) console.log(`  ${name.padEnd(11)} present ${f.present} of ${f.denominator} · absent ${f.absent} — ${f.verdict}`);
const units = Object.entries(a.unit.byValueType).map(([t, c]) => `${t}: recorded ${c.recorded}, recorded-empty ${c["recorded-empty"]}`).join(" · ");
console.log(a.unit.required === 0
  ? `  unit        required only of ${a.unit.requiredOf.join(", ")} — missing ${a.unit.missing} · ${units} — ${a.unit.verdict}`
  : `  unit        required only of ${a.unit.requiredOf.join(", ")}: with a unit ${a.unit.requiredWithAUnit} of ${a.unit.required} · without ${a.unit.requiredWithoutAUnit} · every other value type reported, never judged · ${units} — ${a.unit.verdict}`);
console.log(`  derived     ${a.derived.records} record(s), ${a.derived.withDerivation} with a derivation, ${a.derived.inputs} input(s) · waived only for them: ${a.derived.waived.join(", ")} — ${a.derived.verdict}`);
const c = a.capability;
const q = a.questionnaire;
console.log(`  questionnaire ${q.state} — ${q.answers} answer(s): APPROVED (a record) ${q.approved} of ${q.answers} · not approved (no record) ${q.withheld} of ${q.answers}${q.state === "INVALID" ? ` · ${q.faults} fault(s), so no answer is a record` : ""}`);
console.log(c.claims === 0
  ? `  capability  0 capability claim(s) recorded — the population is EMPTY, never a pass — ${c.verdict}`
  : `  capability  ${c.claims} claim(s): an approved answer naming its committed record ${c.ofAnApprovedAnswer} of ${c.claims} · admitted ${c.admitted} of ${c.claims} · refused ${c.refused} · SELF-SOURCED ${c.selfSourced} (with a tier ${c.selfSourcedWithATier}, VERIFIED ${c.selfSourcedVerified}) — ${c.verdict}`);
console.log(`  verdict     ${a.verdict}`);
