#!/usr/bin/env node
/**
 * ROW 61 — SAFE LOCAL PAGE CONSTRUCTION. Build a declared page spec of a declared product from its fact
 * registry, and ACCEPT it only if every frozen part of Gate A passes.
 *
 *   node bin/build-page.mjs --product=<id> --slug=<slug>                 judge one declared candidate
 *   node bin/build-page.mjs --product=<id> --all-slugs                   judge every declared candidate of ONE product
 *   node bin/build-page.mjs --product=<id> --slug=<slug> --out=<dir> --confirm   also write it, IF accepted
 *
 * 🔴 NOTHING IS PUBLISHED. An accepted candidate is written as an HTML file on this machine, inside this
 * repository, behind --confirm. No page is created in any product, no route, no sitemap entry, no deploy,
 * no production write.
 *
 * 🔴 NO SLUG, NO DEFAULT. A runner with neither --slug nor --all-slugs stops and says so, as --product
 * already does. It used to build one hard-coded spec and could not reach the second spec its own product
 * declares.
 *
 * 🔴 --all-slugs loops the declared specs of ONE product (owner ruling, 14 September 2026). Each candidate
 * is judged on its own and every refusal is recorded separately. No cross-product loop, no cohort, no batch
 * publish, no page-count target. It exists to produce the DATA GAP list, not output.
 *
 * 🔴 FAILS CLOSED. constructCandidates (src/page/construct.mjs) hands back HTML only for an ACCEPTED
 * candidate. A refused one has nothing to write; the run records its DATA GAP / REJECT / BLOCKED reasons and
 * exits 2. This runner used to print "TEXT AS BUILT (before Gate A)" and write the file anyway.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

import { writePermission, announceWritePermission, confineToRepo, LOCAL } from "../src/write-law.mjs";
import { loadRegistry } from "../src/facts/registry.mjs";
import { selectCandidates, constructCandidates, ACCEPTED, NOT_TESTED } from "../src/page/construct.mjs";
import { productFromArgvOrExit } from "../src/product-cli.mjs";

const USAGE = "node bin/build-page.mjs --product=<id> (--slug=<slug> | --all-slugs) [--out=<dir> --confirm]";
const PRODUCT = await productFromArgvOrExit(process.argv, { usage: USAGE });

const argv = process.argv.slice(2);
const flag = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? null;

let requested;
try {
  requested = selectCandidates(PRODUCT.pageSpecs, { slug: flag("slug"), allSlugs: argv.includes("--all-slugs") });
} catch (e) {
  console.error(`\n🔴 ${e.message}\n  usage: ${USAGE}\n`);
  process.exit(1);
}

const outDir = confineToRepo(flag("out"), { label: "--out" });
const permission = writePermission({ target: LOCAL, argv, env: process.env });
if (outDir) announceWritePermission(permission);

const { records } = await loadRegistry(PRODUCT.factsDir, PRODUCT.productId);
const verifiedInRegistry = records.filter((r) => r.verificationState === "VERIFIED").length;

const line = (ch = "─") => console.log(ch.repeat(78));
console.log(`\nSAFE LOCAL PAGE CONSTRUCTION — product ${PRODUCT.productId}`);
line("═");
console.log(`declared page specs   ${Object.keys(PRODUCT.pageSpecs).length}   requested ${requested.length}`);
console.log(`registry records      ${records.length}   VERIFIED ${verifiedInRegistry}`);
if (requested.length === 0) {
  console.log(`\n🔴 DATA GAP — ${PRODUCT.productId} declares no page spec. Nothing to construct, and nothing was.`);
  process.exit(2);
}

const results = constructCandidates({ pageSpecs: PRODUCT.pageSpecs, variants: PRODUCT.variants, records, requested });

for (const c of results) {
  console.log(`\n${c.verdict === ACCEPTED ? "✅" : "🔴"} ${c.slug} — ${c.verdict}`);
  line();
  console.log(`  template family: ${c.family.rendered} of ${c.family.declared} declared spec(s) rendered · shell ${c.family.shellSource} (${c.family.shellPages} page(s))`);
  if (c.renderedWords !== null) console.log(`  rendered words ${c.renderedWords}`);
  for (const [part, p] of Object.entries(c.parts)) {
    const measured = p.value === undefined ? "" : ` ${p.value}${p.threshold === undefined ? "" : ` (bar ${p.threshold})`}`;
    console.log(`  ${part.padEnd(12)} ${p.state}${measured}${p.reason ? ` — ${p.reason}` : ""}`);
  }
  for (const g of c.dataGaps) console.log(`  DATA GAP   ${g.part}: ${g.reason}`);
  for (const r of c.rejects) console.log(`  REJECT     ${r.part}: ${r.reason}`);
  for (const n of c.notTested) console.log(`  ${NOT_TESTED}  ${n.part}: ${n.reason}`);
  if (c.parts.facts.notVerified.length) console.log(`  cited but not VERIFIED: ${c.parts.facts.notVerified.join(" · ")}`);
  console.log(`  ${c.parts.whyThisUrl.notEnforced}`);
  console.log(`  ${c.pageOne.id} ${c.pageOne.state}: ${c.pageOne.statement} — missing: ${c.pageOne.missingGateFamilies.join(", ")}`);
  console.log(`  §5A fact text copied into the spec: ${c.copies.length} DETECTED · ${c.copiesNotTested.length} value(s) NOT TESTED · ${c.copiesFullyChecked} fully checked and clean`);
  for (const n of c.copiesNotTested) console.log(`    NOT TESTED  ${n.claimId} (${n.field}): ${n.reason}`);
}

const accepted = results.filter((c) => c.verdict === ACCEPTED);
console.log(`\nACCEPTED ${accepted.length} of ${results.length} candidate(s). A refusal is a result, not an error.`);

if (outDir) {
  for (const c of results) {
    if (c.html === null) {
      console.log(`[refused] nothing written for ${c.slug}`);
    } else if (!permission.mayWrite) {
      console.log(`[dry-run] would have written ${join(outDir, `${c.slug}.html`)} — ${permission.reason}`);
    } else {
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, `${c.slug}.html`), c.html, "utf8");
      writeFileSync(join(outDir, `${c.slug}.trace.json`), JSON.stringify(c.trace, null, 2) + "\n", "utf8");
      console.log(`wrote ${join(outDir, `${c.slug}.html`)} and its trace`);
    }
  }
}
process.exit(accepted.length === results.length ? 0 : 2);
