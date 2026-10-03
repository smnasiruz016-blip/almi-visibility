#!/usr/bin/env node
/**
 * F62 · WHERE A PRODUCT APPLIES — THE DERIVED RESEARCH DECLARATION (RR-149; acceptance _handoffs a5ec9f1), count-only.
 *
 *   node bin/applicability.mjs --product=<id> --tenant=<id> --actor=<id> --on=YYYY-MM-DD      READ-ONLY; nothing fetched or written
 *
 * Derived ONLY from what the product already holds: F13's dimensions, and one PROPOSED check per deciding body (a tier-1 record's own
 * subject) and scope (the qualifiers its records carry). Each check's outcome is F62's (C1–C4), on F45's and F46's judgement as they
 * stand. A proposed check is not a verdict, not a question, not demand, not a page opportunity and not permission to make a page.
 * Bodies, values and wording are not printed: counts only. Code: src/research/applicability.mjs deriveDeclaration.
 */
import { productFromArgvOrExit, productIdOrExit } from "../src/product-cli.mjs";
import { scopedEntryPoint } from "../src/governance/scoped-entry.mjs";
import { RESOURCES } from "../src/tenancy/scoped-run.mjs";
import { createTenantResolver } from "../src/tenancy/resolver.mjs";
import { BATCH_ID } from "../src/crawl/observation-batch.mjs";
import { NOT_MEASURED } from "../src/research/applicability.mjs";
import { readDerivedDeclaration } from "../src/research/applicability-declaration-reader.mjs";

const USAGE = "node bin/applicability.mjs --product=<id> --on=YYYY-MM-DD";
const PRODUCT_ID = productIdOrExit(process.argv, { usage: USAGE });
const SCOPE = scopedEntryPoint({ entry: "bin/applicability.mjs", governed: false, resources: [RESOURCES.subject(PRODUCT_ID), RESOURCES.collectionPartition("CRAWL_BATCH", BATCH_ID)] });
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE, scope: SCOPE });
const ON = process.argv.find((x) => x.startsWith("--on="))?.slice(5) ?? null;

const d = await readDerivedDeclaration({ product: PRODUCT, tenantId: SCOPE.tenantId, resolve: createTenantResolver(), on: ON });
console.log("F62 · DERIVED RESEARCH DECLARATION — this product only, from what it already holds; count-only; nothing fetched or written");
console.log(`  a proposed check is NOT: ${d.notA.join(" · ")}`);
if (!d.derived) {
  console.log(`  declaration      ${NOT_MEASURED} — missing ${d.missing.join("; ")}`);
} else {
  console.log(`  judged on        ${d.on} · bound: ${d.bound}`);
  console.log(`  dimensions       ${d.dimensions === NOT_MEASURED ? NOT_MEASURED : d.dimensions.map((x) => `${x.key} ${x.status} (${x.records} record(s), ${x.distinctValues} value(s))`).join(" · ") || "none"} (values not printed)`);
  console.log(`  records          ${d.counts.activeRecords} active · ${d.counts.decidingRecords} from a deciding body's own source (tier 1) · ${d.counts.notDeciding} never decide · ${d.counts.statingRecords} state an outcome`);
  console.log(`  proposed checks  ${d.counts.checks} over ${d.counts.bodies} deciding bod(ies): ${Object.entries(d.counts.byOutcome).map(([k, n]) => `${k} ${n}`).join(" · ")} — UNKNOWN is never zero; ACCEPTED is never REQUIRED`);
  for (const m of d.missing) console.log(`  missing          ${m}`);
}
for (const [k, x] of Object.entries(d.otherDifferences)) console.log(`  ${k.padEnd(16)} ${x.state} — missing ${x.missing}`);
console.log(`  pages            ${d.pagesCreated} created and ${d.pagesCounted} counted — a page exists only because a real question exists`);
