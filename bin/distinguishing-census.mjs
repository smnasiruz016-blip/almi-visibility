#!/usr/bin/env node
/**
 * DISTINGUISHING CLAIMS PER PROFESSION — the census that replaces regulator-counting.
 *
 *   npm run census:distinguishing
 *
 * Registry only. NO FETCH.
 *
 * ══ 🔴 WHY THE OLD CENSUS WAS MEASURING THE WRONG THING ════════════════════
 *
 * `PROFESSION_STRENGTH_CENSUS.md` ranked professions by HOW MANY REGULATORS
 * RECOGNISE OET. AHPRA proved that wrong: reachable, 31,848 characters, rich —
 * and adding it would have made the page WORSE, because its rule is identical
 * for all twelve professions.
 *
 *   A CLAIM ONLY HELPS A PROFESSION PAGE IF ITS VALUE DIFFERS FROM AT LEAST ONE
 *   OTHER PROFESSION. VOLUME IS NOT DISTINCTION.
 *
 * So the measure is not "how many regulators" but "how many claims actually
 * differ". A `profession=` qualifier makes a claim ADDRESSABLE; it does not make
 * it DISTINGUISHING. HCPC publishes an OET minimum for six professions and five
 * of them are the same number.
 *
 * ── AND THE THIRD ANSWER MATTERS AS MUCH AS THE OTHER TWO ──────────────────
 *
 * A predicate held for only ONE profession cannot be compared, so it is neither
 * distinguishing nor shared: it is UNCOMPARABLE, and it is counted separately.
 * Folding it into either column would be inventing a comparison that has not
 * been made.
 */
/**
 * ⚠️ REPOINTED after the product boundary landed. This census was written when
 * the engine still held AlmiOET’s twelve professions and its own facts path.
 * It now asks the PRODUCT for both, and asks the engine only for the
 * predicate — with the axis passed in rather than the word "profession" baked
 * into a shared function.
 *
 * 🔴 NOT ONE MEASURE CHANGED. The numbers below are the same numbers PR #16
 * reported: 0 distinguishing, 0 shared, 14 of 14 UNCOMPARABLE, 2 of 12
 * professions covered. A refactor that moved a census result would have been
 * a refactor that changed a finding.
 */
import { loadRegistry } from "../src/facts/registry.mjs";
import { isPerVariant } from "../src/page/claim-placement.mjs";

import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";

/**
 * 🔴 THE PRODUCT ARRIVES AS AN ARGUMENT, NOT AS AN IMPORT.
 *
 * This runner used to resolve a product at IMPORT time, so it could not be
 * pointed at a second one without editing this file. Its arithmetic was
 * already generic; the BINDING was not.
 *
 * There is no default: a runner with no `--product=<id>` stops and says so.
 */
/* 🔴 F03 — the subject's data root is decided (RESOURCES.subject) BEFORE its descriptor or any of its files is read. */
const PRODUCT_ID = productIdOrExit(process.argv, { usage: "node bin/distinguishing-census.mjs --product=<id>" });

/* 🔴 F02 — the tenant scope of everything this entry point reads is decided HERE, before any of it is read. */
const SCOPE = scopedEntryPoint({ entry: "bin/distinguishing-census.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: "node bin/distinguishing-census.mjs --product=<id>", scope: SCOPE });
const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);

const variantOf = (r) => {
  const m = new RegExp(`${PRODUCT.axis.key}=([a-z-]+)`).exec(r.claim.qualifier ?? "");
  return m ? m[1] : null;
};
const predicateKey = (r) => `${r.claim.subject}.${r.claim.predicate}`;

// Group profession-qualified records by (subject, predicate).
const groups = new Map();
for (const r of records) {
  if (!isPerVariant(r, PRODUCT.axis.key)) continue;
  const k = predicateKey(r);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}

const norm = (v) => JSON.stringify(v?.value ?? v).toLowerCase().replace(/\s+/g, " ").trim();

const status = new Map(); // predicateKey -> "distinguishing" | "shared" | "uncomparable"
for (const [k, rs] of groups) {
  const byVariant = new Map();
  for (const r of rs) byVariant.set(variantOf(r), norm(r.value));
  if (byVariant.size < 2) status.set(k, "uncomparable");
  else status.set(k, new Set(byVariant.values()).size > 1 ? "distinguishing" : "shared");
}

const line = (ch = "─") => console.log(ch.repeat(84));
console.log(`\nDISTINGUISHING CLAIMS PER ${PRODUCT.axis.key.toUpperCase()} — registry only, no fetch`);
line("═");
console.log(`registry: ${records.length} records · ${groups.size} ${PRODUCT.axis.key}-qualified predicates`);
console.log("");
console.log(PRODUCT.axis.key.padEnd(24) + "total".padStart(8) + "per-var".padStart(10) + "DISTINGUISHING".padStart(16) + "uncomparable".padStart(14) + "ratio".padStart(8));
line();

const rows = PRODUCT.variants.map((p) => {
  const mine = records.filter((r) => variantOf(r) === p);
  const total = records.filter((r) => variantOf(r) === p || !isPerVariant(r, PRODUCT.axis.key)).length;
  const dist = mine.filter((r) => status.get(predicateKey(r)) === "distinguishing").length;
  const unc = mine.filter((r) => status.get(predicateKey(r)) === "uncomparable").length;
  return { p, total, perProf: mine.length, dist, unc, ratio: mine.length ? dist / mine.length : 0 };
});
rows.sort((a, b) => b.dist - a.dist || b.perProf - a.perProf);
for (const r of rows) {
  console.log(
    r.p.padEnd(24) + String(r.total).padStart(8) + String(r.perProf).padStart(10) +
    String(r.dist).padStart(16) + String(r.unc).padStart(14) + (r.perProf ? r.ratio.toFixed(2) : "—").padStart(8),
  );
}

line();
console.log("\nBY PREDICATE — what each one actually is");
line();
for (const [k, s] of [...status].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]))) {
  const variantsHolding = groups.get(k).map(variantOf).sort();
  const mark = s === "distinguishing" ? "🔴 DISTINGUISHING" : s === "shared" ? "   shared        " : "⚠️  uncomparable  ";
  console.log(`  ${mark}  ${k.padEnd(46)} ${variantsHolding.length} ${PRODUCT.axis.key}(s)`);
}

const d = [...status.values()].filter((x) => x === "distinguishing").length;
const sh = [...status.values()].filter((x) => x === "shared").length;
const u = [...status.values()].filter((x) => x === "uncomparable").length;

console.log(`\n🔴 THE HONEST STATE OF THIS CENSUS`);
line();
console.log(`  distinguishing predicates  ${d}`);
console.log(`  shared predicates          ${sh}`);
console.log(`  ⚠️  UNCOMPARABLE            ${u}   ← only ONE ${PRODUCT.axis.key} holds them`);
console.log("");
console.log(`  The registry holds claims for ${rows.filter((r) => r.perProf > 0).length} of ${PRODUCT.variants.length} ${PRODUCT.axis.key} values.`);
console.log(`  ${u} of ${status.size} predicates cannot be judged at all, because a value can only be`);
console.log(`  called distinguishing by COMPARING it — and there is nothing to compare it to.`);
console.log(`  🔴 THIS CENSUS CANNOT SIZE THE COHORT YET. It can only say what is missing,`);
console.log(`     and what is missing is claims for the other ${PRODUCT.variants.length - 1} ${PRODUCT.axis.key} values.`);
